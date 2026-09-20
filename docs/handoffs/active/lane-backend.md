---
handoff_id: H-2026-09-20-P1-B04
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-04"
lane: backend
human_owner: back-end-programmer
from: implementer
to: implementer
created: 2026-09-20
---

# B-04 — Notes CRUD + version concurrency

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-04 exactly. Implement the NotesPort JDBC adapter and the S-02 notes HTTP surface with optimistic version concurrency on top of the B-02 schema and B-03 membership binding. Do not implement B-05 ingestion, B-06 pgvector, S-03 mocks, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-04).

Implement notes create / read / list / update / soft-delete / purge
behind `NotesPort`, with **optimistic version concurrency** and
append-only `note_versions`. Every path binds tenant + membership
server-side using the B-03 `WorkspaceMembershipBinder`; the client
`workspaceId` stays a **selector** (`architecture.md` §2).

B-02 persistence/RLS and B-03 identity are **completed** and archived —
build on `omnidoc_app`, `TenantRlsSession`, and the session principal.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2 (tenancy), §5 notes surface, §10
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-04 row
5. ADR-0005 (`accepted`) — Spring Data JDBC for CRUD, `JdbcTemplate` for
   RLS-sensitive paths, Flyway, no Spring AI on the wire
6. ADR-0001 §2 — TipTap / ProseMirror JSON is the note body source of truth
7. S-02 notes paths in `docs/api/openapi.yaml` (consume; do not fork):
   `/api/v1/workspaces/{workspaceId}/notes`, `/api/v1/notes/{noteId}`,
   `.../soft-delete`, `.../purge`, and the `Note`, `NotePage`,
   `CreateNoteRequest`, `UpdateNoteRequest`, `ErrorBody` schemas
8. Archived B-03 —
   `docs/handoffs/archive/H-2026-09-20-P1-B03-implementer-implementer.md`
9. B-01 `NotesPort` / `NotesModels` in `apps/api`
10. `docs/memory/implementer.md`
11. This handoff

## Inputs / Evidence

- B-02: `notes` / `note_versions` tables, deferred `current_version_id`
  FK, tenant GUC `app.current_tenant_id`, FORCE RLS, roles
  `omnidoc_migrator` / `omnidoc_app`
- B-03: `WorkspaceMembershipBinder`, `SessionPrincipals`, `PortResults`,
  `PortFailures` (`PortFailure` → HTTP), `ErrorBody`, `csrf.spa()`,
  `TenantRlsSession.callWithinActorAndTenant`, profile gating via
  `IdentityProfiles.PERSISTENT_IDENTITY`
- B-01: `NotesPort`, `NotesModels` (`VersionToken`, `NoteFields`,
  `NotePage`, `PageRequest`), `Completion`, `CorpusOwnership`

## Allowed Write Paths

- `apps/api/**` (JDBC notes adapter, notes web package, Flyway migration
  only if B-04 needs additive columns/indexes, tests)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive under
  `docs/handoffs/archive/`

## Must Not Touch

- `packages/mocks/**` (S-03)
- `packages/contracts/**`, `docs/api/openapi.yaml`, `docs/api/ask-sse.md`
- `apps/web/**`, `packages/ui/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- Better Auth, Node `apps/api`, production OpenRouter

## Out of Scope

- Ingestion / chunking jobs and progress (B-05)
- pgvector + embeddings (B-06), lexical / hybrid search (B-07)
- Ask port and citation assembly (B-08)
- `sample` vs `mine` labelling as a retrieval concern (B-09) — B-04 only
  persists and returns the existing `corpus_ownership` field
- Vault / usage / mode adapters (B-10), export (B-11)
- Production AI activation

## Deliverables

1. **`JdbcNotesAdapter`** implementing `NotesPort` under
   `com.omnidoc.api.adapters.notes`, every statement inside a
   transaction with the tenant GUC bound on the same connection.
2. **Optimistic concurrency** — `UpdateNote.expectedVersion` must match
   the note's `current_version_id`; a mismatch returns
   `PortFailure.Code.CONFLICT` (HTTP 409, `ErrorBody.code = conflict`),
   never a silent overwrite. Concurrency must hold under two interleaved
   writers, not only sequentially.
3. **Append-only versions** — create and update both insert into
   `note_versions` and move `notes.current_version_id`; history is never
   mutated in place.
4. **Soft-delete vs purge** — soft-delete sets `soft_deleted_at` and
   removes the note from list/get immediately; purge removes the row and
   its versions within the bound tenant. Both return `Completion`.
5. **Notes HTTP surface** in `com.omnidoc.api.web.notes` matching the
   S-02 shapes, with the membership binder applied to both the path
   selector and the `OmniDoc-Workspace-Id` header selector, and
   `PortFailures` for the error envelope.
6. **Pagination** — `NotePage` with a stable, opaque `nextCursor`
   honouring `PageLimit` / `PageCursor`; the cursor must not leak another
   tenant's rows or act as an authority.
7. **Body handling** — ProseMirror JSON stored as `jsonb`; reject
   non-object bodies with `validation`. Never log note bodies or titles.
8. **Automated tests** with Testcontainers: CRUD round trip, version
   conflict, soft-delete/purge visibility, cross-tenant list and get
   count = 0, IDOR negative (session A + workspace/note B → 403), and the
   OmniDoc fixture values below.

## Required test fixtures

- Long note titles with mixed punctuation and nested quotes
- Fenced code blocks and inline `` `identifiers` `` inside the body JSON
- Inline URLs and file paths; Markdown tables
- Mixed-case technical tokens (`pgvector`, `BYOK`, `OpenAI`)
- Very long unbroken strings (tokens, base64-like fragments)
- Empty list state and error states
- Cross-tenant retrieval count = 0; IDOR negatives (user A session +
  user B workspace/note selector → 403)

## Constraints / Prohibited Decisions

- Do not treat client `tenant_id` / `workspaceId` / cursor as authority
- Do not disable RLS, grant `BYPASSRLS` to `omnidoc_app`, or bypass
  `TenantRlsSession`
- Do not introduce Spring AI types into `com.omnidoc.api.web..`
- Do not fork the OpenAPI contract from Java; escalate conflicts instead
- Do not break the default (non-`local`) profile: anything needing a
  DataSource stays profile-gated, health and ArchUnit stay green
- Do not claim production AI or RTL locale closed

## Acceptance Criteria

- Notes create/get/list/update/soft-delete/purge match the S-02 shapes
- Version mismatch → 409 `conflict`; matching version → 200 with a new
  `versionId`
- Membership resolution is server-side; wrong selector → 403
- Cross-tenant reads return zero rows with RLS as defence in depth
- `cd apps/api && ./gradlew clean build` PASS including the new tests
- Default (non-`local`) profile still boots health/ArchUnit without a DB
- No changes outside Allowed Write Paths

## Stop / escalate conditions

- Soft-stop: S-02 notes/pagination detail conflict, or a need to change
  `docs/api/openapi.yaml` — escalate to Commander with evidence; do not
  silently fork the contract
- Soft-stop: B-05/B-06 coupling appears unavoidable — record it and stop
  rather than widening the slice
- Hard-stop: pressure to disable RLS, use Better Auth, or activate live
  OpenRouter — stop and escalate

## Dependencies / Risks

- Depends on: B-02 (done), B-03 (done), S-02 (done)
- Blocks: B-05, B-07, B-08, B-09, B-11, B-12
- Parallel: F-02 (frontend) — no write overlap
- Risk: deferred `notes_current_version_fk` requires note + first version
  in one transaction
- Risk: cursor design leaking ordering across tenants if not tenant-bound

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Year-1 SSO not required

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B04-implementer-implementer.md`
   (or dated equivalent).
3. Same-lane next slice: rewrite this file to **B-05** (ingestion /
   chunking jobs + progress port) **or** set `status: blocked` with
   Outcome `waiting on <ID>` if S-03 should interleave — do **not** edit
   `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.
