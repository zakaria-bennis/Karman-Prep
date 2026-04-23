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
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function encouragement(score: number, band: ConfidenceBand): string {
  if (score === 100) return "Perfect run. Time to push into harder material.";
  if (band === "mastered")   return "You've mastered this concept — press on to the next node.";
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
      className="fixed inset-0 z-[65] bg-slate-950 overflow-y-auto flex items-center justify-center p-6"
    >
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Circular progress */}
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: 220, height: 220 }}>
              <svg width={220} height={220} className="-rotate-90">
                <circle cx={110} cy={110} r={R} stroke="#1e293b" strokeWidth={12} fill="none" />
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
                <span className="text-5xl font-extrabold text-white tabular-nums">{animatedScore}%</span>
                <span className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Final Score</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4" style={{ color: ringHex }} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Performance</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1">
              {correct} / {total} correct
            </h2>
            <span className={cn(
              "inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-2",
              bandStyle.bg, bandStyle.text
            )}>
              {bandStyle.label}
            </span>

            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              {encouragement(score, band)}
            </p>

            {/* Topic breakdown */}
            {clusterStats.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Topic breakdown</h3>
                {clusterStats.map((c) => (
                  <div key={c.cluster} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-slate-300 truncate">{c.cluster}</span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      c.pct >= 80 ? "text-emerald-400" :
                      c.pct >= 60 ? "text-amber-400" :
                      "text-rose-400"
                    )}>
                      {c.correct}/{c.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          {onGoToNext && (
            <button
              onClick={onGoToNext}
              className="flex-1 sm:flex-none px-8 py-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors"
            >
              Go to Next Node <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onRetake}
            className="flex-1 sm:flex-none px-8 py-4 rounded-xl font-semibold text-sm border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
        </div>
      </div>
    </motion.div>
  );
}
