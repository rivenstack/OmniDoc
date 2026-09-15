// S-01a — flat ESLint config for the frontend Nx graph.
//
// `@nx/enforce-module-boundaries` implements the ports-only invariant
// mechanically (ADR-0002): `apps/web` may depend on `packages/ui` and
// `packages/contracts` only — never on provider SDKs. A deliberate
// illegal import must FAIL lint/CI (verified in the S-01a outcome).
import nxPlugin from "@nx/eslint-plugin";

export default [
  ...nxPlugin.configs["flat/base"],
  ...nxPlugin.configs["flat/typescript"],
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            {
              sourceTag: "scope:app",
              onlyDependOnLibsWithTags: ["scope:shared"],
              // No provider SDK may appear in the web dependency graph.
              // Admission here is a per-package allowlist change, not a review opinion.
              bannedExternalImports: [
                "openai",
                "@openrouter/*",
                "@anthropic-ai/*",
                "@google/generative-ai",
                "@google/genai",
                "cohere-ai",
                "pinecone-*",
                "@pinecone-database/*",
                "weaviate-*",
                "chromadb",
                "qdrant-*",
                "langchain",
                "@langchain/*",
              ],
            },
            {
              sourceTag: "scope:shared",
              onlyDependOnLibsWithTags: ["scope:shared"],
              bannedExternalImports: [
                "openai",
                "@openrouter/*",
                "@anthropic-ai/*",
                "@google/generative-ai",
                "@google/genai",
                "cohere-ai",
                "pinecone-*",
                "@pinecone-database/*",
                "weaviate-*",
                "chromadb",
                "qdrant-*",
                "langchain",
                "@langchain/*",
              ],
            },
            {
              sourceTag: "scope:tooling",
              onlyDependOnLibsWithTags: ["scope:shared", "scope:tooling"],
              bannedExternalImports: [
                "openai",
                "@openrouter/*",
                "@anthropic-ai/*",
                "@google/generative-ai",
                "@google/genai",
                "cohere-ai",
                "pinecone-*",
                "@pinecone-database/*",
                "weaviate-*",
                "chromadb",
                "qdrant-*",
                "langchain",
                "@langchain/*",
              ],
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/coverage/**",
      "apps/api/**",
    ],
  },
];
