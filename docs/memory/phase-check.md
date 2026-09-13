# Phase Check Memory

## Durable Responsibilities

- Independently verify claimed completion against acceptance criteria
- Do not implement fixes in the same pass you are verifying
- Report concrete defects; do not rubber-stamp docs-only claims for UI work

## Recurring Checks

- Live or reproducible evidence for visual/accessibility claims when required
- Gate register untouched unless the handoff authorizes a closure
- Confirm single-owner handoff chain integrity
- Cross-tenant leakage is always Critical
- Citation fabrication / missing citations fail when citations are required
- Do not treat deferred RTL as a closed gate or as shipped RTL support
- Spot-count claimed evidence ids (e.g. `CITE-`/`OBS-`/`UT-`/`REC-`)
  directly with `grep` instead of trusting a package README's stated
  totals — cheap to verify, catches silent drift early
- After a later phase/task rewrites a shared reference (e.g. Architect
  rewriting `architecture.md`), check earlier-phase docs that describe
  that file's *status* (not just its content) for staleness — this is a
  distinct defect class from residue or false-decision claims
- Diff paired operating-layer files that declare "must stay aligned"
  (e.g. root vs `.github/` copilot instructions, `.cursor/agents/*` vs
  `.github/agents/*.agent.md`) rather than assuming the self-imposed rule
  held
- A PASS decision can still carry Medium/Low non-blocking defects; route
  them to their file's Allowed-Write-Path owner in `context.md` /
  archived-handoff outcome rather than opening a second main-track
  handoff — the single next handoff still goes to the gate owner (e.g.
  `@user`)
- When re-verifying a claimed remediation, check the owner's *outcome
  summary against the filesystem*, not the reverse: for a claimed
  "byte-identical" pair, confirm with a checksum (`md5sum`), not only a
  visual `diff`; for a claimed "cross-references X instead of
  duplicating it," re-read the source section and quote-match the
  paraphrase word-for-word rather than accepting that a citation exists;
  an owner may submit remediation but never closes its own defect —
  Phase Check closes it after independent evidence
- A directory/naming decision an ADR itself already asserts as
  "confirmed" (e.g. `frontend/`+`backend/` layout) is not the same class
  of overstatement as presenting a *vendor/tech* choice as decided while
  the ADR is still `proposed` — check what the ADR itself claims before
  flagging downstream docs that repeat it
- Before a repo goes public, run a full-tree secrets/privacy sweep across
  *every* file type, not just Markdown: key/token regexes (provider
  prefixes like `sk-`, `AKIA`, `ghp_`, `xox*`, PEM headers), absolute
  local paths (`/home/<user>/`, `/Users/<user>/`) that leak machine
  identity, stray emails, hidden dotfiles (`.env*`, `.npmrc`, `.netrc`),
  and `.gitignore` adequacy for secrets not yet created — watch for
  overbroad `find`/`grep` path excludes (e.g. excluding `./.git*` also
  silently excludes `./.github` and `./.gitignore`)
- When verifying a mechanical repo-wide rename (e.g. a product-identity
  correction), check three separate failure classes, not just presence/
  absence of the old string: (1) completeness — old string survives only
  where a documented, dated exception exists (e.g. immutable archives);
  (2) phrasing damage — a blind substitution can produce grammatically
  broken or meaning-changed sentences that no `sed` catches, so sample
  broadly and *read* matches with context, don't just count hits; (3)
  scope creep — re-verify counts/statuses/gates that should be
  rename-invariant (evidence ids, ADR status, open-gate list) actually
  stayed invariant. A file with zero occurrences of the old *or* new name
  can still be "in scope" for the check — confirm the rename correctly
  had nothing to do there, rather than assuming untouched means checked
  and clean
- A live handoff/`context.md` can go stale relative to a *later*
  Phase-Check pass even though this verifier is correctly barred from
  editing it mid-flight (write boundaries do not authorize a rewrite):
  record that staleness as a low/informational defect routed to the
  handoff's maintaining owner rather than silently living with it or
  repairing it outside the write boundary
- A remediation that fixes stale defect-status text can itself say
  "zero open defects" slightly before Phase Check formally closes the
  very defect tracking that fix — this is a closure-ordering nuance, not
  a new false claim, as long as the defect ID is named in the same
  sentence (no hidden defect) and severity was already non-blocking;
  close it and move on rather than raising a fourth-order defect about a
  self-resolving sequencing technicality
