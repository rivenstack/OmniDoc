package com.omnidoc.api.adapters.ingestion.parser;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.commonmark.ext.gfm.tables.TableBlock;
import org.commonmark.ext.gfm.tables.TableCell;
import org.commonmark.ext.gfm.tables.TableRow;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.node.BlockQuote;
import org.commonmark.node.BulletList;
import org.commonmark.node.Code;
import org.commonmark.node.Emphasis;
import org.commonmark.node.FencedCodeBlock;
import org.commonmark.node.HardLineBreak;
import org.commonmark.node.Heading;
import org.commonmark.node.HtmlBlock;
import org.commonmark.node.HtmlInline;
import org.commonmark.node.Image;
import org.commonmark.node.IndentedCodeBlock;
import org.commonmark.node.Link;
import org.commonmark.node.LinkReferenceDefinition;
import org.commonmark.node.ListItem;
import org.commonmark.node.Node;
import org.commonmark.node.OrderedList;
import org.commonmark.node.Paragraph;
import org.commonmark.node.SoftLineBreak;
import org.commonmark.node.StrongEmphasis;
import org.commonmark.node.Text;
import org.commonmark.node.ThematicBreak;
import org.commonmark.parser.Parser;

/**
 * commonmark-java 0.30.0 AST → TipTap (ProseMirror) JSON, on the inverse of the
 * {@code pm-md-v1} node allowlist (architecture.md §5.2.1 §6). GFM pipe tables are the
 * only extension enabled, matching the projector's table set.
 *
 * <p>Nodes outside the allowlist (raw HTML, images) degrade to their text content with a
 * recorded warning, so an import completes as {@code partial} instead of failing.
 */
final class MarkdownToProseMirror {

	private final Parser parser = Parser.builder()
		.extensions(List.of(TablesExtension.create()))
		.build();

	/** Converted blocks plus the warning codes raised while converting. */
	record Converted(List<Map<String, Object>> blocks, List<String> warnings) {
	}

	Converted convert(String markdown) {
		Set<String> warnings = new LinkedHashSet<>();
		Node document = this.parser.parse(markdown == null ? "" : markdown);
		List<Map<String, Object>> blocks = blocks(document, warnings);
		return new Converted(List.copyOf(blocks), List.copyOf(warnings));
	}

	private List<Map<String, Object>> blocks(Node parent, Set<String> warnings) {
		List<Map<String, Object>> blocks = new ArrayList<>();
		for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
			Map<String, Object> block = block(child, warnings);
			if (block != null) {
				blocks.add(block);
			}
		}
		return blocks;
	}

	private Map<String, Object> block(Node node, Set<String> warnings) {
		if (node instanceof Heading heading) {
			Map<String, Object> attrs = new LinkedHashMap<>();
			attrs.put("level", Math.clamp(heading.getLevel(), 1, 6));
			return ProseMirrorDocuments.node("heading", attrs, inline(heading, List.of(), warnings));
		}
		if (node instanceof Paragraph paragraph) {
			List<Map<String, Object>> content = inline(paragraph, List.of(), warnings);
			return content.isEmpty() ? null : ProseMirrorDocuments.node("paragraph", content);
		}
		if (node instanceof BulletList list) {
			return ProseMirrorDocuments.node("bulletList", blocks(list, warnings));
		}
		if (node instanceof OrderedList list) {
			Map<String, Object> attrs = new LinkedHashMap<>();
			Integer start = list.getMarkerStartNumber();
			attrs.put("start", start == null ? 1 : start);
			return ProseMirrorDocuments.node("orderedList", attrs, blocks(list, warnings));
		}
		if (node instanceof ListItem item) {
			List<Map<String, Object>> content = blocks(item, warnings);
			return ProseMirrorDocuments.node(
				"listItem",
				content.isEmpty() ? List.of(ProseMirrorDocuments.node("paragraph", List.of())) : content);
		}
		if (node instanceof BlockQuote quote) {
			return ProseMirrorDocuments.node("blockquote", blocks(quote, warnings));
		}
		if (node instanceof FencedCodeBlock code) {
			return ProseMirrorDocuments.codeBlock(stripTrailingNewline(code.getLiteral()), code.getInfo());
		}
		if (node instanceof IndentedCodeBlock code) {
			return ProseMirrorDocuments.codeBlock(stripTrailingNewline(code.getLiteral()), null);
		}
		if (node instanceof ThematicBreak) {
			return ProseMirrorDocuments.node("horizontalRule", List.of());
		}
		if (node instanceof TableBlock table) {
			return table(table, warnings);
		}
		if (node instanceof HtmlBlock html) {
			warnings.add("markdown_html_dropped");
			String literal = html.getLiteral() == null ? "" : html.getLiteral().strip();
			return literal.isEmpty()
				? null
				: ProseMirrorDocuments.node("paragraph", List.of(ProseMirrorDocuments.text(literal, List.of())));
		}
		if (node instanceof LinkReferenceDefinition) {
			return null;
		}
		warnings.add("markdown_unsupported_block:" + warningTag(node));
		String degraded = textContent(node);
		return degraded.isEmpty()
			? null
			: ProseMirrorDocuments.node("paragraph", List.of(ProseMirrorDocuments.text(degraded, List.of())));
	}

	private Map<String, Object> table(TableBlock table, Set<String> warnings) {
		List<Map<String, Object>> rows = new ArrayList<>();
		collectRows(table, rows, warnings);
		return rows.isEmpty() ? null : ProseMirrorDocuments.node("table", rows);
	}

	/** Table sections (head / body) are containers; only the rows map to the editor shape. */
	private void collectRows(Node parent, List<Map<String, Object>> rows, Set<String> warnings) {
		for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
			if (child instanceof TableRow row) {
				List<Map<String, Object>> cells = new ArrayList<>();
				for (Node cell = row.getFirstChild(); cell != null; cell = cell.getNext()) {
					boolean header = cell instanceof TableCell tableCell && tableCell.isHeader();
					cells.add(ProseMirrorDocuments.node(
						header ? "tableHeader" : "tableCell",
						List.of(ProseMirrorDocuments.node("paragraph", inline(cell, List.of(), warnings)))));
				}
				rows.add(ProseMirrorDocuments.node("tableRow", cells));
			}
			else {
				collectRows(child, rows, warnings);
			}
		}
	}

	private List<Map<String, Object>> inline(
		Node parent, List<Map<String, Object>> marks, Set<String> warnings) {
		List<Map<String, Object>> content = new ArrayList<>();
		for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
			if (child instanceof Text text) {
				content.add(ProseMirrorDocuments.text(text.getLiteral(), marks));
			}
			else if (child instanceof Code code) {
				content.add(ProseMirrorDocuments.text(code.getLiteral(), with(marks, ProseMirrorDocuments.mark("code"))));
			}
			else if (child instanceof StrongEmphasis strong) {
				content.addAll(inline(strong, with(marks, ProseMirrorDocuments.mark("bold")), warnings));
			}
			else if (child instanceof Emphasis emphasis) {
				content.addAll(inline(emphasis, with(marks, ProseMirrorDocuments.mark("italic")), warnings));
			}
			else if (child instanceof Link link) {
				content.addAll(inline(
					link, with(marks, ProseMirrorDocuments.linkMark(link.getDestination())), warnings));
			}
			else if (child instanceof HardLineBreak) {
				content.add(ProseMirrorDocuments.node("hardBreak", List.of()));
			}
			else if (child instanceof SoftLineBreak) {
				content.add(ProseMirrorDocuments.text(" ", marks));
			}
			else if (child instanceof Image image) {
				warnings.add("markdown_image_dropped");
				String alt = textContent(image);
				if (!alt.isEmpty()) {
					content.add(ProseMirrorDocuments.text(alt, marks));
				}
			}
			else if (child instanceof HtmlInline html) {
				warnings.add("markdown_html_dropped");
				String literal = html.getLiteral() == null ? "" : html.getLiteral();
				if (!literal.isEmpty()) {
					content.add(ProseMirrorDocuments.text(literal, marks));
				}
			}
			else {
				warnings.add("markdown_unsupported_inline:" + warningTag(child));
				String degraded = textContent(child);
				if (!degraded.isEmpty()) {
					content.add(ProseMirrorDocuments.text(degraded, marks));
				}
			}
		}
		return content;
	}

	private static List<Map<String, Object>> with(List<Map<String, Object>> marks, Map<String, Object> mark) {
		List<Map<String, Object>> combined = new ArrayList<>(marks);
		combined.add(mark);
		return List.copyOf(combined);
	}

	private static String textContent(Node node) {
		StringBuilder out = new StringBuilder();
		appendTextContent(node, out);
		return out.toString().strip();
	}

	private static void appendTextContent(Node node, StringBuilder out) {
		if (node instanceof Text text) {
			out.append(text.getLiteral());
		}
		else if (node instanceof Code code) {
			out.append(code.getLiteral());
		}
		for (Node child = node.getFirstChild(); child != null; child = child.getNext()) {
			appendTextContent(child, out);
		}
	}

	private static String stripTrailingNewline(String literal) {
		if (literal == null) {
			return "";
		}
		return literal.endsWith("\n") ? literal.substring(0, literal.length() - 1) : literal;
	}

	/** Class simple name, normalised so a warning code never carries document text. */
	private static String warningTag(Node node) {
		return node.getClass().getSimpleName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "");
	}
}
