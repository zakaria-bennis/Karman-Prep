/*
 * Simulation helpers for testing and validating the engine: a seeded random generator, normal
 * draws, simulated answers from known parameters, and a synthetic item pool shaped like the
 * release-exam blueprint. Never used to score a real student.
 */
import { skillShares } from "./blueprint";
import { pCorrect, type ItemParams } from "./irt";
import { coldStartParams, type AnswerFormat, type EngineItem, type Section } from "./params";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(random: () => number, mean = 0, sd = 1) {
  const u = Math.max(1e-12, random());
  const v = random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const answer = (random: () => number, item: ItemParams, theta: number) =>
  random() < pCorrect(item, theta);

/** Skill ids grouped by Domain, as measured from the release exams. */
function domainSkills(section: Section): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [skill, { domain }] of skillShares(section)) {
    out.set(domain, [...(out.get(domain) ?? []), skill]);
  }
  return out;
}

/**
 * A synthetic pool: `perSkill` items per skill, ratings spread 1-7 like `ratingWeights`, with
 * true parameters that differ from the cold-start guess by `truthNoise` (SD in b).
 */
export function syntheticPool(options: {
  seed: number;
  perSkill: number;
  truthNoise: number;
  ratingWeights?: number[];
}): { items: EngineItem[]; truth: Map<string, ItemParams> } {
  const random = rng(options.seed);
  const weights = options.ratingWeights ?? [0.1, 0.17, 0.2, 0.18, 0.15, 0.12, 0.08];
  const items: EngineItem[] = [];
  const truth = new Map<string, ItemParams>();
  for (const section of ["reading", "math"] as const) {
    for (const [domainId, skills] of domainSkills(section)) {
      for (const skill of skills) {
        for (let n = 0; n < options.perSkill; n++) {
          let x = random();
          let difficulty = 1;
          for (; difficulty < 7 && x > weights[difficulty - 1]; difficulty++)
            x -= weights[difficulty - 1];
          const format: AnswerFormat =
            section === "math" && random() < 0.25 ? "student-produced" : "multiple-choice";
          const id = `${skill}-${n}`;
          const item: EngineItem = {
            id,
            section,
            domainId,
            skillId: skill,
            difficulty,
            format,
            family: id,
          };
          const prior = coldStartParams(item);
          truth.set(id, {
            a: prior.a * Math.exp(normal(random, 0, 0.25)),
            b: prior.b + normal(random, 0, options.truthNoise),
            c:
              format === "student-produced"
                ? 0
                : Math.min(0.35, Math.max(0.05, normal(random, 0.2, 0.05))),
          });
          items.push(item);
        }
      }
    }
  }
  return { items, truth };
}
