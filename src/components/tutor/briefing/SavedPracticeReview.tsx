"use client";

import { useState } from "react";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import type { SavedPracticeReview as Review } from "@/lib/educator-briefing/saved-practice";

/** Local answer selection only; no student action, grading or persistence call. */
export default function SavedPracticeReview({ review }: { review: Review }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="space-y-6">
      <p role="note" className="rounded-xl border border-bronze bg-surface p-4 text-sm text-taupe">
        This shows the question version saved with the student&apos;s practice. Your selections stay
        on this page; they are not graded or saved. Original student answers remain unchanged.
      </p>
      {review.questions.map((item, index) => (
        <section
          key={item.question.id}
          id={`question-${index + 1}`}
          aria-labelledby={`question-heading-${index + 1}`}
          className="min-w-0 scroll-mt-24 rounded-xl border border-bronze bg-surface p-4 sm:p-6"
        >
          <h2
            id={`question-heading-${index + 1}`}
            className="mb-4 text-lg font-semibold text-ivory"
          >
            Question {index + 1}
          </h2>
          <CatalogQuestion
            question={item.question}
            answer={answers[item.question.id] ?? ""}
            disabled={false}
            onAnswer={(answer) => setAnswers((prior) => ({ ...prior, [item.question.id]: answer }))}
          />
          <details className="mt-5 border-t border-bronze pt-3 text-sm text-taupe">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold text-ivory">
              Student&apos;s saved answer
            </summary>
            <p className="break-words">{item.originalAnswer ?? "No answer recorded"}</p>
            {item.originalCorrect !== null && (
              <p>Saved result: {item.originalCorrect ? "Correct" : "Missed"}</p>
            )}
            {item.answeredAt && <p>Recorded {new Date(item.answeredAt).toISOString()} (UTC)</p>}
          </details>
        </section>
      ))}
    </div>
  );
}
