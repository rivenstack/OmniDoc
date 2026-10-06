package com.omnidoc.api.chunking;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.omnidoc.api.projection.Projection;
import com.omnidoc.api.projection.Projection.BlockSpan;

/**
 * {@code omni-blockpack-v1} — the deterministic block-pack splitter over a
 * {@code pm-md-v1} projection (architecture.md §5.2.1 §2). No tokenizer, no overlap, no
 * external splitter library.
 *
 * <p>Rules, in order:
 * <ol>
 *   <li>A chunk is a run of consecutive <em>whole</em> top-level blocks.</li>
 *   <li>A heading always starts a new chunk ({@code headingBreak}).</li>
 *   <li>A run never exceeds {@code maxChars}; the next block starts a new chunk
 *       instead.</li>
 *   <li>A single block longer than {@code maxChars} is hard-split on its own, at
 *       paragraph → sentence → whitespace → character boundaries.</li>
 *   <li>{@code softMinChars} is the preferred minimum. Greedy packing already keeps
 *       runs above it whenever the content allows, so the one place it can still be
 *       violated avoidably is the tail of a hard-split block — that tail is merged back
 *       into the piece before it when the merge stays within {@code maxChars}.</li>
 * </ol>
 *
 * <p>Lengths and offsets are UTF-16 code units, so a Java and a JS implementation agree
 * without a shared tokenizer. Chunks whose projected text is entirely blank are not
 * emitted: they would carry no retrievable content.
 */
public final class BlockPackChunker {

	public BlockPackChunker() {
	}

	public List<ChunkDraft> chunk(Projection projection, String versionId, ChunkPolicy policy) {
		Objects.requireNonNull(projection, "projection");
		Objects.requireNonNull(versionId, "versionId");
		Objects.requireNonNull(policy, "policy");

		List<Span> spans = new ArrayList<>();
		Span run = null;
		for (BlockSpan block : projection.blocks()) {
			if (block.length() > policy.maxChars()) {
				if (run != null) {
					spans.add(run);
					run = null;
				}
				spans.addAll(hardSplit(projection.text(), block, policy));
				continue;
			}
			if (run != null && policy.headingBreak() && block.heading()) {
				spans.add(run);
				run = null;
			}
			if (run != null && block.endOffset() - run.startOffset() > policy.maxChars()) {
				spans.add(run);
				run = null;
			}
			run = (run == null)
				? new Span(block.ordinal(), block.ordinal(), block.startOffset(), block.endOffset())
				: new Span(run.startBlock(), block.ordinal(), run.startOffset(), block.endOffset());
		}
		if (run != null) {
			spans.add(run);
		}

		List<ChunkDraft> drafts = new ArrayList<>(spans.size());
		int ordinal = 0;
		for (Span span : spans) {
			String text = projection.text().substring(span.startOffset(), span.endOffset());
			if (text.isBlank()) {
				continue;
			}
			drafts.add(new ChunkDraft(
				ChunkDraft.chunkId(versionId, ordinal),
				ordinal,
				span.startBlock(),
				span.endBlock(),
				span.startOffset(),
				span.endOffset(),
				text));
			ordinal++;
		}
		assertSubstringInvariant(projection.text(), drafts);
		return List.copyOf(drafts);
	}

	/**
	 * Split one oversized block. Every piece stays inside the block, so the block
	 * anchors of all pieces are that single block's ordinal.
	 */
	private static List<Span> hardSplit(String text, BlockSpan block, ChunkPolicy policy) {
		List<Span> pieces = new ArrayList<>();
		int cursor = block.startOffset();
		while (cursor < block.endOffset()) {
			int remaining = block.endOffset() - cursor;
			if (remaining <= policy.maxChars()) {
				pieces.add(new Span(block.ordinal(), block.ordinal(), cursor, block.endOffset()));
				break;
			}
			int limit = cursor + policy.maxChars();
			int cut = boundaryBefore(text, cursor, limit);
			pieces.add(new Span(block.ordinal(), block.ordinal(), cursor, cut));
			cursor = cut;
		}

		// softMinChars: avoid an avoidably tiny tail.
		if (pieces.size() > 1) {
			Span tail = pieces.getLast();
			Span previous = pieces.get(pieces.size() - 2);
			int merged = tail.endOffset() - previous.startOffset();
			if (tail.endOffset() - tail.startOffset() < policy.softMinChars() && merged <= policy.maxChars()) {
				pieces.removeLast();
				pieces.set(pieces.size() - 1, new Span(
					previous.startBlock(), tail.endBlock(), previous.startOffset(), tail.endOffset()));
			}
		}
		return pieces;
	}

	/**
	 * Highest cut index in {@code (from, limit]} preferring, in order: a paragraph
	 * break, a sentence end, any whitespace, then {@code limit} itself.
	 */
	private static int boundaryBefore(String text, int from, int limit) {
		// Searching from limit - 2 keeps the two-character boundary itself inside the cut.
		int paragraph = text.lastIndexOf("\n\n", limit - 2);
		if (paragraph > from) {
			return paragraph + 2;
		}
		int sentence = -1;
		for (String terminator : List.of(". ", "! ", "? ", ".\n", "!\n", "?\n")) {
			sentence = Math.max(sentence, text.lastIndexOf(terminator, limit - 2));
		}
		if (sentence > from) {
			return sentence + 2;
		}
		for (int index = limit - 1; index > from; index--) {
			if (Character.isWhitespace(text.charAt(index))) {
				return index + 1;
			}
		}
		return limit;
	}

	private static void assertSubstringInvariant(String projection, List<ChunkDraft> drafts) {
		for (ChunkDraft draft : drafts) {
			if (!projection.substring(draft.startOffset(), draft.endOffset()).equals(draft.text())) {
				throw new IllegalStateException(
					"chunk " + draft.chunkId() + " violates the projection substring invariant");
			}
		}
	}

	private record Span(int startBlock, int endBlock, int startOffset, int endOffset) {
	}
}
