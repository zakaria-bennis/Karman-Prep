import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";
import { animateSpring, project, rubber, reducedMotionNow } from "../motion";
import { useMediaQuery } from "./hooks";

/*
 * Sheet: a bottom sheet on phones, a side sheet on desktop. Drag to dismiss
 * with Apple's momentum projection and rubber band (the end screen's port of
 * Drawer, 21st.dev 31360, wensity: handle, swipe dismiss past 40 percent,
 * scroll lock, Escape). Opaque Panel recipe, never glass.
 */
export interface SheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  side?: "auto" | "bottom" | "right";
  /** Width of the side sheet on desktop. */
  width?: number;
  done?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "auto",
  width = 420,
  done = "Done",
}: SheetProps) {
  const phone = useMediaQuery("(max-width: 767px)");
  const bottom = side === "bottom" || (side === "auto" && phone);
  const panel = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [mounted, setMounted] = useState(open);
  const drag = useRef<{ id: number; start: number; hist: { v: number; t: number }[] } | null>(null);
  const anim = useRef<{ cancel(): void } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setOffset(bottom ? 600 : width);
      const raf = requestAnimationFrame(() => {
        anim.current = animateSpring(bottom ? 600 : width, 0, setOffset, "settle");
        panel.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(raf);
    }
    if (!mounted) return;
    anim.current?.cancel();
    anim.current = animateSpring(0, bottom ? 600 : width, setOffset, "settle");
    const t = setTimeout(() => setMounted(false), reducedMotionNow() ? 0 : 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bottom, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const size = () =>
    bottom ? (panel.current?.offsetHeight ?? 600) : (panel.current?.offsetWidth ?? width);
  const axis = (e: PointerEvent) => (bottom ? e.clientY : e.clientX);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    anim.current?.cancel();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      start: axis(e) - offset,
      hist: [{ v: offset, t: performance.now() }],
    };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const raw = axis(e) - d.start;
    const next = raw < 0 ? rubber(raw, size()) : raw;
    setOffset(next);
    d.hist.push({ v: next, t: performance.now() });
    if (d.hist.length > 6) d.hist.shift();
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const a = d.hist[0];
    const b = d.hist[d.hist.length - 1];
    const v = b.t > a.t ? ((b.v - a.v) / (b.t - a.t)) * 1000 : 0;
    if (offset + project(v) > size() * 0.4) onClose();
    else anim.current = animateSpring(offset, 0, setOffset, "settle", v);
  };

  if (!mounted) return null;
  const progress = Math.max(0, 1 - Math.max(0, offset) / size());
  return (
    <div className="absolute inset-0 z-sheet" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 z-scrim bg-black/35"
        style={{ opacity: progress * 0.9 }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={cn(
          "absolute z-sheet flex touch-none flex-col border-line bg-panel outline-none",
          bottom
            ? "inset-x-0 bottom-0 max-h-[92%] rounded-t-panel border-t"
            : "inset-y-0 right-0 rounded-l-panel border-l"
        )}
        style={{
          width: bottom ? undefined : `min(${width}px, 100%)`,
          transform: bottom ? `translateY(${offset}px)` : `translateX(${offset}px)`,
        }}
      >
        {bottom ? (
          <span aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 rounded-pill bg-border/60" />
        ) : null}
        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-section">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex min-h-tap items-center gap-1 px-2 text-dense font-semibold text-accent"
          >
            {done}
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 [touch-action:pan-y]">
          {children}
        </div>
      </div>
    </div>
  );
}
