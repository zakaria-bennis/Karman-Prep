/*
 * Intro 2's room: the inside of an old observatory, seen around the telescope's eyepiece. Dark
 * timber ribs curve up the dome, the shutter slit at the top lets in the hour's light (a warm
 * shaft by day, blue starlight at night), a brass lamp glows low down, and a brass ring frames
 * the round view. Composed with Karman's painting colors (studio.ts), then painted as brushwork.
 */
import { LIGHT, type TimeOfDay } from "@/lib/painting/light";
import { mix, rgb, type Color } from "@/lib/painting/noise";
import { Studio } from "@/lib/painting/studio";

const TAU = Math.PI * 2;

/** The room at a screen's aspect, with the lens at (cx, cy) and radius r (fractions of width). */
export function renderObservatory(
  time: TimeOfDay,
  aspect: number,
  lens: { cx: number; cy: number; r: number }
): HTMLCanvasElement {
  const w = 640;
  const h = Math.max(200, Math.round(w * aspect));
  const L = LIGHT[time] ?? LIGHT.day;
  const k = new Studio(w, h, { ...L, sunAt: [0.5, 0.0] }, 404);
  const { g, C } = k;
  const night = time === "night";
  const wood: Color = mix([70, 46, 32], C.deep, night ? 0.45 : 0.2);
  const dark = mix(wood, [8, 8, 14], 0.6);
  /* The dome's inside: dark timber, a little lighter toward the slit. */
  const bg = g.createRadialGradient(w / 2, 0, 0, w / 2, h * 0.4, Math.max(w, h));
  bg.addColorStop(0, rgb(mix(wood, C.low, 0.25)));
  bg.addColorStop(0.6, rgb(wood));
  bg.addColorStop(1, rgb(dark));
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  /* Ribs curving up toward the slit. */
  for (let i = -6; i <= 6; i++) {
    g.strokeStyle = rgb(mix(wood, i % 2 ? dark : [120, 86, 58], 0.5), 0.9);
    g.lineWidth = w * (0.012 - Math.abs(i) * 0.0006);
    g.beginPath();
    g.moveTo(w / 2 + i * w * 0.16, h * 1.05);
    g.quadraticCurveTo(w / 2 + i * w * 0.09, h * 0.35, w / 2 + i * w * 0.012, -h * 0.02);
    g.stroke();
  }
  /* The shutter slit: the hour's sky, with a shaft of its light falling into the room. */
  const sx = w * 0.46;
  const sw = w * 0.08;
  const sky = g.createLinearGradient(0, 0, 0, h * 0.2);
  sky.addColorStop(0, rgb(C.top));
  sky.addColorStop(1, rgb(C.low));
  g.fillStyle = sky;
  g.beginPath();
  g.moveTo(sx, 0);
  g.lineTo(sx + sw, 0);
  g.lineTo(sx + sw * 0.85, h * 0.2);
  g.lineTo(sx + sw * 0.15, h * 0.2);
  g.closePath();
  g.fill();
  if (night) {
    for (let i = 0; i < 18; i++) {
      g.fillStyle = rgb([240, 240, 255], 0.8);
      g.beginPath();
      g.arc(sx + sw * (0.2 + ((i * 37) % 60) / 100), h * (0.01 + ((i * 53) % 17) / 100), 1, 0, TAU);
      g.fill();
    }
  }
  const beam = g.createLinearGradient(0, 0, 0, h);
  const beamC: Color = night ? [150, 170, 230] : mix(C.sun, [255, 214, 150], 0.5);
  beam.addColorStop(0, rgb(beamC, night ? 0.18 : 0.32));
  beam.addColorStop(1, rgb(beamC, 0));
  g.fillStyle = beam;
  g.beginPath();
  g.moveTo(sx + sw * 0.15, h * 0.2);
  g.lineTo(sx + sw * 0.85, h * 0.2);
  g.lineTo(sx + sw * 3.2, h);
  g.lineTo(sx - sw * 2.2, h);
  g.closePath();
  g.fill();
  /* A brass lamp low on the left, glowing warm. */
  const lx = w * 0.1;
  const ly = h * 0.82;
  const glow = g.createRadialGradient(lx, ly, 0, lx, ly, w * 0.22);
  glow.addColorStop(0, rgb([255, 200, 120], night ? 0.55 : 0.35));
  glow.addColorStop(1, rgb([255, 180, 100], 0));
  g.fillStyle = glow;
  g.fillRect(lx - w * 0.25, ly - w * 0.25, w * 0.5, w * 0.5);
  g.fillStyle = rgb([196, 150, 80]);
  g.beginPath();
  g.ellipse(lx, ly, w * 0.025, w * 0.018, 0, 0, TAU);
  g.fill();
  /* The brass eyepiece ring around the view, with its knurled focusing band. */
  const cx = lens.cx * w;
  const cy = lens.cy * h;
  const r = lens.r * w;
  const brass: Color = [198, 156, 84];
  g.fillStyle = rgb(mix(dark, [0, 0, 0], 0.3));
  g.beginPath();
  g.arc(cx, cy, r * 1.16, 0, TAU);
  g.fill();
  const ring = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, rgb(mix(brass, [255, 240, 200], 0.4)));
  ring.addColorStop(0.5, rgb(brass));
  ring.addColorStop(1, rgb(mix(brass, [40, 26, 10], 0.55)));
  g.strokeStyle = ring;
  g.lineWidth = r * 0.1;
  g.beginPath();
  g.arc(cx, cy, r * 1.06, 0, TAU);
  g.stroke();
  g.strokeStyle = rgb(mix(brass, [30, 20, 8], 0.6), 0.8);
  g.lineWidth = Math.max(1, r * 0.008);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r * 1.02, cy + Math.sin(a) * r * 1.02);
    g.lineTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
    g.stroke();
  }
  return k.c;
}
