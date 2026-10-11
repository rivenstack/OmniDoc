# B-07 Retrieval Evaluation

## Scope

- Slice: B-07 lexical and deterministic hybrid retrieval on the frozen S-02 search contract.
- Runtime: local PostgreSQL + pgvector under the normal `mock` embedding mode.
- Goal: record measurable retrieval evidence for architecture.md §7 and confirm zero isolation failures for the B-07 search path.

## Evaluation Corpus

The checked-in evaluation test is [apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchEvaluationIT.java](/home/kenzo/RivenStack/omni-note/apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchEvaluationIT.java).

Positive-query fixtures in the authorized workspace:

| Query ID | Query text | Relevant note | Covered characteristic |
| --- | --- | --- | --- |
| Q1 | `launch checklist` | `Launch checklist` | straightforward keyword match |
| Q2 | `pgvector BYOK config path` | `Formatting and config` | code/path-heavy content with inline identifiers |
| Q3 | `incident postmortem action items` | `Incident postmortem` | heading-style phrasing |
| Q4 | `imports searchable after indexing` | `Import visibility` | paraphrase-ish retrieval over indexing language |
| Q5 | `indexing progress pending ready` | `Indexing progress` | ambiguity across similar indexing notes |

Negative and isolation checks in the same test:

- sibling workspace note with overlapping `launch checklist` language
- foreign-tenant note with overlapping `launch checklist` language
- stale note whose old version still contains `legacy search term old body`
- soft-deleted note containing `deleted retrieval sentinel`
- forbidden selector case: actor A searching workspace B returns `FORBIDDEN`

## Metrics

Source: test output captured in `apps/api/build/test-results/test/TEST-com.omnidoc.api.retrieval.RetrievalSearchEvaluationIT.xml` from the command below.

| Mode | Recall@1 | Recall@3 | MRR |
| --- | ---: | ---: | ---: |
| Lexical | `0.800` | `0.800` | `0.800` |
| Hybrid | `0.800` | `1.000` | `0.867` |

Observations:

- Lexical search hit the relevant note at rank 1 for Q1, Q3, Q4, and Q5.
- Lexical search missed Q2 entirely, which is the most code/path-heavy query in the set.
- Hybrid search recovered Q2 inside top 3 while keeping the other positive queries within top 3, which raised Recall@3 from `0.800` to `1.000` and MRR from `0.800` to `0.867`.
- `degraded` stayed `false` in the B-07 endpoint coverage; this slice currently fails closed rather than returning partial hybrid results.

## Isolation Results

- Cross-tenant failures: `0`
- Cross-workspace leaks inside the bound tenant/workspace: `0`
- Stale-version hits: `0`
- Soft-deleted hits: `0`
- Wrong-workspace selector behavior: `FORBIDDEN` as required

Supporting automated checks:

- [apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchIT.java](/home/kenzo/RivenStack/omni-note/apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchIT.java)
- [apps/api/src/test/java/com/omnidoc/api/search/SearchHttpIT.java](/home/kenzo/RivenStack/omni-note/apps/api/src/test/java/com/omnidoc/api/search/SearchHttpIT.java)
- [apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchEvaluationIT.java](/home/kenzo/RivenStack/omni-note/apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchEvaluationIT.java)

## Exact Commands

Focused retrieval validation:

```bash
cd apps/api
./gradlew test --tests com.omnidoc.api.retrieval.RetrievalSearchIT
```

Search-slice validation:

```bash
cd apps/api
./gradlew test \
  --tests com.omnidoc.api.retrieval.RetrievalSearchIT \
  --tests com.omnidoc.api.search.SearchHttpIT \
  --tests com.omnidoc.api.retrieval.RetrievalSearchEvaluationIT
```

Full backend gate after B-07 changes:

```bash
cd apps/api
./gradlew clean test
```

## Known Limits

- Hybrid quality still depends on the deterministic mock embedding path from B-06, not a semantic live provider. The improved Q2 retrieval is therefore evidence for the composition logic, not for production semantic quality.
- B-08 answer synthesis, citation assembly, and B-12 dedicated isolation closeout remain separate slices.