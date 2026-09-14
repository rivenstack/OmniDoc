# Vector Storage — pgvector vs Dedicated Stores

**Research date / access date:** 2026-09-13  
**Version pins:** [`../version-ledger.md`](../version-ledger.md) (verified 2026-09-14)  
**Question:** Compare Postgres+pgvector with dedicated vector databases for
OmniDoc multi-tenant RAG — indexes, tenant filters, scale, re-embed cost,
self-host vs managed. No selection.

## Option A — Postgres + pgvector

| Topic | Evidence | Class | Conf. |
|-------|----------|-------|-------|
| Indexes | HNSW (better speed/recall tradeoff, more memory, slower build; can build empty) and IVFFlat (faster build, less memory, needs training data) | Verified technical | H |
| Filtering | `WHERE` on tenant/ACL columns; with approx indexes, filter applied **after** index scan — sparse tenants can under-return without iterative scans | Verified technical | H |
| Iterative scans | pgvector ≥0.8.0 can expand scan until enough filtered results (latest **0.8.6**, verified 2026-09-14) | Verified technical | H |
| Multitenancy | SQL partial indexes / partitioning strategies documented in README “Filtering / Multitenancy” sections | Verified technical | H |
| Self-host | Extension on existing Postgres — one datastore for notes+vectors | Verified technical | H |
| Managed | Available on many Postgres hosts that ship pgvector (verify per host version) | Common practice | M |
| Model change | New embedding model ⇒ incompatible vectors ⇒ full re-embed + index rebuild | Verified technical / inference | H |
| Cost posture | Marginal cost of extension; pays Postgres storage/CPU | Inference | M |

**Adverse:** ANN + heavy filter selectivity needs tuning; very large
vector-only scale may stress general-purpose Postgres; extension version
must match host.

**Sources:** https://github.com/pgvector/pgvector ; PGXN vector README
(accessed 2026-09-13).

## Option B — Qdrant

| Topic | Evidence | Class | Conf. |
|-------|----------|-------|-------|
| Filtering | Payload-aware filtered search (vendor + independent comparisons) | Verified + secondary | M/H |
| Multitenancy | Payload partitioning / single collection patterns recommended in recent guides | Secondary | M |
| Self-host | First-class OSS server | Verified technical | H |
| Managed | Qdrant Cloud free tier (limited RAM/disk) + hourly resource billing; Hybrid/Private for residency | Verified provider | H |
| Model change | Re-upsert vectors; collection config may need dimension change | Inference | H |

**Adverse:** Second system to operate/backup; consistency with Postgres
notes requires application-level transactions/outbox.

**Sources:** https://qdrant.tech/pricing/ (accessed 2026-09-13).

## Option C — Weaviate

| Topic | Evidence | Class | Conf. |
|-------|----------|-------|-------|
| Hybrid search | Native BM25 + vector hybrid (vendor) | Verified provider | H |
| Multitenancy | Cloud pricing table lists multi-tenancy; shard-per-tenant discussed in 2026 guides | Verified + secondary | M/H |
| Managed cost | Flex from ~$45/mo minimum; Premium from ~$400/mo (vendor pricing page) | Verified provider | H |
| Self-host | OSS available | Verified technical | H |

**Adverse:** Managed minimums may exceed portfolio budget; ops for
self-host non-trivial.

**Sources:** https://weaviate.io/pricing (accessed 2026-09-13).

## Option D — Pinecone (managed-only contrast)

| Topic | Evidence | Class | Conf. |
|-------|----------|-------|-------|
| Hosting | Managed; no self-host | Verified provider | H |
| Tenant isolation | Namespaces — soft isolation; still require correct app filters | Common practice | M |
| Pricing | Serverless read/write/storage units; Standard minimums cited ~$50/mo in 2026 secondary sources — **reconfirm on pinecone.io/pricing before ADR** | Unresolved until live price fetch | M |
| Lock-in | Proprietary API; migration = re-embed/re-upsert | Inference | H |

**Adverse:** Weak self-host/portfolio narrative; exit cost.

## Option E — Milvus (scale contrast; likely overkill early)

Strong at very large scale; higher operational complexity. Treat as
scale-up candidate, not Phase-0 default seat unless Architect expands.

## Embedding-model migration (all stores)

Changing embedding model or dimensions invalidates stored vectors.
Plan for: version column on embeddings, dual-write or blue/green index,
batch re-embed cost (tokens × price), and retrieval cutover tests
(rag-evaluation skill).

## RAG isolation note

Vector similarity **without** tenant (and document ACL) constraints can
return another tenant’s chunks. Store choice does not remove this
requirement; some stores make filter syntax easier, none replace authz.

## Findings

### Verified technical facts

- pgvector HNSW vs IVFFlat tradeoffs and post-filter behavior are
  documented upstream.
- Dedicated stores differ mainly on ops model, hybrid search, and
  managed pricing — not on “whether tenant filter is required.”

### Unknowns / @user gates

- Hard ceiling on monthly infra ($0 / ~$25 / ~$100)?
- Is “single Postgres” a portfolio storytelling requirement?
- Expected corpus size (notes × chunks) year-1?

## PoC plan

1. 10k chunks × 2 tenants in pgvector HNSW with tenant filter; measure
   recall@k with/without iterative_scan.
2. Same corpus in one OSS dedicated store; compare ops steps and backup.
3. Simulate embedding model bump: re-embed 10k; time and cost estimate.
