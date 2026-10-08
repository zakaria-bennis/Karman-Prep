"use client";

import Link from "next/link";
import { useTheme } from "@/components/shared/ThemeProvider";
import type { LinkedParentStudent, WeeklyParentView } from "@/lib/parent/weekly-model";
import styles from "./ParentWeeklyPortal.module.css";

interface Props {
  students: LinkedParentStudent[];
  selected: LinkedParentStudent | null;
  summary: WeeklyParentView | null;
  loadError?: boolean;
}

function nameOf(student: LinkedParentStudent): string {
  return [student.first_name, student.last_name].filter(Boolean).join(" ") || "Student";
}

function dateLabel(iso: string, includeTime = false): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
    timeZone: "UTC",
  }).format(new Date(iso));
}

function Panel({
  title,
  eyebrow,
  children,
  id,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className={styles.panel} id={id} aria-label={title}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function ParentWeeklyPortal({ students, selected, summary, loadError }: Props) {
  const { palette, toggleMode } = useTheme();
  return (
    <main className={styles.portal} data-theme={palette.dark ? "dark" : "light"}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link
            className={styles.wordmark}
            href="/dashboard/parent"
            aria-label="Karman parent home"
          >
            KARMAN<span className={styles.wordmarkDot}>.</span>
          </Link>
          <div className={styles.topActions}>
            <Link className={styles.quietLink} href="/billing">
              Billing
            </Link>
            <a className={styles.quietLink} href="#next-session">
              Schedule
            </a>
            <button
              type="button"
              className={styles.themeButton}
              onClick={toggleMode}
              aria-label={`Switch to ${palette.dark ? "light" : "dark"} theme`}
            >
              {palette.dark ? "Light" : "Dark"} theme
            </button>
          </div>
        </header>

        <div className={styles.intro}>
          <p className={styles.kicker}>PARENT PORTAL / THE WEEK AT A GLANCE</p>
          <h1>{selected ? `${nameOf(selected)}’s week` : "Your student’s week"}</h1>
          <p className={styles.lede}>
            A clear view of practice, focus, and the next session for a student linked to your
            account.
          </p>
        </div>

        {students.length > 1 && (
          <nav className={styles.studentNav} aria-label="Choose a linked student">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/parent?student=${encodeURIComponent(student.id)}`}
                aria-current={selected?.id === student.id ? "page" : undefined}
                className={`${styles.studentLink} ${selected?.id === student.id ? styles.selected : ""}`}
              >
                {nameOf(student)}
              </Link>
            ))}
          </nav>
        )}

        {loadError ? (
          <div className={styles.notice} role="alert">
            This summary is unavailable right now. Please refresh or try again later.
          </div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>
            <h2>No students linked yet</h2>
            <p>
              When a Karman admin links your account to a student, their weekly view will appear
              here. Contact support if you expected a link already.
            </p>
          </div>
        ) : !selected ? (
          <div className={styles.notice} role="alert">
            That student is not linked to your account. Choose one of your linked students above.
          </div>
        ) : !summary ? (
          <div className={styles.notice} role="alert">
            This student&apos;s summary is unavailable right now. Please try again later.
          </div>
        ) : (
          <>
            <div className={styles.weekline}>
              <span className={styles.goldRule} aria-hidden="true" />
              Week of {dateLabel(summary.weekStart)} –{" "}
              {dateLabel(new Date(new Date(summary.weekEnd).getTime() - 86_400_000).toISOString())}{" "}
              · UTC
            </div>
            <div className={styles.heroGrid}>
              <Panel title="Work completed" eyebrow="THIS WEEK">
                {summary.completedPractice.status === "unavailable" ? (
                  <p className={styles.muted}>Practice activity is unavailable right now.</p>
                ) : (
                  <>
                    <p className={styles.number}>{summary.completedPractice.value}</p>
                    <p className={styles.muted}>
                      {summary.completedPractice.value === 1 ? "practice quiz" : "practice quizzes"}{" "}
                      completed this week
                    </p>
                  </>
                )}
                <p className={styles.caption}>
                  Completed quiz attempts only. Assigned work is listed separately.
                </p>
              </Panel>

              <Panel title="Practice skills" eyebrow="DIAGNOSTIC SNAPSHOT">
                {summary.practiceSkills.status === "unavailable" ? (
                  <p className={styles.muted}>Practice diagnostic data is unavailable right now.</p>
                ) : summary.practiceSkills.value.diagnosticDate ? (
                  <div className={styles.skillRows}>
                    <div>
                      <h3>Improving</h3>
                      <p>
                        {summary.practiceSkills.value.improving.length
                          ? summary.practiceSkills.value.improving.join(", ")
                          : "No higher domain scores can be confirmed from two practice diagnostics yet."}
                      </p>
                    </div>
                    <div>
                      <h3>Needs attention</h3>
                      <p>
                        {summary.practiceSkills.value.attention.length
                          ? summary.practiceSkills.value.attention.join(", ")
                          : "No comparable domain scores are available yet."}
                      </p>
                    </div>
                    <p className={styles.caption}>
                      Lowest domains on the {dateLabel(summary.practiceSkills.value.diagnosticDate)}{" "}
                      practice diagnostic. Higher scores compare with the previous practice
                      diagnostic. These are not official SAT scores.
                    </p>
                  </div>
                ) : (
                  <p className={styles.muted}>
                    No valid practice diagnostic breakdown is available yet.
                  </p>
                )}
              </Panel>
            </div>

            <div className={styles.detailGrid}>
              <Panel title="Next session" eyebrow="LOOKING AHEAD" id="next-session">
                {summary.nextSession.status === "unavailable" ? (
                  <p className={styles.muted}>The schedule is unavailable right now.</p>
                ) : summary.nextSession.value ? (
                  <p className={styles.sessionDate}>
                    {dateLabel(summary.nextSession.value.startsAt, true)}
                  </p>
                ) : (
                  <p className={styles.muted}>No upcoming session is currently scheduled.</p>
                )}
                <p className={styles.caption}>
                  Shown only for a scheduled booking for this student.
                </p>
              </Panel>

              <Panel title="Tutor updates" eyebrow="FROM THE TUTOR">
                <p className={styles.muted}>
                  No parent-visible tutor updates are available here yet.
                </p>
                <p className={styles.caption}>
                  Private tutor drafts are not shown in the parent portal.
                </p>
              </Panel>

              <Panel title="Assignments" eyebrow="POSTED TO THE COHORT">
                {summary.assignments.status === "unavailable" ? (
                  <p className={styles.muted}>Cohort assignment posts are unavailable right now.</p>
                ) : summary.assignments.value.length ? (
                  <ul className={styles.assignmentList}>
                    {summary.assignments.value.map((item) => (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        {item.dueAt && <small>Due {dateLabel(item.dueAt)}</small>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>No recent cohort assignment posts are available.</p>
                )}
                <p className={styles.caption}>Posted work is not a completion record.</p>
              </Panel>

              <Panel title="Attendance" eyebrow="SESSION RECORD">
                <p className={styles.muted}>
                  A parent-visible attendance summary is not available yet.
                </p>
                <p className={styles.caption}>
                  Raw meeting logs are not used as a verified attendance report.
                </p>
              </Panel>
            </div>
          </>
        )}
        <footer className={styles.footer}>
          <span>Questions about your student’s plan? Contact Karman support.</span>
          <Link href="/billing">Billing and account</Link>
        </footer>
      </div>
    </main>
  );
}
