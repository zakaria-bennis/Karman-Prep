import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../cn";
import { useTheme } from "../theme";
import { animateSpring, project } from "../motion";
import { useLiquidGlass } from "./useLiquidGlass";

/*
 * GlassToggle: the knob is a clear glass drop on an opaque track. The tap,
 * drag, snap and keyboard model follows the Liquid Toggle (21st.dev 43112);
 * its WebGL water and CSS-gradient fallback were not ported (too heavy for a
 * theme switch, and gradients are out), so the knob is drawn by the glass
 * engine and moves on the quick spring with the flick's velocity carried over.
 */
export interface GlassToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icons?: { off?: ReactNode; on?: ReactNode };
  disabled?: boolean;
  className?: string;
}

const W = 52;
const H = 32;
const KNOB = 26;
const TRAVEL = W - KNOB - 6;

export function GlassToggle({
  checked,
  onChange,
  label,
  icons,
  disabled,
  className,
}: GlassToggleProps) {
  const theme = useTheme();
  const knobRef = useRef<HTMLSpanElement | null>(null);
  const glass = useLiquidGlass(knobRef, { recipe: theme.glass, dark: theme.dark, refraction: 6 });
  const [x, setX] = useState(checked ? TRAVEL : 0);
  const drag = useRef<{
    id: number;
    start: number;
    grab: number;
    moved: boolean;
    hist: { x: number; t: number }[];
  } | null>(null);
  const anim = useRef<{ cancel(): void } | null>(null);
  const xRef = useRef(x);
  xRef.current = x;

  const settle = (on: boolean, velocity = 0) => {
    anim.current?.cancel();
    anim.current = animateSpring(xRef.current, on ? TRAVEL : 0, setX, "quick", velocity);
  };
  useEffect(() => {
    if (!drag.current) settle(checked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const commit = (on: boolean, velocity = 0) => {
    settle(on, velocity);
    if (on !== checked) onChange(on);
  };
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      start: e.clientX,
      grab: e.clientX - xRef.current,
      moved: false,
      hist: [{ x: e.clientX, t: performance.now() }],
    };
    anim.current?.cancel();
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.abs(e.clientX - d.start) > 4) d.moved = true;
    if (!d.moved) return;
    setX(Math.max(-6, Math.min(TRAVEL + 6, e.clientX - d.grab)));
    d.hist.push({ x: e.clientX, t: performance.now() });
    if (d.hist.length > 6) d.hist.shift();
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      commit(!checked);
      return;
    }
    const a = d.hist[0];
    const b = d.hist[d.hist.length - 1];
    const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
    const landing = xRef.current + project(v);
    commit(landing > TRAVEL / 2, v);
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      commit(e.key === "ArrowRight");
    }
  };
  const t = Math.max(0, Math.min(1, x / TRAVEL));

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      className={cn(
        "relative inline-flex shrink-0 touch-pan-y select-none items-center rounded-pill border border-line p-[2px] align-middle",
        "min-h-tap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        checked ? "bg-accent/35" : "bg-raised",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        className
      )}
      style={{ width: W, height: H, transition: "background-color 200ms var(--k-ease)" }}
    >
      <span
        ref={knobRef}
        aria-hidden="true"
        data-recipe={glass.recipe}
        className="k-glass absolute left-[2px] top-[2px] flex items-center justify-center text-text"
        style={{ width: KNOB, height: KNOB, transform: `translateX(${x}px)` }}
      >
        {glass.layers}
        {icons ? (
          <span className="relative block h-4 w-4 [&>svg]:absolute [&>svg]:inset-0 [&>svg]:h-4 [&>svg]:w-4">
            <span style={{ opacity: 1 - t }} className="absolute inset-0 [&>svg]:h-4 [&>svg]:w-4">
              {icons.off}
            </span>
            <span style={{ opacity: t }} className="absolute inset-0 [&>svg]:h-4 [&>svg]:w-4">
              {icons.on}
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
