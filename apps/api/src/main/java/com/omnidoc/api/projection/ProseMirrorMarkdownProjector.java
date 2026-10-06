package com.omnidoc.api.projection;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import com.omnidoc.api.projection.Projection.BlockSpan;

/**
 * {@code pm-md-v1} — the canonical TipTap (ProseMirror) JSON → markdown projection
 * owned by the JVM (architecture.md §5.2.1 §1). This is the corpus projection source of
 * truth for chunking; {@code packages/ui/src/capture/markdown-bridge.ts} is editor
 * tooling and is never a corpus authority.
 *
 * <p>Deterministic by construction: the same {@code body_json} yields a byte-identical
 * projection string. Every top-level block is projected individually and the blocks are
 * joined by {@code \n\n}, so a block's ordinal is a stable citation anchor (§3).
 *
 * <p>Allowlist (StarterKit + table set). Nodes: {@code doc}, {@code paragraph},
 * {@code heading} 1–6, {@code bulletList}, {@code orderedList}, {@code listItem},
 * {@code blockquote}, {@code codeBlock}, {@code hardBreak}, {@code horizontalRule},
 * {@code table} / {@code tableRow} / {@code tableHeader} / {@code tableCell}. Marks:
 * {@code bold}, {@code italic}, {@code strike}, {@code code}, {@code link}. Anything
 * else degrades to its concatenated text content with a recorded warning — the job does
 * not fail.
 */
public final class ProseMirrorMarkdownProjector {

	public static final String PROJECTOR_ID = "pm-md-v1";

	static final String BLOCK_SEPARATOR = "\n\n";

	private static final Set<String> ALLOWED_NODES = Set.of(
		"doc", "paragraph", "heading", "bulletList", "orderedList", "listItem",
		"blockquote", "codeBlock", "hardBreak", "horizontalRule",
		"table", "tableRow", "tableHeader", "tableCell", "text");

	private static final Set<String> ALLOWED_MARKS = Set.of("bold", "italic", "strike", "code", "link");

	private static final int MIN_HEADING_LEVEL = 1;
	private static final int MAX_HEADING_LEVEL = 6;

	private final ObjectMapper objectMapper;

	public ProseMirrorMarkdownProjector(ObjectMapper objectMapper) {
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
	}

	/**
	 * Project a stored {@code body_json} document.
	 *
	 * @throws IllegalArgumentException when the string is not a ProseMirror object
	 */
	public Projection project(String bodyJson) {
		if (bodyJson == null || bodyJson.isBlank()) {
			throw new IllegalArgumentException("bodyJson must not be blank");
		}
		JsonNode document;
		try {
			document = this.objectMapper.readTree(bodyJson);
		}
		catch (RuntimeException ex) {
			throw new IllegalArgumentException("bodyJson is not valid JSON", ex);
		}
		if (document == null || !document.isObject()) {
			throw new IllegalArgumentException("bodyJson must be a JSON object");
		}
		return project(document);
	}

	public Projection project(JsonNode document) {
		Objects.requireNonNull(document, "document");
		Warnings warnings = new Warnings();
		List<JsonNode> topLevel = children(document);
		List<BlockSpan> spans = new ArrayList<>(topLevel.size());
		StringBuilder text = new StringBuilder();

		for (int ordinal = 0; ordinal < topLevel.size(); ordinal++) {
			if (ordinal > 0) {
				text.append(BLOCK_SEPARATOR);
			}
			JsonNode block = topLevel.get(ordinal);
			int start = text.length();
			text.append(block(block, warnings));
			spans.add(new BlockSpan(ordinal, start, text.length(), isHeading(block)));
		}

		return new Projection(text.toString(), spans, warnings.asList());
	}

	private String block(JsonNode node, Warnings warnings) {
		String type = type(node);
		return switch (type) {
			case "paragraph" -> inline(node, warnings);
			case "heading" -> heading(node, warnings);
			case "bulletList" -> list(node, warnings, false);
			case "orderedList" -> list(node, warnings, true);
			case "listItem" -> blocks(node, warnings);
			case "blockquote" -> blockquote(node, warnings);
			case "codeBlock" -> codeBlock(node);
			case "horizontalRule" -> "---";
			case "table" -> table(node, warnings);
			case "tableRow", "tableHeader", "tableCell" -> blocks(node, warnings);
			case "text", "hardBreak" -> inlineNode(node, warnings);
			default -> degrade(node, type, warnings);
		};
	}

	/** Children blocks of a container, joined exactly like top-level blocks. */
	private String blocks(JsonNode node, Warnings warnings) {
		List<JsonNode> children = children(node);
		StringBuilder out = new StringBuilder();
		for (int index = 0; index < children.size(); index++) {
			if (index > 0) {
				out.append(BLOCK_SEPARATOR);
			}
			out.append(block(children.get(index), warnings));
		}
		return out.toString();
	}

	private String heading(JsonNode node, Warnings warnings) {
		int level = Math.clamp(intAttribute(node, "level", 1), MIN_HEADING_LEVEL, MAX_HEADING_LEVEL);
		String body = inline(node, warnings);
		String hashes = "#".repeat(level);
		return body.isEmpty() ? hashes : hashes + " " + body;
	}

	private String list(JsonNode node, Warnings warnings, boolean ordered) {
		List<JsonNode> items = children(node);
		int start = ordered ? intAttribute(node, "start", 1) : 1;
		StringBuilder out = new StringBuilder();
		for (int index = 0; index < items.size(); index++) {
			if (index > 0) {
				out.append('\n');
			}
			String marker = ordered ? (start + index) + ". " : "- ";
			out.append(indent(block(items.get(index), warnings), marker));
		}
		return out.toString();
	}

	private String blockquote(JsonNode node, Warnings warnings) {
		String body = blocks(node, warnings);
		StringBuilder out = new StringBuilder();
		String[] lines = body.split("\n", -1);
		for (int index = 0; index < lines.length; index++) {
			if (index > 0) {
				out.append('\n');
			}
			out.append(lines[index].isEmpty() ? ">" : "> " + lines[index]);
		}
		return out.toString();
	}

	private String codeBlock(JsonNode node) {
		String code = rawText(node);
		String language = stringAttribute(node, "language");
		String fence = "`".repeat(Math.max(3, longestBacktickRun(code) + 1));
		return fence + (language == null ? "" : language) + "\n" + code + "\n" + fence;
	}

	private String table(JsonNode node, Warnings warnings) {
		List<JsonNode> rows = children(node).stream().filter(row -> "tableRow".equals(type(row))).toList();
		if (rows.isEmpty()) {
			return "";
		}
		List<List<String>> cells = new ArrayList<>(rows.size());
		int columns = 0;
		for (JsonNode row : rows) {
			List<String> rowCells = new ArrayList<>();
			for (JsonNode cell : children(row)) {
				rowCells.add(tableCell(cell, warnings));
			}
			columns = Math.max(columns, rowCells.size());
			cells.add(rowCells);
		}

		StringBuilder out = new StringBuilder();
		// GFM requires a header row; the first row is it, padded to the widest row.
		out.append(tableRow(cells.getFirst(), columns));
		out.append('\n').append(tableRow(java.util.Collections.nCopies(columns, "---"), columns));
		for (int index = 1; index < cells.size(); index++) {
			out.append('\n').append(tableRow(cells.get(index), columns));
		}
		return out.toString();
	}

	private String tableCell(JsonNode cell, Warnings warnings) {
		String body = blocks(cell, warnings);
		// A pipe table cell is single-line; literal pipes are escaped per §1.
		return body.replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ").strip();
	}

	private static String tableRow(List<String> cells, int columns) {
		StringBuilder out = new StringBuilder("|");
		for (int index = 0; index < columns; index++) {
			out.append(' ').append(index < cells.size() ? cells.get(index) : "").append(" |");
		}
		return out.toString();
	}

	private String inline(JsonNode node, Warnings warnings) {
		StringBuilder out = new StringBuilder();
		for (JsonNode child : children(node)) {
			out.append(inlineNode(child, warnings));
		}
		return out.toString();
	}

	private String inlineNode(JsonNode node, Warnings warnings) {
		String type = type(node);
		if ("hardBreak".equals(type)) {
			return "\\\n";
		}
		if (!"text".equals(type)) {
			return degrade(node, type, warnings);
		}
		return marks(node, node.path("text").asString(""), warnings);
	}

	private String marks(JsonNode node, String text, Warnings warnings) {
		JsonNode marks = node.path("marks");
		if (!marks.isArray() || marks.isEmpty()) {
			return text;
		}
		Set<String> present = new LinkedHashSet<>();
		String href = null;
		for (int index = 0; index < marks.size(); index++) {
			JsonNode mark = marks.get(index);
			String type = type(mark);
			if (!ALLOWED_MARKS.contains(type)) {
				warnings.unknownMark(type);
				continue;
			}
			present.add(type);
			if ("link".equals(type)) {
				href = stringAttribute(mark, "href");
			}
		}

		// Fixed precedence (innermost → outermost) keeps the projection deterministic
		// regardless of the order TipTap happened to serialise the marks in.
		String out = text;
		if (present.contains("code")) {
			out = "`" + out + "`";
		}
		if (present.contains("bold")) {
			out = "**" + out + "**";
		}
		if (present.contains("italic")) {
			out = "*" + out + "*";
		}
		if (present.contains("strike")) {
			out = "~~" + out + "~~";
		}
		if (present.contains("link")) {
			out = "[" + out + "](" + (href == null ? "" : href) + ")";
		}
		return out;
	}

	/** Unknown node types degrade to their concatenated text content, never to a failure. */
	private String degrade(JsonNode node, String type, Warnings warnings) {
		warnings.unknownNode(type);
		return rawText(node);
	}

	private static String indent(String body, String marker) {
		String continuation = " ".repeat(marker.length());
		String[] lines = body.split("\n", -1);
		StringBuilder out = new StringBuilder();
		for (int index = 0; index < lines.length; index++) {
			if (index > 0) {
				out.append('\n');
			}
			out.append(index == 0 ? marker : continuation).append(lines[index]);
		}
		return out.toString();
	}

	private static boolean isHeading(JsonNode node) {
		return "heading".equals(type(node));
	}

	private static List<JsonNode> children(JsonNode node) {
		JsonNode content = node.path("content");
		if (!content.isArray()) {
			return List.of();
		}
		List<JsonNode> children = new ArrayList<>(content.size());
		for (int index = 0; index < content.size(); index++) {
			children.add(content.get(index));
		}
		return children;
	}

	/** Concatenated {@code text} leaves in document order — the degrade path and code bodies. */
	private static String rawText(JsonNode node) {
		StringBuilder out = new StringBuilder();
		appendRawText(node, out);
		return out.toString();
	}

	private static void appendRawText(JsonNode node, StringBuilder out) {
		JsonNode text = node.path("text");
		if (text.isString()) {
			out.append(text.asString());
		}
		for (JsonNode child : children(node)) {
			appendRawText(child, out);
		}
	}

	private static String type(JsonNode node) {
		String type = node.path("type").asString("");
		return type.isEmpty() ? "unknown" : type;
	}

	private static int intAttribute(JsonNode node, String name, int fallback) {
		JsonNode value = node.path("attrs").path(name);
		return value.isNumber() ? value.asInt() : fallback;
	}

	private static String stringAttribute(JsonNode node, String name) {
		JsonNode value = node.path("attrs").path(name);
		return value.isString() && !value.asString().isBlank() ? value.asString() : null;
	}

	private static int longestBacktickRun(String code) {
		int longest = 0;
		int run = 0;
		for (int index = 0; index < code.length(); index++) {
			run = code.charAt(index) == '`' ? run + 1 : 0;
			longest = Math.max(longest, run);
		}
		return longest;
	}

	/** Deduplicated, order-stable warning codes. Never carries note text. */
	private static final class Warnings {

		private final Set<String> codes = new LinkedHashSet<>();

		void unknownNode(String type) {
			if (!ALLOWED_NODES.contains(type)) {
				this.codes.add("unknown_node:" + sanitize(type));
			}
		}

		void unknownMark(String type) {
			this.codes.add("unknown_mark:" + sanitize(type));
		}

		List<String> asList() {
			return List.copyOf(this.codes);
		}

		private static String sanitize(String type) {
			String lower = type.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "");
			return lower.isEmpty() ? "unknown" : lower;
		}
	}
}
