# System UX

**Owner:** `/designer`, with `@user` choices
**Status:** live contract (2026-09-22)
**Changes:** rare. Offer options. The user chooses. Then edit this file.

This is the only design document other systems must honor. It records
behavior and information that would force an API, database, port, or
product-invariant change.

It does not specify layout, position, motion, color, spacing, component
choice, or code.

D-01 files in this folder (tokens, shell geometry, journey layouts,
component inventory) are history. They are not implementation authority.
The living plan is [`now.md`](./now.md).

---

## 1. What must exist (not where it sits)

These are information and actions. Placement is flexible and belongs in
the build, not here.

| Item | Why it is a system contract |
| --- | --- |
| New note | Capture must be possible without choosing a folder or tag first |
| Inbox | Default home for unfiled notes |
| Notes | All notes, distinct from Inbox |
| Collections | Optional light folders or tags. Not required to capture. No graph in v1 |
| Search | Its own operation, not Ask |
| Ask | Its own operation, not Search |
| Workspace switcher | A selector. The server decides membership |
| Search entry | A way to start Search. Width and shortcut are not specified |
| Runtime mode | Mock, live operator-funded, or live customer key must be representable. No silent switch |
| Corpus ownership | Sample vs the user's own notes is real data, not decoration |
| Citation inspection | An answer can open the passage it cites. Placement is not specified |
| Usage | May be unavailable. Never fabricate cost. Never claim zero retention |

Rearranging these is allowed. Dropping one is a contract change: offer
the option, wait for the user, then edit this table.

## 2. Behaviors that bind other systems

### Capture and notes

- A note can be created with a title and body only.
- Paste and file import are first-class. Each imported file has its own
  indexing status: pending, indexing, ready, partial, or failed.
- Saves are versioned. A conflict is visible. The client does not pick
  the winning version.
- An AI answer is not written into the corpus unless the user explicitly
  saves it. That note is marked AI-generated.
- Indexing in progress is visible. Search and Ask must not present an
  incomplete index as complete.

### Search and Ask

- Search and Ask are different ports. The UI does not call providers.
- Snippets and citations come from the server. The client does not invent
  hits, and does not attach a citation the server did not return.
- No citation is better than a mismatched citation.
- Sample vs Mine is a real search filter, not only a label.
- Ask outcomes `supported`, `partial`, `no_supported_answer`, `conflict`,
  and `refused_policy` are successful responses, not errors.
- Transport failures (timeout, unavailable, quota) are a different class.
  The product must be able to tell them apart. Appearance is not specified
  here.
- Citation identity is the payload in `architecture.md` §4 (note, version,
  chunk, offsets, preview, updated time). This file does not restate the
  schema.

Search-as-you-type is the current preference. It is not a locked
contract and can change later without a schema change.

### Dual mode and keys

- Three runtime modes. No silent fallback from one to another.
- A customer key is pasted, verified, and then not shown in full again.
  Only a masked prefix may be displayed.
- Connecting a key is optional on the first-run mock path. Live AI is not
  required to use the sample.

### Tenancy

- Workspace id selects. It does not authorize.
- A forbidden workspace is a generic denial. Do not reveal whether it
  exists.
- The product is honest at one or a few members. Do not require fake org
  charts, seat billing, or SSO data.

### Locale

- Shipping locale is `en` (LTR). RTL is deferred, not closed.
- Direction comes from one locale source. That is an implementer
  discipline, not a layout spec.

## 3. Explicitly out of this file

- Pixel layout, sidebar width, citation rail versus sheet
- Motion, easing, skeletons
- Color, type, radius, elevation
- Which shadcn component to copy
- Sentence-level copy, except where the sentence is the security contract
  (generic forbidden denial; no zero-retention claim)

## 4. How to change a contract

1. State the options and what each forces (API, schema, port, or invariant).
2. Stop. The user chooses.
3. Edit this file and [`now.md`](./now.md). Do not open a parallel spec.
