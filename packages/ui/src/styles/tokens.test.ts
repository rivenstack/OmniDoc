import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * D-01 token-mirror test.
 *
 * Mechanical guard that `tokens.css` still declares every token D-01 is the
 * authority for. It deliberately asserts **names only** — the values are the
 * Designer's to change, and D-01's token-authority note explicitly allows the
 * Implementer to tune numeric lightness steps. What must not drift is the
 * existence and spelling of a role, because components and specs reference it.
 *
 * If this test fails, either a token was dropped/renamed (fix the CSS) or D-01
 * changed (get the design update, then update this list).
 *
 * Resolved from the project cwd (`packages/ui`), which the Nx `test` target
 * pins via `cwd`.
 */
const tokensCss = readFileSync(
  path.join(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

const REQUIRED_TOKENS = [
  // §2.1 primitive ramps
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

  // §3 type
  "--od-font-sans",
  "--od-font-mono",
  ...["display", "h1", "h2", "h3", "body", "body-sm", "caption", "micro"].map(
    (role) => `--od-text-${role}`,
  ),
  "--od-measure-reading",

  // §4 spacing and layout
  ...[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => `--od-space-${step}`),
  "--od-layout-sidebar",
  "--od-layout-reading",
  "--od-layout-citation-rail",
  "--od-layout-content-max",
  "--od-layout-composer-max",

  // §5 radius and elevation
  ...["xs", "sm", "md", "lg", "full"].map((step) => `--od-radius-${step}`),
  ...[0, 1, 2, 3].map((step) => `--od-elevation-${step}`),

  // §6 motion
  ...["instant", "fast", "base", "slow"].map((step) => `--od-duration-${step}`),
  "--od-ease-standard",
  "--od-ease-emphasis",

  // §2.2 shadcn-compatible semantic roles
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

  // §2.2 OmniDoc domain roles
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

describe("D-01 token mirror (packages/ui/src/styles/tokens.css)", () => {
  it.each(REQUIRED_TOKENS)("declares %s", (token) => {
    expect(tokensCss).toContain(`${token}:`);
  });

  it("ships both themes from one class-driven source", () => {
    expect(tokensCss).toContain(":root {");
    expect(tokensCss).toContain(".dark {");
    // D-01 §2.3: dark mode is class-driven, so the `dark:` variant must be
    // registered against `.dark` and not a media query.
    expect(tokensCss).toContain("@custom-variant dark");
    expect(tokensCss).not.toMatch(/@media\s*\(prefers-color-scheme/);
  });

  it("keeps the reduced-motion guarantee global (D-01 §6.1)", () => {
    expect(tokensCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("exposes the isolation, measure, tabular and logical-size hooks", () => {
    // a11y §7.3 — identifiers/code/URLs/UGC isolation
    expect(tokensCss).toContain("@utility od-isolate");
    // D-01 §3.1 — answer/note reading measure
    expect(tokensCss).toContain("@utility od-reading-measure");
    // D-01 §3.1 — tabular figures for counters, offsets, timestamps
    expect(tokensCss).toContain("@utility od-tabular");
    // D-01 §3.3 — long unbroken strings never cause page scroll
    expect(tokensCss).toContain("@utility od-unbroken");
    // a11y §7.2 — logical inline sizing instead of physical `width`
    expect(tokensCss).toContain("@utility od-inline-full");
  });

  it("does not hand-roll physical left/right inset overrides", () => {
    // Rotate through the banned physical floor/ceil insets only; `border-color`
    // and box-shadow geometry are legitimate physical uses.
    expect(tokensCss).not.toMatch(/\[dir=['"]rtl['"]\]/);
    expect(tokensCss).not.toMatch(/(^|[^-])\b(left|right):/);
  });
});
