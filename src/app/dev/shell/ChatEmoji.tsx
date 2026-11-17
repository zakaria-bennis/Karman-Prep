"use client";

// Chat's reactions: twenty small pictures drawn here in code, each with a movement of its own made
// with GSAP (founder, 2026-11-16: custom ones, no heart; thumbs up, thumbs down, the exclamation
// marks, the question mark and the laugh come first, and a button opens the rest).
import gsap from "gsap";
import { calm } from "./homeworkMotion";

export const EMOJI = [
  "up",
  "down",
  "wow",
  "what",
  "ha",
  "clap",
  "fire",
  "hundred",
  "eyes",
  "think",
  "party",
  "star",
  "check",
  "bulb",
  "rocket",
  "target",
  "brain",
  "strong",
  "wave",
  "tear",
] as const;
export type Emoji = (typeof EMOJI)[number];
export const FIRST: Emoji[] = ["up", "down", "wow", "what", "ha"];
const SAID: Record<Emoji, string> = {
  up: "Thumbs up",
  down: "Thumbs down",
  wow: "Wow",
  what: "Question",
  ha: "Ha ha",
  clap: "Clap",
  fire: "Fire",
  hundred: "One hundred",
  eyes: "Eyes",
  think: "Thinking",
  party: "Party",
  star: "Star",
  check: "Done",
  bulb: "Idea",
  rocket: "Rocket",
  target: "On target",
  brain: "Big brain",
  strong: "Strong",
  wave: "Wave",
  tear: "Sad",
};
export const said = (kind: Emoji) => SAID[kind];

const SKIN = "#ffcf4a";
const EDGE = "#b07a12";
const face = <circle cx="12" cy="12" r="9.500" fill={SKIN} stroke={EDGE} strokeWidth="1" />;
/** A thumb on a fist, pointing up. */
const thumb = (
  <g fill={SKIN} stroke={EDGE} strokeWidth="1" strokeLinejoin="round">
    <path d="M8.500 11l3-6.200c1.700-.2 2.600 1.100 2.200 2.800L13.200 10h4.300c1.200 0 2 1 1.800 2.200l-1 5.300c-.2 1-1 1.700-2 1.700H8.500z" />
    <rect x="4" y="10.500" width="4.500" height="9" rx="1.200" fill="#4f9dff" stroke="#1f5fc0" />
  </g>
);

const ART: Record<Emoji, React.ReactNode> = {
  up: <g data-move="nod">{thumb}</g>,
  // the same thumb turned over; the turning is on a group of its own, so its movement does not undo it
  down: (
    <g data-move="nod">
      <g transform="rotate(180 12 12)">{thumb}</g>
    </g>
  ),
  wow: (
    <g data-move="shake" fill="#ff4f4f" stroke="#a31d1d" strokeWidth="0.8">
      <path d="M6.500 3.500h3.600l-.7 10.500H7.200z" />
      <circle cx="8.300" cy="18.500" r="2" />
      <path d="M13.900 3.500h3.600l-.7 10.500h-2.200z" />
      <circle cx="15.700" cy="18.500" r="2" />
    </g>
  ),
  what: (
    <g data-move="tilt" fill="none" stroke="#8f5fd6" strokeWidth="3.400" strokeLinecap="round">
      <path d="M7.500 8.500a4.500 4.500 0 1 1 7 3.700c-1.600 1.100-2.500 2-2.500 3.800" />
      <circle cx="12" cy="20" r="0.900" fill="#8f5fd6" />
    </g>
  ),
  ha: (
    <g data-move="laugh">
      {face}
      <path
        d="M6.500 9.500l3 1.300-3 1.200M17.500 9.500l-3 1.300 3 1.200"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.400"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.200 14h9.600c0 3.200-2.100 5-4.800 5s-4.800-1.800-4.800-5z" fill="#5a3800" />
      <path
        d="M9 17.300c1.800-1.100 4.200-1.100 6 0-.9 1.100-1.900 1.700-3 1.700s-2.100-.6-3-1.700z"
        fill="#ff6b70"
      />
    </g>
  ),
  clap: (
    <g data-move="clap" fill={SKIN} stroke={EDGE} strokeWidth="1" strokeLinejoin="round">
      <path
        d="M5 13.500l4.500-6.500c.9-.7 2 .1 1.600 1.200L9.500 11.500l5 3.200-1.800 4.800H8.500z"
        data-hand="l"
      />
      <path
        d="M19 13.500l-4.500-6.500c-.9-.7-2 .1-1.600 1.200l1.600 3.300-5 3.200 1.800 4.800h4.200z"
        data-hand="r"
      />
      <path
        d="M12 2.500v2.500M7.500 3.500l1 2M16.500 3.500l-1 2"
        fill="none"
        stroke="#ff8a1f"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
    </g>
  ),
  fire: (
    <g data-move="flicker">
      <path
        d="M12 2.500c1 3.500 5.500 5.500 5.500 10.500a5.500 5.500 0 0 1-11 0c0-2.200 1.200-3.600 2.300-4.800.3 1.600 1 2.500 2 2.800C10.300 8 10.800 5 12 2.500z"
        fill="#ff7a1f"
        stroke="#c44a00"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.500c.6 1.700 2.500 2.500 2.500 4.500a2.500 2.500 0 0 1-5 0c0-1.800 1.700-2.600 2.500-4.500z"
        fill="#ffd76a"
      />
    </g>
  ),
  hundred: (
    <g data-move="stamp" fill="none" stroke="#ff4f4f" strokeWidth="2.200" strokeLinecap="round">
      <path d="M4.500 6.500V15" />
      <ellipse cx="10.300" cy="10.700" rx="2.400" ry="4.200" />
      <ellipse cx="17" cy="10.700" rx="2.400" ry="4.200" />
      <path d="M4 19.500h16M6 22h12" strokeWidth="1.600" />
    </g>
  ),
  eyes: (
    <g data-move="look">
      <ellipse
        cx="7.500"
        cy="12"
        rx="4.200"
        ry="5.800"
        fill="#fff"
        stroke="#3a3a3e"
        strokeWidth="1"
      />
      <ellipse
        cx="16.500"
        cy="12"
        rx="4.200"
        ry="5.800"
        fill="#fff"
        stroke="#3a3a3e"
        strokeWidth="1"
      />
      <g data-pupil>
        <circle cx="8.800" cy="12.500" r="2.200" fill="#1d1a22" />
        <circle cx="17.800" cy="12.500" r="2.200" fill="#1d1a22" />
      </g>
    </g>
  ),
  think: (
    <g data-move="tilt">
      {face}
      <circle cx="9" cy="10" r="1.200" fill="#5a3800" />
      <circle cx="15" cy="10" r="1.200" fill="#5a3800" />
      <path
        d="M7 7.500l3.500-.9M14 7l3.200 1.200"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.300"
        strokeLinecap="round"
      />
      <path
        d="M9.500 15.500h4.500"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
      <path
        d="M6.500 20.500l2.200-4 2.300.8-.6 2.200 2.600-.4"
        fill="none"
        stroke={EDGE}
        strokeWidth="2.400"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ),
  party: (
    <g data-move="pop">
      <path
        d="M4 20.500l4.500-11 6.500 6.500z"
        fill="#8f5fd6"
        stroke="#5a3a96"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M6.200 15.200l3 3M7.800 11.500l5 5" stroke="#ffd76a" strokeWidth="1.300" />
      <g data-bits>
        <circle cx="16" cy="5" r="1.300" fill="#ff5fa8" />
        <circle cx="20" cy="10" r="1.200" fill="#4f9dff" />
        <rect
          x="12"
          y="3"
          width="2.200"
          height="2.200"
          fill="#22c36b"
          transform="rotate(20 13 4)"
        />
        <rect
          x="18.500"
          y="14"
          width="2"
          height="2"
          fill="#ffd76a"
          transform="rotate(30 19.500 15)"
        />
        <path
          d="M15 9c1.500-1 2.500 1 4 0"
          fill="none"
          stroke="#ff8a1f"
          strokeWidth="1.300"
          strokeLinecap="round"
        />
      </g>
    </g>
  ),
  star: (
    <g data-move="spin">
      <path
        d="M12 2.800l2.800 5.700 6.300.9-4.600 4.400 1.100 6.300L12 17.100l-5.600 3 1.100-6.300L2.900 9.400l6.300-.9z"
        fill="#ffd21f"
        stroke="#b07a12"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  ),
  check: (
    <g data-move="draw">
      <circle cx="12" cy="12" r="9.500" fill="#22c36b" stroke="#0f7a40" strokeWidth="1" />
      <path
        d="M7 12.500l3.400 3.400L17.200 9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.600"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        data-line
      />
    </g>
  ),
  bulb: (
    <g data-move="glow">
      <path
        d="M12 2.500a6.500 6.500 0 0 0-3.900 11.700c.8.700 1.100 1.500 1.100 2.400h5.600c0-.9.300-1.700 1.100-2.400A6.500 6.500 0 0 0 12 2.500z"
        fill="#ffe38a"
        stroke="#b07a12"
        strokeWidth="1"
        data-glass
      />
      <path
        d="M9.800 18.800h4.400M10.500 21h3"
        fill="none"
        stroke="#6b6b75"
        strokeWidth="1.600"
        strokeLinecap="round"
      />
    </g>
  ),
  rocket: (
    <g data-move="launch">
      <path
        d="M12 2c3 2.500 4.500 6 4.500 10v4.500h-9V12c0-4 1.500-7.500 4.500-10z"
        fill="#f4f4f8"
        stroke="#6b6b75"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.500" r="2" fill="#4f9dff" stroke="#1f5fc0" strokeWidth="0.8" />
      <path d="M7.500 13l-3 4h3zM16.500 13l3 4h-3z" fill="#ff4f4f" />
      <path d="M10 17.500c0 2 1 3.500 2 4.500 1-1 2-2.500 2-4.500z" fill="#ff8a1f" data-flame />
    </g>
  ),
  target: (
    <g data-move="hit">
      <circle cx="11" cy="13" r="8.500" fill="#fff" stroke="#ff4f4f" strokeWidth="2" />
      <circle cx="11" cy="13" r="4.500" fill="#fff" stroke="#ff4f4f" strokeWidth="2" />
      <circle cx="11" cy="13" r="1.600" fill="#ff4f4f" />
      <path
        d="M11 13L20.500 3.500M17.500 3.500h3v3"
        fill="none"
        stroke="#1f5fc0"
        strokeWidth="1.800"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-arrow
      />
    </g>
  ),
  brain: (
    <g data-move="pulse">
      <path
        d="M12 4.500c-1.500-2-5-1.500-5.500 1C4 6 3 8.500 4.500 10.500 3 12.500 4 15.500 6.500 16c.5 2.500 4 3.500 5.500 1.500 1.500 2 5 1 5.500-1.500 2.500-.5 3.500-3.500 2-5.500C21 8.500 20 6 17.500 5.500 17 3 13.500 2.500 12 4.500z"
        fill="#ff9bc2"
        stroke="#c2477f"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M12 4.500v13M8 8.500c1.500 0 2 1 2 2M16 8.500c-1.500 0-2 1-2 2M8 14c1 0 2-.5 2-1.500M16 14c-1 0-2-.5-2-1.500"
        fill="none"
        stroke="#c2477f"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  ),
  strong: (
    <g data-move="flex" fill={SKIN} stroke={EDGE} strokeWidth="1" strokeLinejoin="round">
      <path d="M5 19c-1-4 0-8 2.500-9.500L9 4.500c1.800-.8 3.300.2 3.200 2L11.500 10c3-1.200 7.500.5 7.500 5 0 2.500-2 4.500-5 4.500z" />
      <path d="M11.500 10c-1.500.8-2.300 2-2.500 3.500" fill="none" />
    </g>
  ),
  wave: (
    <g data-move="waving" fill={SKIN} stroke={EDGE} strokeWidth="1" strokeLinejoin="round">
      <path d="M7 12V6.500c0-1.600 2.200-1.600 2.200 0V5c0-1.600 2.200-1.600 2.200 0v.700c0-1.600 2.200-1.600 2.200 0V7c0-1.500 2.200-1.500 2.200 0v8c0 3.500-2.200 6-5.300 6-2.800 0-4-1.500-5.500-4.500L3.500 13c-.8-1.500 1.200-2.600 2.200-1.200z" />
    </g>
  ),
  tear: (
    <g data-move="droop">
      {face}
      <circle cx="9" cy="10.500" r="1.200" fill="#5a3800" />
      <circle cx="15" cy="10.500" r="1.200" fill="#5a3800" />
      <path
        d="M8.500 16.500c2-1.800 5-1.800 7 0"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
      <path
        d="M15.300 12.500c1 1.600 1.300 2.300 1.300 3a1.300 1.300 0 0 1-2.600 0c0-.7.300-1.400 1.300-3z"
        fill="#4f9dff"
        data-drop
      />
    </g>
  ),
};

/** How each one moves when it is pointed at, chosen, or first shown. */
const MOVES: Record<string, (g: Element) => gsap.core.Animation> = {
  nod: (g) =>
    gsap.fromTo(
      g,
      { rotate: -18, y: 2 },
      { rotate: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" }
    ),
  shake: (g) => gsap.fromTo(g, { x: -3 }, { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.2)" }),
  tilt: (g) =>
    gsap.fromTo(
      g,
      { rotate: 0 },
      { rotate: 14, duration: 0.22, yoyo: true, repeat: 3, ease: "sine.inOut" }
    ),
  laugh: (g) =>
    gsap.fromTo(
      g,
      { y: 0, rotate: 0 },
      { y: -2.5, rotate: -6, duration: 0.11, yoyo: true, repeat: 7, ease: "sine.inOut" }
    ),
  clap: (g) =>
    gsap
      .timeline()
      .fromTo(
        g.querySelector('[data-hand="l"]'),
        { x: -2.5, rotate: -10 },
        { x: 0, rotate: 0, duration: 0.12, yoyo: true, repeat: 5 },
        0
      )
      .fromTo(
        g.querySelector('[data-hand="r"]'),
        { x: 2.5, rotate: 10 },
        { x: 0, rotate: 0, duration: 0.12, yoyo: true, repeat: 5 },
        0
      ),
  flicker: (g) =>
    gsap.fromTo(
      g,
      { scaleY: 1, skewX: 0 },
      { scaleY: 1.14, skewX: 5, duration: 0.16, yoyo: true, repeat: 5, ease: "sine.inOut" }
    ),
  stamp: (g) =>
    gsap.fromTo(
      g,
      { scale: 1.7, rotate: -14, opacity: 0 },
      { scale: 1, rotate: -6, opacity: 1, duration: 0.4, ease: "back.out(3)" }
    ),
  look: (g) =>
    gsap
      .timeline()
      .to(g.querySelector("[data-pupil]"), { x: -2.6, duration: 0.22, ease: "power2.inOut" })
      .to(g.querySelector("[data-pupil]"), { x: 0.8, duration: 0.3, ease: "power2.inOut" })
      .to(g.querySelector("[data-pupil]"), { x: 0, duration: 0.2 }),
  pop: (g) =>
    gsap.fromTo(
      g.querySelector("[data-bits]"),
      { scale: 0.2, x: -4, y: 4, opacity: 0 },
      { scale: 1, x: 0, y: 0, opacity: 1, duration: 0.6, ease: "back.out(2.6)" }
    ),
  spin: (g) =>
    gsap.fromTo(
      g,
      { rotate: 0, scale: 0.7 },
      { rotate: 360, scale: 1, duration: 0.8, ease: "back.out(1.6)" }
    ),
  draw: (g) =>
    gsap.fromTo(
      g.querySelector("[data-line]"),
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }
    ),
  glow: (g) =>
    gsap.fromTo(
      g.querySelector("[data-glass]"),
      { fill: "#fff6cf" },
      { fill: "#ffc81a", duration: 0.25, yoyo: true, repeat: 3 }
    ),
  launch: (g) =>
    gsap
      .timeline()
      .to(g, { y: 2, duration: 0.15 })
      .to(g, { y: -7, duration: 0.3, ease: "power2.in" })
      .to(g, { y: 0, duration: 0.6, ease: "bounce.out" }),
  hit: (g) =>
    gsap.fromTo(
      g.querySelector("[data-arrow]"),
      { x: 9, y: -9, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.35, ease: "power3.in" }
    ),
  pulse: (g) =>
    gsap.fromTo(
      g,
      { scale: 1 },
      { scale: 1.16, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }
    ),
  flex: (g) =>
    gsap.fromTo(
      g,
      { scale: 0.86, rotate: 8 },
      { scale: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" }
    ),
  waving: (g) =>
    gsap.fromTo(
      g,
      { rotate: -16 },
      {
        rotate: 16,
        duration: 0.16,
        yoyo: true,
        repeat: 5,
        ease: "sine.inOut",
        onComplete: () => gsap.set(g, { rotate: 0 }),
      }
    ),
  droop: (g) =>
    gsap.fromTo(
      g.querySelector("[data-drop]"),
      { y: -3, opacity: 0 },
      { y: 2.5, opacity: 1, duration: 0.7, ease: "power1.in" }
    ),
};

/** Plays the movement of every reaction inside `root`. */
export const stirEmoji = (root: Element | null) => {
  if (!root || calm()) return;
  root.querySelectorAll("[data-move]").forEach((g) => {
    if (gsap.isTweening(g) || gsap.isTweening(g.querySelectorAll("*"))) return;
    gsap.set(g, { transformOrigin: "50% 60%" });
    MOVES[(g as HTMLElement).dataset.move ?? ""]?.(g);
  });
};

export function EmojiArt({ kind, size = 22 }: { kind: Emoji; size?: number }) {
  return (
    <svg
      data-emoji
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={SAID[kind]}
    >
      {ART[kind]}
    </svg>
  );
}
