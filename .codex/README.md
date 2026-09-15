# Codex host adapter — OmniDoc

Use this folder when working on OmniDoc with **OpenAI Codex** (CLI or IDE).

## Quick start

1. Open the repository root (the folder that contains `AGENTS.md` and
   `.agent/`).
2. Read [`.codex/INSTRUCTIONS.md`](INSTRUCTIONS.md) first.
3. Follow the shared load order in [`.agent/COMMANDER.md`](../.agent/COMMANDER.md)
   — it points at the canonical SoT (`context.md`, `architecture.md`,
   handoffs, ADRs). Do **not** expect a duplicated project status file
   under `.codex/`.

## What this folder is

- Host-specific operating rules for Codex (concise, high-signal)
- A pointer into the shared `.agent/` bootstrap and live docs

## What this folder is not

- Not a second copy of architecture or live status
- Not a replacement for Cursor agents under `.cursor/agents/`
- Not authorized to invent stack, open gates, or overwrite handoffs

## After decisions

Update canonical SoT only (`context.md`, ADRs, handoffs, planning tracks).
You should not need to rewrite `.codex/` unless Codex host behavior
itself changes.
