---
name: rag-evaluation
description: "Evaluate an OmniDoc chunking, embedding, lexical/vector/hybrid retrieval, fusion, reranking, or citation change with a repeatable corpus and explicit relevance/isolation evidence."
paths:
  - "backend/**"
  - "docs/research/**"
  - "docs/reviews/**"
  - "infra/**"
---

# RAG Evaluation

Use whenever a change may alter what sources are retrieved or cited.

## Minimum evaluation set

Maintain or create a bounded corpus containing:

- straightforward keyword lookup;
- semantic paraphrase;
- ambiguous terminology;
- headings + nested sections;
- code block;
- list/table content;
- multiple similar documents;
- stale/old document version;
- deleted/inaccessible document;
- cross-workspace negative case;
- question with no supported answer.

## Procedure

1. Record:
   - corpus version;
   - chunking configuration;
   - embedding model/version;
   - lexical config;
   - vector metric/index;
   - fusion/rerank config.
2. Define expected relevant document/chunk(s) for each query.
3. Compare relevant variants (e.g. lexical vs vector vs hybrid) when the handoff requires it.
4. Record repeatable retrieval metrics/scorecard such as:
   - Recall@K;
   - MRR / reciprocal rank;
   - nDCG where justified;
   - expected-source hit rate;
   - citation correctness;
   - tenant-isolation failures (must be zero).
5. Inspect failure cases, not only aggregate score.
6. Verify answer citations map back to the exact source/version.
7. Record latency/index-size/cost where the change affects them.
8. Save evaluation evidence so a later change can be regression-tested.

## Guardrails

- Do not tune only to one demo query.
- Do not report "hybrid is better" without evidence.
- Cross-tenant retrieval is a security failure, not a relevance miss.
- Do not compare incompatible embedding vectors without an explicit migration strategy.
