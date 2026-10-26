/* The student's week, in the Hairline line style (our own engine, live/iso.ts). Seven day tiles stand on one
 slab; every event is its own rounded block on its day, and the block's shape says what it is: a live class
 is a tall dark block, the review a marigold one, the workshop a low wide plate, homework a dashed box, the
 Daily 10 a small tile and the full-length test the tallest. At rest today is lit. The day under the pointer
 lifts and its neighbours follow, less and later the farther they are; the words for that day are written
 beside the drawing (WeekCalendar.tsx), never inside it. Without hover it walks the week on its own.
 mountWeek(host, onDay) returns a cleanup; onDay(i) is told each day chosen (-1 is back to rest). */
import { iso, lifter, mk, rrect, toViewBox, type Lift } from "./iso";

export type EventKind = "class" | "review" | "work" | "hw" | "d10" | "test";
export const TODAY = 1;

const N = 7,
  DW = 17,
  DD = 30,
  GAP = 4,
  PAD = 5,
  SLAB = 5,
  TT = 2,
  LIFT = 11;
const SX = PAD * 2 + N * DW + (N - 1) * GAP,
  SY = PAD * 2 + DD;
const H: Record<EventKind, number> = {
  class: 7,
  review: 5,
  work: 2.2,
  hw: 3.4,
  d10: 1.6,
  test: 10,
};
const DEPTH: Record<EventKind, number> = { class: 9, review: 9, work: 11, hw: 7, d10: 5, test: 12 };
const { poly, hullOf, unproj, fit } = iso(2.1);

type Day = Lift & { i: number; x0: number; pts: number[][]; g?: SVGElement; parts: (() => void)[] };

export function mountWeek(
  host: HTMLElement,
  week: EventKind[][],
  onDay: (i: number) => void
): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const stage = host.querySelector<HTMLElement>(".hl");
  if (!stage) return () => {};
  const vb = fit(
    [
      [0, 0, 0],
      [SX, 0, 0],
      [0, SY, 0],
      [SX, SY, 0],
      [0, 0, SLAB + TT + LIFT + 10],
      [SX, 0, SLAB + TT + LIFT + 10],
    ],
    3
  );
  const svg = mk(
    "svg",
    { viewBox: vb.map((n) => n.toFixed(1)).join(" "), "aria-hidden": "true" },
    stage
  ) as SVGSVGElement;

  // the slab the week stands on
  const base = rrect(0, 0, SX, SY, 7);
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
  mk("path", { d: hullOf(base, 0, SLAB), class: "t-side" }, svg);
  mk("path", { d: poly(base, SLAB), class: "t-top" }, svg);

  const days: Day[] = week.map((events, i) => {
    const x0 = PAD + i * (DW + GAP);
    const rest = i === TODAY ? 2.4 : 0;
    return {
      i,
      x0,
      pts: rrect(x0, PAD, x0 + DW, PAD + DD, 3.5),
      z: rest,
      to: rest,
      at: 0,
      from: rest,
      parts: [],
    };
  });
  // back to front: days along +x, and on each day its events from the far end to the near end
  days.forEach((d) => {
    const g = (d.g = mk("g", { class: "t-tile" }, svg));
    const side = mk("path", { class: "t-side" }, g),
      top = mk("path", { class: "t-top" }, g);
    d.parts.push(() => {
      const z = SLAB + d.z;
      side.setAttribute("d", hullOf(d.pts, z, z + TT));
      top.setAttribute("d", poly(d.pts, z + TT));
    });
    let y = PAD + 2.5;
    week[d.i].forEach((kind) => {
      const depth = DEPTH[kind],
        inset = kind === "d10" ? 5 : kind === "work" ? 2.2 : 3;
      const pts = rrect(d.x0 + inset, y, d.x0 + DW - inset, y + depth, kind === "d10" ? 1.4 : 2.2);
      y += depth + 1.6;
      const eg = mk("g", { class: `wk-ev ${kind}` }, g);
      const es = mk("path", { class: "t-side" }, eg),
        et = mk("path", { class: "t-top" }, eg);
      d.parts.push(() => {
        const z = SLAB + TT + d.z;
        es.setAttribute("d", hullOf(pts, z, z + H[kind]));
        et.setAttribute("d", poly(pts, z + H[kind]));
      });
    });
  });
  const draw = () => days.forEach((d) => d.parts.forEach((f) => f()));
  const lift = lifter(days, draw);

  let act = -2;
  function setActive(a: number) {
    if (a === act) return;
    const now = performance.now(),
      from = a >= 0 ? a : Math.max(act, TODAY);
    act = a;
    days.forEach((d) => {
      const dist = Math.abs(d.i - from);
      d.from = d.z;
      d.to =
        a < 0
          ? d.i === TODAY
            ? 2.4
            : 0
          : d.i === a
            ? LIFT
            : Math.max(0, LIFT * (0.42 - dist * 0.14));
      d.at = now + dist * 55;
      d.g?.classList.toggle("hi", a < 0 ? d.i === TODAY : d.i === a);
    });
    onDay(a);
    host.classList.toggle("live", a >= 0);
    lift.wake();
  }
  setActive(-1);
  draw();

  // the day under the pointer, found on the plane of the resting day tops, so a lifted day can't slip away
  function hit(ev: PointerEvent) {
    const [sx, sy] = toViewBox(svg, vb, ev);
    const [x, y] = unproj(sx, sy, SLAB + TT);
    if (y < -6 || y > SY + 6 || x < -4 || x > SX + 4) return -1;
    return Math.max(0, Math.min(N - 1, Math.floor((x - PAD + GAP / 2) / (DW + GAP))));
  }
  let tour: ReturnType<typeof setTimeout> | undefined,
    touring = false;
  const stopTour = () => {
    touring = false;
    clearTimeout(tour);
  };
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
  stage.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && setActive(-1));

  // for hands that can't hover: one day at a time, Monday to Sunday, then a rest
  const path = [0, 1, 2, 3, 4, 5, 6, -1];
  function startTour() {
    if (touring || reduce.matches) return;
    touring = true;
    let k = 0;
    const step = () => {
      if (!touring) return;
      const a = path[k++ % path.length];
      setActive(a);
      tour = setTimeout(step, a < 0 ? 1800 : 1500);
    };
    tour = setTimeout(step, 500);
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
    { threshold: 0.5 }
  );
  io.observe(stage);
  return () => {
    io.disconnect();
    stopTour();
    lift.stop();
    svg.remove();
  };
}
