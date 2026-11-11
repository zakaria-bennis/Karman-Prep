/*
 * The home page's painting: one Karman painting behind the whole page, travelled from top to
 * bottom as the visitor scrolls. The camera starts close in the sky at dawn and ends on the whole
 * scene at night, so the page reads as one day. The same scene is painted in its four lights
 * (dawn, day, sunset, night), stacked, and cross-faded by how far down the page the visitor is.
 *
 * Only transforms and opacity change while scrolling, so nothing is laid out again. The dawn
 * light is painted first (stroke by stroke on the first visit of a session); the other three are
 * painted afterwards in idle time and simply stay hidden until they are ready. Wildlife follows
 * the light on screen, and the season's leaves or snow drift down. A click does nothing to it
 * (founder, 2026-11-11: only passive life, no click effects). None of it moves inside a keep-out box (data-paint-keepout: every box of
 * words). Under reduced motion, or when the visitor holds the painting still, the camera stays
 * put and nothing moves; the light still changes down the page.
 */
import { pictureColors, type PaintingColors } from "./colors";
import { drawLife, initLife } from "./life";
import type { LifeState } from "./life/types";
import { TIMES_OF_DAY, type TimeOfDay } from "./light";
import { paintPicture, PAINT_IN_MS, type PaintHandle } from "./painterly";
import { PICTURE_H, PICTURE_W, renderLandscape, type Season } from "./scenes";
import { LeafField, type Ledge } from "./leaves";

export interface JourneyCallbacks {
  /** The opening starts; it lasts `ms`. Not called when the painting appears finished. */
  onPaintStart?: (ms: number) => void;
  /** The first light is on (or nearly on): the page may show it. */
  onReady?: () => void;
  /** The colors of the light now on screen. */
  onColors?: (colors: PaintingColors, time: TimeOfDay) => void;
}

const KEEP_OUT = "[data-paint-keepout]";
const FRAME_MS = 1000 / 30;
const IDLE_MS = 60_000;
/* Where each later light fades in, as a share of the page scrolled: [from, to]. */
const FADE: Record<Exclude<TimeOfDay, "dawn">, [number, number]> = {
  day: [0.1, 0.26],
  sunset: [0.46, 0.64],
  night: [0.78, 0.94],
};
/* The camera at the end of the page: the whole scene, slightly over-sized for the parallax. */
const WIDE = 1.04;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Layer {
  time: TimeOfDay;
  canvas: HTMLCanvasElement;
  ready: boolean;
  shown: number;
  colors: PaintingColors | null;
  life: LifeState | null;
}

export class PaintedJourney {
  private layers: Layer[];
  private handles: PaintHandle[] = [];
  private raf = 0;
  private last = 0;
  private t0 = 0;
  private W = 0;
  private H = 0;
  private paintedW = 0;
  private progress = 0;
  private pointer = { x: -999, y: -999 };
  private lead: TimeOfDay | null = null;
  private lastTransform = "";
  private lastP = -1;
  private lastInput = 0;
  private sleeping = false;
  private opening = false;
  private told = false;
  private disposed = false;
  private leaves: LeafField;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private cleanups: (() => void)[] = [];

  /**
   * `canvases` are the four lights in TIMES_OF_DAY order, inside `camera`. `live` is the wildlife
   * canvas above them. `still()` says whether everything should hold still right now.
   */
  constructor(
    canvases: HTMLCanvasElement[],
    private readonly camera: HTMLElement,
    private readonly live: HTMLCanvasElement,
    private readonly scene: number,
    private readonly seasonOf: Season,
    private readonly still: () => boolean,
    private readonly cb: JourneyCallbacks = {}
  ) {
    this.leaves = new LeafField(seasonOf);
    this.layers = TIMES_OF_DAY.map((time, i) => ({
      time,
      canvas: canvases[i],
      ready: false,
      shown: -1,
      colors: null,
      life: null,
    }));
  }

  /** Paints the dawn light (with the opening when `animate`), then the rest in idle time. */
  async start(animate: boolean) {
    this.measure();
    this.paintedW = this.W;
    this.listen();
    this.readScroll();
    this.t0 = this.last = this.lastInput = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    const play = animate && !this.still();
    await new Promise((r) => setTimeout(r, 0));
    if (this.disposed) return;
    this.opening = play;
    if (play) this.cb.onPaintStart?.(PAINT_IN_MS);
    this.paint(0, play, () => {
      this.opening = false;
      this.paintRest(1);
    });
  }

  private ready() {
    if (this.told) return;
    this.told = true;
    this.cb.onReady?.();
  }

  /** Paints one light. Later lights are painted a little smaller: they are stretched to fit. */
  private paint(i: number, animate: boolean, then?: () => void) {
    const layer = this.layers[i];
    if (!layer || this.disposed) return;
    const art = renderLandscape(this.scene, layer.time);
    /* Painted larger than the window on a laptop, because the camera starts close in; smaller on a phone,
       and smaller again for the later lights there, to keep the work short. */
    const phone = this.W < 700;
    const q = phone ? (i === 0 ? 1 : 0.75) : i === 0 ? 1.3 : 1.1;
    let finished = false;
    const finish = () => {
      if (finished || this.disposed) return;
      finished = true;
      layer.ready = true;
      layer.life = initLife(this.scene, layer.time);
      if (i === 0) this.ready();
      this.wake();
      then?.();
    };
    const handle = paintPicture(layer.canvas, art, {
      animate,
      width: Math.round(this.W * q),
      height: Math.round(this.H * q),
      brush: phone ? 0.9 : 0.78,
      nearlyDone: () => {
        if (i === 0) this.ready();
      },
      done: finish,
    });
    this.handles[i] = handle;
    layer.colors = pictureColors(handle.final);
    if (i === 0) {
      /* The first light shows while it is being painted. */
      layer.ready = true;
      layer.canvas.style.opacity = "1";
      layer.shown = 1;
      if (!animate) this.ready();
      if (layer.colors) this.cb.onColors?.(layer.colors, layer.time);
      this.lead = layer.time;
    }
  }

  private paintRest(i: number) {
    if (i >= this.layers.length || this.disposed) return;
    const go = () => this.paint(i, false, () => this.paintRest(i + 1));
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1500 });
    else this.timers.push(setTimeout(go, 250));
  }

  private measure() {
    this.W = this.live.width = window.innerWidth || 1440;
    this.H = this.live.height = window.innerHeight || 900;
    this.leaves.resize(this.W, this.H);
  }

  private readScroll() {
    const max = document.documentElement.scrollHeight - this.H;
    this.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  private listen() {
    const ac = new AbortController();
    const o = { passive: true, signal: ac.signal } as const;
    addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.wake();
      },
      o
    );
    addEventListener(
      "scroll",
      () => {
        this.readScroll();
        this.wake();
      },
      o
    );
    for (const w of ["pointerdown", "keydown", "wheel", "touchstart"] as const)
      addEventListener(w, this.wake, o);
    /* something on the page can ask for a burst of leaves at a point (the guarantee tiles do) */
    document.addEventListener(
      "karman:burst",
      (e) => {
        const at = (e as CustomEvent<{ x: number; y: number }>).detail;
        if (at && !this.still()) this.leaves.burst(at.x, at.y);
        this.wake();
      },
      { signal: ac.signal }
    );
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    addEventListener(
      "resize",
      () => {
        this.measure();
        this.readScroll();
        this.wake();
        clearTimeout(resizeTimer);
        /* A phone's address bar changes the height all the time; only a new width repaints. */
        resizeTimer = setTimeout(() => {
          if (this.disposed || this.opening || Math.abs(this.W - this.paintedW) < 80) return;
          this.paintedW = this.W;
          this.handles.forEach((h) => h?.stop());
          this.paint(0, false, () => this.paintRest(1));
        }, 300);
      },
      { signal: ac.signal }
    );
    document.addEventListener("visibilitychange", () => !document.hidden && this.wake(), {
      signal: ac.signal,
    });
    this.cleanups.push(() => {
      ac.abort();
      clearTimeout(resizeTimer);
    });
  }

  /** Any input brings a resting scene back to life. Also call it when the still choice changes. */
  wake = () => {
    this.lastInput = performance.now();
    if (!this.sleeping || this.disposed) return;
    this.sleeping = false;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    if (this.disposed) return;
    if (!this.opening && now - this.lastInput > IDLE_MS) {
      this.sleeping = true;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    if (document.hidden) return;
    const still = this.still();
    this.place(still);
    if (now - this.last < FRAME_MS - 2) return;
    this.last = now;
    this.drawLife(dt, (now - this.t0) / 1000, still);
  };

  /** How strong each light is at this point of the page: 0 to 1, in TIMES_OF_DAY order. */
  private strengths(): number[] {
    const p = this.progress;
    return this.layers.map((l) =>
      !l.ready ? 0 : l.time === "dawn" ? 1 : smooth(FADE[l.time][0], FADE[l.time][1], p)
    );
  }

  /** The camera: scale and vertical shift for this point of the page. */
  private cameraAt(still: boolean) {
    if (still) return { s: WIDE, ty: 0, px: 0 };
    const e = smooth(0, 1, this.progress);
    const close = this.W < 700 ? 1.45 : 1.7;
    const s = close + (WIDE - close) * e;
    const ty = (1 - 2 * e) * ((s - 1) * this.H) * 0.5;
    const px = this.pointer.x < -900 ? 0 : (this.pointer.x / this.W - 0.5) * -10;
    return { s, ty, px };
  }

  /** Moves the camera and sets each light's opacity. Runs every frame; writes only on change. */
  private place(still: boolean) {
    const { s, ty, px } = this.cameraAt(still);
    const transform = `translate3d(${px.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    if (transform !== this.lastTransform) {
      this.lastTransform = transform;
      this.camera.style.transform = transform;
    }
    /* The sun and moon's place in the sky follows the scroll (painted.css, --p). */
    const p = Math.round(this.progress * 500) / 500;
    if (p !== this.lastP) {
      this.lastP = p;
      this.camera.parentElement?.style.setProperty("--p", String(p));
    }
    const k = this.strengths();
    let lead = 0;
    this.layers.forEach((l, i) => {
      const v = Math.round(k[i] * 100) / 100;
      if (v !== l.shown) {
        l.shown = v;
        l.canvas.style.opacity = String(v);
      }
      if (k[i] >= 0.5) lead = i;
    });
    const top = this.layers[lead];
    if (top.time !== this.lead && top.colors) {
      this.lead = top.time;
      this.cb.onColors?.(top.colors, top.time);
    }
  }

  private drawLife(dt: number, t: number, still: boolean) {
    const g = this.live.getContext("2d");
    if (!g) return;
    const { W, H } = this;
    g.clearRect(0, 0, W, H);
    if (still || this.opening) return;
    const boxes: Ledge[] = [];
    for (const el of document.querySelectorAll(KEEP_OUT)) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > H + 40) continue;
      boxes.push({ el, l: r.left, t: r.top, r: r.right, b: r.bottom });
    }
    /* The light on top gets the wildlife, faded with it. */
    const k = this.strengths();
    let best = -1;
    let weight = 0;
    let above = 1;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const seen = k[i] * above;
      if (seen > weight) {
        weight = seen;
        best = i;
      }
      above *= 1 - k[i];
    }
    const top = best >= 0 ? this.layers[best] : null;
    if (top?.life) {
      const { s, ty, px } = this.cameraAt(false);
      g.save();
      /* Nothing moves behind words: the wildlife is clipped out of every keep-out box. */
      g.beginPath();
      g.rect(0, 0, W, H);
      for (const b of boxes) g.rect(b.r + 12, b.t - 12, b.l - b.r - 24, b.b - b.t + 24);
      g.clip("evenodd");
      const kk = Math.max(W / PICTURE_W, H / PICTURE_H);
      const ox = (W - PICTURE_W * kk) * 0.7;
      const oy = (H - PICTURE_H * kk) * 0.4;
      drawLife(
        g,
        top.life,
        dt,
        t,
        {
          X: (u) => W / 2 + (ox + u * PICTURE_W * kk - W / 2) * s + px,
          Y: (v) => H / 2 + (oy + v * PICTURE_H * kk - H / 2) * s + ty,
          S: kk * s,
        },
        weight
      );
      g.restore();
    }
    /* The leaves fall everywhere except behind words; some come to rest on top of a block. */
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H);
    for (const b of boxes) g.rect(b.r, b.t, b.l - b.r, b.b - b.t);
    g.clip("evenodd");
    this.leaves.draw(g, dt, t, boxes, this.pointer, top?.time === "night");
    g.restore();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.handles.forEach((h) => h?.stop());
    this.timers.forEach(clearTimeout);
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
