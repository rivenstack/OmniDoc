import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WORKSPACE_FORBIDDEN_MESSAGE } from "../shell/denials";
import {
  NoteListDenied,
  NoteListEmpty,
  NoteListSkeleton,
  NoteListUnavailable,
} from "./index";

afterEach(cleanup);

describe("NoteListEmpty", () => {
  it("answers what / why / one primary next, without requiring filing", () => {
    render(
      <NoteListEmpty>
        <a href="/notes/new">New note</a>
      </NoteListEmpty>,
    );

    expect(screen.getByText("No notes yet")).toBeTruthy();
    expect(screen.getByText(/nothing has to be filed or tagged/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "New note" }).getAttribute("href"),
    ).toBe("/notes/new");
  });
});

describe("NoteListUnavailable", () => {
  it("is 'we could not ask', never 'there are no notes'", () => {
    render(<NoteListUnavailable />);

    expect(
      screen.getByText(/can.t reach your notes right now/i),
    ).toBeTruthy();
    expect(screen.getByText(/reload the page to try again/i)).toBeTruthy();
    expect(screen.queryByText(/no notes/i)).toBeNull();
    expect(screen.queryByText(WORKSPACE_FORBIDDEN_MESSAGE)).toBeNull();
  });
});

describe("NoteListDenied", () => {
  it("renders the one generic workspace denial, with no existence hints", () => {
    render(<NoteListDenied />);

    expect(screen.getByText(WORKSPACE_FORBIDDEN_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/deleted/i)).toBeNull();
    expect(screen.queryByText(/no notes/i)).toBeNull();
    expect(screen.queryByText(/reload the page/i)).toBeNull();
  });
});

describe("NoteListSkeleton", () => {
  it("announces loading once and hides the placeholder rows from AT", () => {
    const { container } = render(<NoteListSkeleton rows={3} />);

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Loading notes")).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.querySelector("ul")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
