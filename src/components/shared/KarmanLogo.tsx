/** Original monochrome Karman rocket. Uses currentColor in every theme. */
export function KarmanLogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-ivory ${className}`}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 2C10.8 6.8 8.8 13.3 9.2 21.2L13.2 19.4H18.8L22.8 21.2C23.2 13.3 21.2 6.8 16 2ZM16 9.1A2.6 2.6 0 1 0 16 14.3A2.6 2.6 0 0 0 16 9.1Z"
        clipRule="evenodd"
      />
      <path
        d="M7.8 16.3L3.8 22.4V26.1L10.2 22.7M24.2 16.3L28.2 22.4V26.1L21.8 22.7M13.5 23.4L16 30L18.5 23.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KarmanWordmark({
  fontSize,
  letterSpacing = "-0.045em",
}: {
  fontSize: number;
  letterSpacing?: string;
}) {
  return (
    <span
      className="select-none font-plex-sans font-semibold leading-none text-ivory"
      style={{ fontSize, letterSpacing }}
    >
      Karman
      <span className="ml-1.5 align-baseline text-[0.52em] font-normal tracking-normal">Prep</span>
    </span>
  );
}

export function KarmanLogo({
  size = 32,
  markOnly = false,
  variant = "inline",
  className = "",
}: {
  size?: number;
  theme?: "dark" | "light" | "auto";
  markOnly?: boolean;
  variant?: "inline" | "stacked";
  className?: string;
}) {
  if (markOnly) return <KarmanLogoMark size={size} className={className} />;
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${variant === "stacked" ? "flex-col gap-4" : ""} ${className}`}
    >
      <KarmanLogoMark size={size} />
      <KarmanWordmark fontSize={size * 0.78} />
    </span>
  );
}
