// The guarantee drawing (GuaranteeDeal.tsx), once it is on screen: the score line draws itself when it comes
// into view and a dot walks it; pointing at an ending (or tapping it) lights that one, sends the dot down it
// and reads it out; the stage leans a few px toward the pointer. Every ending is always written on the page,
// so nothing here is needed to read it.

const END_Y = [70, 200, 330];

type Walker = { pick: number };

function wire(el: HTMLElement): () => void {
  const main = el.querySelector<SVGPathElement>(".gx-main");
  const dot = el.querySelector<SVGCircleElement>(".gx-dot");
  const stage = el.querySelector<HTMLElement>(".gx-stage");
  const list = el.querySelector<HTMLElement>(".gx-ends");
  if (!main || !dot || !stage || !list) return () => {};
  const ends = [...el.querySelectorAll<SVGPathElement>(".gx-branch")];
  const groups = [...el.querySelectorAll<SVGGElement>(".gx-end")];
  const items = [...list.querySelectorAll<HTMLLIElement>("li")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ac = new AbortController();
  const signal = ac.signal;
  const state: Walker = { pick: -1 };
  let raf = 0;
  let t0 = 0;
  let route: SVGPathElement[] = [];

  const place = (p: SVGPathElement, k: number) => {
    const pt = p.getPointAtLength(p.getTotalLength() * k);
    dot.setAttribute("cx", pt.x.toFixed(1));
    dot.setAttribute("cy", pt.y.toFixed(1));
  };
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const walk = (paths: SVGPathElement[], ms: number) => {
    cancelAnimationFrame(raf);
    route = paths;
    t0 = performance.now();
    const step = (now: number) => {
      // a frame's timestamp can precede the performance.now() taken when the walk began: clamp, or the
      // index below goes negative and the dot has no path to sit on
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      const span = ease(k) * route.length;
      const i = Math.max(0, Math.min(route.length - 1, Math.floor(span)));
      place(route[i], Math.min(1, span - i));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const go = (i: number) => {
    const e = ends[i];
    if (reduce || i === -2) return place(e ?? main, 1);
    if (i < 0) walk([main], 2600);
    else if (e) walk([e], 900);
  };
  const choose = (i: number) => {
    if (i === state.pick) return;
    state.pick = i;
    el.dataset.pick = String(i);
    groups.forEach((g, k) => g.classList.toggle("on", k === i));
    items.forEach((li, k) => {
      li.classList.toggle("on", k === i);
      li.querySelector("button")?.setAttribute("aria-pressed", String(k === i));
    });
    if (el.classList.contains("drawn")) go(i < 0 ? -2 : i);
  };

  // draw on arrival, then let the dot walk the line; watch the line itself, since the whole section is
  // taller than a phone's screen
  const io = new IntersectionObserver(
    (es) => {
      if (!es[0].isIntersecting) return;
      el.classList.add("drawn");
      place(main, 0);
      setTimeout(() => go(state.pick), reduce ? 0 : 500);
      io.disconnect();
    },
    { threshold: 0.3 }
  );
  io.observe(el.querySelector(".gx-board") ?? el);

  // the stage leans a few px toward the pointer, so the drawing feels held, not printed
  stage.addEventListener(
    "pointermove",
    (ev) => {
      if (ev.pointerType !== "mouse") return;
      const b = stage.getBoundingClientRect();
      const x = (ev.clientX - b.left) / b.width - 0.5,
        y = (ev.clientY - b.top) / b.height - 0.5;
      stage.style.setProperty("--lx", `${(x * 10).toFixed(1)}px`);
      stage.style.setProperty("--ly", `${(y * 8).toFixed(1)}px`);
      // the ending nearest the pointer, once it is past the split
      if (x > 0) {
        const sy = ((ev.clientY - b.top) / b.height) * 400;
        let best = 0;
        END_Y.forEach((y0, k) => Math.abs(sy - y0) < Math.abs(sy - END_Y[best]) && (best = k));
        choose(best);
      }
    },
    { signal }
  );
  stage.addEventListener(
    "pointerleave",
    () => {
      stage.style.setProperty("--lx", "0px");
      stage.style.setProperty("--ly", "0px");
      choose(-1);
    },
    { signal }
  );
  items.forEach((li, k) => {
    li.addEventListener("pointerenter", () => choose(k), { signal });
    li.querySelector("button")?.addEventListener("click", () => choose(state.pick === k ? -1 : k), {
      signal,
    });
  });
  list.addEventListener("pointerleave", () => choose(-1), { signal });

  return () => {
    ac.abort();
    io.disconnect();
    cancelAnimationFrame(raf);
  };
}

export function startGuarantee(root: ParentNode): () => void {
  const offs = [...root.querySelectorAll<HTMLElement>(".gx")].map(wire);
  return () => offs.forEach((off) => off());
}
