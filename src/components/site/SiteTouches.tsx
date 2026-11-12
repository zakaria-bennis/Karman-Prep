"use client";

// Two small touches for the home page and the pages in its world, for people using a mouse. It renders nothing.
//   - In the top bar, one marker slides from page to page as the pointer moves along them.
//   - The main buttons lean a little toward the pointer when it comes close, and spring back when it leaves.
// Neither runs under reduced motion or on touch screens.
import { useEffect } from "react";

const PULL = 0.22;
const NEAR = 90;
/* how far the button may lean, so it never reaches the words beside or above it */
const MAX_X = 9;
const MAX_Y = 5;
const cap = (v: number, max: number) => Math.max(-max, Math.min(max, v));

export default function SiteTouches() {
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ac = new AbortController();
    const o = { signal: ac.signal, passive: true } as const;

    const nav = ks.querySelector<HTMLElement>(".hd nav");
    let mark: HTMLSpanElement | null = null;
    if (nav) {
      mark = document.createElement("span");
      mark.className = "nav-mark";
      mark.setAttribute("aria-hidden", "true");
      nav.prepend(mark);
      const links = [...nav.querySelectorAll<HTMLElement>(".nl")];
      const clear = () => links.forEach((l) => l.classList.remove("hot"));
      for (const link of links) {
        link.addEventListener(
          "pointerenter",
          () => {
            if (!mark) return;
            clear();
            link.classList.add("hot");
            mark.style.width = `${link.offsetWidth}px`;
            mark.style.transform = `translateX(${link.offsetLeft}px)`;
            mark.style.opacity = "1";
          },
          o
        );
      }
      nav.addEventListener(
        "pointerleave",
        () => {
          clear();
          if (mark) mark.style.opacity = "0";
        },
        o
      );
    }

    const buttons = [...ks.querySelectorAll<HTMLElement>("main .btn")];
    let raf = 0;
    addEventListener(
      "pointermove",
      (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          for (const b of buttons) {
            const r = b.getBoundingClientRect();
            if (r.bottom < 0 || r.top > innerHeight) continue;
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            const close = Math.abs(dx) < r.width / 2 + NEAR && Math.abs(dy) < r.height / 2 + NEAR;
            b.style.setProperty(
              "--pull-x",
              close ? `${cap(dx * PULL, MAX_X).toFixed(1)}px` : "0px"
            );
            b.style.setProperty(
              "--pull-y",
              close ? `${cap(dy * PULL, MAX_Y).toFixed(1)}px` : "0px"
            );
          }
        });
      },
      o
    );
    return () => {
      ac.abort();
      cancelAnimationFrame(raf);
      mark?.remove();
      buttons.forEach((b) => {
        b.style.removeProperty("--pull-x");
        b.style.removeProperty("--pull-y");
      });
    };
  }, []);
  return null;
}
