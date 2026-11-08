/** The streak flame from prototypes/daily10-end/core.js (P.flameSVG): accent outer, a lighter inner tongue. */
export function Flame({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 30"
      width={size}
      height={(size * 30) / 24}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 1 C14 8 21 11 21 19 C21 25 17 29 12 29 C7 29 3 25 3 19 C3 13 8 11 9 5 C11 9 11 11 12 13 C13 9 12 5 12 1 Z"
        fill="rgb(var(--k-accent))"
      />
      <path
        d="M12 14 C13 18 16 19 16 23 C16 26 14 28 12 28 C10 28 8 26 8 23 C8 20 11 18 12 14 Z"
        fill="color-mix(in srgb, rgb(var(--k-accent)) 60%, #fff)"
      />
    </svg>
  );
}

/** "7 days in a row": the flame and a tabular count. */
export function Streak({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={`tabular inline-flex items-center gap-1.5 font-semibold ${className ?? ""}`}
      aria-label={`${days} days in a row`}
    >
      <Flame size={14} />
      <span>{days}</span>
      <span className="font-medium text-muted">days in a row</span>
    </span>
  );
}
