package com.omnidoc.api.retrieval;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
import com.omnidoc.api.domain.Identifiers.NoteId;
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
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class RetrievalSearchEvaluationIT {

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
		VectorSearchPort vectorSearchPort = new JdbcVectorSearchAdapter(appJdbc, rls, appTx);
		searchPort = new JdbcSearchAdapter(appJdbc, rls, appTx, embeddingPort, vectorSearchPort);
	}

	@BeforeEach
	void resetCorpus() {
		migratorJdbc().execute("TRUNCATE TABLE embeddings, chunks, chunk_sets, note_versions, notes CASCADE");
	}

	@Test
	void evaluationCorpusProducesMetricsAndZeroIsolationFailures() {
		Map<String, Note> notes = seedEvaluationCorpus();

		List<QueryFixture> positiveQueries = List.of(
			new QueryFixture("Q1", "launch checklist", List.of(notes.get("launch").id())),
			new QueryFixture("Q2", "pgvector BYOK config path", List.of(notes.get("formatting").id())),
			new QueryFixture("Q3", "incident postmortem action items", List.of(notes.get("postmortem").id())),
			new QueryFixture("Q4", "imports searchable after indexing", List.of(notes.get("searchable").id())),
			new QueryFixture("Q5", "indexing progress pending ready", List.of(notes.get("progress").id())));

		List<QueryOutcome> lexicalOutcomes = evaluate(positiveQueries, Mode.LEXICAL);
		List<QueryOutcome> hybridOutcomes = evaluate(positiveQueries, Mode.HYBRID);

		Metrics lexical = Metrics.from(lexicalOutcomes);
		Metrics hybrid = Metrics.from(hybridOutcomes);
		System.out.println("B07 lexical Recall@1=" + format(lexical.recallAt1())
			+ " Recall@3=" + format(lexical.recallAt3())
			+ " MRR=" + format(lexical.mrr()));
		System.out.println("B07 hybrid Recall@1=" + format(hybrid.recallAt1())
			+ " Recall@3=" + format(hybrid.recallAt3())
			+ " MRR=" + format(hybrid.mrr()));
		for (QueryOutcome outcome : lexicalOutcomes) {
			System.out.println("LEXICAL " + outcome.id() + " => " + String.join(",", outcome.rankedNoteIds()));
		}
		for (QueryOutcome outcome : hybridOutcomes) {
			System.out.println("HYBRID " + outcome.id() + " => " + String.join(",", outcome.rankedNoteIds()));
		}

		assertThat(lexical.recallAt3()).isGreaterThanOrEqualTo(0.8d);
		assertThat(hybrid.recallAt3()).isGreaterThanOrEqualTo(0.8d);
		assertThat(lexical.mrr()).isGreaterThan(0.5d);
		assertThat(hybrid.mrr()).isGreaterThan(0.5d);

		assertZeroIsolationFailures(notes);
	}

	private static Map<String, Note> seedEvaluationCorpus() {
		Map<String, Note> notes = new LinkedHashMap<>();
		notes.put("launch", createIndexedNote(actorA(), WORKSPACE_A, "Launch checklist",
			"Launch checklist covers rollback order, owner handoff, and deployment rehearsal.", CorpusOwnership.MINE));
		notes.put("formatting", createIndexedNote(actorA(), WORKSPACE_A, "Formatting and config",
			"Use `tenant_id`, pgvector, and BYOK. Path: /srv/omnidoc/config/app.yml. | Feature | State |", CorpusOwnership.MINE));
		notes.put("postmortem", createIndexedNote(actorA(), WORKSPACE_A, "Incident postmortem",
			"Incident postmortem action items: page on-call, restore search, document follow-up.", CorpusOwnership.MINE));
		notes.put("searchable", createIndexedNote(actorA(), WORKSPACE_A, "Import visibility",
			"Imported notes become searchable after indexing status is ready.", CorpusOwnership.MINE));
		notes.put("progress", createIndexedNote(actorA(), WORKSPACE_A, "Indexing progress",
			"Indexing progress cycles through pending, running, ready, failed, and partial.", CorpusOwnership.MINE));
		notes.put("sibling", createIndexedNote(actorA(), WORKSPACE_A_2, "Sibling workspace",
			"Launch checklist exists in another workspace and must stay hidden.", CorpusOwnership.MINE));
		notes.put("foreign", createIndexedNote(actorB(), WORKSPACE_B, "Foreign tenant",
			"Launch checklist exists in another tenant and must stay hidden.", CorpusOwnership.MINE));

		Note stale = createIndexedNote(actorA(), WORKSPACE_A, "Stale note", "legacy search term old body", CorpusOwnership.MINE);
		notes.put("stale", stale);
		success(notesPort.update(new UpdateNote(
			actorA(),
			new WorkspaceId(WORKSPACE_A),
			stale.id(),
			new NoteFields("Stale note", bodyJson("replacement body only")),
			new VersionToken(stale.versionId().value()))));

		Note deleted = createIndexedNote(actorA(), WORKSPACE_A, "Deleted note", "deleted retrieval sentinel", CorpusOwnership.MINE);
		notes.put("deleted", deleted);
		success(notesPort.softDelete(new DeleteNote(actorA(), new WorkspaceId(WORKSPACE_A), deleted.id())));
		return notes;
	}

	private static List<QueryOutcome> evaluate(List<QueryFixture> queries, Mode mode) {
		List<QueryOutcome> outcomes = new ArrayList<>();
		for (QueryFixture query : queries) {
			PortResult<SearchResults> result = mode == Mode.LEXICAL
				? searchPort.lexicalSearch(new TextSearch(actorA(), acl(WORKSPACE_A), query.text(), 3, new SearchFilters(Map.of())))
				: searchPort.hybridSearch(new TextSearch(actorA(), acl(WORKSPACE_A), query.text(), 3, new SearchFilters(Map.of())));
			outcomes.add(QueryOutcome.from(query, success(result)));
		}
		return outcomes;
	}

	private static void assertZeroIsolationFailures(Map<String, Note> notes) {
		SearchResults launch = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "launch checklist", 5, new SearchFilters(Map.of()))));
		assertThat(launch.hits()).extracting(hit -> hit.noteId().value())
			.doesNotContain(notes.get("sibling").id().value(), notes.get("foreign").id().value());

		SearchResults stale = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "legacy search term old body", 5, new SearchFilters(Map.of()))));
		assertThat(stale.hits()).extracting(hit -> hit.noteId().value())
			.doesNotContain(notes.get("stale").id().value());

		SearchResults deleted = success(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_A), "deleted retrieval sentinel", 5, new SearchFilters(Map.of()))));
		assertThat(deleted.hits()).extracting(hit -> hit.noteId().value())
			.doesNotContain(notes.get("deleted").id().value());

		PortFailure forbidden = failure(searchPort.lexicalSearch(new TextSearch(
			actorA(), acl(WORKSPACE_B), "launch checklist", 5, new SearchFilters(Map.of()))));
		assertThat(forbidden.code()).isEqualTo(PortFailure.Code.FORBIDDEN);
	}

	private static Note createIndexedNote(
		TenantActor actor,
		String workspaceId,
		String title,
		String bodyText,
		CorpusOwnership ownership) {
		Note note = success(notesPort.create(new CreateNote(
			actor,
			new WorkspaceId(workspaceId),
			new NoteFields(title, bodyJson(bodyText)),
			Optional.of(ownership))));
		List<com.omnidoc.api.domain.IngestionModels.Chunk> chunks = success(versionChunker.chunk(
			actor,
			Optional.of(new WorkspaceId(workspaceId)),
			note.id(),
			note.versionId(),
			null)).chunkSet().chunks();
		success(embeddingPort.embedChunks(new EmbedChunks(
			actor,
			chunks.stream().map(chunk -> chunk.id()).toList(),
			MockEmbeddingAdapter.MODEL_ID,
			RuntimeMode.MOCK)));
		return note;
	}

	private static String bodyJson(String text) {
		return """
			{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"%s"}]}]}
			""".formatted(text.replace("\\", "\\\\").replace("\"", "\\\""));
	}

	private static AclScope acl(String workspaceId) {
		return new AclScope(new WorkspaceId(workspaceId), java.util.Set.of("owner"));
	}

	private static String format(double value) {
		return String.format(java.util.Locale.ROOT, "%.3f", value);
	}

	private static TenantActor actorA() {
		return new TenantActor(new TenantId(TENANT_A), new ActorId(ACTOR_A));
	}

	private static TenantActor actorB() {
		return new TenantActor(new TenantId(TENANT_B), new ActorId(ACTOR_B));
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

	private enum Mode {
		LEXICAL,
		HYBRID
	}

	private record QueryFixture(String id, String text, List<NoteId> relevant) {
	}

	private record QueryOutcome(String id, List<String> rankedNoteIds, double recallAt1, double recallAt3, double reciprocalRank) {
		private static QueryOutcome from(QueryFixture query, SearchResults results) {
			List<String> ranked = results.hits().stream().map(hit -> hit.noteId().value()).toList();
			double recall1 = ranked.stream().limit(1).anyMatch(id -> contains(query.relevant(), id)) ? 1.0d : 0.0d;
			double recall3 = ranked.stream().limit(3).anyMatch(id -> contains(query.relevant(), id)) ? 1.0d : 0.0d;
			double rr = 0.0d;
			for (int index = 0; index < ranked.size(); index++) {
				if (contains(query.relevant(), ranked.get(index))) {
					rr = 1.0d / (index + 1);
					break;
				}
			}
			return new QueryOutcome(query.id(), ranked, recall1, recall3, rr);
		}

		private static boolean contains(List<NoteId> relevant, String noteId) {
			return relevant.stream().anyMatch(id -> id.value().equals(noteId));
		}
	}

	private record Metrics(double recallAt1, double recallAt3, double mrr) {
		private static Metrics from(List<QueryOutcome> outcomes) {
			double denominator = outcomes.size();
			double recall1 = outcomes.stream().mapToDouble(QueryOutcome::recallAt1).sum() / denominator;
			double recall3 = outcomes.stream().mapToDouble(QueryOutcome::recallAt3).sum() / denominator;
			double mrr = outcomes.stream().mapToDouble(QueryOutcome::reciprocalRank).sum() / denominator;
			return new Metrics(recall1, recall3, mrr);
		}
	}
}