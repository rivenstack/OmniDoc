# opencode Setup for OmniDoc

## What opencode detects automatically

- `AGENTS.md` is the project-level rules surface. opencode loads it as
  persistent repository instructions (same role as in Cursor). There is
  no separate rules directory: `.cursor/rules/` is an empty placeholder
  on every host, so `AGENTS.md` plus the agent contracts are the rules.
- Project agents are Markdown files in `.opencode/agent/`.
- Project commands are Markdown files in `.opencode/command/`.
- Project skills are registered in the root `opencode.json` via
  `skills.paths`. OmniDoc points opencode at `.cursor/skills/` so
  `.cursor/skills/` stays the single source of truth for skills (no
  duplicated copies).

## Registered project agents (`.opencode/agent/`)

Each agent is available both as a switchable/delegated agent and via a
matching slash command:

| Role | Agent file | Command |
|------|------------|---------|
| Commander | `commander.md` | `/commander` |
| Architect | `architect.md` | `/architect` |
| Researcher | `researcher.md` | `/researcher` |
| UX Researcher | `ux-researcher.md` | `/ux-researcher` (alias `/ux_researcher`) |
| Designer | `designer.md` | `/designer` |
| Implementer | `implementer.md` | `/implementer` |
| Phase Check | `phase-check.md` | `/phase-check` |

`ux_researcher` remains the handoff metadata identifier for host parity;
`/ux-researcher` is the canonical command here, with `/ux_researcher`
registered as an alias so handoff start commands work verbatim.

## Cursor-specific data that was adapted

- **Model names.** Cursor frontmatter pins
  `grok-4.5[effort=high,fast=…]` (most roles) and `claude-sonnet-5[]`
  (phase-check). Those identifiers are Cursor host-specific and are
  **not** valid opencode model IDs, so the opencode agents omit `model`
  and inherit the session model (for example `ollama/glm-5:cloud`).
  To pin a role to a specific model, add to its frontmatter or to
  `opencode.json` under `agent.<name>.model`, e.g.:
  `model: ollama/glm-5:cloud`
- **Cursor effort/variant knobs** (`[effort=high,fast=false]`) have no
  opencode equivalent and were dropped.
- **Kimi K2.7 Code** references (designer/commander screenshot
  analysis) were generalized to "a vision-capable model in the
  session" — pick any vision model available in your providers.
- **MCP plugin names** (`plugin-figma-figma`, GSAP Master MCP,
  `plugin-canva-canva`) are kept in the role prompts. Configure any of
  them under `mcp` in `opencode.json` if you want them live; the
  prompts already degrade gracefully when a catalog entry is missing.
- **`disable-model-invocation: true`** on the `reproducible-baseline-check`
  skill is Cursor-only. In opencode, treat that skill as
  manual-invocation discipline (do not auto-run it mid-task).
- **Skill `paths:` frontmatter** is Cursor trigger metadata; opencode
  ignores it and scans `.cursor/skills/` wholesale.

## Start the project

From the repository root:

```text
/commander Read docs/handoffs/current.md and execute the handoff exactly. Update the required files, context.md, and the next persistent handoff before finishing.
```

Wave-B parallel tasks (Phase 0):

```text
/researcher Read docs/handoffs/active/phase-0-task-0-2-researcher.md and execute it exactly.
/ux_researcher Read docs/handoffs/active/phase-0-task-0-3-ux-researcher.md and execute it exactly.
/implementer Read docs/handoffs/active/phase-0-task-0-4-implementer.md and execute it exactly.
```

You can also Tab-switch the session to a role agent, or delegate with
`@role` / the task tool; the slash commands are the handoff-driven path.

## Expected behavior

Agents registered under `.opencode/agent/` appear in the agent switcher
and as delegation targets. Slash commands under `.opencode/command/`
run the named role agent with your typed arguments.

## Troubleshooting

1. Working directory must be the repository root (containing
   `opencode.json`, `.opencode/`, and `AGENTS.md`).
2. opencode loads config at startup only — quit and restart opencode
   after adding or editing agents, commands, skills, or `opencode.json`.
3. Validate config if startup fails: the schema is
   https://opencode.ai/config.json.
4. Test with `/commander summarize the current phase from context.md`.

## Persistent handoffs

Main track: `docs/handoffs/current.md`. Parallel: `docs/handoffs/active/`.
Every agent must persist the next handoff before ending. See
`docs/handoffs/README.md`.

## Memory

New sessions: read `context.md`, `MEMORY.md`, role memory under
`docs/memory/`, and the active handoff before acting.

## MCP setup

`.cursor/mcp.json` is the Cursor host file and is empty. For opencode,
add servers under `mcp` in `opencode.json`; inject tokens only via the
host environment or a secrets manager (`{env:VAR}` interpolation).
Never commit credentials. Repository Markdown remains authoritative
over any MCP memory tool.
