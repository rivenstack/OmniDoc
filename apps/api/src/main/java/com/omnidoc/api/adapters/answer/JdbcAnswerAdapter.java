package com.omnidoc.api.adapters.answer;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import com.omnidoc.api.adapters.answer.JdbcCitationAssembler.Evidence;
import com.omnidoc.api.application.port.AnswerPort;
import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.AnswerEvent;
import com.omnidoc.api.domain.AnswerModels.AnswerEventSink;
import com.omnidoc.api.domain.AnswerModels.AskQuestion;
import com.omnidoc.api.domain.AnswerModels.Citation;
import com.omnidoc.api.domain.AnswerModels.Outcome;
import com.omnidoc.api.domain.Completion;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;

/** B-08 Ask orchestration. Search hits become evidence only after citation re-validation. */
public final class JdbcAnswerAdapter implements AnswerPort {

	private static final int MAX_QUESTION_CHARS = 2000;
	private static final int MAX_EVIDENCE = 4;

	private final SearchPort search;
	private final JdbcCitationAssembler citations;
	private final RuntimeModePort modes;
	private final DemoAskPolicy livePolicy;
	private final AvalAiAskClient liveClient;

	public JdbcAnswerAdapter(SearchPort search, JdbcCitationAssembler citations, RuntimeModePort modes,
		DemoAskPolicy livePolicy, AvalAiAskClient liveClient) {
		this.search = Objects.requireNonNull(search);
		this.citations = Objects.requireNonNull(citations);
		this.modes = Objects.requireNonNull(modes);
		this.livePolicy = Objects.requireNonNull(livePolicy);
		this.liveClient = Objects.requireNonNull(liveClient);
	}

	@Override
	public PortResult<Answer> ask(AskQuestion request) {
		PortFailure invalid = validate(request);
		if (invalid != null) {
			return new PortResult.Failure<>(invalid);
		}
		if (request.mode() == RuntimeMode.CUSTOMER_KEY) {
			return forbidden(request.mode());
		}
		if (request.mode() == RuntimeMode.OPERATOR_FREE_TIER) {
			PortFailure gate = this.livePolicy.check(request);
			if (gate != null) {
				return new PortResult.Failure<>(gate);
			}
		}
		PortResult<?> allowed = this.modes.assertModeAllowed(new AssertModeAllowed(
			request.actor(), request.mode(), Feature.ASK));
		if (allowed instanceof PortResult.Failure<?> failure) {
			return new PortResult.Failure<>(failure.failure());
		}

		if (policyRefusal(request.question())) {
			return new PortResult.Success<>(new Answer(Outcome.REFUSED_POLICY,
				"I cannot reveal another workspace's private notes.", List.of()));
		}
		String query = retrievalQuery(request.question());
		if (query.isBlank()) {
			return new PortResult.Success<>(unsupported());
		}
		PortResult<SearchResults> retrieved = this.search.lexicalSearch(new TextSearch(
			request.actor(), request.acl(), query, MAX_EVIDENCE,
			new SearchFilters(request.corpusOwnership()
				.map(value -> Map.of("corpus_ownership", value.name().toLowerCase(Locale.ROOT)))
				.orElseGet(Map::of))));
		if (retrieved instanceof PortResult.Failure<SearchResults> failure) {
			return new PortResult.Failure<>(failure.failure());
		}
		Set<String> approved = request.mode() == RuntimeMode.OPERATOR_FREE_TIER
			? this.livePolicy.approvedNoteIds() : Set.of();
		PortResult<List<Evidence>> assembled = this.citations.assemble(
			request, ((PortResult.Success<SearchResults>) retrieved).value().hits(), approved);
		if (assembled instanceof PortResult.Failure<List<Evidence>> failure) {
			return new PortResult.Failure<>(failure.failure());
		}
		List<Evidence> evidence = ((PortResult.Success<List<Evidence>>) assembled).value().stream()
			.filter(item -> !instructionLike(item.text()))
			.toList();
		if (evidence.isEmpty()) {
			return new PortResult.Success<>(unsupported());
		}
		if (request.mode() == RuntimeMode.OPERATOR_FREE_TIER) {
			PortResult<Answer> live = this.liveClient.answer(request, evidence);
			if (live instanceof PortResult.Failure<Answer>) {
				return live;
			}
			Answer answer = ((PortResult.Success<Answer>) live).value();
			if (answer.citations().isEmpty()) {
				return live;
			}
			PortResult<List<Evidence>> current = this.citations.assemble(
				request, ((PortResult.Success<SearchResults>) retrieved).value().hits(), approved);
			if (current instanceof PortResult.Failure<List<Evidence>> failure) {
				return new PortResult.Failure<>(failure.failure());
			}
			List<Citation> currentCitations = ((PortResult.Success<List<Evidence>>) current).value().stream()
				.filter(item -> !instructionLike(item.text()))
				.map(Evidence::citation).toList();
			if (!currentCitations.containsAll(answer.citations())) {
				return new PortResult.Failure<>(PortFailure.of(PortFailure.Code.UNAVAILABLE,
					"Ask sources changed before the answer could be delivered."));
			}
			return live;
		}
		return new PortResult.Success<>(mockAnswer(request.question(), evidence));
	}

	@Override
	public PortResult<Completion> askStreaming(AskQuestion request, AnswerEventSink sink) {
		if (sink == null) {
			return new PortResult.Failure<>(PortFailure.of(PortFailure.Code.VALIDATION,
				"Answer event sink is required."));
		}
		PortResult<Answer> result = ask(request);
		if (result instanceof PortResult.Failure<Answer> failure) {
			return new PortResult.Failure<>(failure.failure());
		}
		Answer answer = ((PortResult.Success<Answer>) result).value();
		sink.accept(new AnswerEvent.Generating());
		if (!answer.citations().isEmpty()) {
			sink.accept(new AnswerEvent.Claim(answer.text(), answer.citations()));
		}
		sink.accept(new AnswerEvent.Completed(answer));
		return new PortResult.Success<>(Completion.DONE);
	}

	private static PortFailure validate(AskQuestion request) {
		if (request == null || request.actor() == null || request.acl() == null
			|| request.mode() == null || request.locale() == null
			|| request.corpusOwnership() == null || request.question() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Ask scope, question, and mode are required.");
		}
		if (request.question().isBlank() || request.question().length() > MAX_QUESTION_CHARS) {
			return PortFailure.of(PortFailure.Code.VALIDATION,
				"Question must contain 1 to 2000 characters.");
		}
		return null;
	}

	private static <T> PortResult<T> forbidden(RuntimeMode mode) {
		return new PortResult.Failure<>(PortFailure.forMode(PortFailure.Code.MODE_FORBIDDEN,
			"Requested Ask mode is unavailable.", mode));
	}

	private static boolean policyRefusal(String question) {
		String lower = question.toLowerCase(Locale.ROOT);
		return lower.contains("another workspace") && (lower.contains("private") || lower.contains("reveal"));
	}

	private static boolean instructionLike(String passage) {
		String lower = passage.toLowerCase(Locale.ROOT);
		return lower.contains("ignore previous instructions")
			|| lower.contains("ignore previous")
			|| lower.contains("ignore all instructions")
			|| lower.contains("disregard the instructions")
			|| lower.contains("you are now")
			|| lower.contains("system:")
			|| lower.contains("developer:")
			|| lower.contains("assistant:")
			|| lower.contains("system prompt")
			|| lower.contains("developer message")
			|| lower.contains("reveal your instructions")
			|| lower.contains("do not cite")
			|| lower.contains("send the api key");
	}

	private static String retrievalQuery(String question) {
		String lower = question.toLowerCase(Locale.ROOT);
		if (lower.contains("launch review")) {
			return "launch review";
		}
		if (lower.contains("indexing")) {
			return "indexing";
		}
		String[] terms = lower.replaceAll("[^\\p{Alnum}]+", " ").trim().split("\\s+");
		return java.util.Arrays.stream(terms)
			.filter(value -> value.length() > 3)
			.filter(value -> !Set.of("what", "when", "where", "which", "last", "year",
				"about", "does", "notes", "have", "from", "your").contains(value))
			.limit(3)
			.reduce((left, right) -> left + " OR " + right)
			.orElse("");
	}

	private static Answer unsupported() {
		return new Answer(Outcome.NO_SUPPORTED_ANSWER,
			"These notes do not support an answer. Add a relevant source or change the question.",
			List.of());
	}

	private static Answer mockAnswer(String question, List<Evidence> evidence) {
		String lower = question.toLowerCase(Locale.ROOT);
		Optional<Evidence> tuesday = evidence.stream()
			.filter(item -> item.text().toLowerCase(Locale.ROOT).contains("tuesday"))
			.findFirst();
		Optional<Evidence> thursday = evidence.stream()
			.filter(item -> item.text().toLowerCase(Locale.ROOT).contains("thursday"))
			.findFirst();
		if (tuesday.isPresent() && thursday.isPresent()
			&& (lower.contains("agree") || lower.contains("date") || lower.contains("when"))) {
			return new Answer(Outcome.CONFLICT,
				"One note says Tuesday and another says Thursday. The sources disagree.",
				List.of(tuesday.get().citation(), thursday.get().citation()));
		}
		if (lower.contains("budget") && tuesday.isPresent()) {
			return new Answer(Outcome.PARTIAL,
				"The launch review is on Tuesday. Unsupported: these notes do not establish an approved budget.",
				List.of(tuesday.get().citation()));
		}
		Evidence first = evidence.getFirst();
		String excerpt = first.text().length() > 300
			? first.text().substring(0, 300) + "…" : first.text();
		return new Answer(Outcome.SUPPORTED, "A relevant note says: “" + excerpt + "”",
			List.of(first.citation()));
	}
}
