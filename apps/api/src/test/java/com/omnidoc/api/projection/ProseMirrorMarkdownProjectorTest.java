package com.omnidoc.api.projection;

import java.util.List;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.projection.Projection.BlockSpan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@code pm-md-v1} contract (architecture.md §5.2.1 §1): the StarterKit + table
 * allowlist, unknown nodes degrading to text with a warning, and byte-identical output
 * for identical input.
 */
class ProseMirrorMarkdownProjectorTest {

	private static final String LONG_TOKEN = "eyJhbGciOiJub25lIn0." + "A".repeat(260);

	private final ProseMirrorMarkdownProjector projector =
		new ProseMirrorMarkdownProjector(JsonMapper.builder().build());

	@Test
	void projectsHeadingsAndInlineCodeWithTechnicalTokens() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[
			  {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Release notes"}]},
			  {"type":"paragraph","content":[
				{"type":"text","text":"Uses "},
				{"type":"text","marks":[{"type":"code"}],"text":"tenant_id"},
				{"type":"text","text":" with pgvector, BYOK, and OpenAI at https://example.test/a?b=c."}]}
			]}
			""");

		assertThat(projection.text()).isEqualTo(
			"## Release notes\n\nUses `tenant_id` with pgvector, BYOK, and OpenAI "
				+ "at https://example.test/a?b=c.");
		assertThat(projection.warnings()).isEmpty();
		assertThat(projection.blocks()).hasSize(2);
		assertThat(projection.blocks().getFirst().heading()).isTrue();
		assertThat(projection.blocks().getLast().heading()).isFalse();
	}

	@Test
	void appliesMarksInFixedPrecedenceRegardlessOfSerialisedOrder() {
		String marksOneOrder = """
			{"type":"doc","content":[{"type":"paragraph","content":[
			  {"type":"text","marks":[
				{"type":"code"},{"type":"bold"},{"type":"italic"},{"type":"strike"},
				{"type":"link","attrs":{"href":"https://example.test/x"}}],
			   "text":"omnidoc"}]}]}
			""";
		String marksOtherOrder = """
			{"type":"doc","content":[{"type":"paragraph","content":[
			  {"type":"text","marks":[
				{"type":"link","attrs":{"href":"https://example.test/x"}},
				{"type":"strike"},{"type":"italic"},{"type":"bold"},{"type":"code"}],
			   "text":"omnidoc"}]}]}
			""";

		assertThat(this.projector.project(marksOneOrder).text())
			.isEqualTo("[~~***`omnidoc`***~~](https://example.test/x)")
			.isEqualTo(this.projector.project(marksOtherOrder).text());
	}

	@Test
	void projectsFencedCodeBlocksWithLanguageAndFilePaths() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":"java"},
			  "content":[{"type":"text","text":"Path config = Path.of(\\"/srv/omnidoc/config/app.yml\\");"}]}]}
			""");

		assertThat(projection.text()).isEqualTo(
			"```java\nPath config = Path.of(\"/srv/omnidoc/config/app.yml\");\n```");
	}

	@Test
	void projectsGfmTableAndEscapesLiteralPipes() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[{"type":"table","content":[
			  {"type":"tableRow","content":[
				{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Feature"}]}]},
				{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"State"}]}]}]},
			  {"type":"tableRow","content":[
				{"type":"tableCell","content":[{"type":"paragraph","content":[
				  {"type":"text","text":"Pipe | inside"}]}]},
				{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"ready"}]}]}]}
			]}]}
			""");

		assertThat(projection.text()).isEqualTo("""
			| Feature | State |
			| --- | --- |
			| Pipe \\| inside | ready |""");
	}

	@Test
	void projectsListsBlockquotesAndRules() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[
			  {"type":"bulletList","content":[
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"one"}]}]},
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"two"}]}]}]},
			  {"type":"orderedList","attrs":{"start":3},"content":[
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"three"}]}]}]},
			  {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"quoted"}]}]},
			  {"type":"horizontalRule"}
			]}
			""");

		assertThat(projection.text()).isEqualTo("""
			- one
			- two

			3. three

			> quoted

			---""");
	}

	@Test
	void unknownNodesDegradeToTextWithAWarningAndNeverFail() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[
			  {"type":"paragraph","content":[{"type":"text","text":"before"}]},
			  {"type":"image","attrs":{"src":"diagram.png"},"content":[{"type":"text","text":"architecture"}]},
			  {"type":"paragraph","content":[
				{"type":"text","marks":[{"type":"highlight"}],"text":"after"}]}
			]}
			""");

		assertThat(projection.text()).isEqualTo("before\n\narchitecture\n\nafter");
		assertThat(projection.warnings()).containsExactly("unknown_node:image", "unknown_mark:highlight");
	}

	@Test
	void blockSpansAreContiguousAndSliceBackToTheirOwnMarkdown() {
		Projection projection = this.projector.project("""
			{"type":"doc","content":[
			  {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Ada's \\"nested 'quotes'\\" — notes (v2)!? [draft]"}]},
			  {"type":"paragraph","content":[{"type":"text","text":"%s"}]},
			  {"type":"paragraph","content":[{"type":"text","text":"tail"}]}
			]}
			""".formatted(LONG_TOKEN));

		List<BlockSpan> blocks = projection.blocks();
		String text = projection.text();
		assertThat(blocks).hasSize(3);
		assertThat(blocks.getFirst().startOffset()).isZero();
		assertThat(blocks.getLast().endOffset()).isEqualTo(text.length());
		for (int index = 1; index < blocks.size(); index++) {
			int start = blocks.get(index).startOffset();
			assertThat(start).isEqualTo(blocks.get(index - 1).endOffset() + 2);
			assertThat(text.substring(start - 2, start)).isEqualTo("\n\n");
		}
		assertThat(text.substring(blocks.get(1).startOffset(), blocks.get(1).endOffset()))
			.isEqualTo(LONG_TOKEN);
		assertThat(text.substring(blocks.getFirst().startOffset(), blocks.getFirst().endOffset()))
			.isEqualTo("# Ada's \"nested 'quotes'\" — notes (v2)!? [draft]");
	}

	@Test
	void sameDocumentProjectsByteIdentically() {
		String document = """
			{"type":"doc","content":[
			  {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Stable"}]},
			  {"type":"paragraph","content":[{"type":"text","text":"pgvector + BYOK"}]}
			]}
			""";

		assertThat(this.projector.project(document).text())
			.isEqualTo(this.projector.project(document).text());
	}

	@Test
	void rejectsNonProseMirrorInput() {
		assertThatThrownBy(() -> this.projector.project("[]"))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> this.projector.project("   "))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> this.projector.project("{not json"))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void emptyDocumentProjectsToEmptyTextWithNoBlocks() {
		Projection projection = this.projector.project("{\"type\":\"doc\",\"content\":[]}");

		assertThat(projection.text()).isEmpty();
		assertThat(projection.blocks()).isEmpty();
		assertThat(projection.warnings()).isEmpty();
	}
}
