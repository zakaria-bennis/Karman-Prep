import { useId } from "react";
import { COIN } from "../themes";

/**
 * The gold token, ported from the approved Daily 10 end screen
 * (prototypes/daily10-end/core.js, End.tokenSVG). Fixed gold in every theme:
 * rim #fbe08a/#dba63c/#a96d14, face #fff3bd/#f5c84f/#c58718. The glint sweeps
 * every 4.2 s on coins of 20 px and over; it is hidden under reduced motion.
 */
export function Token({
  size = 18,
  glint = size >= 20,
  className,
}: {
  size?: number;
  glint?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const star =
    "M12 6.6 13.5 10.2 17.3 10.4 14.3 12.8 15.3 16.5 12 14.4 8.7 16.5 9.7 12.8 6.7 10.4 10.5 10.2Z";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COIN.rim[0]} />
          <stop offset=".5" stopColor={COIN.rim[1]} />
          <stop offset="1" stopColor={COIN.rim[2]} />
        </linearGradient>
        <radialGradient id={`${id}f`} cx=".38" cy=".32" r=".85">
          <stop offset="0" stopColor={COIN.face[0]} />
          <stop offset=".42" stopColor={COIN.face[1]} />
          <stop offset="1" stopColor={COIN.face[2]} />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <circle cx="12" cy="12" r="11.2" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="11.2" fill={`url(#${id}r)`} />
      <circle
        cx="12"
        cy="12"
        r="11.2"
        fill="none"
        stroke={COIN.rimStroke}
        strokeOpacity=".55"
        strokeWidth=".7"
      />
      <circle cx="12" cy="12" r="8.6" fill={`url(#${id}f)`} />
      <circle
        cx="12"
        cy="12"
        r="8.6"
        fill="none"
        stroke={COIN.faceStroke}
        strokeOpacity=".5"
        strokeWidth=".7"
      />
      <path d={star} fill={COIN.starShadow} fillOpacity=".55" transform="translate(.35 .45)" />
      <path d={star} fill={COIN.star} />
      <path
        d="M4.6 8.2 A8.4 8.4 0 0 1 10.2 3.7"
        fill="none"
        stroke="#fff"
        strokeOpacity=".75"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {glint ? (
        <g clipPath={`url(#${id}c)`}>
          <rect
            className="k-token-glint"
            x="-6"
            y="-4"
            width="4"
            height="32"
            fill="#fff"
            fillOpacity=".55"
            transform="rotate(24 12 12)"
          />
        </g>
      ) : null}
    </svg>
  );
}

/** A token count: the coin and a tabular gold number. */
export function TokenCount({
  value,
  size = 20,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`tabular inline-flex items-center gap-1.5 font-semibold text-gold ${className ?? ""}`}
    >
      <Token size={size} />
      <span>{value.toLocaleString("en-US")}</span>
    </span>
  );
}
