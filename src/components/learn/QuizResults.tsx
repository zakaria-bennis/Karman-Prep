"use client";

// ============================================================
// QuizResults — results screen after the 10th question.
// Animated circular progress + performance summary + next actions.
// ============================================================

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import type { PerQuestionRecord } from "@/contexts/QuizContext";
import type { ConfidenceBand, QuizQuestionWithChoices } from "@/types/quiz";
import { CONFIDENCE_COLORS } from "@/types/quiz";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  correct: number;
  total: number;
  band: ConfidenceBand;
  records: PerQuestionRecord[];
  questions: QuizQuestionWithChoices[];
  onGoToNext: (() => void) | null;
  onRetake: () => void;
}

function ringColor(score: number): string {
  if (score >= 80) return "#8BA86A";
  if (score >= 60) return "#E0A24A";
  return "#D84F73";
}

function encouragement(score: number, band: ConfidenceBand): string {
  if (score === 100) return "Perfect run. Time to push into harder material.";
  if (band === "mastered") return "You've mastered this concept — press on to the next node.";
  if (band === "proficient") return "Solid work. Another pass will lock this in for good.";
  if (band === "developing") return "You've got the core idea. Review your misses, then retake.";
  return "Rewatch the lesson — the questions get clearer once the fundamentals settle.";
}

export default function QuizResults({
  score,
  correct,
  total,
  band,
  records,
  questions,
  onGoToNext,
  onRetake,
}: Props) {
  // Animate ring fill from 0 → score over ~1s
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1000;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setAnimatedScore(Math.round(p * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // Topic-cluster breakdown
  const clusterStats = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    records.forEach((r) => {
      const q = questions.find((qq) => qq.id === r.questionId);
      if (!q) return;
      const c = q.topic_cluster;
      if (!map.has(c)) map.set(c, { correct: 0, total: 0 });
      const s = map.get(c)!;
      s.total++;
      if (r.isCorrect) s.correct++;
    });
    return Array.from(map.entries())
      .map(([cluster, s]) => ({ cluster, ...s, pct: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [records, questions]);

  const bandStyle = CONFIDENCE_COLORS[band];
  const ringHex = ringColor(score);
  const R = 90;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-night p-6"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-bronze bg-surface p-8 shadow-2xl md:p-12">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Circular progress */}
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: 220, height: 220 }}>
              <svg width={220} height={220} className="-rotate-90">
                <circle cx={110} cy={110} r={R} stroke="#171611" strokeWidth={12} fill="none" />
                <motion.circle
                  cx={110}
                  cy={110}
                  r={R}
                  stroke={ringHex}
                  strokeWidth={12}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: C - (C * score) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 8px ${ringHex}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tabular-nums text-ivory">
                  {animatedScore}%
                </span>
                <span className="mt-1 text-xs uppercase tracking-widest text-taupe">
                  Final Score
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4" style={{ color: ringHex }} />
              <span className="text-xs font-bold uppercase tracking-widest text-taupe">
                Performance
              </span>
            </div>
            <h2 className="mb-1 text-2xl font-extrabold text-ivory">
              {correct} / {total} correct
            </h2>
            <span
              className={cn(
                "mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
                bandStyle.bg,
                bandStyle.text
              )}
            >
              {bandStyle.label}
            </span>

            <p className="mt-4 text-sm leading-relaxed text-ivory/80">
              {encouragement(score, band)}
            </p>

            {/* Topic breakdown */}
            {clusterStats.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-taupe">
                  Topic breakdown
                </h3>
                {clusterStats.map((c) => (
                  <div key={c.cluster} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate text-ivory/80">{c.cluster}</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        c.pct >= 80 ? "text-success" : c.pct >= 60 ? "text-warning" : "text-error"
                      )}
                    >
                      {c.correct}/{c.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          {onGoToNext && (
            <button
              onClick={onGoToNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-info px-8 py-4 text-sm font-bold text-ivory transition-colors hover:bg-info-bright sm:flex-none"
            >
              Go to Next Node <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onRetake}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-bronze px-8 py-4 text-sm font-semibold text-ivory/90 transition-colors hover:bg-surface-raised sm:flex-none"
          >
            <RotateCcw className="h-4 w-4" /> Retake Quiz
          </button>
        </div>
      </div>
    </motion.div>
  );
}
