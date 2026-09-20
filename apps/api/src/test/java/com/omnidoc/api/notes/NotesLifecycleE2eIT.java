package com.omnidoc.api.notes;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import jakarta.servlet.http.Cookie;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B-04c single API e2e journey: login → workspaces → notes create/get/update
 * (conflict + ok) → soft-delete → purge.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers(disabledWithoutDocker = true)
class NotesLifecycleE2eIT {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String DB = "omnidoc";

	private static final String TENANT_A = "tenant-a";
	private static final String ACTOR_A = "actor-a";
	private static final String EMAIL_A = "ada@example.com";
	private static final String PASSWORD_A = "correct horse battery staple";
	private static final String WORKSPACE_A = "ws-a";

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
		seedMemberships(url);
	}

	@BeforeEach
	void clearNotes() {
		migratorJdbc().execute("TRUNCATE TABLE note_versions, notes CASCADE");
	}

	@Test
	void loginWorkspacesNotesConflictUpdateSoftDeleteAndPurge() throws Exception {
		AuthenticatedClient client = signIn();

		MvcResult workspaces = this.mockMvc.perform(get("/api/v1/workspaces").session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.workspaces[0].id").value(WORKSPACE_A))
			.andReturn();
		String workspaceId = this.objectMapper.readTree(workspaces.getResponse().getContentAsByteArray())
			.get("workspaces").get(0).get("id").asString();

		MvcResult createResult = this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/notes", workspaceId)
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(createJson("Lifecycle", "start")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.title").value("Lifecycle"))
			.andReturn();
		WireNote created = read(createResult, WireNote.class);

		this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id()).session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versionId").value(created.versionId()));

		this.mockMvc.perform(patch("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(updateJson("Stale", "must lose", "version-does-not-exist")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("conflict"));

		MvcResult okUpdate = this.mockMvc.perform(patch("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(updateJson("Updated", "ok body", created.versionId())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Updated"))
			.andReturn();
		WireNote updated = read(okUpdate, WireNote.class);
		assertThat(updated.versionId()).isNotEqualTo(created.versionId());

		this.mockMvc.perform(post("/api/v1/notes/{noteId}/soft-delete", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue()))
			.andExpect(status().isNoContent());

		this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id()).session(client.session()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("not_found"));

		this.mockMvc.perform(post("/api/v1/notes/{noteId}/purge", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue()))
			.andExpect(status().isNoContent());

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM notes WHERE note_id = ?", Integer.class, created.id())).isZero();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM note_versions WHERE note_id = ?", Integer.class, created.id())).isZero();
	}

	private AuthenticatedClient signIn() throws Exception {
		MvcResult result = this.mockMvc.perform(post("/api/v1/session")
				.contentType(MediaType.APPLICATION_JSON)
				.content(this.objectMapper.writeValueAsString(
					Map.of("email", EMAIL_A, "password", PASSWORD_A))))
			.andExpect(status().isOk())
			.andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		Cookie csrf = result.getResponse().getCookie("XSRF-TOKEN");
		assertThat(session).isNotNull();
		assertThat(csrf).isNotNull();
		return new AuthenticatedClient(session, csrf);
	}

	private String createJson(String title, String text) {
		return this.objectMapper.writeValueAsString(Map.of(
			"title", title,
			"bodyJson", bodyDocument(text)));
	}

	private String updateJson(String title, String text, String expectedVersion) {
		return this.objectMapper.writeValueAsString(Map.of(
			"title", title,
			"bodyJson", bodyDocument(text),
			"expectedVersion", expectedVersion));
	}

	private static Map<String, Object> bodyDocument(String text) {
		return Map.of(
			"type", "doc",
			"content", List.of(Map.of(
				"type", "paragraph",
				"content", List.of(Map.of("type", "text", "text", text)))));
	}

	private <T> T read(MvcResult result, Class<T> type) {
		return this.objectMapper.readValue(result.getResponse().getContentAsByteArray(), type);
	}

	private static void seedMemberships(String url) {
		JdbcTemplate jdbc = new JdbcTemplate(dataSource(url, MIGRATOR, MIGRATOR_PASSWORD));
		String hash = new BCryptPasswordEncoder().encode(PASSWORD_A);
		jdbc.update("INSERT INTO tenants (tenant_id, name) VALUES (?, ?)", TENANT_A, "Tenant A");
		jdbc.update(
			"INSERT INTO actors (actor_id, email, password_hash) VALUES (?, ?, ?)",
			ACTOR_A, EMAIL_A, hash);
		jdbc.update(
			"INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES (?, ?, ?)",
			WORKSPACE_A, TENANT_A, "Workspace A");
		jdbc.update(
			"INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) "
				+ "VALUES (?, ?, ?, '{owner}'::text[])",
			WORKSPACE_A, ACTOR_A, TENANT_A);
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

	private record WireNote(
		String id,
		String workspaceId,
		String versionId,
		String title,
		JsonNode bodyJson,
		Instant updatedAt,
		String corpusOwnership) {
	}

}
