import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import "../../../src/app/globals.css";
import { themeStyleSheet } from "../../../src/lib/themes/palettes";
import { ThemeProvider } from "../../../src/components/shared/ThemeProvider";
import { QuizShell } from "../../../src/components/learn/quiz-shell/QuizShell";
import { modeFor, type HostKind } from "../../../src/lib/quiz/mode";
import type { StudentQuizReview } from "../../../src/types/quiz";
import { FIXTURE, longSet } from "./questions";

const sheet = document.createElement("style");
sheet.textContent = themeStyleSheet();
document.head.append(sheet);

const params = new URLSearchParams(location.search);
const set = params.get("set") ?? "instant";
const host: HostKind = set === "end" ? "diagnostic" : set === "review" ? "review" : "skill";
const theme = params.get("theme");
if (theme) document.documentElement.dataset.theme = theme;

function Host() {
  const items = useMemo(() => {
    const length = Number(params.get("length") ?? 0);
    if (length) return longSet(length);
    const only = params.get("q");
    return only
      ? FIXTURE.filter((f) => f.q.id === only).concat(FIXTURE.filter((f) => f.q.id !== only))
      : FIXTURE;
  }, []);
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>(() =>
    host === "review" ? Object.fromEntries(items.map((f) => [f.q.id, f.key])) : {}
  );
  const [done, setDone] = useState(false);
  const mode = modeFor(host, { baseSeconds: 1920, hasTutor: params.get("tutor") === "1" });
  if (done) return <p data-fixture-done>Section submitted.</p>;
  return (
    <QuizShell
      mode={mode}
      questions={items.map((f) => f.q)}
      attemptKey={`fixture-${set}`}
      index={index}
      section={items[index]?.q.subject === "reading" ? "Reading and Writing" : "Math"}
      onNavigate={setIndex}
      onSubmit={(id, answer) => {
        const item = items.find((f) => f.q.id === id)!;
        const isCorrect = answer.trim() === item.key.correct_answer;
        setReviews((r) => ({ ...r, [id]: { ...item.key, isCorrect, studentAnswer: answer } }));
      }}
      onFinish={(reason) => {
        setDone(true);
        (globalThis as { __finish?: string }).__finish = reason ?? "submit";
      }}
      onExit={() => setDone(true)}
      onReportProblem={() => undefined}
      reviews={reviews}
      startedAtMs={Number(params.get("started") ?? Date.now())}
      hasCalculator={params.get("calc") === "1"}
      accommodation={(params.get("acc") as "standard" | "double" | null) ?? "standard"}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Host />
  </ThemeProvider>
);
