package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.Completion;
import com.omnidoc.api.domain.VaultModels.RotateCredential;
import com.omnidoc.api.domain.VaultModels.StoreCredential;
import com.omnidoc.api.domain.VaultModels.VaultMetadata;
import com.omnidoc.api.domain.VaultModels.VaultRecordRequest;
import com.omnidoc.api.domain.VaultModels.Verification;

public interface CredentialVaultPort {
	PortResult<VaultMetadata> store(StoreCredential request);
	PortResult<VaultMetadata> rotate(RotateCredential request);
	PortResult<Completion> revoke(VaultRecordRequest request);
	PortResult<Verification> verify(VaultRecordRequest request);
	PortResult<VaultMetadata> getMetadata(VaultRecordRequest request);
}
