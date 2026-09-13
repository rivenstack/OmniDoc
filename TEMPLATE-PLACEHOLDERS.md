# Resolved Project Identity

This repository is no longer a bootstrap template. Identity was confirmed
by `@user` on 2026-09-13. Do not reintroduce double-brace template tokens.

**Correction:** On 2026-09-13 `@user` confirmed the canonical name is
**OmniDoc** (slug `omni-doc`), not **OmniNote** / `omni-note`. OmniNote
was inferred from the local workspace folder during Phase 0 bootstrap and
was never user-confirmed. Scope is unchanged (multi-tenant AI/RAG note
and knowledge SaaS). GitHub remote: `https://github.com/rivenstack/OmniDoc.git`.
Do not rename the local checkout directory in docs; machine paths are
not part of product identity.

| Key | Resolved value |
|-----|----------------|
| Project name | OmniDoc |
| Project slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS — users capture notes/documents; the system chunks and embeds them; users search and ask questions with cited answers |
| Platform | TypeScript web SaaS (concrete stack pending ADR-0001) |
| CMS / commerce platforms | Not applicable — removed from operating contracts |
| Primary locale | `en` (LTR) |
| Secondary locale | None in scope for Phase 0 |
| Target market | Global / international English-speaking market |
| Business context | Portfolio / freelancing credibility project — production-quality look and behavior; no commerce, payments, shipping, SMS, or regional regulatory market in scope |

## Directionality policy (summary)

- Only locale in Phase 0: `en` (LTR).
- RTL / mixed-BiDi support is **deferred, not closed**.
- Hard requirement now: **RTL-readiness discipline** (logical CSS,
  locale-driven `lang`/`dir`, `bdi`/semantic isolation for identifiers
  and UGC, no physical-direction JS assumptions).
