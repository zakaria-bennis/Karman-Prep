/*
 * Sub-skills: the question types under each official College Board skill (founder, 2026-11-08:
 * "every sub-skill is its own square", from the table in docs/overnight/reports/portal-polish.md).
 *
 * Each catalog skill lists its sub-skills in order. A question goes to the FIRST sub-skill whose
 * test matches; the LAST one in each list has no test and takes everything left, so every
 * question lands in exactly one sub-skill and no "Other" square exists.
 *
 * Standard English Conventions is the exception: the catalog already splits it into 12 skills.
 * Each of those is one sub-skill, grouped under the two official skills (Boundaries; Form,
 * Structure, and Sense), which come from the catalog's background_mapping.
 *
 * The tests read the question's own words (and, for Transitions, the right answer's first
 * words). They run once, offline, in scripts/subskills/build-map.ts; the app reads the stored map.
 */

export interface SubSkillQuestion {
  /** The question text, passage included (any case, may hold LaTeX or HTML). */
  text: string;
  /** The text of the right answer. */
  correct: string;
  /** Whether the question has a figure, graph or table. */
  figure: boolean;
}

export interface SubSkillRule {
  /** Stable id, never shown. */
  key: string;
  label: string;
  test?: (q: NormalQuestion) => boolean;
}

export interface NormalQuestion {
  /** Lower case, HTML tags and LaTeX wrappers removed. */
  t: string;
  /** The right answer, lower case, trimmed. */
  c: string;
  figure: boolean;
}

export function normalQuestion(q: SubSkillQuestion): NormalQuestion {
  const clean = (s: string) =>
    s
      .replace(/<[^>]+>/g, " ")
      .replace(/\\[()[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  return { t: clean(q.text), c: clean(q.correct), figure: q.figure };
}

const has = (re: RegExp) => (q: NormalQuestion) => re.test(q.t);
const figOr = (re: RegExp) => (q: NormalQuestion) => q.figure || re.test(q.t);
const answerStarts = (re: RegExp) => (q: NormalQuestion) => re.test(q.c.replace(/^[^a-z]+/, ""));

const COUNT =
  /no solutions?\b|infinitely many|how many (distinct |real |different )?solutions|exactly (one|two) (real |distinct )?solutions?|discriminant/;
const STORY =
  /\$\s?\d|dollars?|\bcosts?\b|\bpays?\b|\bpaid\b|charges?|\bbuys?\b|\bsold\b|\bsells?\b|tickets?|\bhours?\b|\bminutes?\b|\bmiles?\b|\bwages?\b|\bsaves?\b|\bsavings\b|\bearns?\b|\bstore\b|\bcompany\b|\bstudents?\b|\bpeople\b|\bfee\b/;
const CONTEXT =
  /best interpretation|interpret|in this context|what does .{1,40} represent|which of the following .{0,30}represents?|meaning of/;
const XY = /xy-plane|\bgraph(ed|s)?\b|slope|intercept/;

/** Sub-skills per catalog skill id, first match wins, last is the catch-all. */
export const SUB_SKILL_RULES: Record<string, SubSkillRule[]> = {
  /* ---------------- Algebra ---------------- */
  "ma-skill-linear-equations-in-one-variable": [
    { key: "count", label: "How many solutions", test: has(COUNT) },
    { key: "story", label: "Word problems", test: has(STORY) },
    {
      key: "expression",
      label: "Value of an expression",
      test: has(/value of (\d+(\.\d+)?\s*[a-z]\b|[a-z]\s*[+−-]\s*\d|\d+\s*\(|\(\s*[a-z])/),
    },
    { key: "solve", label: "Solve for x" },
  ],
  "ma-skill-linear-equations-in-two-variables": [
    {
      key: "parallel",
      label: "Parallel and perpendicular lines",
      test: has(/parallel|perpendicular/),
    },
    { key: "context", label: "Meaning in context", test: has(CONTEXT) },
    { key: "graph", label: "Lines in the xy-plane", test: figOr(XY) },
    { key: "write", label: "Write and use the equation" },
  ],
  "ma-skill-linear-functions": [
    {
      key: "slope",
      label: "Slope and intercept",
      test: (q) => CONTEXT.test(q.t) || /slope|intercept|rate of change/.test(q.t),
    },
    {
      key: "graph",
      label: "From a graph or table",
      test: figOr(/\btable\b|\bgraph(ed|s)?\b|xy-plane/),
    },
    { key: "evaluate", label: "Evaluate and write f(x)" },
  ],
  "ma-skill-systems-of-two-linear-equations-in-two-variables": [
    { key: "count", label: "How many solutions", test: has(COUNT) },
    { key: "story", label: "Word problems", test: has(STORY) },
    { key: "solve", label: "Solve the system" },
  ],
  "ma-skill-linear-inequalities-in-one-or-two-variables": [
    {
      key: "graph",
      label: "Points and graphs",
      test: figOr(/which point|shaded|\bgraph|ordered pair|xy-plane|\(\s*-?\d+\s*,\s*-?\d+\s*\)/),
    },
    {
      key: "story",
      label: "At least and at most",
      test: has(
        /at least|at most|no more than|no less than|maximum|minimum|fewer than|more than|\$\s?\d/
      ),
    },
    { key: "solve", label: "Solve the inequality" },
  ],

  /* ---------------- Advanced Math ---------------- */
  "ma-skill-equivalent-expressions": [
    { key: "rational", label: "Rational expressions", test: has(/\\frac|\\dfrac|rational/) },
    {
      key: "factor",
      label: "Factoring",
      test: (q) => /factor/.test(q.t) || /^\(.*\)\(.*\)$/.test(q.c),
    },
    { key: "poly", label: "Polynomials, exponents and radicals" },
  ],
  "ma-skill-nonlinear-equations-in-one-variable-and-systems-of-equations-in-two-variables": [
    { key: "system", label: "Line and curve systems", test: has(/system|intersect/) },
    { key: "count", label: "How many solutions", test: has(COUNT) },
    {
      key: "radical",
      label: "Radical and absolute value",
      test: has(/√|\\sqrt|\|[^|]+\||absolute value/),
    },
    { key: "rational", label: "Rational equations", test: has(/\\frac|\\dfrac|rational/) },
    { key: "quadratic", label: "Quadratic equations" },
  ],
  "ma-skill-nonlinear-functions": [
    {
      key: "exponential",
      label: "Exponential growth and decay",
      test: (q) =>
        /percent|growth|decay|doubl|half-life|exponential|\(\s*[01]\.\d+\s*\)\s*\^|\^\s*\{?\s*\\?(frac\s*\{)?\s*[a-z]\s*\}?/.test(
          q.t
        ) && !/\^\s*\{?\s*2\b|²/.test(q.t),
    },
    {
      key: "zeros",
      label: "Zeros and factors",
      test: has(/\bzeros?\b|x-intercepts?|\broots?\b|\bfactors?\b|divisible/),
    },
    {
      key: "quadratic",
      label: "Quadratics and parabolas",
      test: has(
        /vertex|parabola|quadratic|\^\s*\{?\s*2\b|²|minimum value|maximum value|shift|translat|reflect/
      ),
    },
    { key: "rules", label: "Function rules and values" },
  ],

  /* ---------------- Problem-Solving and Data Analysis ---------------- */
  "ma-skill-ratios-rates-proportional-relationships-and-units": [
    {
      key: "rate",
      label: "Rates and density",
      test: has(/\brate\b|speed|density|per (hour|minute|second|day|week|year|mile|gallon)\b/),
    },
    {
      key: "convert",
      label: "Unit conversion",
      test: has(
        /convert|how many (inches|feet|yards|miles|meters|centimeters|millimeters|kilometers|grams|kilograms|pounds|ounces|liters|milliliters|gallons|quarts|pints|cups|seconds|minutes|hours|days|tons|square|cubic)|\b(1|one) (inch|foot|yard|mile|meter|kilometer|gram|kilogram|pound|ounce|liter|gallon|quart|pint|cup|minute|hour|day|ton)\b.{0,40}(=|equals|is equal|equivalent)/
      ),
    },
    { key: "ratio", label: "Ratios and proportions" },
  ],
  "ma-skill-percentages": [
    {
      key: "change",
      label: "Percent change",
      test: has(
        /increase|decrease|discount|\btax\b|markup|percent change|\bgrew\b|\bfell\b|reduced|raised|more than|less than/
      ),
    },
    { key: "of", label: "Percent of a number" },
  ],
  "ma-skill-one-variable-data-distributions-and-measures-of-center-and-spread": [
    {
      key: "spread",
      label: "Spread and standard deviation",
      test: has(/standard deviation|\brange\b|spread|interquartile/),
    },
    { key: "center", label: "Mean and median", test: has(/\bmean\b|median|average/) },
    { key: "read", label: "Reading a distribution" },
  ],
  "ma-skill-two-variable-data-models-and-scatterplots": [
    {
      key: "models",
      label: "Linear and exponential models",
      test: has(/exponential|which (of the following )?(equation|function)|model/),
    },
    { key: "fit", label: "Scatterplots and best fit" },
  ],
  "ma-skill-inference-from-sample-statistics-and-margin-of-error": [
    { key: "all", label: "Samples and margin of error" },
  ],
  "ma-skill-evaluating-statistical-claims-observational-studies-and-experiments": [
    { key: "all", label: "Studies and experiments" },
  ],

  /* ---------------- Geometry and Trigonometry ---------------- */
  "ma-skill-area-and-volume": [
    { key: "scale", label: "Scaling shapes", test: has(/scale|similar|times (as|the)|factor of/) },
    {
      key: "volume",
      label: "Volume of solids",
      test: has(/volume|cubes?\b|cylinder|prism|sphere|cone|pyramid|cubic/),
    },
    { key: "area", label: "Area and perimeter" },
  ],
  "ma-skill-lines-angles-and-triangles": [
    { key: "similar", label: "Similar and congruent triangles", test: has(/similar|congruent/) },
    { key: "parallel", label: "Parallel lines and angles", test: has(/parallel|transversal/) },
    { key: "angles", label: "Angles and triangles" },
  ],
  "ma-skill-right-triangles-and-trigonometry": [
    { key: "trig", label: "Sine, cosine and tangent", test: has(/\bsin|\bcos|\btan|radian/) },
    { key: "pythagoras", label: "Pythagoras and special triangles" },
  ],
  "ma-skill-circles": [
    {
      key: "equation",
      label: "Circle equations",
      test: has(/equation|\(x\s*[+−-]|x\s*\^\s*\{?2|x²|xy-plane/),
    },
    { key: "measure", label: "Arcs, angles and area" },
  ],

  /* ---------------- Information and Ideas ---------------- */
  "rw-skill-central-ideas-and-details": [
    {
      key: "literary",
      label: "Poems and stories",
      test: has(
        /(from|adapted from) (a|an|the) .{0,40}(poem|novel|story|play)|\bpoem\b|\bnovel\b|short story/
      ),
    },
    {
      key: "main",
      label: "Main idea",
      test: has(/main idea|main point|central idea|best states the main|best summarizes/),
    },
    { key: "detail", label: "Details in the text" },
  ],
  "rw-skill-command-of-evidence": [
    {
      key: "data",
      label: "Evidence from data",
      test: figOr(/\bgraph\b|\btable\b|\bchart\b|\bdata\b/),
    },
    { key: "quote", label: "Choose the quotation", test: has(/quotation|\bquote\b/) },
    { key: "claim", label: "Support or weaken a claim" },
  ],
  "rw-skill-inferences": [
    {
      key: "data",
      label: "Inferences with data",
      test: figOr(/\bgraph\b|\btable\b|\bchart\b|\bdata\b/),
    },
    { key: "complete", label: "Finish the text logically" },
  ],

  /* ---------------- Craft and Structure ---------------- */
  "rw-skill-words-in-context": [
    { key: "meaning", label: "Meaning as used", test: has(/most nearly mean|as used in the text/) },
    { key: "precise", label: "Most precise word" },
  ],
  "rw-skill-text-structure-and-purpose": [
    { key: "underlined", label: "Role of a sentence", test: has(/underlined/) },
    { key: "structure", label: "Overall structure", test: has(/overall structure/) },
    { key: "purpose", label: "Main purpose" },
  ],
  "rw-skill-cross-text-connections": [
    { key: "respond", label: "How one author would respond", test: has(/respond|react/) },
    { key: "compare", label: "Compare the two texts" },
  ],

  /* ---------------- Expression of Ideas ---------------- */
  "rw-skill-transitions": [
    {
      key: "contrast",
      label: "Contrast",
      test: answerStarts(
        /^(however|nevertheless|nonetheless|still|by contrast|in contrast|on the other hand|instead|conversely|yet|even so|that said|despite|regardless|rather|although|but|on the contrary|alternatively|be that as it may|notwithstanding|though|even though|on the other hand|whereas)\b/
      ),
    },
    {
      key: "cause",
      label: "Cause and effect",
      test: answerStarts(
        /^(therefore|thus|hence|consequently|as a result|accordingly|so\b|for this reason|because of this|as such|it follows|in turn|fittingly|in doing so|by doing so|by this|to that end|in response)/
      ),
    },
    {
      key: "sequence",
      label: "Time and place",
      test: answerStarts(
        /^(then|next|finally|later|afterward|meanwhile|subsequently|first|second|third|previously|earlier|in the meantime|at the same time|eventually|ultimately|thereafter|to begin|soon|today|currently|now|in the end|at first|before|after|until|concurrently|to date|there|here|elsewhere|simultaneously|in the past|at that)\b/
      ),
    },
    {
      key: "example",
      label: "Examples",
      test: answerStarts(
        /^(for example|for instance|specifically|in particular|to illustrate|namely|e\.g\.)/
      ),
    },
    {
      key: "addition",
      label: "Adding and comparing",
      test: answerStarts(
        /^(moreover|furthermore|additionally|in addition|also|besides|likewise|similarly|in the same way|by the same token|equally|what's more|what is more|by extension|by comparison|in comparison)\b/
      ),
    },
    { key: "clarify", label: "Clarify and emphasize" },
  ],
  "rw-skill-rhetorical-synthesis": [
    {
      key: "audience",
      label: "For a new audience",
      test: has(/unfamiliar|audience|not familiar|unaware/),
    },
    {
      key: "compare",
      label: "Compare and contrast",
      test: has(/wants to [^.]{0,80}(contrast|compare|differen|similarit|differ)/),
    },
    { key: "example", label: "Give an example", test: has(/wants to [^.]{0,80}example/) },
    {
      key: "emphasize",
      label: "Emphasize a point",
      test: has(/wants to [^.]{0,80}(emphasize|highlight|stress|underscore)/),
    },
    { key: "generalize", label: "Generalize", test: has(/wants to [^.]{0,80}(generali|broad)/) },
    {
      key: "detail",
      label: "State a specific detail",
      test: has(
        /wants to [^.]{0,80}(specify|specific|state|indicate|identify|note|provide|present (a|the) (date|year|location|number|name))/
      ),
    },
    { key: "explain", label: "Explain or introduce" },
  ],
};

/** The two official Standard English Conventions skills, keyed by background_mapping. */
export const SEC_OFFICIAL: Record<string, { id: string; label: string }> = {
  Boundaries: { id: "rw-official-boundaries", label: "Boundaries" },
  "Form, Structure, and Sense": {
    id: "rw-official-form-structure-sense",
    label: "Form, Structure, and Sense",
  },
};

/** Which sub-skill key a question belongs to, within its catalog skill. */
export function subSkillKey(skillId: string, q: SubSkillQuestion): string {
  const rules = SUB_SKILL_RULES[skillId];
  if (!rules) return "all";
  const n = normalQuestion(q);
  for (const r of rules) if (!r.test || r.test(n)) return r.key;
  return rules[rules.length - 1].key;
}
