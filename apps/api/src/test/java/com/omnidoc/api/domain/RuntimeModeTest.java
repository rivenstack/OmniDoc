package com.omnidoc.api.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RuntimeModeTest {

	@Test
	void fromValueResolvesKnownModes() {
		assertThat(RuntimeMode.fromValue("mock")).isEqualTo(RuntimeMode.MOCK);
		assertThat(RuntimeMode.fromValue("operator_free_tier")).isEqualTo(RuntimeMode.OPERATOR_FREE_TIER);
		assertThat(RuntimeMode.fromValue("customer_key")).isEqualTo(RuntimeMode.CUSTOMER_KEY);
	}

	@Test
	void valueReturnsWireToken() {
		assertThat(RuntimeMode.MOCK.value()).isEqualTo("mock");
		assertThat(RuntimeMode.CUSTOMER_KEY.value()).isEqualTo("customer_key");
	}

	@Test
	void fromValueRejectsUnknown() {
		assertThatThrownBy(() -> RuntimeMode.fromValue("live_openrouter"))
			.isInstanceOf(IllegalArgumentException.class)
			.hasMessageContaining("Unknown runtime mode");
	}

}
