package com.omnidoc.api.config;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.omnidoc.api.web.ErrorBody;

/**
 * B-03 session security (ADR-0005): HTTP-only session cookie, SPA CSRF, and JSON
 * {@link ErrorBody} responses for 401/403.
 *
 * <p>The session cookie is the tenant authority. Clients never send a tenant id;
 * {@code workspaceId} is a selector that the server re-binds against first-party
 * membership (architecture.md §2).
 *
 * <p>This chain must stay bootable on the default profile — it holds no DataSource
 * dependency. The identity adapter and controllers are profile-gated instead.
 */
@Configuration
public class SecurityConfig {

	static final String SESSION_PATH = "/api/v1/session";

	private final List<String> allowedOrigins;

	public SecurityConfig(
		@Value("${omnidoc.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
		this.allowedOrigins = List.copyOf(allowedOrigins);
	}

	@Bean
	SecurityFilterChain securityFilterChain(
		HttpSecurity http,
		SecurityContextRepository securityContextRepository,
		AuthenticationEntryPoint authenticationEntryPoint,
		AccessDeniedHandler accessDeniedHandler,
		CorsConfigurationSource corsConfigurationSource) throws Exception {
		http
			.cors(cors -> cors.configurationSource(corsConfigurationSource))
			// spa() = XSRF-TOKEN cookie (readable by the SPA) + X-XSRF-TOKEN header.
			// Sign-in is exempt because no session, and therefore no token, exists yet.
			.csrf(csrf -> csrf
				.spa()
				.ignoringRequestMatchers(PathPatternRequestMatcher.pathPattern(HttpMethod.POST, SESSION_PATH)))
			.securityContext(context -> context.securityContextRepository(securityContextRepository))
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.requestCache(AbstractHttpConfigurer::disable)
			.exceptionHandling(handling -> handling
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(accessDeniedHandler))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
				.requestMatchers("/error").permitAll()
				.requestMatchers(HttpMethod.POST, SESSION_PATH).permitAll()
				.requestMatchers(HttpMethod.GET, SESSION_PATH).authenticated()
				.requestMatchers(HttpMethod.DELETE, SESSION_PATH).authenticated()
				.requestMatchers("/api/v1/workspaces/**").authenticated()
				.requestMatchers("/api/v1/**").authenticated()
				.anyRequest().authenticated());
		return http.build();
	}

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	AuthenticationEntryPoint omniDocAuthenticationEntryPoint(ObjectMapper objectMapper) {
		return (request, response, authException) -> writeError(
			response, objectMapper, HttpStatus.UNAUTHORIZED, "unauthenticated", "Session required.");
	}

	@Bean
	AccessDeniedHandler omniDocAccessDeniedHandler(ObjectMapper objectMapper) {
		return (request, response, accessDeniedException) -> writeError(
			response, objectMapper, HttpStatus.FORBIDDEN, "forbidden", "Request is not permitted for this session.");
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(this.allowedOrigins);
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "X-XSRF-TOKEN", "OmniDoc-Workspace-Id"));
		// Credentials are required: the session and CSRF cookies travel with every call.
		configuration.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);
		return source;
	}

	private static void writeError(
		HttpServletResponse response,
		ObjectMapper objectMapper,
		HttpStatus status,
		String code,
		String detail) throws IOException {
		if (response.isCommitted()) {
			return;
		}
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write(objectMapper.writeValueAsString(new ErrorBody(code, detail)));
	}

}
