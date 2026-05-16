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
    },
  },

  // Ignore generated + vendored output. ESLint 9 doesn't read
  // .eslintignore — ignores live here instead.
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "out/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "tests/visual/snapshots/**",
      "tests/visual/real-device-captures/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "next-env.d.ts",
    ],
  },
];
