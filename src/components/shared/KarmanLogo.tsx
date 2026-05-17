// ============================================================
// KarmanLogo — typographic placeholder for the Karman wordmark.
//
// This is a placeholder. The real Karman logo + variant set (see
// docs/brand.md "Logo system") is commissioned externally; until those
// assets land, every logo placement renders as Plex Serif text in ivory.
//
//   • <KarmanLogoMark />            — single letter "K" for compact / icon contexts
//   • <KarmanWordmark />            — full "KARMAN" wordmark
//   • <KarmanLogo />                — wordmark; variant="stacked" centers it
//
// Color: ivory (--text-primary, #F3ECDD). No gradients, no SVG paths.
// Font: 'IBM Plex Serif' once wired in the Tailwind/global font pipeline
// (chunk 2 of the design-language project). Falls back to Georgia until
// then so this component is safe to ship before fonts land.
// ============================================================

const SERIF_STACK = "'IBM Plex Serif', Georgia, 'Times New Roman', serif";
const IVORY = "#F3ECDD";

interface MarkProps {
  size?: number;
  className?: string;
}

/** Single-letter "K" placeholder for the symbol-only mark.
 *  Used in compact contexts (collapsed sidebar, dense rails) where
 *  the full wordmark won't fit. */
export function KarmanLogoMark({ size = 32, className }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex select-none items-center justify-center ${className ?? ""}`}
      style={{
        fontFamily: SERIF_STACK,
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1,
        color: IVORY,
        width: size,
        height: size,
      }}
    >
      K
    </span>
  );
}

interface WordmarkProps {
  fontSize: number;
  letterSpacing?: string;
}

/** Full "KARMAN" wordmark in Plex Serif, uppercase via CSS so screen
 *  readers still see the title-case brand name in the DOM. */
export function KarmanWordmark({ fontSize, letterSpacing = "0.2em" }: WordmarkProps) {
  return (
    <span
      className="select-none"
      style={{
        fontFamily: SERIF_STACK,
        fontSize,
        letterSpacing,
        fontWeight: 400,
        lineHeight: 1,
        color: IVORY,
        textTransform: "uppercase",
      }}
    >
      Karman
    </span>
  );
}

interface FullLogoProps {
  size?: number;
  /** Deprecated — kept for API stability while call sites pass it.
   *  The placeholder has no theme variation; real artwork will. */
  theme?: "dark" | "light" | "auto";
  /** Deprecated — kept for API stability. Prefer <KarmanLogoMark /> directly. */
  markOnly?: boolean;
  /** "inline" — wordmark on a single line, default for nav bars / footers.
   *  "stacked" — wordmark centered, for hero / auth pages. */
  variant?: "inline" | "stacked";
  className?: string;
}

export function KarmanLogo({
  size = 32,
  theme = "auto",
  markOnly = false,
  variant = "inline",
  className,
}: FullLogoProps) {
  void theme;

  if (markOnly) return <KarmanLogoMark size={size} className={className} />;

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center ${className ?? ""}`}>
        <KarmanWordmark fontSize={size * 0.6} letterSpacing="0.28em" />
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <KarmanWordmark fontSize={size * 0.7} letterSpacing="0.18em" />
    </span>
  );
}
