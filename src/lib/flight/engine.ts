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
 * - If the browser cannot draw it, start() says so and the page keeps its plain sky.
 */
import { FRAG, VERT } from "./shader";

export type FlightLight = "dawn" | "day" | "sunset" | "night";

export interface FlightOptions {
  /** True while nothing may move by itself. */
  still: () => boolean;
  /** True in dark mode. */
  night: () => boolean;
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
  private uniforms: Record<"uRes" | "uTime" | "uP" | "uNight", WebGLUniformLocation | null> = {
    uRes: null,
    uTime: null,
    uP: null,
    uNight: null,
  };
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
    }
    return true;
  }

  /** Something changed (the mode, the still button, the page): look again. */
  wake() {
    this.touched = performance.now();
    if (!this.raf && this.gl) this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
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
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
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
    for (const name of ["uRes", "uTime", "uP", "uNight"] as const)
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    this.shown = { p: -1, night: -1 };
    return true;
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

  private draw(p: number, night: number, time: number) {
    const gl = this.gl;
    if (!gl || gl.isContextLost()) return;
    this.size();
    gl.uniform2f(this.uniforms.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform1f(this.uniforms.uP, p);
    gl.uniform1f(this.uniforms.uNight, night);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.shown = { p, night };
    if (!this.ready) {
      this.ready = true;
      this.o.onReady?.();
    }
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
    const goal = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
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
      const stop = Math.round(goal * STOPS) / STOPS;
      this.turn = null;
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
      if (this.frames % 24 === 8) this.pace(this.p, this.night, now / 1000);
      else this.draw(this.p, this.night, now / 1000);
    }
    const moving = this.turn !== null || this.p !== goal;
    if (moving || now - this.touched < IDLE_MS) this.raf = requestAnimationFrame(this.frame);
  };
}
