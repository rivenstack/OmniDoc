package com.omnidoc.api.ingestion;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.sql.DataSource;

import jakarta.servlet.http.Cookie;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.ObjectMapper;

import com.omnidoc.api.adapters.ingestion.IngestionLimits;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * S-02 ingestion HTTP contract end to end, with the real runner enabled: enqueue returns
 * {@code 202} at {@code 0/4}, progress becomes visible, and the job reaches
 * {@code ready} at {@code 4/4} with a note and chunks behind it.
 *
 * <p>Also pins the refusals the contract names: {@code 415} for a type outside the
 * allowlist, {@code 413} over the size cap, {@code 403} without CSRF or with another
 * workspace's selector, {@code 400} with no selector, and {@code 404} for an unknown job.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers(disabledWithoutDocker = true)
class IngestionLifecycleE2eIT {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String DB = "omnidoc";

	private static final String TENANT_A = "tenant-a";
	private static final String TENANT_B = "tenant-b";
	private static final String ACTOR_A = "actor-a";
	private static final String ACTOR_B = "actor-b";
	private static final String EMAIL_A = "ada@example.com";
	private static final String PASSWORD_A = "correct horse battery staple";
	private static final String WORKSPACE_A = "ws-a";
	private static final String WORKSPACE_A_2 = "ws-a-2";
	private static final String WORKSPACE_B = "ws-b";

	private static final String WORKSPACE_HEADER = "OmniDoc-Workspace-Id";

	private static final String MARKDOWN = """
		# Imported notes

		Uses `tenant_id`, **pgvector**, *BYOK*, and [OpenAI](https://example.test/a?b=c).

		| Feature | State |
		| --- | --- |
		| Notes | ready |

		```java
		Path config = Path.of("/srv/omnidoc/config/app.yml");
		```
		""";

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", () -> jdbcUrlFor(DB));
		registry.add("spring.datasource.username", () -> APP);
		registry.add("spring.datasource.password", () -> APP_PASSWORD);
		registry.add("spring.flyway.enabled", () -> false);
		// Short sweep so a missed post-commit dispatch still resolves inside the poll
		// window instead of making this test depend on @Async timing alone.
		registry.add("omnidoc.ingestion.sweep-initial-delay-ms", () -> 500);
		registry.add("omnidoc.ingestion.sweep-interval-ms", () -> 1_000);
	}

	@BeforeAll
	static void bootstrapRolesMigrationsAndMemberships() throws Exception {
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
		seedMemberships();
	}

	@BeforeEach
	void clearQueueAndCorpus() {
		migratorJdbc().execute(
			"TRUNCATE TABLE ingestion_job_payloads, ingestion_jobs, chunks, chunk_sets, "
				+ "note_versions, notes CASCADE");
	}

	@Test
	void enqueueReturnsAcceptedAtZeroOfFourAndTheRunnerReachesReady() throws Exception {
		AuthenticatedClient client = signIn();

		MvcResult accepted = this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(markdownPart("imported-notes.md"))
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.status").value("pending"))
			.andExpect(jsonPath("$.completedUnits").value(0))
			.andExpect(jsonPath("$.totalUnits").value(4))
			.andReturn();
		WireJob enqueued = read(accepted, WireJob.class);
		assertThat(enqueued.jobId()).isNotBlank();

		WireJob terminal = pollUntilTerminal(client, enqueued.jobId());
		assertThat(terminal.status()).isEqualTo("ready");
		assertThat(terminal.completedUnits()).isEqualTo(4);
		assertThat(terminal.totalUnits()).isEqualTo(4);

		Map<String, Object> job = migratorJdbc().queryForMap(
			"SELECT note_id, version_id, media_type, size_bytes FROM ingestion_jobs WHERE job_id = ?",
			enqueued.jobId());
		assertThat(job.get("media_type")).isEqualTo("text/markdown");
		assertThat(migratorJdbc().queryForObject(
			"SELECT title FROM notes WHERE note_id = ?", String.class, job.get("note_id")))
			.isEqualTo("imported-notes");
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM chunks WHERE version_id = ?", Integer.class, job.get("version_id")))
			.isPositive();
	}

	@Test
	void enqueueRejectsTypesOutsideTheAllowlistWithUnsupportedType() throws Exception {
		AuthenticatedClient client = signIn();

		this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(new MockMultipartFile("file", "bundle.zip", "application/zip", zipBytes()))
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(jsonPath("$.code").value("unsupported_type"));

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs", Integer.class)).isZero();
	}

	@Test
	void enqueueRejectsFilesOverTheSizeCapWithTooLarge() throws Exception {
		AuthenticatedClient client = signIn();
		byte[] oversized = new byte[(int) IngestionLimits.DEFAULT_MAX_UPLOAD_BYTES + 1];
		java.util.Arrays.fill(oversized, (byte) 'a');

		this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(new MockMultipartFile("file", "huge.txt", "text/plain", oversized))
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isContentTooLarge())
			.andExpect(jsonPath("$.code").value("too_large"));
	}

	@Test
	void enqueueWithoutCsrfIsForbiddenAndWithoutASelectorIsAValidationError() throws Exception {
		AuthenticatedClient client = signIn();

		this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(markdownPart("no-csrf.md"))
				.session(client.session())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));

		this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(markdownPart("no-selector.md"))
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation"));

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM ingestion_jobs", Integer.class)).isZero();
	}

	@Test
	void anonymousRequestsAreUnauthenticated() throws Exception {
		this.mockMvc.perform(get("/api/v1/ingestion-jobs/{jobId}", "job-anything")
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("unauthenticated"));
	}

	@Test
	void pollingAnotherWorkspaceOrAnUnknownJobIsDeniedWithoutLeakingExistence() throws Exception {
		AuthenticatedClient client = signIn();
		MvcResult accepted = this.mockMvc.perform(multipart("/api/v1/ingestion-jobs")
				.file(markdownPart("scoped.md"))
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isAccepted())
			.andReturn();
		String jobId = read(accepted, WireJob.class).jobId();

		this.mockMvc.perform(get("/api/v1/ingestion-jobs/{jobId}", jobId)
				.session(client.session())
				.header(WORKSPACE_HEADER, WORKSPACE_A_2))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));

		// Another tenant's workspace: the session has no membership there at all.
		this.mockMvc.perform(get("/api/v1/ingestion-jobs/{jobId}", jobId)
				.session(client.session())
				.header(WORKSPACE_HEADER, WORKSPACE_B))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));

		this.mockMvc.perform(get("/api/v1/ingestion-jobs/{jobId}", "job-not-real")
				.session(client.session())
				.header(WORKSPACE_HEADER, WORKSPACE_A))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("not_found"));
	}

	private WireJob pollUntilTerminal(AuthenticatedClient client, String jobId) throws Exception {
		Instant deadline = Instant.now().plus(Duration.ofSeconds(30));
		WireJob job = null;
		while (Instant.now().isBefore(deadline)) {
			MvcResult result = this.mockMvc.perform(get("/api/v1/ingestion-jobs/{jobId}", jobId)
					.session(client.session())
					.header(WORKSPACE_HEADER, WORKSPACE_A))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalUnits").value(4))
				.andReturn();
			job = read(result, WireJob.class);
			if (!"pending".equals(job.status()) && !"running".equals(job.status())) {
				return job;
			}
			Thread.sleep(200);
		}
		throw new AssertionError("job " + jobId + " did not reach a terminal state: " + job);
	}

	private static MockMultipartFile markdownPart(String fileName) {
		return new MockMultipartFile(
			"file", fileName, "text/markdown", MARKDOWN.getBytes(StandardCharsets.UTF_8));
	}

	private AuthenticatedClient signIn() throws Exception {
		String credentials = this.objectMapper.writeValueAsString(
			Map.of("email", EMAIL_A, "password", PASSWORD_A));
		MvcResult result = this.mockMvc.perform(
				org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/session")
				.contentType(MediaType.APPLICATION_JSON)
				.content(credentials))
			.andExpect(status().isOk())
			.andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		Cookie csrf = result.getResponse().getCookie("XSRF-TOKEN");
		assertThat(session).isNotNull();
		assertThat(csrf).isNotNull();
		return new AuthenticatedClient(session, csrf);
	}

	private <T> T read(MvcResult result, Class<T> type) {
		return this.objectMapper.readValue(result.getResponse().getContentAsByteArray(), type);
	}

	private static byte[] zipBytes() {
		ByteArrayOutputStream bytes = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
			zip.putNextEntry(new ZipEntry("notes.txt"));
			zip.write("archived".getBytes(StandardCharsets.UTF_8));
			zip.closeEntry();
		}
		catch (java.io.IOException ex) {
			throw new IllegalStateException(ex);
		}
		return bytes.toByteArray();
	}

	private static void seedMemberships() {
		JdbcTemplate jdbc = migratorJdbc();
		String hash = new BCryptPasswordEncoder().encode(PASSWORD_A);
		jdbc.update(
			"INSERT INTO tenants (tenant_id, name) VALUES (?, ?), (?, ?)",
			TENANT_A, "Tenant A", TENANT_B, "Tenant B");
		jdbc.update(
			"INSERT INTO actors (actor_id, email, password_hash) VALUES (?, ?, ?), (?, ?, ?)",
			ACTOR_A, EMAIL_A, hash, ACTOR_B, "grace@example.com", hash);
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

	private record AuthenticatedClient(MockHttpSession session, Cookie csrf) {
	}

	private record WireJob(String jobId, String status, int completedUnits, int totalUnits) {
	}
}
