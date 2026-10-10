package com.omnidoc.api.web.ingestion;

import java.util.Locale;

import com.omnidoc.api.domain.IngestionModels.IngestionJob;

/**
 * Wire shapes for the S-02 ingestion paths. {@code docs/api/openapi.yaml} is the
 * authority; these records only mirror it. {@code status} is the lower-case
 * {@code JobStatus} enum value, and {@code totalUnits} is known at enqueue and never 0
 * while a job is pending (architecture.md §5.2.1 §5).
 */
public final class IngestionDtos {

	private IngestionDtos() {
	}

	public record IngestionJobResponse(String jobId, String status, int completedUnits, int totalUnits) {

		public static IngestionJobResponse of(IngestionJob job) {
			return new IngestionJobResponse(
				job.id().value(),
				job.status().name().toLowerCase(Locale.ROOT),
				job.completedUnits(),
				job.totalUnits());
		}
	}
}
