import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MODULE_BLUEPRINT,
  SECTION_SHAPE,
  assembleDiagnostic,
  assembleDomainQuiz,
  assembleTrialModule,
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

describe("Module 2 routing (time trials and earlier runs)", () => {
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

describe("time trial module", () => {
  const pool = syntheticPool();

  it("is one real module of the section, by the blueprint, with no repeated family", () => {
    for (const section of ["reading", "math"] as const) {
      const items = assembleTrialModule(pool, { section, maxDifficulty: 5, seed: "t1" });
      expect(items).toHaveLength(SECTION_SHAPE[section].perModule);
      expect(new Set(items.map((i) => i.section))).toEqual(new Set([section]));
      expect(new Set(families(items)).size).toBe(items.length);
      for (const { domainId, count } of MODULE_BLUEPRINT[section])
        expect(items.filter((i) => i.domainId === domainId)).toHaveLength(count);
    }
  });

  it("puts unseen questions first and refills from the rest when they run out", () => {
    const first = assembleTrialModule(pool, { section: "math", maxDifficulty: 7, seed: "t2" });
    const answered = new Set(first.map((i) => i.id));
    const second = assembleTrialModule(pool, {
      section: "math",
      maxDifficulty: 7,
      seed: "t2",
      answered,
    });
    expect(second.some((i) => answered.has(i.id))).toBe(false);
    const everything = new Set(pool.map((i) => i.id));
    const refilled = assembleTrialModule(pool, {
      section: "math",
      maxDifficulty: 7,
      seed: "t2",
      answered: everything,
    });
    expect(refilled).toHaveLength(22);
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
