"use client";

// The Daily 10's start page (founder, 2026-11-20: the most special start after the full-length exam).
// Opened from the Daily 10 card on Homework. Two panes on the landscape, the same height, the whole
// page in view on a computer with nothing to scroll (his round two, same day):
//   Today   today's land, live (DailyWorld.tsx), with the student's own character in its middle, dressed
//           as they have it, greeting them; the greeting and the date; and the streak, in a card of
//           its own under them.
//   Mix     today's ten: the skills they come from, each with Karman showing where the student
//           stands on it (ten different skills still fit); then one green Start.
// Never skipped, and nothing starts until Start is pressed. A signed-in student's ten are today's
// real ones (the same all day), and Start plays them over the page (play/PlayLayer.tsx); the design
// page shows ten stand-in skills.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { actionDailyMix, type DailyPick } from "@/app/learn/play-actions";
import { TailsMark } from "./play/fox/TailsStage";
import go from "./play/go.module.css";
import { usePlay } from "./play/PlayLayer";
import { DailyWorld } from "./DailyWorld";
import { Buddy } from "./HomeworkBuddy";
import lib from "./library.module.css";
import { Icon } from "./practice";
import { useBestStreak, usePortalData, useStreak } from "./portalData";
import styles from "./dailyStart.module.css";

type Pick = { skill: string; n: number; level: number };
/** Ten different skills: the most a Daily 10 can come from, so the page is drawn for the fullest. */
const MIX: { section: string; key: "rw" | "math"; picks: Pick[] }[] = [
  {
    section: "Reading and Writing",
    key: "rw",
    picks: [
      { skill: "Transitions", n: 1, level: 2 },
      { skill: "Boundaries", n: 1, level: 1 },
      { skill: "Central ideas and details", n: 1, level: 3 },
      { skill: "Words in context", n: 1, level: 2 },
      { skill: "Rhetorical synthesis", n: 1, level: 0 },
    ],
  },
  {
    section: "Math",
    key: "math",
    picks: [
      { skill: "Linear equations", n: 1, level: 2 },
      { skill: "Circles", n: 1, level: 2 },
      { skill: "Percentages", n: 1, level: 0 },
      { skill: "Nonlinear functions", n: 1, level: 1 },
      { skill: "Right triangles", n: 1, level: 3 },
    ],
  },
];

/** The streak, in a card of its own: how many days in a row, what today makes it, the best so far.
 *  Shared by the start pages of the Daily 10 and the challenge question (ChallengeStart.tsx). */
export function Streak() {
  const streak = useStreak();
  const best = useBestStreak();
  // the streak counts challenge days: once today's is answered, today is already in it
  const kept = usePortalData()?.today.challengeDone ?? false;
  return (
    <section className={`${lib.glass} ${styles.streak}`} data-rise>
      <span className={styles.flame} data-flame aria-hidden="true">
        <Icon name="flame" size={40} />
      </span>
      <p>
        <b>{streak} days in a row</b>
        <small>{kept ? "Today is in" : `Today makes ${streak + 1}`}</small>
      </p>
      <p className={styles.best}>
        <small>Best</small>
        <b>{best}</b>
      </p>
    </section>
  );
}

export function greeting(hour: number) {
  if (hour < 5) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Today's real ten, grouped by section as the page draws them. */
function grouped(picks: DailyPick[]): typeof MIX {
  return MIX.map((m) => {
    const counts = new Map<string, Pick>();
    for (const p of picks.filter((p) => p.section === m.key)) {
      const had = counts.get(p.skill);
      counts.set(p.skill, { skill: p.skill, n: (had?.n ?? 0) + 1, level: p.level });
    }
    return { ...m, picks: [...counts.values()] };
  }).filter((m) => m.picks.length > 0);
}

export function DailyStart({
  onStart,
  onFinished,
  onGo,
}: {
  /** The design page's Start (no student signed in). */
  onStart: () => void;
  /** A signed-in student's Daily 10 was played to its ending and closed. */
  onFinished?: () => void;
  /** Shown inside a player already (Today's Start): Start hands over to it. */
  onGo?: (from: Element | null) => void;
}) {
  const portal = usePortalData();
  const real = portal !== null;
  const first = portal?.firstName || "Maya";
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const [mix, setMix] = useState<typeof MIX | null>(real ? null : MIX);
  const { layer, play } = usePlay(undefined, (finished) => finished && onFinished?.());
  useEffect(() => {
    if (!real) return;
    let live = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    actionDailyMix({ timeZone })
      .then((r) => live && setMix(r.ok ? grouped(r.value.picks) : []))
      .catch(() => live && setMix([]));
    return () => {
      live = false;
    };
  }, [real]);
  // the time is read in the browser only, so the scene the server drew never disagrees with it
  const [now, setNow] = useState<Date | null>(null);
  const [cheer, setCheer] = useState(0);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    setNow(new Date());
    setSmall(window.innerWidth < 600);
    // the character greets them a moment after the page arrives
    const hello = window.setTimeout(() => setCheer(1), 700);
    return () => window.clearTimeout(hello);
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersStill()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.07 }
      );
      gsap.fromTo(
        "[data-pick]",
        { x: 18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", stagger: 0.045, delay: 0.45 }
      );
      // the streak's flame flickers
      gsap.to("[data-flame]", {
        keyframes: [
          { scaleY: 1.1, scaleX: 0.95, duration: 0.35 },
          { scaleY: 0.96, scaleX: 1.03, duration: 0.4 },
          { scaleY: 1, scaleX: 1, duration: 0.35 },
        ],
        transformOrigin: "50% 100%",
        repeat: -1,
        ease: "sine.inOut",
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className={`${lib.library} ${styles.page}`}>
      <div className={styles.left}>
        <section className={`${lib.glass} ${styles.today}`} data-rise>
          <div className={styles.window}>
            {now && <DailyWorld day={now} />}
            <span className={styles.buddy}>
              <Buddy size={small ? 92 : 132} cheer={cheer} />
            </span>
          </div>
          <div className={styles.hello}>
            <h2>{now ? `${greeting(now.getHours())}, ${first}` : `Hello, ${first}`}</h2>
            <p suppressHydrationWarning>
              {now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </section>

        <Streak />
      </div>

      <section className={`${lib.glass} ${styles.mix}`} data-rise>
        <h2>Today&rsquo;s ten</h2>
        <div className={styles.groups}>
          {mix === null && <p className={styles.wait}>Picking today&rsquo;s ten</p>}
          {(mix ?? []).map((m) => (
            <div key={m.key} className={styles.group} data-key={m.key}>
              <h3>{m.section}</h3>
              <ul>
                {m.picks.map((p) => (
                  <li key={p.skill} data-pick>
                    <TailsMark level={p.level} size={32} />
                    <span>{p.skill}</span>
                    {p.n > 1 && <b>×{p.n}</b>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button
          ref={start}
          type="button"
          className={`${go.go} ${styles.start}`}
          onClick={() =>
            onGo ? onGo(start.current) : real ? play({ kind: "daily" }, start.current) : onStart()
          }
        >
          <span>Start Daily 10</span>
          <Icon name="go" size={20} />
        </button>
      </section>
      {layer}
    </div>
  );
}
