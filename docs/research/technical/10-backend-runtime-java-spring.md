# Backend Runtime — Java / Spring Boot (R-BE)

**Research date / access date:** 2026-09-15  
**Version pins:** [`../version-ledger.md`](../version-ledger.md) (Java/Spring rows verified 2026-09-15)  
**Question:** If OmniDoc’s API and workers are **not** Node.js, what are the serious Java/Spring platform candidates, tradeoffs, and decision surfaces? **No selection.**

Phase 0 never evaluated a JVM API. ADR-0002 implied `apps/api` as a Node BFF. `@user` (2026-09-15) declined Node for the backend and stated Java Spring Boot as the skill/portfolio preference. That preference is a **driver input**, not an ADR.

Kept as accepted context (do not reopen here): Next.js 16.3.5 UI; PostgreSQL 18 + pgvector; ADR-0004 dual-mode BYOK; AWS Free-plan topology **class**; mocks-first.

## Option A — Spring Boot 4.1.x + Java 21 LTS

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Current line | Spring Boot **4.1.1** is the version on spring.io/projects/spring-boot (accessed 2026-09-15). Boot **4.0.0** GA 2025-11-20 | Verified technical | H |
| Java | Oracle SE roadmap: **21** and **25** are LTS. JDK 25 GA 2025-09-16 | Verified technical | H |
| Spring AI pairing | Spring AI **2.0.x** docs: supports Boot **4.0.x and 4.1.x** | Verified technical | H |
| SSE / workers | Servlet `SseEmitter` or reactive types; long-running workers as a second Boot process or `@Async` | Common practice | M |
| Containers | Fat JAR / layered OCI images fit EC2/ECS class (ADR-0001 §7) | Common practice | H |
| Adverse | JVM RSS vs Node on **t3.micro (1 GiB)** is unmeasured for OmniDoc; community reports heavier JVM heaps | Inference | M |

**Adverse:** Dual-language CI; Free Tier memory; Boot 4 modularization vs older tutorials.

## Option B — Spring Boot 4.1.x + Java 25 LTS

Same Boot line as A. **Tradeoff:** latest LTS résumé signal vs younger ops muscle memory and base-image churn (Temurin vs Oracle license on the demo host).

**Architect should decide** Boot major (4.1 vs stay-3). **`@user` must answer** 21 vs 25.

## Option C — Stay on Spring Boot 3.5.x

Boot **3.5.16** still appears on GitHub releases (accessed 2026-09-15). **Tradeoff:** misses Boot 4 / Security 7 / Spring AI 2 Boot pairing. Weaker 2026 portfolio signal. Prefer **not** unless a PoC blocks Boot 4.

## Maven vs Gradle

Both are first-class on start.spring.io. **Gradle** aligns with `@nx/gradle` (see `11`). **Maven** is simpler for a lone API module beside Nx. Neither affects RLS. If `@user` has no preference, Architect may recommend.

## Architect inputs (no selection)

- Portfolio driver (Next.js + Java) is legitimate — same class as ADR-0001 §1 recognizability.
- Pin Boot **4.1.x** and a single LTS JDK in ADR-0005 if Java is accepted; do not leave “latest”.
- SSE Ask must be proven through any reverse proxy (buffering off) — PoC, not this brief.
- Process topology (one JVM vs api+worker) is hosting/I-03, not a language choice.
