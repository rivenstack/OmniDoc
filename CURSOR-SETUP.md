# Cursor Setup for OmniDoc

## What Cursor detects automatically

- `AGENTS.md` is project-level guidance. Cursor reads it as persistent
  repository instructions; it does **not** create a selectable custom agent.
- Custom subagents must be Markdown files inside `.cursor/agents/`.
- Cursor may delegate using a subagent `description`, or you invoke with
  `/agent-name`.

## Registered project subagents

- `/commander`
- `/architect`
- `/researcher`
- `/ux_researcher` (prose: `/ux-researcher`; files may use
  `ux_researcher.agent.md`)
- `/designer` (file may be `designer.agent.md`)
- `/implementer`
- `/phase-check`

## Copilot alias note

GitHub Copilot does not load `.cursor/agents/` as slash agents. Use
`copilot-instructions.md` and paste/read the matching agent contract
while stating the role for that turn. File naming is preserved for
Cursor parity.

## Start the project

Open the repository root in Cursor, then:

```text
/commander Read docs/handoffs/current.md and execute the handoff exactly. Update the required files, context.md, and the next persistent handoff before finishing.
```

Wave-B parallel tasks (Phase 0):

```text
/researcher Read docs/handoffs/active/phase-0-task-0-2-researcher.md and execute it exactly.
/ux_researcher Read docs/handoffs/active/phase-0-task-0-3-ux-researcher.md and execute it exactly.
/implementer Read docs/handoffs/active/phase-0-task-0-4-implementer.md and execute it exactly.
```

## Expected behavior

Custom subagents are available to Cursor's main Agent as delegated tools.
Type `/` in Agent chat and search for the subagent name.

## Troubleshooting

1. Workspace folder must be the repository root containing `.cursor/` and `AGENTS.md`
2. Agent files must end in `.md` under `.cursor/agents/`
3. Start a new Agent chat after adding or moving agent files
4. Reload the window if slash completion has not refreshed
5. Test with `/commander summarize the current phase from context.md`

## Persistent handoffs

Main track: `docs/handoffs/current.md`. Parallel: `docs/handoffs/active/`.
Every agent must persist the next handoff before ending. See
`docs/handoffs/README.md`.

## Memory

New sessions: read `context.md`, `MEMORY.md`, role memory under
`docs/memory/`, and the active handoff before acting.

## MCP setup

`.cursor/mcp.json` is an example with empty `mcpServers`. Add servers
locally; inject tokens only via the host environment or a secrets
manager. Never commit credentials. Repository Markdown remains
authoritative over any MCP memory tool.
