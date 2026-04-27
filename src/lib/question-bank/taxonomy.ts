// ============================================================
// SAT question taxonomy — single source of truth for the
// 8 domains, 8 cluster labels, and 72 concept slugs that the
// PDF-ingestion routine emits and the importer validates.
//
// Why a TS constant and not a DB lookup table:
//   · 72 values, all set by editorial decision, change via code
//     review (not runtime data entry).
//   · Routine reads it for client-side validation.
//   · Importer reads it for slug + domain validation before
//     hitting Postgres.
//   · Admin UIs read it for typeahead pickers and cluster maps.
// ============================================================

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
}

/** All 72 SAT concept slugs grouped by domain (8 + 12 + 11 + 11 + 7 + 7 + 6 + 10). */
export const CONCEPT_SLUGS: ConceptSlug[] = [
  // ── ALGEBRA (8) ────────────────────────────────────────────
  { slug: "linear-equations",       label: "Linear equations",        domain: "algebra" },
  { slug: "systems-of-equations",   label: "Systems of equations",    domain: "algebra" },
  { slug: "linear-inequalities",    label: "Linear inequalities",     domain: "algebra" },
  { slug: "linear-functions",       label: "Linear functions",        domain: "algebra" },
  { slug: "slope-intercept",        label: "Slope-intercept form",    domain: "algebra" },
  { slug: "systems-of-inequalities",label: "Systems of inequalities", domain: "algebra" },
  { slug: "absolute-value",         label: "Absolute value",          domain: "algebra" },
  { slug: "linear-word-problems",   label: "Linear word problems",    domain: "algebra" },

  // ── ADVANCED MATH (12) ─────────────────────────────────────
  { slug: "quadratics",              label: "Quadratics",                  domain: "advanced_math" },
  { slug: "quadratic-vertex",        label: "Quadratic vertex form",       domain: "advanced_math" },
  { slug: "polynomials",             label: "Polynomials",                 domain: "advanced_math" },
  { slug: "exponential-functions",   label: "Exponential functions",       domain: "advanced_math" },
  { slug: "rational-expressions",    label: "Rational expressions",        domain: "advanced_math" },
  { slug: "function-notation",       label: "Function notation",           domain: "advanced_math" },
  { slug: "function-transformations",label: "Function transformations",    domain: "advanced_math" },
  { slug: "radical-equations",       label: "Radical equations",           domain: "advanced_math" },
  { slug: "exponential-growth-decay",label: "Exponential growth & decay",  domain: "advanced_math" },
  { slug: "nonlinear-systems",       label: "Nonlinear systems",           domain: "advanced_math" },
  { slug: "equivalent-expressions",  label: "Equivalent expressions",      domain: "advanced_math" },
  { slug: "complex-numbers",         label: "Complex numbers",             domain: "advanced_math" },

  // ── GEOMETRY & TRIGONOMETRY (11) ───────────────────────────
  { slug: "triangles",          label: "Triangles",                domain: "geometry" },
  { slug: "circles",            label: "Circles",                  domain: "geometry" },
  { slug: "coordinate-geometry",label: "Coordinate geometry",      domain: "geometry" },
  { slug: "trigonometry",       label: "Trigonometry",             domain: "geometry" },
  { slug: "volume",             label: "Volume",                   domain: "geometry" },
  { slug: "area-perimeter",     label: "Area & perimeter",         domain: "geometry" },
  { slug: "lines-and-angles",   label: "Lines & angles",           domain: "geometry" },
  { slug: "circle-equations",   label: "Circle equations",         domain: "geometry" },
  { slug: "arc-sector",         label: "Arc length & sector area", domain: "geometry" },
  { slug: "right-triangle-trig",label: "Right-triangle trig",      domain: "geometry" },
  { slug: "unit-circle",        label: "Unit circle",              domain: "geometry" },

  // ── PROBLEM-SOLVING & DATA ANALYSIS (11) ───────────────────
  { slug: "ratios-rates",          label: "Ratios & rates",            domain: "data_analysis" },
  { slug: "percentages",           label: "Percentages",               domain: "data_analysis" },
  { slug: "statistics-center",     label: "Statistics — center",       domain: "data_analysis" },
  { slug: "statistics-spread",     label: "Statistics — spread",       domain: "data_analysis" },
  { slug: "statistics-inference",  label: "Statistics — inference",    domain: "data_analysis" },
  { slug: "probability",           label: "Probability",               domain: "data_analysis" },
  { slug: "data-interpretation",   label: "Data interpretation",       domain: "data_analysis" },
  { slug: "two-way-tables",        label: "Two-way tables",            domain: "data_analysis" },
  { slug: "scatterplots",          label: "Scatterplots",              domain: "data_analysis" },
  { slug: "unit-conversion",       label: "Unit conversion",           domain: "data_analysis" },
  { slug: "proportional-reasoning",label: "Proportional reasoning",    domain: "data_analysis" },

  // ── INFORMATION & IDEAS (7) ────────────────────────────────
  { slug: "central-idea",          label: "Central idea",          domain: "info_ideas" },
  { slug: "command-of-evidence",   label: "Command of evidence",   domain: "info_ideas" },
  { slug: "inference",             label: "Inference",             domain: "info_ideas" },
  { slug: "quantitative-evidence", label: "Quantitative evidence", domain: "info_ideas" },
  { slug: "purpose-and-function",  label: "Purpose & function",    domain: "info_ideas" },
  { slug: "summarizing",           label: "Summarizing",           domain: "info_ideas" },
  { slug: "comparing-texts",       label: "Comparing texts",       domain: "info_ideas" },

  // ── CRAFT & STRUCTURE (7) ──────────────────────────────────
  { slug: "words-in-context",      label: "Words in context",       domain: "craft_structure" },
  { slug: "rhetorical-purpose",    label: "Rhetorical purpose",     domain: "craft_structure" },
  { slug: "text-structure",        label: "Text structure",         domain: "craft_structure" },
  { slug: "cross-text-connections",label: "Cross-text connections", domain: "craft_structure" },
  { slug: "point-of-view",         label: "Point of view",          domain: "craft_structure" },
  { slug: "argument-structure",    label: "Argument structure",     domain: "craft_structure" },
  { slug: "tone-and-style",        label: "Tone & style",           domain: "craft_structure" },

  // ── EXPRESSION OF IDEAS (6) ────────────────────────────────
  { slug: "transitions",              label: "Transitions",              domain: "expression_ideas" },
  { slug: "rhetorical-synthesis",     label: "Rhetorical synthesis",     domain: "expression_ideas" },
  { slug: "precision",                label: "Precision (concision)",    domain: "expression_ideas" },
  { slug: "sentence-combining",       label: "Sentence combining",       domain: "expression_ideas" },
  { slug: "relevance",                label: "Relevance",                domain: "expression_ideas" },
  { slug: "introductions-conclusions",label: "Introductions & conclusions", domain: "expression_ideas" },

  // ── STANDARD ENGLISH CONVENTIONS (10) ──────────────────────
  { slug: "subject-verb-agreement",label: "Subject-verb agreement",  domain: "conventions" },
  { slug: "punctuation",           label: "Punctuation",             domain: "conventions" },
  { slug: "sentence-boundaries",   label: "Sentence boundaries",     domain: "conventions" },
  { slug: "pronoun-agreement",     label: "Pronoun agreement",       domain: "conventions" },
  { slug: "modifier-placement",    label: "Modifier placement",      domain: "conventions" },
  { slug: "parallel-structure",    label: "Parallel structure",      domain: "conventions" },
  { slug: "verb-tense",            label: "Verb tense",              domain: "conventions" },
  { slug: "apostrophes",           label: "Apostrophes",             domain: "conventions" },
  { slug: "colons-and-dashes",     label: "Colons & dashes",         domain: "conventions" },
  { slug: "quotation-marks",       label: "Quotation marks",         domain: "conventions" },
];

// ── Indexes built once at module load ────────────────────────

const SLUG_INDEX = new Map<string, ConceptSlug>(
  CONCEPT_SLUGS.map((c) => [c.slug, c])
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
