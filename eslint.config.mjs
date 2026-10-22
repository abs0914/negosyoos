import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "apps/web" } },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@negosyo-os/*/src/*", "**/packages/*/src/*"],
              message: "Import workspace packages only through their public package exports.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "apps/web/public/sw.js",
    "apps/web/public/sw.js.map",
    "packages/database/supabase/.branches/**",
    "packages/database/supabase/.temp/**",
  ]),
]);

export default eslintConfig;
