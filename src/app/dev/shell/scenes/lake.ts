// A lake under hills. The far shore is pine wood; the water holds the whole sky and the light's
// glitter; grass sways on the near bank. Birds cross by day; fireflies come out at night.
export const LAKE = `
vec3 scene(vec2 p, float asp, float t){
  const float H = 0.46;
  vec3 col;
  if (p.y >= H) {
    col = skyAt(p, asp, t, H);
    // two ridges of hills, the far one pale with distance
    float r1 = H + 0.10 + 0.13 * fbm(vec2(p.x * 1.1 + 2.0, 0.5));
    col = mix(col, haze(lit(vec3(0.20, 0.30, 0.42), 0.25), 0.34), under(p.y, r1));
    float r2 = H + 0.03 + 0.09 * fbm(vec2(p.x * 2.2 + 9.0, 3.0));
    col = mix(col, haze(lit(vec3(0.12, 0.28, 0.22), 0.30), 0.12), under(p.y, r2));
    // pines along the far shore
    col = mix(col, lit(vec3(0.05, 0.16, 0.12), 0.2), pines(p, H - 0.005, 0.030, 3.0, t));
  } else {
    col = waterAt(p, asp, t, H, pal(vec3(0.01, 0.03, 0.08), vec3(0.20, 0.24, 0.38), vec3(0.06, 0.30, 0.46), vec3(0.16, 0.10, 0.26)));
    // the far shore's wood, dark in the water under it
    col = mix(col, lit(vec3(0.05, 0.14, 0.11), 0.1), 0.55 * smoothstep(H - 0.10, H, p.y + 0.012 * sin(p.x * 60.0 + t)));
  }
  // a little mist where the water meets the land
  col = mix(col, horizonC(), 0.30 * exp(-abs(p.y - H) * 90.0));
  col = mix(col, vec3(0.05, 0.06, 0.10), birds(p, asp, t, 0.80) * 0.85);

  // the near bank, with grass that sways
  float bank = 0.10 + 0.05 * sin(p.x * 1.1 + 0.6) + 0.02 * fbm(vec2(p.x * 3.0, 2.0));
  float sway = sin(t * 1.3 + p.x * 5.0) * 0.004;
  float blades = 0.030 * pow(noise(vec2((p.x + sway) * 85.0, 3.0)), 2.0);
  col = mix(col, lit(vec3(0.07, 0.22, 0.11), 0.25), under(p.y, bank + blades));
  return col + fireflies(p, asp, t, 0.10, 0.30);
}`;
