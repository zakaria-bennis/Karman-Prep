"use client";

// How a lesson's picture draws itself: when it first comes into view, its marked parts appear one after
// another in the order of their `data-at` (then the page order). A part marked `data-draw` is a line,
// traced from end to end; a part marked `data-pop` fades and grows in. Pressing the picture draws it
// again. With reduced motion everything is simply there. Nothing is hidden until JavaScript runs, so a
// picture is never blank.
import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { prefersStill } from "@/lib/painting/motion";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

const STEP = 0.32;

function partsOf(root: Element): SVGElement[] {
  return [...root.querySelectorAll<SVGElement>("[data-draw],[data-pop]")]
    .map((el, k) => ({ el, at: Number(el.dataset.at ?? k) }))
    .sort((a, b) => a.at - b.at)
    .map((p) => p.el);
}

function hide(parts: SVGElement[]) {
  for (const el of parts) {
    if (el.hasAttribute("data-draw") && el instanceof SVGGeometryElement) {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    } else gsap.set(el, { opacity: 0 });
  }
}

/** Draws the picture in when it is seen; returns a function that draws it again. */
export function useDrawIn(ref: RefObject<Element | null>, key: unknown): () => void {
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const play = useCallback(() => {
    const root = ref.current;
    if (!root || prefersStill()) return;
    timeline.current?.kill();
    const parts = partsOf(root);
    hide(parts);
    const tl = gsap.timeline();
    let slot = -1;
    let last = Number.NaN;
    for (const el of parts) {
      const at = Number(el.dataset.at ?? Number.NaN);
      if (Number.isNaN(at) || at !== last) slot++;
      last = at;
      if (el.hasAttribute("data-draw") && el instanceof SVGGeometryElement)
        tl.to(
          el,
          {
            strokeDashoffset: 0,
            duration: 0.75,
            ease: "power2.out",
            clearProps: "strokeDasharray,strokeDashoffset",
          },
          slot * STEP
        );
      else
        tl.fromTo(
          el,
          { opacity: 0, scale: 0.7, transformOrigin: "50% 50%" },
          {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            ease: "back.out(2)",
            clearProps: "transform,opacity",
          },
          slot * STEP
        );
    }
    timeline.current = tl;
  }, [ref]);

  useIso(() => {
    const root = ref.current;
    if (!root || prefersStill()) return;
    const parts = partsOf(root);
    const rect = root.getBoundingClientRect();
    const seen = rect.top < window.innerHeight && rect.bottom > 0;
    if (!seen) hide(parts);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        play();
      },
      { threshold: 0.35 }
    );
    io.observe(root);
    return () => {
      io.disconnect();
      timeline.current?.kill();
      gsap.set(parts, { clearProps: "strokeDasharray,strokeDashoffset,opacity,transform" });
    };
  }, [key, play]);

  return play;
}
