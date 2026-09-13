---
name: ai-content-safety
description: "Review OmniDoc RAG ingestion, retrieved content, prompts, citations, Markdown rendering, external links/fetches, and AI tool/provider interactions for prompt-injection, XSS, SSRF, data-leakage, and trust-boundary failures."
paths:
  - "backend/**"
  - "frontend/**"
  - "infra/**"
  - "docs/research/**"
  - "docs/adr/**"
---

# AI Content Safety

Use for changes that ingest, retrieve, render, summarize, send to a model, or act on user-controlled or external content.

## Core principle

Retrieved/user content is **data**, not trusted instructions.

Model output is also untrusted until constrained/validated for the action being taken.

## Review procedure

1. Identify content sources:
   - user Markdown;
   - uploaded files;
   - pasted content;
   - imported web content;
   - document metadata;
   - retrieved chunks;
   - model/provider responses;
   - generated citations/links.

2. Classify each source:
   - trusted application instruction;
   - authenticated user input;
   - untrusted document content;
   - untrusted external content;
   - third-party model output.

3. Verify prompt construction:
   - system/developer instructions are structurally separated from retrieved content;
   - retrieved content is clearly delimited/labeled as untrusted evidence;
   - document text cannot redefine authorization, tool policy, or secret-handling policy;
   - model is instructed to cite/support claims from sources rather than obey source instructions.

4. Verify data minimization:
   - only authorized/relevant chunks are sent to providers;
   - secrets/internal configuration are not inserted into prompts;
   - logs/traces do not capture sensitive prompt/document data unnecessarily;
   - provider-retention/privacy assumptions match accepted architecture.

5. Verify rendering:
   - Markdown/HTML rendering is sanitized according to accepted frontend architecture;
   - unsafe schemes/embedded HTML/script behavior are blocked;
   - citations/links do not create XSS/open-redirect surprises;
   - copy/code blocks preserve content without executing it.

6. Verify external fetches if present:
   - allow/deny policy is explicit;
   - localhost/private/link-local/cloud-metadata targets are blocked as required;
   - redirects are constrained;
   - DNS/IP rebinding considerations are handled where relevant;
   - response size/type/timeouts are bounded.

7. Verify AI actions/tools if present:
   - model suggestions are not automatically privileged actions;
   - authorization is re-checked by the application;
   - tool parameters are validated;
   - destructive/expensive actions have appropriate confirmation/idempotency.

8. Add adversarial tests:
   - document says “ignore previous instructions”;
   - document asks for another tenant's data;
   - hidden/HTML instruction text;
   - malicious Markdown/link payload;
   - source asks model to reveal keys/system prompt;
   - citation points to inaccessible/deleted content;
   - oversized/repetitive prompt content;
   - external URL to private network target, if fetching exists.

## Output

Report:

- trust-boundary map;
- unsafe paths;
- mitigations;
- tests;
- unresolved architecture questions;
- residual risk.

## Guardrails

- Prompt injection is not solved by a single prompt sentence.
- Sanitization does not replace authorization.
- Authorization does not replace content sanitization.
- Never let retrieved content choose credentials, tenant scope, provider policy, or privileged tool permissions.
