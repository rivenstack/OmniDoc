package com.omnidoc.api.adapters.ingestion.parser;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import tools.jackson.databind.ObjectMapper;

/**
 * The one import parser adapter (architecture.md §5.2.1 §6).
 *
 * <ul>
 *   <li>PDF / DOCX / HTML — Apache Tika 4.1.0 text extraction, then paragraphs split on
 *       blank lines. Text-only fidelity: no layout, no OCR in Phase 1.</li>
 *   <li>Markdown — commonmark-java 0.30.0 AST → ProseMirror JSON, not Tika's markdown
 *       path, so the inverse mapping stays on the {@code pm-md-v1} allowlist.</li>
 *   <li>Plain text — paragraphs split on blank lines.</li>
 * </ul>
 *
 * <p>Deliberately no Spring AI {@code TikaDocumentReader} (§7). Bytes are streamed into
 * Tika and the extracted string is capped in step with the upload size cap so a crafted
 * document cannot exhaust the heap.
 */
public class TikaImportParser implements ImportParser {

	private final ObjectMapper objectMapper;
	private final MarkdownToProseMirror markdown = new MarkdownToProseMirror();
	private final int maxTextLength;

	public TikaImportParser(ObjectMapper objectMapper, int maxTextLength) {
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
		if (maxTextLength <= 0) {
			throw new IllegalArgumentException("maxTextLength must be positive");
		}
		this.maxTextLength = maxTextLength;
	}

	@Override
	public Optional<ImportMediaType> resolveType(String declaredMediaType, String fileName, byte[] bytes) {
		Optional<ImportMediaType> declared = ImportMediaType.declared(declaredMediaType, fileName);
		if (declared.isEmpty()) {
			return Optional.empty();
		}
		String detected = tika().detect(bytes == null ? new byte[0] : bytes, fileName);
		return declared.filter(type -> type.acceptsDetected(detected));
	}

	@Override
	public ParsedDocument parse(byte[] bytes, ImportMediaType mediaType, String fileName)
		throws ImportParseException {
		Objects.requireNonNull(mediaType, "mediaType");
		byte[] payload = (bytes == null) ? new byte[0] : bytes;
		Set<String> warnings = new LinkedHashSet<>();

		List<Map<String, Object>> blocks = switch (mediaType) {
			case MARKDOWN -> {
				MarkdownToProseMirror.Converted converted = this.markdown.convert(decode(payload, warnings));
				warnings.addAll(converted.warnings());
				yield converted.blocks();
			}
			case PLAIN_TEXT -> ProseMirrorDocuments.paragraphsFromText(decode(payload, warnings));
			case HTML, PDF, DOCX -> ProseMirrorDocuments.paragraphsFromText(extract(payload, fileName, warnings));
		};

		if (blocks.isEmpty()) {
			warnings.add("empty_document");
			blocks = List.of(ProseMirrorDocuments.node("paragraph", List.of()));
		}

		String bodyJson = this.objectMapper.writeValueAsString(ProseMirrorDocuments.doc(blocks));
		return new ParsedDocument(ImportMediaType.titleOf(fileName), bodyJson, List.copyOf(new ArrayList<>(warnings)));
	}

	private String extract(byte[] bytes, String fileName, Set<String> warnings) throws ImportParseException {
		Metadata metadata = new Metadata();
		if (fileName != null && !fileName.isBlank()) {
			metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, fileName);
		}
		try (InputStream stream = new ByteArrayInputStream(bytes)) {
			String text = tika().parseToString(stream, metadata);
			if (text != null && text.length() >= this.maxTextLength) {
				warnings.add("extracted_text_truncated");
			}
			return text == null ? "" : text;
		}
		catch (TikaException | IOException | RuntimeException ex) {
			// Openable-but-corrupt bytes: §6 maps this to error_code=unsupported_type.
			throw new ImportParseException("Imported document could not be extracted.", ex);
		}
	}

	private String decode(byte[] bytes, Set<String> warnings) {
		if (bytes.length > this.maxTextLength) {
			warnings.add("extracted_text_truncated");
			return new String(bytes, 0, this.maxTextLength, StandardCharsets.UTF_8);
		}
		return new String(bytes, StandardCharsets.UTF_8);
	}

	private Tika tika() {
		Tika tika = new Tika();
		tika.setMaxStringLength(this.maxTextLength);
		return tika;
	}
}
