# Multi-Tenant Isolation Approaches

**Research date / access date:** 2026-09-13  
**Question:** Compare Postgres RLS, application-layer scoping, and
schema-per-tenant for OmniDoc — including failure modes, ops cost, and
retrieval-time isolation for RAG. No selection.

## Shared assets at risk

Notes, document versions, chunks, embeddings, citations, org membership,
BYOK secrets, audit logs. Cross-tenant read/write is a **security
failure**, never a ranking miss (`MEMORY.md` / rag-evaluation skill).

## Option 1 — Application-layer scoping (shared tables + `tenant_id`)

| Aspect | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Mechanism | Every query includes `WHERE tenant_id = ?` (or equivalent) | Common practice | H |
| Ops cost | Lowest schema complexity; one migration path | Common practice | H |
| Failure modes | Forgotten filter on raw SQL, admin tool, job, or RAG retrieval | Common practice | H |
| RAG implication | Vector search **must** filter by tenant (and ACL) in the same
  transaction/path as similarity search; hybrid lexical+vector both need
  the filter | Inference | H |

**Strength:** Simple mental model; easy cross-tenant admin analytics if
explicitly authorized.  
**Weakness:** Isolation is only as strong as every code path; one miss
leaks.

## Option 2 — Postgres Row-Level Security (shared tables)

| Aspect | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Mechanism | `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`; default deny if enabled with no policy | Verified technical (PG 18 docs) | H |
| Owner/superuser bypass | Table owners normally bypass RLS; superusers and `BYPASSRLS` always bypass; `FORCE ROW LEVEL SECURITY` constrains owners but **not** superusers | Verified technical | H |
| Integrity covert channels | Unique/PK/FK checks bypass RLS; can leak existence across tenants | Verified technical | H |
| Pooling footguns | Session GUCs/`SET` can leak across pooled connections; prefer transaction-local `set_config(..., true)`; empty-string reset pitfalls documented in community + PG lists | Verified + practice | H/M |
| RAG implication | Policies must cover `chunks` / `embeddings` tables; retrieval role must be non-owner non-`BYPASSRLS`; missing tenant GUC should fail closed | Inference grounded in PG docs | H |

**Strength:** Defense-in-depth against forgotten `WHERE` clauses.  
**Weakness:** False confidence if app connects as owner/superuser; ops
complexity around roles, FORCE, and poolers; performance needs
tenant-leading indexes.

**Sources:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html ;
community RLS multi-tenant analyses (secondary; corroborate with PG docs)
(accessed 2026-09-13).

## Option 3 — Schema-per-tenant

| Aspect | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Mechanism | `tenant_a.notes`, `tenant_b.notes`; `search_path` or qualified names | Common practice | H |
| Ops cost | Migrations run N times; partial failure tracking; catalog growth slows planning at hundreds–thousands of schemas | Common practice / vendor eng blogs | M/H |
| Connection pooling | `search_path` mishandling → wrong schema; pool reuse risk | Common practice | M |
| RAG implication | Per-tenant indexes/collections natural; global ANN harder; workers must resolve schema from trusted tenant registry (never client-supplied alone) | Inference | M |
| Scale ceiling | Often cited as awkward beyond hundreds of tenants without heavy tooling | Common practice | M |

**Strength:** Strong namespace boundary; easier per-tenant export/drop.  
**Weakness:** Operational cost dominates for self-serve SaaS growth;
migration runner becomes a product.

**Sources:** PlanetScale “Approaches to tenancy in Postgres”; other
multi-tenant design writeups (secondary) (accessed 2026-09-13).

## Comparative matrix

| | App scoping | RLS (+ shared) | Schema-per-tenant |
|--|-------------|----------------|-------------------|
| Isolation if code perfect | OK | Stronger | Strong |
| Isolation if code buggy | Poor | Better | Better (path bugs remain) |
| Migration cost | 1× | 1× (+ policy tests) | N× |
| RAG filter responsibility | App (+ vector filter) | App + DB policy | Schema binding + app |
| Portfolio story | “We filter carefully” | “DB enforces tenancy” | “Hard isolation” |
| Typical combo | Often paired with RLS | Often paired with app filters | Rarely with RLS on same tables |

## Findings

### Verified technical facts

- Postgres documents owner/`BYPASSRLS` bypass and integrity-check bypass
  of RLS.
- Enabling RLS without policies denies row access for non-exempt roles.

### Common market practices

- Shared-schema + `tenant_id` (+ optional RLS) is the default SaaS path.
- Schema-per-tenant reserved for stricter isolation or low tenant counts.

### Inferences for OmniDoc RAG

- Whatever option is chosen later, **retrieval, citation assembly, and
  background embedding workers** are high-risk paths for IDOR/cross-tenant
  leaks and need explicit isolation tests (zero tolerated failures).

### Unknowns / @user gates

- Expected tenant count year-1 (10s vs 1000s)?
- Need for per-tenant physical export/delete SLA beyond logical delete?
- Willingness to operate non-owner DB roles and FORCE RLS in production?

## PoC plan

1. Shared schema with intentional “forgot filter” test — demonstrate leak.
2. Same schema with RLS + non-owner role — demonstrate block.
3. Embedding retrieval query with and without tenant predicate; assert
   empty cross-tenant result set.
4. Optional: two schemas migration-runner dry-run timing.
