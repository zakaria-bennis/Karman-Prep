"use client";

// Workshops in the Library (founder, 2026-11-16). They are live, opt-in sessions that come with Pro,
// so Cohort and Private students have them too.
//   WorkshopBanner     for Cohort and Private students, in each side of the Library, where Free,
//                      Practice and Pro students have the Daily 10 and the challenge question (those
//                      two are on Homework for a taught student). It shows that side's next
//                      workshop, says when it covers a skill the student is working on, and has the
//                      button to sign up.
//   UpcomingWorkshops  for Pro students: a button at the top right of "More ways to practice" that
//                      opens the workshops coming up, each with its own sign-up.
// The workshops themselves are stand-ins until real ones are scheduled.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { Section } from "./skills72";
import { chosen, tick } from "./sound";
import styles from "./workshops.module.css";

type Workshop = {
  id: string;
  section: Section;
  topic: string;
  day: string;
  date: number;
  time: string;
  /** It covers a skill this student is still working on. */
  fits: boolean;
};
const WORKSHOPS: Workshop[] = [
  {
    id: "w1",
    section: "Math",
    topic: "Quadratics, from graph to equation",
    day: "Wed",
    date: 18,
    time: "6:00 PM",
    fits: true,
  },
  {
    id: "w2",
    section: "Reading and Writing",
    topic: "Transitions that fit",
    day: "Thu",
    date: 19,
    time: "6:00 PM",
    fits: true,
  },
  {
    id: "w3",
    section: "Math",
    topic: "Ratios, rates and units",
    day: "Wed",
    date: 25,
    time: "6:00 PM",
    fits: false,
  },
  {
    id: "w4",
    section: "Reading and Writing",
    topic: "Reading graphs in passages",
    day: "Thu",
    date: 26,
    time: "6:00 PM",
    fits: false,
  },
];

function Row({ workshop, big = false }: { workshop: Workshop; big?: boolean }) {
  const [inIt, setIn] = useState(false);
  return (
    <div className={styles.row} data-big={big || undefined} data-in={inIt || undefined}>
      {/* the day, as a page from a calendar */}
      <span className={styles.date} aria-hidden="true">
        <small>{workshop.day}</small>
        <b>{workshop.date}</b>
      </span>
      <p>
        <b>{workshop.topic}</b>
        <span>
          {workshop.day}, {workshop.time}
        </span>
        {workshop.fits && <em>On a skill you are working on</em>}
      </p>
      <button
        type="button"
        className={styles.join}
        aria-pressed={inIt}
        onClick={() => {
          setIn(!inIt);
          if (inIt) tick();
          else chosen();
        }}
      >
        {inIt ? (
          <>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M5.500 12.500l4.200 4.200L18.500 8" />
            </svg>
            You&apos;re in
          </>
        ) : (
          "Sign up"
        )}
      </button>
    </div>
  );
}

export function WorkshopBanner({ section }: { section: Section }) {
  const next = WORKSHOPS.find((w) => w.section === section);
  return (
    <section className={styles.banner} aria-label="Workshop">
      <span className={styles.lights} aria-hidden="true" />
      <h2>Workshop</h2>
      {next ? <Row workshop={next} big /> : <p className={styles.none}>None this week.</p>}
    </section>
  );
}

export function UpcomingWorkshops() {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.upcoming}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          tick();
        }}
      >
        See upcoming workshops
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M6.500 9.500L12 15l5.500-5.500" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className={styles.list}
            initial={still ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={still ? undefined : { height: 0, opacity: 0 }}
            transition={still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
          >
            {WORKSHOPS.map((w) => (
              <li key={w.id}>
                <Row workshop={w} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}
