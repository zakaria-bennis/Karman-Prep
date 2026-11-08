/**
 * The fox and the owl, ported verbatim from the companion engine
 * (prototypes/daily10-end/daily10/mascot.js: ANIMALS, STAGES, earSVG, owlHead,
 * headSVG, pawsSVG). Only the still drawings live here; the peeking engine and
 * its springs come later from the Daily 10 agent. Object colours, no theme ink.
 */
const K = "#24180F";

export interface Animal {
  name: string;
  c: { l: string; m: string; d: string; muz: string; in: string; tip?: string; paw: string };
  ear: "tall" | "tuft";
  cheeks?: boolean;
  owl?: boolean;
}

export const ANIMALS = {
  fox: {
    name: "Fox",
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
  },
  owl: {
    name: "Owl",
    c: { l: "#A9784B", m: "#8E6038", d: "#5E3D22", muz: "#F7EFE1", in: "#86633F", paw: "#E9962A" },
    ear: "tuft",
    owl: true,
  },
} as const satisfies Record<string, Animal>;
export type AnimalId = keyof typeof ANIMALS;

export const STAGES = {
  kit: { head: 0.82, eye: 1.18, ear: 0.72 },
  young: { head: 0.92, eye: 1.06, ear: 0.88 },
  grown: { head: 1, eye: 1, ear: 1 },
} as const;
export type Stage = keyof typeof STAGES;

type St = { head: number; eye: number; ear: number };

function earSVG(x: number, y: number, s: number, c: Animal["c"], k: number) {
  const e = (n: number) => n * k;
  return `<path d="M${x} ${y} L${x - s * e(4)} ${y - e(38)} L${x + s * 22} ${y - e(14)}Z" fill="${c.m}"/><path d="M${x - s * e(4)} ${y - e(38)} L${x - s * e(2)} ${y - e(26)} L${x + s * e(8)} ${y - e(30)}Z" fill="${c.tip || c.m}"/><path d="M${x + s * 2} ${y - 6} L${x} ${y - e(26)} L${x + s * 14} ${y - e(14)}Z" fill="${c.in}"/>`;
}

const ex2 = (dx: number, E: number) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);

function owlHead(a: Animal, st: St) {
  const c = a.c,
    y = -32,
    E = st.eye,
    k = st.ear,
    ir = (9.6 * E).toFixed(1),
    pu = (5.4 * E).toFixed(1);
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
    </g>
    <ellipse class="m-blush" cx="-25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="25" cy="${y + 20}" rx="5.5" ry="3.2" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24} L-1.2 ${y + 22}Z" fill="#E9962A"/><path d="M0 ${y + 12} L5 ${y + 12} L1.2 ${y + 22} L0 ${y + 24}Z" fill="#C97A16"/>
    <path class="m-mouth" d="M-4 ${y + 27} Q0 ${y + 29} 4 ${y + 27}" stroke="${K}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/></g>`;
}

export function headSVG(a: Animal, st: St): string {
  if (a.owl) return owlHead(a, st);
  const c = a.c,
    y = -32,
    E = st.eye;
  const ex = (dx: number) => (dx * (1 + (E - 1) * 0.3)).toFixed(1);
  return `<g class="m-ear">${earSVG(-30, y - 10, 1, c, st.ear)}</g><g class="m-ear">${earSVG(30, y - 10, -1, c, st.ear)}</g>
    <path d="M-40 ${y} L0 ${y - 26} L40 ${y} L0 ${y + 6}Z" fill="${c.l}"/>
    <path d="M-40 ${y} L0 ${y + 6} L-4 ${y + 40} L-30 ${y + 32}Z" fill="${c.m}"/>
    <path d="M40 ${y} L0 ${y + 6} L4 ${y + 40} L30 ${y + 32}Z" fill="${c.d}"/>
    ${a.cheeks ? `<path d="M-40 ${y} L-16 ${y + 18} L0 ${y + 40} L-30 ${y + 32}Z M40 ${y} L16 ${y + 18} L0 ${y + 40} L30 ${y + 32}Z" fill="${c.muz}"/>` : ""}
    <g class="m-face"><path d="M-16 ${y + 18} L0 ${y + 8} L16 ${y + 18} L0 ${y + 40}Z" fill="${c.muz}"/>
    <path d="M-40 ${y} L0 ${y - 26}" stroke="#fff" stroke-width="1" opacity=".28"/>
    <g class="m-eyes">
      <g class="m-eN"><g class="m-lid"><ellipse cx="-15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/><ellipse cx="15" cy="${y + 4}" rx="${(6 * E).toFixed(1)}" ry="${(6.8 * E).toFixed(1)}" fill="${K}"/>
        <g class="m-gloss"><circle cx="${ex(-12.6)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="${ex(17.4)}" cy="${y + 1.2}" r="${(2.3 * E).toFixed(1)}" fill="#fff"/><circle cx="-17" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/><circle cx="13" cy="${y + 7}" r="1" fill="#fff" opacity=".7"/></g></g></g>
      <path class="m-eH" d="M-21 ${y + 5} Q-15 ${y - 3} -9 ${y + 5} M9 ${y + 5} Q15 ${y - 3} 21 ${y + 5}" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
    </g>
    <ellipse class="m-blush" cx="-26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/><ellipse class="m-blush" cx="26" cy="${y + 16}" rx="6" ry="3.4" fill="#F28B7E" opacity=".55"/>
    <path d="M-5 ${y + 17} L5 ${y + 17} L0 ${y + 22}Z" fill="${K}"/>
    <path class="m-mouth" d="M-4 ${y + 25} Q0 ${y + 28} 4 ${y + 25}" stroke="${K}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
}

export function pawsSVG(a: Animal): string {
  const p = a.c.paw;
  const one = (x: number) =>
    `<g class="m-paw"><ellipse cx="${x}" cy="1" rx="10" ry="6.5" fill="${p}"/><path d="M${x - 4} 3 l0 3 M${x + 4} 3 l0 3" stroke="#000" stroke-width="1.2" opacity=".32"/></g>`;
  return one(-21) + one(21);
}

/** The mouth per mood (mascot.js moodOn): n neutral, h happy (eyes closed), o delighted. */
export const MOUTHS = {
  n: "M-4 -7 Q0 -4 4 -7",
  h: "M-6 -8 Q0 2 6 -8Z",
  o: "M-4 -8 Q0 1 4 -8 Q0 -11 -4 -8Z",
} as const;
export type Mood = keyof typeof MOUTHS;
