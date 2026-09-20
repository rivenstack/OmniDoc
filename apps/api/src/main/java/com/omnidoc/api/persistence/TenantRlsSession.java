package com.omnidoc.api.persistence;

import java.util.Objects;
import java.util.function.Supplier;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sets {@link TenantRls#GUC_NAME} transaction-locally before executing work.
 *
 * <p>Full {@code NotesPort} JDBC adapter is deferred to B-04 — this helper is the
 * reusable GUC pattern for every tenant-scoped query path.
 *
 * <p>Registered as a Spring bean only under profile {@code local}
 * ({@code LocalPersistenceConfig}). Construct directly in focused JDBC tests.
 */
public class TenantRlsSession {

	private final JdbcTemplate jdbcTemplate;

	public TenantRlsSession(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
	}

	/**
	 * Bind tenant GUC on the current connection, then run {@code work}.
	 * Caller must already be inside a Spring-managed transaction so the
	 * connection stays pinned for the GUC + queries.
	 */
	public <T> T callWithinTenant(String tenantId, Supplier<T> work) {
		Objects.requireNonNull(tenantId, "tenantId");
		if (tenantId.isBlank()) {
			throw new IllegalArgumentException("tenantId must not be blank");
		}
		Objects.requireNonNull(work, "work");
		jdbcTemplate.queryForObject(
			"SELECT set_config(?, ?, true)",
			String.class,
			TenantRls.GUC_NAME,
			tenantId);
		return work.get();
	}

	@Transactional
	public <T> T executeInTenantTransaction(String tenantId, Supplier<T> work) {
		return callWithinTenant(tenantId, work);
	}

}
