"use client";

import {
  AskAnswer,
  AskComposer,
  AskFailureState,
  AskIdle,
  AskStopped,
  Button,
  askFailureCopy,
} from "@omnidoc/ui";
import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  ASK_STREAM_PATH,
  answerStatus,
  askQuestionFromDraft,
  askRequestBody,
  canSubmitAsk,
  citationHref,
} from "../../lib/ask/ask-navigation";
import { createAskSseParser } from "../../lib/ask/ask-sse";
import {
  failureFromResponse,
  initialAskSessionState,
  isAskBusy,
  reduceAskSession,
  type AskFailure,
  type AskSessionEvent,
  type AskSessionState,
} from "../../lib/ask/ask-stream";
import { AskNoteLink, AskSignInLink } from "./ask-links";

/**
 * The interactive half of `/ask` (F-07).
 *
 * **Streaming is server-driven and the client owns no answer.** The question goes
 * to the same-origin proxy (`/ask/stream`), which re-authorizes the workspace from
 * the session and opens the upstream SSE stream; this component reads that
 * response body frame by frame and applies the pure `reduceAskSession`, so the
 * whole state machine is a function of the stream. There is no client answer
 * cache, and an answer is never written back into the corpus (REC-06).
 *
 * **Stop closes the stream.** Aborting the fetch cancels the request, the proxy
 * sees `request.signal` abort and drops the upstream connection, and the reducer
 * moves to `stopped` — partial text, never a `completed` outcome
 * (`docs/api/ask-sse.md`).
 *
 * Focus never moves on its own: §1.6 requires the composer to keep focus during
 * generation, so nothing here calls `.focus()`.
 */
export type AskClientProps = { workspaceId: string };

export function AskClient({ workspaceId }: AskClientProps) {
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState<AskSessionState>(
    initialAskSessionState,
  );
  const inFlight = useRef<AbortController | null>(null);

  const dispatch = useCallback(
    (update: (state: AskSessionState) => AskSessionState) => {
      setSession(update);
    },
    [],
  );

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = askQuestionFromDraft(rawQuestion);
      if (question.length === 0) {
        return;
      }

      // A new question replaces any stream still running.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      dispatch((state) =>
        reduceAskSession(state, { type: "submit", question }),
      );

      const apply = (event: AskSessionEvent) =>
        dispatch((state) => reduceAskSession(state, event));
      const fail = (failure: AskFailure) =>
        apply({ type: "transport_failure", failure });

      let response: Response;
      try {
        response = await fetch(ASK_STREAM_PATH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(askRequestBody({ question, workspaceId })),
          signal: controller.signal,
        });
      } catch {
        // An abort is a user Stop, not a failure; the reducer already moved on.
        if (!controller.signal.aborted) {
          fail({ class: "unavailable" });
        }
        return;
      }

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => undefined);
        fail(failureFromResponse(response.status, body));
        return;
      }
      if (!response.body) {
        fail({ class: "unavailable" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createAskSseParser();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          for (const result of parser.push(
            decoder.decode(value, { stream: true }),
          )) {
            apply({ type: "frame", result });
          }
        }
        for (const result of parser.push(decoder.decode())) {
          apply({ type: "frame", result });
        }
        for (const result of parser.flush()) {
          apply({ type: "frame", result });
        }
      } catch {
        if (!controller.signal.aborted) {
          fail({ class: "stream_error" });
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        if (inFlight.current === controller) {
          inFlight.current = null;
        }
      }
    },
    [dispatch, workspaceId],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitAsk({ draft, status: session.status })) {
      return;
    }
    void ask(draft);
  }

  function handleStop() {
    inFlight.current?.abort();
    inFlight.current = null;
    dispatch((state) => reduceAskSession(state, { type: "stop" }));
  }

  function handleRetry() {
    void ask(session.question);
  }

  const answer = answerStatus(session.status);
  const showAnswer =
    answer !== null &&
    (session.answer !== null ||
      session.claims.length > 0 ||
      answer === "generating" ||
      answer === "streaming");
  const recovery = session.failure
    ? askFailureCopy(session.failure).recovery
    : "retry";
  const busy = isAskBusy(session.status);

  return (
    <div className="flex flex-col gap-6">
      <AskComposer
        value={draft}
        onValueChange={setDraft}
        onSubmit={handleSubmit}
        onStop={handleStop}
        busy={busy}
      />

      {session.status === "idle" ? <AskIdle /> : null}

      {showAnswer && answer ? (
        <AskAnswer
          status={answer}
          claims={session.claims}
          answer={session.answer}
          hrefForCitation={citationHref}
          linkComponent={AskNoteLink}
        />
      ) : null}

      {session.status === "stopped" ? <AskStopped /> : null}

      {session.status === "failed" && session.failure ? (
        <AskFailureState failure={session.failure}>
          {recovery === "session" ? (
            <AskSignInLink />
          ) : (
            <Button type="button" variant="outline" onClick={handleRetry}>
              Try again
            </Button>
          )}
        </AskFailureState>
      ) : null}
    </div>
  );
}
