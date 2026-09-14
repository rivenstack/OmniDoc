# Research Docs

Evidence packages for OmniDoc live under this directory.

## Layout

```text
docs/research/
├── README.md
├── version-ledger.md   # Authority for every version / runtime / policy-date claim
├── technical/     # Task 0.2 — /researcher
└── ux/            # Task 0.3 — /ux_researcher
```

## Version discipline

[`version-ledger.md`](./version-ledger.md) is the single authority for
version-bound claims: exact version, release date, verification date,
and where it was read. No document may restate a version without a
ledger row, and the ledger is re-verified before each Phase Check — the
technical package went stale within a day of being written (it
recommended React Router 7 while v8 had shipped three months earlier).
Policy rows (retention, ZDR, pricing) carry the same dates and expire
on the same clock.

## Ownership

| Path | Owner | Contents |
|------|-------|----------|
| `docs/research/technical/` | `/researcher` | Platform/stack evidence matrices, provider comparisons, dated sources, candidate shortlists with tradeoffs (no selection) |
| `docs/research/ux/` | `/ux_researcher` | Journey evidence, competitor UX teardowns, trust/citation hypotheses, design-facing recommendations |

Do not treat empty folders as completed research. Research evidence is not
an architecture decision — selection belongs to `/architect` (ADR-0001)
plus any required `@user` gate.

Commerce / payment / tax / shipping / SMS regional briefs are out of
scope for OmniDoc and must not be reintroduced.
