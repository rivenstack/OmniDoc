package com.omnidoc.api.web.ask;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import tools.jackson.databind.ObjectMapper;

import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.omnidoc.api.application.port.AnswerPort;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.AskQuestion;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityProfiles;
import com.omnidoc.api.web.identity.WorkspaceMembershipBinder;
import com.omnidoc.api.web.ask.AskDtos.AnswerResponse;
import com.omnidoc.api.web.ask.AskDtos.AskRequest;
import com.omnidoc.api.web.ask.AskDtos.CitationResponse;
import com.omnidoc.api.web.ask.AskDtos.ClaimResponse;

/** Precomputes the bounded answer before opening the S-02 SSE response. */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping("/api/v1")
public final class AskController {

	private final AnswerPort answers;
	private final WorkspaceMembershipBinder membershipBinder;
	private final ObjectMapper json;

	public AskController(AnswerPort answers, WorkspaceMembershipBinder membershipBinder, ObjectMapper json) {
		this.answers = Objects.requireNonNull(answers);
		this.membershipBinder = Objects.requireNonNull(membershipBinder);
		this.json = Objects.requireNonNull(json);
	}

	@PostMapping(path = "/ask", consumes = MediaType.APPLICATION_JSON_VALUE,
		produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public ResponseEntity<StreamingResponseBody> ask(
		@RequestHeader(name = "OmniDoc-Workspace-Id", required = false) String workspaceSelector,
		@RequestBody AskRequest body, Authentication authentication) {
		Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
		AskQuestion request = command(body, membership);
		Answer answer = PortResults.orThrow(this.answers.ask(request));
		List<byte[]> frames = frames(answer);
		StreamingResponseBody stream = output -> writeAnswer(output, frames);
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType("text/event-stream;charset=UTF-8"))
			.body(stream);
	}

	private static AskQuestion command(AskRequest body, Membership membership) {
		if (body == null || body.question() == null || body.question().isBlank()) {
			throw validation("Question is required.");
		}
		RuntimeMode mode;
		try {
			mode = body.mode() == null ? RuntimeMode.MOCK : RuntimeMode.fromValue(body.mode());
		}
		catch (IllegalArgumentException ex) {
			throw validation("Requested mode is invalid.");
		}
		Optional<CorpusOwnership> ownership = Optional.empty();
		if (body.corpusOwnership() != null) {
			try {
				ownership = Optional.of(CorpusOwnership.valueOf(
					body.corpusOwnership().toUpperCase(Locale.ROOT)));
			}
			catch (IllegalArgumentException ex) {
				throw validation("corpusOwnership must be sample or mine.");
			}
		}
		String locale = body.locale() == null ? "en" : body.locale();
		if (locale.isBlank()) {
			throw validation("locale must not be blank.");
		}
		return new AskQuestion(
			new TenantActor(membership.tenantId(), membership.actorId()),
			new AclScope(membership.workspaceId(), membership.roles()),
			body.question(), Optional.of(locale), mode, ownership);
	}

	private List<byte[]> frames(Answer answer) {
		List<byte[]> frames = new java.util.ArrayList<>();
		frames.add(frame("generating", java.util.Map.of()));
		if (!answer.citations().isEmpty() && answer.outcome() == com.omnidoc.api.domain.AnswerModels.Outcome.SUPPORTED) {
			List<CitationResponse> citations = answer.citations().stream()
				.map(CitationResponse::of).toList();
			frames.add(frame("claim", new ClaimResponse(answer.text(), citations)));
		}
		frames.add(frame("completed", AnswerResponse.of(answer)));
		return List.copyOf(frames);
	}

	private byte[] frame(String event, Object payload) {
		String data = this.json.writeValueAsString(payload);
		return ("event: " + event + "\ndata: " + data + "\n\n").getBytes(StandardCharsets.UTF_8);
	}

	private static void writeAnswer(OutputStream output, List<byte[]> frames) throws IOException {
		for (byte[] frame : frames) {
			output.write(frame);
			output.flush();
		}
	}

	private static PortFailureException validation(String detail) {
		return new PortFailureException(PortFailure.of(PortFailure.Code.VALIDATION, detail));
	}
}
