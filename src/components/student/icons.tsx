import type { ConfidenceBand } from "@/types/quiz";

/** Karman's own student icons (rule 52). 24-unit grid, 1.6 stroke, round joins. */
type P = { size?: number; className?: string };
const frame = (size = 24, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

/** Home: a doorway under a small star. */
export function HomeIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <path d="M5 20.5V11l7-5.5 7 5.5v9.5" />
      <path d="M10 20.5v-5a2 2 0 0 1 4 0v5" />
      <path d="M12 1.6l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" fill="currentColor" strokeWidth={0.8} />
    </svg>
  );
}

/** Practice: three stars joined, the skill sky in small. */
export function SkillsIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <path d="M5.5 17.5L11 8.5l7.5 4.5" strokeOpacity={0.55} />
      <circle cx="5.5" cy="17.5" r="2" />
      <circle cx="11" cy="8.5" r="2.4" fill="currentColor" />
      <circle cx="18.5" cy="13" r="1.8" />
    </svg>
  );
}

/** Time Trial: a stopwatch whose face is a running lane. */
export function TrialIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M10 2.8h4M12 2.8V6M18.2 6.6l1.4-1.4" />
      <path d="M7.6 15.5h8.8" strokeOpacity={0.5} strokeDasharray="1.6 2" />
      <path d="M12 13.5l3-4" />
    </svg>
  );
}

/** Games: a Wordline tile with a letter stroke. */
export function GamesIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <rect x="3.5" y="6" width="7.5" height="7.5" rx="1.4" />
      <rect x="13" y="6" width="7.5" height="7.5" rx="1.4" fill="currentColor" fillOpacity={0.22} />
      <path d="M5.4 11.6l1.9-4 1.9 4M6 10.2h2.6" strokeWidth={1.3} />
      <path d="M3.5 18h17" strokeOpacity={0.55} />
    </svg>
  );
}

/** Full-length tests: four module sheets, fanned. */
export function TestsIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <path d="M7 4.5h9.5a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" />
      <path d="M9 9h5.5M9 12h5.5M9 15h3" strokeOpacity={0.6} />
      <path d="M19.5 7v12.5a2.5 2.5 0 0 1-2.5 2.5H8.5" strokeOpacity={0.55} />
    </svg>
  );
}

/** Theme: a half-lit disc. */
export function ThemeIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

/** Calendar page with one marked day, for due work and classes. */
export function CalendarIcon({ size, className }: P) {
  return (
    <svg {...frame(size, className)}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.6" />
      <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
      <rect x="13.2" y="13" width="3.3" height="3.3" rx="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Mastery band drawn as a star's phase, so it reads without colour. */
export function BandGlyph({ band, size = 18 }: { band: ConfidenceBand | null; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true as const };
  if (band === "mastered")
    return (
      <svg {...common}>
        <path
          d="M10 1.5l1.9 6.6 6.6 1.9-6.6 1.9L10 18.5l-1.9-6.6L1.5 10l6.6-1.9z"
          fill="var(--accent-gold)"
        />
      </svg>
    );
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle
        cx="10"
        cy="10"
        r="6.5"
        strokeOpacity={band ? 0.9 : 0.4}
        strokeDasharray={band ? undefined : "2 2.4"}
      />
      {band === "struggling" && (
        <circle cx="10" cy="10" r="1.8" fill="currentColor" stroke="none" />
      )}
      {band === "developing" && (
        <path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" stroke="none" />
      )}
      {band === "proficient" && (
        <circle cx="10" cy="10" r="6.5" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}
