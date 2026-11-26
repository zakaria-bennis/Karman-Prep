// /dev/eval-question?id=<uuid>: one bank question in the real student quiz screen, for the
// explanation evaluation (screenshots of exactly what a student sees). Reads any id with the same
// loader the exams use; writes nothing. Production builds return 404.
//
//   show=hint         the Hint button is there (press it to open the hint)
//   show=explanation  the question answered right, with its explanation beside it
//   qid=Q###          take the hint and explanation from that solver run instead of the bank
//                     (EVAL_DIR/solver_outputs/Q###.json; EVAL_DIR is set in .env.local)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { z } from "zod";
import { loadExamQuestions } from "@/lib/exams/questions";
import type { StudentQuizReview } from "@/types/quiz";
import EvalQuestion from "./EvalQuestion";

export const dynamic = "force-dynamic";

const Params = z.object({
  id: z.string().uuid(),
  show: z.enum(["question", "hint", "explanation"]).default("question"),
  qid: z
    .string()
    .regex(/^[A-Z]\d{2,3}$/)
    .optional(),
});

const Solver = z.object({ hint: z.string(), explanation: z.string() });

async function solverRun(qid: string) {
  const dir = process.env.EVAL_DIR;
  if (!dir) return null;
  try {
    const raw = await readFile(path.join(dir, "solver_outputs", `${qid}.json`), "utf8");
    return Solver.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export default async function EvalQuestionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const p = Params.safeParse(await searchParams);
  if (!p.success) notFound();
  const { id, show, qid } = p.data;
  const found = (await loadExamQuestions([id])).get(id);
  if (!found) notFound();
  const solver = qid ? await solverRun(qid) : null;
  if (qid && !solver) notFound();
  const { student, answer, review } = found.snapshot;
  const question = { ...student, hint: solver ? solver.hint : student.hint };
  const graded: StudentQuizReview | null =
    show === "explanation"
      ? {
          correct_answer: answer.correctAnswer,
          numeric_tolerance: answer.numericTolerance,
          explanation_text: solver ? solver.explanation : review.explanation_text,
          explanation_per_choice: solver ? null : review.explanation_per_choice,
          desmos_strategy: solver ? null : review.desmos_strategy,
          isCorrect: true,
          studentAnswer: answer.correctAnswer,
        }
      : null;
  return <EvalQuestion question={question} review={graded} />;
}
