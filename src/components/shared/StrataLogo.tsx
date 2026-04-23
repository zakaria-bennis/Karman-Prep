// ============================================================
// StrataLogo — premium node-tree mark with atmospheric strata layers.
// Purple (#534AB7) = nodes/structure, Teal (#1D9E75) = apex mastery.
// Works at any size; designed for 32px height minimum.
// ============================================================

interface MarkProps {
  size?: number;
}

/** The SVG icon mark only (no wordmark text) */
export function StrataLogoMark({ size = 32 }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Atmospheric strata layers ──────────────────────────
          Five bars tapering and fading as they rise, evoking
          the layers from troposphere (bottom) to exosphere (top) */}
      <rect x="2"   y="26.5" width="28" height="3"   rx="1.5"  fill="#534AB7" fillOpacity="0.20"/>
      <rect x="5"   y="21.5" width="22" height="2.5" rx="1.25" fill="#534AB7" fillOpacity="0.25"/>
      <rect x="8.5" y="17"   width="15" height="2"   rx="1"    fill="#534AB7" fillOpacity="0.30"/>
      <rect x="12"  y="13"   width="8"  height="1.5" rx="0.75" fill="#534AB7" fillOpacity="0.35"/>
      <rect x="14"  y="9.5"  width="4"  height="1"   rx="0.5"  fill="#1D9E75" fillOpacity="0.45"/>

      {/* ── Node-tree connector lines ──────────────────────────
          Root → left mid, root → right mid (purple)
          Both mids → apex (transitions to teal) */}
      <line x1="16" y1="27.5" x2="10.5" y2="21"   stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="16" y1="27.5" x2="21.5" y2="21"   stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="10.5" y1="19.5" x2="16" y2="8"    stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.65"/>
      <line x1="21.5" y1="19.5" x2="16" y2="8"    stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.65"/>

      {/* ── Nodes ─────────────────────────────────────────────
          Root (bottom) and two mid nodes: deep purple
          Apex (top): teal — represents mastery reached */}
      <circle cx="16"   cy="28.5" r="2"   fill="#534AB7"/>
      <circle cx="10.5" cy="20.5" r="1.8" fill="#534AB7"/>
      <circle cx="21.5" cy="20.5" r="1.8" fill="#534AB7"/>
      <circle cx="16"   cy="7"    r="2.5" fill="#1D9E75"/>
    </svg>
  );
}

interface FullLogoProps {
  size?: number;
  /** "dark" forces white wordmark; "light" forces slate wordmark; "auto" = dark: white, light: slate */
  theme?: "dark" | "light" | "auto";
}

/** Full logo: mark + "STRATA" wordmark */
export function StrataLogo({ size = 32, theme = "auto" }: FullLogoProps) {
  const textClass =
    theme === "dark"
      ? "text-white"
      : theme === "light"
      ? "text-slate-900"
      : "text-slate-900 dark:text-white";

  return (
    <span className="inline-flex items-center gap-2.5">
      <StrataLogoMark size={size} />
      <span
        className={`font-bold tracking-widest uppercase ${textClass}`}
        style={{ fontSize: size * 0.56, letterSpacing: "0.18em" }}
      >
        Strata
      </span>
    </span>
  );
}
