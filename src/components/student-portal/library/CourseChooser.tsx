"use client";

/*
 * The Library's first decision (founder, 2026-11-08): "The math-to-reading needs to be the first
 * decision the student makes, and then it kind of goes and shifts up to the top left of the box
 * as a little toggle. Initially, it's like a hero choice between math and reading."
 *
 * - With no course picked this visit, the box shows two large options, each with its drawn mark
 *   and its percent. It waits for the Challenge moment to be out of the way first.
 * - Picking one sends it, on a spring, to the top left of the box, where it becomes the small
 *   Math / Reading and Writing toggle (a shared-element move, framer-motion layoutId). The
 *   course fades in below.
 * - The pick is kept for this browser session and day, so moving between tabs doesn't replay the
 *   choice; a fresh session or a new day asks again. A `?subject=` link picks straight away.
 * - Reduced motion: a plain cross-fade.
 */
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Num } from "@/components/portal/primitives";
import { Ring } from "@/components/portal/Ring";
import SubjectMark from "./SubjectMarks";
import HeroOption from "./heroes/HeroOption";
import type { HeroOption as HeroKind } from "./heroes/types";
import { COURSE_PICK_KEY, challengeMoment, readStore, writeStore } from "./moment";
import styles from "./chooser.module.css";

type Slug = "math" | "reading-writing";

export interface ChooserCourse {
  slug: Slug;
  name: string;
  progress: number;
}

const SHORT: Record<Slug, string> = { math: "Math", "reading-writing": "Reading and Writing" };
const spring: Transition = { type: "spring", stiffness: 190, damping: 26, mass: 1 };

const today = () => new Date().toDateString();

/** Before React loads, a returning visit hides the choice so it doesn't flash. */
const BOOT = `(function(){try{var v=sessionStorage.getItem("${COURSE_PICK_KEY}"),d=new Date().toDateString()+"|";if(v&&v.indexOf(d)===0)document.currentScript.parentElement.setAttribute("data-boot",v.slice(d.length))}catch(e){}})();`;

export default function CourseChooser({
  courses,
  views,
  initial,
  waitForChallenge,
  hero = null,
}: {
  courses: ChooserCourse[];
  /** Each course's content, rendered on the server. */
  views: Record<Slug, ReactNode>;
  /** A course picked by the link (`?subject=`), which skips the choice. */
  initial: Slug | null;
  /** True when the Challenge moment may open first. */
  waitForChallenge: boolean;
  /** One of the painted versions being compared (`?hero=a|b|c`). It always asks, so each
   *  version can be seen again with a reload. */
  hero?: HeroKind | null;
}) {
  const reduce = useReducedMotion() ?? false;
  const [pick, setPick] = useState<Slug | null>(initial);
  /** The course that travelled from the choice, for the shared-element move. */
  const [travelled, setTravelled] = useState<Slug | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const settled = useSyncExternalStore(
    challengeMoment.subscribe,
    challengeMoment.settled,
    () => false
  );
  const ready = !waitForChallenge || settled;

  useEffect(() => {
    rootRef.current?.removeAttribute("data-boot");
    if (initial) {
      writeStore("session", COURSE_PICK_KEY, `${today()}|${initial}`);
      return;
    }
    if (hero) return;
    const kept = readStore("session", COURSE_PICK_KEY);
    const prefix = `${today()}|`;
    if (kept?.startsWith(prefix)) {
      const slug = kept.slice(prefix.length);
      if (slug === "math" || slug === "reading-writing") setPick(slug);
    }
  }, [initial, hero]);

  const choose = (slug: Slug, fromHero: boolean) => {
    if (fromHero) setTravelled(slug);
    setPick(slug);
    writeStore("session", COURSE_PICK_KEY, `${today()}|${slug}`);
    if (fromHero) {
      /* Focus follows the choice to its new place in the toggle. */
      requestAnimationFrame(() =>
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-tab="${slug}"]`)
          ?.focus({ preventScroll: true })
      );
    }
  };

  const pct = (c: ChooserCourse) => Math.round(c.progress * 100);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="library-course">
        <div ref={rootRef} className={styles.root} suppressHydrationWarning>
          {!hero && <script dangerouslySetInnerHTML={{ __html: BOOT }} />}
          <AnimatePresence initial={false} mode="popLayout">
            {pick === null ? (
              <motion.section
                key="hero"
                className={styles.hero}
                aria-labelledby="course-choice"
                exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.18 } }}
              >
                <motion.h2
                  id="course-choice"
                  className={styles.heroTitle}
                  initial={false}
                  animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 12 }}
                  transition={{ ...spring, delay: 0.05 }}
                >
                  What are we studying?
                </motion.h2>
                {hero ? (
                  <HeroOption
                    kind={hero}
                    courses={courses}
                    ready={ready}
                    reduce={reduce}
                    onPick={(slug) => choose(slug, true)}
                  />
                ) : (
                  <div className={styles.options}>
                    {courses.map((c, i) => (
                      <motion.button
                        key={c.slug}
                        type="button"
                        className={styles.option}
                        data-slug={c.slug}
                        layoutId={reduce ? undefined : `course-${c.slug}`}
                        style={{ borderRadius: 4 }}
                        onClick={() => choose(c.slug, true)}
                        initial={false}
                        animate={
                          ready
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.97 }
                        }
                        transition={{ ...spring, delay: ready ? 0.12 + i * 0.1 : 0 }}
                        whileHover={reduce ? undefined : { y: -4 }}
                        whileTap={reduce ? undefined : { scale: 0.985 }}
                      >
                        <span className={styles.optionArt}>
                          {ready && <SubjectMark slug={c.slug} still={reduce} />}
                        </span>
                        <span className={styles.optionFoot}>
                          <span className={styles.optionName}>{SHORT[c.slug]}</span>
                          <span className={styles.optionPct}>
                            <span aria-hidden="true">
                              <Ring value={c.progress} size={44} width={5} label="" />
                            </span>
                            <span>
                              <Num>{pct(c)}%</Num> done
                            </span>
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.section>
            ) : (
              <motion.div
                key="toggle"
                className={styles.toggle}
                role="group"
                aria-label="Course"
                initial={false}
              >
                {courses.map((c) => {
                  const on = c.slug === pick;
                  const flies = c.slug === travelled;
                  return (
                    <motion.button
                      key={c.slug}
                      type="button"
                      data-tab={c.slug}
                      className={styles.tab}
                      aria-pressed={on}
                      onClick={() => !on && choose(c.slug, false)}
                      layoutId={flies && !reduce ? `course-${c.slug}` : undefined}
                      style={{ borderRadius: 4 }}
                      initial={travelled && !flies ? { opacity: 0 } : false}
                      animate={{ opacity: 1 }}
                      transition={{ ...spring, opacity: { duration: 0.3, delay: 0.25 } }}
                    >
                      {on && (
                        <motion.span
                          layoutId="course-pill"
                          className={styles.pill}
                          style={{ borderRadius: 4 }}
                          transition={spring}
                        />
                      )}
                      <motion.span layout="position" className={styles.tabLabel}>
                        {SHORT[c.slug]} <Num>{pct(c)}%</Num>
                      </motion.span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {courses.map((c) => {
            const on = c.slug === pick;
            return (
              <motion.div
                key={c.slug}
                className={styles.view}
                data-view={c.slug}
                hidden={!on}
                initial={false}
                animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 10 }}
                transition={{
                  duration: reduce ? 0.2 : 0.35,
                  ease: [0.2, 0.8, 0.2, 1],
                  delay: on && travelled === c.slug ? 0.12 : 0,
                }}
              >
                {views[c.slug]}
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
