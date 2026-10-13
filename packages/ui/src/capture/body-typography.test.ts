// Body typography tests — F-15 Rev 2, plan Task 1.2.
//
// The point of the module is that one scale feeds both engines. These tests
// check that claim the only way it can be checked: by resolving the Tailwind
// utility back to the value the browser would apply, and comparing it with the
// `rem` the CodeMirror theme emits for the same construct.

import { describe, expect, it } from "vitest";
import {
  BODY_CODE_FONT_FAMILY,
  BODY_CODE_TYPE,
  BODY_HEADING_LEVELS,
  BODY_TYPE_SCALE,
  CAPTURE_BODY_CLASSES,
  LIVE_PREVIEW_CODE_TYPE,
  LIVE_PREVIEW_TYPE_RULES,
  TAILWIND_FONT_WEIGHTS,
  TAILWIND_TEXT_SIZES,
} from "./body-typography";

describe("body typography scale", () => {
  it("every step's Tailwind size class resolves to the step's own rem values", () => {
    for (const step of Object.values(BODY_TYPE_SCALE)) {
      const size = TAILWIND_TEXT_SIZES[
        step.className as keyof typeof TAILWIND_TEXT_SIZES
      ];
      expect(size, `unknown size class ${step.className}`).toBeDefined();
      expect(size.fontSizeRem).toBe(step.fontSizeRem);
      expect(size.lineHeightRem).toBe(step.lineHeightRem);
    }
  });

  it("every step's Tailwind weight class resolves to the step's own numeric weight", () => {
    for (const step of Object.values(BODY_TYPE_SCALE)) {
      const weight =
        TAILWIND_FONT_WEIGHTS[
          step.fontWeightClass as keyof typeof TAILWIND_FONT_WEIGHTS
        ];
      expect(weight, `unknown weight class ${step.fontWeightClass}`).toBe(
        step.fontWeight,
      );
    }
  });

  it("the body step is `text-base` at 1rem / 1.5", () => {
    expect(BODY_TYPE_SCALE.body.className).toBe("text-base");
    expect(BODY_TYPE_SCALE.body.fontSizeRem).toBe(1);
    expect(BODY_TYPE_SCALE.body.lineHeightRem).toBe(1.5);
  });

  it("code typography keeps the inline size relative and the block size on `text-sm`", () => {
    expect(BODY_CODE_TYPE.inlineFontSizeEm).toBe(0.9);
    expect(BODY_CODE_TYPE.blockSizeClass).toBe("text-sm");
    expect(BODY_CODE_TYPE.blockFontSizeRem).toBe(
      TAILWIND_TEXT_SIZES["text-sm"].fontSizeRem,
    );
    expect(BODY_CODE_TYPE.fontFamily).toBe(BODY_CODE_FONT_FAMILY);
  });
});

describe("TipTap class string and CodeMirror theme agree", () => {
  it("every heading level carries the scale's size, weight and margin class", () => {
    for (const level of BODY_HEADING_LEVELS) {
      const step = BODY_TYPE_SCALE[level];
      for (const expected of [
        `[&_${level}]:${step.marginTopClass}`,
        `[&_${level}]:${step.className}`,
        `[&_${level}]:${step.fontWeightClass}`,
      ]) {
        expect(CAPTURE_BODY_CLASSES).toContain(expected);
      }
    }
  });

  it("every heading theme rule carries the scale's size, line height and weight", () => {
    for (const level of BODY_HEADING_LEVELS) {
      const step = BODY_TYPE_SCALE[level];
      const rule = LIVE_PREVIEW_TYPE_RULES[`.cm-live-${level}`];
      expect(rule, `missing theme rule for ${level}`).toBeDefined();
      expect(rule.fontSize).toBe(`${step.fontSizeRem}rem`);
      expect(rule.lineHeight).toBe(`${step.lineHeightRem}rem`);
      expect(rule.fontWeight).toBe(String(step.fontWeight));
    }
  });

  it("the body class string carries the shared body size class", () => {
    expect(CAPTURE_BODY_CLASSES).toContain(BODY_TYPE_SCALE.body.className);
    expect(CAPTURE_BODY_CLASSES).toContain(
      `[&_pre]:${BODY_CODE_TYPE.blockSizeClass}`,
    );
    expect(CAPTURE_BODY_CLASSES).toContain(
      `[&_code]:text-[${BODY_CODE_TYPE.inlineFontSizeEm}em]`,
    );
  });

  it("the CodeMirror code rules carry the shared code type values", () => {
    expect(LIVE_PREVIEW_CODE_TYPE.fontFamily).toBe(BODY_CODE_FONT_FAMILY);
    expect(LIVE_PREVIEW_CODE_TYPE.inlineFontSize).toBe(
      `${BODY_CODE_TYPE.inlineFontSizeEm}em`,
    );
    expect(LIVE_PREVIEW_CODE_TYPE.blockFontSize).toBe(
      `${BODY_CODE_TYPE.blockFontSizeRem}rem`,
    );
  });

  it("the heading sizes are strictly descending (h1 > h2 > h3)", () => {
    const sizes = BODY_HEADING_LEVELS.map(
      (level) => BODY_TYPE_SCALE[level].fontSizeRem,
    );
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThan(sizes[i - 1]);
    }
  });
});
