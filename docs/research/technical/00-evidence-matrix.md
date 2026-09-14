# Evidence Matrix — OmniDoc Platform (2026-09-13; Wave C amend 2026-09-14)

Access date for sources cited below: **2026-09-13** unless a different
publication or effective date is stated. **Wave C** rows (OpenRouter,
AWS Free Tier) use access date **2026-09-14**. Confidence: **H** high
(primary official source), **M** medium (reputable secondary +
corroboration), **L** low (community / marketing / undated).

Version pins in this file come from
[`../version-ledger.md`](../version-ledger.md) (last verified
2026-09-14). Do not restate a version without a ledger row.

## 1. Frontend frameworks

| Option | Version/signal | Maintenance | TS SaaS fit | A11y | RTL-readiness | Hosting portability | Lock-in | Editor/AI streaming ecosystem | Cost/license | Evidence | Conf. |
|--------|----------------|-------------|-------------|------|---------------|---------------------|---------|-------------------------------|--------------|----------|-------|
| Next.js (App Router) | App Router on **16.3.5** (stable 2026-09-11; verified 2026-09-14); RSC default | Vercel-led; large ecosystem | Strong for authenticated apps | React/a11y ecosystem; app responsibility | Logical CSS + `lang`/`dir` are app-owned; framework does not ship RTL locale | Strong on Vercel; portable via Node adapters with effort | Medium (platform conventions, RSC bundler coupling) | TipTap/Lexical React; SSE/stream patterns common | MIT (framework) | nextjs.org/docs; react.dev RSC | H |
| React Router 8 (Remix successor) | Official: RR v8 = Remix path (**8.3.1**, 2026-08-28; verified 2026-09-14); Vite | Remix/RR team; Vite-native | Strong loaders/actions | Same React a11y model | App-owned `dir`/`lang` | High (Node, Cloudflare, etc. adapters) | Lower than Next for hosting | Mature data APIs; streaming SSR supported | MIT | reactrouter.com; remix.run merge blog | H |
| Vite + React SPA | Vite build tool + client router | Vite/Evan You; RR optional | Fit for editor-heavy SPA; SEO/auth shell DIY | App-owned | App-owned | Highest static/CDN portability | Low framework lock-in; ops for API/SSR elsewhere | Streaming AI via separate API; no built-in SSR | MIT | vitejs.dev; community 2026 comparisons | H/M |
| SvelteKit | Kit 2.x docs active | Svelte core | Strong full-stack; smaller React editor ecosystem | Good kit a11y patterns; verify editor libs | App-owned; fewer React editor options | Adapters (Node, Vercel, etc.) | Medium (Svelte component ecosystem) | TipTap has Svelte; Lexical React-first | MIT | svelte.dev/docs/kit | H |
| TanStack Start (brief) | Vite + SSR/streaming | Newer; TanStack | Credible 4th for Vite SSR without Next | Same React model | App-owned | Vite deploy targets | Maturity younger than Next/RR8 | Growing | MIT | tanstack.com SSR docs | M |

## 2. Rich-text / markdown editors

| Option | License | A11y claim | Collab path | Extensibility | RTL-readiness | Notes | Conf. |
|--------|---------|------------|-------------|---------------|---------------|-------|-------|
| TipTap (ProseMirror) | MIT core; paid Cloud suite | Headless — a11y is implementer duty; docs on roles/keyboard | Yjs + Hocuspocus (OSS); Cloud paid | Strong extension model | Official `textDirection` ltr/rtl/auto | v3.31.3 (npm latest, 2026-09-04; verified 2026-09-14) | H |
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
| Postgres + pgvector | HNSW, IVFFlat; iterative scans ≥0.8.0 (latest 0.8.6, verified 2026-09-14) | SQL `WHERE` / partial indexes / RLS | Yes (extension) | Bundled with Postgres host | Full re-embed + rebuild | H |
| Qdrant | HNSW + payload filters | Payload / partitioning | Yes + Cloud | Free tier + hourly resources | Re-index vectors | H/M |
| Weaviate | Flexible indexes; hybrid BM25+vector | Native multi-tenancy (shard/tenant) | Yes + Cloud | Flex from ~$45/mo (vendor page) | Re-index | H |
| Pinecone | Managed indexes | Namespaces (soft isolation) | No | Serverless RU/WU + mins (~$50 Std cited) | Re-index; proprietary API | H/M |
| Milvus | Multiple; large-scale | Partition keys / strategies | Yes (ops-heavy) | Zilliz managed | Re-index | M |

## 5. Embedding / LLM providers

| Provider surface | Train on API data (default) | Default retention | ZDR path | BYOK feasibility | Portability | Conf. |
|------------------|----------------------------|-------------------|----------|------------------|-------------|-------|
| OpenAI API | No (since 2023-03-01 unless opt-in) | Abuse logs up to 30 days | Sales-approved ZDR/Modified Abuse Monitoring; embeddings ZDR-eligible | OmniDoc customer-BYOK = key in app vault | High if port behind project port | H |
| Anthropic Claude API | No without express permission | Feature-dependent; Covered Models may require 30d | Sales-enabled ZDR per org | Same OmniDoc vault pattern | High behind port | H |
| Google Gemini paid API | No for Paid Services (ToS) | Abuse logging; Search grounding forces 30d store | ZDR request; avoid grounding/store features | Same | High behind port | H |
| Voyage embeddings | Opt-out of store/train for zero-day | Files API 30d | Dashboard opt-out (paid method required) | Same | High | H |
| Cohere | SaaS logs ~30d; ZDR enterprise | Enterprise commitments page | Contact for ZDR | Same | High | H |
| **OpenRouter** (Wave C, 2026-09-14) | OR default: no prompt/completion store; **upstream** training/retention still apply | OR: metadata always; content opt-in. Upstream often ~30d abuse | Enterprise in-region / ZDR filters exist; `@user` = no ZDR sales | **Two kinds:** OmniDoc vault key → OR API; vs **OR-upstream-BYOK** (keys in OR; 5% fee above allowance) | High as OpenAI-compatible gateway behind ports; **not accepted** | H |

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
| **AWS Free plan / Free Tier** (Wave C, ≥2025-07-15; access 2026-09-14) | Up to **$200** credits; Free plan **6 months** or credits exhausted (fits demo horizon); EC2+RDS(+pgvector) eligible shapes; **credit burn** can end plan early; account **closes** at Free plan end (90d Paid reopen) | EC2/ECS long-running; Lambda alone weak for embed | Region none required (`@user`); choose any participating region | H |
| Vercel (+ external DB) | Excellent Next DX; function time limits | Cron → HTTP; long workers elsewhere | Region choice limited by plan/product | H/M |
| Railway (**non-default**) | App + worker + DB; `@user` rejected as default | Native long-running services/cron | Region-dependent | H/M |
| Render (**non-default**) | Explicit web/worker/cron; rejected as default | First-class workers; free sleep risk | Region-dependent | H/M |
| Fly.io | Machines near users; more ops | Machines/processes | Multi-region control | M |
| Cloudflare Workers/Pages | Edge/static; cold-start friendly | Queues/cron; not classic Node workers | Edge network | M |
| Lightsail | 90-day trial on **Paid**; not Free-plan 6-mo path; may be unsupported on new sign-up experience | Instance always-on | Region-dependent | H |
| App Runner | **Paid-plan** list on new sign-up docs; idle provisioned memory cost | Request-driven; pause/resume | Region caveats | H |
| Self-host VPS/Docker | **Fallback only** if AWS cannot cover 6-mo web+worker+Postgres(+pgvector) | Full control | You choose region | H (practice) |

## Open questions rolled up

See [08-candidate-shortlist.md](./08-candidate-shortlist.md) and category
files. Many former `@user` gates closed 2026-09-14 (budget, BYOK v1,
privacy ~30d, AWS 6-mo Free Tier preference, data region none). Still
open for Architect: exact AWS SKU graph (no Researcher selection);
OpenRouter vs direct provider pairing; vault pattern (see `09`).
