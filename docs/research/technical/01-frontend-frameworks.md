# Frontend Framework Candidates

**Research date / access date:** 2026-09-13
**Question:** Which TypeScript web frameworks are credible for an
authenticated, document-heavy, editor-centric SaaS under Extension-First
criteria — without selecting a winner?

## Requirements (from OmniDoc)

- Authenticated app shell; note editor as primary surface
- Streaming AI answers and citations (server-mediated; UI must not call
  providers directly — architecture later)
- Locale `en` LTR now; RTL-readiness (logical CSS, single `lang`/`dir`
  source, `bdi` isolation) as forward compatibility
- Portfolio cost / self-host story / upgrade safety / lock-in awareness

## Options evaluated (≤3 primary + brief fourth)

### A. Next.js (App Router)

| Criterion | Evidence | Class | Conf. |
|-----------|----------|-------|-------|
| Maintenance | Active official docs; App Router + RSC model documented | Verified technical | H |
| Compatibility | React Server Components by default; Client Components via `'use client'` | Verified technical | H |
| Upgrade safety | Dual App/Pages routers; React canary coupling in App Router noted in docs | Verified technical | H |
| Accessibility | Framework does not replace WCAG work; React ecosystem tooling | Common practice | M |
| RTL-readiness | No claimed RTL locale; logical CSS/`dir` are app/CSS responsibilities | Inference | M |
| Performance | RSC reduces client JS for non-interactive trees; editor remains client-heavy | Verified + inference | M |
| Licensing/cost | Open-source framework (MIT ecosystem) | Verified technical | H |
| Hosting / lock-in | Best DX on Vercel; Node/self-host possible with adapters — migration cost real | Common practice | M |
| Export/exit | App code portable; RSC features may need rewrite on exit | Inference | M |
| Editor / streaming AI | TipTap/Lexical React adapters widely used; Route Handlers/SSE patterns common | Common practice | M |

**Adverse:** RSC bundler APIs may change across React minors (react.dev);
editor-centric UX is mostly Client Components anyway, reducing RSC
benefit for the core note surface. Vercel-shaped conventions create soft
lock-in.

**Sources:** https://nextjs.org/docs ; https://react.dev/reference/rsc/server-components (accessed 2026-09-13).

### B. React Router 7 (Remix successor)

| Criterion | Evidence | Class | Conf. |
|-----------|----------|-------|-------|
| Maintenance | Official: Remix merges into React Router v7; new projects recommended on RR7 | Verified provider/product | H |
| Compatibility | Vite plugin; loaders/actions; Framework Mode SSR default | Verified technical | H |
| Upgrade safety | Codemod path from Remix v2 documented; Node 20+ | Verified technical | H |
| Accessibility | Same React model as Next | Common practice | M |
| RTL-readiness | App-owned | Inference | M |
| Performance | Nested routes + selective SPA mode (`ssr: false`) | Verified technical | H |
| Licensing | MIT | Verified technical | H |
| Hosting / lock-in | Multiple adapters (Node, Cloudflare, etc.); less Vercel-coupling than Next | Common practice | M |
| Editor / streaming | Streaming SSR documented; AI streams typically via resource routes | Verified + practice | M |

**Adverse:** Naming transition (Remix → RR7) can confuse docs/hiring;
RSC depth differs from Next — verify team expectations.

**Sources:** https://remix.run/blog/merging-remix-and-react-router ; https://reactrouter.com/7.16.0/start/framework/routing ; upgrading docs (accessed 2026-09-13).

### C. Vite + React SPA (no meta-framework SSR)

| Criterion | Evidence | Class | Conf. |
|-----------|----------|-------|-------|
| Maintenance | Vite actively maintained; SPA pattern stable | Verified technical | H |
| Compatibility | Excellent for TipTap/Lexical SPA editors | Common practice | H |
| Upgrade safety | Build-tool upgrades usually smaller blast radius than meta-framework majors | Inference | M |
| Accessibility | Fully app-owned | — | — |
| RTL-readiness | Fully app-owned | — | — |
| Performance | Fast HMR; no SSR TTFB win for marketing pages unless added | Common practice | M |
| Hosting | Highest static portability (CDN/Pages) | Common practice | H |
| Lock-in | Low framework lock-in; you own API/BFF/auth glue | Inference | H |
| Streaming AI | Needs separate backend for secrets and SSE; browser must not hold provider keys | Verified threat surface | H |

**Adverse:** Auth session hardening, SEO for marketing, and CSRF/cookie
patterns are DIY. React docs historically push frameworks for new apps
(community/secondary evidence).

**Sources:** Vite docs / 2026 Vite vs Next comparisons (secondary); treat
marketing claims as weak (accessed 2026-09-13).

### D. SvelteKit (serious alternative)

| Criterion | Evidence | Class | Conf. |
|-----------|----------|-------|-------|
| Maintenance | Official Kit docs (routing, hooks, load, TypeScript `$types`) | Verified technical | H |
| Editor ecosystem | TipTap Svelte support exists; Lexical is React-first — fewer drop-in note editors | Common practice | M |
| Hosting | Adapter model (Node, Vercel, …) | Verified technical | H |
| Lock-in | Svelte component market ≠ React; hiring/pool tradeoff | Inference | M |

**Adverse:** OmniDoc research/skills and many editor examples assume
React; switching UI paradigm raises Extension-First “ecosystem maturity”
risk for rich-text and streaming AI UI kits.

**Sources:** https://svelte.dev/docs/kit/* (accessed 2026-09-13).

### Brief exclusion / watchlist

- **TanStack Start:** Credible Vite+SSR option with streaming; younger
  maturity than Next/RR7 — keep as watchlist, not primary shortlist seat
  unless Architect expands options (tanstack.com SSR docs, 2026-09-13).
- **WordPress/PHP/commerce stacks:** Explicitly out of scope per handoff.

## Findings summary

### Verified technical facts

- Next.js App Router defaults to Server Components; interactivity requires
  Client Components.
- React Router v7 is the documented successor path for Remix framework apps.
- SvelteKit provides typed server loads and adapters.

### Common market practices

- Editor-heavy SaaS often concentrates the note surface as a client island
  regardless of SSR framework.
- Portfolio demos frequently pair Next+Vercel or Vite SPA+separate API.

### Inferences

- For OmniDoc, framework choice is dominated by (1) hosting/ops story,
  (2) React vs Svelte editor ecosystem, (3) willingness to own BFF vs
  use framework server features — not by marketing “AI-ready” claims.

### Unknowns / @user items

- Preference for React vs willingness to use Svelte?
- Preference for Vercel-shaped DX vs hosting-portable Vite/RR7?
- Is marketing-site SEO in-process or a separate static site?

## PoC plan (non-binding)

1. Scaffold RR7 and Next App Router shells with identical TipTap note page,
   cookie session stub, and SSE mock citation stream.
2. Measure: cold start, editor input latency, a11y axe on editor chrome,
   logical CSS/`dir` fixture with mixed URL/`bdi` identifiers.
3. Deploy each to one portable host and one “native” host; record exit notes.
