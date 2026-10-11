package com.omnidoc.api.eval.b06d;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import tools.jackson.databind.ObjectMapper;

import com.omnidoc.api.chunking.ChunkPolicy;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

final class B06dProbeManifest {

	private static final String RESOURCE = "b06d/manifest.json";

	private final ManifestDocument document;

	private B06dProbeManifest(ManifestDocument document) {
		this.document = Objects.requireNonNull(document, "document");
	}

	static B06dProbeManifest load(Path repositoryRoot, ObjectMapper objectMapper) throws IOException {
		try (InputStream stream = resource(RESOURCE)) {
			ManifestDocument document = objectMapper.readValue(stream, ManifestDocument.class);
			B06dProbeManifest manifest = new B06dProbeManifest(document);
			manifest.assertCurrent(repositoryRoot);
			return manifest;
		}
	}

	String corpusVersion() {
		return this.document.corpusVersion();
	}

	String evaluationVersion() {
		return this.document.evaluationVersion();
	}

	Budget budget() {
		return this.document.budget();
	}

	Actor actor() {
		return this.document.actor();
	}

	List<NoteFixture> notes() {
		return this.document.notes();
	}

	List<QueryFixture> queries() {
		return this.document.queries();
	}

	Map<String, String> sourceHashes() {
		return this.document.sourceHashes();
	}

	ProjectionPolicy projectionPolicy() {
		return this.document.projectionPolicy();
	}

	String bodyJson(NoteFixture note) throws IOException {
		if (note.bodyJsonResource() != null && !note.bodyJsonResource().isBlank()) {
			return readResource(note.bodyJsonResource()).strip();
		}
		return simpleBodyJson(note.bodyText());
	}

	private void assertCurrent(Path repositoryRoot) throws IOException {
		ProjectionPolicy expectedPolicy = new ProjectionPolicy(
			ProseMirrorMarkdownProjector.PROJECTOR_ID,
			ChunkPolicy.CHUNKER_ID,
			ChunkPolicy.frozen(ProseMirrorMarkdownProjector.PROJECTOR_ID).paramsHash());
		if (!expectedPolicy.equals(this.document.projectionPolicy())) {
			throw new IOException("B-06d manifest projection policy drifted from the frozen B-05 policy.");
		}
		for (Map.Entry<String, String> entry : this.document.sourceHashes().entrySet()) {
			String path = entry.getKey();
			String expected = entry.getValue();
			String actual = path.contains(":")
				? sha256Bytes(readResource(path.substring(path.indexOf(':') + 1)).getBytes(StandardCharsets.UTF_8))
				: sha256(repositoryRoot.resolve(path));
			if (!expected.equals(actual)) {
				throw new IOException("B-06d manifest drift detected for " + path);
			}
		}
	}

	private static InputStream resource(String path) throws IOException {
		InputStream stream = B06dProbeManifest.class.getClassLoader().getResourceAsStream(path);
		if (stream == null) {
			throw new IOException("Missing classpath resource: " + path);
		}
		return stream;
	}

	private static String readResource(String path) throws IOException {
		try (InputStream stream = resource(path)) {
			return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private static String simpleBodyJson(String text) {
		if (text == null || text.isBlank()) {
			throw new IllegalArgumentException("bodyText must not be blank");
		}
		String escaped = text.replace("\\", "\\\\").replace("\"", "\\\"");
		return "{" +
			"\"type\":\"doc\",\"content\":[{" +
			"\"type\":\"paragraph\",\"content\":[{" +
			"\"type\":\"text\",\"text\":\"" + escaped + "\"}]}]}";
	}

	private static String sha256(Path path) throws IOException {
		return sha256Bytes(Files.readAllBytes(path));
	}

	private static String sha256Bytes(byte[] bytes) throws IOException {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(bytes));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IOException("SHA-256 is unavailable", ex);
		}
	}

	record ManifestDocument(
		String corpusVersion,
		String evaluationVersion,
		ProjectionPolicy projectionPolicy,
		Budget budget,
		Actor actor,
		Map<String, String> sourceHashes,
		List<NoteFixture> notes,
		List<QueryFixture> queries) {
		ManifestDocument {
			sourceHashes = Map.copyOf(sourceHashes);
			notes = List.copyOf(notes);
			queries = List.copyOf(queries);
		}
	}

	record ProjectionPolicy(String projectorId, String chunkerId, String paramsHash) {
	}

	record Budget(int maxRequests, int maxInputTokens) {
	}

	record Actor(String tenantId, String actorId, String workspaceId) {
	}

	record NoteFixture(
		String id,
		String versionId,
		String tenantId,
		String actorId,
		String workspaceId,
		String title,
		String corpusOwnership,
		String bodyText,
		String bodyJsonResource) {
	}

	record QueryFixture(
		String id,
		String text,
		String workspaceId,
		List<String> relevantNoteIds,
		boolean includeInMetrics) {
		QueryFixture {
			relevantNoteIds = List.copyOf(relevantNoteIds);
		}
	}
}