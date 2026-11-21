"use client";

// The Daily 10's start page (founder, 2026-11-20: the most special start after the full-length exam).
// Opened from the Daily 10 card on Homework. Two panes on the landscape:
//   Today   a little scene of today, drawn for the hour it is (dawn, day, dusk or night, the sun or
//           moon where it really is) and different every day: its hills, clouds and birds are dealt
//           from the date. The student's own character stands in it and greets them.
//   Mix     today's ten: the skills they come from, Reading and Writing and Math, each with Karman
//           showing where the student stands on it, then one green Start.
// Never skipped, and nothing starts until Start is pressed. Everything is a stand-in: no student
// data is read yet.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { TailsMark } from "../end-options/TailsStage";
import go from "../end-options/parts.module.css";
import { Buddy } from "./HomeworkBuddy";
import lib from "./library.module.css";
import { Icon } from "./practice";
import styles from "./dailyStart.module.css";

const NAME = "Maya";
type Pick = { skill: string; n: number; level: number };
const MIX: { section: string; key: "rw" | "math"; picks: Pick[] }[] = [
  {
    section: "Reading and Writing",
    key: "rw",
    picks: [
      { skill: "Transitions", n: 2, level: 2 },
      { skill: "Boundaries", n: 1, level: 1 },
      { skill: "Central ideas", n: 2, level: 3 },
    ],
  },
  {
    section: "Math",
    key: "math",
    picks: [
      { skill: "Linear equations", n: 2, level: 2 },
      { skill: "Circles", n: 1, level: 2 },
      { skill: "Percentages", n: 2, level: 0 },
    ],
  },
];

/** A number from 0 to 1 dealt from a seed, the same every time for the same seed. */
function dealer(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Rolling hills across the scene's width, dealt from the day. */
function hills(rand: () => number, base: number, rise: number) {
  let d = `M0 ${base}`;
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * 600;
    const y = base - rand() * rise;
    const cx = x - 300 / n;
    d += ` Q${cx.toFixed(0)} ${(y - rise * 0.5).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  return `${d} L600 220 L0 220Z`;
}

type Sky = { top: string; low: string; hill: [string, string, string]; night: boolean };
function skyAt(hour: number): Sky {
  if (hour < 5 || hour >= 21)
    return { top: "#0b1430", low: "#27305a", hill: ["#283158", "#1d2546", "#141a33"], night: true };
  if (hour < 8)
    return {
      top: "#7b8fd0",
      low: "#ffc7a0",
      hill: ["#a99bb8", "#7f7a9e", "#5c5a7e"],
      night: false,
    };
  if (hour < 17)
    return {
      top: "#5aa6e6",
      low: "#cfe9ff",
      hill: ["#8cc79a", "#5fa877", "#3f8a5c"],
      night: false,
    };
  return { top: "#5b5aa0", low: "#ffae72", hill: ["#9a7aa0", "#6d5884", "#4a3e66"], night: false };
}

/** Today, drawn small: the sky for the hour, the sun or the moon where it is, the day's own hills. */
function Scene({ now }: { now: Date }) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const sky = skyAt(Math.floor(hour));
  const seed = now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
  const art = useMemo(() => {
    const rand = dealer(seed);
    return {
      far: hills(rand, 168, 44),
      mid: hills(rand, 188, 34),
      near: hills(rand, 206, 22),
      clouds: Array.from({ length: 2 + Math.floor(rand() * 3) }, () => ({
        x: rand() * 560,
        y: 24 + rand() * 50,
        s: 0.6 + rand() * 0.7,
      })),
      birds: Array.from({ length: Math.floor(rand() * 4) }, () => ({
        x: 80 + rand() * 440,
        y: 40 + rand() * 50,
      })),
      stars: Array.from({ length: 40 }, () => ({ x: rand() * 600, y: rand() * 130, r: rand() })),
    };
  }, [seed]);
  // the sun crosses from 6 am to 8 pm, the moon through the night
  const day = (hour - 6) / 14;
  const nightT = ((hour + 24 - 20) % 24) / 10;
  const t = sky.night ? nightT : Math.min(1, Math.max(0, day));
  const bx = 40 + t * 520;
  const by = 150 - Math.sin(t * Math.PI) * 120;
  const id = `sky${seed}`;
  return (
    <svg className={styles.scene} viewBox="0 0 600 220" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.low} />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={sky.night ? "#e8eeff" : "#fff3c4"} stopOpacity="0.9" />
          <stop offset="1" stopColor={sky.night ? "#e8eeff" : "#ffd27a"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="220" fill={`url(#${id})`} />
      {/* a glow along the horizon, warmest under the sun or the moon */}
      <ellipse cx={bx} cy="170" rx="360" ry="70" fill={`url(#${id}g)`} opacity="0.55" />
      {sky.night &&
        art.stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={0.6 + s.r}
            className={styles.star}
            style={{ animationDelay: `${(s.r * 4).toFixed(2)}s` }}
          />
        ))}
      <circle cx={bx} cy={by} r="46" fill={`url(#${id}g)`} />
      <circle cx={bx} cy={by} r="15" fill={sky.night ? "#f4f6ff" : "#fff1b8"} />
      {sky.night && <circle cx={bx + 6} cy={by - 4} r="13" fill={sky.top} />}
      {!sky.night &&
        art.clouds.map((c, i) => (
          <g key={i} className={styles.cloud} style={{ animationDelay: `${-i * 9}s` }}>
            <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
              <ellipse cx="0" cy="0" rx="34" ry="11" />
              <ellipse cx="-12" cy="-7" rx="16" ry="11" />
              <ellipse cx="10" cy="-9" rx="18" ry="13" />
            </g>
          </g>
        ))}
      {!sky.night &&
        art.birds.map((b, i) => (
          <path
            key={i}
            d={`M${b.x - 7} ${b.y} q4 -4 7 0 q3 -4 7 0`}
            className={styles.bird}
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      <path d={art.far} fill={sky.hill[0]} />
      <path d={art.mid} fill={sky.hill[1]} />
      <path d={art.near} fill={sky.hill[2]} />
    </svg>
  );
}

function greeting(hour: number) {
  if (hour < 5 || hour >= 21) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DailyStart({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
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
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.07,
        }
      );
      gsap.fromTo(
        "[data-slot]",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(3)",
          stagger: 0.05,
          delay: 0.3,
        }
      );
      gsap.fromTo(
        "[data-pick]",
        { x: 18, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.45,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.45,
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);
  const slots = MIX.flatMap((m) =>
    m.picks.flatMap((p) => Array.from({ length: p.n }, () => m.key))
  );
  return (
    <div ref={ref} className={`${lib.library} ${styles.page}`}>
      <section className={`${lib.glass} ${styles.today}`} data-rise>
        <div className={styles.window}>
          {now && <Scene now={now} />}
          <span className={styles.ground} aria-hidden="true" />
          <span className={styles.buddy}>
            <Buddy size={small ? 92 : 140} cheer={cheer} />
          </span>
        </div>
        <div className={styles.hello}>
          <h2>{now ? `${greeting(now.getHours())}, ${NAME}` : `Hello, ${NAME}`}</h2>
          <p suppressHydrationWarning>
            {now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </section>

      <section className={`${lib.glass} ${styles.mix}`} data-rise>
        <h2>Today&rsquo;s ten</h2>
        <p className={styles.slots} aria-hidden="true">
          {slots.map((key, i) => (
            <i key={i} data-slot data-key={key}>
              {i + 1}
            </i>
          ))}
        </p>
        {MIX.map((m) => (
          <div key={m.key} className={styles.group} data-key={m.key}>
            <h3>{m.section}</h3>
            <ul>
              {m.picks.map((p) => (
                <li key={p.skill} data-pick>
                  <TailsMark level={p.level} size={36} />
                  <span>{p.skill}</span>
                  <b>×{p.n}</b>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button type="button" className={`${go.go} ${styles.start}`} onClick={onStart}>
          <span>Start Daily 10</span>
          <Icon name="go" size={20} />
        </button>
      </section>
    </div>
  );
}
