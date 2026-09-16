# Dual-Mode — Cookbook / Wizard (BYOK)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-14, REC-19; OBS-23–OBS-27; CITE-22, CITE-23; UT-21
(unrun).
**Architecture:** §5.9 credential vault (metadata only in UI), §5.11
mode; ADR-0004.

**Job:** let a user connect their own provider key **safely and
honestly**: create elsewhere → paste → verify → first Ask → manage.
OmniDoc never mints keys and never shows a full key after save.

> The cookbook is a **settings/help surface**, not a trust-boundary
> bypass. It is a chapter index that grows, not a mega-wizard that is
> rewritten per tool.

---

## 1. Placement and entry points

| Entry                                           | Surface                                 |
| ----------------------------------------------- | --------------------------------------- |
| Settings → **AI connections**                   | Primary home                            |
| Mode details popover → "Learn about live modes" | Landing on the chapter index            |
| Usage strip → "Manage AI connections"           | Direct link                             |
| Failure copy → "Open cookbook"                  | From invalid-key / wrong-scope failures |

The 60-second portfolio script may **show the chapter list** but must
**not** force key entry (REC-12, REC-13).

---

## 2. Chapter index (grow-as-tools-added — REC-14)

```text
AI connections
─────────────────────────────────────────────────────────────
Why connect your own key?
  • Sustained use beyond the operator demo
  • Your own provider account and quota
  OmniDoc never creates provider keys for you.

Chapters
┌───────────────────────────────────────────────────────────┐
│ [icon] Connect <tool A>          Not connected   [Start]  │
│ [icon] Connect <tool B>          Connected  •···4f9c      │
│ [icon] Connect <tool C>          Coming soon              │
└───────────────────────────────────────────────────────────┘

[Back to Ask]
```

Rules:

- Each chapter is the **same shell** with tool-specific content
  (create-elsewhere steps, field semantics, verify probe meaning, failure
  copy). Adding a tool adds a row + content; it does **not** redesign the
  shell.
- "Coming soon" chapters are honest placeholders, not disabled unlock
  theatre.
- No provider names are invented by design; the Implementer supplies real
  chapter data from `docs/api/` when available.

---

## 3. Chapter flow (create elsewhere → paste → verify → first Ask)

### Step 0 — Why (context)

Short "when to use your key" copy. No enterprise procurement language.

### Step 1 — Create elsewhere (external)

- Numbered, copyable external steps + deep link to the provider console.
- **OmniDoc does not mint the key** — stated explicitly.
- External URL is isolated with `<bdi>` (QA 6.5) and opens in a new
  context with an accessible label.

### Step 2 — Paste

```text
┌───────────────────────────────────────────────────────────┐
│ Label (optional)  [ e.g. "Work account"                 ] │
│ API key           [ •••••••••••••••••••••••••••••       ] │
│                   Password-style field · no echo         │
│                   [Show] (reveals only while focused)     │
│                                                           │
│ [Verify]   [Cancel]                                       │
└───────────────────────────────────────────────────────────┘
```

- Field is `type="password"` with an explicit Show/Hide toggle that
  auto-hides on blur.
- **Never** log, mirror to a status region, or autocomplete the key.
- No copy-to-clipboard of the key from the UI after pasting.

### Step 3 — Verify (distinct from Ask)

| Result        | Copy                                                   | Focus                                                         |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `ok`          | "Key verified."                                        | Moves to a **status** region; the Save action becomes primary |
| `invalid_key` | "This key was rejected." + retry guidance              | Status region; field stays editable                           |
| `wrong_scope` | "This key belongs to a different tool." + chapter hint | Status region                                                 |
| `unavailable` | "Couldn't reach the provider to verify. Try again."    | Status region                                                 |

- Verify is **not** Ask: a verified key is not proof the first Ask will
  succeed (UT-21 hypothesis — copy must distinguish the two).
- Verify result is announced as a **polite status** containing **no key
  characters** (REC-19).

### Step 4 — Save (write-once display)

```text
Connected · <tool A>
Key: sk-···4f9c        (masked prefix only)
Added <date>  ·  Last verified <date>
[Rotate]  [Revoke]  [Test again]
```

- After save, the full key is **never** shown again; re-entry means
  replace.
- Masked prefix is isolated with `<bdi>` (QA 6.5, REC-19).

### Step 5 — First Ask (guided)

- "Try Ask now" opens Ask with mode = **Live · your key** and the mode
  chip already updated.
- The answer is **not** auto-saved to the corpus (REC-06).
- If the first Ask fails, the failure copy names the mode and distinguishes
  itself from the verify result (`failure-states.md`).

### Step 6 — Manage (rotate / revoke)

| Action          | Spec                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotate          | Opens the paste step again; on success, re-verify is required before live Ask resumes                                                       |
| Revoke          | Confirm dialog ("Live asks on this key will stop. Mock answers still work."); immediate effect; in-flight requests may finish once (OBS-27) |
| Re-verify       | "Test again" re-runs the verify probe without re-entering the key                                                                           |
| Delete metadata | Removes the vault record; results in "Not connected"                                                                                        |

---

## 4. States

| State                     | Copy                                                                      | Treatment             |
| ------------------------- | ------------------------------------------------------------------------- | --------------------- |
| No chapters connected     | Empty list + "Why connect your own key?" section                          | Neutral               |
| Verifying                 | "Verifying…" (static under reduced motion)                                | Status                |
| Verified                  | "Key verified."                                                           | Success (icon + text) |
| Connect failed            | Mode-named copy (see `failure-states.md`)                                 | Danger                |
| Key valid but Ask failing | Separate Ask-surface failure; chapter shows "Connected — last Ask failed" | Warning               |
| Revoked                   | "Key removed. Live asks on your key have stopped."                        | Neutral               |
| Provider unavailable      | "Couldn't reach the provider." + Retry                                    | Danger, retryable     |

---

## 5. Accessibility requirements (gate — REC-19)

| #   | Requirement                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------- |
| 1   | Full keyboard path: open chapter → paste → verify → first Ask → revoke, without a mouse (REC-19)         |
| 2   | Key field has a visible label; Show/Hide is a labelled toggle with `aria-pressed`                        |
| 3   | Verify result focus moves to a predictable status region (REC-19); never steals focus into Ask streaming |
| 4   | `aria-live` payloads contain **no key characters or secrets**                                            |
| 5   | Masked prefixes / URLs / usage IDs wrapped in `<bdi>` (QA 6.5)                                           |
| 6   | No shimmer required to convey verifying; reduced-motion safe (QA 3.3)                                    |
| 7   | External links open predictably and are labelled (not "click here")                                      |
| 8   | Revoke/rotate are labelled buttons, not icon-only                                                        |

---

## 6. Security-adjacent UI rules (not architecture)

- The UI sends the key **once** over the port; it never persists it in
  client state, `localStorage`, URL, or telemetry.
- No error payload may echo key material; UI must render provider errors
  as generic messages + a request ID (isolated with `<bdi>`).
- `verify` success never renders a "half-connected" badge in any other
  surface (REC-16).
- The cookbook never claims ZDR or retention guarantees beyond accepted
  policy (REC-17, CITE-21).

---

## 7. RTL-readiness notes

- Numbered external steps use logical markers (`padding-inline-start`),
  not physical indentation.
- Step progress indicator is direction-neutral (segments, not arrows).
- URLs and masked prefixes isolated with `<bdi>` (QA 6.5).
- No mirrored lock/key icons that would invert meaning.

---

## 8. Traceability

| Spec element                     | Evidence                | Port / architecture |
| -------------------------------- | ----------------------- | ------------------- |
| Chapter index, grow-as-added     | REC-14, OBS-23          | —                   |
| Create-elsewhere step            | REC-14, OBS-24, CITE-22 | —                   |
| Write-once masked prefix         | OBS-25, CITE-23         | §5.9                |
| Verify before Ask                | OBS-26, REC-14          | §5.9 `verify`       |
| Rotate / revoke                  | OBS-27, REC-16          | §5.9                |
| No key in UI/status after save   | REC-19                  | §5.9 invariant      |
| Cookbook not a trust bypass      | handoff constraint      | §1 boundary         |
| Verify vs Ask distinguishability | UT-21                   | §5.9, §5.6 failures |
