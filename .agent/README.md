# OmniDoc — Shared Agent Bootstrap

This folder is the **shared, host-agnostic bootstrap** for Cursor, Codex,
Copilot, opencode, and similar agents. It is **not** a second source of
truth for live status or architecture.

## Layering (maintenance contract)

| Layer | Where | When to edit |
|-------|-------|--------------|
| Canonical SoT | `context.md`, `architecture.md`, `docs/adr/`, `docs/handoffs/`, `docs/planning/implementation-tracks.md`, `docs/planning/feature-backlog.md`, role memory | After every real decision or phase change |
| Shared bootstrap | `.agent/*` (this folder) | Rarely — identity, principles, load order, stable conventions |
| Host adapters | `AGENTS.md`, `.cursor/`, `.github/copilot-instructions.md`, `.codex/`, `.opencode/` | Only when host quirks or invocation change |
| Attach snapshot | `GEMINI_CONTEXT.md` | Regenerate before attaching to Gemini after material SoT changes |

**Rule:** Do **not** copy live phase/status, ADR bodies, or backlog rows
into this folder. After a decision, update the canonical SoT once; host
adapters and this bootstrap keep working.

## What lives here

| File | Role |
|------|------|
| [`COMMANDER.md`](COMMANDER.md) | Stable master behavior + shared load order |
| [`CONVENTIONS.md`](CONVENTIONS.md) | Stable coding, security, and test conventions |
| [`TASKS/README.md`](TASKS/README.md) | Pointers to the program of record and handoffs |
| [`DECISIONS/README.md`](DECISIONS/README.md) | Pointers to ADRs |

## What does **not** live here

- Live phase / active tasks → read [`context.md`](../context.md)
- Architecture / ports / tenancy → read [`architecture.md`](../architecture.md)
- Accepted stack choices → read [`docs/adr/`](../docs/adr/)
- Assignments → read [`docs/handoffs/`](../docs/handoffs/)

## Host entrypoints

- **Cursor / opencode:** [`AGENTS.md`](../AGENTS.md) + role agents under
  `.cursor/agents/` or `.opencode/agent/`
- **Copilot:** [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
  (root `copilot-instructions.md` is a byte-identical mirror)
- **Codex:** [`.codex/INSTRUCTIONS.md`](../.codex/INSTRUCTIONS.md)
- **Gemini Chat / AI Studio:** attach [`GEMINI_CONTEXT.md`](../GEMINI_CONTEXT.md)
  (snapshot — refresh from SoT before attach)
