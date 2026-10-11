---
handoff_id: H-2026-10-11-P1-B07
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "B-07"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
archived: 2026-10-11
---

# B-07 — Superseded before execution

## Original objective

Implement tenant-scoped PostgreSQL lexical search and deterministic hybrid
search behind the existing `SearchPort` and frozen S-02 HTTP contract, reusing
the completed B-06 deterministic embedding and pgvector path.

Original start command:

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-07 exactly. Implement tenant-scoped lexical and hybrid search behind the existing SearchPort and frozen S-02 HTTP contract; keep B-06d and production AI dark.
```

## Outcome

**Superseded before execution on 2026-10-11.** No B-07 implementation was
performed from this handoff. `@user` explicitly sequenced conditional B-06d
ahead of B-07 and supplied the AvalAI developer-documentation input:

- `https://docs.avalai.ir/fa/`

B-07 returns to the listed backlog and remains the next normal backend slice
after B-06d completes or returns NO-GO. Its accepted scope remains unchanged:
real PostgreSQL lexical retrieval, deterministic hybrid composition, frozen
S-02 endpoints, tenant/workspace isolation, server-produced snippets, and
architecture §7 retrieval evaluation evidence.

## Gates preserved

- B-06d begins with `/researcher`, followed sequentially by `/architect`, then
  `/implementer` only after GO.
- No API-key value may enter a handoff, repository file, log, fixture, error,
  or chat. A development key is supplied later through an approved local
  environment/secret mechanism.
- Production activation and B-08 Ask/chat remain outside B-06d.
- RTL locale remains deferred and Phase Check remains closed until Build exit.
