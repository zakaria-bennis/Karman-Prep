// The sky at a time, where the student is, as a small picture beside it. Drawn in code. Which sky
// it is comes from the estimated sunrise and sunset (src/lib/schedule/sun.ts). The painted sky over
// the next session is ScheduleScene.tsx.
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
