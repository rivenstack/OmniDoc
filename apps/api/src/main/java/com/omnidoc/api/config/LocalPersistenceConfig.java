package com.omnidoc.api.config;

import tools.jackson.databind.ObjectMapper;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.adapters.identity.JdbcIdentityAdapter;
import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.persistence.TenantRlsSession;
import com.omnidoc.api.web.identity.IdentityProfiles;

/**
 * Local Compose persistence helpers. Default profile keeps JDBC autoconfig
 * excluded (see {@code application.yml}) so health/ArchUnit need no live DB.
 *
 * <p>Profile {@code local} clears those excludes and activates Flyway +
 * DataSource against {@code apps/api/compose.yaml}. The B-03 identity adapter and its
 * HTTP surface are gated on the same profile, because they cannot work without a
 * DataSource. Full NotesPort adapter remains deferred to B-04.
 */
@Configuration
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@EnableTransactionManagement
public class LocalPersistenceConfig {

	@Bean
	TenantRlsSession tenantRlsSession(JdbcTemplate jdbcTemplate) {
		return new TenantRlsSession(jdbcTemplate);
	}

	@Bean
	TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
		return new TransactionTemplate(transactionManager);
	}

	@Bean
	IdentityPort identityPort(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession tenantRlsSession,
		TransactionTemplate transactionTemplate,
		PasswordEncoder passwordEncoder,
		ObjectMapper objectMapper) {
		return new JdbcIdentityAdapter(
			jdbcTemplate, tenantRlsSession, transactionTemplate, passwordEncoder, objectMapper);
	}

}
