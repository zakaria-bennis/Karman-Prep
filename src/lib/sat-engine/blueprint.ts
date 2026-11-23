/*
 * Module blueprints for Karman full-length tests, measured from real SAT release exams
 * (`data/release-blueprint.json`, written by scripts/sat-engine/measure_blueprint.py). Each
 * module gets the same Domain counts, the same skill mix and a difficulty mix that matches the
 * real Module 1, harder Module 2 or easier Module 2.
 *
 * Founder rules (2026-11-12): every form has roughly the same mix of question types; no form is
 * easy; each form is "standard" (matches the real test) or "hard" (shifted harder).
 */
import measured from "./data/release-blueprint.json";
import type { Section } from "./params";

export type ModuleKind = "module1" | "harder" | "easier";
export type FormLevel = "standard" | "hard";

/** Questions per module, including the 2 unscored (pretest) questions, and minutes. */
export const MODULE_SHAPE: Record<Section, { size: number; pretest: number; minutes: number }> = {
  reading: { size: 27, pretest: 2, minutes: 32 },
  math: { size: 22, pretest: 2, minutes: 35 },
};

type SectionBlueprint = {
  domain_order: string[];
  domain_counts: Record<ModuleKind, Record<string, number>>;
  skill_share: Record<string, { domain: string; share: number; seen: number }>;
  difficulty_mix: Record<ModuleKind, number[]>;
  easier_mix_derived: boolean;
};

const SECTIONS = (measured as { sections: Record<Section, SectionBlueprint> }).sections;

export function domainOrder(section: Section): string[] {
  return SECTIONS[section].domain_order;
}

/**
 * Whole-number Domain counts for one module that add up to `total` (largest remainder), from the
 * measured averages.
 */
export function domainCounts(section: Section, kind: ModuleKind, total: number) {
  const avg = SECTIONS[section].domain_counts[kind];
  const sum = Object.values(avg).reduce((s, x) => s + x, 0);
  const scaled = domainOrder(section).map((d) => ({ d, x: ((avg[d] ?? 0) * total) / sum }));
  const counts = new Map(scaled.map(({ d, x }) => [d, Math.floor(x)]));
  let left = total - [...counts.values()].reduce((s, x) => s + x, 0);
  for (const { d } of [...scaled].sort((p, q) => (q.x % 1) - (p.x % 1))) {
    if (left-- <= 0) break;
    counts.set(d, counts.get(d)! + 1);
  }
  return counts;
}

/** Share of each skill inside its Domain, as seen on release exams. */
export function skillShares(section: Section): Map<string, { domain: string; share: number }> {
  return new Map(
    Object.entries(SECTIONS[section].skill_share).map(([id, v]) => [
      id,
      { domain: v.domain, share: v.share },
    ])
  );
}

/** Mean of a 1-7 mix. */
export const mixMean = (mix: readonly number[]) => mix.reduce((s, p, i) => s + (i + 1) * p, 0);

/** Tilts a 1-7 mix (exponentially) until its mean is `target`. */
export function tiltMix(mix: readonly number[], target: number): number[] {
  let low = -6;
  let high = 6;
  let out = [...mix];
  for (let i = 0; i < 80; i++) {
    const k = (low + high) / 2;
    const w = mix.map((p, j) => p * Math.exp(k * (j + 1)));
    const total = w.reduce((s, x) => s + x, 0);
    out = w.map((x) => x / total);
    if (mixMean(out) < target) low = k;
    else high = k;
  }
  return out;
}

/** How much harder (in 1-7 rating points) a "hard" form is than the real test, per module. */
export const HARD_FORM_SHIFT = 0.5;

/** Target share of each 1-7 rating in a module of this kind and form level. */
export function difficultyMix(section: Section, kind: ModuleKind, level: FormLevel): number[] {
  const mix = SECTIONS[section].difficulty_mix[kind];
  return level === "hard" ? tiltMix(mix, Math.min(6.5, mixMean(mix) + HARD_FORM_SHIFT)) : mix;
}

/** Whole-number count of questions at each rating for a module of `total` questions. */
export function difficultyCounts(mix: readonly number[], total: number): number[] {
  const raw = mix.map((p) => p * total);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => ({ i, f: x % 1 })).sort((p, q) => q.f - p.f);
  for (const { i } of order) {
    if (left-- <= 0) break;
    counts[i]++;
  }
  return counts;
}

export function easierMixIsDerived(section: Section): boolean {
  return SECTIONS[section].easier_mix_derived;
}
