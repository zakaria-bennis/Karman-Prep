/**
 * Ten: the Daily 10 as a phone-sized slab holding ten question tiles, five rows of two.
 * The tile under the pointer lifts; its neighbours follow it up, less and later the
 * farther they sit, on the 700ms lift curve. At rest the three answered tiles sit a
 * little proud of the slab and the next question is the one bright edge. The read-out
 * names the question under the pointer. The slider is the stagger, in ms.
 */
const {
  Cam,
  fit,
  proj,
  facing,
  rings,
  prism,
  solid,
  put,
  unproj,
  clamp,
  tween,
  tset,
  tval,
  tdone,
  disposer,
  mk,
  pointer,
  register,
  reflect,
  rrect,
} = HL;

const COLS = 2,
  ROWS = 5,
  TW = 22,
  TD = 18,
  GAP = 5,
  PAD = 7,
  SLAB = 6,
  TT = 2.2,
  LIFT = 15;
const SX = PAD * 2 + COLS * TW + (COLS - 1) * GAP,
  SY = PAD * 2 + ROWS * TD + (ROWS - 1) * GAP;
const DONE = 3; // questions already answered today; the next one is lit at rest
const restZ = (i) => (i < DONE ? 2.6 - i * 0.5 : i === DONE ? 1.2 : 0); // a small shelf of done, then flat to come

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.9);
  fit(
    C,
    [
      [0, 0, 0],
      [SX, SY, 0],
      [SX, 0, 0],
      [0, SY, 0],
      [SX, 0, SLAB + TT + LIFT],
      [0, 0, SLAB + TT + LIFT],
    ],
    200,
    170
  );
  const P = proj(C),
    front = facing(C);

  const g = mk("g", {}, svg);
  const [so, si] = rings(0, 0, SX, SY, 9, 1.8);
  reflect(svg, g, P, front, so, 0, 14);
  const slab = solid(g);
  put(slab, prism(P, front, so, si, 0, SLAB));
  // the slab's screen: an inset plate the tiles stand on
  mk(
    "path",
    {
      d:
        "M" +
        rrect(3.2, 3.2, SX - 3.2, SY - 3.2, 6.4, 6)
          .map((q) => P(q.u, q.v, SLAB).join(","))
          .join("L") +
        "Z",
      class: "nf lo",
    },
    g
  );

  const tiles = [];
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
      rings: rings(x0, y0, x0 + TW, y0 + TD, 4, 1.4),
      z: tween(restZ(i)),
    });
  }
  // back to front: ascending x + y of each tile's middle (rule 06)
  tiles
    .slice()
    .sort((a, b) => a.x0 + a.y0 - (b.x0 + b.y0))
    .forEach((t) => {
      t.s = solid(g);
    });

  /** The tile whose resting footprint holds the point, read on the plane of the resting tile tops (rule 01). */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], SLAB + TT);
    let best = -1,
      bd = 1e9;
    tiles.forEach((t) => {
      const dx = clamp(x, t.x0, t.x0 + TW) - x,
        dy = clamp(y, t.y0, t.y0 + TD) - y,
        d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = t.i;
      }
    });
    return bd <= 9 ? best : -1;
  }

  const last = new Map();
  function draw(t, z) {
    if (last.get(t.i) === z) return; // skip unchanged frames (rule 07)
    last.set(t.i, z);
    const [ring, inner] = t.rings;
    put(t.s, prism(P, front, ring, inner, SLAB + z, SLAB + z + TT));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    tiles.forEach((t) => {
      draw(t, tval(t.z, now));
      if (!tdone(t.z, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(),
      from = a >= 0 ? a : Math.max(act, 0);
    act = a;
    const fc = from % COLS,
      fr = Math.floor(from / COLS);
    tiles.forEach((t) => {
      const dist = Math.abs(t.c - fc) + Math.abs(t.r - fr);
      const z = a < 0 ? restZ(t.i) : t.i === a ? LIFT : clamp(LIFT * (0.55 - dist * 0.17), 0, LIFT); // reach floors at zero (rule 03)
      tset(t.z, z, now, dist * stag);
      t.s.sil.classList.toggle("hi", a < 0 ? t.i === DONE : t.i === a);
    });
    read.textContent = a < 0 ? "rest" : "q " + String(a + 1).padStart(2, "0");
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      stag = v;
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "ten",
  means:
    "The Daily 10 as ten tiles on a phone: the question under the pointer lifts, and its neighbours rise after it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[176, 196], [222, 150], [252, 118], null],
  mount,
});
