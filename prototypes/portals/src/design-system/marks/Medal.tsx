import { useId } from "react";
import { COIN } from "../themes";

/**
 * The medal behind a new companion (the end screen's k-medal, 21st.dev 13045
 * Achievement Unlocked): a gold disc on a short ribbon. Fixed gold like the coin.
 */
export function Medal({ size = 48, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 48 56"
      width={size}
      height={(size * 56) / 48}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COIN.rim[0]} />
          <stop offset=".55" stopColor={COIN.rim[1]} />
          <stop offset="1" stopColor={COIN.rim[2]} />
        </linearGradient>
        <radialGradient id={`${id}f`} cx=".4" cy=".3" r=".8">
          <stop offset="0" stopColor={COIN.face[0]} />
          <stop offset=".5" stopColor={COIN.face[1]} />
          <stop offset="1" stopColor={COIN.face[2]} />
        </radialGradient>
      </defs>
      <path d="M17 2h6l-4 16h-6z" fill="rgb(var(--k-accent))" />
      <path d="M25 2h6l4 16h-6z" fill="color-mix(in srgb, rgb(var(--k-accent)) 76%, #000)" />
      <circle cx="24" cy="34" r="18" fill={`url(#${id}r)`} />
      <circle
        cx="24"
        cy="34"
        r="18"
        fill="none"
        stroke={COIN.rimStroke}
        strokeOpacity=".5"
        strokeWidth=".8"
      />
      <circle cx="24" cy="34" r="13.5" fill={`url(#${id}f)`} />
      <circle
        cx="24"
        cy="34"
        r="13.5"
        fill="none"
        stroke={COIN.faceStroke}
        strokeOpacity=".5"
        strokeWidth=".8"
      />
      <path
        d="M24 26.5 26 31l5 .3-3.9 3.2 1.3 4.9L24 36.7l-4.4 2.7 1.3-4.9L17 31.3l5-.3z"
        fill={COIN.star}
      />
      <path
        d="M12.5 28.5A12 12 0 0 1 20 21"
        fill="none"
        stroke="#fff"
        strokeOpacity=".7"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
