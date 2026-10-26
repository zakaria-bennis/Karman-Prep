/* The isometric line drawing both home-page figures share (the Daily 10 and the week), in the Hairline
 style: rounded solids, plates filled with the ground colour and painted back to front, one bright stroke
 for the thing that is chosen. iso(K) gives the projection and path builders at scale K. Browser only. */
const NS = "http://www.w3.org/2000/svg";
export const C30 = Math.cos(Math.PI / 6),
  S30 = 0.5;

export const mk = (tag: string, attrs: Record<string, string>, parent?: Element | null) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent?.append(el);
  return el;
};

/** A rounded rectangle on the floor plane, clockwise, as corner-arc points. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number) {
  const pts: number[][] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= 4; k++) {
      const a = a0 + (k / 4) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

export function iso(K: number) {
  const P = (x: number, y: number, z: number) => [(x - y) * C30 * K, ((x + y) * S30 - z) * K];
  const pt = (q: number[]) => q.map((n) => n.toFixed(2)).join(",");
  /** a flat outline at height z */
  const poly = (pts: number[][], z: number) =>
    "M" + pts.map(([x, y]) => pt(P(x, y, z))).join("L") + "Z";
  /** a rounded solid's silhouette from z0 to z1: the hull of its base and its top, so no vertical edges show */
  function hullOf(pts: number[][], z0: number, z1: number) {
    const q = pts
      .flatMap(([x, y]) => [P(x, y, z0), P(x, y, z1)])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: number[], a: number[], b: number[]) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list: number[][]) => {
      const h: number[][] = [];
      for (const p of list) {
        while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
        h.push(p);
      }
      h.pop();
      return h;
    };
    const ring = half(q).concat(half(q.slice().reverse()));
    return "M" + ring.map(pt).join("L") + "Z";
  }
  /** the world point on the plane at height z under a viewBox point */
  const unproj = (sx: number, sy: number, z: number) => {
    const d = sx / (C30 * K),
      s = (sy / K + z) / S30;
    return [(s + d) / 2, (s - d) / 2];
  };
  /** a viewBox that fits these world points, with margin m */
  const fit = (pts: number[][], m: number) => {
    const q = pts.map(([x, y, z]) => P(x, y, z));
    const xs = q.map((c) => c[0]),
      ys = q.map((c) => c[1]);
    return [
      Math.min(...xs) - m,
      Math.min(...ys) - m,
      Math.max(...xs) - Math.min(...xs) + m * 2,
      Math.max(...ys) - Math.min(...ys) + m * 2,
    ];
  };
  return { P, poly, hullOf, unproj, fit };
}

/** The pointer's position in viewBox units. */
export function toViewBox(svg: SVGSVGElement, vb: number[], ev: PointerEvent) {
  const box = svg.getBoundingClientRect();
  return [
    vb[0] + ((ev.clientX - box.left) / box.width) * vb[2],
    vb[1] + ((ev.clientY - box.top) / box.height) * vb[3],
  ];
}

/** 700 ms ease-out lifts with a stagger: each part goes from where it is to its target after its delay. */
export type Lift = { z: number; to: number; at: number; from: number };
export function lifter(parts: Lift[], draw: () => void, dur = 700) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  let raf = 0;
  function loop(now: number) {
    let moving = false;
    for (const t of parts) {
      const k = Math.min(1, Math.max(0, (now - t.at) / (reduce.matches ? 1 : dur)));
      t.z = t.from + (t.to - t.from) * ease(k);
      if (k < 1) moving = true;
    }
    draw();
    raf = moving ? requestAnimationFrame(loop) : 0;
  }
  return {
    wake: () => (raf ||= requestAnimationFrame(loop)),
    stop: () => cancelAnimationFrame(raf),
  };
}
