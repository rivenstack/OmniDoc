package com.omnidoc.api.adapters.ingestion.parser;

/**
 * The single parser adapter port (architecture.md §5.2.1 §6). Everything Tika and
 * commonmark lives behind this interface and inside this package; an ArchUnit rule keeps
 * those libraries out of the domain, the HTTP surface, and the rest of the adapters.
 */
public interface ImportParser {

	/**
	 * Resolve the effective media type for a declaration plus bytes, or reject.
	 *
	 * @return the allowlisted type when the declaration/extension is allowed <em>and</em>
	 *     content detection agrees; empty when it is not
	 */
	java.util.Optional<ImportMediaType> resolveType(String declaredMediaType, String fileName, byte[] bytes);

	/**
	 * Extract a TipTap document from imported bytes.
	 *
	 * @throws ImportParseException when openable-but-corrupt bytes cannot be extracted
	 */
	ParsedDocument parse(byte[] bytes, ImportMediaType mediaType, String fileName) throws ImportParseException;
}
