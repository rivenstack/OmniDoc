# Hosting and Deployment Options

**Research date / access date:** 2026-09-13  
**Version pins / pricing dates:** [`../version-ledger.md`](../version-ledger.md) (verified 2026-09-14; host free-tier and usage-pricing rows are volatile — re-confirm before any budget claim)  
**Question:** Solo/small-team, portfolio-budget hosts for OmniDoc —
implications for background ingestion/embedding jobs and data residency.
No selection.

## OmniDoc workload shape

1. **Interactive web** — auth, editor, search UI  
2. **API/BFF** — retrieval, cite, provider proxy  
3. **Background workers** — chunk, embed, reindex (minutes–hours)  
4. **Datastore** — Postgres (± pgvector) and optional vector DB / queue

Serverless request limits conflict with (3) unless jobs are externalized.

## Option A — Vercel (+ managed Postgres elsewhere)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Strong Next.js DX; git deploys | Common practice | H |
| Background jobs | Cron invokes HTTP functions; long workers need external runner | Verified + practice | H/M |
| Data | DB via marketplace (Neon, etc.); not long-lived local disk | Common practice | H |
| Residency | Limited by platform regions/products | Unresolved detail | M |
| Budget | Hobby tiers exist; commercial limits apply | Common practice | M |

**Adverse:** Embedding backfills and queue consumers are awkward on
pure functions; cold starts; platform lock-in if using proprietary
features.

**Sources:** Vercel vs Railway KB https://vercel.com/kb/guide/vercel-vs-railway
(accessed 2026-09-13).

## Option B — Railway

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Services + cron + DB templates in one project | Verified provider comparison | H |
| Background jobs | Long-running services; cron containers | Verified (Vercel KB citing Railway) | H |
| Budget | Usage-based; free trial credit historically — **not always-free** | Secondary 2026 blogs | M |
| Residency | Region selection per service | Common practice | M |

**Adverse:** Cost predictability; you still own backups/upgrades for
containerized DBs unless using external managed DB.

## Option C — Render

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Explicit web / worker / cron service types | Verified (PaaS comparisons) | H |
| Background jobs | First-class background workers | Verified | H |
| Free tier | Free web services may sleep — fine for demos, weak for always-on API | Common practice | M |

**Adverse:** Sleep/cold-start on free tier harms “ask your notes” demos
if API sleeps mid-pitch.

## Option D — Fly.io

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Firecracker VMs, multi-region placement | Common practice | M |
| Jobs | Persistent machines/processes | Common practice | M |
| Budget | Pay-as-you-go; free allowance retired for new accounts (secondary 2024–2026 notes) | Secondary | M |

**Adverse:** More infrastructure knobs for a solo maintainer.

## Option E — Cloudflare Pages/Workers

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Edge/static; Workers for APIs | Common practice | M |
| Jobs | Queues/cron; not classic Node worker semantics | Common practice | M |
| Budget | Generous free tiers for many static/edge workloads (secondary) | Secondary | M |

**Adverse:** Node/Postgres worker patterns may need redesign; verify
framework adapters.

## Option F — Self-host VPS / Docker Compose

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Full control of web+worker+Postgres+queue | Common practice | H |
| Jobs | Native | — | H |
| Residency | Choose jurisdiction/provider | — | H |
| Portfolio story | Strong self-host narrative | Inference | M |
| Cost | ~$5–20/mo VPS class common | Common practice | M |

**Adverse:** You own TLS, upgrades, backups, monitoring — credibility
risk if ops slips.

## Data residency (portfolio-grade, not regional commerce)

OmniDoc is global English-speaking / portfolio — not a regulated
commerce market. Still record:

- Where Postgres snapshots live
- Where embedding/LLM providers process data (often multi-region US/EU)
- Whether “data stays in my VPC” is a demo claim (needs self-host or
  private/hybrid vector offerings)

**Classification:** product storytelling + provider geography — not a
legal conclusion.

## Findings

### Verified / strong practice

- Long-running ingestion fits **worker-capable** hosts (Railway, Render,
  Fly, VPS) better than function-only platforms.
- Separating web and worker is a common escape hatch on Vercel-like hosts.

### Unknowns / @user gates

- Monthly infra budget ceiling?
- Must demos be always-on (no sleep)?
- Prefer single-vendor PaaS vs Docker on a VPS for the public story?
- Any hard requirement on data region (US-only, EU, none)?

## PoC plan

1. Deploy API + worker that embeds 1k chunks on Railway **or** Render
   workers vs Vercel cron+queue hybrid; compare ops notes.
2. Kill worker mid-job; verify checkpoint/resume and tenant isolation.
3. Document region of DB and provider endpoints used.
