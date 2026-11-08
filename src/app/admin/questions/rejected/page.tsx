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
import { WbPage, WbStats } from "@/components/admin/workbench";
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
    <WbPage
      title="Rejected questions"
      summary="Questions removed on the preview page. Restore puts one back into the bank with its original id. Permanent delete drops the snapshot for good."
      actions={
        <Link className="wb-btn" href="/admin/questions/review">
          Back to review
        </Link>
      }
    >
      <WbStats
        items={[
          { label: "In the recovery bin", value: total.toLocaleString("en-US") },
          { label: "Shown (most recent)", value: Math.min(rows.length, total) },
        ]}
      />
      <RejectedClient rows={rows} />
    </WbPage>
  );
}
