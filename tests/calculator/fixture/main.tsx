import CatalogPractice from "../../../src/components/learn/catalog-practice/CatalogPractice";
import type { CatalogSkill } from "../../../src/data/curriculum/skill-catalog";
import type { CatalogStudentSession } from "../../../src/lib/catalog-practice/student-entry";
import { catalogSession } from "./catalog-actions";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ThemeProvider, useTheme } from "../../../src/components/shared/ThemeProvider";
import { QuizProvider } from "../../../src/contexts/QuizContext";
import QuizEngine from "../../../src/components/learn/QuizEngine";
import type { MappedNode } from "../../../src/components/learn/ConstellationMap";
import DiagnosticClient from "../../../src/components/diagnostic/DiagnosticClient";
import type { DiagnosticQuestion } from "../../../src/components/diagnostic/_hooks/useDiagnosticState";
import "../../../src/app/globals.css";
import { themeStyleSheet } from "../../../src/lib/themes/palettes";
const sheet = document.createElement("style");
sheet.textContent = themeStyleSheet();
document.head.append(sheet);
const params = new URLSearchParams(location.search);
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
function App() {
  const { setTheme, theme } = useTheme();
  const [session, setSession] = useState(0);
  return (
    <>
      <div style={{ position: "fixed", zIndex: 1000, bottom: 0, right: 0 }}>
        <button onClick={() => setTheme(theme === "observatory" ? "ivory" : "observatory")}>
          Fixture theme
        </button>
        <button onClick={() => setSession((n) => n + 1)}>Fixture retake</button>
      </div>
      {params.get("flow") === "catalog" ? (
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
      ) : params.get("flow") === "practice" ? (
        <QuizProvider key={session}>
          <QuizEngine node={node} onClose={() => {}} onGoToNext={null} />
        </QuizProvider>
      ) : (
        <DiagnosticClient key={session} questions={questions} isSubscribed />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
