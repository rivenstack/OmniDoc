package com.omnidoc.api.ingestion;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.adapters.identity.JdbcIdentityAdapter;
import com.omnidoc.api.adapters.ingestion.IngestionDispatcher;
import com.omnidoc.api.adapters.ingestion.IngestionJobRepository;
import com.omnidoc.api.adapters.ingestion.IngestionLimits;
import com.omnidoc.api.adapters.ingestion.IngestionWorker;
import com.omnidoc.api.adapters.ingestion.JdbcIngestionAdapter;
import com.omnidoc.api.adapters.ingestion.JdbcRechunkOutbox;
import com.omnidoc.api.adapters.ingestion.VersionChunker;
import com.omnidoc.api.adapters.ingestion.parser.ImportParser;
import com.omnidoc.api.adapters.ingestion.parser.TikaImportParser;
import com.omnidoc.api.adapters.notes.JdbcNotesAdapter;
import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.application.port.IngestionPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.chunking.ChunkPolicy;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.JobId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IngestionModels.ChunkSet;
import com.omnidoc.api.domain.IngestionModels.ChunkVersion;
import com.omnidoc.api.domain.IngestionModels.EnqueueImport;
import com.omnidoc.api.domain.IngestionModels.GetJob;
import com.omnidoc.api.domain.IngestionModels.ImportContent;
import com.omnidoc.api.domain.IngestionModels.IngestionJob;
import com.omnidoc.api.domain.IngestionModels.JobStatus;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * B-05b runner and persistence behaviour against the runtime NOBYPASSRLS role, with the
 * worker driven by hand so claim, lease, and membership transitions are deterministic —
 * no scheduler races.
 *
 * <p>Covers: the four stage units, chunk id stability and the projection substring
 * invariant, the policy rule from architecture.md §5.2.1 §2, cross-tenant and IDOR
 * denial, membership loss mid-job, expired-lease reclaim, attempt exhaustion, the
 * coalesced rechunk outbox, and purge removing the note's corpus.
 */
@Testcontainers(disabledWithoutDocker = true)
class IngestionWorkerIT {

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

	private static final String MARKDOWN = """
		# Ingestion notes

		Uses `tenant_id`, pgvector, BYOK, and OpenAI at https://example.test/a?b=c.

		| Feature | State |
		| --- | --- |
		| Notes | ready |

		```java
		Path config = Path.of("/srv/omnidoc/config/app.yml");
		```

		Token: eyJhbGciOiJub25lIn0.%s
		""".formatted("A".repeat(260));

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

	private static JdbcTemplate appJdbc;
	private static TransactionTemplate appTx;
	private static IngestionJobRepository repository;
	private static IngestionPort ingestionPort;
	private static NotesPort notesPort;
	private static IngestionWorker worker;
	private static JsonMapper jsonMapper;

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
		try (Connection admin = DriverManager.getConnection(
			url, POSTGRES.getUsername(), POSTGRES.getPassword());
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
		seedTenancy();

		DataSource appDataSource = dataSource(url, APP, APP_PASSWORD);
		appJdbc = new JdbcTemplate(appDataSource);
		appTx = new TransactionTemplate(new DataSourceTransactionManager(appDataSource));
		TenantRlsSession rls = new TenantRlsSession(appJdbc);
		jsonMapper = JsonMapper.builder().build();

		repository = new IngestionJobRepository(appJdbc, rls, appTx);
		IngestionDispatcher dispatcher = new IngestionDispatcher();
		ProseMirrorMarkdownProjector projector = new ProseMirrorMarkdownProjector(jsonMapper);
		VersionChunker versionChunker =
			new VersionChunker(appJdbc, repository, projector, new BlockPackChunker());
		ImportParser parser = new TikaImportParser(jsonMapper, 1024 * 1024);
		IngestionLimits limits = IngestionLimits.defaults();

		notesPort = new JdbcNotesAdapter(
			appJdbc, rls, appTx, jsonMapper, new JdbcRechunkOutbox(repository, dispatcher));
		IdentityPort identityPort = new JdbcIdentityAdapter(
			appJdbc, rls, appTx, new BCryptPasswordEncoder(), jsonMapper);
		ingestionPort = new JdbcIngestionAdapter(repository, versionChunker, parser, dispatcher, limits);
		worker = new IngestionWorker(repository, versionChunker, parser, notesPort, identityPort, limits);
	}

	@BeforeEach
	void resetCorpusAndQueue() {
		migratorJdbc().execute(
			"TRUNCATE TABLE ingestion_job_payloads, ingestion_jobs, chunks, chunk_sets, "
				+ "note_versions, notes CASCADE");
		migratorJdbc().update(
			"DELETE FROM workspace_memberships WHERE workspace_id = ? AND actor_id = ?",
			WORKSPACE_A, ACTOR_A);
		migratorJdbc().update(
			"INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) "
				+ "VALUES (?, ?, ?, '{owner}'::text[]) ON CONFLICT DO NOTHING",
			WORKSPACE_A, ACTOR_A, TENANT_A);
	}

	@Test
	void importMovesThroughFourStageUnitsAndPersistsChunks() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("ingestion-notes.md")));

		assertThat(enqueued.status()).isEqualTo(JobStatus.PENDING);
		assertThat(enqueued.completedUnits()).isZero();
		assertThat(enqueued.totalUnits()).isEqualTo(4);
		assertThat(payloadRows(enqueued)).isEqualTo(1);

		worker.drain();

		IngestionJob polled = success(ingestionPort.getJob(
			new GetJob(actorA(), new WorkspaceId(WORKSPACE_A), enqueued.id())));
		assertThat(polled.status()).isEqualTo(JobStatus.READY);
		assertThat(polled.completedUnits()).isEqualTo(4);
		assertThat(polled.totalUnits()).isEqualTo(4);
		// Terminal state drops the uploaded bytes.
		assertThat(payloadRows(enqueued)).isZero();

		Map<String, Object> job = jobRow(enqueued.id().value());
		assertThat(job.get("note_id")).isNotNull();
		assertThat(job.get("version_id")).isNotNull();
		assertThat(job.get("error_code")).isNull();
		assertThat(migratorJdbc().queryForObject(
			"SELECT title FROM notes WHERE note_id = ?", String.class, job.get("note_id")))
			.isEqualTo("ingestion-notes");

		String versionId = (String) job.get("version_id");
		assertThat(migratorJdbc().queryForObject(
			"SELECT chunk_count FROM chunk_sets WHERE version_id = ?", Integer.class, versionId))
			.isPositive();
		assertThat(migratorJdbc().queryForObject(
			"SELECT projector_id || '/' || chunker_id FROM chunk_sets WHERE version_id = ?",
			String.class, versionId))
			.isEqualTo("pm-md-v1/omni-blockpack-v1");
	}

	@Test
	void persistedChunksHoldTheProjectionSubstringInvariantAndStableIds() {
		Note note = success(notesPort.create(new CreateNote(
			actorA(), new WorkspaceId(WORKSPACE_A),
			new NoteFields("Chunked", bodyJson(MARKDOWN)),
			Optional.of(CorpusOwnership.MINE))));

		ChunkSet first = successChunks(ingestionPort.chunkVersion(
			new ChunkVersion(actorA(), note.id(), note.versionId(), null)));
		assertThat(first.chunks()).isNotEmpty();

		String projection = new ProseMirrorMarkdownProjector(jsonMapper)
			.project(storedBody(note.versionId())).text();
		for (int index = 0; index < first.chunks().size(); index++) {
			var chunk = first.chunks().get(index);
			assertThat(chunk.id().value())
				.isEqualTo(note.versionId().value() + "_c" + "%04d".formatted(index));
			assertThat(projection.substring(chunk.startOffset(), chunk.endOffset()))
				.isEqualTo(chunk.text());
		}
		assertThat(migratorJdbc().queryForObject(
			"SELECT text_sha256 FROM chunks WHERE chunk_id = ?", String.class,
			first.chunks().getFirst().id().value()))
			.isEqualTo(ChunkPolicy.sha256Hex(first.chunks().getFirst().text()));

		// Same version + same policy ⇒ idempotent no-op, identical ids.
		ChunkSet second = successChunks(ingestionPort.chunkVersion(
			new ChunkVersion(actorA(), note.id(), note.versionId(), storedBody(note.versionId()))));
		assertThat(second.chunks()).extracting(chunk -> chunk.id().value())
			.containsExactlyElementsOf(first.chunks().stream().map(chunk -> chunk.id().value()).toList());
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunks WHERE version_id = ?", Integer.class, note.versionId().value()))
			.isEqualTo(first.chunks().size());
	}

	@Test
	void chunkVersionRejectsADifferentPolicyAndAMismatchedBody() {
		Note note = success(notesPort.create(new CreateNote(
			actorA(), new WorkspaceId(WORKSPACE_A),
			new NoteFields("Policy", bodyJson("policy body")),
			Optional.empty())));

		assertThat(failureCode(ingestionPort.chunkVersion(new ChunkVersion(
			actorA(), note.id(), note.versionId(), bodyJson("a different body")))))
			.isEqualTo(PortFailure.Code.VALIDATION);

		migratorJdbc().update(
			"""
			INSERT INTO chunk_sets
				(version_id, tenant_id, projector_id, chunker_id, params_hash, projection_sha256, chunk_count)
			VALUES (?, ?, 'pm-md-v1', 'omni-blockpack-v1', 'some-other-params-hash', 'sha', 0)
			""",
			note.versionId().value(), TENANT_A);

		assertThat(failureCode(ingestionPort.chunkVersion(
			new ChunkVersion(actorA(), note.id(), note.versionId(), null))))
			.isEqualTo(PortFailure.Code.CONFLICT);
	}

	@Test
	void enqueueRejectsUnsupportedTypesAndOversizedFiles() {
		assertThat(failureCode(ingestionPort.enqueueImport(new EnqueueImport(
			actorA(), new WorkspaceId(WORKSPACE_A),
			new ImportContent(new ByteArrayInputStream("binary".getBytes(StandardCharsets.UTF_8)),
				"image/png", "diagram.png")))))
			.isEqualTo(PortFailure.Code.UNSUPPORTED_TYPE);

		byte[] oversized = new byte[(int) IngestionLimits.DEFAULT_MAX_UPLOAD_BYTES + 1];
		java.util.Arrays.fill(oversized, (byte) 'a');
		assertThat(failureCode(ingestionPort.enqueueImport(new EnqueueImport(
			actorA(), new WorkspaceId(WORKSPACE_A),
			new ImportContent(new ByteArrayInputStream(oversized), "text/plain", "huge.txt")))))
			.isEqualTo(PortFailure.Code.TOO_LARGE);

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs", Integer.class)).isZero();
	}

	@Test
	void jobsAreInvisibleAcrossTenantsAndDeniedAcrossWorkspaces() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("scoped.md")));

		// Another tenant's actor sees nothing at all — a miss, not a leak.
		assertThat(failureCode(ingestionPort.getJob(
			new GetJob(actorB(), new WorkspaceId(WORKSPACE_B), enqueued.id()))))
			.isEqualTo(PortFailure.Code.NOT_FOUND);
		// Same tenant, wrong workspace selector: IDOR, so forbidden.
		assertThat(failureCode(ingestionPort.getJob(
			new GetJob(actorA(), new WorkspaceId(WORKSPACE_A_2), enqueued.id()))))
			.isEqualTo(PortFailure.Code.FORBIDDEN);
		assertThat(failureCode(ingestionPort.getJob(
			new GetJob(actorA(), new WorkspaceId(WORKSPACE_A), new JobId("job-does-not-exist")))))
			.isEqualTo(PortFailure.Code.NOT_FOUND);
		// A non-member of any workspace in the tenant cannot even ask.
		assertThat(failureCode(ingestionPort.getJob(new GetJob(
			new TenantActor(new TenantId(TENANT_A), new ActorId(ACTOR_B)),
			new WorkspaceId(WORKSPACE_A), enqueued.id()))))
			.isEqualTo(PortFailure.Code.FORBIDDEN);
	}

	@Test
	void membershipLostAfterEnqueueFailsTheJob() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("revoked.md")));
		migratorJdbc().update(
			"DELETE FROM workspace_memberships WHERE workspace_id = ? AND actor_id = ?",
			WORKSPACE_A, ACTOR_A);

		worker.drain();

		Map<String, Object> job = jobRow(enqueued.id().value());
		assertThat(job.get("status")).isEqualTo("failed");
		assertThat(job.get("error_code")).isEqualTo("forbidden");
		assertThat(job.get("note_id")).isNull();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM notes", Integer.class)).isZero();
	}

	@Test
	void anExpiredLeaseIsReclaimedAndAttemptsAreCounted() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("reclaimed.md")));

		// A runner that claimed the job and died leaves an expired lease behind.
		var crashed = repository.claim("worker-crashed", -1).orElseThrow();
		assertThat(crashed.jobId()).isEqualTo(enqueued.id().value());
		assertThat(crashed.attempts()).isEqualTo(1);
		assertThat(jobRow(crashed.jobId()).get("status")).isEqualTo("running");

		worker.drain();

		Map<String, Object> job = jobRow(enqueued.id().value());
		assertThat(job.get("status")).isEqualTo("ready");
		assertThat(job.get("attempts")).isEqualTo(2);
		assertThat(job.get("lease_owner")).isNull();
	}

	@Test
	void exhaustedAttemptsFailTheJobInsteadOfLoopingForever() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("retried.md")));
		migratorJdbc().update(
			"UPDATE ingestion_jobs SET attempts = 3 WHERE job_id = ?", enqueued.id().value());

		worker.drain();

		Map<String, Object> job = jobRow(enqueued.id().value());
		assertThat(job.get("status")).isEqualTo("failed");
		assertThat(job.get("error_code")).isEqualTo("unavailable");
		assertThat(payloadRows(enqueued)).isZero();
	}

	@Test
	void noteSavesCoalesceIntoOnePendingRechunkThatChunksTheCurrentVersion() {
		Note created = success(notesPort.create(new CreateNote(
			actorA(), new WorkspaceId(WORKSPACE_A),
			new NoteFields("Outbox", bodyJson("first body")),
			Optional.empty())));
		Note updated = success(notesPort.update(new UpdateNote(
			actorA(), new WorkspaceId(WORKSPACE_A), created.id(),
			new NoteFields("Outbox", bodyJson("second body")),
			new VersionToken(created.versionId().value()))));

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs WHERE kind = 'rechunk' AND status = 'pending'",
			Integer.class))
			.isEqualTo(1);

		worker.drain();

		// The runner resolves current_version_id at claim time, so the superseded
		// autosave version legitimately has no chunk set.
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunk_sets WHERE version_id = ?", Integer.class,
			updated.versionId().value()))
			.isEqualTo(1);
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunk_sets WHERE version_id = ?", Integer.class,
			created.versionId().value()))
			.isZero();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs WHERE kind = 'rechunk' AND status <> 'ready'",
			Integer.class))
			.isZero();
	}

	@Test
	void purgingANoteRemovesItsChunksAndJobs() {
		IngestionJob enqueued = success(ingestionPort.enqueueImport(importOf("purged.md")));
		worker.drain();
		String noteId = (String) jobRow(enqueued.id().value()).get("note_id");

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunks WHERE note_id = ?", Integer.class, noteId)).isPositive();

		success(notesPort.softDelete(new DeleteNote(
			actorA(), new WorkspaceId(WORKSPACE_A), new NoteId(noteId))));
		success(notesPort.purge(new DeleteNote(
			actorA(), new WorkspaceId(WORKSPACE_A), new NoteId(noteId))));

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunks WHERE note_id = ?", Integer.class, noteId)).isZero();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunk_sets", Integer.class)).isZero();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs WHERE note_id = ?", Integer.class, noteId)).isZero();
	}

	@Test
	void appRoleSeesNoJobRowsWithoutATenantGuc() {
		success(ingestionPort.enqueueImport(importOf("fail-closed.md")));

		Integer visible = appTx.execute(status ->
			appJdbc.queryForObject("SELECT COUNT(*) FROM ingestion_jobs", Integer.class));
		Integer chunkSets = appTx.execute(status ->
			appJdbc.queryForObject("SELECT COUNT(*) FROM chunk_sets", Integer.class));

		assertThat(visible).isZero();
		assertThat(chunkSets).isZero();
	}

	private static EnqueueImport importOf(String fileName) {
		return new EnqueueImport(
			actorA(),
			new WorkspaceId(WORKSPACE_A),
			new ImportContent(
				new ByteArrayInputStream(MARKDOWN.getBytes(StandardCharsets.UTF_8)),
				"text/markdown",
				fileName));
	}

	private static String bodyJson(String text) {
		return jsonMapper.writeValueAsString(Map.of(
			"type", "doc",
			"content", List.of(Map.of(
				"type", "paragraph",
				"content", List.of(Map.of("type", "text", "text", text))))));
	}

	private static String storedBody(VersionId versionId) {
		return migratorJdbc().queryForObject(
			"SELECT body_json::text FROM note_versions WHERE version_id = ?",
			String.class, versionId.value());
	}

	private static Map<String, Object> jobRow(String jobId) {
		return migratorJdbc().queryForMap("SELECT * FROM ingestion_jobs WHERE job_id = ?", jobId);
	}

	private static Integer payloadRows(IngestionJob job) {
		return migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_job_payloads WHERE job_id = ?", Integer.class, job.id().value());
	}

	private static TenantActor actorA() {
		return new TenantActor(new TenantId(TENANT_A), new ActorId(ACTOR_A));
	}

	private static TenantActor actorB() {
		return new TenantActor(new TenantId(TENANT_B), new ActorId(ACTOR_B));
	}

	private static <T> T success(PortResult<T> result) {
		assertThat(result).isInstanceOf(PortResult.Success.class);
		return ((PortResult.Success<T>) result).value();
	}

	private static ChunkSet successChunks(PortResult<ChunkSet> result) {
		return success(result);
	}

	private static PortFailure.Code failureCode(PortResult<?> result) {
		assertThat(result).isInstanceOf(PortResult.Failure.class);
		return ((PortResult.Failure<?>) result).failure().code();
	}

	private static void seedTenancy() {
		JdbcTemplate jdbc = migratorJdbc();
		String hash = new BCryptPasswordEncoder().encode("correct horse battery staple");
		jdbc.update(
			"INSERT INTO tenants (tenant_id, name) VALUES (?, ?), (?, ?)",
			TENANT_A, "Tenant A", TENANT_B, "Tenant B");
		jdbc.update(
			"INSERT INTO actors (actor_id, email, password_hash) VALUES (?, ?, ?), (?, ?, ?)",
			ACTOR_A, "ada@example.com", hash, ACTOR_B, "grace@example.com", hash);
		jdbc.update(
			"INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)",
			WORKSPACE_A, TENANT_A, "Workspace A",
			WORKSPACE_A_2, TENANT_A, "Workspace A2",
			WORKSPACE_B, TENANT_B, "Workspace B");
		jdbc.update(
			"INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) "
				+ "VALUES (?, ?, ?, '{owner}'::text[]), (?, ?, ?, '{owner}'::text[]), "
				+ "(?, ?, ?, '{owner}'::text[])",
			WORKSPACE_A, ACTOR_A, TENANT_A,
			WORKSPACE_A_2, ACTOR_A, TENANT_A,
			WORKSPACE_B, ACTOR_B, TENANT_B);
	}

	private static JdbcTemplate migratorJdbc() {
		return new JdbcTemplate(dataSource(jdbcUrlFor(DB), MIGRATOR, MIGRATOR_PASSWORD));
	}

	private static DataSource dataSource(String url, String user, String password) {
		DriverManagerDataSource dataSource = new DriverManagerDataSource();
		dataSource.setDriverClassName("org.postgresql.Driver");
		dataSource.setUrl(url);
		dataSource.setUsername(user);
		dataSource.setPassword(password);
		return dataSource;
	}

	private static String jdbcUrlFor(String database) {
		return POSTGRES.getJdbcUrl().replace("/postgres", "/" + database);
	}
}
