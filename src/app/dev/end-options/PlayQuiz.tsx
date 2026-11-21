"use client";
// A whole skill set to play, on the real quiz screen (QuizShell), for trying the portal from start
// to end on this computer (founder, 2026-11-20: "test out the ENTIRE student portal"). Opened with
// ?play=1 from a skill's Start. Eight made-up Circles questions with real answers: pick, Submit, see
// the grade, Next; Finish hands which were right to the ending and starts the transition (Intro.tsx).
// Nothing is saved.
import { useMemo, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

type Made = { text: string; choices: string[]; right: number; why: string };
const SET: Made[] = [
  {
    text: "A circle has a radius of 6. What is its circumference?",
    choices: ["12π", "6π", "24π", "36π"],
    right: 0,
    why: "Circumference is 2πr, so 2 × π × 6 = 12π.",
  },
  {
    text: "A circle has a diameter of 10. What is its area?",
    choices: ["10π", "20π", "25π", "100π"],
    right: 2,
    why: "The radius is half the diameter, 5, and the area is πr² = 25π.",
  },
  {
    text: "A circle in the xy-plane has the equation (x − 2)² + (y + 1)² = 49. What is its center?",
    choices: ["(−2, 1)", "(2, −1)", "(2, 1)", "(−2, −1)"],
    right: 1,
    why: "In (x − h)² + (y − k)² = r² the center is (h, k). Here h = 2 and k = −1.",
  },
  {
    text: "A circle has a radius of 9. What is the length of an arc with a central angle of 40°?",
    choices: ["4π", "9π", "2π", "π"],
    right: 2,
    why: "The arc is 40/360 = 1/9 of the circumference 18π, so 18π ÷ 9 = 2π.",
  },
  {
    text: "A circle has a radius of 6. What is the area of a sector with a central angle of 60°?",
    choices: ["3π", "12π", "36π", "6π"],
    right: 3,
    why: "The sector is 60/360 = 1/6 of the area 36π, so 6π.",
  },
  {
    text: "A circle has the equation x² + y² − 6x + 8y = 0. What is its radius?",
    choices: ["3", "4", "5", "25"],
    right: 2,
    why: "Complete the squares: (x − 3)² + (y + 4)² = 9 + 16 = 25, so the radius is 5.",
  },
  {
    text: "A circle has a radius of 8. What is the length of an arc with a central angle of 3π/4 radians?",
    choices: ["6π", "3π", "8π", "12π"],
    right: 0,
    why: "In radians an arc is rθ, so 8 × 3π/4 = 6π.",
  },
  {
    text: "A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What is its radius?",
    choices: ["3", "5", "10", "25"],
    right: 1,
    why: "The equation (x − h)² + (y − k)² = r² has radius r. Here r² = 25, so the radius is 5.",
  },
];
const LETTERS = "ABCD";

function question(m: Made, i: number, topic: string): StudentQuizQuestion {
  const id = `10000000-0000-4000-8000-00000000000${i + 1}`;
  return {
    id,
    node_id: "ma-skill-circles",
    question_text: m.text,
    question_type: "multiple_choice",
    difficulty: "medium",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    hint: null,
    image_url: null,
    image_alt: null,
    subject: "math",
    topic_cluster: topic,
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
    answer_choices: m.choices.map((text, n) => ({
      id: `${id}-${n}`,
      question_id: id,
      letter: LETTERS[n],
      choice_text: text,
      choice_table_data: null,
      choice_figure_spec: null,
    })),
  } as unknown as StudentQuizQuestion;
}

export function PlayQuiz({
  topic,
  onAnswers,
  onFinish,
  onExit,
}: {
  topic: string;
  /** Which were right, first to last, when the set is finished. */
  onAnswers: (right: boolean[]) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const questions = useMemo(() => SET.map((m, i) => question(m, i, topic)), [topic]);
  const [key] = useState(() => `dev-play-${Date.now()}`);
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: true })}
      questions={questions}
      total={SET.length}
      attemptKey={key}
      index={index}
      section="Skill set"
      topic={topic}
      reviews={reviews}
      hasCalculator
      onNavigate={setIndex}
      onExit={onExit}
      onSubmit={(id, answer) => {
        const i = questions.findIndex((q) => q.id === id);
        const m = SET[i];
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
      onFinish={() => {
        onAnswers(questions.map((q) => reviews[q.id]?.isCorrect === true));
        onFinish();
      }}
    />
  );
}
