package com.omnidoc.api.retrieval;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
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
import com.omnidoc.api.adapters.retrieval.JdbcVectorSearchAdapter;
import com.omnidoc.api.adapters.retrieval.MockEmbeddingAdapter;
import com.omnidoc.api.adapters.retrieval.MockRuntimeModeAdapter;
import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedChunks;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class RetrievalVectorSearchIT {

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
	}

	@BeforeEach
	void resetCorpus() {
		migratorJdbc().execute("TRUNCATE TABLE embeddings, chunks, chunk_sets, note_versions, notes CASCADE");
	}

	@Test
	void embedTextsIsDeterministicAndLiveModesFailClosed() {
		EmbeddingBatch first = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("pgvector and BYOK", "pgvector and BYOK"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK)));

		assertThat(first.embeddings()).hasSize(2);
		assertThat(first.embeddings().get(0).modelId()).isEqualTo(MockEmbeddingAdapter.MODEL_ID);
		assertThat(first.embeddings().get(0).dimensions()).isEqualTo(MockEmbeddingAdapter.DIMENSIONS);
		assertThat(first.embeddings().get(0).vector()).containsExactly(first.embeddings().get(1).vector());

		assertThat(failure(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("pgvector and BYOK"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.OPERATOR_FREE_TIER))).code()).isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
		assertThat(failure(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("pgvector and BYOK"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.CUSTOMER_KEY))).code()).isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
	}

	@Test
	void embedChunksStoresModelAndDimensions() {
		Note note = createChunkedNote(actorA(), WORKSPACE_A, "Embedding note", "pgvector and BYOK are indexed here.");
		List<com.omnidoc.api.domain.Identifiers.ChunkId> chunkIds = successChunks(note).stream().map(chunk -> chunk.id()).toList();

		EmbeddingBatch batch = success(embeddingPort.embedChunks(new EmbedChunks(
			actorA(), chunkIds, MockEmbeddingAdapter.MODEL_ID, RuntimeMode.MOCK)));

		assertThat(batch.embeddings()).hasSize(chunkIds.size());
		assertThat(migratorJdbc().queryForObject(
			"SELECT embedding_model_id FROM embeddings WHERE chunk_id = ?",
			String.class,
			chunkIds.getFirst().value())).isEqualTo(MockEmbeddingAdapter.MODEL_ID);
		assertThat(migratorJdbc().queryForObject(
			"SELECT dimensions FROM embeddings WHERE chunk_id = ?",
			Integer.class,
			chunkIds.getFirst().value())).isEqualTo(MockEmbeddingAdapter.DIMENSIONS);
	}

	@Test
	void similaritySearchRespectsTenantAndWorkspaceScope() {
		Note alpha = createChunkedNote(actorA(), WORKSPACE_A, "Workspace A", "pgvector BYOK tenant scope alpha alpha");
		Note sibling = createChunkedNote(actorA(), WORKSPACE_A_2, "Workspace A2", "pgvector BYOK tenant scope sibling sibling");
		Note foreign = createChunkedNote(actorB(), WORKSPACE_B, "Workspace B", "pgvector BYOK tenant scope foreign foreign");

		embedAll(actorA(), alpha);
		embedAll(actorA(), sibling);
		embedAll(actorB(), foreign);

		float[] queryVector = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("tenant scope alpha"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK))).embeddings().getFirst().vector();

		SearchResults scopedToA = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));
		assertThat(scopedToA.hits()).isNotEmpty();
		assertThat(scopedToA.hits()).allMatch(hit -> hit.noteId().equals(alpha.id()));

		SearchResults scopedToA2 = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A_2), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));
		assertThat(scopedToA2.hits()).isNotEmpty();
		assertThat(scopedToA2.hits()).allMatch(hit -> hit.noteId().equals(sibling.id()));
		assertThat(scopedToA.hits()).noneMatch(hit -> hit.noteId().equals(foreign.id()));
	}

	@Test
	void similaritySearchDefaultsToMockTupleAndAllowsExplicitTupleSelection() {
		Note kept = createChunkedNote(actorA(), WORKSPACE_A, "Mock tuple", "alpha alpha mock tuple");
		Note relabeled = createChunkedNote(actorA(), WORKSPACE_A, "Other tuple", "alpha alpha other tuple");

		embedAll(actorA(), kept);
		embedAll(actorA(), relabeled);
		migratorJdbc().update(
			"UPDATE embeddings SET embedding_model_id = ? WHERE note_id = ?",
			"avalai:text-embedding-v4:1024",
			relabeled.id().value());

		float[] queryVector = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("alpha alpha"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK))).embeddings().getFirst().vector();

		SearchResults defaultTuple = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));
		assertThat(defaultTuple.hits()).extracting(hit -> hit.noteId().value()).contains(kept.id().value());
		assertThat(defaultTuple.hits()).extracting(hit -> hit.noteId().value()).doesNotContain(relabeled.id().value());

		SearchResults explicitTuple = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of(
				JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID, "avalai:text-embedding-v4:1024",
				JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, String.valueOf(queryVector.length))))));
		assertThat(explicitTuple.hits()).extracting(hit -> hit.noteId().value()).contains(relabeled.id().value());
		assertThat(explicitTuple.hits()).extracting(hit -> hit.noteId().value()).doesNotContain(kept.id().value());
	}

	@Test
	void softDeletedAndPurgedNotesDoNotSurfaceThroughSearch() {
		Note note = createChunkedNote(actorA(), WORKSPACE_A, "Delete me", "pgvector BYOK hidden after delete");
		embedAll(actorA(), note);

		float[] queryVector = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("hidden after delete"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK))).embeddings().getFirst().vector();

		SearchResults beforeDelete = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));
		assertThat(beforeDelete.hits()).isNotEmpty();

		success(notesPort.softDelete(new DeleteNote(actorA(), new WorkspaceId(WORKSPACE_A), note.id())));
		SearchResults afterSoftDelete = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));
		assertThat(afterSoftDelete.hits()).isEmpty();

		success(notesPort.purge(new DeleteNote(actorA(), new WorkspaceId(WORKSPACE_A), note.id())));
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM embeddings WHERE note_id = ?",
			Integer.class,
			note.id().value())).isZero();
	}

	@Test
	void staleVersionEmbeddingsDoNotSurfaceThroughSearch() {
		Note note = createChunkedNote(actorA(), WORKSPACE_A, "Versioned", "pgvector BYOK original body");
		embedAll(actorA(), note);

		success(notesPort.update(new UpdateNote(
			actorA(),
			new WorkspaceId(WORKSPACE_A),
			note.id(),
			new NoteFields("Versioned", bodyJson("completely different updated body")),
			new VersionToken(note.versionId().value()))));

		float[] queryVector = success(embeddingPort.embedTexts(new EmbedTexts(
			actorA(),
			List.of("original body"),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK))).embeddings().getFirst().vector();

		SearchResults searchResults = success(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			queryVector,
			5,
			new SearchFilters(java.util.Map.of()))));

		assertThat(searchResults.hits()).isEmpty();
	}

	@Test
	void similaritySearchRejectsZeroAndMismatchedVectors() {
		assertThat(failure(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			new float[] {0.0f, 0.0f, 0.0f},
			5,
			new SearchFilters(java.util.Map.of())))).code()).isEqualTo(PortFailure.Code.VALIDATION);

		assertThat(failure(vectorSearchPort.similaritySearch(new VectorSearch(
			actorA(),
			new AclScope(new WorkspaceId(WORKSPACE_A), java.util.Set.of("owner")),
			new float[] {1.0f, 0.0f, 0.0f},
			5,
			new SearchFilters(java.util.Map.of(
				JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, "16"))))).code()).isEqualTo(PortFailure.Code.VALIDATION);
	}

	@Test
	void appRoleFailsClosedWithoutTenantGuc() {
		Note note = createChunkedNote(actorA(), WORKSPACE_A, "RLS note", "tenant scoped embedding row");
		embedAll(actorA(), note);

		Integer visibleRows = appJdbc.queryForObject("SELECT COUNT(*) FROM embeddings", Integer.class);
		assertThat(visibleRows).isZero();
	}

	private static Note createChunkedNote(TenantActor actor, String workspaceId, String title, String bodyText) {
		Note note = success(notesPort.create(new CreateNote(
			actor,
			new WorkspaceId(workspaceId),
			new NoteFields(title, bodyJson(bodyText)),
			Optional.of(CorpusOwnership.MINE))));
		successChunks(note);
		return note;
	}

	private static List<com.omnidoc.api.domain.IngestionModels.Chunk> successChunks(Note note) {
		return success(versionChunker.chunk(
			new TenantActor(note.workspaceId().value().equals(WORKSPACE_B) ? new TenantId(TENANT_B) : new TenantId(TENANT_A),
				note.workspaceId().value().equals(WORKSPACE_B) ? new ActorId(ACTOR_B) : new ActorId(ACTOR_A)),
			Optional.of(note.workspaceId()),
			note.id(),
			note.versionId(),
			null)).chunkSet().chunks();
	}

	private static void embedAll(TenantActor actor, Note note) {
		List<com.omnidoc.api.domain.Identifiers.ChunkId> chunkIds = successChunks(note).stream().map(chunk -> chunk.id()).toList();
		success(embeddingPort.embedChunks(new EmbedChunks(
			actor,
			chunkIds,
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK)));
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

	private static <T> T success(PortResult<T> result) {
		return ((PortResult.Success<T>) result).value();
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

	private static DataSource dataSource(String url, String user, String password) {
		DriverManagerDataSource ds = new DriverManagerDataSource();
		ds.setDriverClassName("org.postgresql.Driver");
		ds.setUrl(url);
		ds.setUsername(user);
		ds.setPassword(password);
		return ds;
	}

	private static String jdbcUrlFor(String database) {
		return POSTGRES.getJdbcUrl().replace("/postgres", "/" + database);
	}
}