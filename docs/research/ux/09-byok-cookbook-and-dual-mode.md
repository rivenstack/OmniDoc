# Dual-mode AI UX — mock → labelled live demo → customer BYOK

**Research date:** 2026-09-14  
**Owner:** `/ux_researcher`  
**Task:** 0.8b  
**Locale:** Primary `en` (LTR). RTL deferred (not closed) — RTL-readiness discipline only.  
**Business framing:** Portfolio / freelance; **6-month** hosted-demo horizon; billing UX stays portfolio-scale (not enterprise).  
**Hard boundaries:** Do **not** select providers or hosts. Refer to **operator free-tier** and **customer key** only. Do **not** treat UT-* as findings. Do **not** design live-AI-first onboarding that skips mocks.

Labels follow `README.md` evidence taxonomy.

---

## 1. Commander-aligned journey spine

```text
Mock Ask (CX First gate)
  → Labelled live demo (operator free-tier, after CX validated)
    → Customer BYOK scale (customer key for paid / sustained use)
```

| Stage | Mode label (customer-facing) | Corpus | AI path | Gate |
|-------|------------------------------|--------|---------|------|
| A | **Mock / sample answers** | Labelled sample **or** “mine” notes with mock adapter | Deterministic fixtures | Mandatory until Customer Experience First validated |
| B | **Live demo (operator free-tier)** | Same workspaces; mode chrome must say live + operator-funded | Operator free-tier behind ports | Only after Stage A validated |
| C | **Your key (BYOK)** | “Mine” (and labelled sample if still open) | Customer-entered key | Scale / sustained use; never silently mixed with operator quota |

**Project recommendation (REC-13):** Stage A is the default onboarding and portfolio script until the CX-first gate closes. Stage B is an explicit, labelled upgrade of the *same* Ask surfaces — not a separate product that skips mocks. Stage C is opt-in scale, introduced via cookbook/wizard (REC-14), not forced at first Ask.

**Hypothesis (UT-15):** Evaluators and first-run users complete a cited mock Ask faster and with clearer ownership understanding than an equivalent live-first path that requires key setup before first value.

---

## 2. Journeys in detail

### Journey DM-1 — Mock Ask (activation / demo)

**Job:** Experience capture → retrieve → ask-with-citation (or honest refusal) without provider setup.

| Step | Intent | Surface | Friction / drop-off | Evidence |
|------|--------|---------|---------------------|----------|
| 1. Enter | Open product / demo | Shell with mode cue “Mock” or “Sample answers” | Missing mode label → users think AI is “real” | REC-08, UT-2; **Hypothesis UT-16** |
| 2. Corpus | Use labelled sample and/or own first note | Sample badge vs “Mine” | Ownership confusion | REC-08, UT-2, architecture §9 |
| 3. Ask | Question → cited answer or refusal | Ask (same chrome as live) | Fake commerce / fake accuracy badges | Portfolio file; F-04 |
| 4. Verify | Citation → passage | Same-view preview | Citation halo if preview hard | CITE-09–12, REC-04 |
| 5. Optional | Clone-and-run fixtures for local eval | Docs / clone path | Public sample alone without fixtures weakens engineer credibility | Commander interpretation; REC-08 amend |

**Cross-link:** Core Ask steps in [01-journeys.md](./01-journeys.md); trust states in [02-citation-trust.md](./02-citation-trust.md).

### Journey DM-2 — Labelled live demo (operator free-tier)

**Job:** After CX gate, show real model behaviour under an honest “operator-funded demo” label — without implying customer payment or zero-retention.

| Step | Intent | Friction / drop-off | Evidence |
|------|--------|---------------------|----------|
| 1. Opt into live | Switch or promote from mock | Live-first CTA that hides mock path | Rejected by Commander; REC-13 |
| 2. Read mode chrome | Understand who pays / whose quota | Ambiguous “AI enabled” | **Hypothesis UT-17** |
| 3. Ask on sample or mine | Live answer + citations | Operator quota exhaustion mid-demo | Failure table §5; REC-16 |
| 4. Trust copy | Retention / logging honesty | Implying ZDR when policy is ~30-day abuse logs | Commander privacy gate; REC-17; CITE-21 |

### Journey DM-3 — Customer BYOK scale

**Job:** Customer creates a key **elsewhere**, pastes into OmniDoc, verifies, then runs first live Ask on **their** key — with usage visibility when APIs allow.

See §3 cookbook. Mode chrome must never imply the operator is still funding asks once BYOK is active (**Hypothesis UT-18**).

---

## 3. Cookbook / wizard pattern

### Step map (create elsewhere → paste → verify → first Ask)

| Step | User intent | System surface | Notes | Evidence |
|------|-------------|----------------|-------|----------|
| 0. Why | Understand when BYOK is needed | Short “when to use your key” | Portfolio-scale: avoid enterprise procurement language | Common practice; REC-14 |
| 1. Choose tool | Pick which key type / tool cookbook chapter | Tool list that **grows as tools are added** | Chapters are additive; do not redesign whole wizard per tool | Commander input; OBS-23 |
| 2. Create elsewhere | Open provider console / docs (external) | Deep-link + numbered external steps | OmniDoc does **not** mint the provider key | Common practice (OBS-24); CITE-22 |
| 3. Paste | Enter key once | Password-style field; never echo full key after save | Masked prefix after save is common practice | OBS-25; CITE-23 |
| 4. Verify | Confirm key works before trusting Ask | Explicit “Test / Verify” before or with save | Invalid / wrong-scope keys are common | OBS-26; REC-14 |
| 5. First Ask | Prove end-to-end on “mine” or labelled sample | Guided “Try Ask now” with mode = Your key | Do not auto-write answer into corpus | REC-06, REC-14 |
| 6. Manage | Revoke, rotate, re-verify | Settings / AI connections | Rotation without support tickets | OBS-27; REC-16 |

### Grow-as-tools-added pattern

**Project recommendation (REC-14):** Treat the cookbook as a **chapter index**: each new integrable tool adds one chapter (create-elsewhere steps, paste field semantics, verify probe meaning, failure copy). Shared shell = progress, verify, first Ask, revoke/rotate. Do not require a mega-wizard rewrite when tools expand.

**Competitor / practice observations**

| ID | Observation | Label | Date |
|----|-------------|-------|------|
| OBS-23 | Multi-provider connect UIs often use a catalog of “connectors” with per-provider setup instructions rather than one monolithic form | Competitor observation / common practice (SaaS connect patterns) | 2026-09-14 |
| OBS-24 | API-key creation typically happens in the **provider** console; host apps document copy-paste | Common practice (SaaS API-key user-flow galleries) | 2026-09-14 |
| OBS-25 | After save, UIs show masked prefixes (`sk-…xxxx`) and treat re-entry as replace — write-once display | Common practice (BYOK settings issues + practitioner writeups) | 2026-09-14 |
| OBS-26 | Dedicated “test key” / validate-before-save is repeatedly recommended; invalid and wrong-provider keys are expected failures | Common practice (BYOK pattern repos; product issues) | 2026-09-14 |
| OBS-27 | Revoke/clear and rotate are first-class; in-flight requests may finish once | Common practice (BYOK practitioner guidance) | 2026-09-14 |

### Cited / sourced inputs (non-OmniDoc)

| ID | Claim | Source | Label | Accessed |
|----|-------|--------|-------|----------|
| CITE-21 | OmniDoc privacy posture for this phase: accept standard ~30-day abuse-log retention; **no** zero-data-retention sales motion | `@user` / Commander gate recorded in `context.md` (2026-09-14) | Cited evidence (project gate) | 2026-09-14 |
| CITE-22 | Creating and managing API keys is commonly a settings/developer flow: create → copy once → manage/revoke; usage stats sometimes shown per key | SaaS Websites API-key user-flow examples https://saaswebsites.com/userflows-tag/creation-management-api-key-ui-examples/ | Cited evidence (desk / gallery) | 2026-09-14 |
| CITE-23 | Practitioner BYOK guidance: write-only after save; masked prefix; immediate revoke; usage attribution without exposing plaintext keys in logs/UI | DEV Community BYOK storage article (2025–2026 discourse) https://dev.to/c9dn/how-to-let-users-bring-their-own-openai-or-anthropic-api-keys-without-storing-them-in-plaintext-12m | Cited evidence (practitioner) — **not** OmniDoc validation | 2026-09-14 |

**Unknown:** Exact verify-probe semantics and which usage fields providers expose — owned by `/researcher` technical package; UX only requires honest “available / unavailable” states.

---

## 4. Usage and charges display

**Scope:** Portfolio / freelance honesty — show what the customer can understand; do **not** ship enterprise billing dashboards, invoices, tax, seats matrices, or fake “team spend analytics.”

| Surface | Customer need | Recommendation | Label |
|---------|---------------|----------------|-------|
| Mode banner | Know whose quota is burning | “Operator free-tier” vs “Your key” always visible near Ask | Project recommendation REC-15 |
| Session / period usage | Rough consumption | Show tokens or request counts **when APIs allow**; else “Usage not available from provider” | Hypothesis UT-19 |
| Charge estimate | Avoid surprise | Optional approximate cost only if grounded in provider-reported usage; never invent currency burn | Hypothesis UT-20 |
| Quota remaining (operator) | Demo continuity | Soft warn before hard stop; link to BYOK cookbook when operator quota low | REC-15, REC-16 |
| Customer key usage | Personal accountability | Attribute to workspace/user without showing secrets | CITE-23; REC-15 |

**Hypothesis (UT-19):** Showing coarse usage (requests or tokens) next to Ask mode chrome increases willingness to continue after a quota warning versus a hard silent failure.

**Hypothesis (UT-20):** Approximate charge copy without a clear “estimate / may differ from provider bill” disclaimer reduces trust when the provider bill differs.

**Project recommendation (REC-15):** Prefer one compact usage strip (mode + period usage + link to cookbook) over a billing console. If usage APIs are missing, show an honest empty state — never placeholder dollars.

---

## 5. Failure states (design-facing, not architecture)

| State | User-facing meaning | Recovery | Mode ownership | Rec |
|-------|---------------------|----------|----------------|-----|
| Invalid key | Key rejected on verify or Ask | Re-paste; re-open cookbook chapter; do not keep a “half-connected” success badge | Customer key | REC-16 |
| Wrong scope / wrong tool chapter | Key works elsewhere but not for this tool | Cookbook chapter mismatch callout | Customer key | REC-14, REC-16 |
| Operator quota exhausted | Live demo paused; mock still available | Switch to mock Ask; or start BYOK cookbook | Operator free-tier | REC-13, REC-16 |
| Customer key quota / rate limit | Their provider limit hit | Wait / rotate / check provider console (external) | Customer key | REC-16 |
| Operator vs customer mix-up | Ask ran on unexpected payer | Hard mode label + confirm on switch; never silent fallback that bills the other side | Both | REC-16; **UT-18** |
| Revoke | Key cleared; live BYOK asks stop | Return to mock or operator demo if allowed; cookbook to reconnect | Customer key | REC-16, OBS-27 |
| Rotate | Replace key | Re-verify required before live Ask resumes | Customer key | REC-16 |
| Transport / provider unavailable | Temporary outage | Retry; keep last successful mock path available for demos | Either | Architecture §9 themes; common practice |
| Verify succeeded, Ask failed | Partial connect | Distinguish verify vs Ask errors in copy | Customer key | **Hypothesis UT-21** |

**Project recommendation (REC-16):** Every failure names **which mode** failed and **what still works** (especially: mock Ask remains available through operator-quota and BYOK failures unless the whole product is down).

---

## 6. Trust copy — retention, sample vs mine, mode honesty

### Do not imply zero-retention

**Project recommendation (REC-17):** Live and BYOK surfaces must **not** claim “we never log” / “zero retention” while project policy accepts ~30-day abuse-log retention (CITE-21). Prefer short factual limits (“abuse and security logs may be retained up to ~30 days”) or defer detail to a privacy note — never ZDR marketing chrome.

### Sample vs “mine”

| Corpus | Required label | Risk if missing |
|--------|----------------|-----------------|
| Public / demo sample | **Sample** (or equivalent) on lists, Ask scope, citations | Evaluator thinks sample notes are personal data (UT-2) |
| User-owned | **Mine** / workspace name | Silent demos look like fake personalization |
| Clone-and-run fixtures | Documented as fixtures, not live tenant data | Engineer vs client confusion |

Aligns with REC-08, architecture §9 sample-vs-mine theme, Commander YES on public labelled sample **plus** clone-and-run fixtures.

### Mode labelling near Ask

Always distinguish:

1. Answer source: **from your notes** (corpus) vs model knowledge (UT-12 still unrun).  
2. Runtime: **Mock** vs **Live · operator free-tier** vs **Live · your key**.  
3. Corpus: **Sample** vs **Mine**.

**Hypothesis (UT-16):** Triple labelling (runtime × corpus × citation) reduces false beliefs that mock demos are billed live AI, measured by post-task comprehension questions.

---

## 7. Honest workspace / team chrome (minimal year-1 tenants)

Commander gate: year-1 tenant count is **minimal**; design tenancy to scale later without fake enterprise scale **now**.

| Do | Don’t |
|----|-------|
| Real workspace switcher for the few workspaces that exist | Fake “12 organizations” / org charts |
| Honest empty team invite / “solo workspace” | Fake seat matrices, SSO upsell walls, directory sync theatre |
| Correct membership labels when a second person exists | Enterprise admin suites in year-1 chrome |
| Sample workspace clearly non-production for portfolio | Calling sample an “Enterprise tenant” |

**Project recommendation (REC-18):** Workspace/team UI must be **correct at n≈1–few**. Portfolio credibility comes from real empty states and correct labels (CITE-17 analogy), not simulated scale.

**Hypothesis (UT-22):** Freelancer evaluators rate honest solo-workspace chrome higher than dashboard chrome populated with placeholder teams.

---

## 8. Accessibility + LTR-now / RTL-readiness

Applies to cookbook, usage strip, mode banners, and Ask trust chrome. Accessibility is a **release gate**, not polish ([07-accessibility-friction.md](./07-accessibility-friction.md), architecture §8).

| Concern | Design-facing requirement | Evidence |
|---------|---------------------------|----------|
| Keyboard | Full cookbook: open chapter → paste → verify → first Ask → revoke without mouse | REC-11, REC-19 |
| Focus | After verify success/fail, focus moves to a predictable status region; do not steal focus into streaming answers | CITE-07, REC-05 |
| Labels | Key field, verify button, mode switch, usage figures have accessible names | CITE-20 patterns |
| Live regions | Announce verify result and mode changes as **status**, not key characters | CITE-07–08, CITE-19 |
| Contrast / focus visible | Mode chips and usage text readable; focus rings on trust controls | CITE-18 |
| Reduced motion | No mandatory shimmer on verify/usage | Common practice |
| `lang` / `dir` | Locale shell drives document language/direction | Architecture §8 |
| Logical CSS | Margins/padding/inset use logical properties | Architecture §8 |
| `bdi` (or equiv.) | Isolate API key prefixes, URLs in cookbook, usage/request IDs, opaque provider error codes | Architecture §8–9; F-15 |
| RTL locale | **Deferred, not closed** — do not claim RTL shopping or locale UX | Project gates |

**Project recommendation (REC-19):** Cookbook and usage surfaces inherit REC-11 trust-control a11y bar; secrets never appear in `aria-live` payloads; identifiers wrap safely.

---

## 9. Portfolio / 60-second implications

Extend REC-12 script without live-AI-first:

1. Labelled **sample** → mock Ask → citation → refusal.  
2. Show **mode** chip (Mock).  
3. (Post-gate demo only) Switch to **operator free-tier** with retention-honest copy → one live Ask.  
4. Optional: open cookbook landing (chapter list) — do not force paste in the 60s script.  
5. Workspace chrome shows real solo/minimal tenants — no fake enterprise.

Details amended in [06-portfolio-credibility.md](./06-portfolio-credibility.md).

---

## 10. Input summary for Architect / Designer

### Architect (constraints only — UX does not co-own ADR)

- Ports must expose **runtime mode**: mock | operator free-tier | customer key — UI never talks to providers (architecture §1).  
- Answer/citation contracts unchanged (architecture §4); mode is orthogonal chrome.  
- Failure signals needed: invalid key, quota class (**operator** vs **customer**), revoke/rotate effective, usage availability flag.  
- Fixtures: mock Ask + sample-vs-mine remain mandatory (architecture §9); add dual-mode failure fixtures.  
- No provider/host selection in this package.

### Designer (later — behavioural requirements)

- Consume REC-13–REC-19 as behaviour; do not invent customer findings.  
- Mode × corpus labelling system; cookbook chapter shell; compact usage strip; failure copy patterns.  
- Portfolio-scale only — no enterprise billing IA.

---

## 11. Evidence ID register (this file)

### Cited evidence

| ID | Claim (short) | Source | Date |
|----|---------------|--------|------|
| CITE-21 | ~30-day abuse-log retention accepted; no ZDR sales motion | `context.md` @user/Commander gate | 2026-09-14 |
| CITE-22 | API-key create → copy → manage/revoke (+ optional usage) is a common SaaS flow | saaswebsites.com API-key user-flow gallery | 2026-09-14 |
| CITE-23 | Write-only key UI, masked prefix, revoke, usage without plaintext leakage | DEV Community BYOK practitioner article | 2026-09-14 |

### Competitor observations / common practice

OBS-23 … OBS-27 (see §3).

### Hypotheses (unrun — not findings)

| ID | Hypothesis |
|----|------------|
| UT-15 | Mock-first cited Ask outperforms live-first key setup on time-to-first-value and ownership clarity |
| UT-16 | Explicit runtime × corpus labelling reduces false belief that mock = billed live AI |
| UT-17 | “Operator free-tier” wording beats generic “AI on” for payer comprehension |
| UT-18 | Silent fallback between operator quota and customer key is noticed and punished |
| UT-19 | Coarse usage near Ask improves continuation after quota warnings |
| UT-20 | Undisclaimed cost estimates harm trust when provider bills differ |
| UT-21 | Separating verify errors from Ask errors speeds successful reconnect |
| UT-22 | Honest solo/minimal workspace chrome beats fake enterprise team chrome for freelancer evaluators |

### Project recommendations introduced here

REC-13 … REC-19 — full text in [08-design-facing-recommendations.md](./08-design-facing-recommendations.md).

---

## What this file does **not** decide

- Which embedding/LLM/hosting vendors to use (`/researcher`, `/architect`).  
- How keys are stored or proxied (technical/security — not UX ownership).  
- Visual components or design system (`/designer`).  
- Closing the production AI activation gate (`@user` / Commander).  
- RTL locale support (deferred).  
- Any UT-* result (all unrun).
