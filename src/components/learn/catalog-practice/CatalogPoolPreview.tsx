"use client";

import { useState } from "react";
import type { StudentQuizQuestion } from "@/types/quiz";
import CatalogQuestion from "./CatalogQuestion";

/** Browsing the admitted pool never starts a session or reveals an answer key. */
export default function CatalogPoolPreview({
  questions,
  onReload,
}: {
  questions: StudentQuizQuestion[];
  onReload: () => void;
}) {
  const [index, setIndex] = useState(0);
  if (!questions.length) {
    return (
      <div className="mt-6 space-y-3 text-sm text-taupe">
        <p>No reviewed questions are available here right now. Try another skill or reload.</p>
        <button type="button" onClick={onReload} className="min-h-11 underline underline-offset-4">
          Reload questions
        </button>
      </div>
    );
  }
  const current = Math.min(index, questions.length - 1);
  return (
    <section aria-label="Available questions" className="mt-8 min-w-0 border-t border-bronze pt-6">
      <p className="mb-3 text-sm text-taupe">
        {questions.length} reviewed {questions.length === 1 ? "question" : "questions"} available
      </p>
      <p className="mb-6 text-sm text-taupe">
        Browse a preview below. Choose Start practice to answer questions and save your work.
      </p>
      <div aria-live="polite" className="mb-4 text-sm font-semibold">
        Question preview
      </div>
      <CatalogQuestion question={questions[current]} answer="" disabled onAnswer={() => {}} />
      {questions.length > 1 && (
        <nav aria-label="Question previews" className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setIndex(current - 1)}
            className="min-h-11 rounded-xl border border-bronze px-4 py-2 disabled:opacity-40"
          >
            Previous preview
          </button>
          <button
            type="button"
            disabled={current === questions.length - 1}
            onClick={() => setIndex(current + 1)}
            className="min-h-11 rounded-xl border border-bronze px-4 py-2 disabled:opacity-40"
          >
            Next preview
          </button>
        </nav>
      )}
    </section>
  );
}
