"use client";
// The twenty full-length exams (founder, 2026-11-22: "Full-length exam 1" to "20", "Exam 1" on phones),
// whether one can be started now (Saturday, 6 am to midnight, in the student's own time zone), an Exam
// pass when the window is closed, and for an admin or development a test switch.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Go } from "@/components/quiz-flows/FlowStage";
import { actionExamList, actionExamReset, actionExamTestSwitch } from "@/app/learn/exam-actions";
import type { ExamList as ExamListData } from "@/lib/exams/service";
import { browserZone, dayTime, until, zoneName } from "./format";
import s from "./exam.module.css";
import { FREE_PLAN, QUESTION_BANK } from "@/lib/marketing/offer";

export function ExamList({ canTest }: { canTest: boolean }) {
  const [data, setData] = useState<ExamListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await actionExamList({ timeZone: browserZone() });
    if (res.ok) setData(res.value);
    else setError(res.error);
  }, []);

  useEffect(() => {
    void load();
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [load]);

  if (error)
    return (
      <section className={`${s.pane} ${s.narrow}`}>
        <h1 className={s.title}>Full-length exams</h1>
        <p className={s.error}>{error}</p>
      </section>
    );
  if (!data)
    return (
      <section className={`${s.pane} ${s.narrow}`} aria-busy="true">
        <h1 className={s.title}>Full-length exams</h1>
        <p className={s.lead}>Loading your exams…</p>
      </section>
    );

  const zone = data.window.zone;
  const opens = new Date(data.window.opensAt).getTime();
  const closes = new Date(data.window.closesAt).getTime();
  const open = data.window.open && now < closes;
  const limitReached = data.access.limit !== null && data.access.used >= data.access.limit;

  return (
    <section className={s.pane}>
      <div className={s.head}>
        <h1 className={s.title}>Full-length exams</h1>
      </div>

      <div className={`${s.window} ${open ? s.windowOpen : ""}`} role="status">
        <span className={s.dot} aria-hidden="true" />
        {open ? (
          <span>Open until midnight, {until(closes - now)} left to start</span>
        ) : (
          <span>
            Opens {dayTime(data.window.opensAt, zone)}, in {until(opens - now)}
          </span>
        )}
        <span className={s.windowNote}>{zoneName(zone)}</span>
      </div>

      {data.running !== null && (
        <div className={s.actions}>
          <Go href={`/learn/exam/${data.running}`}>Back to Exam {data.running}</Go>
          <span className={s.windowNote}>Its clock is still running.</span>
        </div>
      )}

      {data.running === null && data.next !== null && !limitReached && data.opensWith && (
        <div className={s.actions}>
          <Go href={`/learn/exam/${data.next}`}>
            {data.opensWith === "pass"
              ? `Use an Exam pass for Exam ${data.next}`
              : `Start Exam ${data.next}`}
          </Go>
          {data.opensWith === "pass" && (
            <span className={s.windowNote}>
              You have {data.passes} Exam pass{data.passes === 1 ? "" : "es"}.
            </span>
          )}
          {data.opensWith === "test-switch" && (
            <span className={s.windowNote}>Open by the test switch.</span>
          )}
        </div>
      )}
      {limitReached && data.running === null && (
        <p className={s.lead}>
          Free includes {FREE_PLAN.fullLengthTests} exam. Practice has {QUESTION_BANK.practiceTests}
          , Pro has {QUESTION_BANK.proTests}.
        </p>
      )}

      <ol className={s.list} aria-label="Exams">
        {data.exams.map((exam) => {
          const body = (
            <>
              <span className={s.examName}>
                <span className={s.long}>Full-length exam {exam.form}</span>
                <span className={s.short}>Exam {exam.form}</span>
              </span>
              {exam.status === "done" ? (
                <span className={s.examScore}>{exam.total}</span>
              ) : (
                <span className={s.examState}>
                  {exam.status === "in-progress"
                    ? "In progress"
                    : exam.status === "next"
                      ? open || data.opensWith
                        ? "Next"
                        : "Next, on Saturday"
                      : `After Exam ${exam.form - 1}`}
                </span>
              )}
            </>
          );
          return (
            <li key={exam.form}>
              {exam.status === "done" || exam.status === "in-progress" ? (
                <Link
                  className={s.exam}
                  data-status={exam.status}
                  href={`/learn/exam/${exam.form}`}
                >
                  {body}
                </Link>
              ) : (
                <div className={s.exam} data-status={exam.status}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {canTest && (
        <div className={s.test}>
          <span>Admin test switch: {data.access.testSwitch ? "exams open every day" : "off"}</span>
          <button
            type="button"
            onClick={async () => {
              await actionExamTestSwitch({ on: !data.access.testSwitch });
              await load();
            }}
          >
            {data.access.testSwitch ? "Turn off" : "Open exams today"}
          </button>
          {data.exams
            .filter((e) => e.status === "done" || e.status === "in-progress")
            .slice(-1)
            .map((e) => (
              <button
                key={e.form}
                type="button"
                onClick={async () => {
                  await actionExamReset({ form: e.form });
                  await load();
                }}
              >
                Reset Exam {e.form}
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
