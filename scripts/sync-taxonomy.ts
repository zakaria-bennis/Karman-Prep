#!/usr/bin/env tsx
// ============================================================
// scripts/sync-taxonomy.mjs — regenerate the four downstream
// slug-list copies from the canonical curriculum.
//
// Run via `npm run sync:taxonomy` after touching
// src/data/curriculum/{math,reading-writing}.ts. tsx handles the
// TypeScript import + tsconfig path aliases (the `@/*` → `src/*`
// mapping that taxonomy.ts itself depends on).
//
// Why this exists: audit finding MED-15 in
// docs/question-bank-audit-2026-05-17.md. The 89-slug taxonomy
// lives in four prompt-embedded copies that all need to stay
// aligned with the running app. Manual sync drifted in the past;
// this script makes the curriculum the only thing humans edit.
//
// Targets (all idempotent — no-diff output when already aligned):
//
//   1. question-imports/chatgpt/taxonomy.txt
//        Full-file overwrite. The whole file IS the taxonomy.
//
//   2. question-imports/chatgpt/KarmanGPT.txt
//        §6 slug section, between AUTOGEN-BEGIN:taxonomy markers.
//        Line-per-slug format.
//
//   3. question-imports/stage2_classify.py
//        _SLUG_SECTION variable, between AUTOGEN-BEGIN:taxonomy
//        markers. Comma-wrapped format. SYSTEM_SPEC interpolates
//        _SLUG_SECTION via an f-string.
//
//   4. docs/ingestion/routine.md
//        §12 paste-ready prompt's slug section, between
//        AUTOGEN-BEGIN:taxonomy markers. Comma-wrapped format.
//
// Exit codes:
//   0 — all four files written
//   1 — markers missing, or a sanity-check fail
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONCEPT_SLUGS,
  SAT_DOMAINS,
  CLUSTER_BY_DOMAIN,
  type SATDomain,
} from "../src/lib/question-bank/taxonomy";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ─────────────────────────────────────────────────────────────
// Slug grouping — canonical SAT_DOMAINS order
// ─────────────────────────────────────────────────────────────

interface Group {
  domain: SATDomain;
  cluster: string;
  displayName: string; // upper-cased cluster, used in headers
  slugs: string[];
}

function groupedByDomain(): Group[] {
  return SAT_DOMAINS.map((domain) => {
    const cluster = CLUSTER_BY_DOMAIN[domain];
    return {
      domain,
      cluster,
      displayName: cluster.toUpperCase(),
      slugs: CONCEPT_SLUGS.filter((c) => c.domain === domain).map((c) => c.slug),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

type HeaderFn = (g: Group) => string;

/** Line-per-slug, two-space indent. Used by taxonomy.txt and
 *  KarmanGPT.txt §6.
 *
 *    ALGEBRA (6, domain=algebra)
 *      linear-equations-one-variable
 *      linear-equations-two-variables
 *      ...
 */
function formatGroupLinePerSlug(g: Group, header: HeaderFn): string {
  const body = g.slugs.map((s) => `  ${s}`).join("\n");
  return `${header(g)}\n${body}`;
}

/** Comma-separated, wrapped at ~70 chars, two-space indent. Used
 *  by stage2_classify.py and routine.md §12.
 *
 *    ALGEBRA (6):
 *      linear-equations-one-variable, linear-equations-two-variables,
 *      linear-inequalities, ...
 */
function formatGroupCommaWrapped(g: Group, header: HeaderFn): string {
  const indent = "  ";
  const maxLineLen = 70;
  const lines: string[] = [];
  let current = indent;
  g.slugs.forEach((slug, i) => {
    const isLast = i === g.slugs.length - 1;
    const candidate = current === indent ? `${current}${slug}` : `${current}, ${slug}`;
    if (candidate.length > maxLineLen && current !== indent) {
      lines.push(`${current},`);
      current = `${indent}${slug}`;
    } else {
      current = candidate;
    }
    if (isLast) lines.push(current);
  });
  return `${header(g)}\n${lines.join("\n")}`;
}

// ─────────────────────────────────────────────────────────────
// Marker replacement
// ─────────────────────────────────────────────────────────────

const BEGIN = "AUTOGEN-BEGIN:taxonomy";
const END = "AUTOGEN-END:taxonomy";

function replaceBetweenMarkers(content: string, newSection: string, filePath: string): string {
  const beginRegex = new RegExp(`^.*${BEGIN}.*$`, "m");
  const endRegex = new RegExp(`^.*${END}.*$`, "m");
  const beginMatch = content.match(beginRegex);
  const endMatch = content.match(endRegex);
  if (!beginMatch || !endMatch) {
    throw new Error(
      `Markers not found in ${relative(REPO_ROOT, filePath)} — ` +
        `expected lines containing '${BEGIN}' and '${END}'`
    );
  }
  if (beginMatch.index! > endMatch.index!) {
    throw new Error(`Markers out of order in ${relative(REPO_ROOT, filePath)}`);
  }
  const beginEnd = beginMatch.index! + beginMatch[0].length;
  const endStart = endMatch.index!;
  return content.slice(0, beginEnd) + "\n" + newSection + "\n" + content.slice(endStart);
}

// ─────────────────────────────────────────────────────────────
// Per-target writers
// ─────────────────────────────────────────────────────────────

function writeTaxonomyTxt(groups: Group[], totalSlugs: number): void {
  const header: HeaderFn = (g) => `${g.displayName} (${g.slugs.length}, domain=${g.domain})`;
  const lines: string[] = [
    "SAT QUESTION TAXONOMY — locked, never deviate.",
    "This file is the authoritative reference for the `domain`, `topic_cluster`,",
    "and `concept_slug` columns of the 30-column extraction CSV. Pick exactly",
    "one slug per question, never invent a value.",
    "",
    "═══════════════════════════════════════════════════════════════",
    `${SAT_DOMAINS.length} DOMAINS (use as \`domain\`, UNDERSCORES — never dashes)`,
    "═══════════════════════════════════════════════════════════════",
    ...SAT_DOMAINS,
    "",
    "═══════════════════════════════════════════════════════════════",
    `${SAT_DOMAINS.length} CLUSTERS (use as \`topic_cluster\`, 1:1 with the domain)`,
    "═══════════════════════════════════════════════════════════════",
    ...SAT_DOMAINS.map((d) => `${d.padEnd(18)} → ${CLUSTER_BY_DOMAIN[d]}`),
    "",
    "═══════════════════════════════════════════════════════════════",
    `${totalSlugs} CONCEPT SLUGS (use as \`concept_slug\`, exactly ONE per row, DASHES)`,
    "═══════════════════════════════════════════════════════════════",
    "",
  ];
  groups.forEach((g, i) => {
    lines.push(formatGroupLinePerSlug(g, header));
    if (i < groups.length - 1) lines.push("");
  });
  lines.push(
    "",
    "═══════════════════════════════════════════════════════════════",
    "Validation rules",
    "═══════════════════════════════════════════════════════════════",
    `- domain MUST be one of the ${SAT_DOMAINS.length} values above (underscores).`,
    "- topic_cluster MUST match its domain via the mapping above.",
    `- concept_slug MUST be one of the ${totalSlugs} values above (dashes).`,
    "- If a question doesn't fit cleanly, pick the closest slug and flag",
    `  needs_review with reason "Concept slug uncertain: [your alternative]"`,
    "  rather than inventing a new slug."
  );
  const path = resolve(REPO_ROOT, "question-imports/chatgpt/taxonomy.txt");
  writeFileSync(path, lines.join("\n") + "\n", "utf-8");
  reportWrite(path);
}

function writeKarmanGPT(groups: Group[], totalSlugs: number): void {
  const header: HeaderFn = (g) => `${g.displayName} (${g.slugs.length}, domain=${g.domain})`;
  const blockLines: string[] = [
    `${totalSlugs} CONCEPT SLUGS — use as \`concept_slug\`, exactly ONE per row, DASHES:`,
    "",
  ];
  groups.forEach((g, i) => {
    blockLines.push(formatGroupLinePerSlug(g, header));
    if (i < groups.length - 1) blockLines.push("");
  });
  const path = resolve(REPO_ROOT, "question-imports/chatgpt/KarmanGPT.txt");
  const content = readFileSync(path, "utf-8");
  const next = replaceBetweenMarkers(content, blockLines.join("\n"), path);
  writeFileSync(path, next, "utf-8");
  reportWrite(path);
}

function writeStage2Classify(groups: Group[], totalSlugs: number): void {
  const header: HeaderFn = (g) => `${g.displayName} (${g.slugs.length}):`;
  const slugLines: string[] = [
    `${totalSlugs} CONCEPT SLUGS (use as concept_slug, pick exactly ONE per row):`,
    "",
  ];
  groups.forEach((g, i) => {
    slugLines.push(formatGroupCommaWrapped(g, header));
    if (i < groups.length - 1) slugLines.push("");
  });
  // Wrap as a Python triple-quoted string assignment, with a doc
  // comment explaining the regen path. Marker lines are stripped
  // by replaceBetweenMarkers; the comment + variable definition
  // sit fully inside the marker block.
  const blockLines: string[] = [
    "# Regenerate via `npm run sync:taxonomy`. Don't hand-edit between",
    "# these markers — edit src/data/curriculum/*.ts instead.",
    `_SLUG_SECTION = """${slugLines.join("\n")}\n"""`,
  ];
  const path = resolve(REPO_ROOT, "question-imports/stage2_classify.py");
  const content = readFileSync(path, "utf-8");
  const next = replaceBetweenMarkers(content, blockLines.join("\n"), path);
  writeFileSync(path, next, "utf-8");
  reportWrite(path);
}

function writeRoutineMd(groups: Group[], totalSlugs: number): void {
  const header: HeaderFn = (g) => `${g.displayName} (${g.slugs.length}, domain: ${g.domain}):`;
  const blockLines: string[] = [
    `${totalSlugs} CONCEPT SLUGS (use as the \`concept_slug\` field value).`,
    "Pick the SINGLE most-relevant slug. Never invent.",
    "",
  ];
  groups.forEach((g, i) => {
    blockLines.push(formatGroupCommaWrapped(g, header));
    if (i < groups.length - 1) blockLines.push("");
  });
  const path = resolve(REPO_ROOT, "docs/ingestion/routine.md");
  const content = readFileSync(path, "utf-8");
  const next = replaceBetweenMarkers(content, blockLines.join("\n"), path);
  writeFileSync(path, next, "utf-8");
  reportWrite(path);
}

function reportWrite(path: string): void {
  console.log(`  ✓ ${relative(REPO_ROOT, path)}`);
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

function main(): void {
  const groups = groupedByDomain();
  const totalSlugs = groups.reduce((n, g) => n + g.slugs.length, 0);

  // Sanity checks — surface curriculum-shape changes explicitly so
  // anyone adding/renaming a domain notices the script's response
  // before content gets regenerated.
  if (groups.length !== 8) {
    console.error(
      `✗ Unexpected domain count: ${groups.length} (expected 8). ` +
        `Either the curriculum changed materially or SAT_DOMAINS is out of sync.`
    );
    process.exit(1);
  }
  if (totalSlugs === 0) {
    console.error("✗ Zero slugs produced — taxonomy.ts import probably failed.");
    process.exit(1);
  }

  console.log(
    `Regenerating slug-list copies — ${totalSlugs} slugs across ${groups.length} domains:`
  );
  writeTaxonomyTxt(groups, totalSlugs);
  writeKarmanGPT(groups, totalSlugs);
  writeStage2Classify(groups, totalSlugs);
  writeRoutineMd(groups, totalSlugs);
  console.log(
    "Done. Review the diff with `git diff` — if everything was already in sync there is none."
  );
}

main();
