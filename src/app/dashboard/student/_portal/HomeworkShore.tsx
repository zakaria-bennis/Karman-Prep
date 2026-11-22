"use client";

// The exam banner's scene: a beach, drawn and moved here in code (founder, 2026-11-16: real film
// looked wrong beside the drawn page, so it is drawn again, as near to the real thing as it can be).
// It is painted pixel by pixel on the graphics card, sixty times a second:
//   the sky      deep and clear, with the moon and its halo, thin cloud, and round stars (by day a
//                bright sky and the sun)
//   the sea      swell coming in under perspective, small ripples, and the moon's light broken into
//                glitter on the water in a path that widens toward the shore
//   the waves    three fronts at a time roll in, lift, break unevenly along their length into
//                foam, and leave lace behind them
//   the shore    each wave runs up the sand as a thin sheet edged with foam, slows, and slides
//                back, leaving the sand dark and wet and shining for a while
// With motion turned off it paints one still moment. Without a graphics card it shows nothing and
// the banner keeps its plain sky behind.
import { useEffect, useRef } from "react";
import { calm } from "./homeworkMotion";
import styles from "./homework.module.css";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_day;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float x = uv.x * asp, y = uv.y, t = u_t;
  float aa = 1.5 / u_res.y;
  float H = 0.68;                       // the horizon
  float S0 = 0.30;                      // where the sea meets the sand at rest
  float P = 7.5;                        // seconds from one wave's arrival to the next

  // the colors of night and of day
  vec3 skyTop  = mix(vec3(0.015, 0.025, 0.085), vec3(0.30, 0.58, 0.92), u_day);
  vec3 skyHor  = mix(vec3(0.085, 0.13, 0.26),  vec3(0.78, 0.89, 0.98), u_day);
  vec3 seaFar  = mix(vec3(0.020, 0.050, 0.115), vec3(0.07, 0.36, 0.58), u_day);
  vec3 seaNear = mix(vec3(0.035, 0.105, 0.185), vec3(0.16, 0.62, 0.66), u_day);
  vec3 sandDry = mix(vec3(0.270, 0.262, 0.290), vec3(0.89, 0.79, 0.61), u_day);
  vec3 sandWet = mix(vec3(0.085, 0.105, 0.155), vec3(0.60, 0.51, 0.39), u_day);
  vec3 foamC   = mix(vec3(0.82, 0.88, 0.98),  vec3(1.0, 1.0, 1.0), u_day);
  vec3 lightC  = mix(vec3(0.84, 0.90, 1.00),  vec3(1.0, 0.96, 0.84), u_day);

  // the moon (or the sun): further left on a narrow banner, clear of the clock
  vec2 orb = vec2(asp * mix(0.47, 0.64, smoothstep(5.5, 8.0, asp)), mix(0.875, 0.89, u_day));
  float orbR = mix(0.068, 0.060, u_day);
  float d = distance(vec2(x, y), orb);

  // ---- sky ----
  vec3 sky = mix(skyHor, skyTop, smoothstep(H, 1.08, y));
  float halo = exp(-d * 4.5) * 0.50 + exp(-d * 16.0) * 0.55;
  sky += lightC * halo * mix(0.55, 0.65, u_day);
  // round stars, each with its own slow twinkle (night only)
  vec2 sg = vec2(x, y) * 34.0; vec2 si = floor(sg); vec2 sf = fract(sg) - 0.5;
  float sr = hash(si);
  vec2 so = (vec2(hash(si + 3.1), hash(si + 7.7)) - 0.5) * 0.7;
  float star = smoothstep(0.17 * (0.4 + sr), 0.0, length(sf - so)) * step(0.93, sr);
  star *= 0.55 + 0.45 * sin(t * (0.8 + sr * 2.0) + sr * 40.0);
  sky += vec3(star) * (1.0 - u_day) * smoothstep(H + 0.03, H + 0.2, y) * (1.0 - halo);
  // thin cloud low in the sky, lit from the moon's side
  float cl = fbm(vec2(x * 0.75 + t * 0.012, y * 5.5));
  float cloud = smoothstep(0.52, 0.80, cl) * smoothstep(H, H + 0.10, y) * smoothstep(1.02, 0.78, y);
  sky = mix(sky, mix(sky * 1.25 + lightC * (0.05 + halo * 0.5), vec3(1.0), u_day * 0.85), cloud * mix(0.55, 0.75, u_day));
  // the disc itself, with a little shading across it
  float disc = smoothstep(orbR, orbR - 0.012, d);
  float face = 0.93 - 0.16 * fbm((vec2(x, y) - orb) * 22.0 + 4.0) * (1.0 - u_day);
  sky = mix(sky, lightC * face * mix(1.0, 1.15, u_day), disc);

  // ---- sea ----
  float dy = max(H - y, 0.0);
  float z = 0.115 / (dy + 0.010);                 // how far out: large at the horizon
  float wx = (x - asp * 0.5) * z, wz = z;
  vec3 sea = mix(seaFar, seaNear, smoothstep(0.0, 0.30, dy));
  // swell, in lines along the shore, coming in; and ripples on it
  float swell = sin(wz * 15.0 + t * 0.85 + fbm(vec2(wx * 0.55, wz * 0.9)) * 3.2);
  sea *= 0.90 + 0.13 * swell;
  float rip = fbm(vec2(wx * 5.0 + t * 0.10, wz * 10.0 + t * 0.55));
  sea += (rip - 0.5) * mix(0.050, 0.085, u_day);
  // the sky lying on the water toward the horizon
  sea = mix(sea, skyHor * mix(0.80, 0.95, u_day), exp(-dy * 15.0) * 0.55);
  // the light's path on the water: narrow far out, wide near, broken into glitter
  float pw = 0.045 + dy * 1.15;
  float path = exp(-pow((x - orb.x) / pw, 2.0));
  float g1 = noise(vec2(wx * 24.0, wz * 34.0 - t * 2.1));
  float g2 = noise(vec2(wx * 9.0 + 3.0, wz * 15.0 + t * 1.3));
  float glit = smoothstep(0.30, 0.58, g1 * g2 * 1.9);
  sea += lightC * path * (glit * 0.95 + 0.11) * (1.15 - dy * 1.4) * mix(1.0, 0.8, u_day);

  // ---- the waves coming in ----
  float ph = fract(t / P + 0.11 * (noise(vec2(x * 0.33, 3.0)) - 0.5));
  float foam = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float q = (fk + ph) / 3.0;                                    // 0 far out, 1 at the sand
    float wob = (fbm(vec2(x * 0.8 + fk * 7.3, t * 0.07 + fk)) - 0.5) * 0.040 * (0.4 + q);
    float yF = mix(H - 0.085, S0 + 0.012, pow(q, 0.82)) + wob;
    float dF = y - yF;                                            // above the front is behind it
    float brk = smoothstep(0.28, 0.66, q) * (0.72 + 0.28 * noise(vec2(x * 0.75 + fk * 3.1, t * 0.16)));
    float th = 0.005 + 0.040 * q * q;
    // before it breaks: a dark face toward the shore and a pale back
    sea *= 1.0 - 0.20 * smoothstep(0.030, 0.0, abs(dF + 0.014)) * (1.0 - brk) * smoothstep(0.05, 0.3, q);
    sea += lightC * 0.07 * smoothstep(0.014, 0.0, abs(dF - 0.008)) * (1.0 - brk) * smoothstep(0.05, 0.3, q);
    // the breaking crest, ragged along its top
    float rag = 0.6 + 0.8 * noise(vec2(x * 9.0 + fk * 2.0, t * 0.9));
    foam = max(foam, brk * smoothstep(th * rag, th * 0.15, abs(dF - th * 0.25)));
    // foam left behind it, thinning into lace
    float trail = 0.03 + 0.13 * q;
    float behind = clamp(dF / trail, 0.0, 1.0);
    float lace = fbm(vec2(x * 2.6 + fk * 5.0, y * 64.0 + t * 0.25)) * 0.65 + fbm(vec2(x * 9.0, y * 30.0 - t * 0.1)) * 0.35;
    foam = max(foam, brk * step(0.0, dF) * (1.0 - behind) * smoothstep(0.40 + behind * 0.25, 0.62 + behind * 0.2, lace));
  }

  // ---- the wave running up the sand, and sliding back ----
  float amp = 0.250 * (0.82 + 0.36 * noise(vec2(x * 0.45, 1.7)));
  float run = smoothstep(0.0, 0.24, ph) * (1.0 - smoothstep(0.30, 0.98, ph));
  float edge = (fbm(vec2(x * 1.5, t * 0.04)) - 0.5) * 0.050 + (noise(vec2(x * 7.0, t * 0.12)) - 0.5) * 0.012;
  float Sy = S0 - amp * run + edge;                 // the water's edge now
  float Smin = S0 - amp + edge;                     // as far as this wave will reach
  // the thin sheet of water over the sand: the sand shows through it
  float sheet = smoothstep(S0 + 0.07, S0 - 0.02, y);
  vec3 thin = mix(sandWet * mix(1.25, 1.15, u_day), sea, mix(0.55, 0.40, u_day));
  sea = mix(sea, thin, sheet);
  // foam on the sheet: thick when the wave has just come, breaking into lace as it slides back
  float thr = mix(0.26, 0.72, smoothstep(0.04, 0.92, ph));
  float sl = fbm(vec2(x * 3.2, (y - Sy) * 46.0 + 2.0)) * 0.6 + fbm(vec2(x * 10.0, (y - Sy) * 26.0)) * 0.4;
  foam = max(foam, sheet * smoothstep(thr, thr + 0.13, sl) * smoothstep(1.0, 0.55, ph));
  // and a bright line of foam along the very edge, thicker while it is still climbing
  float lip = 0.006 + 0.014 * smoothstep(0.30, 0.0, ph);
  foam = max(foam, smoothstep(lip, 0.0, y - Sy) * step(Sy, y) * smoothstep(1.0, 0.7, ph));
  sea = mix(sea, foamC, clamp(foam, 0.0, 1.0) * mix(0.90, 0.97, u_day));

  // ---- the sand ----
  float grain = noise(vec2(x, y) * vec2(220.0, 260.0)) - 0.5;
  // all the sand in the picture is sand the waves reach: wet, dark and shining, never a dry
  // gray band along the bottom
  float wet = smoothstep(Smin - 0.30, Smin + 0.012, y);
  vec3 sand = mix(sandDry, sandWet, wet) + grain * mix(0.018, 0.035, u_day);
  // wet sand shines: the moon's light in it, or the bright sky by day, fading as it dries
  float shine = wet * (0.55 + 0.45 * (1.0 - ph));
  sand += lightC * exp(-pow((x - orb.x) / 0.16, 2.0)) * shine * mix(0.48, 0.10, u_day);
  sand = mix(sand, skyHor, shine * mix(0.10, 0.22, u_day));

  vec3 col = mix(sky, sea, smoothstep(H + aa, H - aa, y));
  col = mix(col, sand, smoothstep(Sy + aa, Sy - aa, y));
  // a breath of haze along the horizon
  col += lightC * 0.05 * exp(-abs(y - H) * 60.0);
  gl_FragColor = vec4(col, 1.0);
}`;

export function Shore({ day }: { day: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mode = useRef(day);
  useEffect(() => {
    mode.current = day;
  }, [day]);
  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;
    const make = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vert = make(gl.VERTEX_SHADER, VERT);
    const frag = make(gl.FRAGMENT_SHADER, FRAG);
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
    const light = gl.getUniformLocation(program, "u_day");
    canvas.dataset.painted = "";

    const fit = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    // the light eases between night and day when the page's mode is switched
    let shown = mode.current ? 1 : 0;
    let frame = 0;
    let seen = true;
    const began = performance.now();
    const paint = (now: number) => {
      fit();
      shown += ((mode.current ? 1 : 0) - shown) * 0.08;
      gl.uniform2f(res, canvas.width, canvas.height);
      gl.uniform1f(time, calm() ? 2.4 : (now - began) / 1000 + 2.4);
      gl.uniform1f(light, shown);
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
    };
  }, []);
  return <canvas ref={ref} className={styles.reel} aria-hidden="true" />;
}
