---
handoff_id: H-2026-10-12-P1-F07-RETURN
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "F-07"
lane: frontend
human_owner: front-end-programmer
from: implementer
to: commander
created: 2026-10-12
updated: 2026-10-12
branch: F07-ask
blocked_on: "B-08 has not landed (live ask smoke is a pending cross-lane check) plus the @user visual/mobile pass on the frontend journeys"
---

# Frontend lane — F-07 returned to Commander

**F-07 (Ask UI) is built and verified; the lane is soft-stopped, not
re-sequenced.** The ticket is archived with full evidence at
[`docs/handoffs/archive/H-2026-10-12-P1-F07-commander-implementer.md`](../archive/H-2026-10-12-P1-F07-commander-implementer.md)
— **read its Outcome section first**; it carries what landed, the `@user` look
decisions, the acceptance evidence, and what was handed on.

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer.
**Branch:** `F07-ask` (not merged to `develop`).

## Start Command

```text
/commander Read docs/handoffs/active/lane-frontend.md and unblock the frontend lane. F-07 Ask UI is built and verified on branch F07-ask; the lane is soft-stopped because the live ask smoke needs B-08 (not landed) and the @user visual/mobile pass is still open. Decide the next frontend slice and record the cross-lane dependency.
```

## Why the lane is blocked, not re-sequenced

1. **The live ask smoke needs B-08.** The ticket's own acceptance rule: if B-08's
   ask endpoint is not on the local Java API, record the live smoke as a pending
   cross-lane check and soft-stop. `apps/api` has **no** ask controller and the
   backend lane head is still `status: ready`, so B-08 has not landed. The
   maintainer self-check used a **throwaway stub API in `/tmp` (removed)** — it
   verifies the frontend wiring end to end, but it is **not** the Java API and
   live verification is explicitly **not** claimed.
2. **The `@user` visual/mobile pass is open** (no browser in the implementer
   session): `/ask` light/dark, focus rings, the streaming motion, and ~390px.
   The same pass is also still open on `/search` (F-06).
3. **Everything downstream of F-07 depends on it or on a Commander decision.**
   F-08 (dual-mode chrome) depends on F-07; F-09 (labelled sample workspace)
   depends on F-07 + S-03 + B-09; F-11 (Playwright + axe journeys) depends on
   F-04–F-09 **and** the still-unauthorized `web → mocks` import exception. The
   ticket forbade the implementer from opening F-08/F-09/F-10/F-11, F-15 or
   Phase Check.
4. **F-15 stays deferred** (`listed`) and its implementation phases must not
   start from this head.
5. **Collections stays recorded, not scheduled** — `BL-26` (`proposed`) in
   [`../../planning/feature-backlog.md`](../../planning/feature-backlog.md);
   S-02 still has no `collections`/`tags` operation.

## Open items for Commander / `@user`

| Item | Owner | Note |
| --- | --- | --- |
| **Live ask smoke (pending cross-lane)** | Commander / backend | Re-run the F-06-style live smoke (temporary actor/workspace/notes fixture, removed afterwards) **once B-08 lands**. The frontend proxy + port are ready for it unchanged. |
| **Visual/mobile pass on `/ask`** | `@user` | No browser in the implementer session. Open `/ask` signed in, ask a question, watch the stream, Stop mid-answer, expand a citation; report what looks off at desktop and ~390px. Light/dark, focus rings and motion are **not** visually verified. |
| **Visual/mobile pass on `/search` (F-06)** | `@user` | Still open from F-06. |
| **Passage-open (anchor navigation)** | Commander | F-07's own soft-stop: citations link to the note and carry the anchor, but opening the *passage* needs the note reader to accept an anchor — out of the F-07 ticket. Decide whether to schedule it; do not fake it. |
| **Ask corpus filter (Sample/Mine)** | Commander | `corpusOwnership` is wired through the port/proxy (contract-faithful) but no control was added — not in F-07's deliverables; belongs with F-08 / `ui-qa-checklist.md` §9.2. |
| Next frontend slice (F-08?) | Commander | F-08 depends on F-07 (now built) + S-02 vault/usage/mode metadata only. |
| Launch check | Commander | Deferred `partial` (unsupported spans) vs `truncated` (cut stream) is wired and tested; §5.4's *inline* unsupported-span marking needs the server to say which span is unsupported, which the frozen contract does not carry. Escalate rather than invent it. |
| `web → mocks` import exception | Commander / `@user` | Still unauthorized; needed before in-app MSW/F-11. |
| `apps/web` vitest cannot resolve `@omnidoc/contracts` **values** | Commander / backend | The `web` suite is Node-only and has no tsconfig-paths plugin, so app lib code must import contract **types only**; runtime tables (`ASK_SUCCESS_OUTCOMES`, `TERMINAL_ASK_SSE_EVENTS`) are re-derived with `Record<…>` completeness guards. Adding a paths alias to `apps/web/vitest.config.ts` would lift this — a config change outside F-07's write paths. |

## Reading for whoever takes the next slice

1. `context.md` — live status lines for F-07
2. [`docs/handoffs/archive/H-2026-10-12-P1-F07-commander-implementer.md`](../archive/H-2026-10-12-P1-F07-commander-implementer.md) — the F-07 Outcome and evidence
3. `docs/design/now.md` — the 2026-10-12 look decisions
4. `docs/design/system-ux.md` §2 and `docs/api/ask-sse.md` — the contracts F-07 honours
5. `docs/memory/implementer.md` — the F-07 durable lessons
