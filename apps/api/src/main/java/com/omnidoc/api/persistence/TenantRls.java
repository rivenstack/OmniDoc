package com.omnidoc.api.persistence;

/**
 * Tenant GUC name and fail-closed semantics for Postgres RLS (ADR-0001 §3 / ADR-0005).
 *
 * <p>Must be set with {@code set_config(name, value, true)} on the <strong>same</strong>
 * pooled connection <strong>inside</strong> a transaction. Missing / empty GUC yields
 * zero rows under FORCE RLS policies (fail closed as empty — not an SQL error).
 */
public final class TenantRls {

	public static final String GUC_NAME = "app.current_tenant_id";

	private TenantRls() {
	}

}
