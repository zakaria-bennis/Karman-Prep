"use client";

/*
 * The Library's stage (founder, 2026-11-08): "start the library section off with no card open
 * … Once a student clicks, it opens up their card, with an animation."
 *
 * - With no course open, the box is closed and the Library looks up into the sky, split on a
 *   diagonal between Math and Reading and Writing (LibraryWorld). It waits for the Challenge
 *   moment to be out of the way first.
 * - Choosing a half: the camera falls through the clouds to that subject's ground. The name
 *   hangs where it was on the way down, then, as the box opens out of the scene on a spring, it
 *   travels into the small Math / Reading and Writing toggle at the top left of the box. The
 *   toggle switches course after that (the ground cross-fades). Escape during the fall turns back.
 * - Close, at the top right of the box, closes it and climbs back up to the sky.
 * - The open course is kept for this browser session (moving between tabs or reloading reopens
 *   it); closing the box forgets it. A `?subject=` link opens that course straight away.
 * - Reduced motion: the box fades in and out, nothing travels.
 */
import { animate, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Num, Panel } from "@/components/portal/primitives";
import { choosePainting } from "@/lib/painting/schedule";
import { INTROS, type IntroDef, type IntroProps, type Subject } from "./intros/registry";
import LibraryWorld, { DESCENT_MS, SHORT, type Slug, type StageCourse } from "./LibraryWorld";
import { COURSE_PICK_KEY, afterPaintingOpening, challengeMoment, readStore } from "./moment";
import styles from "./stage.module.css";

export type { StageCourse };

const spring = { type: "spring", stiffness: 190, damping: 26, mass: 1 } as const;

/** Before React loads, a kept course shows its box at once, so the paintings don't flash. */
const BOOT = `(function(){try{if(/[?&]intro=/.test(location.search))return;var v=sessionStorage.getItem("${COURSE_PICK_KEY}");if(v==="math"||v==="reading-writing")document.currentScript.parentElement.setAttribute("data-boot",v)}catch(e){}})();`;

function keep(slug: Slug | null) {
  try {
    if (slug) sessionStorage.setItem(COURSE_PICK_KEY, slug);
    else sessionStorage.removeItem(COURSE_PICK_KEY);
  } catch {
    /* storage blocked: remembered until the page reloads */
  }
}

interface Opening {
  slug: Slug;
  x: number;
  y: number;
  name: DOMRect | null;
  /** The name's line height in pixels. */
  line: number;
  /** Chosen in an opening animation that has already landed on the ground: no fall. */
  jump?: boolean;
}

interface Ghost {
  slug: Slug;
  from: DOMRect;
  to: DOMRect;
  line: number;
}

export default function LibraryStage({
  courses,
  views,
  side,
  initial,
  waitForChallenge,
}: {
  courses: StageCourse[];
  /** Each course's content, rendered on the server. */
  views: Record<Slug, ReactNode>;
  /** The box's second column: practice modes, full-length tests, skill levels. */
  side: ReactNode;
  /** A course picked by the link (`?subject=`), opened straight away. */
  initial: Slug | null;
  /** True when the Challenge moment may open first. */
  waitForChallenge: boolean;
}) {
  const reduce = useReducedMotion() ?? false;
  const [pick, setPick] = useState<Slug | null>(initial);
  const [active, setActive] = useState<Slug | null>(null);
  const [opening, setOpening] = useState<Opening | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  /** True while the camera is falling and the box has not opened yet. */
  const [falling, setFalling] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fallRun = useRef<{ stop: () => void } | null>(null);
  const settled = useSyncExternalStore(
    challengeMoment.subscribe,
    challengeMoment.settled,
    () => false
  );
  const [afterOpening, setAfterOpening] = useState(false);
  const ready = (!waitForChallenge || settled) && afterOpening;
  /* `?intro=N` plays one of the opening animations (intros/registry.ts) instead of the sky. */
  const [intro, setIntro] = useState<{ def: IntroDef; time: IntroProps["time"] } | null>(null);
  /** "leaving": the intro has landed and fades out over the shared ground. */
  const [introPhase, setIntroPhase] = useState<"on" | "leaving" | "gone">("on");
  useEffect(() => {
    const n = Number(new URLSearchParams(location.search).get("intro"));
    const def = INTROS.find((i) => i.id === n);
    if (!def) return;
    const dev = process.env.NODE_ENV !== "production";
    setIntro({ def, time: choosePainting(new Date(), location.search, dev).time });
  }, []);
  const introOn = intro !== null && introPhase !== "gone" && !initial;

  useEffect(() => {
    let live = true;
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
    const kept = readStore("session", COURSE_PICK_KEY);
    if (/[?&]intro=/.test(location.search)) return;
    if (kept === "math" || kept === "reading-writing") setPick(kept);
  }, [initial]);

  const choose = useCallback((slug: Slug, from: Omit<Opening, "slug">) => {
    setActive(null);
    setOpening({ slug, ...from });
    setPick(slug);
    keep(slug);
  }, []);

  /* The box opens out of the chosen point, and the name travels into the toggle. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!opening || !box) return;
    const r = box.getBoundingClientRect();
    const tab = box.querySelector<HTMLElement>(`[data-tab="${opening.slug}"] [data-label]`);
    const to = tab?.getBoundingClientRect();
    if (reduce) {
      void animate(box, { opacity: [0, 1] }, { duration: 0.25 });
    } else {
      const ox = Math.max(0, Math.min(r.width, opening.x - r.left));
      const oy = Math.max(0, Math.min(r.height, opening.y - r.top));
      box.style.transformOrigin = `${ox}px ${oy}px`;
      box.style.opacity = "0";
      const far = Math.hypot(Math.max(ox, r.width - ox), Math.max(oy, r.height - oy)) + 40;
      const land = opening.jump ? 0.1 : DESCENT_MS / 1000 - 0.15;
      box.style.pointerEvents = "none";
      setFalling(true);
      const run = animate(
        box,
        {
          opacity: [0, 1],
          scale: [0.42, 1],
          clipPath: [`circle(0px at ${ox}px ${oy}px)`, `circle(${far}px at ${ox}px ${oy}px)`],
        },
        {
          delay: land,
          scale: { ...spring, delay: land },
          opacity: { duration: 0.22, delay: land },
          clipPath: { duration: 0.75, ease: [0.3, 0.9, 0.2, 1], delay: land },
        }
      );
      fallRun.current = run;
      void run.then(() => {
        box.style.clipPath = "";
        box.style.transformOrigin = "";
        box.style.pointerEvents = "";
        setFalling(false);
      });
      if (opening.name && to)
        setGhost({ slug: opening.slug, from: opening.name, to, line: opening.line });
    }
    requestAnimationFrame(() =>
      box.querySelector<HTMLElement>(`[data-tab="${opening.slug}"]`)?.focus({ preventScroll: true })
    );
    setOpening(null);
  }, [opening, reduce]);

  const close = () => {
    const box = boxRef.current;
    const was = pick;
    const finish = () => {
      setPick(null);
      keep(null);
      /* Focus goes back to the painting that was open. */
      requestAnimationFrame(() =>
        rootRef.current
          ?.querySelector<HTMLElement>(`button[data-slug="${was}"]`)
          ?.focus({ preventScroll: true })
      );
    };
    if (!box) return finish();
    if (falling) {
      /* Turned back on the way down: the camera climbs straight back up. */
      fallRun.current?.stop();
      setFalling(false);
      setGhost(null);
      box.style.clipPath = "";
      box.style.pointerEvents = "";
      box.style.opacity = "0";
      finish();
      requestAnimationFrame(() => (box.style.opacity = ""));
      return;
    }
    void animate(box, reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 18 }, {
      duration: reduce ? 0.2 : 0.26,
      ease: [0.4, 0, 0.7, 0.2],
    }).then(() => {
      box.style.transform = "";
      box.style.opacity = "";
      finish();
    });
  };

  /* During the fall, Escape turns back up. */
  useEffect(() => {
    if (!falling) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const switchTo = (slug: Slug) => {
    setPick(slug);
    keep(slug);
  };

  const pct = (c: StageCourse) => Math.round(c.progress * 100);

  const introChose = (s: Subject) => {
    const slug: Slug = s === "math" ? "math" : "reading-writing";
    choose(slug, { x: innerWidth / 2, y: innerHeight * 0.55, name: null, line: 60, jump: true });
    setIntroPhase("leaving");
    window.setTimeout(() => setIntroPhase("gone"), 900);
  };
  const percent = (slug: Slug) => pct(courses.find((c) => c.slug === slug) ?? courses[0]);

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
          <LibraryWorld
            courses={courses}
            ready={ready && (!introOn || introPhase === "leaving")}
            pick={pick}
            active={active}
            flying={ghost?.slug ?? null}
            reduce={reduce}
            onActive={setActive}
            onChoose={choose}
          />
          {introOn && ready && intro && (
            <div className={styles.intro} data-leaving={introPhase === "leaving" || undefined}>
              <intro.def.Component
                percents={{ math: percent("math"), rw: percent("reading-writing") }}
                time={intro.time}
                reducedMotion={reduce}
                onChoose={introChose}
              />
            </div>
          )}
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
                          data-landing={ghost?.slug === c.slug || undefined}
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
                    aria-label="Close the course and go back to the two paintings"
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
          {ghost && (
            <motion.span
              key={`${ghost.slug}-${ghost.from.left}`}
              className={styles.ghost}
              aria-hidden="true"
              style={{
                left: ghost.from.left,
                top: ghost.from.top,
                width: ghost.from.width,
                height: ghost.from.height,
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              /* The name hangs where it was while the camera falls, then flies into the toggle
                 as the box opens. */
              animate={{
                x: [0, 0, ghost.to.left - ghost.from.left],
                y: [0, 0, ghost.to.top - ghost.from.top],
                scale: [1, 1, ghost.to.height / ghost.line],
                opacity: ghost.from.height > ghost.line * 1.4 ? [1, 1, 0, 0] : [1, 1, 1, 0],
              }}
              transition={{
                duration: DESCENT_MS / 1000 + 0.55,
                times: [0, (DESCENT_MS / 1000 - 0.15) / (DESCENT_MS / 1000 + 0.55), 1],
                ease: [0.3, 0.9, 0.25, 1],
                /* A two-line name (Reading and Writing) fades early, so it never sits on the
                   toggle as two lines. */
                opacity: {
                  duration: DESCENT_MS / 1000 + 0.75,
                  times:
                    ghost.from.height > ghost.line * 1.4 ? [0, 0.6, 0.72, 1] : [0, 0.6, 0.86, 1],
                },
              }}
              onAnimationComplete={() => setGhost(null)}
            >
              {SHORT[ghost.slug]}
            </motion.span>
          )}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
