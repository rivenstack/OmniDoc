package com.omnidoc.api.adapters.ingestion.parser;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.projection.Projection;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Parser allowlist and limits (architecture.md §5.2.1 §6), plus the markdown →
 * ProseMirror inverse mapping. Round-tripping through {@code pm-md-v1} is the real
 * assertion: it proves the parser only produces nodes the projector knows.
 */
class TikaImportParserTest {

	private final JsonMapper jsonMapper = JsonMapper.builder().build();

	private final TikaImportParser parser = new TikaImportParser(this.jsonMapper, 1024 * 1024);

	private final ProseMirrorMarkdownProjector projector = new ProseMirrorMarkdownProjector(this.jsonMapper);

	@Test
	void allowsOnlyTheLockedTypes() {
		assertThat(ImportMediaType.allowedWireTypes()).containsExactly(
			"text/markdown",
			"text/plain",
			"text/html",
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
	}

	@Test
	void resolvesDeclaredTypeAndFallsBackToTheExtension() {
		byte[] markdown = "# Title\n\nbody".getBytes(StandardCharsets.UTF_8);

		assertThat(this.parser.resolveType("text/markdown; charset=utf-8", "notes.md", markdown))
			.contains(ImportMediaType.MARKDOWN);
		assertThat(this.parser.resolveType(null, "notes.md", markdown))
			.contains(ImportMediaType.MARKDOWN);
		assertThat(this.parser.resolveType("application/octet-stream", "notes.md", markdown))
			.contains(ImportMediaType.MARKDOWN);
		assertThat(this.parser.resolveType("text/plain", "notes.txt", markdown))
			.contains(ImportMediaType.PLAIN_TEXT);
	}

	@Test
	void rejectsArchivesAndUndeclaredBinaries() {
		byte[] archive = zipBytes();

		assertThat(this.parser.resolveType("application/zip", "bundle.zip", archive)).isEmpty();
		assertThat(this.parser.resolveType(null, "bundle.zip", archive)).isEmpty();
		assertThat(this.parser.resolveType("image/png", "diagram.png", new byte[] {1, 2, 3})).isEmpty();
		assertThat(this.parser.resolveType(null, "noextension", new byte[] {1, 2, 3})).isEmpty();
	}

	@Test
	void rejectsADeclarationThatContentDetectionContradicts() {
		// Zip magic is not a PDF under any name, so the declaration loses at enqueue.
		assertThat(this.parser.resolveType("application/pdf", "report.pdf", zipBytes())).isEmpty();
		assertThat(this.parser.resolveType("text/markdown", "notes.md", zipBytes())).isEmpty();
	}

	@Test
	void anArchiveRenamedAsDocxPassesDetectionAndFailsAtParseTime() {
		// DOCX *is* a zip in Tika's type hierarchy, so a renamed archive clears detection.
		// §6 covers it: openable-but-unextractable bytes fail the job as unsupported_type.
		byte[] archive = zipBytes();

		assertThat(this.parser.resolveType(ImportMediaType.DOCX.wireType(), "report.docx", archive))
			.contains(ImportMediaType.DOCX);
		assertThatThrownBy(() -> this.parser.parse(archive, ImportMediaType.DOCX, "report.docx"))
			.isInstanceOf(ImportParseException.class);
	}

	@Test
	void parsesMarkdownOntoTheProjectorAllowlist() throws Exception {
		String markdown = """
			# Ingestion

			Uses `tenant_id`, **pgvector**, *BYOK*, and [OpenAI](https://example.test/x).

			- first
			- second

			| Feature | State |
			| --- | --- |
			| Notes | ready |

			```java
			Path config = Path.of("/srv/omnidoc/config/app.yml");
			```

			> quoted
			""";

		ParsedDocument parsed = this.parser.parse(
			markdown.getBytes(StandardCharsets.UTF_8), ImportMediaType.MARKDOWN, "ingestion-notes.md");

		assertThat(parsed.title()).isEqualTo("ingestion-notes");
		assertThat(parsed.warnings()).isEmpty();

		Projection projection = this.projector.project(parsed.bodyJson());
		assertThat(projection.warnings()).isEmpty();
		assertThat(projection.text())
			.contains("# Ingestion")
			.contains("Uses `tenant_id`, **pgvector**, *BYOK*, and [OpenAI](https://example.test/x).")
			.contains("- first\n- second")
			.contains("| Feature | State |\n| --- | --- |\n| Notes | ready |")
			.contains("```java\nPath config = Path.of(\"/srv/omnidoc/config/app.yml\");\n```")
			.contains("> quoted");
	}

	@Test
	void markdownImagesAndRawHtmlDegradeToPartialWarnings() throws Exception {
		String markdown = "Before ![architecture](diagram.png) after\n\n<div>raw</div>\n";

		ParsedDocument parsed = this.parser.parse(
			markdown.getBytes(StandardCharsets.UTF_8), ImportMediaType.MARKDOWN, "mixed.md");

		assertThat(parsed.warnings()).contains("markdown_image_dropped", "markdown_html_dropped");
		assertThat(this.projector.project(parsed.bodyJson()).text()).contains("architecture");
	}

	@Test
	void plainTextSplitsOnBlankLinesAndKeepsLongTokens() throws Exception {
		String token = "eyJhbGciOiJub25lIn0." + "A".repeat(260);
		String text = "First paragraph\nwrapped line\n\nSecond paragraph with " + token + "\n";

		ParsedDocument parsed = this.parser.parse(
			text.getBytes(StandardCharsets.UTF_8), ImportMediaType.PLAIN_TEXT, "export.txt");

		Projection projection = this.projector.project(parsed.bodyJson());
		assertThat(parsed.title()).isEqualTo("export");
		assertThat(projection.blocks()).hasSize(2);
		assertThat(projection.text()).isEqualTo(
			"First paragraph wrapped line\n\nSecond paragraph with " + token);
	}

	@Test
	void htmlIsExtractedAsText() throws Exception {
		String html = """
			<html><head><title>Ignored</title></head>
			<body><h1>Chunking</h1><p>Mentions pgvector and BYOK.</p></body></html>
			""";

		ParsedDocument parsed = this.parser.parse(
			html.getBytes(StandardCharsets.UTF_8), ImportMediaType.HTML, "page.html");

		assertThat(this.projector.project(parsed.bodyJson()).text())
			.contains("Chunking")
			.contains("Mentions pgvector and BYOK.");
	}

	@Test
	void emptyInputStillProducesADocumentAndAnEmptyWarning() throws Exception {
		ParsedDocument parsed = this.parser.parse(
			new byte[0], ImportMediaType.PLAIN_TEXT, "blank.txt");

		assertThat(parsed.warnings()).contains("empty_document");
		assertThat(parsed.bodyJson()).contains("\"doc\"");
		assertThat(this.projector.project(parsed.bodyJson()).blocks()).hasSize(1);
	}

	@Test
	void corruptBytesForAnAllowedTypeFailAsAParseError() {
		byte[] fakePdf = "%PDF-1.7\nnot actually a pdf body".getBytes(StandardCharsets.UTF_8);

		assertThatThrownBy(() -> this.parser.parse(fakePdf, ImportMediaType.PDF, "broken.pdf"))
			.isInstanceOf(ImportParseException.class);
	}

	@Test
	void boundedOperatorPdfAndDocxFixturesParseOffline() throws Exception {
		assertOperatorFixture(
			"load/fixtures/b05c-sample.pdf.b64", ImportMediaType.PDF, "sample.pdf", "PDF pgvector");
		assertOperatorFixture(
			"load/fixtures/b05c-sample.docx.b64", ImportMediaType.DOCX, "sample.docx", "DOCX pgvector");
	}

	@Test
	void titleIsTheFileNameWithoutItsExtension() {
		assertThat(ImportMediaType.titleOf("Ada's \"nested 'quotes'\" — notes (v2)!?.md"))
			.isEqualTo("Ada's \"nested 'quotes'\" — notes (v2)!?");
		assertThat(ImportMediaType.titleOf("/tmp/nested/dir/report.docx")).isEqualTo("report");
		assertThat(ImportMediaType.titleOf(null)).isEqualTo("Imported document");
		assertThat(ImportMediaType.titleOf(".gitignore")).isEqualTo(".gitignore");
	}

	private static byte[] zipBytes() {
		ByteArrayOutputStream bytes = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
			zip.putNextEntry(new ZipEntry("notes.txt"));
			zip.write("archived".getBytes(StandardCharsets.UTF_8));
			zip.closeEntry();
		}
		catch (java.io.IOException ex) {
			throw new IllegalStateException(ex);
		}
		return bytes.toByteArray();
	}

	private void assertOperatorFixture(
		String path, ImportMediaType mediaType, String fileName, String expectedText) throws Exception {
		byte[] bytes = decodeFixture(path);
		assertThat(this.parser.resolveType(mediaType.wireType(), fileName, bytes)).contains(mediaType);
		ParsedDocument parsed = this.parser.parse(bytes, mediaType, fileName);
		assertThat(this.projector.project(parsed.bodyJson()).text()).contains(expectedText);
	}

	private static byte[] decodeFixture(String path) throws IOException {
		return Base64.getMimeDecoder().decode(Files.readString(Path.of(path), StandardCharsets.UTF_8));
	}
}
