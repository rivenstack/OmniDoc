// Single locale/dir source for the App Router tree (S-01a stub).
// Primary locale `en` (LTR). RTL remains deferred, not closed — layout
// chrome must use logical CSS and read direction from here, never from
// scattered hardcoding.
export const locale = {
  lang: "en",
  dir: "ltr",
} as const;

export type AppLocale = typeof locale;
