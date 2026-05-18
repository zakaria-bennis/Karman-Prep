// ============================================================
// /admin/questions/inspect/[id] — per-question deep view.
//
// Left column: student-style render of the question (mirrors what
// a quiz-taker would see).
// Right column: every finding for this row, grouped by severity,
// with the LLM grader's reasoning when available.
//
// Above: source PDF + page + status + actions (accept-live,
// mark-needs-review, mark-finding-resolved).
//
// Data: selectQuestionForInspection() pulls one quiz_question row
// + answer_choices + all unresolved findings.
// ============================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Microscope } from "lucide-react";
import { selectQuestionForInspection } from "@/lib/supabase/queries/quiz/findings";
import { selectQuestionHistory } from "@/lib/supabase/queries/quiz/history";
import InspectorDetailClient from "./InspectorDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Inspector — Question detail | Karman" };

export default async function InspectorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await selectQuestionForInspection(id);
  if (!data) notFound();

  const { question, findings } = data;
  const history = await selectQuestionHistory(id, 25);
  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/questions/inspect"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to inspector
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Microscope className="h-5 w-5 text-violet-400" /> Question inspector
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {question.source_pdf ?? "(unknown source)"} · page {question.source_page ?? "?"} ·{" "}
          {question.domain ?? "—"} · {question.concept_slug ?? "no concept"} · {findings.length}{" "}
          active finding{findings.length === 1 ? "" : "s"} · {history.length} previous edit
          {history.length === 1 ? "" : "s"}
        </p>
      </div>

      <InspectorDetailClient question={question} findings={findings} history={history} />
    </div>
  );
}
