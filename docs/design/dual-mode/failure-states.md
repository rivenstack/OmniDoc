# Dual-Mode — Failure States

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-16 (name the mode + what still works), REC-13 (mock
stays available), REC-17 (no silent fallback); UT-18, UT-21 (unrun).
**Architecture:** §4 answer states, §5.6 / §5.10 / §5.11 failure
taxonomy; §6 threat boundary.

**Job:** make every failure **legible and recoverable** — the user must
always know _which mode failed_, _why_, and _what still works_.

> **Rule:** every failure names the mode and states that **mock answers
> remain available** whenever only a live path failed (unless the whole
> product is down).

---

## 1. Failure taxonomy (UI-facing)

| Class                    | Example trigger                               | Treatment                          | Distinguishable from                         |
| ------------------------ | --------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| **Refusal (success)**    | `no_supported_answer`, `refused_policy`       | Neutral/info — **not** an error    | All transport errors                         |
| **No results (success)** | empty search                                  | Neutral                            | All errors                                   |
| **Transport error**      | `timeout`, `unavailable`                      | Danger + Retry                     | Refusal, no-results                          |
| **Quota error**          | `quota_exhausted` (operator **or** customer)  | Danger + mode-named + mock offered | Transport error (distinct copy + recovery)   |
| **Mode forbidden**       | `mode_forbidden`                              | Info + keep mock                   | Quota                                        |
| **Key error**            | `invalid_key`, `wrong_scope`, `vault_missing` | Danger + cookbook link             | Verify failure vs Ask failure                |
| **Validation**           | `unsupported_type`, `too_large`               | Danger + file-named                | Transport                                    |
| **Authz**                | `forbidden`, `unauthenticated`                | Neutral/generic access message     | Never leaks existence of other tenants' data |
| **Stream truncation**    | `partial` (stream)                            | Danger + Retry                     | Refusal (which withholds by design)          |

**Three visually distinct classes are mandatory** (QA 5.8): refusal,
no-results, transport error.

---

## 2. Failure copy template

Every live-mode failure follows:

```text
[Mode]      <which mode failed>
[What]      <what happened, in plain language>
[What works] <mock answers still work>  ← present unless product-wide outage
[Next]      <one primary recovery action>  (+ secondary)
```

Example (operator quota):

```text
Operator-funded demo quota reached
  The shared demo quota is used up for now. Live answers may pause
  until it resets.
  Mock answers keep working.
  [Continue in mock]  [Connect your own key →]
```

Example (customer key rejected at Ask time, key previously verified):

```text
Your key was rejected
  The provider rejected this key when answering — it worked earlier
  when you verified it.
  Mock answers keep working.
  [Open AI connections]  [Retry]
```

That last example deliberately exercises **UT-21**'s distinction:
verify succeeded, Ask failed — the copy must say so.

---

## 3. Failure catalogue

| #   | Failure                          | Mode           | Headline                                         | Body                                                  | Primary action              | Mock offered   |
| --- | -------------------------------- | -------------- | ------------------------------------------------ | ----------------------------------------------------- | --------------------------- | -------------- |
| F1  | `invalid_key` (verify)           | your key       | "This key was rejected."                         | Suggest re-paste; possible typo or wrong tool         | Re-paste                    | n/a (settings) |
| F2  | `wrong_scope`                    | your key       | "This key belongs to a different tool."          | Chapter mismatch callout                              | Open the right chapter      | n/a            |
| F3  | `vault_missing`                  | your key       | "No key is connected."                           | Mode needs a key                                      | Open cookbook               | ✅             |
| F4  | `quota_exhausted` (operator)     | operator demo  | "Operator-funded demo quota reached."            | Shared quota; may pause until reset                   | Continue in mock            | ✅             |
| F5  | `quota_exhausted` (customer)     | your key       | "Your provider quota or rate limit was hit."     | Wait, rotate, or check provider console               | Retry / Open provider docs  | ✅             |
| F6  | `mode_forbidden`                 | requested live | "Live mode isn't available yet."                 | Live modes are gated until the demo path is validated | Continue in mock            | ✅             |
| F7  | `unavailable` (provider down)    | any live       | "The answer service is temporarily unavailable." | Transient                                             | Retry                       | ✅             |
| F8  | `timeout`                        | any live       | "This took too long."                            | Transient                                             | Retry                       | ✅             |
| F9  | `partial` (stream truncated)     | any            | "Response stopped early."                        | Not a refusal — a transport truncation                | Retry                       | ✅             |
| F10 | `forbidden` on workspace switch  | —              | "You don't have access to that workspace."       | Generic                                               | Return to current workspace | n/a            |
| F11 | `unauthenticated`                | —              | "Your session expired."                          | Re-auth prompt; unsaved editor content warned         | Sign in again               | n/a            |
| F12 | `unsupported_type` / `too_large` | —              | "<File> can't be imported."                      | Reason + limit                                        | Choose another file         | n/a            |
| F13 | usage `unavailable`              | any            | "Usage not available from provider."             | **Not an error** — styled neutral/info                | —                           | n/a            |

**F13 is a styled empty, not a failure banner** (REC-15).

---

## 4. Silent-fallback prohibition (REC-16, §5.11)

- The UI must **never** silently switch between `operator_free_tier` and
  `customer_key`.
- If the product ever falls back, it is an **explicit, confirmed** mode
  change with a visible chip update and a polite status announcement —
  and it must be reflected in the usage strip's payer label.
- **UT-18** (hypothesis): users notice and punish silent payer
  fallback. Design treats it as a defect regardless of the run result.

---

## 5. Recovery affordances

| Failure                        | Primary                     | Secondary                        |
| ------------------------------ | --------------------------- | -------------------------------- |
| Quota (operator)               | Continue in mock            | Connect your own key             |
| Quota (customer)               | Retry                       | Open provider console (external) |
| Key invalid / wrong scope      | Open AI connections         | Continue in mock                 |
| Provider unavailable / timeout | Retry                       | Continue in mock                 |
| Stream truncated               | Retry                       | Copy partial answer              |
| Session expired                | Sign in again               | —                                |
| Workspace forbidden            | Return to current workspace | —                                |

All recovery actions are keyboard reachable, labelled, and never
hover-only (REC-11).

---

## 6. Presentation rules

- Failure banner sits **within the affected surface** (Ask card, cookbook
  chapter, import list) — never a full-page takeover for a scoped
  failure.
- Danger treatment is reserved for **errors**; refusals and honest
  "unavailable" usage use neutral/info (QA 5.3, REC-15).
- Every failure includes a **request/usage ID** (when available) rendered
  inside `<bdi>` and copyable — with no secrets.
- Error copy never echoes provider payloads verbatim (threat boundary §6:
  no secret leakage in error payloads).
- Reduced motion: any retry spinner has a static equivalent (QA 3.3).

---

## 7. Accessibility requirements (gate)

| #   | Requirement                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Failure text exposed as text + icon, never color-only (QA 2.5, 4.4)                                                    |
| 2   | Failures announced once when they appear (`role="alert"` for transport errors; polite status for mode changes)         |
| 3   | Focus moves to the failure's primary action or its heading predictably, and returns to the trigger on dismiss (QA 1.3) |
| 4   | Request IDs isolated (`<bdi>`) so AT does not reorder them (QA 6.5)                                                    |
| 5   | Recovery actions are labelled buttons/links, keyboard reachable (QA 1.1)                                               |
| 6   | No motion required to understand a failure (QA 3.1)                                                                    |

---

## 8. RTL-readiness notes

- Failure banner icon sits at `inline-start` via logical padding.
- Request/usage IDs and provider error codes wrapped in `<bdi>` (QA 6.5).
- Retry arrows are direction-neutral (circular), not mirrored chevrons.

---

## 9. Traceability

| Spec element                       | Evidence       | Port / architecture |
| ---------------------------------- | -------------- | ------------------- |
| Mode-named failure copy            | REC-16         | §5.6, §5.10, §5.11  |
| Mock remains available             | REC-13, REC-16 | §5.11               |
| Refusal ≠ error styling            | REC-10         | §4                  |
| Verify vs Ask distinction          | UT-21          | §5.9 vs §5.6        |
| No silent payer fallback           | REC-16, UT-18  | §5.11 invariant     |
| Usage unavailable as neutral empty | REC-15         | §5.10               |
| No secret in error payload         | —              | §6                  |
