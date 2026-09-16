/* Tailwind CSS 4.3.3 runs as a PostCSS plugin (ADR-0003). The token and
   source configuration lives in `@omnidoc/ui/styles/globals.css` — Tailwind
   v4 keeps its config in CSS, so there is no `tailwind.config.js`. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
