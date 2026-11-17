// A cottage in the woods. Pine wood climbs the hills behind; in a clearing stands a small house
// with a shingled roof, smoke drifting from its chimney and a path to its door. At dusk and at
// night its windows are lit and their light lies on the grass; fireflies wander the clearing.
export const COTTAGE = `
// warm lamplight: a window pane, with its glow
vec3 window(vec3 col, vec2 p, vec2 c, vec2 hs){
  vec2 q = p - c;
  float pane = fill(sdBox(q, hs));
  float bars = max(step(abs(q.x), hs.x * 0.09), step(abs(q.y), hs.y * 0.09));
  vec3 glass = mix(lit(vec3(0.34, 0.42, 0.50), 0.6), vec3(1.0, 0.80, 0.42) * 1.25, lamp());
  col = mix(col, mix(glass, lit(vec3(0.22, 0.14, 0.09), 0.5), bars), pane);
  // the glow spills out round the window
  return col + vec3(1.0, 0.72, 0.36) * lamp() * 0.42 * exp(-dot(q, q) / (hs.x * hs.x * 9.0)) * (1.0 - pane);
}

vec3 scene(vec2 p, float asp, float t){
  const float H = 0.52;
  vec3 col = skyAt(p, asp, t, H);
  // wooded hills, one behind another
  float r1 = H + 0.16 + 0.14 * fbm(vec2(p.x * 1.0 + 3.0, 0.5));
  col = mix(col, haze(lit(vec3(0.12, 0.24, 0.26), 0.25), 0.50), under(p.y, r1 + 0.02 * pines(p * vec2(1.0, 1.0), r1 - 0.02, 0.014, 9.0, t)));
  float r2 = H + 0.06 + 0.09 * fbm(vec2(p.x * 1.8 + 8.0, 2.0));
  col = mix(col, haze(lit(vec3(0.08, 0.22, 0.16), 0.3), 0.26), max(under(p.y, r2), pines(p, r2 - 0.01, 0.022, 4.0, t)));
  // the nearer wood: taller pines standing behind the clearing
  col = mix(col, haze(lit(vec3(0.05, 0.17, 0.11), 0.25), 0.10), pines(p, H - 0.03, 0.050, 2.0, t));

  // the clearing
  float ground = H - 0.02 + 0.015 * sin(p.x * 2.4);
  vec3 grass = mix(vec3(0.20, 0.40, 0.14), vec3(0.10, 0.28, 0.09), clamp((ground - p.y) / ground, 0.0, 1.0));
  grass *= 0.86 + 0.30 * fbm3(vec2(p.x * 6.0, p.y * 18.0));
  // a path of worn earth winding down from the door
  float d = clamp((ground - p.y) / ground, 0.0, 1.0);
  float pathX = asp * (0.555 + 0.10 * sin(d * 4.2) * d - 0.06 * d);
  float path = smoothstep(0.016 + 0.11 * d, 0.006 + 0.08 * d, abs(p.x - pathX));
  vec3 earth = vec3(0.50, 0.40, 0.28) * (0.88 + 0.22 * fbm3(p * 30.0));
  vec3 land = lit(mix(grass, earth, path * 0.85), 0.55);
  col = mix(col, land, under(p.y, ground));

  // the cottage
  float k = 0.115;
  vec2 c = vec2(asp * 0.555, ground + 0.005);
  vec2 q = (p - c) / k;
  float wall = fill(sdBox(q - vec2(0.0, 0.42), vec2(0.78, 0.42)) * k);
  // timber walls: boards, lighter on the side the light comes from
  vec3 boards = vec3(0.52, 0.38, 0.26) * (0.86 + 0.14 * sin(q.y * 42.0)) * (0.9 + 0.2 * noise(q * vec2(3.0, 40.0)));
  col = mix(col, lit(boards, 0.35 + 0.4 * smoothstep(-0.8, 0.8, q.x)), wall);
  // the roof: shingles in rows, with eaves that overhang
  float roof = step(0.80, q.y) * under(q.y, 1.62 - 0.80 * abs(q.x)) * step(abs(q.x), 1.02);
  vec3 shingle = vec3(0.34, 0.16, 0.12) * (0.78 + 0.22 * step(0.5, fract(q.y * 9.0)) ) * (0.88 + 0.24 * hash(floor(vec2(q.x * 9.0 + floor(q.y * 9.0) * 0.5, q.y * 9.0))));
  col = mix(col, lit(shingle, 0.30 + 0.5 * smoothstep(-0.2, 0.6, q.x)), roof);
  // the chimney, of stone
  float chim = fill(sdBox(q - vec2(0.42, 1.36), vec2(0.10, 0.26)) * k) * (1.0 - roof * step(q.y, 1.20));
  col = mix(col, lit(vec3(0.44, 0.40, 0.38) * (0.85 + 0.3 * noise(q * 30.0)), 0.55), chim);
  // the door, and a window either side
  float door = fill(sdBox(q - vec2(0.0, 0.30), vec2(0.15, 0.30)) * k);
  col = mix(col, lit(vec3(0.24, 0.13, 0.08), 0.4), door);
  col = window(col, q, vec2(-0.46, 0.46), vec2(0.15, 0.16));
  col = window(col, q, vec2(0.46, 0.46), vec2(0.15, 0.16));
  col = window(col, q, vec2(0.0, 1.10), vec2(0.10, 0.10));
  // lamplight lying on the grass before the house
  float spill = exp(-pow((p.x - c.x) / (k * 1.3), 2.0)) * smoothstep(c.y - 0.20, c.y, p.y) * under(p.y, c.y);
  col += vec3(1.0, 0.70, 0.34) * lamp() * 0.30 * spill;

  // smoke from the chimney: puffs that rise, widen, lean on the wind and thin away
  vec2 mouth = c + vec2(0.42, 1.64) * k;
  for (int i = 0; i < 6; i++) {
    float age = fract(t * 0.045 + float(i) / 6.0);
    vec2 sc = mouth + vec2(0.03 * sin(age * 5.0 + float(i)) + 0.10 * age * age, 0.22 * age);
    float r = 0.012 + 0.05 * age;
    float puff = smoothstep(r, r * 0.3, length(p - sc) + 0.02 * (fbm3(p * 22.0 + float(i) * 7.0 - t * 0.2) - 0.5));
    col = mix(col, lit(vec3(0.86, 0.86, 0.90), 0.6), puff * 0.55 * (1.0 - age) * smoothstep(0.0, 0.08, age));
  }

  // tall pines close to us, framing the clearing at either side
  float frame = max(pines(p + vec2(0.0, 0.0), -0.06, 0.13, 7.0, t) * step(p.x, asp * 0.26),
                    pines(p + vec2(0.31, 0.0), -0.10, 0.15, 6.0, t) * step(asp * 0.80, p.x));
  col = mix(col, lit(vec3(0.03, 0.10, 0.07), 0.2), frame);
  col = mix(col, vec3(0.05, 0.06, 0.10), birds(p, asp, t, 0.86) * 0.85);
  return col + fireflies(p, asp, t, 0.08, 0.44);
}`;
