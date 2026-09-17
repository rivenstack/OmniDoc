package com.omnidoc.api.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;

public final class AnswerModels {
	private AnswerModels() { }

	public record AskQuestion(TenantActor actor, AclScope acl, String question, Optional<String> locale,
		RuntimeMode mode, Optional<CorpusOwnership> corpusOwnership) { }
	public record PassageAnchor(int startOffset, int endOffset, Optional<String> blockId) { }
	public record Citation(NoteId noteId, VersionId versionId, ChunkId chunkId, PassageAnchor anchor,
		String preview, Optional<Instant> updatedAt, Optional<CorpusOwnership> corpusOwnership) { }
	public enum Outcome { SUPPORTED, PARTIAL, NO_SUPPORTED_ANSWER, CONFLICT, REFUSED_POLICY }
	public record Answer(Outcome outcome, String text, List<Citation> citations) {
		public Answer { citations = List.copyOf(citations); }
	}
	public sealed interface AnswerEvent permits AnswerEvent.Generating, AnswerEvent.Claim, AnswerEvent.Completed,
		AnswerEvent.Truncated {
		record Generating() implements AnswerEvent { }
		record Claim(String text, List<Citation> citations) implements AnswerEvent {
			public Claim { citations = List.copyOf(citations); }
		}
		record Completed(Answer answer) implements AnswerEvent { }
		record Truncated(PortFailure failure) implements AnswerEvent { }
	}
	@FunctionalInterface
	public interface AnswerEventSink extends Consumer<AnswerEvent> { }
}
