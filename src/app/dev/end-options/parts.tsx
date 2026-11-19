"use client";
// What the three end-screen options share (founder, 2026-11-19, fifth try): made the way the portal's
// own pages are (Library, Homework, Progress, Mistake Log, Chat, Schedule), with his notes of the
// same day: the coins bank themselves, no picture from another tab, a next step chosen from how the
// set went, the student's own character with a face that fits the result, one glowing green button.
//   setOf      the made-up set, for a score given in the address (?score=0 to 8)
//   nextFor    what to do next, and why, from the result
//   Frame      the landscape, the way back, the page's name, the coin counter in the corner
//   useCoins   the coins earned fly up into the corner by themselves, a tick each
//   Mood       the character, its face and its body moving with the result
//   Go         the one green button, glowing
//   Pips       a skill's level as the Library draws it, rising from one level to the next
import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Coin } from "@/components/portal/Coin";
import { portalFontVars } from "@/components/portal/fonts";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import { CoinBurst } from "@/components/quiz-flows/CoinBurst";
import { prefersStill } from "@/lib/painting/motion";
import lib from "../shell/library.module.css";
import shell from "../shell/shell.module.css";
import { LEVELS } from "../shell/skills72";
import p from "./parts.module.css";

export type Tone = "perfect" | "strong" | "middle" | "tough";
export type Answer = { ok: boolean; s: number };

/** Which questions were right, for each score: misses spread through the set, not bunched. */
const PATTERNS: Record<number, number[]> = {
  0: [],
  1: [3],
  2: [1, 5],
  3: [0, 4, 6],
  4: [0, 1, 4, 7],
  5: [0, 1, 3, 4, 7],
  6: [0, 1, 3, 4, 5, 7],
  7: [0, 1, 2, 3, 4, 5, 7],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};
const FAST = [24, 31, 52, 19, 27, 22, 47, 10];
const SLOW = [96, 131, 88, 142, 104, 77, 119, 101];

export const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** The set every option shows, made up, for a score from 0 to 8. A tough set was also slow. */
export function setOf(right: number) {
  const total = 8;
  const lit = PATTERNS[Math.max(0, Math.min(total, right))];
  const share = right / total;
  const tone: Tone =
    share === 1 ? "perfect" : share >= 0.75 ? "strong" : share >= 0.5 ? "middle" : "tough";
  const times = tone === "tough" ? SLOW : FAST;
  const answers: Answer[] = times.map((s, i) => ({ ok: lit.includes(i), s }));
  const seconds = times.reduce((a, b) => a + b, 0);
  const up = share >= 0.75;
  return {
    skill: "Circles",
    domain: "Geometry and Trigonometry",
    right,
    total,
    missed: total - right,
    answers,
    tone,
    verdict: {
      perfect: "Perfect set",
      strong: "Strong set",
      middle: "Getting there",
      tough: "Tough set",
    }[tone],
    time: clock(seconds),
    paceSeconds: Math.round(seconds / total),
    pace: clock(seconds / total),
    /** The digital SAT's pace for Math: 35 minutes for 22 questions. */
    testPace: "1:35",
    testSeconds: 95,
    coins: right * 2 + 4,
    wallet: 140,
    from: 1,
    to: up ? 2 : 1,
    up,
  };
}
export type SetView = ReturnType<typeof setOf>;

/** What to do next, chosen from the result: one main step with the reason for it, and the others
 *  as small links. A tough set starts with the lesson; a middling one with the questions missed; a
 *  strong one with another set; a perfect one with a harder one. A slow set adds a time trial. */
export function nextFor(set: SetView) {
  const slow = set.paceSeconds > set.testSeconds;
  const missed = `Review ${set.missed} missed`;
  const main = {
    tough: {
      label: "Watch the lesson",
      href: "#lesson",
      why: `${set.missed} of ${set.total} missed. The lesson first, then try the set again.`,
    },
    middle: {
      label: missed,
      href: "#review",
      why: "See why each one was missed, then one more set to lock it in.",
    },
    strong: {
      label: "Another set",
      href: "#again",
      why: `Up to ${LEVELS[set.to]}. One more strong set keeps it there.`,
    },
    perfect: {
      label: "Try a harder set",
      href: "#harder",
      why: "Every one right. The next set will ask more of you.",
    },
  }[set.tone];
  const others = {
    tough: [
      { label: "Try again", href: "#again" },
      { label: missed, href: "#review" },
    ],
    middle: [
      { label: "Try again", href: "#again" },
      { label: "Lesson", href: "#lesson" },
    ],
    strong: [{ label: missed, href: "#review" }],
    perfect: [{ label: "Next skill", href: "#next" }],
  }[set.tone];
  if (slow) others.push({ label: "Time trial", href: "#trial" });
  return { main, others, slow };
}

/** What the character says, under it, as Homework's line does. */
export function linesFor(set: SetView) {
  return {
    perfect: ["Every one right!", "That was fast", "Ready for harder ones"],
    strong: [`${set.right} of ${set.total}. Nice!`, "Faster than the SAT", "Up a level"],
    middle: [`${set.right} of ${set.total}`, "Halfway there", "A look at the misses helps"],
    tough: [`${set.right} of ${set.total}`, "This one was hard", "The lesson will help"],
  }[set.tone];
}

/** The score asked for in the address, 6 when none is. */
export function useScore() {
  const [score, setScore] = useState(6);
  useEffect(() => {
    const asked = Number(new URLSearchParams(window.location.search).get("score"));
    if (Number.isInteger(asked) && asked >= 0 && asked <= 8) setScore(asked);
  }, []);
  return score;
}

/** A short bright tick, like a coin dropped in a tin; each a little higher than the one before. */
export function ding(step = 0) {
  if (prefersStill()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const holder = ding as unknown as { ctx?: AudioContext };
    const ctx = (holder.ctx ??= new Ctx());
    const now = ctx.currentTime;
    const base = 1320 * Math.pow(2, Math.min(step, 12) / 24);
    for (const [mult, gain] of [
      [1, 0.16],
      [2.76, 0.05],
    ] as const) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base * mult;
      amp.gain.setValueAtTime(gain, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(amp).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  } catch {
    /* no sound where the browser has none */
  }
}

/** The portal's world and glass around an ending: the way back and the page's name at the top
 *  left, the coin counter at the top right. */
export function Frame({
  mode,
  title,
  corner,
  wallet,
  children,
}: {
  mode: "light" | "dark";
  title: string;
  corner: RefObject<HTMLDivElement>;
  wallet: number;
  children: ReactNode;
}) {
  return (
    <div className={`kp-shell ${portalFontVars} ${shell.shell} ${p.frame}`} data-mode={mode}>
      <QuizWorld />
      <div className={`${lib.library} ${p.page}`}>
        <header className={p.top}>
          <a className={shell.back} href="#done">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M14.500 6.500L9 12l5.500 5.500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Done
          </a>
          <h1 className={shell.title}>{title}</h1>
          <div className={p.corner} ref={corner} aria-label="Coins">
            <Coin size={26} />
            <b>{wallet}</b>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

/** The coins earned, as a small chip, that fly up into the corner counter by themselves `after`
 *  seconds, a tick as each lands. */
export function useCoins(set: SetView, corner: RefObject<HTMLDivElement | null>, after = 2.4) {
  const chip = useRef<HTMLSpanElement>(null);
  const [play, setPlay] = useState(0);
  const [banked, setBanked] = useState(false);
  useEffect(() => {
    if (prefersStill()) {
      setCorner(corner.current, set.wallet + set.coins);
      setBanked(true);
      return;
    }
    const timer = window.setTimeout(() => setPlay(1), after * 1000);
    return () => window.clearTimeout(timer);
  }, [after, corner, set.coins, set.wallet]);
  const burst = (
    <CoinBurst
      className={p.burst}
      coins={Math.max(4, Math.min(10, Math.round(set.coins / 2)))}
      play={play}
      target={corner}
      from={chip}
      onLand={(landed, of) => {
        ding(landed);
        setCorner(corner.current, set.wallet + Math.round((set.coins * landed) / of));
        const face = corner.current?.querySelector("svg");
        if (face)
          gsap.fromTo(face, { scale: 1.35 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
        if (landed === of) setBanked(true);
      }}
    />
  );
  const coins = (
    <span className={p.chip} ref={chip} data-flown={play > 0 || undefined}>
      <Coin size={20} />+{set.coins}
    </span>
  );
  return { burst, coins, banked };
}

function setCorner(el: HTMLElement | null, n: number) {
  const b = el?.querySelector("b");
  if (b) b.textContent = String(n);
}

/** The faces a result goes through, in order, with when each starts (seconds after the screen). */
const FACES: Record<Tone, [number, string][]> = {
  perfect: [
    [1.4, "wow"],
    [2.2, "happy"],
  ],
  strong: [
    [1.5, "wow"],
    [2.2, "happy"],
  ],
  middle: [
    [1.6, "calm"],
    [3.4, "determined"],
  ],
  tough: [
    [1.6, "worried"],
    [3.6, "determined"],
  ],
};

/** The student's character (`children`, the dressed one) with a face for the result and a body
 *  that moves with it: a hop and a spin for a great set, a nod for a middling one, a slump and then
 *  a firm nod for a tough one. */
export function Mood({ tone, children }: { tone: Tone; children: ReactNode }) {
  const body = useRef<HTMLSpanElement>(null);
  const [mood, setMood] = useState("calm");
  useEffect(() => {
    const timers = FACES[tone].map(([at, face]) =>
      window.setTimeout(() => setMood(face), (prefersStill() ? 0 : at) * 1000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [tone]);
  useEffect(() => {
    const el = body.current;
    if (!el || prefersStill()) return;
    const line = gsap.timeline();
    if (mood === "wow")
      line.fromTo(
        el,
        { scale: 1 },
        { scale: 1.16, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }
      );
    if (mood === "happy")
      line
        .to(el, { y: -26, scaleY: 1.08, scaleX: 0.94, duration: 0.26, ease: "power2.out" })
        .to(el, { rotation: 360, duration: 0.5, ease: "power2.inOut" }, 0.05)
        .to(el, { y: 0, scaleY: 0.88, scaleX: 1.1, duration: 0.2, ease: "power2.in" })
        .to(el, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" })
        .set(el, { rotation: 0 })
        .to(el, {
          y: -8,
          duration: 0.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatDelay: 0.6,
        });
    if (mood === "worried")
      line
        .to(el, { y: 8, scaleY: 0.94, duration: 0.5, ease: "power2.out" })
        .to(el, { rotation: -5, duration: 0.25, ease: "sine.inOut", yoyo: true, repeat: 3 })
        .to(el, { rotation: 0, duration: 0.2 });
    if (mood === "determined")
      line
        .to(el, { y: 0, scaleY: 1, rotation: 0, duration: 0.3, ease: "power2.out" })
        .to(el, { y: 6, duration: 0.14, ease: "power2.in", yoyo: true, repeat: 3 });
    if (mood === "calm")
      line.to(el, { y: -5, duration: 1.2, ease: "sine.inOut", repeat: -1, yoyo: true });
    return () => void line.kill();
  }, [mood]);
  return (
    <span className={p.mood} ref={body} data-mood={mood}>
      {children}
    </span>
  );
}

/** The one main button: the portal's green, glowing softly, with the reason for it under it. */
export function Go({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={p.go} href={href} data-rise>
      <span>{children}</span>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M5 12h13M12.500 6.500L18 12l-5.500 5.500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

/** The other steps, small, after the main one. */
export function Others({ links }: { links: { label: string; href: string }[] }) {
  return (
    <p className={p.others}>
      {links.map((l) => (
        <a key={l.href} href={l.href}>
          {l.label}
        </a>
      ))}
    </p>
  );
}

/** A skill's level as the Library draws it: three bars, lit up to the level, in its green. With
 *  `play` it starts at the old level and the next bar lights up after a moment. */
export function Pips({
  set,
  play,
  settled = false,
}: {
  set: SetView;
  play: boolean;
  settled?: boolean;
}) {
  const [level, setLevel] = useState(settled ? set.to : set.from);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!play || set.to === set.from) return;
    const timer = window.setTimeout(
      () => {
        setLevel(set.to);
        const lit = el.current?.querySelectorAll("i")[set.to - 1];
        if (lit && !prefersStill())
          gsap.fromTo(
            lit,
            { scaleY: 2.4, scaleX: 1.3 },
            { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" }
          );
      },
      prefersStill() ? 0 : 700
    );
    return () => window.clearTimeout(timer);
  }, [play, set.to, set.from]);
  return (
    <span className={p.level}>
      <span ref={el} className={lib.pips} data-level={level} role="img" aria-label={LEVELS[level]}>
        {[1, 2, 3].map((n) => (
          <i key={n} data-on={n <= level || undefined} />
        ))}
      </span>
      <b key={level} className={p.levelName}>
        {LEVELS[level]}
      </b>
    </span>
  );
}

/** The color of a result: gold for a great set, blue for a middling one, rose for a tough one. */
export const TONE_COLOR: Record<Tone, string> = {
  perfect: "#ffb02e",
  strong: "#ffb02e",
  middle: "#4f9dff",
  tough: "#ff6f7d",
};
