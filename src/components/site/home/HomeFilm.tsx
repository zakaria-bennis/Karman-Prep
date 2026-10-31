"use client";

// The home page's film (ported from the mock's film.js): one continuous day plays behind the page in real
// time and the page scrolls normally over it. Paper panels carry the reading; "windows" between them show the
// film still running. The opening still paints with the page (film.css draws it on the stage); the film's
// file is asked for only once the page has painted and loaded, so the first screen never waits for it. It
// plays only while a window is on screen, stops for reduced motion, a hidden tab or the pause button, and
// crossfades to the orbit film at the close; the orbit film and its still are fetched only when the close is
// within a screen. The campus films each play once when they come on screen. A late film shows the orb after
// 400 ms. Everything but the first-visit opening waits for an idle moment, so hydration finishes first.
import { useEffect, useRef } from "react";
import { SITE } from "@/lib/marketing/site-copy";
import { idle } from "../live/idle";
import { opening, orb } from "../live/kit";
import { motionPaused } from "../live/motion";

const FILM = "/site/film";

/** Calls `go` a frame after the page has loaded (at once if it already has), and in any case within 5 s. */
function afterLoad(go: () => void, signal: AbortSignal) {
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(go);
  };
  const late = setTimeout(frame, 5000);
  if (document.readyState === "complete") frame();
  else addEventListener("load", frame, { once: true, signal });
  signal.addEventListener("abort", () => {
    clearTimeout(late);
    cancelAnimationFrame(raf);
  });
}

export default function HomeFilm() {
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ac = new AbortController();
    const signal = ac.signal;
    const observers: IntersectionObserver[] = [];
    const watch = (cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) => {
      const io = new IntersectionObserver(cb, opts);
      observers.push(io);
      return io;
    };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const day = stage.querySelector<HTMLVideoElement>(".day");
    const edge = stage.querySelector<HTMLVideoElement>(".edge");
    const orbCanvas = stage.querySelector<HTMLCanvasElement>(".orb");
    const close = document.getElementById("m-11");
    const campus = document.getElementById("m-9");
    if (!day || !edge || !orbCanvas || !close || !campus) return;

    // phones held upright get the portrait cut of each film and its still
    const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";

    // the first visit's opening: the wordmark and the line, only while the first picture isn't ready yet
    opening(`${FILM}/day${sfx}.webp`, SITE.logo);

    /* ---------- the orb shows only when a film that was asked for takes longer than 400 ms ---------- */
    let asked = false; // the film's file has been requested
    let waitT: ReturnType<typeof setTimeout> | undefined;
    let slowT: ReturnType<typeof setTimeout> | undefined;
    let orbT: ReturnType<typeof setTimeout> | undefined;
    let orbStop: (() => void) | null = null;
    const waitOn = () => {
      if (!asked) return;
      clearTimeout(waitT);
      waitT = setTimeout(() => {
        stage.classList.add("waiting");
        clearTimeout(orbT);
        if (!orbStop) orbStop = orb(orbCanvas, { size: 64, dark: true, state: "waiting" });
        slowT = setTimeout(() => stage.classList.add("slow"), 2100);
      }, 400);
    };
    const waitOff = () => {
      clearTimeout(waitT);
      clearTimeout(slowT);
      stage.classList.remove("waiting", "slow");
      // let the orb fade out before its loop stops
      orbT = setTimeout(() => {
        orbStop?.();
        orbStop = null;
      }, 450);
    };

    const seen = new Set<Element>(); // windows on screen
    let ending = false;
    const cur = () => (ending ? edge : day);
    const want = () => !reduce && !motionPaused() && !document.hidden && seen.size > 0;
    [day, edge].forEach((v) => {
      v.addEventListener("waiting", () => v === cur() && want() && waitOn(), { signal });
      v.addEventListener("playing", waitOff, { signal });
      v.addEventListener("pause", waitOff, { signal });
    });
    let swapT: ReturnType<typeof setTimeout> | undefined;
    function sync() {
      // the product screens' small motions follow the same pause button
      document.getElementById("ks")?.classList.toggle("still-motion", motionPaused());
      if (reduce || !day || !edge) return;
      const on = cur(),
        off = ending ? day : edge;
      if (want()) {
        if (!asked) return; // the film comes once the page has painted; the still holds until then
        if (on.paused) {
          if (on.readyState < 3) waitOn();
          on.play().catch(() => {});
        }
      } else {
        on.pause();
        waitOff();
      }
      // the other film keeps going through the 1.4 s crossfade, then rests
      clearTimeout(swapT);
      swapT = setTimeout(() => off.pause(), 1500);
    }

    /* ---------- the film's file, only after the page has painted and loaded ---------- */
    const ask = () => {
      if (asked || reduce) return;
      asked = true;
      day.src = `${FILM}/day${sfx}.mp4`;
      edge.src = `${FILM}/c9${sfx}.mp4`; // preload none: nothing moves until the close nears
      sync();
    };
    afterLoad(ask, signal);

    /* ---------- everything that watches the page can wait for an idle moment ---------- */
    const stopIdle = idle(() => {
      // the pause button only while some film is on screen: it never sits over words on paper
      const motionBtn = document.querySelector<HTMLElement>(".motion");
      let campusSeen = false;
      const syncMotionBtn = () =>
        motionBtn?.classList.toggle("away", seen.size === 0 && !campusSeen);
      watch((es) =>
        es.forEach((e) => {
          campusSeen = e.isIntersecting;
          syncMotionBtn();
        })
      ).observe(campus);
      const wio = watch((es) => {
        es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        syncMotionBtn();
        sync();
      });
      document.querySelectorAll(".window").forEach((w) => wio.observe(w));
      document.addEventListener("visibilitychange", sync, { signal });
      watch(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting === ending) return;
            ending = e.isIntersecting;
            if (ending && edge.ended) edge.currentTime = 0;
            stage.classList.toggle("ending", ending);
            sync();
          }),
        { threshold: 0.3 }
      ).observe(close);
      // the orbit film and its still come only once the close is within a screen
      watch(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            if (!edge.poster) edge.poster = `${FILM}/c9${sfx}.webp`;
            edge.preload = "auto";
          }),
        { rootMargin: "100% 0px" }
      ).observe(close);

      /* ---------- the haze: while paper covers most of the screen, the film behind lifts toward the paper's tone ---------- */
      const ratio = new Map<Element, number>();
      const hio = watch(
        (es) => {
          es.forEach((e) => ratio.set(e.target, e.intersectionRect.height / innerHeight));
          const cover = [...ratio.values()].reduce((a, b) => a + b, 0);
          stage.classList.toggle("hazy", cover > 0.45);
        },
        { threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
      );
      document.querySelectorAll(".panel:not(.dark)").forEach((p) => hio.observe(p));

      /* ---------- campus films: each plays once when it comes on screen, one after another ---------- */
      const cvids = [...document.querySelectorAll<HTMLVideoElement>(".campus video")];
      const timers = new Map<HTMLVideoElement, ReturnType<typeof setTimeout>>();
      // the still first (with reduced motion the films never play, so each shows its most telling frame
      // instead of its first), then the film
      const load = (v: HTMLVideoElement) => {
        const still = v.dataset.poster;
        if (!v.poster && still) v.poster = reduce ? still.replace(/-r0\.jpg$/, "-r.jpg") : still;
        if (!reduce && !v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
      };
      const cio = watch(
        (es) =>
          es.forEach((e) => {
            const v = e.target as HTMLVideoElement;
            clearTimeout(timers.get(v));
            if (e.isIntersecting && !reduce && !motionPaused()) {
              load(v);
              if (v.ended) v.currentTime = 0;
              timers.set(
                v,
                setTimeout(() => v.play().catch(() => {}), cvids.indexOf(v) * 260)
              );
            } else v.pause();
          }),
        { threshold: 0.45 }
      );
      cvids.forEach((v) => cio.observe(v));
      watch((es) => es.forEach((e) => e.isIntersecting && cvids.forEach(load)), {
        rootMargin: "80% 0px",
      }).observe(campus);

      document.addEventListener(
        "karman:motion",
        () => {
          sync();
          cvids.forEach((v) => {
            const r = v.getBoundingClientRect();
            if (motionPaused()) v.pause();
            else if (r.top < innerHeight && r.bottom > 0 && !v.ended) v.play().catch(() => {});
          });
        },
        { signal }
      );
      return () => timers.forEach((t) => clearTimeout(t));
    });

    return () => {
      ac.abort();
      stopIdle();
      observers.forEach((io) => io.disconnect());
      [waitT, slowT, orbT, swapT].forEach((t) => clearTimeout(t));
      orbStop?.();
      day.pause();
      edge.pause();
    };
  }, []);

  return (
    <div className="stage" aria-hidden="true" ref={stageRef}>
      <video className="day" muted playsInline loop preload="auto" />
      <video className="edge" muted playsInline preload="none" />
      <div className="scrim" />
      <div className="haze" />
      <canvas className="orb" width={64} height={64} />
      <span className="late">{SITE["loading film"]}</span>
    </div>
  );
}
