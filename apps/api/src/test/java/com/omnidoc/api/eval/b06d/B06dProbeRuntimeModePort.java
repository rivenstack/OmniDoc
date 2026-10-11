package com.omnidoc.api.eval.b06d;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;
import com.omnidoc.api.domain.RuntimeModeModels.OpaqueCredentialHandle;
import com.omnidoc.api.domain.RuntimeModeModels.OutboundStamp;
import com.omnidoc.api.domain.RuntimeModeModels.ResolveMode;
import com.omnidoc.api.domain.RuntimeModeModels.ResolvedMode;
import com.omnidoc.api.domain.RuntimeModeModels.StampOutbound;

final class B06dProbeRuntimeModePort implements RuntimeModePort {

	static final String OPT_IN_ENV = "OMNIDOC_B06D_ALLOW_LIVE";
	static final String ACCOUNT_DECISION_ENV = "OMNIDOC_B06D_ACCOUNT_DECISION";
	static final String SECRET_FILE_ENV = "OMNIDOC_B06D_SECRET_FILE";
	static final String API_KEY_ENV = "AVALAI_API_KEY";
	static final String SPRING_PROFILES_ACTIVE_ENV = "SPRING_PROFILES_ACTIVE";
	static final String LOCAL_PROFILE = "local";

	private final TenantActor allowedActor;
	private final GateState gateState;

	B06dProbeRuntimeModePort(TenantActor allowedActor, GateState gateState) {
		this.allowedActor = Objects.requireNonNull(allowedActor, "allowedActor");
		this.gateState = Objects.requireNonNull(gateState, "gateState");
	}

	static GateState fromEnvironment(Path repositoryRoot) {
		return fromEnvironment(repositoryRoot, System.getenv());
	}

	static GateState fromEnvironment(Path repositoryRoot, java.util.Map<String, String> environment) {
		List<String> missing = new ArrayList<>();
		String profiles = environment.getOrDefault(SPRING_PROFILES_ACTIVE_ENV, "");
		boolean localProfile = Arrays.stream(profiles.split(","))
			.map(String::trim)
			.filter(value -> !value.isEmpty())
			.anyMatch(LOCAL_PROFILE::equals);
		if (!localProfile) {
			missing.add("SPRING_PROFILES_ACTIVE must include local");
		}
		if (!isAffirmative(environment.get(OPT_IN_ENV))) {
			missing.add(OPT_IN_ENV + " must be set to 1/true/yes");
		}
		if (!"accepted".equalsIgnoreCase(environment.getOrDefault(ACCOUNT_DECISION_ENV, ""))) {
			missing.add(ACCOUNT_DECISION_ENV + " must be set to accepted");
		}
		String apiKey = normalizeApiKey(environment.get(API_KEY_ENV));
		if (apiKey == null || apiKey.isBlank()) {
			missing.add(API_KEY_ENV + " must be exported from the external secret file");
		}
		Path secretFile = secretFile(environment.get(SECRET_FILE_ENV));
		if (secretFile == null) {
			missing.add(SECRET_FILE_ENV + " must point at the external secret file");
		}
		else {
			validateSecretFile(repositoryRoot, secretFile, missing);
		}
		return new GateState(missing.isEmpty(), List.copyOf(missing), Optional.ofNullable(secretFile));
	}

	@Override
	public PortResult<ResolvedMode> resolveMode(ResolveMode request) {
		return allow(request == null ? null : request.actor(), request == null ? null : request.requestedMode(),
			request == null ? null : request.feature());
	}

	@Override
	public PortResult<ResolvedMode> assertModeAllowed(AssertModeAllowed request) {
		return allow(request == null ? null : request.actor(), request == null ? null : request.mode(),
			request == null ? null : request.feature());
	}

	@Override
	public OutboundStamp stampOutbound(StampOutbound request) {
		Objects.requireNonNull(request, "request");
		if (!(request.resolvedMode().mode() == RuntimeMode.OPERATOR_FREE_TIER && request.feature() == Feature.EMBED)) {
			throw new IllegalArgumentException("B-06d outbound stamp is restricted to operator_free_tier embed calls.");
		}
		return new OutboundStamp(request.resolvedMode().mode(), request.feature());
	}

	GateState gateState() {
		return this.gateState;
	}

	private PortResult<ResolvedMode> allow(TenantActor actor, RuntimeMode mode, Feature feature) {
		if (actor == null || mode == null || feature == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, mode, and feature are required.");
		}
		if (!this.allowedActor.equals(actor)) {
			return modeForbidden("Only the fixed S-03 actor may run the B-06d live probe.");
		}
		if (mode != RuntimeMode.OPERATOR_FREE_TIER || feature != Feature.EMBED) {
			return modeForbidden("B-06d only authorizes operator_free_tier embed calls.");
		}
		if (!this.gateState.ready()) {
			return modeForbidden(String.join("; ", this.gateState.missing()));
		}
		return new PortResult.Success<>(new ResolvedMode(
			RuntimeMode.OPERATOR_FREE_TIER,
			Optional.of(new OpaqueCredentialHandle("avalai_api_key"))));
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	private static <T> PortResult<T> modeForbidden(String detail) {
		return new PortResult.Failure<>(PortFailure.forMode(
			PortFailure.Code.MODE_FORBIDDEN,
			detail,
			RuntimeMode.OPERATOR_FREE_TIER));
	}

	private static boolean isAffirmative(String value) {
		if (value == null) {
			return false;
		}
		String normalized = value.trim().toLowerCase(Locale.ROOT);
		return normalized.equals("1") || normalized.equals("true") || normalized.equals("yes");
	}

	static String normalizeApiKey(String raw) {
		if (raw == null) {
			return null;
		}
		String normalized = raw.trim();
		if (normalized.length() >= 2) {
			char first = normalized.charAt(0);
			char last = normalized.charAt(normalized.length() - 1);
			if ((first == '\'' && last == '\'') || (first == '"' && last == '"')) {
				normalized = normalized.substring(1, normalized.length() - 1).trim();
			}
		}
		return normalized;
	}

	private static Path secretFile(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return Path.of(raw).toAbsolutePath().normalize();
	}

	private static void validateSecretFile(Path repositoryRoot, Path secretFile, List<String> missing) {
		if (!Files.isRegularFile(secretFile)) {
			missing.add(SECRET_FILE_ENV + " must point at an existing regular file");
			return;
		}
		if (secretFile.startsWith(repositoryRoot.toAbsolutePath().normalize())) {
			missing.add(SECRET_FILE_ENV + " must point outside the repository");
		}
		try {
			Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(secretFile);
			Set<PosixFilePermission> required = Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE);
			if (!permissions.equals(required)) {
				missing.add(SECRET_FILE_ENV + " must be permission 0600");
			}
		}
		catch (UnsupportedOperationException | IOException ex) {
			missing.add("Unable to verify 0600 permissions for " + secretFile);
		}
	}

	record GateState(boolean ready, List<String> missing, Optional<Path> secretFile) {
		GateState {
			missing = List.copyOf(missing);
			secretFile = secretFile == null ? Optional.empty() : secretFile;
		}
	}
}