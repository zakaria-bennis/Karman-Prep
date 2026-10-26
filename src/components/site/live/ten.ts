/* The Daily 10 drawing (our own, 2026-10-25; replaces the Hairline engine).
 A phone-sized slab holding ten question tiles, five rows of two, drawn in isometric line work.
 At rest the three answered tiles sit a little proud and marigold; the next question has the bright edge.
 The tile under the pointer lifts; its neighbours follow, less and later the farther they sit.
 On touch screens, or before a pointer arrives, it walks itself slowly while on screen.
 mountTen(host) mounts it into host (which needs .hl and .read elements) and returns a cleanup. */
const NS = "http://www.w3.org/2000/svg";
const COLS = 2,
  ROWS = 5,
  TW = 22,
  TD = 18,
  GAP = 5,
  PAD = 7,
  SLAB = 6,
  TT = 2.4,
  LIFT = 15,
  DONE = 3;
const SX = PAD * 2 + COLS * TW + (COLS - 1) * GAP,
  SY = PAD * 2 + ROWS * TD + (ROWS - 1) * GAP;
const C30 = Math.cos(Math.PI / 6),
  S30 = 0.5,
  K = 2.35; // isometric angles and the drawing's scale
const restZ = (i: number) => (i < DONE ? 2.6 - i * 0.5 : i === DONE ? 1.2 : 0);

type Tile = {
  i: number;
  c: number;
  r: number;
  x0: number;
  y0: number;
  pts: number[][];
  z: number;
  to: number;
  at: number;
  from: number;
  g?: SVGElement;
  side?: SVGElement;
  top?: SVGElement;
};
const P = (x: number, y: number, z: number) => [(x - y) * C30 * K, ((x + y) * S30 - z) * K];
const mk = (tag: string, attrs: Record<string, string>, parent?: Element | null) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent?.append(el);
  return el;
};
// a rounded rectangle as a list of corner-arc points on the floor plane
function rrect(x0: number, y0: number, x1: number, y1: number, r: number) {
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
const poly = (pts: number[][], z: number) =>
  "M" +
  pts
    .map(([x, y]) =>
      P(x, y, z)
        .map((n) => n.toFixed(2))
        .join(",")
    )
    .join("L") +
  "Z";
// the visible sides of a rounded prism: the faces whose outward normal points toward the viewer (+x or +y)
function sides(pts: number[][], z0: number, z1: number) {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    const nx = b[1] - a[1],
      ny = -(b[0] - a[0]); // outward normal for clockwise points
    if (nx + ny <= 0) continue;
    d +=
      "M" +
      [P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1)]
        .map((q) => q.map((n) => n.toFixed(2)).join(","))
        .join("L") +
      "Z";
  }
  return d;
}

export function mountTen(host: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const stage = host.querySelector<HTMLElement>(".hl");
  const read = host.querySelector<HTMLElement>(".read");
  if (!stage || !read) return () => {};
  // the drawing's bounds, so the viewBox fits it exactly
  const corners = [
    [0, 0, 0],
    [SX, 0, 0],
    [0, SY, 0],
    [SX, SY, 0],
    [0, 0, SLAB + TT + LIFT],
    [SX, 0, SLAB + TT + LIFT],
  ].map(([x, y, z]) => P(x, y, z));
  const xs = corners.map((c) => c[0]),
    ys = corners.map((c) => c[1]);
  const m = 12;
  const vb = [
    Math.min(...xs) - m,
    Math.min(...ys) - m,
    Math.max(...xs) - Math.min(...xs) + m * 2,
    Math.max(...ys) - Math.min(...ys) + m * 2,
  ];
  const svg = mk(
    "svg",
    { viewBox: vb.map((n) => n.toFixed(1)).join(" "), "aria-hidden": "true" },
    stage
  );
  stage.setAttribute("role", "img");
  stage.setAttribute(
    "aria-label",
    "The Daily 10 as ten tiles on a phone. The question under the pointer lifts, and its neighbours rise after it."
  );

  // the slab, its screen and a soft shadow
  const base = rrect(0, 0, SX, SY, 9);
  mk(
    "path",
    {
      d: poly(
        base.map(([x, y]) => [x + 3, y + 3]),
        0
      ),
      class: "t-shadow",
    },
    svg
  );
  mk("path", { d: sides(base, 0, SLAB), class: "t-side" }, svg);
  mk("path", { d: poly(base, SLAB), class: "t-top" }, svg);
  mk("path", { d: poly(rrect(3.2, 3.2, SX - 3.2, SY - 3.2, 6.4), SLAB), class: "t-screen" }, svg);

  const tiles: Tile[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const c = i % COLS,
      r = Math.floor(i / COLS);
    const x0 = PAD + c * (TW + GAP),
      y0 = PAD + r * (TD + GAP);
    tiles.push({
      i,
      c,
      r,
      x0,
      y0,
      pts: rrect(x0, y0, x0 + TW, y0 + TD, 4),
      z: restZ(i),
      to: restZ(i),
      at: 0,
      from: restZ(i),
    });
  }
  // back to front, so nearer tiles cover farther ones
  tiles
    .slice()
    .sort((a, b) => a.x0 + a.y0 - (b.x0 + b.y0))
    .forEach((t) => {
      t.g = mk("g", { class: "t-tile" + (t.i < DONE ? " done" : "") }, svg);
      t.side = mk("path", { class: "t-side" }, t.g);
      t.top = mk("path", { class: "t-top" }, t.g);
    });
  const draw = (t: Tile) => {
    const z = SLAB + t.z;
    t.side?.setAttribute("d", sides(t.pts, z, z + TT));
    t.top?.setAttribute("d", poly(t.pts, z + TT));
  };

  // the lift: 700 ms, ease out, each tile starting after its stagger
  const DUR = 700,
    STAG = 70;
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  let raf = 0;
  function loop(now: number) {
    let moving = false;
    tiles.forEach((t) => {
      const k = Math.min(1, Math.max(0, (now - t.at) / (reduce.matches ? 1 : DUR)));
      t.z = t.from + (t.to - t.from) * ease(k);
      if (k < 1) moving = true;
      draw(t);
    });
    raf = moving ? requestAnimationFrame(loop) : 0;
  }
  const wake = () => (raf ||= requestAnimationFrame(loop));

  let act = -2;
  function setActive(a: number) {
    if (a === act) return;
    const now = performance.now();
    const from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    const fc = from % COLS,
      fr = Math.floor(from / COLS);
    tiles.forEach((t) => {
      const dist = Math.abs(t.c - fc) + Math.abs(t.r - fr);
      t.from = t.z;
      t.to = a < 0 ? restZ(t.i) : t.i === a ? LIFT : Math.max(0, LIFT * (0.55 - dist * 0.17));
      t.at = now + dist * STAG;
      t.g?.classList.toggle("hi", a < 0 ? t.i === DONE : t.i === a);
    });
    if (read) read.textContent = a < 0 ? "" : `Question ${a + 1} of 10`;
    host.classList.toggle("live", a >= 0);
    wake();
  }
  setActive(-1);
  tiles.forEach(draw);

  // pointer: find the tile under it on the plane of the resting tile tops
  function hit(ev: PointerEvent) {
    const box = svg.getBoundingClientRect();
    const sx = vb[0] + ((ev.clientX - box.left) / box.width) * vb[2];
    const sy = vb[1] + ((ev.clientY - box.top) / box.height) * vb[3];
    const z = SLAB + TT;
    const d = sx / (C30 * K),
      s = (sy / K + z) / S30; // x - y and x + y
    const x = (s + d) / 2,
      y = (s - d) / 2;
    let best = -1,
      bd = 1e9;
    tiles.forEach((t) => {
      const dx = Math.min(Math.max(x, t.x0), t.x0 + TW) - x,
        dy = Math.min(Math.max(y, t.y0), t.y0 + TD) - y;
      const dd = dx * dx + dy * dy;
      if (dd < bd) {
        bd = dd;
        best = t.i;
      }
    });
    return bd <= 9 ? best : -1;
  }
  let tour: ReturnType<typeof setTimeout> | undefined,
    touring = false;
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      stopTour();
      setActive(hit(e));
    }
  });
  stage.addEventListener("pointerdown", (e) => {
    stopTour();
    setActive(hit(e));
  });
  stage.addEventListener("pointerleave", () => setActive(-1));

  // the walk: one tile at a time, down the slab and back, for hands that can't hover
  const path = [0, 2, 4, 6, 8, 9, 7, 5, 3, 1, -1];
  function startTour() {
    if (touring || reduce.matches) return;
    touring = true;
    let k = 0;
    const step = () => {
      setActive(path[k % path.length]);
      k++;
      tour = setTimeout(step, path[(k - 1) % path.length] < 0 ? 1600 : 520);
    };
    tour = setTimeout(step, 400);
  }
  function stopTour() {
    touring = false;
    clearTimeout(tour);
  }
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting && !matchMedia("(hover: hover)").matches) startTour();
        else if (!e.isIntersecting) {
          stopTour();
          setActive(-1);
        }
      }),
    { threshold: 0.6 }
  );
  io.observe(stage);
  return () => {
    io.disconnect();
    stopTour();
    cancelAnimationFrame(raf);
    svg.remove();
  };
}
