import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Generated Convex client/server code — not hand-written.
      "src/convex/_generated/**",
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // PokemonBanner.tsx is an intentional imperative game loop: the tick
    // mutates a mutable game-state object held in a ref (g.current) and the
    // render reads it every frame. react-hooks v6's refs/purity/immutability
    // rules target idiomatic React data flow and don't apply to this
    // architecture, so they're disabled for this file only.
    files: ["src/game/PokemonBanner.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    // Template shadcn/ui components with intentional patterns that the
    // react-hooks v6 rules flag: the sidebar skeleton's random-width memo
    // (stable per mount, by design) and the carousel's embla API sync
    // (setState in an effect is the canonical shadcn implementation).
    // Not bugs — scoped off rather than rewriting third-party UI.
    files: ["src/components/ui/sidebar.tsx", "src/components/ui/carousel.tsx"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
