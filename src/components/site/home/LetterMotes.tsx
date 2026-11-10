"use client";

// How the opening's headline arrives: motes of ink drift in across the sky and gather into the letters, the
// real words fade in over them, and the motes let go and float away. Then the number's shape slams down
// (painted.css, .claim.slam). It plays once per visit to the site; after that, and under reduced motion,
// the words are simply there. The motes are placed from the real, laid-out text, so they match it at every
// size. The canvas is decoration only: the words themselves are ordinary text the whole time.
import { useEffect, useRef } from "react";

const SEEN_KEY = "karman:claim-seen";
const GATHER_MS = 1150;
const HOLD_MS = 180;
const LEAVE_MS = 1100;

interface Mote {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  late: number;
  r: number;
  drift: number;
}

const ease = (t: number) => 1 - (1 - t) ** 4;

export default function LetterMotes() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const claim = canvas?.closest<HTMLElement>(".claim");
    const g = canvas?.getContext("2d");
    if (!canvas || !claim || !g) return;
    /* the options panel (HomeLab.tsx) is trying another entrance: that one runs from CSS alone */
    const trying = document.documentElement.dataset.in;
    if (trying && trying !== "0") return;
    const done = () => {
      claim.classList.add("formed", "slam");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* it may play again on the next page */
      }
    };
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* play it */
    }
    if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done();
      return;
    }

    let raf = 0;
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed) return;
      const box = claim.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = box.width;
      const H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      /* draw each word where the page has laid it out, then read back where the ink is */
      const ink = document.createElement("canvas");
      ink.width = Math.round(W);
      ink.height = Math.round(H);
      const ig = ink.getContext("2d", { willReadFrequently: true });
      if (!ig) return done();
      ig.textBaseline = "alphabetic";
      for (const el of claim.querySelectorAll<HTMLElement>("h1 .w > span, h1 .claim-pill")) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const parent = n.parentElement;
          if (!parent || !n.textContent?.trim()) continue;
          const ps = getComputedStyle(parent);
          const range = document.createRange();
          range.selectNodeContents(n);
          const tr = range.getBoundingClientRect();
          ig.font = `${ps.fontWeight} ${ps.fontSize} ${ps.fontFamily}`;
          /* the baseline sits about 78% down a line box in both faces */
          ig.fillText(
            n.textContent,
            tr.left - box.left,
            r.top - box.top + parseFloat(cs.fontSize) * 0.86
          );
        }
      }
      const data = ig.getImageData(0, 0, ink.width, ink.height).data;
      const step = W < 760 ? 3 : 4;
      const motes: Mote[] = [];
      for (let y = 0; y < ink.height; y += step)
        for (let x = 0; x < ink.width; x += step) {
          if (data[(y * ink.width + x) * 4 + 3] < 120) continue;
          /* each mote starts out in the open sky, up and to the right, and arrives left to right */
          const a = Math.random() * 6.28;
          const far = 180 + Math.random() * Math.max(W, H) * 0.5;
          motes.push({
            x: 0,
            y: 0,
            sx: x + Math.cos(a) * far + W * 0.18,
            sy: y + Math.sin(a) * far * 0.7 - H * 0.12,
            tx: x + (Math.random() - 0.5) * 1.2,
            ty: y + (Math.random() - 0.5) * 1.2,
            late: (x / W) * 0.42 + Math.random() * 0.18,
            r: 0.7 + Math.random() * 1.1,
            drift: Math.random() * 6.28,
          });
        }

      const t0 = performance.now();
      let told = false;
      const frame = (now: number) => {
        if (disposed) return;
        const t = now - t0;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        g.fillStyle = "#1d1a22";
        const leaving = t - GATHER_MS - HOLD_MS;
        if (leaving > 0 && !told) {
          told = true;
          done();
        }
        for (const m of motes) {
          const p = Math.min(1, Math.max(0, (t / GATHER_MS - m.late) / (1 - 0.6)));
          const e = ease(p);
          /* a slow curl on the way in, so they arrive like something carried on the wind */
          const curl = (1 - e) * 46;
          let x = m.sx + (m.tx - m.sx) * e + Math.cos(m.drift + t * 0.003) * curl;
          let y = m.sy + (m.ty - m.sy) * e + Math.sin(m.drift + t * 0.0034) * curl;
          let alpha = Math.min(1, p * 3) * 0.9;
          if (leaving > 0) {
            const q = Math.min(1, leaving / LEAVE_MS);
            x += Math.cos(m.drift) * 26 * q;
            y -= (18 + Math.sin(m.drift) * 22) * q * q * 3;
            alpha *= 1 - q;
          }
          if (alpha <= 0.01) continue;
          g.globalAlpha = alpha;
          g.beginPath();
          g.arc(x, y, m.r, 0, 6.29);
          g.fill();
        }
        g.globalAlpha = 1;
        if (leaving < LEAVE_MS) raf = requestAnimationFrame(frame);
        else g.clearRect(0, 0, W, H);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="motes" aria-hidden="true" />;
}
