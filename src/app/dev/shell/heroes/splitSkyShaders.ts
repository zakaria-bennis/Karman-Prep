// The shaders of the split sky (splitSky.ts): the sky itself, the vector lines and the stars.

export const SKY = /* glsl */ `
  precision highp float;
  uniform float uS, uTime, uOpen, uSurge;
  uniform vec2 uN, uHalf, uFocus;
  uniform vec3 uObs;     // the observatory: where it stands (x), how big it is, unused
  uniform float uLine, uReveal;   // the seam forms along its length, then the two skies open out from it
  uniform vec4 uShoot;   // where it starts (xy), how far along it is (z), how bright (w)
  varying vec2 vP; varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
  // a row of pines along a ridge: each a small peak, of its own height, with gaps between
  float pines(float x, float f, float amp) {
    float h = hash(vec2(floor(x * f), f));
    return (1.0 - abs(fract(x * f) - 0.5) * 2.0) * amp * (0.35 + 0.65 * h) * step(0.3, h);
  }
  // the three ridges, far to near, as heights in the stage (0 foot, 1 top)
  float ridge1(float x) { return 0.215 + 0.05 * sin(x * 0.9 + 0.5) + 0.025 * sin(x * 2.3 + 1.7); }
  float ridge2(float x) { return 0.135 + 0.04 * sin(x * 1.4 + 2.1) + 0.02 * sin(x * 3.7); }
  float ridge3(float x) { return 0.055 + 0.03 * sin(x * 2.1 + 4.0) + 0.012 * sin(x * 5.3); }

  vec3 dusk(vec2 p, float y) {
    vec3 c = mix(vec3(1.0, 0.79, 0.56), vec3(0.98, 0.64, 0.56), smoothstep(0.0, 0.45, y));
    c = mix(c, vec3(0.60, 0.50, 0.75), smoothstep(0.35, 1.0, y));
    vec2 sun = vec2(-uHalf.x * 0.25, -uHalf.y * 0.6);
    c += vec3(1.0, 0.74, 0.38) * exp(-length((p - sun) * vec2(0.5, 1.0)) * 0.85) * 0.6;
    // cloud, lit warm from below, drifting
    float cl = fbm(vec2(p.x * 0.42 + uTime * 0.02, p.y * 1.15) + 3.0);
    float bank = smoothstep(0.50, 0.78, cl) * smoothstep(0.18, 0.62, y);
    c = mix(c, vec3(1.0, 0.87, 0.78), bank * 0.6);
    c = mix(c, vec3(0.78, 0.50, 0.62), smoothstep(0.64, 0.9, cl) * smoothstep(0.3, 0.8, y) * 0.4);
    // a scatter of small birds on the wing, far off, crossing at their own heights and speeds
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float sp = 0.035 + hash(vec2(fi, 3.0)) * 0.05;
      float bx = (fract(uTime * sp + hash(vec2(fi, 7.0))) * 2.4 - 1.2) * uHalf.x * (mod(fi, 2.0) < 1.0 ? 1.0 : -1.0);
      float by = (0.05 + hash(vec2(fi, 11.0)) * 0.8) * uHalf.y + sin(uTime * 0.7 + fi) * 0.06;
      float sz = 0.05 + hash(vec2(fi, 5.0)) * 0.06;
      vec2 q = (p - vec2(bx, by)) / sz;
      float flap = 0.35 + 0.45 * sin(uTime * (7.0 + fi) + fi * 3.0);
      float wing = abs(q.y - abs(q.x) * flap + 0.25 * q.x * q.x);
      float bird = smoothstep(0.16, 0.06, wing) * smoothstep(1.0, 0.8, abs(q.x));
      c = mix(c, vec3(0.30, 0.20, 0.30), bird * 0.75);
    }
    return c;
  }

  vec3 night(vec2 p, float y) {
    vec3 c = mix(vec3(0.09, 0.12, 0.31), vec3(0.015, 0.02, 0.09), smoothstep(0.0, 1.0, y));
    c += vec3(0.10, 0.26, 0.34) * exp(-y * 5.5) * 0.7;                    // the last light on the horizon
    // the whole sky wheels slowly about a pole above the stage
    float a = uTime * (0.006 + uSurge * 0.01);
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (p - vec2(uHalf.x * 0.3, uHalf.y * 1.5));
    // the Milky Way: a band of light with dust lanes through it
    float along = dot(q, vec2(0.8, 0.6));
    float across = dot(q, vec2(-0.6, 0.8)) + 2.1 + 0.4 * sin(along * 0.5);
    float dust = fbm(q * 0.9 + vec2(0.0, uTime * 0.004));
    float lane = fbm(q * 2.3 + 9.0);
    float band = exp(-across * across * 0.9) * (0.4 + dust);
    band *= 1.0 - 0.65 * smoothstep(0.45, 0.75, lane) * exp(-across * across * 2.6);
    c += band * mix(vec3(0.30, 0.30, 0.66), vec3(0.80, 0.56, 0.62), dust) * 0.6;
    c += vec3(0.14, 0.36, 0.44) * fbm(q * 0.33 + vec2(uTime * 0.012, 4.0)) * 0.2;   // a nebula that breathes
    c += vec3(0.34, 0.16, 0.42) * fbm(q * 0.5 - vec2(uTime * 0.008, 1.0)) * 0.16;
    // stars in three depths: a few bright, very many faint, more of them inside the band
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float sc = 6.0 + fi * 7.0;
      vec2 g = q * sc + fi * 17.3; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float h = hash(id);
      float there = step(0.64 - band * 0.34 - fi * 0.05, h);
      vec2 off = (vec2(hash(id + 3.1), hash(id + 5.7)) - 0.5) * 0.72;
      float d = length(f - off) / sc * 6.0;
      float bright = pow(hash(id + 9.2), 3.0 + fi * 1.5);
      float core = smoothstep(mix(0.03, 0.11, bright), 0.0, d);
      float glow = exp(-d * 30.0) * bright * 0.7;
      float tw = 0.7 + 0.3 * sin(uTime * (1.2 + h * 3.5) + h * 80.0);
      vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.84, 0.66), hash(id + 7.7));
      c += tint * (core * (0.35 + bright * 1.7) + glow) * tw * there;
    }
    // a shooting star: a short bright streak with a fading tail
    vec2 dir = normalize(vec2(-0.99, -0.13));                       // across the sky, barely falling
    vec2 head = uShoot.xy + dir * uShoot.z * uHalf.x * 1.7;
    vec2 pa = p - head; float hh = clamp(dot(pa, -dir) / 1.1, 0.0, 1.0);
    float streak = exp(-length(pa + dir * hh * 1.1) * 70.0) * (1.0 - hh);
    c += vec3(1.0, 0.96, 0.86) * streak * uShoot.w * sin(3.1416 * uShoot.z) * 2.2;
    return c;
  }

  // a radio dish seen from the side: tower, yoke, the bowl tipped up, and its feed held on struts
  vec3 dish(vec3 c, vec2 o, float aa) {
    vec2 up = normalize(vec2(-0.5, 0.87));
    vec2 across = vec2(up.y, -up.x);
    vec2 hub = vec2(0.0, 0.55);
    float tower = sdBox(o - vec2(0.0, 0.1), vec2(0.09 + (0.3 - o.y) * 0.12, 0.42));
    float yoke = sdSeg(o, hub - across * 0.2, hub + across * 0.2) - 0.05;
    c = mix(c, vec3(0.13, 0.15, 0.30), smoothstep(aa, -aa, min(tower, yoke)));
    // the bowl: the part of a big circle below a chord, so it is a shallow dish and not a ball
    vec2 q = vec2(dot(o - hub, across), dot(o - hub, up));
    float bowl = max(length(q - vec2(0.0, 0.62)) - 0.74, q.y - 0.2);
    float face = smoothstep(aa, -aa, bowl);
    vec3 metal = mix(vec3(0.20, 0.24, 0.42), vec3(0.50, 0.58, 0.82), smoothstep(-0.5, 0.5, q.x));
    c = mix(c, metal, face);
    c += vec3(0.7, 0.8, 1.0) * smoothstep(aa * 2.5, 0.0, abs(q.y - 0.2)) * step(abs(q.x), 0.47) * 0.5;   // its lit rim
    // the feed, out in front, on three struts
    vec2 feed = vec2(0.0, 0.62);
    float struts = min(min(sdSeg(q, vec2(-0.44, 0.2), feed), sdSeg(q, vec2(0.44, 0.2), feed)), sdSeg(q, vec2(0.0, 0.0), feed)) - 0.016;
    c = mix(c, vec3(0.42, 0.48, 0.70), smoothstep(aa, -aa, min(struts, length(q - feed) - 0.06)));
    return c;
  }
  // the observatory, set into the middle ridge: a glass dome you could stand in and look up through,
  // its frame of struts catching the sky, a small telescope inside, and two dishes beside it
  vec3 observatory(vec3 c, vec2 p) {
    float s = uObs.y;
    float aa = 1.5 / (s * 120.0);
    vec2 o = (p - vec2(uObs.x, (ridge2(uObs.x) * 2.0 - 1.0) * uHalf.y + s * 0.08)) / s;   // raised a little on its hill
    // the dishes first, a little behind the dome, each standing on the ground where it is
    for (int i = 0; i < 2; i++) {
      float dx = i == 0 ? 1.7 : -1.6;
      float gx = uObs.x + dx * s;
      float k = i == 0 ? 0.95 : 0.7;
      c = dish(c, (p - vec2(gx, (ridge2(gx) * 2.0 - 1.0) * uHalf.y - s * 0.02)) / (s * k), aa / k);
    }
    vec2 dc = vec2(0.0, 0.2);                     // the dome's centre, low, so it sits down in the hill
    float rad = length(o - dc);
    float dome = max(rad - 0.86, dc.y - o.y);
    float inside = smoothstep(aa, -aa, dome);
    // glass: the sky shows through, tinted, brighter towards the rim where glass turns edge-on
    float rim = smoothstep(0.55, 0.86, rad);
    vec3 glass = c * 0.8 + vec3(0.10, 0.15, 0.28) + vec3(0.25, 0.36, 0.6) * rim * 0.6;
    // a warm light low inside, as from a lamp on the floor
    glass += vec3(1.0, 0.66, 0.3) * exp(-length((o - vec2(0.0, 0.3)) * vec2(1.0, 1.7)) * 2.6) * 0.34 * (0.9 + 0.1 * sin(uTime * 1.1));
    // the frame: rings and leaning struts, as a geodesic dome has
    float ang = atan(o.x, o.y - dc.y);
    float struts = min(abs(fract(ang * 2.55 + rad * 1.6) - 0.5), abs(fract(ang * 2.55 - rad * 1.6) - 0.5));
    float rings = abs(fract(rad * 3.5) - 0.5);
    float frame = smoothstep(0.045, 0.0, min(struts, rings * 0.6));
    glass = mix(glass, vec3(0.55, 0.66, 0.9), frame * 0.6);
    c = mix(c, glass, inside);
    c += vec3(0.6, 0.75, 1.0) * smoothstep(aa * 3.0, 0.0, abs(dome)) * 0.35 * step(dc.y, o.y);   // the glass's edge
    // the low wall it stands on, with one lit doorway
    float wall = sdBox(o - vec2(0.0, 0.14), vec2(0.84, 0.06)) - 0.03;
    c = mix(c, vec3(0.20, 0.25, 0.44), smoothstep(aa, -aa, wall) * 0.85);   // a pale stone footing
    float door = sdBox(o - vec2(0.42, 0.11), vec2(0.07, 0.09));
    c = mix(c, vec3(1.0, 0.74, 0.36), smoothstep(aa, -aa, door) * 0.9);
    return c;
  }

  void main() {
    float d = dot(uN, vP) - uS;
    float y = vUv.y;
    vec3 a = dusk(vP, y);
    vec3 b = night(vP, y);
    // the land along the foot of both skies: three ridges, wooded, with mist lying between them
    float r1 = ridge1(vP.x) + pines(vP.x, 11.0, 0.016);
    float r2 = ridge2(vP.x) + pines(vP.x + 3.0, 7.0, 0.03);
    float r3 = ridge3(vP.x) + pines(vP.x + 7.0, 4.2, 0.05) + pines(vP.x + 1.3, 6.4, 0.03);
    float h1 = smoothstep(r1 + 0.003, r1 - 0.003, y);
    float h2 = smoothstep(r2 + 0.003, r2 - 0.003, y);
    float h3 = smoothstep(r3 + 0.003, r3 - 0.003, y);
    float mist1 = exp(-max(r1 - y, 0.0) * 14.0) * h1;
    float mist2 = exp(-max(r2 - y, 0.0) * 12.0) * h2;
    a = mix(a, mix(vec3(0.62, 0.42, 0.50), vec3(0.86, 0.60, 0.56), mist1 * 0.7), h1 * 0.9);
    a = mix(a, mix(vec3(0.44, 0.29, 0.38), vec3(0.70, 0.46, 0.48), mist2 * 0.6), h2);
    a = mix(a, vec3(0.26, 0.17, 0.25), h3);
    b = mix(b, mix(vec3(0.06, 0.08, 0.22), vec3(0.12, 0.17, 0.34), mist1 * 0.7), h1);
    b = observatory(b, vP);
    b = mix(b, mix(vec3(0.035, 0.05, 0.15), vec3(0.08, 0.12, 0.26), mist2 * 0.6), h2);
    b = mix(b, vec3(0.012, 0.018, 0.07), h3);
    vec3 col = mix(a, b, smoothstep(-0.012, 0.012, d));
    col += vec3(1.0, 0.86, 0.62) * exp(-abs(d) * 22.0) * 0.8;     // the seam, and its hot core
    col += vec3(1.0, 0.93, 0.78) * exp(-abs(d) * 170.0) * 0.6;
    // chosen: the sky opens like an iris, with a torn edge, onto whatever is behind the stage
    float r = length(vP - uFocus);
    float edge = uOpen * (length(uHalf) * 2.0 + 1.6) - 0.8;
    float alpha = uOpen <= 0.0 ? 1.0 : smoothstep(edge - 1.6, edge, r);
    // the sky is drawn first and solid, so it writes its own see-through: colour times alpha, then alpha
    float along = dot(vP, vec2(-uN.y, uN.x)) / length(uHalf);
    float seam = step(along, uLine * 2.4 - 1.2) * exp(-abs(d) * 46.0);
    float open = 1.0 - smoothstep(uReveal * 40.0, uReveal * 40.0 + 0.3, abs(d));
    col = mix(vec3(1.0, 0.92, 0.74), col, open);
    alpha *= max(open, seam * (1.0 - open));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* a vector between two stars: a fine line with a faint halo, and a slow light that travels along it */
export const VECTOR_VERT = /* glsl */ `
  attribute float aAlong; attribute float aAcross; attribute float aOrder; attribute float aLen;
  varying float vAlong; varying float vAcross; varying float vOrder; varying float vLen; varying vec2 vWorld;
  void main() {
    vAlong = aAlong; vAcross = aAcross; vOrder = aOrder; vLen = aLen;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
export const VECTOR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS, uSeed; uniform vec2 uN;
  varying float vAlong; varying float vAcross; varying float vOrder; varying float vLen; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;                 // the seam cuts it
    float t = clamp(uDraw * uCount - vOrder, 0.0, 1.0);        // how much of this vector is drawn
    if (vAlong > t) discard;
    float core = exp(-vAcross * vAcross * 70.0);
    float halo = exp(-abs(vAcross) * 4.5);
    float breath = 0.75 + 0.25 * sin(uTime * 0.8 + uSeed * 6.0);                        // it breathes
    float run = 0.5 + 0.5 * sin(vAlong * vLen * 9.0 - uTime * (1.1 + uSurge * 2.5) + vOrder);   // and flows
    float tip = exp(-abs(vAlong - t) * vLen * 22.0) * step(t, 0.999) * core;           // the end, while it is drawn
    float ends = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
    vec3 col = mix(vec3(0.60, 0.76, 1.0), vec3(0.95, 0.95, 1.0), core);
    float a = (core * (0.30 + 0.16 * run) + halo * 0.055) * breath * ends * (1.0 + uSurge * 0.7) + tip * 0.5;
    gl_FragColor = vec4(col, a * uFade);
  }
`;
export const STAR_VERT = /* glsl */ `
  attribute float aMag; attribute float aPhase; attribute float aLit;
  uniform float uPx;
  varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    vPhase = aPhase; vLit = aLit;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
    gl_PointSize = uPx * (0.6 + aMag * 0.4);
  }
`;
export const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS, uJoined; uniform vec2 uN;
  varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float reach = uDraw * uCount - vLit;                       // has the drawing reached this star yet
    float lit = smoothstep(-0.15, 0.25, reach) * uJoined;
    float flare = exp(-abs(reach) * 3.0) * uJoined;            // a small flare as the vector arrives
    float tw = 0.72 + 0.28 * sin(uTime * (1.4 + vPhase * 1.6) + vPhase * 30.0);
    float core = exp(-r * r * 260.0);
    float halo = exp(-r * 12.0) * 0.22;
    // four thin rays that breathe, as a bright star has through a lens
    float rays = exp(-abs(c.x) * 70.0) * exp(-abs(c.y) * 9.0) + exp(-abs(c.y) * 70.0) * exp(-abs(c.x) * 9.0);
    vec3 col = mix(vec3(0.70, 0.84, 1.0), vec3(1.0, 0.97, 0.90), core);
    float a = (core * 1.1 + halo * tw + rays * 0.28 * tw) * (0.5 + 0.5 * lit) * (1.0 + uSurge * 0.6) + flare * (core + halo * 0.8 + rays * 0.4);
    a *= smoothstep(0.5, 0.3, r);                              // nothing reaches the corners of the point's square
    gl_FragColor = vec4(col, a * uFade);
  }
`;

/* The figures a constellation can take, each made only of straight vectors (founder, 2026-11-15). The
   sum sign and the sideways M are close cousins: the M's point is deeper and it has no end strokes. */
