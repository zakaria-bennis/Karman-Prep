#!/usr/bin/env bash
set -euo pipefail
node -e 'process.exit(process.versions.node.split(".")[0] === "22" ? 0 : 1)' || { echo "Node 22 required"; exit 1; }
npm run cf:build:release
node scripts/build/check-calculator-bundle.mjs
npx playwright test --config=playwright.cf-preview.config.ts
npm run cf:deploy
