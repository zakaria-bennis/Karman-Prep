/*
 * Math on demand (founder, 2026-11-22 round 2: docs/overnight/2026-11-22-round2-spec.md). A generated
 * Math question is written to the bank only when it is served to a student. `nextGeneratedQuestion`
 * builds a fresh one for a skill and difficulty (a template that covers the difficulty and a new seed),
 * stores it as ordinary bank rows (persist.ts: origin 'generated', the generator record that rebuilds
 * it from template and seed, the evidence row, the 72-skill binding) and returns it in the same shape
 * as pool72's items and snapshots. From then on it is a bank question like any other: it can be
 * answered in a run, sit in the Mistake Log and be redone.
 *
 * Nothing is made while an admin has hidden generated questions (switch.ts), for a skill with no item
 * models, or for a core plan (generated questions are not in the Practice plan's fixed set). Server only.
 */
import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { questionFamily } from "@/lib/assembler/bank";
import { admitCatalogPool } from "@/lib/catalog-practice/session";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import { skill72 } from "@/lib/skills/ids72";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { Item72 } from "@/lib/play/server/pool72";
import { buildItem, isItem } from "./math/core/build";
import type { MathItem, Template } from "./math/core/types";
import { templatesFor } from "./math/registry";
import { insertQuestions, withIds } from "./persist";
import { placementFor } from "./placement";
import { batchManifestSha, fromMathItem } from "./store";
import { generatedHidden } from "./switch";

/** The batch every serve-time question is filed under (generator.batch, question_skills72.run). */
export const SERVE_BATCH = "serve:math";
/** Seeds for serve-time questions start here, well past every seed a stored batch used. */
const SEED_FLOOR = 1_000_000;
const SEED_CEILING = 2_000_000_000;
/** Builds tried to land exactly on the asked difficulty before taking the nearest. */
const TRIES = 16;

const db = () => createAdminClient() as unknown as SupabaseClient;

export interface GeneratedServe {
  item: Item72;
  snapshot: CatalogDeliverySnapshot;
}

export interface NextGeneratedInput {
  /** A Math 72-skill id, such as "m-circles". */
  skillId: string;
  /** The difficulty wanted, 1 to 7 (already capped by the student's plan). */
  difficulty: number;
  /** From the student's plan (QuizAccess.practiceSet): core plans get no generated questions. */
  practiceSet?: boolean;
}

/** Templates for the skill, those covering the difficulty first; else the nearest ones. */
function templatesAt(skillId: string, difficulty: number): Template[] {
  const all = templatesFor(skillId);
  const covering = all.filter(
    (t) => t.difficulty[0] <= difficulty && difficulty <= t.difficulty[1]
  );
  if (covering.length) return covering;
  const gap = (t: Template) =>
    Math.max(t.difficulty[0] - difficulty, difficulty - t.difficulty[1], 0);
  const nearest = Math.min(...all.map(gap));
  return all.filter((t) => gap(t) === nearest);
}

/** A fresh built question nearest the difficulty, or null when every build was refused. */
export function buildFresh(
  skillId: string,
  difficulty: number,
  seedOf: () => number = () => randomInt(SEED_FLOOR, SEED_CEILING)
): MathItem | null {
  const templates = templatesAt(skillId, difficulty);
  if (!templates.length) return null;
  let best: MathItem | null = null;
  for (let i = 0; i < TRIES; i++) {
    const template = templates[seedOf() % templates.length];
    const built = buildItem(template, seedOf());
    if (!isItem(built)) continue;
    if (built.difficulty === difficulty) return built;
    if (!best || Math.abs(built.difficulty - difficulty) < Math.abs(best.difficulty - difficulty))
      best = built;
  }
  return best;
}

/** The snapshot of one stored question, through the same gate as every student pool. */
function admitOne(
  row: QuizQuestionWithChoices,
  evidence: unknown,
  catalogSkillId: string
): CatalogDeliverySnapshot | null {
  const ready = {
    ...row,
    reviewed_numeric_answers:
      row.answer_format === "numeric_entry"
        ? reviewedNumericAnswers(row, numericAnswerSetFromEvidence(evidence))
        : undefined,
  } as QuizQuestionWithChoices;
  return admitCatalogPool(catalogSkillId, [ready], new Map([[row.id, evidence]]))[0] ?? null;
}

/**
 * The next fresh generated Math question for a skill and difficulty, stored and ready to serve, or
 * null when none can be made (generated hidden, not a Math skill with item models, a core plan).
 * Each call makes a new question; add it to the run (its snapshot) and serve it.
 */
export async function nextGeneratedQuestion(
  input: NextGeneratedInput
): Promise<GeneratedServe | null> {
  const skill = skill72(input.skillId);
  if (!skill || skill.section !== "Math" || input.practiceSet) return null;
  if (!templatesFor(skill.id).length) return null;
  if (await generatedHidden()) return null;
  const difficulty = Math.max(1, Math.min(7, Math.round(input.difficulty)));
  const place = placementFor(skill.id);
  for (let attempt = 0; attempt < 3; attempt++) {
    const built = buildFresh(skill.id, difficulty);
    if (!built) return null;
    const q = fromMathItem(built);
    let written;
    try {
      written = await insertQuestions(
        db(),
        [withIds(q)],
        SERVE_BATCH,
        batchManifestSha(SERVE_BATCH, [q])
      );
    } catch (error) {
      // the same seed stored a moment ago (the unique index): draw another
      if (attempt < 2 && String(error).includes("duplicate")) continue;
      throw error;
    }
    if (written.admitted !== 1) continue;
    const [id] = written.rows.keys();
    const row = written.rows.get(id)!;
    const snapshot = admitOne(row, written.evidence.get(id), place.catalogSkillId);
    if (!snapshot) continue;
    return {
      snapshot,
      item: {
        id,
        skillId: place.catalogSkillId,
        domainId: place.domainId,
        section: "math",
        difficulty: snapshot.student.difficulty_level,
        family: questionFamily(row),
        skill72: skill.id,
        domain72: skill.domain,
      },
    };
  }
  return null;
}
