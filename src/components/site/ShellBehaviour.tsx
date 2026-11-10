"use client";

// What the frame does once the page is on screen (ported from the mock's site.js): the light and dark switch,
// the opening's scroll cue, the phone menu, the painting's still button, the press feedback on links and
// buttons, the one reveal, and the alive layer. It renders nothing.
import { useEffect } from "react";
import { SITE } from "@/lib/marketing/site-copy";
import { startAlive } from "./live/alive";
import { busy, line } from "./live/kit";
import { motionPaused, setMotionPaused } from "./live/motion";

export default function ShellBehaviour() {
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks) return;
    const offs: (() => void)[] = [];
    const ac = new AbortController();
    const signal = ac.signal;
    offs.push(() => ac.abort());
    const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) =>
      addEventListener(type, fn, { passive: true, signal });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- light and dark: the device's setting until the visitor picks one, then remembered ---------- */
    const themes = [...ks.querySelectorAll<HTMLButtonElement>(".theme")];
    const paintTheme = () => {
      const word = ks.dataset.mode === "dark" ? SITE["light mode"] : SITE["dark mode"];
      themes.forEach((b) => {
        b.setAttribute("aria-label", word);
        b.title = word;
      });
    };
    const flip = () => {
      ks.classList.add("theming");
      ks.dataset.mode = ks.dataset.mode === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("karman-site-theme", ks.dataset.mode);
      } catch {
        /* the choice lasts for this page only */
      }
      paintTheme();
      setTimeout(() => ks.classList.remove("theming"), 600);
    };
    themes.forEach((b) => b.addEventListener("click", flip, { signal }));
    paintTheme();
    // until the visitor picks one, the theme follows the device, live
    const device = matchMedia("(prefers-color-scheme: light)");
    device.addEventListener(
      "change",
      (e) => {
        let chosen: string | null = null;
        try {
          chosen = localStorage.getItem("karman-site-theme");
        } catch {
          /* no storage: keep following the device */
        }
        if (chosen === "dark" || chosen === "light") return;
        ks.dataset.mode = e.matches ? "light" : "dark";
        paintTheme();
      },
      { signal }
    );

    /* ---------- the footer's still button (home only): holds the painting and the films still, remembered ---------- */
    const motion = ks.querySelector<HTMLButtonElement>(".motion");
    if (motion) {
      const label = () => {
        const p = motionPaused();
        motion.textContent = p ? SITE.play : SITE.pause;
        motion.setAttribute("aria-pressed", String(p));
      };
      motion.hidden = reduce;
      label();
      motion.addEventListener(
        "click",
        () => {
          setMotionPaused(!motionPaused());
          label();
        },
        { signal }
      );
    }

    /* ---------- the header scrolls away with the page; once the reader is down, the opening's cue goes ---------- */
    const runScrolled = () => ks.classList.toggle("scrolled", scrollY > 40);
    on("scroll", runScrolled);
    runScrolled();

    /* ---------- phone menu ---------- */
    const sheet = ks.querySelector<HTMLElement>("#menu");
    const mbtn = ks.querySelector<HTMLButtonElement>(".hd .menu");
    if (sheet && mbtn) {
      // while the menu is open, everything behind it is inert, so Tab stays inside the menu (aria-modal)
      const behind = () =>
        [...ks.children].filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el !== sheet
        );
      const shut = () => {
        sheet.hidden = true;
        behind().forEach((el) => (el.inert = false));
        document.documentElement.classList.remove("ks-lock");
        mbtn.setAttribute("aria-expanded", "false");
        mbtn.focus();
      };
      mbtn.addEventListener(
        "click",
        () => {
          sheet.hidden = false;
          behind().forEach((el) => (el.inert = true));
          document.documentElement.classList.add("ks-lock");
          mbtn.setAttribute("aria-expanded", "true");
          sheet.querySelector<HTMLElement>(".close")?.focus();
        },
        { signal }
      );
      sheet.querySelector(".close")?.addEventListener("click", shut, { signal });
      sheet.addEventListener("click", (e) => (e.target as Element).closest("a") && shut(), {
        signal,
      });
      on("keydown", (e) => e.key === "Escape" && !sheet.hidden && shut());
      offs.push(() => {
        behind().forEach((el) => (el.inert = false));
        document.documentElement.classList.remove("ks-lock");
      });
    }

    /* ---------- presses: a button's orb only if the next page takes over 400 ms; any other link to a page
       starts the line, which itself stays hidden for the first 400 ms ---------- */
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const url = new URL(a.href, location.href);
      if (
        url.origin !== location.origin ||
        url.protocol === "mailto:" ||
        (url.pathname === location.pathname && url.hash)
      )
        return;
      if (a.classList.contains("btn")) busy(a, true);
      else line.start(700);
    };
    document.addEventListener("click", onClick, { signal });
    on("pageshow", () => {
      ks.querySelectorAll<HTMLElement>('a.btn[aria-busy="true"]').forEach((a) => busy(a, false));
      line.done();
    });

    /* ---------- one reveal everywhere: rise a little and fade in, once ---------- */
    const rio = new IntersectionObserver(
      (es) =>
        es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("on");
            rio.unobserve(x.target);
          }
        }),
      { threshold: 0.12 }
    );
    ks.querySelectorAll(".rv").forEach((el) => rio.observe(el));
    offs.push(() => rio.disconnect());
    requestAnimationFrame(() => ks.classList.add("ready"));

    offs.push(startAlive(ks));
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
