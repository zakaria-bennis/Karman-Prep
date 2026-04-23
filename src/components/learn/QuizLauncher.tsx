"use client";

// ============================================================
// QuizLauncher — quiz-history + Start/Retake buttons.
// Lives in Section 4 of the LessonOverlay.
// ============================================================

import { Play, RotateCcw, ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAttempt, ConfidenceBand } from "@/types/quiz";
import { CONFIDENCE_COLORS } from "@/types/quiz";

interface Props {
  attempts: QuizAttempt[];
  onStartQuiz: () => void;
  onGoToNext: (() => void) | null;
  disabled?: boolean;
}

export default function QuizLauncher({ attempts, onStartQuiz, onGoToNext, disabled }: Props) {
  const hasAttempts = attempts.length > 0;
  const bestScore = attempts.reduce((best, a) => Math.max(best, a.score ?? 0), 0);
  const hasPassed = attempts.some((a) => (a.score ?? 0) >= 80);

  return (
    <section className="space-y-5">
      {/* History */}
      {hasAttempts && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Your quiz history
            </h3>
            {bestScore > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                <Flame className="w-3.5 h-3.5" /> Best: {bestScore}%
              </span>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">Attempt</th>
                  <th className="text-left font-semibold px-3 py-2">Score</th>
                  <th className="text-left font-semibold px-3 py-2">Band</th>
                  <th className="text-left font-semibold px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 5).map((a) => {
                  const band = a.confidence_band as ConfidenceBand | null;
                  const bandStyle = band ? CONFIDENCE_COLORS[band] : null;
                  return (
                    <tr key={a.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold">#{a.attempt_number}</td>
                      <td className="px-3 py-2">
                        {a.score !== null ? (
                          <span className={cn(
                            "font-bold",
                            (a.score ?? 0) >= 80 ? "text-emerald-500" :
                            (a.score ?? 0) >= 60 ? "text-amber-500" :
                            "text-red-500"
                          )}>
                            {a.score}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Incomplete</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {bandStyle ? (
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", bandStyle.bg, bandStyle.text)}>
                            {bandStyle.label}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onStartQuiz}
          disabled={disabled}
          className={cn(
            "flex-1 py-4 rounded-xl font-bold text-sm transition-all",
            "flex items-center justify-center gap-2",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "hover:scale-[1.01] active:scale-[0.99]",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100"
          )}
        >
          {hasAttempts ? (
            <>
              <RotateCcw className="w-4 h-4" /> Retake Quiz
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Start Quiz
            </>
          )}
        </button>

        {hasPassed && onGoToNext && (
          <button
            onClick={onGoToNext}
            className="flex-1 py-4 rounded-xl font-semibold text-sm transition-all border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Go to Next Node
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
}
