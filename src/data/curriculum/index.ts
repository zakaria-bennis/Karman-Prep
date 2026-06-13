// ============================================================
// Karman Learn — Curriculum Data (Source of Truth)
// ============================================================
//
// 📖 NON-DEVELOPER EDITING GUIDE
// ────────────────────────────────────────────────────────────
//
// QUICK EDITS (safe — no developer needed):
//
//   • Change a topic name or description:
//     Search for the topic you want (e.g. "Comma usage"). Edit the
//     `topic:` or `description:` string. Save.
//
//   • Update lesson notes (the textbook section inside the lesson overlay):
//     Find the node and edit its `textbook_content:` field. You can
//     write plain English with markdown — use `**bold**`, `*italic*`,
//     numbered lists `1.`, and bullet lists `-`.
//     For math formulas wrap them in dollar signs:
//       • Inline math:  $x^2 + 3x = 10$
//       • Block math:   $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
//     Two backslashes required before any LaTeX command (\\frac, \\sqrt).
//
//   • Update a node's Desmos strategy (Math only):
//     Edit `desmos_strategy:` — a plain-English description of how to
//     solve this type of question using Desmos. Example:
//       "Graph both sides as y1 = and y2 =, then read off the
//        intersection point."
//
//   • Reorder or delete a node: DO NOT do this without a developer.
//     Node IDs are referenced by the database and by other nodes'
//     prereqIds. Renaming an ID will break student progress records.
//
// QUIZ QUESTIONS are NOT stored in this file. They live in the
// database and are managed in the admin UI at /admin/curriculum.
// See the admin tool to add, edit, or remove questions.
//
// DIFFICULTY:  1 = beginner, 2 = intermediate, 3 = hard.
//              (Separate from quiz-question difficulty, which has 4
//              levels: foundational, intermediate, advanced, mastery.)
//
// PREREQS:     Each node lists which nodes must be mastered before it
//              unlocks. Removing an ID from `prereqIds` makes the node
//              easier to reach. Adding one makes it harder to unlock.
//
// ADDING NODES: Do NOT add nodes here without a developer. Each new
//              node requires a matching entry in the rwPos / mathPos
//              position arrays.
//
// POSITIONS:   Computed automatically from parametric heart (R&W)
//              and brain-lobe (Math) curves. Do not edit manually.
// ============================================================

import type { CurriculumNode, NodeStatus, RawNode, Subject, Tier, AtmosphereTier } from "./types";
import { rwRaw } from "./reading-writing";
import { maRaw } from "./math";

export type { CurriculumNode, NodeStatus, Subject, Tier, AtmosphereTier } from "./types";

export const LOBE_LAYOUT = {
  // Each lobe is a vertical ellipse.
  cy: 0.5, // both lobes share the same vertical center
  rx: 0.17, // horizontal half-width
  ry: 0.38, // vertical half-height

  reading: { cx: 0.29 }, // left lobe (Reading & Writing)
  math: { cx: 0.71 }, // right lobe (Math)

  // Atmospheric strip at the very top of the map (Stratosphere).
  // Nodes never go above this y.
  topLimit: 0.08,
  bottomLimit: 0.94,
};

/**
 * Distribute `count` nodes inside an elliptical lobe, restricted to a
 * horizontal band (yFrac is fraction of ry, −1 = top, +1 = bottom).
 * Deterministic for the same (cx, cy, count, seed).
 */
function distributeInLobe(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  yFracMin: number,
  yFracMax: number,
  count: number,
  seed: number
): [number, number][] {
  const pts: [number, number][] = [];

  // Use a mild low-discrepancy sequence (Halton-like) so the nodes scatter
  // nicely across the band instead of clustering.
  const phi1 = 0.7548776662466927;
  const phi2 = 0.5698402909980532;
  let s1 = (seed * 0.6180339887) % 1;
  let s2 = (seed * 0.3141592653) % 1;

  for (let i = 0; i < count; i++) {
    s1 = (s1 + phi1) % 1;
    s2 = (s2 + phi2) % 1;

    const yFrac = yFracMin + s1 * (yFracMax - yFracMin);
    const y = cy + yFrac * ry;

    // Max x-offset inside the ellipse at this y
    const maxOff = rx * Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * 0.9;
    const x = cx + (2 * s2 - 1) * maxOff;

    pts.push([+x.toFixed(3), +y.toFixed(3)]);
  }
  return pts;
}

// ── Pre-computed positions ────────────────────────────────────
// Both subjects share the same brain. Reading nodes live in the left lobe,
// Math nodes live in the right lobe. Tier 1 sits near the bottom of the
// lobe (Troposphere), Tier 3 near the top (Stratosphere).

const { cy: LOBE_CY, rx: LOBE_RX, ry: LOBE_RY, reading: L_READ, math: L_MATH } = LOBE_LAYOUT;

// Tier y-bands (as fractions of ry, negative = up)
const T1_YMIN = 0.2,
  T1_YMAX = 0.82; // bottom of lobe
const T2_YMIN = -0.28,
  T2_YMAX = 0.38; // middle
const T3_YMIN = -0.84,
  T3_YMAX = -0.22; // top of lobe

// Reading & Writing — left lobe
const rwPos: [number, number][] = [
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T1_YMIN, T1_YMAX, 20, 11),
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T2_YMIN, T2_YMAX, 17, 47),
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T3_YMIN, T3_YMAX, 12, 83),
];

// Math — right lobe
const mathPos: [number, number][] = [
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T1_YMIN, T1_YMAX, 13, 113),
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T2_YMIN, T2_YMAX, 19, 151),
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T3_YMIN, T3_YMAX, 8, 193),
];

/** Best-guess cluster label when a node hasn't set its own. */
function defaultCluster(tier: Tier, subject: Subject): string {
  if (subject === "reading") {
    if (tier === 1) return "Foundational Reading Skills";
    if (tier === 2) return "Core Argumentation & Evidence";
    return "Advanced Synthesis";
  }
  if (tier === 1) return "Foundational Algebra & Arithmetic";
  if (tier === 2) return "Core Functions & Geometry";
  return "Advanced Math & Strategy";
}

// ── Per-node content overrides ───────────────────────────────
// Non-technical editors can add entries here to supply textbook
// content and Desmos strategies. Any node not listed gets a
// short auto-generated placeholder.

const NODE_CONTENT: Partial<
  Record<
    string,
    {
      textbook_content?: string;
      desmos_strategy?: string;
      topic_cluster?: string;
      video_url?: string | null;
      estimated_video_length_seconds?: number;
    }
  >
> = {
  "rw-00": {
    topic_cluster: "Information and Ideas",
    textbook_content: `Every SAT passage has one **main idea** — the single sentence a good summary would begin with. Your job is to strip away examples, quotes, and qualifying clauses until you're left with that one sentence.

Most passages follow a predictable shape:

1. Open with a situation, claim, or observation.
2. Expand with 2–3 supporting details.
3. Close with a restatement or mild counterargument.

**Watch for:**
- Topic sentences that open or close paragraphs.
- Transition words like *however*, *therefore*, and *in contrast* — they often signal a shift back to the main idea.
- Repeated nouns and phrases — repetition is a clue to what the passage cares about.

When an answer choice restates a narrow detail, it is almost never the main idea. The correct main-idea answer is broad enough to cover every paragraph.`,
    estimated_video_length_seconds: 360,
  },
  "rw-20": {
    topic_cluster: "Expression of Ideas",
    textbook_content: `Transitions tell the reader *how* two ideas relate. The SAT tests your ability to pick the transition that matches the logical relationship — not just one that "sounds right."

Four families to recognize:

- **Addition** (*also, furthermore, in addition*) — second idea extends the first.
- **Contrast** (*however, but, by contrast, on the other hand*) — second idea pushes against the first.
- **Cause & effect** (*therefore, as a result, consequently*) — second idea is caused by the first.
- **Example** (*for instance, specifically, in particular*) — second idea illustrates the first.

Before picking a transition, cover the choices and restate the relationship in your own words. Only then pick the choice that matches.`,
    estimated_video_length_seconds: 420,
  },
  "ma-00": {
    topic_cluster: "Algebra — Linear Equations",
    textbook_content: `A linear equation in one variable has the form
$$ax + b = c$$

To solve, isolate $x$ by undoing each operation in reverse order.

**Worked example.** Solve $3x + 7 = 22$.

1. Subtract 7 from both sides: $3x = 15$.
2. Divide both sides by 3: $x = 5$.

**Common traps:**
- Distributing incorrectly when parentheses are involved. $-2(x - 4) = -2x + 8$, not $-2x - 8$.
- Dropping a negative sign when moving a term across the equals sign.
- Forgetting to apply an operation to *both* sides.

On the SAT, check your answer by plugging it back into the original equation — a 5-second sanity check that catches most sign errors.`,
    desmos_strategy: `**Desmos shortcut for single-variable linear equations.** Type the whole equation into a single Desmos line — for example, \`3x + 7 = 22\`. Desmos will plot a vertical line at the solution; read off the x-value. Faster than solving by hand when you only need the numeric answer.`,
    estimated_video_length_seconds: 300,
  },
  "ma-17": {
    topic_cluster: "Advanced Math — Quadratics",
    textbook_content: `A quadratic equation has the form
$$ax^2 + bx + c = 0$$

**Factoring** looks for two numbers that multiply to $ac$ and add to $b$. When those numbers exist, the quadratic factors as
$$(x + p)(x + q) = 0$$

which gives roots $x = -p$ and $x = -q$ by the zero-product property.

**Worked example.** Factor $x^2 + 5x + 6 = 0$.
Two numbers multiplying to 6 and summing to 5 are 2 and 3. So
$$(x + 2)(x + 3) = 0 \\implies x = -2 \\text{ or } x = -3$$

**When factoring fails,** use the quadratic formula (covered in the next node).`,
    desmos_strategy: `**Desmos shortcut for quadratic roots.** Enter the full quadratic into Desmos as an equation with $y$, e.g. \`y = x^2 + 5x + 6\`. Click the x-intercepts on the graph — Desmos shows the exact roots in the sidebar. Use this to verify factoring on any SAT quadratic in under 10 seconds.`,
    estimated_video_length_seconds: 480,
  },
  "ma-34": {
    topic_cluster: "Geometry — Trigonometry",
    textbook_content: `In any right triangle, for angle $\\theta$:

$$\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}}$$

$$\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$$

$$\\tan(\\theta) = \\frac{\\text{opposite}}{\\text{adjacent}}$$

Mnemonic: **SOH-CAH-TOA**.

**Worked example.** In a right triangle, the leg adjacent to a 30° angle is 6. Find the hypotenuse.

Use $\\cos(30°) = \\frac{6}{h}$, so $h = \\frac{6}{\\cos 30°} = \\frac{6}{\\sqrt{3}/2} = 4\\sqrt{3}$.`,
    desmos_strategy: `**Desmos shortcut for right-triangle trig.** Desmos is in radians by default — switch to degree mode from the wrench icon. Then just type \`sin(30)\` or \`cos(60)\` directly; Desmos evaluates and shows the decimal, which you can compare to the SAT answer choices.`,
    estimated_video_length_seconds: 540,
  },
};

// ── Assemble final node arrays ───────────────────────────────

function applyContent(
  raw: Omit<RawNode, "subject">,
  subject: Subject,
  pos: [number, number]
): CurriculumNode {
  const override = NODE_CONTENT[raw.id] ?? {};
  return {
    ...raw,
    subject,
    x: pos[0],
    y: pos[1],
    topic_cluster: override.topic_cluster ?? raw.topic_cluster ?? defaultCluster(raw.tier, subject),
    textbook_content:
      override.textbook_content ??
      `A full lesson for **${raw.topic}** is coming soon.\n\n${raw.description}\n\nThis section will include worked examples, formulas, and common SAT traps once the content team fills it in via the /admin/curriculum tool.`,
    desmos_strategy: subject === "math" ? (override.desmos_strategy ?? undefined) : undefined,
    video_url: override.video_url ?? null,
    estimated_video_length_seconds: override.estimated_video_length_seconds ?? 360,
  };
}

export const RW_NODES: CurriculumNode[] = rwRaw.map((raw, i) =>
  applyContent(raw, "reading", rwPos[i])
);

export const MATH_NODES: CurriculumNode[] = maRaw.map((raw, i) =>
  applyContent(raw, "math", mathPos[i])
);

// ── Helper functions ─────────────────────────────────────────

export function getNodes(subject: Subject): CurriculumNode[] {
  return subject === "reading" ? RW_NODES : MATH_NODES;
}

export function getNode(subject: Subject, nodeId: string): CurriculumNode | undefined {
  return getNodes(subject).find((n) => n.id === nodeId);
}

/** All prerequisite edges as (from, to) pairs — used to draw constellation lines */
export function getEdges(subject: Subject): { from: string; to: string }[] {
  return getNodes(subject).flatMap((n) =>
    n.prereqIds.map((fromId) => ({ from: fromId, to: n.id }))
  );
}

/** Nodes unlocked by completing the given node */
export function getUnlockedBy(subject: Subject, nodeId: string): CurriculumNode[] {
  return getNodes(subject).filter((n) => n.prereqIds.includes(nodeId));
}

/** First node to unlock when starting a subject for the first time */
export function getStartNode(subject: Subject): CurriculumNode {
  return getNodes(subject)[0]; // rw-00 or ma-00
}

export const TIER_LABELS: Record<Tier, string> = {
  1: "Foundations",
  2: "Core",
  3: "Advanced",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  reading: "Reading & Writing",
  math: "Math",
};

// Constellation accents from docs/brand.md — subject SIGNALS on the
// warm-dark canvas (R&W rose, Math blue), never full-page themes.
export const SUBJECT_COLORS: Record<Subject, { hex: string; glow: string; dim: string }> = {
  reading: { hex: "#D84F73", glow: "#F06A8C80", dim: "#D84F7330" }, // R&W rose
  math: { hex: "#2FA8FF", glow: "#42D9FF80", dim: "#2FA8FF30" }, // Math blue
};

// ── Atmospheric tier naming ──────────────────────────────────
// The student-facing UI (and cinematic) uses these names instead of
// the developer-facing "Tier 1/2/3". Troposphere is where a new student
// begins; the Kármán Line is the final ascent when Tier 3 is mastered.

/** Atmosphere a student is currently climbing *through* given completed-tier count. */
export function currentAtmosphere(masteredTiers: number): AtmosphereTier {
  if (masteredTiers >= 3) return "Kármán Line";
  if (masteredTiers === 2) return "Stratosphere";
  if (masteredTiers === 1) return "Mesosphere";
  return "Troposphere";
}

/** The atmosphere a student ascends *to* after completing `tier`. */
export function ascendsTo(tier: Tier): AtmosphereTier {
  if (tier === 1) return "Mesosphere";
  if (tier === 2) return "Stratosphere";
  return "Kármán Line";
}

/** The atmosphere a node belongs to (based on its curriculum tier). */
export function nodeAtmosphere(tier: Tier): AtmosphereTier {
  if (tier === 1) return "Troposphere";
  if (tier === 2) return "Mesosphere";
  return "Stratosphere";
}

export const ATMOSPHERE_CONTEXT: Record<AtmosphereTier, string> = {
  Troposphere: "The ground level. Build your foundation here.",
  Mesosphere: "The foundations are behind you. The real challenge begins here.",
  Stratosphere: "You are among the top students. Push further.",
  "Kármán Line": "You have reached the edge of the atmosphere. Mastery awaits.",
};

export const ATMOSPHERE_COLORS: Record<AtmosphereTier, { hex: string; glow: string }> = {
  Troposphere: { hex: "#2FA8FF", glow: "#2FA8FF60" }, // sky
  Mesosphere: { hex: "#C8AB6A", glow: "#C8AB6A60" }, // violet
  Stratosphere: { hex: "#F0BE72", glow: "#F0BE7260" }, // gold
  "Kármán Line": { hex: "#D84F73", glow: "#D84F7360" }, // pink
};

// ── Navigation helpers ───────────────────────────────────────

/**
 * Recommend the next node a student should tackle after finishing `nodeId`.
 * Priority:
 *   1. Next available/in-progress/partially-complete node in the same topic_cluster.
 *   2. First available node in the same tier.
 *   3. First available node in the subject overall.
 */
export function recommendedNextNode(
  subject: Subject,
  nodeId: string,
  statusMap: Map<string, NodeStatus>
): CurriculumNode | null {
  const nodes = getNodes(subject);
  const current = nodes.find((n) => n.id === nodeId);
  if (!current) return null;

  const isOpen = (n: CurriculumNode) => {
    const s = statusMap.get(n.id);
    return s === "available" || s === "in_progress" || s === "partially_complete";
  };

  // Same topic cluster
  const sameCluster = nodes.find(
    (n) => n.id !== nodeId && n.topic_cluster === current.topic_cluster && isOpen(n)
  );
  if (sameCluster) return sameCluster;

  // Same tier
  const sameTier = nodes.find((n) => n.id !== nodeId && n.tier === current.tier && isOpen(n));
  if (sameTier) return sameTier;

  // Any open
  const anyOpen = nodes.find((n) => n.id !== nodeId && isOpen(n));
  return anyOpen ?? null;
}

/** Group nodes for the admin browser: subject → tier → topic_cluster → nodes */
export function groupNodesForAdmin(): Record<
  Subject,
  Record<Tier, Record<string, CurriculumNode[]>>
> {
  const result: Record<Subject, Record<Tier, Record<string, CurriculumNode[]>>> = {
    reading: { 1: {}, 2: {}, 3: {} },
    math: { 1: {}, 2: {}, 3: {} },
  };
  for (const n of [...RW_NODES, ...MATH_NODES]) {
    const cluster = n.topic_cluster;
    const tier = n.tier as Tier;
    const subj = n.subject;
    if (!result[subj][tier][cluster]) result[subj][tier][cluster] = [];
    result[subj][tier][cluster].push(n);
  }
  return result;
}
