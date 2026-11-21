// The parts of the landscape's shader that only the portals' endless world uses (founder, 2026-11-14).
// The land ahead is not written here: it arrives as a small table (world.ts), one column for each short
// stretch of the route and one row for each property of the land there: how tall, how wide the valley,
// how wet, which trees, which colours. So a new kind of land is a new row of numbers in world.ts, and two
// lands blend into each other because their numbers do. shader.ts puts these parts in where WORLD is set.

/** The table, the sun, and the shape of the ground. */
export const WORLD_TERRAIN = `
uniform sampler2D uLand;
uniform vec3 uStrip;   /* where the table starts along the route, its columns per unit, and 1 / its columns */
uniform vec2 uSun;     /* the sun: how high (degrees) and which way */
vec4 land(float z, float row) {
  float u = (z - uStrip.x) * uStrip.y - .5, i = floor(u), f = u - i;
  f = f * f * (3. - 2. * f);
  float v = (row + .5) / 16.;
  return mix(texture2D(uLand, vec2((i + .5) * uStrip.z, v)), texture2D(uLand, vec2((i + 1.5) * uStrip.z, v)), f);
}
/* this picture point's land, read once: trees, grass, forest (two colours), rock, sand, water, petals */
vec4 G2, G3, G4, G5, G6, G7, G8, G9, G10;
void landHere(float z) {
  G2 = land(z, 2.); G3 = land(z, 3.); G4 = land(z, 4.); G5 = land(z, 5.); G6 = land(z, 6.);
  G7 = land(z, 7.); G8 = land(z, 8.); G9 = land(z, 9.); G10 = land(z, 10.);
}
float shape(vec2 x, float a) {
  float z = x.y;
  vec4 l0 = land(z, 0.), l1 = land(z, 1.);
  float m = n2(x * 1.9 + 31.);
  /* rolling country: soft swells instead of worn rock */
  a = mix(a, .16 + .52 * m + .12 * n2(x * 5.3 + 3.), l1.z);
  float v = smoothstep(.04, l0.y * 2., abs(x.x - pathX(z)));
  float h = a * l0.x * 1.5 * mix(l0.w * .5, 1., v);
  /* dunes: long crests of sand that lean with the wind */
  if (l1.y > .01) { float c = 1. - abs(sin(x.x * 24. + x.y * 9. + 5. * m)); h += l1.y * .04 * c * c * (.35 + .65 * n2(x * 2.7 + 9.)); }
  /* towers of rock, and islands where they stand in water */
  if (l1.w > .01) h += l1.w * .34 * smoothstep(.55, .66, n2(x * 4.3 + 11.)) * (.45 + .55 * n2(x * 9. + 3.));
  h += l0.z * .5 - .25;
  /* steps: mesas, canyon walls, sheer cliffs, terraced fields */
  if (l1.x > .01) { float s = h * 6. + .3 * m, fl = floor(s); h = mix(h, (fl + smoothstep(.7, .96, s - fl) - .3 * m) / 6., l1.x); }
  return h;
}
`;

/** Villages, and the finest ground with its trees. Needs the terrain, the trees and the houses. */
export const WORLD_BUILT = `
float townAt(vec2 x, float h) {
  float d = land(x.y, 5.).a;
  float level = smoothstep(.004, .012, h) * smoothstep(.2, .15, h) * smoothstep(.5, .3, abs(x.x - pathX(x.y)));
  return level * smoothstep(.8 - .2 * d, .84 - .2 * d, n2(x * 10. + 7.3)) * step(.02, d);
}
float built(vec2 x, float h) { return townAt(x, h) < .5 ? 0. : house(x).x; }
/* one tree in its cell: x = how far up its crown this point is (0 at its edge, 1 at its top), y = which tree.
   The wind leans each crown downwind, more in a gust, and each tree sways to its own beat. A pine's
   branches hang in tiers, each tier's skirt standing out over the one below. */
float TIER;   /* 1 while shading: the tiers are drawn in the light, the ray finds the plain crown */
vec2 treeW(vec2 g, float on, float round) {
  vec2 id = floor(g);
  float size = .42 + .58 * tx(id + 13.);
  float which = tx(id + 77.);
  vec2 f = fract(g) - .5 - (vec2(tx(id), tx(id + 41.)) - .5) * .7;
  f -= WD * size * (.12 * GUST + .05 * sin(uTime * (1.5 + which) + which * 40.) * (.4 + GUST));
  float d = length(f) / (.5 * size);
  float pine = max(0., 1. - d);
  pine = max(0., pine - .2 * TIER * fract(pine * 3.6 + which * 7.) * step(.05, pine) * (1. - .5 * pine));
  return vec2(mix(pine, sqrt(max(0., 1. - d * d)), round) * size * step(1. - on, tx(id + 59.)), which);
}
/* the woods (founder, 2026-11-14: the trees looked like plastic beads): real trees of two sizes, standing in
   groves with clearings between: pines are tall points, broadleaf crowns are round and knobbly with leaf,
   bamboo is tall cane. x = the tree's height here, y = how far up its crown (0 to 1), z = which tree */
float TF;   /* how much of a tree's shape is drawn at this distance: all of it near, none far off */
vec3 woods(vec2 x, vec4 g2) {
  if (g2.z < .02) return vec3(0.);
  GUST = gustAt(x);
  float round = smoothstep(.15, .5, g2.w), cane = smoothstep(.7, 1., g2.w);
  float open = smoothstep(.3, .55, .55 * n2(x * 13.) + .45 * n2(x * 41. + 5.) + .7 * (g2.z - .55));
  float on = .35 + .65 * g2.z;
  vec2 a = treeW(x * 74., on, round), b = treeW(M2 * x * 131. + 17., on, round);
  b.x *= .62;
  vec2 t = a.x > b.x ? a : b;
  t.x *= open;
  float leaf = round * (n2(x * 470.) - .5) * .34 * step(.001, t.x);
  return vec3(mix(.028, .0125, round) * mix(1., 2.2, cane) * t.x * (1. + leaf), t.x, t.y);
}
float treeBand(float h, float tl) { return smoothstep(tl, tl - .14, h) * smoothstep(.004, .03, h); }
/* herds (founder, 2026-11-14: "animals going across the landscape"): sheep, deer or dark horses grazing in
   the open grass, each herd drifting its own slow way and each animal wandering within it.
   x = how far up its back this point is (0 to 1), y = which herd */
vec2 beast(vec2 x) {
  vec2 hid = floor(x * 7.);
  float kind = tx(hid + 5.);
  if (tx(hid + 71.) < .62) return vec2(0., kind);
  float gathered = smoothstep(.5, .2, length(fract(x * 7.) - .5));
  vec2 g = x * 150. + vec2(uTime * .022 * (kind - .5), uTime * .01);
  vec2 id = floor(g), f = fract(g) - .5 - (vec2(tx(id + 3.), tx(id + 19.)) - .5) * .5;
  f -= .1 * vec2(sin(uTime * .3 + tx(id) * 6.3), cos(uTime * .23 + tx(id + 7.) * 6.3));
  float d = length(f * vec2(1.5, 3.2));
  return vec2(sqrt(max(0., 1. - d * d * 6.)) * step(.6, tx(id + 47.)) * gathered, kind);
}
/* where animals may stand: low open ground in a land that has meadows (m: how much) */
float pasture(float h, float m) { return step(.3, m) * smoothstep(.006, .014, h) * smoothstep(.3, .22, h); }
/* what stands on the ground at x, for the ray: a house, a tree or an animal, whichever is tallest */
float stands(vec2 x, float h, float fade) {
  float up = built(x, h);
  if (fade < .01) return up;
  vec4 g2 = land(x.y, 2.);
  up = max(up, woods(x, g2).x * treeBand(h, g2.x * 1.2) * fade);
  return max(up, beast(x).x * .0026 * pasture(h, land(x.y, 4.).a) * fade);
}
/* the finest ground: x = the ground itself with its cracks and ledges, y = what stands on it */
vec2 terrH2(vec2 x) {
  float h = terrD(x);
  float band = treeBand(h, G2.x * 1.2);
  float crag = (fbm(x * 23.) - .47) * .02 + (fbm(x * 71. + 5.) - .47) * .006;
  return vec2(h + (1. - band * G2.z) * crag * (1. - .85 * max(G6.w, G4.w)) * FINE, max(max(built(x, h), woods(x, G2).x * band * TF), beast(x).x * .0026 * pasture(h, G4.w) * TF));
}
`;

/** The colour of the ground. Inside ground(): p, n (with the trees), ng (the bare ground), h, r, r2, near, ao are set; it sets alb, snow and veg. */
export const WORLD_ALBEDO = `
  h = terrD(p.xz);
  float tl = G2.x * 1.2, sl = G2.y * 1.5;
  vec3 wd = woods(p.xz, G2);
  float band = treeBand(h, tl);
  float flat1 = smoothstep(.36, .6, ng.y);
  /* far off a wood is one soft canopy; near, each tree is itself */
  float canopy = band * flat1 * smoothstep(0., .55, G2.z);
  float mead = max(smoothstep(.8, .93, ng.y) * smoothstep(.2, .06, h + .05 * (r2 - .5)), G4.w * smoothstep(.5, .74, ng.y));
  float tree = mix(canopy * (1. - mead), smoothstep(.02, .14, wd.y * band), TF);
  float snow = smoothstep(sl, sl + .12, h + .2 * (r2 - .5)) * smoothstep(.4, .68, ng.y);
  vec3 d1 = noised(p.xz * 34.), d2 = noised(p.xz * 97.);
  float bare = (1. - tree) * (1. - canopy) * (1. - snow * .7) * (1. - .8 * max(G6.w, mead));
  n = normalize(n + vec3(d1.y + .6 * d2.y, 0., d1.z + .6 * d2.z) * .26 * near * bare);
  vec3 rock = G6.rgb * mix(.4, 1.3, r2) * (.7 + .6 * n2(vec2(h * 80. + r2 * 5., r * 2.)));
  rock *= mix(.62, 1.08, smoothstep(.3, .75, ng.y));
  vec3 grass = G3.rgb * mix(.6, 1.3, r2);
  /* the gusts roll over the grass: where the wind presses it flat its paler side shows, a bright wave
     travelling downwind; close by, single tufts */
  float gust = gustAt(p.xz);
  grass *= mix(vec3(1.), vec3(1.3, 1.26, 1.), gust * .8) * mix(1., .78 + .44 * n2(p.xz * 640.), near * FINE);
  vec3 sand = G7.rgb * (.8 + .4 * r2);
  vec3 alb = mix(rock, sand, G6.w * smoothstep(.4, .7, ng.y));
  /* under the trees: deep shade and leaf litter */
  alb = mix(alb, G4.rgb * (.55 + .3 * r), canopy);
  /* between the trees the ground is soil, needles and moss, never bare rock */
  alb = mix(alb, mix(G3.rgb * .75, vec3(.15, .11, .07), .4 + .3 * r) * (.8 + .4 * r2), band * (1. - canopy) * (1. - mead) * (1. - G6.w));
  alb = mix(alb, grass, mead * (1. - G6.w));
  /* a crown: its own green, dark at the foot and bright at the top, dabbed with leaf */
  vec3 crownFar = mix(G4.rgb, G5.rgb, .3 + .4 * r);
  vec3 crownNear = mix(G4.rgb, G5.rgb, .15 + .85 * wd.z) * mix(.5, 1.35, wd.y) * (.8 + .4 * n2(p.xz * 330.));
  /* the top of a crown catches warm light (the way stylised foliage is painted: a gradient, a shaded foot, a lit top) */
  crownNear *= mix(vec3(1.), vec3(1.28, 1.16, .78), smoothstep(.55, 1., wd.y));
  /* now and then a spirit tree: silver-leaved by day, softly shining by night */
  float spirit = step(.985, wd.z);
  crownNear = mix(crownNear, vec3(.13, .18, .16) * mix(.6, 1.2, wd.y), spirit * .6);
  alb = mix(alb, mix(crownFar, crownNear, TF), tree);
  /* close by, a crown is clumps of needles and leaves that each catch the light */
  n = normalize(n + vec3(d1.y + .7 * d2.y, 0., d1.z + .7 * d2.z) * .5 * near * tree * TF);
  /* and a crown is lit as one soft mass, not leaf by leaf */
  n = normalize(mix(n, normalize(ng + vec3(0., .5, 0.)), .45 * PAINT * tree * TF));
  float fl = G3.w;
  float bloom = smoothstep(.76 - .5 * fl, .9 - .44 * fl, n2(p.xz * 34. + 3.)) * mead * step(.01, fl) * (1. - G6.w) * (1. - tree);
  vec3 petal = mix(G9.rgb, G10.rgb, step(.5, n2(p.xz * 8.)));
  petal = mix(petal, .5 * (G9.rgb + G10.rgb) + vec3(.1, .08, .16), step(.72, n2(p.xz * 5. + 20.)));
  /* where a land is given over to flowers they grow as fields: each its own colour, in rows, with green lanes between */
  vec2 fq = p.xz * 5.5 + .3 * vec2(n2(p.xz * 3.), n2(p.xz * 3. + 9.));
  vec2 fi = floor(fq), fe = fract(fq);
  float fa = tx(fi + 7.) * 3.14159;
  float rows = .5 + .5 * sin(dot(p.xz, vec2(cos(fa), sin(fa))) * 620.);
  float lane = smoothstep(.0, .07, min(min(fe.x, 1. - fe.x), min(fe.y, 1. - fe.y)));
  float fields = smoothstep(.6, .9, fl);
  bloom = mix(bloom, mead * lane * step(.2, tx(fi + 3.)) * (1. - G6.w) * (1. - tree), fields);
  float pick = tx(fi + 11.);
  vec3 crop = pick < .4 ? G9.rgb : pick < .8 ? G10.rgb : .5 * (G9.rgb + G10.rgb) + vec3(.1, .08, .16);
  petal = mix(petal, crop * (.62 + .38 * mix(1., rows, FINE)), fields);
  alb = mix(alb, mix(grass, petal, .55 + .45 * r), bloom * .88);
  alb = mix(alb, sand, smoothstep(.018 + .03 * G6.w, .004, h));
  /* no two fields the same green: the colour wanders warm and cool, and the brush shows */
  float wander = n2(p.xz * 2.3 + 40.), stroke = fbm(p.xz * 16. + 9.);
  alb *= mix(vec3(.8, .92, 1.1), vec3(1.18, 1.04, .8), wander) * (.84 + .32 * stroke);
  /* calmer colour: a little of the green taken out, a little dusk-blue let in */
  alb = mix(alb, vec3(dot(alb, vec3(.3, .59, .11))) * vec3(.96, 1., 1.06), .2);
  alb = mix(alb, vec3(.78, .83, .9), snow * (1. - .55 * tree));
  /* the herds: pale sheep, brown deer, dark horses */
  vec2 bs = beast(p.xz);
  float isB = smoothstep(.05, .3, bs.x) * pasture(h, G4.w) * TF * (1. - tree);
  vec3 coat = bs.y < .4 ? vec3(.6, .58, .52) : bs.y < .75 ? vec3(.3, .19, .1) : vec3(.1, .08, .07);
  alb = mix(alb, coat * mix(.55, 1.15, bs.x), isB);
  float veg = clamp(max(max(tree, canopy), mead), 0., 1.) * (1. - snow) * (1. - isB);
  /* the foot of a tree stands in its own shade */
  ao *= mix(1., .55 + .45 * wd.y, tree * TF);
`;

/** The colour of the water's body, with reefs and ice. Inside main(): p, w, depth are set; it sets body and ice. */
export const WORLD_WATER = `
    vec4 w8 = land(p.z, 8.), w7 = land(p.z, 7.);
    float ice = land(p.z, 9.).a;
    float clear = smoothstep(0., mix(.07, .2, w8.a), depth);
    vec3 body = mix(w8.rgb, vec3(.008, .04, .07), clear) * (AMB * 1.3 + KEYCOL * .5);
    /* a reef: beds of coral under clear shallow water */
    float bed = w7.a * smoothstep(.1, .012, depth) * smoothstep(.46, .6, n2(w * 13. + 2.));
    vec3 coral = mix(vec3(.5, .16, .2), vec3(.55, .32, .08), step(.5, n2(w * 37.)));
    coral = mix(coral, vec3(.3, .16, .46), step(.74, n2(w * 29. + 8.)));
    body = mix(body, coral * (.5 + .7 * n2(w * 90.)) * (AMB + KEYCOL * .8), bed * .8);
    body = mix(w7.rgb * (AMB * .7 + KEYCOL), body, smoothstep(0., .014, depth));
    /* fish: small dark shapes in shoals under the shallows, all swimming one way; a few are gold in clear water */
    vec2 fg = w * 46. + vec2(uTime * .22, .12 * sin(uTime * .4 + w.x * 9.)), fid = floor(fg);
    vec2 ff = fract(fg) - .5 - (vec2(tx(fid + 3.), tx(fid + 19.)) - .5) * .6;
    float shoal = smoothstep(.5, .66, n2(w * 5. + vec2(uTime * .01, 4.)));
    float fish = smoothstep(.16, .06, length(ff * vec2(1., 3.))) * step(.5, tx(fid + 47.)) * shoal * smoothstep(.004, .02, depth) * smoothstep(.16, .05, depth) * (1. - ice);
    body = mix(body, mix(body * .22, vec3(.8, .3, .06) * (AMB + KEYCOL), step(.8, tx(fid + 61.)) * w8.a), fish * .85);
`;

/** The light on the ground, painted. Inside ground(): n, sh, ao, alb, veg are set; it sets lin. */
export const WORLD_LIGHT = `
  /* leaves and grass let light through, so they turn from light to shade slowly */
  float lam = max(dot(n, KEY), 0.), wrapped = clamp((dot(n, KEY) + .45) / 1.45, 0., 1.);
  float dif = mix(lam, wrapped * wrapped, .75 * veg) * sh;
  /* the tones gather into a few soft steps, the way gouache is laid down */
  float q4 = dif * 4.;
  dif = mix(dif, (floor(q4) + smoothstep(.25, .75, fract(q4))) / 4., PAINT);
  vec3 lin = KEYCOL * dif * 2.5 + AMB * (.4 + .4 * n.y) * ao;
  /* light thrown back up by the sunlit ground, and shade that leans to violet */
  lin += KEYCOL * (.1 + .1 * veg) * (1. - dif) * (.4 + .6 * sh);
  lin *= mix(vec3(1.), vec3(.84, .9, 1.22), (1. - dif) * VIOLET * DAY);
`;

/** What the water mirrors of the far shore. Inside main(): q (the point on the shore) is set; it sets land. */
export const WORLD_MIRROR = `
      vec4 m2 = land(q.z, 2.), m3 = land(q.z, 3.), m4 = land(q.z, 4.), m6 = land(q.z, 6.);
      float mt = m2.x * 1.2, ms = m2.y * 1.5;
      vec3 land = mix(m6.rgb * .8, mix(m3.rgb, m4.rgb * 1.7, m2.z), smoothstep(mt, mt - .16, q.y));
      land = mix(land, vec3(.78, .83, .9), smoothstep(ms, ms + .12, q.y));
      /* slopes that face the sun are bright in the mirror too */
      float face = clamp(.6 + 9. * (q.y - terrL(q.xz + KEY.xz * .03)), .15, 1.3);
      land *= KEYCOL * face * 1.5 + AMB * .6;
`;

/** Life on the water's surface. Inside main(): w, depth, ice, col are set. */
export const WORLD_AFLOAT = `
    /* swans near the shore, each trailing a wake, and the rings fish leave when they rise */
    vec2 sg = w * 16. + vec2(uTime * .02, 0.), sid = floor(sg);
    vec2 sf = fract(sg) - .5 - (vec2(tx(sid + 3.), tx(sid + 17.)) - .5) * .6;
    float swan = step(.8, tx(sid + 43.)) * smoothstep(.004, .012, depth) * smoothstep(.1, .05, depth) * (1. - ice);
    float bird = max(smoothstep(.07, .045, length(sf * vec2(1., 1.7))), smoothstep(.03, .015, length(sf - vec2(.07, 0.))));
    float wake = smoothstep(.02, .0, abs(abs(sf.y) + (sf.x + .05) * .5)) * step(sf.x, -.05) * smoothstep(-.45, -.1, sf.x);
    col += (AMB + KEYCOL) * .12 * wake * swan;
    col = mix(col, vec3(.95, .94, .9) * (AMB * .9 + KEYCOL), bird * swan);
    vec2 rg = w * 11., rid = floor(rg);
    vec2 rf = fract(rg) - .5 - (vec2(tx(rid + 5.), tx(rid + 29.)) - .5) * .5;
    float ph = fract(uTime * .11 + tx(rid + 13.));
    col += (AMB + KEYCOL) * .1 * smoothstep(.02, .0, abs(length(rf) - ph * .35)) * (1. - ph) * step(.6, tx(rid + 37.)) * (1. - ice);
`;

/** The looks, and the air: how sunlight and moonlight are coloured and scattered on their way through it.
 *  Goes in near the top of the shader, before anything that lights or colours. */
export const WORLD_AIR = `
/* the three looks the founder is choosing between (2026-11-21): 0 clear and true, 1 warm and painted,
   2 misty and mystic. HAZE: dust in the air; FOGK: low haze; MISTK: valley mist; SHAFT: beams of light;
   MOTES: pollen and fireflies; WARM, SAT: the grade; CLOUDK: more cloud; PAINT: light laid in soft steps;
   VIOLET: shade leaning to violet */
#ifndef LOOK
#define LOOK 0
#endif
#if LOOK == 1
const float HAZE = .1, FOGK = .7, MISTK = .6, SHAFT = 1., MOTES = 1.2, WARM = .55, SAT = 1.2, CLOUDK = .2, PAINT = .7, VIOLET = .7, ORBS = 0.;
#elif LOOK == 2
const float HAZE = .2, FOGK = 2., MISTK = 2.2, SHAFT = 3., MOTES = 2., WARM = -.25, SAT = .9, CLOUDK = .05, PAINT = .15, VIOLET = .5, ORBS = .6;
#else
const float HAZE = .07, FOGK = .55, MISTK = .45, SHAFT = .6, MOTES = .75, WARM = .06, SAT = 1.04, CLOUDK = 0., PAINT = 0., VIOLET = .15, ORBS = 0.;
#endif
/* the air (founder, 2026-11-21: "lighting that looks and feels real"): sunlight crosses more air the lower
   the sun, so it reddens; the air scatters blue overhead and a white glow around the sun. BR is how much
   the air thins each colour, straight up; airm() how much air a ray crosses at that height (Kasten-Young) */
const vec3 BR = vec3(.040, .094, .229);
float airm(float y) { float h = degrees(asin(clamp(y, -1., 1.))); return 1. / (max(y, 0.) + .50572 * pow(max(h, -2.) + 6.07995, -1.6364)); }
vec3 atmo(vec3 rd, vec3 L, float E) {
  float mu = dot(rd, L), up = clamp(rd.y, 0., 1.);
  vec3 ext = BR + HAZE;
  /* light reaching the high sky crossed less air than light reaching the horizon; and the sky overhead,
     lit again and again by the rest of the sky, is brighter than one bounce would make it */
  vec3 tl = exp(-ext * min(airm(L.y), 36.) * mix(1., .18, sqrt(up)));
  vec3 tv = (1. - exp(-ext * airm(rd.y))) * mix(1., 2.2, sqrt(up));
  float g = .76, pm = .25 * (1. - g * g) / pow(1. + g * g - 2. * g * mu, 1.5);
  vec3 sc = (BR * .75 * (1. + mu * mu) + HAZE * pm) / ext;
  return E * smoothstep(-.18, .0, L.y) * tl * sc * tv;
}
`;

/** Light in the air and life in it: beams the mountains block, pollen, fireflies and spirit lights.
 *  Inside main(), after the picture is drawn: ro, rd, tend, jit, uv, lens, col are set. */
export const WORLD_LIFE = `
  {
    /* light in the air (founder, 2026-11-21: "ray-marched lighting"): walk the ray through the low air and
       ask at each step whether the sun reaches it past the mountains. Where it does the air glows, most
       when looking toward the sun; where a ridge blocks it there is a lane of shade: real beams */
    float span = min(tend, 6.), beam = 0.;
    for (int i = 0; i < 4; i++) {
      float s = span * (float(i) + jit) / 4.;
      vec3 q = ro + rd * s;
      float lit = min(smoothstep(-.012, .03, q.y + KEY.y * .14 - terrL(q.xz + KEY.xz * .14)), smoothstep(-.02, .05, q.y + KEY.y * .7 - terrL(q.xz + KEY.xz * .7)));
      beam += lit * exp(-max(q.y, 0.) * 2.2);
    }
    float mu = dot(rd, KEY), pm = .25 * (1. - .5) / pow(1.5 - 1.4142 * mu, 1.5);
    col += KEYCOL * beam / 4. * span * (.012 + pm * .05) * SHAFT * (1. - .8 * uWx.x) * (1. - .5 * NIGHT);
  }
  {
    /* motes in the air, really out there (founder, 2026-11-21: "pollen, fireflies"): they sit on sheets
       across the route that the camera flies through, so near ones are big and soft and pass quickly, far
       ones are small and slow. Pollen catches the sun by day; by night fireflies blink low over the grass */
    const float SP = .07;
    float z0 = floor(ro.z / SP), pix = 2. / (uRes.y * lens), mo = 0., ff = 0.;
    for (int i = 1; i <= 6; i++) {
      float zi = (z0 + float(i)) * SP, tt = (zi - ro.z) / max(rd.z, .05);
      if (tt > tend) break;
      vec3 q = ro + rd * tt;
      vec2 g = q.xy * 30. + vec2(uTime * .06, sin(uTime * .2 + zi * 3.) * .3 - uTime * .02);
      vec2 id = floor(g), cell = id + vec2(zi * 37.1, zi * 11.7);
      vec2 c = (vec2(tx(cell), tx(cell + 41.)) - .5) * .7 + .18 * vec2(sin(uTime * .6 + tx(cell + 3.) * 6.3), cos(uTime * .45 + tx(cell + 9.) * 6.3));
      float d = length(fract(g) - .5 - c) / 30., r = .0003 + .0004 * tx(cell + 17.), px = pix * tt;
      float dot1 = smoothstep(r + px, r - px, d) * r * r / ((r + px) * (r + px));
      float fade = smoothstep(.03, .1, tt) * smoothstep(6. * SP, 4. * SP, tt);
      float on = step(.82, tx(cell + 23.)) * fade;
      mo += dot1 * on;
      /* fireflies stay near the ground and glow on and off */
      float near = NIGHT > .01 ? smoothstep(.07, .0, q.y - terrL(q.xz)) : 0., blink = pow(max(sin(uTime * (1.1 + tx(cell + 5.)) + tx(cell + 7.) * 6.3), 0.), 3.);
      ff += (dot1 * 2. + .5 * exp(-d / max(r * 2.5, px))) * on * near * blink;
    }
    float fwd = pow(max(dot(rd, KEY), 0.), 4.);
    col += (KEYCOL * (.25 + 2. * fwd) + AMB * .2) * mo * MOTES * (1. - NIGHT) * (1. - uWx.y);
    col += vec3(.85, 1., .4) * .5 * ff * MOTES * NIGHT * (1. - uWx.y);
    /* spirit lights: a few pale lanterns of light that rise slowly and sway, from dusk through the night */
    vec2 og = vec2(uv.x * 2.6 + .25 * sin(uTime * .13 + uv.y * 2.), uv.y * 2.6 - uTime * .035);
    vec2 oid = floor(og), of = fract(og) - .5 - (vec2(tx(oid + 3.), tx(oid + 21.)) - .5) * .7;
    float od = length(of);
    float orb = (smoothstep(.05, .0, od) + .35 * exp(-od * 9.)) * step(.78, tx(oid + 13.)) * (.6 + .4 * sin(uTime * .5 + tx(oid) * 6.3));
    col += vec3(.55, .85, 1.) * orb * ((.1 + .2 * LOW) * NIGHT + .05 * ORBS) * MOTES * (1. - uWx.y);
  }
`;
