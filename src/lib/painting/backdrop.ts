/*
 * The picture of the day, full screen behind the portals, like Momentum's daily photo.
 * Each day shows a different Karman painting, relit for the hour, painted in stroke by stroke
 * on the first open of a session, then brought to life with the scene's wildlife, the season's
 * particles and the weather. Nothing moves inside the keep-out boxes (elements marked
 * data-paint-keepout: the greeting and the content panel). Holds still under reduced motion.
 * Ported from prototypes/today-directions/backdrops.js (founder approved, 2026-11-08).
 */
import { pictureColors, pictureTone, type PaintingColors } from "./colors";
import { drawLife, initLife } from "./life";
import type { LifeState } from "./life/types";
import { paintPicture, PAINT_IN_MS, type PaintHandle } from "./painterly";
import { PICTURE_H, PICTURE_W, renderLandscape } from "./scenes";
import type { PaintingChoice } from "./schedule";
import { SeasonLayer, type Box } from "./weather";

export interface SceneCallbacks {
  /** The opening starts; it lasts `ms`. Not called when the painting appears finished. */
  onPaintStart?: (ms: number) => void;
  /** The opening is nearly done (or the painting appeared finished): show the content. */
  onReady?: () => void;
  /** The painting's colors and whether its top-left band is light or dark. */
  onColors?: (colors: PaintingColors | null, tone: "light" | "dark" | null) => void;
}

const PARALLAX_X = 10;
const PARALLAX_Y = 5;
const KEEP_OUT = "[data-paint-keepout]";

const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Picks up the keep-out boxes, with a 12px margin, in viewport pixels. */
function keepOut(): Box[] {
  return Array.from(document.querySelectorAll(KEEP_OUT)).map((el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left - 12, t: r.top - 12, r: r.right + 12, b: r.bottom + 12 };
  });
}

export class PaintedScene {
  private painting: PaintHandle | null = null;
  private life: LifeState | null = null;
  private lifeFrom = 0;
  private art: HTMLCanvasElement | null = null;
  private season = new SeasonLayer();
  private pointer = { x: -999, y: -999 };
  private raf = 0;
  private last = 0;
  private t0 = 0;
  private W = 0;
  private H = 0;
  private told = false;
  private disposed = false;
  private cleanups: (() => void)[] = [];

  constructor(
    private readonly drawn: HTMLCanvasElement,
    private readonly live: HTMLCanvasElement,
    private choice: PaintingChoice,
    private readonly cb: SceneCallbacks = {}
  ) {}

  /**
   * Paints the picture. `animate` plays the 3.8-second opening. The work is split into two
   * tasks (render the landscape, then plan and paint the strokes) so input is never held up
   * for long.
   */
  async start(animate: boolean) {
    this.art = renderLandscape(this.choice.scene, this.choice.time);
    await new Promise((r) => setTimeout(r, 0));
    if (this.disposed) return;
    const still = reducedMotion();
    const playOpening = animate && !still;
    if (playOpening) this.cb.onPaintStart?.(PAINT_IN_MS);
    let finished = false;
    const handle = paintPicture(this.drawn, this.art, {
      animate: playOpening,
      nearlyDone: () => this.ready(),
      done: () => {
        finished = true;
        this.painting = null;
        this.ready();
        this.life = initLife(this.choice.scene, this.choice.time);
        this.lifeFrom = performance.now();
        if (still) this.drawStill();
      },
    });
    if (!finished) this.painting = handle;
    this.cb.onColors?.(pictureColors(handle.final), pictureTone(handle.final));
    this.listen();
    this.resize();
    this.t0 = this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private ready() {
    if (this.told) return;
    this.told = true;
    this.cb.onReady?.();
  }

  private listen() {
    const move = (e: PointerEvent) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    };
    const down = (e: PointerEvent) => {
      const target = e.target as Element | null;
      /* Bursts only on open painting, never on controls or content. */
      if (target?.closest(`${KEEP_OUT},a,button,input,select,textarea,nav,[role=menu]`)) return;
      if (!reducedMotion()) this.season.burst(e.clientX, e.clientY);
    };
    const resize = () => {
      this.resize();
      if (this.art && !this.painting) paintPicture(this.drawn, this.art, { animate: false });
      if (reducedMotion()) this.drawStill();
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => {
      if (reducedMotion()) this.drawStill();
    };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", down, { passive: true });
    addEventListener("resize", resize);
    motion.addEventListener("change", motionChange);
    this.cleanups.push(() => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      removeEventListener("resize", resize);
      motion.removeEventListener("change", motionChange);
    });
  }

  private resize() {
    this.W = this.live.width = window.innerWidth || 1440;
    this.H = this.live.height = window.innerHeight || 900;
    this.season.resize(this.W, this.H);
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    if (document.hidden || reducedMotion()) return;
    this.step(dt, (now - this.t0) / 1000);
  };

  /** Under reduced motion the scene holds still: one frame, no wildlife, no parallax. */
  private drawStill() {
    const g = this.live.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, this.W, this.H);
    this.drawn.style.transform = "scale(1.03)";
  }

  private step(dt: number, t: number) {
    const g = this.live.getContext("2d");
    if (!g) return;
    const { W, H, pointer } = this;
    const px = pointer.x < -900 ? 0 : (pointer.x / W - 0.5) * -PARALLAX_X;
    const py = pointer.y < -900 ? 0 : (pointer.y / H - 0.5) * -PARALLAX_Y;
    this.drawn.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) scale(1.03)`;
    const boxes = keepOut();
    g.clearRect(0, 0, W, H);
    g.save();
    /* Nothing moves behind text: the life layer is clipped out of every keep-out box. */
    g.beginPath();
    g.rect(0, 0, W, H);
    for (const b of boxes) g.rect(b.r, b.t, b.l - b.r, b.b - b.t);
    g.clip("evenodd");
    if (this.life && this.lifeFrom) {
      /* Picture units to screen pixels, matching how the painting is cropped and nudged. */
      const kk = Math.max(W / PICTURE_W, H / PICTURE_H);
      const ox = (W - PICTURE_W * kk) * 0.7;
      const oy = (H - PICTURE_H * kk) * 0.4;
      drawLife(
        g,
        this.life,
        dt,
        t,
        {
          X: (u) => W / 2 + (ox + u * PICTURE_W * kk - W / 2) * 1.03 + px,
          Y: (v) => H / 2 + (oy + v * PICTURE_H * kk - H / 2) * 1.03 + py,
          S: kk,
        },
        Math.min(1, (performance.now() - this.lifeFrom) / 1500)
      );
    }
    g.restore();
    const night = this.choice.time === "night" || this.choice.time === "sunset";
    const dark = !matchMedia("(prefers-color-scheme: light)").matches;
    this.season.draw(g, dt, t, {
      season: this.choice.season,
      weather: this.choice.weather,
      night,
      dark,
      boxes,
      pointer,
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.painting?.stop();
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
