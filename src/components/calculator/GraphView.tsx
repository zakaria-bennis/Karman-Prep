"use client";
import { useEffect, useRef, useState } from "react";
import { Home, Minus, Plus, Wrench } from "lucide-react";
import type { Plot } from "@/lib/calculator/scene";
import type { Settings } from "@/lib/calculator/types";
import { drawGraph, fromPixel, toPixel, type Size } from "@/lib/calculator/plot";
import { derivative, roots } from "@/lib/calculator/numerics";
import { useTheme } from "@/components/shared/ThemeProvider";
import styles from "./engine.module.css";
export function GraphView({
  plots,
  settings,
  onSettings,
  dark,
  onPoint,
  onOpenSettings,
}: {
  plots: Plot[];
  settings: Settings;
  onSettings: (s: Settings) => void;
  dark: boolean;
  onPoint: (id: string, x: number, y: number) => void;
  onOpenSettings: () => void;
}) {
  const { palette } = useTheme();
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size>({ width: 500, height: 440 });
  const [readout, setReadout] = useState<{ x: number; y: number; label: string } | null>(null);
  const pointers = useRef(new Map<number, [number, number]>());
  const drag = useRef<{
    last: [number, number];
    start: [number, number];
    point?: string;
    moved: boolean;
  }>();
  const latest = useRef({ settings, onSettings });
  latest.current = { settings, onSettings };
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width < 1 || height < 1) return;
      setSize({ width, height });
      const { settings: s, onSettings: update } = latest.current,
        cy = (s.ymin + s.ymax) / 2,
        half = (((s.xmax - s.xmin) / 2) * height) / width;
      if (Math.abs(s.ymax - s.ymin - 2 * half) > 1e-6)
        update({ ...s, ymin: cy - half, ymax: cy + half });
    });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const dpr = Math.min(devicePixelRatio || 1, 3);
    node.width = Math.round(size.width * dpr);
    node.height = Math.round(size.height * dpr);
    const ctx = node.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawGraph(ctx, plots, settings, size, dark, palette);
    if (readout) {
      const [x, y] = toPixel(readout.x, readout.y, settings, size);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = dark ? "#ffffff" : "#222222";
      ctx.fill();
    }
  }, [plots, settings, size, dark, readout, palette]);
  function zoom(factor: number, anchor: [number, number] = [size.width / 2, size.height / 2]) {
    const s = latest.current.settings,
      [x, y] = fromPixel(...anchor, s, size);
    const span = (s.xmax - s.xmin) * factor;
    if (span < 1e-8 || span > 1e12) return;
    onSettings({
      ...s,
      xmin: x + (s.xmin - x) * factor,
      xmax: x + (s.xmax - x) * factor,
      ymin: y + (s.ymin - y) * factor,
      ymax: y + (s.ymax - y) * factor,
    });
  }
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = node.getBoundingClientRect();
      zoomRef.current(Math.exp(Math.max(-1, Math.min(1, e.deltaY * 0.002))), [
        e.clientX - r.left,
        e.clientY - r.top,
      ]);
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  function home() {
    const half = (10 * size.height) / size.width;
    onSettings({ ...settings, xmin: -10, xmax: 10, ymin: -half, ymax: half });
    setReadout(null);
  }
  function inspect(px: number, py: number) {
    const [x] = fromPixel(px, py, settings, size);
    let best: { x: number; y: number; label: string } | null = null,
      bestDistance = 36;
    const consider = (a: number, b: number, label: string) => {
      const [sx, sy] = toPixel(a, b, settings, size),
        d = Math.hypot(sx - px, sy - py);
      if (d < bestDistance) {
        bestDistance = d;
        best = { x: a, y: b, label };
      }
    };
    for (const p of plots) {
      if (p.kind === "points") p.points?.forEach(([a, b]) => consider(a, b, "Point"));
      if (p.kind === "function" && p.fn) {
        const f = (x: number) => p.fn!(x);
        consider(x, f(x), "Point on curve");
        const features: [number, number, string][] = [[0, f(0), "y-intercept"]];
        roots(f, settings.xmin, settings.xmax).forEach((r) => features.push([r, 0, "x-intercept"]));
        roots((x) => derivative(f, x), settings.xmin, settings.xmax).forEach((r) =>
          features.push([r, f(r), "Turning point"])
        );
        for (const other of plots.filter((q) => q !== p && q.kind === "function" && q.fn))
          roots((x) => f(x) - other.fn!(x), settings.xmin, settings.xmax).forEach((r) =>
            features.push([r, f(r), "Intersection"])
          );
        for (const [a, b, label] of features) {
          const [sx, sy] = toPixel(a, b, settings, size);
          if (Math.hypot(sx - px, sy - py) < 22) {
            bestDistance = 30;
            consider(a, b, label);
          }
        }
      }
    }
    setReadout(best);
  }
  return (
    <div ref={host} className={styles.graph}>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={`Graph. x from ${settings.xmin.toPrecision(4)} to ${settings.xmax.toPrecision(4)}. ${plots.length} plots. Arrow keys pan; plus and minus zoom; Home resets.`}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoom(0.8);
          } else if (e.key === "-") {
            e.preventDefault();
            zoom(1.25);
          } else if (e.key === "Home") {
            e.preventDefault();
            home();
          } else if (e.key.startsWith("Arrow")) {
            e.preventDefault();
            const dx =
                (settings.xmax - settings.xmin) *
                0.1 *
                (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0),
              dy =
                (settings.ymax - settings.ymin) *
                0.1 *
                (e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0);
            onSettings({
              ...settings,
              xmin: settings.xmin + dx,
              xmax: settings.xmax + dx,
              ymin: settings.ymin + dy,
              ymax: settings.ymax + dy,
            });
          }
        }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect(),
            pos: [number, number] = [e.clientX - r.left, e.clientY - r.top];
          pointers.current.set(e.pointerId, pos);
          e.currentTarget.setPointerCapture(e.pointerId);
          let point: string | undefined;
          for (const p of plots)
            if (p.draggable && p.points?.[0]) {
              const q = toPixel(...p.points[0], settings, size);
              if (Math.hypot(q[0] - pos[0], q[1] - pos[1]) < 18) point = p.id;
            }
          drag.current = { last: pos, start: pos, point, moved: false };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId) || !drag.current) return;
          const r = e.currentTarget.getBoundingClientRect(),
            pos: [number, number] = [e.clientX - r.left, e.clientY - r.top],
            before = [...pointers.current.values()];
          pointers.current.set(e.pointerId, pos);
          const after = [...pointers.current.values()];
          if (after.length === 2) {
            const distance = (a: [number, number][]) =>
              Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
            const old = distance(before),
              next = distance(after);
            if (next > 5 && old > 5)
              zoom(old / next, [(after[0][0] + after[1][0]) / 2, (after[0][1] + after[1][1]) / 2]);
            drag.current.moved = true;
            return;
          }
          const d = drag.current,
            s = latest.current.settings;
          if (Math.hypot(pos[0] - d.start[0], pos[1] - d.start[1]) > 3) d.moved = true;
          if (d.point) {
            const [x, y] = fromPixel(...pos, s, size);
            onPoint(d.point, Number(x.toPrecision(5)), Number(y.toPrecision(5)));
          } else {
            const dx = ((d.last[0] - pos[0]) / size.width) * (s.xmax - s.xmin),
              dy = ((pos[1] - d.last[1]) / size.height) * (s.ymax - s.ymin);
            onSettings({
              ...s,
              xmin: s.xmin + dx,
              xmax: s.xmax + dx,
              ymin: s.ymin + dy,
              ymax: s.ymax + dy,
            });
          }
          d.last = pos;
        }}
        onPointerUp={(e) => {
          if (drag.current && !drag.current.moved) inspect(...drag.current.last);
          pointers.current.delete(e.pointerId);
          if (!pointers.current.size) drag.current = undefined;
          else if (drag.current) drag.current.last = [...pointers.current.values()][0];
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          drag.current = undefined;
        }}
      />
      <div className={styles.graphTools}>
        <button title="Graph settings" aria-label="Graph settings" onClick={onOpenSettings}>
          <Wrench size={19} />
        </button>
        <button title="Zoom in" aria-label="Zoom in" onClick={() => zoom(0.8)}>
          <Plus size={21} />
        </button>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => zoom(1.25)}>
          <Minus size={21} />
        </button>
        <button title="Default viewport" aria-label="Default viewport" onClick={home}>
          <Home size={18} />
        </button>
      </div>
      {readout && (
        <button
          className={styles.readout}
          onClick={() => setReadout(null)}
          aria-label="Dismiss point coordinates"
        >
          {readout.label}
          <br />({Number(readout.x.toPrecision(6))}, {Number(readout.y.toPrecision(6))})
        </button>
      )}
    </div>
  );
}
