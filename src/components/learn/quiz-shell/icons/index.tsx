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

/** The flag rises up its pole and waves once. */
export function FlagIcon({ state = "off", ...p }: IconProps) {
  const t = useStateTransition(true);
  const { reduced } = useShellMotion();
  const on = state === "on";
  return (
    <Svg {...p}>
      <path d="M6 21V3" />
      <motion.path
        d="M6 4h11l-2.5 4 2.5 4H6"
        initial={false}
        animate={{
          y: on ? 0 : 6,
          scaleY: on ? 1 : 0.55,
          fillOpacity: on ? 1 : 0,
          rotate: on && !reduced ? [0, -5, 3, 0] : 0,
        }}
        style={{ originX: 0, originY: 0 }}
        fill="currentColor"
        // The wave has four keyframes, so it runs as a tween; the rise keeps the spring.
        transition={{ ...t, rotate: { type: "tween", duration: 0.5, ease: "easeInOut" } }}
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
      <path d="M8 20l-3 1 1-3L16.5 7.5l2 2z" />
      <path d="M6 18l2 2" />
      <motion.path
        d="M15 6l2-2 3 3-2 2"
        initial={false}
        animate={{ x: on ? 2.5 : 0, y: on ? -2.5 : 0, opacity: on ? 0 : 1 }}
        transition={t}
      />
      <circle cx="5.6" cy="20.4" r="1.4" fill={tip ?? "currentColor"} stroke="none" />
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
      <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z" />
      <path d="M12 6v14M6.5 9.5l3 0M15 13l2.5-3" />
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
