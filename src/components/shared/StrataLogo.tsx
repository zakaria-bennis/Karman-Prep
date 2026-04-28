// ============================================================
// StrataLogo — the brand mark is ONLY the four chevrons.
// Never the dark rounded "badge" in-app.
//
// Variants:
//   • StrataLogoMark              — chevron mark alone (svg, any size)
//   • <StrataLogo />              — chevrons + "STRATA" wordmark INLINE (default)
//   • <StrataLogo variant="stacked" /> — chevrons above, STRATA centered below
//
// The wordmark is a thin, uppercase sans-serif with the same pink→purple→cyan
// gradient as the mark (background-clip: text).
// ============================================================

const GRAD_STOPS: { offset: string; color: string }[] = [
  { offset: "0%",   color: "#EC4899" },   // pink-500
  { offset: "45%",  color: "#A855F7" },   // purple-500
  { offset: "100%", color: "#38BDF8" },   // sky-400
];

const GRADIENT_CSS = `linear-gradient(90deg, ${GRAD_STOPS.map((s) => `${s.color} ${s.offset}`).join(", ")})`;
const MARK_GRADIENT_ID = "strata-mark-gradient";

interface MarkProps {
  size?: number;
  className?: string;
}

/** The four chevrons alone — transparent background, any size, brand gradient fill. */
export function StrataLogoMark({ size = 32, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={MARK_GRADIENT_ID} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          {GRAD_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>

      {/* Four stacked chevrons — narrowest at the top, widest at the bottom */}
      <path d="M 18 78 L 50 56 L 82 78 L 68 78 L 50 65 L 32 78 Z" fill={`url(#${MARK_GRADIENT_ID})`} />
      <path d="M 20 66 L 50 46 L 80 66 L 66 66 L 50 54 L 34 66 Z" fill={`url(#${MARK_GRADIENT_ID})`} />
      <path d="M 22 54 L 50 36 L 78 54 L 65 54 L 50 43 L 35 54 Z" fill={`url(#${MARK_GRADIENT_ID})`} />
      <path d="M 24 42 L 50 26 L 76 42 L 63 42 L 50 32 L 37 42 Z" fill={`url(#${MARK_GRADIENT_ID})`} />
    </svg>
  );
}

interface FullLogoProps {
  size?: number;
  /** kept for API stability — gradient is fixed */
  theme?: "dark" | "light" | "auto";
  /** Deprecated: use <StrataLogoMark /> directly for mark-only. */
  markOnly?: boolean;
  /** "inline" = chevrons + "STRATA" side-by-side (default, for nav bars).
   *  "stacked" = chevrons centered above, STRATA centered below (for hero / auth pages). */
  variant?: "inline" | "stacked";
  className?: string;
}

export function StrataWordmark({ fontSize, letterSpacing }: { fontSize: number; letterSpacing: string }) {
  return (
    <span
      className="uppercase bg-clip-text text-transparent select-none"
      style={{
        fontSize,
        letterSpacing,
        fontWeight: 300,              // thin sans-serif
        lineHeight: 1,
        backgroundImage: GRADIENT_CSS,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      }}
    >
      Karman
    </span>
  );
}

export function StrataLogo({
  size = 32,
  theme = "auto",
  markOnly = false,
  variant = "inline",
  className,
}: FullLogoProps) {
  void theme;

  if (markOnly) return <StrataLogoMark size={size} className={className} />;

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center ${className ?? ""}`} style={{ gap: size * 0.2 }}>
        <StrataLogoMark size={size} />
        <StrataWordmark
          fontSize={size * 0.36}
          letterSpacing="0.42em"
        />
      </div>
    );
  }

  // inline (default — used in nav bars, sidebars, footer)
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ gap: size * 0.28 }}>
      <StrataLogoMark size={size} />
      <StrataWordmark
        fontSize={size * 0.46}
        letterSpacing="0.24em"
      />
    </span>
  );
}
