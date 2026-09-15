# OmniDoc — Technical Platform Evidence (Task 0.2 + Wave C 0.8)

**Owner:** `/researcher`  
**Phase / Task:** 0 / 0.2 (baseline); **0.8 Wave C** amends `05`, `07`,
matrix, shortlist, optional `09`; **R-BE** adds `10`–`15`  
**Research date:** 2026-09-13; Wave C access **2026-09-14**; R-BE **2026-09-15**  
**Version pins:** [`../version-ledger.md`](../version-ledger.md) — Java/Spring rows verified 2026-09-15; FE/data 2026-09-14; re-verify before each Phase Check  
**Status:** Evidence and shortlists only — **not** an architecture decision

## Purpose

Bounded, dated evidence so `/architect` can draft / amend ADR-0001. No stack,
vendor, or provider is selected here.

## Package Contents

| File | Scope |
|------|--------|
| [../version-ledger.md](../version-ledger.md) | Pinned versions + re-verify rules (authority for every version claim) |
| [00-evidence-matrix.md](./00-evidence-matrix.md) | Cross-category matrix + confidence labels |
| [01-frontend-frameworks.md](./01-frontend-frameworks.md) | Next.js, React Router 8, Vite+React SPA, SvelteKit (+ brief exclusion) |
| [02-rich-text-editors.md](./02-rich-text-editors.md) | TipTap/ProseMirror, Lexical, CodeMirror, Milkdown |
| [03-multi-tenant-isolation.md](./03-multi-tenant-isolation.md) | RLS vs app scoping vs schema-per-tenant + RAG implications |
| [04-vector-storage.md](./04-vector-storage.md) | pgvector vs dedicated stores |
| [05-embedding-llm-providers.md](./05-embedding-llm-providers.md) | Embeddings/LLMs, retention, BYOK, OpenRouter (Wave C) |
| [06-auth-identity.md](./06-auth-identity.md) | Self-hosted vs managed auth |
| [07-hosting-deployment.md](./07-hosting-deployment.md) | Solo/portfolio hosting + AWS Free Tier (Wave C) |
| [08-candidate-shortlist.md](./08-candidate-shortlist.md) | Non-binding shortlists with tradeoffs |
| [09-byok-and-usage-metering.md](./09-byok-and-usage-metering.md) | OmniDoc vs OR-upstream BYOK; vault patterns; usage APIs (Wave C) |
| [10-backend-runtime-java-spring.md](./10-backend-runtime-java-spring.md) | Spring Boot / Java LTS / Maven vs Gradle (R-BE) |
| [11-monorepo-polyglot-nx-gradle.md](./11-monorepo-polyglot-nx-gradle.md) | Nx + JVM layout; ArchUnit vs Nx tags (R-BE) |
| [12-auth-java-spring-security.md](./12-auth-java-spring-security.md) | Java identity adapters; Better Auth unfit on JVM (R-BE) |
| [13-spring-ai-openrouter-byok-fit.md](./13-spring-ai-openrouter-byok-fit.md) | Spring AI / LangChain4j / raw HTTP behind ports (R-BE) |
| [14-python-sidecar-policy.md](./14-python-sidecar-policy.md) | When a Python sidecar could be justified (R-BE) |
| [15-java-test-obs-migrate.md](./15-java-test-obs-migrate.md) | Logging, tests, Flyway/JDBC, OpenAPI handshake (R-BE) |

## Project Constraints Applied

- Frontend TypeScript (Next.js) accepted (ADR-0001 §1). Backend
  **application** stack is R-BE evidence for ADR-0005 — **not** selected
  here. Concrete Java/Node API pending `@user`
- Locale `en` (LTR); RTL deferred (not closed) — RTL-readiness is a
  forward-compatibility criterion
- Portfolio / freelancing credibility: cost, self-hostability, defensible
  public story matter
- No commerce, payments, shipping, or SMS
- Extension-First criteria from `AGENTS.md` drive evaluation columns
- Cross-tenant leakage is a **security failure**, not a relevance miss

## Classification Legend

| Label | Meaning |
|-------|---------|
| **Verified technical** | Confirmed from official docs / repo / standards |
| **Verified provider rule** | Stated in current provider docs/ToS |
| **Common practice** | Industry pattern; not mandatory |
| **Inference** | Reasonable conclusion from evidence; needs PoC or gate |
| **Unresolved** | Conflicting, undated, or inaccessible official material |
| **@user gate** | Needs explicit product/budget/privacy decision |

## Handoff

R-BE archived: `docs/handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md`  
Java/Spring evidence feeds `/architect` **ADR-0005** (`proposed`) + `@user` U-BE.
Frontend stack selection remains ADR-0001 (already `accepted` §1–§5, §7).
