"use client";

// The sky over the next session, painted and moved here in code (founder, 2026-11-17: "a scene
// drawn out for each time ... realistic, in motion, and beautiful, with animations and life").
// One painting with four lights: night, sunrise, day and sunset, chosen from the estimated sunrise
// and sunset where the student is. It is painted pixel by pixel on the graphics card:
//   the sky     its own colors for the hour, the sun or the moon with its glow, round stars that
//               twinkle at night
//   the clouds  heaped cloud that drifts, lit on the side the light comes from, and thin high cloud
//   the land    two ridges of hills, the far one pale with distance
//   the lake    the whole sky again in the water, broken by ripples, with the light's glitter laid
//               in a path toward the shore
//   the bank    grass in the foreground that sways
//   life        birds crossing by day, fireflies at night
// With motion turned off it paints one still moment. Without a graphics card it shows nothing and
// the card keeps a plain sky of the same colors behind.
import { useEffect, useRef } from "react";
import { calm } from "./homeworkMotion";
import type { Sky } from "./scheduleData";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform vec4 u_w;                       // how much of night, sunrise, day and sunset

const float H = 0.36;                   // where the water meets the far shore

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
vec3 pal(vec3 n, vec3 r, vec3 d, vec3 s){ return n * u_w.x + r * u_w.y + d * u_w.z + s * u_w.w; }
float palf(float n, float r, float d, float s){ return n * u_w.x + r * u_w.y + d * u_w.z + s * u_w.w; }

vec2 orbAt(float asp){ return vec2(asp * 0.74, H + palf(0.47, 0.165, 0.50, 0.170)); }
vec3 orbColor(){ return pal(vec3(0.97, 0.96, 0.90), vec3(1.0, 0.92, 0.68), vec3(1.0, 0.99, 0.90), vec3(1.0, 0.76, 0.40)); }
vec3 horizon(){ return pal(vec3(0.11, 0.16, 0.34), vec3(1.0, 0.86, 0.60), vec3(0.78, 0.90, 1.0), vec3(1.0, 0.68, 0.30)); }

// everything above the water: sky, light, stars, cloud and hills
vec3 sky(vec2 p, float asp, float t){
  float aa = 1.5 / u_res.y;
  float sy = clamp((p.y - H) / (1.0 - H), 0.0, 1.0);
  vec3 top = pal(vec3(0.015, 0.025, 0.09), vec3(0.24, 0.40, 0.74), vec3(0.16, 0.46, 0.90), vec3(0.20, 0.17, 0.46));
  vec3 mid = pal(vec3(0.05, 0.08, 0.22), vec3(0.96, 0.66, 0.56), vec3(0.42, 0.70, 0.97), vec3(0.90, 0.40, 0.42));
  vec3 hor = horizon();
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.42, sy));
  col = mix(col, top, smoothstep(0.30, 1.0, sy));

  vec2 orb = orbAt(asp);
  vec3 orbC = orbColor();
  float R = palf(0.050, 0.070, 0.055, 0.080);
  float d = distance(p, orb);
  float glow = palf(0.30, 0.85, 0.40, 1.0);
  col += orbC * glow * (0.55 * exp(-d * d * 22.0) + 0.22 * exp(-d * 5.5));

  float night = u_w.x;
  if (night > 0.01) {
    vec2 g = p * 34.0, id = floor(g), f = fract(g) - 0.5;
    float h = hash(id);
    vec2 off = (vec2(hash(id + 1.7), hash(id + 9.1)) - 0.5) * 0.7;
    float star = smoothstep(0.075, 0.0, length(f - off)) * step(0.82, h);
    float tw = 0.55 + 0.45 * sin(t * (1.0 + h * 2.5) + h * 60.0);
    col += vec3(0.90, 0.94, 1.0) * star * tw * night * smoothstep(0.02, 0.35, sy);
  }

  float disc = smoothstep(R + aa, R - aa, d);
  vec3 face = orbC * (1.0 - night * 0.16 * smoothstep(0.45, 0.70, fbm(p * 28.0)));
  col = mix(col, face, disc);

  float band = smoothstep(0.16, 0.36, sy) * (1.0 - smoothstep(0.86, 1.0, sy));
  vec2 cp = vec2(p.x * 1.25 + t * 0.012, p.y * 3.4);
  float n1 = fbm(cp);
  float cover = palf(0.52, 0.42, 0.43, 0.40);
  float cd = smoothstep(cover, cover + 0.22, n1) * band;
  vec2 toOrb = normalize(orb - p + 0.0001);
  float lit = smoothstep(-0.05, 0.16, n1 - fbm(cp + vec2(toOrb.x * 1.25, toOrb.y * 3.4) * 0.07));
  vec3 cLit = pal(vec3(0.20, 0.24, 0.40), vec3(1.0, 0.84, 0.74), vec3(1.0, 1.0, 1.0), vec3(1.0, 0.60, 0.44));
  vec3 cShade = pal(vec3(0.04, 0.06, 0.15), vec3(0.60, 0.42, 0.54), vec3(0.74, 0.81, 0.92), vec3(0.40, 0.22, 0.42));
  col = mix(col, mix(cShade, cLit, lit), cd * 0.94);
  float cirrus = smoothstep(0.55, 0.90, fbm(vec2(p.x * 0.7 - t * 0.006, p.y * 9.0 + 4.0))) * smoothstep(0.50, 0.90, sy);
  col = mix(col, cLit, cirrus * 0.25);

  float r1 = H + 0.085 + 0.12 * fbm(vec2(p.x * 1.1 + 2.0, 0.5));
  vec3 far = mix(hor, pal(vec3(0.05, 0.07, 0.18), vec3(0.45, 0.36, 0.52), vec3(0.36, 0.52, 0.72), vec3(0.42, 0.22, 0.40)), 0.72);
  col = mix(col, far, smoothstep(r1 + aa, r1 - aa, p.y));
  float r2 = H + 0.02 + 0.085 * fbm(vec2(p.x * 2.2 + 9.0, 3.0)) + 0.012 * noise(vec2(p.x * 26.0, 7.0));
  vec3 near = pal(vec3(0.025, 0.04, 0.10), vec3(0.24, 0.22, 0.34), vec3(0.16, 0.36, 0.34), vec3(0.20, 0.11, 0.24));
  col = mix(col, near, smoothstep(r2 + aa, r2 - aa, p.y));
  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float x = uv.x * asp, y = uv.y, t = u_t;
  float aa = 1.5 / u_res.y;
  vec2 orb = orbAt(asp);
  vec3 orbC = orbColor();
  vec3 col;

  if (y >= H) {
    col = sky(vec2(x, y), asp, t);
  } else {
    // the lake: the sky again, upside down, broken by ripples that grow toward the shore
    float depth = (H - y) / H;
    float rip = noise(vec2(x * 22.0 + t * 0.25, y * 150.0 - t * 0.9)) - 0.5;
    vec2 q = vec2(x + rip * 0.035 * depth, 2.0 * H - y + rip * 0.05 * depth);
    col = sky(q, asp, t);
    vec3 deep = pal(vec3(0.01, 0.03, 0.08), vec3(0.20, 0.24, 0.38), vec3(0.06, 0.30, 0.46), vec3(0.16, 0.10, 0.26));
    col = mix(col, deep, 0.28 + 0.34 * depth);
    float path = exp(-pow((x - orb.x) / (0.035 + depth * 0.22), 2.0));
    float spark = smoothstep(0.62, 0.95, noise(vec2(x * 70.0, y * 260.0 - t * 1.6)));
    col += orbC * path * spark * palf(0.55, 0.90, 0.50, 1.0) * (0.35 + 0.65 * depth);
  }
  // a little mist where the water meets the land
  col = mix(col, horizon(), 0.30 * exp(-abs(y - H) * 90.0));

  // birds crossing, by day and when the sun is low
  float birds = u_w.y + u_w.z + u_w.w;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 bp = vec2(asp * (fract(t * 0.016 + fi * 0.37) * 1.3 - 0.15), 0.72 + 0.05 * fi + 0.012 * sin(t * 0.9 + fi * 2.0));
    vec2 l = (vec2(x, y) - bp) / (0.016 + 0.004 * fi);
    float flap = 0.35 + 0.45 * sin(t * 7.0 + fi * 1.7);
    float wing = abs(l.y - abs(l.x) * flap + 0.25 * l.x * l.x);
    float b = smoothstep(0.16, 0.05, wing) * smoothstep(1.0, 0.8, abs(l.x));
    col = mix(col, vec3(0.05, 0.06, 0.10), b * birds * 0.85);
  }

  // the near bank, with grass that sways
  float bank = 0.10 + 0.05 * sin(x * 1.1 + 0.6) + 0.02 * fbm(vec2(x * 3.0, 2.0));
  float sway = sin(t * 1.3 + x * 5.0) * 0.004;
  float blades = 0.030 * pow(noise(vec2((x + sway) * 85.0, 3.0)), 2.0);
  vec3 bankC = pal(vec3(0.012, 0.02, 0.05), vec3(0.10, 0.10, 0.16), vec3(0.08, 0.24, 0.16), vec3(0.09, 0.05, 0.12));
  col = mix(col, bankC, smoothstep(bank + blades + aa, bank + blades - aa, y));

  // fireflies over the bank at night
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 1.0)), h2 = hash(vec2(fi, 2.0));
    vec2 fp = vec2(asp * fract(h1 + t * 0.008 * (0.5 + h2)), 0.10 + 0.16 * h2 + 0.02 * sin(t * (0.7 + h1) + fi));
    float fd = distance(vec2(x, y), fp);
    float blink = 0.5 + 0.5 * sin(t * (1.5 + h2 * 2.0) + fi * 2.1);
    col += vec3(1.0, 0.92, 0.50) * exp(-fd * fd * 9000.0) * blink * u_w.x * 1.2;
  }

  // grain, so the soft sky does not band
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;

const WEIGHTS: Record<Sky, [number, number, number, number]> = {
  night: [1, 0, 0, 0],
  sunrise: [0, 1, 0, 0],
  day: [0, 0, 1, 0],
  sunset: [0, 0, 0, 1],
};

export default function Scene({ sky, className }: { sky: Sky; className?: string }) {
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
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
