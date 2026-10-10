package com.omnidoc.api.web.ingestion;

import java.io.IOException;
import java.util.Objects;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.omnidoc.api.application.port.IngestionPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.JobId;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IngestionModels.EnqueueImport;
import com.omnidoc.api.domain.IngestionModels.GetJob;
import com.omnidoc.api.domain.IngestionModels.ImportContent;
import com.omnidoc.api.domain.IngestionModels.IngestionJob;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityProfiles;
import com.omnidoc.api.web.identity.WorkspaceMembershipBinder;
import com.omnidoc.api.web.ingestion.IngestionDtos.IngestionJobResponse;

/**
 * S-02 ingestion HTTP surface: {@code POST /api/v1/ingestion-jobs} (multipart → 202) and
 * {@code GET /api/v1/ingestion-jobs/{jobId}} (→ 200). The OpenAPI document stays the
 * wire authority; no operation is added here.
 *
 * <p>{@code OmniDoc-Workspace-Id} is a selector only. It is re-bound to first-party
 * membership before the port is called, so a job id from another workspace is a 403 and
 * a session with no membership never reaches the queue. CSRF is enforced by the shared
 * SPA chain — the enqueue POST is not exempt.
 */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping("/api/v1")
public class IngestionController {

	private static final String WORKSPACE_HEADER = "OmniDoc-Workspace-Id";

	private final IngestionPort ingestionPort;
	private final WorkspaceMembershipBinder membershipBinder;

	public IngestionController(IngestionPort ingestionPort, WorkspaceMembershipBinder membershipBinder) {
		this.ingestionPort = Objects.requireNonNull(ingestionPort, "ingestionPort");
		this.membershipBinder = Objects.requireNonNull(membershipBinder, "membershipBinder");
	}

	@PostMapping(path = "/ingestion-jobs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<IngestionJobResponse> enqueue(
		@RequestPart("file") MultipartFile file,
		@RequestParam(name = "fileName", required = false) String fileName,
		@RequestParam(name = "mediaType", required = false) String mediaType,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		Authentication authentication) {

		Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
		if (file == null || file.isEmpty()) {
			throw validation("A non-empty file part is required.");
		}
		String effectiveFileName = StringUtils.hasText(fileName) ? fileName : file.getOriginalFilename();
		String effectiveMediaType = StringUtils.hasText(mediaType) ? mediaType : file.getContentType();

		IngestionJob job;
		try {
			job = PortResults.orThrow(this.ingestionPort.enqueueImport(new EnqueueImport(
				actorOf(membership),
				membership.workspaceId(),
				new ImportContent(file.getInputStream(), effectiveMediaType, effectiveFileName))));
		}
		catch (IOException ex) {
			throw validation("Uploaded file could not be read.");
		}
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(IngestionJobResponse.of(job));
	}

	@GetMapping("/ingestion-jobs/{jobId}")
	public IngestionJobResponse get(
		@PathVariable String jobId,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		Authentication authentication) {

		Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
		IngestionJob job = PortResults.orThrow(this.ingestionPort.getJob(new GetJob(
			actorOf(membership), membership.workspaceId(), new JobId(jobId))));
		return IngestionJobResponse.of(job);
	}

	private static TenantActor actorOf(Membership membership) {
		return new TenantActor(membership.tenantId(), membership.actorId());
	}

	private static PortFailureException validation(String detail) {
		return new PortFailureException(PortFailure.of(PortFailure.Code.VALIDATION, detail));
	}
}
