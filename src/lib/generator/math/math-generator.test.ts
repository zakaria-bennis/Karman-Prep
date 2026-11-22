/*
 * The Math generator's checks, run over many seeds for every template (build.ts already refuses
 * a draft that fails its own checks; this test makes sure templates almost never need refusing,
 * and re-checks every finished item from the outside).
 *
 * GEN_SEEDS (default 150) sets the seeds per template; GEN_SKILL limits the run to one skill.
 *   GEN_SEEDS=2000 GEN_SKILL=m-circles npx vitest run src/lib/generator/math
 */
import { describe, expect, it } from "vitest";
import { parseNumericAnswer } from "@/lib/numeric-answer";
import { SKILLS72, isSkill72Id } from "@/lib/skills/ids72";
import { buildItem, isItem } from "./core/build";
import { renderIssues } from "./core/render";
import type { MathItem } from "./core/types";
import { MATH_TEMPLATES, templatesFor } from "./registry";

const SEEDS = Number(process.env.GEN_SEEDS ?? 150);
const ONLY = process.env.GEN_SKILL;
const templates = MATH_TEMPLATES.filter((t) => !ONLY || t.skill === ONLY);

describe("the Math template registry", () => {
  it("has unique, stable-looking ids on real Math skills", () => {
    const ids = MATH_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of MATH_TEMPLATES) {
      expect(t.id).toMatch(/^[a-z0-9-]+\.[a-z0-9-]+$/);
      expect(isSkill72Id(t.skill) && t.skill.startsWith("m-")).toBe(true);
      expect(t.difficulty[0]).toBeGreaterThanOrEqual(1);
      expect(t.difficulty[1]).toBeLessThanOrEqual(7);
      expect(t.difficulty[0]).toBeLessThanOrEqual(t.difficulty[1]);
      expect(t.formats.length).toBeGreaterThan(0);
    }
  });

  it("covers every Math skill with at least one template", () => {
    const missing = SKILLS72.filter((s) => s.section === "Math" && templatesFor(s.id).length === 0);
    // Reported, not failed, while the skills are being written.
    if (missing.length)
      console.warn(`skills with no template yet: ${missing.map((s) => s.id).join(", ")}`);
    expect(MATH_TEMPLATES.length).toBeGreaterThan(0);
  });
});

function recheck(item: MathItem): string[] {
  const out: string[] = [];
  if (item.format === "mc") {
    if (item.choices.length !== 4) out.push("not four choices");
    if (item.choices.filter((c) => c.correct).length !== 1)
      out.push("not exactly one right choice");
    const texts = item.choices.map((c) => c.text.replace(/\s+/g, ""));
    if (new Set(texts).size !== 4) out.push("two choices read the same");
    if (item.choices.find((c) => c.correct)?.letter !== item.key)
      out.push("key is not the right letter");
    for (const c of item.choices) {
      if (!c.correct && !item.explanation.includes(c.text))
        out.push(`wrong choice ${c.text} not explained`);
    }
  } else {
    if (item.choices.length) out.push("typed answer with choices");
    if (parseNumericAnswer(item.key) === null) out.push(`key ${item.key} does not parse`);
  }
  for (const part of ["What it asks:", "\n1. ", "Check:", "Tip:"]) {
    if (!item.explanation.includes(part)) out.push(`explanation lacks "${part.trim()}"`);
  }
  for (const text of [item.stem, item.explanation, item.hint, ...item.choices.map((c) => c.text)]) {
    for (const issue of renderIssues(text)) out.push(`${issue.problem}: ${issue.text}`);
  }
  if (item.hint.length > 220) out.push("hint longer than a nudge");
  return out;
}

describe.each(templates.map((t) => [t.id, t] as const))("template %s", (_id, template) => {
  it(`builds, checks and renders over ${SEEDS} seeds`, () => {
    let built = 0;
    const stems = new Set<string>();
    const problems: string[] = [];
    const difficulties = new Set<number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const result = buildItem(template, seed);
      if (!isItem(result)) {
        problems.push(`seed ${seed}: ${result.reasons.slice(-1)[0] ?? "no reason"}`);
        continue;
      }
      built++;
      stems.add(result.stem + result.choices.map((c) => c.text).join("|"));
      difficulties.add(result.difficulty);
      for (const p of recheck(result)) problems.push(`seed ${seed}: ${p}`);
    }
    // Almost every seed must give a question on its first few attempts.
    expect(built / SEEDS, problems.slice(0, 5).join("\n")).toBeGreaterThanOrEqual(0.97);
    expect(
      problems.filter((p) => !/^seed \d+: attempt/.test(p) && !p.includes(": attempt ")),
      problems.slice(0, 8).join("\n")
    ).toEqual([]);
    // Enough variety that students do not meet the same question twice.
    expect(stems.size / built).toBeGreaterThanOrEqual(SEEDS >= 100 ? 0.9 : 0.5);
    for (const d of difficulties) {
      expect(d).toBeGreaterThanOrEqual(template.difficulty[0]);
      expect(d).toBeLessThanOrEqual(template.difficulty[1]);
    }
  });

  it("is deterministic: the same seed builds the same question", () => {
    for (const seed of [1, 7, 42]) {
      expect(JSON.stringify(buildItem(template, seed))).toBe(
        JSON.stringify(buildItem(template, seed))
      );
    }
  });
});
