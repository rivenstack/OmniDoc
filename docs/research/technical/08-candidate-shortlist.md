# Candidate Shortlist (Non-Binding) — Tradeoffs Only

**Research date:** 2026-09-13; **Wave C amend:** 2026-09-14  
**Version pins:** [`../version-ledger.md`](../version-ledger.md) (verified 2026-09-14)  
**Authority:** Evidence for `/architect` ADR-0001 — **no winners selected**.

Each category lists up to three serious candidates. Popularity is not a
vote. Selection requires ADR-0001 + `@user` gate.

## Frontend framework

| Candidate | Why it stays on the shortlist | Primary tradeoff |
|-----------|-------------------------------|------------------|
| Next.js App Router | Mature React full-stack; RSC/streaming ecosystem; editor Client Components | Soft Vercel coupling; RSC complexity for an editor-heavy app |
| React Router 8 | Vite-native Remix successor; portable adapters; clear data APIs | Docs/hiring transition; less RSC depth than Next |
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
| **OpenRouter** `:free` (+ later ~$10 credits) as gateway for answers | Official free variants, rate-limit + usage APIs; fits operator free-tier-first budget | Low RPD; upstream retention still applies; quality/capacity vary; **not accepted** |
| OpenAI embeddings + OpenAI or Anthropic LLM (direct) | Clear docs; embeddings ZDR-eligible; huge ecosystem | 30-day default abuse logs; ZDR sales-gated (`@user` declines ZDR motion); Assistants lock-in if used |
| Voyage (or Cohere) embeddings + Anthropic/Gemini / OpenRouter LLM | Embedding specialist pricing/opt-out; LLM swap via ports | Multi-vendor ops; confirm retention on the actual account |

**BYOK (v1, `@user`):** OmniDoc **customer-BYOK** (vault) is in product
scope; distinct from **OpenRouter-upstream-BYOK**. Dual-mode =
operator free-tier key + customer-entered key. See `05` + `09`.

*Do not* treat free AI Studio / consumer chat terms as equivalent to paid
API terms. *Do not* use Assistants / hosted `vector_stores` as corpus SoT.

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
| **AWS Free plan** topology (EC2 and/or ECS + RDS Postgres + pgvector) | Matches 6-month demo; $0 cash on Free plan; web+worker+DB feasible | Credit burn may end Free plan early; account closes at expiry; no SKU selected |
| Railway or Render (**non-defaults**) | Web + worker + DB shapes match ingestion | `@user` rejected as default; usage cost; Render free sleep |
| Vercel + external DB + external worker | Best Next DX | Split brain for jobs; platform coupling |
| VPS/Docker self-host | **Fallback only** if AWS cannot cover 6-mo workload | Ops burden / uptime credibility |

Lightsail (Paid 90-day trial) and App Runner (Paid-plan list on new
sign-up docs) are **documented** but not seated as Free-plan primaries
(`07`).

## Open questions (explicit)

1. Year-1 tenant count and corpus size? *(minimal year-1 accepted — scale later)*
2. Real-time collaborative editing in scope for v1? *(much later — `@user`)*
3. ~~Markdown-as-source-of-truth vs structured editor JSON?~~ → ProseMirror JSON accepted
4. ~~React vs openness to Svelte?~~ → React-only accepted
5. Which privacy marketing claims are required for the portfolio? *(~30d abuse OK; no ZDR)*
6. Always-on demo vs allow cold starts? *(AWS always-on preferred; credit burn is the risk)*
7. Pinecone-class managed vector OK, or self-host mandatory? *(pgvector accepted pending Architect flip)*
8. Exact AWS Free-plan service graph + credit-burn PoC result?
9. OpenRouter-only vs hybrid embeddings (direct) + OR answers?

## @user gates (must not be closed by agents alone)

| Gate | Status (2026-09-14) |
|------|---------------------|
| **Monthly budget ceiling** (infra + AI) | **Closed:** infra prefer $0 / ~$20 ceiling; AI = OR free then ~$10 |
| **Self-host vs managed preference** | **Closed:** prefer self-host because free; managed OK if $0 |
| **Privacy / ZDR ambition** | **Closed:** ~30-day abuse OK; no ZDR sales |
| **Customer BYOK** | **Closed:** **yes in v1**; dual-mode |
| **Data region preference** | **Closed:** none |
| **Enterprise SSO year-1** | **Closed:** not required |
| **Hosted demo horizon** | **Closed:** 6 months; AWS Free Tier 6-mo window in-scope |
| **ADR-0001 §5 / §7 acceptance** | **Open** until Architect rewrite cites Wave C — Researcher does **not** select |

## What this package does *not* do

- Does not pick ADR-0001 outcomes
- Does not invent UX journey findings (`/ux_researcher`)
- Does not propose ports, folder layouts, or implementation
- Does not assert legal compliance
