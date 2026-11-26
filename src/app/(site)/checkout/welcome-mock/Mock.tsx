"use client";

import { useEffect, useRef } from "react";
import { Fox } from "@/components/portal/Fox";

interface Props {
  v: "a" | "b" | "c";
  plan: string;
  line: string;
  amount: string;
  includes: string[];
}

const GOLD = ["#f3c94b", "#ffe9a8", "#e2a23b", "#8fb0ff", "#ffffff", "#7fe0c0"];

/** Fireworks drawn on a canvas over the whole screen: rockets rise, burst into a ring of sparks that
 *  fall and fade. Every number comes from the frame count, so it plays the same each time. */
function Fireworks({ bursts }: { bursts: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = () => {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
    };
    size();
    addEventListener("resize", size);
    type Spark = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      c: string;
      r: number;
    };
    const sparks: Spark[] = [];
    const rnd = (n: number) => {
      const x = Math.sin(n * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    let frame = 0;
    let raf = 0;
    const burst = (n: number) => {
      const x = (0.14 + 0.72 * rnd(n + 1)) * c.width;
      const y = (0.14 + 0.34 * rnd(n + 2)) * c.height;
      const col = GOLD[n % GOLD.length];
      const count = 70;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const sp = (3.2 + 4.2 * rnd(n * 31 + i)) * dpr;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          c: i % 4 === 0 ? "#ffffff" : col,
          r: (1.4 + 1.6 * rnd(i + n)) * dpr,
        });
      }
    };
    const tick = () => {
      frame++;
      if (frame % 16 === 1 && frame / 16 < bursts) burst(Math.floor(frame / 16));
      g.clearRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "lighter";
      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.965;
        s.vy = s.vy * 0.965 + 0.07 * dpr;
        s.life -= 0.012;
        g.globalAlpha = Math.max(s.life, 0);
        g.fillStyle = s.c;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      if (frame < bursts * 16 + 10 || sparks.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
    };
  }, [bursts]);
  return <canvas ref={ref} className="wm-sky" aria-hidden="true" />;
}

/** The title, one word at a time. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <h1 className="wm-title">
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ animationDelay: `${from + i * 0.09}s` }}>
          {w}{" "}
        </span>
      ))}
    </h1>
  );
}

function Go({ label, delay }: { label: string; delay: number }) {
  return (
    <a className="btn wm-go" href="#" style={{ animationDelay: `${delay}s` }}>
      <span className="lb">{label}</span>
    </a>
  );
}

export default function Mock({ v, plan, line, amount, includes }: Props) {
  if (v === "a")
    return (
      <>
        <Fireworks bursts={9} />
        <div className="wm wm-a" role="status">
          <div className="wm-fox">
            <Fox size={128} />
          </div>
          <p className="wm-badge">
            <b>{plan}</b>
          </p>
          <Words text={line} from={0.5} />
          <p className="wm-paid" style={{ animationDelay: "1.5s" }}>
            Paid today <b className="num">{amount}</b>
          </p>
          <Go label="Get started" delay={1.8} />
        </div>
      </>
    );
  if (v === "b")
    return (
      <div className="gq-card wm wm-b" role="status">
        <div className="wm-seal" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" />
            <circle cx="60" cy="60" r="46" />
          </svg>
          <b>{plan}</b>
          <i />
        </div>
        <Words text={line} from={0.9} />
        <ul className="wm-list">
          {includes.map((t, i) => (
            <li key={t} style={{ animationDelay: `${1.7 + i * 0.32}s` }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12.5l4.500 4.500L19 7.500"
                  style={{ animationDelay: `${1.8 + i * 0.32}s` }}
                />
              </svg>
              {t}
            </li>
          ))}
        </ul>
        <p className="wm-paid" style={{ animationDelay: `${1.8 + includes.length * 0.32}s` }}>
          Paid today <b className="num">{amount}</b>
        </p>
        <Go label="Get started" delay={2 + includes.length * 0.32} />
      </div>
    );
  return (
    <>
      <div className="wm-trail" aria-hidden="true">
        <div className="wm-flyer">
          <Fox size={96} />
          {Array.from({ length: 14 }, (_, i) => (
            <i
              key={i}
              style={{
                animationDelay: `${0.15 + i * 0.07}s`,
                left: `${-18 - i * 22}px`,
                top: `${40 + ((i * 37) % 30)}px`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="wm wm-c" role="status">
        <p className="wm-kicker" style={{ animationDelay: "1.2s" }}>
          Paid. You&apos;re on {plan}.
        </p>
        <Words text={line} from={1.4} />
        <div className="wm-first" style={{ animationDelay: "2.3s" }}>
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" />
            <circle cx="32" cy="32" r="27" className="wm-ring" />
          </svg>
          <p>
            <b>Your first Daily 10 is ready</b>
            <small>Ten questions. About ten minutes.</small>
          </p>
          <a className="btn wm-go wm-now" href="#">
            <span className="lb">Start now</span>
          </a>
        </div>
        <a className="wm-later" href="#" style={{ animationDelay: "2.9s" }}>
          Look around first
        </a>
      </div>
    </>
  );
}
