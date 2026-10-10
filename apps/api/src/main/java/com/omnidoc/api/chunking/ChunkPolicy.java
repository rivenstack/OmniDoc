package com.omnidoc.api.chunking;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;

/**
 * The frozen chunking policy tuple (architecture.md §5.2.1 §2). Stored with every
 * {@code chunk_sets} row: same version + same tuple is an idempotent no-op, a different
 * tuple is rejected in B-05b rather than re-chunked in place.
 *
 * <p>Params are frozen: {@code maxChars 1200}, {@code softMinChars 300},
 * {@code headingBreak true}, {@code overlapChars 0}. {@link #frozen} is the only tuple
 * B-05b writes; the record stays parameterised so a future re-index job can compare an
 * old row's tuple without a schema change.
 */
public record ChunkPolicy(
	String projectorId,
	String chunkerId,
	int maxChars,
	int softMinChars,
	boolean headingBreak,
	int overlapChars) {

	public static final String CHUNKER_ID = "omni-blockpack-v1";

	public static final int MAX_CHARS = 1200;
	public static final int SOFT_MIN_CHARS = 300;
	public static final boolean HEADING_BREAK = true;
	public static final int OVERLAP_CHARS = 0;

	public ChunkPolicy {
		Objects.requireNonNull(projectorId, "projectorId");
		Objects.requireNonNull(chunkerId, "chunkerId");
		if (maxChars <= 0 || softMinChars < 0 || softMinChars > maxChars || overlapChars != 0) {
			throw new IllegalArgumentException("unsupported chunk policy parameters");
		}
	}

	public static ChunkPolicy frozen(String projectorId) {
		return new ChunkPolicy(
			projectorId, CHUNKER_ID, MAX_CHARS, SOFT_MIN_CHARS, HEADING_BREAK, OVERLAP_CHARS);
	}

	/** Canonical, order-stable rendering of the params — hashed into {@code params_hash}. */
	public String canonicalParams() {
		return "maxChars=%d;softMinChars=%d;headingBreak=%s;overlapChars=%d"
			.formatted(this.maxChars, this.softMinChars, this.headingBreak, this.overlapChars);
	}

	public String paramsHash() {
		return sha256Hex(canonicalParams());
	}

	public boolean sameAs(String projectorId, String chunkerId, String paramsHash) {
		return this.projectorId.equals(projectorId)
			&& this.chunkerId.equals(chunkerId)
			&& paramsHash().equals(paramsHash);
	}

	public static String sha256Hex(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is required", ex);
		}
	}
}
