import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import type { AnimalId, Stage } from "../animals";
import { stillNow } from "../motion";
import { createState, type Engine, type Layout, type LookTarget, type Rect } from "./engine";
import { goTo } from "./moves";
import { build, frame, type Parts } from "./frame";
import { reactions, type Reactions } from "./reactions";

/**
 * The peeking companion as a React component (mascot.js Mascot.init with a layout
 * callback instead of element ids). Put it inside a `relative` host; the SVG covers
 * the host, takes no pointer events, and the engine reads the spots, the text to
 * keep clear of and the bar contents to avoid from `layout()` on every frame, in
 * the host's own coordinates (use `localRect` to measure elements).
 */
export interface CompanionApi extends Reactions {
  goTo(name: string): boolean;
  anchor(): { spot: string; visible: boolean };
}
export interface CompanionProps {
  animal?: AnimalId;
  stage?: Stage;
  layout: () => Layout;
  enabled?: boolean;
  className?: string;
}

/** An element's rect in the host's coordinates, whatever the gallery's frame scale. */
export function localRect(host: HTMLElement, el: Element): Rect {
  const h = host.getBoundingClientRect();
  const k = h.width / host.clientWidth || 1;
  const r = el.getBoundingClientRect();
  return {
    left: (r.left - h.left) / k,
    top: (r.top - h.top) / k,
    right: (r.right - h.left) / k,
    bottom: (r.bottom - h.top) / k,
  };
}

export const Companion = forwardRef<CompanionApi, CompanionProps>(function Companion(
  { animal = "fox", stage = "kit", layout, enabled = true, className },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const api = useRef<CompanionApi | null>(null);
  const uid = useId().replace(/:/g, "");
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const host = svg.parentElement as HTMLElement;
    const E: Engine = {
      M: createState(animal, stage, () => layoutRef.current()),
      svg,
      host: () => ({ w: svg.clientWidth, h: svg.clientHeight }),
      local(r) {
        const h = svg.getBoundingClientRect();
        const k = h.width / svg.clientWidth || 1;
        return {
          left: (r.left - h.left) / k,
          top: (r.top - h.top) / k,
          right: (r.right - h.left) / k,
          bottom: (r.bottom - h.top) / k,
        };
      },
    };
    const P: Parts = build(E, uid);
    E.M.s.peek.x = E.M.s.peek.t = -0.25;
    const R = reactions(E);
    api.current = {
      ...R,
      goTo: (name) => goTo(E, name),
      anchor: () => ({ spot: E.M.spot, visible: E.M.visible }),
    };
    const onMove = (e: PointerEvent) => {
      const p = E.M.cursor;
      const now = performance.now();
      const h = svg.getBoundingClientRect();
      const k = h.width / svg.clientWidth || 1;
      const x = (e.clientX - h.left) / k;
      const y = (e.clientY - h.top) / k;
      if (p) {
        const v = Math.hypot(x - p.x, y - p.y) / Math.max(8, now - p.t);
        E.M.cursorZip = Math.min(1, E.M.cursorZip + v * 0.08);
      }
      E.M.cursor = { x, y, t: now };
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    let last = performance.now();
    const blinkAt = { t: performance.now() + 2500 };
    let raf = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      E.M.reduced = stillNow();
      E.M.enabled = enabledRef.current;
      if (!E.M.enabled) svg.style.display = "none";
      else {
        svg.style.display = "";
        // reduced motion: the springs land at once, so the companion fades in and out instead
        svg.style.opacity = E.M.reduced ? (E.M.visible ? "1" : "0") : "";
        const idle = t - E.M.lastInput;
        if (E.M.visible && E.M.mood === "n" && !E.M.dozing && idle > 45000) R.doze();
        frame(E, P, t, dt, blinkAt);
        // where it is, for checks and the founder's inspector
        svg.dataset.spot = E.M.spot;
        svg.dataset.shown = E.M.visible && E.M.s.peek.x > 0.3 && E.M.s.room.x > 0.3 ? "1" : "";
      }
      raf = requestAnimationFrame(tick);
    };
    const W = svg.clientWidth;
    const H = svg.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const ro = new ResizeObserver(() =>
      svg.setAttribute("viewBox", `0 0 ${svg.clientWidth} ${svg.clientHeight}`)
    );
    ro.observe(svg);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      E.M.timers.forEach(clearTimeout);
      api.current = null;
    };
  }, [animal, stage, uid]);

  useImperativeHandle(
    ref,
    () => ({
      arrive: () => api.current?.arrive(),
      next: () => api.current?.next(),
      picked: () => api.current?.picked(),
      correct: (n: number) => api.current?.correct(n),
      wrong: (e?: LookTarget) => api.current?.wrong(e),
      results: (p: boolean) => api.current?.results(p),
      doze: () => api.current?.doze(),
      look: (t: LookTarget) => api.current?.look(t),
      goTo: (n: string) => api.current?.goTo(n) ?? false,
      anchor: () => api.current?.anchor() ?? { spot: "bar", visible: false },
    }),
    []
  );

  return (
    <svg
      ref={svgRef}
      className={`k-companion ${className ?? ""}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    />
  );
});
