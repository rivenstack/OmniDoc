// Renders the human-readable parity matrix from the vendored RE-Obsidian
// catalogue plus the typed dispositions map (F-15 Rev 2, plan Task 0.1 and §3).
//
// The rendered markdown is written to `docs/fidelity/obsidian-parity-matrix.md`
// by `matrix.test.ts` (test-time snapshot). It is regenerated at each phase
// close — never hand-edited.

import type { Disposition, EntryDisposition } from "./dispositions";

/** The subset of a catalogue entry this renderer reads. */
export type CatalogueEntry = {
  readonly id: string;
  readonly area: string;
  readonly construct: string;
  readonly title: string;
  readonly coverage: string;
  readonly doc_status: string;
  readonly unknowns: readonly string[];
  readonly reference_code?: string;
};

/** The subset of the vendored catalogue this renderer reads. */
export type Catalogue = {
  readonly target: {
    readonly name: string;
    readonly version: string;
    readonly edition: string;
    readonly platform_analysed: string;
    readonly electron: string;
    readonly sha256: string;
    readonly sha256_verified: boolean;
    readonly analyzed_at: string;
  };
  readonly entries: readonly CatalogueEntry[];
};

/** Display / tally order for dispositions (plan §2 totals line). */
export const DISPOSITION_ORDER: readonly Disposition[] = [
  "adopt",
  "adapt",
  "deviation",
  "defer",
  "gated",
  "out-of-scope",
];

/** Counts rows per disposition, in `DISPOSITION_ORDER`. */
export function tallyDispositions(
  dispositions: Readonly<Record<string, EntryDisposition>>,
): Record<Disposition, number> {
  const tally = Object.fromEntries(
    DISPOSITION_ORDER.map((d) => [d, 0]),
  ) as Record<Disposition, number>;
  for (const row of Object.values(dispositions)) tally[row.disposition] += 1;
  return tally;
}

/** `73 adopt · 15 adapt · …` — the totals line, in plan order. */
export function formatTally(
  dispositions: Readonly<Record<string, EntryDisposition>>,
): string {
  const tally = tallyDispositions(dispositions);
  return DISPOSITION_ORDER.map((d) => `${tally[d]} ${d}`).join(" · ");
}

/** Strips the `OBS-1.14.4-` prefix; the plan's tables use short IDs. */
export function shortId(id: string): string {
  return id.replace(/^OBS-1\.14\.4-/, "");
}

/** Escapes a value for a markdown table cell. */
function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/** `**73 adopt** · 15 adapt · …` for the matrix body. */
function tallyMarkdown(
  dispositions: Readonly<Record<string, EntryDisposition>>,
): string {
  const tally = tallyDispositions(dispositions);
  return DISPOSITION_ORDER.map((d) =>
    tally[d] > 0 ? `**${tally[d]} ${d}**` : `${tally[d]} ${d}`,
  ).join(" · ");
}

function areaRows(
  entries: readonly CatalogueEntry[],
  dispositions: Readonly<Record<string, EntryDisposition>>,
): string[] {
  const lines: string[] = [];
  for (const entry of entries) {
    const row = dispositions[shortId(entry.id)];
    // `+unknowns` keeps a catalogue gap visible on the row itself, not only in
    // the gaps section at the bottom (plan §4.4: gaps stay marked).
    const coverage =
      entry.unknowns.length > 0 ? `${entry.coverage} +unknowns` : entry.coverage;
    lines.push(
      `| \`${entry.id}\` | ${row.disposition} | ${cell(row.task ?? "—")} | ${coverage} | ${cell(row.note)} |`,
    );
  }
  return lines;
}

/**
 * Renders `docs/fidelity/obsidian-parity-matrix.md`. Pure: same inputs, same
 * bytes — the test writes the result to disk.
 */
export function renderParityMatrix(
  catalogue: Catalogue,
  dispositions: Readonly<Record<string, EntryDisposition>>,
  vendoredSha256: string,
): string {
  const lines: string[] = [];
  const target = catalogue.target;

  lines.push("# Obsidian 1.14.4 parity matrix — F-15 Rev 2");
  lines.push("");
  lines.push(
    "**Generated view — do not edit by hand.** Rendered from the vendored",
    "catalogue plus",
    "`packages/ui/src/codemirror/parity/dispositions.ts` by",
    "`packages/ui/src/codemirror/parity/matrix.test.ts`. Regenerated at each plan",
    "phase close.",
  );
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|---|---|");
  lines.push(
    `| Artifact | ${target.name} ${target.version} (${target.edition}, ${target.platform_analysed}, Electron ${target.electron}) |`,
  );
  lines.push(`| Artifact SHA-256 | \`${target.sha256}\` |`);
  lines.push(`| Artifact analysed | ${target.analyzed_at} |`);
  lines.push("| Vendored catalogue | `docs/fidelity/obsidian-1.14.4.behaviours.json` |");
  lines.push(`| Vendored SHA-256 | \`${vendoredSha256}\` |`);
  lines.push(`| Entries | ${catalogue.entries.length} |`);
  lines.push(
    `| Totals | ${formatTally(dispositions)} |`,
    "| Plan of record | `docs/plans/2026-10-13_181100-obsidian-fidelity-editor.md` |",
    "| Dispositions map | `packages/ui/src/codemirror/parity/dispositions.ts` |",
  );
  lines.push("");
  lines.push(
    "Task references are the plan's `<phase>.<task>` numbers; `§4.1` means the",
    "plan's settings table rather than a phase task. A note is normative for",
    "implementation (plan §2).",
  );
  lines.push("");
  lines.push(`**Totals:** ${tallyMarkdown(dispositions)}.`);
  lines.push("");

  // Group by catalogue area, preserving the catalogue's own order.
  const areas = [...new Set(catalogue.entries.map((e) => e.area))];
  for (const area of areas) {
    const entries = catalogue.entries.filter((e) => e.area === area);
    lines.push(`## ${area} (${entries.length})`);
    lines.push("");
    lines.push("| Entry | Disposition | Task | Coverage | Note |");
    lines.push("|---|---|---|---|---|");
    lines.push(...areaRows(entries, dispositions));
    lines.push("");
  }

  lines.push("## Recorded deviations and adaptations");
  lines.push("");
  lines.push(
    "Plan §4.2 records the project-level deviations (D-1…D-9). The rows below are",
    "entry-level adaptation reasons — the catalogue behaviour is matched, the",
    "integration point is ours.",
  );
  lines.push("");
  lines.push("| Entry | Disposition | Recorded reason |");
  lines.push("|---|---|---|");
  for (const entry of catalogue.entries) {
    const row = dispositions[shortId(entry.id)];
    if (!row.deviation) continue;
    lines.push(`| \`${entry.id}\` | ${row.disposition} | ${cell(row.deviation)} |`);
  }
  lines.push("");

  lines.push("## Deferred, gated and out-of-scope");
  lines.push("");
  lines.push(
    "These rows carry **no implementation task**. The re-open condition is the",
    "only way they re-enter the plan (plan §0.4 negatives and §4.4 unknowns are",
    "not upgrades of these rows).",
  );
  lines.push("");
  lines.push("| Entry | Disposition | Plan reference | Re-open condition |");
  lines.push("|---|---|---|---|");
  for (const entry of catalogue.entries) {
    const row = dispositions[shortId(entry.id)];
    if (
      row.disposition === "defer" ||
      row.disposition === "gated" ||
      row.disposition === "out-of-scope"
    ) {
      lines.push(
        `| \`${entry.id}\` | ${row.disposition} | ${cell(row.task ?? "—")} | ${cell(row.reOpen ?? "—")} |`,
      );
    }
  }
  lines.push("");

  const gaps = catalogue.entries.filter(
    (e) => e.coverage !== "verified" || e.unknowns.length > 0,
  );
  lines.push("## Catalogue coverage gaps (recorded unknowns)");
  lines.push("");
  lines.push(
    "Catalogue `partial` entries and `unknowns` are implemented to the stated",
    "extent and **stay marked** — they are never silently upgraded (plan §4.4).",
  );
  lines.push("");
  if (gaps.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Entry | Coverage | Unknowns |");
    lines.push("|---|---|---|");
    for (const entry of gaps) {
      lines.push(
        `| \`${entry.id}\` | ${entry.coverage} | ${cell(entry.unknowns.join("; ") || "—")} |`,
      );
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
