// ============================================================
// ESLint flat config (ESLint 9 + eslint-config-next 16).
//
// Replaces the legacy .eslintrc.json that referenced
// `next/core-web-vitals` + `next/typescript` + `prettier`. The
// flat-config format requires importing each preset as an array
// of config objects and concatenating them.
//
// Project rules preserved exactly:
//   - react/no-unescaped-entities: error (was: warn by default)
//   - @typescript-eslint/no-unused-vars: error with _-prefix escape
// Both are CI gates per CLAUDE.md.
// ============================================================

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

export default [
  // Next.js presets — already include eslint-plugin-react,
  // react-hooks, jsx-a11y, import, and @next/eslint-plugin-next.
  ...nextCoreWebVitals,
  ...nextTypescript,

  // Disable formatting rules that conflict with Prettier.
  prettier,

  // Project-specific overrides — keep in lockstep with CLAUDE.md.
  {
    rules: {
      "react/no-unescaped-entities": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // ── react-hooks v7 new strict rules — DISABLED for now ──
      // These rules ship with eslint-plugin-react-hooks ≥ 7 and
      // catch patterns the codebase uses intentionally (hydration-
      // safe useEffect → setState, fetch-on-mount, ref assignment).
      // Each is worth its own follow-up PR with the refactor +
      // discussion of the right pattern. Keep them off here so the
      // version bump itself is a no-op behaviorally.
      // Tracked: see CONTRIBUTING.md "lint debt" or filed issues
      // for each rule's migration plan.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",

      // Off because of the catch-all page src/app/(site)/[...missing]: with it, every internal
      // address counts as "a page", so this rule would flag every plain <a>, including the ones
      // that are plain on purpose (the marketing site's links, the Cal OAuth start). Before the
      // catch-all the rule flagged none of this project's links.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Ignore generated + vendored output. ESLint 9 doesn't read
  // .eslintignore — ignores live here instead.
  //
  // scripts/ is intentionally NOT linted: the old `next lint`
  // default only covered src/ + app/, and the scripts there
  // accumulated unused vars + experimental constants over time.
  // Bringing them under the project's strict no-unused-vars rule
  // is a separate cleanup; not the scope of the v9 upgrade.
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".claude/**",
      ".husky/**",
      "out/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "tmp/**", // gitignored scratch files
      ".wrangler/**", // local Wrangler state and build output
      "tests/visual/snapshots/**",
      "tests/visual/real-device-captures/**",
      "tests/visual/regression.spec.ts-snapshots/**",
      "dist/**",
      "build/**",
      "scripts/**",
      "prototypes/**",
      ".impeccable/**", // design mocks and their helper scripts, not product code
      "supabase/**",
      "*.config.js",
      "*.config.mjs",
      "next-env.d.ts",
      "vendor/**",
    ],
  },
];
