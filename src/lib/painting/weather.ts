/*
 * The season's leaves, snow, petals or fireflies, and the weather on top. Nothing is drawn
 * inside the keep-out boxes (the greeting and the content panel), so nothing moves behind text.
 * A click on open painting scatters a burst. Ported from prototypes/today-directions/backdrops.js.
 */
import type { Season, Weather } from "./schedule";

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  a: number;
  w: number;
  life: number;
}

interface Drop {
  x: number;
  y: number;
  v: number;
  r: number;
}

const KIND: Record<Season, { n: number; col: string[]; fall: number; size: [number, number] }> = {
  fall: { n: 34, col: ["#c8743a", "#a8502a", "#d9a04a"], fall: 26, size: [5, 9] },
  winter: { n: 90, col: ["#ffffff"], fall: 30, size: [1.2, 2.8] },
  spring: { n: 40, col: ["#f3c2d0", "#ffffff", "#e7a3b8"], fall: 18, size: [3, 6] },
  summer: { n: 26, col: ["#f8e9a0"], fall: 0, size: [1.4, 2.4] },
};

export const inside = (x: number, y: number, boxes: Box[]) =>
  boxes.some((k) => x > k.l && x < k.r && y > k.t && y < k.b);

export class SeasonLayer {
  private parts: Particle[] = [];
  private drops: Drop[] = [];
  private season: Season | null = null;
  private weather: Weather | null = null;
  private W = 0;
  private H = 0;

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
  }

  private spawn(k: Season, x?: number, y?: number, burst = false): Particle {
    const s = KIND[k];
    return {
      x: x ?? Math.random() * this.W,
      y: y ?? Math.random() * this.H,
      vx: burst ? (Math.random() - 0.5) * 240 : 0,
      vy: burst ? (Math.random() - 0.5) * 240 : 0,
      r: s.size[0] + Math.random() * (s.size[1] - s.size[0]),
      c: s.col[Math.floor(Math.random() * s.col.length)],
      a: Math.random() * 6.28,
      w: 0.5 + Math.random(),
      life: burst ? 2.4 : Infinity,
    };
  }

  burst(x: number, y: number) {
    if (!this.season) return;
    for (let i = 0; i < 12; i++) this.parts.push(this.spawn(this.season, x, y, true));
  }

  draw(
    g: CanvasRenderingContext2D,
    dt: number,
    t: number,
    o: {
      season: Season;
      weather: Weather;
      night: boolean;
      dark: boolean;
      boxes: Box[];
      pointer: { x: number; y: number };
    }
  ) {
    const { W, H } = this;
    const k = o.season;
    const s = KIND[k];
    if (k !== this.season) {
      this.season = k;
      this.parts = Array.from({ length: s.n }, () => this.spawn(k));
    }
    for (const q of this.parts) {
      const dx = q.x - o.pointer.x;
      const dy = q.y - o.pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 9000) {
        const f = (9000 - d2) / 9000;
        const d = Math.sqrt(d2 + 1);
        q.vx += (dx / d) * f * 600 * dt;
        q.vy += (dy / d) * f * 600 * dt;
      }
      q.vx *= 0.96;
      q.vy *= 0.96;
      q.a += dt * q.w;
      if (k === "summer") {
        q.x += (Math.cos(q.a * 0.7) * 14 + q.vx) * dt;
        q.y += (Math.sin(q.a) * 10 + q.vy) * dt;
      } else {
        q.x += (Math.sin(q.a) * 16 + 8 + q.vx) * dt;
        q.y += (s.fall * q.w + q.vy) * dt;
      }
      if (q.y > H + 10 || q.x > W + 10 || q.x < -30) {
        if (q.life !== Infinity) q.life = 0;
        else {
          q.y = -10;
          q.x = Math.random() * W;
        }
      }
      if (q.life !== Infinity) q.life -= dt;
      if (inside(q.x, q.y, o.boxes)) continue;
      g.save();
      g.translate(q.x, q.y);
      g.rotate(q.a);
      g.fillStyle = q.c;
      if (k === "summer") {
        g.globalAlpha = o.night ? 0.55 + 0.45 * Math.sin(t * 2 + q.w * 9) : 0.3;
        g.shadowColor = q.c;
        g.shadowBlur = 12;
        g.beginPath();
        g.arc(0, 0, q.r, 0, 6.28);
        g.fill();
      } else if (k === "winter") {
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(0, 0, q.r, 0, 6.28);
        g.fill();
      } else {
        g.globalAlpha = 0.85;
        g.beginPath();
        g.ellipse(0, 0, q.r, q.r * 0.45, 0, 0, 6.28);
        g.fill();
      }
      g.restore();
    }
    this.parts = this.parts.filter((q) => q.life > 0);

    /* Weather, never over the greeting or the content box. */
    const w = o.weather;
    if (w !== this.weather) {
      this.weather = w;
      const n = w === "rain" ? 180 : w === "snow" ? 120 : 0;
      this.drops = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.6 + Math.random() * 0.8,
        r: 0.8 + Math.random() * 2,
      }));
    }
    if (w === "clear") return;
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H);
    for (const b of o.boxes) g.rect(b.r, b.t, b.l - b.r, b.b - b.t);
    g.clip("evenodd");
    if (w === "fog") {
      for (let i = 0; i < 5; i++) {
        const x = ((t * (12 + i * 6) + i * 420) % (W + 900)) - 450;
        const y = H * (0.35 + i * 0.12);
        const fg = g.createRadialGradient(x, y, 0, x, y, 460);
        fg.addColorStop(0, o.dark ? "rgba(190,200,215,.18)" : "rgba(255,255,255,.5)");
        fg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = fg;
        g.fillRect(x - 460, y - 460, 920, 920);
      }
    } else {
      g.strokeStyle = o.dark ? "rgba(200,212,235,.38)" : "rgba(50,70,100,.34)";
      g.fillStyle = o.dark ? "rgba(255,255,255,.8)" : "rgba(110,130,160,.65)";
      g.lineWidth = 1.1;
      for (const d of this.drops) {
        if (w === "rain") {
          d.y += 900 * d.v * dt;
          d.x += 120 * dt;
          g.beginPath();
          g.moveTo(d.x, d.y);
          g.lineTo(d.x - 3, d.y - 16 * d.v);
          g.stroke();
        } else {
          d.y += 40 * d.v * dt;
          d.x += Math.sin(t + d.r * 3) * 16 * dt;
          g.beginPath();
          g.arc(d.x, d.y, d.r, 0, 6.28);
          g.fill();
        }
        if (d.y > H + 20) {
          d.y = -20;
          d.x = Math.random() * W;
        }
        if (d.x > W + 20) d.x = -20;
      }
    }
    g.restore();
  }
}
