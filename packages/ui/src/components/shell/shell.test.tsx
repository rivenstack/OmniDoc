import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../providers";
import {
  AppShell,
  CommandPalette,
  ContentRegion,
  ContentRegionRetry,
  MemberRow,
  MembersPanel,
  MobileTabBar,
  PageHeader,
  Sidebar,
  SidebarNavItem,
  SkipLink,
  SoloWorkspaceBadge,
  ThemeToggle,
  TopBar,
  WorkspaceSwitcher,
  WorkspaceSwitcherItem,
  toWorkspaceEntries,
  type CommandPaletteItem,
  type ShellNavItem,
  type WorkspaceEntry,
  type WorkspaceList,
} from "./index";

afterEach(cleanup);

/**
 * Shell + workspace chrome — state coverage for the F-02 copy-in tier.
 *
 * These are behaviour/contract checks, not snapshots (a snapshot would freeze
 * Tailwind class strings and turn every token tune into a false failure — the
 * same rule F-01 set for the primitives tier).
 *
 * The data below is **test-local**: it exists to exercise component states, not
 * to be a fixture authority. `packages/mocks` (S-03) is the single fixture
 * source for the app; `apps/web` deliberately ships none (see the F-02 handoff).
 */

const navItems: ShellNavItem[] = [
  { id: "inbox", label: "Inbox", href: "/inbox", active: true },
  { id: "notes", label: "Notes", href: "/notes" },
  { id: "search", label: "Search", href: "/search" },
  { id: "ask", label: "Ask", href: "/ask" },
];

const personal: WorkspaceEntry = {
  workspace: { id: "ws-personal", tenantId: "t-1", name: "Personal workspace" },
  corpusOwnership: "mine",
};

const sample: WorkspaceEntry = {
  workspace: { id: "ws-sample", tenantId: "t-sample", name: "Demo Corpus" },
  corpusOwnership: "sample",
};

describe("SkipLink", () => {
  it("points at the content-region target and is the first focusable element", () => {
    const { container } = render(
      <AppShell skipLink={<SkipLink />} topBar={<TopBar />}>
        <ContentRegion>
          <PageHeader title="Inbox" />
        </ContentRegion>
      </AppShell>,
    );

    const shell = container.querySelector('[data-slot="app-shell"]');
    expect(shell?.firstElementChild?.getAttribute("data-slot")).toBe(
      "skip-link",
    );

    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe("#main");
    // Hidden until focused — never permanently visible chrome.
    expect(link.className).toContain("sr-only");
  });
});

describe("AppShell", () => {
  it("renders the banner, navigation, and main landmarks", () => {
    render(
      <AppShell
        skipLink={<SkipLink />}
        topBar={<TopBar />}
        sidebar={<Sidebar items={navItems} />}
        mobileTabBar={<MobileTabBar items={navItems} />}
      >
        <ContentRegion>
          <PageHeader title="Inbox" />
        </ContentRegion>
      </AppShell>,
    );

    expect(screen.getByRole("banner").getAttribute("data-slot")).toBe(
      "top-bar",
    );
    // Exactly one banner: `PageHeader` must not add a second one inside `main`.
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    // Sidebar (desktop) + mobile tab bar both provide `navigation`; the mobile
    // bar is display-hidden at `lg` but still present in the DOM.
    expect(screen.getAllByRole("navigation").length).toBe(2);
    expect(screen.getByRole("main").id).toBe("main");
  });

  it("anchors the fixed mobile tab bar to both logical inline edges", () => {
    const { container } = render(
      <AppShell mobileTabBar={<MobileTabBar items={navItems} />}>
        <ContentRegion>
          <PageHeader title="Inbox" />
        </ContentRegion>
      </AppShell>,
    );

    const wrapper = container.querySelector(
      '[data-slot="mobile-tab-bar"]',
    )?.parentElement;
    expect(wrapper).toBeTruthy();

    // A `fixed` element with no inline anchor shrink-wraps its content and sits
    // at its static position, so the bar covers only part of the viewport. The
    // logical pair is `start-0` + `end-0`; `inset-x-0` is physical and
    // `inset-inline-0` is not a Tailwind utility (asserted above).
    expect(wrapper?.className).toContain("start-0");
    expect(wrapper?.className).toContain("end-0");
  });
});

describe("Sidebar / SidebarNavItem", () => {
  it("marks the current route with aria-current and a non-colour signal", () => {
    render(<Sidebar items={navItems} />);

    const current = screen.getByRole("link", { name: /inbox/i });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.hasAttribute("data-active")).toBe(true);
    // `(current page)` text and font weight accompany the tint.
    expect(within(current).getByText("(current page)")).toBeTruthy();
    expect(current.className).toContain("font-medium");

    const other = screen.getByRole("link", { name: "Notes" });
    expect(other.getAttribute("aria-current")).toBeNull();
  });

  it("keeps an accessible name in rail mode without the tooltip", () => {
    render(<Sidebar items={navItems} collapsed />);

    // The name comes from the label text, which is clipped to zero width in the
    // rail but stays in the accessibility tree — so it survives if the tooltip
    // never opens (shell spec §5). It must not be `sr-only`/`aria-hidden`: a
    // removed label would also remove the transition target the collapse
    // animation fades (see the collapse-motion guard below).
    const link = screen.getByRole("link", { name: /inbox/i });
    const label = within(link).getByText("Inbox");
    expect(label.getAttribute("aria-hidden")).toBeNull();
    expect(label.className).toContain("truncate");
    expect(label.className).not.toContain("sr-only");
  });

  it("explains a disabled item in text instead of failing silently", () => {
    render(
      <Sidebar
        items={[
          {
            id: "ask",
            label: "Ask",
            href: "/ask",
            disabled: true,
            disabledReason: "Indexing in progress",
          },
        ]}
      />,
    );

    // Not a link: a gated destination must not be keyboard-reachable as if it
    // were available.
    expect(screen.queryByRole("link", { name: /ask/i })).toBeNull();
    expect(screen.getByText("Indexing in progress")).toBeTruthy();
    expect(
      screen.getByText("Ask").closest("[aria-disabled='true']"),
    ).toBeTruthy();
  });

  it("exposes a labelled rail toggle that reports its expanded state", () => {
    const onCollapsedChange = vi.fn();
    render(<Sidebar items={navItems} onCollapsedChange={onCollapsedChange} />);

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("points the rail toggle at the region it controls", () => {
    render(<Sidebar items={navItems} onCollapsedChange={() => undefined} />);

    const controls = screen
      .getByRole("button", { name: "Collapse sidebar" })
      .getAttribute("aria-controls");

    // `aria-expanded` without a subject is not a disclosure relationship.
    expect(controls).toBeTruthy();
    expect(document.getElementById(String(controls))).toBeTruthy();
  });

  it("changes the rail toggle glyph with the state, not only the name", () => {
    const expanded = render(
      <Sidebar items={navItems} onCollapsedChange={() => undefined} />,
    );
    const expandedGlyph = screen.getByRole("button", {
      name: "Collapse sidebar",
    }).innerHTML;
    expanded.unmount();

    render(
      <Sidebar
        items={navItems}
        collapsed
        onCollapsedChange={() => undefined}
      />,
    );
    const collapsedGlyph = screen.getByRole("button", {
      name: "Expand sidebar",
    }).innerHTML;

    // The only state affordance used to be the accessible name; sighted users
    // saw the same pencil-adjacent glyph in both states.
    expect(collapsedGlyph).not.toBe(expandedGlyph);
  });

  it("renders a loading state without inventing nav items", () => {
    const { container } = render(<Sidebar items={navItems} loading />);

    expect(
      container.querySelector('[data-slot="sidebar-loading"]'),
    ).toBeTruthy();
    expect(screen.queryByRole("navigation")?.querySelectorAll("a").length).toBe(
      0,
    );
  });

  it("is a single standalone item when not inside a Sidebar", () => {
    const notes = navItems[1];
    if (!notes) throw new Error("test fixture is missing the Notes item");
    render(<SidebarNavItem item={notes} />);
    expect(screen.getByRole("link", { name: "Notes" })).toBeTruthy();
  });
});

describe("MobileTabBar", () => {
  it("renders every tab plus the capture action, with an active tab", () => {
    render(
      <MobileTabBar
        items={navItems}
        captureAction={<button type="button">New note</button>}
      />,
    );

    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New note" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /inbox/i }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("TopBar", () => {
  it("renders its slots", () => {
    render(
      <TopBar
        workspaceSlot={<span>Personal workspace</span>}
        searchTrigger={<button type="button">Search</button>}
        actions={<button type="button">Account</button>}
      />,
    );

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByText("Personal workspace")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });

  it("swaps slots for skeletons while loading, keeping the banner", () => {
    render(<TopBar loading workspaceSlot={<span>Personal workspace</span>} />);

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.queryByText("Personal workspace")).toBeNull();
  });

  it("leaves the mode-chip slot inert when no chip is supplied", () => {
    const { container } = render(<TopBar />);
    // F-02 reserves the slot only; F-08 owns the chip and its announcements.
    const actions = container.querySelector('[data-slot="top-bar-actions"]');
    expect(actions?.childElementCount).toBe(0);
  });
});

describe("PageHeader / ContentRegion", () => {
  it("makes the heading the route-change focus target", () => {
    render(<PageHeader id="page-title" title="Inbox" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.id).toBe("page-title");
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  it("renders actions and a corpus chip", () => {
    render(
      <PageHeader
        title="Notes"
        actions={<button type="button">New note</button>}
        corpusChip={<SoloWorkspaceBadge />}
      />,
    );

    expect(screen.getByRole("button", { name: "New note" })).toBeTruthy();
    expect(screen.getByText("Solo workspace")).toBeTruthy();
  });

  it("exposes loading, error, and empty states distinctly", () => {
    const { container, rerender } = render(<ContentRegion state="loading" />);
    expect(
      container
        .querySelector('[data-slot="content-region-loading"]')
        ?.getAttribute("aria-busy"),
    ).toBe("true");

    rerender(
      <ContentRegion
        state="error"
        error={{
          title: "Couldn't load notes.",
          message: "The request failed.",
          retry: <ContentRegionRetry onClick={() => undefined} />,
        }}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();

    rerender(
      <ContentRegion
        state="empty"
        empty={{ title: "Nothing here yet", description: "Write a note." }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Nothing here yet" }),
    ).toBeTruthy();
  });
});

describe("WorkspaceSwitcher (REC-18 honesty)", () => {
  it("adopts the contract shape without re-declaring it", () => {
    const list: WorkspaceList = {
      workspaces: [personal.workspace, sample.workspace],
    };
    const entries = toWorkspaceEntries(list, (workspace) =>
      workspace.id === sample.workspace.id ? "sample" : "mine",
    );

    expect(entries).toHaveLength(2);
    expect(entries[1]?.corpusOwnership).toBe("sample");
  });

  it("renders a label and a solo badge at n = 1, not a fake menu", () => {
    render(<WorkspaceSwitcher workspaces={[personal]} />);

    expect(screen.getByText("Personal workspace")).toBeTruthy();
    expect(screen.getByText("Solo workspace")).toBeTruthy();
    // No dropdown affordance when there is nothing to switch to.
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("separates and labels the sample workspace when a few exist", async () => {
    render(
      <WorkspaceSwitcher
        workspaces={[personal, sample]}
        selectedId="ws-personal"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /personal workspace/i }),
    );

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Mine")).toBeTruthy();
    expect(within(menu).getByText("Sample (public demo notes)")).toBeTruthy();

    const sampleItem = within(menu)
      .getByText("Demo Corpus")
      .closest("[role='menuitem']");
    expect(sampleItem).toBeTruthy();
    // The sample row is tagged with text + icon, never colour alone.
    expect(within(sampleItem as HTMLElement).getByText("Sample")).toBeTruthy();
  });

  it("marks the selected workspace in text, not only with a check glyph", async () => {
    render(
      <WorkspaceSwitcher
        workspaces={[personal, sample]}
        selectedId="ws-personal"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /personal workspace/i }),
    );
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Current")).toBeTruthy();
  });

  it("reports a rejected selection with the generic forbidden message", () => {
    render(
      <WorkspaceSwitcher
        workspaces={[personal, sample]}
        selectedId="ws-personal"
        forbidden
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("You don't have access to that workspace.");
  });

  it("sends the workspace id as a selector and lets the caller decide", async () => {
    const onSelect = vi.fn();
    render(
      <WorkspaceSwitcher
        workspaces={[personal, sample]}
        selectedId="ws-personal"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /personal workspace/i }),
    );
    const menu = await screen.findByRole("menu");
    const sampleRow = within(menu)
      .getByText("Demo Corpus")
      .closest("[role='menuitem']");
    if (!sampleRow) throw new Error("sample workspace row is not a menu item");
    fireEvent.click(sampleRow);

    expect(onSelect).toHaveBeenCalledWith("ws-sample");
  });

  it("renders the presentation row standalone in each of its states", () => {
    const { container } = render(
      <>
        <WorkspaceSwitcherItem
          name="Personal workspace"
          corpusOwnership="mine"
        />
        <WorkspaceSwitcherItem
          name="Demo Corpus"
          corpusOwnership="sample"
          role="owner"
          selected
        />
      </>,
    );

    const rows = container.querySelectorAll(
      '[data-slot="workspace-switcher-item"]',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.hasAttribute("data-selected")).toBe(false);
    expect(rows[1]?.getAttribute("data-selected")).toBe("");
    expect(rows[1]?.getAttribute("data-corpus")).toBe("sample");
    // The sample tag and the role are carried by text, not by colour.
    expect(screen.getByText("Sample")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
  });

  it("returns nothing before memberships resolve (no invented tenant)", () => {
    const { container } = render(<WorkspaceSwitcher workspaces={[]} />);
    expect(
      container.querySelector('[data-slot="workspace-switcher"]'),
    ).toBeNull();
  });
});

describe("MembersPanel / MemberRow", () => {
  it("says the truth when the principal is alone", () => {
    render(<MembersPanel state="solo-empty" />);
    expect(screen.getByText("You're the only member.")).toBeTruthy();
  });

  it("lists real members with text role chips", () => {
    render(
      <MembersPanel
        state="list"
        members={[
          {
            id: "m1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            role: "owner",
          },
          { id: "m2", name: "Grace Hopper", role: "member" },
        ]}
      />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
    // Heading level does not skip past the page's h1.
    expect(
      screen.getByRole("heading", { level: 2, name: "Members" }),
    ).toBeTruthy();
  });

  it("covers loading and error states", () => {
    const { container, rerender } = render(<MembersPanel state="loading" />);
    expect(
      container
        .querySelector('[data-slot="members-panel-loading"]')
        ?.getAttribute("aria-busy"),
    ).toBe("true");

    rerender(<MembersPanel state="error" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("renders owner and member rows standalone", () => {
    const { container } = render(
      <>
        <MemberRow member={{ id: "m1", name: "Ada", role: "owner" }} />
        <MemberRow member={{ id: "m2", name: "Grace", role: "member" }} />
      </>,
    );

    const rows = container.querySelectorAll('[data-slot="member-row"]');
    expect(rows[0]?.getAttribute("data-role")).toBe("owner");
    expect(rows[1]?.getAttribute("data-role")).toBe("member");
  });
});

describe("SoloWorkspaceBadge", () => {
  it("pairs an icon with its text label", () => {
    const { container } = render(<SoloWorkspaceBadge />);
    const badge = container.querySelector('[data-slot="solo-workspace-badge"]');
    expect(badge?.textContent).toContain("Solo workspace");
    expect(badge?.querySelector("svg")).toBeTruthy();
  });
});

describe("CommandPalette", () => {
  const items: CommandPaletteItem[] = [
    { id: "inbox", label: "Go to Inbox", href: "/inbox" },
    { id: "notes", label: "Go to Notes", href: "/notes" },
    { id: "ask", label: "Ask a question", description: "About this workspace" },
  ];

  it("renders nothing while closed", () => {
    render(
      <CommandPalette
        open={false}
        onOpenChange={() => undefined}
        items={items}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a labelled, focusable dialog with a keyboard-complete result list", async () => {
    render(
      <CommandPalette open onOpenChange={() => undefined} items={items} />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Search and commands")).toBeTruthy();

    const search = screen.getByRole("searchbox", { name: "Search" });
    expect(search.getAttribute("aria-controls")).toBe(
      "command-palette-results",
    );
    expect(
      within(dialog).getByRole("link", { name: /go to inbox/i }),
    ).toBeTruthy();
    // Results are announced once, politely — a count, not every row.
    expect(screen.getByRole("status").textContent).toBe("3 results");
  });

  it("moves focus from the field into the results", async () => {
    render(
      <CommandPalette open onOpenChange={() => undefined} items={items} />,
    );
    const search = await screen.findByRole("searchbox", { name: "Search" });

    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: /go to inbox/i }),
    );
  });

  it("filters and reports an empty state", async () => {
    render(
      <CommandPalette open onOpenChange={() => undefined} items={items} />,
    );
    const search = await screen.findByRole("searchbox", { name: "Search" });

    fireEvent.change(search, { target: { value: "notes" } });
    expect(screen.getByRole("link", { name: /go to notes/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /go to inbox/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1 result");

    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(screen.getByText("No matches.")).toBeTruthy();
  });

  it("closes and notifies when a result is chosen", async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        items={items}
      />,
    );

    // Use the non-navigating item: jsdom cannot follow `href` and logs noise.
    fireEvent.click(
      await screen.findByRole("button", { name: /ask a question/i }),
    );
    expect(onSelect).toHaveBeenCalledWith(items[2]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("covers the loading state", async () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => undefined}
        items={items}
        loading
      />,
    );
    // The copy intentionally appears three times (spinner label, visible text,
    // and the polite status region), so count rather than demand a single node.
    expect((await screen.findAllByText("Searching…")).length).toBeGreaterThan(
      0,
    );
    // The dialog renders into a portal on `document.body`, not into the
    // render container.
    expect(
      document.querySelector('[data-slot="command-palette-loading"]'),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /go to inbox/i })).toBeNull();
  });
});

describe("ThemeToggle", () => {
  it("has a static accessible name independent of the theme icon", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Switch theme" })).toBeTruthy();
  });
});

/**
 * Direction/logical-CSS discipline (a11y §7.2–7.4), checked against the shell
 * sources the same way F-01 checked the token mirror. These are cheap greps that
 * fail loudly if a physical inline utility or a component-level `dir` sneaks in.
 */
describe("shell source discipline", () => {
  const files = [
    "app-shell.tsx",
    "command-palette.tsx",
    "content-region.tsx",
    "members-panel.tsx",
    "mobile-tab-bar.tsx",
    "page-header.tsx",
    "sidebar.tsx",
    "skip-link.tsx",
    "theme-toggle.tsx",
    "top-bar.tsx",
    "workspace-switcher.tsx",
  ] as const;

  const sources = files.map((file) => ({
    file,
    source: readFileSync(new URL(file, import.meta.url), "utf8"),
  }));

  /**
   * Comments legitimately *name* a banned token to explain why it is banned, so
   * only code is checked. `//` must be whitespace- or line-anchored to survive
   * `https://` inside prose.
   */
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("uses no physical inline-direction utilities", () => {
    const physical =
      /\b(ml|mr|pl|pr)-\d|\b(ml|mr|pl|pr)-auto|\bleft-\d|\bright-\d|\binset-x-|border-l\b|border-r\b|text-left\b|text-right\b/g;

    for (const { file, source } of sources) {
      const matches = stripComments(source).match(physical);
      expect(
        matches,
        `${file} uses physical direction utilities: ${matches}`,
      ).toBeNull();
    }
  });

  it("uses only real Tailwind logical utilities", () => {
    // Guards the dead-class defect: `inset-inline-0` and `border-inline-end` are
    // CSS property *names*, not Tailwind utilities. They compile to nothing, so
    // the element silently loses its anchoring or its separator and no build
    // step complains. Tailwind's logical names are `start-*` / `end-*` for
    // insets and `border-s` / `border-e` for borders.
    const deadUtilities =
      /\b(inset|border|margin|padding)-(inline|block)(-\w+)?\b/g;

    for (const { file, source } of sources) {
      const matches = stripComments(source).match(deadUtilities);
      expect(
        matches,
        `${file} uses non-existent logical utilities: ${matches}`,
      ).toBeNull();
    }
  });

  it("never sets a direction attribute itself", () => {
    for (const { file, source } of sources) {
      expect(source, `${file} sets dir`).not.toMatch(/\sdir=["{]/);
    }
  });

  it("claims no RTL locale support (a11y §7.5)", () => {
    for (const { file, source } of sources) {
      expect(source.toLowerCase(), `${file} claims RTL`).not.toMatch(
        /rtl (is|now) (available|supported|live)|supports rtl/,
      );
    }
  });

  it("never ships motion without a reduced-motion fallback", () => {
    // Any file that animates must also carry the static equivalent, so the
    // palette/menu/sidebar transitions cannot regress `prefers-reduced-motion`
    // (handoff directionality checks; a11y §5).
    for (const { file, source } of sources) {
      if (!source.includes("transition-")) continue;
      expect(
        source.includes("motion-reduce:transition-none"),
        `${file} animates without motion-reduce:transition-none`,
      ).toBe(true);
    }
  });

  it("animates the rail geometry instead of snapping it", () => {
    const sidebar = sources.find(({ file }) => file === "sidebar.tsx");
    expect(sidebar).toBeTruthy();

    // The nav item must animate its own box (width/padding/gap) over a token
    // duration. Without the width transition the item jumps to its rail size
    // while the shell's grid track is still animating, which is the snap the
    // shadcn-style collapse avoids.
    expect(sidebar?.source).toMatch(/transition-\[[^\]]*width/);
    expect(sidebar?.source).toContain("duration-[var(--od-duration-base)]");
  });
});
