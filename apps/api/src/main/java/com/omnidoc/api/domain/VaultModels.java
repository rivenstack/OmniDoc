package com.omnidoc.api.domain;

import java.util.Optional;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.VaultRecordId;

public final class VaultModels {
	private VaultModels() { }
	public record PlaintextCredential(char[] value) {
		public PlaintextCredential { value = value.clone(); }
		@Override public char[] value() { return value.clone(); }
	}
	public record StoreCredential(TenantActor actor, PlaintextCredential credential, String toolChapterId,
		Optional<String> label) { }
	public record RotateCredential(TenantActor actor, VaultRecordId recordId, PlaintextCredential credential) { }
	public record VaultRecordRequest(TenantActor actor, VaultRecordId recordId) { }
	public enum VaultStatus { ACTIVE, REVOKED, INVALID }
	public record VaultMetadata(VaultRecordId recordId, String maskedPrefix, String toolChapterId,
		Optional<String> label, VaultStatus status) { }
	public enum Verification { OK, INVALID, WRONG_SCOPE }
}
