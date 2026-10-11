import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tailwind source-registration guard.
 *
 * `globals.css` registers every `packages/ui/src/<dir>` explicitly with
 * `@source`, because Tailwind's automatic detection roots at the consuming app
 * and ignores `node_modules` — where this package is consumed through a pnpm
 * symlink. A directory that is **not** registered contributes no utilities to
 * the bundle, and it fails silently: the block still renders, using only the
 * classes that happen to exist elsewhere.
 *
 * That is exactly the F-05 defect this guards: the new `organize/` directory
 * was never registered, so `divide-y`, `divide-border` and `border-y` were
 * never emitted and the note list rendered as one dense block with no
 * separators — no error, no warning, no failing unit test.
 *
 * The check is deliberately a heuristic: a directory needs registration when it
 * holds a non-test source file with `className=` or `cn(`. `styles/` is the
 * Tailwind entry itself and is excluded. Extend the heuristic if a new pattern
 * for class strings appears.
 *
 * Resolved from the project cwd (`packages/ui`), which the Nx `test` target
 * pins — same convention as `tokens.test.ts`.
 */
const srcDir = path.join(process.cwd(), "src");
const stylesDir = path.join(srcDir, "styles");
const globalsCss = readFileSync(path.join(stylesDir, "globals.css"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const CLASS_STRING_PATTERN = /className=|cn\(/;

describe("globals.css Tailwind sources", () => {
  it("registers every source directory that renders classes", () => {
    const unregistered: string[] = [];

    for (const entry of readdirSync(srcDir)) {
      const dir = path.join(srcDir, entry);
      if (!statSync(dir).isDirectory() || dir === stylesDir) {
        continue;
      }

      const rendersClasses = sourceFiles(dir)
        .filter((file) => !file.includes(".test."))
        .some((file) => CLASS_STRING_PATTERN.test(readFileSync(file, "utf8")));

      if (rendersClasses && !globalsCss.includes(`@source "../${entry}"`)) {
        unregistered.push(entry);
      }
    }

    expect(unregistered).toEqual([]);
  });
});
