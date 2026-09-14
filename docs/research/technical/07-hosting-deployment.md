# Hosting and Deployment Options

**Research date / access date:** 2026-09-13 (Wave B); **Wave C amend 2026-09-14**  
**Version pins / pricing dates:** [`../version-ledger.md`](../version-ledger.md)  
**Question:** Solo/small-team, portfolio-budget hosts for OmniDoc —
implications for background ingestion/embedding jobs and data residency.
Evidence only; **no host SKU selected**.

## Shared evaluation lens (from `@user` 2026-09-14)

| Constraint | Value | How used here |
|------------|-------|---------------|
| Hosted-demo horizon | **6 months** | Score AWS Free plan window as **in-scope**, not a defect |
| Prefer | AWS Free Tier / self-host because free | Evidence, not selection |
| Infra budget | Prefer **$0**; ceiling ~**$20**/mo | Flag options that break $0 |
| Data region | **None** | No region gate |
| Railway / Render | Rejected as **default** | Kept as compared **non-defaults** |
| VPS | Fallback **only if** AWS cannot host web + worker + Postgres(+pgvector) for those 6 months | Not preferred for “6 months is short” |

## OmniDoc workload shape

1. **Interactive web** — Next.js (accepted) auth, editor, search UI  
2. **API/BFF** — retrieval, cite, provider proxy  
3. **Background workers** — chunk, embed, reindex (minutes–hours)  
4. **Datastore** — Postgres (± **pgvector**)

Serverless request limits conflict with (3) unless jobs are externalized.

---

## Wave C — AWS Free Tier after 2025-07-15 (primary)

**Access date for all AWS claims below:** **2026-09-14** unless noted.

### Credits vs always-free vs Free plan duration

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| New-customer Free Tier shape | Up to **$200** credits ($100 at sign-up + up to **$100** earnable); **≥30 always-free** services with monthly caps | Verified provider | H |
| Free plan length | Ends at **earlier of 6 months** from account open **or** Free Tier credits exhausted | Verified provider | H |
| Free plan extendable? | **No** — cannot extend Free plan beyond 6 months | Verified provider | H |
| Credit calendar expiry | Free Tier **credits** expire **12 months** from account creation (distinct from Free **plan** ending at 6 months) | Verified provider | H |
| Always Free | Ongoing monthly allowance on both Free and Paid plans; overage covered by credits, then Paid charges | Verified provider | H |
| Free plan vs Paid usage rights | Free plan: limited service set; **no charges** until upgrade (or paid-only activation). Paid: all services; pay beyond credits | Verified provider | H |
| Account creation cutoff | Accounts **on/after 2025-07-15** use credit + 6-month Free plan model; **legacy** accounts keep prior 12-month usage-limit Free Tier | Verified provider | H |
| Eligibility | New customers only; prior AWS account → ineligible for Free plan / Free Tier credits | Verified provider | H |

**Sources:**  
https://aws.amazon.com/free/ ;  
https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/ (posted 2025-07-16);  
https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html ;  
https://aws.amazon.com/free/free-tier-faqs/  
(all accessed **2026-09-14**).

### What happens at Free plan expiry (honesty; not a current blocker)

| Event | Documented outcome | Class |
|-------|--------------------|-------|
| Free plan expires (6 months or credits gone) | AWS **closes** the account; lose access to resources/data | Verified provider |
| Data retention after close | AWS retains data **90 days**; upgrade to Paid can reopen/restore | Verified provider |
| Download after expiry | Possible within 90 days **only after upgrading to Paid** | Verified provider |
| No upgrade within 90 days | Account and content **permanently erased** | Verified provider |
| Upgrade mid-window | Remaining Free Tier credits apply to Paid bills until **12-month** credit expiry | Verified provider |

**Project lens:** 6-month demo horizon is an **accepted fit**. Expiry is an **ops/export** risk to plan for, **not** a reason to reject AWS for lacking a 12-month always-on Free plan.

**Source:** Free Tier FAQs Free Plan Q3–Q6 (accessed 2026-09-14).

### Service eligibility relevant to OmniDoc

| Surface | Free-plan / Free Tier signal (2026-09-14) | Fit for web+worker+Postgres | Class |
|---------|------------------------------------------|-----------------------------|-------|
| **Amazon EC2** | Free-plan eligible instance types for accounts ≥2025-07-15: `t3.micro`, `t3.small`, `t4g.micro`, `t4g.small`, `c7i-flex.large`, `m7i-flex.large`; usage consumes **credits** (cannot exceed Free Tier limits on Free plan) | Can co-host Next.js + long-running worker (one or more instances) | Verified provider |
| **Amazon RDS** (PostgreSQL) | Free plan: `db.t3.micro` / `db.t4g.micro` for MySQL, **PostgreSQL**, MariaDB, SQL Server Express; credit-backed | Managed Postgres candidate | Verified provider |
| **pgvector on RDS PostgreSQL** | Extension `pgvector` listed in RDS PostgreSQL extensions matrix (e.g. **0.8.2** on current majors in the table) | Vector-in-Postgres feasible on RDS | Verified technical |
| **Amazon ECS** | Listed under Free Tier of Sign up for AWS (new) | Containerized web + worker pattern | Verified provider (list) |
| **AWS Lambda** | **Always Free** monthly request/GB-s caps on Free and Paid | Poor fit alone for long embed jobs | Verified provider |
| **Amazon Lightsail** | **90-day free trial requires Paid plan**; Linux plans from ~$5/mo after trial; Lightsail listed **not supported** on Sign up for AWS (new) without advanced features | **Not** a Free-plan 6-month path | Verified provider |
| **AWS App Runner** | Listed under **Paid Plan** services for Sign up for AWS (new) (not Free Tier list); pricing: provisioned memory while idle; pause/resume to save cost | Burns credits / needs Paid; idle cost real | Verified provider |

**Sources:**  
https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html ;  
https://aws.amazon.com/rds/free/ ;  
https://aws.amazon.com/free/compute/ ;  
https://aws.amazon.com/free/compute/lightsail/ ;  
https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html ;  
https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html ;  
https://aws.amazon.com/apprunner/pricing/  
(accessed **2026-09-14**).

**Caveat (Unresolved / provider):** Sign-up “new experience” docs warn limited rollout; Free-plan eligible service lists can differ by sign-up path. Confirm the live account’s Free Tier offer page before treating any SKU as available.

### Can Next.js + long-running worker + Postgres(+pgvector) run **6 months at $0**?

| Path | $0 cash while Free plan active? | Likely lasts full 6 months? | Always-on / sleep | Class |
|------|----------------------------------|-----------------------------|-------------------|-------|
| **Free plan + EC2 (eligible types) + RDS Postgres micro + pgvector** | **Yes** — Free plan does not bill until Paid upgrade; usage draws **credits** | **Conditional** — continuous always-on compute + RDS can **exhaust credits before 6 months**, ending Free plan early | EC2/RDS are always-on (no PaaS “sleep”); credit-burn is the failure mode | Inference from verified Free-plan + pricing shape; **PoC Cost Explorer required** |
| **Free plan + ECS + RDS** | Same credit model | Same credit-burn risk | Container services stay up if provisioned | Inference |
| **Lambda-only web** | Always-Free caps help | Function timeouts conflict with long workers | Cold starts | Verified limits + workload mismatch |
| **App Runner + RDS** | App Runner is **Paid-plan** service on new sign-up lists; idle provisioned GB-hour cost (vendor examples ~$0.34/day memory alone for 2 GB) | Not a Free-plan-native path; credit-burn if on Paid with credits | Pause reduces cost; not zero when provisioned | Verified provider |
| **Lightsail bundle** | Trial is **90 days on Paid**, not 6-month Free plan | After trial, ~$5–12+ instance + managed DB from ~$15–30 → can breach ~$20 ceiling | Always-on VPS-like | Verified provider |
| **Paid plan + credits only** | Credits apply until depleted/expire (12 mo); then pay-as-you-go | Can keep account open past 6 months **with spend** | Same | Verified provider |

**Bottom line (no selection):** AWS **can host** the OmniDoc topology (web + worker + Postgres+pgvector) inside Free-plan-eligible surfaces (**EC2 and/or ECS + RDS**). Whether that stays **$0 for the full 6 months** depends on **credit burn**, not on missing a 12-month Free plan. One always-on eligible EC2 in us-east-1 is roughly **$6–15/mo** list (before RDS/EBS/egress); two processes + RDS can consume a large share of **$100–$200** credits over 6 months — **PoC Cost Explorer required**. **VPS fallback** is only justified if a concrete PoC shows Free-plan topology cannot stay within credits / eligible services for the demo window — **not** because 6 months is “too short.”

### Sleep / cold-start / credit-burn (adverse)

| Risk | Evidence | Class |
|------|----------|-------|
| Credit exhaustion ends Free plan early | Free plan ends when credits fully used | Verified |
| Idle App Runner still costs provisioned memory | Pricing page: pay GB-hour while provisioned; examples show non-trivial monthly idle cost | Verified |
| Free plan service subset | Cannot freely use every AWS product without Paid | Verified |
| Org / Control Tower | Joining Organization / Control Tower: credits expire immediately; Free → Paid auto-upgrade | Verified |
| Exact monthly burn for EC2+RDS micro | EC2 Linux On-Demand **us-east-1** (AWS public price list, 2026-09-14): `t3.micro` **$0.0104**/hr (~**$7.5**/30d); `t3.small` **$0.0208**/hr (~**$15**/30d); `t4g.micro` **$0.0084**/hr (~**$6.0**/30d); `t4g.small` **$0.0168**/hr (~**$12**/30d). RDS + EBS + egress **not** in this pin — still PoC | Verified (EC2 hours); Unresolved (full stack) |

---

## Compared non-defaults (Wave B retained)

### Option A — Vercel (+ managed Postgres elsewhere)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Strong Next.js DX; git deploys | Common practice | H |
| Background jobs | Cron → HTTP; long workers need external runner | Verified + practice | H/M |
| Budget | Hobby tiers; commercial limits | Common practice | M |

**Adverse:** Split-brain for embed workers; cold starts.

### Option B — Railway (**non-default**)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Services + cron + DB in one project | Verified | H |
| Background jobs | Long-running services | Verified | H |
| Budget | Usage-based; not always-free | Secondary / practice | M |

**Status:** `@user` **rejected as default** (2026-09-14). Retain for comparison only.

### Option C — Render (**non-default**)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Explicit web / worker / cron | Verified | H |
| Free tier sleep | Free web may sleep — demo risk | Common practice | M |

**Status:** `@user` **rejected as default** (2026-09-14). Retain for comparison only.

### Option D — Fly.io

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Persistent machines | Common practice | M |
| Budget | Pay-as-you-go | Secondary | M |

### Option E — Cloudflare Pages/Workers

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Edge/static; Workers APIs | Common practice | M |
| Jobs | Not classic Node worker semantics | Common practice | M |

### Option F — Self-host VPS / Docker Compose (**fallback only**)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Fit | Full control of web+worker+Postgres+queue | Common practice | H |
| Cost | Often ~$5–20/mo VPS class | Common practice | M |
| When to consider | Only if AWS Free-plan topology **cannot** cover 6-month always-on web+worker+Postgres(+pgvector) within credits/eligibility | `@user` rule | — |

**Adverse:** TLS, upgrades, backups, monitoring owned by project.

---

## Data residency (portfolio-grade)

OmniDoc: global English-speaking; **data region preference = none** (`@user`). Still record:

- Postgres snapshot region  
- Embedding/LLM provider processing regions  
- Avoid “data stays in my VPC” claims on shared managed PaaS without evidence  

**Classification:** storytelling + provider geography — not legal advice.

---

## Findings

### Verified provider requirements

- Post–2025-07-15 Free Tier = **credits + 6-month Free plan** (+ always-free), not legacy 12-month always-on EC2/RDS hours as the headline story.
- Free plan expiry **closes the account**; 90-day Paid-upgrade window for data recovery.
- EC2 + RDS PostgreSQL are Free-plan-relevant; **pgvector** is an RDS PostgreSQL extension.
- Lightsail free trial ≠ Free plan; App Runner sits on **Paid** lists for new sign-up experience.

### Inferences (Architect inputs — no selection)

- Prefer evaluating **EC2 and/or ECS + RDS Postgres(+pgvector)** under Free plan for the 6-month demo — **not** Lightsail/App Runner as Free-plan defaults.
- Treat **credit monitoring** (Cost and Usage widget / `GetAccountPlanState`) as mandatory demo ops.
- Railway/Render remain viable **paid** shapes but are **non-defaults** by product decision.

### Unknowns / PoC

1. Exact USD burn for always-on eligible EC2 + RDS (+ EBS, egress) over 6 months in a chosen region.  
2. Whether the operator’s sign-up path exposes the full Free Tier service list above.  
3. pgvector version pin on the specific RDS engine version chosen at scaffold time (matrix shows **0.8.x**, not necessarily ledger **0.8.6**).

## PoC plan

1. New AWS Free plan account: deploy Next.js + worker process on Free-tier-eligible EC2 (or ECS) + RDS PostgreSQL with `CREATE EXTENSION vector`.  
2. Run a multi-hour embed job; confirm no sleep and track credit burn daily for 7–14 days; extrapolate to 6 months.  
3. Document Free plan end date + credit balance; export/backup drill before month 6.  
4. Only if (1)–(2) fail eligibility or burn: time-box a ~$5–20 VPS Compose fallback PoC.

## Architect inputs (no selection)

1. **Do not** rewrite ADR §7 as Railway/Render primary — `@user` rejected that default.  
2. **Do not** reject AWS for lacking 12-month Free always-on — 6-month window is in-scope.  
3. Evidence supports **AWS Free-plan-capable topology** (EC2/ECS + RDS + pgvector) at **$0 cash** while Free plan lasts; **credit exhaustion** and **account close at expiry** are the honest adverse facts.  
4. **No host SKU is selected** in this research.

## Sources (Wave C access 2026-09-14)

- https://aws.amazon.com/free/  
- https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/  
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html  
- https://aws.amazon.com/free/free-tier-faqs/  
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html  
- https://aws.amazon.com/rds/free/  
- https://aws.amazon.com/free/compute/  
- https://aws.amazon.com/free/compute/lightsail/  
- https://aws.amazon.com/lightsail/pricing/  
- https://aws.amazon.com/apprunner/pricing/  
- https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html  
- https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html  
