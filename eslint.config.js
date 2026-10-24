import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    files: ["**/*.{ts,tsx,js,mjs}"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: hooks.configs.recommended.rules,
  },
);
