import { MATH_NODES, RW_NODES } from "./index";
import { CATALOG_SKILLS } from "./skill-catalog";

export interface LegacySkillCrosswalk {
  legacyNodeId: string;
  /** Scope containment is a proposal for question review, never migrated mastery. */
  status: "covered" | "review" | "outside_catalog";
  targetSkillId: string | null;
  candidateSkillIds: string[];
  reason: string;
}

function targetId(id: string, label: string): string {
  const subject = id.startsWith("rw-") ? "reading" : "math";
  const target = CATALOG_SKILLS.find((skill) => skill.subject === subject && skill.label === label);
  if (!target) throw new Error(`Crosswalk target is missing: ${label}`);
  return target.id;
}
function covered(id: string, label: string, reason: string): LegacySkillCrosswalk {
  return {
    legacyNodeId: id,
    status: "covered",
    targetSkillId: targetId(id, label),
    candidateSkillIds: [],
    reason,
  };
}
function review(id: string, labels: string[], reason: string): LegacySkillCrosswalk {
  return {
    legacyNodeId: id,
    status: "review",
    targetSkillId: null,
    candidateSkillIds: labels.map((label) => targetId(id, label)),
    reason,
  };
}
function outside(id: string, reason: string): LegacySkillCrosswalk {
  return {
    legacyNodeId: id,
    status: "outside_catalog",
    targetSkillId: null,
    candidateSkillIds: [],
    reason,
  };
}

/** Explicit proposals for every old identity; no fallback, no database remap. */
export const LEGACY_SKILL_CROSSWALK: LegacySkillCrosswalk[] = [
  covered(
    "rw-00",
    "Central Ideas and Details",
    "Main ideas are contained in Central Ideas and Details."
  ),
  covered("rw-01", "Command of Evidence", "Description tests evidence supporting a claim."),
  covered(
    "rw-02",
    "Text Structure and Purpose",
    "Authorial purpose belongs to Text Structure and Purpose."
  ),
  covered(
    "rw-03",
    "Text Structure and Purpose",
    "Text organization belongs to Text Structure and Purpose."
  ),
  covered("rw-04", "Words in Context", "Vocabulary in context is Words in Context."),
  covered("rw-05", "Inferences", "Implicit conclusions are Inferences."),
  covered(
    "rw-06",
    "Words in Context",
    "Contextual word choice and connotation are Words in Context."
  ),
  covered(
    "rw-50",
    "Subject-verb agreement",
    "Subject-verb agreement is the same selectable skill."
  ),
  review(
    "rw-51",
    ["Finite versus nonfinite verb forms", "Verb tense and aspect"],
    "Old description mixes tense/aspect, active/passive and TO/-ING forms; classify each question."
  ),
  review(
    "rw-52",
    ["Pronoun-antecedent agreement"],
    "Old description mixes antecedent agreement with pronoun case and who/which; scope is broader than the new label."
  ),
  covered(
    "rw-53",
    "Plurals possessives and contractions",
    "Plural/possessive forms are contained in the approved combined skill."
  ),
  covered(
    "rw-54",
    "Sentence boundaries and joining independent clauses",
    "Periods and semicolons join or separate independent clauses."
  ),
  review(
    "rw-55",
    [
      "Sentence boundaries and joining independent clauses",
      "Unnecessary punctuation within a sentence",
    ],
    "Joins independent clauses but also tests unnecessary commas before compound predicates."
  ),
  covered(
    "rw-56",
    "Joining main and dependent clauses",
    "Main/dependent-clause punctuation is the approved skill."
  ),
  covered(
    "rw-57",
    "Essential versus nonessential information including names and titles",
    "Nonessential information is contained in the approved combined skill."
  ),
  covered(
    "rw-58",
    "Essential versus nonessential information including names and titles",
    "Names and titles are explicitly included in essential/nonessential information."
  ),
  review(
    "rw-59",
    [
      "Essential versus nonessential information including names and titles",
      "Lists and series",
      "Unnecessary punctuation within a sentence",
    ],
    "Old comma bucket combines lists, adjectives, essential clauses and unnecessary punctuation."
  ),
  covered(
    "rw-60",
    "Colons and dashes introducing explanations or lists",
    "Colons/dashes introduce lists or explanations."
  ),
  review(
    "rw-61",
    ["Lists and series"],
    "Lists overlap, but parallel comparisons and correlative word pairs are broader; do not force all items into lists."
  ),
  outside(
    "rw-62",
    "Direct/indirect question punctuation is not an explicit approved selectable; preserve legacy records for item review."
  ),
  covered(
    "rw-15",
    "Central Ideas and Details",
    "Central idea versus theme is contained in Central Ideas and Details."
  ),
  review(
    "rw-16",
    ["Command of Evidence", "Text Structure and Purpose"],
    "Rhetorical appeals may test argument evidence or textual purpose."
  ),
  review(
    "rw-17",
    ["Inferences", "Words in Context", "Text Structure and Purpose"],
    "Tone/point of view can test inference, word meaning or purpose depending on the ask."
  ),
  covered("rw-18", "Command of Evidence", "Citing textual evidence is Command of Evidence."),
  review(
    "rw-19",
    ["Command of Evidence", "Text Structure and Purpose"],
    "Argument strength can test evidence or structural analysis; inspect the actual ask."
  ),
  covered("rw-20", "Transitions", "Transition selection is Transitions."),
  covered("rw-21", "Cross-Text Connections", "Two-text comparison is Cross-Text Connections."),
  review(
    "rw-22",
    ["Central Ideas and Details", "Command of Evidence", "Inferences"],
    "General chart reading can test detail, evidence or inference; a required chart alone does not identify the skill."
  ),
  review(
    "rw-23",
    ["Central Ideas and Details", "Command of Evidence", "Inferences"],
    "Graph/text interpretation includes detail, evidential support and implications."
  ),
  review(
    "rw-24",
    ["Inferences", "Text Structure and Purpose"],
    "Underlying bias/perspective can test inference or authorial purpose."
  ),
  outside(
    "rw-25",
    "Standalone redundancy/conciseness is not an explicit approved selectable; preserve for review."
  ),
  review(
    "rw-26",
    ["Sentence boundaries and joining independent clauses", "Joining main and dependent clauses"],
    "Sentence combining may test different clause relationships or a broader rhetorical task."
  ),
  covered("rw-28", "Modifier placement", "Modifier placement is the same approved selectable."),
  covered("rw-30", "Command of Evidence", "Textual support is Command of Evidence."),
  covered(
    "rw-31",
    "Command of Evidence",
    "Quantitative support is Command of Evidence, not a separate selectable."
  ),
  review(
    "rw-33",
    ["Command of Evidence", "Text Structure and Purpose"],
    "Rebuttals can test evidence strength or rhetorical structure."
  ),
  covered(
    "rw-34",
    "Text Structure and Purpose",
    "Paragraph organization belongs to Text Structure and Purpose despite its old domain label."
  ),
  covered(
    "rw-35",
    "Rhetorical Synthesis",
    "Selecting information to achieve a rhetorical goal is Rhetorical Synthesis."
  ),
  review(
    "rw-36",
    ["Command of Evidence", "Text Structure and Purpose"],
    "Old description mixes argument structure and strength/limitations."
  ),
  covered(
    "rw-37",
    "Cross-Text Connections",
    "Dual-passage comparison is Cross-Text Connections despite its old domain label."
  ),
  covered(
    "rw-38",
    "Text Structure and Purpose",
    "Literary authorial purpose belongs to Text Structure and Purpose."
  ),
  covered("rw-40", "Words in Context", "Nuanced vocabulary remains Words in Context."),
  covered("rw-41", "Transitions", "Advanced transitions remain Transitions."),
  covered(
    "rw-42",
    "Command of Evidence",
    "Old RW description evaluates whether statistical evidence supports a claim."
  ),
  review(
    "rw-43",
    ["Command of Evidence", "Inferences", "Cross-Text Connections", "Rhetorical Synthesis"],
    "Integration across sources can test evidence, inference, cross-text relationships or rhetorical synthesis."
  ),
  covered("rw-45", "Words in Context", "Precise contextual word choice is Words in Context."),
  covered(
    "rw-46",
    "Text Structure and Purpose",
    "Structural effects on meaning/persuasion are Text Structure and Purpose."
  ),
  covered(
    "rw-47",
    "Command of Evidence",
    "Cross-disciplinary evidence is contained in Command of Evidence."
  ),
  review(
    "rw-48",
    ["Command of Evidence", "Text Structure and Purpose"],
    "Argument logic may test support weaknesses or textual structure."
  ),
  covered(
    "ma-00",
    "Linear equations in one variable",
    "One-variable linear equations match the approved skill."
  ),
  covered(
    "ma-01",
    "Linear equations in two variables",
    "Two-variable linear equations match the approved skill."
  ),
  covered(
    "ma-02",
    "Linear inequalities in one or two variables",
    "One/two-variable linear inequalities match the approved skill."
  ),
  covered(
    "ma-03",
    "Ratios rates proportional relationships and units",
    "Ratios/proportions are contained in the approved combined skill."
  ),
  covered("ma-04", "Percentages", "Percentages match the approved skill."),
  covered(
    "ma-05",
    "Ratios rates proportional relationships and units",
    "Unit rates/conversions are contained in the approved combined skill."
  ),
  covered(
    "ma-06",
    "Equivalent expressions",
    "Exponent simplification yields Equivalent Expressions."
  ),
  covered(
    "ma-07",
    "Equivalent expressions",
    "Algebraic simplification yields Equivalent Expressions."
  ),
  review(
    "ma-08",
    ["Linear functions", "Nonlinear functions"],
    "Generic evaluation/function notation covers both linear and nonlinear functions."
  ),
  review(
    "ma-10",
    ["Equivalent expressions", "Nonlinear functions"],
    "Polynomial introduction mixes expression properties with functional end behavior."
  ),
  covered("ma-11", "Area and volume", "Area/perimeter/volume remain within Area and Volume."),
  covered(
    "ma-12",
    "Lines angles and triangles",
    "Angle relationships are contained in Lines Angles and Triangles."
  ),
  review(
    "ma-13",
    [
      "Linear equations in two variables",
      "Lines angles and triangles",
      "Right triangles and trigonometry",
    ],
    "Coordinate geometry mixes slopes/lines, midpoints and distances; inspect each question."
  ),
  covered(
    "ma-15",
    "Systems of two linear equations in two variables",
    "Systems of linear equations match the approved skill."
  ),
  covered(
    "ma-16",
    "Linear inequalities in one or two variables",
    "Systems of linear inequalities are contained in the approved inequalities skill."
  ),
  covered(
    "ma-17",
    "Nonlinear equations in one variable and systems of equations in two variables",
    "Factoring to solve quadratic equations is nonlinear equation solving."
  ),
  covered(
    "ma-18",
    "Nonlinear equations in one variable and systems of equations in two variables",
    "Quadratic formula/discriminant belong to nonlinear equations."
  ),
  covered(
    "ma-19",
    "Nonlinear functions",
    "Vertex/axis/direction questions are Nonlinear Functions."
  ),
  review(
    "ma-20",
    [
      "Equivalent expressions",
      "Nonlinear equations in one variable and systems of equations in two variables",
      "Nonlinear functions",
    ],
    "Polynomial operations and roots/factors mix expressions, equations and functions."
  ),
  covered(
    "ma-21",
    "Equivalent expressions",
    "Rational expression operations yield Equivalent Expressions."
  ),
  review(
    "ma-22",
    [
      "Equivalent expressions",
      "Nonlinear equations in one variable and systems of equations in two variables",
    ],
    "Old description combines radical simplification with solving radical equations."
  ),
  covered(
    "ma-23",
    "Nonlinear functions",
    "Exponential modeling is contained in Nonlinear Functions."
  ),
  review(
    "ma-25",
    ["Nonlinear equations in one variable and systems of equations in two variables"],
    "Old absolute-value bucket also includes inequalities; do not relabel all as equation solving."
  ),
  review(
    "ma-26",
    ["Linear functions", "Nonlinear functions"],
    "Transformations explicitly apply to any function, not only nonlinear functions."
  ),
  review(
    "ma-27",
    ["Linear functions", "Nonlinear functions", "Two-variable data: models and scatterplots"],
    "Linear/exponential model selection may concern functions or two-variable data models."
  ),
  covered(
    "ma-28",
    "Two-variable data: models and scatterplots",
    "Scatterplots/best-fit prediction match Two-variable Data."
  ),
  covered(
    "ma-29",
    "One-variable data: distributions and measures of center and spread",
    "Measures of center/spread match One-variable Data."
  ),
  covered(
    "ma-30",
    "Probability and conditional probability",
    "Simple/compound/conditional probability match the approved combined skill."
  ),
  covered(
    "ma-31",
    "Probability and conditional probability",
    "Old description focuses on table-based conditional probability."
  ),
  covered(
    "ma-32",
    "Lines angles and triangles",
    "Triangle congruence/similarity are contained in Lines Angles and Triangles."
  ),
  review(
    "ma-33",
    ["Lines angles and triangles", "Right triangles and trigonometry"],
    "Pythagorean/right-triangle and general coordinate-distance questions share this bucket."
  ),
  covered(
    "ma-34",
    "Right triangles and trigonometry",
    "Right-triangle trigonometric ratios match the approved skill."
  ),
  covered(
    "ma-35",
    "Nonlinear equations in one variable and systems of equations in two variables",
    "Nonlinear systems match the approved combined skill."
  ),
  covered("ma-41", "Circles", "Circle equations belong to Circles."),
  covered("ma-42", "Circles", "Circle arcs/sectors belong to Circles."),
  covered(
    "ma-43",
    "Inference from sample statistics and margin of error",
    "Sampling inference/confidence/margin of error match the approved skill."
  ),
  covered(
    "ma-46",
    "Equivalent expressions",
    "Equivalent algebraic forms are Equivalent Expressions."
  ),
  covered(
    "ma-47",
    "One-variable data: distributions and measures of center and spread",
    "Listed histograms/dot plots/box plots are One-variable Data."
  ),
  outside("ma-48", "Multi-step strategy spans many domains; no single skill migration is safe."),
  outside(
    "ma-49",
    "Full-section time/calculator strategy is supplementary learning, not a selectable tested skill."
  ),
];

const crosswalkById = new Map(LEGACY_SKILL_CROSSWALK.map((row) => [row.legacyNodeId, row]));

/** Only scope-contained legacy lessons; ambiguous pools never enter canonical practice automatically. */
export function getCoveredLegacyNodes(skillId: string) {
  return [...RW_NODES, ...MATH_NODES].filter(
    (node) => crosswalkById.get(node.id)?.targetSkillId === skillId
  );
}

export function getLegacySkillMapping(nodeId: string): LegacySkillCrosswalk | undefined {
  return crosswalkById.get(nodeId);
}
