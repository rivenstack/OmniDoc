import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  NoteList,
  formatUpdatedAt,
  type OrganizeLinkProps,
  type OrganizeNote,
} from "./index";

afterEach(cleanup);

const notes: OrganizeNote[] = [
  {
    id: "n1",
    title: "Ergonomics",
    updatedAt: "2026-09-25T10:00:00Z",
  },
  {
    id: "n2",
    title: "Ordering a large team",
    updatedAt: "2026-09-26T10:00:00Z",
    corpusOwnership: "sample",
  },
];

function renderList(props: Partial<React.ComponentProps<typeof NoteList>> = {}) {
  return render(
    <NoteList
      notes={notes}
      hrefForNote={(note) => `/notes/${note.id}`}
      {...props}
    />,
  );
}

describe("NoteList", () => {
  it("renders a real list with one link per note, routed by the app", () => {
    renderList();

    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: /Ergonomics/ }).getAttribute("href"),
    ).toBe("/notes/n1");
    expect(
      screen.getByRole("link", { name: /Ordering a large team/ }).getAttribute(
        "href",
      ),
    ).toBe("/notes/n2");
  });

  it("keeps rows keyboard-operable: real anchors, focusable, visible focus ring", () => {
    renderList();
    const row = screen.getByRole("link", { name: /Ergonomics/ });

    expect(row.tagName).toBe("A");
    expect(row.getAttribute("tabindex")).toBeNull();
    expect(row.getAttribute("onclick")).toBeNull();
    expect(row.className).toContain("focus-visible:ring-2");
    expect(row.className).toContain("focus-visible:ring-ring");
  });

  it("isolates the title as UGC and contains long titles", () => {
    const { container } = renderList({
      notes: [
        {
          id: "n3",
          title: "averyveryverylongunbrokentitlethatwouldotherwiseoverflowthenarrowviewport",
          updatedAt: "2026-09-25T10:00:00Z",
        },
      ],
    });

    const isolated = container.querySelector("bdi");
    expect(isolated?.textContent).toBe(
      "averyveryverylongunbrokentitlethatwouldotherwiseoverflowthenarrowviewport",
    );

    const titleLine = isolated?.parentElement;
    expect(titleLine?.className).toContain("truncate");
    expect(titleLine?.className).toContain("min-w-0");
    expect(screen.getByRole("listitem").className).toContain("min-w-0");
    expect(screen.getByRole("link").className).toContain("min-w-0");
  });

  it("shows the updated time from the contract and formats it from the locale source", () => {
    renderList();
    const time = screen.getAllByRole("listitem")[0]?.querySelector("time");

    expect(time?.getAttribute("datetime")).toBe("2026-09-25T10:00:00Z");
    expect(time?.textContent).toContain("2026");
  });

  it("labels only a server-declared sample note", () => {
    renderList();

    const sampleRow = screen.getByRole("link", {
      name: /Ordering a large team/,
    });
    expect(sampleRow.textContent).toContain("Sample");

    const mineRow = screen.getByRole("link", { name: /Ergonomics/ });
    expect(mineRow.textContent).not.toContain("Sample");
  });

  it("does not claim any indexing state the contract does not return", () => {
    renderList();

    expect(
      screen.queryByText(/\b(indexed|indexing|pending|ready|failed|partial)\b/i),
    ).toBeNull();
  });

  it("falls back to Untitled for an empty title without inventing a name", () => {
    renderList({
      notes: [{ id: "n4", title: "   ", updatedAt: "2026-09-25T10:00:00Z" }],
    });

    expect(screen.getByRole("link").textContent).toContain("Untitled");
  });

  it("offers Load more from the server cursor and First page for older pages", () => {
    renderList({
      loadMoreHref: "/inbox?cursor=c1",
      firstPageHref: "/inbox",
    });

    expect(
      screen.getByRole("link", { name: "Load more" }).getAttribute("href"),
    ).toBe("/inbox?cursor=c1");
    expect(
      screen.getByRole("link", { name: "First page" }).getAttribute("href"),
    ).toBe("/inbox");
  });

  it("omits pagination controls when the server returned no next cursor", () => {
    renderList();

    expect(screen.queryByRole("link", { name: "Load more" })).toBeNull();
    expect(screen.queryByRole("link", { name: "First page" })).toBeNull();
  });

  it("lets the app inject client navigation and receives the row classes", () => {
    function AppLink({ href, className, children }: OrganizeLinkProps) {
      return (
        <a data-app-link="true" href={href} className={className}>
          {children}
        </a>
      );
    }

    renderList({ linkComponent: AppLink });

    const row = screen.getByRole("link", { name: /Ergonomics/ });
    expect(row.getAttribute("data-app-link")).toBe("true");
    expect(row.className).toContain("min-w-0");
    expect(row.className).toContain("focus-visible:ring-2");
  });
});

describe("formatUpdatedAt", () => {
  it("formats an ISO timestamp for the locale", () => {
    expect(
      formatUpdatedAt("2026-09-25T10:00:00Z", { timeZone: "UTC" }),
    ).toBe("Sep 25, 2026");
  });

  it("returns an unparseable value verbatim instead of inventing a date", () => {
    expect(formatUpdatedAt("not-a-date")).toBe("not-a-date");
  });
});
