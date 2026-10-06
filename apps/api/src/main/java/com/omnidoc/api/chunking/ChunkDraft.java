package com.omnidoc.api.chunking;

import java.util.Objects;

/**
 * One chunk before it is persisted. {@code chunkId} is already final:
 * {@code {versionId}_c{ordinal}} with a 4-digit zero-padded ordinal
 * (architecture.md §5.2.1 §2).
 *
 * <p>Invariant, asserted by the chunker and re-asserted in tests:
 * {@code projection.substring(startOffset, endOffset).equals(text)}.
 */
public record ChunkDraft(
	String chunkId,
	int ordinal,
	int startBlock,
	int endBlock,
	int startOffset,
	int endOffset,
	String text) {

	public ChunkDraft {
		Objects.requireNonNull(chunkId, "chunkId");
		Objects.requireNonNull(text, "text");
		if (ordinal < 0 || startBlock < 0 || endBlock < startBlock
			|| startOffset < 0 || endOffset < startOffset) {
			throw new IllegalArgumentException("chunk draft bounds must be ordered and non-negative");
		}
	}

	public static String chunkId(String versionId, int ordinal) {
		return versionId + "_c" + "%04d".formatted(ordinal);
	}

	public String textSha256() {
		return ChunkPolicy.sha256Hex(this.text);
	}
}
