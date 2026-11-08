/**
 * Three glyphs the tutor portal needs that the shared set lacks, drawn on the
 * same 24 grid at a 1.75 stroke with round caps and joins (rule 52), so they
 * can be promoted into src/design-system/icons/paths.ts as they are:
 * video (the Zoom room), wallet (earnings and payouts), photo (a score-report
 * upload waiting to be read).
 */
export const TUTOR_ICON_PATHS = {
  video:
    "M4 7h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM15 10.5l5-2.5v8l-5-2.5",
  wallet:
    "M4 7h14a2 2 0 0 1 2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM3 7.5V6a1.5 1.5 0 0 1 1.5-1.5H17M20 12h-4a1.5 1.5 0 0 0 0 3h4M16.5 13.5h.01",
  photo:
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM6.5 16l3.5-4 3 3.5 2-2 3 2.5M8.5 9h.01",
} as const;
export type TutorIconName = keyof typeof TUTOR_ICON_PATHS;

export function TIcon({
  name,
  size = 24,
  label,
  className,
}: {
  name: TutorIconName;
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
      <path d={TUTOR_ICON_PATHS[name]} />
    </svg>
  );
}
