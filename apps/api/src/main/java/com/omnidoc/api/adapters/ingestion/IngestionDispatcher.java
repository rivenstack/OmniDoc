package com.omnidoc.api.adapters.ingestion;

import java.util.Objects;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Indirection between "a job row was written" and "the runner should look at the queue".
 *
 * <p>Two reasons it exists rather than injecting the worker directly:
 *
 * <ul>
 *   <li>The notify must fire <em>after</em> the enqueue transaction commits
 *       (architecture.md §5.2.1 §4) — otherwise the runner can claim a row its own
 *       transaction has not made visible yet.</li>
 *   <li>The worker needs {@code NotesPort}, and the notes adapter needs to enqueue
 *       rechunk jobs, so a direct dependency would be circular.</li>
 * </ul>
 *
 * <p>A dispatch is only ever a hint. The {@code @Scheduled} sweeper picks up anything a
 * missed or failed dispatch left behind, so losing one is a latency issue, never a lost
 * job.
 */
public class IngestionDispatcher {

	private volatile Runnable target = () -> { };

	public void bind(Runnable target) {
		this.target = Objects.requireNonNull(target, "target");
	}

	/**
	 * Request a dispatch once the current transaction commits. Falls back to an
	 * immediate dispatch when called outside a transaction.
	 */
	public void dispatchAfterCommit() {
		if (!TransactionSynchronizationManager.isSynchronizationActive()) {
			dispatchNow();
			return;
		}
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				dispatchNow();
			}
		});
	}

	private void dispatchNow() {
		try {
			this.target.run();
		}
		catch (RuntimeException ex) {
			// Swallowed on purpose: the sweeper is the guarantee, not this hint.
		}
	}
}
