// Ollie the owl, seen from above and behind as he flies: the bird the intake follows across the landscape
// (founder, 2026-11-13). Drawn in code in the owl companion's own colours (rewards/animals.ts). His wings
// beat and he drifts a little; held still under reduced motion (intake.css).
import { ANIMAL_ART } from "@/components/rewards/animals";

const C = ANIMAL_ART.owl.c;

export function Ollie({ size = 96 }: { size?: number }) {
  // one wing, drawn to the left of the body; the right one is its mirror
  const wing = (
    <>
      <path
        d="M-6 -4 C-30 -22 -58 -20 -78 -4 C-70 -2 -64 2 -60 8 C-50 4 -44 6 -40 12 C-30 8 -24 10 -20 16 C-12 12 -8 12 -4 14Z"
        fill={C.m}
      />
      <path d="M-6 -4 C-28 -16 -52 -16 -70 -6 C-50 -8 -30 -4 -8 6Z" fill={C.l} opacity="0.85" />
      <path
        d="M-60 8 l-6 10 M-40 12 l-4 11 M-20 16 l-2 10"
        stroke={C.d}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-70 -5 C-56 -3 -44 1 -34 7 M-52 -11 C-40 -8 -28 -3 -18 4"
        stroke={C.d}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </>
  );
  return (
    <svg
      className="ob-ollie"
      viewBox="-90 -52 180 104"
      width={size}
      height={(size * 104) / 180}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className="ob-ollie-shade" cx="6" cy="44" rx="34" ry="6" />
      <g className="ob-ollie-body">
        <g className="ob-wing">{wing}</g>
        {/* the right wing is the left one mirrored; the beat is on the inner group, so both hinge at the body */}
        <g transform="scale(-1 1)">
          <g className="ob-wing">{wing}</g>
        </g>
        {/* tail fan */}
        <path d="M-10 18 L-14 40 L-5 34 L0 42 L5 34 L14 40 L10 18Z" fill={C.d} />
        <path d="M-5 22 L-6 34 M0 22 L0 37 M5 22 L6 34" stroke={C.m} strokeWidth="1.6" />
        {/* back */}
        <ellipse cx="0" cy="6" rx="15" ry="19" fill={C.m} />
        <path
          d="M-9 0 q9 7 18 0 M-8 8 q8 6 16 0 M-6 15 q6 5 12 0"
          stroke={C.d}
          strokeWidth="1.5"
          fill="none"
          opacity="0.55"
        />
        {/* head, with the two tufts */}
        <path d="M-12 -22 L-17 -36 L-5 -28Z M12 -22 L17 -36 L5 -28Z" fill={C.d} />
        <ellipse cx="0" cy="-18" rx="14" ry="12" fill={C.l} />
        <path d="M-9 -24 q9 5 18 0" stroke={C.d} strokeWidth="1.4" fill="none" opacity="0.5" />
        <path d="M-3 -29 L0 -34 L3 -29Z" fill="#E8A13A" />
      </g>
    </svg>
  );
}
