import type { NodeStatus } from "@/data/curriculum";

// ── SVG viewport ────────────────────────────────────────────
export const W = 1000;
export const H = 640;

// ── Deterministic pseudo-random ─────────────────────────────
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ── Background star field (larger + varied size/brightness) ──
export const BG_STARS = Array.from({ length: 320 }, (_, i) => ({
  x: pr(i * 2.111) * W,
  y: pr(i * 2.111 + 1.3) * H,
  r: 0.35 + pr(i * 3.77) * 1.3,
  o: 0.18 + pr(i * 4.29) * 0.55,
  tw: pr(i * 5.71),
}));

// ── Nebula blobs — two very soft subject-tinted washes as atmosphere ──
export const NEBULAE = [
  { cx: 0.22 * W, cy: 0.62 * H, rx: 260, ry: 180, fill: "#d84f7320" },
  { cx: 0.78 * W, cy: 0.62 * H, rx: 260, ry: 180, fill: "#2fa8ff20" },
];

// ── Node sizing by difficulty ───────────────────────────────
export const DIFF_R: Record<1 | 2 | 3, number> = { 1: 3.5, 2: 4.5, 3: 5.5 };

// ── Status-driven visual config ─────────────────────────────
export interface StarConfig {
  coreOpacity: number;
  haloOpacity: number;
  rayOpacity: number;
  rayLen: number;
  glow: number;
  pulse: boolean;
}

export function starConfig(status: NodeStatus): StarConfig {
  switch (status) {
    case "locked":
      return {
        coreOpacity: 0.25,
        haloOpacity: 0.0,
        rayOpacity: 0.0,
        rayLen: 0,
        glow: 0,
        pulse: false,
      };
    case "available":
      return {
        coreOpacity: 0.95,
        haloOpacity: 0.4,
        rayOpacity: 0.7,
        rayLen: 2.4,
        glow: 3.0,
        pulse: true,
      };
    case "in_progress":
      return {
        coreOpacity: 1.0,
        haloOpacity: 0.55,
        rayOpacity: 0.9,
        rayLen: 2.8,
        glow: 3.6,
        pulse: false,
      };
    case "partially_complete":
      return {
        coreOpacity: 1.0,
        haloOpacity: 0.7,
        rayOpacity: 1.0,
        rayLen: 3.0,
        glow: 4.0,
        pulse: false,
      };
    case "mastered":
      return {
        coreOpacity: 1.0,
        haloOpacity: 0.9,
        rayOpacity: 1.0,
        rayLen: 3.6,
        glow: 4.6,
        pulse: false,
      };
  }
}

// ── Edge brightness ──────────────────────────────────────────
export function edgeOpacity(from: NodeStatus, to: NodeStatus, active: boolean): number {
  if (!active) return 0.06;
  if (from === "mastered" && to === "mastered") return 0.65;
  if (from === "mastered") return 0.45;
  if (from === "in_progress" || to === "in_progress") return 0.28;
  if (from === "available" || to === "available") return 0.22;
  return 0.09;
}
