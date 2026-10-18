#!/usr/bin/env bash
set -euo pipefail
node -e 'process.exit(process.versions.node.split(".")[0] === "22" ? 0 : 1)' || { echo "Node 22 required"; exit 1; }
npm run cf:build:release
node scripts/build/check-calculator-v2-bundle.mjs
npx playwright test --config=playwright.cf-preview.config.ts
npm run cf:deploy
secrets=$(npx wrangler secret list)
grep -q '"CALCULATOR_V2_ROLLOUT"' <<<"$secrets" || { echo "CALCULATOR_V2_ROLLOUT secret missing"; exit 1; }
