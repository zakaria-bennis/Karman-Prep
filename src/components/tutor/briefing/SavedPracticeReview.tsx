"use client";

import { useState } from "react";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import type { SavedPracticeReview as Review } from "@/lib/educator-briefing/saved-practice";
import "../student-detail.css";

/** Local answer selection only; no student action, grading or persistence call. */
export default function SavedPracticeReview({ review }: { review: Review }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="kp-st">
      <p role="note" className="kp-st-note">
        This shows the question version saved with the student&apos;s practice. Your selections stay
        on this page; they are not graded or saved. Original student answers remain unchanged.
      </p>
      {review.questions.map((item, index) => (
        <section
          key={item.question.id}
          id={`question-${index + 1}`}
          aria-labelledby={`question-heading-${index + 1}`}
          className="kp-st-sub kp-st-review"
        >
          <h2 id={`question-heading-${index + 1}`}>Question {index + 1}</h2>
          <CatalogQuestion
            question={item.question}
            answer={answers[item.question.id] ?? ""}
            disabled={false}
            onAnswer={(answer) => setAnswers((prior) => ({ ...prior, [item.question.id]: answer }))}
          />
          <details className="kp-st-saved">
            <summary>Student&apos;s saved answer</summary>
            <p className="kp-st-text">{item.originalAnswer ?? "No answer recorded"}</p>
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
