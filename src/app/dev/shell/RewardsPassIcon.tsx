// The small pictures beside the passes, each on its tile, each with a movement of its own when its
// row is hovered (founder, 2026-11-16):
//   exam     the exam paper, as everywhere else.
//   streak   a flame that is alive: it sinks to an ember and flares back up into a flame.
//   chance   a circle with a cross that pops into a green circle with a check mark.
// The movements are in rewards.module.css, under .pass:hover.
import type { CSSProperties } from "react";
import { Icon } from "./practice";
import styles from "./rewards.module.css";

export type PassKind = "exam" | "streak" | "chance";
const TINT: Record<PassKind, string> = { exam: "#8a93c9", streak: "#ee5a24", chance: "#38a47b" };

export function PassIcon({ kind }: { kind: PassKind }) {
  return (
    <span className={styles.passIcon} style={{ "--tint": TINT[kind] } as CSSProperties}>
      {kind === "exam" && <Icon name="exam" size={28} />}
      {kind === "streak" && (
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          {/* the ember it sinks to */}
          <ellipse data-part="ember" cx="12" cy="19" rx="4.200" ry="2.200" fill="#c0392b" />
          <g data-part="flame">
            <path
              d="M12 2.500c1.600 4.200 6.300 5.800 6.300 11.600a6.300 6.300 0 0 1-12.600 0c0-3.200 2.100-4.800 2.900-7.400 1.300 1.900 1.700 3.200 2.100 4.800 1-2.700 1.600-5.800 1.300-9z"
              fill="#ee5a24"
            />
            <path
              d="M12 11c.9 2 3 3 3 5.700a3 3 0 0 1-6 0c0-1.500 1-2.300 1.500-3.500.5.800.8 1.400 1 2.100.4-1.400.6-2.800.5-4.300z"
              fill="#ffd24a"
            />
          </g>
        </svg>
      )}
      {kind === "chance" && (
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <g data-part="miss">
            <circle cx="12" cy="12" r="9.500" fill="#c0392b" />
            <path
              d="M8.500 8.500l7 7M15.500 8.500l-7 7"
              stroke="#fffdf8"
              strokeWidth="2.200"
              strokeLinecap="round"
            />
          </g>
          <g data-part="right">
            <circle cx="12" cy="12" r="9.500" fill="#2f9e6f" />
            <path
              d="M7.500 12.300l3.100 3.100 5.900-6.300"
              fill="none"
              stroke="#fffdf8"
              strokeWidth="2.200"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      )}
    </span>
  );
}
