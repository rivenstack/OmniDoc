# Copilot custom agents

GitHub Copilot loads custom agent profiles from `.github/agents/*.agent.md`
(YAML frontmatter + Markdown prompt). See:
https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents

| Agent file | Role | Cursor twin |
|------------|------|-------------|
| `commander.agent.md` | `/commander` | `.cursor/agents/commander.md` |
| `architect.agent.md` | `/architect` | `.cursor/agents/architect.md` |
| `researcher.agent.md` | `/researcher` | `.cursor/agents/researcher.md` |
| `ux_researcher.agent.md` | `/ux_researcher` | `.cursor/agents/ux_researcher.agent.md` |
| `designer.agent.md` | `/designer` | `.cursor/agents/designer.agent.md` |
| `implementer.agent.md` | `/implementer` | `.cursor/agents/implementer.md` |
| `phase-check.agent.md` | `/phase-check` | `.cursor/agents/phase-check.md` |

Keep Cursor and Copilot role contracts aligned when you edit either side.
Canonical repo-wide Copilot instructions: `../copilot-instructions.md`.
