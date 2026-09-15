# Spring AI / LLM adapters behind OmniDoc ports (R-BE)

**Research date / access date:** 2026-09-15  
**Question:** Can Spring AI (or alternatives) implement §5.3 embed, §5.6 ask, §5.11 dual-mode **without** becoming the domain or corpus SoT? **No selection.**

Accepted: mocks-first; OpenRouter operator free-tier **gateway**; customer BYOK v1; no Assistants / hosted `vector_stores` as corpus SoT (ADR-0001 §5, ADR-0004).

## Option A — Spring AI 2.0.x in adapters only

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Current | Spring AI **2.0.1** on spring.io (accessed 2026-09-15) | Verified technical | H |
| Boot pairing | **2.0.x ↔ Boot 4.0.x / 4.1.x** (getting-started docs) | Verified technical | H |
| Surfaces | ChatClient (incl. stream/`Flux`), EmbeddingModel, Advisors, OpenAI starter, PgVectorStore, Tika reader / ETL | Verified technical | H |
| OpenRouter | OpenAI-compatible `base-url` override is the documented integration style; community uses `https://openrouter.ai/api` | Common practice | M |
| Embeddings on OR free-tier | Availability/quality **not** verified for OmniDoc — PoC required | Unresolved | L |

**Allowed pattern (inference):** Spring AI types stay in adapter packages. HTTP returns OmniDoc DTOs (answer states, citations). Credentials from §5.9/§5.11 only. Mode stamped; never silent operator↔customer mix.

**Forbidden pattern:** Spring AI `PgVectorStore` auto-schema / `initialize-schema=true` as **corpus SoT** (fights versioned chunks + Flyway owner vs app role — see `03` and `15`). Controllers returning `ChatResponse` / `Document`. QuestionAnswerAdvisor as tenant filter.

**Leak control:** ArchUnit: no `org.springframework.ai` in web/DTO packages.

## Option B — LangChain4j (~1.19 line)

GitHub releases show **1.19.0** with some modules still **beta** (e.g. pgvector). More “library” than Boot-opinionated. Same port discipline required.

## Option C — Raw HTTP (`RestClient` / `WebClient` → OpenAI-compatible OpenRouter)

Max control for dual-mode key stamping and redaction. More code. Honest engineering story if starters fight custom schema.

## Architect inputs (no selection)

- **`@user` must answer** appetite for Spring AI upgrade surface vs raw HTTP.
- Architect must **forbid** Spring AI vector table as OmniDoc SoT if Java+Spring AI is chosen.
- Production adapters remain **dark** until CX / production-AI gate (unchanged).
