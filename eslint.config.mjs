import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated Prisma client — not hand-written, never lint it.
    "src/generated/**",
  ]),
  {
    rules: {
      // Cosmetic only: escaping apostrophes/quotes in JSX text (e.g. &apos;)
      // has zero runtime, accessibility, or SEO impact. Not worth the noise.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
