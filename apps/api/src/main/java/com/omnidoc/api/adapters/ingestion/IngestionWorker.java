package com.omnidoc.api.adapters.ingestion;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;

import com.omnidoc.api.adapters.identity.IdentitySessions;
import com.omnidoc.api.adapters.ingestion.IngestionJobRepository.ClaimedJob;
import com.omnidoc.api.adapters.ingestion.IngestionJobRepository.ImportDescriptor;
import com.omnidoc.api.adapters.ingestion.IngestionJobRepository.RechunkTarget;
import com.omnidoc.api.adapters.ingestion.parser.ImportMediaType;
import com.omnidoc.api.adapters.ingestion.parser.ImportParseException;
import com.omnidoc.api.adapters.ingestion.parser.ImportParser;
import com.omnidoc.api.adapters.ingestion.parser.ParsedDocument;
import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.ResolveMembership;
import com.omnidoc.api.domain.IngestionModels.JobStatus;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;

/**
 * The in-process ingestion runner (architecture.md §5.2.1 §4): a {@code TaskExecutor}
 * dispatch triggered after the enqueue transaction commits, plus a {@code @Scheduled}
 * sweeper that picks up missed dispatches and reclaims jobs whose lease expired because
 * the previous runner died. No broker, no Spring Batch, no second process — the
 * {@code SECURITY DEFINER} {@code FOR UPDATE SKIP LOCKED} claim is already safe for more
 * than one instance.
 *
 * <p>Four stage units, the same vocabulary for both job kinds (§5): 1 validated,
 * 2 parsed, 3 note/version persisted, 4 chunks persisted. A {@code rechunk} job
 * completes stages 1–2 immediately and chunks the note's {@code current_version_id} as
 * resolved <em>at claim time</em>, so autosave never waits on chunking.
 *
 * <p>Trust is re-established on every claim and before every stage that writes: the
 * actor's membership in the job's workspace is re-resolved through the B-03 identity
 * port, and a loss fails the job. Enqueue-time claims are never trusted.
 */
public class IngestionWorker {

	private final IngestionJobRepository repository;
	private final VersionChunker versionChunker;
	private final ImportParser parser;
	private final NotesPort notesPort;
	private final IdentityPort identityPort;
	private final IngestionLimits limits;
	private final String workerId = "worker-" + UUID.randomUUID();
	private final ExecutorService parseExecutor = Executors.newSingleThreadExecutor(runnable -> {
		Thread thread = new Thread(runnable, "omnidoc-ingestion-parse");
		thread.setDaemon(true);
		return thread;
	});

	public IngestionWorker(
		IngestionJobRepository repository,
		VersionChunker versionChunker,
		ImportParser parser,
		NotesPort notesPort,
		IdentityPort identityPort,
		IngestionLimits limits) {
		this.repository = Objects.requireNonNull(repository, "repository");
		this.versionChunker = Objects.requireNonNull(versionChunker, "versionChunker");
		this.parser = Objects.requireNonNull(parser, "parser");
		this.notesPort = Objects.requireNonNull(notesPort, "notesPort");
		this.identityPort = Objects.requireNonNull(identityPort, "identityPort");
		this.limits = Objects.requireNonNull(limits, "limits");
	}

	public String workerId() {
		return this.workerId;
	}

	/**
	 * Post-commit dispatch. Must be invoked through the Spring bean (the
	 * {@link IngestionDispatcher} is bound to the proxied instance) so the drain really
	 * leaves the request thread — an import response must not wait on parsing.
	 */
	@Async
	public void dispatchAsync() {
		drainQuietly();
	}

	@Scheduled(
		initialDelayString = "${omnidoc.ingestion.sweep-initial-delay-ms:5000}",
		fixedDelayString = "${omnidoc.ingestion.sweep-interval-ms:15000}")
	public void sweep() {
		drainQuietly();
	}

	/**
	 * Claim and process until the queue is empty or this dispatch has done its share.
	 *
	 * @return number of jobs claimed
	 */
	public int drain() {
		int processed = 0;
		while (processed < this.limits.maxDrainPerDispatch()) {
			Optional<ClaimedJob> claimed;
			try {
				claimed = this.repository.claim(this.workerId, this.limits.leaseSeconds());
			}
			catch (DataAccessException ex) {
				break;
			}
			if (claimed.isEmpty()) {
				break;
			}
			processed++;
			ClaimedJob job = claimed.orElseThrow();
			try {
				process(job);
			}
			catch (RuntimeException ex) {
				finish(job, JobStatus.FAILED, "unavailable", 0);
			}
		}
		return processed;
	}

	private void drainQuietly() {
		try {
			drain();
		}
		catch (RuntimeException ex) {
			// A sweeper must never die on one bad pass.
		}
	}

	private void process(ClaimedJob job) {
		if (job.attempts() > this.limits.maxAttempts()) {
			finish(job, JobStatus.FAILED, "unavailable", 0);
			return;
		}
		if (!membershipHeld(job)) {
			finish(job, JobStatus.FAILED, "forbidden", 0);
			return;
		}
		Instant deadline = Instant.now().plus(this.limits.jobTimeout());
		if (job.isRechunk()) {
			rechunk(job, deadline);
		}
		else {
			importDocument(job, deadline);
		}
	}

	private void importDocument(ClaimedJob job, Instant deadline) {
		Optional<ImportDescriptor> descriptor = this.repository.importDescriptor(job);
		Optional<byte[]> payload = this.repository.payload(job);
		if (descriptor.isEmpty() || payload.isEmpty()) {
			finish(job, JobStatus.FAILED, "unavailable", 0);
			return;
		}
		ImportDescriptor document = descriptor.orElseThrow();
		byte[] bytes = payload.orElseThrow();

		// Stage 1 — validated. Re-checked server-side even though enqueue already did it.
		if (bytes.length > this.limits.maxUploadBytes()) {
			finish(job, JobStatus.FAILED, "too_large", 0);
			return;
		}
		Optional<ImportMediaType> mediaType =
			this.parser.resolveType(document.mediaType(), document.fileName(), bytes);
		if (mediaType.isEmpty()) {
			finish(job, JobStatus.FAILED, "unsupported_type", 0);
			return;
		}
		if (!this.repository.advance(job, 1, this.workerId, this.limits.leaseSeconds())) {
			return;
		}

		// Stage 2 — parsed.
		if (expired(deadline)) {
			finish(job, JobStatus.FAILED, "timeout", 1);
			return;
		}
		ParsedDocument parsed;
		try {
			parsed = parseWithinTimeout(bytes, mediaType.orElseThrow(), document.fileName());
		}
		catch (TimeoutException ex) {
			finish(job, JobStatus.FAILED, "timeout", 1);
			return;
		}
		catch (ImportParseException ex) {
			finish(job, JobStatus.FAILED, "unsupported_type", 1);
			return;
		}
		if (!this.repository.advance(job, 2, this.workerId, this.limits.leaseSeconds())) {
			return;
		}

		// Stage 3 — note + first version persisted in the actor's selected workspace.
		if (!membershipHeld(job)) {
			finish(job, JobStatus.FAILED, "forbidden", 2);
			return;
		}
		PortResult<Note> created = this.notesPort.create(new CreateNote(
			job.actor(),
			job.workspace(),
			new NoteFields(parsed.title(), parsed.bodyJson()),
			Optional.of(CorpusOwnership.MINE)));
		if (!(created instanceof PortResult.Success<Note> success)) {
			finish(job, JobStatus.FAILED, wireCode(created), 2);
			return;
		}
		Note note = success.value();
		if (!this.repository.attachNote(job, note.id(), note.versionId(), this.workerId)
			|| !this.repository.advance(job, 3, this.workerId, this.limits.leaseSeconds())) {
			return;
		}

		// Stage 4 — chunks persisted.
		chunkAndFinish(job, deadline, note.id(), note.versionId(), parsed.warnings());
	}

	private void rechunk(ClaimedJob job, Instant deadline) {
		// Stages 1–2 are complete by definition: nothing was uploaded and nothing parsed.
		if (!this.repository.advance(job, 2, this.workerId, this.limits.leaseSeconds())) {
			return;
		}
		Optional<RechunkTarget> target = this.repository.rechunkTarget(job);
		if (target.isEmpty()) {
			finish(job, JobStatus.FAILED, "not_found", 2);
			return;
		}
		RechunkTarget note = target.orElseThrow();
		if (!this.repository.attachNote(job, note.noteId(), note.versionId(), this.workerId)
			|| !this.repository.advance(job, 3, this.workerId, this.limits.leaseSeconds())) {
			return;
		}
		chunkAndFinish(job, deadline, note.noteId(), note.versionId(), List.of());
	}

	private void chunkAndFinish(
		ClaimedJob job, Instant deadline, NoteId noteId, VersionId versionId, List<String> carried) {
		if (!membershipHeld(job)) {
			finish(job, JobStatus.FAILED, "forbidden", 3);
			return;
		}
		if (expired(deadline)) {
			finish(job, JobStatus.FAILED, "timeout", 3);
			return;
		}
		PortResult<VersionChunker.Outcome> chunked =
			this.versionChunker.chunk(job.actor(), Optional.empty(), noteId, versionId, null);
		if (!(chunked instanceof PortResult.Success<VersionChunker.Outcome> success)) {
			finish(job, JobStatus.FAILED, wireCode(chunked), 3);
			return;
		}
		List<String> warnings = new ArrayList<>(carried);
		warnings.addAll(success.value().warnings());
		// Content was dropped or degraded but a version exists: partial, not failed (§6).
		boolean partial = !warnings.isEmpty();
		finish(job, partial ? JobStatus.PARTIAL : JobStatus.READY, partial ? "partial" : null, 4);
	}

	private ParsedDocument parseWithinTimeout(byte[] bytes, ImportMediaType mediaType, String fileName)
		throws TimeoutException, ImportParseException {
		Future<ParsedDocument> future =
			this.parseExecutor.submit(() -> this.parser.parse(bytes, mediaType, fileName));
		try {
			return future.get(this.limits.parseTimeout().toMillis(), TimeUnit.MILLISECONDS);
		}
		catch (TimeoutException ex) {
			future.cancel(true);
			throw ex;
		}
		catch (InterruptedException ex) {
			future.cancel(true);
			Thread.currentThread().interrupt();
			throw new ImportParseException("Parse was interrupted.", ex);
		}
		catch (ExecutionException ex) {
			Throwable cause = ex.getCause();
			if (cause instanceof ImportParseException parseFailure) {
				throw parseFailure;
			}
			throw new ImportParseException("Imported document could not be extracted.", cause);
		}
	}

	/**
	 * Re-resolve membership through the B-03 identity port. The job row's actor and
	 * workspace are only a record of what was true at enqueue; access is decided now.
	 */
	private boolean membershipHeld(ClaimedJob job) {
		try {
			PortResult<Membership> result = this.identityPort.resolveMembership(new ResolveMembership(
				IdentitySessions.forActor(job.actor().actorId()), job.workspace()));
			return result instanceof PortResult.Success<Membership> success
				&& success.value().tenantId().equals(job.actor().tenantId());
		}
		catch (DataAccessException ex) {
			return false;
		}
	}

	private void finish(ClaimedJob job, JobStatus status, String errorCode, int completedUnits) {
		try {
			this.repository.finish(job, status, errorCode, completedUnits, this.workerId);
		}
		catch (DataAccessException ex) {
			// Lease expiry will make the job claimable again; never loop here.
		}
	}

	private boolean expired(Instant deadline) {
		return Instant.now().isAfter(deadline);
	}

	private static String wireCode(PortResult<?> result) {
		if (result instanceof PortResult.Failure<?> failure) {
			PortFailure.Code code = failure.failure().code();
			return code.name().toLowerCase(Locale.ROOT);
		}
		return "unavailable";
	}
}
