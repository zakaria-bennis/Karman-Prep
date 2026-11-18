"use client";

// Chat's reactions: twenty small pictures drawn here in code, each with a movement of its own made
// with GSAP (founder, 2026-11-16: custom ones, no heart; thumbs up, thumbs down, the exclamation
// marks, the question mark and the laugh come first, and a button opens the rest). He took out the
// clapping hands, the sad face, the thinking face, the flexed arm and the wave, and asked for a robot,
// two worried faces, a cross to go with the tick, confetti on the tick, and a real arrow that quivers.
import gsap from "gsap";
import { calm } from "./homeworkMotion";

export const EMOJI = [
  "up",
  "down",
  "wow",
  "what",
  "ha",
  "check",
  "cross",
  "fire",
  "hundred",
  "eyes",
  "bot",
  "party",
  "star",
  "bulb",
  "rocket",
  "target",
  "brain",
  "sweat",
  "fear",
  "cool",
] as const;
export type Emoji = (typeof EMOJI)[number];
export const FIRST: Emoji[] = ["up", "down", "wow", "what", "ha"];
const SAID: Record<Emoji, string> = {
  up: "Thumbs up",
  down: "Thumbs down",
  wow: "Wow",
  what: "Question",
  ha: "Ha ha",
  check: "Yes",
  cross: "No",
  fire: "Fire",
  hundred: "One hundred",
  eyes: "Eyes",
  bot: "Robot",
  party: "Party",
  star: "Star",
  bulb: "Idea",
  rocket: "Rocket",
  target: "Bullseye",
  brain: "Big brain",
  sweat: "Nervous",
  fear: "Scared",
  cool: "Cool",
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
  // an arrow as shot from a bow: a point, a shaft and three feathers, stuck in the middle of the rings
  target: (
    <g data-move="hit">
      <circle cx="10.500" cy="13.500" r="8.500" fill="#fff" stroke="#ff4f4f" strokeWidth="2" />
      <circle cx="10.500" cy="13.500" r="4.600" fill="#fff" stroke="#ff4f4f" strokeWidth="2" />
      <circle cx="10.500" cy="13.500" r="1.700" fill="#ff4f4f" />
      <g data-arrow>
        <path
          d="M10.500 13.500L20 4"
          fill="none"
          stroke="#8a5a2b"
          strokeWidth="1.500"
          strokeLinecap="round"
        />
        <path d="M10.500 13.500l3.400-.9-2.500-2.500z" fill="#5c6470" />
        <path
          d="M17.500 6.500l-.3-3 2.300 1zM17.500 6.500l3 .3-1-2.300zM19 5l1.800-3.300 1.500 1.500z"
          fill="#2f8bff"
          stroke="#1f5fc0"
          strokeWidth="0.500"
          strokeLinejoin="round"
        />
      </g>
    </g>
  ),
  // a tick, with confetti that bursts from it
  check: (
    <g data-move="yes">
      <g data-bits>
        <circle cx="3" cy="5" r="1.200" fill="#ff5fa8" />
        <circle cx="21" cy="6" r="1.200" fill="#4f9dff" />
        <rect
          x="19.500"
          y="18"
          width="2.200"
          height="2.200"
          fill="#ffd76a"
          transform="rotate(25 20.500 19)"
        />
        <rect
          x="2"
          y="17.500"
          width="2.200"
          height="2.200"
          fill="#8f5fd6"
          transform="rotate(15 3 18.500)"
        />
        <circle cx="12" cy="1.500" r="1" fill="#ff8a1f" />
      </g>
      <circle cx="12" cy="12" r="8.500" fill="#22c36b" stroke="#0f7a40" strokeWidth="1" />
      <path
        d="M7.500 12.500l3 3L16.700 9.300"
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
  // a cross, drawn in stroke by stroke
  cross: (
    <g data-move="no">
      <circle cx="12" cy="12" r="9.500" fill="#ff4f4f" stroke="#a31d1d" strokeWidth="1" />
      <path
        d="M8 8l8 8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.800"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        data-line
      />
      <path
        d="M16 8l-8 8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.800"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        data-line
      />
    </g>
  ),
  // a robot's face: an aerial, two lit eyes and a grille for a mouth
  bot: (
    <g data-move="beep">
      <path
        d="M12 6V3"
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.600"
        strokeLinecap="round"
        data-aerial
      />
      <circle cx="12" cy="2.600" r="1.500" fill="#ff4f4f" data-aerial />
      <rect
        x="3.500"
        y="6"
        width="17"
        height="14.500"
        rx="4"
        fill="#cfd6e4"
        stroke="#6b7280"
        strokeWidth="1"
      />
      <rect x="1.500" y="11" width="2" height="5" rx="1" fill="#6b7280" />
      <rect x="20.500" y="11" width="2" height="5" rx="1" fill="#6b7280" />
      <g data-eyes>
        <circle cx="8.500" cy="12" r="2.300" fill="#1ec8ff" stroke="#0e6f92" strokeWidth="0.8" />
        <circle cx="15.500" cy="12" r="2.300" fill="#1ec8ff" stroke="#0e6f92" strokeWidth="0.8" />
      </g>
      <rect x="7.500" y="16" width="9" height="2.600" rx="1" fill="#6b7280" />
      <path d="M10 16v2.600M12 16v2.600M14 16v2.600" stroke="#cfd6e4" strokeWidth="0.700" />
    </g>
  ),
  // nervous: a pale brow, a worried mouth, and a bead of sweat
  sweat: (
    <g data-move="shiver">
      {face}
      <path d="M3.200 9.500A9.500 9.500 0 0 1 20.800 9.500C17 8 7 8 3.200 9.500z" fill="#7fc4ff" />
      <path
        d="M6.500 9l3 1M17.500 9l-3 1"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.300"
        strokeLinecap="round"
      />
      <circle cx="9" cy="12.300" r="1.200" fill="#5a3800" />
      <circle cx="15" cy="12.300" r="1.200" fill="#5a3800" />
      <path d="M8.500 17.500c1.200-1.500 5.800-1.500 7 0z" fill="#5a3800" />
      <path
        d="M19.300 3.500c1.200 1.800 1.600 2.600 1.600 3.400a1.600 1.600 0 0 1-3.200 0c0-.8.400-1.600 1.600-3.400z"
        fill="#4f9dff"
        data-drop
      />
    </g>
  ),
  // scared: a blue brow, wide eyes, a small open mouth
  fear: (
    <g data-move="quake">
      {face}
      <path d="M2.700 11A9.500 9.500 0 0 1 21.300 11C17 9 7 9 2.700 11z" fill="#5aa8ff" />
      <circle cx="8.500" cy="11.500" r="2.500" fill="#fff" stroke="#5a3800" strokeWidth="0.800" />
      <circle cx="15.500" cy="11.500" r="2.500" fill="#fff" stroke="#5a3800" strokeWidth="0.800" />
      <circle cx="8.500" cy="11.800" r="1" fill="#1d1a22" />
      <circle cx="15.500" cy="11.800" r="1" fill="#1d1a22" />
      <ellipse cx="12" cy="17.300" rx="2.200" ry="1.700" fill="#5a3800" />
    </g>
  ),
  // cool: dark glasses and half a smile
  cool: (
    <g data-move="shades">
      {face}
      <path
        d="M8 16c1.500 1.600 5 1.800 7.500-.3"
        fill="none"
        stroke="#5a3800"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
      <g data-glasses>
        <path d="M3 9.500h18" stroke="#1d1a22" strokeWidth="1.400" />
        <path
          d="M4.500 9.500h6.300v2.200a3 3 0 0 1-3 3h-.3a3 3 0 0 1-3-3zM13.200 9.500h6.300v2.200a3 3 0 0 1-3 3h-.3a3 3 0 0 1-3-3z"
          fill="#1d1a22"
        />
      </g>
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
  // the arrow flies in, sticks, and quivers
  hit: (g) => {
    const arrow = g.querySelector("[data-arrow]");
    return gsap
      .timeline()
      .fromTo(
        arrow,
        { x: 12, y: -12, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.22, ease: "power3.in" }
      )
      .fromTo(
        arrow,
        { rotate: -16, svgOrigin: "10.5 13.5" },
        { rotate: 0, duration: 0.9, ease: "elastic.out(1.4, 0.18)" }
      );
  },
  // the tick is drawn, and confetti bursts out from behind it
  yes: (g) =>
    gsap
      .timeline()
      .fromTo(
        g.querySelector("[data-line]"),
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }
      )
      .fromTo(
        g.querySelector("[data-bits]"),
        { scale: 0.2, opacity: 0, transformOrigin: "50% 50%" },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(3)" },
        0.15
      ),
  // the cross is drawn one stroke after the other
  no: (g) =>
    gsap.fromTo(
      g.querySelectorAll("[data-line]"),
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.28, stagger: 0.2, ease: "power2.out" }
    ),
  // the robot's aerial wobbles and its eyes blink
  beep: (g) =>
    gsap
      .timeline()
      .fromTo(
        g.querySelectorAll("[data-aerial]"),
        { rotate: -22, svgOrigin: "12 6" },
        { rotate: 0, duration: 0.8, ease: "elastic.out(1.2, 0.25)" }
      )
      .fromTo(
        g.querySelector("[data-eyes]"),
        { scaleY: 0.1, transformOrigin: "50% 50%" },
        { scaleY: 1, duration: 0.14, repeat: 2, yoyo: true },
        0.1
      ),
  shiver: (g) =>
    gsap
      .timeline()
      .fromTo(g, { x: -0.8 }, { x: 0.8, duration: 0.06, yoyo: true, repeat: 9 })
      .fromTo(
        g.querySelector("[data-drop]"),
        { y: -2, opacity: 0 },
        { y: 3, opacity: 1, duration: 0.6, ease: "power1.in" },
        0
      ),
  quake: (g) =>
    gsap.fromTo(
      g,
      { x: -1.4, rotate: -3 },
      {
        x: 1.4,
        rotate: 3,
        duration: 0.07,
        yoyo: true,
        repeat: 9,
        onComplete: () => gsap.set(g, { x: 0, rotate: 0 }),
      }
    ),
  shades: (g) =>
    gsap.fromTo(
      g.querySelector("[data-glasses]"),
      { y: -9, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "bounce.out" }
    ),
  pulse: (g) =>
    gsap.fromTo(
      g,
      { scale: 1 },
      { scale: 1.16, duration: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" }
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
