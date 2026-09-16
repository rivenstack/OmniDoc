import { defineConfig } from "vitest/config";

export default defineConfig({
  // JSX is transformed with the React 19 automatic runtime. That is pinned in
  // `tsconfig.lib.json` (`jsx: "react-jsx"`) because `tsconfig.base.json` sets
  // `jsx: "preserve"` for Next, which does not emit a runtime.
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
