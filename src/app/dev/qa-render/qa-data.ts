import "server-only";

import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices, StudentQuizQuestion } from "@/types/quiz";

// Dev-only: the live-question QA audit (scripts/import-tools/qa/render-audit.mjs) renders
// every live row in the real catalog question screen. Rows come from the full read-only QA
// export (`qa-audit.py export`), a file on the founder's machine named by QA_RENDER_EXPORT;
// nothing is read from or written to the database here.

export const QUESTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isQaRenderEnabled() {
  return process.env.NODE_ENV !== "production" && !!process.env.QA_RENDER_EXPORT;
}

type Row = QuizQuestionWithChoices & { is_live?: boolean | null };
let cache: { file: string; mtimeMs: number; byId: Map<string, Row> } | null = null;

async function rows(file: string): Promise<Map<string, Row>> {
  const { readFile, stat } = await import("node:fs/promises");
  const { mtimeMs } = await stat(file);
  if (cache?.file === file && cache.mtimeMs === mtimeMs) return cache.byId;
  const doc = JSON.parse(await readFile(file, "utf8")) as { rows?: Row[] };
  const byId = new Map((doc.rows ?? []).map((r) => [r.id, r]));
  cache = { file, mtimeMs, byId };
  return byId;
}

/** The student payload of one live row of the export, as the catalog lane would deliver it. */
export async function loadQaQuestion(
  id: string,
  file = process.env.QA_RENDER_EXPORT ?? ""
): Promise<StudentQuizQuestion | null> {
  if (!QUESTION_ID.test(id) || !file) return null;
  const row = (await rows(file)).get(id);
  if (!row || row.is_live !== true) return null;
  return toStudentQuizQuestion({ ...row, answer_choices: row.answer_choices ?? [] });
}
