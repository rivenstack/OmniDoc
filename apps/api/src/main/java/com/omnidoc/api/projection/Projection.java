package com.omnidoc.api.projection;

import java.util.List;
import java.util.Objects;

/**
 * Output of a canonical projection: the projection string plus the span each top-level
 * ProseMirror block occupies in it.
 *
 * <p>{@code text.substring(block.startOffset(), block.endOffset())} is exactly that
 * block's projected markdown, and the blocks are in document order. Offsets are UTF-16
 * code-unit indexes (architecture.md §5.2.1 §2).
 */
public record Projection(String text, List<BlockSpan> blocks, List<String> warnings) {

	public Projection {
		Objects.requireNonNull(text, "text");
		blocks = List.copyOf(blocks);
		warnings = List.copyOf(warnings);
	}

	/** Span of one top-level block. {@code ordinal} is the 0-based block anchor (§3). */
	public record BlockSpan(int ordinal, int startOffset, int endOffset, boolean heading) {

		public BlockSpan {
			if (ordinal < 0 || startOffset < 0 || endOffset < startOffset) {
				throw new IllegalArgumentException("block span must be ordered and non-negative");
			}
		}

		public int length() {
			return this.endOffset - this.startOffset;
		}
	}
}
