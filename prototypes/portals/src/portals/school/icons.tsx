/**
 * Two glyphs the school portal needs that the shared set lacks, drawn on the
 * same 24 grid at a 1.75 stroke with round caps and joins (rule 52), so they
 * can be promoted into src/design-system/icons/paths.ts as they are:
 * copy (a seat key to the clipboard), seat (a seat on the licence).
 */
export const SCHOOL_ICON_PATHS = {
  copy: "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  seat: "M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7M4 12h16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM7 16v4M17 16v4",
} as const;
export type SchoolIconName = keyof typeof SCHOOL_ICON_PATHS;

export function SIcon({
  name,
  size = 24,
  label,
  className,
}: {
  name: SchoolIconName;
  size?: 24 | 20;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      className={className}
    >
      {label ? <title>{label}</title> : null}
      <path d={SCHOOL_ICON_PATHS[name]} />
    </svg>
  );
}
