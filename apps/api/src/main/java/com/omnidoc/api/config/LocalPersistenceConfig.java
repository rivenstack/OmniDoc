package com.omnidoc.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * Local Compose persistence helpers. Default profile keeps JDBC autoconfig
 * excluded (see {@code application.yml}) so health/ArchUnit need no live DB.
 *
 * <p>Profile {@code local} clears those excludes and activates Flyway +
 * DataSource against {@code apps/api/compose.yaml}. Full NotesPort adapter
 * remains deferred to B-04.
 */
@Configuration
@Profile("local")
@EnableTransactionManagement
public class LocalPersistenceConfig {

	@Bean
	TenantRlsSession tenantRlsSession(JdbcTemplate jdbcTemplate) {
		return new TenantRlsSession(jdbcTemplate);
	}

}
