# Copilot Instructions — OmniDoc

**Authority:** `.github/copilot-instructions.md` is the authoritative
copy (GitHub Copilot loads repository custom instructions from that
path).
**Mirror:** Root `copilot-instructions.md` must remain **byte-identical**
to the authoritative file. Edit `.github/copilot-instructions.md` first,
then copy it to the root mirror. Do not edit the root copy alone.

Use this file as GitHub Copilot / Copilot Chat **custom instructions**
(or paste into session context when the host does not auto-load
`.github/copilot-instructions.md`). It optimizes Copilot for the same
agentic flow Cursor uses: context → architecture → agents → handoffs →
memory.

Per-role custom agents for Copilot's agent picker live in
`.github/agents/*.agent.md`. Cursor project agents live in
`.cursor/agents/`.

## Repository landmarks (Phase 0 — do not overstate)

- `architecture.md` — OmniDoc architecture baseline (rewritten; not a
  template starter). Still an architecture-ready draft pending Phase
  Check + `@user` acceptance of ADR-0001 where marked. Do not invent ADRs.
- `docs/adr/` — ADR index exists; `ADR-0001-frontend-and-platform-stack.md`
  is **`proposed`**, not accepted. No vendor/stack is chosen until
  `@user` accepts.
- `docs/research/technical/` — Wave B technical evidence (inputs to ADR)
- `docs/research/ux/` — Wave B UX / journey / citation-trust evidence
- `docs/frontend/README.md` — frontend contributor entry point
  (stack-agnostic until ADR-0001 acceptance)
- `docs/reviews/phase-0-verification.md` — Phase 0 independent verification
- `quality/ui-qa-checklist.md` — UI QA checklist

Research evidence is not an architecture decision. Proposed ADRs are not
accepted ADRs.

## Session bootstrap (load order)

At the start of every meaningful session, read in this order:

1. `context.md` — live phase, task status, blockers, active handoff path
2. `architecture.md` — boundaries and invariants (do not invent ADRs)
3. `AGENTS.md` — roster, CX-first, extension-first, ownership rules
4. `docs/handoffs/current.md` — the only main-track assignment
5. `MEMORY.md` + `docs/memory/<your-role>.md` — supporting lessons only
6. Task-named evidence files listed in the handoff

If `docs/handoffs/current.md` `to:` does not match the role you are
playing, stop and tell the user. Do not silently reassign work.

## Context handling / file prioritization

**Always prefer (high signal):**

- `context.md`, `docs/handoffs/current.md`, `architecture.md`, `AGENTS.md`
- **Accepted** ADRs under `docs/adr/` when the handoff cites them
  (treat `proposed` ADRs as decision packages awaiting `@user`, not as
  closed vendor choices)
- Role memory under `docs/memory/` for the active role only

**Load on demand (medium):**

- `AGENTS-GUIDE.md`, `CURSOR-SETUP.md`, `docs/handoffs/README.md`
- `docs/frontend/README.md` when doing frontend contributor guidance
- `docs/research/technical/` or `docs/research/ux/` when the handoff
  cites them
- `docs/reviews/` and `quality/ui-qa-checklist.md` when verifying or
  reviewing UI
- Handoff-named design/research/implementation docs only

**Avoid dumping into context (low / noisy):**

- Entire design-system dumps when a section is named
- Full `docs/handoffs/archive/` history
- Large binary/reference image packs
- Unrelated packages or generated artifacts

When a handoff names a section, read that section — do not @-attach the
entire large document.

## Role routing (emulate Cursor subagents)

Copilot does not register `.cursor/agents/` as slash agents. Emulate one
role per turn by reading the matching contract and stating the role.
Prefer `.github/agents/*.agent.md` when using Copilot's agent picker.

| Role | Contract file | Invoke as |
|------|---------------|-----------|
| Commander | `.cursor/agents/commander.md` | `/commander` |
| Architect | `.cursor/agents/architect.md` | `/architect` |
| Researcher | `.cursor/agents/researcher.md` | `/researcher` |
| UX Researcher | `.cursor/agents/ux_researcher.agent.md` | `/ux_researcher` |
| Designer | `.cursor/agents/designer.agent.md` | `/designer` |
| Implementer | `.cursor/agents/implementer.md` | `/implementer` |
| Phase Check | `.cursor/agents/phase-check.md` | `/phase-check` |

Canonical prose label for UX Researcher is `/ux-researcher`; executable
id is `ux_researcher`.

**Routing rules:**

- Uncertain product/extension/vendor claims → Researcher
- Customer behavior, journeys, trust/citation UX → UX Researcher
- System boundaries / ADRs → Architect
- Visual/interaction specs → Designer (after accepted UX + architecture)
- Construction → Implementer (after approved boundaries)
- Independent verification → Phase Check
- Phase plan / accept-return / multi-agent routing → Commander
- Legal, commercial, unresolved tradeoffs → `@user`

Exactly **one** primary owner per handoff. `Researcher + UX Researcher`
means two streams, not co-ownership.

## Handoff protocol (mandatory)

Follow `docs/handoffs/README.md`.

Before ending a task:

1. Archive the consumed `docs/handoffs/current.md` (or update the
   parallel file under `active/`)
2. Write the next complete handoff with YAML frontmatter and body
   sections (start command, objective, reading, deliverables,
   constraints, acceptance, gates, risks)
3. Update `context.md` with concise status + handoff path (main track
   only unless authorized)
4. Do not leave the next assignment only in chat

Invalid: “handing off to implementer” with no Markdown file.

## Memory protocol

- Memory is supporting context, never authority over user instruction,
  ADRs, `context.md`, or the active handoff
- Store durable lessons only; never copy full task status into memory
- Shared: `MEMORY.md` · Role: `docs/memory/<agent>.md`

## Model selection guidance (Copilot)

Guidance is host-dependent; prefer:

- **Planning / routing / accept-return:** a strong reasoning model
  (Commander, Phase Check reviews)
- **Long implementation or design edits:** a model with large usable
  context and lower rate-limit friction for multi-file work
- **Narrow Q&A / small edits:** faster / cheaper model is fine

Practical rules:

- Keep one role per chat when context is large
- Prefer handoff-scoped reads over attaching whole design systems
- If rate-limited, split work: plan in one session, implement in another
  with the same handoff file as the contract

## Directionality / accessibility summary

On every relevant task, include acceptance checks for:

- Primary locale `en` (LTR) — the only locale in Phase 0
- RTL / mixed-BiDi support is **deferred, not closed**
- RTL-readiness discipline: logical CSS, locale-driven `lang`/`dir`,
  `bdi`/isolation for identifiers/code/URLs, no physical-direction JS
- Accessibility: focus order, keyboard, labels, reduced motion, contrast
- Narrow viewport (~390) behavior

Do not claim RTL locale support while it remains deferred. Accessibility
and RTL-readiness are release gates, not cosmetic passes.

## Extension-first summary

For standard platform capabilities:

1. Evaluate native behavior and mature extensions with current evidence
2. Require fit against project-owned ports and architecture
3. Preserve security, RTL-readiness, accessibility, upgrade safety,
   lock-in, tenant isolation, and production gates
4. Do not let an extension bypass Architect boundaries or Phase Check

Popularity alone is insufficient.

## Customer-experience-first summary

Validate premium customer journeys (capture, organize, retrieve,
ask-your-notes, citation trust, mobile) with realistic mocks before
production AI/provider activation. Production gates stay separate from
mock-ready implementation. Commerce/payment/shipping are out of scope.

## How to use this with Copilot

1. Confirm Copilot loads the authoritative
   `.github/copilot-instructions.md`, then keep the root mirror
   byte-identical (edit authority first, copy to mirror).
2. Open `docs/handoffs/current.md` (or the assigned `active/` file) and
   run its Start Command, naming the role explicitly, e.g.:

```text
You are /commander. Read docs/handoffs/current.md and execute it exactly.
Update required files, context.md, and the next persistent handoff before finishing.
```

3. For design/implementation visual work, consider Figma / motion / asset
   MCPs when available; if unauthenticated or missing, continue with
   repo-native tools. MCP output never closes architecture gates or
   Phase Check.
4. Never store tokens in repo JSON or Markdown.

## Prohibited defaults

- Selecting vendors/plugins without Researcher evidence + Architect fit
- Treating a `proposed` ADR as an accepted stack/vendor choice
- Closing open legal/provider gates without `@user`
- Dual-owning one handoff
- Treating visual preference as validated customer behavior
- Chat-only handoffs
- Committing secrets
- Reintroducing WordPress/WooCommerce/commerce assumptions
