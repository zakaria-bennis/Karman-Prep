import { useEffect, useState, type RefObject } from "react";

/** The width of a container, measured live, for layouts that fold on narrow hosts. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

/** Whether the pointer is coarse (a phone or an iPad), for a camera button and 44px targets. */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
