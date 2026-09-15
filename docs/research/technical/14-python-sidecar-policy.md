# Python Sidecar Policy (R-BE)

**Research date / access date:** 2026-09-15  
**Question:** When (if ever) should OmniDoc run Python beside a Java API for ingestion, OCR, or eval? **No selection.** Evidence recommendation is labelled as such.

`@user` allowed Python only if it is clearly better for a **bounded** task and cheap.

## Default (evidence recommendation, non-binding)

**In-process Java** for Phase 1 mocks and year-1 ingest:

| Task | Java-first candidate | Why |
|------|----------------------|-----|
| PDF/DOCX/HTML extract | Apache Tika / Spring AI `TikaDocumentReader` | Already in Spring AI ETL docs (accessed 2026-09-15) |
| Batch ingest / progress | Spring `@Async` or Spring Batch / dedicated worker Boot app | Same tenant re-check as `architecture.md` §2 |
| Chunking | Java behind §5.2 port | Deterministic fixtures first (S-03) |
| RAG eval | Java metrics + versioned corpus (`rag-evaluation` skill) | Avoid a second runtime in CI |

## When Python can be justified (named library + failed Java PoC)

| Bounded task | Prefer Java | Python only if… |
|--------------|-------------|-----------------|
| Layout-aware chunking | Tika + custom splitters | Time-boxed PoC shows Tika cannot meet citation offsets |
| OCR | Tika + Tesseract (native dep in image) | Cloud OCR / Unstructured uniquely better **and** cost OK |
| Unstructured.io | HTTP client **from Java** (no sidecar) | Local Unstructured **process** is cheaper than API **and** still behind §5.2 |
| Eval harness | Java | Existing Python eval stack is cheaper to reuse as **scripts**, not a production service |

## Adverse of a sidecar

- Second runtime, image, and deploy unit on AWS Free Tier
- Tenant re-check must happen in the sidecar **or** it must be a dumb worker that only sees already-authorized payloads — otherwise IDOR
- Dual logging/redaction surfaces for BYOK keys and note bodies

## Architect inputs (no selection)

- **`@user` must answer** policy: never in Phase 1 / eval-scripts-only / allow named PoC exception.
- Sequencing bias: **never in Phase 1**; do not schedule a Python service as S-01b.
