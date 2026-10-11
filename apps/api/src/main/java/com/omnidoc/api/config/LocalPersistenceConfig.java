package com.omnidoc.api.config;

import java.time.Duration;

import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

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
import com.omnidoc.api.adapters.notes.RechunkOutbox;
import com.omnidoc.api.adapters.retrieval.JdbcSearchAdapter;
import com.omnidoc.api.adapters.retrieval.JdbcVectorSearchAdapter;
import com.omnidoc.api.adapters.retrieval.MockEmbeddingAdapter;
import com.omnidoc.api.adapters.retrieval.MockRuntimeModeAdapter;
import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.application.port.IngestionPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;
import com.omnidoc.api.web.identity.IdentityProfiles;

/**
 * Local Compose persistence helpers. Default profile keeps JDBC autoconfig
 * excluded (see {@code application.yml}) so health/ArchUnit need no live DB.
 *
 * <p>Profile {@code local} clears those excludes and activates Flyway +
 * DataSource against {@code apps/api/compose.yaml}. The B-03 identity adapter, the B-04
 * notes adapter, and the B-05b ingestion adapter plus its runner are gated on the same
 * profile, because none of them can work without a DataSource.
 *
 * <p>{@code @EnableAsync} / {@code @EnableScheduling} are what make the B-05b runner go:
 * the post-commit dispatch leaves the request thread, and the sweeper reclaims expired
 * leases (architecture.md §5.2.1 §4). No broker and no second process.
 */
@Configuration
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@EnableTransactionManagement
@EnableAsync
@EnableScheduling
public class LocalPersistenceConfig {

	@Bean
	TenantRlsSession tenantRlsSession(JdbcTemplate jdbcTemplate) {
		return new TenantRlsSession(jdbcTemplate);
	}

	@Bean
	TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
		return new TransactionTemplate(transactionManager);
	}

	@Bean
	IdentityPort identityPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate,
		PasswordEncoder passwordEncoder,
		ObjectMapper objectMapper) {
		return new JdbcIdentityAdapter(
			jdbcTemplate, tenantRlsSession, transactionTemplate, passwordEncoder, objectMapper);
	}

	@Bean
	NotesPort notesPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate,
		ObjectMapper objectMapper,
		RechunkOutbox rechunkOutbox) {
		return new JdbcNotesAdapter(
			jdbcTemplate, tenantRlsSession, transactionTemplate, objectMapper, rechunkOutbox);
	}

	/** Limits from architecture.md §5.2.1 §6, overridable per deployment. */
	@Bean
	IngestionLimits ingestionLimits(
		@Value("${omnidoc.ingestion.max-upload-bytes:10485760}") long maxUploadBytes,
		@Value("${omnidoc.ingestion.parse-timeout-ms:60000}") long parseTimeoutMs,
		@Value("${omnidoc.ingestion.job-timeout-ms:300000}") long jobTimeoutMs,
		@Value("${omnidoc.ingestion.lease-ms:120000}") long leaseMs,
		@Value("${omnidoc.ingestion.max-attempts:3}") int maxAttempts,
		@Value("${omnidoc.ingestion.max-drain-per-dispatch:64}") int maxDrainPerDispatch) {
		return new IngestionLimits(
			maxUploadBytes,
			Duration.ofMillis(parseTimeoutMs),
			Duration.ofMillis(jobTimeoutMs),
			Duration.ofMillis(leaseMs),
			maxAttempts,
			maxDrainPerDispatch);
	}

	@Bean
	ProseMirrorMarkdownProjector proseMirrorMarkdownProjector(ObjectMapper objectMapper) {
		return new ProseMirrorMarkdownProjector(objectMapper);
	}

	@Bean
	BlockPackChunker blockPackChunker() {
		return new BlockPackChunker();
	}

	@Bean
	ImportParser importParser(ObjectMapper objectMapper, IngestionLimits limits) {
		// Extracted-text cap tracks the upload cap so a crafted document cannot
		// out-grow the bytes it arrived in.
		return new TikaImportParser(objectMapper, (int) Math.min(Integer.MAX_VALUE, limits.maxUploadBytes()));
	}

	@Bean
	IngestionDispatcher ingestionDispatcher() {
		return new IngestionDispatcher();
	}

	@Bean
	RuntimeModePort runtimeModePort() {
		return new MockRuntimeModeAdapter();
	}

	@Bean
	IngestionJobRepository ingestionJobRepository(
		JdbcTemplate jdbcTemplate, TenantRlsSession tenantRlsSession, TransactionTemplate transactionTemplate) {
		return new IngestionJobRepository(jdbcTemplate, tenantRlsSession, transactionTemplate);
	}

	@Bean
	VersionChunker versionChunker(
		JdbcTemplate jdbcTemplate,
		IngestionJobRepository ingestionJobRepository,
		ProseMirrorMarkdownProjector projector,
		BlockPackChunker chunker) {
		return new VersionChunker(jdbcTemplate, ingestionJobRepository, projector, chunker);
	}

	@Bean
	RechunkOutbox rechunkOutbox(IngestionJobRepository ingestionJobRepository, IngestionDispatcher dispatcher) {
		return new JdbcRechunkOutbox(ingestionJobRepository, dispatcher);
	}

	@Bean
	IngestionPort ingestionPort(
		IngestionJobRepository ingestionJobRepository,
		VersionChunker versionChunker,
		ImportParser importParser,
		IngestionDispatcher dispatcher,
		IngestionLimits limits) {
		return new JdbcIngestionAdapter(
			ingestionJobRepository, versionChunker, importParser, dispatcher, limits);
	}

	@Bean
	EmbeddingPort embeddingPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate,
		RuntimeModePort runtimeModePort) {
		return new MockEmbeddingAdapter(jdbcTemplate, tenantRlsSession, transactionTemplate, runtimeModePort);
	}

	@Bean
	VectorSearchPort vectorSearchPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate) {
		return new JdbcVectorSearchAdapter(jdbcTemplate, tenantRlsSession, transactionTemplate);
	}

	@Bean
	SearchPort searchPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate,
		EmbeddingPort embeddingPort,
		VectorSearchPort vectorSearchPort) {
		return new JdbcSearchAdapter(
			jdbcTemplate,
			tenantRlsSession,
			transactionTemplate,
			embeddingPort,
			vectorSearchPort);
	}

	@Bean
	IngestionWorker ingestionWorker(
		IngestionJobRepository ingestionJobRepository,
		VersionChunker versionChunker,
		ImportParser importParser,
		NotesPort notesPort,
		IdentityPort identityPort,
		IngestionLimits limits) {
		return new IngestionWorker(
			ingestionJobRepository, versionChunker, importParser, notesPort, identityPort, limits);
	}

	/**
	 * Binds the dispatcher to the <em>proxied</em> worker, which is what makes
	 * {@code @Async} apply. Calling the raw instance would run the drain on the request
	 * thread and defeat the whole point of a job queue.
	 */
	@Bean
	InitializingBean ingestionDispatchBinding(IngestionDispatcher dispatcher, IngestionWorker worker) {
		return () -> dispatcher.bind(worker::dispatchAsync);
	}

}
