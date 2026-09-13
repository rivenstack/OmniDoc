# Copilot-Friendly Role Aliases

Cursor loads these files as subagents. GitHub Copilot does not. Use the
mapping below when instructing Copilot Chat.

| Role | Cursor command | Contract file |
|------|----------------|---------------|
| Commander | `/commander` | `commander.md` |
| Architect | `/architect` | `architect.md` |
| Researcher | `/researcher` | `researcher.md` |
| UX Researcher | `/ux_researcher` | `ux_researcher.agent.md` |
| Designer | `/designer` | `designer.agent.md` |
| Implementer | `/implementer` | `implementer.md` |
| Phase Check | `/phase-check` | `phase-check.md` |

Session prompt pattern:

```text
You are acting as /<role> only. Read docs/handoffs/current.md and the
matching .cursor/agents/<file>. Execute exactly. Persist the next handoff.
```

Do not rename the agent files solely for Copilot — keep Cursor naming.
