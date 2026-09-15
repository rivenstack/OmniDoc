# Auth / Identity for a Java API + Next.js UI (R-BE)

**Research date / access date:** 2026-09-15  
**Related:** [`06-auth-identity.md`](./06-auth-identity.md) (TypeScript-app lens, 2026-09-13) — **incomplete** for a JVM API.  
**Question:** What identity implementations fit OmniDoc’s §5.7 port if the API is Java? **No selection.**

## Why Better Auth does not transfer

Better Auth **1.7.4** (ledger) is a **TypeScript library** with an organization plugin (verified in `06`). It is **unfit** as the identity *implementation* inside a Java Spring API. The **port** (`architecture.md` §5.7) can stay; the adapter cannot be Better Auth-on-the-JVM.

Year-1 SSO is **not** required (ADR-0001 §6, still a product gate even if the library changes).

## Option A — Spring Security session cookies (BFF-style)

Next.js talks to the Java API with an **HttpOnly Secure** session cookie. Spring Security 7 documents SPA CSRF via `csrf.spa()` (docs.spring.io, accessed 2026-09-15).

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Tenant authority | Session bound in the API that does retrieval — matches `architecture.md` §2 | Inference (fit) | H |
| Org plugin equivalent | **None.** Expect first-party org/membership/invite tables | Common practice | H |
| Adverse | CSRF + cookie flags + session store (DB) are project-owned (same class of ops risk as Better Auth in `06`) | Common practice | H |

## Option B — JWT resource server

Java validates a bearer JWT issued by Next, an IdP, or a custom issuer.

**Tradeoff:** simpler horizontal APIs; browser token storage is easier to get wrong; revoke/short-TTL still required. Membership must **still** be re-resolved server-side — never trust `orgId` in the token as sole ACL.

## Option C — Spring Security Authorization Server (Security 7) or Keycloak

Spring Authorization Server feature work lives in **Spring Security 7** (`spring-security-oauth2-authorization-server`; e.g. reference docs 7.0.x, accessed 2026-09-15). Keycloak remains a full self-hosted IdP (`06`).

**Tradeoff:** real OIDC; year-1 SSO is **not** required → likely overkill. Keycloak **realms/groups are not** OmniDoc workspace ACL — still build membership tables.

## Option D — Hybrid: Better Auth in Next, Java as dumb API

Reuses ADR-0001 §6. **Usually a bad split:** `architecture.md` §2 requires identity + membership as **server authority for the API that retrieves**. If Next owns sessions and Java only sees forwarded `orgId`/headers, workers and vector search become an IDOR magnet. If both enforce membership, dual sources diverge.

Treat as **high-risk temporary scaffold only**, not a year-1 design.

## IDOR / CSRF checklist (any Java option)

- User A session + user B workspace selector → **403** (`06` PoC; still required)
- Cookie: HttpOnly, Secure, explicit SameSite; or no bearer in JS
- Job payloads re-load membership; never trust enqueue-only tenant claims

## Architect inputs (no selection)

- **`@user` must answer** session-cookie vs JWT vs external IdP, and whether Better Auth is **fully replaced**.
- Architect sequencing bias (not a decision): evaluate **A** first for a browser app + retrieval API.
- Clerk remains the managed fallback from `06` if `@user` accepts a sub-processor — still needs a Java resource-server or BFF story.
