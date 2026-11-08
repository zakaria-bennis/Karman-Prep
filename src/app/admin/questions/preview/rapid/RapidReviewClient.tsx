"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import type { QuizQuestionWithChoices, StudentQuizQuestion } from "@/types/quiz";
import type { QuizState } from "@/contexts/QuizContext";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import MathText from "@/components/learn/MathText";

export default function RapidReviewClient({ questions }: { questions: QuizQuestionWithChoices[] }) {
  const [status, setStatus] = useState("all");
  const [index, setIndex] = useState(0);
  const [jumpId, setJumpId] = useState("");
  const [answerVisible, setAnswerVisible] = useState(false);
  const [light, setLight] = useState(false);
  const jumpRef = useRef<HTMLInputElement>(null);
  const statuses = useMemo(
    () => Array.from(new Set(questions.map((q) => q.import_status ?? "ok"))).sort(),
    [questions]
  );
  const filtered = useMemo(
    () =>
      status === "all" ? questions : questions.filter((q) => (q.import_status ?? "ok") === status),
    [questions, status]
  );
  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1));
  const current = filtered[safeIndex] ?? null;
  const studentQuestion = current
    ? ({
        ...current,
        answer_choices: current.answer_choices.map(
          ({ id, question_id, letter, choice_text, choice_table_data }) => ({
            id,
            question_id,
            letter,
            choice_text,
            choice_table_data,
          })
        ),
      } as StudentQuizQuestion)
    : null;
  const viewState: Pick<
    QuizState,
    "phase" | "reviews" | "records" | "targetLength" | "currentIndex" | "selectedAnswer"
  > = {
    phase: "answering",
    reviews: {},
    records: [],
    targetLength: 1,
    currentIndex: 0,
    selectedAnswer: null,
  };

  useEffect(() => setAnswerVisible(false), [current?.id]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(filtered.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered.length]);

  function changeStatus(value: string) {
    setStatus(value);
    setIndex(0);
  }
  function jumpToId() {
    const target = questions.findIndex((q) => q.id.toLowerCase() === jumpId.trim().toLowerCase());
    if (target < 0) return;
    const q = questions[target];
    const matchingIndex = filtered.findIndex((item) => item.id === q.id);
    if (matchingIndex >= 0) setIndex(matchingIndex);
    else {
      setStatus("all");
      setIndex(target);
    }
    setJumpId("");
    jumpRef.current?.blur();
  }

  const statusLabel = current?.import_status ?? "ok";
  return (
    <div className={light ? "rapid-review rapid-preview-light" : "rapid-review"}>
      <style>{`
        .rapid-preview-light [class~="bg-[color:var(--sunk)]"] { background-color: #f7f5f0 !important; }
        .rapid-preview-light [class~="bg-[color:var(--card)]"] { background-color: #fff !important; }
        .rapid-preview-light [class~="bg-[color:var(--raised)]"] { background-color: #eee9df !important; }
        .rapid-preview-light [class~="text-[color:var(--ink)]"] { color: #242321 !important; }
        .rapid-preview-light [class~="text-[color:var(--mute)]"] { color: #66615a !important; }
        .rapid-preview-light [class~="border-[color:var(--line)]"] { border-color: #c8c0b3 !important; }
        .rapid-preview-light .source-function-math .katex-html,
        .rapid-preview-light .source-function-math .katex-html span { color: #242321; }
      `}</style>
      <header className="flex flex-wrap items-center gap-3 border-b border-[color:var(--line)] bg-[color:var(--card)] px-5 py-4">
        <Link
          href="/admin/questions/preview"
          className="mr-auto text-sm font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent-text)]"
        >
          ← Full question preview
        </Link>
        <label className="flex items-center gap-2 text-xs text-[color:var(--mute)]">
          Status
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--raised)] px-2 py-1.5 text-[color:var(--ink)]"
          >
            <option value="all">All stored statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            jumpToId();
          }}
        >
          <input
            ref={jumpRef}
            value={jumpId}
            onChange={(event) => setJumpId(event.target.value)}
            aria-label="Jump to question ID"
            placeholder="Question ID"
            className="w-44 rounded-md border border-[color:var(--line)] bg-[color:var(--raised)] px-2 py-1.5 font-mono text-xs text-[color:var(--ink)]"
          />
          <button className="rounded-md border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink)]">
            Jump
          </button>
        </form>
        <button
          type="button"
          onClick={() => setLight((value) => !value)}
          className="inline-flex items-center gap-1 rounded-md border border-[color:var(--line)] px-2 py-1.5 text-xs text-[color:var(--ink)]"
          aria-label={`Switch to ${light ? "dark" : "light"} preview`}
        >
          {light ? <Moon size={14} /> : <Sun size={14} />}
          {light ? "Dark" : "Light"}
        </button>
      </header>
      <section aria-label="Question workspace" className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto text-sm text-[color:var(--mute)]">
            {current ? (
              <>
                <span className="font-mono text-[color:var(--ink)]">{current.id}</span>
                <span className="mx-2">·</span>
                {statusLabel}
                <span className="mx-2">·</span>
                {safeIndex + 1} of {filtered.length}
              </>
            ) : (
              "No stored questions match this status."
            )}
          </div>
          <button
            type="button"
            onClick={() => setAnswerVisible((value) => !value)}
            disabled={!current}
            className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--ink)] disabled:opacity-50"
          >
            {answerVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            {answerVisible ? "Hide answer" : "Reveal answer"}
          </button>
          <button
            type="button"
            aria-label="Previous question"
            disabled={safeIndex <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="rounded-lg border border-[color:var(--line)] p-2 text-[color:var(--ink)] disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next question"
            disabled={safeIndex >= filtered.length - 1}
            onClick={() => setIndex((i) => Math.min(filtered.length - 1, i + 1))}
            className="rounded-lg border border-[color:var(--line)] p-2 text-[color:var(--ink)] disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="mb-5 text-xs text-[color:var(--mute)]">
          Held questions are not available in the stored question bank and are not included here.
        </p>
        {current && studentQuestion && (
          <section className="relative h-[calc(100vh-13rem)] min-h-[36rem] overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--sunk)] text-[color:var(--ink)]">
            <ActiveQuizScreen
              key={current.id}
              node={
                {
                  id: current.node_id ?? "admin-review",
                  subject: current.subject,
                  topic: current.topic_cluster,
                  status: "unlocked",
                } as unknown as MappedNode
              }
              q={studentQuestion}
              onClose={() => undefined}
              onSelectAnswer={() => undefined}
              onSubmit={() => undefined}
              onFlagClick={() => undefined}
              showExplanations={false}
              onToggleExplanations={() => undefined}
              onNext={() => undefined}
              readOnly
              stateOverride={viewState}
            />
            {answerVisible && (
              <div className="border-t border-[color:var(--line)] bg-[color:var(--card)] px-6 py-4 text-sm">
                <span className="font-semibold text-[color:var(--good)]">
                  Answer:{" "}
                  {current.answer_format === "numeric_entry" ? "" : `${current.correct_answer}. `}
                </span>
                {current.answer_format === "numeric_entry" && (
                  <MathText text={current.correct_answer} />
                )}
                {current.answer_format === "numeric_entry" && current.numeric_tolerance ? (
                  <span className="text-[color:var(--mute)]"> (±{current.numeric_tolerance})</span>
                ) : null}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
