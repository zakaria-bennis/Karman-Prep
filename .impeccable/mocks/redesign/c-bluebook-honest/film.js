/* The film behind the home page, continuous and never driven by the scroll (site-design-principles override;
   rule 38: no visible pause button, the footer switch instead). The opening still is painted by CSS first
   (home.css: day.jpg, or day-p.jpg on portrait phones); the day film's src is set after the first paint, two
   frames after the window's load event; the orbit clip (c9) loads only when the close is within one screen;
   nothing loads under reduced motion; the footer switch stops and restarts every film and is remembered.
   Media is referenced in ../../decision/film/, nothing copied. */
import { reduce, isPaused } from "./shell.js";

const FILM = "../../decision/film/";
export const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";

export function startFilm() {
  const stage = document.querySelector(".stage");
  const day = stage.querySelector(".day"), edge = stage.querySelector(".edge");
  const seen = new Set();
  let ending = false, dayLoaded = false, edgeLoaded = false;
  const cur = () => (ending ? edge : day);
  const want = () => !reduce && !isPaused() && !document.hidden && seen.size > 0;
  let swapT = 0;
  function sync() {
    if (reduce) return;
    const on = cur(), off = ending ? day : edge;
    const loaded = ending ? edgeLoaded : dayLoaded;
    if (want() && loaded) { if (on.paused) on.play().catch(() => {}); }
    else { on.pause(); if (!want()) off.pause(); }
    clearTimeout(swapT);
    swapT = setTimeout(() => off.pause(), 1500);
  }
  function startDay() {
    if (reduce || dayLoaded) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { day.src = `${FILM}day${sfx}.mp4`; dayLoaded = true; sync(); }));
  }
  if (document.readyState === "complete") startDay();
  else addEventListener("load", startDay, { once: true });

  const wio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))); sync(); });
  document.querySelectorAll(".window").forEach((w) => wio.observe(w));
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("karman:motion", sync);

  const close = document.getElementById("close");
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting === ending) return;
    ending = e.isIntersecting;
    if (ending && edge.ended) edge.currentTime = 0;
    stage.classList.toggle("ending", ending);
    sync();
  }), { threshold: 0.3 }).observe(close);
  new IntersectionObserver((es, io) => es.forEach((e) => {
    if (!e.isIntersecting || edgeLoaded) return;
    edgeLoaded = true;
    edge.poster = `${FILM}c9${sfx}.jpg`;
    if (!reduce) { edge.preload = "auto"; edge.src = `${FILM}c9${sfx}.mp4`; }
    io.disconnect();
    sync();
  }), { rootMargin: "100% 0px" }).observe(close);

  /* the campus clips: nothing downloads until the section is within 80% of a screen; each plays once when 45% visible */
  const vids = [...document.querySelectorAll(".trio video")];
  const campus = document.getElementById("campus");
  const load = (v) => {
    if (!v.poster) v.poster = v.dataset.poster;
    if (!reduce && !v.src) v.src = v.dataset.src;
  };
  new IntersectionObserver((es, io) => es.forEach((e) => { if (e.isIntersecting) { vids.forEach(load); io.disconnect(); } }), { rootMargin: "80% 0px" }).observe(campus);
  const pio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (reduce || isPaused()) return;
    if (e.isIntersecting && !v.dataset.played) { v.dataset.played = "1"; v.play().catch(() => {}); }
  }), { threshold: 0.45 });
  vids.forEach((v) => pio.observe(v));
  document.addEventListener("karman:motion", (e) => vids.forEach((v) => { if (e.detail) v.pause(); else if (v.dataset.played) v.play().catch(() => {}); }));
}
