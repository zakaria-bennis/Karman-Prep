/*
 * The bridge from the question bank's skills to the portal's 72 (founder, 2026-11-15, in
 * src/app/dev/shell/skills72.ts). The bank is still tagged with the 39 catalog skills, split into
 * 92 sub-skills (src/lib/subskills/taxonomy.ts), and every level a student earns is stored against
 * a sub-skill. Until the bank is retagged into the 72 (decided 2026-11-18, not done), each of the 72
 * reads the sub-skills that cover what it tests. When the retag lands, this file is deleted and
 * the levels are read by the 72 directly.
 *
 * Pure data and arithmetic, safe on the client.
 */
import type { SkillLevel } from "@/components/portal/skill-levels";

const RW = (id: string) => `rw-skill-${id}`;
const MA = (id: string) => `ma-skill-${id}`;
const CID = (k: string) => RW(`central-ideas-and-details--${k}`);
const COE = (k: string) => RW(`command-of-evidence--${k}`);
const INF = (k: string) => RW(`inferences--${k}`);
const WIC = (k: string) => RW(`words-in-context--${k}`);
const TSP = (k: string) => RW(`text-structure-and-purpose--${k}`);
const CTC = (k: string) => RW(`cross-text-connections--${k}`);
const SYN = (k: string) => RW(`rhetorical-synthesis--${k}`);
const TRN = (k: string) => RW(`transitions--${k}`);
const LE1 = (k: string) => MA(`linear-equations-in-one-variable--${k}`);
const LE2 = (k: string) => MA(`linear-equations-in-two-variables--${k}`);
const LF = (k: string) => MA(`linear-functions--${k}`);
const SYS = (k: string) => MA(`systems-of-two-linear-equations-in-two-variables--${k}`);
const INQ = (k: string) => MA(`linear-inequalities-in-one-or-two-variables--${k}`);
const EQX = (k: string) => MA(`equivalent-expressions--${k}`);
const NLE = (k: string) =>
  MA(`nonlinear-equations-in-one-variable-and-systems-of-equations-in-two-variables--${k}`);
const NLF = (k: string) => MA(`nonlinear-functions--${k}`);
const RAT = (k: string) => MA(`ratios-rates-proportional-relationships-and-units--${k}`);
const PCT = (k: string) => MA(`percentages--${k}`);
const ONE = (k: string) =>
  MA(`one-variable-data-distributions-and-measures-of-center-and-spread--${k}`);
const TWO = (k: string) => MA(`two-variable-data-models-and-scatterplots--${k}`);
const AV = (k: string) => MA(`area-and-volume--${k}`);
const LAT = (k: string) => MA(`lines-angles-and-triangles--${k}`);
const RTT = (k: string) => MA(`right-triangles-and-trigonometry--${k}`);
const CIR = (k: string) => MA(`circles--${k}`);

/** Each of the 72, by its name in skills72.ts, and the sub-skills whose answers stand for it. */
export const BRIDGE: Readonly<Record<string, readonly string[]>> = {
  // Information and Ideas
  "Main idea": [CID("main")],
  "Key details": [CID("detail"), CID("literary")],
  "Evidence from a text": [COE("quote")],
  "Evidence from research": [COE("claim")],
  "Reading tables": [COE("data")],
  "Reading graphs": [COE("data")],
  "Completing an argument": [INF("complete")],
  "Inferring from findings": [INF("data")],
  // Craft and Structure
  "Precise word choice": [WIC("precise")],
  "Advanced vocabulary": [WIC("meaning")],
  "Meaning in context": [WIC("meaning")],
  "Text structure": [TSP("structure")],
  "Main purpose": [TSP("purpose")],
  "Function of a sentence": [TSP("underlined")],
  "Comparing two texts": [CTC("compare")],
  "Responding across texts": [CTC("respond")],
  // Expression of Ideas
  "Notes: similarities and differences": [SYN("compare")],
  "Notes: presenting a study": [SYN("explain"), SYN("detail")],
  "Notes: writing for a goal": [
    SYN("audience"),
    SYN("example"),
    SYN("emphasize"),
    SYN("generalize"),
  ],
  "Transitions: adding on": [TRN("addition"), TRN("example"), TRN("clarify")],
  "Transitions: contrast": [TRN("contrast")],
  "Transitions: cause and sequence": [TRN("cause"), TRN("sequence")],
  // Standard English Conventions: one catalog skill each
  "Sentence boundaries": [RW("sentence-boundaries-and-joining-independent-clauses")],
  "Linking clauses": [RW("joining-main-and-dependent-clauses")],
  "Essential and extra details": [
    RW("essential-versus-nonessential-information-including-names-and-titles"),
  ],
  "Colons and dashes": [RW("colons-and-dashes-introducing-explanations-or-lists")],
  "Lists and series": [RW("lists-and-series")],
  "Unneeded punctuation": [RW("unnecessary-punctuation-within-a-sentence")],
  "Subject-verb agreement": [RW("subject-verb-agreement")],
  "Pronoun agreement": [RW("pronoun-antecedent-agreement")],
  "Verb forms": [RW("finite-versus-nonfinite-verb-forms")],
  "Verb tense": [RW("verb-tense-and-aspect")],
  "Modifier placement": [RW("modifier-placement")],
  "Plurals and possessives": [RW("plurals-possessives-and-contractions")],
  // Algebra
  "Solving linear equations": [LE1("solve"), LE1("expression")],
  "Number of solutions": [LE1("count")],
  "Equations from words": [LE1("story"), LE2("write")],
  "Slope and rate of change": [LF("slope"), LE2("context")],
  "Graphs of lines": [LE2("graph"), LF("graph")],
  "Parallel and perpendicular lines": [LE2("parallel")],
  "Linear functions": [LF("evaluate")],
  "Solving systems": [SYS("solve")],
  "Systems in context": [SYS("story"), SYS("count")],
  "Linear inequalities": [INQ("graph"), INQ("story"), INQ("solve")],
  // Advanced Math
  "Expanding and factoring": [EQX("factor")],
  "Rational expressions": [EQX("rational")],
  "Exponents and radicals": [EQX("poly")],
  "Solving quadratics": [NLE("quadratic"), NLE("count")],
  "Graphs of quadratics": [NLF("quadratic")],
  "Exponential functions": [NLF("exponential")],
  "Radical and rational equations": [NLE("radical"), NLE("rational")],
  "Nonlinear systems": [NLE("system")],
  Polynomials: [NLF("zeros")],
  "Functions and transformations": [NLF("rules")],
  // Problem-Solving and Data Analysis
  "Ratios and proportions": [RAT("ratio")],
  "Units and conversions": [RAT("rate"), RAT("convert")],
  Percentages: [PCT("change"), PCT("of")],
  "Mean, median and spread": [ONE("center"), ONE("spread")],
  "Reading data displays": [ONE("read")],
  Scatterplots: [TWO("fit"), TWO("models")],
  Probability: [MA("probability-and-conditional-probability")],
  "Samples and margin of error": [MA("inference-from-sample-statistics-and-margin-of-error")],
  "Studies and experiments": [
    MA("evaluating-statistical-claims-observational-studies-and-experiments"),
  ],
  // Geometry and Trigonometry
  "Area and perimeter": [AV("area"), AV("scale")],
  "Volume and surface area": [AV("volume")],
  "Lines and angles": [LAT("parallel")],
  Triangles: [LAT("similar"), LAT("angles")],
  "Right triangles": [RTT("pythagoras")],
  "Trigonometric ratios": [RTT("trig")],
  Circles: [CIR("measure")],
  "Circle equations": [CIR("equation")],
  Radians: [CIR("measure")],
};

/** The portal's four levels: Not started, Learning, Understanding, Proficient. */
export type PortalLevel = 0 | 1 | 2 | 3;

/**
 * The stored five (Not started, New, Learning, Understanding, Conquered) said in the portal's four.
 * New and Learning are both Learning; Conquered is Proficient. The rule that moves a skill up is
 * unchanged (src/lib/levels/rules.ts).
 */
export const toPortalLevel = (level: SkillLevel): PortalLevel => ([0, 1, 1, 2, 3] as const)[level];

/**
 * One of the 72's level from the levels of its sub-skills: the average of the ones the student has
 * practiced, rounded down, so practicing one corner of a skill does not make the whole of it
 * Proficient. Not started while none is practiced.
 */
export function bridgedLevel(
  name: string,
  levels: ReadonlyMap<string, SkillLevel> | Readonly<Record<string, SkillLevel>>
): PortalLevel {
  const get = (id: string) =>
    levels instanceof Map ? levels.get(id) : (levels as Record<string, SkillLevel>)[id];
  const practiced = (BRIDGE[name] ?? [])
    .map(get)
    .filter((l): l is SkillLevel => l !== undefined && l > 0)
    .map(toPortalLevel);
  if (practiced.length === 0) return 0;
  return Math.floor(practiced.reduce<number>((a, b) => a + b, 0) / practiced.length) as PortalLevel;
}

/** How many of the 72 read each sub-skill (a few are shared by two). */
const SHARERS = new Map<string, number>();
for (const subs of Object.values(BRIDGE))
  for (const id of subs) SHARERS.set(id, (SHARERS.get(id) ?? 0) + 1);

/**
 * How many live questions stand behind one of the 72: the sum over its sub-skills, a shared
 * sub-skill's questions split evenly between the skills that read it, so a side's total is the
 * bank's own.
 */
export function bridgedQuestions(name: string, countOf: (subSkillId: string) => number): number {
  return Math.round(
    (BRIDGE[name] ?? []).reduce((sum, id) => sum + countOf(id) / (SHARERS.get(id) ?? 1), 0)
  );
}

/** The first of the 72 that reads a sub-skill: where a question tagged with it is filed. */
const FIRST_READER = new Map<string, string>();
for (const [name, subs] of Object.entries(BRIDGE))
  for (const id of subs) if (!FIRST_READER.has(id)) FIRST_READER.set(id, name);

/** Which of the 72 a question in this sub-skill belongs to, or null for one not in the bridge. */
export const skillOfSubSkill = (subSkillId: string): string | null =>
  FIRST_READER.get(subSkillId) ?? null;

/** The catalog skill a skill set for one of the 72 is drawn from: its first sub-skill's. */
export function catalogSkillOf(name: string): string | null {
  const first = BRIDGE[name]?.[0];
  if (!first) return null;
  // a sub-skill id is its catalog skill's id, or that id and "--" and a key
  return first.split("--")[0];
}
