// ============================================================
// /admin/questions/rejected — recovery bin for questions the
// admin removed via the preview/validation flow.
//
// Each row in rejected_questions is a JSONB snapshot of the
// quiz_questions row + its answer_choices at the moment of
// rejection. Two per-row actions:
//
//   · Restore  — re-insert into quiz_questions with the
//                original UUID so any external references
//                (analytics, history) still resolve.
//   · Permanent delete — drop the rejected_questions row.
//                Question is already gone from quiz_questions
//                (that happened at reject time), so this is
//                purely a recovery-bin housekeeping action.
//
// Soft-rejection happens elsewhere (the preview page); this
// page is the recovery UI, not the rejection UI.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Archive } from "lucide-react";
import {
  selectRejectedQuestions,
  selectRejectedQuestionCount,
} from "@/lib/supabase/queries/quiz/rejected";
import RejectedClient from "./RejectedClient";

export const metadata: Metadata = { title: "Admin — Rejected questions | Karman" };

export default async function RejectedQuestionsPage() {
  const [rows, total] = await Promise.all([
    selectRejectedQuestions(200),
    selectRejectedQuestionCount(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/questions/review"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to review
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Archive className="h-5 w-5 text-slate-400" /> Rejected questions
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {total === 0
            ? "Nothing in the recovery bin."
            : `${total} rejected question${total === 1 ? "" : "s"} · showing most recent ${Math.min(
                rows.length,
                total
              )}`}
          . Restore puts the question back into the bank with its original id. Permanent delete
          drops the snapshot for good.
        </p>
      </div>

      <RejectedClient rows={rows} />
    </div>
  );
}
