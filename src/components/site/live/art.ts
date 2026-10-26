/* Karman's page drawings (our own, 2026-10-25): isometric line work in the Daily 10 drawing's style, one per
 page where there is no person or product screen to show. Black lines, white and bone faces, one marigold
 accent each. Layers drift a few pixels toward the pointer on desktop, so the drawing feels touchable without
 moving on its own. artSvg(name) returns one; names: weeks, call, report, line, sitting. */
const C30 = Math.cos(Math.PI / 6),
  K = 3.2;
type Pt = [number, number, number];
const P = (x: number, y: number, z: number): [number, number] => [
  (x - y) * C30 * K,
  ((x + y) * 0.5 - z) * K,
];
const pt = (q: number[]) => q.map((n) => n.toFixed(1)).join(",");
const path = (pts: Pt[]) => "M" + pts.map((p) => pt(P(...p))).join("L") + "Z";
const open = (pts: Pt[]) => "M" + pts.map((p) => pt(P(...p))).join("L");
// a box from (x, y, z) of size w (along x), d (along y), h (up): top and the two faces we can see
function box(x: number, y: number, z: number, w: number, d: number, h: number, cls = "") {
  const top = path([
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ]);
  const right = path([
    [x + w, y, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x + w, y, z + h],
  ]);
  const front = path([
    [x, y + d, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ]);
  return `<g class="${cls}"><path class="a-r" d="${right}"/><path class="a-f" d="${front}"/><path class="a-t" d="${top}"/></g>`;
}
// text lying on a top face, sheared into the isometric plane
const flat = (x: number, y: number, z: number, txt: string, size = 4, cls = "a-tx") => {
  const [sx, sy] = P(x, y, z);
  return `<text class="${cls}" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)}) matrix(${C30} 0.5 ${-C30} 0.5 0 0)" font-size="${size * K}">${txt}</text>`;
};
// text standing on a front face (facing +y)
const stand = (x: number, y: number, z: number, txt: string, size = 4, cls = "a-tx") => {
  const [sx, sy] = P(x, y, z);
  return `<text class="${cls}" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)}) matrix(${C30} 0.5 0 1 0 0)" font-size="${size * K}">${txt}</text>`;
};
const layer = (depth: number, inner: string) => `<g class="a-l" data-depth="${depth}">${inner}</g>`;

/** `date` is the SAT date on the program drawing's last step, e.g. "MAR 6" (from offer.ts). */
const ART: Record<
  "weeks" | "call" | "report" | "line" | "sitting",
  (date: string) => [string, number[]]
> = {
  /* the program: nine weekly steps climbing to one marigold date */
  weeks(date) {
    let s = "";
    for (let i = 0; i < 9; i++)
      s += box(i * 9, 30 - i * 3.2, 0, 8, 12, 3 + i * 2.2, i === 8 ? "" : "a-soft");
    s += box(84, 0, 0, 16, 16, 26, "a-hot");
    const top = layer(1, stand(87, 16, 19, date, 4.2, "a-tx b"));
    return [
      layer(
        0.6,
        `<path class="a-sh" d="${path([
          [0, 30, 0],
          [104, 0, 0],
          [104, 20, 0],
          [0, 46, 0],
        ])}"/>`
      ) +
        layer(1, s) +
        top,
      [-40, -90, 380, 260],
    ];
  },
  /* private tutoring: two call tiles, and a reviewed question floating between them */
  call() {
    const tile = (x: number, cls: string) =>
      box(x, 0, 0, 30, 2.5, 24, cls) +
      `<circle class="a-head" cx="${P(x + 15, 2.5, 15)[0]}" cy="${P(x + 15, 2.5, 15)[1]}" r="${4.2 * K}"/><path class="a-body" d="${open(
        [
          [x + 8, 2.5, 2],
          [x + 10, 2.5, 8],
          [x + 20, 2.5, 8],
          [x + 22, 2.5, 2],
        ]
      )}"/>`;
    const sheet =
      box(16, 22, 18, 28, 20, 1, "") +
      flat(19, 26, 19.2, "Question 14", 2.6) +
      `<path class="a-mk no" d="${open([
        [20, 32, 19.2],
        [26, 35, 19.2],
      ])}"/><path class="a-mk ok" d="${open([
        [20, 37.5, 19.2],
        [22, 39, 19.2],
        [26, 36, 19.2],
      ])}"/>` +
      flat(29, 32, 19.2, "4", 3, "a-tx no") +
      flat(29, 36, 19.2, "2", 3, "a-tx ok");
    return [
      layer(
        0.5,
        `<path class="a-sh" d="${path([
          [0, 0, 0],
          [70, 0, 0],
          [70, 50, 0],
          [0, 50, 0],
        ])}"/>`
      ) +
        layer(1, tile(0, "a-dark") + tile(36, "a-dark hot")) +
        layer(1.8, sheet),
      [-150, -60, 380, 260],
    ];
  },
  /* the guarantee: a score report with two bars and the +100 seal */
  report() {
    const sheet = box(0, 0, 0, 44, 58, 1.2, "");
    const bars = box(8, 8, 1.2, 8, 8, 9, "a-soft") + box(24, 8, 1.2, 8, 8, 17, "a-hot");
    const words =
      flat(8, 20, 1.3, "Before", 2.4) +
      flat(24, 20, 1.3, "After", 2.4) +
      flat(5, 32, 1.3, "Score report", 3.2, "a-tx b") +
      flat(5, 39, 1.3, "Baseline 1180", 2.7) +
      flat(5, 45, 1.3, "SAT 1300", 2.7, "a-tx b");
    const [cx, cy] = P(46, 8, 14);
    const seal = `<g class="a-seal"><circle cx="${cx}" cy="${cy}" r="${10 * K}"/><text x="${cx}" y="${cy + 4 * K * 0.45}" text-anchor="middle" font-size="${7.5 * K}">+100</text></g>`;
    return [
      layer(
        0.5,
        `<path class="a-sh" d="${path([
          [3, 3, 0],
          [47, 3, 0],
          [47, 61, 0],
          [3, 61, 0],
        ])}"/>`
      ) +
        layer(1, sheet + words + bars) +
        layer(2, seal),
      [-200, -40, 420, 250],
    ];
  },
  /* about: the ground's curve, the dashed line 100 km up, and one path climbing to it */
  line() {
    const W = 380;
    const ground = `<path class="a-ground" d="M-10 ${230} Q ${W / 2} ${150} ${W + 10} ${230}"/>`;
    const dash = `<path class="a-dash" d="M-10 ${86} Q ${W / 2} ${20} ${W + 10} ${86}"/>`;
    const climb = `<path class="a-climb" d="M70 ${204} C 120 ${170}, 150 ${120}, 220 ${52}"/>`;
    const dot = `<circle class="a-dot" cx="220" cy="52" r="7"/><circle class="a-ring" cx="220" cy="52" r="14"/>`;
    const label = `<text class="a-tx" x="${W - 28}" y="${60}" text-anchor="end" font-size="13">100 km</text>`;
    return [layer(0.4, ground) + layer(1, dash + label) + layer(1.6, climb + dot), [0, 0, W, 260]];
  },
  /* the free practice test: a laptop with the sitting's timer and the proctor's tile */
  sitting() {
    const base = box(0, 20, 0, 60, 40, 2.2, "");
    const lid = `<path class="a-f" d="${path([
      [0, 20, 2.2],
      [60, 20, 2.2],
      [60, 20, 40],
      [0, 20, 40],
    ])}"/><path class="a-scr" d="${path([
      [3, 20, 5],
      [57, 20, 5],
      [57, 20, 37],
      [3, 20, 37],
    ])}"/>`;
    const keys = Array.from(
      { length: 4 },
      (_, r) =>
        `<path class="a-key" d="${open([
          [6, 26 + r * 5, 2.3],
          [54, 26 + r * 5, 2.3],
        ])}"/>`
    ).join("");
    const [tx, ty] = P(22, 20, 21);
    const ring = `<g class="a-timer"><circle cx="${tx}" cy="${ty}" r="${10 * K}" class="bg"/><circle cx="${tx}" cy="${ty}" r="${10 * K}" class="fg" transform="rotate(-90 ${tx} ${ty})"/><text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="${4 * K}">75:00</text></g>`;
    const proctor =
      box(40, 19, 26, 13, 1, 9, "a-dark") + stand(41.5, 20, 27.5, "Proctor", 2.2, "a-tx w");
    return [
      layer(
        0.5,
        `<path class="a-sh" d="${path([
          [2, 22, 0],
          [62, 22, 0],
          [62, 62, 0],
          [2, 62, 0],
        ])}"/>`
      ) +
        layer(1, base + keys + lid + ring) +
        layer(1.7, proctor),
      [-160, -40, 380, 300],
    ];
  },
};

export type ArtName = keyof typeof ART;

/** The drawing as SVG markup (our own constant shapes, no visitor input). */
export function artSvg(name: ArtName, date = ""): string {
  const [inner, vb] = ART[name](date);
  return `<svg class="art" viewBox="${vb.join(" ")}" aria-hidden="true">${inner}</svg>`;
}

/** Desktop with a mouse: the drawing's layers drift a few pixels toward the pointer. Returns a cleanup. */
export function attachArtDrift(host: HTMLElement): () => void {
  if (
    !matchMedia("(hover: hover) and (pointer: fine)").matches ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return () => {};
  const layers = [...host.querySelectorAll<SVGGElement>(".a-l")];
  let raf = 0,
    tx = 0,
    ty = 0,
    x = 0,
    y = 0;
  const step = () => {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    layers.forEach((l) => {
      const depth = Number(l.dataset.depth);
      l.style.transform = `translate(${(x * depth).toFixed(2)}px, ${(y * depth).toFixed(2)}px)`;
    });
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.02 ? requestAnimationFrame(step) : 0;
  };
  const move = (e: PointerEvent) => {
    tx = (e.clientX / innerWidth - 0.5) * 8;
    ty = (e.clientY / innerHeight - 0.5) * 6;
    raf ||= requestAnimationFrame(step);
  };
  addEventListener("pointermove", move, { passive: true });
  return () => {
    removeEventListener("pointermove", move);
    cancelAnimationFrame(raf);
  };
}
