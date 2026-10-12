"use client";

import { IconArrowUp, IconPlayerStopFilled } from "@tabler/icons-react";
import type { FormEventHandler, KeyboardEvent } from "react";
import { Field, FieldLabel } from "../components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../components/input-group";
import { cn } from "../lib/utils";

/**
 * Ask block — `AskComposer`, the question box.
 *
 * `@user` chose a **chat-style composer** (2026-10-12): a textarea that accepts
 * the question, with an arrow send button, and a Stop pill in the same slot while
 * the answer streams.
 *
 * Behaviour that is not a look choice:
 *
 * - **It is a real `<form>` with a real submit control.** Enter submits, the send
 *   button is `type="submit"`, and the input is labelled — so the composer is
 *   operable by keyboard alone and is not a click-only affordance
 *   (`quality/ui-qa-checklist.md` §1.1). The question carries no hidden state.
 * - **Enter sends, Shift+Enter adds a line.** The chat affordance users expect,
 *   without taking the newline away.
 * - **The field is never disabled while the answer streams.** §1.6 requires
 *   focus to stay under the user's control during generation — the composer must
 *   not go dead or steal focus — so the send control is *swapped* for Stop
 *   instead of disabling the whole form.
 * - **Stop is a real button with a name**, reachable by keyboard and tab order
 *   like any other control (§1.5), never a hover-only affordance.
 *
 * The composer owns no request logic: it reports submit / stop / change to the
 * caller, which owns the streaming session (the port is server-only and the
 * question never reaches the browser's own API origin).
 */
export type AskComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Called when the form is submitted (send button or Enter). */
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Called when the user stops the in-flight answer. */
  onStop: () => void;
  /** True while a request is in flight; the send control becomes Stop. */
  busy?: boolean;
  /** Disables sending (e.g. no workspace). The field stays editable. */
  disabled?: boolean;
  /** `<label>` text — the accessible name of the field. */
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  stopLabel?: string;
  id?: string;
  className?: string;
};

export function AskComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  busy = false,
  disabled = false,
  label = "Ask a question about your notes",
  placeholder = "Ask your notes\u2026",
  submitLabel = "Send",
  stopLabel = "Stop",
  id = "ask-question",
  className,
}: AskComposerProps) {
  const canSend = !busy && !disabled && value.trim().length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    // An IME composition's Enter commits the candidate, not the question.
    if (event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form || !canSend) {
      return;
    }
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    }
  }

  return (
    <form
      aria-busy={busy}
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-2", className)}
    >
      <Field className="gap-1.5">
        <FieldLabel
          htmlFor={id}
          className="text-sm font-normal text-muted-foreground"
        >
          {label}
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={id}
            name="question"
            rows={1}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="send"
          />
          <InputGroupAddon align="block-end" className="justify-end">
            {busy ? (
              <InputGroupButton
                type="button"
                size="sm"
                variant="outline"
                onClick={onStop}
              >
                <IconPlayerStopFilled aria-hidden="true" className="size-3.5" />
                {stopLabel}
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                aria-label={submitLabel}
                disabled={!canSend}
              >
                <IconArrowUp aria-hidden="true" className="size-4" />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  );
}
