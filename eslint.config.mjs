import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import globals from "globals"

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      ".artifacts/**",
      "dist/**",
      "public/engine/**",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.cjs", "**/*.mjs", "**/*.js"],
    languageOptions: { globals: { ...globals.node } },
    // Test files declare the globals they use in `/* global */` comments.
    rules: {
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript already resolves identifiers (DOM, Deno, Node) more precisely than this rule.
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
]
