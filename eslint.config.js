import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      "svelte/no-navigation-without-resolve": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "svelte/require-each-key": "warn",
    },
  },
  {
    ignores: ["build/", ".svelte-kit/", "dist/", "node_modules/"],
  },
);
