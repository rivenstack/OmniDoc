package com.omnidoc.api.web;

import org.junit.jupiter.api.Test;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PortResultsTest {

	@Test
	void orThrowUnwrapsSuccess() {
		assertThat(PortResults.orThrow(new PortResult.Success<>("ok"))).isEqualTo("ok");
	}

	@Test
	void orThrowWrapsFailureAsPortFailureException() {
		PortFailure failure = PortFailure.of(PortFailure.Code.NOT_FOUND, "missing");
		assertThatThrownBy(() -> PortResults.orThrow(new PortResult.Failure<String>(failure)))
			.isInstanceOf(PortFailureException.class)
			.extracting(ex -> ((PortFailureException) ex).failure())
			.isEqualTo(failure);
	}

}
