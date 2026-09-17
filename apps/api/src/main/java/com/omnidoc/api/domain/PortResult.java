package com.omnidoc.api.domain;

import java.util.Objects;

public sealed interface PortResult<T> permits PortResult.Success, PortResult.Failure {

	record Success<T>(T value) implements PortResult<T> {
		public Success { Objects.requireNonNull(value); }
	}

	record Failure<T>(PortFailure failure) implements PortResult<T> {
		public Failure { Objects.requireNonNull(failure); }
	}
}
