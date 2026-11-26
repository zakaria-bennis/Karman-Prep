"use client";
// The quiz screen with one question and nothing graded (see page.tsx).
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { portalFontVars } from "@/components/portal/fonts";
import type { StudentQuizQuestion } from "@/types/quiz";
import "@/components/portal/portal.css";

export default function EvalQuestion({ question }: { question: StudentQuizQuestion }) {
  // Inside the portal's own type (kp-shell), as the quiz is when a student opens it there.
  return (
    <div className={`kp-shell ${portalFontVars}`}>
      <QuizShell
        mode={modeFor("skill", { hasTutor: false })}
        questions={[question]}
        total={1}
        attemptKey={`eval-${question.id}`}
        index={0}
        section={question.subject === "math" ? "Math" : "Reading and Writing"}
        topic=""
        reviews={{}}
        hasCalculator={question.subject === "math"}
        onNavigate={() => {}}
        onExit={() => {}}
        onSubmit={() => {}}
        onFinish={() => {}}
      />
    </div>
  );
}
