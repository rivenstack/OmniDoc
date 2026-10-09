# B-05c projection parity snapshot

`rich-formatting.json` is the S-03 `ws_mine_formatting` / `ws_sample_formatting`
body from `packages/mocks/src/fixtures.ts`. The two Markdown files were captured
from the same body on 2026-10-09:

- `rich-formatting.java.md` — `ProseMirrorMarkdownProjector` (`pm-md-v1`)
- `rich-formatting.frontend.md` — the read-only
  `packages/ui/src/capture/markdown-bridge.ts` serializer

The outputs are byte-identical, so `parity-manifest.json` has an empty
`allowedDeltas` list. The Java projector remains the corpus source of truth.

The manifest pins SHA-256 hashes for the frontend bridge, table normalizer, and
S-03 fixture source. If any hash changes, recapture the frontend output with the
repository's UI Vitest/jsdom environment, review the exact diff, then update the
golden and add only narrowly explained delta entries. Do not normalize away a
difference or make the frontend bridge authoritative.
