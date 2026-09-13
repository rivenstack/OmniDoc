# Core journeys — Capture, Organize, Retrieve, Ask

**Research date:** 2026-09-13  
**Labels:** See `README.md` evidence taxonomy.

---

## Journey 1 — Capture

**Job:** Get a thought, paste, or document into OmniDoc before it disappears — with minimal decisions.

### Step map

| Step | User intent | System surface | Friction / drop-off risk | Evidence |
|------|-------------|----------------|--------------------------|----------|
| 1. Trigger | “I need to save this now” | Entry point (new note, quick capture, paste, import) | If open-to-type latency is high, fleeting thoughts are lost | CITE-01, OBS-01, OBS-02 |
| 2. Mode choice | New note vs append vs import | List-first vs blank-canvas | Decision cost (“which note?”) adds 2–3s and kills capture | CITE-02, OBS-03 |
| 3. Author / paste | Type or paste content | Editor | Heavy structure (folder/database pick) before typing raises abort risk | OBS-04, OBS-05 |
| 4. Attach / import | Bring PDFs/docs | Import / upload | Multi-step import without progress stalls cold-start users | Common practice; HYP via UT-3 |
| 5. Confirm saved | Trust that content exists | Autosave / status | Ambiguous save state → re-paste / duplicate / distrust | Hypothesis UT-4 |
| 6. Optional enrich | Tag/folder later | Deferred organize | Forcing organize-at-capture increases abandonment | CITE-03, OBS-06 |

### Friction summary (Capture)

1. **Time-to-cursor** dominates mobile and interrupt capture (CITE-01, OBS-01).
2. **Browse-first vs write-first** opening pattern: list-first apps impose a decision before typing (CITE-02).
3. **Organize-before-write** is a well-documented tax in PKM/note tools (CITE-03, OBS-06).

### Design-facing implications (not designs)

- Prefer write-first default; defer folder/tag decisions (see REC-01).
- Treat paste and file import as first-class capture paths equal to typing (REC-02).

---

## Journey 2 — Organize

**Job:** Keep notes findable later without turning the product into a filing chore.

### Mental models in market

| Model | Strength | Cost | Evidence |
|-------|----------|------|----------|
| Folders / hierarchy | Familiar; supports systematic browse | Single location; classification effort at keep-time | CITE-04, CITE-05 |
| Tags / labels | Multi-context classification | Higher mental/manual effort; inconsistency; retrieval errors in studies | CITE-05, CITE-06 |
| Links / graph | Contextual relationships | Requires discipline; maintenance becomes the hobby | OBS-07, OBS-08 |
| Automatic / AI structure | Removes filing decisions | Trust surrender; opaque wrong links; hard to correct | OBS-09, OBS-10 |

### Step map

| Step | User intent | Friction / drop-off | Evidence |
|------|-------------|---------------------|----------|
| Capture lands in inbox/stream | “I’ll file later” | If no inbox, every note forces a location decision | CITE-03, OBS-06 |
| Optional classify | Folder/tag/link | Tagging increases reported mental demand vs folders in lab study | CITE-06 |
| Maintain | Rename, refile, dedupe | Vault/workspace maintenance displaces note use | OBS-08 |
| Rely on search/AI instead | Skip filing | Works only if retrieval is trustworthy | OBS-09; Hypothesis UT-5 |

### Documented cost of forced manual organization

- **Cited evidence (CITE-04):** Bergman et al. (2013), *Folder versus tag preference in personal information management* — strong preference for folders over tags for storage and retrieval when both available; multi-tag rarely used for retrieval. DOI/publisher: Wiley / JASIST.  
  https://onlinelibrary.wiley.com/doi/10.1002/asi.22906
- **Cited evidence (CITE-05):** Civan et al. (2008), ASIST — folders vs tags each have strengths; folders take more *cognitive* choice effort; tags take more *manual* effort; systematic “try here then there” easier with folders.  
  https://doi.org/10.1002/meet.2008.1450450214
- **Cited evidence (CITE-06):** Gao (2011), *Int. J. Human–Computer Interaction* — tagging showed higher mental demand/frustration on organize tasks and higher error rate on retrieval vs categorization.  
  https://doi.org/10.1080/10447318.2011.555309

**Project recommendation:** Do not require rich taxonomy before first value. Offer light optional structure; invest UX energy in retrieve + ask (REC-03).

---

## Journey 3 — Retrieve

**Job:** Re-find a known note or discover related material via browse, search, filters, or recency.

### Step map

| Step | Intent | Modes | Friction / drop-off | Evidence |
|------|--------|-------|---------------------|----------|
| Orient | “Where am I?” | Recents, inbox, folders | Empty or noisy recents fail recognition | Common practice; UT-6 |
| Query | Keyword / natural language | Search box | Exact-keyword miss when vocabulary drifted | OBS-11, OBS-12 |
| Filter | Narrow by type/date/tag | Filters | Over-filter → false empty | Common practice |
| Browse | Scan list / graph | Navigation | Deep hierarchy slows navigation | CITE-04 related work |
| Open & verify | Confirm right note | Preview / open | Title collision; similar notes | Hypothesis UT-7 |
| Pivot to Ask | “Just tell me” | Hand-off to Ask | Users abandon retrieve if Ask is trusted more — or never try Ask if retrieve fails | Hypothesis UT-8 |

### Browse vs query

- **Competitor observation (OBS-11):** Mem positions conversational/semantic query as replacement for folder navigation (vendor content + third-party reviews, 2025–2026).
- **Competitor observation (OBS-12):** Obsidian users retrieve via keyword search, links, and graph; quality depends on prior organization (Mem migration guides; independent comparisons).
- **Competitor observation (OBS-13):** Notion Q&A/search quality complaints concentrate on large/messy workspaces and content the AI cannot “see” (embeds/PDFs/databases) — third-party reviews 2026.

**Hypothesis (UT-8):** OmniDoc users will prefer Ask over browse once corpus > N notes *if* citations are inspectable; until then they stick to search/recents.

---

## Journey 4 — Ask (ask-your-notes)

**Job:** Ask a natural-language question and get an answer grounded in *my* corpus, with a path to verify.

### Step map

| Step | Intent | Friction / drop-off | Evidence |
|------|--------|---------------------|----------|
| Frame question | What do I want to know? | Blank Ask with no suggested starters stalls | OBS-14 (NotebookLM suggests questions) |
| Scope corpus | All notes vs subset | Wrong scope → wrong/missing answer | OBS-15 |
| Wait for answer | Streaming or complete | Streaming helps sighted skim; can harm AT users if mis-announced | CITE-07, CITE-08 |
| Read answer | Understand claim | Fluent prose over-persuades | CITE-09, CITE-10 |
| Inspect citations | Verify against source | High verify_time → citations unused → over-trust | CITE-11, CITE-12 |
| Handle refusal | Corpus insufficient | Fake answer worse than clear “no supported answer” | CITE-13 |
| Recover | Wrong / partial | Need path to source, re-ask, or edit note | Hypothesis UT-9 |
| Optional save | Keep answer as note | Missing save breaks research loop | OBS-14 |

### Drop-off risks unique to Ask

1. **Citation halo:** Citations raise trust even when irrelevant (CITE-09) — dangerous if passage preview is hard.
2. **Silent hallucination / over-answer:** Answering when documents do not support the claim (CITE-13).
3. **Stale corpus:** Confident summary of outdated notes without freshness cues (OBS-16).
4. **Mobile Ask friction:** Desktop-class source panels often degrade on phone (OBS-17).

Detailed trust analysis: [02-citation-trust.md](./02-citation-trust.md).

---

## Cross-journey activation path (SaaS framing)

```text
Signup → first capture → first successful retrieve OR ask-with-citation
         → repeat capture → retention
```

“Activated” for OmniDoc should mean more than account creation — see [03-onboarding-mobile.md](./03-onboarding-mobile.md).

---

## Evidence ID register (this file)

### Cited evidence

| ID | Claim (short) | Source | Date accessed / pub |
|----|---------------|--------|---------------------|
| CITE-01 | Launch-to-type latency is a primary differentiator for capture apps; Apple Notes ~87ms vs Notion ~800ms cold in one timed comparison | Dockling, “Apple Notes vs Notion… 2026” | 2026-09-13 / article dated for 2026 |
| CITE-02 | Opening to a note list forces decide-append-or-create; decision window loses ideas | Simple Memo vs Apple Notes comparison | 2026-09-13 |
| CITE-03 | Organization decisions at capture kill capture habit (synthesized with Mem/Obsidian vendor + review discourse) | Mem guides + MakeUseOf Mem review | 2025–2026 / accessed 2026-09-13 |
| CITE-04 | Strong folder preference over tags for storage & retrieval | Bergman et al., JASIST | 2013 / accessed 2026-09-13 |
| CITE-05 | Folders vs tags tradeoffs (cognitive vs manual effort; retrieval differences) | Civan et al., ASIST | 2008 |
| CITE-06 | Tagging higher mental demand/frustration; higher retrieval error vs categorization | Gao, IJHCI | 2011 |
| CITE-07 | Streaming into aria-live harms screen-reader users | Accessibility.build AI chat guide | accessed 2026-09-13 |
| CITE-08 | Streaming benefits do not transfer to serial audio; announce completion | Multigrid / WPS accessibility essays | accessed 2026-09-13 |
| CITE-09 | Citations increase trust even when random; checking citations decreases trust | arXiv:2501.01303 | 2025-01 |
| CITE-10 | Hallucinations undermine trust; designers should enable verification | Nielsen Norman Group, “AI Hallucinations…” | accessed 2026-09-13 |
| CITE-11 | Citation purpose is reducing verify_time; wrong citations suppress skepticism | Multigrid, “Citations and Sources in an AI Interface” | accessed 2026-09-13 |
| CITE-12 | Co-located, claim-linked sources support calibrated trust (expert co-design) | ACM CUI 2025, “Un-trusting the Chat…” | 2025 |
| CITE-13 | Grounded refusal is a core trustworthiness dimension for RAG | arXiv:2409.11242 (Trust-Score) | 2024–2025 versions |

### Competitor observations referenced

OBS-01…OBS-17 detailed in [04-competitor-teardown.md](./04-competitor-teardown.md).
