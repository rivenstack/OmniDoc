package com.omnidoc.api.web.search;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityProfiles;
import com.omnidoc.api.web.identity.WorkspaceMembershipBinder;
import com.omnidoc.api.web.search.SearchDtos.SearchHitResponse;
import com.omnidoc.api.web.search.SearchDtos.SearchRequest;
import com.omnidoc.api.web.search.SearchDtos.SearchResultsResponse;

/** S-02 search HTTP surface over the existing SearchPort. */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping("/api/v1/search")
public class SearchController {

	private static final String WORKSPACE_HEADER = "OmniDoc-Workspace-Id";
	private static final int DEFAULT_TOP_K = 10;

	private final SearchPort searchPort;
	private final WorkspaceMembershipBinder membershipBinder;

	public SearchController(SearchPort searchPort, WorkspaceMembershipBinder membershipBinder) {
		this.searchPort = Objects.requireNonNull(searchPort, "searchPort");
		this.membershipBinder = Objects.requireNonNull(membershipBinder, "membershipBinder");
	}

	@PostMapping("/lexical")
	public SearchResultsResponse lexical(
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		@RequestBody SearchRequest body,
		Authentication authentication) {
		Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
		SearchResults results = PortResults.orThrow(this.searchPort.lexicalSearch(toCommand(body, membership)));
		return toResponse(results);
	}

	@PostMapping("/hybrid")
	public SearchResultsResponse hybrid(
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		@RequestBody SearchRequest body,
		Authentication authentication) {
		Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
		SearchResults results = PortResults.orThrow(this.searchPort.hybridSearch(toCommand(body, membership)));
		return toResponse(results);
	}

	private static TextSearch toCommand(SearchRequest body, Membership membership) {
		if (body == null) {
			throw validation("Request body is required.");
		}
		Map<String, String> filters = new LinkedHashMap<>();
		if (body.filters() != null) {
			filters.putAll(body.filters());
		}
		if (body.corpusOwnership() != null) {
			String normalized = body.corpusOwnership().toLowerCase(Locale.ROOT);
			String existing = filters.get(com.omnidoc.api.adapters.retrieval.JdbcSearchAdapter.FILTER_CORPUS_OWNERSHIP);
			if (existing != null && !existing.equalsIgnoreCase(normalized)) {
				throw validation("filters.corpus_ownership must match corpusOwnership when both are supplied.");
			}
			filters.put(com.omnidoc.api.adapters.retrieval.JdbcSearchAdapter.FILTER_CORPUS_OWNERSHIP, normalized);
		}
		return new TextSearch(
			actorOf(membership),
			new AclScope(membership.workspaceId(), membership.roles()),
			body.query(),
			body.topK() == null ? DEFAULT_TOP_K : body.topK(),
			new SearchFilters(filters));
	}

	private static SearchResultsResponse toResponse(SearchResults results) {
		List<SearchHitResponse> hits = results.hits().stream()
			.map(SearchController::toResponse)
			.toList();
		return new SearchResultsResponse(hits, results.degraded());
	}

	private static SearchHitResponse toResponse(SearchHit hit) {
		return new SearchHitResponse(
			hit.chunkId().value(),
			hit.noteId().value(),
			hit.versionId().value(),
			hit.score(),
			hit.snippet(),
			hit.corpusOwnership().map(value -> value.name().toLowerCase(Locale.ROOT)).orElse(null));
	}

	private static TenantActor actorOf(Membership membership) {
		return new TenantActor(membership.tenantId(), membership.actorId());
	}

	private static PortFailureException validation(String detail) {
		return new PortFailureException(PortFailure.of(PortFailure.Code.VALIDATION, detail));
	}
}