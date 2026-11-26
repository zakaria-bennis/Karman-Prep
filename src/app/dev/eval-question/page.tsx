// /dev/eval-question?id=<uuid>: one bank question in the real student quiz screen, unanswered, for
// the explanation evaluation (screenshots of exactly what a student sees). Reads any id with the same
// loader the exams use; writes nothing. Production builds return 404.
import { notFound } from "next/navigation";
import { z } from "zod";
import { loadExamQuestions } from "@/lib/exams/questions";
import EvalQuestion from "./EvalQuestion";

export const dynamic = "force-dynamic";

export default async function EvalQuestionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const id = z
    .string()
    .uuid()
    .safeParse((await searchParams).id);
  if (!id.success) notFound();
  const found = (await loadExamQuestions([id.data])).get(id.data);
  if (!found) notFound();
  return <EvalQuestion question={found.snapshot.student} />;
}
