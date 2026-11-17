// The painting kit every Schedule scene is made with (founder, 2026-11-17: "scenes that are in
// motion and peaceful ... relatively detailed ... the motion that goes throughout each scene, and
// the lighting of each scene"). It is the part of the picture program (GLSL, run on the graphics
// card) that the scenes share:
//   the light   four lights, mixed by u_w: night, sunrise, day, sunset. `lit` paints a thing in
//               the hour's light (its shadow side in the sky's color, its lit side in the sun's or
//               the moon's); `haze` lets distance fade it toward the horizon.
//   the sky     `skyAt`: the hour's colors, the sun or the moon with its glow, round stars that
//               twinkle, heaped cloud that drifts and thin high cloud.
//   water       `waterAt`: the sky again, upside down, broken by ripples, with the light's glitter.
//   shapes      lines, boxes, circles, a row of pines, a leafy clump.
//   life        birds, fireflies, butterflies, and things that fall on the wind (petals, leaves).
// A scene is one function, `vec3 scene(vec2 p, float asp, float t)`: p.x runs 0 to asp, p.y 0
// (bottom) to 1 (top), t is seconds.

export const KIT = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform vec4 u_w;                       // how much of night, sunrise, day and sunset

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
float fbm3(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
vec3 pal(vec3 n, vec3 r, vec3 d, vec3 s){ return n * u_w.x + r * u_w.y + d * u_w.z + s * u_w.w; }
float palf(float n, float r, float d, float s){ return n * u_w.x + r * u_w.y + d * u_w.z + s * u_w.w; }
float AA(){ return 1.5 / u_res.y; }
// 1 below a line at height edge, 0 above it
float under(float y, float edge){ return smoothstep(edge + AA(), edge - AA(), y); }
// 1 inside a shape whose distance is d
float fill(float d){ return smoothstep(AA(), -AA(), d); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdOval(vec2 p, vec2 r){ return (length(p / r) - 1.0) * min(r.x, r.y); }

// ---- the light ----
vec3 horizonC(){ return pal(vec3(0.11, 0.16, 0.34), vec3(1.0, 0.86, 0.60), vec3(0.78, 0.90, 1.0), vec3(1.0, 0.68, 0.30)); }
vec3 keyC(){ return pal(vec3(0.30, 0.38, 0.64), vec3(1.0, 0.76, 0.56), vec3(1.0, 0.96, 0.88), vec3(1.0, 0.64, 0.42)); }
vec3 ambC(){ return pal(vec3(0.06, 0.09, 0.22), vec3(0.48, 0.40, 0.50), vec3(0.56, 0.64, 0.78), vec3(0.40, 0.26, 0.40)); }
vec3 orbC(){ return pal(vec3(0.97, 0.96, 0.90), vec3(1.0, 0.92, 0.68), vec3(1.0, 0.99, 0.90), vec3(1.0, 0.76, 0.40)); }
// the sun or the moon: high by day and by night, low at sunrise and sunset. H is the horizon.
vec2 orbAt(float asp, float H){ return vec2(asp * 0.74, H + (1.0 - H) * palf(0.66, 0.27, 0.72, 0.29)); }
// a thing's own color, in this hour's light: facing 0 is its shadow side, 1 its lit side
vec3 lit(vec3 albedo, float facing){ return albedo * (ambC() + keyC() * clamp(facing, 0.0, 1.0)); }
// distance fades a thing into the air's own color: blue by day, mauve at dusk
vec3 hazeC(){ return pal(vec3(0.09, 0.13, 0.30), vec3(0.86, 0.66, 0.66), vec3(0.70, 0.83, 0.96), vec3(0.62, 0.38, 0.52)); }
vec3 haze(vec3 c, float k){ return mix(c, hazeC(), clamp(k, 0.0, 1.0)); }
// a warm light that shows at dusk and at night (a window, a lantern)
float lamp(){ return clamp(u_w.x + 0.7 * u_w.w + 0.25 * u_w.y, 0.0, 1.0); }

// ---- the sky ----
vec3 skyAt(vec2 p, float asp, float t, float H){
  float sy = clamp((p.y - H) / (1.0 - H), 0.0, 1.0);
  vec3 top = pal(vec3(0.015, 0.025, 0.09), vec3(0.24, 0.40, 0.74), vec3(0.16, 0.46, 0.90), vec3(0.20, 0.17, 0.46));
  vec3 mid = pal(vec3(0.05, 0.08, 0.22), vec3(0.96, 0.66, 0.56), vec3(0.42, 0.70, 0.97), vec3(0.90, 0.40, 0.42));
  vec3 col = mix(horizonC(), mid, smoothstep(0.0, 0.42, sy));
  col = mix(col, top, smoothstep(0.30, 1.0, sy));

  vec2 orb = orbAt(asp, H);
  float R = palf(0.050, 0.070, 0.055, 0.080);
  float d = distance(p, orb);
  col += orbC() * palf(0.30, 0.85, 0.40, 1.0) * (0.55 * exp(-d * d * 22.0) + 0.22 * exp(-d * 5.5));

  float night = u_w.x;
  if (night > 0.01) {
    vec2 g = p * 34.0, id = floor(g), f = fract(g) - 0.5;
    float h = hash(id);
    vec2 off = (vec2(hash(id + 1.7), hash(id + 9.1)) - 0.5) * 0.7;
    float star = smoothstep(0.075, 0.0, length(f - off)) * step(0.82, h);
    float tw = 0.55 + 0.45 * sin(t * (1.0 + h * 2.5) + h * 60.0);
    col += vec3(0.90, 0.94, 1.0) * star * tw * night * smoothstep(0.02, 0.35, sy);
  }
  vec3 face = orbC() * (1.0 - night * 0.16 * smoothstep(0.45, 0.70, fbm(p * 28.0)));
  // (never darker than the glow round it, so its picture in water is not a dark coin)
  col = mix(col, max(face, col * (1.0 - night)), smoothstep(R + AA(), R - AA(), d));

  float band = smoothstep(0.16, 0.36, sy) * (1.0 - smoothstep(0.86, 1.0, sy));
  vec2 cp = vec2(p.x * 1.25 + t * 0.012, p.y * 3.4);
  float n1 = fbm(cp);
  float cover = palf(0.52, 0.42, 0.43, 0.40);
  float cd = smoothstep(cover, cover + 0.22, n1) * band;
  vec2 toOrb = normalize(orb - p + 0.0001);
  float l = smoothstep(-0.05, 0.16, n1 - fbm(cp + vec2(toOrb.x * 1.25, toOrb.y * 3.4) * 0.07));
  vec3 cLit = pal(vec3(0.20, 0.24, 0.40), vec3(1.0, 0.84, 0.74), vec3(1.0, 1.0, 1.0), vec3(1.0, 0.60, 0.44));
  vec3 cShade = pal(vec3(0.04, 0.06, 0.15), vec3(0.60, 0.42, 0.54), vec3(0.74, 0.81, 0.92), vec3(0.40, 0.22, 0.42));
  col = mix(col, mix(cShade, cLit, l), cd * 0.94);
  float cirrus = smoothstep(0.55, 0.90, fbm3(vec2(p.x * 0.7 - t * 0.006, p.y * 9.0 + 4.0))) * smoothstep(0.50, 0.90, sy);
  return mix(col, cLit, cirrus * 0.25);
}

// ---- water: the sky again in it, with ripples and the light's glitter ----
vec3 waterAt(vec2 p, float asp, float t, float H, vec3 deep){
  float depth = clamp((H - p.y) / H, 0.0, 1.0);
  float rip = noise(vec2(p.x * 22.0 + t * 0.25, p.y * 150.0 - t * 0.9)) - 0.5;
  vec2 q = vec2(p.x + rip * 0.035 * depth, 2.0 * H - p.y + rip * 0.05 * depth);
  vec3 c = mix(skyAt(q, asp, t, H), deep, 0.30 + 0.36 * depth);
  float path = exp(-pow((p.x - orbAt(asp, H).x) / (0.035 + depth * 0.22), 2.0));
  float spark = smoothstep(0.62, 0.95, noise(vec2(p.x * 70.0, p.y * 260.0 - t * 1.6)));
  return c + orbC() * path * spark * palf(0.55, 0.90, 0.50, 1.0) * (0.35 + 0.65 * depth);
}

// ---- shapes ----
// a row of pines standing on a line at height base; s is how wide one tree is. They sway a little.
float pines(vec2 p, float base, float s, float seed, float t){
  float cx = floor(p.x / s);
  float h = hash(vec2(cx, seed));
  float ht = s * (1.7 + 1.7 * h);
  float y = (p.y - base) / ht;
  float fx = fract(p.x / s) - 0.5 + (h - 0.5) * 0.25 - sin(t * 0.8 + cx * 1.7) * 0.03 * clamp(y, 0.0, 1.0);
  float w = (1.0 - y) * 0.44 * (0.72 + 0.28 * fract(y * 5.0 + h * 3.0));
  return smoothstep(w, w - 0.07, abs(fx)) * step(0.0, y) * step(y, 1.0);
}
// a leafy clump: a round shape with a ragged, leafy edge
float clump(vec2 p, vec2 c, float r, float seed){
  vec2 q = p - c;
  float d = length(q) - r * (0.72 + 0.50 * fbm3(q * (5.0 / r) + seed));
  return smoothstep(AA() * 2.0, -AA() * 2.0, d);
}

// ---- life ----
// three birds crossing, wings beating
float birds(vec2 p, float asp, float t, float y0){
  float m = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 bp = vec2(asp * (fract(t * 0.016 + fi * 0.37) * 1.3 - 0.15), y0 + 0.05 * fi + 0.012 * sin(t * 0.9 + fi * 2.0));
    vec2 l = (p - bp) / (0.016 + 0.004 * fi);
    float flap = 0.35 + 0.45 * sin(t * 7.0 + fi * 1.7);
    float wing = abs(l.y - abs(l.x) * flap + 0.25 * l.x * l.x);
    m = max(m, smoothstep(0.16, 0.05, wing) * smoothstep(1.0, 0.8, abs(l.x)));
  }
  return m * (u_w.y + u_w.z + u_w.w);
}
// fireflies wandering between two heights at night
vec3 fireflies(vec2 p, float asp, float t, float y0, float y1){
  vec3 c = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 1.0)), h2 = hash(vec2(fi, 2.0));
    vec2 fp = vec2(asp * fract(h1 + t * 0.008 * (0.5 + h2)), mix(y0, y1, h2) + 0.02 * sin(t * (0.7 + h1) + fi));
    float fd = distance(p, fp);
    float blink = 0.5 + 0.5 * sin(t * (1.5 + h2 * 2.0) + fi * 2.1);
    c += vec3(1.0, 0.92, 0.50) * exp(-fd * fd * 9000.0) * blink;
  }
  return c * (u_w.x + 0.35 * u_w.w) * 1.2;
}
// things falling on the wind (petals, leaves): cell is their spacing, speed how fast they fall
float drift(vec2 p, float t, float cell, float speed, float seed){
  vec2 q = vec2(p.x - t * speed * 0.55, p.y + t * speed) / cell;
  vec2 id = floor(q), f = fract(q) - 0.5;
  float h = hash(id + seed);
  vec2 o = (vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5) * 0.6;
  o.x += 0.16 * sin(t * (1.0 + h) + h * 30.0);
  float spin = t * (1.0 + h * 2.0) + h * 20.0;
  vec2 d = f - o;
  d = vec2(d.x * cos(spin) - d.y * sin(spin), d.x * sin(spin) + d.y * cos(spin));
  return smoothstep(0.11, 0.05, length(d * vec2(1.0, 1.9))) * step(0.5, h);
}
// butterflies: two wings that open and close, wandering. Returns the wings' own color in rgb and
// how much of them is here in a.
vec4 butterflies(vec2 p, float asp, float t, float y0, float y1){
  vec4 best = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 5.0)), h2 = hash(vec2(fi, 6.0));
    vec2 c = vec2(asp * (0.1 + 0.8 * fract(h1 + t * 0.012 * (0.6 + h2) * (h2 > 0.5 ? 1.0 : -1.0))),
                  mix(y0, y1, h2) + 0.04 * sin(t * (0.9 + h1) + fi * 1.9) + 0.015 * sin(t * 3.1 + fi));
    vec2 l = (p - c) / 0.022;
    float flap = 0.25 + 0.75 * abs(sin(t * (7.0 + h1 * 3.0) + fi));
    l.x /= flap;
    float wings = max(fill(sdOval(vec2(abs(l.x) - 0.55, l.y - 0.2), vec2(0.5, 0.42))),
                      fill(sdOval(vec2(abs(l.x) - 0.42, l.y + 0.32), vec2(0.36, 0.30))));
    vec3 wc = h1 < 0.33 ? vec3(1.0, 0.62, 0.14) : h1 < 0.66 ? vec3(0.42, 0.66, 1.0) : vec3(1.0, 0.86, 0.30);
    if (wings > best.a) best = vec4(wc, wings);
  }
  best.a *= u_w.z + u_w.y + 0.8 * u_w.w;
  return best;
}
`;

export const MAIN = `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec3 col = scene(vec2(uv.x * asp, uv.y), asp, u_t);
  // grain, so soft skies do not band
  col += (hash(gl_FragCoord.xy + u_t) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;
