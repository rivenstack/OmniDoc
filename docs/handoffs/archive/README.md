# Handoff Archive

Consumed or superseded main-track and parallel handoffs live here.

## Naming

```text
H-YYYY-MM-DD-PN-TNN-from-to.md
```

Examples:

- `H-2026-09-13-P0-T01-user-commander.md`
- `H-2026-09-13-P0-T02-commander-researcher.md`

## Rules

1. Before rewriting a stable `docs/handoffs/active/lane-*.md` head (or
   replacing the Commander index `current.md`), copy the consumed file
   here and set `status: completed` or `status: blocked`
2. Add a short outcome summary at the top or bottom of the archived copy
3. Do not edit archived handoffs after they become historical truth
   (except trivial metadata fixes Commander authorizes). Product-identity
   corrections are recorded in this README — not by rewriting archive
   bodies — so `/phase-check` ledger integrity stays verifiable.
4. A ready handoff superseded before execution is archived as
   `status: blocked` with an outcome noting supersession — not failure
5. Lane handoffs are archived on each same-lane iteration; Commander
   keeps `current.md` as the dual-lane integration index during Phase 1+
   build

See `../README.md` for the full protocol.

## Identity correction (2026-09-13)

**Canonical product name:** OmniDoc (slug `omni-doc`).  
**Public remote:** `https://github.com/rivenstack/OmniDoc.git`.

Phase 0 archived handoffs below still say **OmniNote** / `omni-note`.
That name was inferred from the local workspace folder during bootstrap
and was never confirmed by `@user`. On 2026-09-13 `@user` confirmed
**OmniDoc** as canonical. Live documents were renamed; Commander
**preserved these archive bodies unchanged** so completed handoffs remain
immutable historical records for ledger verification.

When reading an archived Phase 0 handoff that says OmniNote, treat the
product as OmniDoc — same multi-tenant AI/RAG note and knowledge SaaS
scope; only the name was wrong. Do not treat the archive wording as a
live identity conflict.

## Phase 1 numbering correction (2026-09-14)

`H-2026-09-14-P1-T01-commander-designer.md` and
`H-2026-09-14-P1-T02-commander-implementer.md` were **superseded before
execution** (`status: blocked`). Live successor for design is **D-01**.

## Backend Stack Close-out (2026-09-15)

`H-2026-09-15-P1-S01-commander-implementer.md` (Node `apps/api`) was
**superseded before execution** (`status: blocked`). Backend Stack
Close-out completed 2026-09-15: R-BE → A-BE → U-BE (accept-with-
amendments) → A-BE2 (ADR-0005 `accepted`). Live successors: **S-01a** /
**S-01b** under `docs/handoffs/active/`. See
`docs/planning/implementation-tracks.md`.
