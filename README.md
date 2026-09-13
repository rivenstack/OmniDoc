# OmniDoc

Multi-tenant AI/RAG note and knowledge SaaS. Users capture notes and
documents; the system chunks and embeds them; users search and ask
questions that return **cited answers** from their own corpus.

| | |
|---|---|
| Platform | TypeScript web SaaS |
| Primary locale | `en` (LTR) |
| RTL / mixed-BiDi | Deferred, **not closed** — RTL-readiness discipline is mandatory now |
| Market | Global English-speaking |
| Context | Portfolio / freelancing credibility product (production quality; no commerce, payments, shipping, or SMS) |
| Repository | [`github.com/rivenstack/OmniDoc`](https://github.com/rivenstack/OmniDoc) |

## Current status (Phase 0)

**Phase 0 — Project Setup and Decision Baseline.** Operating contracts
are retargeted to OmniDoc. Technical and UX research, plus this
frontend onboarding pack, run in parallel. The concrete stack is **not
chosen yet**.

| Decision | State |
|----------|--------|
| Product identity and CX-first rules | Settled |
| Agent operating system and handoff protocol | Settled |
| Primary locale `en` (LTR) | Settled |
| Architecture baseline (ports, tenancy, threat/RAG bars, fixtures) | Defined in [`architecture.md`](architecture.md) (architecture-ready draft) |
| Frontend framework, editor, DB, vector store, auth, hosting | **Proposed** in [ADR-0001](docs/adr/ADR-0001-frontend-and-platform-stack.md) — **not accepted**; awaits `@user` |
| Package manager | Still undecided (research did not evaluate; confirm at implementation) |
| RTL locale shipping | Deferred (not closed) |
| Production AI / provider activation | Open |

Do not invent a stack. Do not add `package.json` or app scaffolding until
ADR-0001 is accepted by `@user`. Today ADR-0001 is only **`proposed`** — a
recommendation exists; it is not binding yet.
Live status: [`context.md`](context.md). ADR index: [`docs/adr/`](docs/adr/README.md).

## Frontend contributors

Start here: **[`docs/frontend/README.md`](docs/frontend/README.md)**

That guide covers product journeys, settled vs undecided decisions,
clone/prerequisites, the handoff system for humans, non-negotiable
engineering rules, branch/PR conventions, and concrete work you can do
**today** before the stack is chosen.

Contribution rules for everyone: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Repository map

```text
OmniDoc/
├── README.md                 # This file — product & repo entry
├── CONTRIBUTING.md           # Human contribution rules
├── context.md                # Live phase / status (authoritative)
├── architecture.md           # OmniDoc architecture baseline (ports, tenancy, invariants)
├── AGENTS.md                 # Agent operating contract
├── AGENTS-GUIDE.md           # Phase/task workflow patterns
├── CURSOR-SETUP.md           # Cursor subagent registration tips
├── MEMORY.md                 # Shared durable lessons (not live status)
├── TEMPLATE-PLACEHOLDERS.md  # Resolved identity; do not reintroduce template tokens
├── docs/
│   ├── frontend/             # Frontend contributor onboarding
│   ├── adr/                  # Architecture Decision Records (ADR-0001 proposed)
│   ├── handoffs/             # Persistent agent/human handoffs
│   ├── memory/               # Per-role durable memory
│   ├── research/             # Technical & UX evidence packs
│   └── api/                  # API contracts (expected; may not exist yet)
├── frontend/                 # App UI — confirmed directory contract (not present yet)
├── backend/                  # App API / workers — confirmed directory contract (not present yet)
├── .cursor/                  # Cursor agents, skills, rules, mcp.json
└── references/               # Reference-capture pattern (optional)
```

[`architecture.md`](architecture.md) is the OmniDoc **architecture-ready
baseline**: experience-first ports, retrieval-time tenant isolation,
answer/citation states, threat/safety bars, and mock-fixture themes.
Stack-specific choices live under [`docs/adr/`](docs/adr/README.md).
ADR-0001 is **`proposed`**, not accepted — read the proposal for what is
likely coming; do not scaffold as if it already won.

`frontend/` and `backend/` are the **confirmed** directory contract
(Architect + ADR-0001 proposal; aligned with
`.cursor/skills/api-contract-change/SKILL.md`). Apps are still absent
until ADR-0001 acceptance and an implementation handoff.

## Agent operating system (at a glance)

OmniDoc is built with a multi-agent Cursor workflow. Humans and agents
share the same handoff protocol.

| Role | Owns |
|------|------|
| `/commander` | Phase plan, routing, accept/return |
| `/architect` | Boundaries, ADRs, ports |
| `/researcher` | Technical / market / legal / provider evidence |
| `/ux-researcher` (`ux_researcher`) | Customer behavior, journeys, design-facing UX |
| `/designer` | Visual system, components, LTR-now / RTL-ready UI specs |
| `/implementer` | Reproducible construction |
| `/phase-check` | Independent verification |

Workflow order:

```text
Researcher + UX Researcher → Architect → Designer → Implementer → Phase Check → Commander
```

Exactly **one** owner per handoff. Chat-only handoffs are invalid.

- Operating contract: [`AGENTS.md`](AGENTS.md)
- Live status: [`context.md`](context.md)
- Handoff protocol: [`docs/handoffs/README.md`](docs/handoffs/README.md)
- Cursor setup: [`CURSOR-SETUP.md`](CURSOR-SETUP.md)
- Workflow patterns: [`AGENTS-GUIDE.md`](AGENTS-GUIDE.md)

Main track: `docs/handoffs/current.md`. Parallel work:
`docs/handoffs/active/`. Consumed handoffs: `docs/handoffs/archive/`.

## No secrets

Never commit API keys, BYOK credentials, provider tokens, or real
`.env` values. Document environment variables as placeholders only
(for example `.env.example` with empty or fake values).
`.cursor/mcp.json` must stay free of secrets; keep any secret-bearing
local MCP overrides out of git.

## License / ownership

Private portfolio project unless `@user` states otherwise.
