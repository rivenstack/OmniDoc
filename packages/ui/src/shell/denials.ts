/**
 * Generic denials — the sentences that are a security contract, not copy.
 *
 * `docs/design/system-ux.md` §2 (Tenancy): *"A forbidden workspace is a generic
 * denial. Do not reveal whether it exists."* The same rule is extended here to a
 * note that is not yours, because `docs/api/openapi.yaml` deliberately answers
 * `403` for "not your tenant" and `404` for "no such note in your tenant" — the
 * frontend must render both through one message, or the difference becomes an
 * existence oracle.
 *
 * These strings are load-bearing. Changing one changes what the product leaks,
 * which is why they live beside the shell blocks that render them rather than in
 * a page's local copy.
 */

/** Denial for a workspace the session has no membership for. */
export const WORKSPACE_FORBIDDEN_MESSAGE =
  "You don't have access to that workspace.";

/**
 * Denial for a note that is not readable by this session.
 *
 * Deliberately says nothing about whether the note exists: "this page isn't
 * available" is the same sentence for a note another tenant owns and for a note
 * that never existed.
 */
export const NOTE_FORBIDDEN_MESSAGE = "This page isn't available.";
