# OmniDoc Cursor Skills

Cursor project skills live under:

```text
.cursor/skills/<skill-name>/SKILL.md
```

Cursor automatically discovers them when the repository root is open.

## Skills included

| Skill | Purpose |
|---|---|
| `handoff-authoring` | Create/archive a valid single-owner persistent handoff |
| `adr-decision` | Turn evidence into a clean material architecture decision/ADR |
| `api-contract-change` | Change HTTP/OpenAPI/SSE contracts safely across frontend/backend |
| `tenant-security-review` | Review auth, ACL, tenant, IDOR/RLS/retrieval boundaries |
| `threat-model` | Threat-model new trust boundaries, sensitive flows, providers, and BYOK |
| `ai-content-safety` | Review prompt injection, untrusted content, Markdown, XSS/SSRF, provider/tool trust |
| `rag-evaluation` | Measure retrieval/citation quality and tenant-isolation regressions |
| `migration-safety` | Plan relational/vector/chunk/embedding/auth migrations safely |
| `reproducible-baseline-check` | Clean-clone verification of local development baseline |

## Skills vs subagents

Use a **subagent** when the task needs:

- a separate context window;
- long research;
- multi-step specialist work;
- independent verification;
- parallel workstream isolation.

Use a **skill** when the task is a repeatable procedure/checklist that one of the existing agents should apply.

Examples:

- Architect + `adr-decision`
- Architect/Implementer + `threat-model`
- Implementer/Phase Check + `tenant-security-review`
- Researcher/Architect/Implementer + `rag-evaluation`
- Implementer + `migration-safety`
- Phase Check + `reproducible-baseline-check`

## Important

Skills do not override:

1. latest user instruction;
2. `AGENTS.md`;
3. accepted architecture/ADRs;
4. role ownership;
5. active handoff.

Do not create a new skill just because instructions are long. Add one only when the workflow is reusable.
