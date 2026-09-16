# OmniDoc — Shared Master Instructions

Stable behavioral contract for any coding agent (Cursor, Codex, Copilot,
opencode, or similar). Host-specific quirks live in host adapters; live
facts live in the canonical SoT — not here.

## Identity

- **Organization:** RivenStack
- **Product:** OmniDoc (slug `omni-doc`) — multi-tenant AI/RAG note and
  knowledge SaaS
- **Platform class:** TypeScript frontend (Next.js) + Java 21 / Spring Boot
  API (polyglot monorepo)
- **Repo directory** `omni-note` is historical; never infer the product
  name from the folder

Portfolio / freelancing credibility product: production quality; **no**
commerce, payments, shipping, or SMS.

## Core principles

1. **Customer experience first** — validate premium capture → organize →
   retrieve → ask-your-notes journeys with realistic mocks before
   production AI/provider activation
2. **Ports first** — UI and domain talk through project-owned ports;
   provider SDKs stay behind adapters; UI never calls embedding, LLM,
   vector, or object-storage providers directly
3. **Security first** — tenant isolation at retrieval time is a security
   invariant; cross-tenant leakage is a failure, never a “relevance miss”
4. **Production-ready code** — clear boundaries, tests where they protect
   contracts, no secrets in the repo, no invented stack
5. **Extension-first** — prefer native platform behavior and mature
   extensions when evidence shows fit; popularity alone is insufficient
6. **One owner per handoff** — do not silently reassign or dual-own work

## How to behave

- Be direct and concise; prefer small, reviewable changes
- Stay inside the handoff’s Allowed Write Paths
- Always consider tests, accessibility, and security impact
- Do not invent features, vendors, or ADRs that do not exist
- Do not scaffold a Node `apps/api` — the API is JVM/Gradle (ADR-0005)
- Do not activate production AI / OpenRouter unless a gate explicitly
  authorizes it
- Do not overwrite `docs/handoffs/current.md` unless the handoff
  authorizes it
- Leave open gates open (RTL locale deferred; production AI gated)

## Shared context load order

At the start of every meaningful session, read in this order:

1. [`context.md`](../context.md) — live phase, status, blockers, gates
2. [`architecture.md`](../architecture.md) — boundaries and invariants
3. [`AGENTS.md`](../AGENTS.md) — roster, CX-first, extension-first, ownership
4. Active handoff — Commander index
   [`docs/handoffs/current.md`](../docs/handoffs/current.md) **and** the
   assigned lane head under
   [`docs/handoffs/active/lane-*.md`](../docs/handoffs/active/) (FE/BE).
   During dual-track build, `current.md` is an integration board, not an
   implementer work ticket.
5. [`docs/planning/implementation-tracks.md`](../docs/planning/implementation-tracks.md)
   when doing Phase 1+ work
6. **Accepted** ADRs cited by the handoff under [`docs/adr/`](../docs/adr/)
7. [`MEMORY.md`](../MEMORY.md) + `docs/memory/<role>.md` — supporting only

Then apply:

- [`.agent/CONVENTIONS.md`](CONVENTIONS.md) for coding standards
- [`.agent/TASKS/README.md`](TASKS/README.md) for backlog pointers
- [`.agent/DECISIONS/README.md`](DECISIONS/README.md) for ADR pointers

If the handoff `to:` does not match the role you are playing, stop and
tell the user. Do not silently reassign work.

## Related files in this folder

| File | Use |
|------|-----|
| [`README.md`](README.md) | Layering rule — what is and is not stored here |
| [`CONVENTIONS.md`](CONVENTIONS.md) | Coding, security, testing conventions |
| [`TASKS/`](TASKS/) | Pointers to live tasks (not a second backlog) |
| [`DECISIONS/`](DECISIONS/) | Pointers to ADRs (not ADR copies) |
