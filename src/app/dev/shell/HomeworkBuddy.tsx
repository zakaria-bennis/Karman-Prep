"use client";

// The living pieces at Homework's left and in a class day's list.
//   Buddy        the student's own character, in whatever they have put on in Rewards. It leans
//                toward the pointer as it moves and perks up at a press anywhere. Pressing the
//                character itself plays a trick, a different one each time, and after a few
//                presses a small surprise.
//   ClassButton  the next class as a big button with a chalkboard that draws itself and a clock
//                counting down. It joins the class once the door is open; before that it shakes
//                its head.
//   ClassPill    the class inside its own day's list, lit and moving, with Join on it.
// All of the motion is GSAP's.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { Dressed } from "./accessories";
import { useEquipped } from "./equipped";
import { CLASS, type HomeworkDay } from "./homeworkData";
import { calm, cut, two } from "./homeworkMotion";
import styles from "./homework.module.css";
import { chosen, ping, tick } from "./sound";

const MIN = 60_000;

export function Buddy({ size, cheer }: { size: number; cheer: number }) {
  const { face, outfit } = useEquipped();
  const lean = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLButtonElement>(null);
  const burst = useRef<HTMLSpanElement>(null);
  const presses = useRef(0);

  // it watches the pointer: it leans and turns a little toward wherever the pointer is, and perks
  // up toward a press
  useEffect(() => {
    const el = lean.current;
    if (!el || calm()) return;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const turn = gsap.quickTo(el, "rotation", { duration: 0.6, ease: "power3.out" });
    const toward = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const dx = (e.clientX - (box.left + box.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (box.top + box.height / 2)) / window.innerHeight;
      return { dx: Math.max(-1, Math.min(1, dx * 2)), dy: Math.max(-1, Math.min(1, dy * 2)) };
    };
    const move = (e: PointerEvent) => {
      const { dx, dy } = toward(e);
      x(dx * 9);
      y(dy * 7);
      turn(dx * 10);
    };
    const press = (e: PointerEvent) => {
      if (body.current?.contains(e.target as Node)) return;
      const { dx, dy } = toward(e);
      gsap.fromTo(
        el,
        { scale: 1 },
        {
          scale: 1.1,
          x: dx * 16,
          y: dy * 12,
          duration: 0.14,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
        }
      );
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
    };
  }, []);

  const stars = () => {
    if (!burst.current) return;
    gsap.fromTo(
      burst.current.children,
      { x: 0, y: 0, scale: 0, opacity: 1 },
      {
        x: (i) => Math.cos((i / 8) * Math.PI * 2) * 86,
        y: (i) => Math.sin((i / 8) * Math.PI * 2) * 86,
        scale: 1.3,
        opacity: 0,
        rotate: 180,
        duration: 0.8,
        ease: "power2.out",
      }
    );
  };
  const trick = (n: number) => {
    const el = body.current;
    if (!el || calm() || gsap.isTweening(el)) return;
    const tl = gsap.timeline();
    if (n % 5 === 4) {
      // the surprise: a somersault high in the air, with stars
      stars();
      chosen();
      tl.to(el, { y: -46, rotate: 360, scale: 1.15, duration: 0.5, ease: "power2.out" })
        .to(el, { y: 0, scale: 1, duration: 0.45, ease: "bounce.out" })
        .set(el, { rotate: 0 });
    } else if (n % 5 === 0) {
      tl.to(el, { y: -22, scaleY: 1.08, duration: 0.2, ease: "power2.out" }).to(el, {
        y: 0,
        scaleY: 1,
        duration: 0.5,
        ease: "bounce.out",
      });
    } else if (n % 5 === 1) {
      tl.to(el, { rotate: -16, duration: 0.12 })
        .to(el, { rotate: 14, duration: 0.14 })
        .to(el, { rotate: 0, duration: 0.5, ease: "elastic.out(1, 0.35)" });
    } else if (n % 5 === 2) {
      tl.to(el, { scaleX: 1.2, scaleY: 0.78, duration: 0.14 }).to(el, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)",
      });
    } else {
      tl.to(el, { rotate: 360, duration: 0.6, ease: "back.inOut(1.4)" }).set(el, { rotate: 0 });
    }
  };
  // when a piece of work is finished, it cheers
  useEffect(() => {
    if (cheer === 0) return;
    stars();
    trick(4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheer]);

  return (
    <span ref={lean} className={styles.buddy}>
      <span ref={burst} className={styles.burst} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <button
        ref={body}
        type="button"
        aria-label="Your character"
        onClick={() => {
          tick();
          trick(presses.current++);
        }}
      >
        <Dressed face={face} outfit={outfit} size={size} />
      </button>
    </span>
  );
}

const when = (day: HomeworkDay) => new Date(day.date).setHours(CLASS.hour, 0, 0, 0);
const countdown = (ms: number) => {
  const t = cut(ms);
  return t.days > 0
    ? `${t.days}d ${two(t.hours)}h ${two(t.minutes)}m ${two(t.seconds)}s`
    : `${two(t.hours)}h ${two(t.minutes)}m ${two(t.seconds)}s`;
};
/** Whether the class's door is open: from a little before it begins until it ends. */
const doorOpen = (day: HomeworkDay, now: number) =>
  now >= when(day) - CLASS.early * MIN && now < when(day) + CLASS.minutes * MIN;

function Board() {
  return (
    <svg className={styles.board} viewBox="0 0 56 48" width="56" height="48" aria-hidden="true">
      <path d="M18 46l4-9M38 46l-4-9" />
      <rect x="4" y="4" width="48" height="33" rx="5" data-slate />
      <path
        d="M11 24c4-9 8 7 12-2s8 7 12-2s6 5 9 1"
        pathLength={1}
        strokeDasharray="1"
        data-chalk
      />
      <path d="M11 14h14" pathLength={1} strokeDasharray="1" data-chalk />
    </svg>
  );
}

/** Draws the chalk on a board, again and again; returns how to stop. */
const chalk = (root: Element | null) => {
  if (!root || calm()) return () => {};
  const tl = gsap
    .timeline({ repeat: -1, repeatDelay: 2.2 })
    .fromTo(
      root.querySelectorAll("[data-chalk]"),
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 1.1, stagger: 0.35, ease: "power1.inOut" }
    )
    .to(root.querySelectorAll("[data-chalk]"), { opacity: 0, duration: 0.4 }, "+=2.4")
    .set(root.querySelectorAll("[data-chalk]"), { opacity: 1, strokeDashoffset: 1 });
  return () => tl.kill();
};

export function ClassButton({ day, now }: { day: HomeworkDay; now: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [no, setNo] = useState(false);
  const live = doorOpen(day, now);
  useEffect(() => chalk(ref.current), []);
  useEffect(() => {
    if (!no) return;
    const timer = window.setTimeout(() => setNo(false), 1800);
    return () => window.clearTimeout(timer);
  }, [no]);
  return (
    <button
      ref={ref}
      type="button"
      className={styles.classButton}
      data-live={live || undefined}
      onPointerEnter={() =>
        !calm() &&
        gsap.fromTo(
          ref.current?.querySelector("svg") ?? null,
          { rotate: -6 },
          { rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" }
        )
      }
      onClick={() => {
        if (live) return ping();
        tick();
        setNo(true);
        // not yet: it shakes its head
        if (!calm())
          gsap.fromTo(
            ref.current,
            { x: -7 },
            { x: 0, duration: 0.5, ease: "elastic.out(1, 0.25)" }
          );
      }}
    >
      <Board />
      <span>
        <small>{live ? "Class is on" : "Next class"}</small>
        <b>
          {day.from === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "long" })},{" "}
          {day.class}
        </b>
        <em aria-live="polite">
          {live
            ? "Join now"
            : no
              ? `Opens ${CLASS.early} minutes before`
              : countdown(when(day) - now)}
        </em>
      </span>
    </button>
  );
}

export function ClassPill({ day, now }: { day: HomeworkDay; now: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const live = doorOpen(day, now);
  const past = now >= when(day) + CLASS.minutes * MIN;
  useEffect(() => chalk(ref.current), []);
  return (
    <div ref={ref} className={styles.classPill} data-live={live || undefined}>
      <Board />
      <p>
        <b>Class at {day.class}</b>
        <small>{past ? "Finished" : live ? "On now" : `In ${countdown(when(day) - now)}`}</small>
      </p>
      {!past && (
        <button
          type="button"
          disabled={!live}
          aria-label={live ? "Join class" : `Join class, opens ${CLASS.early} minutes before`}
          onClick={() => ping()}
        >
          {live && <i aria-hidden="true" />}
          Join
        </button>
      )}
    </div>
  );
}
