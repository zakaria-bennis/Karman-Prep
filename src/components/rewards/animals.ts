// The six companions' drawings, ported verbatim from the founder's prototype
// (prototypes/quiz-modes/src/reward/animals.ts, itself from prototypes/daily10-end/daily10/mascot.js:
// ANIMALS, STAGES, earSVG, owlHead, headSVG, TAILS, tailSVG, pawsSVG). Object colours, no theme
// ink. Head in local space: the UI edge is y = 0 and the head rises into negative y. Names and
// unlock rules live in src/lib/rewards/catalog.ts. Static, trusted markup from this repository.
import type { AnimalId } from "@/lib/rewards/catalog";

export type { AnimalId };
const K = "#24180F";

export interface Animal {
  c: { l: string; m: string; d: string; muz: string; in: string; tip?: string; paw: string };
  ear: "tall" | "long" | "cat" | "tuft" | "round";
  cheeks?: boolean;
  teeth?: boolean;
  whisk?: boolean;
  stripes?: boolean;
  mask?: boolean;
  owl?: boolean;
  tail: "fox" | "wolf" | "cat" | null;
  sig: "tailSwish" | "earFlop" | "pawBat" | "owlTilt" | "pawWave" | "howl";
}

export const ANIMAL_ART: Record<AnimalId, Animal> = {
  fox: {
    c: {
      l: "#F6B652",
      m: "#E89A2C",
      d: "#CC8020",
      muz: "#FFF8EE",
      in: "#FFF0DA",
      tip: "#2A2A2A",
      paw: "#2A2A2A",
    },
    ear: "tall",
    cheeks: true,
    tail: "fox",
    sig: "tailSwish",
  },
  bunny: {
    c: { l: "#FBF8F3", m: "#EEE9E1", d: "#DDD6CC", muz: "#FFFFFF", in: "#F2B4B1", paw: "#F4F0EA" },
    ear: "long",
    teeth: true,
    tail: null,
    sig: "earFlop",
  },
  cat: {
    c: { l: "#6A6A73", m: "#585861", d: "#3F3F47", muz: "#F2F0EE", in: "#F2B4B1", paw: "#F2F0EE" },
    ear: "cat",
    whisk: true,
    stripes: true,
    tail: "cat",
    sig: "pawBat",
  },
  owl: {
    c: { l: "#A9784B", m: "#8E6038", d: "#5E3D22", muz: "#F7EFE1", in: "#86633F", paw: "#E9962A" },
    ear: "tuft",
    owl: true,
    tail: null,
    sig: "owlTilt",
  },
  bear: {
    c: { l: "#B9895C", m: "#A47447", d: "#8B5F37", muz: "#F0E1CC", in: "#D9B08A", paw: "#8B5F37" },
    ear: "round",
    tail: null,
    sig: "pawWave",
  },
  wolf: {
    c: { l: "#AEB5BF", m: "#949CA7", d: "#7C848F", muz: "#F7F8FA", in: "#E9C9C6", paw: "#C9CED6" },
    ear: "tall",
    mask: true,
    tail: "wolf",
    sig: "howl",
  },
};

export const STAGES = {
  kit: { head: 0.82, eye: 1.18, ear: 0.72 },
  young: { head: 0.92, eye: 1.06, ear: 0.88 },
  grown: { head: 1, eye: 1, ear: 1 },
} as const;
export type Stage = keyof typeof STAGES;
type St = { head: number; eye: number; ear: number };

function earSVG(x: number, y: number, s: number, c: Animal["c"], shape: Animal["ear"], k: number) {
  const e = (n: number) => n * k;
  if (shape === "tall")
    return `<path d="M${x} ${y} L${x - s * e(4)} ${y - e(38)} L${x + s * 22} ${y - e(14)}Z" fill="${c.m}"/><path d="M${x - s * e(4)} ${y - e(38)} L${x - s * e(2)} ${y - e(26)} L${x + s * e(8)} ${y - e(30)}Z" fill="${c.tip || c.m}"/><path d="M${x + s * 2} ${y - 6} L${x} ${y - e(26)} L${x + s * 14} ${y - e(14)}Z" fill="${c.in}"/>`;
  if (shape === "long")
    return `<path d="M${x} ${y} L${x - s * 2} ${y - e(64)} L${x + s * 18} ${y - 6}Z" fill="${c.m}"/><path d="M${x + s * 2} ${y - 6} L${x + s * 1} ${y - e(54)} L${x + s * 12} ${y - 8}Z" fill="${c.in}"/>`;
  if (shape === "round")
    return `<circle cx="${x + s * 4}" cy="${y - e(12)}" r="${e(13)}" fill="${c.m}"/><circle cx="${x + s * 4}" cy="${y - e(12)}" r="${e(7)}" fill="${c.in}"/>`;
  if (shape === "cat")
    return `<path d="M${x} ${y} L${x} ${y - e(30)} L${x + s * 22} ${y - e(10)}Z" fill="${c.m}"/><path d="M${x + s * 3} ${y - 5} L${x + s * 3} ${y - e(22)} L${x + s * 15} ${y - e(10)}Z" fill="${c.in}"/>`;
  return `<path d="M${x} ${y} L${x - s * 6} ${y - e(22)} L${x + s * 18} ${y - e(8)}Z" fill="${c.d}"/>`;
}

const ex2 = (dx: number, E: number) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);

// The owl has its own head: feather ear tufts, a pale heart-shaped facial disc with a dark rim,
// big amber eyes, a small hooked beak and feather chevrons on the forehead.
function owlHead(a: Animal, st: St) {
  const c = a.c;
  const y = -32;
  const E = st.eye;
  const k = st.ear;
  const ir = (9.6 * E).toFixed(1);
  const pu = (5.4 * E).toFixed(1);
  const tuft = (s: number) =>
    `<path d="M${s * 18} ${y - 18} L${s * 34} ${y - 18 - 26 * k} L${s * 36} ${y - 10}Z" fill="${c.d}"/><path d="M${s * 22} ${y - 17} L${s * 33} ${y - 16 - 20 * k} L${s * 33} ${y - 12}Z" fill="${c.l}" opacity=".7"/>`;
  const eye = (x: number) =>
    `<circle cx="${x}" cy="${y + 5}" r="${ir}" fill="#F2B33D"/><circle cx="${x}" cy="${y + 5}" r="${ir}" fill="none" stroke="#C47A12" stroke-width="1.4"/><circle cx="${x}" cy="${y + 5}" r="${pu}" fill="${K}"/>`;
  return `<g class="m-ear">${tuft(-1)}</g><g class="m-ear">${tuft(1)}</g>
    <path d="M-42 ${y - 2} L-34 ${y - 22} L0 ${y - 29} L34 ${y - 22} L42 ${y - 2} L37 ${y + 30} L0 ${y + 42} L-37 ${y + 30}Z" fill="${c.m}"/>
    <path d="M-42 ${y - 2} L-34 ${y - 22} L0 ${y - 29} L0 ${y + 42} L-37 ${y + 30}Z" fill="${c.l}"/>
    <path d="M-20 ${y - 21} L-12 ${y - 14} L-4 ${y - 21} M4 ${y - 21} L12 ${y - 14} L20 ${y - 21} M-8 ${y - 26} L0 ${y - 19} L8 ${y - 26}" stroke="${c.d}" stroke-width="2" fill="none" stroke-linejoin="round" opacity=".8"/>
    <path d="M0 ${y - 10} C-10 ${y - 18} -32 ${y - 16} -33 ${y + 4} C-33 ${y + 22} -14 ${y + 30} 0 ${y + 34} C14 ${y + 30} 33 ${y + 22} 33 ${y + 4} C32 ${y - 16} 10 ${y - 18} 0 ${y - 10}Z" fill="${c.d}"/>
    <path d="M0 ${y - 7} C-9 ${y - 14} -29 ${y - 13} -30 ${y + 4} C-30 ${y + 20} -13 ${y + 27} 0 ${y + 31} C13 ${y + 27} 30 ${y + 20} 30 ${y + 4} C29 ${y - 13} 9 ${y - 14} 0 ${y - 7}Z" fill="${c.muz}"/>
    <path d="M0 ${y - 7} C9 ${y - 14} 29 ${y - 13} 30 ${y + 4} C30 ${y + 20} 13 ${y + 27} 0 ${y + 31}Z" fill="#EADFCC"/>
    <g class="m-face"><g class="m-eyes">
      <g class="m-eN"><g class="m-lid">${eye(-14)}${eye(14)}<g class="m-gloss"><circle cx="${ex2(-11.6, E)}" cy="${y + 2}" r="${(2.6 * E).toFixed(1)}" fill="#fff"/><circle cx="${ex2(16.4, E)}" cy="${y + 2}" r="${(2.6 * E).toFixed(1)}" fill="#fff"/></g></g></g>
      <path class="m-eH" d="M-21 ${y + 6} Q-14 ${y - 3} -7 ${y + 6} M7 ${y + 6} Q14 ${y - 3} 21 ${y + 6}" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
      <g class="m-eS" opacity="0"><circle cx="-14" cy="${y + 7}" r="7" fill="#F2B33D"/><circle cx="14" cy="${y + 7}" r="7" fill="#F2B33D"/><circle cx="-14" cy="${y + 7.5}" r="4.4" fill="${K}"/><circle cx="14" cy="${y + 7.5}" r="4.4" fill="${K}"/><path d="M-23 ${y - 3} L-8 ${y + 1} M23 ${y - 3} L8 ${y + 1}" stroke="${c.d}" stroke-width="3" stroke-linecap="round"/></g>
      <path class="m-eZ" d="M-21 ${y + 5} Q-14 ${y + 10} -7 ${y + 5} M7 ${y + 5} Q14 ${y + 10} 21 ${y + 5}" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
    <ellipse class="m-blush" cx="-25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24} L-1.2 ${y + 22}Z" fill="#E9962A"/><path d="M0 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24}Z" fill="#C97A16"/>
    <path class="m-mouth" d="M-4 ${y + 27} Q0 ${y + 29} 4 ${y + 27}" stroke="${K}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/></g>`;
}

export function headSVG(a: Animal, st: St): string {
  if (a.owl) return owlHead(a, st);
  const c = a.c;
  const y = -32;
  const E = st.eye;
  const ex = (dx: number) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);
  return `<g class="m-ear">${earSVG(-30, y - 10, 1, c, a.ear, st.ear)}</g><g class="m-ear">${earSVG(30, y - 10, -1, c, a.ear, st.ear)}</g>
    <path d="M-40 ${y} L0 ${y - 26} L40 ${y} L0 ${y + 6}Z" fill="${c.l}"/>
    <path d="M-40 ${y} L0 ${y + 6} L-4 ${y + 40} L-30 ${y + 32}Z" fill="${c.m}"/>
    <path d="M40 ${y} L0 ${y + 6} L4 ${y + 40} L30 ${y + 32}Z" fill="${c.d}"/>
    ${a.cheeks ? `<path d="M-40 ${y} L-16 ${y + 18} L0 ${y + 40} L-30 ${y + 32}Z M40 ${y} L16 ${y + 18} L0 ${y + 40} L30 ${y + 32}Z" fill="${c.muz}"/>` : ""}
    ${a.mask ? `<path d="M-30 ${y + 2} L0 ${y - 14} L30 ${y + 2} L0 ${y + 12}Z" fill="#E9ECF0"/>` : ""}
    ${a.stripes ? `<path d="M-8 ${y - 20} L-5 ${y - 10} M0 ${y - 24} L0 ${y - 12} M8 ${y - 20} L5 ${y - 10}" stroke="${c.d}" stroke-width="3" stroke-linecap="round"/>` : ""}
    <g class="m-face"><path d="M-16 ${y + 18} L0 ${y + 8} L16 ${y + 18} L0 ${y + 40}Z" fill="${c.muz}"/>
    <path d="M-40 ${y} L0 ${y - 26}" stroke="#fff" stroke-width="1" opacity=".28"/>
    <g class="m-eyes">
      <g class="m-eN"><g class="m-lid"><ellipse cx="-15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/><ellipse cx="15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/>
        <g class="m-gloss"><circle cx="${ex(-12.6)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="${ex(17.4)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="-17" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/><circle cx="13" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/></g></g></g>
      <path class="m-eH" d="M-21 ${y + 5} Q-15 ${y - 3} -9 ${y + 5} M9 ${y + 5} Q15 ${y - 3} 21 ${y + 5}" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
      <g class="m-eS" opacity="0"><ellipse cx="-15" cy="${y + 6}" rx="5" ry="5.6" fill="${K}"/><ellipse cx="15" cy="${y + 6}" rx="5" ry="5.6" fill="${K}"/><circle cx="-13.4" cy="${y + 4}" r="1.8" fill="#fff"/><circle cx="16.6" cy="${y + 4}" r="1.8" fill="#fff"/><path d="M-22 ${y - 4} L-10 ${y - 1} M22 ${y - 4} L10 ${y - 1}" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/></g>
      <path class="m-eZ" d="M-21 ${y + 4} Q-15 ${y + 9} -9 ${y + 4} M9 ${y + 4} Q15 ${y + 9} 21 ${y + 4}" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
    <ellipse class="m-blush" cx="-26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 17} L5 ${y + 17} L0 ${y + 22}Z" fill="${K}"/>
    ${a.teeth ? `<rect x="-4" y="${y + 25}" width="3.6" height="5" rx="1" fill="#fff" stroke="${K}" stroke-width="1"/><rect x=".4" y="${y + 25}" width="3.6" height="5" rx="1" fill="#fff" stroke="${K}" stroke-width="1"/>` : ""}
    ${a.whisk ? `<path d="M-14 ${y + 20} L-40 ${y + 16} M-14 ${y + 23} L-40 ${y + 25} M14 ${y + 20} L40 ${y + 16} M14 ${y + 23} L40 ${y + 25}" stroke="#E8E4DE" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>` : ""}
    <path class="m-mouth" d="M-4 ${y + 25} Q0 ${y + 28} 4 ${y + 25}" stroke="${K}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
}

// The tail never stands up. It lies along the top of the edge the head peeks from, a soft folded
// brush with tufts on top, and its tip flops over the edge in front of the bar.
const TAILS = {
  fox: (c: Animal["c"]) => ({ th: 1.3, tipK: 1.18, tip: c.muz, tip2: "#E6D8C4" }),
  wolf: (c: Animal["c"]) => ({ th: 0.86, tipK: 0.9, tip: c.muz, tip2: "#D9DEE5" }),
  cat: (c: Animal["c"]) => ({ th: 0.5, tipK: 0.62, tip: c.d, tip2: "#2E2E35" }),
};
export function tailSVG(a: Animal): string {
  if (!a.tail) return "";
  const c = a.c;
  const T = TAILS[a.tail](c);
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

export function pawsSVG(a: Animal): string {
  const p = a.c.paw;
  const one = (x: number) =>
    `<g class="m-paw"><ellipse cx="${x}" cy="1" rx="10" ry="6.5" fill="${p}"/><path d="M${x - 4} 3 l0 3 M${x + 4} 3 l0 3" stroke="#000" stroke-width="1.2" opacity=".32"/></g>`;
  return one(-21) + one(21);
}
