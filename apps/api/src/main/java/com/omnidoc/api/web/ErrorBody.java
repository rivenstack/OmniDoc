package com.omnidoc.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * OpenAPI {@code ErrorBody} (S-02). {@code mode} is only present on mode-bearing
 * failures such as {@code quota_exhausted}; it is omitted otherwise so the payload
 * stays inside {@code additionalProperties: false}.
 *
 * <p>{@code docs/api/openapi.yaml} remains the contract source of truth — this record
 * consumes it and must not fork it.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorBody(String code, String detail, String mode) {

	public ErrorBody(String code, String detail) {
		this(code, detail, null);
	}

}
