package com.omnidoc.api.domain;

public enum RuntimeMode {
	MOCK("mock"),
	OPERATOR_FREE_TIER("operator_free_tier"),
	CUSTOMER_KEY("customer_key");

	private final String value;

	RuntimeMode(String value) { this.value = value; }

	public String value() { return value; }

	public static RuntimeMode fromValue(String value) {
		for (RuntimeMode mode : values()) {
			if (mode.value.equals(value)) return mode;
		}
		throw new IllegalArgumentException("Unknown runtime mode: " + value);
	}
}
