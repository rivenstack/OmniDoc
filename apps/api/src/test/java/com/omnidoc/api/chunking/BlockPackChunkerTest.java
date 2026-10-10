package com.omnidoc.api.chunking;

import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.json.JsonMapper;

import com.omnidoc.api.projection.Projection;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@code omni-blockpack-v1} contract (architecture.md §5.2.1 §2): frozen params, stable
 * ids, whole-block runs, a heading always starting a chunk, and the invariant that a
 * chunk's text is literally a slice of the projection.
 */
class BlockPackChunkerTest {

	private static final String VERSION_ID = "version-7f3c";

	private final ProseMirrorMarkdownProjector projector =
		new ProseMirrorMarkdownProjector(JsonMapper.builder().build());

	private final BlockPackChunker chunker = new BlockPackChunker();

	private final ChunkPolicy policy = ChunkPolicy.frozen(ProseMirrorMarkdownProjector.PROJECTOR_ID);

	@Test
	void frozenParamsMatchTheDesignLock() {
		assertThat(this.policy.chunkerId()).isEqualTo("omni-blockpack-v1");
		assertThat(this.policy.projectorId()).isEqualTo("pm-md-v1");
		assertThat(this.policy.maxChars()).isEqualTo(1200);
		assertThat(this.policy.softMinChars()).isEqualTo(300);
		assertThat(this.policy.headingBreak()).isTrue();
		assertThat(this.policy.overlapChars()).isZero();
		assertThat(this.policy.canonicalParams())
			.isEqualTo("maxChars=1200;softMinChars=300;headingBreak=true;overlapChars=0");
	}

	@Test
	void chunkIdsAreZeroPaddedAndStableAcrossRuns() {
		Projection projection = projectionOf(paragraphs(40, 200));

		List<ChunkDraft> first = this.chunker.chunk(projection, VERSION_ID, this.policy);
		List<ChunkDraft> second = this.chunker.chunk(projection, VERSION_ID, this.policy);

		assertThat(first).hasSameSizeAs(second).isNotEmpty();
		assertThat(first.getFirst().chunkId()).isEqualTo(VERSION_ID + "_c0000");
		assertThat(first).extracting(ChunkDraft::chunkId)
			.containsExactlyElementsOf(second.stream().map(ChunkDraft::chunkId).toList());
		assertThat(first).extracting(ChunkDraft::text)
			.containsExactlyElementsOf(second.stream().map(ChunkDraft::text).toList());
	}

	@Test
	void everyChunkIsLiterallyASliceOfTheProjection() {
		Projection projection = projectionOf("""
			{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Retrieval"}]},
			{"type":"paragraph","content":[{"type":"text","text":"%s"}]},
			{"type":"codeBlock","attrs":{"language":"sql"},"content":[{"type":"text","text":"SELECT 1;"}]},
			{"type":"paragraph","content":[{"type":"text","text":"Mentions pgvector, BYOK, and OpenAI."}]}
			""".formatted("word ".repeat(400).strip()));

		List<ChunkDraft> chunks = this.chunker.chunk(projection, VERSION_ID, this.policy);

		assertThat(chunks).isNotEmpty();
		for (ChunkDraft chunk : chunks) {
			assertThat(projection.text().substring(chunk.startOffset(), chunk.endOffset()))
				.isEqualTo(chunk.text());
			assertThat(chunk.text().length()).isLessThanOrEqualTo(this.policy.maxChars());
		}
		assertThat(chunks).extracting(ChunkDraft::ordinal)
			.containsExactlyElementsOf(IntStream.range(0, chunks.size()).boxed().toList());
	}

	@Test
	void aHeadingAlwaysStartsANewChunk() {
		Projection projection = projectionOf("""
			{"type":"paragraph","content":[{"type":"text","text":"intro"}]},
			{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Section one"}]},
			{"type":"paragraph","content":[{"type":"text","text":"body one"}]},
			{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Section two"}]},
			{"type":"paragraph","content":[{"type":"text","text":"body two"}]}
			""");

		List<ChunkDraft> chunks = this.chunker.chunk(projection, VERSION_ID, this.policy);

		assertThat(chunks).extracting(ChunkDraft::text).containsExactly(
			"intro",
			"## Section one\n\nbody one",
			"## Section two\n\nbody two");
		assertThat(chunks).extracting(ChunkDraft::startBlock).containsExactly(0, 1, 3);
		assertThat(chunks).extracting(ChunkDraft::endBlock).containsExactly(0, 2, 4);
	}

	@Test
	void oneOversizedBlockHardSplitsWithinItsOwnBlockAnchor() {
		String sentence = "The tenant_id column is scoped by RLS. ";
		Projection projection = projectionOf(
			"{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
				+ sentence.repeat(120).strip() + "\"}]}");

		List<ChunkDraft> chunks = this.chunker.chunk(projection, VERSION_ID, this.policy);

		assertThat(chunks).hasSizeGreaterThan(1);
		assertThat(chunks).allSatisfy(chunk -> {
			assertThat(chunk.startBlock()).isZero();
			assertThat(chunk.endBlock()).isZero();
			assertThat(chunk.text().length()).isLessThanOrEqualTo(this.policy.maxChars());
		});
		// Contiguous and lossless: the pieces re-form the block exactly.
		assertThat(chunks.getFirst().startOffset()).isZero();
		assertThat(chunks.getLast().endOffset()).isEqualTo(projection.text().length());
		for (int index = 1; index < chunks.size(); index++) {
			assertThat(chunks.get(index).startOffset()).isEqualTo(chunks.get(index - 1).endOffset());
		}
	}

	@Test
	void anUnbreakableTokenStillSplitsAtTheCharacterBoundary() {
		Projection projection = projectionOf(
			"{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"" + "A".repeat(3000) + "\"}]}");

		List<ChunkDraft> chunks = this.chunker.chunk(projection, VERSION_ID, this.policy);

		assertThat(chunks).extracting(draft -> draft.text().length()).containsExactly(1200, 1200, 600);
		assertThat(String.join("", chunks.stream().map(ChunkDraft::text).toList()))
			.isEqualTo(projection.text());
	}

	@Test
	void blankOnlyDocumentsProduceNoChunks() {
		Projection empty = this.projector.project("{\"type\":\"doc\",\"content\":[]}");
		Projection blank = projectionOf("{\"type\":\"paragraph\"},{\"type\":\"paragraph\"}");

		assertThat(this.chunker.chunk(empty, VERSION_ID, this.policy)).isEmpty();
		assertThat(this.chunker.chunk(blank, VERSION_ID, this.policy)).isEmpty();
	}

	@Test
	void differentPolicyParamsHashDifferently() {
		ChunkPolicy other = new ChunkPolicy("pm-md-v1", "omni-blockpack-v1", 800, 300, true, 0);

		assertThat(other.paramsHash()).isNotEqualTo(this.policy.paramsHash());
		assertThat(this.policy.sameAs("pm-md-v1", "omni-blockpack-v1", this.policy.paramsHash())).isTrue();
		assertThat(this.policy.sameAs("pm-md-v1", "omni-blockpack-v1", other.paramsHash())).isFalse();
	}

	@TestFactory
	Stream<DynamicTest> twentyRepresentativeFixturesAreByteDeterministic() {
		return determinismFixtures().stream().map(fixture -> DynamicTest.dynamicTest(
			fixture.name(), () -> {
				Projection projection = this.projector.project(fixture.bodyJson());
				List<ChunkDraft> first = this.chunker.chunk(projection, VERSION_ID, this.policy);
				List<ChunkDraft> second = this.chunker.chunk(projection, VERSION_ID, this.policy);

				assertThat(second).containsExactlyElementsOf(first);
				assertThat(second).extracting(ChunkDraft::textSha256)
					.containsExactlyElementsOf(first.stream().map(ChunkDraft::textSha256).toList());
				assertThat(first).extracting(ChunkDraft::ordinal)
					.containsExactlyElementsOf(IntStream.range(0, first.size()).boxed().toList());
				for (ChunkDraft chunk : first) {
					assertThat(projection.text().substring(chunk.startOffset(), chunk.endOffset()))
						.isEqualTo(chunk.text());
					assertThat(chunk.chunkId()).isEqualTo(
						VERSION_ID + "_c" + "%04d".formatted(chunk.ordinal()));
					assertThat(chunk.startBlock()).isLessThanOrEqualTo(chunk.endBlock());
					assertThat(chunk.text().length()).isLessThanOrEqualTo(this.policy.maxChars());
				}
			}));
	}

	@Test
	void headingMutationPolicyIsVersionScopedAndNeverPromisesCrossVersionIds() {
		Projection original = projectionOf(
			paragraph("intro") + "," + heading(2, "Alpha") + "," + paragraph("body"));
		Projection renamed = projectionOf(
			paragraph("intro") + "," + heading(2, "Beta") + "," + paragraph("body"));
		Projection inserted = projectionOf(
			paragraph("intro") + "," + heading(2, "Alpha") + "," + paragraph("body")
				+ "," + heading(2, "New") + "," + paragraph("tail"));

		List<ChunkDraft> originalChunks = this.chunker.chunk(original, "version-original", this.policy);
		List<ChunkDraft> renamedChunks = this.chunker.chunk(renamed, "version-renamed", this.policy);
		List<ChunkDraft> insertedChunks = this.chunker.chunk(inserted, "version-inserted", this.policy);

		assertThat(originalChunks).extracting(ChunkDraft::chunkId)
			.allMatch(id -> id.startsWith("version-original_c"));
		assertThat(renamedChunks).extracting(ChunkDraft::chunkId)
			.allMatch(id -> id.startsWith("version-renamed_c"));
		assertThat(insertedChunks).extracting(ChunkDraft::chunkId)
			.allMatch(id -> id.startsWith("version-inserted_c"));
		assertThat(renamedChunks).extracting(ChunkDraft::text)
			.isNotEqualTo(originalChunks.stream().map(ChunkDraft::text).toList());
		assertThat(insertedChunks).hasSizeGreaterThan(originalChunks.size());
	}

	private Projection projectionOf(String blocks) {
		return this.projector.project("{\"type\":\"doc\",\"content\":[" + blocks + "]}");
	}

	private static String paragraphs(int count, int charsEach) {
		return IntStream.range(0, count)
			.mapToObj(index -> "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
				+ ("p" + index + " ") + "x".repeat(charsEach) + "\"}]}")
			.reduce((left, right) -> left + "," + right)
			.orElseThrow();
	}

	private List<DeterminismFixture> determinismFixtures() {
		return List.of(
			fixture("empty-document", ""),
			fixture("single-paragraph", paragraph("short body")),
			fixture("heading-boundaries", heading(1, "One") + "," + paragraph("body") + "," + heading(2, "Two")),
			fixture("sentence-fallback", paragraph("Sentence boundary. ".repeat(100))),
			fixture("whitespace-fallback", paragraph("word ".repeat(400))),
			fixture("character-fallback", paragraph("A".repeat(3000))),
			fixture("unicode-utf16", paragraph("emoji 🧪 and café ".repeat(120))),
			fixture("fenced-code", "{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"java\"},\"content\":[{\"type\":\"text\",\"text\":\"class A {}\"}]}"),
			fixture("table", "{\"type\":\"table\",\"content\":[{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableHeader\",\"content\":[" + paragraph("A") + "]},{\"type\":\"tableHeader\",\"content\":[" + paragraph("B") + "]}]},{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableCell\",\"content\":[" + paragraph("x | y") + "]},{\"type\":\"tableCell\",\"content\":[" + paragraph("2") + "]}]}]}"),
			fixture("blockquote", "{\"type\":\"blockquote\",\"content\":[" + paragraph("quoted") + "]}"),
			fixture("bullet-list", "{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[" + paragraph("one") + "]},{\"type\":\"listItem\",\"content\":[" + paragraph("two") + "]}]}"),
			fixture("ordered-list", "{\"type\":\"orderedList\",\"attrs\":{\"start\":3},\"content\":[{\"type\":\"listItem\",\"content\":[" + paragraph("three") + "]}]}"),
			fixture("hard-break", "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"line one\"},{\"type\":\"hardBreak\"},{\"type\":\"text\",\"text\":\"line two\"}]}"),
			fixture("horizontal-rule", paragraph("before") + ",{\"type\":\"horizontalRule\"}," + paragraph("after")),
			fixture("soft-min-tail", paragraph("word ".repeat(255))),
			fixture("exact-max", paragraph("x".repeat(1200))),
			fixture("one-over-max", paragraph("x".repeat(1201))),
			fixture("many-small-blocks", IntStream.range(0, 50).mapToObj(i -> paragraph("p" + i)).reduce((a, b) -> a + "," + b).orElseThrow()),
			fixture("consecutive-headings", heading(1, "A") + "," + heading(2, "B") + "," + heading(3, "C")),
			fixture("mixed-marks", "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"pgvector\",\"marks\":[{\"type\":\"bold\"}]},{\"type\":\"text\",\"text\":\" BYOK OpenAI\"}]}"));
	}

	private DeterminismFixture fixture(String name, String blocks) {
		return new DeterminismFixture(name, "{\"type\":\"doc\",\"content\":[" + blocks + "]}");
	}

	private String paragraph(String text) {
		return "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":"
			+ this.projectorJson(text) + "}]}";
	}

	private String heading(int level, String text) {
		return "{\"type\":\"heading\",\"attrs\":{\"level\":" + level
			+ "},\"content\":[{\"type\":\"text\",\"text\":" + this.projectorJson(text) + "}]}";
	}

	private String projectorJson(String text) {
		return JsonMapper.builder().build().writeValueAsString(text);
	}

	private record DeterminismFixture(String name, String bodyJson) {
	}
}
