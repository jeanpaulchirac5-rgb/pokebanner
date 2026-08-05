import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// ---------------------------------------------------------------------------
// Vitest config for the Poke-Banner engine suites. The game engine, storage
// layer and constants are pure TypeScript with no DOM dependency, so the
// default node environment is exactly right (no jsdom overhead).
// ---------------------------------------------------------------------------
export default defineConfig({
  resolve: {
    // Mirror the web app's @ alias (vite.config.ts) so the render smoke
    // tests can import @/convex/_generated/api and other @-prefixed modules.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Pure-engine suites run in the default node environment; the render
    // smoke tests opt into jsdom via their per-file @vitest-environment
    // directive, and the release-URL regression suite lives under src/lib.
    include: ["src/game/**/*.test.{ts,tsx}", "src/lib/**/*.test.ts"],
  },
});
