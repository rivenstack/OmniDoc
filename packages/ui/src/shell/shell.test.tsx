import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "../components/sidebar";
import {
  CommandPalette,
  MobileTabBar,
  PageHeader,
  SkipLink,
  WORKSPACE_FORBIDDEN_MESSAGE,
  WorkspaceSwitcher,
  useCommandPalette,
  type Workspace,
} from "./index";

afterEach(cleanup);

const workspaces: Workspace[] = [
  { id: "w1", tenantId: "t1", name: "My workspace" },
  { id: "s1", tenantId: "t0", name: "Sample — public demo notes" },
];

function renderSwitcher(props: Partial<React.ComponentProps<typeof WorkspaceSwitcher>> = {}) {
  return render(
    <SidebarProvider>
      <WorkspaceSwitcher
        workspaces={workspaces}
        currentWorkspaceId="w1"
        sampleWorkspaceIds={["s1"]}
        {...props}
      />
    </SidebarProvider>,
  );
}

describe("SkipLink", () => {
  it("is a hidden-until-focused link to the content region", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe("#content");
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("accepts a custom target and label", () => {
    render(<SkipLink href="#main">Skip navigation</SkipLink>);
    const link = screen.getByRole("link", { name: "Skip navigation" });
    expect(link.getAttribute("href")).toBe("#main");
  });
});

describe("PageHeader", () => {
  it("marks a focusable heading for route-change focus", () => {
    render(<PageHeader title="Inbox" description="Unfiled notes." />);
    const heading = screen.getByRole("heading", { name: "Inbox", level: 1 });
    expect(heading.getAttribute("data-slot")).toBe("page-heading");
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("Unfiled notes.")).toBeTruthy();
  });
});

describe("MobileTabBar", () => {
  it("renders a labelled navigation landmark and marks the active tab", () => {
    render(
      <MobileTabBar
        items={[
          { href: "/inbox", label: "Inbox", active: true },
          { href: "/ask", label: "Ask" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Inbox" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Ask" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("WorkspaceSwitcher", () => {
  it("shows the current workspace and stays honest at n≈1", () => {
    renderSwitcher();
    expect(screen.getByText("My workspace")).toBeTruthy();
    expect(screen.getByText("Solo workspace")).toBeTruthy();
  });

  it("collapses to a single mark when showLabel is false", () => {
    renderSwitcher({ showLabel: false });
    // The name stays in the DOM for accessibility but is visually hidden.
    expect(screen.getByText("Solo workspace").closest("span.hidden")).toBeTruthy();
    // The mark's initial is shown.
    expect(screen.getByText("M")).toBeTruthy();
    // The trigger keeps an accessible name even with the label hidden.
    expect(
      screen.getByRole("button", { name: "Workspace: My workspace" }),
    ).toBeTruthy();
  });

  it("renders the generic forbidden denial and never a chooser", () => {
    renderSwitcher({ forbidden: true });
    expect(screen.getByText(WORKSPACE_FORBIDDEN_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the selector and separates the labelled sample corpus", () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole("button"));
    // Group label ("Sample") and the item badge ("Sample") both render.
    expect(screen.getAllByText("Sample").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Public demo notes")).toBeTruthy();
  });

  it("reports the picked workspace id when an item is clicked", () => {
    // Regression: the items were wired with `onSelect`, which is a Radix prop.
    // On Base UI `Menu.Item` the handler is `onClick`, so the dead `onSelect`
    // silently swallowed every pick and the switcher never changed anything.
    const onSelect = vi.fn();
    renderSwitcher({ onSelect });

    fireEvent.click(screen.getByRole("button"));
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(2);

    fireEvent.click(items[1]);
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("opens beside the sidebar, not below the trigger", () => {
    // The trigger sits in the sidebar header, so a bottom-aligned popup opens
    // over the nav and clips against the sidebar edge. It mirrors `NavUser`:
    // `side="right"`, `align="end"` on desktop.
    renderSwitcher();
    fireEvent.click(screen.getByRole("button"));

    const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(popup?.getAttribute("data-side")).toBe("right");
    expect(popup?.getAttribute("data-align")).toBe("end");
  });
});

describe("useCommandPalette", () => {
  function Harness() {
    const { open, onOpenChange, openPalette } = useCommandPalette();
    return (
      <div>
        <button type="button" onClick={openPalette}>
          Open
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
        <span data-testid="state">{open ? "open" : "closed"}</span>
      </div>
    );
  }

  it("toggles on Cmd/Ctrl+K and on the programmatic opener", () => {
    render(<Harness />);
    expect(screen.getByTestId("state").textContent).toBe("closed");

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("state").textContent).toBe("open");

    fireEvent.keyDown(window, { key: "K", ctrlKey: true });
    expect(screen.getByTestId("state").textContent).toBe("closed");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("state").textContent).toBe("open");
  });
});

describe("CommandPalette", () => {
  it("renders supplied groups with an accessible dialog title", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => undefined}
        groups={[
          {
            heading: "Navigate",
            actions: [{ id: "inbox", label: "Inbox" }],
          },
          {
            heading: "Actions",
            actions: [{ id: "new", label: "New note", shortcut: "⌘N" }],
          },
        ]}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Inbox")).toBeTruthy();
    expect(screen.getByText("New note")).toBeTruthy();
    expect(screen.getByText("⌘N")).toBeTruthy();
  });
});
