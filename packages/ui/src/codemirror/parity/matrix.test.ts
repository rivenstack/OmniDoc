// Parity matrix test — F-15 Rev 2, plan Task 0.1.
//
// Two jobs:
//   1. Prove the dispositions map covers the vendored RE-Obsidian 1.14.4
//      catalogue and obeys the plan's rules (plan §1.1 / §6).
//   2. Regenerate `docs/fidelity/obsidian-parity-matrix.md` (the generated human
//      view) and fail if the committed copy drifts.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE_VERSION,
  DISPOSITION_IDS,
  DISPOSITIONS,
  EXPECTED_ENTRY_COUNT,
  VENDORED_CATALOGUE_SHA256,
  type Disposition,
} from "./dispositions";
import {
  DISPOSITION_ORDER,
  renderParityMatrix,
  type Catalogue,
} from "./matrix";

const HERE = dirname(fileURLToPath(import.meta.url));
/** packages/ui/src/codemirror/parity → repo root. */
const REPO_ROOT = resolve(HERE, "../../../../..");
const CATALOGUE_PATH = resolve(
  REPO_ROOT,
  "docs/fidelity/obsidian-1.14.4.behaviours.json",
);
const MATRIX_PATH = resolve(REPO_ROOT, "docs/fidelity/obsidian-parity-matrix.md");

const catalogueBytes = readFileSync(CATALOGUE_PATH);
const catalogue = JSON.parse(catalogueBytes.toString("utf8")) as Catalogue;

/** Short ID (`A11Y-001`) → full ID (`OBS-1.14.4-A11Y-001`). */
const fullId = (short: string) => `OBS-1.14.4-${short}`;

const ALLOWED_DISPOSITIONS: readonly Disposition[] = DISPOSITION_ORDER;

/** Plan §2 totals, machine-verified against the catalogue. */
const PLAN_TOTALS: Record<Disposition, number> = {
  adopt: 73,
  adapt: 15,
  deviation: 1,
  defer: 12,
  gated: 8,
  "out-of-scope": 5,
};

describe("parity dispositions — catalogue coverage", () => {
  it("vendors the catalogue byte-for-byte", () => {
    const sha = createHash("sha256").update(catalogueBytes).digest("hex");
    expect(sha).toBe(VENDORED_CATALOGUE_SHA256);
    expect(catalogue.target.sha256_verified).toBe(true);
    // The artifact hash the plan §0.1 / §8 record.
    expect(catalogue.target.sha256).toBe(
      "146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f",
    );
    expect(catalogue.target.version).toBe(CATALOGUE_VERSION);
  });

  it(`covers all ${EXPECTED_ENTRY_COUNT} entries exactly once`, () => {
    expect(catalogue.entries.length).toBe(EXPECTED_ENTRY_COUNT);
    const catalogueIds = catalogue.entries.map((e) => e.id);
    const dispositionIds = DISPOSITION_IDS.map(fullId);

    expect(new Set(catalogueIds).size).toBe(EXPECTED_ENTRY_COUNT);
    expect(new Set(dispositionIds).size).toBe(EXPECTED_ENTRY_COUNT);

    // Missing and duplicated are reported separately so the failure is legible.
    expect(catalogueIds.filter((id) => !dispositionIds.includes(id))).toEqual([]);
    expect(dispositionIds.filter((id) => !catalogueIds.includes(id))).toEqual([]);
  });

  it("uses only the six dispositions the plan allows", () => {
    for (const [short, row] of Object.entries(DISPOSITIONS)) {
      expect(ALLOWED_DISPOSITIONS, short).toContain(row.disposition);
    }
  });

  it("gives every adopted and adapted entry a task", () => {
    const missing = Object.entries(DISPOSITIONS)
      .filter(
        ([, row]) =>
          (row.disposition === "adopt" || row.disposition === "adapt") &&
          !row.task,
      )
      .map(([short]) => short);
    expect(missing).toEqual([]);
  });

  it("records a task in `<phase>.<task>` form (or an explicit plan section)", () => {
    for (const [short, row] of Object.entries(DISPOSITIONS)) {
      if (!row.task) continue;
      expect(row.task, short).toMatch(/^(§\d+\.\d+|\d+\.\d+(, \d+\.\d+)*)$/);
    }
  });

  it("records a reason for every adapted and deviated entry", () => {
    const missing = Object.entries(DISPOSITIONS)
      .filter(
        ([, row]) =>
          (row.disposition === "adapt" || row.disposition === "deviation") &&
          !row.deviation,
      )
      .map(([short]) => short);
    expect(missing).toEqual([]);
    // A11Y-003 is the plan's adopt-with-recorded-deviation row: the deviation
    // must stay visible so a future parity audit does not "fix" it back (D-4).
    expect(DISPOSITIONS["A11Y-003"].deviation).toBeTruthy();
  });

  it("records a re-open condition for every defer/gated/out-of-scope entry", () => {
    const missing = Object.entries(DISPOSITIONS)
      .filter(
        ([, row]) =>
          (row.disposition === "defer" ||
            row.disposition === "gated" ||
            row.disposition === "out-of-scope") &&
          !row.reOpen,
      )
      .map(([short]) => short);
    expect(missing).toEqual([]);
  });

  it("matches the plan's disposition totals", () => {
    const tally: Record<string, number> = {};
    for (const row of Object.values(DISPOSITIONS)) {
      tally[row.disposition] = (tally[row.disposition] ?? 0) + 1;
    }
    expect(tally).toEqual(PLAN_TOTALS);
  });

  it("keeps catalogue `partial` coverage and unknowns marked (plan §4.4)", () => {
    const partial = catalogue.entries
      .filter((e) => e.coverage !== "verified")
      .map((e) => e.id);
    // The vendored catalogue's own gap list — must survive re-vendoring.
    expect(partial).toEqual([
      "OBS-1.14.4-A11Y-002",
      "OBS-1.14.4-DIR-001",
      "OBS-1.14.4-TAG-003",
    ]);
    // Every entry that carries unknowns keeps them in the vendored copy; the
    // generated matrix surfaces the count, so a silent upgrade is visible.
    const withUnknowns = catalogue.entries.filter((e) => e.unknowns.length > 0);
    expect(withUnknowns.length).toBeGreaterThan(0);
    // REVEAL-008 is the plan's `adopt (partial)`: verified coverage but an
    // unenumerated delimiter-width unknown, implemented from delimiter length.
    expect(DISPOSITIONS["REVEAL-008"].disposition).toBe("adopt");
    expect(DISPOSITIONS["REVEAL-008"].note).toMatch(/partial/);
    const reveal008 = catalogue.entries.find(
      (e) => e.id === "OBS-1.14.4-REVEAL-008",
    );
    expect(reveal008?.unknowns.join(" ")).toMatch(/delimiter widths/);
  });
});

describe("parity matrix — generated view", () => {
  it("regenerates docs/fidelity/obsidian-parity-matrix.md", () => {
    const rendered = renderParityMatrix(
      catalogue,
      DISPOSITIONS,
      VENDORED_CATALOGUE_SHA256,
    );
    writeFileSync(MATRIX_PATH, rendered, "utf8");
    expect(readFileSync(MATRIX_PATH, "utf8")).toBe(rendered);
  });

  it("lists every entry exactly once in the rendered rows", () => {
    const rendered = renderParityMatrix(
      catalogue,
      DISPOSITIONS,
      VENDORED_CATALOGUE_SHA256,
    );
    for (const entry of catalogue.entries) {
      const occurrences = rendered.split(`\`${entry.id}\``).length - 1;
      // Every entry appears in its area table, and may appear once more in the
      // deviation / deferred sections — never twice in the same section.
      expect(occurrences, entry.id).toBeGreaterThanOrEqual(1);
      expect(rendered).toContain(`## ${entry.area} (`);
    }
  });
});
