// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import pluginRouter from "@tanstack/eslint-plugin-router";

export default tseslint.config([
  { ignores: ["routeTree.gen.ts", ".css-modules", "src-tauri", "dist"] },
  eslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    rules: {
      "import/no-cycle": "error",
      "import/no-unresolved": "off",
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", orderImportKind: "asc" },
          pathGroups: [
            {
              pattern: "~/**",
              group: "parent",
              position: "before",
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "tauri-plugin-keyring-api",
              message: "Use ~/lib/keyring instead.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Use rustFetch() instead.",
        },
      ],
    },
  },
  {
    files: ["src/lib/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message:
            "React components (.tsx files) are not allowed in lib/ directories. Use .ts for utilities or move components to components/ directory.",
        },
      ],
    },
  },
  tseslint.configs.recommended,

  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  { settings: { react: { version: "detect" } } },

  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,
  pluginRouter.configs["flat/recommended"],
  prettier,
]);
