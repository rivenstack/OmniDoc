package com.omnidoc.api.domain;

import java.util.Objects;
import java.util.Optional;

public record PortFailure(Code code, String detail, Optional<RuntimeMode> mode) {

	public PortFailure {
		Objects.requireNonNull(code);
		Objects.requireNonNull(detail);
		mode = mode == null ? Optional.empty() : mode;
	}

	public static PortFailure of(Code code, String detail) {
		return new PortFailure(code, detail, Optional.empty());
	}

	public static PortFailure forMode(Code code, String detail, RuntimeMode mode) {
		return new PortFailure(code, detail, Optional.of(mode));
	}

	public enum Code {
		NOT_FOUND, CONFLICT, FORBIDDEN, VALIDATION, UNAVAILABLE,
		UNSUPPORTED_TYPE, TOO_LARGE, TIMEOUT, PARTIAL,
		QUOTA_EXHAUSTED, INVALID_MODEL, MODE_FORBIDDEN,
		UNAUTHENTICATED, INVALID_KEY, WRONG_SCOPE, ENCRYPTION_ERROR,
		VAULT_MISSING
	}
}
