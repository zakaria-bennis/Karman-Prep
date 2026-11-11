"use client";

// TEMPORARY (lab): the travelling background, drawn live. Scrolling flies the camera down from above the
// clouds to the sea. The switch changes the mode: light is one day, dark is one night.
import { useEffect, useRef, useState } from "react";
import { FRAG, VERT } from "./flight-shader";

const STAGES = [
  "Above the clouds",
  "Down through the clouds",
  "The high peaks",
  "The valley",
  "The lake",
  "The low hills",
  "The shore",
];

declare global {
  interface Window {
    __flight?: (p: number, night: number, time: number) => void;
  }
}

export default function Flight() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [dark, setDark] = useState(false);
  const [stage, setStage] = useState(0);
  const [note, setNote] = useState("");
  const want = useRef(0);

  useEffect(() => {
    want.current = dark ? 1 : 0;
  }, [dark]);

  useEffect(() => {
    setDark(matchMedia("(prefers-color-scheme: dark)").matches);
    const el = canvas.current;
    const gl = el?.getContext("webgl", { antialias: false, alpha: false });
    if (!el || !gl) {
      setNote("This browser cannot draw the live background.");
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s) ?? "";
        console.error("flight shader:", log);
        setNote(log.slice(0, 400));
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    /* one small sheet of random numbers; every hill, cloud and ripple is built from it */
    const data = new Uint8Array(256 * 256);
    let seed = 20261111;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed >>> 24;
    }
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      256,
      256,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uP = u("uP");
    const uNight = u("uNight");

    const q = new URLSearchParams(location.search);
    /* how sharp to draw: 1 is every pixel of a normal screen; lower is softer and faster */
    let quality = Number(q.get("q")) || 0.75;
    const size = () => {
      const w = Math.max(2, Math.round(innerWidth * quality));
      const h = Math.max(2, Math.round(innerHeight * quality));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const draw = (p: number, night: number, time: number) => {
      size();
      gl.uniform2f(uRes, el.width, el.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uP, p);
      gl.uniform1f(uNight, night);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    window.__flight = (p, night, time) => {
      frozen = true;
      draw(p, night, time);
    };

    let frozen = false;
    let p = 0;
    let night = want.current;
    let raf = 0;
    let last = 0;
    let slow = 0;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (frozen || document.hidden || now - last < 30) return;
      const dt = Math.min(now - last, 100);
      last = now;
      const max = document.documentElement.scrollHeight - innerHeight;
      const goal = max > 0 ? scrollY / max : 0;
      p += (goal - p) * (still ? 1 : 0.12);
      night += (want.current - night) * (still ? 1 : 0.06);
      const t0 = performance.now();
      draw(p, night, still ? 0 : now / 1000);
      gl.finish();
      /* if a frame takes too long, draw a little softer */
      slow = performance.now() - t0 > 34 && dt < 90 ? slow + 1 : 0;
      if (slow > 12 && quality > 0.4) {
        quality -= 0.1;
        slow = 0;
      }
      setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)));
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      delete window.__flight;
    };
  }, []);

  return (
    <div className="flight" data-dark={dark || undefined}>
      <canvas ref={canvas} aria-hidden="true" />
      <div className="flight-hud">
        <button type="button" role="switch" aria-checked={dark} onClick={() => setDark((d) => !d)}>
          <span>Light</span>
          <i />
          <span>Dark</span>
        </button>
        <p>{STAGES[stage]}</p>
      </div>
      {note ? <pre className="flight-note">{note}</pre> : null}
      <div className="flight-scroll">
        {STAGES.map((s, i) => (
          <section key={s}>
            <h2>
              {i + 1}. {s}
            </h2>
            <p>Sample words, to judge how text sits on the picture here.</p>
          </section>
        ))}
      </div>
      <style>{`
        .flight canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100lvh; display: block; }
        .flight-hud { position: fixed; z-index: 3; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; font: 500 15px/1.2 system-ui, sans-serif; color: #fff; text-shadow: 0 1px 8px rgba(0,0,0,.6); }
        .flight-hud button { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border: 0; border-radius: 999px; background: rgba(10,14,22,.55); color: inherit; font: inherit; cursor: pointer; }
        .flight-hud i { position: relative; width: 44px; height: 26px; border-radius: 999px; background: rgba(255,255,255,.3); }
        .flight-hud i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: translate .5s cubic-bezier(.3, 1.5, .5, 1); }
        .flight[data-dark] .flight-hud i::after { translate: 18px 0; }
        .flight-hud p { margin: 0; padding: 8px 14px; border-radius: 999px; background: rgba(10,14,22,.55); }
        .flight-note { position: fixed; z-index: 4; left: 16px; bottom: 16px; max-width: 80vw; padding: 12px; background: #200; color: #fbb; font-size: 12px; white-space: pre-wrap; }
        .flight-scroll { position: relative; z-index: 2; }
        .flight-scroll section { min-height: 120vh; display: grid; align-content: center; justify-items: center; gap: 12px; padding: 0 24px; text-align: center; color: #fff; text-shadow: 0 2px 24px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.5); font-family: system-ui, sans-serif; }
        .flight-scroll h2 { margin: 0; font-size: clamp(34px, 6vw, 76px); font-weight: 600; letter-spacing: -.02em; }
        .flight-scroll p { margin: 0; font-size: clamp(17px, 1.6vw, 21px); max-width: 34ch; }
        @media (prefers-reduced-motion: reduce) { .flight-hud i::after { transition: none; } }
      `}</style>
    </div>
  );
}
