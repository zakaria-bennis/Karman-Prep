// The photographs the endless world is drawn with (founder, 2026-11-21: "real textures" so it "doesn't
// look plasticky"): real scanned rock, meadow, snow and stony ground (scripts/dev/world-textures.mjs), and
// real firs rendered in Blender from a scanned model (scripts/dev/blender/), all from Poly Haven (CC0).
// engine.ts loads them once the first picture is up. Each land keeps its own colours: a photograph's
// colour is stored as a ratio to its own average, so it adds what the real thing has (grain, stones, moss,
// ledges, boughs) without changing what colour the land is. Until they arrive, every one is a single plain
// pixel and the world is drawn as before.

/** The photographs, in the order their textures are bound (unit 2 onward: each one's colour, then its
 *  tilt). Each has a colour sampler u<Name>C and a tilt sampler u<Name>N below. */
export const WORLD_PHOTOS = ["rock", "grass", "snow", "ground", "tree"] as const;

/** Where they are served from (public/site/world/). */
export const WORLD_PHOTO_DIR = "/site/world/";

/** The samplers, and how to read a photograph. Goes in before ground(). */
export const WORLD_TEX = `
uniform sampler2D uRockC, uRockN, uGrassC, uGrassN, uSnowC, uSnowN, uGroundC, uGroundN;
/* the firs: four trees side by side, each from its tip (top) to the foot of its crown; tilt in red and
   green (across, up), and in blue how much of the tree is there */
uniform sampler2D uTreeC, uTreeN;
uniform float uTex;   /* 0 until the photographs have arrived, then 1 */
vec3 EYE;             /* where the eye is */
/* a photograph's colour, as a ratio to its own average: 1 is the land's own colour */
vec3 ratio(vec3 c) { return exp2((c * 255. - 128.) / 40. * uTex); }
/* each photograph is laid twice, the second copy four times larger and turned (M2) against the first,
   so neither shows a repeat */
/* after reading a photograph: TN is how its surface tilts there (to add to the ground's own slope), TH how
   high it stands (0 to 1) */
vec3 TN;
float TH;
/* a photograph laid flat on the ground: meadow, snow, stony earth */
vec3 flat2(sampler2D c, sampler2D m, vec2 x, float s) {
  vec2 a = x * s, b = M2 * x * (s * .23) + .31;
  vec3 ma = texture2D(m, a).rgb - .5, mb = texture2D(m, b).rgb - .5;
  /* the photographs' tilts point up the picture, which on the ground is toward -z; the larger copy's
     are turned back */
  vec2 tb = vec2(mb.x, -mb.y) * M2;
  TN = vec3(ma.x + .6 * tb.x, 0., -ma.y + .6 * tb.y) * uTex;
  TH = .5 + .6 * (ma.z + .6 * mb.z) * uTex;
  return ratio(texture2D(c, a).rgb) * mix(vec3(1.), ratio(texture2D(c, b).rgb), .6);
}
/* rock stands on every slope, so its photograph is laid from three sides (on a cliff it hangs the right
   way up) and the three are blended by which way the slope faces */
vec3 rock3(vec3 p, vec3 n, float s) {
  vec3 w = n * n;
  w *= w;
  w /= w.x + w.y + w.z;
  vec2 ux = vec2(p.z, -p.y) * s, uy = p.xz * s, uz = vec2(p.x, -p.y) * s;
  vec2 vx = ux * .23 + .31, vy = M2 * uy * .23 + .31, vz = uz * .23 + .31;
  vec3 mx = texture2D(uRockN, ux).rgb + .6 * texture2D(uRockN, vx).rgb - .8;
  vec3 mz = texture2D(uRockN, uz).rgb + .6 * texture2D(uRockN, vz).rgb - .8;
  vec3 ma = texture2D(uRockN, uy).rgb - .5, mb = texture2D(uRockN, vy).rgb - .5;
  vec2 ty = vec2(ma.x, -ma.y) + .6 * vec2(mb.x, -mb.y) * M2;
  TN = (vec3(0., mx.y, mx.x) * w.x + vec3(ty.x, 0., ty.y) * w.y + vec3(mz.x, mz.y, 0.) * w.z) * uTex;
  TH = .5 + .6 * (mx.z * w.x + (ma.z + .6 * mb.z) * w.y + mz.z * w.z) * uTex;
  vec3 cx = ratio(texture2D(uRockC, ux).rgb) * mix(vec3(1.), ratio(texture2D(uRockC, vx).rgb), .6);
  vec3 cy = ratio(texture2D(uRockC, uy).rgb) * mix(vec3(1.), ratio(texture2D(uRockC, vy).rgb), .6);
  vec3 cz = ratio(texture2D(uRockC, uz).rgb) * mix(vec3(1.), ratio(texture2D(uRockC, vz).rgb), .6);
  return cx * w.x + cy * w.y + cz * w.z;
}
`;
