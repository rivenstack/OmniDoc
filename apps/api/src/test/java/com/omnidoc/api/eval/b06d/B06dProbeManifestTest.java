package com.omnidoc.api.eval.b06d;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class B06dProbeManifestTest {

	@Test
	void manifestMatchesCurrentFixtureHashesAndFrozenPolicy() throws Exception {
		Path repositoryRoot = Path.of(System.getProperty("omnidoc.repo.root"));
		B06dProbeManifest manifest = B06dProbeManifest.load(repositoryRoot, JsonMapper.builder().build());

		assertThat(manifest.corpusVersion()).isEqualTo("s-03-v1");
		assertThat(manifest.evaluationVersion()).isEqualTo("b-06d-v1");
		assertThat(manifest.notes()).extracting(B06dProbeManifest.NoteFixture::id)
			.contains("ws_mine_launch", "ws_mine_conflict", "ws_mine_indexing", "ws_mine_formatting");
		assertThat(manifest.queries()).extracting(B06dProbeManifest.QueryFixture::id)
			.containsExactly("Q1", "Q2", "Q3", "Q4", "Q5", "NEG1");
	}
}