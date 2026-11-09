import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MODULE_BLUEPRINT,
  SECTION_SHAPE,
  assembleDiagnostic,
  assembleDomainQuiz,
  assembleFullLengthForms,
  routeHarder,
  type BankItem,
  type Section,
} from "./forms";
import { EASIER_ROUTE_CAP, diagnosticSectionScore, predictedTotal, sectionScore } from "./score";

/** A synthetic pool: every Domain has 4 skills, each skill 40 questions across difficulty 1-7. */
function syntheticPool(): BankItem[] {
  const items: BankItem[] = [];
  for (const section of ["reading", "math"] as Section[]) {
    for (const { domainId } of MODULE_BLUEPRINT[section]) {
      for (let s = 0; s < 4; s++) {
        for (let q = 0; q < 40; q++) {
          const id = `${domainId}-${s}-${q}`;
          items.push({
            id,
            skillId: `${domainId}-skill-${s}`,
            domainId,
            section,
            difficulty: (q % 7) + 1,
            // Every fifth question shares a family with its neighbour (a near-duplicate pair).
            family: q % 5 === 1 ? `${domainId}-${s}-${q - 1}` : id,
          });
        }
      }
    }
  }
  return items;
}

const families = (items: BankItem[]) => items.map((i) => i.family);
const allItems = (form: ReturnType<typeof assembleFullLengthForms>[number]) =>
  form.sections.flatMap((s) => [...s.module1, ...s.easier, ...s.harder]);

describe("full-length forms", () => {
  const pool = syntheticPool();
  const forms = assembleFullLengthForms(pool, { upTo: 4, maxDifficulty: 7 });

  it("has the SAT shape: 27 + 27 Reading and Writing, 22 + 22 Math", () => {
    for (const form of forms) {
      for (const section of form.sections) {
        const size = SECTION_SHAPE[section.section].perModule;
        expect(section.module1).toHaveLength(size);
        expect(section.easier).toHaveLength(size);
        expect(section.harder).toHaveLength(size);
      }
    }
    expect(SECTION_SHAPE.reading.minutes).toBe(32);
    expect(SECTION_SHAPE.math.minutes).toBe(35);
  });

  it("never repeats a family within a form or across the four forms", () => {
    const seen = forms.flatMap((form) => families(allItems(form)));
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("follows each Domain's count and spreads its skills", () => {
    const module1 = forms[0].sections.find((s) => s.section === "math")!.module1;
    for (const { domainId, count } of MODULE_BLUEPRINT.math) {
      const inDomain = module1.filter((i) => i.domainId === domainId);
      expect(inDomain).toHaveLength(count);
      const perSkill = new Map<string, number>();
      for (const i of inDomain) perSkill.set(i.skillId, (perSkill.get(i.skillId) ?? 0) + 1);
      expect(Math.max(...perSkill.values()) - Math.min(...perSkill.values())).toBeLessThanOrEqual(
        1
      );
    }
  });

  it("makes Module 2 easier or harder by difficulty band", () => {
    const rw = forms[0].sections[0];
    const mean = (items: BankItem[]) => items.reduce((n, i) => n + i.difficulty, 0) / items.length;
    expect(Math.max(...rw.easier.map((i) => i.difficulty))).toBeLessThanOrEqual(3);
    expect(Math.min(...rw.harder.map((i) => i.difficulty))).toBeGreaterThanOrEqual(5);
    expect(mean(rw.easier)).toBeLessThan(mean(rw.module1));
    expect(mean(rw.harder)).toBeGreaterThan(mean(rw.module1));
  });

  it("keeps a core plan inside difficulty 1 to 5", () => {
    const core = assembleFullLengthForms(pool, { upTo: 1, maxDifficulty: 5 });
    expect(Math.max(...allItems(core[0]).map((i) => i.difficulty))).toBeLessThanOrEqual(5);
    expect(Math.min(...core[0].sections[1].harder.map((i) => i.difficulty))).toBeGreaterThanOrEqual(
      4
    );
  });

  it("is deterministic and skips families the student already met", () => {
    const again = assembleFullLengthForms(pool, { upTo: 4, maxDifficulty: 7 });
    expect(again.map((f) => allItems(f).map((i) => i.id))).toEqual(
      forms.map((f) => allItems(f).map((i) => i.id))
    );
    const taken = new Set(families(allItems(forms[0])));
    const next = assembleFullLengthForms(pool, { upTo: 1, maxDifficulty: 7, exclude: taken });
    expect(families(allItems(next[0])).some((f) => taken.has(f))).toBe(false);
  });

  it("routes by Module 1 right answers", () => {
    expect(routeHarder("reading", 14)).toBe(false);
    expect(routeHarder("reading", 15)).toBe(true);
    expect(routeHarder("math", 12)).toBe(true);
  });
});

describe("Domain quiz and diagnostic", () => {
  const pool = syntheticPool();

  it("builds a 12-question Domain quiz with skills spread and unseen questions first", () => {
    const quiz = assembleDomainQuiz(pool, { domainId: "algebra", maxDifficulty: 5, seed: "s1" });
    expect(quiz).toHaveLength(12);
    expect(new Set(quiz.map((i) => i.domainId))).toEqual(new Set(["algebra"]));
    expect(new Set(quiz.map((i) => i.skillId)).size).toBe(4);
    expect(new Set(families(quiz)).size).toBe(12);
    expect(Math.max(...quiz.map((i) => i.difficulty))).toBeLessThanOrEqual(5);
    const answered = new Set(quiz.map((i) => i.id));
    const second = assembleDomainQuiz(pool, {
      domainId: "algebra",
      maxDifficulty: 5,
      seed: "s1",
      answered,
    });
    expect(second.some((i) => answered.has(i.id))).toBe(false);
  });

  it("builds the diagnostic: one module per section, every Domain, difficulty 2 to 5", () => {
    const diagnostic = assembleDiagnostic(pool, { seed: "student-1" });
    expect(diagnostic.map((s) => s.items.length)).toEqual([18, 17]);
    const items = diagnostic.flatMap((s) => s.items);
    expect(new Set(families(items)).size).toBe(items.length);
    expect(Math.max(...items.map((i) => i.difficulty))).toBeLessThanOrEqual(5);
    expect(new Set(items.map((i) => i.domainId)).size).toBe(8);
  });
});

describe("predicted score", () => {
  const right = (difficulty: number) => ({ difficulty, correct: true });
  const wrong = (difficulty: number) => ({ difficulty, correct: false });

  it("gives one number per section between 200 and 800, in tens", () => {
    const perfect = sectionScore({
      section: "math",
      module1: Array(22).fill(right(4)),
      module2: Array(22).fill(right(6)),
    });
    expect(perfect).toBe(800);
    const none = sectionScore({
      section: "math",
      module1: Array(22).fill(wrong(4)),
      module2: Array(22).fill(wrong(2)),
    });
    expect(none).toBe(200);
    expect(predictedTotal({ reading: 610, math: 720 })).toBe(1330);
  });

  it("caps the easier route", () => {
    const capped = sectionScore({
      section: "reading",
      module1: [...Array(14).fill(right(3)), ...Array(13).fill(wrong(3))],
      module2: Array(27).fill(right(2)),
    });
    expect(capped).toBeLessThanOrEqual(EASIER_ROUTE_CAP);
    expect(diagnosticSectionScore([right(3), wrong(3)]) % 10).toBe(0);
  });
});

/** Coverage against the live bank export, when the import session's file is on this machine. */
const BANK = "/Users/zakariabennis/Karman-Prep-wt/bank-pools-20261108.json";
describe.skipIf(!existsSync(BANK))("coverage against the live bank export", () => {
  type Row = {
    id: string;
    section: string;
    domain: string;
    skill: string;
    difficulty: number;
    family: string;
  };
  // Read only when present: describe bodies run even when skipped (CI has no export).
  const rows = existsSync(BANK)
    ? (JSON.parse(readFileSync(BANK, "utf8")) as { questions: Row[] }).questions
    : [];
  const pool: BankItem[] = rows.map((r) => ({
    id: r.id,
    skillId: r.skill,
    domainId: r.domain,
    section: r.section === "math" ? "math" : "reading",
    difficulty: r.difficulty,
    family: r.family,
  }));

  it.each([5, 7])("fills four full-length forms at max difficulty %i", (maxDifficulty) => {
    const forms = assembleFullLengthForms(pool, { upTo: 4, maxDifficulty });
    const seen = forms.flatMap((f) => families(allItems(f)));
    expect(new Set(seen).size).toBe(seen.length);
    for (const form of forms)
      for (const section of form.sections)
        for (const part of [section.module1, section.easier, section.harder])
          expect(part).toHaveLength(SECTION_SHAPE[section.section].perModule);
  });

  it("fills a Domain quiz for every Domain on the core pool", () => {
    for (const section of ["reading", "math"] as const)
      for (const { domainId } of MODULE_BLUEPRINT[section])
        expect(assembleDomainQuiz(pool, { domainId, maxDifficulty: 5, seed: "x" })).toHaveLength(
          12
        );
  });

  it("fills the diagnostic", () => {
    expect(assembleDiagnostic(pool, { seed: "x" }).map((s) => s.items.length)).toEqual([18, 17]);
  });
});
