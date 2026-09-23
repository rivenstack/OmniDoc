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
- Platform class: TypeScript **frontend** (Next.js); API is Java 21 / Spring Boot 4.1.x [ADR-0005](../adr/ADR-0005-backend-application-stack.md) (`accepted` 2026-09-15)
- Primary locale: `en` (LTR); no secondary locale in Phase 0
- Customer-experience-first: validate journeys with realistic mocks before
  production AI/provider activation
- UI talks to **project-owned ports** only — never embedding, LLM, vector,
  storage, or other providers directly
- Accessibility is a release gate
- RTL-readiness discipline is mandatory while RTL locale remains deferred
- Agent roster, handoff protocol, and one-owner rule
- No secrets in the repository

### Settled stack (accepted 2026-09-14; backend application stack accepted 2026-09-15)

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
| Runtime | Node 24 LTS (`engines.node >= 24`, `.nvmrc` = `24`) — **frontend / Nx graph only**. API runtime is Java 21 (ADR-0005 `accepted`) | ADR-0002 / ADR-0005 |
| Auth / session | Identity **port** on the frontend. Implementation is **Spring Security HTTP-only session cookies** in the Java API plus first-party membership tables — **not** Better Auth | [ADR-0001 §6](../adr/ADR-0001-frontend-and-platform-stack.md) / [ADR-0005](../adr/ADR-0005-backend-application-stack.md) |
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
- **Identity has no frontend library.** The client talks to an identity
  **port**; the implementation is Spring Security HTTP-only session
  cookies served by the Java API (ADR-0005). Do **not** add `better-auth`
  (or any other auth library) to the frontend graph — the historical
  Better Auth *library* choice in ADR-0001 §6 was superseded; only the
  identity **port** survives. The workspace id is a **selector** only;
  membership is resolved server-side and a mismatch is a 403, not a
  frontend fallback.
- **Tokens live in `packages/ui/src/styles/`.** `tokens.css` holds the
  F-01 values (copied from D-01). As of 2026-09-22 those values are not a
  lock — see `docs/design/now.md`. `globals.css` is the only Tailwind v4
  entry; the app imports it rather than declaring Tailwind itself.
  Register UI-package component source with `@source` when adding new
  directories, or classes generated there will silently go missing.

### Still pending / open

`ADR-0001` categories 1–5 and 7 are **`accepted`**; §6 keeps the
identity **port** while the Better Auth **library** is superseded by
Spring Security sessions ([ADR-0005](../adr/ADR-0005-backend-application-stack.md),
`accepted` 2026-09-15). TypeScript `packages/domain` is **not** the
backend SoT — domain ports live as Java interfaces in the API module.

Still open: budget ceiling; self-host vs managed; privacy / ZDR ambition;
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
themes). Concrete stack packages now come from the accepted ADRs
(ADR-0001 §1–§5, §7; ADR-0005 for the API runtime).
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

The workspace exists (S-01a). After cloning:

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test
```

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
| `apps/web/` | UI application root (ADR-0001 §1 + ADR-0002) — scaffolded by S-01a; F-01 tokens and providers wired. F-02 shell is the live task (reopened 2026-09-23, structure from `system-ux.md`). Live UI plan: [`docs/design/now.md`](../design/now.md) |
| `apps/api/` | JVM Gradle module (ADR-0005 `accepted`) — owned by S-01b. **Not** a Node app |
| `packages/ui/` | UI package: F-01 shadcn/Base UI primitives. D-01 token values are not a lock (2026-09-22). Plan: [`docs/design/now.md`](../design/now.md) |
| `packages/contracts/`, `packages/mocks/` | FE packages (ADR-0002) — scaffolded by S-01a; real content in S-02 / S-03 |
| `packages/domain/` | **Not created** — not the backend SoT (ADR-0005); domain ports live as Java interfaces in `apps/api` |
| [`architecture.md`](../../architecture.md) | OmniDoc architecture baseline (ports, tenancy, fixtures) + accepted stack packages |
| [`docs/adr/`](../adr/) | Decision records; ADR-0001 §1–§5, §7 `accepted`; §6 port stays / library superseded; ADR-0002 FE graph `accepted`; ADR-0005 `accepted` |

### Workspace layout (ADR-0002)

Confirmed by [ADR-0002](../adr/ADR-0002-workspace-and-tooling.md)
(`accepted` 2026-09-14), which **supersedes** the earlier
`frontend/` + `backend/` contract. The FE graph (`apps/web`,
`packages/ui|contracts|mocks`) is scaffolded by S-01a; the JVM API
module is S-01b-owned.

```text
apps/web/                 # Next.js 16.3.5 UI application (scaffold; F-01 tokens + providers wired)
apps/api/                 # JVM Gradle module — Spring Boot API / workers (ADR-0005);
                          # S-01b-owned; never a Node app
packages/ui/              # shadcn/ui components (copy-in, owned); F-01 token values, not a D-01 lock
packages/contracts/       # shared request/response/stream types (OpenAPI → TS)
packages/mocks/           # deterministic fixtures + MSW handlers
docs/api/                 # Canonical HTTP/OpenAPI/SSE contracts
docs/adr/                 # Architecture Decision Records
docs/frontend/            # Contributor docs, checklists, fixture notes
```

No `packages/domain` — domain ports are Java interfaces in `apps/api`
(ADR-0005).

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
- Call out anything still gated (production providers, RTL locale)

Frontend CI (`.github/workflows/ci-frontend.yml`, S-01a) runs
typecheck / lint / test over the Nx JS graph on push and PR. The JVM
API workflow lands beside it (S-01b) without conflict.

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
5. **Do not extend D-01 as a spec** — F-02 runs from the new rules:
   structure from [`docs/design/system-ux.md`](../design/system-ux.md),
   visible plan in [`docs/design/now.md`](../design/now.md), and a
   `@user` reference (link / pasted code / prompt) per visual block
   before you build it. Stock shadcn is the look until a design language
   is chosen. The component inventory is not a whitelist.
6. **Enumerate UI states per journey** — matrix of route/screen ×
   empty/loading/success/error/refusal/partial-citation states so Design
   and Implementer inherit a shared inventory.
7. **Read research as it lands** under `docs/research/` — absorb; do not
   treat research shortlists as stack decisions.

### Still blocked until their implementation handoffs

- FE journey source work (F-02+; tokens and primitives landed in F-01, and
  F-02 also needs the S-02 contracts)
- Implementing production provider adapters
- Shipping an RTL locale
- Adopting anything on ADR-0003's deferred list (client cache library,
  i18n runtime, a second component base)

---

## How to ask questions and escalate

| Kind of question | Route to |
|------------------|----------|
| Product priority, scope, portfolio framing, final go/no-go, production provider activation, BYOK/privacy confirmations | **`@user`** |
| Boundaries, ports, ADR-0001/0002/0003, directory contract, API architecture | **`/architect`** |
| Phase order, task ownership, handoff routing, “who owns this?”, Wave integration | **`/commander`** |
| Technical evidence, provider terms, shortlists (not selection) | `/researcher` |
| Journey/trust UX evidence and design-facing recommendations | `/ux-researcher` |
| System UX contracts and design language (not implementation specs) | `/designer` |
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
