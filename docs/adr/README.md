# OmniDoc — Architecture Decision Records

ADRs are the durable record of material architecture decisions. Live
phase/task status belongs in `context.md`. Evidence packages live under
`docs/research/` and do **not** select vendors.

## Numbering

- Files: `ADR-NNNN-short-kebab-title.md` (zero-padded four-digit `NNNN`)
- Numbers are monotonic and never reused
- One decision theme per ADR (do not bundle unrelated choices)

## Statuses

| Status | Meaning |
|--------|---------|
| `proposed` | Architect recommendation; **not** binding until accepted |
| `accepted` | Binding after the required acceptance path |
| `superseded` | Replaced by a later ADR (link both ways) |
| `rejected` | Explicitly declined; retained for history |

## Acceptance path

1. Architect authors the ADR (`status: proposed`) from evidence.
2. Phase Check may verify citation integrity and open gates — it does
   **not** accept ADRs.
3. `@user` accepts, rejects, or requests changes for gates listed in the
   ADR (and any Commander-routed acceptance).
4. Only then may status become `accepted`, and `architecture.md` /
   implementation handoffs may treat the choice as settled.

Until acceptance, Implementer must not scaffold a stack “as decided.”

## Relationship to other docs

| Doc | Role |
|-----|------|
| `architecture.md` | Boundaries, ports, invariants |
| `docs/adr/*` | Durable decisions (why this option) |
| `context.md` | Live status, blockers, open gates |
| `docs/research/*` | Evidence inputs — not decisions |
| `docs/handoffs/*` | Assignments |

## Current ADRs

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-0001](./ADR-0001-frontend-and-platform-stack.md) | Frontend and platform stack | `proposed` |
