# Research Docs

Evidence packages for OmniDoc live under this directory.

## Layout

```text
docs/research/
├── README.md
├── technical/     # Task 0.2 — /researcher
└── ux/            # Task 0.3 — /ux_researcher
```

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
