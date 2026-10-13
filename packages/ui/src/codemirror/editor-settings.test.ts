// Editor settings tests — F-15 Rev 2, plan Task 1.1.
//
// The defaults are the artifact's own (SET-001) as recorded in plan §4.1, and
// the live-reconfigured key list is SET-002. Both are transcribed from the plan;
// these tests fail if the code drifts from it.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_SETTINGS,
  LIVE_RECONFIGURED_KEYS,
  TAB_SIZE_MAX,
  TAB_SIZE_MIN,
  UNMODELLED_ARTIFACT_KEYS,
  editorSettings,
  normalizeTabSize,
  type EditorSettings,
} from "./editor-settings";

describe("editor settings (SET-001, UNDOC-002)", () => {
  it("SET-001: the defaults match the plan §4.1 table", () => {
    // Transcribed from the plan's table, not from the implementation, so a
    // changed default has to be argued against the plan in review.
    const planDefaults: EditorSettings = {
      useTab: true,
      tabSize: 4,
      rightToLeft: false,
      spellcheck: true,
      autoPairBrackets: true,
      autoPairMarkdown: true,
      smartIndentList: true,
      foldHeading: true,
      foldIndent: true,
      showLineNumber: false,
      showIndentGuide: true,
      livePreview: true,
      vimMode: false,
    };

    expect(DEFAULT_EDITOR_SETTINGS).toEqual(planDefaults);
  });

  it("SET-001: `useTab` is true (decision 3 — tabs match the artifact)", () => {
    expect(DEFAULT_EDITOR_SETTINGS.useTab).toBe(true);
  });

  it("SET-001: the key set is exactly the modelled defaults", () => {
    expect(Object.keys(DEFAULT_EDITOR_SETTINGS).sort()).toEqual(
      [
        "autoPairBrackets",
        "autoPairMarkdown",
        "foldHeading",
        "foldIndent",
        "livePreview",
        "rightToLeft",
        "showIndentGuide",
        "showLineNumber",
        "smartIndentList",
        "spellcheck",
        "tabSize",
        "useTab",
        "vimMode",
      ].sort(),
    );
  });

  it("UNDOC-002: artifact keys OmniDoc does not model are recorded with a reason", () => {
    // The plan's table marks these `n/a`; recording them keeps the omission a
    // decision instead of an oversight (plan §4.1 / §4.4 "stay marked").
    expect(UNMODELLED_ARTIFACT_KEYS.map((entry) => entry.key).sort()).toEqual([
      "propertiesInDocument",
      "readableLineLength",
      "strictLineBreaks",
    ]);
    for (const entry of UNMODELLED_ARTIFACT_KEYS) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("plan §4.1: the module exposes no settings persistence (recorded deviation)", async () => {
    // Settings are prop/component state only (plan §4.1). A persistence layer
    // would arrive as a `save`/`load`/storage-key export; nothing here may be.
    const module = await import("./editor-settings");
    for (const forbidden of [
      "saveEditorSettings",
      "loadEditorSettings",
      "EDITOR_SETTINGS_STORAGE_KEY",
      "persistEditorSettings",
    ]) {
      expect(Object.keys(module)).not.toContain(forbidden);
    }
  });
});

describe("editor settings reconfiguration (SET-002)", () => {
  it("SET-002: the eight live-reconfigured keys are all real settings keys", () => {
    expect(LIVE_RECONFIGURED_KEYS).toHaveLength(8);
    expect([...LIVE_RECONFIGURED_KEYS].sort()).toEqual(
      [
        "autoPairBrackets",
        "autoPairMarkdown",
        "rightToLeft",
        "smartIndentList",
        "spellcheck",
        "tabSize",
        "useTab",
        "vimMode",
      ].sort(),
    );
    for (const key of LIVE_RECONFIGURED_KEYS) {
      expect(DEFAULT_EDITOR_SETTINGS).toHaveProperty(key);
    }
  });

  it("SET-002: vimMode is present but inert (vim stays gated — decision 9)", () => {
    expect(DEFAULT_EDITOR_SETTINGS.vimMode).toBe(false);
  });
});

describe("editor settings overrides", () => {
  it("normalizeTabSize clamps to the artifact's 2–8 slider range", () => {
    expect(normalizeTabSize(0)).toBe(TAB_SIZE_MIN);
    expect(normalizeTabSize(1)).toBe(TAB_SIZE_MIN);
    expect(normalizeTabSize(4)).toBe(4);
    expect(normalizeTabSize(9)).toBe(TAB_SIZE_MAX);
    expect(normalizeTabSize(Number.NaN)).toBe(DEFAULT_EDITOR_SETTINGS.tabSize);
  });

  it("editorSettings applies overrides and clamps ranged values", () => {
    const settings = editorSettings({ useTab: false, tabSize: 99 });
    expect(settings.useTab).toBe(false);
    expect(settings.tabSize).toBe(TAB_SIZE_MAX);
    // Untouched keys keep their artifact default.
    expect(settings.tabSize).not.toBe(DEFAULT_EDITOR_SETTINGS.tabSize);
    expect(settings.smartIndentList).toBe(true);
  });

  it("the defaults are frozen so a reconfiguration cannot mutate them", () => {
    expect(Object.isFrozen(DEFAULT_EDITOR_SETTINGS)).toBe(true);
    expect(Object.isFrozen(editorSettings())).toBe(true);
  });
});
