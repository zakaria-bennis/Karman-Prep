"use client";

// The welcome a new student sees once (student_settings.welcomed_at), the first time the portal opens:
// after paying (/checkout/done sends them here with ?welcome=1) or after making a free account. Their
// character says hello by name, one line says what their plan opens, and, if they have not given it
// yet, they pick the month of their SAT (founder, 2026-11-14: ask the SAT month, not the day; SAT
// only). One press and they are in. A paid welcome throws a little confetti; a free one is calmer.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { FREE_PLAN } from "@/lib/marketing/offer";
import { PLAN_NAMES } from "@/lib/student/plan-gate";
import { actionSaveTest } from "@/lib/portal/settings-actions";
import { actionWelcomed } from "@/lib/portal/welcome-actions";
import { Buddy } from "./HomeworkBuddy";
import { calm } from "./homeworkMotion";
import { usePortalData } from "./portalData";
import { confetti } from "./scheduleMotion";
import { setSetting } from "./settingsStore";
import { chosen, tick } from "./sound";
import styles from "./welcome.module.css";

/** "2026-12-05" as its month, with the year when it is not this year's. */
export function monthOf(day: string, thisYear: number): { month: string; year: string | null } {
  const [y, m] = day.split("-").map(Number);
  const month = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
  return { month, year: y === thisYear ? null : String(y) };
}

export default function Welcome({ paid, onDone }: { paid: boolean; onDone: () => void }) {
  const real = usePortalData();
  const root = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState<string | null>(real?.testDate ?? null);
  const [unsure, setUnsure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // the question shows only while the student has no date on file
  const [ask] = useState(() => !real?.testDate);
  const dates = (real?.satDates ?? []).slice(0, 6);
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    const el = root.current;
    if (!el || calm()) return;
    const tl = gsap
      .timeline()
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(
        el.querySelectorAll("[data-in]"),
        { y: 22, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.07, ease: "back.out(1.6)" },
        "<0.05"
      );
    const clear = paid ? confetti(el, 60) : undefined;
    return () => {
      tl.kill();
      clear?.();
    };
  }, [paid]);

  const pick = (next: string | null) => {
    tick();
    setProblem(null);
    setUnsure(next === null);
    setDay(next);
  };

  const go = async () => {
    if (saving) return;
    setSaving(true);
    chosen();
    if (ask && day) {
      const saved = await actionSaveTest({ testType: "sat", testDate: day }).catch(() => null);
      if (!saved || !saved.ok) {
        setSaving(false);
        setProblem(saved && !saved.ok ? saved.error : "That didn't save. Try again in a moment.");
        return;
      }
      setSetting("testDate", day);
    }
    void actionWelcomed();
    onDone();
  };

  const name = real?.firstName?.trim();
  const plan = real?.planId ?? "free";
  const line =
    plan === "free"
      ? `You're on the Free plan: ${FREE_PLAN.questionLimit} questions, one full-length exam and a challenge question every day.`
      : `You're on ${PLAN_NAMES[plan]}. Everything is ready for you.`;
  return (
    <div className={styles.veil} ref={root}>
      <section
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div className={styles.buddy} data-in>
          <Buddy size={124} cheer={paid ? 1 : 0} />
        </div>
        <h2 id="welcome-title" data-in>
          {name ? `Welcome, ${name}` : "Welcome to Karman"}
        </h2>
        <p className={styles.line} data-in>
          {line}
        </p>
        {ask && dates.length > 0 && (
          <fieldset className={styles.when} data-in>
            <legend>When is your SAT?</legend>
            <div className={styles.months} role="radiogroup" aria-label="When is your SAT?">
              {dates.map((d) => {
                const { month, year } = monthOf(d, thisYear);
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={day === d}
                    onClick={() => pick(d)}
                  >
                    <b>{month}</b>
                    {year && <small>{year}</small>}
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={unsure}
                data-wide
                onClick={() => pick(null)}
              >
                <b>Not sure yet</b>
              </button>
            </div>
          </fieldset>
        )}
        {problem && (
          <p className={styles.problem} role="alert">
            {problem}
          </p>
        )}
        <button
          type="button"
          className={styles.go}
          data-in
          aria-busy={saving || undefined}
          disabled={saving}
          onClick={() => void go()}
        >
          {saving ? (
            <span className={styles.orbs} role="img" aria-label="Saving">
              <i />
              <i />
              <i />
            </span>
          ) : (
            "Let's go"
          )}
        </button>
      </section>
    </div>
  );
}
