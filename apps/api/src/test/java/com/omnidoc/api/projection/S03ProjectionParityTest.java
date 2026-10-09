package com.omnidoc.api.projection;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Machine-checked B-05c snapshot of the S-03 rich-formatting corpus.
 *
 * <p>The Java projector is the corpus authority. The frontend markdown bridge is a
 * read-only parity input: its captured golden is accepted only while the exact bridge,
 * table normalizer, and S-03 fixture source hashes recorded in the manifest still
 * match. Any frontend change therefore fails this backend closeout test until the
 * parity snapshot and its narrow allowed-delta list are deliberately reviewed.
 */
class S03ProjectionParityTest {

	private static final String ROOT = "b05c/projection/";

	private final JsonMapper jsonMapper = JsonMapper.builder().build();
	private final ProseMirrorMarkdownProjector projector =
		new ProseMirrorMarkdownProjector(this.jsonMapper);

	@Test
	void s03RichCorpusMatchesJavaGoldenAndHasNoUndocumentedFrontendDelta() throws Exception {
		JsonNode manifest = jsonResource("parity-manifest.json");
		assertSourceHashesAreCurrent(manifest.path("frontendBridgeInputs"));

		for (JsonNode parityCase : manifest.path("cases")) {
			String bodyJson = textResource(parityCase.path("bodyJson").asString()).stripTrailing();
			String expectedJava = textResource(parityCase.path("javaGolden").asString()).stripTrailing();
			String frontend = textResource(parityCase.path("frontendGolden").asString()).stripTrailing();
			Projection actual = this.projector.project(bodyJson);

			assertThat(actual.text())
				.as("pm-md-v1 golden for %s", parityCase.path("id").asString())
				.isEqualTo(expectedJava);
			assertThat(actual.warnings()).isEmpty();

			JsonNode allowedDeltas = parityCase.path("allowedDeltas");
			if (expectedJava.equals(frontend)) {
				assertThat(allowedDeltas).isEmpty();
			}
			else {
				assertThat(allowedDeltas.isArray() && !allowedDeltas.isEmpty())
					.as("every frontend/Java difference needs a reviewed reason")
					.isTrue();
				for (JsonNode delta : allowedDeltas) {
					assertThat(delta.path("reason").asString()).isNotBlank();
				}
			}
		}
	}

	private void assertSourceHashesAreCurrent(JsonNode sources)
		throws IOException, NoSuchAlgorithmException {
		Path repository = Path.of(System.getProperty("omnidoc.repo.root"));
		for (String relative : sources.propertyNames()) {
			assertThat(sha256(repository.resolve(relative)))
				.as("parity input %s", relative)
				.isEqualTo(sources.path(relative).asString());
		}
	}

	private JsonNode jsonResource(String name) throws IOException {
		return this.jsonMapper.readTree(textResource(name));
	}

	private String textResource(String name) throws IOException {
		try (InputStream stream = getClass().getClassLoader().getResourceAsStream(ROOT + name)) {
			if (stream == null) {
				throw new IOException("Missing projection resource: " + name);
			}
			return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private static String sha256(Path path) throws IOException, NoSuchAlgorithmException {
		MessageDigest digest = MessageDigest.getInstance("SHA-256");
		return HexFormat.of().formatHex(digest.digest(Files.readAllBytes(path)));
	}
}
