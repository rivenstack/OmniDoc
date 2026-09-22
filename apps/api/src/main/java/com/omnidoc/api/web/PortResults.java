package com.omnidoc.api.web;

import com.omnidoc.api.domain.PortResult;

/**
 * Unwraps a {@link PortResult} at the HTTP boundary. Port failures become
 * {@link PortFailureException}, which the identity advice renders as an
 * S-02 {@link ErrorBody}.
 */
public final class PortResults {

	private PortResults() {
	}

	public static <T> T orThrow(PortResult<T> result) {
		if (result instanceof PortResult.Success<T> success) {
			return success.value();
		}
		throw new PortFailureException(((PortResult.Failure<T>) result).failure());
	}

}
