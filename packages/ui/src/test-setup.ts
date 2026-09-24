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

/**
 * jsdom has no `ResizeObserver`. `cmdk` (the Command palette primitive) and
 * Base UI positioning observe element size, so render would throw without it.
 * The stub is inert: layout measurement is meaningless in jsdom.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {
      /* inert: layout measurement is meaningless in jsdom */
    }
    unobserve(): void {
      /* inert */
    }
    disconnect(): void {
      /* inert */
    }
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

/**
 * jsdom implements neither `scrollIntoView` nor `Element.scrollTo`. `cmdk`
 * scrolls the active item into view when the command list mounts.
 */
if (typeof Element !== "undefined") {
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => undefined;
  }
  if (typeof Element.prototype.scrollTo !== "function") {
    Element.prototype.scrollTo = () => undefined;
  }
}
