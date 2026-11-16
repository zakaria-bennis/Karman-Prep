"use client";

// Progress (Free, Practice and Pro students; the same page for Cohort and Private). Built one step at a
// time with the founder (2026-11-15); the plan and his answers are in the handover.
//   1. The predicted score, first and centered (ProgressScore.tsx).
//   2. The six numbers, and the calendar with its streak (ProgressActivity.tsx).
//   Still to come: the three weakest skills and pacing, the history page, the new-student page.
// With room, the score stands in the middle with the numbers at its left and the calendar at its
// right, all on one screen. On a phone nothing scrolls: each piece is its own page, with buttons.
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import lib from "./library.module.css";
import styles from "./progress.module.css";
import { Calendar, Stats } from "./ProgressActivity";
import { STUDENTS, activity, type Student, type StudentKey } from "./progressData";
import ProgressScore from "./ProgressScore";
import { tick } from "./sound";

export { STUDENTS, type StudentKey };

const PAGES = ["Score", "Activity", "Calendar"] as const;

export default function Progress({ rail, student: key }: { rail: boolean; student: StudentKey }) {
  const still = useReducedMotion() ?? false;
  const student: Student = STUDENTS[key];
  const logs = useMemo(() => activity(student), [student]);
  const [page, setPage] = useState<(typeof PAGES)[number]>("Score");
  const show = (name: (typeof PAGES)[number]) => rail || page === name;
  return (
    <div className={`${lib.library} ${styles.progress}`}>
      {!rail && (
        <div className={lib.pager} role="group" aria-label="Page">
          {PAGES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={page === name}
              onClick={() => {
                setPage(name);
                tick();
              }}
            >
              {page === name && (
                <motion.span
                  layoutId="progress-pager"
                  className={lib.lens}
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
      {show("Score") && <ProgressScore student={key} />}
      {show("Activity") && <Stats key={`stats ${key}`} student={student} logs={logs} />}
      {show("Calendar") && <Calendar key={`calendar ${key}`} student={student} logs={logs} />}
    </div>
  );
}
