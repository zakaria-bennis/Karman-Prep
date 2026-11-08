"use client";

// ============================================================
// QuizHistoryTab — every quiz attempt by this student, expandable
// to show the adaptive path and individual question responses.
// ============================================================

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAttempt, QuestionResponse, ConfidenceBand } from "@/types/quiz";
import { CONFIDENCE_COLORS } from "@/types/quiz";
import { getNode } from "@/data/curriculum";

interface Props {
  attempts: QuizAttempt[];
  responsesByAttempt: Record<string, QuestionResponse[]>;
}

export default function QuizHistoryTab({ attempts, responsesByAttempt }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...attempts].sort((a, b) => b.started_at.localeCompare(a.started_at)),
    [attempts]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--line)] p-10 text-center">
        <p className="text-sm text-[color:var(--mute)]">No quiz attempts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((a) => {
        const node = getNode("reading", a.node_id) ?? getNode("math", a.node_id) ?? null;
        const nodeTopic = node?.topic ?? a.node_id;

        const band = a.confidence_band as ConfidenceBand | null;
        const bandStyle = band ? CONFIDENCE_COLORS[band] : null;
        const responses = responsesByAttempt[a.id] ?? [];
        const timeTaken =
          a.completed_at && a.started_at
            ? Math.round(
                (new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000
              )
            : null;
        const isOpen = openId === a.id;

        // Adaptive path difficulty distribution summary
        const diffs = a.adaptive_path.map((s) => s.difficulty);
        const distinct = Array.from(new Set(diffs));

        return (
          <article
            key={a.id}
            className="rounded-lg border border-[color:var(--line)] bg-[color:var(--card)]"
          >
            <header
              className="flex cursor-pointer items-center gap-4 p-4 hover:bg-[color:var(--card)]"
              onClick={() => setOpenId(isOpen ? null : a.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-[color:var(--ink)]">{nodeTopic}</h3>
                  <span className="text-xs text-[color:var(--mute)]">#{a.attempt_number}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--mute)]">
                  <span>{new Date(a.started_at).toLocaleString()}</span>
                  {timeTaken !== null && (
                    <>
                      <span>•</span>
                      <span>
                        {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>Reached: {distinct.join(" → ") || "—"}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {a.score !== null ? (
                  <>
                    <div
                      className={cn(
                        "text-2xl font-extrabold tabular-nums",
                        (a.score ?? 0) >= 80
                          ? "text-[color:var(--good)]"
                          : (a.score ?? 0) >= 60
                            ? "text-[color:var(--warn)]"
                            : "text-[color:var(--late)]"
                      )}
                    >
                      {a.score}%
                    </div>
                    {bandStyle && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          bandStyle.bg,
                          bandStyle.text
                        )}
                      >
                        {bandStyle.label}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[color:var(--mute)]">Incomplete</span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-[color:var(--mute)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[color:var(--mute)]" />
              )}
            </header>

            {isOpen && (
              <div className="border-t border-[color:var(--line)] bg-[color:var(--card)] p-4">
                <h4 className="mb-2 text-xs font-bold text-[color:var(--mute)]">Adaptive path</h4>
                {a.adaptive_path.length === 0 ? (
                  <p className="text-xs text-[color:var(--mute)]">No steps recorded.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {a.adaptive_path.map((step, i) => {
                      const r = responses.find((x) => x.question_id === step.question_id);
                      return (
                        <li key={i} className="flex items-center gap-3 text-xs">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--card)] text-[10px] font-bold text-[color:var(--mute)]">
                            {i + 1}
                          </span>
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded",
                              step.was_correct
                                ? "bg-[color-mix(in_srgb,var(--good)_28%,transparent)] text-[color:var(--ink)]"
                                : "bg-[color-mix(in_srgb,var(--late)_28%,transparent)] text-[color:var(--ink)]"
                            )}
                          >
                            {step.was_correct ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <XIcon className="h-3 w-3" />
                            )}
                          </span>
                          <span className="font-semibold text-[color:var(--ink)]">
                            {step.difficulty}
                          </span>
                          {r && (
                            <span className="text-[color:var(--mute)]">
                              — chose {r.student_answer} in {r.response_time_seconds}s
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
