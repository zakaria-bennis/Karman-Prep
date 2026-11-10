/*
 * The season's leaves on the home page, with a little physics. They fall with the wind, turning as
 * they go. Some land on the top edge of a block of words and stay there, riding along as the page
 * scrolls, until the pointer comes near or a gust lifts them. A click on open painting scatters a
 * burst. Nothing is ever drawn inside a block of words: the caller clips those out before `draw`.
 * In winter they are snowflakes, in spring petals.
 */
import type { Season } from "./scenes";

export interface Ledge {
  /** The element whose top edge leaves can land on. */
  el: Element;
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  color: string;
  phase: number;
  /** Resting on an element's top edge: the element and how far along it. */
  on: Element | null;
  at: number;
  /** Seconds left for a burst leaf; resting and falling leaves live on. */
  life: number;
}

const PALETTE: Record<Season, string[]> = {
  fall: ["#d9661f", "#c2452d", "#e39a2b", "#a8431c", "#e6b84a"],
  winter: ["#ffffff", "#eef3fb", "#dfe8f5"],
  spring: ["#f6c1d0", "#fbdbe4", "#f3a9bf", "#ffffff"],
  summer: ["#6f9a3c", "#8fb04a", "#557a2c", "#c9d86a"],
};
const GRAVITY = 26;
const REACH = 90;
const MAX_ON_LEDGE = 9;

export class LeafField {
  private leaves: Leaf[] = [];
  private W = 0;
  private H = 0;
  private gust = 0;
  private nextGust = 6;

  constructor(private readonly season: Season) {}

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    const want = W < 700 ? 14 : 30;
    while (this.leaves.length < want) this.leaves.push(this.spawn(Math.random() * H));
    if (this.leaves.length > want) this.leaves.length = want;
  }

  private spawn(y = -20, x = Math.random() * (this.W || 1200), burst = false): Leaf {
    const colors = PALETTE[this.season];
    return {
      x,
      y,
      vx: burst ? (Math.random() - 0.5) * 260 : 0,
      vy: burst ? -Math.random() * 200 - 40 : 14 + Math.random() * 22,
      rot: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 2.4,
      size: (this.season === "winter" ? 3 : 7) + Math.random() * (this.season === "winter" ? 3 : 7),
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * 6.28,
      on: null,
      at: 0,
      life: burst ? 5 : Infinity,
    };
  }

  /** A handful of leaves thrown up from a point. */
  burst(x: number, y: number) {
    for (let i = 0; i < 10; i++) this.leaves.push(this.spawn(y, x, true));
  }

  /** Moves and draws one frame. `ledges` are the blocks of words, in viewport pixels. */
  draw(
    g: CanvasRenderingContext2D,
    dt: number,
    t: number,
    ledges: Ledge[],
    pointer: { x: number; y: number },
    dim: boolean
  ) {
    const { W, H } = this;
    /* Every so often the wind picks up for a moment and lifts some of the resting leaves. */
    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      this.gust = 1;
      this.nextGust = 9 + Math.random() * 9;
    }
    this.gust = Math.max(0, this.gust - dt * 0.5);
    const wind = 10 + Math.sin(t * 0.23) * 14 + this.gust * 90;
    const resting = new Map<Element, number>();
    for (const q of this.leaves) if (q.on) resting.set(q.on, (resting.get(q.on) ?? 0) + 1);

    g.save();
    g.globalAlpha = dim ? 0.7 : 0.95;
    this.leaves = this.leaves.filter((q) => {
      if (q.on) {
        const ledge = ledges.find((l) => l.el === q.on);
        /* The block scrolled away, or the wind or the pointer lifts it: it flies again. */
        const px = ledge ? ledge.l + q.at : 0;
        const py = ledge ? ledge.t : 0;
        const near = ledge && Math.hypot(px - pointer.x, py - pointer.y) < REACH;
        if (!ledge || near || (this.gust > 0.8 && Math.random() < dt * 2)) {
          q.on = null;
          q.x = px || Math.random() * W;
          q.y = ledge ? py - 4 : -20;
          const away = near ? Math.sign(px - pointer.x) || 1 : 1;
          q.vx = away * (60 + Math.random() * 120);
          q.vy = -(60 + Math.random() * 90);
          q.spin = (Math.random() - 0.5) * 9;
        } else {
          q.x = px;
          q.y = py - q.size * 0.25;
        }
      } else {
        const before = q.y;
        q.vy += GRAVITY * dt;
        q.vy = Math.min(q.vy, 46 + q.size * 2);
        q.vx += (wind - q.vx) * dt * 0.8;
        q.x += (q.vx + Math.sin(t * 1.3 + q.phase) * 22) * dt;
        q.y += q.vy * dt;
        q.rot += q.spin * dt;
        /* The pointer pushes falling leaves aside. */
        const dx = q.x - pointer.x;
        const dy = q.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < REACH && d > 1) {
          q.vx += (dx / d) * 380 * dt;
          q.vy += (dy / d) * 220 * dt;
        }
        /* Crossing a block's top edge on the way down: some of them land. */
        if (q.vy > 0 && q.life === Infinity) {
          for (const l of ledges) {
            if (before <= l.t && q.y > l.t && q.x > l.l + 8 && q.x < l.r - 8) {
              if ((resting.get(l.el) ?? 0) < MAX_ON_LEDGE && Math.random() < 0.55) {
                q.on = l.el;
                q.at = q.x - l.l;
                q.rot = (Math.random() - 0.5) * 0.9;
                resting.set(l.el, (resting.get(l.el) ?? 0) + 1);
              }
              break;
            }
          }
        }
        q.life -= dt;
        if (q.life <= 0) return false;
        if (q.y > H + 30 || q.x > W + 60 || q.x < -60) {
          if (q.life !== Infinity) return false;
          Object.assign(q, this.spawn(-20, Math.random() * W - 80));
        }
      }
      g.save();
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      g.fillStyle = q.color;
      g.beginPath();
      if (this.season === "winter") g.arc(0, 0, q.size * 0.5, 0, 6.29);
      else {
        /* a leaf: two curves meeting at a point, thinner as it turns edge-on */
        const w = q.size * (0.35 + Math.abs(Math.cos(t * 1.7 + q.phase)) * 0.3);
        g.moveTo(-q.size, 0);
        g.quadraticCurveTo(0, -w, q.size, 0);
        g.quadraticCurveTo(0, w, -q.size, 0);
      }
      g.fill();
      g.restore();
      return true;
    });
    g.restore();
  }
}
