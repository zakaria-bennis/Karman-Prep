"use client";
// Karman's own quiz icons: one 1.75 stroke on a 24 grid, currentColor only (spec: Look, Motion).
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useShellMotion, useStateTransition } from "../motion";

export type IconProps = { state?: "on" | "off"; size?: number; title?: string };

function Svg({
  size = 20,
  title,
  children,
}: {
  size?: number;
  title?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** Ribbon drops with a small overshoot when on, lifts when off. */
export function BookmarkIcon({ state = "off", ...p }: IconProps) {
  const t = useStateTransition(true);
  const on = state === "on";
  return (
    <Svg {...p}>
      <motion.path
        d="M7 3.5h10v17l-5-3.6-5 3.6z"
        initial={false}
        animate={{ y: on ? 0 : -1.5, fillOpacity: on ? 1 : 0 }}
        fill="currentColor"
        transition={t}
      />
    </Svg>
  );
}

/**
 * Asking the tutor: a raised hand (founder, 2026-11-08, in place of the flag). When on, the hand
 * lifts, gives one small wave and two short strokes appear beside it.
 */
export function RaiseHandIcon({ state = "off", ...p }: IconProps) {
  const t = useStateTransition(true);
  const { reduced } = useShellMotion();
  const on = state === "on";
  return (
    <Svg {...p}>
      <motion.g
        initial={false}
        animate={{ y: on ? -1.5 : 0.5, rotate: on && !reduced ? [0, -8, 6, 0] : 0 }}
        style={{ originX: "50%", originY: "100%" }}
        transition={{ ...t, rotate: { type: "tween", duration: 0.55, ease: "easeInOut" } }}
      >
        <path d="M8.5 12.5V7a1.5 1.5 0 0 1 3 0v5" />
        <path d="M11.5 11.5V5a1.5 1.5 0 0 1 3 0v6.5" />
        <path d="M14.5 11.5V6.5a1.5 1.5 0 0 1 3 0v7" />
        <path d="M17.5 10a1.5 1.5 0 0 1 3 0v4.5a7 7 0 0 1-7 7h-.8a6 6 0 0 1-4.5-2l-3.5-4a1.6 1.6 0 0 1 2.4-2.1l1.4 1.5V12.5" />
      </motion.g>
      <motion.path
        d="M3.5 6.5l1.6 1.2M5 3.5l.9 1.8"
        initial={false}
        animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.6 }}
        style={{ originX: "100%", originY: "100%" }}
        transition={t}
      />
    </Svg>
  );
}

/** Bluebook's mark for review: a tag whose corner flips in. */
export function ReviewMarkIcon({ state = "off", ...p }: IconProps) {
  const t = useStateTransition();
  const on = state === "on";
  return (
    <Svg {...p}>
      <path d="M5 4h10l4 4v12H5z" />
      <motion.path
        d="M15 4v4h4z"
        initial={false}
        animate={{ scale: on ? 1 : 0, fillOpacity: on ? 1 : 0 }}
        style={{ originX: 1, originY: 0 }}
        fill="currentColor"
        transition={t}
      />
      <motion.path
        d="M9 12.5l2 2 4-4"
        initial={false}
        animate={{ pathLength: on ? 1 : 0 }}
        transition={t}
      />
    </Svg>
  );
}

/** "ABC" with a strike that draws left to right. */
export function EliminatorIcon({ state = "off", ...p }: IconProps) {
  const t = useStateTransition();
  const on = state === "on";
  return (
    <Svg {...p}>
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        ABC
      </text>
      <motion.path
        d="M3 12.5h18"
        initial={false}
        animate={{ pathLength: on ? 1 : 0 }}
        transition={t}
      />
    </Svg>
  );
}

/** The cap slides off when the pencil is on and snaps back when off. */
export function PenIcon({ state = "off", tip, ...p }: IconProps & { tip?: string }) {
  const t = useStateTransition(true);
  const on = state === "on";
  return (
    <Svg {...p}>
      {/* a pencil on its point; picked up, it tips a little and its point takes the ink's colour */}
      <motion.g
        initial={false}
        animate={{ rotate: on ? -10 : 0 }}
        transition={t}
        style={{ transformOrigin: "5px 19px" }}
      >
        <path d="M5 19l1-4.200L16.300 4.500a2.100 2.100 0 0 1 3 3L9.200 18z" />
        <path d="M14.300 6.500l3.200 3.200" />
        <path d="M6 14.800l3.200 3.200" />
        <path
          d="M5 19l1.900-.5-1.400-1.400z"
          fill={tip ?? "currentColor"}
          stroke={tip ?? "currentColor"}
        />
      </motion.g>
    </Svg>
  );
}

export function EraserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 15.5l9-9 6.5 6.5-7 7H8z" />
      <path d="M8.5 11l6.5 6.5M12 20h8" />
    </Svg>
  );
}

export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 8H5V4" />
      <path d="M5.5 8a8 8 0 1 1-1 7" />
    </Svg>
  );
}

export function RedoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 8h4V4" />
      <path d="M18.5 8a8 8 0 1 0 1 7" />
    </Svg>
  );
}

export function ClearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h10M4 17h6" />
      <path d="M15 15l5 5M20 15l-5 5" />
    </Svg>
  );
}

export function CalculatorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </Svg>
  );
}

export function ReferenceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* an open book, three lines on each page */}
      <path d="M12 6.2C10 5 7 4.600 4 5v14c3-.4 6 0 8 1.200 2-1.200 5-1.600 8-1.200V5c-3-.4-6 0-8 1.200z" />
      <path d="M12 6.200v14" />
      <path
        d="M6.500 9.200h3M6.500 12h3M6.500 14.800h3M14.500 9.200h3M14.500 12h3M14.500 14.800h3"
        strokeWidth={1.4}
      />
    </Svg>
  );
}

export function MoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h11M4 17h7" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 2M10 3h4" />
    </Svg>
  );
}

/** Our own drawn flame for streaks; it flares once when it appears. */
export function FlameIcon(p: IconProps) {
  const { reduced } = useShellMotion();
  return (
    <Svg {...p}>
      <motion.path
        d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.5 3-5.2 3.4-8.9 2.4 1.6 3.4 3.6 3.2 5.5 1-.6 1.7-1.6 1.9-2.9 1.7 1.5 3.5 3.6 3.5 6.3 0 3.2-2.4 5.6-6 5.6z"
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ originY: 1 }}
        transition={useStateTransition(true)}
      />
    </Svg>
  );
}

/** The tick draws itself. */
export function TickIcon(p: IconProps) {
  const { reduced } = useShellMotion();
  return (
    <Svg {...p}>
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </Svg>
  );
}

/** The cross draws one stroke, then the other. */
export function CrossIcon(p: IconProps) {
  const { reduced } = useShellMotion();
  return (
    <Svg {...p}>
      <motion.path
        d="M6.5 6.5l11 11"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.path
        d="M17.5 6.5l-11 11"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.18, delay: 0.12 }}
      />
    </Svg>
  );
}

/** Exit: a plain close mark. */
export function ExitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

/** Highlighter: a chisel marker over a stroke of colour. */
export function HighlightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* a marker with a broad slanted tip, laying down a wide stroke */}
      <path d="M13.8 3.2l7 7-6.6 6.6-7-7z" />
      <path d="M8.9 11.5l-2.6 4.7 1.5 1.5 4.7-2.6" />
      <path d="M16 5.400l2.600 2.600" />
      <path d="M3.500 20.500h11" strokeWidth={3.4} opacity={0.45} />
    </Svg>
  );
}

/** Hide the clock: an eye, struck through once hidden. */
export function EyeIcon({ state = "on", ...p }: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {state === "off" && <path d="M4 4l16 16" />}
    </Svg>
  );
}

export function ChevronIcon({
  dir = "right",
  ...p
}: IconProps & { dir?: "left" | "right" | "up" }) {
  const d = dir === "left" ? "M15 5l-7 7 7 7" : dir === "up" ? "M5 15l7-7 7 7" : "M9 5l7 7-7 7";
  return (
    <Svg {...p}>
      <path d={d} />
    </Svg>
  );
}
