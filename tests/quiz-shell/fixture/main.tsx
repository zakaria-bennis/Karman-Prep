import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import "../../../src/app/globals.css";
import { themeStyleSheet } from "../../../src/lib/themes/palettes";
import { quizRoleStyleSheet } from "../../../src/lib/themes/quiz-roles";
import { ThemeProvider } from "../../../src/components/shared/ThemeProvider";
import { QuizShell } from "../../../src/components/learn/quiz-shell/QuizShell";
import { modeFor, type HostKind } from "../../../src/lib/quiz/mode";
import type { StudentQuizReview } from "../../../src/types/quiz";
import { FIXTURE, longSet } from "./questions";

const sheet = document.createElement("style");
sheet.textContent = `${themeStyleSheet()}\n${quizRoleStyleSheet()}`;
document.head.append(sheet);

const params = new URLSearchParams(location.search);
const set = params.get("set") ?? "instant";
const host: HostKind = set === "end" ? "diagnostic" : set === "review" ? "review" : "skill";
const theme = params.get("theme");
if (theme) {
  try {
    localStorage.setItem("karman-theme:visitor", theme);
  } catch {
    /* fixture only */
  }
  document.documentElement.dataset.theme = theme;
}

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
  const [levelUp, setLevelUp] = useState<null | {
    skill: string;
    before: "developing";
    after: "proficient";
  }>(null);
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
        const hard = (item.q.difficulty_level ?? 0) >= 5;
        const points = isCorrect ? (hard ? 15 : 10) : 0;
        setReviews((r) => ({
          ...r,
          [id]: { ...item.key, isCorrect, studentAnswer: answer, points },
        }));
      }}
      levelUp={levelUp}
      onLevelUpDone={() => setDone(true)}
      onFinish={(reason) => {
        if (params.get("levelup") === "1" && !levelUp) {
          setLevelUp({ skill: "Linear equations", before: "developing", after: "proficient" });
          return;
        }
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

const DEMOS: [string, string][] = [
  ["Practice: reading question with a passage", "?set=instant&q=rw"],
  ["Practice: right triangle with a figure", "?set=instant&q=geo"],
  ["Practice: math with the calculator", "?set=instant&q=math&calc=1"],
  ["Practice: table answer choices", "?set=instant&q=table"],
  ["Practice: typed answer", "?set=instant&q=numeric"],
  ["Practice set of 6: rewards, dots and streaks", "?set=instant&length=6"],
  ["Practice set of 2 that ends in a level up", "?set=instant&length=2&levelup=1"],
  ["Timed section of 6: mark for review and the check page", "?set=end&length=6"],
  ["Timed section at double time", "?set=end&length=6&acc=double"],
  ["Student with a tutor: Ask my tutor", "?set=instant&q=math&tutor=1"],
  ["Review mode: answers locked, explanations shown", "?set=review"],
  ["Light theme (Warm ivory)", "?set=instant&q=rw&theme=ivory"],
];

function Menu() {
  return (
    <main
      style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", color: "var(--quiz-text)" }}
    >
      <h1 style={{ fontSize: 26, margin: "0 0 18px" }}>Karman quiz screen demo</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {DEMOS.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              style={{
                display: "block",
                padding: "14px 16px",
                border: "1px solid var(--quiz-line)",
                borderRadius: 10,
                color: "var(--quiz-text)",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

const showMenu = !params.has("set") && !params.has("q") && !params.has("length");
document.body.style.background = "var(--quiz-bg)";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>{showMenu ? <Menu /> : <Host />}</ThemeProvider>
);
