import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Answer, Citation } from "@omnidoc/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AskAnswer } from "./ask-answer";
import { AskCitations } from "./ask-citations";
import { AskComposer } from "./ask-composer";

/**
 * Rendered Ask blocks — the composer, the streaming answer, and the citations.
 *
 * The state blocks live beside them in `ask-states.test.tsx`. Behaviour that is
 * a release gate is asserted directly: a labelled real form, Enter to send, Stop
 * reachable, `bdi` isolation and sanitized previews, citation accessible names,
 * and the single-announcement streaming rule.
 */

afterEach(cleanup);

function citation(overrides: Partial<Citation> = {}): Citation {
  return {
    noteId: "ws_mine_launch",
    versionId: "ws_mine_launch_v1",
    chunkId: "ws_mine_launch_chunk1",
    anchor: { startOffset: 0, endOffset: 51 },
    preview: "The launch review is on Tuesday.",
    ...overrides,
  };
}

function answer(overrides: Partial<Answer> = {}): Answer {
  return {
    outcome: "supported",
    text: "The launch review is on Tuesday.",
    citations: [citation()],
    ...overrides,
  };
}

const hrefForCitation = (c: Citation) => `/notes/${c.noteId}`;

describe("AskComposer", () => {
  it("renders a labelled question box in a real form with a named send control", () => {
    render(
      <AskComposer
        value=""
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        onStop={() => undefined}
      />,
    );

    const textarea = screen.getByRole("textbox", {
      name: "Ask a question about your notes",
    });
    expect(textarea.getAttribute("name")).toBe("question");
    // The send control is an icon button, so its accessible name is the point.
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(textarea.closest("form")).not.toBeNull();
  });

  it("reports every keystroke and submits on Enter", () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    render(
      <AskComposer
        value="When is the launch review?"
        onValueChange={onValueChange}
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );

    const textarea = screen.getByRole("textbox", {
      name: "Ask a question about your notes",
    });
    fireEvent.change(textarea, { target: { value: "When?" } });
    expect(onValueChange).toHaveBeenCalledWith("When?");

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not send on Shift+Enter or from an empty draft", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const { unmount } = render(
      <AskComposer
        value="line one"
        onValueChange={() => undefined}
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );

    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
    unmount();

    render(
      <AskComposer
        value="   "
        onValueChange={() => undefined}
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("swaps send for a named Stop control while busy and keeps the field usable", () => {
    const onStop = vi.fn();
    render(
      <AskComposer
        value="When?"
        onValueChange={() => undefined}
        onSubmit={() => undefined}
        onStop={onStop}
        busy
      />,
    );

    const stop = screen.getByRole("button", { name: "Stop" });
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);

    // Focus must stay under the user's control during generation (§1.6): the
    // field is not disabled while the answer streams.
    expect(screen.getByRole("textbox").hasAttribute("disabled")).toBe(false);
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });
});

describe("AskAnswer", () => {
  it("announces generating once and ready once, never token by token", () => {
    const { rerender, container } = render(
      <AskAnswer
        status="generating"
        claims={[]}
        answer={null}
        hrefForCitation={hrefForCitation}
      />,
    );
    const statuses = () =>
      Array.from(container.querySelectorAll('[role="status"]')).map(
        (node) => node.textContent,
      );

    expect(statuses()).toEqual(["Answer generating"]);

    // Appending claims must not change the announcement.
    rerender(
      <AskAnswer
        status="streaming"
        claims={[{ text: "A claim.", citations: [] }]}
        answer={null}
        hrefForCitation={hrefForCitation}
      />,
    );
    expect(statuses()).toEqual(["Answer generating"]);
    expect(screen.getByText("A claim.")).toBeTruthy();

    rerender(
      <AskAnswer
        status="completed"
        claims={[{ text: "A claim.", citations: [] }]}
        answer={answer({ text: "The launch review is on Tuesday." })}
        hrefForCitation={hrefForCitation}
      />,
    );
    expect(statuses()).toEqual(["Answer ready"]);
  });

  it("renders answer prose through the sanitized markdown path", () => {
    const hostile = answer({
      text: "The code is `pgvector`.\n\n<script>window.__pwned = true</script>",
      citations: [],
    });
    const { container } = render(
      <AskAnswer
        status="completed"
        claims={[]}
        answer={hostile}
        hrefForCitation={hrefForCitation}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("pgvector")).toBeTruthy();
  });

  it("shows a neutral notice for a refusal and never danger styling", () => {
    render(
      <AskAnswer
        status="completed"
        claims={[]}
        answer={answer({
          outcome: "no_supported_answer",
          text: "No supported answer.",
          citations: [],
        })}
        hrefForCitation={hrefForCitation}
      />,
    );

    expect(
      screen.getByText(/No supported answer: your notes do not contain enough/),
    ).toBeTruthy();
    expect(screen.getByText(/honest result, not an error/)).toBeTruthy();
  });

  it("marks a supported answer with a quiet cited confirmation", () => {
    render(
      <AskAnswer
        status="completed"
        claims={[]}
        answer={answer()}
        hrefForCitation={hrefForCitation}
      />,
    );
    expect(screen.getByText("Cited to your notes")).toBeTruthy();
  });

  it("shows citations collected from streamed claims before completion", () => {
    const { container } = render(
      <AskAnswer
        status="streaming"
        claims={[{ text: "A claim.", citations: [citation()] }]}
        answer={null}
        hrefForCitation={hrefForCitation}
      />,
    );
    expect(container.querySelector("summary")?.getAttribute("aria-label")).toBe(
      "Citation 1",
    );
  });
});

describe("AskCitations", () => {
  it("renders numbered, named, expandable chips that link to the cited note", () => {
    const { container } = render(
      <AskCitations
        citations={[
          citation(),
          citation({
            noteId: "ws_mine_conflict",
            chunkId: "ws_mine_conflict_chunk1",
          }),
        ]}
        hrefForCitation={hrefForCitation}
      />,
    );

    // A real accessible name, not a bare number (§2.1).
    const summaries = container.querySelectorAll("summary");
    expect(summaries[0].getAttribute("aria-label")).toBe("Citation 1");
    expect(summaries[1].getAttribute("aria-label")).toBe("Citation 2");

    // Native disclosure: keyboard-operable with no client state (§1.5).
    expect(container.querySelectorAll("details")).toHaveLength(2);

    const links = screen.getAllByRole("link", { name: /Open note/i });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/notes/ws_mine_launch",
      "/notes/ws_mine_conflict",
    ]);
  });

  it("isolates and sanely renders the server preview and labels a sample citation", () => {
    const { container } = render(
      <AskCitations
        citations={[
          citation({
            preview: "Use `pgvector` — <script>window.__pwned = true</script>",
            corpusOwnership: "sample",
            updatedAt: "2026-09-20T12:00:00Z",
          }),
        ]}
        hrefForCitation={hrefForCitation}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Sample")).toBeTruthy();
    expect(container.querySelector("bdi")).not.toBeNull();
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-09-20T12:00:00Z",
    );
  });

  it("renders nothing for an empty citation list", () => {
    const { container } = render(
      <AskCitations citations={[]} hrefForCitation={hrefForCitation} />,
    );
    expect(container.textContent).toBe("");
  });
});
