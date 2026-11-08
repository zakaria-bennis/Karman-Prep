import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  ANIMALS,
  STAGES,
  headSVG,
  type AnimalId,
  type Stage,
} from "@/design-system/marks/mascot-paths";
import { ACCESSORIES, type AccessoryId } from "@/design-system/marks/accessories";
import { EASE, reducedMotionNow } from "@/design-system/motion";
import { applyMood, blink, touchHint, type PetMood } from "./moods";

/**
 * A free-standing companion head with the end screen's idle life, ported from
 * prototypes/daily10-end/core.js (P.fox, P.owl, cheer, the PETS loop): on a fine
 * pointer an idle pet keeps its eyes open and follows the pointer; on touch it
 * keeps the happy closed eyes; it blinks now and then; a cheer is a short waddle.
 * The drawing is the design system's head; accessories drop in and lift out.
 */
export interface PetHandle {
  el: HTMLDivElement | null;
  mood(m: PetMood): void;
  cheer(): void;
  blink(): void;
  wear(acc: AccessoryId | undefined, animate?: boolean): void;
}
export interface PetProps {
  animal?: AnimalId;
  stage?: Stage;
  /** h means idle (open eyes following the pointer, or happy eyes on touch). */
  mood?: PetMood;
  accessory?: AccessoryId;
  size?: number;
  touch?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Rec {
  el: HTMLDivElement;
  mood: PetMood;
  busy: boolean;
  touch: boolean;
  look: { x: number; y: number };
  blinkAt: number;
}
const PETS = new Set<Rec>();
let pointer = { x: -1, y: -1, t: 0 };
let raf = 0;
let listening = false;
const idleOf = (touch: boolean): PetMood => (touch ? "h" : "n");

function loop(t: number) {
  PETS.forEach((p) => {
    if (!p.el.isConnected) return;
    const eyes = p.el.querySelector(".m-eyes");
    if (!eyes) return;
    let tx = 0;
    let ty = 0;
    if (!p.touch && !p.busy && pointer.t && p.mood === "n") {
      const r = p.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.45;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 160);
      tx = (dx / d) * 3.6 * k;
      ty = (dy / d) * 2.6 * k;
    }
    p.look.x += (tx - p.look.x) * 0.18;
    p.look.y += (ty - p.look.y) * 0.18;
    eyes.setAttribute("transform", `translate(${p.look.x.toFixed(2)} ${p.look.y.toFixed(2)})`);
    if (t > p.blinkAt && p.mood === "n" && !p.busy) {
      if (!reducedMotionNow()) blink(p.el);
      p.blinkAt = t + 1800 + Math.random() * 4200;
    }
  });
  raf = PETS.size ? requestAnimationFrame(loop) : 0;
}
function register(p: Rec) {
  PETS.add(p);
  if (!listening) {
    listening = true;
    addEventListener(
      "pointermove",
      (e) => {
        pointer = { x: e.clientX, y: e.clientY, t: performance.now() };
      },
      { passive: true }
    );
  }
  if (!raf) raf = requestAnimationFrame(loop);
}
export function cheerAll() {
  PETS.forEach(cheerRec);
}
// a short waddle left and right with happy eyes, then back to idle
function cheerRec(p: Rec) {
  const svg = p.el.querySelector("svg");
  if (!svg || p.busy) return;
  p.busy = true;
  applyMood(p.el, "h");
  svg.style.transformOrigin = "50% 92%";
  const a = svg.animate(
    [
      { transform: "none" },
      { transform: "translateX(-4px) rotate(-9deg)" },
      { transform: "translateY(-5px) rotate(0deg)" },
      { transform: "translateX(4px) rotate(9deg)" },
      { transform: "translateY(-5px) rotate(0deg)" },
      { transform: "translateX(-4px) rotate(-8deg)" },
      { transform: "translateX(4px) rotate(7deg)" },
      { transform: "none" },
    ],
    { duration: reducedMotionNow() ? 1 : 1150, easing: "ease-in-out" }
  );
  a.finished
    .then(() => {
      p.busy = false;
      applyMood(p.el, p.mood);
    })
    .catch(() => {
      p.busy = false;
    });
}
function wearOn(el: HTMLDivElement, acc: AccessoryId | undefined, animate: boolean) {
  const g = el.querySelector("svg > g");
  if (!g) return;
  const old = Array.from(g.querySelectorAll(".acc"));
  if (!acc) {
    old.forEach((n) =>
      animate && !reducedMotionNow()
        ? n
            .animate(
              [
                { opacity: 1, transform: "none" },
                { opacity: 0, transform: "translateY(-30px)" },
              ],
              { duration: 380, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
            )
            .finished.then(() => n.remove())
            .catch(() => n.remove())
        : n.remove()
    );
    return;
  }
  old.forEach((n) => n.remove());
  g.insertAdjacentHTML("beforeend", ACCESSORIES[acc]);
  const n = g.lastElementChild;
  if (n && animate && !reducedMotionNow())
    n.animate(
      [
        { transform: "translateY(-40px)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 480, easing: EASE }
    );
}

export const Pet = forwardRef<PetHandle, PetProps>(function Pet(
  { animal = "fox", stage = "grown", mood = "h", accessory, size = 120, touch, className, style },
  ref
) {
  const el = useRef<HTMLDivElement>(null);
  const rec = useRef<Rec | null>(null);
  const st = STAGES[stage];
  const html = useMemo(() => headSVG(ANIMALS[animal], st), [animal, st]);
  const isTouch = touch ?? touchHint();
  const resolved: PetMood = mood === "h" ? idleOf(isTouch) : mood;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const r: Rec = {
      el: node,
      mood: resolved,
      busy: false,
      touch: isTouch,
      look: { x: 0, y: 0 },
      blinkAt: performance.now() + 2500,
    };
    rec.current = r;
    register(r);
    return () => {
      PETS.delete(r);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const r = rec.current;
    if (!r) return;
    r.mood = resolved;
    r.touch = isTouch;
    if (!r.busy) applyMood(r.el, resolved);
  }, [resolved, isTouch, html]);
  useEffect(() => {
    if (el.current) wearOn(el.current, accessory, false);
  }, [accessory, html]);

  useImperativeHandle(
    ref,
    () => ({
      get el() {
        return el.current;
      },
      mood(m) {
        const r = rec.current;
        if (!r) return;
        r.mood = m === "h" ? idleOf(r.touch) : m;
        if (!r.busy) applyMood(r.el, r.mood);
      },
      cheer() {
        if (rec.current) cheerRec(rec.current);
      },
      blink() {
        if (el.current) blink(el.current, true);
      },
      wear(acc, animate = true) {
        if (el.current) wearOn(el.current, acc, animate);
      },
    }),
    []
  );

  return (
    <div
      ref={el}
      className={`k-pet ${className ?? ""}`}
      style={{ width: size, ...style }}
      aria-hidden="true"
    >
      <svg
        viewBox="-60 -112 120 128"
        width={size}
        height={(size * 128) / 120}
        style={{ display: "block", overflow: "visible" }}
      >
        <g transform={`scale(${st.head})`} dangerouslySetInnerHTML={{ __html: html }} />
      </svg>
    </div>
  );
});
