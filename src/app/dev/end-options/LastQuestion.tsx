"use client";
// The set's last question on the real quiz screen (QuizShell, as the portal's sets use it), so the
// transition starts from the engine as it is today: the frosted glass, the bars, the dots. For the
// demo it answers itself: the answer is picked, Submit is pressed, the grade shows for a moment, and
// Finish is pressed, which hands over to the transition (Intro.tsx). Every question is made up.
import { useEffect, useMemo, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

const TOTAL = 8;
const LAST = TOTAL - 1;

function question(i: number): StudentQuizQuestion {
  const id = `00000000-0000-4000-8000-00000000000${i + 1}`;
  const last = i === LAST;
  const choices = last ? ["3", "5", "10", "25"] : ["1", "2", "3", "4"];
  return {
    id,
    node_id: "ma-skill-circles",
    question_text: last
      ? "A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What is the radius of the circle?"
      : `Question ${i + 1}`,
    question_type: "multiple_choice",
    difficulty: "medium",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    hint: null,
    image_url: null,
    image_alt: null,
    subject: "math",
    topic_cluster: "Circles",
    display_order: i + 1,
    passage_intro: null,
    passage: null,
    passage_a: null,
    passage_b: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    figure_spec: null,
    answer_choices: choices.map((text, n) => ({
      id: `${id}-${n}`,
      question_id: id,
      letter: "ABCD"[n],
      choice_text: text,
      choice_table_data: null,
      choice_figure_spec: null,
    })),
  } as unknown as StudentQuizQuestion;
}

function review(ok: boolean, answer: string): StudentQuizReview {
  return {
    correct_answer: "B",
    numeric_tolerance: null,
    explanation_text:
      "The equation (x − h)² + (y − k)² = r² has radius r. Here r² = 25, so the radius is 5.",
    explanation_per_choice: null,
    desmos_strategy: null,
    isCorrect: ok,
    studentAnswer: answer,
  } as unknown as StudentQuizReview;
}

/** Clicks the first button in the quiz whose words start with one of `words`. */
function press(...words: string[]) {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-quiz-shell] button")
  );
  buttons
    .find((b) => !b.disabled && words.some((w) => (b.textContent ?? "").trim().startsWith(w)))
    ?.click();
}

export function LastQuestion({
  answers,
  onFinish,
}: {
  /** Which of the set's questions were right, first to last. */
  answers: boolean[];
  onFinish: () => void;
}) {
  const questions = useMemo(() => Array.from({ length: TOTAL }, (_, i) => question(i)), []);
  // a fresh attempt each time, so nothing saved from the last run comes back
  const [key] = useState(() => `dev-end-options-${Date.now()}`);
  const lastRight = answers[LAST] ?? true;
  const pick = lastRight ? "B" : "C";
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>(() =>
    Object.fromEntries(
      questions.slice(0, LAST).map((q, i) => [q.id, review(answers[i] ?? true, "B")])
    )
  );

  // the demo: pick, Submit, a moment on the grade, Finish
  useEffect(() => {
    const steps = [
      window.setTimeout(() => {
        document
          .querySelector<HTMLButtonElement>(`[data-quiz-shell] [data-ink-choice="${pick}"] button`)
          ?.click();
      }, 1100),
      window.setTimeout(() => press("Submit"), 1900),
      window.setTimeout(() => press("Finish"), 3700),
    ];
    return () => steps.forEach((s) => window.clearTimeout(s));
  }, [pick]);

  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: true })}
      questions={questions}
      total={TOTAL}
      attemptKey={key}
      index={LAST}
      section="Skill set"
      topic="Circles"
      reviews={reviews}
      hasCalculator
      onNavigate={() => {}}
      onExit={() => {}}
      onSubmit={(id, answer) => setReviews((r) => ({ ...r, [id]: review(answer === "B", answer) }))}
      onFinish={onFinish}
    />
  );
}
