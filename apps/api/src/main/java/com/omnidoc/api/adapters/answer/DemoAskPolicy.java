package com.omnidoc.api.adapters.answer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import com.omnidoc.api.domain.AnswerModels.AskQuestion;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;

/** Server-owned, local/demo-only gate for the accepted B-08 Ask exception. */
public final class DemoAskPolicy {

	private final boolean enabled;
	private final String tenantId;
	private final String workspaceId;
	private final Set<String> approvedNoteIds;
	private final String apiKey;
	private final Path secretFile;
	private final Path ledgerFile;

	public DemoAskPolicy(boolean enabled, String tenantId, String workspaceId,
		Set<String> approvedNoteIds, String apiKey, Path secretFile, Path ledgerFile) {
		this.enabled = enabled;
		this.tenantId = tenantId == null ? "" : tenantId.trim();
		this.workspaceId = workspaceId == null ? "" : workspaceId.trim();
		this.approvedNoteIds = Set.copyOf(Objects.requireNonNull(approvedNoteIds));
		this.apiKey = apiKey == null ? "" : apiKey.trim();
		this.secretFile = secretFile;
		this.ledgerFile = ledgerFile;
	}

	public static DemoAskPolicy fromEnvironment() {
		String notes = System.getenv().getOrDefault("OMNIDOC_B08_APPROVED_NOTE_IDS", "");
		Set<String> noteIds = Arrays.stream(notes.split(","))
			.map(String::trim).filter(value -> !value.isEmpty())
			.collect(Collectors.toUnmodifiableSet());
		return new DemoAskPolicy(
			"true".equalsIgnoreCase(System.getenv("OMNIDOC_B08_ALLOW_LIVE")),
			System.getenv("OMNIDOC_B08_DEMO_TENANT_ID"),
			System.getenv("OMNIDOC_B08_DEMO_WORKSPACE_ID"),
			noteIds,
			System.getenv("AVALAI_API_KEY"),
			path(System.getenv("OMNIDOC_B08_SECRET_FILE")),
			path(System.getenv("OMNIDOC_AVALAI_LEDGER_FILE")));
	}

	private static Path path(String value) {
		return value == null || value.isBlank() ? null : Path.of(value).toAbsolutePath().normalize();
	}

	public PortFailure check(AskQuestion request) {
		if (!this.enabled || request == null || request.mode() != RuntimeMode.OPERATOR_FREE_TIER
			|| request.actor() == null || request.acl() == null
			|| !this.tenantId.equals(request.actor().tenantId().value())
			|| !this.workspaceId.equals(request.acl().workspaceId().value())
			|| this.approvedNoteIds.isEmpty() || this.apiKey.isBlank()
			|| !externalSecretValid() || !externalLedgerValid()) {
			return PortFailure.forMode(PortFailure.Code.MODE_FORBIDDEN,
				"Live Ask is unavailable outside the approved local demo scope.",
				RuntimeMode.OPERATOR_FREE_TIER);
		}
		return null;
	}

	public boolean allowsActor(String actorTenantId) {
		return this.enabled && this.tenantId.equals(actorTenantId)
			&& !this.approvedNoteIds.isEmpty() && !this.apiKey.isBlank()
			&& externalSecretValid() && externalLedgerValid();
	}

	public Set<String> approvedNoteIds() {
		return this.approvedNoteIds;
	}

	String apiKey() {
		return this.apiKey;
	}

	public Path ledgerFile() {
		return this.ledgerFile;
	}

	private boolean externalSecretValid() {
		if (!externalPath(this.secretFile) || !Files.isRegularFile(this.secretFile)
			|| Files.isSymbolicLink(this.secretFile)) {
			return false;
		}
		try {
			Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(this.secretFile);
			return permissions.equals(Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
		}
		catch (IOException | UnsupportedOperationException ex) {
			return false;
		}
	}

	private boolean externalLedgerValid() {
		return externalPath(this.ledgerFile) && Files.isRegularFile(this.ledgerFile)
			&& !Files.isSymbolicLink(this.ledgerFile);
	}

	private static boolean externalPath(Path candidate) {
		if (candidate == null || !candidate.isAbsolute()) {
			return false;
		}
		Path approvedRoot = Path.of(System.getProperty("user.home"), ".config", "omnidoc-secrets")
			.toAbsolutePath().normalize();
		return candidate.startsWith(approvedRoot) && !candidate.equals(approvedRoot)
			&& !Files.isSymbolicLink(approvedRoot);
	}
}
