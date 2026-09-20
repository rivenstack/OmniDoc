package com.omnidoc.api.web;

import java.util.Locale;

import org.springframework.http.HttpStatus;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;

/**
 * Maps {@link PortFailure} onto the S-02 HTTP envelope. The wire code is the
 * lower-snake form of {@link PortFailure.Code}, which is exactly the OpenAPI
 * {@code ErrorCode} enum.
 */
public final class PortFailures {

	private PortFailures() {
	}

	public static HttpStatus status(PortFailure.Code code) {
		return switch (code) {
			case VALIDATION, INVALID_MODEL, INVALID_KEY -> HttpStatus.BAD_REQUEST;
			case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
			case FORBIDDEN, MODE_FORBIDDEN, WRONG_SCOPE -> HttpStatus.FORBIDDEN;
			case NOT_FOUND -> HttpStatus.NOT_FOUND;
			case CONFLICT, VAULT_MISSING -> HttpStatus.CONFLICT;
			case TOO_LARGE -> HttpStatus.CONTENT_TOO_LARGE;
			case UNSUPPORTED_TYPE -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
			case QUOTA_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
			case TIMEOUT -> HttpStatus.GATEWAY_TIMEOUT;
			case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
			case PARTIAL, ENCRYPTION_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
		};
	}

	public static String wireCode(PortFailure.Code code) {
		return code.name().toLowerCase(Locale.ROOT);
	}

	public static ErrorBody body(PortFailure failure) {
		return new ErrorBody(
			wireCode(failure.code()),
			failure.detail(),
			failure.mode().map(RuntimeMode::value).orElse(null));
	}

}
