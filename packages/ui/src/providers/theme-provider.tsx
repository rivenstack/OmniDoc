"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";

export type ThemeProviderProps = NextThemesProviderProps;

/**
 * Foundations / primitives — `ThemeProvider` (inventory §3).
 *
 * Source: `custom` on `next-themes` 0.4.6 (ADR-0003).
 *
 * D-01 §2.3 requires class-driven theming so the `.dark` token remap is the
 * only place dark values live. Consequences worth knowing:
 *
 * - `attribute="class"` — tokens remap under `.dark`; no component branches on
 *   theme in JS beyond `useTheme` for an icon (D-01 §2.3).
 * - `defaultTheme="system"` + `enableSystem` — follow the OS by default; the
 *   user choice is persisted by next-themes.
 * - `disableTransitionOnChange` — prevents a full-page color transition on
 *   theme switch, which would read as motion the user did not ask for.
 *
 * The root layout must set `suppressHydrationWarning` on `<html>`; next-themes
 * writes the theme class before hydration.
 *
 * `en` (LTR) is the only live locale, and RTL remains deferred — nothing here
 * depends on or asserts a direction.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
  ...props
}: NextThemesProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
