import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design-token mirror test.
 *
 * Mechanical guard that `tokens.css` still declares every token the design
 * system is the authority for. It deliberately asserts **names only** — the
 * values belong to the chosen design language (currently Mintlify, see
 * `docs/design/now.md`) and may be retuned without touching components. What
 * must not drift is the existence and spelling of a role, because components
 * and docs reference it.
 *
 * If this test fails, either a token was dropped/renamed (fix the CSS) or the
 * design language changed (get the update, then update this list).
 *
 * Resolved from the project cwd (`packages/ui`), which the Nx `test` target
 * pins via `cwd`.
 */
const tokensCss = readFileSync(
  path.join(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

const REQUIRED_TOKENS = [
  // primitive ramps
  ...[0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(
    (step) => `--od-neutral-${step}`,
  ),
  "--od-accent-400",
  "--od-accent-500",
  "--od-accent-600",
  "--od-success-500",
  "--od-warning-500",
  "--od-danger-500",
  "--od-info-500",

  // type
  "--od-font-sans",
  "--od-font-mono",
  "--od-font-heading",
  ...["display", "h1", "h2", "h3", "body", "body-sm", "caption", "micro"].map(
    (role) => `--od-text-${role}`,
  ),
  ...["display", "h1", "h2", "h3", "body", "body-sm", "caption", "micro"].flatMap(
    (role) => [`--od-text-${role}-leading`, `--od-text-${role}-weight`],
  ),
  ...["display", "h1", "h2", "h3", "micro"].map(
    (role) => `--od-text-${role}-tracking`,
  ),
  "--od-measure-reading",

  // spacing and layout
  ...[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => `--od-space-${step}`),
  "--od-layout-sidebar",
  "--od-layout-sidebar-rail",
  "--od-layout-reading",
  "--od-layout-citation-rail",
  "--od-layout-content-max",
  "--od-layout-composer-max",

  // radius and elevation
  ...["xs", "sm", "md", "lg", "xl", "full"].map(
    (step) => `--od-radius-${step}`,
  ),
  ...[0, 1, 2, 3].map((step) => `--od-elevation-${step}`),

  // motion
  ...["instant", "fast", "base", "slow"].map((step) => `--od-duration-${step}`),
  "--od-ease-standard",
  "--od-ease-emphasis",

  // shadcn-compatible semantic roles
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  // base radius for calc()-derived inner radii (shadcn v4 contract)
  "--radius",

  // OmniDoc domain roles
  "--od-surface-canvas",
  "--od-surface-raised",
  "--od-surface-sunken",
  "--od-text-primary",
  "--od-text-secondary",
  "--od-text-tertiary",
  "--od-focus-ring",
  "--od-status-supported",
  "--od-status-partial",
  "--od-status-unsupported",
  "--od-status-conflict",
  "--od-status-error",
  "--od-status-info",
] as const;

describe("design-token mirror (packages/ui/src/styles/tokens.css)", () => {
  it.each(REQUIRED_TOKENS)("declares %s", (token) => {
    expect(tokensCss).toContain(`${token}:`);
  });

  it("ships both themes from one class-driven source", () => {
    expect(tokensCss).toContain(":root {");
    expect(tokensCss).toContain(".dark {");
    // Dark mode is class-driven, so the `dark:` variant must be registered
    // against `.dark` and not a media query.
    expect(tokensCss).toContain("@custom-variant dark");
    expect(tokensCss).not.toMatch(/@media\s*\(prefers-color-scheme/);
  });

  it("remaps the semantic roles (not just the surfaces) in the dark block", () => {
    const darkStart = tokensCss.indexOf(".dark {");
    const darkEnd = tokensCss.indexOf("\n}", darkStart);
    const darkBlock = tokensCss.slice(darkStart, darkEnd);

    // A dropped remap would silently leak the light value into dark mode;
    // assert the roles that carry text, focus and status in both themes.
    for (const role of [
      "--background:",
      "--foreground:",
      "--card:",
      "--primary:",
      "--muted-foreground:",
      "--border:",
      "--input:",
      "--ring:",
      "--od-text-primary:",
      "--od-focus-ring:",
      "--od-status-supported:",
      "--od-status-error:",
    ]) {
      expect(darkBlock).toContain(role);
    }
  });

  it("keeps the reduced-motion guarantee global", () => {
    expect(tokensCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("declares the shadcn v4 state variants the copied-in components use", () => {
    // Inlined from shadcn/tailwind.css; the base-nova sources depend on them.
    for (const variant of [
      "data-open",
      "data-closed",
      "data-checked",
      "data-unchecked",
      "data-selected",
      "data-disabled",
      "data-active",
      "data-horizontal",
      "data-vertical",
    ]) {
      expect(tokensCss).toContain(`@custom-variant ${variant}`);
    }
  });

  it("bridges the heading font and radius roles into Tailwind namespaces", () => {
    expect(tokensCss).toContain("--font-heading:");
    expect(tokensCss).toContain("--radius-xl:");
    expect(tokensCss).toContain("--radius-lg:");
  });

  it("exposes the isolation, measure, tabular and logical-size hooks", () => {
    // identifiers/code/URLs/UGC isolation
    expect(tokensCss).toContain("@utility od-isolate");
    // answer/note reading measure
    expect(tokensCss).toContain("@utility od-reading-measure");
    // tabular figures for counters, offsets, timestamps
    expect(tokensCss).toContain("@utility od-tabular");
    // long unbroken strings never cause page scroll
    expect(tokensCss).toContain("@utility od-unbroken");
    // logical inline sizing instead of physical `width`
    expect(tokensCss).toContain("@utility od-inline-full");
  });

  it("does not hand-roll physical left/right inset overrides", () => {
    // Rotate through the banned physical floor/ceil insets only; `border-color`
    // and box-shadow geometry are legitimate physical uses.
    expect(tokensCss).not.toMatch(/\[dir=['"]rtl['"]\]/);
    expect(tokensCss).not.toMatch(/(^|[^-])\b(left|right):/);
  });
});
