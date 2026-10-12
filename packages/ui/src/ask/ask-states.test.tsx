import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  AskFailureState,
  AskIdle,
  AskOutcomeNotice,
  AskStopped,
  AskSupportedMarker,
  askFailureCopy,
  askModeLabel,
  type AskFailure,
  type AskFailureClass,
} from "./ask-states";

afterEach(cleanup);

const ALL_CLASSES: AskFailureClass[] = [
  "denied",
  "mode_forbidden",
  "validation",
  "quota_exhausted",
  "unavailable",
  "unauthenticated",
  "truncated",
  "stream_error",
  "malformed",
];

describe("AskIdle", () => {
  it("invites a question without framing it as an error", () => {
    render(<AskIdle />);
    expect(screen.getByText("Ask your notes")).toBeTruthy();
    expect(
      screen.getByText(/honest “no supported answer” is a real result/),
    ).toBeTruthy();
  });
});

describe("AskStopped", () => {
  it("states that the partial text is not a finished answer", () => {
    render(<AskStopped />);
    expect(screen.getByText("Stopped")).toBeTruthy();
    expect(
      screen.getByText(/partial and is not a\s+finished, cited answer/),
    ).toBeTruthy();
  });
});

describe("askFailureCopy", () => {
  it("gives every failure class its own title", () => {
    const titles = new Set<string>();
    for (const failure of ALL_CLASSES.map((value): AskFailure => ({
      class: value,
    }))) {
      titles.add(askFailureCopy(failure).title);
    }
    expect(titles.size).toBe(ALL_CLASSES.length);
  });

  it("names the mode and says mock still answers for gated live modes", () => {
    const copy = askFailureCopy({
      class: "quota_exhausted",
      mode: "operator_free_tier",
    });
    expect(copy.description).toContain("operator-funded live demo");
    expect(copy.description.toLowerCase()).toContain("sample (mock)");
  });

  it("routes an expired session to signing in again", () => {
    expect(askFailureCopy({ class: "unauthenticated" }).recovery).toBe(
      "session",
    );
    expect(askFailureCopy({ class: "truncated" }).recovery).toBe("retry");
  });
});

describe("askModeLabel", () => {
  it("names the three runtime modes and ignores an unknown one", () => {
    expect(askModeLabel("mock")).toBe("the sample (mock) mode");
    expect(askModeLabel("operator_free_tier")).toBe(
      "the operator-funded live demo",
    );
    expect(askModeLabel("customer_key")).toBe("your own key");
    expect(askModeLabel(undefined)).toBeUndefined();
  });
});

describe("AskFailureState", () => {
  it("renders the generic denial for a forbidden workspace", () => {
    render(<AskFailureState failure={{ class: "denied" }} />);
    expect(
      screen.getByText("You don't have access to that workspace."),
    ).toBeTruthy();
    expect(
      screen.getByText(/may not exist, or it may not be shared/),
    ).toBeTruthy();
  });

  it("renders the server detail as text when present", () => {
    render(
      <AskFailureState
        failure={{
          class: "validation",
          detail: "The question must be a nonempty string.",
        }}
      />,
    );
    expect(
      screen.getByText("The question must be a nonempty string."),
    ).toBeTruthy();
  });

  it("can hide the server detail (the page-level shell state)", () => {
    render(
      <AskFailureState
        failure={{ class: "unavailable", detail: "server said so" }}
        showDetail={false}
      />,
    );
    expect(screen.queryByText("server said so")).toBeNull();
  });

  it("renders the caller's recovery action", () => {
    render(
      <AskFailureState failure={{ class: "unavailable" }}>
        <button type="button">Try again</button>
      </AskFailureState>,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("AskOutcomeNotice", () => {
  it("renders nothing for a fully supported answer", () => {
    const { container } = render(<AskOutcomeNotice outcome="supported" />);
    expect(container.textContent).toBe("");
  });

  it("uses a neutral treatment for every other outcome", () => {
    for (const outcome of [
      "partial",
      "no_supported_answer",
      "conflict",
      "refused_policy",
    ] as const) {
      const { container, unmount } = render(
        <AskOutcomeNotice outcome={outcome} />,
      );
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
      // Refusal and partial support are successful answers, never danger styling.
      expect(container.querySelector(".text-destructive")).toBeNull();
      unmount();
    }
  });
});

describe("AskSupportedMarker", () => {
  it("confirms a cited answer in one quiet line", () => {
    render(<AskSupportedMarker />);
    expect(screen.getByText("Cited to your notes")).toBeTruthy();
  });
});
