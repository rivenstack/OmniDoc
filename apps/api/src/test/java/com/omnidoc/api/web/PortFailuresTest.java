package com.omnidoc.api.web;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;

import static org.assertj.core.api.Assertions.assertThat;

class PortFailuresTest {

	@Test
	void statusMapsCanonicalFailureCodes() {
		assertThat(PortFailures.status(PortFailure.Code.VALIDATION)).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(PortFailures.status(PortFailure.Code.UNAUTHENTICATED)).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(PortFailures.status(PortFailure.Code.FORBIDDEN)).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(PortFailures.status(PortFailure.Code.NOT_FOUND)).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(PortFailures.status(PortFailure.Code.CONFLICT)).isEqualTo(HttpStatus.CONFLICT);
		assertThat(PortFailures.status(PortFailure.Code.TOO_LARGE)).isEqualTo(HttpStatus.CONTENT_TOO_LARGE);
		assertThat(PortFailures.status(PortFailure.Code.QUOTA_EXHAUSTED)).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
	}

	@Test
	void wireCodeIsLowerSnakeOfEnumName() {
		assertThat(PortFailures.wireCode(PortFailure.Code.NOT_FOUND)).isEqualTo("not_found");
		assertThat(PortFailures.wireCode(PortFailure.Code.MODE_FORBIDDEN)).isEqualTo("mode_forbidden");
		assertThat(PortFailures.wireCode(PortFailure.Code.VAULT_MISSING)).isEqualTo("vault_missing");
	}

	@Test
	void bodyOmitsModeWhenAbsentAndIncludesModeWhenPresent() {
		ErrorBody plain = PortFailures.body(PortFailure.of(PortFailure.Code.CONFLICT, "stale version"));
		assertThat(plain.code()).isEqualTo("conflict");
		assertThat(plain.detail()).isEqualTo("stale version");
		assertThat(plain.mode()).isNull();

		ErrorBody withMode = PortFailures.body(new PortFailure(
			PortFailure.Code.QUOTA_EXHAUSTED,
			"quota",
			Optional.of(RuntimeMode.OPERATOR_FREE_TIER)));
		assertThat(withMode.code()).isEqualTo("quota_exhausted");
		assertThat(withMode.mode()).isEqualTo("operator_free_tier");
	}

}
