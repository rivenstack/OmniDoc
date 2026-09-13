# Candidate Shortlist (Non-Binding) — Tradeoffs Only

**Research date:** 2026-09-13  
**Authority:** Evidence for `/architect` ADR-0001 — **no winners selected**.

Each category lists up to three serious candidates. Popularity is not a
vote. Selection requires ADR-0001 + `@user` gate.

## Frontend framework

| Candidate | Why it stays on the shortlist | Primary tradeoff |
|-----------|-------------------------------|------------------|
| Next.js App Router | Mature React full-stack; RSC/streaming ecosystem; editor Client Components | Soft Vercel coupling; RSC complexity for an editor-heavy app |
| React Router 7 | Vite-native Remix successor; portable adapters; clear data APIs | Docs/hiring transition; less RSC depth than Next |
| Vite + React SPA | Max portability; natural editor SPA | You own BFF/auth/SSR/SEO; secrets must stay server-side |

*Watchlist (not seating a fourth unless Architect expands):* SvelteKit
(strong Kit; weaker React-centric editor ecosystem), TanStack Start
(younger Vite+SSR).

## Rich-text editor

| Candidate | Why shortlisted | Primary tradeoff |
|-----------|-----------------|------------------|
| TipTap / ProseMirror | MIT core; extensions; documented `textDirection`; Yjs/Hocuspocus path | A11y is DIY; Cloud upsells |
| Lexical | MIT; React-first; Yjs; a11y design claims | Younger; BiDi/markdown PoC needed |
| Milkdown *or* CodeMirror | Milkdown for markdown-first WYSIWYG; CM6 for source/code fidelity | Smaller ecosystem (Milkdown) or not a full WYSIWYG notes UX (CM6) |

Architect should keep **two** primary editor candidates for ADR, using the
third only as storage-mode contrast (markdown source vs structured).

## Multi-tenant isolation

| Candidate | Why shortlisted | Primary tradeoff |
|-----------|-----------------|------------------|
| Shared schema + app scoping | Simplest ops; fine for mocks | Single missed filter = leak |
| Shared schema + Postgres RLS (with non-owner role) | Defense-in-depth documented by Postgres | Pool/GUC/owner bypass footguns; integrity covert channels |
| Schema-per-tenant | Strong namespace isolation / easy drop-tenant | N× migrations; catalog/ops cost at scale |

Common practice pairs app filters **with** RLS; that pairing is an
Architect decision, not a Researcher selection.

## Vector storage

| Candidate | Why shortlisted | Primary tradeoff |
|-----------|-----------------|------------------|
| Postgres + pgvector | One system; SQL tenant filters; HNSW/IVFFlat | ANN+filter tuning; scale ceiling unknown for this product |
| Qdrant (OSS ± Cloud) | Strong filtered search; self-host story | Second datastore; consistency with notes DB |
| Weaviate *or* Pinecone | Weaviate: hybrid + MT features; Pinecone: managed convenience | Weaviate managed minimums; Pinecone no self-host / lock-in |

## Embedding / LLM posture

| Candidate pair | Why shortlisted | Primary tradeoff |
|----------------|-----------------|------------------|
| OpenAI embeddings + OpenAI or Anthropic LLM | Clear docs; embeddings ZDR-eligible; huge ecosystem | 30-day default abuse logs; ZDR is sales-gated; Assistants lock-in if used |
| Voyage (or Cohere) embeddings + Anthropic/Gemini LLM | Embedding specialist pricing/opt-out; LLM swap story | Multi-vendor ops; confirm each retention mode on the actual account |
| Operator-owned keys only vs customer BYOK | BYOK fits data-ownership narrative | Secret UX, abuse liability, billing complexity — `@user` |

*Do not* treat free AI Studio / consumer chat terms as equivalent to paid
API terms.

## Auth / identity

| Candidate | Why shortlisted | Primary tradeoff |
|-----------|-----------------|------------------|
| Better Auth + org plugin | Self-host; TypeScript; org RBAC | You own security ops/maturity risk |
| Clerk | Fast org UX; generous Hobby tier | Managed lock-in; residency/SSO add-on costs |
| Keycloak | Full self-hosted IdP; Apache-2.0 | Heavy ops for solo portfolio |

Auth.js remains a viable DIY baseline but pushes org features onto the
project — treat as implementation style under Better Auth/Keycloak rather
than a third equal product unless Architect prefers it.

## Hosting / deployment

| Candidate | Why shortlisted | Primary tradeoff |
|-----------|-----------------|------------------|
| Railway or Render | Web + worker + DB shapes match ingestion | Usage cost; free-tier sleep (Render) |
| Vercel + external DB + external worker | Best Next DX | Split brain for jobs; platform coupling |
| VPS/Docker self-host | Residency + portfolio narrative | Ops burden / uptime credibility |

## Open questions (explicit)

1. Year-1 tenant count and corpus size?
2. Real-time collaborative editing in scope for v1?
3. Markdown-as-source-of-truth vs structured editor JSON?
4. React vs openness to Svelte?
5. Which privacy marketing claims are required for the portfolio?
6. Always-on demo vs allow cold starts?
7. Pinecone-class managed vector OK, or self-host mandatory?

## @user gates (must not be closed by agents alone)

| Gate | Why |
|------|-----|
| **Monthly budget ceiling** (infra + AI) | Changes managed vs self-host shortlist viability |
| **Self-host vs managed preference** (app, auth, vectors) | Dominates portfolio narrative and ops load |
| **Privacy / ZDR ambition** | Standard 30-day abuse logs vs sales-approved ZDR |
| **Customer BYOK** yes/no/later | Secret handling and product scope |
| **Data region preference** (none / US / EU) | Hosting + provider geography |
| **Enterprise SSO year-1** | Clerk add-on vs Keycloak vs defer |
| **ADR-0001 acceptance** | Stack selection remains closed until Architect + `@user` |

## What this package does *not* do

- Does not pick ADR-0001 outcomes
- Does not invent UX journey findings (`/ux_researcher`)
- Does not propose ports, folder layouts, or implementation
- Does not assert legal compliance
