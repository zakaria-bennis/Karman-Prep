#!/usr/bin/env node
// Writes the overnight env file: a copy of the main checkout's .env.local that
// points at the LOCAL Supabase stack and switches off outside services.
// It never prints a value. Usage (defaults shown):
//   node scripts/overnight/write-overnight-env.mjs \
//     --source /Users/zakariabennis/Karman-Prep/.env.local \
//     --out /Users/zakariabennis/Karman-Prep-wt/overnight.env.local \
//     --stack /Users/zakariabennis/Karman-Prep-wt/local-supabase
import { execFileSync } from "node:child_process";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (pairs, arg, i, all) =>
        arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs,
      []
    )
);
const SOURCE = args.source ?? "/Users/zakariabennis/Karman-Prep/.env.local";
const OUT = args.out ?? "/Users/zakariabennis/Karman-Prep-wt/overnight.env.local";
const STACK = args.stack ?? "/Users/zakariabennis/Karman-Prep-wt/local-supabase";

// Outside services that must not be reachable from local runs.
const BLANK = [
  "RESEND_API_KEY",
  "SLACK_BOT_TOKEN",
  "SLACK_SIGNING_SECRET",
  "CAL_API_KEY",
  "CAL_OAUTH_CLIENT_SECRET",
  "ZOOM_CLIENT_SECRET",
  "FIREFLIES_API_KEY",
  "SENTRY_AUTH_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "GITHUB_PAT",
  // No image-generation spend tonight (brief), so the image keys are off too.
  "FAL_KEY",
  "OPENAI_IMAGES_API_KEY",
];

const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json", "--workdir", STACK], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
);
const LOCAL_URL = "http://127.0.0.1:54321";
if (status.API_URL !== LOCAL_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
  console.error("✗ Local Supabase is not running on 127.0.0.1:54321. Start it first.");
  process.exit(1);
}

const REPLACE = {
  NEXT_PUBLIC_SUPABASE_URL: LOCAL_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  // Stripe return links and emails must never send a local run to the live site.
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  // Default persona. Switch roles as described in docs/overnight/local-db.md.
  DEV_IMPERSONATE_CLERK_ID: "dev_seed_student_pro",
};

const sourceText = readFileSync(SOURCE, "utf8");
const prod = {};
for (const line of sourceText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) prod[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const changed = new Set();
const out = [
  "# overnight.env.local: LOCAL Supabase (project karman-local), outside services off.",
  "# Written by scripts/overnight/write-overnight-env.mjs. Never commit, never print.",
  "# Guide: docs/overnight/local-db.md",
  "",
];
for (const line of sourceText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) {
    // Drop comments that mention the hosted project, keep every other line.
    if (/supabase\.co/i.test(line)) continue;
    out.push(line);
    continue;
  }
  const key = m[1];
  if (key in REPLACE) {
    out.push(`${key}=${REPLACE[key]}`);
    changed.add(key);
  } else if (BLANK.includes(key)) {
    out.push(`${key}=`);
    changed.add(key);
  } else {
    out.push(line);
  }
}
for (const [key, value] of Object.entries(REPLACE)) {
  if (!changed.has(key)) {
    out.push(`${key}=${value}`);
    changed.add(key);
  }
}
const text = out.join("\n").replace(/\n*$/, "\n");

// Safety checks before anything touches disk.
const leaks = [];
if (/supabase\.co/i.test(text)) leaks.push("hosted Supabase URL");
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", ...BLANK]) {
  const v = prod[key];
  if (v && v.length > 8 && text.includes(v)) leaks.push(key);
}
if (leaks.length) {
  console.error(`✗ Refusing to write: production values still present (${leaks.join(", ")}).`);
  process.exit(1);
}

writeFileSync(OUT, text, { mode: 0o600 });
chmodSync(OUT, 0o600);
console.log(`✓ Wrote ${OUT} (mode 600). Changed: ${[...changed].sort().join(", ")}`);
