"use client";

// A real photograph, brought to life (founder, 2026-11-17: "I want it to look like a photograph
// and a video game that is in motion"). The picture is a real photo of the place at that hour;
// everything that moves is added on the graphics card, on top of it and inside it:
//   the water    the photo's own water is made to ripple, so the reflection wavers as a real one
//                does; flecks of light glitter where it is bright; thin mist drifts over it
//   the wood     the tree line sways a little in the wind
//   life         ducks paddle across with a wake behind them; a frog leaps from the bank and
//                rings spread where it lands; birds cross the sky by day; fireflies and a
//                twinkling stars and a shooting star at night
//   the camera   drifts very slowly, as if held
// With motion turned off it shows the photograph still. Without a graphics card the photograph
// is shown as a plain picture behind.
import { useEffect, useRef } from "react";
import { calm } from "./homeworkMotion";

export interface Photo {
  src: string;
  /** Where the water begins, as a share of the photo's height from its top. */
  water: number;
  /** Where the water ends and the near bank begins (rocks, grass); 1 when it runs off the photo. */
  bank?: number;
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_t;
uniform float u_img;                    // the photo's width over its height
uniform float u_water;                  // where its water begins, from the top
uniform float u_bank;                   // where it ends at the near bank
uniform float u_night;                  // 1 at night

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float t = u_t;
  // the photo covers the card (cropped, never stretched); the camera drifts a little
  vec2 s = asp > u_img ? vec2(1.0, u_img / asp) : vec2(asp / u_img, 1.0);
  float zoom = 0.94;
  vec2 pan = vec2(0.012 * sin(t * 0.05), 0.006 * sin(t * 0.037 + 1.0));
  vec2 q = vec2((uv.x - 0.5) * s.x * zoom + 0.5 + pan.x, 0.5 - (uv.y - 0.5) * s.y * zoom + pan.y);
  // the waterline, in the card's own heights (0 at the bottom)
  float wl = 0.5 - (u_water - 0.5 - pan.y) / (s.y * zoom);
  // the near bank, the same way: nothing below it is water
  float bl = 0.5 - (u_bank - 0.5 - pan.y) / (s.y * zoom);
  vec2 p = vec2(uv.x * asp, uv.y);
  float below = q.y - u_water;
  float depth = clamp(below / (u_bank - u_water), 0.0, 1.0);
  // water lies between the far shore and the near bank, fading out at the bank
  float wet = step(0.0, below) * smoothstep(u_bank, u_bank - 0.03, q.y);

  // a frog leaps from the bank every so often: rings spread from where it lands
  float lap = floor(t / 11.0), age = fract(t / 11.0) * 11.0;
  vec2 land = vec2(asp * (0.22 + 0.4 * hash(vec2(lap, 3.0))), mix(bl, wl, 0.25 + 0.2 * hash(vec2(lap, 5.0))));
  float since = age - 0.7;
  vec2 rv = (p - land) * vec2(1.0, 3.0);
  float rd = length(rv);
  float ring = since > 0.0 ? sin(rd * 150.0 - since * 9.0) * exp(-rd * 9.0) * exp(-since * 0.8) * smoothstep(since * 0.11 + 0.02, since * 0.11, rd) : 0.0;

  if (below > 0.0) {
    // ripples: the reflection wavers, more the nearer the water is
    float n1 = noise(vec2(q.x * 60.0, q.y * 220.0 - t * 0.8)) - 0.5;
    float n2 = noise(vec2(q.x * 24.0 + t * 0.15, q.y * 90.0 - t * 0.35)) - 0.5;
    q += vec2(n1 * 0.004 + n2 * 0.006, n1 * 0.006 + n2 * 0.010) * (0.25 + depth) * wet;
    q += normalize(rv + 0.0001) * ring * 0.012 * wet;
  } else {
    // the wood by the water sways a little in the wind
    float up = -below;
    float band = smoothstep(0.0, 0.03, up) * smoothstep(0.30, 0.10, up);
    q.x += (noise(vec2(q.x * 9.0 + t * 0.30, q.y * 12.0)) - 0.5) * 0.0045 * band;
  }
  vec3 col = texture2D(u_tex, clamp(q, 0.001, 0.999)).rgb;
  float lum = dot(col, vec3(0.3, 0.6, 0.1));

  // light glittering on the water, where the water is bright
  float spark = smoothstep(0.72, 0.96, noise(vec2(q.x * 170.0, q.y * 520.0 - t * 1.5)));
  col += vec3(1.0, 0.96, 0.86) * spark * pow(lum, 4.0) * 0.30 * wet;
  col += vec3(1.0) * abs(ring) * 0.10 * wet;
  // thin mist drifting over the far water
  float mist = smoothstep(0.45, 0.8, fbm(vec2(p.x * 2.0 - t * 0.02, p.y * 9.0))) * exp(-abs(p.y - wl) * 26.0);
  col = mix(col, mix(col, vec3(0.9, 0.93, 0.98), 0.5), mist * 0.35 * (1.0 - 0.6 * u_night));

  // ducks paddling across, each with its wake
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float dir = i == 1 ? -1.0 : 1.0;
    float sz = 0.020 - 0.004 * fi;
    vec2 dc = vec2(asp * fract(0.15 + fi * 0.31 + dir * t * (0.006 + 0.002 * fi)), mix(bl, wl, 0.80 - 0.18 * fi) + 0.0015 * sin(t * 2.0 + fi));
    vec2 l = (p - dc) / sz; l.x *= dir;
    float body = length(l * vec2(1.0, 2.1)) - 1.0;
    float neck = sdSeg(l, vec2(0.62, 0.20), vec2(0.86, 0.86)) - 0.20;
    float head = length(l - vec2(0.95, 0.98)) - 0.30;
    float bill = sdSeg(l, vec2(1.10, 0.96), vec2(1.50, 0.90)) - 0.09;
    float tail = sdSeg(l, vec2(-0.9, 0.10), vec2(-1.25, 0.42)) - 0.12;
    float d = min(min(min(body, neck), min(head, bill)), tail);
    float duck = smoothstep(0.08, -0.08, d) * step(-0.25, l.y);
    // its dark picture in the water under it, and the wake spreading behind
    float mirror = smoothstep(0.1, -0.1, length(vec2(l.x, (l.y + 0.3) * 2.4)) - 1.0) * step(l.y, -0.2);
    float wake = step(l.x, -0.6) * smoothstep(0.10, 0.0, abs(abs(l.y + 0.15) - (-l.x - 0.6) * 0.20)) * exp(l.x * 0.12) * step(-9.0, l.x);
    col = mix(col, col * 0.45, mirror * 0.6);
    col += vec3(0.9, 0.94, 1.0) * wake * (0.10 + 0.25 * lum);
    vec3 feathers = mix(vec3(0.10, 0.08, 0.07), vec3(0.34, 0.26, 0.18), smoothstep(-0.2, 0.5, l.y)) * (0.35 + 0.65 * (1.0 - u_night));
    col = mix(col, feathers * (0.5 + lum), duck);
  }

  // the frog in the air, a small dark shape on a low arc
  if (age < 0.7) {
    float k = age / 0.7;
    vec2 from = vec2(land.x - 0.16, max(bl - 0.02, 0.02));
    vec2 fp = mix(from, land, k) + vec2(0.0, 0.09 * sin(3.1416 * k));
    col = mix(col, vec3(0.05, 0.09, 0.04), smoothstep(0.009, 0.005, length((p - fp) * vec2(1.0, 1.5))));
  }

  // birds crossing the sky by day
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 bp = vec2(asp * (fract(t * 0.014 + fi * 0.29) * 1.3 - 0.15), wl + (1.0 - wl) * (0.55 + 0.09 * fi) + 0.012 * sin(t * 0.9 + fi * 2.0));
    vec2 l = (p - bp) / (0.014 + 0.003 * fi);
    float flap = 0.35 + 0.45 * sin(t * 7.0 + fi * 1.7);
    float wing = abs(l.y - abs(l.x) * flap + 0.25 * l.x * l.x);
    col = mix(col, vec3(0.03, 0.03, 0.05), smoothstep(0.16, 0.05, wing) * smoothstep(1.0, 0.8, abs(l.x)) * 0.85 * (1.0 - u_night));
  }

  // at night: fireflies wander over the water's edge, and now and then a star falls
  if (u_night > 0.01) {
    // stars in the open sky (not over the trees or the glow), each twinkling at its own pace
    vec2 sg = q * vec2(1.6, 1.0) * 44.0;
    vec2 cell = floor(sg);
    float sh = hash(cell);
    float sd = distance(sg, cell + 0.2 + 0.6 * vec2(hash(cell + 3.1), hash(cell + 7.7)));
    float open = smoothstep(0.12, 0.20, lum) * smoothstep(0.50, 0.30, lum) * smoothstep(0.02, 0.22, -below);
    col += vec3(0.95, 0.97, 1.0) * step(0.80, sh) * exp(-sd * sd * (70.0 + 120.0 * hash(cell + 1.7))) * open * (0.55 + 0.45 * sin(t * (0.5 + 2.0 * sh) + sh * 40.0)) * (0.35 + 0.65 * hash(cell + 5.3));
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float h1 = hash(vec2(fi, 1.0)), h2 = hash(vec2(fi, 2.0));
      vec2 fp = vec2(asp * fract(h1 + t * 0.008 * (0.5 + h2)), mix(0.03, wl, 0.1 + 0.6 * h2) + 0.02 * sin(t * (0.7 + h1) + fi));
      float fd = distance(p, fp);
      col += vec3(1.0, 0.92, 0.50) * exp(-fd * fd * 9000.0) * (0.5 + 0.5 * sin(t * (1.5 + h2 * 2.0) + fi * 2.1)) * 1.1;
    }
    float fall = fract(t / 17.0) * 17.0;
    if (fall < 0.9) {
      float h = hash(vec2(floor(t / 17.0), 7.0));
      vec2 a = vec2(asp * (0.2 + 0.6 * h), 0.95) + vec2(0.55, -0.30) * fall;
      float streak = smoothstep(0.004, 0.0, sdSeg(p, a, a - vec2(0.11, -0.06)));
      col += vec3(1.0) * streak * (1.0 - fall / 0.9) * step(wl, p.y);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export default function PhotoScene({
  photo,
  night,
  className,
}: {
  photo: Photo;
  night: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useRef(night);
  useEffect(() => {
    dark.current = night;
  }, [night]);
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
      console.error("[scene photo]", gl.getShaderInfoLog(shader));
      return null;
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
    const img = gl.getUniformLocation(program, "u_img");
    const water = gl.getUniformLocation(program, "u_water");
    const bank = gl.getUniformLocation(program, "u_bank");
    const nightAt = gl.getUniformLocation(program, "u_night");

    let frame = 0;
    let seen = true;
    let ready = false;
    let gone = false;
    const began = performance.now();
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
    const paint = (now: number) => {
      frame = 0;
      if (!ready) return;
      fit();
      gl.uniform2f(res, canvas.width, canvas.height);
      gl.uniform1f(time, calm() ? 4 : (now - began) / 1000 + 4);
      gl.uniform1f(nightAt, dark.current ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!calm() && seen && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // the photograph
    const picture = new Image();
    picture.onload = () => {
      if (gone) return;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, picture);
      gl.uniform1f(img, picture.naturalWidth / picture.naturalHeight);
      gl.uniform1f(water, photo.water);
      gl.uniform1f(bank, photo.bank ?? 1);
      ready = true;
      canvas.dataset.painted = "";
      wake();
    };
    picture.src = photo.src;

    const watch = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (seen) wake();
    });
    watch.observe(canvas);
    const sized = new ResizeObserver(wake);
    sized.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    const stir = window.setInterval(wake, 400);
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      window.clearInterval(stir);
      watch.disconnect();
      sized.disconnect();
      document.removeEventListener("visibilitychange", wake);
      gl.deleteProgram(program);
    };
  }, [photo.src, photo.water, photo.bank]);
  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      // the photograph itself shows behind until, and unless, the moving one is ready
      style={{
        backgroundImage: `url(${photo.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
