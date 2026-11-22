// The phone bar's two hooks: how wide it is, and the lens being dragged along it.
import type { MotionValue } from "framer-motion";
import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** The bar's width, kept as it changes. Nothing is measured on the desktop rail. */
export function useBarWidth(list: RefObject<HTMLUListElement | null>, rail: boolean) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul || rail) return;
    const measure = () => setWidth(ul.clientWidth);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(ul);
    return () => watch.disconnect();
  }, [list, rail]);
  return width;
}

/* where a flick comes to rest (Apple's deceleration rate, Designing Fluid Interfaces) */
const project = (v: number) => ((v / 1000) * 0.99) / (1 - 0.99);

/** The lens follows a finger dragged along the bar, pulling back softly past either end. Let go, it
 *  is thrown: `onThrow` is told where its speed was carrying it, and that speed. */
export function useLensDrag(
  x: MotionValue<number>,
  on: boolean,
  onThrow: (to: number, velocity: number) => void
) {
  const drag = useRef<{
    startX: number;
    from: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    v: number;
  } | null>(null);
  const down = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (!on) return;
    drag.current = {
      startX: e.clientX,
      from: x.get(),
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
    };
  };
  const move = (e: ReactPointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 10) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.6 * d.v + 0.4 * (((e.clientX - d.lastX) / dt) * 1000);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    const w = e.currentTarget.offsetWidth;
    const raw = d.from + (e.clientX - d.startX);
    const over = raw < 28 ? raw - 28 : raw > w - 28 ? raw - (w - 28) : 0;
    x.set(raw - over + over * 0.25);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    onThrow(x.get() + project(d.v), d.v);
  };
  return { down, move, up };
}
