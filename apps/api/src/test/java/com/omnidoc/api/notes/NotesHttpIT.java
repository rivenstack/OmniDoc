package com.omnidoc.api.notes;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

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

import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.GetNote;
import com.omnidoc.api.domain.NotesModels.ListNotes;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.NotePage;
import com.omnidoc.api.domain.NotesModels.PageRequest;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.persistence.TenantRlsSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B-04 HTTP + JDBC integration against the runtime NOBYPASSRLS role. The fixture has
 * two tenants and two same-tenant workspaces so tenant and workspace isolation are
 * independently exercised.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers(disabledWithoutDocker = true)
class NotesHttpIT {

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

	private static final String LONG_TITLE =
		"Ada's \"nested 'quotes'\" — pgvector/BYOK/OpenAI: notes (v2)!? [draft]" + " x".repeat(80);
	private static final String LONG_TOKEN = "eyJhbGciOiJub25lIn0." + "A".repeat(260);
	private static final String FIXTURE_TEXT = """
		```java
		Path config = Path.of("/srv/omnidoc/config/app.yml");
		```
		Use `tenant_id`, pgvector, BYOK, and OpenAI. URL: https://example.test/a?b=c.
		| Feature | State |
		| --- | --- |
		| Notes | ready |
		Token: %s
		""".formatted(LONG_TOKEN);

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

	@Autowired
	private NotesPort notesPort;

	@Autowired
	private JdbcTemplate appJdbc;

	@Autowired
	private TransactionTemplate transactionTemplate;

	@Autowired
	private TenantRlsSession rlsSession;

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
	void fixtureRichCrudRoundTripAndEmptyList() throws Exception {
		AuthenticatedClient client = signIn();

		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(0))
			.andExpect(jsonPath("$.nextCursor").doesNotExist());

		WireNote created = createNote(client, WORKSPACE_A, LONG_TITLE, FIXTURE_TEXT, "mine");
		assertThat(created.title()).isEqualTo(LONG_TITLE);
		assertThat(created.corpusOwnership()).isEqualTo("mine");
		assertThat(created.bodyJson().get("type").asString()).isEqualTo("doc");

		MvcResult getResult = this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id())
				.session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(created.id()))
			.andExpect(jsonPath("$.title").value(LONG_TITLE))
			.andExpect(jsonPath("$.bodyJson.content[0].content[0].text").value(FIXTURE_TEXT))
			.andReturn();
		WireNote loaded = read(getResult, WireNote.class);
		assertThat(loaded.versionId()).isEqualTo(created.versionId());

		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].id").value(created.id()));
	}

	@Test
	void updateAppendsVersionAndStaleTokenReturnsConflict() throws Exception {
		AuthenticatedClient client = signIn();
		WireNote created = createNote(client, WORKSPACE_A, "Initial", "initial body", null);
		String updatedJson = updateJson("Updated", "updated body", created.versionId());

		MvcResult update = this.mockMvc.perform(patch("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(updatedJson))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Updated"))
			.andReturn();
		WireNote updated = read(update, WireNote.class);
		assertThat(updated.versionId()).isNotEqualTo(created.versionId());

		this.mockMvc.perform(patch("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(updateJson("Stale", "must not win", created.versionId())))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("conflict"));

		List<String> history = migratorJdbc().query(
			"SELECT title FROM note_versions WHERE note_id = ? ORDER BY created_at, version_id",
			(rs, rowNum) -> rs.getString("title"), created.id());
		assertThat(history).containsExactlyInAnyOrder("Initial", "Updated");
	}

	@Test
	void concurrentWritersAllowExactlyOneCompareAndSwap() throws Exception {
		TenantActor actor = actorA();
		Note created = success(this.notesPort.create(new CreateNote(
			actor,
			new WorkspaceId(WORKSPACE_A),
			new NoteFields("Concurrent", bodyJson("base")),
			Optional.of(CorpusOwnership.MINE))));
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch start = new CountDownLatch(1);

		Callable<PortResult<Note>> writerOne = writer(created, "writer-one", ready, start);
		Callable<PortResult<Note>> writerTwo = writer(created, "writer-two", ready, start);
		ExecutorService executor = Executors.newFixedThreadPool(2);
		try {
			Future<PortResult<Note>> first = executor.submit(writerOne);
			Future<PortResult<Note>> second = executor.submit(writerTwo);
			ready.await();
			start.countDown();
			List<PortResult<Note>> results = List.of(first.get(), second.get());

			assertThat(results.stream().filter(PortResult.Success.class::isInstance)).hasSize(1);
			assertThat(results.stream()
				.filter(PortResult.Failure.class::isInstance)
				.map(result -> ((PortResult.Failure<Note>) result).failure().code()))
				.containsExactly(PortFailure.Code.CONFLICT);
		}
		finally {
			executor.shutdownNow();
		}

		Integer versions = migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM note_versions WHERE note_id = ?", Integer.class, created.id().value());
		assertThat(versions).isEqualTo(2);
	}

	@Test
	void softDeleteHidesNormalOperationsButPurgeRemovesTombstoneAndVersions() throws Exception {
		AuthenticatedClient client = signIn();
		WireNote created = createNote(client, WORKSPACE_A, "Delete me", "body", null);

		this.mockMvc.perform(post("/api/v1/notes/{noteId}/soft-delete", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue()))
			.andExpect(status().isNoContent())
			.andExpect(content().string(""));

		this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id()).session(client.session()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("not_found"));
		this.mockMvc.perform(patch("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(updateJson("Hidden", "body", created.versionId())))
			.andExpect(status().isNotFound());
		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(0));

		// Headerless purge must discover the soft-deleted note through memberships.
		this.mockMvc.perform(post("/api/v1/notes/{noteId}/purge", created.id())
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue()))
			.andExpect(status().isNoContent())
			.andExpect(content().string(""));

		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM notes WHERE note_id = ?", Integer.class, created.id())).isZero();
		assertThat(migratorJdbc().queryForObject(
			"SELECT COUNT(*) FROM note_versions WHERE note_id = ?", Integer.class, created.id())).isZero();
	}

	@Test
	void optionalHeaderResolutionEnforcesWorkspaceAndTenantMembership() throws Exception {
		AuthenticatedClient client = signIn();
		WireNote created = createNote(client, WORKSPACE_A, "Scoped", "body", null);

		this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.header("OmniDoc-Workspace-Id", WORKSPACE_A))
			.andExpect(status().isOk());
		this.mockMvc.perform(get("/api/v1/notes/{noteId}", created.id())
				.session(client.session())
				.header("OmniDoc-Workspace-Id", WORKSPACE_A_2))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));

		seedNoteAsMigrator("note-b", "version-b", TENANT_B, WORKSPACE_B, "Tenant B");
		this.mockMvc.perform(get("/api/v1/notes/{noteId}", "note-b")
				.session(client.session())
				.header("OmniDoc-Workspace-Id", WORKSPACE_B))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));
		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_B)
				.session(client.session()))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));
		this.mockMvc.perform(get("/api/v1/notes/{noteId}", "note-b")
				.session(client.session()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("not_found"));
	}

	@Test
	void rlsReturnsZeroCrossTenantRowsUnderRuntimeRole() {
		seedNoteAsMigrator("note-b", "version-b", TENANT_B, WORKSPACE_B, "Tenant B");

		Integer count = this.transactionTemplate.execute(status ->
			this.rlsSession.callWithinActorAndTenant(ACTOR_A, TENANT_A, () ->
				this.appJdbc.queryForObject(
					"SELECT COUNT(*) FROM notes WHERE tenant_id = ?", Integer.class, TENANT_B)));

		assertThat(count).isZero();
		NotePage page = successPage(this.notesPort.list(new ListNotes(
			actorA(), new WorkspaceId(WORKSPACE_A), new PageRequest(20, Optional.empty()))));
		assertThat(page.items()).isEmpty();
		PortResult<Note> getResult = this.notesPort.get(new GetNote(
			actorA(), new NoteId("note-b"), Optional.empty(), false));
		assertThat(getResult).isInstanceOfSatisfying(PortResult.Failure.class,
			failure -> assertThat(failure.failure().code()).isEqualTo(PortFailure.Code.NOT_FOUND));
	}

	@Test
	void paginationIsStableAndCursorIsWorkspaceBound() throws Exception {
		AuthenticatedClient client = signIn();
		createNote(client, WORKSPACE_A, "One", "one", null);
		createNote(client, WORKSPACE_A, "Two", "two", null);
		createNote(client, WORKSPACE_A, "Three", "three", null);

		MvcResult firstResult = this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session())
				.queryParam("limit", "2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(2))
			.andExpect(jsonPath("$.nextCursor").isNotEmpty())
			.andReturn();
		WirePage first = read(firstResult, WirePage.class);

		MvcResult secondResult = this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session())
				.queryParam("limit", "2")
				.queryParam("cursor", first.nextCursor()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(1))
			.andReturn();
		WirePage second = read(secondResult, WirePage.class);
		assertThat(first.items()).extracting(WireNote::id)
			.doesNotContain(second.items().getFirst().id());

		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A_2)
				.session(client.session())
				.queryParam("limit", "2")
				.queryParam("cursor", first.nextCursor()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation"));
		this.mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session())
				.queryParam("cursor", "not-a-base64url-cursor!"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation"));
	}

	@Test
	void invalidBodiesAndMissingCsrfUseCanonicalErrors() throws Exception {
		AuthenticatedClient client = signIn();
		String arrayBody = this.objectMapper.writeValueAsString(Map.of(
			"title", "Invalid",
			"bodyJson", List.of("not", "an", "object")));

		this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(arrayBody))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation"));

		this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/notes", WORKSPACE_A)
				.session(client.session())
				.contentType(MediaType.APPLICATION_JSON)
				.content(createJson("No CSRF", "body", null)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));
	}

	private Callable<PortResult<Note>> writer(
		Note created, String title, CountDownLatch ready, CountDownLatch start) {
		return () -> {
			ready.countDown();
			start.await();
			return this.notesPort.update(new UpdateNote(
				actorA(),
				new WorkspaceId(WORKSPACE_A),
				created.id(),
				new NoteFields(title, bodyJson(title)),
				new VersionToken(created.versionId().value())));
		};
	}

	private WireNote createNote(
		AuthenticatedClient client, String workspaceId, String title, String text, String ownership) throws Exception {
		MvcResult result = this.mockMvc.perform(post("/api/v1/workspaces/{workspaceId}/notes", workspaceId)
				.session(client.session())
				.cookie(client.csrf())
				.header("X-XSRF-TOKEN", client.csrf().getValue())
				.contentType(MediaType.APPLICATION_JSON)
				.content(createJson(title, text, ownership)))
			.andExpect(status().isCreated())
			.andReturn();
		return read(result, WireNote.class);
	}

	private AuthenticatedClient signIn() throws Exception {
		String credentials = this.objectMapper.writeValueAsString(
			Map.of("email", EMAIL_A, "password", PASSWORD_A));
		MvcResult result = this.mockMvc.perform(post("/api/v1/session")
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

	private String createJson(String title, String text, String ownership) {
		Map<String, Object> request = new java.util.LinkedHashMap<>();
		request.put("title", title);
		request.put("bodyJson", bodyDocument(text));
		if (ownership != null) {
			request.put("corpusOwnership", ownership);
		}
		return this.objectMapper.writeValueAsString(request);
	}

	private String updateJson(String title, String text, String expectedVersion) {
		return this.objectMapper.writeValueAsString(Map.of(
			"title", title,
			"bodyJson", bodyDocument(text),
			"expectedVersion", expectedVersion));
	}

	private String bodyJson(String text) {
		return this.objectMapper.writeValueAsString(bodyDocument(text));
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

	private static TenantActor actorA() {
		return new TenantActor(new TenantId(TENANT_A), new ActorId(ACTOR_A));
	}

	private static Note success(PortResult<Note> result) {
		assertThat(result).isInstanceOf(PortResult.Success.class);
		return ((PortResult.Success<Note>) result).value();
	}

	private static NotePage successPage(PortResult<NotePage> result) {
		assertThat(result).isInstanceOf(PortResult.Success.class);
		return ((PortResult.Success<NotePage>) result).value();
	}

	private static void seedMemberships(String url) {
		JdbcTemplate jdbc = new JdbcTemplate(dataSource(url, MIGRATOR, MIGRATOR_PASSWORD));
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

	private static void seedNoteAsMigrator(
		String noteId, String versionId, String tenantId, String workspaceId, String title) {
		JdbcTemplate jdbc = migratorJdbc();
		TransactionTemplate tx = new TransactionTemplate(
			new DataSourceTransactionManager(jdbc.getDataSource()));
		tx.executeWithoutResult(status -> {
			jdbc.update(
				"INSERT INTO notes "
					+ "(note_id, tenant_id, workspace_id, title, body_json, current_version_id) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?)",
				noteId, tenantId, workspaceId, title, "{\"type\":\"doc\",\"content\":[]}", versionId);
			jdbc.update(
				"INSERT INTO note_versions (version_id, note_id, tenant_id, title, body_json) "
					+ "VALUES (?, ?, ?, ?, CAST(? AS jsonb))",
				versionId, noteId, tenantId, title, "{\"type\":\"doc\",\"content\":[]}");
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

	private record WirePage(List<WireNote> items, String nextCursor) {
	}
}
