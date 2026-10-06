package com.omnidoc.api.adapters.ingestion.parser;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * The import allowlist locked in architecture.md §5.2.1 §6 (`@user` confirmed
 * 2026-10-06). Anything not listed here — archives, executables, images — is
 * {@code unsupported_type} (415 at enqueue).
 *
 * <p>A member carries three things: the wire media type, the file extensions that imply
 * it, and the set of types Tika may legitimately report for those bytes. The third set
 * exists because content detection is coarser than a declaration: a markdown file is
 * valid {@code text/plain}, and a DOCX read without its name detects as the generic
 * OOXML container. A detection outside the set is treated as a mismatch, not a hint.
 */
public enum ImportMediaType {

	MARKDOWN(
		"text/markdown",
		Set.of("md", "markdown"),
		Set.of("text/markdown", "text/x-markdown", "text/x-web-markdown", "text/plain")),

	PLAIN_TEXT(
		"text/plain",
		Set.of("txt", "text"),
		Set.of("text/plain", "text/markdown", "text/x-markdown", "text/x-web-markdown")),

	HTML(
		"text/html",
		Set.of("html", "htm"),
		Set.of("text/html", "application/xhtml+xml")),

	PDF(
		"application/pdf",
		Set.of("pdf"),
		Set.of("application/pdf")),

	DOCX(
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		Set.of("docx"),
		Set.of(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/x-tika-ooxml"));

	private final String wireType;
	private final Set<String> extensions;
	private final Set<String> compatibleDetections;

	ImportMediaType(String wireType, Set<String> extensions, Set<String> compatibleDetections) {
		this.wireType = wireType;
		this.extensions = extensions;
		this.compatibleDetections = compatibleDetections;
	}

	public String wireType() {
		return this.wireType;
	}

	/** Allowlisted wire types, for operator-facing messages and tests. */
	public static List<String> allowedWireTypes() {
		return List.of(values()).stream().map(ImportMediaType::wireType).toList();
	}

	/**
	 * Resolve the declared type, falling back to the file extension. A declaration
	 * outside the allowlist is rejected even when the extension would have matched, so a
	 * client cannot smuggle a type past the allowlist by naming the file {@code .md}.
	 */
	public static Optional<ImportMediaType> declared(String mediaType, String fileName) {
		String bare = bareType(mediaType);
		if (bare != null && !bare.isEmpty() && !"application/octet-stream".equals(bare)) {
			return List.of(values()).stream().filter(type -> type.wireType.equals(bare)).findFirst();
		}
		return fromExtension(fileName);
	}

	public static Optional<ImportMediaType> fromExtension(String fileName) {
		String extension = extensionOf(fileName);
		if (extension == null) {
			return Optional.empty();
		}
		return List.of(values()).stream()
			.filter(type -> type.extensions.contains(extension))
			.findFirst();
	}

	public boolean acceptsDetected(String detectedMediaType) {
		String bare = bareType(detectedMediaType);
		return bare != null && this.compatibleDetections.contains(bare);
	}

	/** File name without its extension — the imported note's title (§6). */
	public static String titleOf(String fileName) {
		if (fileName == null || fileName.isBlank()) {
			return "Imported document";
		}
		String name = fileName.replace('\\', '/');
		name = name.substring(name.lastIndexOf('/') + 1);
		int dot = name.lastIndexOf('.');
		String stem = (dot > 0) ? name.substring(0, dot) : name;
		return stem.isBlank() ? "Imported document" : stem;
	}

	private static String extensionOf(String fileName) {
		if (fileName == null) {
			return null;
		}
		int dot = fileName.lastIndexOf('.');
		if (dot < 0 || dot == fileName.length() - 1) {
			return null;
		}
		return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
	}

	private static String bareType(String mediaType) {
		if (mediaType == null) {
			return null;
		}
		int parameters = mediaType.indexOf(';');
		String bare = (parameters < 0) ? mediaType : mediaType.substring(0, parameters);
		return bare.trim().toLowerCase(Locale.ROOT);
	}
}
