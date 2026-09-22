package com.omnidoc.api.web.identity;

/**
 * The identity adapter and its HTTP surface need a live DataSource, which the default
 * profile deliberately excludes so health and ArchUnit stay green without a database
 * (B-02). Everything that depends on {@code IdentityPort} is gated on the same profile
 * as {@code LocalPersistenceConfig}; the security filter chain itself is not, so the
 * default profile still boots with sessions and CSRF configured.
 */
public final class IdentityProfiles {

	public static final String PERSISTENT_IDENTITY = "local";

	private IdentityProfiles() {
	}

}
