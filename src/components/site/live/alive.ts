/* Karman's "alive" layer (ported from the approved mock, 2026-10-25), on every marketing page.
   Glints: now and then a slow sweep of light crosses the marigold button, the guarantee's big numbers, the
   orange phone edges and the date card. Each one runs on its own clock (a 7 to 13 s cycle, a random offset),
   so the page never pulses in sync, and each runs only while it is on screen.
   Nearness (desktop with a mouse only): a few things answer the cursor as it comes closer. Product screens and
   phones lean toward it, drawings and price cards catch a soft light where it points, the primary button
   lifts a hair. Nothing follows the cursor across the page, nothing moves until the cursor is near, and
   everything settles back when it leaves. Off entirely with reduced motion. Browser only. */

const GLINT =
  ".btn, .g-promise, .i-big, .datecard, .iphone, .badge b, .i-facts dt, .plan.program .price b";

// reach: how far away (px) the cursor starts to count; kind: what the element does with it (alive.css)
const NEAR: [string, number, string][] = [
  [".turn", 420, "lean"], // the phones beside the features
  [".wide", 360, "lean"], // the laptop screens
  [".i-art > svg, .fig > .hl", 320, "lean"], // the drawings (their inner layer, so the reveal keeps its own transform)
  [".plan, .i-pack, .i-formcard, .datecard, .i-ex > div, .outcomes", 220, "light"],
  [".btn", 140, "lift"],
  [".k-photo .fr", 360, "drift"], // the people photos: the picture shifts a few px against the cursor, like depth
];

type Near = { el: HTMLElement; reach: number; kind: string; cur: number; nx: number; ny: number };

/** Starts the layer for the page that is on screen now. Returns a cleanup. */
export function startAlive(root: ParentNode = document): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const offs: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(
    type: K,
    fn: (e: WindowEventMap[K]) => void,
    target: Window | Document = window
  ) => {
    target.addEventListener(type, fn as EventListener, { passive: true });
    offs.push(() => target.removeEventListener(type, fn as EventListener));
  };

  /* ---------- glints ---------- */
  const seen = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle("glint-on", e.isIntersecting)),
    { rootMargin: "0px 0px -10% 0px" }
  );
  root.querySelectorAll<HTMLElement>(GLINT).forEach((el) => {
    if (!el.classList.contains("glint")) {
      el.classList.add("glint");
      el.style.setProperty("--gc", `${(7 + Math.random() * 6).toFixed(1)}s`); // its own cycle
      el.style.setProperty("--gd", `${(-Math.random() * 12).toFixed(1)}s`); // its own offset
    }
    seen.observe(el);
  });
  offs.push(() => seen.disconnect());

  /* ---------- nearness ---------- */
  const items: Near[] = [];
  if (fine)
    NEAR.forEach(([sel, reach, kind]) =>
      root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (el.closest(".sheet") || el.closest(".wall")) return;
        el.classList.add(`near-${kind}`);
        items.push({ el, reach, kind, cur: 0, nx: 0, ny: 0 });
      })
    );
  let mx = -9999,
    my = -9999,
    raf = 0,
    active = false;
  function frame() {
    raf = 0;
    let moving = false;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) continue;
      const cx = Math.max(r.left, Math.min(mx, r.right)),
        cy = Math.max(r.top, Math.min(my, r.bottom));
      const d = Math.hypot(mx - cx, my - cy); // 0 when the cursor is over it
      const want = active ? Math.max(0, 1 - d / it.reach) : 0;
      const eased = want * want * (3 - 2 * want); // smoothstep: gentle at the edge of its reach
      it.cur += (eased - it.cur) * 0.12;
      const tx = active
        ? Math.max(-1, Math.min(1, (mx - (r.left + r.width / 2)) / (r.width / 2 + it.reach)))
        : 0;
      const ty = active
        ? Math.max(-1, Math.min(1, (my - (r.top + r.height / 2)) / (r.height / 2 + it.reach)))
        : 0;
      it.nx += (tx - it.nx) * 0.12;
      it.ny += (ty - it.ny) * 0.12;
      const s = it.el.style;
      s.setProperty("--near", it.cur.toFixed(3));
      s.setProperty("--nx", it.nx.toFixed(3));
      s.setProperty("--ny", it.ny.toFixed(3));
      s.setProperty("--mx", `${(((mx - r.left) / r.width) * 100).toFixed(1)}%`);
      s.setProperty("--my", `${(((my - r.top) / r.height) * 100).toFixed(1)}%`);
      if (it.kind === "drift") {
        const img = it.el.firstElementChild as HTMLElement | null;
        img?.style.setProperty("--px", (-it.nx * it.cur * 12).toFixed(2));
        img?.style.setProperty("--py", (-it.ny * it.cur * 9).toFixed(2));
      }
      if (Math.abs(eased - it.cur) > 0.002 || Math.abs(tx - it.nx) > 0.002) moving = true;
    }
    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => (raf ||= requestAnimationFrame(frame));
  if (fine && items.length) {
    on("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      active = true;
      kick();
    });
    on(
      "pointerleave",
      () => {
        active = false;
        kick();
      },
      document
    );
    on("scroll", kick);
  }

  /* ---------- photos: one shine on first view, and a slow drift inside the frame as the page scrolls ---------- */
  const photoSeen = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("shine");
        photoSeen.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -15% 0px" }
  );
  root.querySelectorAll(".k-photo").forEach((f) => photoSeen.observe(f));
  offs.push(() => photoSeen.disconnect());
  const photos = [...root.querySelectorAll<HTMLImageElement>(".k-photo img")];
  let praf = 0;
  function drift() {
    praf = 0;
    for (const img of photos) {
      const r = img.parentElement?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > innerHeight) continue;
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1 to 1 across the screen
      img.style.setProperty("--sy", (t * -26).toFixed(2));
    }
  }
  if (photos.length) {
    drift();
    on("scroll", () => (praf ||= requestAnimationFrame(drift)));
  }

  return () => {
    offs.forEach((off) => off());
    cancelAnimationFrame(raf);
    cancelAnimationFrame(praf);
  };
}
