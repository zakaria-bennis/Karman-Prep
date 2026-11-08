import { useCallback, useEffect, useRef } from "react";
import { reducedMotionNow } from "@/design-system/motion";

/*
 * The voxel burst when the box opens: sixteen small isometric cubes in the
 * accent fly out and fall away (the end screen's cube() and burst()).
 */
export interface Cube {
  id: number;
  s: number;
  x: number;
  y: number;
  a: number;
  d: number;
  dir: 1 | -1;
}

function Voxel({ c, size, top }: { c: Cube; size: number; top: string }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.animate(
        [
          { transform: "none", opacity: 1 },
          {
            transform: `translate(${Math.cos(c.a) * c.d * 0.6}px, ${Math.sin(c.a) * c.d * 0.5 - 50}px) rotate(${c.dir * 60}deg)`,
            opacity: 1,
            offset: 0.45,
          },
          {
            transform: `translate(${Math.cos(c.a) * c.d}px, ${Math.sin(c.a) * c.d * 0.5 + 70}px) rotate(${c.dir * 140}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: reducedMotionNow() ? 1 : 900,
          easing: "cubic-bezier(.2,.6,.4,1)",
          fill: "forwards",
        }
      );
    },
    [c]
  );
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-[30]"
      style={{
        left: `calc(50% + ${(c.x - 0.5) * size - c.s / 2}px)`,
        top: `calc(${top} + ${(c.y - 0.6) * size * 1.17 - c.s / 2}px)`,
        width: c.s,
      }}
      aria-hidden="true"
    >
      <svg viewBox="-12 -14 24 28" width={c.s} style={{ display: "block" }}>
        <path
          d="M0 -12 L10 -6 L0 0 L-10 -6Z"
          fill="color-mix(in srgb, rgb(var(--k-accent)) 80%, #fff)"
        />
        <path d="M-10 -6 L0 0 L0 12 L-10 6Z" fill="rgb(var(--k-accent))" />
        <path
          d="M10 -6 L0 0 L0 12 L10 6Z"
          fill="color-mix(in srgb, rgb(var(--k-accent)) 76%, #000)"
        />
      </svg>
    </div>
  );
}

export function Cubes({
  cubes,
  size,
  top,
  onDone,
}: {
  cubes: Cube[];
  size: number;
  top: string;
  onDone(): void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!cubes.length) return;
    const t = setTimeout(() => done.current(), 1000);
    return () => clearTimeout(t);
  }, [cubes]);
  return (
    <>
      {cubes.map((c) => (
        <Voxel key={c.id} c={c} size={size} top={top} />
      ))}
    </>
  );
}
