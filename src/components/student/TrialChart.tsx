"use client";
import { motion, useReducedMotion } from "framer-motion";
import { formatClock } from "@/lib/student/time-trial";
import s from "./student.module.css";

/** The squeeze: each run's target as a falling step line, with the goal as a dashed floor. */
export function TrialChart({
  steps,
  goal,
  height = 56,
}: {
  steps: number[];
  goal: number;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const top = Math.max(...steps, goal) * 1.02;
  const bottom = goal * 0.96;
  const y = (v: number) => ((top - v) / (top - bottom)) * 100;
  const n = Math.max(steps.length, 2);
  const x = (i: number) => (i / (n - 1)) * 100;
  let d = `M0 ${y(steps[0])}`;
  steps.forEach((v, i) => {
    if (i === 0) return;
    d += ` H${x(i)} V${y(v)}`;
  });
  if (steps.length === 1) d += ` H100`;
  const last = steps.at(-1)!;
  return (
    <svg
      className={s.chart}
      style={{ height }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Target steps from ${fmt(steps[0])} to ${fmt(last)}, goal ${fmt(goal)}`}
    >
      <line x1="0" x2="100" y1={y(goal)} y2={y(goal)} className={s.chartGoal} />
      <motion.path
        d={d}
        className={s.chartStep}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </svg>
  );
}

export const fmt = formatClock;
