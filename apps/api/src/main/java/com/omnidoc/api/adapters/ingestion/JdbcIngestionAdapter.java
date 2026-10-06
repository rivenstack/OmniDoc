package com.omnidoc.api.adapters.ingestion;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.Optional;

import org.springframework.dao.DataAccessException;

import com.omnidoc.api.adapters.ingestion.parser.ImportMediaType;
import com.omnidoc.api.adapters.ingestion.parser.ImportParser;
import com.omnidoc.api.application.port.IngestionPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.JobId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IngestionModels.ChunkSet;
import com.omnidoc.api.domain.IngestionModels.ChunkVersion;
import com.omnidoc.api.domain.IngestionModels.EnqueueImport;
import com.omnidoc.api.domain.IngestionModels.GetJob;
import com.omnidoc.api.domain.IngestionModels.ImportContent;
import com.omnidoc.api.domain.IngestionModels.IngestionJob;
import com.omnidoc.api.domain.IngestionModels.JobStatus;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;

/**
 * B-05b {@code IngestionPort} adapter (architecture.md §5.2.1).
 *
 * <p>Indexing lag is a first-class, pollable state (REC-02): an import returns a durable
 * job at {@code 0/4} and the runner moves it through the four stage units, so the UI can
 * tell a customer "indexing" honestly instead of pretending a synchronous success.
 *
 * <p>Tenancy: the workspace on the request is a selector. The tenant comes from the
 * session-resolved actor, and membership in that workspace is re-checked here with its
 * own predicate before anything is written — a tenant id alone never grants access to a
 * workspace.
 */
public class JdbcIngestionAdapter implements IngestionPort {

	private final IngestionJobRepository repository;
	private final VersionChunker versionChunker;
	private final ImportParser parser;
	private final IngestionDispatcher dispatcher;
	private final IngestionLimits limits;

	public JdbcIngestionAdapter(
		IngestionJobRepository repository,
		VersionChunker versionChunker,
		ImportParser parser,
		IngestionDispatcher dispatcher,
		IngestionLimits limits) {
		this.repository = Objects.requireNonNull(repository, "repository");
		this.versionChunker = Objects.requireNonNull(versionChunker, "versionChunker");
		this.parser = Objects.requireNonNull(parser, "parser");
		this.dispatcher = Objects.requireNonNull(dispatcher, "dispatcher");
		this.limits = Objects.requireNonNull(limits, "limits");
	}

	@Override
	public PortResult<IngestionJob> enqueueImport(EnqueueImport request) {
		if (request == null || request.actor() == null || request.workspaceId() == null
			|| request.content() == null || request.content().bytes() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, workspace, and file content are required.");
		}
		ImportContent content = request.content();

		byte[] payload;
		try {
			payload = readCapped(content.bytes(), this.limits.maxUploadBytes());
		}
		catch (IOException ex) {
			return failure(PortFailure.Code.VALIDATION, "Uploaded file could not be read.");
		}
		if (payload == null) {
			return failure(PortFailure.Code.TOO_LARGE, "Imported files must be 10 MiB or smaller.");
		}
		if (payload.length == 0) {
			return failure(PortFailure.Code.VALIDATION, "Uploaded file is empty.");
		}

		Optional<ImportMediaType> mediaType =
			this.parser.resolveType(content.mediaType(), content.fileName(), payload);
		if (mediaType.isEmpty()) {
			return failure(
				PortFailure.Code.UNSUPPORTED_TYPE,
				"Supported imports are " + String.join(", ", ImportMediaType.allowedWireTypes()) + ".");
		}

		try {
			return this.repository.inActorAndTenant(request.actor(), () -> {
				if (!this.repository.hasMembership(request.actor(), request.workspaceId())) {
					return forbiddenWorkspace();
				}
				String jobId = this.repository.insertImportJob(
					request.actor(),
					request.workspaceId(),
					content.fileName(),
					mediaType.orElseThrow().wireType(),
					payload.length,
					payload);
				// The runner must not see the row before it is committed (§4).
				this.dispatcher.dispatchAfterCommit();
				return new PortResult.Success<>(new IngestionJob(
					new JobId(jobId), JobStatus.PENDING, 0, IngestionJobRepository.TOTAL_UNITS));
			});
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Ingestion persistence is unavailable.");
		}
	}

	@Override
	public PortResult<IngestionJob> getJob(GetJob request) {
		if (request == null || request.actor() == null || request.workspaceId() == null
			|| request.jobId() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, workspace, and job are required.");
		}
		try {
			return this.repository.inActorAndTenant(request.actor(), () -> {
				if (!this.repository.hasMembership(request.actor(), request.workspaceId())) {
					return forbiddenWorkspace();
				}
				Optional<IngestionJobRepository.JobRow> row =
					this.repository.findJob(request.actor(), request.jobId().value());
				if (row.isEmpty()) {
					return failure(PortFailure.Code.NOT_FOUND, "Ingestion job was not found.");
				}
				IngestionJobRepository.JobRow job = row.orElseThrow();
				// A job id from another workspace is an IDOR attempt, not a miss.
				if (!job.workspaceId().equals(request.workspaceId().value())) {
					return failure(
						PortFailure.Code.FORBIDDEN, "Job does not belong to the selected workspace.");
				}
				return new PortResult.Success<>(new IngestionJob(
					new JobId(job.jobId()), job.status(), job.completedUnits(), job.totalUnits()));
			});
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Ingestion persistence is unavailable.");
		}
	}

	@Override
	public PortResult<ChunkSet> chunkVersion(ChunkVersion request) {
		if (request == null || request.actor() == null || request.noteId() == null
			|| request.versionId() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, note, and version are required.");
		}
		try {
			PortResult<VersionChunker.Outcome> result = this.versionChunker.chunk(
				request.actor(), Optional.empty(), request.noteId(), request.versionId(), request.text());
			if (result instanceof PortResult.Success<VersionChunker.Outcome> success) {
				return new PortResult.Success<>(success.value().chunkSet());
			}
			return new PortResult.Failure<>(((PortResult.Failure<VersionChunker.Outcome>) result).failure());
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Ingestion persistence is unavailable.");
		}
	}

	/**
	 * Read at most {@code maxBytes}. Returns {@code null} as soon as the stream exceeds
	 * the cap, so an oversized upload is never fully buffered.
	 */
	private static byte[] readCapped(InputStream stream, long maxBytes) throws IOException {
		try (InputStream input = stream) {
			ByteArrayOutputStream buffer = new ByteArrayOutputStream();
			byte[] window = new byte[8192];
			long total = 0;
			int read;
			while ((read = input.read(window)) != -1) {
				total += read;
				if (total > maxBytes) {
					return null;
				}
				buffer.write(window, 0, read);
			}
			return buffer.toByteArray();
		}
	}

	private static <T> PortResult<T> forbiddenWorkspace() {
		return failure(PortFailure.Code.FORBIDDEN, "Workspace selector does not match session membership.");
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}
}
