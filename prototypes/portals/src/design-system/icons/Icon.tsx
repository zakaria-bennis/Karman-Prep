import { ICON_PATHS, type IconName } from "./paths";

export interface IconProps {
  name: IconName;
  /** 24 in the rail, headers and buttons; 20 in rows and small controls. Nothing else. */
  size?: 24 | 20;
  /** A name for assistive tech when the icon stands alone; decorative otherwise. */
  label?: string;
  className?: string;
}

/** One stroke set, 24 grid, 1.75 stroke, round caps and joins, currentColor. */
export function Icon({ name, size = 24, label, className }: IconProps) {
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
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
