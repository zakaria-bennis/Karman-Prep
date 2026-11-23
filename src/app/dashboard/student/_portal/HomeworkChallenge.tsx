"use client";

// The daily challenge question (founder, 2026-11-16).
//   ChallengeBanner  if it has not been done, a banner fills the screen when Homework opens: the
//                    fox flying over the city as a hero (HomeworkHero.tsx), the streak it keeps, "Take it on" and "Later".
//   ChallengeCard    once the banner is sent away, the question sits beside the Daily 10 in the
//                    same row, with its own look, until it is done.
// Coins are not spoken of here: they appear only on Rewards.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { usePlay } from "./play/PlayLayer";
import type { LocalQuestion } from "./play/LocalPlay";
import { HeroFlight } from "./HomeworkHero";
import { calm, finish } from "./homeworkMotion";
import styles from "./homeworkChallenge.module.css";
import { usePortalData, useStreak } from "./portalData";
import { chosen, tick } from "./sound";

/** A hexagon with a question mark that tips from side to side: the challenge question's own mark
 *  on the Homework page (he asked for this one to stay there, 2026-11-16). */
function Mark({ size }: { size: number }) {
  return (
    <svg className={styles.mark} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M24 3l18 10.500v21L24 45 6 34.500v-21Z" />
      <path
        d="M18.500 19a5.500 5.500 0 1 1 8.300 4.700c-1.800 1.100-2.800 2-2.800 4.300M24 33.500v.500"
        data-ink
      />
    </svg>
  );
}

/** The design page's two (stand-ins): one Reading and Writing question and one Math question. A
 *  signed-in student's are today's real two, answered over the city (play/ChallengePlay.tsx). */
const TODAY: LocalQuestion[] = [
  {
    subject: "reading_writing",
    text: "The scientist's early results were promising; ______, she repeated the experiment twice before publishing. Which choice completes the text with the most logical transition?",
    choices: ["nevertheless", "for example", "similarly", "in addition"],
    right: 0,
    why: "Promising results might make someone publish at once. She repeated it anyway, so the link is contrast: nevertheless.",
  },
  {
    subject: "math",
    text: "If 3(x − 4) = 2x + 5, what is the value of x?",
    choices: ["9", "13", "17", "21"],
    right: 2,
    why: "3x − 12 = 2x + 5, so x = 17.",
  },
];

export function ChallengeBanner({
  onStart,
  onLater,
  now = false,
}: {
  /** The two questions are finished. */
  onStart: () => void;
  onLater: () => void;
  /** Go straight in, as Take it on does (the small card's Start). */
  now?: boolean;
}) {
  const streak = useStreak();
  /* a signed-in student answers the real two questions, over the same city */
  const real = usePortalData() !== null;
  const ref = useRef<HTMLDivElement>(null);
  const { layer, play, playing } = usePlay(undefined, (finished) =>
    leave(finished ? onStart : onLater)
  );
  const busy = useRef(false);
  const playReal = () => play({ kind: "challenge", noWorld: true }, null);
  const playDemo = () => play({ kind: "demo", title: "Challenge", questions: TODAY }, null);
  /** Taken on: the card fills the screen, Karman speeds off to the right, and the quiz comes in from
   *  the left until it covers everything (founder, 2026-11-21). */
  const [going, setGoing] = useState(false);
  useEffect(() => {
    busy.current = going || playing !== null;
  }, [going, playing]);
  useEffect(() => {
    const el = ref.current;
    if (!going || !el) return;
    const root = document.documentElement;
    root.setAttribute("data-quiz-up", "");
    const down = () => root.removeAttribute("data-quiz-up");
    if (calm()) {
      (real ? playReal : playDemo)();
      return down;
    }
    const card = el.querySelector<HTMLElement>("[data-card]");
    const flyer = el.querySelector<HTMLElement>('[class*="flyer"]');
    // the city and the wind rush by faster and faster
    const rushing = card?.getAnimations({ subtree: true }) ?? [];
    const speed = { k: 1 };
    const tl = gsap
      .timeline()
      .to(el.querySelectorAll("[data-rise]"), { opacity: 0, y: -10, duration: 0.2 })
      .to(
        card,
        {
          width: window.innerWidth,
          height: window.innerHeight,
          borderRadius: 0,
          "--h": `${window.innerHeight}px`,
          duration: 0.6,
          ease: "power3.inOut",
        },
        0
      )
      .to(el, { padding: 0, duration: 0.6, ease: "power3.inOut" }, 0)
      .to(
        speed,
        {
          k: 6,
          duration: 1.2,
          ease: "power2.in",
          onUpdate: () => rushing.forEach((a) => (a.playbackRate = speed.k)),
        },
        0.1
      )
      // once he is gone the city keeps going behind the glass, at an easy pace
      .to(
        speed,
        {
          k: 1.5,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => rushing.forEach((a) => (a.playbackRate = speed.k)),
        },
        1.4
      )
      .to(flyer, { left: "140%", duration: 0.75, ease: "power3.in" }, 0.2)
      // once he is gone, the questions come in over the city
      .call(() => (real ? playReal : playDemo)(), [], 0.95);
    return () => {
      tl.kill();
      down();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [going]);
  useEffect(() => {
    if (now) setGoing(true);
  }, [now]);
  // it arrives: the dark comes up, the card springs in, and its pieces follow one after another
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    const tl = gsap
      .timeline()
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(
        el.querySelector("[data-card]"),
        { y: 60, scale: 0.9, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)" },
        "<0.05"
      )
      .fromTo(
        el.querySelectorAll("[data-rise]"),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: "power3.out" },
        "<0.2"
      );
    return () => {
      tl.kill();
    };
  }, []);
  // Escape sends it away, as Later does
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && !busy.current && leave(onLater);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leave = (then: () => void) => {
    const el = ref.current;
    if (!el || calm()) return then();
    gsap.to(el.querySelector("[data-card]"), {
      y: 40,
      scale: 0.94,
      duration: 0.25,
      ease: "power2.in",
    });
    gsap.to(el, { opacity: 0, duration: 0.28, onComplete: then });
  };
  return (
    <div
      ref={ref}
      className={styles.screen}
      data-going={going || undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Today's challenge question"
    >
      <div className={styles.card} data-card>
        <HeroFlight />
        <span className={styles.shade} aria-hidden="true" />
        {/* the words stand in the sky at the top, and the choice at the foot, over the rooftops */}
        <h2 data-rise>Challenge question</h2>
        <p data-rise>1 Reading and Writing, 1 Math, every day</p>
        <span className={styles.room} />
        <p className={styles.streak} data-rise>
          {streak > 0 ? (
            <>
              <b>{streak}</b> {streak === 1 ? "day" : "days"} in a row
            </>
          ) : (
            "Start a streak today"
          )}
        </p>
        <div className={styles.pair} data-rise>
          <button
            type="button"
            className={styles.go}
            autoFocus
            onClick={() => {
              chosen();
              setGoing(true);
            }}
          >
            Take it on
          </button>
          <button
            type="button"
            className={styles.later}
            onClick={() => {
              tick();
              leave(onLater);
            }}
          >
            Later
          </button>
        </div>
      </div>
      {layer}
    </div>
  );
}

export function ChallengeCard({ onStart }: { onStart: () => void }) {
  const streak = useStreak();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || calm()) return;
    const tip = gsap.to(ref.current.querySelector("svg"), {
      rotate: 10,
      duration: 1.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "50% 50%",
    });
    return () => {
      tip.kill();
    };
  }, []);
  return (
    <div ref={ref} className={styles.small} data-in>
      <Mark size={40} />
      <p>
        <b>Challenge</b>
        <small>
          {streak > 0
            ? `${streak} ${streak === 1 ? "day" : "days"} in a row`
            : "Start a streak today"}
        </small>
      </p>
      <button
        type="button"
        className={styles.begin}
        aria-label="Start the challenge question"
        onClick={(e) => {
          chosen();
          e.currentTarget.disabled = true;
          if (ref.current) finish(ref.current, onStart);
          else onStart();
        }}
      >
        Start
      </button>
    </div>
  );
}

/** True the first time this is asked on a day, in this browser (or when `again` asks for it). The
 *  challenge's banner comes up then, on whichever page the student lands. */
export function firstToday(again = false) {
  const today = new Date().toDateString();
  let seen = "";
  try {
    seen = window.localStorage.getItem("kp-challenge-day") ?? "";
    window.localStorage.setItem("kp-challenge-day", today);
  } catch {
    // nothing can be remembered in a private window: it is shown each time
  }
  return seen !== today || again;
}

/** The challenge for students whose home is the Library (Free, Practice and Pro; founder,
 *  2026-11-20: every plan gets it). The banner comes up once a day as on Homework; sent away with
 *  Later, the small card waits in the corner until it is started. */
export function LibraryChallenge({ intro }: { intro: number }) {
  const done = usePortalData()?.today.challengeDone ?? false;
  const [state, setState] = useState<"banner" | "go" | "later" | "done">(done ? "done" : "later");
  useEffect(() => {
    if (firstToday(intro > 0) && !done) setState("banner");
  }, [intro, done]);
  if (state === "done") return null;
  if (state === "banner" || state === "go")
    return (
      <ChallengeBanner
        now={state === "go"}
        onStart={() => setState("done")}
        onLater={() => setState("later")}
      />
    );
  return (
    <div className={styles.corner}>
      <ChallengeCard onStart={() => setState("go")} />
    </div>
  );
}
