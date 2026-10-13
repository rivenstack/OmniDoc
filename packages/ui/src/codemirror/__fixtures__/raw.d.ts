/**
 * `?raw` imports for the fidelity fixture corpus.
 *
 * The fixtures are plain markdown documents, not code: Vite inlines them as
 * strings. This declaration is what lets `tsc` typecheck the imports.
 */
declare module "*.md?raw" {
  const contents: string;
  export default contents;
}
