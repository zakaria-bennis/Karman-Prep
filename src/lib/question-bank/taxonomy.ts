// ============================================================
// SAT question taxonomy — single source of truth for the
// 8 domains, 8 cluster labels, and the concept slugs that the
// PDF-ingestion routine emits and the importer validates.
//
// Slugs are 1:1 with curriculum nodes (see src/data/curriculum.ts).
// Each curriculum node carries a `concept_slug` field; this module
// derives the slug list by reading those nodes at load time, so
// there is exactly one place to add or rename a topic.
//
// Why this is fine despite the cross-file import:
//   curriculum.ts imports `SATDomain` type-only (erased at runtime),
//   and this file imports the node arrays as values. Node.js / Vite
//   resolve curriculum.ts first; by the time CONCEPT_SLUGS evaluates
//   below, RW_NODES + MATH_NODES are fully populated.
// ============================================================

import { MATH_NODES, RW_NODES } from "@/data/curriculum";

export const SAT_DOMAINS = [
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
] as const;

export type SATDomain = typeof SAT_DOMAINS[number];

/** Display label for the cluster a domain belongs to.
 *  Written into `quiz_questions.topic_cluster` by the routine. */
export const CLUSTER_BY_DOMAIN: Record<SATDomain, string> = {
  algebra:          "Algebra",
  advanced_math:    "Advanced Math",
  geometry:         "Geometry & Trigonometry",
  data_analysis:    "Problem-Solving & Data Analysis",
  info_ideas:       "Information & Ideas",
  craft_structure:  "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions:      "Standard English Conventions",
};

export interface ConceptSlug {
  slug: string;
  label: string;
  domain: SATDomain;
  /** Curriculum node id this slug refers to. 1:1 with `slug`. */
  nodeId: string;
}

/** All concept slugs (one per curriculum node). Derived at module load
 *  from the curriculum so there is no separate list to keep in sync. */
export const CONCEPT_SLUGS: ConceptSlug[] = [...RW_NODES, ...MATH_NODES].map(
  (n) => ({
    slug: n.concept_slug,
    label: n.topic,
    domain: n.domain,
    nodeId: n.id,
  })
);

// ── Indexes built once at module load ────────────────────────

const SLUG_INDEX = new Map<string, ConceptSlug>(
  CONCEPT_SLUGS.map((c) => [c.slug, c])
);
const NODE_TO_SLUG = new Map<string, string>(
  CONCEPT_SLUGS.map((c) => [c.nodeId, c.slug])
);
const DOMAIN_SET = new Set<string>(SAT_DOMAINS);

// ── Helpers ──────────────────────────────────────────────────

/** Cluster display label for a slug, or undefined for unknown slugs. */
export function clusterFromSlug(slug: string): string | undefined {
  const c = SLUG_INDEX.get(slug);
  return c ? CLUSTER_BY_DOMAIN[c.domain] : undefined;
}

/** Domain key for a slug, or undefined for unknown slugs. */
export function domainFromSlug(slug: string): SATDomain | undefined {
  return SLUG_INDEX.get(slug)?.domain;
}

/** Curriculum node id for a slug, or undefined for unknown slugs.
 *  This is what the auto-pick uses in the Review UI. */
export function nodeIdFromSlug(slug: string): string | undefined {
  return SLUG_INDEX.get(slug)?.nodeId;
}

/** Display label for a slug. Falls back to a humanized version of the
 *  slug itself for unknown values (so legacy diagnostic data still
 *  renders something readable rather than a raw kebab-case string). */
export function labelFromSlug(slug: string): string {
  const c = SLUG_INDEX.get(slug);
  if (c) return c.label;
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Slug for a curriculum node id (inverse of nodeIdFromSlug). */
export function slugFromNodeId(nodeId: string): string | undefined {
  return NODE_TO_SLUG.get(nodeId);
}

export function isValidSlug(slug: string): slug is ConceptSlug["slug"] {
  return SLUG_INDEX.has(slug);
}

export function isValidDomain(domain: string): domain is SATDomain {
  return DOMAIN_SET.has(domain);
}

/** Case-insensitive substring search across slug, label, AND domain.
 *  Powers the typeahead picker. Empty query returns the full list. */
export function searchSlugs(query: string): ConceptSlug[] {
  const q = query.trim().toLowerCase();
  if (!q) return CONCEPT_SLUGS;
  return CONCEPT_SLUGS.filter((c) =>
    c.slug.toLowerCase().includes(q) ||
    c.label.toLowerCase().includes(q) ||
    c.domain.toLowerCase().includes(q)
  );
}
