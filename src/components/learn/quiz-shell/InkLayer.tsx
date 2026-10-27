"use client";
// The pencil's surface for one pane (spec: Pencil). Strokes are stored against what they were
// drawn on (word, figure, choice) and placed again on every layout change.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toAnchored, toPane } from "@/lib/quiz/ink/anchor";
import { enclosedBadge } from "@/lib/quiz/ink/closed-stroke";
import { capStroke, simplifyStroke } from "@/lib/quiz/ink/document";
import { segmentDistance } from "@/lib/quiz/ink/erase";
import { nextRoutingState, route, TapClassifier, type PointerKind } from "@/lib/quiz/ink/routing";
import type { InkPoint, InkStroke } from "@/lib/quiz/ink/types";
import styles from "./ink.module.css";
import { createDomLayout, hitTest } from "./dom-anchors";
import { usePencil } from "./pencil-context";

const BASE_WIDTH = 2.5;
const ERASE_RADIUS = 12;
let strokeSerial = Date.now();

type Live = {
  id: number;
  kind: PointerKind;
  points: InkPoint[];
  hit: ReturnType<typeof hitTest>;
  classifier: TapClassifier;
};

function widthAt(p: InkPoint): number {
  return p.p === undefined ? BASE_WIDTH : BASE_WIDTH * (0.6 + 0.8 * p.p);
}

function paint(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  src: InkPoint[],
  color: string
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, widthAt(src[0]) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = widthAt(src[i]);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

export function InkLayer({ pane }: { pane: "passage" | "question" }) {
  const pencil = usePencil();
  const holder = useRef<HTMLDivElement>(null);
  const finished = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const current = useRef<Live | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const ctxRef = useRef(pencil);
  ctxRef.current = pencil;
  const [tick, setTick] = useState(0);
  const [info, setInfo] = useState({ strokes: 0, first: "", lastPen: "" });

  const paneEl = () => holder.current?.parentElement as HTMLElement | null;
  const colour = (n: number) =>
    getComputedStyle(paneEl() ?? document.documentElement)
      .getPropertyValue(`--quiz-pen-${n}`)
      .trim() || "currentColor";

  // Size the canvases to the pane and redraw when anything reflows.
  useLayoutEffect(() => {
    const el = paneEl();
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    el.querySelectorAll("[data-ink-block],[data-ink-figure],[data-ink-choice]").forEach((b) =>
      ro.observe(b)
    );
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Draw finished ink.
  useLayoutEffect(() => {
    const el = paneEl();
    const canvas = finished.current;
    const top = live.current;
    if (!el || !canvas || !top || !pencil) return;
    const dpr = window.devicePixelRatio || 1;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    for (const c of [canvas, top]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const layout = createDomLayout(el);
    const o = el.getBoundingClientRect();
    let count = 0;
    let first = "";
    let lastPen = "";
    for (const s of pencil.ink.strokes) {
      const placed = toPane(s, layout);
      if (!placed) continue;
      if (!count)
        first = `${(o.left + placed[0].x).toFixed(1)},${(o.top + placed[0].y).toFixed(1)}`;
      count++;
      lastPen = String(s.pen);
      paint(ctx, placed, s.points, colour(s.pen));
    }
    setInfo((old) =>
      old.strokes === count && old.first === first && old.lastPen === lastPen
        ? old
        : { strokes: count, first, lastPen }
    );
  }, [pencil?.ink, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer handling lives on the pane so the content underneath keeps its own events.
  useEffect(() => {
    const found = paneEl();
    if (!found) return;
    const el: HTMLElement = found;
    const scroller = el.closest("[data-quiz-scroll]") as HTMLElement | null;
    const local = (e: PointerEvent): InkPoint => {
      const o = el.getBoundingClientRect();
      const p: InkPoint = { x: e.clientX - o.left, y: e.clientY - o.top };
      if (e.pointerType === "pen" && e.pressure > 0) p.p = e.pressure;
      return p;
    };
    const liveCtx = () => {
      const c = live.current!.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c;
    };
    const clearLive = () => {
      const c = live.current;
      c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    };
    const suppressNextClick = () => {
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    };

    function down(e: PointerEvent) {
      const p = ctxRef.current;
      if (!p || (!e.isPrimary && e.pointerType !== "touch")) return;
      const kind = e.pointerType as PointerKind;
      if (kind === "touch") touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if ((e.target as Element).closest("input, textarea, select, [contenteditable]")) return;
      const sample = {
        kind,
        id: e.pointerId,
        width: e.width,
        height: e.height,
        touchCount: kind === "touch" ? touches.current.size : 1,
      };
      p.routing.current = nextRoutingState(p.routing.current, sample);
      if (kind === "touch" && touches.current.size > 1) {
        // A second finger: this is a scroll, never a stroke.
        current.current = null;
        clearLive();
        return;
      }
      if (route(p.routing.current, sample) !== "draw") return;
      if (kind !== "touch") e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      const classifier = new TapClassifier();
      classifier.down(e.clientX, e.clientY, e.timeStamp);
      current.current = {
        id: e.pointerId,
        kind,
        points: [local(e)],
        hit: hitTest(el, e.target as Element, e.clientX, e.clientY),
        classifier,
      };
      if (kind === "pen") p.routing.current = { ...p.routing.current, activePenId: e.pointerId };
      p.setDrawing(true);
    }

    function move(e: PointerEvent) {
      const p = ctxRef.current;
      if (!p) return;
      if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
        const prev = touches.current.get(e.pointerId)!;
        touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.current.size > 1 && p.pencilOn && !p.routing.current.penSeen && scroller) {
          scroller.scrollTop -= (e.clientY - prev.y) / touches.current.size;
          return;
        }
      }
      const s = current.current;
      if (!s || s.id !== e.pointerId) {
        if (e.pointerType === "pen" && e.buttons === 0 && !current.current) {
          // Pencil hover: preview where ink will land.
          const c = liveCtx();
          clearLive();
          const pt = local(e);
          c.fillStyle = colour(p.pen);
          c.globalAlpha = 0.5;
          c.beginPath();
          c.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
        }
        return;
      }
      const events = e.getCoalescedEvents?.() ?? [e];
      for (const ev of events.length ? events : [e]) s.points.push(local(ev));
      const kind = s.classifier.move(e.clientX, e.clientY);
      if (kind === "stroke") {
        const c = liveCtx();
        clearLive();
        const predicted = (e.getPredictedEvents?.() ?? []).map(local);
        const pts = [...s.points, ...predicted];
        if (p.tool === "eraser") {
          c.globalAlpha = 0.35;
          paint(
            c,
            pts,
            pts.map(() => ({ x: 0, y: 0 })),
            colour(1)
          );
          c.globalAlpha = 1;
        } else paint(c, pts, pts, colour(p.pen));
      }
    }

    function up(e: PointerEvent) {
      touches.current.delete(e.pointerId);
      const p = ctxRef.current;
      const s = current.current;
      if (!p || !s || s.id !== e.pointerId) return;
      current.current = null;
      clearLive();
      if (s.kind === "pen") p.routing.current = { ...p.routing.current, activePenId: null };
      p.setDrawing(false);
      if (e.type === "pointercancel") return;
      if (s.classifier.up(e.timeStamp) === "tap") {
        // A tap activates what is underneath. Mouse and finger taps click natively.
        if (s.kind === "pen") {
          const target = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest("button, [role=radio], a, label");
          (target as HTMLElement | null)?.click();
        }
        return;
      }
      suppressNextClick();
      const layout = createDomLayout(el);
      if (p.tool === "eraser") {
        const removed: InkStroke[] = [];
        for (const stroke of p.ink.strokes) {
          const placed = toPane(stroke, layout);
          if (!placed) continue;
          const hit = s.points.some((q) =>
            placed.some(
              (pt, i) => segmentDistance(q, placed[Math.max(0, i - 1)], pt) <= ERASE_RADIUS
            )
          );
          if (hit) removed.push(stroke);
        }
        if (removed.length) p.apply({ kind: "erase", removed });
        return;
      }
      const points = simplifyStroke(capStroke(s.points));
      const anchored = toAnchored(s.hit, layout, points);
      strokeSerial = Math.max(strokeSerial + 1, ...p.ink.strokes.map((x) => x.id + 1));
      p.apply({ kind: "add", stroke: { id: strokeSerial, pen: p.pen, ...anchored } });
      if (p.allowPick) {
        const o = el.getBoundingClientRect();
        el.querySelectorAll("[data-ink-choice]").forEach((choice) => {
          const badge = choice.querySelector("[data-choice-badge]");
          if (!badge) return;
          const r = badge.getBoundingClientRect();
          const box = {
            left: r.left - o.left,
            top: r.top - o.top,
            width: r.width,
            height: r.height,
          };
          if (enclosedBadge(points, box)) p.offerPick(choice.getAttribute("data-ink-choice")!);
        });
      }
    }

    function touchStart(e: TouchEvent) {
      // Apple Pencil strokes never scroll; fingers keep native scrolling.
      for (const t of Array.from(e.changedTouches))
        if ((t as Touch & { touchType?: string }).touchType === "stylus") {
          e.preventDefault();
          return;
        }
    }

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const leave = (e: PointerEvent) => e.pointerType === "pen" && !current.current && clearLive();
    el.addEventListener("pointerleave", leave);
    el.addEventListener("touchstart", touchStart, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("touchstart", touchStart);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={holder}
      className={styles.layer}
      aria-hidden="true"
      data-ink-layer={pane}
      data-strokes={info.strokes}
      data-first={info.first || undefined}
      data-last-pen={info.lastPen || undefined}
    >
      <canvas ref={finished} className={styles.canvas} />
      <canvas ref={live} className={styles.canvas} />
    </div>
  );
}
