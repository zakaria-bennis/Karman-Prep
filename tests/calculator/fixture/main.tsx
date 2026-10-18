import CatalogPractice from "../../../src/components/learn/catalog-practice/CatalogPractice";
import type { CatalogSkill } from "../../../src/data/curriculum/skill-catalog";
import type { CatalogStudentSession } from "../../../src/lib/catalog-practice/student-entry";
import { catalogQuestions, catalogSession } from "./catalog-actions";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ThemeProvider, useTheme } from "../../../src/components/shared/ThemeProvider";
import { QuizProvider } from "../../../src/contexts/QuizContext";
import QuizEngine from "../../../src/components/learn/QuizEngine";
import type { MappedNode } from "../../../src/components/learn/ConstellationMap";
import DiagnosticClient from "../../../src/components/diagnostic/DiagnosticClient";
import type { DiagnosticQuestion } from "../../../src/components/diagnostic/_hooks/useDiagnosticState";
import DailyChallenge from "../../../src/components/learn/DailyChallenge";
import LearnLayout from "../../../src/components/learn/LearnLayout";
import type { DailySlot } from "../../../src/lib/daily-challenge/server";
import { CalculatorVersionProvider } from "../../../src/components/calculator/CalculatorVersion";
import { calculatorWindowStore } from "../../../src/components/calculator/calculator-window-store";
import "../../../src/app/globals.css";
import { themeStyleSheet } from "../../../src/lib/themes/palettes";
const sheet = document.createElement("style");
sheet.textContent = themeStyleSheet();
document.head.append(sheet);
declare global {
  // The v2 quiz specs (11) read and drive the page-session window store through this global.
  var __calculatorWindowStore: typeof calculatorWindowStore | undefined;
}
const params = new URLSearchParams(location.search);
const flow = params.get("flow");
const v2 = params.get("calc") === "v2"; // without calc=v2 every flow is v1, as before (AR-8)
if (v2) globalThis.__calculatorWindowStore = calculatorWindowStore;
const subject = params.get("subject") === "reading" ? "reading" : "math";
const node = { id: subject, subject, topic: "Calculator fixture" } as MappedNode;
const questions: DiagnosticQuestion[] = Array.from({ length: 3 }, (_, i) => ({
  id: `q${i}`,
  domain: i === 2 || subject === "reading" ? "info_ideas" : "algebra",
  difficulty: 1,
  conceptId: "fixture",
  passage:
    subject === "reading"
      ? "The morning light revealed the quiet valley. A second observation confirmed the result."
      : undefined,
  text: `Question ${i + 1}: evaluate $\\sin(30)$ and $(1,2)$.`,
  options: ["A) $1$", "B) $2$", "C) $3$", "D) $4$"],
  correct: "A",
  explanation: "Synthetic calculator fixture.",
}));
function Flow({ session }: { session: number }) {
  return flow === "daily" ? (
    <DailyChallenge
      math={
        {
          state: "ready",
          value: { day: "2026-10-16", subject: "math", question: catalogQuestions[0] },
        } as DailySlot
      }
      reading={{ state: "empty" }}
    />
  ) : flow === "catalog" ? (
    <CatalogPractice
      skill={
        {
          id: "fixture",
          subject: "math",
          label: "Fixture skill",
          domainLabel: "Algebra",
        } as CatalogSkill
      }
      initialSession={catalogSession() as unknown as CatalogStudentSession}
    />
  ) : flow === "practice" ? (
    <QuizProvider key={session}>
      <QuizEngine node={node} onClose={() => {}} onGoToNext={null} />
    </QuizProvider>
  ) : (
    <DiagnosticClient key={session} questions={questions} isSubscribed />
  );
}
function App() {
  const { setTheme, theme } = useTheme();
  const [session, setSession] = useState(0);
  const content = <Flow session={session} />;
  return (
    <>
      <div
        data-fixture-controls=""
        style={{ position: "fixed", zIndex: 1000, bottom: 0, right: 0 }}
      >
        <button onClick={() => setTheme(theme === "observatory" ? "ivory" : "observatory")}>
          Fixture theme
        </button>
        <button onClick={() => setSession((n) => n + 1)}>Fixture retake</button>
        {v2 && (
          <button
            aria-label="Fixture dock"
            onClick={() => calculatorWindowStore.set({ mode: "docked" })}
          >
            Fixture dock
          </button>
        )}
      </div>
      {!v2 ? (
        content
      ) : (
        <CalculatorVersionProvider version="v2">
          {flow === "catalog" || flow === "daily" ? <LearnLayout>{content}</LearnLayout> : content}
        </CalculatorVersionProvider>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
