package com.omnidoc.api.adapters.ingestion;

import java.time.Duration;

/**
 * Ingestion limits from architecture.md §5.2.1 §6, as values rather than literals so a
 * deployment can tighten them without a code change.
 *
 * @param maxUploadBytes upload cap; exceeded ⇒ {@code too_large} (413 at enqueue)
 * @param parseTimeout per-document parse wall clock; exceeded ⇒ {@code timeout}
 * @param jobTimeout whole-job wall clock; exceeded ⇒ {@code timeout}
 * @param lease claim lease, extended after each stage
 * @param maxAttempts claims allowed before the job is failed
 * @param maxDrainPerDispatch jobs one dispatch may process before yielding
 */
public record IngestionLimits(
	long maxUploadBytes,
	Duration parseTimeout,
	Duration jobTimeout,
	Duration lease,
	int maxAttempts,
	int maxDrainPerDispatch) {

	public static final long DEFAULT_MAX_UPLOAD_BYTES = 10L * 1024 * 1024;

	public IngestionLimits {
		if (maxUploadBytes <= 0) {
			throw new IllegalArgumentException("maxUploadBytes must be positive");
		}
		if (maxAttempts <= 0 || maxDrainPerDispatch <= 0) {
			throw new IllegalArgumentException("maxAttempts and maxDrainPerDispatch must be positive");
		}
		if (parseTimeout.isNegative() || jobTimeout.isNegative() || lease.isNegative()) {
			throw new IllegalArgumentException("timeouts must not be negative");
		}
	}

	public static IngestionLimits defaults() {
		return new IngestionLimits(
			DEFAULT_MAX_UPLOAD_BYTES,
			Duration.ofSeconds(60),
			Duration.ofMinutes(5),
			Duration.ofSeconds(120),
			3,
			64);
	}

	public int leaseSeconds() {
		return (int) Math.max(1, this.lease.toSeconds());
	}
}
