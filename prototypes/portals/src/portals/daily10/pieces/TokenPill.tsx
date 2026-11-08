import { forwardRef, useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { Token, BoxIcon } from "@/design-system/marks";
import { EASE, reducedMotionNow } from "@/design-system/motion";
import { RollingNumber } from "./RollingNumber";
import { SFX } from "../sfx";
import type { Run } from "../run";

/*
 * The token balance (Crossy Road's corner counter) with the end screen's lit top
 * edge (Glass Card, 21st.dev 28259, kept to the pill and the sheet). The count
 * rolls per digit. A box counter is the same pill with the box icon.
 */
export const TokenPill = forwardRef<
  HTMLDivElement,
  {
    value: number;
    size?: "md" | "sm";
    icon?: "token" | "box";
    className?: string;
    style?: CSSProperties;
  }
>(function TokenPill({ value, size = "md", icon = "token", className, style }, ref) {
  const h = size === "md" ? 36 : 30;
  return (
    <div
      ref={ref}
      className={`tk-pill inline-flex shrink-0 items-center gap-[7px] rounded-pill border border-line font-semibold text-text ${size === "md" ? "text-[16px]" : "text-[14px]"} ${className ?? ""}`}
      style={{
        height: h,
        padding: "0 14px 0 9px",
        background: "color-mix(in srgb, rgb(var(--k-text)) 6%, rgb(var(--k-surface)))",
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -1px 0 rgb(0 0 0 / 0.12)",
        ...style,
      }}
      aria-label={`${value.toLocaleString("en-US")} ${icon === "token" ? "tokens" : "boxes"}`}
    >
      <span className="tk-icon flex items-center">
        {icon === "token" ? <Token size={20} /> : <BoxIcon size={22} />}
      </span>
      <RollingNumber value={value} />
    </div>
  );
});

/** Where an element sits inside a host, in the host's own pixels, whatever the frame scale. */
export function rectIn(host: HTMLElement, el: Element) {
  const h = host.getBoundingClientRect();
  const k = h.width / host.clientWidth || 1;
  const r = el.getBoundingClientRect();
  return {
    x: (r.left - h.left) / k + host.scrollLeft,
    y: (r.top - h.top) / k + host.scrollTop,
    w: r.width / k,
    h: r.height / k,
  };
}

interface Flight {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  lift: number;
  delay: number;
  ms: number;
  size: number;
  kind: "token" | "box";
  scaleTo: number;
}
let flightId = 1;

function Flying({ f, onDone }: { f: Flight; onDone(id: number): void }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const frames: Keyframe[] = [];
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const k = i / N;
        const x = f.x0 + (f.x1 - f.x0) * k;
        const y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * f.lift;
        const s = f.kind === "token" ? 0.6 + 0.4 * Math.min(1, k * 2) : 1 - (1 - f.scaleTo) * k;
        const rot = f.kind === "token" ? k * 200 : 0;
        frames.push({ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${rot}deg)` });
      }
      const reduced = reducedMotionNow();
      const a = el.animate(frames, {
        duration: reduced ? 1 : f.ms,
        delay: reduced ? 0 : f.delay,
        easing: "cubic-bezier(.65,0,.35,1)",
        fill: "both",
      });
      a.finished.then(() => onDone(f.id)).catch(() => onDone(f.id));
    },
    [f, onDone]
  );
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-[40]"
      style={{ transformOrigin: "0 0" }}
      aria-hidden="true"
    >
      {f.kind === "token" ? <Token size={f.size} glint={false} /> : <BoxIcon size={f.size} />}
    </div>
  );
}

/**
 * Tokens fly from a source to the counter, one after another, and the payout
 * sound is scheduled once so each clink lands with a token. Returns a layer to
 * render inside the screen's root (position: relative) and the `fly` call.
 */
export function useFlights(host: React.RefObject<HTMLElement | null>) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const done = useCallback((id: number) => setFlights((f) => f.filter((x) => x.id !== id)), []);
  const fly = useCallback(
    async (
      run: Run,
      from: Element,
      to: Element,
      opts: { n?: number; gap?: number; ms?: number; kind?: "token" | "box"; onLand?(): void } = {}
    ) => {
      const root = host.current;
      if (!root) return;
      const { n = 14, gap = 50, ms = 560, kind = "token" } = opts;
      const src = rectIn(root, from);
      const dst = rectIn(root, to);
      const size = kind === "token" ? 18 : 36;
      if (kind === "token") SFX.tokens(ms / 1000, n, gap / 1000);
      const list: Flight[] = [];
      for (let i = 0; i < n; i++) {
        list.push({
          id: flightId++,
          x0: kind === "token" ? src.x + src.w / 2 - 9 + ((i % 5) - 2) * 7 : src.x,
          y0: kind === "token" ? src.y + src.h / 2 - 9 + (i % 2) * 6 : src.y,
          x1: kind === "token" ? dst.x + 1 : dst.x,
          y1: kind === "token" ? dst.y + 1 : dst.y,
          lift: kind === "token" ? 60 + (i % 4) * 10 : 90,
          delay: i * gap,
          ms,
          size,
          kind,
          scaleTo: kind === "token" ? 1 : dst.w / Math.max(1, src.w),
        });
      }
      setFlights((f) => [...f, ...list]);
      for (let i = 0; i < n; i++) {
        await run.wait(i === 0 ? ms : gap);
        opts.onLand?.();
        run.anim(
          to.closest(".tk-pill") ?? to,
          [{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }],
          { duration: 160, easing: EASE }
        );
      }
    },
    [host]
  );
  const layer: ReactNode = flights.map((f) => <Flying key={f.id} f={f} onDone={done} />);
  return { fly, layer };
}
export type Flyer = ReturnType<typeof useFlights>["fly"];
