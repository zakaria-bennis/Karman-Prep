"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { buildStudentHome, type StudentHomeInput } from "@/lib/student/home-model";
import { SQUEEZE, formatClock, type TrialSection } from "@/lib/student/time-trial";
import { useMergedInput } from "./preview-store";
import { TrialChart } from "./TrialChart";
import { TrialIcon } from "./icons";
import s from "./student.module.css";

const NAME: Record<TrialSection, string> = { math: "Math", reading: "Reading and Writing" };
const ACCOMMODATION = {
  standard: "Standard time",
  time_and_half: "Time and a half",
  double: "Double time",
};

export function TrialSetup({
  input,
  nowMs,
  base,
}: {
  input: StudentHomeInput;
  nowMs: number;
  base: string;
}) {
  const home = buildStudentHome(useMergedInput(input), nowMs, base);
  const [section, setSection] = useState<TrialSection>("math");
  const t = home.trials[section];
  return (
    <div className={s.page}>
      <div className={s.trialZone}>
        <span className={s.trialBadge}>
          <TrialIcon size={16} /> Time Trial
        </span>
        <h1 className={s.h1} style={{ marginTop: 18 }}>
          Beat {formatClock(t.target)}.
        </h1>
        <p className={s.fact} style={{ marginTop: 10, maxWidth: "46ch" }}>
          Finish the {NAME[section]} module under target and your next target drops{" "}
          {Math.round(SQUEEZE * 100)}% of the way to <strong>{formatClock(t.goal)}</strong>.
        </p>
        <div
          className={s.choiceGrid}
          role="radiogroup"
          aria-label="Section"
          style={{ marginTop: 24 }}
        >
          {(["math", "reading"] as const).map((sec) => {
            const v = home.trials[sec];
            return (
              <button
                key={sec}
                type="button"
                role="radio"
                aria-checked={section === sec}
                className={s.trialChoice}
                onClick={() => setSection(sec)}
              >
                <span className={s.fact}>{NAME[sec]}</span>
                <span className={s.trialTarget}>{formatClock(v.target)}</span>
                <TrialChart steps={v.steps} goal={v.goal} height={44} />
                <span className={s.fact}>
                  {v.runs === 0
                    ? v.start.basis === "history"
                      ? "From your untimed pace"
                      : "Starting pace"
                    : `${v.runs} ${v.runs === 1 ? "trial" : "trials"}`}
                </span>
              </button>
            );
          })}
        </div>
        <motion.div layout className={s.heroActions} style={{ marginTop: 26 }}>
          <Link href={`${base}/time-trial/run?section=${section}`} className={s.primary}>
            Start {NAME[section]} trial
          </Link>
          <span className={s.fact}>
            {ACCOMMODATION[input.accommodation]} · {section === "math" ? 22 : 27} questions
          </span>
        </motion.div>
      </div>
    </div>
  );
}
