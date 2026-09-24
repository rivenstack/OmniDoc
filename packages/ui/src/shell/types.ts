import type { components } from "@omnidoc/contracts";

/**
 * Typed aliases derived from the generated OpenAPI contract (`@omnidoc/contracts`).
 *
 * The contract package exports `components` / `paths`; these aliases name the
 * schemas the shell consumes. They are pure lookups — no shape is forked, and
 * nothing here may drift from `docs/api/openapi.yaml`.
 */
export type Workspace = components["schemas"]["Workspace"];
export type WorkspaceList = components["schemas"]["WorkspaceList"];
export type Principal = components["schemas"]["Principal"];
export type CorpusOwnership = components["schemas"]["CorpusOwnership"];
