package com.omnidoc.api.retrieval;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.adapters.ingestion.IngestionJobRepository;
import com.omnidoc.api.adapters.ingestion.VersionChunker;
import com.omnidoc.api.adapters.notes.JdbcNotesAdapter;
import com.omnidoc.api.adapters.retrieval.JdbcSearchAdapter;
import com.omnidoc.api.adapters.retrieval.JdbcVectorSearchAdapter;
import com.omnidoc.api.adapters.retrieval.MockEmbeddingAdapter;
import com.omnidoc.api.adapters.retrieval.MockRuntimeModeAdapter;
import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedChunks;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class RetrievalSearchIT {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String DB = "omnidoc";

	private static final String TENANT_A = "tenant-a";
	private static final String TENANT_B = "tenant-b";
	private static final String ACTOR_A = "actor-a";
	private static final String ACTOR_B = "actor-b";
	private static final String WORKSPACE_A = "ws-a";
	private static final String WORKSPACE_A_2 = "ws-a-2";
	private static final String WORKSPACE_B = "ws-b";

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

	private static JdbcTemplate appJdbc;
	private static TransactionTemplate appTx;
	private static NotesPort notesPort;
	private static VersionChunker versionChunker;
	private static EmbeddingPort embeddingPort;
	private static VectorSearchPort vectorSearchPort;
	private static SearchPort searchPort;

	@BeforeAll
	static void bootstrap() throws Exception {
		try (Connection admin = DriverManager.getConnection(
			POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
			Statement statement = admin.createStatement()) {
			statement.execute("CREATE ROLE " + MIGRATOR + " LOGIN PASSWORD '" + MIGRATOR_PASSWORD + "' BYPASSRLS");
			statement.execute("CREATE ROLE " + APP + " LOGIN PASSWORD '" + APP_PASSWORD + "' NOBYPASSRLS");
			statement.execute("CREATE DATABASE " + DB + " OWNER " + MIGRATOR);
		}

		String url = jdbcUrlFor(DB);
		try (Connection admin = DriverManager.getConnection(url, POSTGRES.getUsername(), POSTGRES.getPassword());
			Statement statement = admin.createStatement()) {
			statement.execute("CREATE EXTENSION IF NOT EXISTS vector");
			statement.execute("GRANT CONNECT ON DATABASE " + DB + " TO " + APP);
			statement.execute("GRANT USAGE ON SCHEMA public TO " + APP);
			statement.execute("GRANT CREATE ON SCHEMA public TO " + MIGRATOR);
			statement.execute(
				"ALTER DEFAULT PRIVILEGES FOR ROLE " + MIGRATOR + " IN SCHEMA public "
					+ "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + APP);
		}

		Flyway.configure()
			.dataSource(url, MIGRATOR, MIGRATOR_PASSWORD)
			.locations("classpath:db/migration")
			.load()
			.migrate();
		seedTenancy(url);

		DataSource appDataSource = dataSource(url, APP, APP_PASSWORD);
		appJdbc = new JdbcTemplate(appDataSource);
		appTx = new TransactionTemplate(new DataSourceTransactionManager(appDataSource));
		TenantRlsSession rls = new TenantRlsSession(appJdbc);
		JsonMapper jsonMapper = JsonMapper.builder().build();

		IngestionJobRepository repository = new IngestionJobRepository(appJdbc, rls, appTx);
		versionChunker = new VersionChunker(
			appJdbc,
			repository,
			new ProseMirrorMarkdownProjector(jsonMapper),
			new BlockPackChunker());
		notesPort = new JdbcNotesAdapter(appJdbc, rls, appTx, jsonMapper, new com.omnidoc.api.adapters.notes.RechunkOutbox() {
			@Override
			public void noteCommitted(TenantActor actor, WorkspaceId workspaceId, com.omnidoc.api.domain.Identifiers.NoteId noteId) {
			}

			@Override
			public void notePurged(TenantActor actor, com.omnidoc.api.domain.Identifiers.NoteId noteId) {
				repository.deleteForNote(actor, noteId);
			}
		});
		embeddingPort = new MockEmbeddingAdapter(appJdbc, rls, appTx, new MockRuntimeModeAdapter());
		vectorSearchPort = new JdbcVectorSearchAdapter(appJdbc, rls, appTx);
		searchPort = new JdbcSearchAdapter(appJdbc, rls, appTx, embeddingPort, vectorSearchPort);
	}

	@BeforeEach
	void resetCorpus() {
		migratorJdbc().execute("TRUNCATE TABLE embeddings, chunks, chunk_sets, note_versions, notes CASCADE");
	}

	@Test
	void lexicalSearchRespectsWorkspaceScopeOwnershipAndSafeSnippets() {
		Note mine = createChunkedNote(actorA(), WORKSPACE_A, "Mine", "Use pgvector and BYOK for launch checklist at /srv/omnidoc/config.", CorpusOwnership.MINE);
		Note sample = createChunkedNote(actorA(), WORKSPACE_A, "Sample", "Sample pgvector and BYOK note for demo workspace.", CorpusOwnership.SAMPLE);
		Note sibling = createChunkedNote(actorA(), WORKSPACE_A_2, "Sibling", "pgvector and BYOK live in another workspace.", CorpusOwnership.MINE);
		Note foreign = createChunkedNote(actorB(), WORKSPACE_B, "Foreign", "pgvector and BYOK must never leak across tenants.", CorpusOwnership.MINE);

		SearchResults mineOnly = success(searchPort.lexicalSearch(new TextSearch(
			actorA(),
			acl(WORKSPACE_A),
			"pgvector BYOK",
			5,
			new SearchFilters(Map.of(JdbcSearchAdapter.FILTER_CORPUS_OWNERSHIP, "mine")))));

		assertThat(mineOnly.hits()).extracting(hit -> hit.noteId().value()).containsExactly(mine.id().value());
		assertThat(mineOnly.hits()).allSatisfy(hit -> {
			assertThat(hit.snippet()).contains("pgvector");
			assertThat(hit.snippet()).doesNotContain("<b>").doesNotContain("</b>");
		});

		SearchResults sampleOnly = success(searchPort.lexicalSearch(new TextSearch(
			actorA(),
			acl(WORKSPACE_A),
			"pgvector BYOK",
			5,
			new SearchFilters(Map.of(JdbcSearchAdapter.FILTER_CORPUS_OWNERSHIP, "sample")))));
		assertThat(sampleOnly.hits()).extracting(hit -> hit.noteId().value()).containsExactly(sample.id().value());

		SearchResults siblingWorkspace = success(searchPort.lexicalSearch(new TextSearch(
			actorA(),
			acl(WORKSPACE_A_2),
			"pgvector BYOK",
			5,
			new SearchFilters(Map.of()))));
		assertThat(siblingWorkspace.hits()).extracting(hit -> hit.noteId().value()).containsExactly(sibling.id().value());
		assertThat(mineOnly.hits()).extracting(hit -> hit.noteId().value()).doesNotContain(foreign.id().value());
	}

	@Test
	void hybridSearchFusesLexicalAndVectorCandidatesDeterministically() {
		Note lexical = createChunkedNote(actorA(), WORKSPACE_A, "Checklist", "launch checklist launch checklist for pgvector rollout", CorpusOwnership.MINE);
		Note vectorOnly = createChunkedNote(actorA(), WORKSPACE_A, "Archive", "retro notes that never mention the query terms", CorpusOwnership.MINE);
		Note lexicalOnly = createChunkedNote(actorA(), WORKSPACE_A, "Plain", "launch checklist appears only lexically here", CorpusOwnership.MINE);

		embedAll(actorA(), lexical);
		embedAll(actorA(), vectorOnly);
		embedAll(actorA(), lexicalOnly);

		float[] queryVector = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("launch checklist"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK))).embeddings().getFirst().vector();
		forceVector(lexical, queryVector);
		forceVector(vectorOnly, queryVector);

		SearchResults lexicalOnlyResults = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "launch checklist", 5, new SearchFilters(Map.of()))));
		assertThat(lexicalOnlyResults.hits()).extracting(hit -> hit.noteId().value())
			.contains(lexical.id().value(), lexicalOnly.id().value())
			.doesNotContain(vectorOnly.id().value());

		SearchResults first = success(searchPort.hybridSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "launch checklist", 5, new SearchFilters(Map.of()))));
		SearchResults second = success(searchPort.hybridSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "launch checklist", 5, new SearchFilters(Map.of()))));

		assertThat(first.hits()).extracting(hit -> hit.noteId().value())
			.containsExactly(lexical.id().value(), lexicalOnly.id().value(), vectorOnly.id().value());
		assertThat(second.hits()).extracting(hit -> hit.noteId().value())
			.containsExactlyElementsOf(first.hits().stream().map(hit -> hit.noteId().value()).toList());
	}

	@Test
	void lexicalSearchSuppressesSoftDeletedAndStaleVersions() {
		Note stale = createChunkedNote(actorA(), WORKSPACE_A, "Versioned", "stale launch body", CorpusOwnership.MINE);

		success(notesPort.update(new UpdateNote(
			actorA(),
			new WorkspaceId(WORKSPACE_A),
			stale.id(),
			new NoteFields("Versioned", bodyJson("fresh replacement text")),
			new VersionToken(stale.versionId().value()))));

		SearchResults staleResults = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "stale launch body", 5, new SearchFilters(Map.of()))));
		assertThat(staleResults.hits()).isEmpty();

		Note deleted = createChunkedNote(actorA(), WORKSPACE_A, "Delete me", "temporary launch body", CorpusOwnership.MINE);
		success(notesPort.softDelete(new DeleteNote(actorA(), new WorkspaceId(WORKSPACE_A), deleted.id())));

		SearchResults deletedResults = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "temporary launch body", 5, new SearchFilters(Map.of()))));
		assertThat(deletedResults.hits()).isEmpty();
	}

	@Test
	void hybridSearchRejectsUnsupportedVectorTupleFilters() {
		PortFailure failure = failure(searchPort.hybridSearch(new TextSearch(
			actorA(),
			acl(WORKSPACE_A),
			"launch checklist",
			5,
			new SearchFilters(Map.of(
				JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID, "avalai:text-embedding-v4:1024",
				JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, "1024")))));

		assertThat(failure.code()).isEqualTo(PortFailure.Code.INVALID_MODEL);
	}

	private static Note createChunkedNote(
		TenantActor actor,
		String workspaceId,
		String title,
		String bodyText,
		CorpusOwnership ownership) {
		Note note = success(notesPort.create(new CreateNote(
			actor,
			new WorkspaceId(workspaceId),
			new NoteFields(title, bodyJson(bodyText)),
			Optional.ofNullable(ownership))));
		successChunks(note);
		return note;
	}

	private static List<com.omnidoc.api.domain.IngestionModels.Chunk> successChunks(Note note) {
		return success(versionChunker.chunk(
			actorFor(note.workspaceId().value()),
			Optional.of(note.workspaceId()),
			note.id(),
			note.versionId(),
			null)).chunkSet().chunks();
	}

	private static void embedAll(TenantActor actor, Note note) {
		List<ChunkId> chunkIds = successChunks(note).stream().map(chunk -> chunk.id()).toList();
		success(embeddingPort.embedChunks(new EmbedChunks(
			actor,
			chunkIds,
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK)));
	}

	private static void forceVector(Note note, float[] queryVector) {
		String literal = vectorLiteral(queryVector);
		migratorJdbc().update(
			"UPDATE embeddings SET embedding = CAST(? AS vector) WHERE note_id = ?",
			literal,
			note.id().value());
	}

	private static String vectorLiteral(float[] vector) {
		StringBuilder builder = new StringBuilder("[");
		for (int index = 0; index < vector.length; index++) {
			if (index > 0) {
				builder.append(',');
			}
			builder.append(String.format(java.util.Locale.ROOT, "%.8f", vector[index]));
		}
		return builder.append(']').toString();
	}

	private static AclScope acl(String workspaceId) {
		return new AclScope(new WorkspaceId(workspaceId), java.util.Set.of("owner"));
	}

	private static String bodyJson(String text) {
		return """
			{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"%s"}]}]}
			""".formatted(text.replace("\\", "\\\\").replace("\"", "\\\""));
	}

	private static TenantActor actorA() {
		return new TenantActor(new TenantId(TENANT_A), new ActorId(ACTOR_A));
	}

	private static TenantActor actorB() {
		return new TenantActor(new TenantId(TENANT_B), new ActorId(ACTOR_B));
	}

	private static TenantActor actorFor(String workspaceId) {
		return WORKSPACE_B.equals(workspaceId) ? actorB() : actorA();
	}

	private static <T> T success(PortResult<T> result) {
		if (result instanceof PortResult.Success<T> success) {
			return success.value();
		}
		PortFailure failure = ((PortResult.Failure<T>) result).failure();
		throw new AssertionError("Expected success but got " + failure.code() + ": " + failure.detail());
	}

	private static PortFailure failure(PortResult<?> result) {
		return ((PortResult.Failure<?>) result).failure();
	}

	private static void seedTenancy(String url) throws Exception {
		try (Connection connection = DriverManager.getConnection(url, MIGRATOR, MIGRATOR_PASSWORD);
			Statement statement = connection.createStatement()) {
			connection.setAutoCommit(false);
			statement.execute("INSERT INTO tenants (tenant_id, name) VALUES ('" + TENANT_A + "', 'Tenant A'), ('" + TENANT_B + "', 'Tenant B')");
			statement.execute("INSERT INTO actors (actor_id, email, password_hash) VALUES ('" + ACTOR_A + "', 'a@example.test', 'hash'), ('" + ACTOR_B + "', 'b@example.test', 'hash')");
			statement.execute("INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES ('" + WORKSPACE_A + "', '" + TENANT_A + "', 'Workspace A'), ('" + WORKSPACE_A_2 + "', '" + TENANT_A + "', 'Workspace A2'), ('" + WORKSPACE_B + "', '" + TENANT_B + "', 'Workspace B')");
			statement.execute("INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) VALUES ('" + WORKSPACE_A + "', '" + ACTOR_A + "', '" + TENANT_A + "', '{owner}'), ('" + WORKSPACE_A_2 + "', '" + ACTOR_A + "', '" + TENANT_A + "', '{owner}'), ('" + WORKSPACE_B + "', '" + ACTOR_B + "', '" + TENANT_B + "', '{owner}')");
			connection.commit();
		}
	}

	private static JdbcTemplate migratorJdbc() {
		return new JdbcTemplate(dataSource(jdbcUrlFor(DB), MIGRATOR, MIGRATOR_PASSWORD));
	}

	private static DataSource dataSource(String url, String username, String password) {
		DriverManagerDataSource dataSource = new DriverManagerDataSource();
		dataSource.setDriverClassName("org.postgresql.Driver");
		dataSource.setUrl(url);
		dataSource.setUsername(username);
		dataSource.setPassword(password);
		return dataSource;
	}

	private static String jdbcUrlFor(String database) {
		return POSTGRES.getJdbcUrl().replace("/postgres", "/" + database);
	}
}