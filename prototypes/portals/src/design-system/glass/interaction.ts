/**
 * Press and glow physics for a glass control, ported from 21st.dev 12460
 * (dom/interaction.ts) with Karman's rule: feedback on press, not release
 * (scale 0.97 on pointer down), a pointer-lit glow on hover, and the keyboard
 * pressing it too. Springs are the reference's closed-form (duration, bounce).
 */
interface SpringOptions {
  duration: number;
  bounce: number;
}

export const springs = {
  press: { duration: 0.24, bounce: 0.2 },
  release: { duration: 0.5, bounce: 0.42 },
  glow: { duration: 0.42, bounce: 0 },
} as const satisfies Record<string, SpringOptions>;

export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private stiffness = 0;
  private damping = 0;
  constructor(value: number, options: SpringOptions) {
    this.value = value;
    this.target = value;
    this.configure(options);
  }
  configure({ duration, bounce }: SpringOptions): this {
    const omega = (2 * Math.PI) / duration;
    this.stiffness = omega * omega;
    this.damping =
      bounce >= 0
        ? (4 * Math.PI * (1 - bounce)) / duration
        : (4 * Math.PI) / (duration * (1 + bounce));
    return this;
  }
  get settled(): boolean {
    return this.value === this.target && this.velocity === 0;
  }
  step(dt: number): this {
    if (this.settled || !(dt > 0)) return this;
    const omega = Math.sqrt(this.stiffness);
    const zeta = this.damping / (2 * omega);
    const x0 = this.value - this.target;
    const v0 = this.velocity;
    let x: number;
    let v: number;
    if (zeta < 1) {
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega * dt);
      const b = (v0 + zeta * omega * x0) / wd;
      const cos = Math.cos(wd * dt);
      const sin = Math.sin(wd * dt);
      x = decay * (x0 * cos + b * sin);
      v = decay * ((b * wd - zeta * omega * x0) * cos - (x0 * wd + zeta * omega * b) * sin);
    } else {
      const decay = Math.exp(-omega * dt);
      const b = v0 + omega * x0;
      x = decay * (x0 + b * dt);
      v = decay * (b - omega * (x0 + b * dt));
    }
    const scale = Math.max(1, Math.abs(this.target), Math.abs(x0));
    if (Math.abs(x) < 1e-4 * scale && Math.abs(v) < 1e-3 * scale) {
      this.value = this.target;
      this.velocity = 0;
    } else {
      this.value = this.target + x;
      this.velocity = v;
    }
    return this;
  }
}

const HOVER = "(hover: hover) and (pointer: fine)";
const PRESS_SCALE = 0.97;

function isDisabled(el: HTMLElement) {
  return el.matches(":disabled, [aria-disabled='true']");
}

export function attachInteraction(el: HTMLElement, motion: () => boolean): { dispose(): void } {
  const press = new Spring(0, springs.press);
  const glow = new Spring(0, springs.glow);
  let pointerId: number | null = null;
  let keyboard = false;
  let hovering = false;
  let raf = 0;
  let previous = 0;
  let gx = 0;
  let gy = 0;

  const light = (x: number, y: number) => {
    const r = el.getBoundingClientRect();
    gx = ((x - r.left) * el.offsetWidth) / (r.width || 1);
    gy = ((y - r.top) * el.offsetHeight) / (r.height || 1);
  };
  const set = (s: Spring, target: number, o: SpringOptions) => {
    s.configure(o).target = target;
    wake();
  };
  const release = () => {
    pointerId = null;
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    set(press, 0, springs.release);
    set(glow, hovering ? 0.35 : 0, springs.glow);
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || isDisabled(el)) return;
    pointerId = e.pointerId;
    light(e.clientX, e.clientY);
    set(press, 1, springs.press);
    set(glow, 1, springs.press);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };
  const hover = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !matchMedia(HOVER).matches) return;
    hovering = e.type !== "pointerleave";
    if (hovering) light(e.clientX, e.clientY);
    if (pointerId === null && !keyboard) set(glow, hovering ? 0.35 : 0, springs.glow);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    if (e.type === "keydown") {
      if (e.repeat || isDisabled(el) || pointerId !== null) return;
      keyboard = true;
      gx = el.offsetWidth / 2;
      gy = el.offsetHeight / 2;
      set(press, 1, springs.press);
      set(glow, 1, springs.press);
    } else if (keyboard) {
      keyboard = false;
      set(press, 0, springs.release);
      set(glow, hovering ? 0.35 : 0, springs.glow);
    }
  };
  const blur = () => {
    if (!keyboard) return;
    keyboard = false;
    set(press, 0, springs.release);
    set(glow, 0, springs.glow);
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = previous ? Math.max(0, (now - previous) / 1000) : 1 / 60;
    previous = now;
    press.step(dt);
    glow.step(dt);
    const full = motion();
    const s = full ? 1 - (1 - PRESS_SCALE) * press.value : 1;
    el.style.scale = Math.abs(s - 1) > 1e-4 ? `${s.toFixed(4)}` : "";
    el.style.setProperty("--k-glow", glow.value > 0.001 ? glow.value.toFixed(3) : "0");
    el.style.setProperty("--k-glow-x", `${gx.toFixed(1)}px`);
    el.style.setProperty("--k-glow-y", `${gy.toFixed(1)}px`);
    if (pointerId !== null || keyboard) el.dataset.pressed = "";
    else delete el.dataset.pressed;
    if (!press.settled || !glow.settled || pointerId !== null) raf = requestAnimationFrame(frame);
    else previous = 0;
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerenter", hover);
  el.addEventListener("pointermove", hover);
  el.addEventListener("pointerleave", hover);
  el.addEventListener("keydown", key);
  el.addEventListener("keyup", key);
  el.addEventListener("focusout", blur);
  return {
    dispose() {
      release();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerenter", hover);
      el.removeEventListener("pointermove", hover);
      el.removeEventListener("pointerleave", hover);
      el.removeEventListener("keydown", key);
      el.removeEventListener("keyup", key);
      el.removeEventListener("focusout", blur);
      el.style.scale = "";
    },
  };
}
