"use client";
// What every activity's ending is made of (ActivityEnd.tsx), moved out of the old dev demo
// (founder, 2026-11-19): the portal's world and glass, the coin counter in the corner that the coins
// fly up into, the character with a face for the result, the one green glowing button, and the small
// links after it.
import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Coin } from "@/components/portal/Coin";
import { portalFontVars } from "@/components/portal/fonts";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import { CoinBurst } from "@/components/quiz-flows/CoinBurst";
import { prefersStill } from "@/lib/painting/motion";
import lib from "../library.module.css";
import shell from "../shell.module.css";
import p from "./endParts.module.css";

export type Tone = "perfect" | "strong" | "middle" | "tough";

/** How a result reads: every one right, three in four, half, or less. */
export function toneOf(share: number): Tone {
  return share >= 1 ? "perfect" : share >= 0.75 ? "strong" : share >= 0.5 ? "middle" : "tough";
}

/** The ring's color for how full it is: red, then orange, yellow and green as it fills, and gold
 *  only when it closes (every answer right). The whole ring is one color, moving as it fills. */
const STOPS: [number, [number, number, number]][] = [
  [0, [255, 75, 75]],
  [0.3, [255, 138, 42]],
  [0.55, [255, 201, 60]],
  [0.8, [47, 210, 122]],
  [0.97, [47, 210, 122]],
  [1, [247, 196, 52]],
];
export function ringColor(full: number) {
  const f = Math.max(0, Math.min(1, full));
  const at = STOPS.findIndex(([stop]) => stop >= f);
  if (at <= 0) return `rgb(${STOPS[0][1].join(" ")})`;
  const [a, ca] = STOPS[at - 1];
  const [b, cb] = STOPS[at];
  const k = (f - a) / (b - a || 1);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return `rgb(${c.join(" ")})`;
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
  title,
  corner,
  wallet,
  onDone,
  children,
}: {
  title: string;
  corner: RefObject<HTMLDivElement>;
  wallet: number;
  onDone: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`kp-shell ${portalFontVars} ${shell.shell} ${p.frame}`}>
      <QuizWorld />
      <div className={`${lib.library} ${p.page}`}>
        <header className={p.top}>
          <button type="button" className={shell.back} onClick={onDone}>
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
          </button>
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
export function useCoins(
  set: { coins: number; wallet: number },
  corner: RefObject<HTMLDivElement | null>,
  after = 2.4,
  /** Whether the ending has begun: the wait for the coins starts then. */
  on = true
) {
  const chip = useRef<HTMLSpanElement>(null);
  const [play, setPlay] = useState(0);
  const [banked, setBanked] = useState(false);
  useEffect(() => {
    if (!on) return;
    if (prefersStill()) {
      setCorner(corner.current, set.wallet + set.coins);
      setBanked(true);
      return;
    }
    const timer = window.setTimeout(() => setPlay(1), after * 1000);
    return () => window.clearTimeout(timer);
  }, [after, corner, set.coins, set.wallet, on]);
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
/** The same, from the moment the character is home in its pane (the singularity's ending): a good
 *  set is celebrated at once. */
const SOON: Record<Tone, [number, string][]> = {
  perfect: [
    [0, "wow"],
    [0.25, "happy"],
  ],
  strong: [
    [0, "wow"],
    [0.25, "happy"],
  ],
  middle: [[0.2, "determined"]],
  tough: [
    [0.1, "worried"],
    [1.6, "determined"],
  ],
};

/** The student's character (`children`, the dressed one) with a face for the result and a body
 *  that moves with it: a hop and a spin for a great set, a nod for a middling one, a slump and then
 *  a firm nod for a tough one. */
export function Mood({
  tone,
  start,
  children,
}: {
  tone: Tone;
  /** When given, the faces wait for it and then come at once (SOON); otherwise they play on their
   *  own clock from the start (FACES). */
  start?: boolean;
  children: ReactNode;
}) {
  const body = useRef<HTMLSpanElement>(null);
  const [mood, setMood] = useState("calm");
  useEffect(() => {
    if (start === false) return;
    const faces = start === undefined ? FACES[tone] : SOON[tone];
    const timers = faces.map(([at, face]) =>
      window.setTimeout(() => setMood(face), (prefersStill() ? 0 : at) * 1000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [tone, start]);
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

/** The one main button: the portal's green, glowing softly. */
export function Go({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={p.go} onClick={onClick} data-rise>
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
    </button>
  );
}

/** The other steps, small, after the main one. */
export function Others({ links }: { links: { label: string; onClick: () => void }[] }) {
  return (
    <p className={p.others}>
      {links.map((l) => (
        <button key={l.label} type="button" onClick={l.onClick}>
          {l.label}
        </button>
      ))}
    </p>
  );
}
