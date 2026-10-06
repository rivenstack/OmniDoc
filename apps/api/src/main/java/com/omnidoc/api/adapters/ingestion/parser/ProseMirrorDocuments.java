package com.omnidoc.api.adapters.ingestion.parser;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builders for the TipTap (ProseMirror) JSON shape, on the same node allowlist as the
 * {@code pm-md-v1} projector (architecture.md §5.2.1 §1). Maps are serialised by the
 * caller's {@code ObjectMapper}; {@link LinkedHashMap} keeps key order — and therefore
 * the stored bytes — stable.
 */
public final class ProseMirrorDocuments {

	private ProseMirrorDocuments() {
	}

	public static Map<String, Object> doc(List<Map<String, Object>> content) {
		Map<String, Object> document = new LinkedHashMap<>();
		document.put("type", "doc");
		document.put("content", List.copyOf(content));
		return document;
	}

	public static Map<String, Object> node(String type, List<Map<String, Object>> content) {
		Map<String, Object> node = new LinkedHashMap<>();
		node.put("type", type);
		if (!content.isEmpty()) {
			node.put("content", List.copyOf(content));
		}
		return node;
	}

	public static Map<String, Object> node(
		String type, Map<String, Object> attrs, List<Map<String, Object>> content) {
		Map<String, Object> node = new LinkedHashMap<>();
		node.put("type", type);
		if (attrs != null && !attrs.isEmpty()) {
			node.put("attrs", new LinkedHashMap<>(attrs));
		}
		if (!content.isEmpty()) {
			node.put("content", List.copyOf(content));
		}
		return node;
	}

	public static Map<String, Object> text(String text, List<Map<String, Object>> marks) {
		Map<String, Object> node = new LinkedHashMap<>();
		node.put("type", "text");
		node.put("text", text);
		if (marks != null && !marks.isEmpty()) {
			node.put("marks", List.copyOf(marks));
		}
		return node;
	}

	public static Map<String, Object> codeBlock(String code, String language) {
		Map<String, Object> attrs = new LinkedHashMap<>();
		attrs.put("language", (language == null || language.isBlank()) ? null : language);
		return node("codeBlock", attrs, List.of(text(code, List.of())));
	}

	public static Map<String, Object> mark(String type) {
		Map<String, Object> mark = new LinkedHashMap<>();
		mark.put("type", type);
		return mark;
	}

	public static Map<String, Object> linkMark(String href) {
		Map<String, Object> attrs = new LinkedHashMap<>();
		attrs.put("href", href == null ? "" : href);
		Map<String, Object> mark = new LinkedHashMap<>();
		mark.put("type", "link");
		mark.put("attrs", attrs);
		return mark;
	}

	/**
	 * Plain / extracted text → paragraphs split on blank lines (§6). Lines inside a
	 * paragraph are joined with a single space: extraction is text-only fidelity, so a
	 * soft wrap in a PDF must not become a structural break in the corpus.
	 */
	public static List<Map<String, Object>> paragraphsFromText(String text) {
		if (text == null || text.isBlank()) {
			return List.of();
		}
		String normalised = text.replace("\r\n", "\n").replace('\r', '\n');
		List<Map<String, Object>> blocks = new ArrayList<>();
		for (String block : normalised.split("\n[ \t]*\n")) {
			String paragraph = String.join(" ", block.lines().map(String::strip).filter(line -> !line.isEmpty())
				.toList());
			if (!paragraph.isEmpty()) {
				blocks.add(node("paragraph", List.of(text(paragraph, List.of()))));
			}
		}
		return List.copyOf(blocks);
	}
}
