# OmniDoc — Technical Platform Evidence (Task 0.2)

**Owner:** `/researcher`  
**Phase / Task:** 0 / 0.2  
**Research date:** 2026-09-13  
**Access date for all web sources unless noted:** 2026-09-13  
**Status:** Evidence and shortlists only — **not** an architecture decision

## Purpose

Bounded, dated evidence so `/architect` can draft ADR-0001. No stack,
vendor, or provider is selected here.

## Package Contents

| File | Scope |
|------|--------|
| [00-evidence-matrix.md](./00-evidence-matrix.md) | Cross-category matrix + confidence labels |
| [01-frontend-frameworks.md](./01-frontend-frameworks.md) | Next.js, React Router 7, Vite+React SPA, SvelteKit (+ brief exclusion) |
| [02-rich-text-editors.md](./02-rich-text-editors.md) | TipTap/ProseMirror, Lexical, CodeMirror, Milkdown |
| [03-multi-tenant-isolation.md](./03-multi-tenant-isolation.md) | RLS vs app scoping vs schema-per-tenant + RAG implications |
| [04-vector-storage.md](./04-vector-storage.md) | pgvector vs dedicated stores |
| [05-embedding-llm-providers.md](./05-embedding-llm-providers.md) | Embeddings/LLMs, retention, BYOK, portability |
| [06-auth-identity.md](./06-auth-identity.md) | Self-hosted vs managed auth |
| [07-hosting-deployment.md](./07-hosting-deployment.md) | Solo/portfolio hosting + background jobs |
| [08-candidate-shortlist.md](./08-candidate-shortlist.md) | Non-binding shortlists with tradeoffs |

## Project Constraints Applied

- TypeScript web SaaS; concrete stack pending ADR-0001
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

Parallel handoff: `docs/handoffs/active/phase-0-task-0-2-researcher.md`  
Commander integrates after Wave B completes; selection is `/architect` +
`@user` via ADR-0001.
