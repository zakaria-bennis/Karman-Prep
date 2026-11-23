"use client";

// ============================================================
// StudentDetailTabs — tab container (client-side router to avoid
// unneeded server round-trips between tabs). Styled with the
// portal's own variables (student-detail.css), like the student
// and parent portals.
// ============================================================

import { useState } from "react";
import "./student-detail.css";
import "@/components/portal-extras/forms.css";
import type {
  QuizAttempt,
  FlaggedQuestion,
  QuizQuestionWithChoices,
  QuestionResponse,
} from "@/types/quiz";
import FlaggedTab from "./FlaggedTab";
import QuizHistoryTab from "./QuizHistoryTab";

type Tab = "flagged" | "quiz";

interface Props {
  studentId: string;
  attempts: QuizAttempt[];
  flagged: Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
  responsesByAttempt: Record<string, QuestionResponse[]>;
  activeTab: Tab;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "flagged", label: "Flagged questions" },
  { key: "quiz", label: "Quiz history" },
];

export default function StudentDetailTabs({
  studentId,
  attempts,
  flagged,
  responsesByAttempt,
  activeTab: initial,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initial);

  return (
    <div className="kp-st">
      <div className="kp-st-tabs" role="tablist" aria-label="Student detail">
        {TABS.map((t) => {
          const count =
            t.key === "flagged" ? flagged.length : t.key === "quiz" ? attempts.length : null;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              aria-current={activeTab === t.key ? "page" : undefined}
              onClick={() => setActiveTab(t.key)}
              className="kp-st-tab"
            >
              {t.label}
              {count !== null && <small>{count}</small>}
            </button>
          );
        })}
      </div>

      {activeTab === "flagged" && <FlaggedTab studentId={studentId} flagged={flagged} />}
      {activeTab === "quiz" && (
        <QuizHistoryTab attempts={attempts} responsesByAttempt={responsesByAttempt} />
      )}
    </div>
  );
}
