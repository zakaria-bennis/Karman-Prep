"use client";

// ============================================================
// TabsView — compact numbered chips above a single-question
// detail panel. Toggle target of the "List | Tabs" view-mode
// switcher in QuestionEditor.
// ============================================================

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizDifficulty, QuizDifficultyLevel, QuizQuestionWithChoices } from "@/types/quiz";
import { DIFFICULTY_LEVEL_HEX } from "@/types/quiz";
import { QuestionCard } from "./QuestionCard";

export function TabsView({
  questions,
  questionNumberMap,
  nodeId,
  activeId,
  onActiveChange,
  onDifficultyChange,
  onDelete,
  onImageChanged,
}: {
  questions: QuizQuestionWithChoices[];
  questionNumberMap: Map<string, number>;
  nodeId: string;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onDifficultyChange: (qid: string, d: QuizDifficulty) => void;
  onDelete: (qid: string) => void;
  onImageChanged: (qid: string, url: string | null, path: string | null) => void;
}) {
  const active = questions.find((q) => q.id === activeId) ?? questions[0] ?? null;

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bronze p-8 text-center text-sm text-taupe">
        No questions at this filter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-bronze bg-surface/40 p-2">
        {questions.map((q) => {
          const n = questionNumberMap.get(q.id) ?? 0;
          const hex = DIFFICULTY_LEVEL_HEX[(q.difficulty_level ?? 1) as QuizDifficultyLevel];
          const isActive = active?.id === q.id;
          return (
            <button
              key={q.id}
              onClick={() => onActiveChange(q.id)}
              className={cn(
                "flex min-w-[3.25rem] items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold tabular-nums transition-colors",
                isActive ? "text-ivory" : "text-taupe hover:text-ivory"
              )}
              style={
                isActive
                  ? {
                      background: hex + "30",
                      borderColor: hex,
                    }
                  : {
                      background: hex + "12",
                      borderColor: hex + "30",
                    }
              }
              title={q.question_text.slice(0, 80)}
            >
              <span>Q{n}</span>
              <span className="opacity-60" style={{ color: hex }}>
                ·{q.difficulty_level ?? 1}
              </span>
              {q.image_url && <ImageIcon className="h-2.5 w-2.5 opacity-70" />}
            </button>
          );
        })}
      </div>

      {/* Active question's full card */}
      {active && (
        <QuestionCard
          question={active}
          questionNumber={questionNumberMap.get(active.id) ?? 0}
          nodeId={nodeId}
          onDifficultyChange={(d) => onDifficultyChange(active.id, d)}
          onDelete={() => {
            onDelete(active.id);
            onActiveChange(null);
          }}
          onImageChanged={(url, path) => onImageChanged(active.id, url, path)}
          dragDisabled
          forceExpanded
        />
      )}
    </div>
  );
}
