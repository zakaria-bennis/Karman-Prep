/*
 * The one assembler: full-length tests, Domain quizzes, time trials and the diagnostic, all
 * drawn from the catalog pools (each item already passed `admitCatalogPool`:
 * readCatalogQuestionScope plus the catalogQuestionPayloadHash seal). Pure and deterministic: the
 * same pool and seed give the same form, so it can be tested without a database.
 *
 * Rules (brief, "The question bank"):
 * - Never two rows of one question family in a form, or across a student's four forms.
 * - Skills are spread within each Domain (round robin across the Domain's skills).
 * - Module 2 is easier or harder by difficulty band; both variants are built up front so the
 *   whole form, including the variant not taken, shares no family.
 * - SAT shape: Reading and Writing 27 + 27 (32 minutes each), Math 22 + 22 (35 minutes each).
 */
import { stableHash } from "@/lib/catalog-practice/picker";

export type Section = "reading" | "math";

export type BankItem = {
  id: string;
  skillId: string;
  domainId: string;
  section: Section;
  /** Calibrated 1 to 7 within the skill. */
  difficulty: number;
  /** comparison_key, else a hash of the normalised passage and question text. */
  family: string;
};

/** Domain ids per section, with the questions each 27- or 22-question module takes. */
export const MODULE_BLUEPRINT: Record<Section, { domainId: string; count: number }[]> = {
  reading: [
    { domainId: "craft_structure", count: 8 },
    { domainId: "info_ideas", count: 7 },
    { domainId: "conventions", count: 7 },
    { domainId: "expression_ideas", count: 5 },
  ],
  math: [
    { domainId: "algebra", count: 8 },
    { domainId: "advanced_math", count: 8 },
    { domainId: "data_analysis", count: 3 },
    { domainId: "geometry", count: 3 },
  ],
};

export const SECTION_SHAPE: Record<Section, { perModule: number; minutes: number; title: string }> =
  {
    reading: { perModule: 27, minutes: 32, title: "Reading and Writing" },
    math: { perModule: 22, minutes: 35, title: "Math" },
  };

/** Module 1 right answers needed for the harder Module 2 (about 55%). */
export const ROUTE_HARDER_FROM: Record<Section, number> = { reading: 15, math: 12 };

export const FULL_LENGTH_FORMS = 4;

export type Band = readonly number[];

/** Difficulty targets per band, cycled in order. `maxDifficulty` is 5 (core) or 7 (mastery). */
export function bandTargets(band: "mixed" | "easier" | "harder", maxDifficulty: number): Band {
  const mastery = maxDifficulty >= 7;
  switch (band) {
    case "easier":
      return [2, 1, 3, 2, 3];
    case "harder":
      return mastery ? [5, 6, 7, 6, 5, 6] : [4, 5, 5, 4, 5];
    case "mixed":
      return mastery ? [3, 1, 4, 6, 2, 5, 3, 7, 4, 5] : [3, 1, 4, 2, 5, 3, 4, 2, 5];
  }
}

type Picker = {
  used: Set<string>;
  seed: string;
  maxDifficulty: number;
};

/** Candidates in a stable shuffled order for this seed. */
function ordered(items: readonly BankItem[], seed: string): BankItem[] {
  return [...items].sort(
    (a, b) =>
      stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`) || a.id.localeCompare(b.id)
  );
}

/** The item nearest the target difficulty whose family is still unused. */
function takeNearest(
  candidates: readonly BankItem[],
  target: number,
  picker: Picker,
  band: Band
): BankItem | null {
  const low = Math.min(...band);
  const high = Math.min(Math.max(...band), picker.maxDifficulty);
  let best: BankItem | null = null;
  let bestScore = Infinity;
  for (const item of candidates) {
    if (picker.used.has(item.family) || item.difficulty > picker.maxDifficulty) continue;
    // Inside the band first, then nearest the target; ties keep the seeded order.
    const outside =
      item.difficulty < low ? low - item.difficulty : Math.max(0, item.difficulty - high);
    const score = outside * 10 + Math.abs(item.difficulty - target);
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  if (best) picker.used.add(best.family);
  return best;
}

/**
 * `count` questions from one Domain: skills taken in turn (spread), each pick nearest the next
 * difficulty target in the band. Returns fewer when the pool runs dry.
 */
export function pickFromDomain(
  pool: readonly BankItem[],
  domainId: string,
  count: number,
  band: Band,
  picker: Picker,
  bandOffset = 0
): BankItem[] {
  const bySkill = new Map<string, BankItem[]>();
  for (const item of ordered(
    pool.filter((p) => p.domainId === domainId),
    `${picker.seed}:${domainId}`
  )) {
    bySkill.set(item.skillId, [...(bySkill.get(item.skillId) ?? []), item]);
  }
  const skills = [...bySkill.keys()].sort(
    (a, b) => stableHash(`${picker.seed}:${a}`) - stableHash(`${picker.seed}:${b}`)
  );
  const out: BankItem[] = [];
  let turn = 0;
  let misses = 0;
  while (out.length < count && skills.length && misses < skills.length) {
    const skill = skills[turn % skills.length];
    const target = band[(bandOffset + out.length) % band.length];
    const item = takeNearest(bySkill.get(skill)!, target, picker, band);
    turn++;
    if (item) {
      out.push(item);
      misses = 0;
    } else misses++;
  }
  return out;
}

export type AssembledModule = { items: BankItem[] };
export type AssembledSection = {
  section: Section;
  module1: BankItem[];
  easier: BankItem[];
  harder: BankItem[];
};
export type FullLengthForm = { form: number; sections: AssembledSection[] };

function moduleFor(
  pool: readonly BankItem[],
  section: Section,
  band: Band,
  picker: Picker
): BankItem[] {
  const out: BankItem[] = [];
  MODULE_BLUEPRINT[section].forEach(({ domainId, count }, index) => {
    out.push(...pickFromDomain(pool, domainId, count, band, picker, index * 3));
  });
  // Spread the Domains through the module rather than in blocks, easier questions first.
  return out.sort(
    (a, b) =>
      a.difficulty - b.difficulty ||
      stableHash(`${picker.seed}:${a.id}`) - stableHash(`${picker.seed}:${b.id}`)
  );
}

/**
 * Builds forms 1 to `upTo` in order, so later forms never reuse an earlier form's families.
 * `exclude` carries families the student already met in full-length tests they took before.
 */
export function assembleFullLengthForms(
  pool: readonly BankItem[],
  options: { upTo: number; maxDifficulty: number; exclude?: Iterable<string>; seed?: string }
): FullLengthForm[] {
  const used = new Set(options.exclude ?? []);
  const forms: FullLengthForm[] = [];
  for (let form = 1; form <= options.upTo; form++) {
    const picker: Picker = {
      used,
      seed: `${options.seed ?? "karman-full-length"}:${form}`,
      maxDifficulty: options.maxDifficulty,
    };
    const sections = (["reading", "math"] as const).map((section) => {
      const sectionPool = pool.filter((item) => item.section === section);
      return {
        section,
        module1: moduleFor(
          sectionPool,
          section,
          bandTargets("mixed", picker.maxDifficulty),
          picker
        ),
        harder: moduleFor(
          sectionPool,
          section,
          bandTargets("harder", picker.maxDifficulty),
          picker
        ),
        easier: moduleFor(
          sectionPool,
          section,
          bandTargets("easier", picker.maxDifficulty),
          picker
        ),
      };
    });
    forms.push({ form, sections });
  }
  return forms;
}

/**
 * A time trial: one module of `section` in the full-length blueprint, mixed difficulty. Questions
 * the student has not answered come first; the rest of the pool fills any gap. Families never
 * repeat. Returns fewer when the pool runs dry.
 */
export function assembleTrialModule(
  pool: readonly BankItem[],
  options: { section: Section; maxDifficulty: number; seed: string; answered?: ReadonlySet<string> }
): BankItem[] {
  const picker: Picker = {
    used: new Set(),
    seed: options.seed,
    maxDifficulty: options.maxDifficulty,
  };
  const band = bandTargets("mixed", options.maxDifficulty);
  const sectionPool = pool.filter((item) => item.section === options.section);
  const fresh = sectionPool.filter((item) => !options.answered?.has(item.id));
  const out: BankItem[] = [];
  MODULE_BLUEPRINT[options.section].forEach(({ domainId, count }, index) => {
    const picked = pickFromDomain(fresh, domainId, count, band, picker, index * 3);
    if (picked.length < count)
      picked.push(
        ...pickFromDomain(sectionPool, domainId, count - picked.length, band, picker, index * 3)
      );
    out.push(...picked);
  });
  return out.sort(
    (a, b) =>
      a.difficulty - b.difficulty ||
      stableHash(`${picker.seed}:${a.id}`) - stableHash(`${picker.seed}:${b.id}`)
  );
}

/** Whether Module 1's right answers route the student to the harder Module 2. */
export function routeHarder(section: Section, module1Right: number): boolean {
  return module1Right >= ROUTE_HARDER_FROM[section];
}

export const DOMAIN_QUIZ_SIZE = 12;

/**
 * A Domain quiz: about 12 questions, skills spread, mixed difficulty within the plan. Questions
 * the student has not answered come first; families never repeat.
 */
export function assembleDomainQuiz(
  pool: readonly BankItem[],
  options: {
    domainId: string;
    maxDifficulty: number;
    seed: string;
    answered?: ReadonlySet<string>;
    size?: number;
  }
): BankItem[] {
  const size = options.size ?? DOMAIN_QUIZ_SIZE;
  const picker: Picker = {
    used: new Set(),
    seed: options.seed,
    maxDifficulty: options.maxDifficulty,
  };
  const band = bandTargets("mixed", options.maxDifficulty);
  const fresh = pool.filter((item) => !options.answered?.has(item.id));
  const picked = pickFromDomain(fresh, options.domainId, size, band, picker);
  if (picked.length < size) {
    picked.push(
      ...pickFromDomain(pool, options.domainId, size - picked.length, band, picker, picked.length)
    );
  }
  return picked;
}

/** The diagnostic: one module per section, 4 or 5 per Domain, difficulty 2 to 5 (core-safe). */
export const DIAGNOSTIC_BLUEPRINT: Record<
  Section,
  { minutes: number; domains: { domainId: string; count: number }[] }
> = {
  reading: {
    minutes: 22,
    domains: [
      { domainId: "craft_structure", count: 5 },
      { domainId: "info_ideas", count: 5 },
      { domainId: "conventions", count: 4 },
      { domainId: "expression_ideas", count: 4 },
    ],
  },
  math: {
    minutes: 27,
    domains: [
      { domainId: "algebra", count: 5 },
      { domainId: "advanced_math", count: 5 },
      { domainId: "data_analysis", count: 4 },
      { domainId: "geometry", count: 3 },
    ],
  },
};

export function assembleDiagnostic(
  pool: readonly BankItem[],
  options: { seed: string }
): { section: Section; items: BankItem[] }[] {
  const picker: Picker = { used: new Set(), seed: options.seed, maxDifficulty: 5 };
  const band: Band = [3, 2, 4, 5, 3];
  return (["reading", "math"] as const).map((section) => ({
    section,
    items: DIAGNOSTIC_BLUEPRINT[section].domains
      .flatMap(({ domainId, count }, index) =>
        pickFromDomain(
          pool.filter((item) => item.section === section),
          domainId,
          count,
          band,
          picker,
          index
        )
      )
      .sort((a, b) => a.difficulty - b.difficulty),
  }));
}
