"use client";

// Progress for a student who has answered nothing yet (founder, 2026-11-15: "the page tells them what
// to do first ... and sends them there"; "point them to the Daily 10 first. A full-length exam is
// suggested after their 100 questions. It is a recommendation, not a gate").
// Three panes of zeros would say nothing, so the page is one thing to do and what it leads to:
//   left    where to start: the Daily 10, set out the way the predicted score will be once there is
//           one (a small name, one large line in the serif, a button).
//   right   what comes of it, in order: the first answers fill Progress in; 100 questions is a good
//           time for a first full-length exam; two exams give a predicted score (on the Free plan,
//           the score comes with Practice or Pro).
// On a phone the two sit one over the other and the page does not scroll.
import lib from "./library.module.css";
import { GoButton, Tile } from "./practice";
import { usePortalData } from "./portalData";
import { useDailyTen } from "./useDailyTen";
import { BEFORE_EXAM } from "./progressData";
import styles from "./progressStart.module.css";

export default function ProgressStart({ free }: { free: boolean }) {
  const real = usePortalData();
  const gate = real && { planId: real.planId, access: real.access };
  const daily = useDailyTen(gate);
  const steps = [
    {
      name: "Your first answers",
      gives: "Your time, pacing and calendar start to fill in",
    },
    {
      name: `${BEFORE_EXAM} questions`,
      gives: "A good time for your first full-length exam",
      far: `0 of ${BEFORE_EXAM}`,
    },
    {
      name: "Two full-length exams",
      gives: free ? "Your predicted score, with Practice or Pro" : "Your predicted score",
      far: "0 of 2",
    },
  ];
  return (
    <div className={`${lib.library} ${styles.start}`}>
      {daily.layer}
      <section className={`${lib.glass} ${styles.first}`} aria-label="Start here">
        <Tile name="daily" />
        <h2>Start here</h2>
        <p className={styles.big}>Daily 10</p>
        <p className={styles.say}>
          Ten questions. Your progress shows here as soon as you answer them.
        </p>
        <GoButton onDone={daily.start}>Start the Daily 10</GoButton>
      </section>
      <section className={`${lib.glass} ${styles.path}`} aria-label="Coming up">
        <h2>Coming up</h2>
        <ol>
          {steps.map((step, i) => (
            <li key={step.name}>
              <i>{i + 1}</i>
              <div>
                <b>{step.name}</b>
                <span>{step.gives}</span>
              </div>
              {step.far && <em>{step.far}</em>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
