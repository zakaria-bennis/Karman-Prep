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
//   5. scripts/lib/taxonomy.generated.mjs    (Phase 8.2)
//        Full-file overwrite. ESM constants module that .mjs
//        scripts import from instead of inlining their own copies
//        of DOMAINS / CONCEPT_SLUGS / CLUSTER_BY_DOMAIN. Single
//        source of truth for the script-side taxonomy.
//
//   6. scripts/lib/prompts/taxonomy-fragment.txt    (Phase 8.2)
//        Full-file overwrite. Prompt-fragment text active prompt
//        builders (extract-with-gemini.mjs etc.) read at runtime
//        instead of carrying a hardcoded slug block. Same drift
//        risk as taxonomy.txt but scoped to runtime LLM prompts.
//
// Exit codes:
//   0 — all six files written
//   1 — markers missing, or a sanity-check fail
//
// CI STALE-CHECK (Phase 8.2): the workflow runs `npm run sync:taxonomy`
// then `git diff --exit-code`. If anyone touches src/data/curriculum/
// or src/lib/question-bank/taxonomy.ts without regenerating, CI fails.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

import {
  CONCEPT_SLUGS,
  SAT_DOMAINS,
  CLUSTER_BY_DOMAIN,
  type SATDomain,
} from "../src/lib/question-bank/taxonomy";
import { RW_NODES, MATH_NODES } from "../src/data/curriculum";

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

// ─────────────────────────────────────────────────────────────
// Phase 8.2 writers — script-side taxonomy artifacts
// ─────────────────────────────────────────────────────────────

/**
 * Emit scripts/lib/taxonomy.generated.mjs — the canonical .mjs
 * constants module. .mjs scripts import from this file instead
 * of inlining their own copies of DOMAINS / CONCEPT_SLUGS etc.
 *
 * Frozen exports so callers can't mutate by accident. Header
 * comment marks the file as generated + names the regen command.
 */
async function writeTaxonomyGeneratedMjs(groups: Group[], totalSlugs: number): Promise<void> {
  // Build the canonical slug → node_id map by combining RW_NODES +
  // MATH_NODES (the canonical curriculum source). The taxonomy.ts
  // wrapper does this in TS; we replicate the same logic here so the
  // generated .mjs file is fully self-contained and doesn't need to
  // transitively import any TS at runtime.
  const slugToNodeIdEntries: Array<[string, string]> = [];
  const rwNodeIds: string[] = [];
  const mathNodeIds: string[] = [];
  for (const n of RW_NODES) {
    slugToNodeIdEntries.push([n.concept_slug, n.id]);
    rwNodeIds.push(n.id);
  }
  for (const n of MATH_NODES) {
    slugToNodeIdEntries.push([n.concept_slug, n.id]);
    mathNodeIds.push(n.id);
  }

  const slugDomainEntries: Array<[string, string]> = CONCEPT_SLUGS.map((c) => [c.slug, c.domain]);
  const READING_DOMAIN_SET = new Set<SATDomain>([
    "info_ideas",
    "craft_structure",
    "expression_ideas",
    "conventions",
  ]);
  const readingDomains: SATDomain[] = SAT_DOMAINS.filter((d) => READING_DOMAIN_SET.has(d));
  const mathDomains: SATDomain[] = SAT_DOMAINS.filter((d) => !READING_DOMAIN_SET.has(d));

  const conceptSlugObjects = CONCEPT_SLUGS.map((c) => `  ${JSON.stringify(c)}`).join(",\n");

  const body = `// ============================================================
// taxonomy.generated.mjs — GENERATED FILE; DO NOT EDIT BY HAND.
//
// Regenerate via:   npm run sync:taxonomy
//
// Canonical source:  src/data/curriculum/{math,reading-writing}.ts
//                    src/lib/question-bank/taxonomy.ts
//
// This module is the .mjs side's only authoritative copy of the
// SAT taxonomy. .mjs pipeline scripts must import from here rather
// than inlining DOMAINS / CONCEPT_SLUGS / CLUSTER_BY_DOMAIN.
// ============================================================

export const SUBJECTS = Object.freeze(["reading", "math"]);

export const ANSWER_FORMATS = Object.freeze(["multiple_choice", "numeric_entry"]);

export const DIFFICULTY_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

// 8 domains — order matters (matches SAT_DOMAINS in taxonomy.ts).
export const DOMAINS = Object.freeze(${JSON.stringify(SAT_DOMAINS, null, 2).split("\n").join("\n")});

export const READING_DOMAINS = Object.freeze(${JSON.stringify(readingDomains)});

export const MATH_DOMAINS = Object.freeze(${JSON.stringify(mathDomains)});

// Topic cluster string each domain rolls up to (1:1).
export const CLUSTER_BY_DOMAIN = Object.freeze(${JSON.stringify(CLUSTER_BY_DOMAIN, null, 2)});

// Distinct topic_cluster values, ordered to match DOMAINS.
export const TOPIC_CLUSTERS = Object.freeze(
  DOMAINS.map((d) => CLUSTER_BY_DOMAIN[d])
);

// All ${totalSlugs} concept slugs as { slug, domain, cluster } objects.
export const CONCEPT_SLUGS = Object.freeze([
${conceptSlugObjects}
]);

// Bare-slug array for prompt-side enumeration.
export const CONCEPT_SLUG_VALUES = Object.freeze(CONCEPT_SLUGS.map((c) => c.slug));

// Slug → curriculum node id (orchestrator import uses this to set
// quiz_questions.node_id).
export const SLUG_TO_NODE_ID = Object.freeze(
  Object.fromEntries(${JSON.stringify(slugToNodeIdEntries)})
);

// Slug → SAT domain (one of DOMAINS).
export const SLUG_TO_DOMAIN = Object.freeze(
  Object.fromEntries(${JSON.stringify(slugDomainEntries)})
);

// Subject → ordered list of node ids in that subject's curriculum.
export const RW_NODE_IDS = Object.freeze(${JSON.stringify(rwNodeIds)});
export const MATH_NODE_IDS = Object.freeze(${JSON.stringify(mathNodeIds)});

// Convenience helpers — pure, no IO. Mirror the TS taxonomy.ts API.
export function isValidDomain(value) {
  return typeof value === "string" && DOMAINS.includes(value);
}
export function isValidSlug(value) {
  return typeof value === "string" && CONCEPT_SLUG_VALUES.includes(value);
}
export function subjectFromDomain(domain) {
  return READING_DOMAINS.includes(domain) ? "reading" : "math";
}
export function nodeIdFromSlug(slug) {
  return SLUG_TO_NODE_ID[slug];
}
export function clusterFromSlug(slug) {
  const domain = SLUG_TO_DOMAIN[slug];
  return domain ? CLUSTER_BY_DOMAIN[domain] : undefined;
}
`;
  const path = resolve(REPO_ROOT, "scripts/lib/taxonomy.generated.mjs");
  // Format via prettier so the file is stable across regen + idempotent
  // for the CI stale-check. Inherits the repo's prettier config via
  // `resolveConfig` — the same way `prettier --write` does on the CLI.
  const prettierConfig = await prettier.resolveConfig(path);
  const formatted = await prettier.format(body, {
    ...(prettierConfig ?? {}),
    filepath: path,
    parser: "babel",
  });
  writeFileSync(path, formatted, "utf-8");
  reportWrite(path);
}

/**
 * Emit scripts/lib/prompts/taxonomy-fragment.txt — the prompt
 * fragment runtime prompt builders read instead of carrying a
 * hardcoded slug block. Format mirrors taxonomy.txt for human
 * readability inside LLM prompts.
 */
function writePromptFragment(groups: Group[], totalSlugs: number): void {
  const header: HeaderFn = (g) => `${g.displayName} (${g.slugs.length}, domain=${g.domain})`;
  const lines: string[] = [
    `# Canonical SAT taxonomy — ${totalSlugs} concept slugs, ${SAT_DOMAINS.length} domains.`,
    "# Generated by scripts/sync-taxonomy.ts. Regenerate via `npm run sync:taxonomy`.",
    "# DO NOT EDIT BY HAND — edit src/data/curriculum/*.ts instead.",
    "",
    `${SAT_DOMAINS.length} DOMAINS (use as \`domain\`, underscores — never dashes):`,
    ...SAT_DOMAINS.map((d) => `  ${d}`),
    "",
    `${SAT_DOMAINS.length} CLUSTERS (1:1 with domain, use as \`topic_cluster\`):`,
    ...SAT_DOMAINS.map((d) => `  ${d.padEnd(18)} → ${CLUSTER_BY_DOMAIN[d]}`),
    "",
    `${totalSlugs} CONCEPT SLUGS (use as \`concept_slug\`, exactly ONE per row, dashes):`,
    "",
  ];
  groups.forEach((g, i) => {
    lines.push(formatGroupLinePerSlug(g, header));
    if (i < groups.length - 1) lines.push("");
  });
  const path = resolve(REPO_ROOT, "scripts/lib/prompts/taxonomy-fragment.txt");
  writeFileSync(path, lines.join("\n") + "\n", "utf-8");
  reportWrite(path);
}

function reportWrite(path: string): void {
  console.log(`  ✓ ${relative(REPO_ROOT, path)}`);
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
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
  // Phase 8.2 — script-side artifacts (.mjs constants + prompt fragment).
  await writeTaxonomyGeneratedMjs(groups, totalSlugs);
  writePromptFragment(groups, totalSlugs);
  console.log(
    "Done. Review the diff with `git diff` — if everything was already in sync there is none."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
