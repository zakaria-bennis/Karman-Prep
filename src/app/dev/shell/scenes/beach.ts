// A beach with palms. The sea runs to a clear horizon where a small boat drifts; waves roll in,
// break into foam and slide up the sand; two palms lean over the beach, their fronds moving in
// the wind. Gulls by day; the moon's road on the water at night.
export const BEACH = `
// one palm frond: a rib that leaves the crown at an angle and droops under its own weight, with
// leaflets along it. Returns how much of it is here.
float frond(vec2 p, vec2 c, float ang, float len){
  vec2 dir = vec2(cos(ang), sin(ang));
  float best = 1.0, at = 0.0;
  vec2 a = c;
  for (int i = 1; i <= 6; i++) {
    float s = float(i) / 6.0;
    vec2 b = c + dir * len * s + vec2(0.0, -1.0) * len * 0.62 * s * s;
    float d = sdSeg(p, a, b);
    if (d < best) { best = d; at = s; }
    a = b;
  }
  // the rib, and fine leaflets either side of it: longest in the middle, none at the tip
  float w = len * 0.085 * pow(sin(3.1416 * clamp(at, 0.03, 0.98)), 0.55);
  float comb = smoothstep(0.15, 0.55, abs(sin(at * 85.0 + best * 60.0)));
  float rib = fill(best - 0.0035 * (1.0 - at));
  return max(rib, smoothstep(w, w * 0.72, best) * comb * step(at, 0.985));
}
// a palm: a trunk that curves up from foot to crown, ringed, and its fronds swaying
vec4 palm(vec2 p, vec2 foot, vec2 crown, float len, float t, float seed){
  float trunk = 1.0;
  vec2 a = foot;
  for (int i = 1; i <= 7; i++) {
    float s = float(i) / 7.0;
    // it leans out and then stands up toward the top
    vec2 b = mix(foot, crown, s) + vec2((crown.x - foot.x) * 0.35 * sin(3.1416 * s), 0.0);
    trunk = min(trunk, sdSeg(p, a, b) - mix(0.016, 0.009, s) * (len / 0.2));
    a = b;
  }
  float tm = fill(trunk);
  float rings = 0.82 + 0.18 * sin((p.y - foot.y) * 260.0);
  vec3 col = lit(vec3(0.30, 0.22, 0.14) * rings, 0.35 + 0.5 * smoothstep(-0.01, 0.01, p.x - mix(foot.x, crown.x, clamp((p.y - foot.y) / (crown.y - foot.y), 0.0, 1.0))));
  float leaves = 0.0;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float ang = -0.55 + fi * 0.43 + 0.07 * sin(t * 1.1 + fi * 1.3 + seed) + 0.03 * sin(t * 2.3 + fi);
    leaves = max(leaves, frond(p, crown, ang, len * (0.85 + 0.3 * hash(vec2(fi, seed)))));
  }
  // coconuts under the crown
  float nuts = fill(length(p - crown - vec2(0.012, -0.018) * (len / 0.2)) - 0.012 * (len / 0.2));
  vec3 leaf = lit(vec3(0.10, 0.34, 0.12), 0.35 + 0.5 * smoothstep(-0.05, 0.10, p.y - crown.y));
  col = mix(col, lit(vec3(0.20, 0.13, 0.07), 0.4), nuts);
  col = mix(col, leaf, leaves);
  return vec4(col, max(max(tm, nuts), leaves));
}

vec3 scene(vec2 p, float asp, float t){
  const float H = 0.50;
  // where the sea meets the sand: a soft curve, breathing with the swash
  float shore = 0.24 + 0.05 * sin(p.x * 1.7 + 0.4) + 0.02 * p.x / asp;
  float swash = 0.014 * sin(t * 0.6 + p.x * 2.0) + 0.006 * sin(t * 1.3 + p.x * 7.0);
  vec3 col;
  if (p.y >= H) {
    col = skyAt(p, asp, t, H);
    // a far headland at the left, pale with distance
    float head = H + 0.07 * smoothstep(0.42 * asp, 0.0, p.x) * (0.6 + 0.6 * fbm3(vec2(p.x * 6.0, 1.0)));
    col = mix(col, haze(lit(vec3(0.16, 0.30, 0.26), 0.3), 0.42), under(p.y, head) * step(H, p.y));
    // a boat with one sail, drifting along the horizon
    vec2 boat = vec2(asp * (0.18 + 0.5 * fract(t * 0.004 + 0.3)), H + 0.004);
    vec2 l = (p - boat) / 0.03;
    float sail = step(0.0, l.x) * step(l.x, 0.55) * step(0.15, l.y) * step(l.y, 1.5 - l.x * 2.4);
    float hull = fill(sdBox(l - vec2(0.1, 0.05), vec2(0.55, 0.07)));
    col = mix(col, lit(vec3(0.95, 0.94, 0.90), 0.7), sail);
    col = mix(col, lit(vec3(0.16, 0.12, 0.10), 0.3), hull);
  } else {
    float edge = shore + swash;
    // the sea: deep at the horizon, clear and green-blue in the shallows
    vec3 deep = pal(vec3(0.01, 0.03, 0.09), vec3(0.16, 0.26, 0.42), vec3(0.03, 0.26, 0.50), vec3(0.14, 0.10, 0.28));
    vec3 sea = waterAt(p, asp, t, H, deep);
    float shallow = smoothstep(0.16, 0.0, p.y - edge);
    sea = mix(sea, lit(vec3(0.22, 0.62, 0.60), 0.7), shallow * 0.55);
    // waves: lines of swell that steepen toward the beach and break into foam
    float toward = clamp((p.y - edge) / (H - edge), 0.0, 1.0);
    float phase = (p.y - edge) * mix(120.0, 46.0, pow(toward, 0.5)) + t * 1.1 + 3.0 * fbm3(vec2(p.x * 3.0, 2.0));
    float crest = pow(0.5 + 0.5 * sin(phase), 6.0);
    sea += keyC() * 0.10 * crest * (1.0 - toward);
    float foam = smoothstep(0.55, 0.95, crest) * smoothstep(0.20, 0.02, p.y - edge)
      * smoothstep(0.35, 0.75, fbm3(vec2(p.x * 22.0, p.y * 60.0 - t * 0.5)));
    // the sheet of water sliding up the sand, edged with foam
    float lace = smoothstep(0.014, 0.0, abs(p.y - edge - 0.004)) * (0.6 + 0.4 * noise(vec2(p.x * 70.0, t * 0.8)));
    sea = mix(sea, lit(vec3(1.0), 0.9), clamp(foam + lace, 0.0, 1.0) * 0.9);

    // the sand: warm and rippled, dark and shining where the water has just been
    vec3 sand = vec3(0.86, 0.74, 0.54) * (0.90 + 0.16 * fbm3(vec2(p.x * 9.0, p.y * 40.0)));
    sand *= 0.94 + 0.06 * sin(p.y * 240.0 + 6.0 * fbm3(p * 5.0));
    float wet = smoothstep(0.07, 0.0, edge - p.y);
    vec3 beach = lit(mix(sand, sand * 0.55, wet), 0.70);
    beach = mix(beach, skyAt(vec2(p.x, 2.0 * H - p.y), asp, t, H), wet * 0.22);
    col = mix(beach, sea, smoothstep(edge - AA(), edge + AA(), p.y));
  }
  col = mix(col, horizonC(), 0.25 * exp(-abs(p.y - H) * 110.0));
  col = mix(col, vec3(0.05, 0.06, 0.10), birds(p, asp, t, 0.78) * 0.85);

  // the palms: a tall one leaning in from the right, a smaller one behind it
  vec4 pm = palm(p, vec2(asp * 0.72, -0.03), vec2(asp * 0.60, 0.70), 0.17, t, 4.0);
  col = mix(col, haze(pm.rgb, 0.06), pm.a);
  pm = palm(p, vec2(asp * 0.95, -0.03), vec2(asp * 0.80, 0.86), 0.24, t, 1.0);
  col = mix(col, pm.rgb, pm.a);
  // a frond or two reaching in at the top left, close to us
  float near = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    near = max(near, frond(p, vec2(-0.03, 1.04 - fi * 0.05), -0.20 - fi * 0.30 + 0.05 * sin(t * 1.0 + fi), 0.46));
  }
  col = mix(col, lit(vec3(0.07, 0.24, 0.10), 0.3), near);
  return col;
}`;
