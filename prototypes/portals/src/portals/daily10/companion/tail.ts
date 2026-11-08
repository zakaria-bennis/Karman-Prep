import type { Animal, AnimalId } from "@/design-system/marks/mascot-paths";

/**
 * The fox's tail, ported from prototypes/daily10-end/daily10/mascot.js (TAILS,
 * tailSVG). It never stands up: it lies along the edge the head peeks from, a
 * soft folded brush with tufts on top, and its tip flops over the edge in front
 * of the bar. The owl has none. (The wolf and cat tails stay unlisted with their
 * animals.)
 */
export const TAIL_OF: Partial<Record<AnimalId, "fox">> = { fox: "fox" };

export function tailSVG(id: AnimalId, a: Animal): string {
  if (!TAIL_OF[id]) return "";
  const c = a.c;
  const T = { th: 1.3, tipK: 1.18, tip: c.muz, tip2: "#E6D8C4" };
  const y = (n: number) => (n * T.th).toFixed(1);
  return `<g class="t-base">
    <path d="M28 1 L38 ${y(-11)} L45 ${y(-17)} L51 ${y(-13)} L58 ${y(-19)} L64 ${y(-14)} L71 ${y(-18)} L76 ${y(-12)} L86 ${y(-8)} L62 ${y(-4)}Z" fill="${c.l}"/>
    <path d="M28 1 L62 ${y(-4)} L86 ${y(-8)} L89 2 L58 3Z" fill="${c.m}"/>
    <path d="M45 ${y(-17)} L51 ${y(-13)} L48 ${y(-8)}Z M58 ${y(-19)} L64 ${y(-14)} L61 ${y(-9)}Z" fill="${c.m}" opacity=".55"/>
    <g class="t-tip" data-k="${T.tipK}">
      <path d="M80 ${y(-11)} L92 ${y(-12)} L102 4 L95 11 L83 2Z" fill="${c.d}"/>
      <path d="M95 11 L102 4 L109 17 L104 30 L93 24Z" fill="${T.tip}"/>
      <path d="M93 24 L104 30 L98 35Z" fill="${T.tip2}"/>
      <path d="M102 4 L109 17 L104 14Z" fill="#fff" opacity=".35"/>
    </g>
  </g>`;
}
