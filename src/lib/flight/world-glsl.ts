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
/* a tree's own shape: a pine's point, a round crown, or a tall cane of bamboo */
float crown(float t) { return mix(1.7 * t, 1.15 * sqrt(t), smoothstep(.2, .6, G2.w)) * mix(1., 1.9, smoothstep(.7, 1., G2.w)); }
float terrH(vec2 x) {
  float h = terrD(x);
  float tl = G2.x * 1.2;
  float band = smoothstep(tl, tl - .14, h) * smoothstep(.004, .03, h);
  float crag = (fbm(x * 23.) - .47) * .02 + (fbm(x * 71. + 5.) - .47) * .006;
  float town = townAt(x, h);
  return h + (band * (1. - town) * .0056 * crown(treeAt(x, G2.z).x) + (1. - band) * crag * (1. - .85 * max(G6.w, G4.w))) * FINE + built(x, h);
}
`;

/** The colour of the ground. Inside ground(): p, n, h, r, r2, near are set; it sets alb, tree and snow. */
export const WORLD_ALBEDO = `
  float tl = G2.x * 1.2, sl = G2.y * 1.5;
  vec2 tr = treeAt(p.xz, G2.z);
  float flat1 = smoothstep(.36, .6, n.y);
  float tree = smoothstep(tl, tl - .16, h + .16 * (r2 - .5)) * flat1;
  float mead = max(smoothstep(.8, .93, n.y) * smoothstep(.2, .06, h + .05 * (r2 - .5)), G4.w * smoothstep(.5, .74, n.y));
  float snow = smoothstep(sl, sl + .12, h + .2 * (r2 - .5)) * smoothstep(.4, .68, n.y);
  vec3 d1 = noised(p.xz * 34.), d2 = noised(p.xz * 97.);
  float bare = (1. - tree * G2.z) * (1. - snow * .7) * (1. - .8 * max(G6.w, mead));
  n = normalize(n + vec3(d1.y + .6 * d2.y, 0., d1.z + .6 * d2.z) * .26 * near * bare);
  vec3 rock = G6.rgb * mix(.4, 1.3, r2) * (.7 + .6 * n2(vec2(h * 80. + r2 * 5., r * 2.)));
  rock *= mix(.62, 1.08, smoothstep(.3, .75, n.y));
  vec3 forest = mix(G4.rgb, G5.rgb, mix(r, .3 * r + .7 * tr.y, FINE)) * mix(1., .7 + .6 * tr.x, FINE);
  vec3 grass = G3.rgb * mix(.6, 1.3, r2);
  vec3 sand = G7.rgb * (.8 + .4 * r2);
  vec3 alb = mix(rock, sand, G6.w * smoothstep(.4, .7, n.y));
  alb = mix(alb, forest, tree * smoothstep(0., .55, G2.z));
  alb = mix(alb, grass, mead * (1. - G6.w));
  /* single trees standing in open grass */
  alb = mix(alb, forest, tree * mead * smoothstep(.03, .2, tr.x) * FINE);
  float fl = G3.w;
  float bloom = smoothstep(.76 - .5 * fl, .9 - .44 * fl, n2(p.xz * 34. + 3.)) * mead * step(.01, fl) * (1. - G6.w);
  vec3 petal = mix(G9.rgb, G10.rgb, step(.5, n2(p.xz * 8.)));
  petal = mix(petal, .5 * (G9.rgb + G10.rgb) + vec3(.1, .08, .16), step(.72, n2(p.xz * 5. + 20.)));
  alb = mix(alb, mix(grass, petal, .55 + .45 * r), bloom * .88);
  alb = mix(alb, sand, smoothstep(.018 + .03 * G6.w, .004, h));
  /* no two fields the same green: the colour wanders warm and cool, and the brush shows */
  float wander = n2(p.xz * 2.3 + 40.), stroke = fbm(p.xz * 16. + 9.);
  alb *= mix(vec3(.8, .92, 1.1), vec3(1.18, 1.04, .8), wander) * (.84 + .32 * stroke);
  alb = mix(alb, vec3(.78, .83, .9), snow * (1. - .5 * tree * G2.z * FINE * step(.1, tr.x)));
  float veg = clamp(max(tree * G2.z, mead), 0., 1.) * (1. - snow);
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
`;

/** The light on the ground, painted. Inside ground(): n, sh, ao, alb, veg are set; it sets lin. */
export const WORLD_LIGHT = `
  /* leaves and grass let light through, so they turn from light to shade slowly */
  float lam = max(dot(n, KEY), 0.), wrapped = clamp((dot(n, KEY) + .45) / 1.45, 0., 1.);
  float dif = mix(lam, wrapped * wrapped, .75 * veg) * sh;
  /* the tones gather into a few soft steps, the way gouache is laid down */
  float q4 = dif * 4.;
  dif = mix(dif, (floor(q4) + smoothstep(.25, .75, fract(q4))) / 4., .5);
  vec3 lin = KEYCOL * dif * 2.5 + AMB * (.4 + .4 * n.y) * ao;
  /* light thrown back up by the sunlit ground, and shade that leans to violet */
  lin += KEYCOL * (.1 + .1 * veg) * (1. - dif) * (.4 + .6 * sh);
  lin *= mix(vec3(1.), vec3(.84, .9, 1.22), (1. - dif) * .55 * DAY);
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
