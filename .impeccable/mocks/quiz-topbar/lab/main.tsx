// Quiz bars lab (mock only, nothing ships). Renders the real QuizShell, exactly as it ships, on
// the shell's fixture questions, so the one open choice can be compared on a phone:
//
//   ?variant=top     the tools sit on a row under the top bar (shipped, the pick)
//   ?variant=thumb   the tools sit just above Back and Next, in thumb reach (options.css)
//   ?q=math|rw|geo   first question (rw has a passage)
import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import "../../../../src/app/globals.css";
import "./options.css";
import { themeStyleSheet } from "../../../../src/lib/themes/palettes";
import { quizRoleStyleSheet } from "../../../../src/lib/themes/quiz-roles";
import { ThemeProvider } from "../../../../src/components/shared/ThemeProvider";
import { QuizShell } from "../../../../src/components/learn/quiz-shell/QuizShell";
import { modeFor } from "../../../../src/lib/quiz/mode";
import type { StudentQuizReview } from "../../../../src/types/quiz";
import { FIXTURE } from "../../../../tests/quiz-shell/fixture/questions";

const sheet = document.createElement("style");
sheet.textContent = `${themeStyleSheet()}\n${quizRoleStyleSheet()}`;
document.head.append(sheet);

const params = new URLSearchParams(location.search);
const html = document.documentElement;
html.dataset.variant = params.get("variant") === "thumb" ? "thumb" : "top";

// Theme follows the device, as the app does: Warm ivory in light, Observatory in dark.
const dark = matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => {
  const id = dark.matches ? "observatory" : "ivory";
  html.dataset.theme = id;
  html.classList.toggle("dark", dark.matches);
};
syncTheme();
dark.addEventListener("change", syncTheme);

function Host() {
  const items = useMemo(() => {
    const first = params.get("q") ?? "math";
    return FIXTURE.filter((f) => f.q.id === first).concat(FIXTURE.filter((f) => f.q.id !== first));
  }, []);
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  const [left, setLeft] = useState(false);
  const subject = items[index]?.q.subject;
  if (left)
    return (
      <p className="lab-left">
        You left the set. <a href={location.href}>Back to the question</a>
      </p>
    );
  return (
    <QuizShell
      mode={modeFor("catalog", { hasTutor: true })}
      questions={items.map((f) => f.q)}
      total={10}
      attemptKey={`bars-lab-${html.dataset.variant}`}
      index={index}
      section={subject === "reading" ? "Daily 10" : "Linear equations in one variable"}
      topic={subject === "reading" ? items[index]?.q.topic_cluster : "Algebra"}
      onNavigate={setIndex}
      onSubmit={(id, answer) => {
        const item = items.find((f) => f.q.id === id)!;
        const isCorrect = answer.trim() === item.key.correct_answer;
        setReviews((r) => ({
          ...r,
          [id]: { ...item.key, isCorrect, studentAnswer: answer, points: isCorrect ? 10 : 0 },
        }));
      }}
      onFinish={() => setLeft(true)}
      onExit={() => setLeft(true)}
      onReportProblem={() => undefined}
      reviews={reviews}
      startedAtMs={Date.now() - 84_000}
      hasCalculator={subject === "math"}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Host />
  </ThemeProvider>
);
