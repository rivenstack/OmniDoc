import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook configuration for `@omnidoc/ui` — closes the F-01 bounded gap
 * "Storybook state coverage is not in place".
 *
 * ## Framework choice (documented deviation — see the F-02 Outcome)
 *
 * ADR-0003 pins Storybook **10.6.0** and the version ledger names
 * `@storybook/nextjs` for the frontend stack. That framework is the right
 * choice *inside the Next application* (`apps/web`), but the catalogue lives in
 * `packages/ui`, which is a framework-agnostic TypeScript source package
 * (`scope:shared`, ADR-0002). Using `@storybook/nextjs` here would require
 * adding `next` plus a Next config to a shared package — i.e. making the design
 * system depend on the app framework it is supposed to be independent of.
 * `@storybook/react-vite` is the framework for exactly this case: a React
 * component library with no application runtime.
 *
 * The **version** stays at the pinned 10.6.0, and the underlying bundler
 * (Vite 8.3.0) is the ledger's pinned Vite. The deviation is the framework
 * package only, and it is flagged to Commander/Architect rather than silently
 * substituted.
 *
 * ## Styling
 *
 * `@tailwindcss/vite` is wired in `viteFinal` so the single Tailwind v4 entry
 * (`src/styles/globals.css`, imported by `preview.tsx`) is compiled with the
 * same `@source` registrations the app uses. No second token authority exists
 * for stories.
 *
 * JSX/TSX is transformed by Vite's own default (`jsx: automatic`, React 19
 * runtime). `@vitejs/plugin-react` is deliberately **not** added: it is not a
 * pinned dependency and the framework does not require it, so adding it would
 * introduce a component-base-adjacent dependency the ADR never chose.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  typescript: {
    // Prop tables come from the real TypeScript signatures, so the catalogue
    // cannot describe props the components do not have.
    reactDocgen: "react-docgen-typescript",
  },
  async viteFinal(viteConfig) {
    return {
      ...viteConfig,
      plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
    };
  },
};

export default config;
