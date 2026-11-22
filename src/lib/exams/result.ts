/*
 * Routing and scoring an exam, and the result the ending shows. Pure: graded answers in, numbers out.
 *
 * - Routing (after each Module 1): an ability estimate from the scored Module 1 answers with a flat prior,
 *   against the median student's ability (src/lib/sat-engine/routing.ts), as on the digital SAT.
 * - Scoring: one maximum-likelihood estimate per section from every scored answer in both modules, so which
 *   questions were right matters, not only how many; 200 to 800 per section, 400 to 1600 in all.
 * - Trial questions are never scored.
 * - Coins by improvement over the last exam (founder, 2026-11-20). The amounts are stand-ins, aimed at the
 *   ~3,000 coins a week of a steady student.
 */
import { medianCut, routeHarder } from "@/lib/sat-engine/routing";
import { scoreSection, toResponses, type AnsweredItem } from "@/lib/sat-engine/scoring";
import type { EngineItem } from "@/lib/sat-engine/params";
import { buildPacing, type PaceNorms, type Pacing } from "./pacing";
import { MODULE_ORDER, type ExamSection, type ModuleKey } from "./plan";
import { reinforceSkills, type ReinforceSkill } from "./reinforce";

export type GradedAnswer = {
  module: ModuleKey;
  item: EngineItem;
  correct: boolean;
  trial: boolean;
  answered: boolean;
  seconds: number;
  /** The question's skill among the 72, when tagged. */
  skill72: string | null;
};

/** Harder or easier Module 2, from the scored Module 1 answers. */
export function chooseRoute(
  section: ExamSection,
  module1: readonly GradedAnswer[]
): "harder" | "easier" {
  const answers: AnsweredItem[] = module1.map((a) => ({
    item: a.item,
    correct: a.correct,
    pretest: a.trial,
  }));
  return routeHarder(toResponses(answers), { thetaCut: medianCut(section), numberRight: 0 })
    ? "harder"
    : "easier";
}

const DOMAIN_NAMES: Record<string, string> = {
  craft_structure: "Craft and Structure",
  info_ideas: "Information and Ideas",
  conventions: "Standard English Conventions",
  expression_ideas: "Expression of Ideas",
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  data_analysis: "Problem-Solving and Data Analysis",
  geometry: "Geometry and Trigonometry",
};

export type SectionSummary = {
  score: number;
  low: number;
  high: number;
  right: number;
  scored: number;
  route: "harder" | "easier";
  theta: number;
  se: number;
  domains: { id: string; name: string; right: number; total: number }[];
};

export type ExamResult = {
  version: 1;
  form: number;
  total: number;
  low: number;
  high: number;
  reading: SectionSummary;
  math: SectionSummary;
  /** The last exam's total, when there was one. */
  previousTotal: number | null;
  improvement: number | null;
  coins: number;
  /** The portal's predicted score (the latest exam once there are two) before and after this one. */
  predicted: { before: number | null; after: number | null };
  /** Every skill with a scored miss, the costliest first (the ending shows three, then See all). */
  reinforce: ReinforceSkill[];
  pacing: Pacing;
  /** Minutes used in each module. */
  minutes: Record<ModuleKey, number>;
  completedAt: string;
};

/** Stand-in amounts (founder: "the full-length exam pays by improvement over the last exam"). */
export const EXAM_COINS = { first: 600, finished: 300, perPoint: 10, most: 2000 } as const;

export function examCoins(total: number, previous: number | null): number {
  if (previous === null) return EXAM_COINS.first;
  const gain = Math.max(0, total - previous);
  return Math.min(EXAM_COINS.most, EXAM_COINS.finished + EXAM_COINS.perPoint * gain);
}

function sectionSummary(
  section: ExamSection,
  answers: readonly GradedAnswer[],
  route: "harder" | "easier"
): SectionSummary {
  const key1: ModuleKey = section === "reading" ? "rw1" : "m1";
  const toItem = (a: GradedAnswer): AnsweredItem => ({
    item: a.item,
    correct: a.correct,
    pretest: a.trial,
  });
  const scored = scoreSection({
    section,
    module1: answers.filter((a) => a.module === key1).map(toItem),
    module2: answers.filter((a) => a.module !== key1).map(toItem),
    route,
  });
  const domains = new Map<string, { right: number; total: number }>();
  for (const a of answers) {
    if (a.trial) continue;
    const d = domains.get(a.item.domainId) ?? { right: 0, total: 0 };
    d.total++;
    if (a.correct) d.right++;
    domains.set(a.item.domainId, d);
  }
  return {
    score: scored.score,
    low: scored.low,
    high: scored.high,
    right: scored.right,
    scored: scored.scored,
    route,
    theta: Math.round(scored.theta * 1000) / 1000,
    se: Math.round(scored.se * 1000) / 1000,
    domains: [...domains.entries()].map(([id, d]) => ({ id, name: DOMAIN_NAMES[id] ?? id, ...d })),
  };
}

export function buildResult(input: {
  form: number;
  answers: readonly GradedAnswer[];
  routes: { reading: "harder" | "easier"; math: "harder" | "easier" };
  minutes: Record<ModuleKey, number>;
  previousTotal: number | null;
  /** Totals of earlier scored exams (any kind the portal counts), oldest first. */
  earlier: readonly number[];
  completedAt: Date;
  /** Learned expected times (src/lib/exams/pacing.ts). */
  norms: PaceNorms;
}): ExamResult {
  const reading = sectionSummary(
    "reading",
    input.answers.filter((a) => a.module === "rw1" || a.module === "rw2"),
    input.routes.reading
  );
  const math = sectionSummary(
    "math",
    input.answers.filter((a) => a.module === "m1" || a.module === "m2"),
    input.routes.math
  );
  const total = reading.score + math.score;
  const coins = examCoins(total, input.previousTotal);
  const before = input.earlier.length >= 2 ? input.earlier[input.earlier.length - 1] : null;
  const after = input.earlier.length + 1 >= 2 ? total : null;
  return {
    version: 1,
    form: input.form,
    total,
    low: reading.low + math.low,
    high: reading.high + math.high,
    reading,
    math,
    previousTotal: input.previousTotal,
    improvement: input.previousTotal === null ? null : total - input.previousTotal,
    coins,
    predicted: { before, after },
    reinforce: reinforceSkills(
      input.answers.map((a) => ({
        section: a.item.section,
        item: a.item,
        correct: a.correct,
        trial: a.trial,
        skill72: a.skill72,
      }))
    ),
    pacing: buildPacing(
      input.answers.map((a) => ({
        module: a.module,
        skill72: a.skill72,
        difficulty: a.item.difficulty,
        seconds: a.seconds,
        answered: a.answered,
      })),
      input.norms
    ),
    minutes: Object.fromEntries(
      MODULE_ORDER.map((key) => [key, input.minutes[key] ?? 0])
    ) as Record<ModuleKey, number>,
    completedAt: input.completedAt.toISOString(),
  };
}
