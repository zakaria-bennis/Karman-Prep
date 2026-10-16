import type { Plot } from "./scene";
import type { Settings } from "./types";
export interface Size {
  width: number;
  height: number;
}
export function toPixel(x: number, y: number, s: Settings, size: Size): [number, number] {
  return [
    ((x - s.xmin) / (s.xmax - s.xmin)) * size.width,
    ((s.ymax - y) / (s.ymax - s.ymin)) * size.height,
  ];
}
export function fromPixel(x: number, y: number, s: Settings, size: Size): [number, number] {
  return [
    s.xmin + (x / size.width) * (s.xmax - s.xmin),
    s.ymax - (y / size.height) * (s.ymax - s.ymin),
  ];
}
export function tickStep(span: number, pixels: number): number {
  const target = span / (pixels / 65),
    base = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((n) => n * base).find((n) => n >= target) ?? base * 10;
}
export function sampleCurve(plot: Plot, s: Settings, size: Size): [number, number][][] {
  const paths: [number, number][][] = [];
  let path: [number, number][] = [];
  const count = Math.min(1600, Math.max(400, Math.ceil(size.width * 1.3)));
  for (let i = 0; i <= count; i++) {
    const t =
      plot.kind === "parametric"
        ? (plot.range?.[0] ?? 0) + (i / count) * ((plot.range?.[1] ?? 1) - (plot.range?.[0] ?? 0))
        : s.xmin + (i / count) * (s.xmax - s.xmin);
    const [x, y] = plot.xy?.(t) ?? [t, plot.fn?.(t) ?? NaN],
      point = toPixel(x, y, s, size);
    const previous = path.at(-1);
    if (
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      Math.abs(point[1]) > size.height * 20 ||
      (previous && Math.abs(point[1] - previous[1]) > size.height * 1.5)
    ) {
      if (path.length > 1) paths.push(path);
      path = [];
    } else path.push(point);
  }
  if (path.length > 1) paths.push(path);
  return paths;
}
export function drawGraph(
  ctx: CanvasRenderingContext2D,
  plots: Plot[],
  s: Settings,
  size: Size,
  dark: boolean
) {
  const { width: w, height: h } = size;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = dark ? "#171611" : "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const [ox, oy] = toPixel(0, 0, s, size),
    sx = tickStep(s.xmax - s.xmin, w),
    sy = tickStep(s.ymax - s.ymin, h);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  ctx.lineWidth = 1;
  if (s.grid === "square") {
    for (const minor of [true, false]) {
      ctx.strokeStyle = dark ? (minor ? "#25231d" : "#39352c") : minor ? "#f0f0f0" : "#dedede";
      const xs = sx / (minor ? 5 : 1),
        ys = sy / (minor ? 5 : 1);
      for (let x = Math.ceil(s.xmin / xs) * xs; x <= s.xmax; x += xs) {
        const [px] = toPixel(x, 0, s, size);
        line(px, 0, px, h);
      }
      for (let y = Math.ceil(s.ymin / ys) * ys; y <= s.ymax; y += ys) {
        const [, py] = toPixel(0, y, s, size);
        line(0, py, w, py);
      }
    }
  } else if (s.grid === "polar") {
    ctx.strokeStyle = dark ? "#39352c" : "#dedede";
    const max = Math.hypot(
      Math.max(Math.abs(s.xmin), Math.abs(s.xmax)),
      Math.max(Math.abs(s.ymin), Math.abs(s.ymax))
    );
    const step = tickStep(max, Math.max(w, h));
    for (let r = step; r <= max; r += step) {
      ctx.beginPath();
      ctx.ellipse(
        ox,
        oy,
        (r / (s.xmax - s.xmin)) * w,
        (r / (s.ymax - s.ymin)) * h,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const [x, y] = toPixel(max * Math.cos(a), max * Math.sin(a), s, size);
      line(ox, oy, x, y);
    }
  }
  if (s.axes) {
    ctx.strokeStyle = dark ? "#aaa18e" : "#777777";
    ctx.lineWidth = 1.2;
    line(ox, 0, ox, h);
    line(0, oy, w, oy);
  }
  if (s.labels) {
    ctx.fillStyle = dark ? "#c9c1b0" : "#555555";
    ctx.font = "11px Arial";
    const label = (n: number) => Number(n.toPrecision(5)).toString();
    for (let x = Math.ceil(s.xmin / sx) * sx; x < s.xmax; x += sx) {
      if (Math.abs(x) < sx / 10) continue;
      const [px] = toPixel(x, 0, s, size);
      const halfLabel = ctx.measureText(label(x)).width / 2;
      if (px < halfLabel + 2 || px > w - halfLabel - 2) continue;
      ctx.textAlign = "center";
      ctx.fillText(label(x), px, Math.min(h - 5, Math.max(14, oy + 16)));
    }
    for (let y = Math.ceil(s.ymin / sy) * sy; y < s.ymax; y += sy) {
      if (Math.abs(y) < sy / 10) continue;
      const [, py] = toPixel(0, y, s, size);
      if (py < 8 || py > h - 8) continue;
      ctx.textAlign = "right";
      ctx.fillText(label(y), Math.max(24, Math.min(w - 5, ox - 7)), py + 4);
    }
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  for (const plot of plots) {
    ctx.strokeStyle = plot.color;
    ctx.fillStyle = plot.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (plot.kind === "function" || plot.kind === "parametric") {
      for (const path of sampleCurve(plot, s, size)) {
        ctx.beginPath();
        path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    } else if (plot.kind === "points") {
      for (const [x, y] of plot.points ?? []) {
        const [px, py] = toPixel(x, y, s, size);
        ctx.beginPath();
        ctx.arc(px, py, plot.draggable ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dark ? "#171611" : "white";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else if (plot.kind === "vertical" || plot.kind === "horizontal") {
      for (const [x, y] of plot.points ?? []) {
        const [px, py] = toPixel(x, y, s, size);
        if (plot.kind === "vertical") line(px, 0, px, h);
        else line(0, py, w, py);
      }
    } else if (plot.fn) drawImplicit(ctx, plot, s, size);
  }
  ctx.restore();
}
function drawImplicit(ctx: CanvasRenderingContext2D, plot: Plot, s: Settings, size: Size) {
  const step = 8,
    nx = Math.ceil(size.width / step),
    ny = Math.ceil(size.height / step);
  const grid = Array.from({ length: ny + 1 }, (_, j) =>
    Array.from({ length: nx + 1 }, (_, i) => {
      const [x, y] = fromPixel(i * step, j * step, s, size);
      return plot.fn!(x, y);
    })
  );
  ctx.lineWidth = 2;
  ctx.setLineDash(plot.inequality === "<" || plot.inequality === ">" ? [6, 4] : []);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const values = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]],
        corners = [
          [i * step, j * step],
          [(i + 1) * step, j * step],
          [(i + 1) * step, (j + 1) * step],
          [i * step, (j + 1) * step],
        ];
      if (values.some((v) => !Number.isFinite(v))) continue;
      if (plot.inequality) {
        const value = values.reduce((a, b) => a + b, 0) / 4,
          inside = plot.inequality.startsWith("<") ? value <= 0 : value >= 0;
        if (inside) {
          ctx.globalAlpha = 0.16;
          ctx.fillRect(i * step, j * step, step + 0.5, step + 0.5);
          ctx.globalAlpha = 1;
        }
      }
      const crossings: number[][] = [];
      for (let k = 0; k < 4; k++) {
        const next = (k + 1) % 4,
          a = values[k],
          b = values[next];
        if (a < 0 !== b < 0) {
          const t = a / (a - b);
          crossings.push([
            corners[k][0] + t * (corners[next][0] - corners[k][0]),
            corners[k][1] + t * (corners[next][1] - corners[k][1]),
          ]);
        }
      }
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        ctx.beginPath();
        ctx.moveTo(crossings[k][0], crossings[k][1]);
        ctx.lineTo(crossings[k + 1][0], crossings[k + 1][1]);
        ctx.stroke();
      }
    }
  ctx.setLineDash([]);
}
