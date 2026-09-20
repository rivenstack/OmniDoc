package com.omnidoc.api.identity;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import javax.sql.DataSource;

import jakarta.servlet.http.Cookie;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B-03 end-to-end identity: sign-in over the real filter chain, SPA CSRF, and
 * server-authoritative membership against the B-02/B-03 schema under {@code omnidoc_app}
 * (NOBYPASSRLS, non-owner).
 *
 * <p>Two tenants are seeded so the IDOR negative is real: actor A holds a session and
 * points the selector at tenant B's workspace.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers(disabledWithoutDocker = true)
class IdentitySessionIT {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String DB = "omnidoc";

	private static final String TENANT_A = "tenant-a";
	private static final String TENANT_B = "tenant-b";
	private static final String ACTOR_A = "actor-a";
	private static final String EMAIL_A = "ada@example.com";
	private static final String EMAIL_B = "grace@example.com";
	private static final String PASSWORD_A = "correct horse \"battery\" staple";
	private static final String WORKSPACE_A = "ws-a";
	private static final String WORKSPACE_B = "ws-b";

	/** Exercises quoting, mixed-case technical tokens, and punctuation through JSON. */
	private static final String WORKSPACE_A_NAME =
		"Ada's \"pgvector + BYOK\" notes — research/2026 (draft)";

	/** Very long unbroken string: must survive the invite path without truncation. */
	private static final String LONG_INVITEE =
		"aVeryLongUnbrokenInviteHandle" + "x".repeat(180) + "@example.com";

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

	@Autowired
	private MockMvc mockMvc;

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", () -> jdbcUrlFor(DB));
		registry.add("spring.datasource.username", () -> APP);
		registry.add("spring.datasource.password", () -> APP_PASSWORD);
		// Flyway already ran as the migrator in bootstrap, before the context loads.
		registry.add("spring.flyway.enabled", () -> false);
	}

	@BeforeAll
	static void bootstrapRolesMigrationsAndSeed() throws Exception {
		try (Connection admin = DriverManager.getConnection(
			POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
			Statement st = admin.createStatement()) {
			st.execute("CREATE ROLE " + MIGRATOR + " LOGIN PASSWORD '" + MIGRATOR_PASSWORD + "' BYPASSRLS");
			st.execute("CREATE ROLE " + APP + " LOGIN PASSWORD '" + APP_PASSWORD + "' NOBYPASSRLS");
			st.execute("CREATE DATABASE " + DB + " OWNER " + MIGRATOR);
		}

		String omnidocUrl = jdbcUrlFor(DB);
		try (Connection admin = DriverManager.getConnection(
			omnidocUrl, POSTGRES.getUsername(), POSTGRES.getPassword());
			Statement st = admin.createStatement()) {
			st.execute("CREATE EXTENSION IF NOT EXISTS vector");
			st.execute("GRANT CONNECT ON DATABASE " + DB + " TO " + APP);
			st.execute("GRANT USAGE ON SCHEMA public TO " + APP);
			st.execute("GRANT CREATE ON SCHEMA public TO " + MIGRATOR);
			st.execute(
				"ALTER DEFAULT PRIVILEGES FOR ROLE " + MIGRATOR + " IN SCHEMA public "
					+ "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + APP);
		}

		Flyway.configure()
			.dataSource(omnidocUrl, MIGRATOR, MIGRATOR_PASSWORD)
			.locations("classpath:db/migration")
			.load()
			.migrate();

		seedAsMigrator(omnidocUrl);
	}

	@Test
	void signInEstablishesSessionAndGetSessionReturnsSameActor() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);

		assertThat(login.getResponse().getStatus()).isEqualTo(200);
		assertThat(login.getResponse().getContentAsString()).contains("\"actorId\":\"" + ACTOR_A + "\"");

		this.mockMvc.perform(get("/api/v1/session").session(sessionOf(login)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.actorId").value(ACTOR_A));
	}

	@Test
	void getSessionWithoutCookieIsUnauthenticated() throws Exception {
		this.mockMvc.perform(get("/api/v1/session"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("unauthenticated"));
	}

	@Test
	void wrongPasswordIsUnauthenticated() throws Exception {
		this.mockMvc.perform(post("/api/v1/session")
				.contentType(MediaType.APPLICATION_JSON)
				.content(credentialsJson(EMAIL_A, "not the password")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("unauthenticated"));
	}

	@Test
	void workspaceListContainsOnlyOwnMemberships() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);

		this.mockMvc.perform(get("/api/v1/workspaces").session(sessionOf(login)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.workspaces.length()").value(1))
			.andExpect(jsonPath("$.workspaces[0].id").value(WORKSPACE_A))
			.andExpect(jsonPath("$.workspaces[0].tenantId").value(TENANT_A))
			.andExpect(jsonPath("$.workspaces[0].name").value(WORKSPACE_A_NAME));
	}

	@Test
	void inviteIntoOwnWorkspaceIsCreated() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);
		Cookie csrf = csrfCookieOf(login);

		this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/invites", WORKSPACE_A)
				.session(sessionOf(login))
				.cookie(csrf)
				.header("X-XSRF-TOKEN", csrf.getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"invitee\":\"" + LONG_INVITEE + "\",\"roles\":[\"editor\"]}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.inviteId").isNotEmpty());

		Integer stored = migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM workspace_invites WHERE tenant_id = ? AND invitee = ?",
			Integer.class, TENANT_A, LONG_INVITEE);
		assertThat(stored).isEqualTo(1);
	}

	@Test
	void inviteIntoForeignWorkspaceIsForbidden() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);
		Cookie csrf = csrfCookieOf(login);

		this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/invites", WORKSPACE_B)
				.session(sessionOf(login))
				.cookie(csrf)
				.header("X-XSRF-TOKEN", csrf.getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"invitee\":\"mallory@example.com\",\"roles\":[\"admin\"]}"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));

		Integer leaked = migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM workspace_invites WHERE tenant_id = ?", Integer.class, TENANT_B);
		assertThat(leaked).isZero();
	}

	@Test
	void mutatingRequestWithoutCsrfHeaderIsRejected() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);

		this.mockMvc.perform(delete("/api/v1/session").session(sessionOf(login)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));
	}

	@Test
	void deleteSessionWithCsrfRevokesTheSession() throws Exception {
		MvcResult login = signIn(EMAIL_A, PASSWORD_A);
		MockHttpSession session = sessionOf(login);
		Cookie csrf = csrfCookieOf(login);

		this.mockMvc.perform(delete("/api/v1/session")
				.session(session)
				.cookie(csrf)
				.header("X-XSRF-TOKEN", csrf.getValue()))
			.andExpect(status().isNoContent());

		assertThat(session.isInvalid()).isTrue();

		this.mockMvc.perform(get("/api/v1/session"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("unauthenticated"));
	}

	private MvcResult signIn(String email, String password) throws Exception {
		return this.mockMvc.perform(post("/api/v1/session")
				.contentType(MediaType.APPLICATION_JSON)
				.content(credentialsJson(email, password)))
			.andExpect(status().isOk())
			.andReturn();
	}

	private static String credentialsJson(String email, String password) {
		return "{\"email\":\"" + email + "\",\"password\":\"" + password.replace("\"", "\\\"") + "\"}";
	}

	private static MockHttpSession sessionOf(MvcResult result) {
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		assertThat(session).as("sign-in must establish a server session").isNotNull();
		return session;
	}

	private static Cookie csrfCookieOf(MvcResult result) {
		Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
		assertThat(cookie).as("sign-in must issue the SPA CSRF cookie").isNotNull();
		return cookie;
	}

	private static void seedAsMigrator(String omnidocUrl) {
		DataSource dataSource = dataSource(omnidocUrl, MIGRATOR, MIGRATOR_PASSWORD);
		JdbcTemplate migrator = new JdbcTemplate(dataSource);
		TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
		String hash = new BCryptPasswordEncoder().encode(PASSWORD_A);

		tx.executeWithoutResult(status -> {
			migrator.update(
				"INSERT INTO tenants (tenant_id, name) VALUES (?, ?), (?, ?)",
				TENANT_A, "Tenant A", TENANT_B, "Tenant B");
			migrator.update(
				"INSERT INTO actors (actor_id, email, password_hash) VALUES (?, ?, ?), (?, ?, ?)",
				ACTOR_A, EMAIL_A, hash,
				"actor-b", EMAIL_B, hash);
			migrator.update(
				"INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES (?, ?, ?), (?, ?, ?)",
				WORKSPACE_A, TENANT_A, WORKSPACE_A_NAME,
				WORKSPACE_B, TENANT_B, "Workspace B");
			migrator.update(
				"INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) "
					+ "VALUES (?, ?, ?, '{owner}'::text[]), (?, ?, ?, '{owner}'::text[])",
				WORKSPACE_A, ACTOR_A, TENANT_A,
				WORKSPACE_B, "actor-b", TENANT_B);
		});
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
