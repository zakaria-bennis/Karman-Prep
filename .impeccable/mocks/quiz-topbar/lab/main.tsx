// Quiz top bar lab (mock only, nothing ships). Renders the real QuizShell, untouched, and lays
// one of three top bar and margin options over it with options.css, scoped by
// html[data-topbar]. The question block, answer buttons, pencil, highlighter and calculator are
// the real components, so they look exactly as they do in the app.
//
//   ?option=today|a|b|c   which top bar (today = the shell as it ships)
//   ?q=math|rw|geo        first question (rw has a passage)
//   ?set=end              a timed section (countdown, mark for review)
//   ?scene=0..9&time=dawn|day|sunset|night   force the painting
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "../../../../src/app/globals.css";
import "./options.css";
import { themeStyleSheet } from "../../../../src/lib/themes/palettes";
import { quizRoleStyleSheet } from "../../../../src/lib/themes/quiz-roles";
import { ThemeProvider } from "../../../../src/components/shared/ThemeProvider";
import { QuizShell } from "../../../../src/components/learn/quiz-shell/QuizShell";
import { modeFor } from "../../../../src/lib/quiz/mode";
import { renderLandscape } from "../../../../src/lib/painting/scenes";
import { applyPaintingColors, pictureColors } from "../../../../src/lib/painting/colors";
import { paintPicture } from "../../../../src/lib/painting/painterly";
import { sceneOfDay } from "../../../../src/lib/painting/schedule";
import type { TimeOfDay } from "../../../../src/lib/painting/light";
import type { StudentQuizReview } from "../../../../src/types/quiz";
import { FIXTURE } from "../../../../tests/quiz-shell/fixture/questions";

const sheet = document.createElement("style");
sheet.textContent = `${themeStyleSheet()}\n${quizRoleStyleSheet()}`;
document.head.append(sheet);

const params = new URLSearchParams(location.search);
const option = (["today", "a", "b", "c"] as const).find((o) => o === params.get("option")) ?? "a";
const timed = params.get("set") === "end";
const html = document.documentElement;
html.dataset.topbar = option;

// Theme follows the device, as the app does: Warm ivory in light, Observatory in dark.
const dark = matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => {
  const id = dark.matches ? "observatory" : "ivory";
  html.dataset.theme = id;
  html.classList.toggle("dark", dark.matches);
  try {
    localStorage.setItem("karman-theme:visitor", id);
  } catch {
    /* lab only */
  }
};
syncTheme();
dark.addEventListener("change", syncTheme);

// The day's painting, finished and still (no wildlife, no particles): it sets the hue.
const time = (params.get("time") as TimeOfDay | null) ?? (dark.matches ? "night" : "day");
const scene = params.has("scene") ? Number(params.get("scene")) : sceneOfDay(new Date());
// Painted with the portal's own brush strokes, finished (no opening, no wildlife, no particles).
const canvas = document.createElement("canvas");
const painted = paintPicture(canvas, renderLandscape(scene, time), { animate: false });
const colors = pictureColors(painted.final);
if (colors) applyPaintingColors(html, colors);
html.style.setProperty("--painting", `url(${canvas.toDataURL("image/jpeg", 0.88)})`);

const TOTAL = 10;

function Host() {
  const items = useMemo(() => {
    const first = params.get("q") ?? "math";
    return FIXTURE.filter((f) => f.q.id === first).concat(FIXTURE.filter((f) => f.q.id !== first));
  }, []);
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  const [left, setLeft] = useState(false);
  const [bar, setBar] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setBar(document.querySelector<HTMLElement>('[data-quiz-bar="top"]'));
    find();
    const t = setInterval(find, 300);
    return () => clearInterval(t);
  }, [left]);
  const mode = modeFor(timed ? "timed" : "catalog", { baseSeconds: 1920, hasTutor: true });
  const subject = items[index]?.q.subject;
  if (left)
    return (
      <p className="lab-left">
        You left the set. <a href={location.href}>Back to the question</a>
      </p>
    );
  return (
    <>
      {option === "b" && <div className="lab-painting" aria-hidden="true" />}
      <QuizShell
        mode={mode}
        questions={items.map((f) => f.q)}
        total={TOTAL}
        attemptKey={`topbar-lab-${option}-${timed ? "end" : "set"}`}
        index={index}
        section={
          timed
            ? "Math, module 1"
            : subject === "reading"
              ? "Daily 10"
              : "Linear equations in one variable"
        }
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
        startedAtMs={Number(params.get("started") ?? Date.now() - 84_000)}
        hasCalculator={subject === "math"}
      />
      {bar &&
        option !== "today" &&
        createPortal(
          <>
            <button type="button" className="lab-exit" onClick={() => setLeft(true)}>
              {option === "b" ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" fill="none" />
                </svg>
              )}
              <span className={option === "b" ? "lab-sr" : undefined}>Exit</span>
            </button>
            {option === "c" && (
              <nav className="lab-nav" aria-label="Questions">
                <span className="lab-nav-count">
                  {index + 1}
                  <span> / {TOTAL}</span>
                </span>
                <ol>
                  {Array.from({ length: TOTAL }, (_, i) => {
                    const item = items[i];
                    const r = item ? reviews[item.q.id] : undefined;
                    const state = !item
                      ? "locked"
                      : r
                        ? r.isCorrect
                          ? "right"
                          : "wrong"
                        : "open";
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          data-state={state}
                          aria-current={i === index ? "step" : undefined}
                          aria-label={`Question ${i + 1}${state === "locked" ? ", not reached yet" : ""}`}
                          disabled={!item}
                          onClick={() => setIndex(i)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}
          </>,
          bar
        )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Host />
  </ThemeProvider>
);
