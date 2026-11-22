/*
 * The Mistake Log's sittings for a real student: each practice session and quiz run, newest first,
 * with every question as it was asked (the frozen copy each session keeps), the student's answer,
 * the right answer and the explanation. Bookmarks and tutor flags come from
 * student_saved_questions, the quiz engine's own table.
 *
 * The newest sittings are sent until about MAX_QUESTIONS questions, so the page stays light.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { subSkillOfQuestion } from "@/lib/subskills/map";
import { tidyMathText as tidyMath } from "@/lib/quiz/tidy-math";
import type { Mode, RealSitting, Sample } from "@/app/dashboard/student/_portal/mistakeLogData";
import { MODES } from "@/app/dashboard/student/_portal/mistakeLogData";
import { skillOfSubSkill } from "./skill-bridge";

export const MAX_QUESTIONS = 600;

const KIND_MODE: Record<string, Mode> = {
  "daily-ten": "daily",
  "practice-set": "skill",
  "domain-quiz": "skill",
  "full-test": "exam",
  diagnostic: "exam",
  "time-trial": "trial",
};

type Answer = {
  question_id: string;
  student_answer: string;
  is_correct: boolean;
  response_time_seconds: number;
  answered_at: string;
  ordinal: number;
};
type Sitting = {
  id: string;
  mode: Mode;
  name: string;
  startedAt: string;
  snapshots: CatalogDeliverySnapshot[];
  answers: Answer[];
  catalogSkill: string | null;
  score?: number;
};

/** A question as the Mistake Log shows it: one block of text, its choices, the key, the why. */
export function sampleOf(snap: CatalogDeliverySnapshot, given: string): Sample {
  const q = snap.student;
  const passage = [
    q.passage_intro,
    q.passage_a && `Text 1\n${q.passage_a}`,
    q.passage_b && `Text 2\n${q.passage_b}`,
    q.passage,
  ]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join("\n\n");
  const prompt = tidyMath([passage, q.question_text].filter(Boolean).join("\n\n"));
  const choices = [...(q.answer_choices ?? [])].sort((a, b) => a.letter.localeCompare(b.letter));
  const correct = snap.answer.correctAnswer;
  const why = tidyMath(snap.review.explanation_text ?? "");
  if (choices.length === 0)
    return { prompt, choices: [], answer: -1, why, typed: { given, correct } };
  return {
    prompt,
    choices: choices.map((c) => tidyMath(c.choice_text)),
    answer: choices.findIndex((c) => c.letter === correct),
    why,
  };
}

const minutesOf = (iso: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return n("hour") * 60 + n("minute");
};

export async function loadSittings(
  db: SupabaseClient,
  clerkId: string,
  dayOf: (at: string) => number
): Promise<RealSitting[]> {
  const safe = async <T>(q: PromiseLike<{ data: unknown; error: unknown }>) => {
    try {
      const { data, error } = await q;
      return error || !data ? [] : (data as T[]);
    } catch {
      return [];
    }
  };
  const [catalog, runs, saved] = await Promise.all([
    safe<{
      id: string;
      skill_id: string;
      snapshots: CatalogDeliverySnapshot[];
      started_at: string;
      catalog_practice_responses: Answer[];
    }>(
      db
        .from("catalog_practice_sessions")
        .select(
          "id, skill_id, snapshots, started_at, catalog_practice_responses(question_id, student_answer, is_correct, response_time_seconds, answered_at, ordinal)"
        )
        .eq("student_id", clerkId)
        .order("started_at", { ascending: false })
        .limit(150)
    ),
    safe<{
      id: string;
      kind: string;
      form: { title?: string } | null;
      snapshots: CatalogDeliverySnapshot[];
      started_at: string;
      result: { predicted?: { total: number } } | null;
      quiz_run_responses: (Answer & { skill_id: string })[];
    }>(
      db
        .from("quiz_runs")
        .select(
          "id, kind, form, snapshots, started_at, result, quiz_run_responses(question_id, skill_id, student_answer, is_correct, response_time_seconds, answered_at, ordinal)"
        )
        .eq("student_id", clerkId)
        .order("started_at", { ascending: false })
        .limit(150)
    ),
    safe<{ question_id: string; source: string }>(
      db
        .from("student_saved_questions")
        .select("question_id, source")
        .eq("student_id", clerkId)
        .limit(5000)
    ),
  ]);
  const marks = new Map(saved.map((s) => [s.question_id, s.source]));

  const all: Sitting[] = [
    ...catalog.map((c) => ({
      id: `c:${c.id}`,
      mode: "skill" as Mode,
      name: "",
      startedAt: c.started_at,
      snapshots: c.snapshots ?? [],
      answers: c.catalog_practice_responses ?? [],
      catalogSkill: c.skill_id,
    })),
    ...runs
      .filter((r) => KIND_MODE[r.kind])
      .map((r) => ({
        id: `r:${r.id}`,
        mode: KIND_MODE[r.kind],
        name: r.kind === "domain-quiz" ? (r.form?.title ?? "") : "",
        startedAt: r.started_at,
        snapshots: r.snapshots ?? [],
        answers: r.quiz_run_responses ?? [],
        catalogSkill: null,
        score: r.result?.predicted?.total,
      })),
  ]
    .filter((s) => s.answers.length > 0)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  // A session's frozen copy of its questions is used first; a question without one (older and
  // seeded sessions) is read from the bank as it is now.
  const frozen = (x: unknown): x is CatalogDeliverySnapshot =>
    !!x && typeof x === "object" && "student" in x && "answer" in x;
  const missing = new Set<string>();
  for (const s of all) {
    const have = new Set(s.snapshots.filter(frozen).map((x) => x.student.id));
    for (const a of s.answers) if (!have.has(a.question_id)) missing.add(a.question_id);
  }
  const bank = new Map<string, CatalogDeliverySnapshot>();
  const ids = [...missing];
  for (let i = 0; i < ids.length && i < 2000; i += 200) {
    const found = await safe<QuizQuestionWithChoices>(
      db
        .from("quiz_questions")
        .select("*, answer_choices(*)")
        .in("id", ids.slice(i, i + 200))
    );
    for (const q of found) bank.set(q.id, fromBank(q));
  }

  const out: RealSitting[] = [];
  let sent = 0;
  for (const s of all) {
    if (sent >= MAX_QUESTIONS) break;
    const snaps = new Map(s.snapshots.filter(frozen).map((x) => [x.student.id, x]));
    const asked: RealSitting["asked"] = [];
    for (const a of [...s.answers].sort((x, y) => x.ordinal - y.ordinal)) {
      const snap = snaps.get(a.question_id) ?? bank.get(a.question_id);
      if (!snap) continue;
      const catalogSkill = snap.binding?.catalogSkillId ?? s.catalogSkill ?? "";
      const skill = skillOfSubSkill(subSkillOfQuestion(a.question_id, catalogSkill));
      if (!skill) continue;
      const sample = sampleOf(snap, a.student_answer);
      const mark = marks.get(a.question_id);
      asked.push({
        id: `${s.id}:${a.ordinal}`,
        questionId: a.question_id,
        skill,
        right: a.is_correct,
        seconds: a.response_time_seconds,
        picked: sample.typed
          ? -1
          : sample.choices.length
            ? letterIndex(snap, a.student_answer)
            : -1,
        sample,
        bookmarked: mark !== undefined,
        flagged: mark === "tutor_flag",
      });
    }
    if (!asked.length) continue;
    sent += asked.length;
    const name =
      s.mode === "skill"
        ? s.name || asked[0].skill
        : s.mode === "exam"
          ? MODES.exam
          : MODES[s.mode];
    out.push({
      id: s.id,
      day: dayOf(s.startedAt),
      mode: s.mode,
      name,
      at: minutesOf(s.startedAt),
      score: s.score,
      asked,
    });
  }
  // a day's sittings are numbered as they were sat: exams count up from the first
  const exams = out.filter((s) => s.mode === "exam").reverse();
  exams.forEach((s, i) => (s.name = `${MODES.exam} ${i + 1}`));
  return out;
}

/** A question read from the bank, in the frozen copy's shape (only what the log reads). */
function fromBank(q: QuizQuestionWithChoices): CatalogDeliverySnapshot {
  return {
    student: { ...q, answer_choices: q.answer_choices ?? [] },
    answer: { correctAnswer: q.correct_answer },
    review: { explanation_text: q.explanation_text },
  } as unknown as CatalogDeliverySnapshot;
}

function letterIndex(snap: CatalogDeliverySnapshot, given: string): number {
  const letters = [...(snap.student.answer_choices ?? [])].map((c) => c.letter).sort();
  return letters.indexOf(given.trim().toUpperCase() as (typeof letters)[number]);
}
