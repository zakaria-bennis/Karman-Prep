// Mountains over a still lake. Snow lies on the high peaks, bright on the side the light comes
// from and blue in shadow; mist drifts across the valley below them; the lake holds the whole
// range upside down. Pines stand on the near shore. An eagle crosses by day.
export const MOUNTAINS = `
// sharp, ridged heights along x
float crag(float x, float seed){
  float a = 0.5, s = 0.0, f = 1.0;
  for (int i = 0; i < 5; i++) { s += a * (1.0 - abs(2.0 * noise(vec2(x * f + seed, seed)) - 1.0)); f *= 2.1; a *= 0.5; }
  return s;
}
// the sky and the range, as seen above the water (also used for their picture in the lake)
vec3 range(vec2 p, float asp, float t, float H){
  vec3 col = skyAt(p, asp, t, H);
  // the high peaks
  float x = p.x / asp;
  float h1 = H + 0.14 + 0.40 * crag(x * 1.5 + 0.3, 2.0) * (0.55 + 0.45 * sin(x * 3.1 + 0.6));
  float e = 0.004;
  float slope = (H + 0.14 + 0.40 * crag((x + e) * 1.5 + 0.3, 2.0) * (0.55 + 0.45 * sin((x + e) * 3.1 + 0.6)) - h1) / e;
  // a face that falls toward the light is lit; one that rises toward it is in shadow
  float facing = clamp(0.5 - slope * 0.35 + 0.35 * (fbm3(vec2(p.x * 9.0 - p.y * 6.0, p.y * 14.0)) - 0.5), 0.0, 1.0);
  vec3 rock = vec3(0.36, 0.36, 0.42) * (0.8 + 0.4 * fbm3(p * vec2(18.0, 40.0)));
  float snowLine = H + 0.30 + 0.05 * (fbm3(vec2(p.x * 14.0, p.y * 30.0)) - 0.5) - 0.10 * (h1 - p.y);
  vec3 peak = mix(rock, vec3(0.96, 0.97, 1.0), smoothstep(snowLine - 0.02, snowLine + 0.02, p.y));
  col = mix(col, haze(lit(peak, facing), 0.30), under(p.y, h1));
  // mist lying in the valley, drifting
  float mist = smoothstep(0.42, 0.75, fbm(vec2(p.x * 1.6 - t * 0.02, p.y * 7.0 + 3.0))) * smoothstep(H + 0.30, H + 0.10, p.y);
  col = mix(col, mix(hazeC(), vec3(1.0), 0.35), mist * 0.55);
  // a nearer, lower range, wooded and dark
  float h2 = H + 0.03 + 0.15 * crag(x * 2.6 + 4.0, 7.0);
  col = mix(col, haze(lit(vec3(0.10, 0.22, 0.20) * (0.8 + 0.4 * fbm3(p * 20.0)), 0.3), 0.20), under(p.y, h2));
  return mix(col, lit(vec3(0.05, 0.15, 0.11), 0.2), pines(p, H - 0.004, 0.022, 3.0, t));
}

vec3 scene(vec2 p, float asp, float t){
  const float H = 0.40;
  vec3 col;
  if (p.y >= H) {
    col = range(p, asp, t, H);
  } else {
    // the lake: the range upside down, barely moving
    float depth = (H - p.y) / H;
    float rip = noise(vec2(p.x * 18.0 + t * 0.2, p.y * 130.0 - t * 0.7)) - 0.5;
    vec2 q = vec2(p.x + rip * 0.02 * depth, 2.0 * H - p.y + rip * 0.03 * depth);
    vec3 deep = pal(vec3(0.01, 0.03, 0.08), vec3(0.18, 0.24, 0.38), vec3(0.05, 0.22, 0.40), vec3(0.14, 0.10, 0.26));
    col = mix(range(q, asp, t, H), deep, 0.22 + 0.40 * depth);
    float path = exp(-pow((p.x - orbAt(asp, H).x) / (0.035 + depth * 0.22), 2.0));
    col += orbC() * path * smoothstep(0.62, 0.95, noise(vec2(p.x * 70.0, p.y * 260.0 - t * 1.6))) * palf(0.5, 0.8, 0.4, 0.9) * (0.3 + 0.7 * depth);
    // slow rings where a fish has risen
    vec2 ring = vec2(asp * 0.30, 0.20);
    float age = fract(t * 0.07);
    float rd = length((p - ring) * vec2(1.0, 3.2));
    col += keyC() * 0.12 * smoothstep(0.012, 0.0, abs(rd - age * 0.22)) * (1.0 - age);
  }
  col = mix(col, hazeC(), 0.30 * exp(-abs(p.y - H) * 90.0));
  col = mix(col, vec3(0.05, 0.06, 0.10), birds(p, asp, t, 0.86) * 0.85);

  // the near shore: stones and grass, and two stands of pine
  float bank = 0.09 + 0.04 * sin(p.x * 1.4 + 1.0) + 0.02 * fbm3(vec2(p.x * 4.0, 1.0));
  float blades = 0.026 * pow(noise(vec2((p.x + sin(t * 1.3 + p.x * 5.0) * 0.004) * 90.0, 3.0)), 2.0);
  col = mix(col, lit(vec3(0.08, 0.22, 0.11), 0.3), under(p.y, bank + blades));
  float stand = max(pines(p, bank - 0.03, 0.085, 5.0, t) * step(p.x, asp * 0.20),
                    pines(p + vec2(0.4, 0.0), bank - 0.04, 0.10, 8.0, t) * step(asp * 0.84, p.x));
  col = mix(col, lit(vec3(0.03, 0.10, 0.07), 0.2), stand);
  return col + fireflies(p, asp, t, 0.08, 0.26);
}`;
