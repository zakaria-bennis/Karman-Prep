// ============================================================
// Math — raw curriculum nodes (49 nodes).
//
// This file is data-only. Positions, content overrides, and the
// derived CurriculumNode array are computed in index.ts.
// ============================================================

import type { RawNode } from "./types";

export const maRaw: Omit<RawNode, "subject">[] = [
  // ── Tier 1 · Foundations (nodes 00–14) ──
  {
    id: "ma-00",
    tier: 1,
    difficulty: 1,
    topic: "Linear equations (one variable)",
    concept_slug: "linear-equations-one-variable",
    domain: "algebra",
    description: "Solve equations of the form ax + b = c and interpret solutions in context.",
    prereqIds: [],
  },
  {
    id: "ma-01",
    tier: 1,
    difficulty: 1,
    topic: "Linear equations (two variables)",
    concept_slug: "linear-equations-two-variables",
    domain: "algebra",
    description:
      "Write, graph, and interpret equations relating two quantities with constant rate of change.",
    prereqIds: ["ma-00"],
  },
  {
    id: "ma-02",
    tier: 1,
    difficulty: 1,
    topic: "Linear inequalities",
    concept_slug: "linear-inequalities",
    domain: "algebra",
    description:
      "Solve and graph one- and two-variable linear inequalities and interpret solution sets.",
    prereqIds: ["ma-01"],
  },
  {
    id: "ma-03",
    tier: 1,
    difficulty: 1,
    topic: "Ratios & proportions",
    concept_slug: "ratios-and-proportions",
    domain: "data_analysis",
    description:
      "Set up and solve proportion equations; apply to scale, mixtures, and real-world comparisons.",
    prereqIds: ["ma-00"],
  },
  {
    id: "ma-04",
    tier: 1,
    difficulty: 1,
    topic: "Percentages",
    concept_slug: "percentages",
    domain: "data_analysis",
    description: "Calculate percent of a number, percent change, and reverse-percent problems.",
    prereqIds: ["ma-03"],
  },
  {
    id: "ma-05",
    tier: 1,
    difficulty: 1,
    topic: "Unit rates & conversions",
    concept_slug: "unit-rates-and-conversions",
    domain: "data_analysis",
    description:
      "Convert between units using dimensional analysis and interpret rates in real-world contexts.",
    prereqIds: ["ma-03"],
  },
  {
    id: "ma-06",
    tier: 1,
    difficulty: 1,
    topic: "Properties of exponents",
    concept_slug: "properties-of-exponents",
    domain: "advanced_math",
    description: "Apply product, quotient, power, and zero-exponent rules to simplify expressions.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-07",
    tier: 1,
    difficulty: 1,
    topic: "Simplifying algebraic expressions",
    concept_slug: "simplifying-algebraic-expressions",
    domain: "advanced_math",
    description:
      "Combine like terms, distribute, and factor out common terms from polynomial expressions.",
    prereqIds: ["ma-06"],
  },
  {
    id: "ma-08",
    tier: 1,
    difficulty: 2,
    topic: "Evaluating & interpreting functions",
    concept_slug: "evaluating-and-interpreting-functions",
    domain: "advanced_math",
    description:
      "Evaluate f(x) at given values and interpret function notation in applied problems.",
    prereqIds: ["ma-02", "ma-07"],
  },
  {
    id: "ma-10",
    tier: 1,
    difficulty: 2,
    topic: "Introduction to polynomials",
    concept_slug: "introduction-to-polynomials",
    domain: "advanced_math",
    description:
      "Classify polynomials by degree, identify leading coefficients, and understand end behavior.",
    prereqIds: ["ma-07"],
  },
  {
    id: "ma-11",
    tier: 1,
    difficulty: 2,
    topic: "Area, perimeter & volume",
    concept_slug: "area-perimeter-and-volume",
    domain: "geometry",
    description:
      "Calculate area and perimeter of standard shapes and volume of 3D figures including cylinders and cones.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-12",
    tier: 1,
    difficulty: 2,
    topic: "Angle relationships",
    concept_slug: "angle-relationships",
    domain: "geometry",
    description:
      "Apply properties of supplementary, complementary, vertical, and corresponding angles.",
    prereqIds: ["ma-11"],
  },
  {
    id: "ma-13",
    tier: 1,
    difficulty: 2,
    topic: "Coordinate plane geometry",
    concept_slug: "coordinate-plane-geometry",
    domain: "geometry",
    description: "Find midpoints, distances, and slopes; interpret lines on the coordinate plane.",
    prereqIds: ["ma-12"],
  },

  // ── Tier 2 · Core — Right lobe (nodes 15–34) ──
  {
    id: "ma-15",
    tier: 2,
    difficulty: 2,
    topic: "Systems of linear equations",
    concept_slug: "systems-of-linear-equations",
    domain: "algebra",
    description:
      "Solve systems by substitution and elimination; interpret solutions as intersection points.",
    prereqIds: ["ma-01", "ma-02"],
  },
  {
    id: "ma-16",
    tier: 2,
    difficulty: 2,
    topic: "Systems of linear inequalities",
    concept_slug: "systems-of-linear-inequalities",
    domain: "algebra",
    description:
      "Graph and interpret solution regions for systems of inequalities, including optimization contexts.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-17",
    tier: 2,
    difficulty: 2,
    topic: "Quadratic equations — factoring",
    concept_slug: "quadratic-equations-factoring",
    domain: "advanced_math",
    description:
      "Factor trinomials and use the zero-product property to solve quadratic equations.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-18",
    tier: 2,
    difficulty: 2,
    topic: "Quadratic equations — quadratic formula",
    concept_slug: "quadratic-equations-quadratic-formula",
    domain: "advanced_math",
    description:
      "Apply the quadratic formula and discriminant to solve and analyze quadratic equations.",
    prereqIds: ["ma-17"],
  },
  {
    id: "ma-19",
    tier: 2,
    difficulty: 2,
    topic: "Quadratic functions — vertex form",
    concept_slug: "quadratic-functions-vertex-form",
    domain: "advanced_math",
    description:
      "Convert between standard and vertex form; identify vertex, axis of symmetry, and direction of opening.",
    prereqIds: ["ma-18"],
  },
  {
    id: "ma-20",
    tier: 2,
    difficulty: 2,
    topic: "Polynomial operations",
    concept_slug: "polynomial-operations",
    domain: "advanced_math",
    description:
      "Add, subtract, multiply, and divide polynomials; understand the relationship between roots and factors.",
    prereqIds: ["ma-10", "ma-17"],
  },
  {
    id: "ma-21",
    tier: 2,
    difficulty: 2,
    topic: "Rational expressions",
    concept_slug: "rational-expressions",
    domain: "advanced_math",
    description:
      "Simplify, add, subtract, and multiply rational expressions; identify excluded values.",
    prereqIds: ["ma-20"],
  },
  {
    id: "ma-22",
    tier: 2,
    difficulty: 2,
    topic: "Radical expressions",
    concept_slug: "radical-expressions",
    domain: "advanced_math",
    description:
      "Simplify radicals, rationalize denominators, and solve equations involving square roots.",
    prereqIds: ["ma-07"],
  },
  {
    id: "ma-23",
    tier: 2,
    difficulty: 2,
    topic: "Exponential growth & decay",
    concept_slug: "exponential-growth-and-decay",
    domain: "advanced_math",
    description:
      "Model and interpret exponential functions in real-world contexts including compound interest.",
    prereqIds: ["ma-06"],
  },
  {
    id: "ma-25",
    tier: 2,
    difficulty: 2,
    topic: "Absolute value equations",
    concept_slug: "absolute-value-equations",
    domain: "algebra",
    description:
      "Solve absolute value equations and inequalities; interpret solutions on a number line.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-26",
    tier: 2,
    difficulty: 2,
    topic: "Function transformations",
    concept_slug: "function-transformations",
    domain: "advanced_math",
    description:
      "Apply horizontal/vertical shifts, reflections, and stretches to graphs of any function.",
    prereqIds: ["ma-08", "ma-19"],
  },
  {
    id: "ma-27",
    tier: 2,
    difficulty: 2,
    topic: "Linear vs. exponential models",
    concept_slug: "linear-vs-exponential-models",
    domain: "advanced_math",
    description:
      "Determine whether a data set is best modeled by a linear or exponential function and write the equation.",
    prereqIds: ["ma-23"],
  },
  {
    id: "ma-28",
    tier: 2,
    difficulty: 2,
    topic: "Scatterplots & lines of best fit",
    concept_slug: "scatterplots-and-lines-of-best-fit",
    domain: "data_analysis",
    description:
      "Interpret scatterplot trends, estimate lines of best fit, and use them to make predictions.",
    prereqIds: ["ma-13"],
  },
  {
    id: "ma-29",
    tier: 2,
    difficulty: 2,
    topic: "Statistical measures",
    concept_slug: "statistical-measures",
    domain: "data_analysis",
    description:
      "Calculate and interpret mean, median, mode, range, and standard deviation; compare distributions.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-30",
    tier: 2,
    difficulty: 2,
    topic: "Probability basics",
    concept_slug: "probability-basics",
    domain: "data_analysis",
    description:
      "Calculate simple and compound probabilities; apply counting principles and conditional probability.",
    prereqIds: ["ma-29"],
  },
  {
    id: "ma-31",
    tier: 2,
    difficulty: 2,
    topic: "Two-way tables",
    concept_slug: "two-way-tables",
    domain: "data_analysis",
    description:
      "Interpret frequency and relative frequency in two-way tables; calculate conditional probabilities.",
    prereqIds: ["ma-30"],
  },
  {
    id: "ma-32",
    tier: 2,
    difficulty: 2,
    topic: "Triangle congruence & similarity",
    concept_slug: "triangle-congruence-and-similarity",
    domain: "geometry",
    description:
      "Apply SSS, SAS, ASA congruence and AA, SAS similarity to solve for unknown sides and angles.",
    prereqIds: ["ma-12"],
  },
  {
    id: "ma-33",
    tier: 2,
    difficulty: 2,
    topic: "Pythagorean theorem & distance formula",
    concept_slug: "pythagorean-theorem-and-distance-formula",
    domain: "geometry",
    description: "Apply the Pythagorean theorem and distance formula in 2D and 3D contexts.",
    prereqIds: ["ma-32", "ma-13"],
  },
  {
    id: "ma-34",
    tier: 2,
    difficulty: 3,
    topic: "Trigonometric ratios",
    concept_slug: "trigonometric-ratios",
    domain: "geometry",
    description:
      "Define and apply sine, cosine, and tangent (SOH-CAH-TOA) to solve right triangle problems.",
    prereqIds: ["ma-33", "ma-12"],
  },

  // ── Tier 3 · Advanced — Center bridge (nodes 35–43) ──
  {
    id: "ma-35",
    tier: 3,
    difficulty: 3,
    topic: "Nonlinear systems of equations",
    concept_slug: "nonlinear-systems-of-equations",
    domain: "advanced_math",
    description:
      "Solve systems involving one linear and one quadratic (or other nonlinear) equation algebraically and graphically.",
    prereqIds: ["ma-19"],
  },
  {
    id: "ma-41",
    tier: 3,
    difficulty: 3,
    topic: "Circle equations in standard form",
    concept_slug: "circle-equations-in-standard-form",
    domain: "geometry",
    description:
      "Write and interpret the standard form (x – h)² + (y – k)² = r² and complete the square to convert.",
    prereqIds: ["ma-33"],
  },
  {
    id: "ma-42",
    tier: 3,
    difficulty: 3,
    topic: "Arc length & sector area",
    concept_slug: "arc-length-and-sector-area",
    domain: "geometry",
    description:
      "Calculate arc length and sector area using radian measures; convert between radians and degrees.",
    prereqIds: ["ma-41"],
  },
  {
    id: "ma-43",
    tier: 3,
    difficulty: 3,
    topic: "Statistical inference & margin of error",
    concept_slug: "statistical-inference-and-margin-of-error",
    domain: "data_analysis",
    description:
      "Interpret confidence intervals, margin of error, and make valid inferences from sample data.",
    prereqIds: ["ma-30", "ma-31"],
  },

  // ── Tier 3 · Advanced — Stem (nodes 46–49) ──
  {
    id: "ma-46",
    tier: 3,
    difficulty: 3,
    topic: "Algebraic manipulation of complex expressions",
    concept_slug: "algebraic-manipulation-of-complex-expressions",
    domain: "advanced_math",
    description:
      "Rewrite expressions in equivalent forms to reveal properties and solve multi-step problems.",
    prereqIds: ["ma-21"],
  },
  {
    id: "ma-47",
    tier: 3,
    difficulty: 3,
    topic: "Interpreting complex data",
    concept_slug: "interpreting-complex-data",
    domain: "data_analysis",
    description:
      "Analyze histograms, dot plots, box plots, and combinations of data displays to draw conclusions.",
    prereqIds: ["ma-43"],
  },
  {
    id: "ma-48",
    tier: 3,
    difficulty: 3,
    topic: "Multi-step problem solving",
    concept_slug: "multi-step-problem-solving",
    domain: "advanced_math",
    description:
      "Translate complex word problems into equations, systems, or models and solve efficiently.",
    prereqIds: ["ma-46", "ma-47"],
  },
  {
    id: "ma-49",
    tier: 3,
    difficulty: 3,
    topic: "Full-section strategy",
    concept_slug: "full-section-strategy",
    domain: "advanced_math",
    description:
      "Apply time management, calculator strategy, answer estimation, and back-solving to maximize your Math score.",
    prereqIds: ["ma-48"],
  },
];
