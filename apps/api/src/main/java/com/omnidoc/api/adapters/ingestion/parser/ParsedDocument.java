package com.omnidoc.api.adapters.ingestion.parser;

import java.util.List;
import java.util.Objects;

/**
 * Result of parsing imported bytes: a title and a TipTap (ProseMirror) document, which
 * is the note body source of truth (ADR-0001 §2).
 *
 * <p>{@code warnings} are extraction warnings — content that was dropped or degraded
 * while a document was still produced. A non-empty list makes the job {@code partial}
 * rather than {@code ready} (architecture.md §5.2.1 §6). Warning codes never carry
 * document text.
 */
public record ParsedDocument(String title, String bodyJson, List<String> warnings) {

	public ParsedDocument {
		Objects.requireNonNull(title, "title");
		Objects.requireNonNull(bodyJson, "bodyJson");
		warnings = List.copyOf(warnings);
	}
}
