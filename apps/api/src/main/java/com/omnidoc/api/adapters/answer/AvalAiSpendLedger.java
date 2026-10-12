package com.omnidoc.api.adapters.answer;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;

/**
 * Shared local/demo reservation ledger. Each outbound request reserves $0.10
 * of the user's combined $5 test cap before I/O; checkpoint calls use this
 * same file. Actual account charges must also be reconciled by the operator.
 */
public final class AvalAiSpendLedger {

	private static final int MAX_RESERVATIONS = 50;
	private final Path path;

	public AvalAiSpendLedger(Path path) {
		this.path = path;
	}

	public PortFailure reserve() {
		if (this.path == null || !Files.isRegularFile(this.path)
			|| Files.isSymbolicLink(this.path)) {
			return unavailable();
		}
		try {
			if (!Files.getPosixFilePermissions(this.path).equals(
				Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE))) {
				return unavailable();
			}
			try (FileChannel channel = FileChannel.open(this.path,
				StandardOpenOption.READ, StandardOpenOption.WRITE);
				FileLock ignored = channel.lock()) {
				if (channel.size() > 16) {
					return unavailable();
				}
				ByteBuffer buffer = ByteBuffer.allocate((int) channel.size());
				channel.read(buffer, 0);
				String raw = new String(buffer.array(), StandardCharsets.UTF_8).trim();
				int used = Integer.parseInt(raw);
				if (used < 0 || used > MAX_RESERVATIONS) {
					return unavailable();
				}
				if (used == MAX_RESERVATIONS) {
					return PortFailure.forMode(PortFailure.Code.QUOTA_EXHAUSTED,
						"Local AvalAI test budget is exhausted.", RuntimeMode.OPERATOR_FREE_TIER);
				}
				byte[] next = (Integer.toString(used + 1) + "\n").getBytes(StandardCharsets.UTF_8);
				channel.truncate(0);
				channel.write(ByteBuffer.wrap(next), 0);
				channel.force(true);
				return null;
			}
		}
		catch (IOException | NumberFormatException | UnsupportedOperationException ex) {
			return unavailable();
		}
	}

	private static PortFailure unavailable() {
		return PortFailure.forMode(PortFailure.Code.MODE_FORBIDDEN,
			"Local AvalAI budget ledger is unavailable.", RuntimeMode.OPERATOR_FREE_TIER);
	}
}
