# Version Ledger — OmniDoc

**Owner:** `/researcher` (rows) · `/architect` (pins that become ADR decisions)
**Created:** 2026-09-14
**Last verified:** 2026-09-14
**Status:** Evidence — pins are not stack decisions until an accepted ADR says so

This file is the **single authority for version-bound claims** in this
repository. Any document that names a version, a minimum runtime, or a
package-level capability must cite a row here instead of restating a
version from memory or from an earlier draft.

It exists because Phase 0 evidence went stale faster than it was read:
the technical package is dated 2026-09-13 and already recommended
**React Router 7** (v8 shipped 2026-06-17) and reported TipTap
**3.27.3** / Lexical **0.43** as current. Version claims entered the
docs as "observed" with no re-check rule, so they aged silently while
still reading as authoritative.

---

## Rules

1. **No version claim without a source.** State the exact version, its
   release date, the date you verified it, and where you read it (npm
   `dist-tags`, GitHub release/tag, upstream changelog). Prose like
   "docs show v15+" or "version signal ~v0.43.0" is not valid.
2. **Pin, don't float.** Documents name the version they were verified
   against. "Latest" is only used together with a verification date.
3. **Re-verify at every phase gate.** The ledger is re-verified before
   each Phase Check. A row whose verification date predates the current
   phase is marked **stale** rather than trusted.
4. **Pin forward for new work.** A new project pins the current stable
   major unless a row records an explicit reason not to (for example an
   unresolved blocker in the successor, or an `@user` decision).
5. **Policy claims expire on the same clock.** Provider retention, ZDR,
   and pricing rows carry verification dates too. Re-confirm on the
   live account before any such claim is published or used in a demo.
6. **Update the ledger before the documents.** When a pin moves, change
   the row first, then every document that cites it, then let Phase
   Check diff the ledger against the docs.

---

## Runtime and application stack

| Package / runtime | Version | Released | Verified | Read from | Notes |
|---|---|---|---|---|---|
| Node.js (production target) | **24.21.0 LTS "Krypton"** | 2026-09-07 | 2026-09-14 | nodejs.org/dist/index.json | Current (non-LTS) line is 26.8.2. Machine runs 26.4.0. See compatibility floors below. |
| Next.js | **16.3.5** | 2026-09-11 | 2026-09-14 | npm `dist-tags.latest` | 16.4.0-canary.29 in flight (2026-09-14). App Router runs a React canary build — see §Notes for the tradeoff. |
| React / React DOM | **19.3.0** | 2026-09-09 | 2026-09-14 | npm | |
| React Router | **8.3.1** | 2026-08-28 | 2026-09-14 | npm + GitHub release | v7 line still patched (7.18.3, same day) but v8 is the current major for new work. ESM-only; Vite 7+ required. |
| Vite | **8.3.0** | 2026-09-10 | 2026-09-14 | npm | |
| TypeScript | **7.0.2** | 2026-07-08 | 2026-09-14 | npm | |
| Tailwind CSS | **4.3.3** | 2026-07-16 | 2026-09-14 | npm | Component/styling approach still undecided (ADR-0001 open item). |
| TipTap (`@tiptap/core`, `@tiptap/react`) | **3.31.3** | 2026-09-04 | 2026-09-14 | npm | `textDirection` (`ltr` \| `rtl` \| `auto`) still present in v3 (editor option + command). It controls editor **content** direction, not layout flipping. |
| TipTap Yjs binding (`@tiptap/y-tiptap`) | 3.0.9 | 2026-08-18 | 2026-09-14 | npm | Collab option value only; collaborative editing is an open gate. |
| Lexical (`lexical`, `@lexical/react`) | **0.50.0** | 2026-09-02 | 2026-09-14 | npm | Still pre-1.0; the "younger major-version signal" adverse in the editor brief still holds. |
| Yjs | 13.6.32 | 2026-08-04 | 2026-09-14 | npm | |

## Platform, data, and identity

| Package / service | Version | Released | Verified | Read from | Notes |
|---|---|---|---|---|---|
| PostgreSQL | **18.6** (major 18) | 2026-08-13 (minor) | 2026-09-14 | postgresql.org/versions.json | Supported majors 14–18. PG 14 leaves support 2026-11-12. Pin 18 unless an ADR says otherwise. |
| pgvector | **0.8.6** | 2026-07-29 | 2026-09-14 | GitHub tags | Iterative scan (filter-aware ANN) arrived in 0.8.0 (2024-10-30) — the research claim "≥0.8.0" is correct and unchanged. |
| Better Auth | **1.7.4** | 2026-09-10 | 2026-09-14 | npm | Organization plugin is the tenancy-relevant surface. |
| Auth.js (`@auth/core`) | 0.41.3 | 2026-07-20 | 2026-09-14 | npm | The "Auth.js v5" naming in `06-auth-identity.md` refers to this line; `next-auth@4.24.15` is the older v4 package. |
| Clerk | n/a (managed) | — | 2026-09-13 | vendor pricing page | Pricing rows in `06-auth-identity.md` were read 2026-09-13; re-confirm before any budget claim. |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 | 2026-03-27 / 2026-03-17 | 2026-09-14 | npm | Illustrative only — ORM is not an ADR-0001 category. |
| `pg` (node driver) | 8.23.0 | 2026-08-08 | 2026-09-14 | npm | |

## Tooling

| Tool | Version | Released | Verified | Read from | Notes |
|---|---|---|---|---|---|
| pnpm | **12.4.1** | 2026-09-10 | 2026-09-14 | npm + `pnpm --version` | Installed on the reference machine. Closes the long-standing "package manager undecided" item once `@user` confirms (see §Recorded decisions). |
| Nx | **23.2.1** | 2026-09-09 | 2026-09-14 | npm | 23.3.0-beta.0 / canary in flight. `@nx/react` exports `./router-plugin`; `@nx/next` peering `next >=14 <17`. |
| Turborepo | 2.10.12 | 2026-08-25 | 2026-09-14 | npm | Considered alternative to Nx; not selected. |
| ESLint | **10.10.0** | 2026-09-04 | 2026-09-14 | npm | |
| Vitest | **5.0.0** | 2026-09-03 | 2026-09-14 | npm | |
| Playwright / `@playwright/test` | 1.63.0 | 2026-09-04 | 2026-09-14 | npm | |
| Prettier | 3.9.6 | 2026-07-21 | 2026-09-14 | npm | |

## Frontend application packages (accepted 2026-09-14 — ADR-0003)

Pinned by `@user` decision; rationale in
[`docs/adr/ADR-0003-frontend-application-toolchain.md`](../adr/ADR-0003-frontend-application-toolchain.md).

| Package | Version | Released | Verified | License | Role |
|---|---|---|---|---|---|
| Tailwind CSS | **4.3.3** | 2026-07-16 | 2026-09-14 | MIT | Styling; logical utilities for RTL-readiness |
| `shadcn` (CLI) | **4.21.0** | 2026-09-04 | 2026-09-14 | MIT | Copy-in component distribution into `packages/ui` |
| `@base-ui/react` | **1.8.0** | 2026-09-04 | 2026-09-14 | MIT | Component base (shadcn's default base since 2026-07) |
| `radix-ui` (fallback) | 1.6.7 | — | 2026-09-14 | MIT | Documented fallback base; still fully supported by shadcn |
| `react-aria-components` (fallback) | 1.21.1 | — | 2026-09-14 | Apache-2.0 | Second fallback base if the a11y bar cannot be met |
| Zustand | **5.0.15** | 2026-08-13 | 2026-09-14 | MIT | Editor/UI state only |
| `@tanstack/react-query` (deferred) | 5.102.8 | 2026-08-27 | 2026-09-14 | MIT | Not adopted in v1; revisit on real client-cache need |
| Vitest | **5.0.0** | 2026-09-03 | 2026-09-14 | MIT | Unit/integration |
| `@testing-library/react` | **16.3.3** | — | 2026-09-14 | MIT | Behavioural component assertions |
| `@playwright/test` | **1.63.0** | 2026-09-04 | 2026-09-14 | Apache-2.0 | E2E across the four journeys |
| `@axe-core/playwright` | **4.13.0** | 2026-08-11 | 2026-09-14 | MPL-2.0 | Automated a11y assertions in E2E |
| `@storybook/nextjs` | **10.6.0** | 2026-09-02 | 2026-09-14 | MIT | Component catalogue + interaction tests |
| MSW | **2.15.0** | 2026-07-08 | 2026-09-14 | MIT | Deterministic port mocks |
| react-hook-form | 7.88.0 | 2026-09-11 | 2026-09-14 | MIT | Forms |
| Zod | 4.6.5 | 2026-09-13 | 2026-09-14 | MIT | Validation, shared with `docs/api/` contracts |
| `@hookform/resolvers` | 5.9.1 | — | 2026-09-14 | MIT | Zod ↔ RHF bridge |
| react-markdown | 10.1.0 | 2025-03-07 | 2026-09-14 | MIT | Markdown projection of the note SoT |
| remark-gfm | 4.0.1 | — | 2026-09-14 | MIT | Tables/strikethrough etc. |
| rehype-sanitize | **6.0.0** | 2023-08-26 | 2026-09-14 | MIT | **Mandatory** sanitization control |
| Shiki | 4.4.3 | 2026-08-10 | 2026-09-14 | MIT | Server-side code highlighting |
| lucide-react | 1.46.0 | 2026-09-14 | 2026-09-14 | ISC | Icons (shadcn default) |
| next-themes | 0.4.6 | 2025-03-11 | 2026-09-14 | MIT | Dark mode |
| next-intl (deferred) | 4.14.5 | — | 2026-09-14 | MIT | Only if an RTL/second locale is scheduled |

Sanitization, the Radix/React-Aria fallbacks, and the deferred rows are
recorded as decisions, not idle notes: do not add a client cache
library, an i18n runtime, or a second component base without reopening
ADR-0003.

## Provider SDKs (not on the critical path until activation is unlocked)

| Package | Version | Released | Verified | Notes |
|---|---|---|---|---|
| `openai` | 7.15.0 | 2026-09-10 | 2026-09-14 | Must stay server-side (ports rule). |
| `@anthropic-ai/sdk` | 0.125.0 | 2026-09-10 | 2026-09-14 | CORS is not available for ZDR orgs — backend proxy only. |
| `@google/genai` | 2.22.0 | 2026-09-10 | 2026-09-14 | |
| `voyageai` | 0.4.0 | 2026-06-15 | 2026-09-14 | |

---

## Compatibility floors

Read from published package metadata, 2026-09-14. These are the
constraints that decide the Node baseline, not preference.

| Constraint | Value | Source |
|---|---|---|
| Next.js 16.3.5 | `engines.node >= 20.9.0`; peers `react ^18.2 \|\| ^19` | npm metadata |
| React Router 8.3.1 | `engines.node >= 22.22.0`; peers `react`, `react-dom >= 19.2.7`; ESM-only; Vite 7+ | npm metadata + v8 release notes |
| ESLint 10.10.0 | `engines.node ^20.19 \|\| ^22.13 \|\| >=24` | npm metadata |
| Vitest 5.0.0 | `engines.node ^22.12 \|\| ^24 \|\| >=26` | npm metadata |
| `@nx/next` 23.2.1 | peer `next >=14 <17` | npm metadata |
| `@nx/react` 23.2.1 | peers `react`/`react-dom >=18 <20` | npm metadata |

**Intersection:** Node **24 LTS** satisfies every row and is the
recommended production target (`engines.node >= 24`, `.nvmrc` = `24`).
The reference machine's Node 26.4.0 also satisfies every row, but it is
the current line, not LTS — pin 24 in the repo so the two cannot drift.

---

## How to re-verify

Run this read-only check and compare against the tables above. It reads
the npm registry, the Node release index, and the PostgreSQL support
matrix; it writes nothing.

```bash
python3 - <<'PY'
import json, urllib.request
def get(u, hdr=None):
    r = urllib.request.Request(u, headers=hdr or {"User-Agent": "omnidoc-ledger"})
    with urllib.request.urlopen(r, timeout=30) as f:
        return json.load(f)
for p in ["next","react","react-router","@tiptap/core","lexical","nx","pnpm",
          "turbo","eslint","vitest","typescript","vite","better-auth"]:
    d = get("https://registry.npmjs.org/" + p.replace("/", "%2f"))
    v = d["dist-tags"]["latest"]
    print(f"{p:<14} {v:<10} {d['time'][v][:10]}")
nodes = [n for n in get("https://nodejs.org/dist/index.json") if n.get("lts")]
print("node LTS:", nodes[0]["version"], nodes[0]["lts"], nodes[0]["date"])
print("pg supported:", [(r["major"], r["latestMinor"]) for r in get("https://www.postgresql.org/versions.json") if r.get("supported")])
PY
```

Add the ledger re-verification to the Phase Check entry checklist so a
phase cannot pass on stale pins.

---

## Stale cells corrected in this pass (2026-09-14)

Every edit below replaces an unsourced or out-of-date version claim with
a ledger-cited one. Nothing in the evidence classification, confidence
labels, shortlist ordering, or "no selection" posture was changed.

| File | Was | Now | Why |
|---|---|---|---|
| `docs/research/technical/00-evidence-matrix.md:12` | "Docs show v15+ App Router" | App Router on 16.3.5, verified | Next.js 16.3.5 is current stable |
| `docs/research/technical/00-evidence-matrix.md:13` | "React Router 7 (Remix successor)" … "RR v7 = Remix path" | React Router 8 … "RR v8 = Remix path" | v8 shipped 2026-06-17 |
| `docs/research/technical/00-evidence-matrix.md:22` | "v3.27.x observed 2026-07 on GitHub" | "v3.31.3 (npm, 2026-09-04)" | TipTap moved 4 minor releases |
| `docs/research/technical/01-frontend-frameworks.md:41,45,47` | "React Router 7" / "RR7" / "Node 20+" | React Router 8 / RR8 / Node 22.22+ | v8 rename + new engine floor |
| `docs/research/technical/01-frontend-frameworks.md:55,58,102,132` | RR7 naming; `reactrouter.com/7.16.0/…` | RR8 naming; unversioned `reactrouter.com` URL | Version-bound source URLs rot |
| `docs/research/technical/02-rich-text-editors.md:20` | "observed v3.27.3 (2026-07-07)" | "npm latest v3.31.3 (2026-09-04)" | Verified against registry |
| `docs/research/technical/02-rich-text-editors.md:37` | "~v0.43.0 (2026-04)" | "npm latest v0.50.0 (2026-09-02)" | Verified against registry |
| `docs/research/technical/04-vector-storage.md:14` | "pgvector ≥0.8.0" | "pgvector ≥0.8.0 (latest 0.8.6)" | Capability claim unchanged; pin added |
| `docs/research/technical/08-candidate-shortlist.md:14` | "React Router 7" | "React Router 8" | Same drift |
| `docs/research/technical/README.md:19` | "React Router 7" in scope table | "React Router 8" | Same drift |
| `docs/memory/researcher.md:34` | "cite RR7 not legacy Remix alone" | "cite RR8 …" | Durable memory must not carry a stale pin |
| `docs/adr/ADR-0001-frontend-and-platform-stack.md` | "React Router 7 (Framework Mode)" stated as current | Current major noted as 8; proposal left intact with a dated amendment note | Decision belongs to `/architect` + `@user`, not to a version pass |

---

## Recorded decisions (2026-09-14)

`@user` answered the Task 0.7 decision gate during research review.
These are **decisions recorded**, not gates closed by an agent. Every
pin below is from the tables above.

**Accepted**

| Decision | Pin |
|---|---|
| Frontend framework | Next.js **16.3.5** (App Router) — over React Router 8 |
| Editor foundation | TipTap **3.31.3** (ProseMirror) + CodeMirror 6 for fenced code |
| Note source of truth | **TipTap/ProseMirror JSON**; markdown only via one canonical serializer (export + chunking) |
| Language / runtime | **Node 24 LTS** (`engines.node >= 24`, `.nvmrc` = `24`) |
| Package manager | **pnpm 12.4.1** |
| Monorepo tool + layout | **Nx 23.2.1**, `apps/` + `packages/` |
| Language surface | **React-only** |
| Styling + components | Tailwind CSS **4.3.3** + shadcn CLI **4.21.0** on Base UI **1.8.0** |
| Data + state | RSC + Server Actions first; Zustand **5.0.15** for editor/UI state; no client cache in v1 |
| Testing | Vitest **5.0.0** + Testing Library **16.3.3** + Playwright **1.63.0** + axe **4.13.0** + MSW **2.15.0** + Storybook **10.6.0** |

**Still open — no default assumed**

Categories 3–7 of ADR-0001 (database, vector, embedding/LLM posture,
auth, hosting); budget ceiling; self-host vs managed; privacy/ZDR
ambition; customer BYOK; data region; year-1 enterprise SSO; demo
posture (mock vs live Ask, public vs local fixtures); year-1 tenant
count; collaborative editing in v1; always-on demo hosting; **RTL
locale** (deferred, not closed); production AI activation; UT-1…UT-14.

**Where the decisions are captured**

| Record | Status |
|---|---|
| `docs/adr/ADR-0001-frontend-and-platform-stack.md` | Amended — `accepted (partial)`, §1 → Next.js 16.3.5, §2 editor + SoT accepted, decision record added |
| `docs/adr/ADR-0002-workspace-and-tooling.md` | Created — Nx + pnpm + `apps/`/`packages/`, supersedes the `frontend/`+`backend/` contract |
| `docs/adr/ADR-0003-frontend-application-toolchain.md` | Created — styling/components, data + state, testing, supporting libraries |
| `docs/adr/README.md` | Index + `accepted (partial)` status defined |
| `docs/handoffs/current.md` | Task 0.7 marked **partially answered**; remaining gates still live |
| `context.md` | Live status + open gates updated |
| `docs/frontend/README.md` | Contributor guide refreshed for the now-known stack |

**Still owed by `/commander`:** rolling Task 0.7 forward into the next
main-track handoff (Phase 1 planning with `/designer` + `/implementer`),
and deciding whether the `docs/frontend/README.md` refresh needs its own
task or rides with the Phase 1 implementation handoff.

## Open (not addressed by this pass)

- `docs/frontend/README.md:106-107` previously claimed "Node v24" and
  "pnpm is not installed on this machine today" — both were wrong
  against the reference machine (Node 26.4.0, npm 12.0.0, pnpm 12.4.1,
  yarn 1.22.22, corepack 0.34.6). Corrected in the 2026-09-14 refresh.
