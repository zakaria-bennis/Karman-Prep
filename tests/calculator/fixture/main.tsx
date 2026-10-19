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
import { calculatorWindowStore } from "../../../src/components/calculator/calculator-window-store";
import "../../../src/app/globals.css";
import { themeStyleSheet } from "../../../src/lib/themes/palettes";
import {
  TRANSFER_DAILY_QUESTION,
  TRANSFER_DIAGNOSTIC_QUESTIONS,
  TRANSFER_TABLES_DAILY_QUESTION,
} from "./harness/transfer-questions";
const sheet = document.createElement("style");
sheet.textContent = themeStyleSheet();
document.head.append(sheet);
declare global {
  // The quiz specs read and drive the page-session window store through this global.
  var __calculatorWindowStore: typeof calculatorWindowStore | undefined;
}
const params = new URLSearchParams(location.search);
const flow = params.get("flow");
globalThis.__calculatorWindowStore = calculatorWindowStore;
// 14: ?questions=transfer swaps the diagnostic questions and the daily question.
const transferQuestions = params.get("questions") === "transfer";
// 07: ?questions=transfer-tables gives the daily flow a question table, a pair and f(3)=7.
const tableQuestions = params.get("questions") === "transfer-tables";
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
          value: {
            day: "2026-10-16",
            subject: "math",
            question: tableQuestions
              ? TRANSFER_TABLES_DAILY_QUESTION
              : transferQuestions
                ? TRANSFER_DAILY_QUESTION
                : catalogQuestions[0],
          },
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
    <DiagnosticClient
      key={session}
      questions={transferQuestions ? TRANSFER_DIAGNOSTIC_QUESTIONS : questions}
      isSubscribed
    />
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
        <button
          aria-label="Fixture dock"
          onClick={() => calculatorWindowStore.set({ mode: "docked" })}
        >
          Fixture dock
        </button>
      </div>
      {flow === "catalog" || flow === "daily" ? <LearnLayout>{content}</LearnLayout> : content}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
