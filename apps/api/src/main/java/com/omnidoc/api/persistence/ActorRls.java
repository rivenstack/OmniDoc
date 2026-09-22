package com.omnidoc.api.persistence;

/**
 * Actor GUC name for membership discovery under Postgres RLS (B-03, migration V3).
 *
 * <p>Set with {@code set_config(name, value, true)} on the <strong>same</strong> pooled
 * connection <strong>inside</strong> a transaction, exactly like {@link TenantRls}. The
 * value is the actor resolved from the server session — never a client-supplied header.
 *
 * <p>This GUC only opens membership/workspace <em>discovery</em>. Every tenant-scoped
 * read or write still needs {@link TenantRls#GUC_NAME}.
 */
public final class ActorRls {

	public static final String GUC_NAME = "app.current_actor_id";

	private ActorRls() {
	}

}
