package com.omnidoc.api.web.ask;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonInclude;

import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.Citation;

/** Frozen S-02 Ask wire shapes. */
public final class AskDtos {
	private AskDtos() { }

	public record AskRequest(String question, String locale, String mode, String corpusOwnership) { }

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record AnchorResponse(int startOffset, int endOffset, String blockId) { }

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record CitationResponse(
		String noteId, String versionId, String chunkId, AnchorResponse anchor,
		String preview, Instant updatedAt, String corpusOwnership) {
		static CitationResponse of(Citation citation) {
			return new CitationResponse(
				citation.noteId().value(), citation.versionId().value(), citation.chunkId().value(),
				new AnchorResponse(citation.anchor().startOffset(), citation.anchor().endOffset(),
					citation.anchor().blockId().orElse(null)),
				citation.preview(), citation.updatedAt().orElse(null),
				citation.corpusOwnership().map(value -> value.name().toLowerCase(Locale.ROOT)).orElse(null));
		}
	}

	public record AnswerResponse(String outcome, String text, List<CitationResponse> citations) {
		static AnswerResponse of(Answer answer) {
			return new AnswerResponse(answer.outcome().name().toLowerCase(Locale.ROOT),
				answer.text(), answer.citations().stream().map(CitationResponse::of).toList());
		}
	}

	public record ClaimResponse(String text, List<CitationResponse> citations) { }
}
