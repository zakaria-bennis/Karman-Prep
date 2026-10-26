"use client";

// What the frame does once the page is on screen (ported from the mock's site.js): the light and dark switch,
// the header's colour over film or paper, the phone menu, the film's pause button, the phone dock, the
// press feedback on links and buttons, the one reveal, and the alive layer. It renders nothing.
import { useEffect } from "react";
import { SITE } from "@/lib/marketing/site-copy";
import { startAlive } from "./live/alive";
import { ARROW_SVG } from "./live/icons";
import { busy, line } from "./live/kit";
import { motionPaused, setMotionPaused } from "./live/motion";

const PAUSE =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx="1"/><rect x="9.4" y="3" width="2.6" height="10" rx="1"/></svg>';
const PLAY =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6c0 .6.6.9 1.1.6l7.2-4.8a.7.7 0 0 0 0-1.2L6.1 2.6C5.6 2.3 5 2.6 5 3.2Z"/></svg>';

export default function ShellBehaviour({ dock }: { dock: [string, string] }) {
  const [dockLabel, dockHref] = dock;
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

    /* ---------- light and dark (design rule 33): remembered, one cross-fade ---------- */
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

    /* ---------- the pause button (home only): stops every film on the page, remembered ---------- */
    const motion = ks.querySelector<HTMLButtonElement>(".motion");
    if (motion) {
      const label = () => {
        const p = motionPaused();
        motion.innerHTML = p ? PLAY : PAUSE;
        motion.setAttribute("aria-label", p ? SITE.play : SITE.pause);
        motion.title = motion.getAttribute("aria-label") ?? "";
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

    /* ---------- header: white words over film or black, black words over paper ---------- */
    const hd = ks.querySelector<HTMLElement>(".hd");
    let ticking = false;
    const runHeader = () => {
      ticking = false;
      if (!hd) return;
      const y = 36;
      const light = [...ks.querySelectorAll(".panel:not(.dark), .datecard, [data-light]")].some(
        (p) => {
          const r = p.getBoundingClientRect();
          return r.top <= y && r.bottom >= y;
        }
      );
      const down = scrollY > 40;
      hd.classList.toggle("light", light);
      hd.classList.toggle("dim", down && !light);
      ks.classList.toggle("scrolled", down);
    };
    const askHeader = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(runHeader);
      }
    };
    on("scroll", askHeader);
    on("resize", askHeader);
    runHeader();

    /* ---------- phone menu ---------- */
    const sheet = ks.querySelector<HTMLElement>("#menu");
    const mbtn = ks.querySelector<HTMLButtonElement>(".hd .menu");
    if (sheet && mbtn) {
      const shut = () => {
        sheet.hidden = true;
        document.documentElement.classList.remove("ks-lock");
        mbtn.setAttribute("aria-expanded", "false");
        mbtn.focus();
      };
      mbtn.addEventListener(
        "click",
        () => {
          sheet.hidden = false;
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
      offs.push(() => document.documentElement.classList.remove("ks-lock"));
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

    /* ---------- phones: the dock. One button at the bottom, in thumb reach, only while no other main
       button is on screen (design rule 35), and only on the way back up, never while reading down ---------- */
    if (matchMedia("(max-width: 760px)").matches) {
      const el = document.createElement("div");
      el.className = "dock";
      const a = document.createElement("a");
      a.className = "btn";
      a.href = dockHref;
      a.innerHTML = `<span class="lb"></span><span class="go">${ARROW_SVG}</span>`;
      (a.querySelector(".lb") as HTMLElement).textContent = dockLabel;
      el.append(a);
      ks.append(el);
      const onScreen = new Set<Element>();
      let lastY = scrollY,
        up = false;
      const sync = () => {
        const show = up && onScreen.size === 0 && scrollY > innerHeight * 0.6;
        el.classList.toggle("on", show);
        ks.classList.toggle("docked", show);
      };
      const io = new IntersectionObserver((es) => {
        es.forEach((x) => (x.isIntersecting ? onScreen.add(x.target) : onScreen.delete(x.target)));
        sync();
      });
      ks.querySelectorAll(".btn").forEach((b) => b !== a && !b.closest(".sheet") && io.observe(b));
      on("scroll", () => {
        const y = scrollY;
        if (Math.abs(y - lastY) > 6) {
          up = y < lastY;
          lastY = y;
          sync();
        }
      });
      offs.push(() => {
        io.disconnect();
        el.remove();
      });
    }

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
  }, [dockLabel, dockHref]);
  return null;
}
