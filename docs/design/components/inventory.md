# Component Inventory — `packages/ui`

> **Historical (2026-09-22).** Not a whitelist. Do not block a screen
> because a component is missing here, and do not build a component
> because it is listed here. See [`../now.md`](../now.md).

**Owner:** `/designer` · **Handoff:** D-01
**Stack:** shadcn/ui on Base UI (`@base-ui/react` 1.8.0), Tailwind 4.3.3
(ADR-0003). Components are **copy-in and project-owned** in `packages/ui`
(ADR-0002/0003).

**Purpose:** give the Implementer an exact component list with the states
each must cover, so F-01+ can copy in shadcn pieces and wire behaviour
**without inventing IA or states**. This document names components and
states only — it does not ship source.

**Legend** — Source column: `shadcn` = copy in from shadcn/ui registry;
`shadcn+` = shadcn component with project-specific props/composition;
`custom` = thin project component built on Base UI primitives (justify in
review). **Custom is a last resort** (Extension-First).

---

## 1. Layout & shell

| Component        | Source                                             | States / variants                                 |
| ---------------- | -------------------------------------------------- | ------------------------------------------------- |
| `AppShell`       | custom (thin)                                      | default                                           |
| `Sidebar`        | custom                                             | expanded · rail · loading · overflow              |
| `SidebarNavItem` | custom                                             | default · hover · focus · active (`aria-current`) |
| `MobileTabBar`   | custom                                             | default · active tab                              |
| `TopBar`         | custom                                             | default · loading                                 |
| `PageHeader`     | shadcn+                                            | default · with actions · with corpus chip         |
| `SkipLink`       | custom                                             | default (visible on focus)                        |
| `CommandPalette` | shadcn (`command` → Base UI `Dialog` + `Combobox`) | closed · open · loading · empty · results         |
| `ContentRegion`  | custom                                             | default · loading · error · empty                 |

## 2. Navigation & workspace (REC-18)

| Component               | Source                                    | States / variants                                          |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `WorkspaceSwitcher`     | shadcn+ (`DropdownMenu` / Base UI `Menu`) | single-workspace · few · sample-present · open · forbidden |
| `WorkspaceSwitcherItem` | custom                                    | default · selected · sample-tagged                         |
| `SoloWorkspaceBadge`    | custom                                    | default                                                    |
| `MembersPanel`          | custom                                    | solo-empty · list · loading · error                        |
| `MemberRow`             | custom                                    | default · owner · member                                   |
| `ThemeToggle`           | shadcn (`DropdownMenu`)                   | light · dark · system                                      |

## 3. Foundations & primitives

| Component           | Source                        | States / variants                                                                      |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `DirectionProvider` | shadcn (`direction`, Base UI) | ltr (only live)                                                                        |
| `ThemeProvider`     | custom (next-themes)          | —                                                                                      |
| `Button`            | shadcn                        | default · secondary · ghost · outline · destructive · link · loading · disabled · icon |
| `IconButton`        | shadcn+                       | default · hover · focus · disabled · pressed                                           |
| `Input`             | shadcn                        | default · focus · error · disabled · read-only                                         |
| `Textarea`          | shadcn                        | default · focus · error · auto-grow                                                    |
| `PasswordInput`     | shadcn+                       | hidden · revealed (auto-hides on blur) · disabled                                      |
| `Label`             | shadcn                        | default · required · muted                                                             |
| `FieldHint`         | custom                        | hint · error · success                                                                 |
| `Checkbox`          | shadcn                        | unchecked · checked · indeterminate · disabled                                         |
| `RadioGroup`        | shadcn                        | default · selected · disabled                                                          |
| `Switch`            | shadcn                        | on · off · disabled                                                                    |
| `Select`            | shadcn (`Select` / Base UI)   | default · open · disabled · error                                                      |
| `Combobox`          | shadcn (`Combobox` / Base UI) | default · open · empty · loading · create-option                                       |
| `Popover`           | shadcn                        | closed · open                                                                          |
| `Tooltip`           | shadcn                        | hidden · visible (focus **and** hover)                                                 |
| `Sheet`             | shadcn (`Dialog` variant)     | closed · open · mobile-bottom · side                                                   |
| `Dialog`            | shadcn                        | closed · open · loading · destructive-confirm                                          |
| `AlertDialog`       | shadcn                        | closed · open · destructive                                                            |
| `DropdownMenu`      | shadcn                        | closed · open · with-destructive-item                                                  |
| `Tabs`              | shadcn                        | default · active · disabled                                                            |
| `Separator`         | shadcn                        | horizontal · vertical                                                                  |
| `Avatar`            | shadcn                        | image · initials · fallback                                                            |
| `Badge`             | shadcn                        | neutral · accent · success · warning · danger · info · outline                         |
| `Skeleton`          | shadcn                        | static (no shimmer)                                                                    |
| `Spinner`           | shadcn+                       | spinning · static (reduced motion)                                                     |
| `ScrollArea`        | shadcn                        | default · with-inline-overflow (code/tables)                                           |
| `Kbd`               | custom                        | default                                                                                |
| `Card`              | shadcn                        | default · interactive · muted                                                          |

## 4. Domain chrome — mode, corpus, usage

| Component            | Source                        | States / variants                                                           |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `ModeChip`           | shadcn+ (`Badge` + `Popover`) | mock · operator_free_tier · customer_key · compact · loading                |
| `ModeDetailsPopover` | custom                        | mock · live-operator · live-customer · quota-low · quota-exhausted          |
| `CorpusChip`         | shadcn+ (`Badge`)             | sample · mine                                                               |
| `CorpusSwitcher`     | shadcn (`Select` / segmented) | both · sample · mine · disabled                                             |
| `SampleBanner`       | custom                        | default · dismissible                                                       |
| `UsageStrip`         | custom                        | available · unavailable · loading · quota-low · quota-exhausted · forbidden |
| `UsageFigures`       | custom                        | default · tabular · empty                                                   |
| `RetentionNote`      | custom                        | default (never ZDR)                                                         |

## 5. Capture

| Component              | Source                        | States / variants                                   |
| ---------------------- | ----------------------------- | --------------------------------------------------- |
| `NoteEditor`           | custom (TipTap 3.31.3)        | empty · editing · readonly · error                  |
| `EditorToolbar`        | custom (toolbar role)         | default · active-mark · focus-within                |
| `EditorTitleField`     | custom                        | empty · editing · error                             |
| `SaveStatus`           | custom                        | idle · saving · saved · conflict · offline · failed |
| `SaveConflictDialog`   | shadcn (`AlertDialog`)        | open · reload · keep-mine                           |
| `CodeBlock`            | custom (CodeMirror 6 + Shiki) | default · overflow-scroll · loading                 |
| `InlineCode`           | custom                        | default (with `<bdi>` isolation)                    |
| `MarkdownTable`        | custom                        | default · narrow-scroll                             |
| `ImportDropzone`       | custom                        | idle · dragover · uploading · disabled              |
| `ImportFileRow`        | custom                        | pending · indexing · ready · partial · failed       |
| `ImportSummary`        | custom                        | all-ready · partial · with-failures                 |
| `PasteToNoteButton`    | shadcn (`Button`)             | default · disabled                                  |
| `AIAnswerToNoteAction` | shadcn+                       | idle · confirming · created (labels AI-generated)   |

## 6. Organize

| Component               | Source                        | States / variants                                      |
| ----------------------- | ----------------------------- | ------------------------------------------------------ |
| `NoteList`              | custom                        | empty · loading · loaded · filtered-empty · indexing   |
| `NoteListRow`           | custom                        | default · hover · focus · selected · indexing · sample |
| `NoteListToolbar`       | custom                        | default · with-selection · filters-active              |
| `BulkActionBar`         | custom                        | hidden · visible · applying · result                   |
| `CollectionTree`        | custom                        | empty · with-items · collapsed · renaming              |
| `CollectionTreeItem`    | custom                        | default · active · dragging · drop-target              |
| `CreateCollectionField` | shadcn+ (`Input`)             | idle · editing · error                                 |
| `LabelCombobox`         | shadcn (`Combobox`)           | closed · open · empty · create                         |
| `LabelChip`             | shadcn+ (`Badge`)             | default · removable · overflow (+N)                    |
| `MoveToSheet`           | shadcn (`Sheet` + `Combobox`) | closed · open · applying · error                       |
| `UndoToast`             | shadcn (`Sonner`/custom)      | showing · undone · dismissed                           |
| `InboxZeroState`        | custom                        | default                                                |

## 7. Retrieve

| Component              | Source                               | States / variants                                                  |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `SearchField`          | shadcn (`Input` + `search` landmark) | idle · typing · settling · disabled                                |
| `SearchFilters`        | custom                               | none · 1+ active · open · error                                    |
| `FilterChip`           | shadcn+ (`Badge`)                    | default · active · removable                                       |
| `SearchResultList`     | custom                               | loading · results · empty-true · empty-filtered · indexing · error |
| `SearchResultRow`      | custom                               | default · hover · focus · sample · indexing                        |
| `HighlightedSnippet`   | custom                               | default (sanitized `<mark>`)                                       |
| `NoResultsPanel`       | custom                               | true-empty · filtered-empty · indexing                             |
| `RecentsList`          | custom                               | empty · loaded · loading                                           |
| `PaginationOrLoadMore` | shadcn (`Button`)                    | idle · loading · exhausted                                         |

## 8. Ask (trust core)

| Component                | Source                      | States / variants                                                                       |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------------------- |
| `AskComposer`            | custom                      | empty · typing · submitting · generating · disabled · error                             |
| `SuggestedQuestionChips` | custom                      | hidden · visible                                                                        |
| `AskAnswerCard`          | custom                      | supported · partial · no_supported_answer · conflict · refused_policy · error · stopped |
| `AnswerProse`            | custom (sanitized markdown) | default · with-citations · with-unsupported-spans                                       |
| `CitationMarker`         | shadcn+ (`Button`)          | default · hover · focus · active · unavailable                                          |
| `SourcesList`            | custom                      | with-sources · empty                                                                    |
| `SourceCard`             | custom                      | default · sample · stale · open                                                         |
| `StaleSourceCue`         | custom                      | fresh · aging · very-stale                                                              |
| `CitationRail`           | custom (`complementary`)    | closed · open · loading · error                                                         |
| `CitationSheet`          | shadcn (`Sheet`)            | closed · open · loading                                                                 |
| `PassagePreview`         | custom                      | default · highlighted · code · table · long                                             |
| `UnsupportedSpanMarker`  | custom                      | default (mark + SR label)                                                               |
| `ConflictSourcesView`    | custom                      | two-source · n-source                                                                   |
| `RefusalPanel`           | custom                      | empty-corpus · insufficient-corpus · policy                                             |
| `GeneratingIndicator`    | custom                      | animated · static (reduced motion)                                                      |
| `JumpToAnswerControl`    | shadcn (`Button`)           | hidden · visible                                                                        |
| `CancelStreamButton`     | shadcn (`Button`)           | visible · cancelling                                                                    |
| `AnswerFeedback`         | custom                      | idle · submitted · error                                                                |
| `SaveAnswerAsNoteAction` | shadcn+                     | idle · confirming · saved (AI-generated label)                                          |
| `CopyAnswerButton`       | shadcn (`Button`)           | idle · copied                                                                           |

## 9. Dual-mode failures

| Component              | Source | States / variants                                                                                                    |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `FailureBanner`        | custom | transport · quota-operator · quota-customer · mode-forbidden · key-invalid · key-scope · forbidden · unauthenticated |
| `FailureActions`       | custom | retry · continue-in-mock · open-cookbook · sign-in                                                                   |
| `RequestId`            | custom | available · absent (with `<bdi>`)                                                                                    |
| `MockStillWorksNotice` | custom | default                                                                                                              |

## 10. Cookbook / AI connections

| Component              | Source                         | States / variants                                               |
| ---------------------- | ------------------------------ | --------------------------------------------------------------- |
| `CookbookIndex`        | custom                         | empty · with-chapters · loading                                 |
| `CookbookChapterRow`   | custom                         | not-connected · connected · coming-soon · ask-failed            |
| `CookbookChapterShell` | custom                         | step-0…step-6 · loading · error                                 |
| `WhyByokPanel`         | custom                         | default                                                         |
| `ExternalStepsList`    | custom                         | default (numbered, isolated URLs)                               |
| `KeyPasteForm`         | custom (react-hook-form + Zod) | idle · validating · error · submitting                          |
| `KeyMaskedDisplay`     | custom                         | masked-prefix (never full) · none                               |
| `VerifyResult`         | custom                         | idle · verifying · ok · invalid_key · wrong_scope · unavailable |
| `ManagedKeyCard`       | custom                         | connected · last-ask-failed · revoking · revoked                |
| `RotateKeyDialog`      | shadcn (`Dialog`)              | open · submitting · error                                       |
| `RevokeKeyDialog`      | shadcn (`AlertDialog`)         | open · confirmed                                                |
| `FirstAskPrompt`       | custom                         | default · launched                                              |

## 11. States & feedback

| Component           | Source                  | States / variants                                     |
| ------------------- | ----------------------- | ----------------------------------------------------- |
| `EmptyState`        | custom                  | what · why · primary · secondary                      |
| `IndexingBanner`    | custom                  | none-ready · some-ready · complete                    |
| `StatusRegion`      | custom (polite live)    | idle · message                                        |
| `AlertRegion`       | custom (assertive live) | idle · message                                        |
| `Toast`             | shadcn (`Sonner`)       | info · success · warning · danger · undo              |
| `ProgressBar`       | shadcn                  | determinate · indeterminate · static (reduced motion) |
| `PageErrorBoundary` | custom                  | error · retry                                         |

---

## 12. State-coverage rule

A component is **not** spec-complete until every state in its row exists
in Storybook (ADR-0003) with a reduced-motion variant where motion is
listed. Phase Check can then run the a11y gate against real states.

**Do not invent components not listed here** without returning a bounded
gap to `/commander`. In particular:

- No billing/invoice/seat components (portfolio scale, REC-15).
- No org-chart / SSO / directory components (REC-18).
- No graph/canvas components (v1 scope).
- No analytics dashboards.

---

## 13. Import boundary (ADR-0002/0003)

- Components live in `packages/ui`; `apps/web` imports via
  `@omnidoc/ui`.
- No component may import a provider SDK, Spring/Java types, or
  `packages/mocks` production paths — enforced by
  `@nx/enforce-module-boundaries` (ADR-0002).
- Components consume **semantic tokens** only (see
  [`../foundations/tokens.md`](../foundations/tokens.md) §1).
- Markdown/code rendering goes through the sanitized pipeline
  (rehype-sanitize, Shiki) — no raw HTML.

---

## 14. Traceability

| Component group          | Evidence        | Architecture       |
| ------------------------ | --------------- | ------------------ |
| Mode/corpus/usage chrome | REC-13/15/17    | §5.10, §5.11, §9   |
| Ask trust core           | REC-04/05/06/10 | §4, §5.6           |
| Cookbook                 | REC-14/19       | §5.9               |
| Failure surfaces         | REC-16          | §5.6, §5.10, §5.11 |
| Shell/workspace honesty  | REC-18          | §2                 |
| Empty/indexing states    | REC-02/07       | §3, §5.2           |
