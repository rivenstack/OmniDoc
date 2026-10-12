---
handoff_id: H-2026-10-12-P1-B08P-ARCH
affinity: architecture
track: parallel
status: ready
phase: "1"
task: "B-08p"
lane: backend
human_owner: back-end-programmer
from: commander
to: architect
created: 2026-10-12
updated: 2026-10-12
---

# B-08p — Full live pipeline checkpoint before B-09: Architect gate

## Start Command

```text
/architect Read docs/handoffs/active/lane-backend.md and execute B-08p exactly. Record the local/demo AvalAI embedding-through-app gate, then hand the same lane to Implementer for the full API checkpoint. Do not open B-09.
```

## Objective

Owner: `/architect`; allowed_task_classes: `B-08p checkpoint architecture and gate records only`.
Define the server-enforced exception that lets a running local/demo app
complete import → chunk → AvalAI `text-embedding-v4`/1024 → isolated
retrieval → AvalAI `qwen3.5-plus` Ask → openable citations on approved
synthetic or rights-cleared public notes. Then return a bounded
Implementer handoff on this same backend lane.

## Required Reading

`context.md`, `architecture.md`, `AGENTS.md`, this head,
`docs/handoffs/current.md`, `docs/planning/implementation-tracks.md`,
ADR-0004, `docs/quality/b08-ask-verification.md`,
`docs/quality/b06d-avalai-fixture-probe.md`,
`docs/research/technical/18-b08-avalai-ask-model.md`, and frozen S-02
OpenAPI/Ask SSE operations.

## Inputs / Evidence

Commander accepted B-08 on 2026-10-12: **164/164** backend tests pass;
the frozen S1–S6 matrix passed through the app API with current,
authorized, openable citations and no prompt-injection instruction
followed. The User API reconciled **26** successful synthetic
Researcher/B-08 transactions at **$0.01247960**; the external shared
ledger has **27** of 50 reservations used (one failed Qwen Max request
has no listed charge). B-08p has at most **$4.98752040** actual spend
and **23** ledger calls remaining. Do not reset the ledger.

The operator added an Alibaba API package containing `text-embedding-v4`
and `qwen3.5-plus`; it expires 2026-10-13T13:43:30Z. Top-level balance
fields are zero while package and grant sources have credit. Check
current eligibility, model scope, expiry and transactions before live
calls. The B-06d embedder is a test-source probe. Production
`EmbeddingPort`, hybrid search and ingestion still use 16-dimensional
mock embeddings. B-08 Ask uses lexical evidence today. The complete
live pipeline has **not** yet been implemented or tested.

## Deliverables

1. Amend ADR-0004 and, only if needed, `architecture.md` with a new
   **B-08p** local/demo exception. Distinguish it from expired B-06d
   fixture-only probe and accepted B-08 Ask.
2. Specify a server-owned pre-import corpus approval mechanism, such
   as a fixed SHA-256 manifest of synthetic/public files, because new
   note IDs do not exist before import. Bind it to exact demo tenant,
   workspace and local profile. Define how resulting IDs join the
   B-08 Ask allowlist. A client-supplied mode or workspace is not an
   egress authorization.
3. Define `EmbeddingPort` dispatch and `RuntimeModePort` policy for
   `operator_free_tier` EMBED, exact `text-embedding-v4`/1024 response
   checks, outbound stamps, token/batch/time limits, retries, failure
   states and shared account/ledger accounting. Default/CI stay mock;
   `customer_key` and customer-facing deployment stay dark. No fallback.
4. Define how frozen `POST /api/v1/search/hybrid` and Ask select the
   matching live query model in demo scope without adding provider
   types or credentials to public contracts. Ask must use evidence
   from live retrieval, not lexical-only retrieval beside a probe.
   Preserve tenant/ACL/RLS, deletion/current-version checks and exact
   `(embedding_model_id, dimensions)` filtering. V5 has one vector per
   chunk, so use a separate disposable live database.
5. Archive this Architect head before replacing the stable backend
   head with one Implementer-owned B-08p handoff. Its verification
   deliverable is `docs/quality/b08p-live-pipeline-checkpoint.md`
   with exact executable API/database commands and observed results.

## Operator API path to complete

The Implementer runbook must use these frozen endpoints in order on a
disposable database with a synthetic baseline. Fill exact gate variables
and response assertions after Architect's decision:

```bash
curl -fsS http://localhost:8080/actuator/health
curl -fsS -c "$B08P_COOKIES" -b "$B08P_COOKIES" \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct horse battery staple"}' \
  http://localhost:8080/api/v1/session
curl -fsS -b "$B08P_COOKIES" -H "X-XSRF-TOKEN: $B08P_CSRF" \
  -H 'OmniDoc-Workspace-Id: ws-a' \
  -F "file=@$B08P_APPROVED_MD;type=text/markdown" \
  http://localhost:8080/api/v1/ingestion-jobs
# Poll GET /api/v1/ingestion-jobs/{jobId} until ready, then list IDs:
curl -fsS -b "$B08P_COOKIES" -H 'OmniDoc-Workspace-Id: ws-a' \
  'http://localhost:8080/api/v1/workspaces/ws-a/notes?limit=20'
curl -fsS -b "$B08P_COOKIES" -H "X-XSRF-TOKEN: $B08P_CSRF" \
  -H 'OmniDoc-Workspace-Id: ws-a' -H 'Content-Type: application/json' \
  -d '{"query":"launch review","topK":5}' \
  http://localhost:8080/api/v1/search/hybrid
curl -fsSN -b "$B08P_COOKIES" -H "X-XSRF-TOKEN: $B08P_CSRF" \
  -H 'OmniDoc-Workspace-Id: ws-a' -H 'Content-Type: application/json' \
  -d '{"question":"When is the launch review?","mode":"operator_free_tier"}' \
  http://localhost:8080/api/v1/ask
curl -fsS -b "$B08P_COOKIES" -H 'OmniDoc-Workspace-Id: ws-a' \
  "http://localhost:8080/api/v1/notes/$B08P_CITED_NOTE_ID"
```

The final runbook must also show `sha256sum` of every approved file,
`SELECT` of current chunks and embeddings with exact model/dimension,
model-isolated retrieval, another-tenant/workspace and deleted-note
negatives, SSE terminal/citation assertions, request IDs, User API
transaction lookup, measured total charge and stop commands. Account
checks use the existing 0600 external key under
`~/.config/omnidoc-secrets`; never paste it or private note text into
chat/logs. State every human step and expected observation. Public
notes are optional and need recorded source URL and usage terms;
synthetic notes are the reliable baseline.

## Allowed Write Paths

- `docs/adr/ADR-0004-dual-mode-byok-and-usage.md`
- `architecture.md` (B-08p boundary only, if needed)
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/quality/b08p-live-pipeline-checkpoint.md` (gate outline only)

## Out of Scope / Must Not Touch

`apps/web/**`, `packages/ui/**`, `docs/handoffs/active/lane-frontend.md`,
backend code under Architect ownership, B-09/B-12, customer notes,
customer-facing provider activation and BYOK/vault. The user's future
Gemini top-up is a separate explicit-model decision; do not include it
in this Alibaba checkpoint or enable fallback. Record that it can be
evaluated later through the same gates.

## Constraints / Prohibited Decisions

One owner at a time. Preserve frozen S-02 shapes and
`mock | operator_free_tier | customer_key` exactly. Do not treat a
standalone B-06d probe as proof of the application pipeline. Do not
reset the shared ledger or exceed $5 actual total.

## Acceptance Criteria

Architect records GO/GO_WITH_CONDITIONS/NO_GO with concrete egress
approval, model/dimension/query isolation, failure and budget policy.
On GO, a single Implementer handoff makes the complete API checkpoint
executable before B-09. The checkpoint passes only when an approved
import yields 1024-dimensional vectors, matching-model retrieval,
grounded Ask and openable current citations, with zero tenant,
workspace or deletion leaks and reconciled spend under the cap.

## Stop / Escalate Conditions

Stop on model/dimension mismatch, unauthorized egress, wrong-scope
hit, unknown charge, expired/ineligible credit, insufficient budget,
or frozen S-02 change. Return to Commander for cross-lane dependency
or material ADR reversal. A future Gemini option requires its own
model evidence and explicit configuration gate.

## Dependencies / Risks

The Alibaba package is time-limited. The user controls account/key.
V5's one-vector-per-chunk schema requires a distinct disposable
provider database from the mock baseline.

## Gates

B-08 is PASS. B-08p is **open, not implemented or passed**. B-09 stays
closed until the full API checkpoint passes.

## Completion Instructions

On GO, archive this Architect head, rewrite this stable backend head
for `/implementer` with exact code/quality write paths, then have
Implementer run the API matrix and return to Commander for checkpoint
validation. Keep frontend lane and Commander index ownership unchanged.
