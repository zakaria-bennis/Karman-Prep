/*
 * Builds the 20 full-length exams from real bank questions and, with --write, stores them and holds their
 * questions back from practice (overnight build 2026-11-22, Exams stream).
 *
 *   npx tsx --env-file=.env.local scripts/exams/build-forms.ts            # build and report only
 *   npx tsx --env-file=.env.local scripts/exams/build-forms.ts --write    # also store and hold
 *   ... --pool <file.json>   reuse a pool saved by an earlier run (report only, never with --write)
 *
 * Rules:
 * - Only questions that pass the same checks practice uses (fetchCatalogQuestionPool + the delivery
 *   seal), original (never generated), with a confirmed answer key, and not hidden by the Bank stream
 *   (a hidden question is no longer live, so the checks drop it; scripts/exams/hidden.json adds any id
 *   listed by hand).
 * - Each form: per section a Module 1 and an easier and a harder Module 2 that follow the measured
 *   blueprint (src/lib/sat-engine/blueprint.ts), 2 unscored trial questions in every module. Forms
 *   alternate standard and hard (founder, 2026-11-12).
 * - No question in two forms and no question family twice anywhere: the families used are shared across
 *   all 20 forms.
 * - Fair forms: the pool is dealt into 20 equal shares, stratified by skill, difficulty and answer format,
 *   so Exam 20 is as good as Exam 1. A form whose share runs dry borrows from the questions no form used.
 *
 * Writing (--write): backs up quiz_questions.pool for every row it touches, replaces exam_forms and
 * exam_form_items (refused once any student has a sitting), then sets pool = 'test' for scored questions
 * and 'tryout' for trial questions, and returns any question no longer in a form to 'practice'. Column-only
 * updates by id: nothing else on the row changes.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { admitCatalogPool } from "@/lib/catalog-practice/session";
import { loadCatalogQuestionEvidence } from "@/lib/catalog-practice/supabase-store";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { questionFamily } from "@/lib/assembler/bank";
import { stableHash } from "@/lib/catalog-practice/picker";
import { assembleSection, type SectionPanel } from "@/lib/sat-engine/assemble";
import {
  MODULE_SHAPE,
  difficultyCounts,
  difficultyMix,
  domainCounts,
  type FormLevel,
  type ModuleKind,
} from "@/lib/sat-engine/blueprint";
import type { EngineItem, Section } from "@/lib/sat-engine/params";

const FORMS = 20;
const SEED = "karman-exams-2026-11-22";
const LEVELS: FormLevel[] = ["standard", "hard"];
const OUT = path.join(process.cwd(), "scripts/exams/out");
const args = process.argv.slice(2);
const write = args.includes("--write");
const poolFile = args.includes("--pool") ? args[args.indexOf("--pool") + 1] : null;

type Meta = {
  id: string;
  answer_key_status: string | null;
  answer_verification_status: string | null;
  pool: string | null;
  origin?: string | null;
};
type PoolItem = EngineItem & { confirmed: boolean; original: boolean };

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/** A printed key used as printed, a corrected key that was verified, or a key verified by review. */
function confirmedKey(meta: Meta | undefined): boolean {
  if (!meta) return false;
  const verification = meta.answer_verification_status ?? "";
  if (verification === "model_consensus_disagrees_with_key" || verification === "verifier_error")
    return false;
  if (
    meta.answer_key_status === "printed_key_used_no_correction" ||
    meta.answer_key_status === "corrected_key_verified"
  )
    return true;
  return verification.startsWith("verified");
}

async function readMeta(ids: string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  // origin exists once the Generator stream's migration is live; fall back without it.
  let columns = "id, answer_key_status, answer_verification_status, pool, origin";
  for (let offset = 0; offset < ids.length; offset += 200) {
    let result = await db
      .from("quiz_questions")
      .select(columns)
      .in("id", ids.slice(offset, offset + 200));
    if (result.error && columns.includes("origin")) {
      columns = "id, answer_key_status, answer_verification_status, pool";
      result = await db
        .from("quiz_questions")
        .select(columns)
        .in("id", ids.slice(offset, offset + 200));
    }
    if (result.error)
      throw new Error(`question details could not be read: ${result.error.message}`);
    for (const row of (result.data ?? []) as unknown as Meta[]) out.set(row.id, row);
  }
  return out;
}

/** Every question that passes the practice checks, from the whole bank (held questions included). */
async function loadPool(): Promise<Omit<PoolItem, "confirmed" | "original">[]> {
  const items: Omit<PoolItem, "confirmed" | "original">[] = [];
  for (const skill of CATALOG_SKILLS) {
    for (let attempt = 1; ; attempt++) {
      try {
        const rows = await fetchCatalogQuestionPool(
          { skillId: skill.id, minimumDifficulty: 1, maximumDifficulty: 7 },
          "whole-bank"
        );
        const admitted = admitCatalogPool(
          skill.id,
          rows,
          await loadCatalogQuestionEvidence(rows.map((row) => row.id))
        );
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const snapshot of admitted) {
          const row = byId.get(snapshot.binding.questionId)!;
          items.push({
            id: row.id,
            section: skill.subject === "math" ? "math" : "reading",
            domainId: skill.domainId,
            skillId: skill.id,
            difficulty: snapshot.student.difficulty_level,
            format: row.answer_format === "numeric_entry" ? "student-produced" : "multiple-choice",
            family: questionFamily(row),
          });
        }
        console.log(`  ${skill.id}: ${admitted.length}`);
        break;
      } catch (error) {
        if (attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  return items;
}

/**
 * Deals the pool into `count` equal shares. Inside each stratum (section, skill, difficulty, format) the
 * questions are shuffled by seed and dealt in turn, starting where the last stratum stopped, so every
 * share gets the same mix.
 */
function deal(pool: readonly PoolItem[], count: number): PoolItem[][] {
  const strata = new Map<string, PoolItem[]>();
  for (const item of pool) {
    const key = `${item.section}|${item.skillId}|${item.difficulty}|${item.format}`;
    strata.set(key, [...(strata.get(key) ?? []), item]);
  }
  const shares: PoolItem[][] = Array.from({ length: count }, () => []);
  let next = 0;
  for (const key of [...strata.keys()].sort()) {
    const items = [...strata.get(key)!].sort(
      (a, b) => stableHash(`${SEED}:deal:${a.id}`) - stableHash(`${SEED}:deal:${b.id}`)
    );
    for (const item of items) {
      shares[next].push(item);
      next = (next + 1) % count;
    }
  }
  return shares;
}

type ModuleReport = {
  size: number;
  trial: number;
  shortfall: number;
  domains: Record<string, { target: number; got: number }>;
  difficulty: { target: number[]; got: number[] };
  meanDifficulty: number;
  studentProduced: number;
};

function moduleReport(
  section: Section,
  kind: ModuleKind,
  level: FormLevel,
  panel: SectionPanel
): ModuleReport {
  const module =
    kind === "module1" ? panel.module1 : kind === "easier" ? panel.easier : panel.harder;
  const shape = MODULE_SHAPE[section];
  const targets = domainCounts(section, kind, shape.size);
  const operational = module.slots.filter((slot) => !slot.pretest);
  const got = [0, 0, 0, 0, 0, 0, 0];
  for (const slot of operational) got[Math.max(1, Math.min(7, slot.item.difficulty)) - 1]++;
  const domains: ModuleReport["domains"] = {};
  for (const [domain, target] of targets)
    domains[domain] = {
      target,
      got: module.slots.filter((slot) => slot.item.domainId === domain).length,
    };
  return {
    size: module.slots.length,
    trial: module.slots.length - operational.length,
    shortfall: module.shortfall,
    domains,
    difficulty: {
      target: difficultyCounts(difficultyMix(section, kind, level), shape.size - shape.pretest),
      got,
    },
    meanDifficulty:
      Math.round(
        (operational.reduce((sum, slot) => sum + slot.item.difficulty, 0) /
          Math.max(1, operational.length)) *
          100
      ) / 100,
    studentProduced: module.slots.filter((slot) => slot.item.format === "student-produced").length,
  };
}

/** Typed-answer (student-produced) questions per Math module, as on the digital SAT: about a quarter. */
const STUDENT_PRODUCED = { low: 4, high: 6 };

/**
 * Brings each Math module's typed-answer count inside STUDENT_PRODUCED by swapping a scored question for an
 * unused one of the same skill, difficulty and the other format. Positions stay as they are.
 */
function balanceFormats(panel: SectionPanel, candidates: readonly PoolItem[], used: Set<string>) {
  if (panel.section !== "math") return;
  for (const module of [panel.module1, panel.easier, panel.harder]) {
    const count = () => module.slots.filter((s) => s.item.format === "student-produced").length;
    for (let guard = 0; guard < 22; guard++) {
      const n = count();
      if (n >= STUDENT_PRODUCED.low && n <= STUDENT_PRODUCED.high) break;
      const want = n < STUDENT_PRODUCED.low ? "student-produced" : "multiple-choice";
      let swapped = false;
      for (const slot of module.slots) {
        if (slot.pretest || slot.item.format === want) continue;
        const swap = candidates.find(
          (c) =>
            c.format === want &&
            c.skillId === slot.item.skillId &&
            c.difficulty === slot.item.difficulty &&
            !used.has(c.family)
        );
        if (!swap) continue;
        used.delete(slot.item.family);
        used.add(swap.family);
        slot.item = swap;
        swapped = true;
        break;
      }
      if (!swapped) break;
    }
  }
}

type BuiltForm = {
  form: number;
  level: FormLevel;
  sections: SectionPanel[];
  report: Record<string, Record<string, ModuleReport>>;
};

function buildForms(pool: readonly PoolItem[]): BuiltForm[] {
  const shares = deal(pool, FORMS);
  const used = new Set<string>();
  const forms: BuiltForm[] = [];
  for (let index = 0; index < FORMS; index++) {
    const form = index + 1;
    const level = LEVELS[index % LEVELS.length];
    const sections = (["reading", "math"] as const).map((section) => {
      const seed = `${SEED}:${form}`;
      const attempt = (items: readonly EngineItem[], families: Set<string>) =>
        assembleSection(items, { section, level, seed, used: families, pretestPool: items });
      // First from the form's own share; if a module comes up short, again with the questions no
      // other share holds yet added in.
      const trial = new Set(used);
      let panel = attempt(shares[index], trial);
      const short = [panel.module1, panel.easier, panel.harder].some((m) => m.shortfall > 0);
      const later = new Set(
        shares.slice(index + 1).flatMap((share) => share.map((item) => item.id))
      );
      const spare = pool.filter((item) => !later.has(item.id));
      let families = trial;
      if (short) {
        families = new Set(used);
        panel = attempt(spare, families);
      }
      balanceFormats(panel, [...shares[index], ...spare], families);
      for (const family of families) used.add(family);
      return panel;
    });
    const report: BuiltForm["report"] = {};
    for (const panel of sections) {
      report[panel.section] = {};
      for (const kind of ["module1", "easier", "harder"] as const)
        report[panel.section][kind] = moduleReport(panel.section, kind, level, panel);
    }
    forms.push({ form, level, sections, report });
  }
  return forms;
}

function check(forms: readonly BuiltForm[]) {
  const ids = new Set<string>();
  const families = new Set<string>();
  const problems: string[] = [];
  for (const form of forms) {
    for (const panel of form.sections) {
      for (const module of [panel.module1, panel.easier, panel.harder]) {
        const shape = MODULE_SHAPE[panel.section];
        if (module.slots.length !== shape.size)
          problems.push(
            `form ${form.form} ${panel.section} ${module.kind}: ${module.slots.length} questions`
          );
        if (module.slots.filter((slot) => slot.pretest).length !== shape.pretest)
          problems.push(`form ${form.form} ${panel.section} ${module.kind}: trial count`);
        module.slots.forEach((slot, position) => {
          if (ids.has(slot.item.id)) problems.push(`question ${slot.item.id} twice`);
          if (families.has(slot.item.family)) problems.push(`family ${slot.item.family} twice`);
          ids.add(slot.item.id);
          families.add(slot.item.family);
          if (slot.pretest && (position < 2 || position > module.slots.length - 3))
            problems.push(
              `form ${form.form} ${panel.section} ${module.kind}: trial at ${position}`
            );
        });
      }
    }
  }
  return { questions: ids.size, problems };
}

function rows(forms: readonly BuiltForm[]) {
  return forms.flatMap((form) =>
    form.sections.flatMap((panel) =>
      (["module1", "easier", "harder"] as const).flatMap((kind) =>
        (kind === "module1"
          ? panel.module1
          : kind === "easier"
            ? panel.easier
            : panel.harder
        ).slots.map((slot, position) => ({
          form: form.form,
          section: panel.section,
          module: kind,
          position,
          question_id: slot.item.id,
          trial: slot.pretest,
        }))
      )
    )
  );
}

async function patchPool(ids: string[], pool: "practice" | "test" | "tryout") {
  for (let offset = 0; offset < ids.length; offset += 200) {
    const { error } = await db
      .from("quiz_questions")
      .update({ pool } as never)
      .in("id", ids.slice(offset, offset + 200));
    if (error) throw new Error(`pool update failed: ${error.message}`);
  }
}

async function store(forms: readonly BuiltForm[]) {
  const { count: sittings, error: sittingError } = await db
    .from("exam_sittings" as never)
    .select("id", { count: "exact", head: true });
  if (sittingError) throw new Error(`sittings could not be counted: ${sittingError.message}`);
  if ((sittings ?? 0) > 0)
    throw new Error(`refused: ${sittings} sitting(s) exist; forms stay as they are`);

  const items = rows(forms);
  const newIds = new Set(items.map((row) => row.question_id));
  // Back up the pool of every row this run can touch: the new form questions and every held row now.
  const { data: held, error: heldError } = await db
    .from("quiz_questions")
    .select("id, pool")
    .in("pool" as never, ["test", "tryout"] as never);
  if (heldError) throw new Error(`held rows could not be read: ${heldError.message}`);
  const before = await readMeta([...newIds]);
  const backup = {
    at: new Date().toISOString(),
    note: "quiz_questions.pool before scripts/exams/build-forms.ts --write. Restore by id.",
    rows: [
      ...((held ?? []) as unknown as { id: string; pool: string }[]),
      ...[...before.values()].map((row) => ({ id: row.id, pool: row.pool ?? "practice" })),
    ],
  };
  const backupFile = path.join(OUT, `backup-pool-${backup.at.replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify(backup));
  console.log(`backup: ${backupFile} (${backup.rows.length} rows)`);

  const del = await db
    .from("exam_forms" as never)
    .delete()
    .gte("form" as never, 0 as never);
  if (del.error) throw new Error(`old forms could not be cleared: ${del.error.message}`);
  const formRows = forms.map((form) => ({
    form: form.form,
    level: form.level,
    seed: `${SEED}:${form.form}`,
    report: form.report,
  }));
  const insertForms = await db.from("exam_forms" as never).insert(formRows as never);
  if (insertForms.error) throw new Error(`forms insert failed: ${insertForms.error.message}`);
  for (let offset = 0; offset < items.length; offset += 500) {
    const { error } = await db
      .from("exam_form_items" as never)
      .insert(items.slice(offset, offset + 500) as never);
    if (error) throw new Error(`form items insert failed: ${error.message}`);
  }

  const released = ((held ?? []) as unknown as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !newIds.has(id));
  await patchPool(released, "practice");
  await patchPool(
    items.filter((row) => !row.trial).map((row) => row.question_id),
    "test"
  );
  await patchPool(
    items.filter((row) => row.trial).map((row) => row.question_id),
    "tryout"
  );

  const count = async (pool: string) => {
    const { count: n } = await db
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("pool" as never, pool as never);
    return n ?? 0;
  };
  const { count: storedItems } = await db
    .from("exam_form_items" as never)
    .select("question_id", { count: "exact", head: true });
  console.log(
    `stored: ${forms.length} forms, ${storedItems} items; pool test=${await count("test")}, tryout=${await count("tryout")}; released ${released.length}`
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (write && poolFile) throw new Error("--write always reads the bank fresh; drop --pool");
  console.log(poolFile ? `pool from ${poolFile}` : "reading the bank (every skill)…");
  const raw = poolFile
    ? (JSON.parse(readFileSync(poolFile, "utf8")) as Omit<PoolItem, "confirmed" | "original">[])
    : await loadPool();
  if (!poolFile) writeFileSync(path.join(OUT, "pool-cache.json"), JSON.stringify(raw));
  const meta = await readMeta(raw.map((item) => item.id));
  const hiddenFile = path.join(process.cwd(), "scripts/exams/hidden.json");
  const hidden = new Set<string>(
    existsSync(hiddenFile) ? (JSON.parse(readFileSync(hiddenFile, "utf8")) as string[]) : []
  );
  const pool: PoolItem[] = raw
    .filter((item) => !hidden.has(item.id))
    .map((item) => ({
      ...item,
      confirmed: confirmedKey(meta.get(item.id)),
      original: (meta.get(item.id)?.origin ?? "original") === "original",
    }));
  const eligible = pool.filter((item) => item.confirmed && item.original);
  console.log(
    `pool: ${raw.length} pass the checks, ${hidden.size} hidden by hand, ${eligible.length} original with a confirmed key`
  );

  const forms = buildForms(eligible);
  const verdict = check(forms);
  const summary = {
    builtAt: new Date().toISOString(),
    seed: SEED,
    pool: { checked: raw.length, eligible: eligible.length, hidden: hidden.size },
    heldQuestions: verdict.questions,
    problems: verdict.problems,
    forms: forms.map((form) => ({ form: form.form, level: form.level, report: form.report })),
  };
  writeFileSync(path.join(OUT, "forms-report.json"), JSON.stringify(summary, null, 1));
  writeFileSync(path.join(OUT, "forms.json"), JSON.stringify(rows(forms)));
  console.log(`built ${forms.length} forms, ${verdict.questions} questions held`);
  if (verdict.problems.length) {
    console.log(
      `problems (${verdict.problems.length}):\n  ${verdict.problems.slice(0, 20).join("\n  ")}`
    );
    if (write) throw new Error("refused: the forms have problems");
  }
  if (write) await store(forms);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
