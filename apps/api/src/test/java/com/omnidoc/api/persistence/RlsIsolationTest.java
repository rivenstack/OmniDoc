package com.omnidoc.api.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves RLS DiD under omnidoc_app (NOBYPASSRLS, non-owner):
 * cross-tenant invisibility + missing GUC → empty (fail closed).
 */
@Testcontainers(disabledWithoutDocker = true)
class RlsIsolationTest {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String DB = "omnidoc";

	private static final String TENANT_A = "tenant-a";
	private static final String TENANT_B = "tenant-b";

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

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
	void appRoleSeesOnlyOwnTenantWhenGucSet() {
		DataSource appDs = appDataSource();
		JdbcTemplate jdbc = new JdbcTemplate(appDs);
		TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(appDs));
		TenantRlsSession rls = new TenantRlsSession(jdbc);

		List<String> titles = tx.execute(status -> rls.callWithinTenant(TENANT_A, () ->
			jdbc.query("SELECT title FROM notes ORDER BY note_id", (rs, rowNum) -> rs.getString(1))));

		assertThat(titles).containsExactly("Note A");
	}

	@Test
	void appRoleCannotSeeOtherTenantRows() {
		DataSource appDs = appDataSource();
		JdbcTemplate jdbc = new JdbcTemplate(appDs);
		TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(appDs));
		TenantRlsSession rls = new TenantRlsSession(jdbc);

		Integer countBFromA = tx.execute(status -> rls.callWithinTenant(TENANT_A, () ->
			jdbc.queryForObject(
				"SELECT COUNT(*) FROM notes WHERE tenant_id = ?",
				Integer.class,
				TENANT_B)));

		assertThat(countBFromA).isZero();
	}

	@Test
	void missingTenantGucReturnsEmpty() {
		DataSource appDs = appDataSource();
		JdbcTemplate jdbc = new JdbcTemplate(appDs);
		TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(appDs));

		Integer count = tx.execute(status ->
			jdbc.queryForObject("SELECT COUNT(*) FROM notes", Integer.class));

		assertThat(count).isZero();
	}

	@Test
	void migratorOwnerSeesAllRowsWithoutGuc() {
		JdbcTemplate migrator = new JdbcTemplate(
			dataSource(jdbcUrlFor(DB), MIGRATOR, MIGRATOR_PASSWORD));
		Integer count = migrator.queryForObject("SELECT COUNT(*) FROM notes", Integer.class);
		assertThat(count).isEqualTo(2);
	}

	private static void seedAsMigrator(String omnidocUrl) {
		DataSource ds = dataSource(omnidocUrl, MIGRATOR, MIGRATOR_PASSWORD);
		JdbcTemplate migrator = new JdbcTemplate(ds);
		TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(ds));

		tx.executeWithoutResult(status -> {
			migrator.update(
				"INSERT INTO tenants (tenant_id, name) VALUES (?, ?), (?, ?)",
				TENANT_A, "Tenant A", TENANT_B, "Tenant B");
			migrator.update(
				"INSERT INTO actors (actor_id, email) VALUES (?, ?), (?, ?)",
				"actor-a", "a@example.com", "actor-b", "b@example.com");
			migrator.update(
				"INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES (?, ?, ?), (?, ?, ?)",
				"ws-a", TENANT_A, "Workspace A", "ws-b", TENANT_B, "Workspace B");
			migrator.update(
				"INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) "
					+ "VALUES (?, ?, ?, '{owner}'::text[]), (?, ?, ?, '{owner}'::text[])",
				"ws-a", "actor-a", TENANT_A,
				"ws-b", "actor-b", TENANT_B);

			migrator.update(
				"INSERT INTO notes (note_id, tenant_id, workspace_id, title, body_json, current_version_id, corpus_ownership) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)",
				"note-a", TENANT_A, "ws-a", "Note A", "{\"type\":\"doc\",\"content\":[]}", "ver-a", "mine");
			migrator.update(
				"INSERT INTO note_versions (version_id, note_id, tenant_id, title, body_json) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb))",
				"ver-a", "note-a", TENANT_A, "Note A", "{\"type\":\"doc\",\"content\":[]}");

			migrator.update(
				"INSERT INTO notes (note_id, tenant_id, workspace_id, title, body_json, current_version_id, corpus_ownership) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)",
				"note-b", TENANT_B, "ws-b", "Note B", "{\"type\":\"doc\",\"content\":[]}", "ver-b", "mine");
			migrator.update(
				"INSERT INTO note_versions (version_id, note_id, tenant_id, title, body_json) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb))",
				"ver-b", "note-b", TENANT_B, "Note B", "{\"type\":\"doc\",\"content\":[]}");
		});
	}

	private static DataSource appDataSource() {
		return dataSource(jdbcUrlFor(DB), APP, APP_PASSWORD);
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
