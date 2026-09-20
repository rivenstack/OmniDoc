package com.omnidoc.api.web;

import java.io.Serial;
import java.util.Objects;

import com.omnidoc.api.domain.PortFailure;

/**
 * Carries a {@link PortFailure} out of a controller so the advice can render the
 * S-02 {@link ErrorBody} with the matching status. Details are port-authored and
 * must never contain credentials or note bodies.
 */
public class PortFailureException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	private final transient PortFailure failure;

	public PortFailureException(PortFailure failure) {
		super(Objects.requireNonNull(failure, "failure").detail());
		this.failure = failure;
	}

	public PortFailure failure() {
		return this.failure;
	}

}
