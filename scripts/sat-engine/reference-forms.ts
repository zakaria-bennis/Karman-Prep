/*
 * Model forms built from the measured blueprint with cold-start parameters: a linear form like
 * College Board's paper practice tests, and adaptive modules like the real digital SAT. Used by
 * fit-scale.ts and validate.ts; never to score a student.
 */
import {
  difficultyCounts,
  difficultyMix,
  mixMean,
  type ModuleKind,
} from "@/lib/sat-engine/blueprint";
import type { ItemParams } from "@/lib/sat-engine/irt";
import { coldStartParams, type Section } from "@/lib/sat-engine/params";

/** Share of grid-in (student-produced) questions in Math, from the official answer keys. */
export const MATH_GRID_IN_SHARE = 0.26;

function itemsFromMix(section: Section, mix: number[], count: number, shift = 0): ItemParams[] {
  const counts = difficultyCounts(mix, count);
  const out: ItemParams[] = [];
  let gridIns = section === "math" ? Math.round(count * MATH_GRID_IN_SHARE) : 0;
  counts.forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      // Spread grid-ins across ratings.
      const format =
        gridIns > 0 && (out.length + k) % 4 === 1 ? "student-produced" : "multiple-choice";
      if (format === "student-produced") gridIns--;
      const p = coldStartParams({ section, difficulty: i + 1, format });
      out.push({ ...p, b: p.b + shift });
    }
  });
  return out;
}

/** A linear (non-adaptive) form: Module 1 mix plus both Module 2 mixes, like the paper tests. */
export function linearForm(section: Section, count: number, shift = 0): ItemParams[] {
  const kinds: ModuleKind[] = ["module1", "harder", "easier"];
  const mixes = kinds.map((k) => difficultyMix(section, k, "standard"));
  const avg = mixes[0].map((_, i) => 0.5 * mixes[0][i] + 0.25 * mixes[1][i] + 0.25 * mixes[2][i]);
  return itemsFromMix(section, avg, count, shift);
}

/** An adaptive module with `count` operational questions. */
export function adaptiveModule(section: Section, kind: ModuleKind, count: number): ItemParams[] {
  return itemsFromMix(section, difficultyMix(section, kind, "standard"), count);
}

export const meanRating = (section: Section, kind: ModuleKind) =>
  mixMean(difficultyMix(section, kind, "standard"));
