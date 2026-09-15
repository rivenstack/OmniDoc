# OmniDoc — Frontend Contributor Guide

Welcome. This is the onboarding path for a human frontend developer
joining OmniDoc. Read this file top to bottom once, then start the
unblocked work listed under [What you can start today](#what-you-can-start-today).

You do **not** need to know the agent workflow cold before contributing,
but you will work inside the same handoff system agents use. That is
intentional: assignments, ownership, and completion are repository state,
not chat folklore.

---

## What OmniDoc is

OmniDoc is a **multi-tenant AI/RAG note and knowledge SaaS**.

In plain language:

1. People capture notes and documents into their workspace.
2. The system organizes that corpus (chunking, embedding — behind
   project-owned ports, not called from the UI).
3. People retrieve notes through search and browse.
4. People ask questions and get answers **cited** back to their own
   notes — so trust and citation UX matter as much as “AI answers.”

Business context: a portfolio / freelancing credibility product. It must
look and behave production-quality. Commerce, payments, shipping, and SMS
are out of scope.

### Core user journeys

| Journey | What the user does | Frontend implication |
|---------|--------------------|----------------------|
| **Capture** | Create or edit a note / ingest a document | Editor shell, autosave/error states, long-content safety |
| **Organize** | Structure, tag, or find workspace content | Navigation, lists, empty states, tenant-scoped views |
| **Retrieve** | Search and open relevant notes | Result lists, loading/empty/error, highlight/snippet UX |
| **Ask with citations** | Ask a question; read an answer with sources | Answer + citation UI; `supported` / `partial` / `no_supported_answer` / `conflict` / `refused_policy` are **success** shapes, not generic errors |

Primary locale for Phase 0: **`en` (LTR)**. RTL / mixed-BiDi shipping is
**deferred, not closed**. You still write CSS and markup with
RTL-readiness discipline (see [Non-negotiables](#stack-independent-non-negotiables)).

---

## Decision state: settled vs pending

### Settled (do not re-litigate)

- Product identity: multi-tenant AI/RAG note & knowledge SaaS
- Platform class: TypeScript **frontend**; API language pending [ADR-0005](../adr/ADR-0005-backend-application-stack.md) (`proposed`)
- Primary locale: `en` (LTR); no secondary locale in Phase 0
- Customer-experience-first: validate journeys with realistic mocks before
  production AI/provider activation
- UI talks to **project-owned ports** only — never embedding, LLM, vector,
  storage, or other providers directly
- Accessibility is a release gate
- RTL-readiness discipline is mandatory while RTL locale remains deferred
- Agent roster, handoff protocol, and one-owner rule
- No secrets in the repository

### Settled stack (accepted 2026-09-14)

These are **binding**. Source of truth:
[`docs/adr/`](../adr/README.md) and
[`docs/research/version-ledger.md`](../research/version-ledger.md) (every
pin below was registry-verified on 2026-09-14).

| Area | Choice | ADR |
|------|--------|-----|
| Framework | Next.js 16.3.5 (App Router), React-only | [ADR-0001 §1](../adr/ADR-0001-frontend-and-platform-stack.md) |
| Editor | TipTap 3.31.3 (ProseMirror) + CodeMirror 6 for fenced code | ADR-0001 §2 |
| Note source of truth | TipTap/ProseMirror **JSON**; markdown only via one canonical serializer (export + chunking) | ADR-0001 §2 |
| Workspace | Nx 23.2.1, `apps/` + `packages/`, boundaries enforced | [ADR-0002](../adr/ADR-0002-workspace-and-tooling.md) |
| Package manager | pnpm 12.4.1 | ADR-0002 |
| Runtime | Node 24 LTS (`engines.node >= 24`, `.nvmrc` = `24`) — **frontend / Nx**. JVM API pending ADR-0005 | ADR-0002 / ADR-0005 |
| Styling / components | Tailwind CSS 4.3.3 + shadcn/ui 4.21.0 on Base UI `@base-ui/react` 1.8.0 | [ADR-0003](../adr/ADR-0003-frontend-application-toolchain.md) |
| Data / state | RSC + Server Actions first; Zustand 5.0.15 for editor/UI state; **no client cache library in v1** | ADR-0003 |
| Testing | Vitest 5.0.0 + Testing Library 16.3.3 + Playwright 1.63.0 + `@axe-core/playwright` 4.13.0 + MSW 2.15.0 + Storybook 10.6.0 | ADR-0003 |
| Supporting libs | react-hook-form 7.88.0 + Zod 4.6.5; react-markdown 10.1.0 + remark-gfm + **rehype-sanitize** (mandatory); Shiki 4.4.3; lucide-react 1.46.0; next-themes 0.4.6; ESLint 10.10.0 + Prettier 3.9.6 | ADR-0003 |

Notes that matter day to day:

- **Sanitization is mandatory** on the note/markdown render path — note
  content is untrusted UGC (`architecture.md` §6).
- **No client cache library, no i18n runtime, no second component base**
  may be added without reopening ADR-0003.
- **Server Actions may only call project-owned ports / route handlers.**
  No Server Action and no client code may call a provider directly.
- **Nx remote/cloud caching stays off** (local cache only) until `@user`
  decides the data-ownership question (ADR-0002 §Security).
- Component source is **copy-in and owned** in `packages/ui`; upgrades
  are per-component reconciliations, not dependency bumps.

### Still pending / open

`ADR-0001` is **`accepted (partial)`**: categories 1–2 are binding,
categories 3–7 remain `proposed`:

- Database (proposal: PostgreSQL 18 + app scope + RLS)
- Vector store (proposal: pgvector 0.8.6)
- Embedding / LLM posture (proposal: ports + mocks first, operator keys,
  BYOK later)
- Auth / identity (proposal: Better Auth 1.7.4 + organization plugin)
- Hosting (proposal: Railway or Render; VPS if self-host mandated)

Also open: budget ceiling; self-host vs managed; privacy / ZDR ambition;
customer BYOK; data region; year-1 enterprise SSO; demo posture (mock vs
live Ask, public vs local fixtures); year-1 tenant count; collaborative
editing in v1; always-on demo hosting; **RTL locale shipping** (deferred,
not closed); production AI activation.

Directory layout: see
[Workspace layout](#workspace-layout-adr-0002).

Live status and open gates: always re-check root [`context.md`](../../context.md).

**Architecture vs ADR:** root [`architecture.md`](../../architecture.md)
is the OmniDoc **architecture-ready baseline** (ports, tenancy,
answer/citation states, threat/safety, RAG eval bar, mock-fixture
themes). It is not a blank starter. Concrete stack packages now come
from the accepted ADRs; categories 3–7 remain ADR-0001-dependent.
Decisions index: [`docs/adr/README.md`](../adr/README.md).

---

## Prerequisites and clone

### Tools on your machine

| Tool | Notes |
|------|--------|
| **Node.js 24 LTS** | **Pinned** (ADR-0002): `engines.node >= 24` and `.nvmrc` = `24`. Node 24 is the Active LTS line (24.21.0 at pin time) and satisfies every verified dependency floor. The reference machine currently runs Node 26.4.0. |
| **pnpm 12.4.1** | **Decided** — pnpm is the workspace package manager (ADR-0002); it is installed on the reference machine. Do not add npm/yarn lockfiles. |
| **Git** | Required for clone / branch / PR |
| **Editor** | Cursor, VS Code, or equivalent. Enable EditorConfig support so [`.editorconfig`](../../.editorconfig) applies. |

There is **no** `package.json` yet. You cannot `pnpm install` an app that
does not exist. That is expected until an implementation handoff
authorizes scaffolding.

### Clone

Default branch: **`main`**.

HTTPS (recommended default):

```bash
git clone https://github.com/rivenstack/OmniDoc.git
cd OmniDoc
```

SSH (if you use SSH keys with GitHub):

```bash
git clone git@github.com:rivenstack/OmniDoc.git
cd OmniDoc
```

A plain clone creates a directory named **`OmniDoc`** (matching the
GitHub repository name). Use that name in `cd` unless you pass a
different target directory as the final `git clone` argument.

Open the **repository root** (the folder that contains `AGENTS.md`,
`context.md`, and `.cursor/`).

Optional Cursor setup for agent slash-commands: [`CURSOR-SETUP.md`](../../CURSOR-SETUP.md).
You can contribute via ordinary PRs without running agents.

---

## Repository map (frontend-oriented)

| Path | Why you care |
|------|----------------|
| [`docs/frontend/`](./) | **You are here** — contributor onboarding |
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | Repo-wide contribution rules |
| [`context.md`](../../context.md) | Live phase, active tasks, open gates |
| [`docs/handoffs/`](../handoffs/) | Assignments: `current.md`, `active/`, `archive/` |
| [`docs/handoffs/README.md`](../handoffs/README.md) | Handoff protocol (authoritative) |
| [`docs/research/`](../research/) | Technical & UX evidence (read; do not invent findings) |
| `docs/api/` | Canonical API contracts once authorized (directory may not exist yet; follow the API-contract skill when creating it) |
| [`AGENTS.md`](../../AGENTS.md) | Agent operating contract |
| [`.cursor/skills/api-contract-change/SKILL.md`](../../.cursor/skills/api-contract-change/SKILL.md) | How API contract changes must be done |
| `apps/web/` | **Confirmed** UI application root (ADR-0001 §1 + ADR-0002) — **not present yet** |
| `apps/api/` | **Reopened 2026-09-15** (ADR-0005). Do **not** treat as a Node app until U-BE. Not present yet |
| `packages/ui/`, `packages/contracts/`, `packages/mocks/` | **Confirmed** FE packages (ADR-0002) — **not present yet** |
| `packages/domain/` | **Reopened** — not the Java backend SoT if ADR-0005 is accepted |
| [`architecture.md`](../../architecture.md) | OmniDoc architecture-ready baseline (ports, tenancy, fixtures) — stack packages still ADR-0001-dependent |
| [`docs/adr/`](../adr/) | Decision records; ADR-0001 §1–§5, §7 `accepted`; §6 library reopened; ADR-0002 FE graph `accepted`; ADR-0005 `proposed` |

### Workspace layout (ADR-0002)

Confirmed by [ADR-0002](../adr/ADR-0002-workspace-and-tooling.md)
(`accepted` 2026-09-14), which **supersedes** the earlier
`frontend/` + `backend/` contract. Apps are still absent until an
implementation handoff authorizes scaffolding.

```text
apps/web/                 # Next.js 16.3.5 UI application
apps/api/                 # API / workers — Node shape REOPENED (ADR-0005);
                          # do not scaffold as Node until U-BE
packages/ui/              # shadcn/ui components + design tokens (copy-in, owned)
packages/contracts/       # shared request/response/stream types (OpenAPI → TS)
packages/domain/          # TS backend SoT REOPENED — not Java domain if ADR-0005 accepted
packages/mocks/           # deterministic fixtures + MSW handlers
docs/api/                 # Canonical HTTP/OpenAPI/SSE contracts
docs/adr/                 # Architecture Decision Records
docs/frontend/            # Contributor docs, checklists, fixture notes
```

`apps/web` may depend on `packages/contracts` and `packages/ui` only —
never on `packages/domain` internals, `packages/mocks` production paths,
or any provider SDK. That boundary is enforced in CI by
`@nx/enforce-module-boundaries` (ADR-0002), not by review etiquette.
Do not create scaffolding until an implementation handoff authorizes it;
package manager is **pnpm 12.4.1**.

---

## How a human works inside the handoff system

Authoritative protocol: [`docs/handoffs/README.md`](../handoffs/README.md).

### Daily orientation

1. Read [`context.md`](../../context.md) — phase, blockers, open gates.
2. Read [`docs/handoffs/current.md`](../handoffs/current.md) — main-track
   assignment (if you are on the critical path).
3. If you were given a parallel task, open the exact file under
   `docs/handoffs/active/` instead.

### Ownership rules

- Exactly **one** primary owner per handoff / task.
- Handoffs are **repository Markdown**. A plan that exists only in chat
  is **invalid**.
- Parallel work lives under `docs/handoffs/active/` with non-overlapping
  write paths.
- Do not silently change accepted architecture or close `@user` gates.

### Picking up an assignment

1. Confirm the handoff `to:` matches you (or that `@user` / Commander
   explicitly assigned you the human-owned slice).
2. Read Required Reading and Allowed Write Paths.
3. Do only the bounded deliverables.
4. Stay inside write boundaries — especially when research or other agents
   are writing in parallel.

### Reporting completion

1. Deliver the files listed in the handoff.
2. Update the handoff status / outcome as instructed (main track: archive +
   next `current.md` is usually Commander/agent-owned; parallel: update
   the `active/` file).
3. Open a PR for reviewable changes (see [Branch, commits, PRs](#branch-commits-prs-and-review)).
4. Call out blockers and open gates explicitly — never “quietly ship”
   around an open gate or production activation.

Human PRs and agent handoffs coexist: agents persist handoffs; humans
still use normal git review. See [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## Stack-independent non-negotiables

These rules stay true regardless of stack or ADR state.

### 1. Ports-only UI

The UI calls **project-owned ports / application APIs** (contracts under
`docs/api/` once they exist). The UI must **never** import or call:

- embedding providers
- LLM providers
- vector databases
- object storage SDKs
- other external provider SDKs

Adapters live behind ports. Bypassing ports is an architecture failure.

### 2. Mock-first, deterministic fixtures

Until production adapters are authorized, develop against **deterministic
mocks**. Same inputs → same outputs.

Authoritative fixture themes live in [`architecture.md`](../../architecture.md)
§9 (Mock corpus and deterministic fixtures). Cross-reference that list —
do not invent a second fixture authority. When outlining fixtures for
Ask/answer, treat `no_supported_answer` / `refused_policy` / `partial` /
`conflict` as **first-class success states** of the answer port (see
`architecture.md` §4), distinct from transport errors (timeout,
unavailable, quota).

### 3. API contract changes

Any request/response/error/stream/event change follows
[`.cursor/skills/api-contract-change/SKILL.md`](../../.cursor/skills/api-contract-change/SKILL.md):

- Classify additive vs behavior-changing vs breaking
- Update the canonical contract first when architecture requires it
- Update mocks / fixtures / clients together
- Keep tenant identity server-authoritative; never trust client-only
  tenant claims
- Do not leak secrets or provider internals in browser schemas or stream
  errors

### 4. Accessibility (release gate)

Definition-of-done includes:

- Keyboard operability for all interactive controls
- Sensible focus order and focus management (dialogs, drawers, route
  changes)
- Accessible names / labels for controls and status regions
- Respect `prefers-reduced-motion`
- Sufficient contrast for text and essential UI

### 5. LTR-now / RTL-readiness discipline

Phase 0 ships **`en` LTR only**. Still:

- Prefer **logical CSS**: `margin-inline`, `padding-inline`, `inline-size`,
  `border-inline`, logical positioning — not physical `left` / `right`
  for layout that should flip later
- Drive `lang` and `dir` from a **single locale source** — never hardcode
  scattered per-component direction
- Isolate identifiers, code tokens, URLs, and UGC fragments with `bdi`
  (or equivalent wrappers)
- In JavaScript, do not assume “next” means visually right; use start/end
  semantics where APIs allow
- Do not force an entire note body to one direction solely because it
  contains code or URLs

### 6. No secrets

Never commit real keys, BYOK material, or `.env` contents. Use documented
placeholders only. Keep `.env.example` (when added) free of secrets.
Do not commit secret-bearing MCP overrides; tracked `.cursor/mcp.json`
must remain non-secret.

### 7. Tenant isolation

Tenant isolation must hold at **retrieval time**, not only when a query is
constructed (`architecture.md` §2). Cross-tenant leakage is a **security
failure**, never a relevance miss. Frontend must not invent client-side
“tenant switching” that undermines server checks, and must not treat
client-supplied tenant/org ids as authoritative.

---

## Branch, commits, PRs, and review

### Branch naming

```text
feat/<short-topic>
fix/<short-topic>
docs/<short-topic>
chore/<short-topic>
```

Examples: `docs/frontend-onboarding`, `feat/note-list-empty-state`
(after stack exists).

### Commits

- Small, reviewable commits with why-focused messages
- Do not commit secrets, credentials, or personal data
- Do not add scaffolding or lockfiles outside an authorized handoff

### Pull requests

- One concern per PR when practical
- Link the handoff path or issue in the description
- List manual checks you ran (especially a11y / logical-CSS when UI exists)
- Call out anything still gated (ADR-0001 categories 3–7, production providers, RTL locale)

These are **team conventions**, not automated gates. This repository does
**not** have CI configured yet — do not expect GitHub Actions or required
status checks to run on pull requests today.

### Review expectations

Reviewers should reject:

- UI calling providers directly
- Undocumented API contract drift
- Hardcoded `dir`/`lang` or physical-direction layout for flippable UI
- Missing accessible names / keyboard traps
- Secrets or real environment values
- Stack selection disguised as “just scaffolding”

---

## Definition of done

A frontend change is done when:

1. It matches the handoff / PR scope and Allowed Write Paths
2. It respects ports-only + mock-first rules
3. API consumers match the canonical contract (or the PR updates the
   contract via the API-contract skill procedure)
4. Accessibility checks above are satisfied for touched UI
5. RTL-readiness discipline is followed for touched CSS/markup/JS
6. No secrets introduced
7. Docs updated when contributor-facing behavior or contracts change
8. Open gates remain explicitly open (not silently closed)

---

## What you can start today

Concrete work that needs **no further decisions**:

1. **Review this pack and `CONTRIBUTING.md`** — note gaps or unclear
   ownership; escalate via the routes below.
2. **Comment on / draft API contract shapes** — propose note, search, and
   ask/answer (+ citation) request/response/error/stream sketches under
   discussion docs; follow the API-contract skill once `docs/api/` is
   authorized. Prefer additive, tenant-aware, mock-friendly shapes.
3. **Assemble a deterministic fixture corpus outline** — follow the
   required themes in [`architecture.md`](../../architecture.md) §9
   (do not fork a second list). Include transport-error states separately
   from answer-port success states such as `no_supported_answer` /
   `refused_policy` / `partial` / `conflict`. Keep fixtures stack-agnostic.
4. **Draft an accessibility checklist** for the four journeys (capture,
   organize, retrieve, ask) covering keyboard, focus, labels, reduced
   motion, and contrast.
5. **Collect design-token input** — lists of semantic roles (surface,
   text, accent, danger, focus ring, etc.) and motion preferences. The
   framework is already decided (Tailwind CSS 4.3.3, ADR-0003); supply
   semantic roles, not a framework choice.
6. **Enumerate UI states per journey** — matrix of route/screen ×
   empty/loading/success/error/refusal/partial-citation states so Design
   and Implementer inherit a shared inventory.
7. **Read research as it lands** under `docs/research/` — absorb; do not
   treat research shortlists as stack decisions.

### Still blocked until Phase 1 planning + an implementation handoff

- Creating `package.json`, lockfiles, or app scaffolding (the *shape* is
  settled by ADR-0002; the *action* still needs a handoff)
- Implementing production provider adapters
- Shipping an RTL locale
- Adopting anything on ADR-0003's deferred list (client cache library,
  i18n runtime, a second component base)
- Treating `architecture.md` as final accepted truth beyond its
  architecture-ready baseline (ADR-0001 categories 3–7 still await `@user`)

---

## How to ask questions and escalate

| Kind of question | Route to |
|------------------|----------|
| Product priority, scope, portfolio framing, final go/no-go, production provider activation, BYOK/privacy confirmations | **`@user`** |
| Boundaries, ports, ADR-0001/0002/0003, directory contract, API architecture | **`/architect`** |
| Phase order, task ownership, handoff routing, “who owns this?”, Wave integration | **`/commander`** |
| Technical evidence, provider terms, shortlists (not selection) | `/researcher` |
| Journey/trust UX evidence and design-facing recommendations | `/ux-researcher` |
| Visual system and implementation-ready UI specs | `/designer` |
| Reproducible construction after architecture acceptance | `/implementer` |
| Independent verification | `/phase-check` |

When in doubt: ask `/commander` who the single owner is, rather than
starting dual-owned work.

---

## Related reading

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/handoffs/README.md`](../handoffs/README.md)
- [`CURSOR-SETUP.md`](../../CURSOR-SETUP.md)
- [`AGENTS-GUIDE.md`](../../AGENTS-GUIDE.md)
- [`.cursor/skills/api-contract-change/SKILL.md`](../../.cursor/skills/api-contract-change/SKILL.md)
