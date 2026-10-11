package com.omnidoc.api.eval.b06d;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.ai.document.MetadataMode;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingOptions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.adapters.notes.JdbcNotesAdapter;
import com.omnidoc.api.adapters.notes.RechunkOutbox;
import com.omnidoc.api.adapters.retrieval.JdbcVectorSearchAdapter;
import com.omnidoc.api.adapters.retrieval.MockEmbeddingAdapter;
import com.omnidoc.api.adapters.retrieval.MockRuntimeModeAdapter;
import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.chunking.ChunkDraft;
import com.omnidoc.api.chunking.ChunkPolicy;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.Embedding;
import com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;
import com.omnidoc.api.domain.RuntimeModeModels.ResolveMode;
import com.omnidoc.api.domain.RuntimeModeModels.ResolvedMode;
import com.omnidoc.api.domain.RuntimeModeModels.StampOutbound;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.Projection;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

final class B06dAvalaiProbeRunner {

	private static final ObjectMapper JSON = JsonMapper.builder().build();
	private static final String MIGRATOR = "omnidoc_migrator";
	private static final String MIGRATOR_PASSWORD = "omnidoc_migrator_dev";
	private static final String APP = "omnidoc_app";
	private static final String APP_PASSWORD = "omnidoc_app_dev";
	private static final String STORAGE_MODEL_ID = "avalai:text-embedding-v4:1024";
	private static final String PROVIDER_MODEL_ID = "text-embedding-v4";
	private static final int LIVE_DIMENSIONS = 1024;
	private static final int TOP_K = 10;
	private static final String BASE_URL = "https://api.avalai.ir/v1";
	private static final String FIXED_ENDPOINT = BASE_URL + "/embeddings";
	private static final DateTimeFormatter FILE_STAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC);

	public static void main(String[] args) throws Exception {
		Path repositoryRoot = resolveRepositoryRoot();
		B06dProbeManifest manifest = B06dProbeManifest.load(repositoryRoot, JSON);
		B06dProbeRuntimeModePort.GateState gateState = B06dProbeRuntimeModePort.fromEnvironment(repositoryRoot);
		ReportBundle bundle;
		try (PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
			DockerImageName.parse("pgvector/pgvector:pg18").asCompatibleSubstituteFor("postgres"))) {
			postgres.withDatabaseName("postgres");
			postgres.withUsername("postgres");
			postgres.withPassword("test");
			postgres.start();

			RunSummary baseline = runEvaluation(
				manifest,
				new MockClientFactory(),
				postgres,
				"omnidoc_b06d_mock",
				"mock-baseline",
				MockEmbeddingAdapter.MODEL_ID,
				MockEmbeddingAdapter.DIMENSIONS,
				false,
				gateState);

			Optional<RunSummary> live = Optional.empty();
			String liveStatus;
			if (gateState.ready()) {
				live = Optional.of(runEvaluation(
					manifest,
					new SpringAiClientFactory(gateState),
					postgres,
					"omnidoc_b06d_avalai",
					"avalai-v4-1024",
					STORAGE_MODEL_ID,
					LIVE_DIMENSIONS,
					true,
					gateState));
				liveStatus = live.get().passStatus();
			}
			else {
				liveStatus = "blocked-before-io";
			}
			bundle = new ReportBundle(manifest.evaluationVersion(), manifest.corpusVersion(), FIXED_ENDPOINT, gateState.missing(), baseline, live, liveStatus);
		}

		Path reportsDir = repositoryRoot.resolve("apps/api/build/reports/b06d");
		Files.createDirectories(reportsDir);
		String stamp = FILE_STAMP.format(Instant.now());
		Files.writeString(reportsDir.resolve("b06d-avalai-fixture-probe-" + stamp + ".json"), JSON.writerWithDefaultPrettyPrinter().writeValueAsString(bundle));
		Files.writeString(reportsDir.resolve("b06d-avalai-fixture-probe-" + stamp + ".md"), bundle.toMarkdown());
		Files.writeString(reportsDir.resolve("latest.md"), bundle.toMarkdown());
		System.out.println(bundle.toConsole());
	}

	private static RunSummary runEvaluation(
		B06dProbeManifest manifest,
		EmbeddingClientFactory clientFactory,
		PostgreSQLContainer<?> postgres,
		String databaseName,
		String label,
		String storageModelId,
		int dimensions,
		boolean enforceGate,
		B06dProbeRuntimeModePort.GateState gateState) throws Exception {
		try (ProbeDatabase database = ProbeDatabase.create(postgres, databaseName, manifest)) {
			TenantActor fixedActor = database.fixedActor();
			try (ProbeEmbeddingClient client = clientFactory.create(database, fixedActor, enforceGate)) {
				List<ChunkFixture> chunks = database.seedCorpus();
				List<ChunkFixture> orderedChunks = chunks.stream()
					.sorted(Comparator.comparingInt(chunk -> chunk.text().length()))
					.toList();
				RequestBudget budget = new RequestBudget(manifest.budget());
				for (ChunkFixture chunk : orderedChunks) {
					EmbeddingCall embedding = client.embed(chunk.text(), budget);
					database.upsertEmbedding(chunk, storageModelId, dimensions, embedding.vector());
				}
				List<QueryOutcome> outcomes = new ArrayList<>();
				for (B06dProbeManifest.QueryFixture query : manifest.queries()) {
					EmbeddingCall queryEmbedding = client.embed(query.text(), budget);
					SearchResults results = success(database.vectorSearchPort().similaritySearch(new VectorSearch(
						fixedActor,
						new AclScope(new WorkspaceId(query.workspaceId()), Set.of("owner")),
						queryEmbedding.vector(),
						TOP_K,
						new SearchFilters(Map.of(
							JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID, storageModelId,
							JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, String.valueOf(dimensions))))));
					outcomes.add(QueryOutcome.from(query, results));
				}
				NegativeChecks negatives = database.runNegativeChecks(client, budget, storageModelId, dimensions);
				Metrics metrics = Metrics.from(outcomes);
				String passStatus = label.equals("avalai-v4-1024") ? evaluateLiveGate(metrics, negatives, outcomes) : "baseline-only";
				return new RunSummary(
					label,
					client.transport(),
					storageModelId,
					dimensions,
					budget.requestCount(),
					budget.promptTokens(),
					outcomes,
					metrics,
					negatives,
					passStatus,
					client.routeModelObservation().orElse("unavailable"));
			}
		}
	}

	private static String evaluateLiveGate(Metrics metrics, NegativeChecks negatives, List<QueryOutcome> outcomes) {
		Map<String, QueryOutcome> byId = outcomes.stream().collect(Collectors.toMap(QueryOutcome::id, outcome -> outcome, (left, right) -> left, LinkedHashMap::new));
		int top1Core = 0;
		for (String id : List.of("Q1", "Q2", "Q3", "Q5")) {
			if (byId.get(id).recallAt1() == 1.0d) {
				top1Core++;
			}
		}
		boolean q2Top1 = byId.get("Q2").recallAt1() == 1.0d;
		boolean q3Top1 = byId.get("Q3").recallAt1() == 1.0d;
		boolean q4Top3 = byId.get("Q4").recallAt3() == 1.0d;
		boolean allCoreTop3 = List.of("Q1", "Q2", "Q3", "Q4", "Q5").stream().allMatch(id -> byId.get(id).recallAt3() == 1.0d);
		boolean noForbiddenHits = negatives.allPassed();
		boolean pass = top1Core >= 3 && q2Top1 && q3Top1 && q4Top3 && allCoreTop3 && metrics.mrr() >= 0.9d && noForbiddenHits;
		return pass ? "pass" : "no-go";
	}

	private static Path resolveRepositoryRoot() {
		String property = System.getProperty("omnidoc.repo.root");
		if (property == null || property.isBlank()) {
			return Path.of("").toAbsolutePath().normalize();
		}
		return Path.of(property).toAbsolutePath().normalize();
	}

	private static <T> T success(PortResult<T> result) {
		if (result instanceof PortResult.Success<T> success) {
			return success.value();
		}
		PortFailure failure = ((PortResult.Failure<?>) result).failure();
		throw new IllegalStateException(failure.code() + ": " + failure.detail());
	}

	private static PortFailure failure(PortResult<?> result) {
		return ((PortResult.Failure<?>) result).failure();
	}

	private interface EmbeddingClientFactory {
		ProbeEmbeddingClient create(ProbeDatabase database, TenantActor fixedActor, boolean enforceGate) throws Exception;
	}

	private interface ProbeEmbeddingClient extends AutoCloseable {
		EmbeddingCall embed(String text, RequestBudget budget) throws Exception;
		String transport();
		Optional<String> routeModelObservation();
		@Override default void close() throws Exception { }
	}

	private record EmbeddingCall(float[] vector, String responseModelId, int dimensions, int promptTokens) {
	}

	private static final class MockClientFactory implements EmbeddingClientFactory {
		@Override
		public ProbeEmbeddingClient create(ProbeDatabase database, TenantActor fixedActor, boolean enforceGate) {
			EmbeddingPort port = new MockEmbeddingAdapter(
				database.appJdbc(),
				database.rlsSession(),
				database.transactionTemplate(),
				new MockRuntimeModeAdapter());
			return new ProbeEmbeddingClient() {
				@Override
				public EmbeddingCall embed(String text, RequestBudget budget) {
					budget.beforeRequest();
					EmbeddingBatch batch = success(port.embedTexts(new EmbedTexts(
						fixedActor,
						List.of(text),
						MockEmbeddingAdapter.MODEL_ID,
						RuntimeMode.MOCK)));
					Embedding embedding = batch.embeddings().getFirst();
					return new EmbeddingCall(embedding.vector(), embedding.modelId(), embedding.dimensions(), 0);
				}

				@Override
				public String transport() {
					return "mock";
				}

				@Override
				public Optional<String> routeModelObservation() {
					return Optional.of(MockEmbeddingAdapter.MODEL_ID);
				}
			};
		}
	}

	private static final class SpringAiClientFactory implements EmbeddingClientFactory {

		private final B06dProbeRuntimeModePort.GateState gateState;

		private SpringAiClientFactory(B06dProbeRuntimeModePort.GateState gateState) {
			this.gateState = gateState;
		}

		@Override
		public ProbeEmbeddingClient create(ProbeDatabase database, TenantActor fixedActor, boolean enforceGate) {
			B06dProbeRuntimeModePort runtimeModePort = new B06dProbeRuntimeModePort(fixedActor, this.gateState);
			String apiKey = B06dProbeRuntimeModePort.normalizeApiKey(System.getenv(B06dProbeRuntimeModePort.API_KEY_ENV));
			OpenAiEmbeddingOptions options = OpenAiEmbeddingOptions.builder()
				.baseUrl(BASE_URL)
				.apiKey(apiKey)
				.model(PROVIDER_MODEL_ID)
				.dimensions(LIVE_DIMENSIONS)
				.maxRetries(0)
				.timeout(Duration.ofSeconds(60))
				.build();
			OpenAiEmbeddingModel model = new OpenAiEmbeddingModel(MetadataMode.EMBED, options);
			return new ProbeEmbeddingClient() {

				private String lastObservedModelId;

				@Override
				public EmbeddingCall embed(String text, RequestBudget budget) {
					budget.beforeRequest();
					PortResult<ResolvedMode> resolved = runtimeModePort.resolveMode(new ResolveMode(
						fixedActor,
						RuntimeMode.OPERATOR_FREE_TIER,
						Feature.EMBED));
					if (resolved instanceof PortResult.Failure<?>) {
						throw new IllegalStateException(((PortResult.Failure<?>) resolved).failure().detail());
					}
					PortResult<ResolvedMode> allowed = runtimeModePort.assertModeAllowed(new AssertModeAllowed(
						fixedActor,
						RuntimeMode.OPERATOR_FREE_TIER,
						Feature.EMBED));
					if (allowed instanceof PortResult.Failure<?>) {
						throw new IllegalStateException(((PortResult.Failure<?>) allowed).failure().detail());
					}
					runtimeModePort.stampOutbound(new StampOutbound(
						fixedActor,
						((PortResult.Success<ResolvedMode>) allowed).value(),
						Feature.EMBED));
					EmbeddingResponse response = model.call(new EmbeddingRequest(List.of(text), options));
					if (response.getResults().size() != 1) {
						throw new IllegalStateException("Expected exactly one embedding result per request.");
					}
					float[] vector = response.getResults().getFirst().getOutput();
					String observedModel = Objects.toString(response.getMetadata().getModel(), "");
					if (!PROVIDER_MODEL_ID.equals(observedModel)) {
						throw new IllegalStateException("AvalAI response model mismatch: expected text-embedding-v4 but observed " + observedModel);
					}
					this.lastObservedModelId = observedModel;
					int promptTokens = response.getMetadata().getUsage() == null
						? 0
						: response.getMetadata().getUsage().getPromptTokens();
					budget.afterRequest(promptTokens);
					if (vector.length != LIVE_DIMENSIONS) {
						throw new IllegalStateException("AvalAI returned " + vector.length + " dimensions instead of 1024.");
					}
					return new EmbeddingCall(vector, observedModel, vector.length, promptTokens);
				}

				@Override
				public String transport() {
					return "spring-ai-openai";
				}

				@Override
				public Optional<String> routeModelObservation() {
					return Optional.ofNullable(this.lastObservedModelId);
				}

				@Override
				public void close() {
				}
			};
		}
	}

	private static final class ProbeDatabase implements AutoCloseable {

		private final JdbcTemplate migratorJdbc;
		private final JdbcTemplate appJdbc;
		private final TransactionTemplate transactionTemplate;
		private final TenantRlsSession rlsSession;
		private final NotesPort notesPort;
		private final VectorSearchPort vectorSearchPort;
		private final TenantActor fixedActor;
		private final B06dProbeManifest manifest;
		private final ProseMirrorMarkdownProjector projector;
		private final BlockPackChunker chunker;

		private ProbeDatabase(
			JdbcTemplate migratorJdbc,
			JdbcTemplate appJdbc,
			TransactionTemplate transactionTemplate,
			TenantRlsSession rlsSession,
			NotesPort notesPort,
			VectorSearchPort vectorSearchPort,
			TenantActor fixedActor,
			B06dProbeManifest manifest,
			ProseMirrorMarkdownProjector projector,
			BlockPackChunker chunker) {
			this.migratorJdbc = migratorJdbc;
			this.appJdbc = appJdbc;
			this.transactionTemplate = transactionTemplate;
			this.rlsSession = rlsSession;
			this.notesPort = notesPort;
			this.vectorSearchPort = vectorSearchPort;
			this.fixedActor = fixedActor;
			this.manifest = manifest;
			this.projector = projector;
			this.chunker = chunker;
		}

		static ProbeDatabase create(PostgreSQLContainer<?> postgres, String databaseName, B06dProbeManifest manifest) throws Exception {
			createRolesAndDatabase(postgres, databaseName);
			String databaseUrl = postgres.getJdbcUrl().replace("/postgres", "/" + databaseName);
			try (Connection admin = DriverManager.getConnection(databaseUrl, postgres.getUsername(), postgres.getPassword());
				Statement statement = admin.createStatement()) {
				statement.execute("CREATE EXTENSION IF NOT EXISTS vector");
				statement.execute("GRANT CONNECT ON DATABASE " + databaseName + " TO " + APP);
				statement.execute("GRANT USAGE ON SCHEMA public TO " + APP);
				statement.execute("GRANT CREATE ON SCHEMA public TO " + MIGRATOR);
				statement.execute(
					"ALTER DEFAULT PRIVILEGES FOR ROLE " + MIGRATOR + " IN SCHEMA public "
						+ "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + APP);
			}
			Flyway.configure()
				.dataSource(databaseUrl, MIGRATOR, MIGRATOR_PASSWORD)
				.locations("classpath:db/migration")
				.load()
				.migrate();
			seedTenancy(databaseUrl);
			DataSource migratorDataSource = dataSource(databaseUrl, MIGRATOR, MIGRATOR_PASSWORD);
			DataSource appDataSource = dataSource(databaseUrl, APP, APP_PASSWORD);
			JdbcTemplate migratorJdbc = new JdbcTemplate(migratorDataSource);
			JdbcTemplate appJdbc = new JdbcTemplate(appDataSource);
			TransactionTemplate appTx = new TransactionTemplate(new DataSourceTransactionManager(appDataSource));
			TenantRlsSession rls = new TenantRlsSession(appJdbc);
			JsonMapper mapper = JsonMapper.builder().build();
			ProseMirrorMarkdownProjector projector = new ProseMirrorMarkdownProjector(mapper);
			BlockPackChunker chunker = new BlockPackChunker();
			NotesPort notesPort = new JdbcNotesAdapter(appJdbc, rls, appTx, mapper, new RechunkOutbox() {
				@Override
				public void noteCommitted(TenantActor actor, WorkspaceId workspaceId, NoteId noteId) {
				}

				@Override
				public void notePurged(TenantActor actor, NoteId noteId) {
				}
			});
			VectorSearchPort vectorSearchPort = new JdbcVectorSearchAdapter(appJdbc, rls, appTx);
			TenantActor fixedActor = new TenantActor(new TenantId(manifest.actor().tenantId()), new ActorId(manifest.actor().actorId()));
			return new ProbeDatabase(migratorJdbc, appJdbc, appTx, rls, notesPort, vectorSearchPort, fixedActor, manifest, projector, chunker);
		}

		List<ChunkFixture> seedCorpus() throws Exception {
			List<ChunkFixture> chunks = new ArrayList<>();
			for (B06dProbeManifest.NoteFixture note : this.manifest.notes()) {
				for (ChunkFixture chunk : insertFixtureNoteWithChunks(note)) {
					chunks.add(chunk);
				}
			}
			return chunks;
		}

		private List<ChunkFixture> insertFixtureNoteWithChunks(B06dProbeManifest.NoteFixture note) throws Exception {
			try (Connection connection = this.migratorJdbc.getDataSource().getConnection()) {
				connection.setAutoCommit(false);
				try (PreparedStatement noteInsert = connection.prepareStatement(
					"""
					INSERT INTO notes (note_id, tenant_id, workspace_id, title, body_json, current_version_id, corpus_ownership)
					VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)
					""");
					PreparedStatement versionInsert = connection.prepareStatement(
					"""
					INSERT INTO note_versions (version_id, note_id, tenant_id, title, body_json)
					VALUES (?, ?, ?, ?, CAST(? AS jsonb))
					""");
					PreparedStatement chunkSetInsert = connection.prepareStatement(
					"""
					INSERT INTO chunk_sets (version_id, tenant_id, projector_id, chunker_id, params_hash, projection_sha256, chunk_count)
					VALUES (?, ?, ?, ?, ?, ?, ?)
					""");
					PreparedStatement chunkInsert = connection.prepareStatement(
					"""
					INSERT INTO chunks (chunk_id, tenant_id, workspace_id, note_id, version_id, ordinal,
						start_block, end_block, start_offset, end_offset, text, text_sha256)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					""")) {
					String bodyJson = this.manifest.bodyJson(note);
					Projection projection = this.projector.project(bodyJson);
					ChunkPolicy policy = ChunkPolicy.frozen(ProseMirrorMarkdownProjector.PROJECTOR_ID);
					List<ChunkDraft> drafts = this.chunker.chunk(projection, note.versionId(), policy);
					noteInsert.setString(1, note.id());
					noteInsert.setString(2, note.tenantId());
					noteInsert.setString(3, note.workspaceId());
					noteInsert.setString(4, note.title());
					noteInsert.setString(5, bodyJson);
					noteInsert.setString(6, note.versionId());
					noteInsert.setString(7, note.corpusOwnership());
					noteInsert.executeUpdate();

					versionInsert.setString(1, note.versionId());
					versionInsert.setString(2, note.id());
					versionInsert.setString(3, note.tenantId());
					versionInsert.setString(4, note.title());
					versionInsert.setString(5, bodyJson);
					versionInsert.executeUpdate();

					chunkSetInsert.setString(1, note.versionId());
					chunkSetInsert.setString(2, note.tenantId());
					chunkSetInsert.setString(3, policy.projectorId());
					chunkSetInsert.setString(4, policy.chunkerId());
					chunkSetInsert.setString(5, policy.paramsHash());
					chunkSetInsert.setString(6, ChunkPolicy.sha256Hex(projection.text()));
					chunkSetInsert.setInt(7, drafts.size());
					chunkSetInsert.executeUpdate();

					for (ChunkDraft draft : drafts) {
						chunkInsert.setString(1, draft.chunkId());
						chunkInsert.setString(2, note.tenantId());
						chunkInsert.setString(3, note.workspaceId());
						chunkInsert.setString(4, note.id());
						chunkInsert.setString(5, note.versionId());
						chunkInsert.setInt(6, draft.ordinal());
						chunkInsert.setInt(7, draft.startBlock());
						chunkInsert.setInt(8, draft.endBlock());
						chunkInsert.setInt(9, draft.startOffset());
						chunkInsert.setInt(10, draft.endOffset());
						chunkInsert.setString(11, draft.text());
						chunkInsert.setString(12, draft.textSha256());
						chunkInsert.addBatch();
					}
					chunkInsert.executeBatch();
					connection.commit();
					return drafts.stream().map(draft -> new ChunkFixture(
						new ChunkId(draft.chunkId()),
						new NoteId(note.id()),
						new VersionId(note.versionId()),
						note.tenantId(),
						note.actorId(),
						note.workspaceId(),
						draft.text())).toList();
				}
				catch (Exception ex) {
					connection.rollback();
					throw ex;
				}
			}
		}

		NegativeChecks runNegativeChecks(ProbeEmbeddingClient client, RequestBudget budget, String storageModelId, int dimensions) throws Exception {
			boolean emptyWorkspace = success(this.vectorSearchPort.similaritySearch(new VectorSearch(
				this.fixedActor,
				new AclScope(new WorkspaceId("ws_empty"), Set.of("owner")),
				client.embed("launch checklist", budget).vector(),
				TOP_K,
				filters(storageModelId, dimensions)))).hits().isEmpty();

			PortFailure forbidden = failure(this.vectorSearchPort.similaritySearch(new VectorSearch(
				this.fixedActor,
				new AclScope(new WorkspaceId("ws_other"), Set.of("owner")),
				client.embed("private launch", budget).vector(),
				TOP_K,
				filters(storageModelId, dimensions))));
			boolean aclForbidden = forbidden.code() == PortFailure.Code.FORBIDDEN;

			SearchResults mineSearch = success(this.vectorSearchPort.similaritySearch(new VectorSearch(
				this.fixedActor,
				new AclScope(new WorkspaceId("ws_mine"), Set.of("owner")),
				client.embed("launch review", budget).vector(),
				TOP_K,
				filters(storageModelId, dimensions))));
			boolean noForbiddenHits = mineSearch.hits().stream().map(hit -> hit.noteId().value())
				.noneMatch(id -> id.equals("ws_sample_launch") || id.equals("ws_other_private"));

			this.notesPort.softDelete(new DeleteNote(this.fixedActor, new WorkspaceId("ws_mine"), new NoteId("ws_mine_conflict")));
			SearchResults deletedSearch = success(this.vectorSearchPort.similaritySearch(new VectorSearch(
				this.fixedActor,
				new AclScope(new WorkspaceId("ws_mine"), Set.of("owner")),
				client.embed("Thursday draft disagrees", budget).vector(),
				TOP_K,
				filters(storageModelId, dimensions))));
			boolean deletedSuppressed = deletedSearch.hits().stream().noneMatch(hit -> hit.noteId().value().equals("ws_mine_conflict"));

			Note staleUpdated = success(this.notesPort.update(new UpdateNote(
				this.fixedActor,
				new WorkspaceId("ws_mine"),
				new NoteId("ws_mine_indexing"),
				new NoteFields("Indexing guide", bodyJson("The indexing copy has been replaced.")),
				new VersionToken("ws_mine_indexing_v1"))));
			SearchResults staleSearch = success(this.vectorSearchPort.similaritySearch(new VectorSearch(
				this.fixedActor,
				new AclScope(new WorkspaceId("ws_mine"), Set.of("owner")),
				client.embed("Imported notes become searchable", budget).vector(),
				TOP_K,
				filters(storageModelId, dimensions))));
			boolean staleSuppressed = staleSearch.hits().stream().noneMatch(hit -> hit.noteId().value().equals(staleUpdated.id().value()));

			Integer visibleWithoutGuc = this.appJdbc.queryForObject("SELECT COUNT(*) FROM embeddings", Integer.class);
			boolean rlsFailClosed = visibleWithoutGuc != null && visibleWithoutGuc == 0;

			return new NegativeChecks(emptyWorkspace, aclForbidden, noForbiddenHits, deletedSuppressed, staleSuppressed, rlsFailClosed);
		}

		void upsertEmbedding(ChunkFixture chunk, String modelId, int dimensions, float[] vector) {
			this.transactionTemplate.execute(status -> this.rlsSession.callWithinActorAndTenant(
				chunk.actorId(),
				chunk.tenantId(),
				() -> {
					this.appJdbc.update(connection -> prepareUpsert(connection, chunk, modelId, dimensions, vectorLiteral(vector)));
					return null;
				}));
		}

		VectorSearchPort vectorSearchPort() {
			return this.vectorSearchPort;
		}

		JdbcTemplate appJdbc() {
			return this.appJdbc;
		}

		TransactionTemplate transactionTemplate() {
			return this.transactionTemplate;
		}

		TenantRlsSession rlsSession() {
			return this.rlsSession;
		}

		TenantActor fixedActor() {
			return this.fixedActor;
		}

		@Override
		public void close() {
		}

		private static PreparedStatement prepareUpsert(Connection connection, ChunkFixture chunk, String modelId, int dimensions, String vectorLiteral) throws java.sql.SQLException {
			PreparedStatement statement = connection.prepareStatement(
				"""
				INSERT INTO embeddings
					(chunk_id, tenant_id, workspace_id, note_id, version_id,
					 embedding_model_id, dimensions, embedding)
				VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS vector))
				ON CONFLICT (chunk_id) DO UPDATE
				SET tenant_id = EXCLUDED.tenant_id,
					workspace_id = EXCLUDED.workspace_id,
					note_id = EXCLUDED.note_id,
					version_id = EXCLUDED.version_id,
					embedding_model_id = EXCLUDED.embedding_model_id,
					dimensions = EXCLUDED.dimensions,
					embedding = EXCLUDED.embedding,
					updated_at = now()
				""");
			statement.setString(1, chunk.chunkId().value());
			statement.setString(2, chunk.tenantId());
			statement.setString(3, chunk.workspaceId());
			statement.setString(4, chunk.noteId().value());
			statement.setString(5, chunk.versionId().value());
			statement.setString(6, modelId);
			statement.setInt(7, dimensions);
			statement.setString(8, vectorLiteral);
			return statement;
		}

		private static void createRolesAndDatabase(PostgreSQLContainer<?> postgres, String databaseName) throws Exception {
			try (Connection admin = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
				Statement statement = admin.createStatement()) {
				statement.execute("DROP DATABASE IF EXISTS " + databaseName + " WITH (FORCE)");
				statement.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" + MIGRATOR + "') THEN CREATE ROLE " + MIGRATOR + " LOGIN PASSWORD '" + MIGRATOR_PASSWORD + "' BYPASSRLS; END IF; END $$");
				statement.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" + APP + "') THEN CREATE ROLE " + APP + " LOGIN PASSWORD '" + APP_PASSWORD + "' NOBYPASSRLS; END IF; END $$");
				statement.execute("CREATE DATABASE " + databaseName + " OWNER " + MIGRATOR);
			}
		}

		private static void seedTenancy(String databaseUrl) throws Exception {
			try (Connection connection = DriverManager.getConnection(databaseUrl, MIGRATOR, MIGRATOR_PASSWORD);
				Statement statement = connection.createStatement()) {
				connection.setAutoCommit(false);
				statement.execute("INSERT INTO tenants (tenant_id, name) VALUES ('tenant_alex', 'Tenant Alex'), ('tenant_blair', 'Tenant Blair'), ('tenant_sample', 'Tenant Sample')");
				statement.execute("INSERT INTO actors (actor_id, email, password_hash) VALUES ('actor_alex', 'alex@example.test', 'hash'), ('actor_blair', 'blair@example.test', 'hash'), ('actor_sample_guest', 'guest@example.test', 'hash')");
				statement.execute("INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES ('ws_mine', 'tenant_alex', 'My notebook'), ('ws_empty', 'tenant_alex', 'New notebook'), ('ws_other', 'tenant_blair', 'Blair notebook'), ('ws_sample', 'tenant_sample', 'Sample workspace')");
				statement.execute("INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) VALUES ('ws_mine', 'actor_alex', 'tenant_alex', '{owner}'), ('ws_empty', 'actor_alex', 'tenant_alex', '{owner}'), ('ws_other', 'actor_blair', 'tenant_blair', '{owner}'), ('ws_sample', 'actor_sample_guest', 'tenant_sample', '{owner}')");
				connection.commit();
			}
		}

		private static DataSource dataSource(String url, String user, String password) {
			return DataSourceBuilder.create()
				.driverClassName("org.postgresql.Driver")
				.url(url)
				.username(user)
				.password(password)
				.build();
		}
	}

	private static SearchFilters filters(String storageModelId, int dimensions) {
		return new SearchFilters(Map.of(
			JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID, storageModelId,
			JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, String.valueOf(dimensions)));
	}

	private static String bodyJson(String text) {
		String escaped = text.replace("\\", "\\\\").replace("\"", "\\\"");
		return "{" +
			"\"type\":\"doc\",\"content\":[{" +
			"\"type\":\"paragraph\",\"content\":[{" +
			"\"type\":\"text\",\"text\":\"" + escaped + "\"}]}]}";
	}

	private static String vectorLiteral(float[] vector) {
		StringBuilder builder = new StringBuilder("[");
		for (int index = 0; index < vector.length; index++) {
			if (index > 0) {
				builder.append(',');
			}
			builder.append(String.format(Locale.ROOT, "%.8f", vector[index]));
		}
		return builder.append(']').toString();
	}

	private record ChunkFixture(ChunkId chunkId, NoteId noteId, VersionId versionId, String tenantId, String actorId, String workspaceId, String text) {
	}

	private record QueryOutcome(String id, String text, List<String> rankedNoteIds, Map<String, Integer> ranks, double recallAt1, double recallAt3, double reciprocalRank, boolean includeInMetrics) {
		static QueryOutcome from(B06dProbeManifest.QueryFixture query, SearchResults results) {
			List<String> ranked = new ArrayList<>();
			for (SearchHit hit : results.hits()) {
				if (!ranked.contains(hit.noteId().value())) {
					ranked.add(hit.noteId().value());
				}
			}
			Map<String, Integer> ranks = new LinkedHashMap<>();
			for (String relevant : query.relevantNoteIds()) {
				int index = ranked.indexOf(relevant);
				ranks.put(relevant, index >= 0 ? index + 1 : null);
			}
			double relevantCount = query.relevantNoteIds().size();
			double recallAt1 = relevantCount == 0 ? 0.0d : query.relevantNoteIds().stream().filter(id -> Objects.equals(ranks.get(id), 1)).count() / relevantCount;
			double recallAt3 = relevantCount == 0 ? 0.0d : query.relevantNoteIds().stream().filter(id -> {
				Integer rank = ranks.get(id);
				return rank != null && rank <= 3;
			}).count() / relevantCount;
			double rr = 0.0d;
			for (String relevant : query.relevantNoteIds()) {
				Integer rank = ranks.get(relevant);
				if (rank != null) {
					rr = 1.0d / rank;
					break;
				}
			}
			return new QueryOutcome(query.id(), query.text(), List.copyOf(ranked), ranks, recallAt1, recallAt3, rr, query.includeInMetrics());
		}
	}

	private record Metrics(double recallAt1, double recallAt3, double mrr) {
		static Metrics from(List<QueryOutcome> outcomes) {
			List<QueryOutcome> scored = outcomes.stream().filter(QueryOutcome::includeInMetrics).toList();
			double denominator = scored.size();
			if (denominator == 0.0d) {
				return new Metrics(0.0d, 0.0d, 0.0d);
			}
			double recall1 = scored.stream().mapToDouble(QueryOutcome::recallAt1).sum() / denominator;
			double recall3 = scored.stream().mapToDouble(QueryOutcome::recallAt3).sum() / denominator;
			double mrr = scored.stream().mapToDouble(QueryOutcome::reciprocalRank).sum() / denominator;
			return new Metrics(recall1, recall3, mrr);
		}
	}

	private record NegativeChecks(boolean emptyWorkspace, boolean aclForbidden, boolean noForbiddenHits, boolean deletedSuppressed, boolean staleSuppressed, boolean rlsFailClosed) {
		boolean allPassed() {
			return emptyWorkspace && aclForbidden && noForbiddenHits && deletedSuppressed && staleSuppressed && rlsFailClosed;
		}
	}

	private static final class RequestBudget {

		private final B06dProbeManifest.Budget budget;
		private int requestCount;
		private int promptTokens;

		private RequestBudget(B06dProbeManifest.Budget budget) {
			this.budget = Objects.requireNonNull(budget, "budget");
		}

		void beforeRequest() {
			if (this.requestCount >= this.budget.maxRequests()) {
				throw new IllegalStateException("B-06d request budget exceeded before outbound call.");
			}
			this.requestCount++;
		}

		void afterRequest(int usedPromptTokens) {
			if (usedPromptTokens < 0) {
				throw new IllegalArgumentException("prompt tokens must be non-negative");
			}
			this.promptTokens += usedPromptTokens;
			if (this.promptTokens > this.budget.maxInputTokens()) {
				throw new IllegalStateException("B-06d prompt-token budget exceeded.");
			}
		}

		int requestCount() {
			return this.requestCount;
		}

		int promptTokens() {
			return this.promptTokens;
		}
	}

	private record RunSummary(
		String label,
		String transport,
		String storageModelId,
		int dimensions,
		int requests,
		int promptTokens,
		List<QueryOutcome> outcomes,
		Metrics metrics,
		NegativeChecks negatives,
		String passStatus,
		String routeModelObservation) {
		RunSummary {
			outcomes = List.copyOf(outcomes);
		}
	}

	private record ReportBundle(
		String evaluationVersion,
		String corpusVersion,
		String fixedEndpoint,
		List<String> missingLiveGates,
		RunSummary baseline,
		Optional<RunSummary> live,
		String liveStatus) {
		ReportBundle {
			missingLiveGates = List.copyOf(missingLiveGates);
			live = live == null ? Optional.empty() : live;
		}

		String toConsole() {
			return "B-06d baseline=" + this.baseline.passStatus()
				+ ", liveStatus=" + this.liveStatus
				+ ", baselineMRR=" + String.format(Locale.ROOT, "%.3f", this.baseline.metrics().mrr())
				+ (this.live.isPresent()
					? ", liveMRR=" + String.format(Locale.ROOT, "%.3f", this.live.get().metrics().mrr())
					: ", missingLiveGates=" + String.join(" | ", this.missingLiveGates));
		}

		String toMarkdown() {
			StringBuilder builder = new StringBuilder();
			builder.append("# B-06d AvalAI fixture probe\n\n");
			builder.append("- Evaluation version: ").append(this.evaluationVersion).append('\n');
			builder.append("- Corpus version: ").append(this.corpusVersion).append('\n');
			builder.append("- Fixed endpoint: ").append(this.fixedEndpoint).append("\n\n");
			appendRun(builder, "Mock baseline", this.baseline);
			if (this.live.isPresent()) {
				appendRun(builder, "AvalAI v4/1024", this.live.get());
			}
			else {
				builder.append("## AvalAI v4/1024\n\n");
				builder.append("Status: blocked before network I/O\n\n");
				for (String missing : this.missingLiveGates) {
					builder.append("- ").append(missing).append('\n');
				}
				builder.append('\n');
			}
			return builder.toString();
		}

		private static void appendRun(StringBuilder builder, String title, RunSummary summary) {
			builder.append("## ").append(title).append("\n\n");
			builder.append("- Transport: ").append(summary.transport()).append('\n');
			builder.append("- Storage model: ").append(summary.storageModelId()).append('\n');
			builder.append("- Route/model observation: ").append(summary.routeModelObservation()).append('\n');
			builder.append("- Requests: ").append(summary.requests()).append('\n');
			builder.append("- Prompt tokens: ").append(summary.promptTokens()).append('\n');
			builder.append("- Recall@1: ").append(String.format(Locale.ROOT, "%.3f", summary.metrics().recallAt1())).append('\n');
			builder.append("- Recall@3: ").append(String.format(Locale.ROOT, "%.3f", summary.metrics().recallAt3())).append('\n');
			builder.append("- MRR: ").append(String.format(Locale.ROOT, "%.3f", summary.metrics().mrr())).append('\n');
			builder.append("- Pass status: ").append(summary.passStatus()).append("\n\n");
			builder.append("| Query | Ranked notes | Recall@1 | Recall@3 | RR |\n");
			builder.append("| --- | --- | ---: | ---: | ---: |\n");
			for (QueryOutcome outcome : summary.outcomes()) {
				builder.append("| ").append(outcome.id()).append(" | ")
					.append(String.join(", ", outcome.rankedNoteIds()))
					.append(" | ").append(String.format(Locale.ROOT, "%.3f", outcome.recallAt1()))
					.append(" | ").append(String.format(Locale.ROOT, "%.3f", outcome.recallAt3()))
					.append(" | ").append(String.format(Locale.ROOT, "%.3f", outcome.reciprocalRank()))
					.append(" |\n");
			}
			builder.append('\n');
		}
	}
}