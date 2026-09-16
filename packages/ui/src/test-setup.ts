/**
 * Vitest setup for `@omnidoc/ui`.
 *
 * jsdom implements neither `matchMedia` nor the full `MediaQueryList` surface.
 * `next-themes` calls `matchMedia("(prefers-color-scheme: dark)")` to resolve
 * the `system` theme, so the provider cannot render without it.
 *
 * The stub reports `matches: false` (light) and is intentionally inert — it
 * exists so the theme provider is renderable in unit tests, not to simulate a
 * colour-scheme preference. Reduced-motion behaviour is CSS-only (the global
 * rule in `tokens.css`) and is covered by the token-mirror test.
 */
function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    // The legacy and modern listener APIs are inert no-ops: nothing in this
    // package subscribes to a colour-scheme change.
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => createMediaQueryList(query);
}
