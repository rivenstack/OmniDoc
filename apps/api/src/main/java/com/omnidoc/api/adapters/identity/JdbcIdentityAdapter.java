package com.omnidoc.api.adapters.identity;

import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tools.jackson.databind.ObjectMapper;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IdentityModels.Authenticate;
import com.omnidoc.api.domain.IdentityModels.InviteMember;
import com.omnidoc.api.domain.IdentityModels.InviteResult;
import com.omnidoc.api.domain.IdentityModels.ListWorkspaces;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.Principal;
import com.omnidoc.api.domain.IdentityModels.ResolveMembership;
import com.omnidoc.api.domain.IdentityModels.Workspace;
import com.omnidoc.api.domain.IdentityModels.WorkspaceList;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * First-party identity adapter over the B-02 schema (ADR-0005). Membership is
 * server-authoritative: the client workspace id is only a selector, and a selector the
 * session actor has no membership row for resolves to {@code FORBIDDEN}, never to an
 * empty-but-successful read.
 *
 * <p>Every query runs inside a transaction with the actor GUC bound on the same
 * connection, so Postgres RLS (V3) is the second line of defence behind the SQL
 * predicates. Writes additionally bind the tenant GUC resolved from the membership row.
 *
 * <p>Never logs credentials, password hashes, or invitee contact details.
 */
public class JdbcIdentityAdapter implements IdentityPort {

	/**
	 * Roles allowed to invite. Kept here (not in the DB) until an authorization model
	 * lands; the check is server-side either way.
	 */
	private static final Set<String> INVITE_ROLES = Set.of("owner", "admin");

	/**
	 * Compared against when no actor matches, so a missing email and a wrong password
	 * cost roughly the same work. Not a usable credential (BCrypt hash of random bytes).
	 */
	private static final String ABSENT_ACTOR_HASH =
		"$2a$10$7EqJtq98hPqEX7fNZaFWoOa8A1xwyj0nB6b1RHAcw3T3h1O5kCQZC";

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;

	public JdbcIdentityAdapter(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession rlsSession,
		TransactionTemplate transactionTemplate,
		PasswordEncoder passwordEncoder,
		ObjectMapper objectMapper) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
		this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder");
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
	}

	@Override
	public PortResult<Principal> authenticate(Authenticate request) {
		PasswordCredentials credentials;
		try {
			credentials = this.objectMapper.readValue(request.credentials().value(), PasswordCredentials.class);
		}
		catch (RuntimeException ex) {
			return failure(PortFailure.Code.VALIDATION, "Credential handle is not a password credentials document.");
		}
		if (credentials == null
			|| !StringUtils.hasText(credentials.email())
			|| !StringUtils.hasText(credentials.password())) {
			return failure(PortFailure.Code.VALIDATION, "Email and password are required.");
		}

		// actors is global identity scaffolding and carries no tenant column (V2), so
		// no GUC applies here. The row is the only thing that establishes the tenant.
		List<ActorRow> rows = this.jdbcTemplate.query(
			"SELECT actor_id, password_hash FROM actors WHERE lower(email) = lower(?)",
			(rs, rowNum) -> new ActorRow(rs.getString("actor_id"), rs.getString("password_hash")),
			credentials.email());

		ActorRow actor = rows.size() == 1 ? rows.get(0) : null;
		String hash = (actor != null && actor.passwordHash() != null) ? actor.passwordHash() : ABSENT_ACTOR_HASH;
		boolean matches = this.passwordEncoder.matches(credentials.password(), hash);
		if (actor == null || actor.passwordHash() == null || !matches) {
			return failure(PortFailure.Code.UNAUTHENTICATED, "Invalid email or password.");
		}

		ActorId actorId = new ActorId(actor.actorId());
		return new PortResult.Success<>(new Principal(actorId, IdentitySessions.forActor(actorId)));
	}

	@Override
	public PortResult<WorkspaceList> listWorkspaces(ListWorkspaces request) {
		ActorId actorId = IdentitySessions.actorOf(request.session());
		List<Workspace> workspaces = this.transactionTemplate.execute(status ->
			this.rlsSession.callWithinActor(actorId.value(), () -> this.jdbcTemplate.query(
				"""
				SELECT w.workspace_id, w.tenant_id, w.name
				FROM workspaces w
				JOIN workspace_memberships m ON m.workspace_id = w.workspace_id
				WHERE m.actor_id = ?
				ORDER BY w.name, w.workspace_id
				""",
				(rs, rowNum) -> new Workspace(
					new WorkspaceId(rs.getString("workspace_id")),
					new TenantId(rs.getString("tenant_id")),
					rs.getString("name")),
				actorId.value())));
		return new PortResult.Success<>(new WorkspaceList(workspaces == null ? List.of() : workspaces));
	}

	@Override
	public PortResult<Membership> resolveMembership(ResolveMembership request) {
		ActorId actorId = IdentitySessions.actorOf(request.session());
		WorkspaceId workspaceId = request.workspaceSelector();
		Membership membership = this.transactionTemplate.execute(status ->
			findMembership(actorId, workspaceId));
		if (membership == null) {
			return forbiddenSelector();
		}
		return new PortResult.Success<>(membership);
	}

	@Override
	public PortResult<InviteResult> invite(InviteMember request) {
		if (!StringUtils.hasText(request.invitee())) {
			return failure(PortFailure.Code.VALIDATION, "Invitee is required.");
		}
		if (request.roles().isEmpty()) {
			return failure(PortFailure.Code.VALIDATION, "At least one role is required.");
		}

		return this.transactionTemplate.execute(status -> inviteWithinTransaction(request));
	}

	private PortResult<InviteResult> inviteWithinTransaction(InviteMember request) {
		TenantActor actor = request.actor();
		ActorId actorId = actor.actorId();
		WorkspaceId workspaceId = request.workspaceId();

		Membership membership = findMembership(actorId, workspaceId);
		if (membership == null || !membership.tenantId().equals(actor.tenantId())) {
			return forbiddenSelector();
		}
		if (membership.roles().stream().noneMatch(INVITE_ROLES::contains)) {
			return failure(PortFailure.Code.FORBIDDEN, "Owner or admin role is required to invite members.");
		}

		String inviteId = "inv-" + UUID.randomUUID();
		String tenantId = membership.tenantId().value();
		String[] roles = request.roles().toArray(new String[0]);
		this.rlsSession.callWithinActorAndTenant(actorId.value(), tenantId, () ->
			this.jdbcTemplate.update(connection -> {
				PreparedStatement statement = connection.prepareStatement(
					"""
					INSERT INTO workspace_invites
						(invite_id, tenant_id, workspace_id, invitee, roles, invited_by)
					VALUES (?, ?, ?, ?, ?, ?)
					""");
				statement.setString(1, inviteId);
				statement.setString(2, tenantId);
				statement.setString(3, workspaceId.value());
				statement.setString(4, request.invitee());
				statement.setArray(5, connection.createArrayOf("text", roles));
				statement.setString(6, actorId.value());
				return statement;
			}));
		return new PortResult.Success<>(new InviteResult(inviteId));
	}

	/**
	 * Membership lookup under the actor GUC. Caller must already be in a transaction.
	 * Returns {@code null} when the selector is not one of the actor's workspaces.
	 */
	private Membership findMembership(ActorId actorId, WorkspaceId workspaceId) {
		List<Membership> found = this.rlsSession.callWithinActor(actorId.value(), () -> this.jdbcTemplate.query(
			"SELECT tenant_id, roles FROM workspace_memberships WHERE actor_id = ? AND workspace_id = ?",
			(rs, rowNum) -> new Membership(
				new TenantId(rs.getString("tenant_id")),
				workspaceId,
				actorId,
				readRoles(rs)),
			actorId.value(), workspaceId.value()));
		return found.isEmpty() ? null : found.get(0);
	}

	private static Set<String> readRoles(ResultSet resultSet) throws SQLException {
		Array array = resultSet.getArray("roles");
		if (array == null) {
			return Set.of();
		}
		Object raw = array.getArray();
		if (!(raw instanceof Object[] values)) {
			return Set.of();
		}
		Set<String> roles = new LinkedHashSet<>();
		for (Object value : values) {
			if (value != null) {
				roles.add(value.toString());
			}
		}
		return Set.copyOf(roles);
	}

	private static <T> PortResult<T> forbiddenSelector() {
		return failure(PortFailure.Code.FORBIDDEN, "Workspace selector does not match session membership.");
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	/**
	 * Wire shape of {@code CredentialHandle.value} for this adapter:
	 * {@code {"email": "...", "password": "..."}}. Kept private so the raw password
	 * never escapes the adapter.
	 */
	@JsonIgnoreProperties(ignoreUnknown = true)
	record PasswordCredentials(String email, String password) {
	}

	private record ActorRow(String actorId, String passwordHash) {
	}

}
