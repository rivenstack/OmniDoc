/**
 * Body typography — the one source both engines read (F-15 Rev 2, plan Task 1.2).
 *
 * Normal (TipTap) and Markdown (CodeMirror live preview) must read as the same
 * page: switching modes changes how the source is edited, not how the note
 * looks. Before this module the scale lived twice — as Tailwind utilities on the
 * TipTap surface and as literal `rem` values in the live-preview theme — and the
 * two were only kept in step by a comment. Now the values exist once and both
 * consumers derive from them:
 *
 * - {@link CAPTURE_BODY_CLASSES} — the utility string on the TipTap surface.
 * - {@link LIVE_PREVIEW_TYPE_RULES} / {@link LIVE_PREVIEW_CODE_TYPE} — the
 *   CodeMirror theme rules for the constructs the preview draws itself.
 *
 * `TAILWIND_TEXT_SIZES` records what the size utilities actually resolve to
 * (Tailwind's own scale), and `body-typography.test.ts` pins every step's
 * `fontSizeRem` / `lineHeightRem` against it — so a class and a `rem` value can
 * never drift apart silently.
 *
 * Visual only: no catalogue entry covers typography (`—` in the plan's task
 * table). Behaviour parity lives in the `OBS-1.14.4-*` tests.
 */

/** One step of the body type scale. */
export type BodyTypeStep = {
  /** Tailwind text-size utility for this step. */
  readonly className: string;
  /** Tailwind font-weight utility for this step. */
  readonly fontWeightClass: string;
  /** Margin above the block, as a Tailwind utility. */
  readonly marginTopClass: string;
  /** The size the utility resolves to, in rem. */
  readonly fontSizeRem: number;
  /** The line-height the utility resolves to, in rem. */
  readonly lineHeightRem: number;
  /** The numeric weight the utility resolves to. */
  readonly fontWeight: number;
};

/**
 * What Tailwind's own text-size utilities resolve to.
 *
 * Duplicating Tailwind's table is the point: it is the value the *browser* will
 * apply on the TipTap side, so the test comparing it against
 * {@link BODY_TYPE_SCALE} is what actually proves the two engines agree.
 */
export const TAILWIND_TEXT_SIZES = {
  "text-sm": { fontSizeRem: 0.875, lineHeightRem: 1.25 },
  "text-base": { fontSizeRem: 1, lineHeightRem: 1.5 },
  "text-lg": { fontSizeRem: 1.125, lineHeightRem: 1.75 },
  "text-xl": { fontSizeRem: 1.25, lineHeightRem: 1.75 },
  "text-2xl": { fontSizeRem: 1.5, lineHeightRem: 2 },
} as const;

/** What Tailwind's font-weight utilities resolve to. */
export const TAILWIND_FONT_WEIGHTS = {
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
} as const;

/**
 * The body type scale: paragraph text plus the three heading levels the capture
 * surface renders. Values are the ones both engines already rendered — this is
 * a consolidation, not a redesign.
 */
export const BODY_TYPE_SCALE = {
  body: {
    className: "text-base",
    fontWeightClass: "font-normal",
    marginTopClass: "my-3",
    fontSizeRem: 1,
    lineHeightRem: 1.5,
    fontWeight: 400,
  },
  h1: {
    className: "text-2xl",
    fontWeightClass: "font-medium",
    marginTopClass: "mt-6",
    fontSizeRem: 1.5,
    lineHeightRem: 2,
    fontWeight: 500,
  },
  h2: {
    className: "text-xl",
    fontWeightClass: "font-medium",
    marginTopClass: "mt-5",
    fontSizeRem: 1.25,
    lineHeightRem: 1.75,
    fontWeight: 500,
  },
  h3: {
    className: "text-lg",
    fontWeightClass: "font-medium",
    marginTopClass: "mt-4",
    fontSizeRem: 1.125,
    lineHeightRem: 1.75,
    fontWeight: 500,
  },
} as const satisfies Record<string, BodyTypeStep>;

/** Heading levels the scale covers, outermost first. */
export const BODY_HEADING_LEVELS = ["h1", "h2", "h3"] as const;

/** The monospace face, for both inline code and fenced blocks. */
export const BODY_CODE_FONT_FAMILY =
  "var(--font-geist-mono), monospace";

/**
 * Code typography.
 *
 * Inline code is sized *relative* (`em`) so it tracks the text around it;
 * a fenced block is sized absolutely because it sits on its own line at the
 * document's `text-sm` rhythm.
 */
export const BODY_CODE_TYPE = {
  fontFamily: BODY_CODE_FONT_FAMILY,
  inlineFontSizeEm: 0.9,
  /**
   * The fenced block uses Tailwind's `text-sm` step rather than an arbitrary
   * `text-[0.875rem]`: the utility carries its own line-height ratio with it, and
   * an arbitrary font-size alone would inherit the body's ratio instead — a
   * visual change smuggled in by a refactor.
   */
  blockSizeClass: "text-sm",
  blockFontSizeRem: TAILWIND_TEXT_SIZES["text-sm"].fontSizeRem,
} as const;

/** `1.5` → `1.5rem`; shared so both consumers spell the unit the same way. */
function rem(value: number): string {
  return `${value}rem`;
}

/**
 * Utility classes for the TipTap surface's `.ProseMirror` body.
 *
 * Structural rules (list markers, quote borders, table borders) are not part of
 * the type scale, so they stay literal here; the size/weight/margin of each
 * heading and of the body text are derived from {@link BODY_TYPE_SCALE}.
 */
export const CAPTURE_BODY_CLASSES: string = [
  // `break-words` inherits, so long unbroken strings wrap anywhere in the
  // body without a blanket descendant selector (`ui-qa-checklist.md` §5.9).
  `break-words ${BODY_TYPE_SCALE.body.className} text-foreground`,
  "[&_p]:my-3",
  ...BODY_HEADING_LEVELS.map((level) => {
    const step = BODY_TYPE_SCALE[level];
    return `[&_${level}]:${step.marginTopClass} [&_${level}]:${step.className} [&_${level}]:${step.fontWeightClass}`;
  }),
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6",
  "[&_blockquote]:my-4 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground",
  `[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:${BODY_CODE_TYPE.blockSizeClass}`,
  "[&_pre]:focus-visible:ring-3 [&_pre]:focus-visible:ring-ring [&_pre]:outline-none",
  `[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[${BODY_CODE_TYPE.inlineFontSizeEm}em]`,
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-6 [&_hr]:border-border",
  "[&_a]:text-primary [&_a]:underline",
  "[&_.tableWrapper]:my-4 [&_.tableWrapper]:overflow-x-auto [&_.tableWrapper]:max-w-full",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_th]:font-medium [&_th]:text-start",
  "[&_td]:border [&_td]:border-border [&_td]:p-2",
].join(" ");

/**
 * CodeMirror theme rules for the type steps it draws itself — the preview's
 * headings. Merged into `markdownLivePreviewTheme` so the two engines render the
 * same sizes, weights and line heights.
 *
 * Tailwind's utilities carry their line-height with them, and CodeMirror's theme
 * does not, so the `lineHeight` here is derived from the same step rather than
 * left to CodeMirror's default.
 */
export const LIVE_PREVIEW_TYPE_RULES: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  BODY_HEADING_LEVELS.map((level) => {
    const step = BODY_TYPE_SCALE[level];
    return [
      `.cm-live-${level}`,
      {
        fontSize: rem(step.fontSizeRem),
        lineHeight: rem(step.lineHeightRem),
        fontWeight: String(step.fontWeight),
      },
    ];
  }),
);

/**
 * CodeMirror code typography, split out because the mark and the block carry
 * different non-type properties (background, radius, padding) that stay in the
 * theme itself.
 */
export const LIVE_PREVIEW_CODE_TYPE = {
  fontFamily: BODY_CODE_TYPE.fontFamily,
  /** `0.9em` — relative to the surrounding text. */
  inlineFontSize: `${BODY_CODE_TYPE.inlineFontSizeEm}em`,
  /** `0.875rem` — the document's own small-text rhythm. */
  blockFontSize: rem(BODY_CODE_TYPE.blockFontSizeRem),
} as const;
