// The city the hero flies through, painted into strips that slide past (HomeworkHero.tsx). Each
// strip is one depth of the city, drawn once on a canvas and then only moved, so however much is in
// it, moving it costs nothing. What makes it read as a real city (founder, 2026-11-16: the first one
// was squat, even and unlit-looking):
//   - heights vary a great deal: most buildings are modest, a few are towers
//   - roofs differ: flat, set back in tiers, stepped crowns, spires, slanted tops, tanks and masts
//   - windows are small and many, lit floor by floor the way offices and flats are, in several
//     warm and cool whites, each with a little glow
//   - distance: far buildings are paler and hazier with only pinpricks of light; near ones are dark
//     and sharp; nothing behind shows through anything in front
//   - the street: trees and lamps with pools of light, and the glow of the city rising from it
// Every strip joins up with itself, so it can slide for ever.

type Rnd = () => number;
const seeded = (seed: number): Rnd => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const TILE = { h: 560, scale: 1.5 };
export type Depth = "far" | "mid" | "near" | "front";
/** How wide each strip is, in the same units as its height. */
export const WIDE: Record<Depth, number> = { far: 1500, mid: 1700, near: 2000, front: 2400 };

type Look = {
  walls: string[];
  /** The haze at a building's foot: the city's glow by night, the air by day. */
  foot: string;
  lit: string[];
  unlit: string;
  glow: number;
  side: string;
};
const NIGHT: Record<Exclude<Depth, "front">, Look> = {
  far: {
    walls: ["#232a66", "#262d6e", "#1f2760"],
    foot: "rgba(150, 90, 150, 0.55)",
    lit: ["#ffd9a0", "#ffe9c4", "#cfe2ff"],
    unlit: "rgba(0,0,0,0)",
    glow: 3,
    side: "rgba(255,255,255,0.05)",
  },
  mid: {
    walls: ["#141742", "#171a4a", "#11143a", "#1a1846"],
    foot: "rgba(120, 60, 110, 0.5)",
    lit: ["#ffd27a", "#ffe6b3", "#ffc35c", "#d6e8ff", "#fff3d6"],
    unlit: "rgba(255,255,255,0.045)",
    glow: 5,
    side: "rgba(255,255,255,0.045)",
  },
  near: {
    walls: ["#090b24", "#0b0d2a", "#070920", "#0d0c28"],
    foot: "rgba(255, 150, 80, 0.16)",
    lit: ["#ffcf72", "#ffe2a8", "#ffb84d", "#cfe4ff", "#fff1cf", "#9fd0ff"],
    unlit: "rgba(255,255,255,0.05)",
    glow: 7,
    side: "rgba(255,255,255,0.04)",
  },
};
const DAY: Record<Exclude<Depth, "front">, Look> = {
  far: {
    walls: ["#b9cdea", "#c3d4ee", "#afc5e6"],
    foot: "rgba(255, 255, 255, 0.6)",
    lit: ["#ffffff"],
    unlit: "rgba(70,110,170,0.25)",
    glow: 0,
    side: "rgba(255,255,255,0.25)",
  },
  mid: {
    walls: ["#8fa8d2", "#a9b7cf", "#c7bba8", "#7f9dc9", "#b5c3da"],
    foot: "rgba(255, 255, 255, 0.4)",
    lit: ["#ffffff", "#eaf5ff"],
    unlit: "rgba(30,70,130,0.42)",
    glow: 0,
    side: "rgba(255,255,255,0.22)",
  },
  near: {
    walls: ["#5d79ad", "#7c8aa6", "#a8957c", "#4f6ea8", "#8d9bb8", "#6a7f9c"],
    foot: "rgba(255, 255, 255, 0.2)",
    lit: ["#ffffff", "#dff0ff"],
    unlit: "rgba(18,48,100,0.55)",
    glow: 0,
    side: "rgba(255,255,255,0.2)",
  },
};

const SHAPE: Record<
  Exclude<Depth, "front">,
  {
    w: [number, number];
    h: [number, number];
    base: number;
    win: [number, number, number, number];
    lit: number;
  }
> = {
  // [least, most] width and height (height as a share of the picture), where its foot stands, and
  // a window's width, height, and the gaps across and down
  far: { w: [16, 46], h: [0.16, 0.6], base: 0.86, win: [1.6, 1.6, 6, 7], lit: 0.2 },
  mid: { w: [26, 70], h: [0.14, 0.62], base: 0.93, win: [3, 4, 4, 5], lit: 0.34 },
  near: { w: [44, 110], h: [0.16, 0.8], base: 1.0, win: [4, 6, 4, 5], lit: 0.3 },
};

function tower(
  ctx: CanvasRenderingContext2D,
  r: Rnd,
  x: number,
  w: number,
  h: number,
  base: number,
  look: Look,
  shape: (typeof SHAPE)["far"],
  depth: Exclude<Depth, "front">,
  night: boolean
) {
  const wall = look.walls[Math.floor(r() * look.walls.length)];
  const top = base - h;
  // the outline: the body, and whatever stands on it
  const parts: [number, number, number, number][] = [[x, top, w, h]];
  const roof = r();
  let mast = 0;
  if (h > 150 && roof < 0.3) {
    // set back in tiers, as tall towers are
    let cw = w,
      cy = top;
    for (let n = 0; n < 2 + Math.floor(r() * 2); n++) {
      const nw = cw * (0.55 + r() * 0.2),
        nh = 14 + r() * 34;
      parts.push([x + (w - nw) / 2, cy - nh, nw, nh]);
      cw = nw;
      cy -= nh;
    }
    if (r() < 0.7) mast = 18 + r() * 40;
  } else if (h > 110 && roof < 0.45) {
    // a stepped crown
    for (let n = 1; n <= 3; n++) parts.push([x + n * w * 0.12, top - n * 7, w - n * w * 0.24, 7]);
    if (r() < 0.5) mast = 14 + r() * 26;
  } else if (roof < 0.6) {
    // plant on the roof: a low box or two
    parts.push([x + w * (0.1 + r() * 0.3), top - 6 - r() * 6, w * (0.2 + r() * 0.25), 12]);
    if (r() < 0.5) parts.push([x + w * (0.6 + r() * 0.1), top - 4 - r() * 5, w * 0.18, 9]);
    if (r() < 0.35) mast = 10 + r() * 22;
  } else if (roof < 0.7 && depth !== "far") {
    // a water tank on legs
    const tx = x + w * (0.2 + r() * 0.4);
    parts.push([tx, top - 16, 12, 11]);
    parts.push([tx + 1, top - 6, 1.5, 6]);
    parts.push([tx + 9.5, top - 6, 1.5, 6]);
  }
  ctx.fillStyle = wall;
  for (const [px, py, pw, ph] of parts) ctx.fillRect(px, py, pw, ph + 1);
  if (roof >= 0.7 && roof < 0.82 && h > 90) {
    // a slanted top
    ctx.beginPath();
    ctx.moveTo(x, top + 1);
    ctx.lineTo(x + w, top + 1);
    ctx.lineTo(x + (r() < 0.5 ? w : 0), top - 10 - r() * 22);
    ctx.fill();
  } else if (roof >= 0.82 && roof < 0.9 && h > 170) {
    // a spire
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, top + 1);
    ctx.lineTo(x + w * 0.5, top - 30 - r() * 50);
    ctx.lineTo(x + w * 0.7, top + 1);
    ctx.fill();
    mast = 0;
  }
  if (mast) {
    const [mx, my, mw] = parts[parts.length > 1 ? 1 : 0];
    const cx = mx + mw / 2,
      tip = Math.min(...parts.map((p) => p[1])) - mast;
    ctx.fillRect(cx - 0.8, tip, 1.6, mast + 2);
    void my;
    if (night && depth !== "far") {
      // the red light on a mast
      ctx.save();
      ctx.shadowColor = "#ff3b30";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ff5a4f";
      ctx.beginPath();
      ctx.arc(cx, tip, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // the side the light falls on
  ctx.fillStyle = look.side;
  ctx.fillRect(x, top, Math.max(2, w * 0.16), h);

  // windows: small and many. A floor is lit all along (an office at work), or dark, or here and
  // there; and some buildings are glass in long upright strips.
  const [ww, wh, gx, gy] = shape.win;
  const strips = depth !== "far" && r() < 0.22;
  const cols = Math.max(1, Math.floor((w - gx) / (ww + gx)));
  const rows = Math.max(1, Math.floor((h - gy - 4) / (wh + gy)));
  const left = x + (w - (cols * (ww + gx) - gx)) / 2;
  const lively = shape.lit * (0.4 + r() * 1.2);
  const tint = look.lit[Math.floor(r() * look.lit.length)];
  const lit: [number, number, string][] = [];
  ctx.fillStyle = look.unlit;
  for (let row = 0; row < rows; row++) {
    const kind = r();
    const chance = kind < 0.1 ? 0.95 : kind < 0.34 ? 0.03 : lively;
    const wy = top + gy + row * (wh + gy);
    for (let c = 0; c < cols; c++) {
      const wx = left + c * (ww + gx);
      if (r() < chance)
        lit.push([wx, wy, r() < 0.7 ? tint : look.lit[Math.floor(r() * look.lit.length)]]);
      else if (!strips) ctx.fillRect(wx, wy, ww, wh);
    }
  }
  if (strips) {
    ctx.fillStyle = look.unlit;
    for (let c = 0; c < cols; c++) ctx.fillRect(left + c * (ww + gx), top + gy, ww, h - gy * 2);
  }
  ctx.save();
  for (const [wx, wy, color] of lit) {
    if (look.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = look.glow;
    }
    // by day a "lit" window is one catching the sun: seldom, and only a glint
    if (!night && r() > 0.25) continue;
    ctx.fillStyle = color;
    ctx.globalAlpha = night ? 0.75 + r() * 0.25 : 0.8;
    ctx.fillRect(wx, wy, ww, wh);
  }
  ctx.restore();
}

/** One strip of the city, as a picture that joins up with itself. */
export function paintCity(depth: Depth, night: boolean): string {
  const W = WIDE[depth],
    H = TILE.h;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * TILE.scale);
  canvas.height = Math.round(H * TILE.scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(TILE.scale, TILE.scale);
  const r = seeded({ far: 11, mid: 29, near: 53, front: 71 }[depth]);

  if (depth === "front") {
    // the rooftops he skims: close, dark, a little soft, with tanks, masts and treetops on them
    const dark = night ? "#04051a" : "#2c3f66";
    ctx.fillStyle = dark;
    let x = 0;
    while (x < W) {
      const w = Math.min(W - x, 180 + r() * 320);
      const gap = r() < 0.5;
      const h = gap ? 20 + r() * 30 : 70 + r() * 70;
      ctx.fillRect(x, H - h, w + 1, h);
      if (!gap) {
        // a parapet, a tank, a mast, a vent
        ctx.fillRect(x, H - h - 5, w, 6);
        if (r() < 0.7) {
          const tx = x + w * (0.15 + r() * 0.5);
          ctx.fillRect(tx, H - h - 44, 34, 30);
          ctx.beginPath();
          ctx.moveTo(tx - 3, H - h - 44);
          ctx.lineTo(tx + 17, H - h - 58);
          ctx.lineTo(tx + 37, H - h - 44);
          ctx.fill();
          ctx.fillRect(tx + 3, H - h - 16, 3, 14);
          ctx.fillRect(tx + 28, H - h - 16, 3, 14);
        }
        if (r() < 0.6) ctx.fillRect(x + w * (0.7 + r() * 0.2), H - h - 70 - r() * 40, 2.5, 110);
      } else {
        // treetops between the buildings
        ctx.fillStyle = night ? "#06140f" : "#2f6b4a";
        for (let n = 0; n < w / 26; n++) {
          ctx.beginPath();
          ctx.arc(x + 14 + n * 26 + r() * 8, H - h - 8 - r() * 16, 18 + r() * 12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = dark;
      }
      x += w;
    }
    return canvas.toDataURL("image/png");
  }

  const look = (night ? NIGHT : DAY)[depth];
  const shape = SHAPE[depth];
  const base = H * shape.base;
  let x = 0;
  let sinceTall = 0;
  while (x < W) {
    let w = shape.w[0] + r() * (shape.w[1] - shape.w[0]);
    if (W - x - w < shape.w[0]) w = W - x;
    // most are modest; now and then a tower, which is slim for its height
    sinceTall++;
    const tall = sinceTall > 3 && r() < 0.3;
    if (tall) sinceTall = 0;
    const share = tall ? 0.72 + r() * 0.28 : Math.pow(r(), 1.7) * 0.6;
    const h = H * (shape.h[0] + (shape.h[1] - shape.h[0]) * share);
    if (tall) w = Math.min(w, shape.w[0] + (shape.w[1] - shape.w[0]) * 0.5);
    tower(ctx, r, x, w, h, base, look, shape, depth, night);
    x += w + (depth === "near" && r() < 0.25 ? 0 : r() < 0.5 ? 0 : 2);
  }
  // the ground they stand on, so that nothing behind shows under them
  ctx.fillStyle = look.walls[0];
  ctx.fillRect(0, base - 1, W, H - base + 2);
  // the haze at their feet
  const haze = ctx.createLinearGradient(0, base - H * 0.3, 0, base);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(1, look.foot);
  ctx.fillStyle = haze;
  ctx.fillRect(0, base - H * 0.3, W, H * 0.3);

  if (depth === "near") {
    // the street: trees, and lamps with their pools of light
    for (let tx = 10; tx < W; tx += 34 + r() * 60) {
      if (r() < 0.62) {
        ctx.fillStyle = night ? "#0a1f1a" : "#3f8a5c";
        const n = 2 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          ctx.beginPath();
          ctx.arc(tx + k * 9 + r() * 4, H - 16 - r() * 16, 10 + r() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = night ? "#123a2c" : "#5fae78";
        ctx.beginPath();
        ctx.arc(tx + 4, H - 28, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = night ? "#191a3a" : "#4a5878";
        ctx.fillRect(tx, H - 44, 1.6, 44);
        if (night) {
          ctx.save();
          ctx.shadowColor = "#ffc46b";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#ffe2a8";
          ctx.beginPath();
          ctx.arc(tx + 1, H - 45, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
  return canvas.toDataURL("image/png");
}

/** The night sky's stars: round, of several sizes, standing still. */
export function paintStars(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const r = seeded(5);
  for (let n = 0; n < 150; n++) {
    const y = Math.pow(r(), 1.5) * 620;
    ctx.globalAlpha = 0.35 + r() * 0.65;
    ctx.fillStyle = r() < 0.2 ? "#cfe0ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(r() * 900, y, r() < 0.85 ? 0.9 : 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL("image/png");
}
