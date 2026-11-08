/**
 * Four tool glyphs the design system's set does not carry, drawn for Karman
 * on the same 24 grid, 1.75 stroke, round caps and joins: the highlighter,
 * the scratch pad, the calculator button (an icon only; the calculator itself
 * is never drawn) and the flag that marks a test question for review. Candidates for the
 * shared icon set.
 */
const PATHS = {
  highlighter: "M4 20h7M9 17l-3-3 8-8 3 3-8 8zM14 6l3 3M6 14l-2 4 4-2",
  calculator:
    "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 6h6v3H9zM9.5 13h.01M12 13h.01M14.5 13h.01M9.5 16.5h.01M12 16.5h.01M14.5 16.5h.01",
  flag: "M6 21V4M6 4h11l-2.5 4 2.5 4H6",
  pad: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h8M7.5 15c1.5-2.6 3-2.6 4.5 0s3 2.6 4.5 0",
} as const;
export type ToolIconName = keyof typeof PATHS;

export function ToolIcon({
  name,
  size = 20,
  className,
}: {
  name: ToolIconName;
  size?: 24 | 20;
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
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
