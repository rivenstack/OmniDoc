# Auth and Identity Options

**Research date / access date:** 2026-09-13  
**Version pins / pricing dates:** [`../version-ledger.md`](../version-ledger.md) (verified 2026-09-14; Clerk pricing rows read 2026-09-13 — re-confirm before any budget claim)  
**Question:** Self-hosted vs managed auth for multi-tenant OmniDoc —
org support, session security posture, small-scale cost. No selection.

## Option A — Better Auth (self-hosted library)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Model | TypeScript auth library; you host DB/sessions | Verified technical | H |
| Organizations | Official organization plugin: members, invitations, roles, teams, AC | Verified technical | H |
| Cost | Software free; infra + your security ops | Verified technical | H |
| Lock-in | Code + schema in-repo; portable | Inference | M |
| Session security | You own cookie flags, rotation, CSRF, rate limits | Common practice | M |

**Adverse:** You are the IdP operator for threats (account takeover,
session fixation, invite abuse). Maturity younger than Clerk/Keycloak
ecosystems — verify release cadence and advisories before production.

**Sources:** https://better-auth.com/docs/plugins/organization
(accessed 2026-09-13).

## Option B — Clerk (managed)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Model | Hosted auth; React/Next-oriented components | Verified provider | H |
| Organizations | Built-in orgs, roles, switcher; Enhanced B2B add-on for advanced org SSO/roles | Verified provider | H |
| Hobby pricing | Free Hobby: **50,000 MRU** limit; **100 MRO** (pricing page) | Verified provider | H |
| Pro | **$25/mo** ($20 annual) with MFA, etc. | Verified provider | H |
| B2B add-on | ~**$100/mo** ($85 annual) for enhanced org features | Verified provider | H |
| Self-host | Not available | Verified provider | H |
| Data residency | Secondary analyses note limited residency options — **confirm on Clerk trust/DPA pages before privacy claims** | Unresolved / verify | M |

**Adverse:** Vendor lock-in; sub-processor story; cost cliffs at SSO/org
features; SMS auth exists but OmniDoc commerce/SMS product features are
out of scope (do not build SMS product flows).

**Sources:** https://clerk.com/pricing ; Clerk pricing articles
(accessed 2026-09-13).

## Option C — Auth.js (v5) / session DIY orgs

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Model | Self-hosted auth helpers widely used with Next | Common practice | M/H |
| Organizations | Not a full org product — you build tenancy tables | Common practice | H |
| Cost | Free software | Verified | H |
| Fit | Maximum control; more custom work for OmniDoc orgs | Inference | M |

**Adverse:** Easy to under-build invite/RBAC; security footguns if
sessions mishandled.

## Option D — Keycloak (self-hosted IdP)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| License | Apache-2.0 OSS IdP | Verified technical | H |
| Features | OIDC/SAML, realms, brokers — enterprise IAM breadth | Common practice | H |
| Cost | $0 license; non-trivial ops (HA, upgrades, backups) | Common practice | H |
| Fit for portfolio | Strong “self-host identity” story; heavier than needed for MVP | Inference | M |

**Adverse:** UX polish and Next/React DX worse than Clerk out of the box;
upgrade/ops burden for a solo maintainer.

## Session security checklist (all options)

- HttpOnly Secure cookies; precise SameSite; rotation on login
  privilege change
- Server-side session store or verified JWT with revoke list for
  multi-tenant admin actions
- Organization context bound server-side — never trust client-only
  `orgId` for authorization
- Invite tokens single-use, expiry, audit

(Classification: common practice / threat-model skill — not a legal
standard.)

## Findings

### Verified provider / technical facts

- Better Auth documents first-class organization plugins.
- Clerk publishes Hobby/Pro/B2B pricing suitable for small-scale starts.
- Keycloak remains a viable self-hosted IdP with ops cost dominant.

### Unknowns / @user gates

- Soft requirement: **self-host auth** for portfolio narrative?
- Need SAML/OIDC enterprise SSO in year-1?
- Acceptable third-party sub-processor for identity?

## Wave D pointer (R-BE, 2026-09-15)

If the API is Java, **this file’s Option A (Better Auth) cannot be the
JVM identity implementation.** See
[`12-auth-java-spring-security.md`](./12-auth-java-spring-security.md).
Year-1 SSO still **not** required. First-party org/membership tables
are required under every Java option.

## PoC plan

1. If staying on TypeScript API: Better Auth org plugin vs Clerk orgs:
   invite + role-gated note list.
2. If Java API: Spring Security session cookie from Next→Java **or** JWT
   validation; IDOR with forged `workspaceId`.
3. Attempt IDOR: user A token/session + user B `orgId` — must 403.
4. Record session cookie flags and logout revoke behavior.
