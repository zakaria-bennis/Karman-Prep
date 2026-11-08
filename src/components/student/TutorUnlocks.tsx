"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { buildStudentHome, type StudentHomeInput } from "@/lib/student/home-model";
import { formatClock } from "@/lib/student/time-trial";
import { spacingWarning } from "@/lib/student/unlocks";
import { BAND_LABEL } from "@/lib/student/mastery";
import {
  addToHistory,
  removeUnlock,
  usePreviewHistory,
  useMergedInput,
  useLiveNow,
} from "./preview-store";
import { AssignmentStatus, dayLabel } from "./AssignmentStatus";
import { BandGlyph, TestsIcon, TrialIcon } from "./icons";
import s from "./student.module.css";

/** The tutor's side: what is planned for a student, and the control that opens it. */
export function TutorUnlocks({
  input,
  nowMs,
  base,
}: {
  input: StudentHomeInput;
  nowMs: number;
  base: string;
}) {
  const now = useLiveNow(nowMs);
  const merged = useMergedInput(input);
  const history = usePreviewHistory();
  const home = buildStudentHome(merged, now, base);
  const plan = [...home.assignments].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return (
    <div className={s.page}>
      <h1 className={s.h1}>{input.firstName}&rsquo;s plan</h1>
      <p className={s.fact}>
        Tutor view · David · SAT{" "}
        <strong>{home.satDate ? dayLabel(home.satDate) : "not set"}</strong>
      </p>

      <section className={s.panel} aria-labelledby="plan-h">
        <h2 id="plan-h" className={s.h2} style={{ marginBottom: 4 }}>
          Exams and Time Trials
        </h2>
        <ul className={s.list}>
          {plan.map((a) => {
            const warn = a.state !== "done" ? spacingWarning(a, merged.assignments, now) : null;
            const mine = !!history.unlocks[a.id];
            return (
              <li key={a.id} className={s.unlockRow}>
                {a.kind === "full_length" ? (
                  <TestsIcon size={20} className={s.muted} />
                ) : (
                  <TrialIcon size={20} className={s.muted} />
                )}
                <span className={s.examText}>
                  <span className={s.itemTitle}>{a.title}</span>
                  {(a.state === "open" || a.state === "done") && (
                    <span className={s.itemWhen}>Planned {dayLabel(a.scheduledFor)}</span>
                  )}
                  <AssignmentStatus a={a} tutor={a.tutor} />
                  <AnimatePresence>
                    {warn && a.state !== "open" && (
                      <motion.span
                        className={s.warn}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {warn}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {a.state === "scheduled" || a.state === "locked" ? (
                  <button
                    type="button"
                    className={s.glassButton}
                    onClick={() => addToHistory({ unlocks: { [a.id]: new Date().toISOString() } })}
                  >
                    Unlock
                  </button>
                ) : a.state === "open" && mine ? (
                  <button type="button" className={s.textButton} onClick={() => removeUnlock(a.id)}>
                    Lock again
                  </button>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={s.panel} aria-labelledby="read-h">
        <h2 id="read-h" className={s.h2} style={{ marginBottom: 10 }}>
          Before you unlock
        </h2>
        <dl className={s.stats} style={{ margin: 0 }}>
          {(["math", "reading"] as const).map((sec) => (
            <div key={sec} className={s.stat}>
              <dt>{sec === "math" ? "Math target" : "Reading and Writing target"}</dt>
              <dd>
                {formatClock(home.trials[sec].target)}{" "}
                <span className={s.fact}>goal {formatClock(home.trials[sec].goal)}</span>
              </dd>
            </div>
          ))}
        </dl>
        <h3 className={s.domainName} style={{ marginTop: 18 }}>
          Weakest skills
        </h3>
        {home.weakest.map((k) => (
          <div key={k.id} className={s.row} style={{ cursor: "default" }}>
            <BandGlyph band={k.band} />
            <span className={s.rowLabel}>{k.label}</span>
            <span className={s.rowMeta}>
              {BAND_LABEL[k.band ?? "none"]} · {k.mastery}%
            </span>
          </div>
        ))}
      </section>

      <Link href={base} className={s.link} style={{ justifySelf: "start" }}>
        Back to {input.firstName}&rsquo;s home
      </Link>
    </div>
  );
}
