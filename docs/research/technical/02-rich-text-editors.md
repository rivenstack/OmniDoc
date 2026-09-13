# Rich-Text / Markdown Editor Libraries

**Research date / access date:** 2026-09-13  
**Question:** Which editor foundations fit a notes product (capture →
structure → retrieve), under license, a11y, collab path, extensibility,
and RTL-readiness — without selecting a winner?

## Options (four for exclusion contrast; Architect may keep ≤3)

### A. TipTap (on ProseMirror)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| License | MIT for editor core (GitHub LICENSE) | Verified technical | H |
| Commercial add-ons | Cloud/collaboration/AI Toolkit are paid platform products (vendor pricing; secondary reports of plan changes — verify at purchase time) | Verified + unresolved pricing detail | M |
| Accessibility | Headless; implementer must supply toolbar roles, labels, keyboard model | Verified technical | H |
| Collaborative editing | Yjs binding (`@tiptap/y-tiptap`); Hocuspocus OSS backend | Verified technical | H |
| Extensibility | Extension architecture; schema control via ProseMirror | Verified technical | H |
| RTL-readiness | Official `textDirection`: `ltr` \| `rtl` \| `auto`; per-node commands | Verified technical | H |
| Version signal | GitHub latest release observed v3.27.3 (2026-07-07) | Verified technical | H |

**Adverse:** Cloud features create upsell pressure; a11y quality is not
“included” — product must own it. Mixed BiDi in notes still needs PoC
beyond setting `textDirection`.

**Sources:** https://github.com/ueberdosis/tiptap ; https://tiptap.dev/docs/editor/api/editor ; https://tiptap.dev/docs/examples/basics/text-direction (accessed 2026-09-13).

### B. Lexical (Meta)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| License | MIT | Verified technical | H |
| Accessibility | Project claims WCAG-oriented design / AT compatibility | Verified claim (needs product test) | M |
| Collaborative editing | `@lexical/yjs` + your provider | Verified technical | H |
| Extensibility | Plugin architecture; immutable editor state | Verified technical | H |
| RTL-readiness | No OmniDoc PoC; do not treat marketing as BiDi proof | Unresolved | L |
| Ecosystem | Official React bindings; version signal ~v0.43.0 (2026-04) | Verified technical | H |

**Adverse:** Still relatively low major version; plugin quality varies;
markdown serialization often custom.

**Sources:** https://github.com/facebook/lexical ; https://lexical.dev/ (accessed 2026-09-13).

### C. CodeMirror 6

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| License | MIT | Verified technical | H |
| Accessibility | Official site: works with screen readers and keyboard-only users | Verified claim | H |
| Fit for notes | Excellent for code/markdown source; weaker as Notion-like block WYSIWYG | Inference | M |
| Collab | Separate collab packages (ecosystem) | Common practice | M |
| RTL-readiness | Needs PoC for mixed UGC | Unresolved | L |

**Adverse:** Choosing CM6 as the *primary* note editor pushes a
source-mode UX; may still be required *inside* another editor for fenced
code.

**Sources:** https://codemirror.net/ (accessed 2026-09-13).

### D. Milkdown

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| License | MIT | Verified technical | H |
| Stack | ProseMirror + remark; Crepe UI; CodeMirror for code blocks | Verified technical | H |
| Accessibility | Toolbar/ARIA work present in Crepe lineage; verify against WCAG in PoC | Common practice / weak | M |
| Collab | Not as prominently documented as TipTap/Lexical Yjs paths in primary skim | Unresolved | L |
| RTL-readiness | Unverified | Unresolved | L |

**Adverse:** Smaller ecosystem than TipTap/Lexical; markdown fidelity is a
strength if OmniDoc stores markdown as source of truth.

**Sources:** https://github.com/Milkdown/milkdown ; milkdown.dev (accessed 2026-09-13).

## Findings

### Verified technical facts

- TipTap and Lexical both offer MIT cores and Yjs collaboration paths.
- TipTap documents explicit text-direction APIs suitable for RTL-readiness
  discipline (not the same as shipping an RTL locale).
- CodeMirror 6 is MIT and a11y-oriented for code editing.

### Common market practices

- Notes SaaS often stores ProseMirror/Lexical JSON **or** markdown, with
  an export path; dual formats need a single source of truth (Architect).

### Inferences

- For OmniDoc Phase 0, collaborative editing is optional; choosing an
  editor *with a collab path* preserves option value without paying for
  Cloud now.

### Unknowns / @user gates

- Is real-time multiplayer editing in MVP, later, or never?
- Preferred storage: markdown vs structured JSON vs both with export?
- Accessibility bar: target WCAG 2.2 AA on editor chrome in Phase 1?

## PoC plan

1. TipTap vs Lexical: same note fixtures (lists, code fence, link, long
   LTR string, URL, `bdi`-wrapped id).
2. Keyboard-only create/edit; screen-reader smoke on toolbar.
3. Serialize/deserialize round-trip; measure extension effort for
   citation anchors / block ids needed for RAG chunking later.
