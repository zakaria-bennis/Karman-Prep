"use client";

import { DOMAIN_SECTION, type SATDomain } from "@/types";
import { QuestionGuide } from "@/components/learn/quiz/QuizTools";
import styles from "@/components/learn/quiz/workspace.module.css";

interface Props {
  open: boolean;
  questions: { id: string; domain: SATDomain; correct: string }[];
  currentIdx: number;
  answers: Record<string, string>;
  bookmarkedIds: Set<string>;
  hintedIds: Set<string>;
  currentSection: "math" | "rw";
  onClose(): void;
  onJump(idx: number): void;
}
export function QuestionNavigator({
  open,
  questions,
  currentIdx,
  answers,
  bookmarkedIds,
  currentSection,
  onClose,
  onJump,
}: Props) {
  if (!open) return null;
  return (
    <QuestionGuide onClose={onClose}>
      <p>Move freely within your active module. Other modules are locked.</p>
      {(["rw", "math"] as const).map((section) => (
        <section key={section}>
          <h3>
            {section === "rw" ? "Reading & Writing" : "Math"}
            {section !== currentSection ? " — Locked" : " — Active module"}
          </h3>
          <div className={styles.guideGrid}>
            {questions
              .map((q, idx) => ({ ...q, idx }))
              .filter((q) => DOMAIN_SECTION[q.domain] === section)
              .map((q, position) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={section !== currentSection}
                  aria-current={q.idx === currentIdx ? "true" : undefined}
                  aria-label={`Question ${position + 1} of this section${section !== currentSection ? " — locked" : ""}${answers[q.id] ? " — answered" : " — unanswered"}${bookmarkedIds.has(q.id) ? " — bookmarked" : ""}`}
                  onClick={() => {
                    onJump(q.idx);
                    onClose();
                  }}
                >
                  {position + 1} {answers[q.id] ? "✓" : "○"}
                  {bookmarkedIds.has(q.id) ? " ⚑" : ""}
                </button>
              ))}
          </div>
        </section>
      ))}
      <p>✓ Answered · ○ Unanswered · ⚑ Bookmarked</p>
    </QuestionGuide>
  );
}
