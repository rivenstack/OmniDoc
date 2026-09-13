# Contributing to OmniDoc

Thanks for helping. This repository uses a **handoff-first** workflow
shared by human contributors and Cursor agents. Frontend-specific
onboarding lives in [`docs/frontend/README.md`](docs/frontend/README.md) —
read that instead of duplicating it here (including clone steps for
[`https://github.com/rivenstack/OmniDoc`](https://github.com/rivenstack/OmniDoc)).

## Before you write code

1. Read [`context.md`](context.md) for live phase, blockers, and open gates.
2. Read your assignment:
   - Main track: [`docs/handoffs/current.md`](docs/handoffs/current.md)
   - Parallel: the exact file under [`docs/handoffs/active/`](docs/handoffs/active/)
3. Read Allowed Write Paths and stay inside them.
4. Confirm stack status: **ADR-0001 is `proposed`**, not accepted — read
   [`docs/adr/ADR-0001-frontend-and-platform-stack.md`](docs/adr/ADR-0001-frontend-and-platform-stack.md)
   for the recommendation, then wait for the `@user` gate. Do not add
   framework scaffolding or lockfiles early.

Protocol detail: [`docs/handoffs/README.md`](docs/handoffs/README.md).

## Ownership boundaries

- Exactly **one** primary owner per handoff or bounded task.
- Chat-only assignments are invalid — persist work intent in Markdown
  handoffs (or link a PR to an existing handoff).
- Do not overwrite another track’s files. Parallel tasks must not share
  overlapping write paths.
- Research evidence is not an architecture decision. Do not treat
  shortlists as selected vendors.

## What requires an ADR

Material architecture choices need an ADR (owned by `/architect`),
including but not limited to:

- Concrete TypeScript web stack (ADR-0001)
- Auth model and session boundaries
- Data store / vector store choices
- API contract strategy that affects clients long-term
- Multi-tenant isolation approach changes
- Production provider adapter introduction

If unsure whether something is “material,” ask `/architect` or
`/commander` before coding it in.

## What requires an `@user` gate

Escalate to `@user` (do not self-close) for:

- Final stack acceptance after ADR-0001
- Production AI / provider activation
- Privacy / BYOK / provider onboarding commitments
- Scope changes that affect portfolio framing or out-of-scope domains
  (commerce, payments, shipping, SMS)
- Closing deferred items such as RTL locale support

## Agent workflow and ordinary pull requests

Agents persist handoffs under `docs/handoffs/` and update `context.md`
when authorized. Humans contribute through normal git branches and PRs.

Both must:

- Respect one-owner boundaries and Allowed Write Paths
- Keep secrets out of the repository
- Leave open gates open
- Prefer ports + mocks over provider SDKs in UI

A merged PR does not replace a missing handoff outcome when the phase
plan expects one. Conversely, a handoff does not replace code review.

## Code review expectations

Review is a **human/team convention**. There is **no CI** in this
repository yet — merging is not gated by automated status checks today.

Reviewers check for:

- Ports-only UI (no direct provider calls)
- Contract alignment (see `.cursor/skills/api-contract-change/SKILL.md`)
- Accessibility: keyboard, focus, labels, reduced motion, contrast
- RTL-readiness: logical CSS, locale-driven `lang`/`dir`, isolation for
  identifiers/code/URLs
- Tenant-safe assumptions
- No secrets, no premature stack lock-in

## No secrets

Never commit:

- API keys, tokens, BYOK material
- Real `.env` files (keep `.env.example` placeholders only)
- Secret-bearing local MCP overrides

Tracked `.cursor/mcp.json` must remain non-secret.

## Questions

| Topic | Ask |
|-------|-----|
| Priority / final gates | `@user` |
| Architecture / ADRs / ports | `/architect` |
| Ownership / phase routing | `/commander` |

Frontend details and “what can I do today?”:
[`docs/frontend/README.md`](docs/frontend/README.md).
