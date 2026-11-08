"use client";
import Link from "next/link";
import { buildStudentHome, type StudentHomeInput } from "@/lib/student/home-model";
import { CB_MODULE, formatClock } from "@/lib/student/time-trial";
import { useMergedInput, useLiveNow } from "./preview-store";
import { AssignmentStatus } from "./AssignmentStatus";
import { TestsIcon } from "./icons";
import s from "./student.module.css";

const minutes = Math.round((2 * CB_MODULE.reading.seconds + 2 * CB_MODULE.math.seconds + 600) / 60);

export function TestsPage({
  input,
  nowMs,
  base,
}: {
  input: StudentHomeInput;
  nowMs: number;
  base: string;
}) {
  const now = useLiveNow(nowMs);
  const home = buildStudentHome(useMergedInput(input), now, base);
  const exams = home.assignments
    .filter((a) => a.kind === "full_length")
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return (
    <div className={s.page}>
      <h1 className={s.h1}>Full-length exams</h1>
      <p className={s.fact}>
        4 modules · 98 questions · <strong>{minutes} minutes</strong> with a {formatClock(600)}{" "}
        break
      </p>
      <section className={s.panel}>
        <ul className={s.list}>
          {exams.map((a) => (
            <li key={a.id} className={s.examRow}>
              <TestsIcon size={20} className={s.muted} />
              <span className={s.examText}>
                <span className={s.itemTitle}>{a.title}</span>
                <AssignmentStatus a={a} tutor={a.tutor} />
              </span>
              {a.state === "open" && (
                <Link href={`${base}/tests/run?a=${a.id}`} className={s.primary}>
                  Start
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className={s.panel}>
        <h2 className={s.h2}>Diagnostic</h2>
        <p className={s.fact} style={{ marginTop: 6 }}>
          35 questions · taken once
        </p>
        <div className={s.heroActions} style={{ marginTop: 14 }}>
          <Link href="/diagnostic" className={s.glassButton}>
            Open the diagnostic
          </Link>
        </div>
      </section>
    </div>
  );
}
