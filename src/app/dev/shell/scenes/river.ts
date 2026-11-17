// A river through a meadow. It comes down from far hills, winding and widening toward us, with
// the sky in it and its flow running our way. Round trees stand on the banks, flowers dot the
// grass, reeds sway at the water's edge. Birds by day; fireflies over the grass at night.
export const RIVER = `
// the river's middle and half-width at a height: it winds, and widens as it nears
vec2 course(float y, float asp, float H){
  float d = clamp((H - y) / H, 0.0, 1.0);
  float c = asp * (0.52 + 0.20 * sin(d * 5.2 + 0.4) * (0.25 + 0.75 * d) - 0.10 * d);
  return vec2(c, 0.006 + 0.26 * pow(d, 1.55));
}
// a round tree: a trunk and a leafy crown, lit from the sun's side
vec4 tree(vec2 p, vec2 foot, float h, float seed){
  float trunk = fill(sdBox(p - foot - vec2(0.0, h * 0.25), vec2(h * 0.035, h * 0.25)));
  vec2 c = foot + vec2(0.0, h * 0.66);
  float crown = clump(p, c, h * 0.40, seed);
  float facing = 0.35 + 0.65 * smoothstep(-0.35, 0.45, ((p.x - c.x) + (p.y - c.y)) / h);
  vec3 leaf = mix(vec3(0.10, 0.30, 0.12), vec3(0.22, 0.46, 0.14), fbm3(p * 30.0 + seed));
  vec3 col = mix(lit(vec3(0.16, 0.10, 0.07), 0.3), lit(leaf, facing), crown);
  return vec4(col, max(trunk, crown));
}

vec3 scene(vec2 p, float asp, float t){
  const float H = 0.56;
  vec3 col;
  if (p.y >= H) {
    col = skyAt(p, asp, t, H);
    float r1 = H + 0.10 + 0.12 * fbm(vec2(p.x * 1.2 + 4.0, 0.5));
    col = mix(col, haze(lit(vec3(0.22, 0.30, 0.44), 0.25), 0.36), under(p.y, r1));
    float r2 = H + 0.025 + 0.07 * fbm(vec2(p.x * 2.4 + 12.0, 3.0));
    col = mix(col, haze(lit(vec3(0.14, 0.32, 0.20), 0.35), 0.14), under(p.y, r2));
    col = mix(col, lit(vec3(0.06, 0.18, 0.12), 0.2), pines(p, H - 0.004, 0.024, 5.0, t));
  } else {
    // the meadow: paler far away, with soft rolls and mown-looking streaks of light
    float d = (H - p.y) / H;
    vec3 grass = mix(vec3(0.34, 0.50, 0.20), vec3(0.16, 0.40, 0.12), d);
    grass *= 0.86 + 0.28 * fbm3(vec2(p.x * 5.0, p.y * 14.0));
    col = haze(lit(grass, 0.55 + 0.25 * fbm3(p * 3.0 + 7.0)), 0.30 * (1.0 - d));
    // flowers in the grass: white and yellow points, thicker near us
    vec2 g = vec2(p.x, p.y * 2.2) * (26.0 + 30.0 * (1.0 - d));
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + 3.0);
    float bloom = smoothstep(0.16, 0.06, length(f - (vec2(hash(id + 5.0), hash(id + 8.0)) - 0.5) * 0.6)) * step(0.78, h);
    col = mix(col, lit(h > 0.9 ? vec3(1.0, 0.86, 0.30) : vec3(0.98, 0.96, 0.92), 0.8), bloom * 0.85);

    // the river
    vec2 rc = course(p.y, asp, H);
    float off = (p.x - rc.x) / rc.y;
    float inRiver = smoothstep(1.0, 0.94, abs(off));
    vec3 deep = pal(vec3(0.01, 0.03, 0.08), vec3(0.20, 0.26, 0.40), vec3(0.05, 0.28, 0.46), vec3(0.16, 0.10, 0.26));
    vec3 water = waterAt(vec2(p.x, p.y * (H / 0.56)), asp, t, H, deep);
    // the flow: long streaks sliding toward us, quicker in the middle
    float flow = noise(vec2(off * 3.0, p.y * 60.0 + t * (1.4 - 0.6 * abs(off))));
    water += keyC() * 0.10 * smoothstep(0.62, 0.9, flow);
    // the banks: a dark wet edge on each side
    water = mix(water, lit(vec3(0.07, 0.10, 0.06), 0.2), smoothstep(0.80, 1.0, abs(off)) * 0.7);
    col = mix(col, water, inRiver);
    // reeds at the near water's edge, swaying
    float reedX = (abs(off) - 1.0) * rc.y;
    float sway = sin(t * 1.4 + p.x * 9.0) * 0.006 * d;
    float reeds = step(0.0, reedX) * step(reedX, 0.05 * d) * d
      * smoothstep(0.55, 0.9, noise(vec2((p.x + sway) * 150.0, floor(p.y * 9.0))));
    col = mix(col, lit(vec3(0.08, 0.24, 0.08), 0.35), reeds * smoothstep(0.25, 0.7, d));
  }
  col = mix(col, horizonC(), 0.22 * exp(-abs(p.y - H) * 70.0));

  // trees on the banks, farther ones smaller
  vec4 tr = tree(p, vec2(asp * 0.16, 0.50), 0.20, 1.0); col = mix(col, tr.rgb, tr.a);
  tr = tree(p, vec2(asp * 0.34, 0.535), 0.11, 2.0); col = mix(col, haze(tr.rgb, 0.12), tr.a);
  tr = tree(p, vec2(asp * 0.90, 0.47), 0.30, 3.0); col = mix(col, tr.rgb, tr.a);
  tr = tree(p, vec2(asp * 0.72, 0.53), 0.13, 4.0); col = mix(col, haze(tr.rgb, 0.10), tr.a);

  col = mix(col, vec3(0.05, 0.06, 0.10), birds(p, asp, t, 0.84) * 0.85);
  return col + fireflies(p, asp, t, 0.10, 0.46);
}`;
