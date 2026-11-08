/*
 * The fox avatar, from the approved mark (prototypes/student-skeleton/fox.js, generated from
 * prototypes/portals/src/design-system/marks). Static, trusted markup from this repository.
 */

const HEAD =
  '<g class="m-ear"><path d="M-30 -42 L-34 -80 L-8 -56Z" fill="#E89A2C"/><path d="M-34 -80 L-32 -68 L-22 -72Z" fill="#2A2A2A"/><path d="M-28 -48 L-30 -68 L-16 -56Z" fill="#FFF0DA"/></g><g class="m-ear"><path d="M30 -42 L34 -80 L8 -56Z" fill="#E89A2C"/><path d="M34 -80 L32 -68 L22 -72Z" fill="#2A2A2A"/><path d="M28 -48 L30 -68 L16 -56Z" fill="#FFF0DA"/></g> <path d="M-40 -32 L0 -58 L40 -32 L0 -26Z" fill="#F6B652"/> <path d="M-40 -32 L0 -26 L-4 8 L-30 0Z" fill="#E89A2C"/> <path d="M40 -32 L0 -26 L4 8 L30 0Z" fill="#CC8020"/> <path d="M-40 -32 L-16 -14 L0 8 L-30 0Z M40 -32 L16 -14 L0 8 L30 0Z" fill="#FFF8EE"/> <g class="m-face"><path d="M-16 -14 L0 -24 L16 -14 L0 8Z" fill="#FFF8EE"/> <path d="M-40 -32 L0 -58" stroke="#fff" stroke-width="1" opacity=".28"/> <g class="m-eyes"> <g class="m-eN"><g class="m-lid"><ellipse cx="-15" cy="-28" rx="6.0" ry="6.8" fill="#24180F"/><ellipse cx="15" cy="-28" rx="6.0" ry="6.8" fill="#24180F"/> <g class="m-gloss"><circle cx="-12.6" cy="-30.8" r="2.3" fill="#fff"/><circle cx="17.4" cy="-30.8" r="2.3" fill="#fff"/><circle cx="-17" cy="-25" r="1" fill="#fff" opacity=".7"/><circle cx="13" cy="-25" r="1" fill="#fff" opacity=".7"/></g></g></g> <path class="m-eH" d="M-21 -27 Q-15 -35 -9 -27 M9 -27 Q15 -35 21 -27" stroke="#24180F" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/> </g> <ellipse class="m-blush" cx="-26" cy="-16" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="26" cy="-16" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/> <path d="M-5 -15 L5 -15 L0 -10Z" fill="#24180F"/> <path class="m-mouth" d="M-4 -7 Q0 -4 4 -7" stroke="#24180F" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>';

export function Fox({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="-60 -112 120 128"
      width={size}
      height={(size * 128) / 120}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: HEAD }}
    />
  );
}
