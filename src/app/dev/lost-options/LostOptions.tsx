"use client";

// TEMPORARY mockups (see page.tsx). Four directions, each drawn with the portal's own painting engine.
import { useEffect, useRef } from "react";
import { paintPicture } from "@/lib/painting/painterly";
import { renderLandscape } from "@/lib/painting/scenes";
import type { TimeOfDay } from "@/lib/painting/light";

interface Option {
  scene: number;
  time: TimeOfDay;
  title: string;
  text: string;
  tone: "ink" | "ivory";
  place: "top" | "low" | "paper" | "mist";
  veil?: "paper" | "mist";
}

const OPTIONS: Record<string, Option> = {
  a: {
    scene: 9,
    time: "sunset",
    title: "You’ve wandered off the path.",
    text: "This page isn’t here. The way back is.",
    tone: "ivory",
    place: "low",
  },
  b: {
    scene: 0,
    time: "day",
    title: "We haven’t painted this page.",
    text: "Nothing lives at this address. Everything else is where you left it.",
    tone: "ink",
    place: "paper",
    veil: "paper",
  },
  c: {
    scene: 2,
    time: "night",
    title: "Nobody’s home.",
    text: "This page isn’t here. Your work is safe where you left it.",
    tone: "ivory",
    place: "top",
  },
  d: {
    scene: 1,
    time: "dawn",
    title: "Lost in the mist.",
    text: "This page isn’t here. Step back out and try again.",
    tone: "ink",
    place: "mist",
    veil: "mist",
  },
};

/* A tiny seeded random, so the unfinished edge is the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Paper over the lower part of the picture, with the paint running out in loose strokes. */
function paperVeil(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#f3ecdd";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  const rnd = seeded(7);
  const edge = Math.max(h * 0.22, Math.min(h * 0.5, h - (w < 700 ? 480 : 450)));
  ctx.fillRect(0, 0, w, edge - 40);
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w;
    const fall = rnd() ** 2.2;
    const y = edge - 60 + fall * 120;
    const len = 30 + rnd() * 90 * (1 - fall * 0.6);
    const a = -0.5 + rnd() * 1;
    ctx.lineWidth = 10 + rnd() * 26 * (1 - fall * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (Math.cos(a) * len) / 2,
      y + Math.sin(a) * len * 0.6 - 6,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len
    );
    ctx.stroke();
  }
}

/** Mist that thickens toward the bottom, in soft drifting bands. */
function mistVeil(canvas: HTMLCanvasElement, w: number, h: number) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, h * 0.18, 0, h);
  g.addColorStop(0, "rgba(238,236,232,0)");
  g.addColorStop(0.45, "rgba(238,236,232,0.78)");
  g.addColorStop(1, "rgba(240,238,234,0.97)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = seeded(11);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = h * (0.22 + rnd() * 0.5);
    const rx = w * (0.18 + rnd() * 0.3);
    const ry = 24 + rnd() * 60;
    const m = ctx.createRadialGradient(x, y, 0, x, y, rx);
    m.addColorStop(0, "rgba(244,242,238,0.5)");
    m.addColorStop(1, "rgba(244,242,238,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = m;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

export default function LostOptions({ option }: { option: string }) {
  const o = OPTIONS[option] ?? OPTIONS.a;
  const drawn = useRef<HTMLCanvasElement>(null);
  const veil = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const paint = () => {
      if (!drawn.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      paintPicture(drawn.current, renderLandscape(o.scene, o.time), {
        animate: false,
        width: w,
        height: h,
      });
      if (veil.current && o.veil === "paper") paperVeil(veil.current, w, h);
      if (veil.current && o.veil === "mist") mistVeil(veil.current, w, h);
    };
    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [o]);

  const ivory = o.tone === "ivory";
  return (
    <div className={`lost lost-${o.place}`} data-tone={o.tone}>
      <style>{`
.lost{position:fixed;inset:0;z-index:50;overflow:hidden;background:#1b1a17;font-family:var(--font-hanken),system-ui,sans-serif}
.lost canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.lost .mark{position:absolute;left:clamp(20px,4vw,48px);top:clamp(18px,3vw,36px);font:700 20px/1 var(--font-hanken),system-ui,sans-serif;letter-spacing:-0.01em}
.lost .words{position:absolute;left:clamp(20px,6vw,96px);right:clamp(20px,6vw,96px);max-width:640px;display:grid;gap:18px;justify-items:start}
.lost h1{margin:0;font:400 clamp(40px,6.4vw,84px)/1.02 var(--font-young-serif),Georgia,serif;letter-spacing:-0.015em;text-wrap:balance}
.lost p{margin:0;font-size:clamp(17px,1.5vw,20px);line-height:1.5;font-weight:500;max-width:34ch;text-wrap:pretty}
.lost a{display:inline-flex;align-items:center;gap:10px;min-height:52px;margin-top:8px;padding:0 26px;border-radius:999px;font:700 17px/1 var(--font-hanken),system-ui,sans-serif;text-decoration:none}
.lost[data-tone="ink"]{color:#1b1a17}.lost[data-tone="ink"] a{background:#1b1a17;color:#f6f1e4}
.lost[data-tone="ivory"]{color:#fbf6ea}.lost[data-tone="ivory"] a{background:#fbf6ea;color:#1b1a17}
.lost[data-tone="ivory"] h1,.lost[data-tone="ivory"] p,.lost[data-tone="ivory"] .mark{text-shadow:0 1px 18px rgba(10,12,20,.45)}
.lost-low .words{bottom:clamp(40px,9vh,96px)}
.lost-top .words{top:clamp(96px,18vh,190px)}
.lost-paper .words{bottom:clamp(36px,8vh,84px)}
.lost-mist .words{bottom:clamp(40px,10vh,110px)}
@media (max-width:700px){.lost .words{gap:14px}}
      `}</style>
      <canvas ref={drawn} aria-hidden="true" />
      <canvas ref={veil} aria-hidden="true" />
      <span className="mark" style={ivory ? undefined : { color: "#1b1a17" }}>
        Karman
      </span>
      <div className="words">
        <h1>{o.title}</h1>
        <p>{o.text}</p>
        <a href="/dashboard/student">Back to Today</a>
      </div>
    </div>
  );
}
