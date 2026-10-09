# Codex host adapter — OmniDoc

Use this folder when working on OmniDoc with **OpenAI Codex** (CLI or IDE).

## Quick start

1. Open the repository root (the folder that contains `AGENTS.md` and
   `.agent/`).
2. Select a role with a Codex skill mention, for example `$commander` or
   `$implementer`. Use `/skills` to browse the role list in Codex; ChatGPT
   surfaces may expose the same skills through `@` or the slash picker.
3. Read [`.codex/INSTRUCTIONS.md`](INSTRUCTIONS.md) first.
4. Follow the shared load order in [`.agent/COMMANDER.md`](../.agent/COMMANDER.md)
   — it points at the canonical SoT (`context.md`, `architecture.md`,
   handoffs, ADRs). Do **not** expect a duplicated project status file
   under `.codex/`.

## Role commands

Codex loads the checked-in role adapters from `.agents/skills/`:

| Role | Codex invocation |
|------|------------------|
| Commander | `$commander` |
| Architect | `$architect` |
| Researcher | `$researcher` |
| UX Researcher | `$ux-researcher` |
| Designer | `$designer` |
| Implementer | `$implementer` |
| Phase Check | `$phase-check` |

Literal project-defined `/commander` commands are not a Codex extension
point. Enabled skills appear in Codex's skill/slash picker, but `$role` is
the portable explicit form in Codex CLI and the IDE extension.

## What this folder is

- Host-specific operating rules for Codex (concise, high-signal)
- Thin Codex role adapters under `.agents/skills/`
- A pointer into the shared `.agent/` bootstrap and live docs

## What this folder is not

- Not a second copy of architecture or live status
- Not a replacement for Cursor agents under `.cursor/agents/`
- Not authorized to invent stack, open gates, or overwrite handoffs

## After decisions

Update canonical SoT only (`context.md`, ADRs, handoffs, planning tracks).
You should not need to rewrite `.codex/` unless Codex host behavior
itself changes.
