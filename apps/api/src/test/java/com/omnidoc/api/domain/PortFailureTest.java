package com.omnidoc.api.domain;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PortFailureTest {

	@Test
	void ofCreatesFailureWithoutMode() {
		PortFailure failure = PortFailure.of(PortFailure.Code.FORBIDDEN, "denied");
		assertThat(failure.code()).isEqualTo(PortFailure.Code.FORBIDDEN);
		assertThat(failure.detail()).isEqualTo("denied");
		assertThat(failure.mode()).isEmpty();
	}

	@Test
	void forModeAttachesRuntimeMode() {
		PortFailure failure = PortFailure.forMode(
			PortFailure.Code.MODE_FORBIDDEN, "wrong mode", RuntimeMode.MOCK);
		assertThat(failure.mode()).isEqualTo(Optional.of(RuntimeMode.MOCK));
	}

	@Test
	void nullModeOptionalIsNormalizedToEmpty() {
		PortFailure failure = new PortFailure(PortFailure.Code.NOT_FOUND, "gone", null);
		assertThat(failure.mode()).isEmpty();
	}

}
