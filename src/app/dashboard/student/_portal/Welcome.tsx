"use client";

// The welcome a new student sees once (student_settings.welcomed_at), the first time the portal opens:
// after paying (/checkout/done sends them here with ?welcome=1) or after making a free account. Their
// character says hello by name, one line says what their plan opens, and, if they have not given it
// yet, they pick the month of their SAT (founder, 2026-11-14: ask the SAT month, not the day; SAT
// only). One press and they are in: tapping a month is that press (founder, 2026-11-25: no Continue
// after a choice; the month pops, then the portal opens), and "Let's go" shows only when there is nothing
// to pick. Eight months show, in two rows of four; a phone keeps the first six, in two rows of three. A paid welcome throws a
// little confetti; a free one is calmer. It makes no sound (founder, 2026-11-25).
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
import styles from "./welcome.module.css";
import { Orb } from "@/components/shared/Orb";

/** "2026-12-05" as its month and its year: every date shows both (founder, 2026-11-25). */
export function monthOf(day: string): { month: string; year: string } {
  const [y, m] = day.split("-").map(Number);
  const month = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
  return { month, year: String(y) };
}

/** Each month once: two sittings in one month keep the earlier date. */
export function oneEachMonth(days: readonly string[]): string[] {
  const seen = new Set<string>();
  return days.filter((day) => {
    const month = day.slice(0, 7);
    return seen.has(month) ? false : !!seen.add(month);
  });
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
  const dates = oneEachMonth(real?.satDates ?? []).slice(0, 8);
  const asking = ask && dates.length > 0;
  // a phone gets a smaller character, drawn at that size (shrinking the big one let it spill onto the words)
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 560px)");
    const fit = () => setSmall(phone.matches);
    fit();
    phone.addEventListener("change", fit);
    return () => phone.removeEventListener("change", fit);
  }, []);

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
    if (saving) return;
    setProblem(null);
    setUnsure(next === null);
    setDay(next);
    // the pick shows for a moment, then they are in
    window.setTimeout(() => void go(next), 320);
  };

  const go = async (day: string | null) => {
    if (saving) return;
    setSaving(true);
    // an admin looking at the student portal has no student account to save a date to, so they go
    // straight in (the server would answer "Only a student account can change this")
    const looking = real?.generatedAdmin != null;
    if (ask && day && !looking) {
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
      ? `Free plan: ${FREE_PLAN.questionLimit} questions, 1 full-length exam and the daily challenge.`
      : `You're on ${PLAN_NAMES[plan]}.`;
  return (
    <div className={styles.veil} ref={root}>
      <section
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div className={styles.buddy} data-in>
          <Buddy size={small ? 84 : 124} cheer={paid ? 1 : 0} />
        </div>
        <h2 id="welcome-title" data-in>
          {name ? `Welcome, ${name}` : "Welcome to Karman"}
        </h2>
        <p className={styles.line} data-in>
          {line}
        </p>
        {asking && (
          <fieldset className={styles.when} data-in>
            <legend>When is your SAT?</legend>
            <div className={styles.months} role="radiogroup" aria-label="When is your SAT?">
              {dates.map((d) => {
                const { month, year } = monthOf(d);
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={day === d}
                    onClick={() => pick(d)}
                  >
                    <b>{month}</b>
                    <small>{year}</small>
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
        {!asking && (
          <button
            type="button"
            className={styles.go}
            data-in
            aria-busy={saving || undefined}
            disabled={saving}
            onClick={() => void go(day)}
          >
            {saving ? <Orb label="Saving" /> : "Let's go"}
          </button>
        )}
      </section>
    </div>
  );
}
