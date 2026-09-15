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
| `accepted (partial)` | Named categories/sections accepted by `@user`; the rest remain `proposed` until answered. The ADR must list which is which. |
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
| [ADR-0001](./ADR-0001-frontend-and-platform-stack.md) | Frontend and platform stack | `accepted` — §1–§5, §7 (2026-09-14); §6 **library reopened** 2026-09-15 → ADR-0005 |
| [ADR-0002](./ADR-0002-workspace-and-tooling.md) | Workspace and tooling (Nx, pnpm, app/package layout, boundary enforcement) | `accepted` (FE graph); Node `apps/api` / TS domain SoT **reopened** 2026-09-15 |
| [ADR-0003](./ADR-0003-frontend-application-toolchain.md) | Frontend application toolchain (styling/components, data + state, testing, supporting libraries) | `accepted` |
| [ADR-0004](./ADR-0004-dual-mode-byok-and-usage.md) | Dual-mode BYOK, vault, usage metering, and key resolution | `accepted` |
| [ADR-0005](./ADR-0005-backend-application-stack.md) | Backend application stack (Java/Spring candidate) | `proposed` — U-BE |
