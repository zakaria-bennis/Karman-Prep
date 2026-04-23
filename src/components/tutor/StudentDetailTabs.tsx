"use client";

// ============================================================
// StudentDetailTabs — tab container (client-side router to avoid
// unneeded server round-trips between tabs).
// ============================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NodeStatusSnapshot } from "@/lib/supabase/queries/tutor";
import type {
  QuizAttempt,
  FlaggedQuestion,
  QuizQuestionWithChoices,
  QuestionResponse,
} from "@/types/quiz";
import SkillsOverviewTab from "./SkillsOverviewTab";
import TutorControlsTab from "./TutorControlsTab";
import FlaggedTab from "./FlaggedTab";
import QuizHistoryTab from "./QuizHistoryTab";

type Tab = "skills" | "controls" | "flagged" | "quiz";

interface Props {
  studentId: string;
  statuses: NodeStatusSnapshot[];
  attempts: QuizAttempt[];
  flagged: Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
  responsesByAttempt: Record<string, QuestionResponse[]>;
  activeTab: Tab;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "skills",   label: "Skills Overview" },
  { key: "controls", label: "Tutor Controls" },
  { key: "flagged",  label: "Flagged Questions" },
  { key: "quiz",     label: "Quiz History" },
];

export default function StudentDetailTabs({
  studentId,
  statuses,
  attempts,
  flagged,
  responsesByAttempt,
  activeTab: initial,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initial);

  return (
    <div>
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1 mb-5 overflow-x-auto">
        {TABS.map((t) => {
          const count =
            t.key === "flagged" ? flagged.length :
            t.key === "quiz"    ? attempts.length :
            null;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "pb-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors",
                activeTab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {t.label}{count !== null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {activeTab === "skills"   && <SkillsOverviewTab statuses={statuses} />}
      {activeTab === "controls" && <TutorControlsTab studentId={studentId} statuses={statuses} />}
      {activeTab === "flagged"  && <FlaggedTab studentId={studentId} flagged={flagged} />}
      {activeTab === "quiz"     && <QuizHistoryTab attempts={attempts} responsesByAttempt={responsesByAttempt} />}
    </div>
  );
}
