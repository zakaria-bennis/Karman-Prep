import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { planesFor } from "./maps";
import { acquireFilter, canRefract, filterId, filterMarkup, releaseFilter } from "./filter";
import { attachInteraction } from "./interaction";
import { reducedMotionNow } from "../motion";
import { hexToRgb } from "../themes";

export interface GlassOptions {
  /** auto refracts on Chromium and frosts elsewhere; the gallery forces one or the other. */
  recipe: "refract" | "frost";
  dark: boolean;
  /** Pigment the glass with this hex (the accent, for the one highlighted action). */
  tint?: string;
  /** Rim pull in px: 6 for a knob, 14 for a button, 24 for a large surface. */
  refraction?: number;
  interactive?: boolean;
}

interface Built {
  id: string;
  overlay: string;
  w: number;
  h: number;
}

/**
 * The lens, overlay and glow layers of a liquid glass control, ported from
 * 21st.dev 12460 (useLiquidGlass). Put the returned layers first inside a
 * `.k-glass` element whose ref is `rootRef`; the hook measures it, builds the
 * two map planes at its size, shares one SVG filter per geometry, and wires the
 * press and glow physics when `interactive` is set.
 */
export function useLiquidGlass(rootRef: RefObject<HTMLElement | null>, o: GlassOptions) {
  const lensRef = useRef<HTMLSpanElement>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const refract = o.recipe === "refract" && canRefract();
  const tintKey = o.tint ?? "";
  const amount = o.refraction ?? 14;

  useLayoutEffect(() => {
    const lens = lensRef.current;
    if (!lens) return;
    let held: string | null = null;
    let raf = 0;
    const build = () => {
      raf = 0;
      const w = Math.round(lens.offsetWidth);
      const h = Math.round(lens.offsetHeight);
      if (w < 2 || h < 2) return;
      const radius = Math.min(
        parseFloat(getComputedStyle(lens).borderTopLeftRadius) || 0,
        w / 2,
        h / 2
      );
      const bezel = Math.round(Math.min(32, Math.min(w, h) / 2));
      const planes = planesFor(w, h, radius, bezel, o.dark);
      if (!refract) {
        setBuilt((p) =>
          p && p.id === "frost" && p.w === w && p.h === h
            ? p
            : { id: "frost", overlay: planes.overlay, w, h }
        );
        return;
      }
      const tint = tintKey
        ? (hexToRgb(tintKey).map((c) => c / 255) as [number, number, number])
        : undefined;
      const spec = { w, h, field: planes.field, dark: o.dark, refraction: amount, tint };
      const id = filterId(spec);
      if (held !== id) {
        if (held) releaseFilter(held);
        acquireFilter(id, filterMarkup(spec));
        held = id;
      }
      setBuilt((p) => (p && p.id === id ? p : { id, overlay: planes.overlay, w, h }));
    };
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(build);
    });
    build();
    ro.observe(lens);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (held) releaseFilter(held);
    };
  }, [o.dark, refract, tintKey, amount]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !o.interactive) return;
    const it = attachInteraction(el, () => !reducedMotionNow());
    return () => it.dispose();
  }, [rootRef, o.interactive]);

  const refracting = refract && built !== null && built.id !== "frost";
  const backdrop = refracting ? `url(#${built!.id}) blur(1px)` : undefined;
  const layers: ReactNode = (
    <>
      <span
        ref={lensRef}
        aria-hidden="true"
        className="k-glass-layer k-glass-lens"
        style={backdrop ? ({ "--k-backdrop": backdrop } as React.CSSProperties) : undefined}
      />
      {built ? (
        <span
          aria-hidden="true"
          className="k-glass-layer k-glass-overlay"
          style={{ backgroundImage: `url(${built.overlay})` }}
        />
      ) : null}
      {refracting && o.dark && !o.tint ? (
        <span
          aria-hidden="true"
          className="k-glass-layer"
          style={{ backgroundColor: "rgb(8 8 10 / 0.08)" }}
        />
      ) : null}
      {o.interactive ? <span aria-hidden="true" className="k-glass-layer k-glass-glow" /> : null}
    </>
  );
  return { layers, refracting, recipe: refracting ? ("refract" as const) : ("frost" as const) };
}
