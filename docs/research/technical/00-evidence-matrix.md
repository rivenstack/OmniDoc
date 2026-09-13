# Evidence Matrix — OmniDoc Platform (2026-09-13)

Access date for sources cited below: **2026-09-13** unless a different
publication or effective date is stated. Confidence: **H** high (primary
official source), **M** medium (reputable secondary + corroboration),
**L** low (community / marketing / undated).

## 1. Frontend frameworks

| Option | Version/signal | Maintenance | TS SaaS fit | A11y | RTL-readiness | Hosting portability | Lock-in | Editor/AI streaming ecosystem | Cost/license | Evidence | Conf. |
|--------|----------------|-------------|-------------|------|---------------|---------------------|---------|-------------------------------|--------------|----------|-------|
| Next.js (App Router) | Docs show v16+ App Router; RSC default | Vercel-led; large ecosystem | Strong for authenticated apps | React/a11y ecosystem; app responsibility | Logical CSS + `lang`/`dir` are app-owned; framework does not ship RTL locale | Strong on Vercel; portable via Node adapters with effort | Medium (platform conventions, RSC bundler coupling) | TipTap/Lexical React; SSE/stream patterns common | MIT (framework) | nextjs.org/docs; react.dev RSC | H |
| React Router 7 (Remix successor) | Official: RR v7 = Remix path; Vite | Remix/RR team; Vite-native | Strong loaders/actions | Same React a11y model | App-owned `dir`/`lang` | High (Node, Cloudflare, etc. adapters) | Lower than Next for hosting | Mature data APIs; streaming SSR supported | MIT | reactrouter.com; remix.run merge blog | H |
| Vite + React SPA | Vite build tool + client router | Vite/Evan You; RR optional | Fit for editor-heavy SPA; SEO/auth shell DIY | App-owned | App-owned | Highest static/CDN portability | Low framework lock-in; ops for API/SSR elsewhere | Streaming AI via separate API; no built-in SSR | MIT | vitejs.dev; community 2026 comparisons | H/M |
| SvelteKit | Kit 2.x docs active | Svelte core | Strong full-stack; smaller React editor ecosystem | Good kit a11y patterns; verify editor libs | App-owned; fewer React editor options | Adapters (Node, Vercel, etc.) | Medium (Svelte component ecosystem) | TipTap has Svelte; Lexical React-first | MIT | svelte.dev/docs/kit | H |
| TanStack Start (brief) | Vite + SSR/streaming | Newer; TanStack | Credible 4th for Vite SSR without Next | Same React model | App-owned | Vite deploy targets | Maturity younger than Next/RR7 | Growing | MIT | tanstack.com SSR docs | M |

## 2. Rich-text / markdown editors

| Option | License | A11y claim | Collab path | Extensibility | RTL-readiness | Notes | Conf. |
|--------|---------|------------|-------------|---------------|---------------|-------|-------|
| TipTap (ProseMirror) | MIT core; paid Cloud suite | Headless — a11y is implementer duty; docs on roles/keyboard | Yjs + Hocuspocus (OSS); Cloud paid | Strong extension model | Official `textDirection` ltr/rtl/auto | v3.27.x observed 2026-07 on GitHub | H |
| Lexical | MIT (Meta) | WCAG-oriented design claim; still needs product testing | `@lexical/yjs` | Plugin architecture | Needs product PoC for BiDi; not claimed as shipped RTL locale | Official React bindings | H |
| CodeMirror 6 | MIT | Strong screen-reader / keyboard story for code | Collab packages exist | Extension system | Directionality for code/notes needs PoC | Better for code blocks than full notes WYSIWYG | H |
| Milkdown | MIT | Crepe/toolbar a11y work ongoing | Community / Yjs paths (verify) | Plugin + ProseMirror + remark | Unverified for BiDi | Markdown-first WYSIWYG | H/M |

## 3. Multi-tenant isolation

| Approach | Isolation strength | Ops cost | RAG retrieval implication | Known failure modes | Conf. |
|----------|-------------------|----------|---------------------------|---------------------|-------|
| Shared schema + app `WHERE tenant_id` | Weak alone | Low | Easy joins; filter must be on every retrieval query | Forgotten filter → **cross-tenant leak** | H (practice) |
| Shared schema + Postgres RLS | Strong defense-in-depth | Medium | Same tables; policy must cover chunk/embedding rows | Owner/superuser/`BYPASSRLS` bypass; pool GUC leak; FK/unique covert channels | H (PG docs) |
| Schema-per-tenant | Strong namespace boundary | High at scale | Search path / per-schema indexes; cross-tenant analytics hard | N× migrations; catalog bloat; search_path mistakes | M/H |

## 4. Vector storage

| Option | Index types | Tenant filter | Self-host | Managed cost posture | Embedding-model change | Conf. |
|--------|-------------|---------------|-----------|----------------------|------------------------|-------|
| Postgres + pgvector | HNSW, IVFFlat; iterative scans ≥0.8 | SQL `WHERE` / partial indexes / RLS | Yes (extension) | Bundled with Postgres host | Full re-embed + rebuild | H |
| Qdrant | HNSW + payload filters | Payload / partitioning | Yes + Cloud | Free tier + hourly resources | Re-index vectors | H/M |
| Weaviate | Flexible indexes; hybrid BM25+vector | Native multi-tenancy (shard/tenant) | Yes + Cloud | Flex from ~$45/mo (vendor page) | Re-index | H |
| Pinecone | Managed indexes | Namespaces (soft isolation) | No | Serverless RU/WU + mins (~$50 Std cited) | Re-index; proprietary API | H/M |
| Milvus | Multiple; large-scale | Partition keys / strategies | Yes (ops-heavy) | Zilliz managed | Re-index | M |

## 5. Embedding / LLM providers

| Provider surface | Train on API data (default) | Default retention | ZDR path | BYOK feasibility | Portability | Conf. |
|------------------|----------------------------|-------------------|----------|------------------|-------------|-------|
| OpenAI API | No (since 2023-03-01 unless opt-in) | Abuse logs up to 30 days | Sales-approved ZDR/Modified Abuse Monitoring; embeddings ZDR-eligible | Customer API key in app vault = BYOK pattern | High if port behind project port | H |
| Anthropic Claude API | No without express permission | Feature-dependent; Covered Models may require 30d | Sales-enabled ZDR per org | Same BYOK pattern | High behind port | H |
| Google Gemini paid API | No for Paid Services (ToS) | Abuse logging; Search grounding forces 30d store | ZDR request; avoid grounding/store features | Same | High behind port | H |
| Voyage embeddings | Opt-out of store/train for zero-day | Files API 30d | Dashboard opt-out (paid method required) | Same | High | H |
| Cohere | SaaS logs ~30d; ZDR enterprise | Enterprise commitments page | Contact for ZDR | Same | High | H |

## 6. Auth / identity

| Option | Hosting | Org/multi-tenant | Session model | Small-scale cost | Conf. |
|--------|---------|------------------|---------------|------------------|-------|
| Better Auth | Self-hosted lib | Organization plugin + RBAC | App-owned sessions/DB | Software free; you run infra | H |
| Clerk | Managed only | Organizations; B2B add-on for advanced | Managed sessions | Hobby free (50k MRU / 100 MRO); Pro $25/mo | H |
| Auth.js / NextAuth style | Self-hosted | Orgs DIY | Flexible | Free software | M/H |
| Keycloak | Self-hosted IdP | Realms/orgs | OIDC/SAML | Apache-2.0; ops cost | H/M |

## 7. Hosting / deployment

| Option | Fit for solo/portfolio | Background jobs | Data residency | Conf. |
|--------|------------------------|-----------------|----------------|-------|
| Vercel (+ external DB) | Excellent Next DX; function time limits | Cron → HTTP; long workers elsewhere | Region choice limited by plan/product | H/M |
| Railway | App + worker + DB in one project | Native long-running services/cron | Region-dependent | H/M |
| Render | Explicit web/worker/cron | First-class workers | Region-dependent | H/M |
| Fly.io | Machines near users; more ops | Machines/processes | Multi-region control | M |
| Cloudflare Workers/Pages | Edge/static; cold-start friendly | Queues/cron; not classic Node workers | Edge network | M |
| Self-host VPS/Docker | Max story control | Full control (queues, workers) | You choose region | H (practice) |

## Open questions rolled up

See [08-candidate-shortlist.md](./08-candidate-shortlist.md) and category
files. Material `@user` gates: monthly budget ceiling; self-host vs managed
preference; privacy/ZDR ambition; whether collaborative editing is Phase-1;
data-residency story for portfolio demos.
