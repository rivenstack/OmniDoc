# Ask SSE contract

Companion to [openapi.yaml](./openapi.yaml) `POST /api/v1/ask`. OpenAPI
cannot fully model Server-Sent Events; this file is the canonical event
contract. Payload JSON schemas live in OpenAPI components (`AskSse*`,
`Answer`, `Citation`, `ErrorBody`).

Media type: `text/event-stream`. Character encoding: UTF-8.

## Framing

Each event is one SSE record:

```text
event: <name>
data: <json>

```

- `event` is required and is one of the names below.
- `data` is a single JSON object (no multiline `data:` splitting in Phase 1).
- A blank line terminates the record.
- `id` / `Last-Event-ID` are **unused** in Phase 1 (no resume).
- Comments (`:` lines) are ignored.

HTTP status for a started stream is **200**. Authz, validation, and
`mode_forbidden` that fail **before** the stream opens use the JSON
`ErrorBody` envelope on 4xx/5xx (see OpenAPI). Failures **after** the
stream opens use terminal `truncated` or `error` events — still on the
200 stream.

## Event names

| `event` | Payload schema | Terminal? | Meaning |
|---------|----------------|-----------|---------|
| `generating` | `AskSseGenerating` | no | Stream accepted; UI may announce “Generating answer” once. |
| `claim` | `AskSseClaim` | no | One **stable** claim unit plus its citations. Not mid-token. |
| `completed` | `AskSseCompleted` (`Answer`) | yes | Final answer, including honest refusal / partial / conflict. |
| `truncated` | `AskSseTruncated` (`ErrorBody`) | yes | Stream cut early (`timeout`, `partial`, …). Distinct from `no_supported_answer`. |
| `error` | `AskSseError` (`ErrorBody`) | yes | Transport/policy failure after the stream opened. |

Exactly one terminal event ends a successful or failed stream. Do not
send `completed` after `truncated` or `error`.

### Wire examples

Generating:

```text
event: generating
data: {}

```

Claim unit:

```text
event: claim
data: {"text":"Indexing lag is a first-class state.","citations":[{"noteId":"note_1","versionId":"ver_1","chunkId":"chk_1","anchor":{"startOffset":0,"endOffset":42},"preview":"Indexing lag is a first-class state.","updatedAt":"2026-09-16T12:00:00Z","corpusOwnership":"mine"}]}

```

Completed (success outcomes — **not** HTTP errors):

```text
event: completed
data: {"outcome":"supported","text":"…","citations":[…]}

```

`outcome` is one of:

- `supported`
- `partial`
- `no_supported_answer`
- `conflict`
- `refused_policy`

Truncated (transport class):

```text
event: truncated
data: {"code":"timeout","detail":"Stream ended before a complete answer."}

```

Error after open (`quota_exhausted` must include `mode`):

```text
event: error
data: {"code":"quota_exhausted","detail":"Operator free-tier quota exhausted.","mode":"operator_free_tier"}

```

## Citations

Every citation on `claim` or `completed` must identify:

| Field | Required | Notes |
|-------|----------|--------|
| `noteId` | yes | Durable note id |
| `versionId` | yes | Cited version, not “whatever is current” |
| `chunkId` | yes | Chunk of that version |
| `anchor.startOffset` / `anchor.endOffset` | yes | Passage offsets; optional `anchor.blockId` |
| `preview` | yes | Text suitable for same-view inspection |
| `updatedAt` | no | UTC instant for stale-risk cues |
| `corpusOwnership` | no | `sample` or `mine` when labelled |

Do not emit a citation that the caller cannot open under the bound
workspace ACL. Prefer no citation over a mismatched one.

## Cancel and persistence

- Client cancel = close the HTTP connection. The server stops emitting.
- Partial UI text after cancel is a client “Stopped” state, not a
  `completed` outcome.
- Answers are **never** auto-written into the corpus.

## Distinct from transport errors

| Class | Where | UI class |
|-------|-------|----------|
| Ask success outcomes | `completed.outcome` | Neutral / warning per design, never a broken page |
| Stream truncation | `truncated` | Error + retry |
| Stream transport failure | `error` | Error + retry; `quota_exhausted` names `mode` |
| Pre-stream failure | HTTP 4xx/5xx JSON `ErrorBody` | Error |

`no_supported_answer` and `refused_policy` are not `error` events.

The string `partial` on `completed.outcome` means unsupported spans.
The string `partial` on `truncated.code` means the stream was cut. The
string `conflict` on `completed.outcome` means sources disagree; on
`ErrorBody.code` it means note version concurrency.
