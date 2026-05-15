#!/usr/bin/env node
// ============================================================
// scripts/cleanup-stale-branches.mjs — list / delete remote
// feature branches whose squash-merged commit is in main.
//
// Closes audit M5. After 60+ squash-merged PRs the remote has
// dozens of dangling `zakaria/*` refs pointing at commits that
// are no longer in the active history. This script:
//   1. Lists every `origin/zakaria/*` branch.
//   2. Skips `main`, `develop`, and anything currently checked
//      out locally.
//   3. For each candidate, checks whether `git cherry main <b>`
//      reports the branch's tip as already-applied to main
//      (the squash-merge signature). If so, the branch is safe
//      to delete.
//
// Default mode: dry-run — just prints what WOULD be deleted.
// Pass --apply to actually delete. Apply requires git push
// permissions on the remote.
//
// Usage:
//   node scripts/cleanup-stale-branches.mjs           # dry run
//   node scripts/cleanup-stale-branches.mjs --apply   # delete
// ============================================================

import { execSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const PROTECTED = new Set(["main", "develop"]);

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts });
}

function listRemoteBranches() {
  // `git for-each-ref refs/remotes/origin/*` includes HEAD; filter.
  return sh("git for-each-ref --format='%(refname:short)' refs/remotes/origin/")
    .split("\n")
    .map((s) => s.trim().replace(/^'/, "").replace(/'$/, "")) // strip quotes
    .filter(Boolean)
    .filter((b) => b.startsWith("origin/"))
    .map((b) => b.replace(/^origin\//, ""))
    .filter((b) => !PROTECTED.has(b))
    .filter((b) => b !== "HEAD");
}

function isFullyMerged(branch) {
  // `git cherry main origin/<branch>` outputs one line per commit:
  //   '+ <sha>' = NOT in main
  //   '- <sha>' = already in main (signature-matches; squash-merge OK)
  // If every line starts with '-', the branch is safe to delete.
  try {
    const out = sh(`git cherry main origin/${branch}`).trim();
    if (out === "") return true; // identical history
    const lines = out.split("\n");
    return lines.every((l) => l.startsWith("-"));
  } catch {
    return false; // play it safe on error
  }
}

console.log("Fetching latest refs...");
sh("git fetch --prune origin");

const branches = listRemoteBranches();
console.log(`Inspecting ${branches.length} remote branches...\n`);

const toDelete = [];
const skipped = [];

for (const b of branches) {
  if (isFullyMerged(b)) {
    toDelete.push(b);
  } else {
    skipped.push(b);
  }
}

if (skipped.length > 0) {
  console.log(`Skipping ${skipped.length} branches with unmerged work:`);
  for (const b of skipped) console.log(`  ${b}`);
  console.log();
}

console.log(`${toDelete.length} branches are fully merged into main and safe to delete:\n`);
for (const b of toDelete) console.log(`  origin/${b}`);

if (!APPLY) {
  console.log("\n(dry-run — pass --apply to delete)");
  process.exit(0);
}

console.log("\nDeleting...");
for (const b of toDelete) {
  try {
    sh(`git push origin --delete ${b}`, { stdio: "inherit" });
  } catch {
    console.error(`  ✗ failed to delete ${b}`);
  }
}
console.log("\n✓ done");
