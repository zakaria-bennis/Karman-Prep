"use client";

// ============================================================
// QuestionEditor — dark-themed, drag-reorderable, with hint field.
// ============================================================

import { Reorder } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { QuizQuestionWithChoices, QuizDifficulty } from "@/types/quiz";
import {
  actionDeleteQuestion,
  actionReorderQuestions,
  actionUpdateQuestionDifficulty,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Subject } from "@/data/curriculum";
import { QuestionCard } from "./question-editor/QuestionCard";
import { AddQuestionForm } from "./question-editor/AddQuestionForm";
import { TabsView } from "./question-editor/TabsView";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
  initialQuestions: QuizQuestionWithChoices[];
}

const DIFFICULTIES: QuizDifficulty[] = ["foundational", "intermediate", "advanced", "mastery"];

type ViewMode = "list" | "tabs";

export default function QuestionEditor({ nodeId, subject, topicCluster, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<QuizQuestionWithChoices[]>(initialQuestions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<QuizDifficulty | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<QuizDifficulty, number> = {
      foundational: 0,
      intermediate: 0,
      advanced: 0,
      mastery: 0,
    };
    for (const q of questions) c[q.difficulty]++;
    return c;
  }, [questions]);

  const filteredQuestions = useMemo(
    () => (filter === "all" ? questions : questions.filter((q) => q.difficulty === filter)),
    [questions, filter]
  );

  function handleReorder(next: QuizQuestionWithChoices[]) {
    setQuestions(next);
    startTransition(async () => {
      try {
        await actionReorderQuestions(
          next.map((q) => q.id),
          nodeId
        );
      } catch (err) {
        console.error(err);
      }
    });
  }

  async function handleDifficultyChange(qid: string, d: QuizDifficulty) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, difficulty: d } : q)));
    try {
      await actionUpdateQuestionDifficulty(qid, d, nodeId);
    } catch (err) {
      console.error(err);
      setQuestions(initialQuestions);
    }
  }

  async function handleDelete(qid: string) {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setQuestions((qs) => qs.filter((q) => q.id !== qid));
    try {
      await actionDeleteQuestion(qid, nodeId);
    } catch (err) {
      console.error(err);
      setQuestions(initialQuestions);
    }
  }

  function handleQuestionAdded(q: QuizQuestionWithChoices) {
    setQuestions((qs) => [...qs, q]);
    setShowAddForm(false);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Target: ~100 per node.{" "}
            {viewMode === "list"
              ? "Drag the handle to reorder."
              : "Click a tab to view its details."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-xs">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 font-semibold",
                viewMode === "list"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("tabs")}
              className={cn(
                "border-l border-slate-700 px-3 py-1.5 font-semibold",
                viewMode === "tabs"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Tabs
            </button>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <Plus className="h-3.5 w-3.5" /> {showAddForm ? "Cancel" : "New question"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddQuestionForm
          nodeId={nodeId}
          subject={subject}
          topicCluster={topicCluster}
          currentCount={questions.length}
          onAdded={handleQuestionAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Difficulty filter chips */}
      {questions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">Filter:</span>
          <FilterChip
            label={`All ${questions.length}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            hex="#6366f1"
          />
          {DIFFICULTIES.map((d) => (
            <FilterChip
              key={d}
              label={`${d} ${counts[d]}`}
              active={filter === d}
              onClick={() => setFilter(d)}
              hex={DIFF_HEX[d]}
            />
          ))}
          {filter !== "all" && (
            <span className="ml-2 text-slate-500">
              Showing {filteredQuestions.length} of {questions.length}
            </span>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
          No questions yet. Add one above or use Bulk Import tab.
        </div>
      ) : viewMode === "tabs" ? (
        <TabsView
          questions={filteredQuestions}
          questionNumberMap={new Map(questions.map((q, i) => [q.id, i + 1]))}
          nodeId={nodeId}
          activeId={activeTabId ?? filteredQuestions[0]?.id ?? null}
          onActiveChange={setActiveTabId}
          onDifficultyChange={handleDifficultyChange}
          onDelete={handleDelete}
          onImageChanged={(qid, url, path) => {
            setQuestions((qs) =>
              qs.map((x) => (x.id === qid ? { ...x, image_url: url, image_storage_path: path } : x))
            );
          }}
        />
      ) : filter === "all" ? (
        <Reorder.Group axis="y" values={questions} onReorder={handleReorder} className="space-y-3">
          {questions.map((q, i) => (
            <Reorder.Item key={q.id} value={q} className="list-none">
              <QuestionCard
                question={q}
                questionNumber={i + 1}
                nodeId={nodeId}
                onDifficultyChange={(d) => handleDifficultyChange(q.id, d)}
                onDelete={() => handleDelete(q.id)}
                onImageChanged={(url, path) => {
                  setQuestions((qs) =>
                    qs.map((x) =>
                      x.id === q.id ? { ...x, image_url: url, image_storage_path: path } : x
                    )
                  );
                }}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              No <strong className="text-slate-300">{filter}</strong> questions yet.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const idx = questions.findIndex((x) => x.id === q.id);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  questionNumber={idx + 1}
                  nodeId={nodeId}
                  onDifficultyChange={(d) => handleDifficultyChange(q.id, d)}
                  onDelete={() => handleDelete(q.id)}
                  onImageChanged={(url, path) => {
                    setQuestions((qs) =>
                      qs.map((x) =>
                        x.id === q.id ? { ...x, image_url: url, image_storage_path: path } : x
                      )
                    );
                  }}
                  dragDisabled
                />
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

// Difficulty hex (used by filter chips + card accents)
const DIFF_HEX: Record<QuizDifficulty, string> = {
  foundational: "#34d399",
  intermediate: "#fbbf24",
  advanced: "#fb923c",
  mastery: "#fb7185",
};

function FilterChip({
  label,
  active,
  onClick,
  hex,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hex: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 font-semibold capitalize transition-colors",
        active
          ? "text-white"
          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      )}
      style={
        active
          ? {
              background: hex + "30",
              borderColor: hex + "60",
              color: hex,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
