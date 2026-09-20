package com.omnidoc.api.web.identity;

import java.util.Objects;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import tools.jackson.databind.ObjectMapper;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.domain.IdentityModels.Authenticate;
import com.omnidoc.api.domain.IdentityModels.CredentialHandle;
import com.omnidoc.api.domain.IdentityModels.Principal;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityDtos.CreateSessionRequest;
import com.omnidoc.api.web.identity.IdentityDtos.PrincipalResponse;

/**
 * S-02 {@code /api/v1/session}. The response body carries the actor id only — the
 * session itself lives in the HTTP-only cookie and is the tenant authority.
 */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping(SessionController.PATH)
public class SessionController {

	static final String PATH = "/api/v1/session";

	private final IdentityPort identityPort;
	private final SecurityContextRepository securityContextRepository;
	private final ObjectMapper objectMapper;

	public SessionController(
		IdentityPort identityPort,
		SecurityContextRepository securityContextRepository,
		ObjectMapper objectMapper) {
		this.identityPort = Objects.requireNonNull(identityPort, "identityPort");
		this.securityContextRepository =
			Objects.requireNonNull(securityContextRepository, "securityContextRepository");
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
	}

	@PostMapping
	public PrincipalResponse create(
		@RequestBody CreateSessionRequest body,
		HttpServletRequest request,
		HttpServletResponse response) {
		if (body == null || !StringUtils.hasText(body.email()) || !StringUtils.hasText(body.password())) {
			throw new PortFailureException(
				PortFailure.of(PortFailure.Code.VALIDATION, "Email and password are required."));
		}

		CredentialHandle handle = new CredentialHandle(
			this.objectMapper.writeValueAsString(new PasswordCredentials(body.email(), body.password())));
		Principal principal = PortResults.orThrow(this.identityPort.authenticate(new Authenticate(handle)));

		bindSession(principal, request, response);
		return new PrincipalResponse(principal.actorId().value());
	}

	@GetMapping
	public PrincipalResponse current(Authentication authentication) {
		return new PrincipalResponse(SessionPrincipals.actorId(authentication));
	}

	@DeleteMapping
	public ResponseEntity<Void> delete(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
		return ResponseEntity.noContent().build();
	}

	/**
	 * Fresh session on every sign-in (fixation defence), then persist the context so
	 * subsequent requests authenticate from the cookie alone.
	 */
	private void bindSession(Principal principal, HttpServletRequest request, HttpServletResponse response) {
		HttpSession existing = request.getSession(false);
		if (existing != null) {
			existing.invalidate();
		}
		request.getSession(true);

		OmniDocUserDetails details = new OmniDocUserDetails(principal.actorId().value());
		Authentication authentication =
			UsernamePasswordAuthenticationToken.authenticated(details, null, details.getAuthorities());
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		this.securityContextRepository.saveContext(context, request, response);

		issueCsrfCookie(request);
	}

	/**
	 * The SPA CSRF token is deferred: the XSRF-TOKEN cookie is only written once the
	 * token is actually resolved. Sign-in is the point where the client needs it, so
	 * force it here rather than adding a separate token endpoint.
	 */
	private static void issueCsrfCookie(HttpServletRequest request) {
		if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
			token.getToken();
		}
	}

	/** Adapter credential document: {@code {"email": "...", "password": "..."}}. */
	record PasswordCredentials(String email, String password) {
	}

}
