package com.omnidoc.api.adapters.ingestion.parser;

/**
 * Bytes passed the allowlist and detection but could not be extracted — the
 * {@code unsupported_type} terminal failure in architecture.md §5.2.1 §6.
 *
 * <p>Deliberately a neutral exception type: the Tika exception never escapes this
 * package, and the message never carries document content.
 */
public class ImportParseException extends Exception {

	private static final long serialVersionUID = 1L;

	public ImportParseException(String message, Throwable cause) {
		super(message, cause);
	}

	public ImportParseException(String message) {
		super(message);
	}
}
