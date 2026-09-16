/**
 * `@omnidoc/ui` — OmniDoc design system and copied-in component source.
 *
 * F-01 replaced the S-01a placeholder stub with the D-01 token system
 * (`src/styles/tokens.css`) and the foundation component tier. Import styles
 * from `@omnidoc/ui/styles/globals.css` (Tailwind v4 entry) or
 * `@omnidoc/ui/styles/tokens.css` (tokens only).
 *
 * Components consume D-01 semantic tokens only. They never import a provider
 * SDK, Spring/Java types, or `packages/mocks` production paths (inventory §13).
 */
export * from "./components";
export * from "./lib";
export * from "./providers";
