package com.omnidoc.api.persistence;

import java.util.Objects;
import java.util.function.Supplier;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sets {@link TenantRls#GUC_NAME} and/or {@link ActorRls#GUC_NAME} transaction-locally
 * before executing work.
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
		setGuc(TenantRls.GUC_NAME, tenantId, "tenantId");
		Objects.requireNonNull(work, "work");
		return work.get();
	}

	/**
	 * Bind the actor GUC only. This is the membership-discovery scope used before a
	 * tenant is known (sign-in, workspace list, selector re-binding). It never grants
	 * access to tenant-scoped corpus rows.
	 */
	public <T> T callWithinActor(String actorId, Supplier<T> work) {
		setGuc(ActorRls.GUC_NAME, actorId, "actorId");
		Objects.requireNonNull(work, "work");
		return work.get();
	}

	/**
	 * Bind both GUCs on the current connection. Used once the server has resolved the
	 * tenant from the actor's membership and the work touches tenant-scoped tables.
	 */
	public <T> T callWithinActorAndTenant(String actorId, String tenantId, Supplier<T> work) {
		setGuc(ActorRls.GUC_NAME, actorId, "actorId");
		setGuc(TenantRls.GUC_NAME, tenantId, "tenantId");
		Objects.requireNonNull(work, "work");
		return work.get();
	}

	@Transactional
	public <T> T executeInTenantTransaction(String tenantId, Supplier<T> work) {
		return callWithinTenant(tenantId, work);
	}

	private void setGuc(String gucName, String value, String label) {
		Objects.requireNonNull(value, label);
		if (value.isBlank()) {
			throw new IllegalArgumentException(label + " must not be blank");
		}
		jdbcTemplate.queryForObject("SELECT set_config(?, ?, true)", String.class, gucName, value);
	}

}
