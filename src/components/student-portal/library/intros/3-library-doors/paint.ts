/*
 * Intro 3's hall and doors, composed with Karman's painting colors (studio.ts) and then painted as
 * brushwork (painterly.ts): the stone hall of a great old library with a round rose window high
 * between two tall arched doorways, wall lamps and a timber floor. Over each doorway a carved
 * panel shows its subject (a compass rosette for Math, an open book for Reading and Writing).
 * The doors are oak planks with iron straps and ring handles, painted as one picture and split
 * into their two leaves.
 */
import { LIGHT, type TimeOfDay } from "@/lib/painting/light";
import { ctx2d, makeCanvas, mix, rgb, type Color } from "@/lib/painting/noise";
import { Studio } from "@/lib/painting/studio";
import type { Layout, Slug } from "@/lib/painting/library/seam";

const TAU = Math.PI * 2;

export interface DoorAt {
  /** Center across, half width (fractions of width); spring line and sill (fractions of height). */
  cx: number;
  hw: number;
  top: number;
  bottom: number;
}

export function doorsFor(layout: Layout): Record<Slug, DoorAt> {
  return layout === "wide"
    ? {
        math: { cx: 0.37, hw: 0.09, top: 0.34, bottom: 0.92 },
        "reading-writing": { cx: 0.67, hw: 0.09, top: 0.34, bottom: 0.92 },
      }
    : {
        math: { cx: 0.29, hw: 0.17, top: 0.36, bottom: 0.86 },
        "reading-writing": { cx: 0.71, hw: 0.17, top: 0.36, bottom: 0.86 },
      };
}

function studio(w: number, h: number, time: TimeOfDay, seed: number) {
  const L = LIGHT[time] ?? LIGHT.day;
  return new Studio(w, h, { ...L, sunAt: [0.5, 0.1] }, seed);
}

/** The hall, with the doorways painted dark (the doors and the scene beyond cover them). */
export function renderHall(
  time: TimeOfDay,
  aspect: number,
  doors: Record<Slug, DoorAt>
): HTMLCanvasElement {
  const w = 640;
  const h = Math.max(200, Math.round(w * aspect));
  const k = studio(w, h, time, 77);
  const { g, C, L } = k;
  const night = time === "night";
  const stone: Color = mix(mix([168, 150, 128], C.lit, 0.15), C.deep, 0.15 + L.dark * 0.55);
  const mortar = mix(stone, C.deep, 0.35);
  /* The wall: stone blocks in courses. */
  g.fillStyle = rgb(stone);
  g.fillRect(0, 0, w, h);
  const course = h * 0.045;
  for (let row = 0; row * course < h; row++) {
    const off = row % 2 ? course * 1.1 : 0;
    g.strokeStyle = rgb(mortar, 0.6);
    g.lineWidth = Math.max(1, h * 0.003);
    g.beginPath();
    g.moveTo(0, row * course);
    g.lineTo(w, row * course);
    g.stroke();
    for (let x = off; x < w; x += course * 2.2) {
      g.beginPath();
      g.moveTo(x, row * course);
      g.lineTo(x, row * course + course);
      g.stroke();
      g.fillStyle = rgb(mix(stone, row % 3 ? C.lit : C.shade, 0.08));
      g.fillRect(x + 2, row * course + 2, course * 2.2 - 4, course - 4);
    }
  }
  /* The rose window high between the doors: the hour's sky through round tracery. */
  const mid = (doors.math.cx + doors["reading-writing"].cx) / 2;
  const rx = mid * w;
  const ry = h * 0.15;
  const rr = Math.min(w, h) * 0.08;
  const sky = g.createRadialGradient(rx, ry - rr * 0.3, 0, rx, ry, rr);
  sky.addColorStop(0, rgb(mix(C.low, [255, 255, 255], night ? 0 : 0.3)));
  sky.addColorStop(1, rgb(C.top));
  g.fillStyle = sky;
  g.beginPath();
  g.arc(rx, ry, rr, 0, TAU);
  g.fill();
  g.strokeStyle = rgb(mix(stone, C.deep, 0.4));
  g.lineWidth = rr * 0.08;
  g.beginPath();
  g.arc(rx, ry, rr, 0, TAU);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    g.beginPath();
    g.moveTo(rx, ry);
    g.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr);
    g.stroke();
  }
  g.beginPath();
  g.arc(rx, ry, rr * 0.35, 0, TAU);
  g.stroke();
  /* Timber floor in perspective. */
  const floorY = Math.max(doors.math.bottom, doors["reading-writing"].bottom) * h;
  const floor = g.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, rgb(mix([110, 74, 46], C.deep, 0.2 + L.dark * 0.5)));
  floor.addColorStop(1, rgb(mix([70, 44, 28], C.deep, 0.3 + L.dark * 0.5)));
  g.fillStyle = floor;
  g.fillRect(0, floorY, w, h - floorY);
  g.strokeStyle = rgb(mix([50, 30, 18], C.deep, 0.3), 0.6);
  g.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    g.beginPath();
    g.moveTo(w / 2 + i * w * 0.02, floorY);
    g.lineTo(w / 2 + i * w * 0.14, h);
    g.stroke();
  }
  /* Each doorway: a stone frame, a carved panel over the door, a dark opening. */
  (Object.keys(doors) as Slug[]).forEach((slug) => {
    const d = doors[slug];
    const x0 = (d.cx - d.hw) * w;
    const x1 = (d.cx + d.hw) * w;
    const top = d.top * h;
    const bottom = d.bottom * h;
    const hw = d.hw * w;
    const cx = d.cx * w;
    const frame = mix(stone, C.lit, 0.2);
    /* The surround: a round stone arch. */
    g.fillStyle = rgb(mix(frame, C.deep, 0.1));
    g.beginPath();
    g.moveTo(x0 - hw * 0.22, bottom);
    g.lineTo(x0 - hw * 0.22, top);
    g.arc(cx, top, hw * 1.22, Math.PI, 0);
    g.lineTo(x1 + hw * 0.22, bottom);
    g.closePath();
    g.fill();
    /* The carved panel in the arch. */
    g.fillStyle = rgb(mix(stone, C.deep, 0.25));
    g.beginPath();
    g.arc(cx, top, hw, Math.PI, 0);
    g.closePath();
    g.fill();
    const carve = mix(frame, [255, 236, 190], night ? 0.2 : 0.35);
    g.strokeStyle = rgb(carve, 0.9);
    g.fillStyle = rgb(carve, 0.9);
    g.lineWidth = Math.max(1.5, hw * 0.05);
    const py = top - hw * 0.45;
    const pr = hw * 0.36;
    if (slug === "math") {
      /* A compass rosette: a circle, a hexagon and a triangle inscribed. */
      g.beginPath();
      g.arc(cx, py, pr, 0, TAU);
      g.stroke();
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        g.lineTo(cx + Math.cos(a) * pr, py + Math.sin(a) * pr);
      }
      g.stroke();
      g.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * TAU - Math.PI / 2;
        g.lineTo(cx + Math.cos(a) * pr, py + Math.sin(a) * pr);
      }
      g.stroke();
    } else {
      /* An open book. */
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx, py + pr * 0.5);
        g.quadraticCurveTo(cx + s * pr * 0.5, py + pr * 0.2, cx + s * pr * 1.1, py + pr * 0.45);
        g.lineTo(cx + s * pr * 1.05, py - pr * 0.45);
        g.quadraticCurveTo(cx + s * pr * 0.5, py - pr * 0.7, cx, py - pr * 0.4);
        g.closePath();
        g.stroke();
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(cx + s * pr * 0.2, py - pr * (0.2 - i * 0.22));
          g.lineTo(cx + s * pr * 0.85, py - pr * (0.25 - i * 0.22));
          g.stroke();
        }
      }
    }
    /* The opening, dark; the door leaves and the scene beyond sit over it. */
    g.fillStyle = rgb(mix(C.deep, [0, 0, 0], 0.5));
    g.fillRect(x0, top, x1 - x0, bottom - top);
    /* A wall lamp beside each door, glowing warm (brighter after dark). */
    const lx = slug === "math" ? x0 - hw * 0.65 : x1 + hw * 0.65;
    const ly = top + (bottom - top) * 0.15;
    const glow = g.createRadialGradient(lx, ly, 0, lx, ly, hw * 1.4);
    glow.addColorStop(0, rgb([255, 206, 130], 0.35 + L.dark * 0.45));
    glow.addColorStop(1, rgb([255, 190, 110], 0));
    g.fillStyle = glow;
    g.fillRect(lx - hw * 1.4, ly - hw * 1.4, hw * 2.8, hw * 2.8);
    g.fillStyle = rgb([210, 160, 80]);
    g.beginPath();
    g.ellipse(lx, ly, hw * 0.08, hw * 0.13, 0, 0, TAU);
    g.fill();
  });
  return k.c;
}

/** One pair of oak doors, as a picture at the doorway's aspect (height / width). */
export function renderDoor(time: TimeOfDay, aspect: number, seed: number): HTMLCanvasElement {
  const w = 240;
  const h = Math.max(60, Math.round(w * aspect));
  const k = studio(w, h, time, seed);
  const { g, C, L } = k;
  const oak = mix([128, 84, 48], C.deep, 0.12 + L.dark * 0.5);
  const iron = mix([46, 42, 40], C.deep, 0.3);
  /* Planks. */
  const planks = 8;
  for (let i = 0; i < planks; i++) {
    const x = (i / planks) * w;
    g.fillStyle = rgb(mix(oak, i % 2 ? C.lit : C.deep, 0.1 + (i % 3) * 0.03));
    g.fillRect(x, 0, w / planks + 1, h);
    g.strokeStyle = rgb(mix(oak, [20, 12, 6], 0.5), 0.8);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
    /* Grain. */
    g.strokeStyle = rgb(mix(oak, [40, 24, 12], 0.4), 0.35);
    g.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      const gx = x + (w / planks) * (0.2 + j * 0.2);
      g.beginPath();
      g.moveTo(gx, 0);
      g.bezierCurveTo(gx + 3, h * 0.3, gx - 3, h * 0.6, gx + 2, h);
      g.stroke();
    }
  }
  /* The meeting stile down the middle, where the two leaves part. */
  g.fillStyle = rgb(mix(oak, [20, 12, 6], 0.55));
  g.fillRect(w / 2 - 2, 0, 4, h);
  /* Iron straps with studs. */
  for (const y of [0.16, 0.5, 0.84]) {
    g.fillStyle = rgb(iron);
    g.fillRect(0, y * h - h * 0.018, w, h * 0.036);
    g.fillStyle = rgb(mix(iron, C.lit, 0.4));
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(((i + 0.5) / 14) * w, y * h, Math.max(1.5, w * 0.008), 0, TAU);
      g.fill();
    }
  }
  /* Ring handles either side of the middle. */
  for (const s of [-1, 1]) {
    const x = w / 2 + s * w * 0.08;
    const y = h * 0.6;
    g.strokeStyle = rgb(mix(iron, [200, 160, 90], 0.5));
    g.lineWidth = Math.max(2, w * 0.012);
    g.beginPath();
    g.arc(x, y, w * 0.04, 0, TAU);
    g.stroke();
    g.fillStyle = rgb(iron);
    g.beginPath();
    g.arc(x, y - w * 0.04, w * 0.015, 0, TAU);
    g.fill();
  }
  return k.c;
}

/** One leaf of a door picture (the left or right half), as its own canvas. */
export function leafOf(door: HTMLCanvasElement, side: "left" | "right"): HTMLCanvasElement {
  const half = Math.floor(door.width / 2);
  const c = makeCanvas(half, door.height);
  ctx2d(c).drawImage(
    door,
    side === "left" ? 0 : door.width - half,
    0,
    half,
    door.height,
    0,
    0,
    half,
    door.height
  );
  return c;
}
