// The Library's 72 skills, settled by the founder on 2026-11-15. First written as a proposal (founder, 2026-11-15: "differentiate 72 skills ... not too
// granular ... each skill is truly testing maybe 1, 2, or a maximum of 3 unique things"). 34 in Reading
// and Writing, 38 in Math, in the SAT's own eight domains.
// The Library is built on this list. The list the question bank is still tagged with is
// src/data/curriculum/approved-skill-taxonomy.json (39 skills); it is not changed here, and no question
// has been retagged. Each skill says what it tests, so the founder can check the cut.

export const LEVELS = ["Not started", "Learning", "Understanding", "Proficient"] as const;
export const SECTIONS = ["Reading and Writing", "Math"] as const;
export type Section = (typeof SECTIONS)[number];

export interface Skill {
  name: string;
  tests: string;
  level: number;
}
export interface Domain {
  name: string;
  skills: Skill[];
}

type Raw = Record<Section, [domain: string, skills: [name: string, tests: string][]][]>;

const RAW: Raw = {
  "Reading and Writing": [
    [
      "Information and Ideas",
      [
        ["Main idea", "The central point of a short passage."],
        ["Key details", "What the text states directly."],
        ["Evidence from a text", "The quotation that best supports a claim."],
        ["Evidence from research", "The finding that supports or weakens a hypothesis."],
        ["Reading tables", "Using figures from a table to complete a claim."],
        ["Reading graphs", "Using a bar, line or scatter graph to complete a claim."],
        ["Completing an argument", "The conclusion that logically follows from the text."],
        ["Inferring from findings", "What a study's result implies, and what it does not."],
      ],
    ],
    [
      "Craft and Structure",
      [
        ["Precise word choice", "The everyday word that fits the sentence's exact meaning."],
        ["Advanced vocabulary", "Less common words, chosen by meaning."],
        ["Meaning in context", "What a familiar word means as it is used here, and its tone."],
        ["Text structure", "How a passage is organised from start to finish."],
        ["Main purpose", "Why the author wrote the text."],
        ["Function of a sentence", "What one underlined sentence does in the passage."],
        ["Comparing two texts", "Where two authors agree and where they differ."],
        ["Responding across texts", "How one author would answer the other's claim."],
      ],
    ],
    [
      "Expression of Ideas",
      [
        ["Notes: similarities and differences", "Using notes to state how two things compare."],
        ["Notes: presenting a study", "Using notes to introduce research and its findings."],
        ["Notes: writing for a goal", "Choosing the facts that fit a stated aim and audience."],
        ["Transitions: adding on", "Words that continue or add to an idea."],
        ["Transitions: contrast", "Words that turn against or concede a point."],
        ["Transitions: cause and sequence", "Words that show a result or an order in time."],
      ],
    ],
    [
      "Standard English Conventions",
      [
        ["Sentence boundaries", "Fragments, run-ons, and joining two full sentences."],
        ["Linking clauses", "Joining a main clause to a dependent one."],
        ["Essential and extra details", "Commas around added information, names and titles."],
        ["Colons and dashes", "Introducing an explanation or a list."],
        ["Lists and series", "Commas and semicolons between items."],
        ["Unneeded punctuation", "Marks that split a sentence where nothing belongs."],
        ["Subject-verb agreement", "Matching the verb to its real subject."],
        ["Pronoun agreement", "Matching a pronoun to the noun it stands for."],
        ["Verb forms", "A full verb against an -ing or to- form."],
        ["Verb tense", "The tense the timeline of the sentence needs."],
        ["Modifier placement", "Putting a describing phrase next to what it describes."],
        ["Plurals and possessives", "Plural, possessive and contraction forms."],
      ],
    ],
  ],
  Math: [
    [
      "Algebra",
      [
        ["Solving linear equations", "One variable, including fractions and brackets."],
        ["Number of solutions", "When a linear equation has none, one or infinitely many."],
        ["Equations from words", "Writing a linear equation for a situation."],
        ["Slope and rate of change", "Finding slope and saying what it means."],
        ["Graphs of lines", "Intercepts and the forms of a line's equation."],
        ["Parallel and perpendicular lines", "How the slopes of two lines relate."],
        ["Linear functions", "Evaluating f(x) and reading it in context."],
        ["Solving systems", "Two equations, by substitution or elimination."],
        ["Systems in context", "Word problems, and systems with no or many solutions."],
        ["Linear inequalities", "Solving them and reading their graphs."],
      ],
    ],
    [
      "Advanced Math",
      [
        ["Expanding and factoring", "Rewriting polynomial expressions."],
        ["Rational expressions", "Simplifying, adding and dividing fractions with variables."],
        ["Exponents and radicals", "The exponent rules, roots and fractional powers."],
        ["Solving quadratics", "Factoring, the formula, and how many solutions there are."],
        ["Graphs of quadratics", "Vertex, intercepts and the three forms."],
        ["Exponential functions", "Growth, decay and what each number means."],
        ["Radical and rational equations", "Solving them, and spotting false solutions."],
        ["Nonlinear systems", "Where a line meets a parabola or circle."],
        ["Polynomials", "Zeros, factors and the shape of the graph."],
        ["Functions and transformations", "Notation, composition and shifting a graph."],
      ],
    ],
    [
      "Problem-Solving and Data Analysis",
      [
        ["Ratios and proportions", "Ratios, rates and scaling."],
        ["Units and conversions", "Changing units, including speed and density."],
        ["Percentages", "Percent of, percent change and repeated change."],
        ["Mean, median and spread", "Centre, range and standard deviation."],
        ["Reading data displays", "Histograms, box plots and dot plots."],
        ["Scatterplots", "Lines of best fit and predicting from them."],
        ["Probability", "Simple and conditional, from two-way tables."],
        ["Samples and margin of error", "What a sample can say about a population."],
        ["Studies and experiments", "When a result can be generalised or show a cause."],
      ],
    ],
    [
      "Geometry and Trigonometry",
      [
        ["Area and perimeter", "Flat shapes, including composite ones."],
        ["Volume and surface area", "Prisms, cylinders, cones and spheres."],
        ["Lines and angles", "Angle relationships with parallel lines."],
        ["Triangles", "Angle sums, similar and congruent triangles."],
        ["Right triangles", "The Pythagorean theorem and special right triangles."],
        ["Trigonometric ratios", "Sine, cosine and tangent, and how they relate."],
        ["Circles", "Arcs, sectors and angles in a circle."],
        ["Circle equations", "The equation of a circle in the plane."],
        ["Radians", "Radians, degrees and the unit circle."],
      ],
    ],
  ],
};

/** A stand-in level for each skill, the same on every load. No student data is read. */
const standIn = (d: number, s: number) =>
  [3, 2, 3, 1, 0, 2, 3, 1, 2, 0, 3, 1][(d * 5 + s * 3) % 12];

export const SKILLS = Object.fromEntries(
  SECTIONS.map((section, k) => [
    section,
    RAW[section].map(([name, skills], d) => ({
      name,
      skills: skills.map(([skill, tests], s) => ({
        name: skill,
        tests,
        level: standIn(d + k * 4, s),
      })),
    })),
  ])
) as Record<Section, Domain[]>;
