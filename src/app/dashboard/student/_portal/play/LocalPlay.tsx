"use client";
// Questions graded on this screen, not on a run the server keeps: a strategy quiz (the compass, at
// most five questions from the skill's lesson, src/lib/lessons) and the design page's made-up set
// (no student signed in). Same quiz screen as everything else; when the last one is done the player
// carries it into the ending.
import { useMemo, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

/** One made-up or lesson question: its words, four choices, the right one, why. */
export type LocalQuestion = {
  text: string;
  passage?: string;
  choices: string[];
  right: number;
  why: string;
  subject?: "math" | "reading" | "reading_writing";
};

const LETTERS = "ABCD";

function toQuestion(m: LocalQuestion, i: number, key: string, topic: string): StudentQuizQuestion {
  const id = `${key}-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  const subject = m.subject === "math" ? "math" : "reading_writing";
  return {
    id,
    node_id: "local",
    question_text: m.text,
    question_type: "multiple_choice",
    difficulty: "medium",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    hint: null,
    image_url: null,
    image_alt: null,
    subject,
    topic_cluster: topic,
    display_order: i + 1,
    passage_intro: null,
    passage: m.passage ?? null,
    passage_a: null,
    passage_b: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    figure_spec: null,
    answer_choices: m.choices.slice(0, 4).map((text, n) => ({
      id: `${id}-${n}`,
      question_id: id,
      letter: LETTERS[n],
      choice_text: text,
      choice_table_data: null,
      choice_figure_spec: null,
    })),
  } as unknown as StudentQuizQuestion;
}

export function LocalPlay({
  questions: made,
  section,
  topic,
  seed,
  onFinished,
  onExit,
}: {
  questions: LocalQuestion[];
  section: string;
  topic: string;
  seed?: string;
  /** Which were right, first to last. */
  onFinished(right: boolean[]): void;
  onExit(): void;
}) {
  // a fresh key a play (a uuid's first block), so nothing saved from an earlier one comes back
  const [key] = useState(() => Math.random().toString(16).slice(2, 10).padEnd(8, "0"));
  const questions = useMemo(
    () => made.map((m, i) => toQuestion(m, i, key, topic)),
    [made, key, topic]
  );
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: false })}
      questions={questions}
      total={questions.length}
      attemptKey={`local-${key}`}
      index={index}
      section={section}
      topic={topic}
      reviews={reviews}
      hasCalculator={questions[index]?.subject === "math"}
      shuffleSeed={seed}
      onNavigate={setIndex}
      onExit={onExit}
      onSubmit={(id, answer) => {
        const i = questions.findIndex((q) => q.id === id);
        const m = made[i];
        if (!m) return;
        setReviews((r) => ({
          ...r,
          [id]: {
            correct_answer: LETTERS[m.right],
            numeric_tolerance: null,
            explanation_text: m.why,
            explanation_per_choice: null,
            desmos_strategy: null,
            isCorrect: answer === LETTERS[m.right],
            studentAnswer: answer,
          } as unknown as StudentQuizReview,
        }));
      }}
      onFinish={() => onFinished(questions.map((q) => reviews[q.id]?.isCorrect === true))}
    />
  );
}
