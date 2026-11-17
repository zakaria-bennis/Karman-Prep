"use client";

// The painting behind the next session (founder, 2026-11-17: "scenes that are in motion and
// peaceful, and of multiple different types"). Each session is painted in a place (a lake, a
// cottage in the woods, a beach with palms and so on: scenes/), in the light of its own hour:
// night, sunrise, day or sunset, from the estimated sunrise and sunset where the student is. It is
// painted pixel by pixel on the graphics card, sixty times a second. With motion turned off it
// paints one still moment. Without a graphics card it shows nothing and the card keeps a plain
// sky of the same colors behind.
import { useEffect, useRef } from "react";
import { calm } from "./homeworkMotion";
import type { Sky } from "./scheduleData";
import { programOf, type SceneName } from "./scenes";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const WEIGHTS: Record<Sky, [number, number, number, number]> = {
  night: [1, 0, 0, 0],
  sunrise: [0, 1, 0, 0],
  day: [0, 0, 1, 0],
  sunset: [0, 0, 0, 1],
};

export default function Scene({
  scene,
  sky,
  className,
}: {
  scene: SceneName;
  sky: Sky;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const want = useRef(sky);
  useEffect(() => {
    want.current = sky;
  }, [sky]);
  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;
    const make = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      // a scene that will not compile is said, so it can be mended
      console.error(`[scene ${scene}]`, gl.getShaderInfoLog(shader));
      return null;
    };
    const vert = make(gl.VERTEX_SHADER, VERT);
    const frag = make(gl.FRAGMENT_SHADER, programOf(scene));
    const program = gl.createProgram();
    if (!vert || !frag || !program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const res = gl.getUniformLocation(program, "u_res");
    const time = gl.getUniformLocation(program, "u_t");
    const weights = gl.getUniformLocation(program, "u_w");
    canvas.dataset.painted = "";

    const fit = () => {
      // a phone's screen is sharp enough at one and a half: it keeps the painting quick
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    // the light eases from one sky to another when the next session changes
    const shown = [...WEIGHTS[want.current]];
    let frame = 0;
    let seen = true;
    const began = performance.now();
    const paint = (now: number) => {
      fit();
      const to = WEIGHTS[want.current];
      for (let i = 0; i < 4; i++) shown[i] += (to[i] - shown[i]) * (calm() ? 1 : 0.06);
      gl.uniform2f(res, canvas.width, canvas.height);
      gl.uniform1f(time, calm() ? 8 : (now - began) / 1000 + 8);
      gl.uniform4f(weights, shown[0], shown[1], shown[2], shown[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!calm() && seen && !document.hidden) frame = requestAnimationFrame(paint);
      else frame = 0;
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    // it rests while it is off the screen or the tab is hidden
    const watch = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (seen) wake();
    });
    watch.observe(canvas);
    const sized = new ResizeObserver(wake);
    sized.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    const stir = window.setInterval(wake, 400);
    wake();
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(stir);
      watch.disconnect();
      sized.disconnect();
      document.removeEventListener("visibilitychange", wake);
      gl.deleteProgram(program);
    };
  }, [scene]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
