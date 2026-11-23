/*
 * Runs the home page's live landscape (shader.ts) on a canvas fixed behind the page.
 *
 * - Scrolling flies the camera: how far down the page is how far along the route.
 * - The mode is read from the page (light or dark). When it changes, the sun sets or rises where the
 *   visitor is, over about a second and a half; the page never moves.
 * - It draws about thirty times a second, stops when the tab is hidden or nobody has touched the page for
 *   a minute, and draws softer by itself on a slow device.
 * - Held still (reduced motion, or the footer's button): nothing drifts and the camera does not fly. The
 *   view steps between seven stops down the page and each change is a short fade.
 * - A page may ask for an opening (open): the landscape performs once, over a few seconds, then rests.
 *   Held still, it does not play.
 * - If the browser cannot draw it, start() says so and the page keeps its plain sky.
 */
import { FRAG, VERT } from "./shader";
import {
  BEHIND,
  COLS,
  DRIFT,
  LANDS,
  PER_UNIT,
  SETTLE_MS,
  STRIP_ROWS,
  WRAP,
  strip,
  sunAt,
} from "./world";
import { WORLD_PHOTOS, WORLD_PHOTO_DIR, photoSampler } from "./world-tex";

export type FlightLight = "dawn" | "day" | "sunset" | "night";

/** The weather to draw: how much cloud, rain, mist and snow, each from 0 to 1. */
export interface FlightSky {
  cloud: number;
  rain: number;
  mist: number;
  snow: number;
}

export interface FlightOptions {
  /** True while nothing may move by itself. */
  still: () => boolean;
  /** True in dark mode. */
  night: () => boolean;
  /** The stretch of the route this page flies, as [from, to] between 0 and 1. The whole route if left out. */
  route?: [number, number];
  /** How far along its stretch the page is, from 0 to 1, when something other than scrolling flies the
   *  camera (the guided intake flies forward with each answer). Scrolling flies it if left out. */
  progress?: () => number;
  /** The visitor's own weather, when the page follows it. Left out, or null, the sky is clear. */
  sky?: () => FlightSky | null;
  /** The portals' endless world (world.ts) instead of the site's fixed route. The camera flies on by
   *  itself, slowly, and picks up where this tab left off. `from` starts it at that distance, `land`
   *  holds one land everywhere, and `settled` (0 to 1) holds the sky that far through its opening
   *  twenty minutes, and `speed` multiplies the drift; these are for looking at the world while it is built.
   *  `lands` keeps the route to those lands alone. `river` rides down the river just above the water
   *  instead of along the valley's middle (Endless mode's picture; founder's pick, 2026-11-21). */
  world?:
    | boolean
    | {
        from?: number;
        land?: string;
        lands?: readonly string[];
        settled?: number;
        speed?: number;
        river?: boolean;
      };
  /** False for a second, small view of the world (the Daily 10's picture): it does not remember how
   *  far it flew, so the page's own landscape carries on from where it was. */
  keep?: boolean;
  /** The first picture is on the canvas. */
  onReady?: () => void;
  /** The light now on screen, for the page's own colours. */
  onLight?: (light: FlightLight) => void;
}

const FRAME_MS = 1000 / 30;
const IDLE_MS = 60_000;
const TURN_MS = 1500;
const STOPS = 6;
const STILL_TIME = 40;
/** The river view: how high above the water, and the tilt (low on the water, looking a little down). */
const RIVER_HEIGHT = 0.016;
const RIVER_TILT = -0.012;
/** Where a tab keeps how far it has flown through the endless world. */
const FLOWN_KEY = "kp-flown";
/** Where a tab keeps when its sky began to settle, and in which mode. */
const SKY_KEY = "kp-sky";
function keptSky(): { at: number; dark: boolean } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SKY_KEY) ?? "null") as {
      at?: unknown;
      dark?: unknown;
    } | null;
    return v && typeof v.at === "number" && typeof v.dark === "boolean"
      ? { at: v.at, dark: v.dark }
      : null;
  } catch {
    return null;
  }
}
/* How many pixels to draw: where it starts, how far it may go either way, and how long one picture may
   take (slower than SLOW_MS: draw fewer pixels; quicker than FAST_MS: draw more). A phone's graphics chip
   also has to scroll the page, at up to 120 pictures a second, so a phone starts smaller and the landscape
   may only use a small share of each moment; otherwise scrolling drags. */
interface Pace {
  start: number;
  max: number;
  min: number;
  slowMs: number;
  fastMs: number;
}
const DESK: Pace = { start: 620_000, max: 1_500_000, min: 130_000, slowMs: 16, fastMs: 7 };
const PHONE: Pace = { start: 300_000, max: 620_000, min: 110_000, slowMs: 8, fastMs: 3.5 };
const paceFor = (): Pace =>
  matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 700 ? PHONE : DESK;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Flight {
  private gl: WebGLRenderingContext | null = null;
  private uniforms: Record<
    | "uRes"
    | "uTime"
    | "uP"
    | "uNight"
    | "uIntro"
    | "uWx"
    | "uWorld"
    | "uLand"
    | "uStrip"
    | "uSun"
    | "uTex"
    | "uView",
    WebGLUniformLocation | null
  > = {
    uRes: null,
    uTime: null,
    uP: null,
    uNight: null,
    uIntro: null,
    uWx: null,
    uWorld: null,
    uLand: null,
    uStrip: null,
    uSun: null,
    uTex: null,
    uView: null,
  };
  /** The endless world: how far the camera had flown when this page opened, the stretch of route now in
   *  the land table, and when the sky began to settle and from where. */
  private flown = 3;
  private stripAt = Number.NaN;
  private landTex: WebGLTexture | null = null;
  /** The world's photographs (world-tex.ts), as images and as textures, and when the last of them
   *  arrived, so they fade in. */
  private photos: HTMLImageElement[] = [];
  private photoTex: WebGLTexture[] = [];
  private photosAt = -1;
  private flownAt = -1;
  private skyFrom: { at: number; dark: boolean } | null = null;
  private turnFrom: { at: number; sun: [number, number] } | null = null;
  private sun: [number, number] = [0, 0];
  /** The opening now playing: when it began and how long it runs. */
  private opening: { at: number; ms: number } | null = null;
  private stop = new AbortController();
  private raf = 0;
  private last = 0;
  private touched = 0;
  private ready = false;
  private p = -1;
  private night = 0;
  private turn: { from: number; to: number; at: number } | null = null;
  private rate = DESK;
  private budget = DESK.start;
  private slow = 0;
  private fast = 0;
  private frames = 0;
  private light: FlightLight | null = null;
  private shown = { p: -1, night: -1 };
  private fading = false;
  private frozen = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private o: FlightOptions
  ) {}

  /** Sets everything up. False when this browser cannot draw the landscape. */
  start(): boolean {
    const gl = this.canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) return false;
    this.gl = gl;
    this.rate = paceFor();
    this.budget = this.rate.start;
    if (!this.build()) return false;
    const { signal } = this.stop;
    const touch = () => this.wake();
    for (const type of ["scroll", "pointermove", "pointerdown", "keydown", "resize"] as const)
      addEventListener(type, touch, { passive: true, signal });
    document.addEventListener("visibilitychange", touch, { signal });
    this.canvas.addEventListener("webglcontextlost", (e) => e.preventDefault(), { signal });
    this.canvas.addEventListener(
      "webglcontextrestored",
      () => {
        if (this.build()) this.wake();
      },
      { signal }
    );
    this.night = this.o.night() ? 1 : 0;
    const world = this.o.world;
    if (world) {
      const kept = Number(sessionStorage.getItem(FLOWN_KEY));
      const from = typeof world === "object" ? world.from : undefined;
      this.flown = from ?? (Number.isFinite(kept) && kept > 0 ? kept : 3);
      addEventListener("pagehide", () => this.keep(), { signal });
    }
    this.wake();
    if (process.env.NODE_ENV !== "production") {
      /* for the picture scripts in scripts/dev: draw one exact moment and hold it */
      (window as unknown as { __flight?: unknown }).__flight = (
        p: number | null,
        night = 0,
        time = STILL_TIME
      ) => {
        this.frozen = p !== null;
        if (p !== null) this.draw(p, night, time);
        else this.wake();
      };
      /* and for looking at the endless world: hold a land, a distance or a sky without loading again */
      (window as unknown as { __world?: unknown }).__world = (to: FlightOptions["world"]) => {
        this.o.world = to;
        if (typeof to === "object" && to.from !== undefined) this.flown = to.from;
        this.stripAt = Number.NaN;
        this.wake();
      };
      (window as unknown as { __where?: unknown }).__where = () => this.flown;
      (window as unknown as { __photos?: unknown }).__photos = () => this.photosAt >= 0;
    }
    return true;
  }

  /** Plays the opening (shader.ts: the sun climbs over the ridge as the mist drains). False when held still. */
  open(ms = 4200): boolean {
    if (!this.gl || this.o.still()) return false;
    this.opening = { at: performance.now(), ms };
    this.wake();
    return true;
  }

  /** How far through the opening it is at `now` (1 when none is playing). */
  private stage(now: number): number {
    const o = this.opening;
    if (!o) return 1;
    const t = Math.min(1, Math.max(0, (now - o.at) / o.ms));
    if (t >= 1) this.opening = null;
    return t;
  }

  /** Something changed (the mode, the still button, the page): look again. */
  wake() {
    this.touched = performance.now();
    if (!this.raf && this.gl) this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    if (this.o.world) this.keep();
    this.stop.abort();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.gl = null;
  }

  private build(): boolean {
    const gl = this.gl;
    if (!gl) return false;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[flight] shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, this.o.world ? `#define WORLD\n${FRAG}` : FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return false;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[flight] link:", gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    /* one small sheet of random numbers; every hill, cloud, ripple and star is built from it */
    const data = new Uint8Array(256 * 256);
    let seed = 20261111;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed >>> 24;
    }
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      256,
      256,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const name of Object.keys(this.uniforms) as (keyof Flight["uniforms"])[])
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    if (this.o.world) {
      /* the land table: filled in draw() with the route just ahead */
      this.landTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.landTex);
      for (const [k, v] of [
        [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
        [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ])
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(this.uniforms.uLand, 1);
      gl.activeTexture(gl.TEXTURE0);
      this.stripAt = Number.NaN;
      /* the world's photographs, from unit 2 on: one plain pixel each until they arrive (the land's own
         colour, lying flat); a device with too few units keeps the plain world */
      this.photoTex = [];
      if ((gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number) >= 2 + WORLD_PHOTOS.length) {
        WORLD_PHOTOS.forEach((name, at) => {
          const tex = gl.createTexture();
          if (!tex) return;
          this.photoTex[at] = tex;
          gl.activeTexture(gl.TEXTURE2 + at);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          const plain = new Uint8Array([128, 128, 128]);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, plain);
          gl.uniform1i(gl.getUniformLocation(prog, photoSampler(name)), 2 + at);
          const img = this.photos[at];
          if (img?.complete && img.naturalWidth) this.upload(gl, at, img);
        });
        gl.activeTexture(gl.TEXTURE0);
        if (!this.photos.length) this.loadPhotos();
      }
    }
    this.shown = { p: -1, night: -1 };
    return true;
  }

  /** Fetches the world's photographs, quietly, after the first picture; once all have arrived they fade in. */
  private loadPhotos() {
    let left = WORLD_PHOTOS.length;
    WORLD_PHOTOS.forEach((name, at) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const gl = this.gl;
        if (gl && !gl.isContextLost()) this.upload(gl, at, img);
        if (--left > 0) return;
        this.photosAt = performance.now();
        this.shown = { p: -1, night: -1 };
        this.wake();
      };
      img.src = `${WORLD_PHOTO_DIR}${name}.jpg`;
      this.photos[at] = img;
    });
  }

  /** Puts one photograph on its texture, sharp at every distance and at a slant. */
  private upload(gl: WebGLRenderingContext, at: number, img: HTMLImageElement) {
    const tex = this.photoTex[at];
    if (!tex) return;
    gl.activeTexture(gl.TEXTURE2 + at);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    /* the numbers in the file as they are: they are ratios and tilts, not colours to be managed */
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const slant = gl.getExtension("EXT_texture_filter_anisotropic");
    if (slant) {
      const most = gl.getParameter(slant.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
      gl.texParameterf(gl.TEXTURE_2D, slant.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, most));
    }
    gl.activeTexture(gl.TEXTURE0);
  }

  private size() {
    const gl = this.gl;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!gl || !w || !h) return;
    const scale = Math.min(Math.sqrt(this.budget / (w * h)), Math.min(devicePixelRatio || 1, 2));
    const cw = Math.max(2, Math.round(w * scale));
    const ch = Math.max(2, Math.round(h * scale));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
    }
  }

  private draw(p: number, night: number, time: number, intro = 1) {
    const gl = this.gl;
    if (!gl || gl.isContextLost()) return;
    this.size();
    gl.uniform2f(this.uniforms.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform1f(this.uniforms.uP, p);
    gl.uniform1f(this.uniforms.uNight, night);
    gl.uniform1f(this.uniforms.uIntro, intro);
    const sky = this.o.sky?.() ?? null;
    if (this.o.world) {
      this.world(gl, time);
      /* the photographs fade in over a second; held still, they are simply there */
      const t = (performance.now() - this.photosAt) / 900;
      const held = this.o.still() || this.frozen;
      gl.uniform1f(this.uniforms.uTex, this.photosAt < 0 ? 0 : held ? 1 : Math.min(1, t));
    }
    gl.uniform4f(
      this.uniforms.uWx,
      sky?.cloud ?? 0,
      sky?.rain ?? 0,
      sky?.mist ?? 0,
      sky?.snow ?? 0
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.shown = { p, night };
    if (!this.ready) {
      this.ready = true;
      this.o.onReady?.();
    }
  }

  /** Remembers how far this tab has flown, so the next portal page carries on from there. */
  private keep() {
    if (this.o.keep === false) return;
    try {
      sessionStorage.setItem(FLOWN_KEY, String(this.flown));
    } catch {
      /* private browsing: the next page starts the flight again */
    }
  }

  /** The endless world's numbers for this picture: where the camera is, the land ahead, and the sun. */
  private world(gl: WebGLRenderingContext, time: number) {
    const opt = typeof this.o.world === "object" ? this.o.world : {};
    /* the camera drifts on only while pictures are drawn, so a rested tab wakes where it stopped */
    if (this.flownAt >= 0 && !this.o.still())
      this.flown += Math.min(0.1, Math.max(0, time - this.flownAt)) * DRIFT * (opt.speed ?? 1);
    this.flownAt = time;
    const d = this.flown;
    /* the shader's own distance starts again every WRAP, so its numbers stay exact */
    const lap = Math.floor(d / WRAP) * WRAP;
    const start = Math.floor(d) - BEHIND;
    if (start !== this.stripAt) {
      const held = opt.land ? LANDS.findIndex((l) => l.name === opt.land) : -1;
      const some = opt.lands
        ?.map((n) => LANDS.findIndex((l) => l.name === n))
        .filter((i) => i >= 0);
      const only = held >= 0 ? held : some?.length ? some : undefined;
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        COLS,
        STRIP_ROWS,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        strip(start, only)
      );
      gl.activeTexture(gl.TEXTURE0);
      this.stripAt = start;
    }
    gl.uniform1f(this.uniforms.uWorld, d - lap);
    gl.uniform3f(this.uniforms.uStrip, start - lap, PER_UNIT, 1 / COLS);
    /* the sky: each mode opens at its own hour and settles over twenty minutes; when the mode is
       switched, the sun moves from wherever it is to the new mode's opening hour */
    const now = performance.now();
    const wall = Date.now();
    const dark = this.o.night();
    if (!this.skyFrom || dark !== this.skyFrom.dark) {
      const kept = this.skyFrom ? null : keptSky();
      if (this.skyFrom) this.turnFrom = { at: now, sun: this.sun };
      this.skyFrom = kept && kept.dark === dark ? kept : { at: wall, dark };
      try {
        sessionStorage.setItem(SKY_KEY, JSON.stringify(this.skyFrom));
      } catch {
        /* private browsing: the next page opens the sky again */
      }
    }
    const settled = opt.settled ?? (this.o.still() ? 1 : (wall - this.skyFrom.at) / SETTLE_MS);
    let sun = sunAt(dark, settled);
    if (this.turnFrom) {
      const t = ease(Math.min(1, (now - this.turnFrom.at) / TURN_MS));
      const from = this.turnFrom.sun;
      sun = [from[0] + (sun[0] - from[0]) * t, from[1] + (sun[1] - from[1]) * t];
      if (t >= 1) this.turnFrom = null;
    }
    this.sun = sun;
    gl.uniform2f(this.uniforms.uSun, this.sun[0], this.sun[1]);
    /* down the river just above the water (how high, and the tilt), or along the valley's middle */
    const r = opt.river ? 1 : 0;
    gl.uniform3f(this.uniforms.uView, r, r * RIVER_HEIGHT, r * RIVER_TILT);
  }

  /** Every so often, time one picture and draw softer or sharper to suit the device. */
  private pace(p: number, night: number, time: number) {
    const gl = this.gl;
    if (!gl) return;
    const t0 = performance.now();
    this.draw(p, night, time);
    gl.finish();
    const ms = performance.now() - t0;
    const { min, max, slowMs, fastMs } = this.rate;
    this.slow = ms > slowMs ? this.slow + 1 : 0;
    this.fast = ms < fastMs ? this.fast + 1 : 0;
    if (this.slow >= 2 && this.budget > min) {
      this.budget = Math.max(min, this.budget * 0.7);
      this.slow = 0;
    } else if (this.fast >= 4 && this.budget < max) {
      this.budget = Math.min(max, this.budget * 1.25);
      this.fast = 0;
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.gl || this.frozen || document.hidden) return;
    const still = this.o.still();
    const max = document.documentElement.scrollHeight - innerHeight;
    const scrolled = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const down = this.o.progress ? Math.min(1, Math.max(0, this.o.progress())) : scrolled;
    const [from, to] = this.o.route ?? [0, 1];
    const goal = from + down * (to - from);
    const want = this.o.night() ? 1 : 0;
    const light: FlightLight = want
      ? goal > 0.86
        ? "dawn"
        : "night"
      : goal < 0.13
        ? "dawn"
        : goal < 0.62
          ? "day"
          : "sunset";
    if (light !== this.light) {
      this.light = light;
      this.o.onLight?.(light);
    }

    if (still) {
      /* no flying and no drifting: step between the stops, each change a short fade */
      const stop = from + (Math.round(down * STOPS) / STOPS) * (to - from);
      this.turn = null;
      this.opening = null;
      if (!this.fading && (stop !== this.shown.p || want !== this.shown.night)) {
        if (this.shown.p < 0) {
          this.draw(stop, want, STILL_TIME);
        } else {
          this.fading = true;
          this.canvas.setAttribute("data-swap", "");
          setTimeout(() => {
            this.draw(stop, want, STILL_TIME);
            this.canvas.removeAttribute("data-swap");
            this.fading = false;
            this.wake();
          }, 240);
        }
      }
      this.p = stop;
      this.night = want;
      return;
    }

    if (now - this.last >= FRAME_MS - 2) {
      this.last = now;
      if (this.p < 0) this.p = goal;
      this.p += (goal - this.p) * 0.14;
      if (Math.abs(goal - this.p) < 0.0004) this.p = goal;
      /* the mode: the sun sets or rises from wherever it is now */
      if (!this.turn ? want !== Math.round(this.night) : want !== this.turn.to)
        this.turn = { from: this.night, to: want, at: now };
      if (this.turn) {
        const t = Math.min(1, (now - this.turn.at) / TURN_MS);
        this.night = this.turn.from + (this.turn.to - this.turn.from) * ease(t);
        if (t >= 1) this.turn = null;
      }
      this.frames++;
      const intro = this.stage(now);
      /* the opening is not timed for pace: its mist is heavier to draw than the resting view */
      if (this.frames % 24 === 8 && intro >= 1) this.pace(this.p, this.night, now / 1000);
      else this.draw(this.p, this.night, now / 1000, intro);
    }
    const moving = this.turn !== null || this.p !== goal || this.opening !== null;
    if (moving || now - this.touched < IDLE_MS) this.raf = requestAnimationFrame(this.frame);
  };
}
