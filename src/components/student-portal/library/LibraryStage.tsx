"use client";

/*
 * The Library's stage (founder, 2026-11-08): "start the library section off with no card open"
 * and "I want 10 different animations I can pick from … all of them leading to the same library
 * card at the end."
 *
 * - With no course open, the box is closed and an opening animation fills the screen: the one
 *   `?intro=N` names, or intro 1 (intros/registry.ts). It waits for the Challenge moment to be
 *   out of the way first.
 * - The intro lets the student choose Math or Reading and Writing, plays its closing animation and
 *   calls `onChoose`. Then the shared end state shows: the chosen subject's ground scene
 *   (GroundScene) with the box opening out of it on a spring, the small Math / Reading and Writing
 *   toggle at its top left. The toggle switches course (the ground cross-fades).
 * - Close, at the top right of the box, closes it and replays the intro from its start.
 * - Without `?intro`, the open course is kept for this browser session (changing tabs or
 *   reloading reopens it); closing forgets it. A `?subject=` link opens a course straight away.
 * - With `?intro`, a small picker at the bottom right hops between the intros.
 * - Reduced motion: the intro and the end state cross-fade.
 */
import {
  AnimatePresence,
  animate,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Num, Panel } from "@/components/portal/primitives";
import { prefersStill } from "@/lib/painting/motion";
import { choosePainting } from "@/lib/painting/schedule";
import type { Slug } from "@/lib/painting/library/seam";
import GroundScene, { groundAnchor } from "./GroundScene";
import IntroPicker from "./IntroPicker";
import { INTROS, type IntroDef, type IntroProps, type Subject } from "./intros/registry";
import { IntroStageContext } from "./intros/stage-context";
import { COURSE_PICK_KEY, afterPaintingOpening, challengeMoment, readStore } from "./moment";
import styles from "./stage.module.css";

export interface StageCourse {
  slug: Slug;
  name: string;
  progress: number;
}

export const SHORT: Record<Slug, string> = {
  math: "Math",
  "reading-writing": "Reading and Writing",
};
const toSlug = (s: Subject): Slug => (s === "math" ? "math" : "reading-writing");

const spring = { type: "spring", stiffness: 190, damping: 26, mass: 1 } as const;

/** Before React loads, a kept course shows its box at once, so the intro doesn't flash. */
const BOOT = `(function(){try{if(/[?&]intro=/.test(location.search))return;var v=sessionStorage.getItem("${COURSE_PICK_KEY}");if(v==="math"||v==="reading-writing")document.currentScript.parentElement.setAttribute("data-boot",v)}catch(e){}})();`;

function keep(slug: Slug | null) {
  try {
    if (slug) sessionStorage.setItem(COURSE_PICK_KEY, slug);
    else sessionStorage.removeItem(COURSE_PICK_KEY);
  } catch {
    /* storage blocked: remembered until the page reloads */
  }
}

export default function LibraryStage({
  courses,
  views,
  side,
  initial,
  intro,
  waitForChallenge,
  intros = INTROS,
}: {
  courses: StageCourse[];
  /** Each course's content, rendered on the server. */
  views: Record<Slug, ReactNode>;
  /** The box's second column: practice modes, full-length tests, skill levels. */
  side: ReactNode;
  /** A course picked by the link (`?subject=`), opened straight away. */
  initial: Slug | null;
  /** The intro named by `?intro=N`, or null for the default (intro 1, no picker). */
  intro: number | null;
  /** True when the Challenge moment may open first. */
  waitForChallenge: boolean;
  /** The intros to choose from (tests pass their own). */
  intros?: IntroDef[];
}) {
  const motionPref = useReducedMotion() ?? false;
  const [still, setStill] = useState(false);
  const reduce = motionPref || still;
  const [pick, setPick] = useState<Slug | null>(initial);
  /** The ground an intro asked to see underneath it before it finished. */
  const [preview, setPreview] = useState<Slug | null>(null);
  /** Bumped on Close, so the intro starts again from the top. */
  const [round, setRound] = useState(0);
  const [opened, setOpened] = useState<Slug | null>(null);
  const [time, setTime] = useState<IntroProps["time"]>("day");
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const settled = useSyncExternalStore(
    challengeMoment.subscribe,
    challengeMoment.settled,
    () => false
  );
  const [afterOpening, setAfterOpening] = useState(false);
  const ready = (!waitForChallenge || settled) && afterOpening;
  const def = intros.find((d) => d.id === intro) ?? intros.find((d) => d.id === 1) ?? intros[0];

  useEffect(() => {
    let live = true;
    setStill(prefersStill());
    setTime(
      choosePainting(new Date(), location.search, process.env.NODE_ENV !== "production").time
    );
    void afterPaintingOpening().then(() => live && setAfterOpening(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    rootRef.current?.removeAttribute("data-boot");
    if (initial) {
      keep(initial);
      return;
    }
    if (intro !== null) return;
    const kept = readStore("session", COURSE_PICK_KEY);
    if (kept === "math" || kept === "reading-writing") setPick(kept);
  }, [initial, intro]);

  const onChoose = useCallback((s: Subject) => {
    const slug = toSlug(s);
    setPick(slug);
    setOpened(slug);
    keep(slug);
  }, []);

  const stage = useMemo(
    () => ({ showGround: (s: Subject | null) => setPreview(s ? toSlug(s) : null) }),
    []
  );

  /* The box opens out of the ground scene, from the bridge or the book, on a spring. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!opened || !box) return;
    const r = box.getBoundingClientRect();
    const [fx, fy] = groundAnchor(opened, innerWidth, innerHeight);
    if (reduce) {
      void animate(box, { opacity: [0, 1] }, { duration: 0.3 });
    } else {
      const ox = Math.max(0, Math.min(r.width, fx * innerWidth - r.left));
      const oy = Math.max(0, Math.min(r.height, fy * innerHeight - r.top));
      const far = Math.hypot(Math.max(ox, r.width - ox), Math.max(oy, r.height - oy)) + 40;
      box.style.transformOrigin = `${ox}px ${oy}px`;
      box.style.opacity = "0";
      void animate(
        box,
        {
          opacity: [0, 1],
          scale: [0.42, 1],
          clipPath: [`circle(0px at ${ox}px ${oy}px)`, `circle(${far}px at ${ox}px ${oy}px)`],
        },
        {
          delay: 0.1,
          scale: { ...spring, delay: 0.1 },
          opacity: { duration: 0.22, delay: 0.1 },
          clipPath: { duration: 0.75, ease: [0.3, 0.9, 0.2, 1], delay: 0.1 },
        }
      ).then(() => {
        box.style.clipPath = "";
        box.style.transformOrigin = "";
      });
    }
    const focus = requestAnimationFrame(() =>
      box.querySelector<HTMLElement>(`[data-tab="${opened}"]`)?.focus({ preventScroll: true })
    );
    setOpened(null);
    return () => cancelAnimationFrame(focus);
  }, [opened, reduce]);

  const close = () => {
    const box = boxRef.current;
    const finish = () => {
      setPick(null);
      setPreview(null);
      setRound((r) => r + 1);
      keep(null);
    };
    if (!box) return finish();
    void animate(box, reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 18 }, {
      duration: reduce ? 0.2 : 0.26,
      ease: [0.4, 0, 0.7, 0.2],
    }).then(() => {
      box.style.transform = "";
      box.style.opacity = "";
      finish();
    });
  };

  const switchTo = (slug: Slug) => {
    setPick(slug);
    keep(slug);
  };

  const pct = (c: StageCourse) => Math.round(c.progress * 100);
  const percents = {
    math: pct(courses.find((c) => c.slug === "math") ?? courses[0]),
    rw: pct(courses.find((c) => c.slug === "reading-writing") ?? courses[0]),
  };
  const Intro = def?.Component;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="library-course">
        <div
          ref={rootRef}
          className={styles.stage}
          data-open={pick ?? undefined}
          suppressHydrationWarning
        >
          <script dangerouslySetInnerHTML={{ __html: BOOT }} />
          <GroundScene ready={ready || pick !== null} shown={pick ?? preview} />
          <AnimatePresence>
            {ready && !pick && Intro && (
              <motion.div
                key={`${def.id}-${round}`}
                className={styles.introLayer}
                data-intro={def.id}
                initial={{ opacity: round ? 0 : 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: reduce ? 0.3 : 0.45 } }}
                transition={{ duration: 0.45 }}
              >
                <IntroStageContext.Provider value={stage}>
                  <Intro
                    percents={percents}
                    time={time}
                    reducedMotion={reduce}
                    onChoose={onChoose}
                  />
                </IntroStageContext.Provider>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={boxRef} className={styles.box} hidden={!pick}>
            <Panel
              side={side}
              label={pick ? `${SHORT[pick]} course` : undefined}
              banner={
                <div className={styles.boxTop}>
                  <div className={styles.toggle} role="group" aria-label="Course">
                    {courses.map((c) => {
                      const on = c.slug === pick;
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          data-tab={c.slug}
                          className={styles.tab}
                          aria-pressed={on}
                          onClick={() => !on && switchTo(c.slug)}
                        >
                          {on && (
                            <motion.span
                              layoutId="course-pill"
                              className={styles.pill}
                              style={{ borderRadius: 4 }}
                              transition={spring}
                            />
                          )}
                          <span className={styles.tabLabel}>
                            <span data-label="">{SHORT[c.slug]}</span> <Num>{pct(c)}%</Num>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className={styles.close}
                    onClick={close}
                    aria-label="Close the course and go back to the start"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={styles.closeText}>Close</span>
                  </button>
                </div>
              }
            >
              {courses.map((c) => (
                <div
                  key={c.slug}
                  className={styles.view}
                  data-view={c.slug}
                  hidden={c.slug !== pick}
                >
                  {views[c.slug]}
                </div>
              ))}
            </Panel>
          </div>
          {intro !== null && <IntroPicker intros={intros} current={def?.id ?? 1} />}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
