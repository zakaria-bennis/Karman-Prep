// The sky at a session's time, where the student is: a small picture beside a time, and a strip of
// sky across the top of the next session. Drawn in code. Which sky it is comes from the estimated
// sunrise and sunset (src/lib/schedule/sun.ts).
import type { Sky } from "./scheduleData";

/** A rising sun, a sun, a setting sun or a moon, 16 pixels. */
export function SkyIcon({ sky }: { sky: Sky }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      data-sky={sky}
    >
      {sky === "night" ? (
        <path
          d="M12.800 9.600A5.200 5.200 0 0 1 6.400 3.200a5.200 5.200 0 1 0 6.400 6.400z"
          fill="currentColor"
          stroke="none"
        />
      ) : sky === "day" ? (
        <>
          <circle cx="8" cy="8" r="3.200" fill="currentColor" stroke="none" />
          <path d="M8 1.500V3M8 13v1.500M1.500 8H3M13 8h1.500M3.400 3.400l1 1M11.600 11.600l1 1M12.600 3.400l-1 1M4.400 11.600l-1 1" />
        </>
      ) : sky === "sunrise" ? (
        <>
          <path d="M4.500 11a3.500 3.500 0 0 1 7 0z" fill="currentColor" stroke="none" />
          <path d="M1.500 13h13M8 3v2M3.200 5.700l1.200 1.200M12.800 5.700l-1.200 1.200" />
        </>
      ) : (
        <>
          <path d="M4.500 9.500a3.500 3.500 0 0 1 7 0z" fill="currentColor" stroke="none" />
          <path d="M1.500 9.500h13M4 12h8M6 14.300h4" />
        </>
      )}
    </svg>
  );
}

const DOTS = [
  [18, 14, 1.4],
  [52, 30, 1],
  [88, 10, 1.2],
  [130, 26, 1],
  [171, 12, 1.5],
  [214, 34, 1],
  [250, 16, 1.2],
  [36, 44, 0.9],
  [110, 48, 1.1],
  [196, 50, 0.9],
];

/** A strip of that sky: its sun or moon, with clouds by day and stars (plain points) by night. */
export function SkyScene({ sky }: { sky: Sky }) {
  return (
    <svg
      viewBox="0 0 320 64"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      data-sky={sky}
    >
      {sky === "night" ? (
        <>
          {DOTS.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="#fff"
              opacity={0.5 + (i % 3) * 0.2}
              data-twinkle={i % 3}
            />
          ))}
          <path d="M284 14a17 17 0 1 0 14 26 14 14 0 0 1-14-26z" fill="#fff6d6" />
        </>
      ) : sky === "day" ? (
        <>
          <circle cx="276" cy="26" r="26" fill="#fff3b8" opacity="0.35" />
          <circle cx="276" cy="26" r="15" fill="#fff8d2" />
          <path
            d="M40 46a9 9 0 0 1 16-4 12 12 0 0 1 22 4z"
            fill="#fff"
            opacity="0.75"
            data-drift="0"
          />
          <path
            d="M150 24a7 7 0 0 1 13-3 9 9 0 0 1 17 3z"
            fill="#fff"
            opacity="0.6"
            data-drift="1"
          />
        </>
      ) : (
        <>
          <circle cx="270" cy="64" r="46" fill="#fff" opacity="0.14" />
          <circle cx="270" cy="64" r="30" fill="#fff" opacity="0.2" />
          <circle cx="270" cy="64" r="18" fill="#fff5c8" />
          <path
            d="M30 22h46M150 34h34M92 46h28"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.35"
            data-drift="0"
          />
        </>
      )}
    </svg>
  );
}
