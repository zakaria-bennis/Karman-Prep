// One full-length exam: its start page, its modules, the break and the ending. The start page is
// unreachable outside the Saturday window (6 am to midnight in the student's own time zone) unless an
// Exam pass or the admin test switch opens it; an exam already started always opens, since it keeps
// its own time.
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { examAccess, userIdOf } from "@/lib/exams/access";
import { ExamError, sittingState, startInfo } from "@/lib/exams/service";
import { ExamFlow } from "@/components/learn/exam/ExamFlow";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ form: string }> }) {
  const form = Number((await params).form);
  if (!Number.isInteger(form) || form < 1 || form > 99) notFound();
  const { userId } = await safeAuth();
  if (!userId) redirect(`/sign-in?redirect_url=/learn/exam/${form}`);
  const now = new Date();
  const state = await sittingState(userId, form, await userIdOf(userId), now);
  if (state) return <ExamFlow form={form} start={null} initial={state.view} />;
  const info = await startInfo(userId, form, await examAccess(userId), now).catch(
    (error: unknown) => {
      if (error instanceof ExamError) return null;
      throw error;
    }
  );
  if (!info) redirect("/learn/tests");
  return <ExamFlow form={form} start={info} initial={null} />;
}
