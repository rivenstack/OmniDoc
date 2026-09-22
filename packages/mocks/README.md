# @omnidoc/mocks — S-03 corpus

The single deterministic fixture authority for OmniDoc mock journeys. Backend
produces this package; frontend and Storybook consume it. Do not copy fixtures
into `apps/web`. Version: `s-03-v1`. Fixture IDs and UTC timestamps are stable.

Contracts come from `@omnidoc/contracts`; the HTTP source of truth remains
[`docs/api/openapi.yaml`](../../docs/api/openapi.yaml), with SSE framing in
[`docs/api/ask-sse.md`](../../docs/api/ask-sse.md). No contracts are generated here.
MSW is pinned to **2.15.0 in this package only**.

## Package API

```ts
import { createMockEnvironment, askQuestions } from "@omnidoc/mocks";

const mock = createMockEnvironment({
  scenario: "personal", // default
  baseUrl: "http://localhost:8080", // default; exact API origin, no wildcard
});

mock.handlers; // pass to MSW setupServer/setupWorker
mock.reset(); // original scenario, IDs, session, notes, modes, job state
mock.advanceProgress(); // pending → running → ready; capped; no polling side effects
mock.releaseResponses(); // release the loading scenario's held HTTP responses
mock.getSessionHeaders(); // Node-only bootstrap Cookie + X-XSRF-TOKEN headers
askQuestions.supported; // documented deterministic question, not a special HTTP field
```

Each factory owns its state. Replay the same request sequence after `reset()` to
obtain identical response bodies and SSE bytes. Reset cancels held requests so
old writes cannot mutate the new corpus. No current clock, randomness, arbitrary
sleep, external fetch, provider SDK, or database is used. Cancel client requests
when changing stories; stop MSW and clear mock cookies between environments.

Exported seeds (`notes`, `chunks`, `workspaces`, `identities`, `jobSteps`,
`vaultSeed`, `scenarios`) are deeply frozen. Other exports include `fixedNow`,
`mockCorpusVersion`, `askQuestions`, `searchRankings`, `richTextMarkdown`,
`longToken`, and `serializeAskEvents`. Wire shapes are imported from contracts;
scenario metadata is package configuration and is never added to HTTP payloads.

## Scenarios and themes

Canonical requirements: [architecture §9](../../architecture.md#9-mock-corpus-and-deterministic-fixtures).

| Scenario / fixture                           | Journey or state                                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `personal`                                   | Authenticated Alex; `ws_mine` and `ws_empty`; notes and cited Ask                                                     |
| `signed_out`                                 | Sign-in, wrong credentials, logout, membership-bound workspace selection                                              |
| `sample`                                     | Preauthenticated guest; read-only `ws_sample`; explicit sample labels                                                 |
| `empty`                                      | Alex session; select `ws_empty` for empty list/search/Ask                                                             |
| `loading`                                    | Hold responses until `releaseResponses()`; abort/reset releases pending work safely                                   |
| `indexing`                                   | Static `job_mine_import`, advanced only through the package API                                                       |
| `indexing_failed`, `indexing_partial`        | Static failed/partial job snapshots                                                                                   |
| `timeout`, `unavailable`                     | Search/Ask HTTP 504/503 with `ErrorBody`                                                                              |
| `operator`, `customer`                       | Simulated `operator_free_tier` / `customer_key` metadata and usage                                                    |
| `operator_quota`, `customer_quota`           | Ask HTTP 429, with the exact responsible mode                                                                         |
| `truncated`, `stream_error`                  | Terminal SSE timeout/quota failure after stream acceptance                                                            |
| `usage_unavailable`                          | HTTP 200 usage/limits with `status: unavailable`                                                                      |
| `*_launch`, `*_conflict`, `*_indexing` notes | Happy path, disagreement, indexing evidence                                                                           |
| `*_formatting` notes                         | Long title, nested quotes, code block, inline code, URL/path, table, mixed-case tokens, 720-character unbroken string |
| `richTextMarkdown`                           | Companion rendering example with fenced code and Markdown tables; not a second durable note format                    |

Notes use ProseMirror JSON. Passage offsets refer to the concatenated text leaves
of that fixture version, in JavaScript UTF-16 offsets (end exclusive). This is a
fixture projection, not a new editor serializer. Chunk IDs and previews resolve
to the exact source version. Plain-text search snippets and Ask output are data;
frontend rendering still owns sanitization and semantic isolation.

### Ask examples

Use the exported questions with the ordinary S-02 `question` field:

| Export                             | Terminal outcome                                 |
| ---------------------------------- | ------------------------------------------------ |
| `askQuestions.supported`           | `supported`                                      |
| `askQuestions.partial`             | `partial` (unsupported budget explicitly marked) |
| `askQuestions.no_supported_answer` | `no_supported_answer`                            |
| `askQuestions.conflict`            | `conflict` (both disagreeing passages cited)     |
| `askQuestions.refused_policy`      | `refused_policy`                                 |

All five are HTTP **200**, ending in exactly one `completed` event. Streams start
with `generating` and emit stable `claim` units when supported evidence exists.
Unknown questions or missing evidence return `no_supported_answer`.

`truncated` / `error` events terminate a failed 200 stream without `completed`.
Pre-stream failures return JSON `ErrorBody` with HTTP 4xx/5xx. `quota_exhausted`
always includes `mode`. Explicitly switching a simulated live-quota scenario to
`mock` restores mock Ask; no automatic mode switch occurs. Answers never create
notes.

Search is fixture ranking, not an index: `launch`, `launch review`, `release
meeting`, `indexing`, `pgvector`, `BYOK`, and `OpenAI` have mappings. Queries are
trimmed and case-insensitive; Ask uses the exact exported questions after trimming.
`topK`, ownership and workspace scope apply before returning hits. The supported
mock search filter is `noteId`; unknown filter keys return zero hits. Newly
created/edited notes remain available through CRUD but acquire no new search/Ask
ranking. Changed, soft-deleted and purged sources cannot produce stale evidence.

## Sessions, scope and metadata

`identities` contains fake `.test` credentials for Alex, Blair (a separate tenant),
and the sample guest. POST `/api/v1/session` returns only `{ actorId }`, rotates
the mock session, and sets `JSESSIONID` plus `XSRF-TOKEN`. GET session bootstraps
cookies for preauthenticated scenarios; DELETE requires CSRF and invalidates it.

The sample scenario installs a guest session in handler state before requests.
It does not add an anonymous route or a membership bypass. An explicitly invalid
session cookie is always denied. Guest membership includes only `ws_sample`.
Writes to notes, vault and runtime mode are forbidden for that guest; scoped
search and Ask remain available.

Browser clients send `credentials: 'include'` and copy the readable `XSRF-TOKEN`
cookie into `X-XSRF-TOKEN` on S-02 operations requiring it, including search and
Ask. Node fetch has no cookie jar: use `getSessionHeaders()` for the initial
preauthenticated fixture, or extract/replay the two cookies from sign-in.
The helper returns no authenticated headers in `signed_out` or after sign-in;
subsequent authentication uses the response cookies. MSW simulates session
behavior; these tests do not replace real browser/Spring HttpOnly or CORS checks.

Workspace paths and `OmniDoc-Workspace-Id` are selectors only. Handlers derive
access from session membership, including headerless note lookup. Cursor tokens
are scoped to workspace. `corpusOwnership` exists only on S-02 notes, search
requests/hits, Ask requests and citations. Workspace responses keep exactly
`id`, `tenantId`, and `name`; the sample workspace's name labels it clearly.

Default mode is `mock`. Operator/customer scenarios simulate metadata only; all
execution remains local fixtures. Requesting an unavailable mode yields
`mode_forbidden`; Ask cannot silently override the selected mode. Mode selection
is per workspace and `ask`/`embed` feature. Usage values are fixed mock numbers,
not measured consumption or billing; omitted mode defaults to selected Ask mode.
Valid usage date ranges do not alter the fixed snapshot.

Vault records are tenant-scoped masked metadata. Store/rotate validate but discard
`plaintextKey`; no key value or derived prefix is kept, logged or returned. Verify
is a fixture status check, never an upstream probe. Revoking all simulated customer
credentials makes customer Ask fail without changing its selected mode.

## HTTP coverage and deliberate limits

Handlers cover session create/read/logout; workspace listing; note
list/create/get/update/soft-delete/purge; lexical/hybrid search; Ask SSE; static
GET ingestion job; vault list/get/store/rotate/revoke/verify; usage/limits; and
runtime-mode read/update. Notes use deterministic IDs and optimistic concurrency.

Invites, exports and POST ingestion are omitted. There is no import engine,
chunking worker, pgvector adapter, Java Ask implementation, or production AI.
Static job snapshots are not tied to actual ingestion or newly edited notes.
RTL support and production activation gates remain open.

## Node tests

```ts
import { setupServer } from "msw/node";
import { createMockEnvironment } from "@omnidoc/mocks";

const mock = createMockEnvironment();
const server = setupServer(...mock.handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  mock.reset();
});
afterAll(() => {
  mock.releaseResponses();
  server.close();
});
```

Use a fresh environment/server per test when scenarios differ. Unknown API
requests should fail, not reach a live API or a provider. For RSC/Server Actions,
install Node handlers in the test/server process; a browser worker cannot intercept
server-side fetches. No app wiring is installed by this package.

## Browser and Storybook wiring (frontend-owned)

After frontend authorizes its import boundary exception:

```ts
import { setupWorker } from "msw/browser";
import { createMockEnvironment } from "@omnidoc/mocks";

const mock = createMockEnvironment({ scenario: "sample" });
const worker = setupWorker(...mock.handlers);
await worker.start({ onUnhandledRequest: "error" });
await fetch("http://localhost:8080/api/v1/session", { credentials: "include" });
```

The frontend owner installs the MSW worker asset in its public directory and
starts the worker only for explicit mock development/testing. Storybook can use
the same factory in its preview setup, then reset handlers/state between stories.
For loading stories, invoke `releaseResponses()` after inspecting loading; for
indexing stories, invoke `advanceProgress()` and poll the same GET job endpoint.
Ignore only known static asset requests if the surrounding host needs that; keep
unhandled API requests fatal. Mock responses follow MSW's
[cookie](https://mswjs.io/docs/http/mocking-responses/cookies) and
[streaming](https://mswjs.io/docs/http/mocking-responses/streaming) APIs.

**Pending frontend exception:** `mocks` retains `scope:tooling`; existing Nx rules
forbid `web → mocks`. Commander/frontend must authorize a narrowly scoped
**development/test-only** import exception before wiring it. Do not add mocks to
production imports, retag it `scope:shared`, suppress lint, or fork fixtures.
S-03 does not modify ESLint/boundary rules, `apps/web`, or `packages/ui`.

## Install and verify

This source-distributed package's `build` target validates production TypeScript
source without emitting a second distribution. Typecheck additionally covers
tests. From the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
NX_DAEMON=false NX_ISOLATE_PLUGINS=false pnpm exec nx run-many -t build,typecheck,lint,test --projects=mocks --skip-nx-cache
NX_DAEMON=false NX_ISOLATE_PLUGINS=false pnpm exec nx run-many -t typecheck,lint,test --projects=contracts --skip-nx-cache
```

`--ignore-scripts` avoids MSW's optional worker-asset postinstall; worker setup is
frontend-owned. No workspace build-policy changes are required by S-03. The
mechanical lockfile update includes MSW transitive dependencies and peer-context
changes in Vitest/Nx caused by satisfying Vitest's optional MSW peer; existing
package versions are unchanged. Do not regenerate contracts to verify mocks.
