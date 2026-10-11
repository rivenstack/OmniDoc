package com.omnidoc.api.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** B-06 V1→V5 / populated V3→V5 and runtime-role security matrix. */
@Testcontainers(disabledWithoutDocker = true)
class IngestionMigrationIT {

	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String FRESH_DB = "omnidoc_fresh";
	private static final String UPGRADE_DB = "omnidoc_upgrade";
	private static final String RLS_DB = "omnidoc_rls";
	private static final List<String> INGESTION_TABLES = List.of(
		"ingestion_jobs", "ingestion_job_payloads", "chunk_sets", "chunks", "embeddings");

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))
		.withDatabaseName("postgres")
		.withUsername("postgres")
		.withPassword("test");

	@BeforeAll
	static void migrateFreshAndUpgradeDatabases() throws Exception {
		try (Connection admin = admin("postgres"); Statement statement = admin.createStatement()) {
			statement.execute("CREATE ROLE " + MIGRATOR + " LOGIN PASSWORD '" + MIGRATOR_PASSWORD + "' BYPASSRLS");
			statement.execute("CREATE ROLE " + APP + " LOGIN PASSWORD '" + APP_PASSWORD + "' NOBYPASSRLS");
			statement.execute("CREATE DATABASE " + FRESH_DB + " OWNER " + MIGRATOR);
			statement.execute("CREATE DATABASE " + UPGRADE_DB + " OWNER " + MIGRATOR);
			statement.execute("CREATE DATABASE " + RLS_DB + " OWNER " + MIGRATOR);
		}
		prepareDatabase(FRESH_DB);
		prepareDatabase(UPGRADE_DB);
		prepareDatabase(RLS_DB);

		flyway(FRESH_DB).migrate();
		flyway(RLS_DB).migrate();
		Flyway upgrade = Flyway.configure()
			.dataSource(url(UPGRADE_DB), MIGRATOR, MIGRATOR_PASSWORD)
			.locations("classpath:db/migration")
			.target(MigrationVersion.fromVersion("3"))
			.load();
		upgrade.migrate();
		seedV3Corpus(UPGRADE_DB);
		flyway(UPGRADE_DB).migrate();
		seedRlsCorpus(RLS_DB);
	}

	@Test
	void freshV1ToV5CreatesEmptyAdditiveTables() {
		JdbcTemplate jdbc = migratorJdbc(FRESH_DB);
		assertThat(flyway(FRESH_DB).info().current().getVersion().getVersion()).isEqualTo("5");
		for (String table : INGESTION_TABLES) {
			assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class))
				.as(table)
				.isZero();
		}
	}

	@Test
	void populatedV3ToV5PreservesCorpusAndStartsNewTablesEmpty() {
		JdbcTemplate jdbc = migratorJdbc(UPGRADE_DB);
		assertThat(flyway(UPGRADE_DB).info().current().getVersion().getVersion()).isEqualTo("5");
		assertThat(jdbc.queryForObject("SELECT email FROM actors WHERE actor_id='actor-existing'", String.class))
			.isEqualTo("existing@example.test");
		assertThat(jdbc.queryForObject("SELECT title FROM notes WHERE note_id='note-existing'", String.class))
			.isEqualTo("Existing note");
		assertThat(jdbc.queryForObject(
			"SELECT body_json->'content'->0->'content'->0->>'text' FROM note_versions WHERE version_id='version-existing'",
			String.class)).isEqualTo("survives V4");
		for (String table : INGESTION_TABLES) {
			assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class)).isZero();
		}
		try (Connection connection = appDataSource(UPGRADE_DB).getConnection()) {
			connection.setAutoCommit(false);
			try (PreparedStatement bind = connection.prepareStatement(
				"SELECT set_config('app.current_tenant_id', 'tenant-existing', true)")) {
				bind.execute();
			}
			assertThat(count(connection, "workspaces")).isEqualTo(1);
			assertThat(count(connection, "notes")).isEqualTo(1);
			assertThat(count(connection, "note_versions")).isEqualTo(1);
			connection.rollback();
		}
		catch (SQLException ex) {
			throw new AssertionError("V3 corpus must remain readable by the runtime role", ex);
		}
	}

	@Test
	void newTablesForceRlsAndGrantOnlyRuntimeDml() {
		JdbcTemplate jdbc = migratorJdbc(RLS_DB);
		for (String table : INGESTION_TABLES) {
			assertThat(jdbc.queryForObject(
				"SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = ?::regclass",
				Boolean.class, table)).as(table).isTrue();
			assertThat(jdbc.queryForList(
				"SELECT privilege_type FROM information_schema.role_table_grants "
					+ "WHERE grantee=? AND table_name=? ORDER BY privilege_type",
				String.class, APP, table))
				.containsExactly("DELETE", "INSERT", "SELECT", "UPDATE");
		}
		assertThat(jdbc.queryForObject(
			"SELECT rolbypassrls FROM pg_roles WHERE rolname=?", Boolean.class, APP)).isFalse();
	}

	@Test
	void appRoleFailsClosedAndCannotWriteAnotherTenant() throws Exception {
		JdbcTemplate app = appJdbc(RLS_DB);
		for (String table : INGESTION_TABLES) {
			assertThat(app.queryForObject("SELECT count(*) FROM " + table, Integer.class))
				.as(table + " without tenant GUC")
				.isZero();
		}

		try (Connection connection = appDataSource(RLS_DB).getConnection()) {
			connection.setAutoCommit(false);
			try (PreparedStatement setTenant = connection.prepareStatement(
				"SELECT set_config('app.current_tenant_id', ?, true)")) {
				setTenant.setString(1, "tenant-a");
				setTenant.execute();
			}
			assertThat(count(connection, "ingestion_jobs")).isEqualTo(1);
			assertThat(count(connection, "ingestion_job_payloads")).isEqualTo(1);
			assertThat(count(connection, "chunk_sets")).isEqualTo(1);
			assertThat(count(connection, "chunks")).isEqualTo(1);
			try (Statement statement = connection.createStatement()) {
				for (String table : INGESTION_TABLES) {
					assertThat(statement.executeUpdate(
						"UPDATE " + table + " SET tenant_id='tenant-a' WHERE tenant_id='tenant-b'"))
						.as("cross-tenant update on " + table)
						.isZero();
				}
			}

			assertThatThrownBy(() -> insertForeignTenantJob(connection))
				.isInstanceOf(SQLException.class)
				.hasMessageContaining("row-level security");
			connection.rollback();
		}
	}

	@Test
	void databaseRejectsInvalidJobStatusAndProgress() {
		assertThatThrownBy(() -> migratorJdbc(RLS_DB).update(
			"UPDATE ingestion_jobs SET status='completed' WHERE job_id='job-a'"))
			.isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
		assertThatThrownBy(() -> migratorJdbc(RLS_DB).update(
			"UPDATE ingestion_jobs SET completed_units=5 WHERE job_id='job-a'"))
			.isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
	}

	@Test
	void claimFunctionIsAppOnlyAndClaimsDistinctRows() throws Exception {
		JdbcTemplate jdbc = migratorJdbc(RLS_DB);
		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM information_schema.routine_privileges "
				+ "WHERE routine_name='claim_ingestion_job' AND grantee='PUBLIC'",
			Integer.class)).isZero();
		assertThat(jdbc.queryForObject(
			"SELECT count(*) FROM information_schema.routine_privileges "
				+ "WHERE routine_name='claim_ingestion_job' AND grantee=? AND privilege_type='EXECUTE'",
			Integer.class, APP)).isEqualTo(1);

		try (Connection connection = appDataSource(RLS_DB).getConnection();
			PreparedStatement claim = connection.prepareStatement(
				"SELECT o_job_id FROM claim_ingestion_job('migration-test', 120)")) {
			assertThat(claim.executeQuery().next()).isTrue();
		}
	}

	private static void prepareDatabase(String database) throws Exception {
		try (Connection connection = admin(database); Statement statement = connection.createStatement()) {
			statement.execute("CREATE EXTENSION IF NOT EXISTS vector");
			statement.execute("GRANT CONNECT ON DATABASE " + database + " TO " + APP);
			statement.execute("GRANT USAGE ON SCHEMA public TO " + APP);
			statement.execute("GRANT CREATE ON SCHEMA public TO " + MIGRATOR);
		}
	}

	private static Flyway flyway(String database) {
		return Flyway.configure()
			.dataSource(url(database), MIGRATOR, MIGRATOR_PASSWORD)
			.locations("classpath:db/migration")
			.load();
	}

	private static void seedV3Corpus(String database) throws Exception {
		try (Connection connection = DriverManager.getConnection(url(database), MIGRATOR, MIGRATOR_PASSWORD);
			Statement statement = connection.createStatement()) {
			connection.setAutoCommit(false);
			statement.execute("SET CONSTRAINTS ALL DEFERRED");
			statement.execute("INSERT INTO tenants (tenant_id,name) VALUES ('tenant-existing','Existing')");
			statement.execute("INSERT INTO actors (actor_id,email,password_hash) VALUES ('actor-existing','existing@example.test','hash')");
			statement.execute("INSERT INTO workspaces (workspace_id,tenant_id,name) VALUES ('ws-existing','tenant-existing','Existing')");
			statement.execute("INSERT INTO workspace_memberships (workspace_id,actor_id,tenant_id,roles) VALUES ('ws-existing','actor-existing','tenant-existing','{owner}')");
			statement.execute("INSERT INTO notes (note_id,tenant_id,workspace_id,title,body_json,current_version_id) VALUES ('note-existing','tenant-existing','ws-existing','Existing note','{\"type\":\"doc\"}'::jsonb,'version-existing')");
			statement.execute("INSERT INTO note_versions (version_id,note_id,tenant_id,title,body_json) VALUES ('version-existing','note-existing','tenant-existing','Existing note','{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"survives V4\"}]}]}'::jsonb)");
			connection.commit();
		}
	}

	private static void seedRlsCorpus(String database) throws Exception {
		try (Connection connection = DriverManager.getConnection(url(database), MIGRATOR, MIGRATOR_PASSWORD);
			Statement statement = connection.createStatement()) {
			connection.setAutoCommit(false);
			statement.execute("SET CONSTRAINTS ALL DEFERRED");
			for (String suffix : List.of("a", "b")) {
				statement.execute("INSERT INTO tenants (tenant_id,name) VALUES ('tenant-" + suffix + "','Tenant " + suffix + "')");
				statement.execute("INSERT INTO actors (actor_id,email,password_hash) VALUES ('actor-" + suffix + "','" + suffix + "@example.test','hash')");
				statement.execute("INSERT INTO workspaces (workspace_id,tenant_id,name) VALUES ('ws-" + suffix + "','tenant-" + suffix + "','Workspace " + suffix + "')");
				statement.execute("INSERT INTO workspace_memberships (workspace_id,actor_id,tenant_id,roles) VALUES ('ws-" + suffix + "','actor-" + suffix + "','tenant-" + suffix + "','{owner}')");
				statement.execute("INSERT INTO notes (note_id,tenant_id,workspace_id,title,body_json,current_version_id) VALUES ('note-" + suffix + "','tenant-" + suffix + "','ws-" + suffix + "','Note','{\"type\":\"doc\"}'::jsonb,'version-" + suffix + "')");
				statement.execute("INSERT INTO note_versions (version_id,note_id,tenant_id,title,body_json) VALUES ('version-" + suffix + "','note-" + suffix + "','tenant-" + suffix + "','Note','{\"type\":\"doc\"}'::jsonb)");
				statement.execute("INSERT INTO ingestion_jobs (job_id,tenant_id,workspace_id,actor_id,kind,status,file_name,media_type,size_bytes) VALUES ('job-" + suffix + "','tenant-" + suffix + "','ws-" + suffix + "','actor-" + suffix + "','import','pending','note.md','text/markdown',4)");
				statement.execute("INSERT INTO ingestion_job_payloads (job_id,tenant_id,bytes) VALUES ('job-" + suffix + "','tenant-" + suffix + "',decode('74657374','hex'))");
				statement.execute("INSERT INTO chunk_sets (version_id,tenant_id,projector_id,chunker_id,params_hash,projection_sha256,chunk_count) VALUES ('version-" + suffix + "','tenant-" + suffix + "','pm-md-v1','omni-blockpack-v1','params','sha',1)");
				statement.execute("INSERT INTO chunks (chunk_id,tenant_id,workspace_id,note_id,version_id,ordinal,start_block,end_block,start_offset,end_offset,text,text_sha256) VALUES ('chunk-" + suffix + "','tenant-" + suffix + "','ws-" + suffix + "','note-" + suffix + "','version-" + suffix + "',0,0,0,0,4,'test','sha')");
				statement.execute("INSERT INTO embeddings (chunk_id,tenant_id,workspace_id,note_id,version_id,embedding_model_id,dimensions,embedding) VALUES ('chunk-" + suffix + "','tenant-" + suffix + "','ws-" + suffix + "','note-" + suffix + "','version-" + suffix + "','mock-embeddings-v1',16,'[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]'::vector)");
			}
			connection.commit();
		}
	}

	private static int count(Connection connection, String table) throws SQLException {
		try (Statement statement = connection.createStatement(); var rows = statement.executeQuery(
			"SELECT count(*) FROM " + table)) {
			rows.next();
			return rows.getInt(1);
		}
	}

	private static void insertForeignTenantJob(Connection connection) throws SQLException {
		try (Statement statement = connection.createStatement()) {
			statement.executeUpdate(
				"INSERT INTO ingestion_jobs (job_id,tenant_id,workspace_id,actor_id,kind,status) "
					+ "VALUES ('job-cross-tenant','tenant-b','ws-b','actor-b','rechunk','pending')");
		}
	}

	private static Connection admin(String database) throws SQLException {
		return DriverManager.getConnection(url(database), POSTGRES.getUsername(), POSTGRES.getPassword());
	}

	private static JdbcTemplate migratorJdbc(String database) {
		return new JdbcTemplate(dataSource(database, MIGRATOR, MIGRATOR_PASSWORD));
	}

	private static JdbcTemplate appJdbc(String database) {
		return new JdbcTemplate(appDataSource(database));
	}

	private static DataSource appDataSource(String database) {
		return dataSource(database, APP, APP_PASSWORD);
	}

	private static DataSource dataSource(String database, String user, String password) {
		DriverManagerDataSource dataSource = new DriverManagerDataSource();
		dataSource.setDriverClassName("org.postgresql.Driver");
		dataSource.setUrl(url(database));
		dataSource.setUsername(user);
		dataSource.setPassword(password);
		return dataSource;
	}

	private static String url(String database) {
		return POSTGRES.getJdbcUrl().replace("/postgres", "/" + database);
	}
}
