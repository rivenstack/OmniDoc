import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `proxy.ts` sits at the app root by Next's file convention, so its test
    // does too — it is the one module under test that is not inside `app/`.
    include: ["app/**/*.test.ts", "proxy.test.ts"],
  },
});
