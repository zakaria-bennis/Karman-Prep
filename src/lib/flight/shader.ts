// The home page's background: one lit landscape the visitor flies down through as they scroll (founder,
// 2026-11-11). It is drawn live on the graphics card, so the sun, the shadows, the clouds, the mist and the
// water are real light, not a picture. The route: above the clouds, down through them, past the high peaks
// where it snows, along a green valley and a fjord where birds fly, out to the open sea.
// uP is how far down the page (0 to 1). uNight is the mode (0 light, 1 dark): light is one day, from just
// after sunrise to just after sunset; dark is one night, from dusk through stars and northern lights to
// sunrise. Between the two the sun really sets or rises, which is what the visitor sees when they flip the
// switch. uTime moves the clouds, the water, the mist, the stars, the snow and the birds.
export const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

export const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uP, uNight;
uniform sampler2D uNoise;

const mat2 M2 = mat2(.8, -.6, .6, .8);
const float CB = 1.05, CT = 1.3;   /* the cloud deck: bottom and top */

vec3 SUN, MOON, KEY, SUNCOL, KEYCOL, AMB;
float DAY, NIGHT, LOW, FINE;

float tx(vec2 p) { return texture2D(uNoise, (p + .5) / 256.).r; }
float n2(vec2 x) { vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return texture2D(uNoise, (i + f + .5) / 256.).r; }
vec3 noised(vec2 x) {
  vec2 p = floor(x), f = fract(x), u = f * f * (3. - 2. * f);
  float a = tx(p), b = tx(p + vec2(1., 0.)), c = tx(p + vec2(0., 1.)), d = tx(p + vec2(1., 1.));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y, 6. * f * (1. - f) * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
float fbm(vec2 p) { float a = 0., b = .5; for (int i = 0; i < 5; i++) { a += b * n2(p); p = M2 * p * 2.02; b *= .5; } return a; }

/* the route: the valley the camera follows, from the high peaks (z = 0) to the open sea (z > 8) */
float pathX(float z) { return .5 * sin(z * .55) + .22 * sin(z * 1.4 + 1.3); }
float shape(vec2 x, float a) {
  float z = x.y;
  float sea = smoothstep(6.3, 8.4, z);
  float wet = smoothstep(3.9, 4.8, z);
  float amp = mix(1.25, .42, sea);
  float lift = mix(.3, -.2, smoothstep(1.2, 4.2, z)) - .1 * sea;
  float v = smoothstep(.04, mix(.8, 1.35, wet), abs(x.x - pathX(z)));
  return a * amp * mix(mix(.3, .05, wet), 1., v) + lift;
}
#define TERR(NAME, OCT) float NAME(vec2 x) { vec2 p = x; float a = 0., b = 1.; vec2 d = vec2(0.); for (int i = 0; i < OCT; i++) { vec3 n = noised(p); d += n.yz; a += b * n.x / (1. + dot(d, d)); b *= .5; p = M2 * p * 2.; } return shape(x, a); }
TERR(terrL, 3)
TERR(terrM, 6)
TERR(terrD, 10)
/* the finest version adds the bumps of a forest canopy below the tree line */
/* one tree: a cone somewhere in its cell, of its own height; some cells are clearings */
vec2 treeCell(vec2 g) {
  vec2 id = floor(g), f = fract(g) - .5 - (vec2(tx(id), tx(id + 41.)) - .5) * .8;
  float size = tx(id + 13.);
  return vec2(max(0., 1. - length(f) * (2.2 + 1.6 * size)) * (.45 + .85 * size) * step(.28, tx(id + 59.)), tx(id + 77.));
}
/* the forest: two sizes of tree laid over each other, thinning out in patches */
vec2 treeAt(vec2 x) {
  vec2 a = treeCell(x * 190.), b = treeCell(M2 * x * 330. + 17.);
  float patchy = smoothstep(.3, .62, n2(x * 21.));
  return vec2(max(a.x, b.x * .7) * mix(.35, 1., patchy), a.x > b.x * .7 ? a.y : b.y);
}
float terrH(vec2 x) {
  float h = terrD(x);
  float low = smoothstep(1.2, 4.2, x.y);
  float band = smoothstep(mix(.74, .5, low), mix(.6, .36, low), h) * smoothstep(.004, .03, h);
  /* bare rock is cracked and ledged; the forest floor carries its trees */
  float crag = (fbm(x * 23.) - .47) * .02 + (fbm(x * 71. + 5.) - .47) * .006;
  return h + (band * .0056 * treeAt(x).x + (1. - band) * crag) * FINE;
}

vec3 dirFrom(float elev, float az) { float e = radians(elev), a = radians(az); return vec3(sin(a) * cos(e), sin(e), cos(a) * cos(e)); }

/* the sky without the sun's disc or the stars: also the colour of the haze */
vec3 skyBase(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = max(dot(rd, SUN), 0.);
  vec3 zen = mix(vec3(.006, .011, .03), vec3(.09, .26, .62), DAY);
  vec3 hor = mix(vec3(.016, .026, .06), vec3(.56, .72, .9), DAY);
  vec3 c = mix(hor, zen, pow(y, .45));
  vec3 warm = mix(vec3(1., .34, .1), vec3(1., .66, .34), min(y * 3., 1.));
  c = mix(c, warm, LOW * pow(1. - y, 5.) * (.3 + .7 * pow(mu, 1.5)));
  c += vec3(.8, .3, .5) * .1 * LOW * pow(1. - y, 3.) * (1. - mu);
  c += SUNCOL * (pow(mu, 90.) * .7 + pow(mu, 14.) * .22 + pow(mu, 4.) * .1);
  c += vec3(.5, .62, .9) * .05 * NIGHT * pow(max(dot(rd, MOON), 0.), 24.);
  return c;
}
vec3 aurora(vec3 rd) {
  vec3 c = vec3(0.);
  if (rd.y < .04) return c;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float hgt = 2.4 + fi * .5;
    vec2 q = rd.xz * (hgt / (rd.y + .1));
    float wave = q.y * .28 + 1.6 * n2(vec2(q.x * .18 + uTime * .012, fi * 3.7)) + fi * .9;
    float band = exp(-pow(sin(wave) * 3.2, 2.));
    float rays = .45 + .55 * n2(vec2(q.x * 3.5 + uTime * .05, q.y * .2 + fi));
    c += mix(vec3(.1, 1., .45), vec3(.5, .25, .95), fi / 5.) * band * rays;
  }
  return c * .085 * smoothstep(.04, .3, rd.y) * smoothstep(1., .5, rd.y);
}
vec3 sky(vec3 rd, float sharp) {
  vec3 c = skyBase(rd);
  float mu = max(dot(rd, SUN), 0.);
  c += SUNCOL * smoothstep(.99985, .99996, mu) * 30.;
  if (NIGHT > .01 && rd.y > 0.) {
    /* stars, the band of the galaxy, the northern lights and the moon */
    vec2 g = rd.xz / (rd.y + .6) * 150.;
    vec2 id = floor(g), f = fract(g) - .5;
    float h = tx(id), h2 = tx(id + 91.);
    float star = smoothstep(.22, 0., length(f + (vec2(h2, tx(id + 37.)) - .5) * .6)) * pow(h, 34.) * (10. + 50. * h2) * sharp;
    star *= .7 + .3 * sin(uTime * (1. + h2 * 3.) + h * 40.);
    float band = exp(-pow(dot(rd, normalize(vec3(.62, .25, -.74))) * 4.2, 2.));
    c += NIGHT * (vec3(.9, .95, 1.) * star + vec3(.5, .56, .8) * band * (.03 + .09 * fbm(g * .045)));
    float amt = smoothstep(.2, .34, uP) * smoothstep(.82, .62, uP);
    c += NIGHT * amt * aurora(rd);
    float mm = max(dot(rd, MOON), 0.);
    c += NIGHT * vec3(.95, .97, 1.) * (smoothstep(.99962, .99974, mm) * 2.2 + pow(mm, 900.) * .25);
  }
  return c;
}

/* clouds: a soft deck the camera starts above and sinks through */
float cover(float z) { return mix(.6, .42, smoothstep(1.6, 3.2, z)) + .06 * smoothstep(6.5, 9., z); }
float cdens(vec3 p) {
  float hh = (p.y - CB) / (CT - CB);
  float prof = smoothstep(0., .22, hh) * smoothstep(1., .45, hh);
  vec2 q = p.xz * 1.15 + vec2(uTime * .016, uTime * .005);
  float f = fbm(q + p.y * .35) + .2 * n2(q * 7. + p.y * 4. + uTime * .02) - .1;
  return clamp((f - (1. - cover(p.z))) * 4.5, 0., 1.) * prof;
}
vec4 clouds(vec3 ro, vec3 rd, float tmax, float jit) {
  float ta = (CB - ro.y) / rd.y, tb = (CT - ro.y) / rd.y;
  float t0 = max(min(ta, tb), 0.), t1 = min(min(max(ta, tb), tmax), t0 + 7.);
  vec4 acc = vec4(0.);
  if (t1 <= t0) return acc;
  vec3 lit = KEYCOL * 1.15 + AMB * .55, shade = AMB * .55 + KEYCOL * .06;
  float last = t0;
  for (int i = 0; i < 24; i++) {
    float k = (float(i) + jit) / 24.;
    float t = t0 + (t1 - t0) * k * k;
    float dt = t - last; last = t;
    vec3 p = ro + rd * t;
    float d = cdens(p);
    if (d > .01) {
      float dl = cdens(p + KEY * .09);
      vec3 c = mix(shade, lit, clamp(1. - dl * 1.25, 0., 1.));
      c = mix(c, skyBase(vec3(rd.x, .03, rd.z)), 1. - exp(-t * t * .02));
      float a = (1. - exp(-d * max(dt, .01) * 20.)) * (1. - acc.a);
      acc += vec4(c * a, a);
      if (acc.a > .98) break;
    }
  }
  return acc;
}

float shadow(vec3 p) {
  float s = 1., t = .012;
  for (int i = 0; i < 12; i++) {
    float h = p.y + KEY.y * t - terrL(p.xz + KEY.xz * t);
    s = min(s, 10. * h / t);
    t += clamp(h, .012, .12);
    if (s < .02) break;
  }
  return clamp(s, 0., 1.);
}

vec3 ground(vec3 p, float t) {
  float e = .0009 * t + .0004;
  FINE = clamp(1.6 - t * .55, 0., 1.);
  vec3 n = normalize(vec3(terrH(p.xz - vec2(e, 0.)) - terrH(p.xz + vec2(e, 0.)), 2. * e, terrH(p.xz - vec2(0., e)) - terrH(p.xz + vec2(0., e))));
  float h = p.y, r = n2(p.xz * 46.), r2 = fbm(p.xz * 7.);
  float near = 1. / (1. + t * t * .5);
  float low = smoothstep(1.2, 4.2, p.z);
  float tl = mix(.74, .5, low), sl = mix(.8, .7, low);
  float tree = smoothstep(tl, tl - .16, h + .16 * (r2 - .5)) * smoothstep(.36, .6, n.y);
  float mead = smoothstep(.8, .93, n.y) * smoothstep(.2, .06, h + .05 * (r2 - .5));
  float snow = smoothstep(sl, sl + .12, h + .2 * (r2 - .5)) * smoothstep(.4, .68, n.y);
  /* the grain of the rock: small ledges and cracks that catch the light, fading with distance */
  vec3 d1 = noised(p.xz * 34.), d2 = noised(p.xz * 97.);
  n = normalize(n + vec3(d1.y + .6 * d2.y, 0., d1.z + .6 * d2.z) * .26 * near * (1. - tree) * (1. - snow * .7));
  vec3 rock = mix(vec3(.07, .066, .064), vec3(.25, .21, .17), r2) * (.7 + .6 * n2(vec2(h * 80. + r2 * 5., r * 2.)));
  rock *= mix(.62, 1.08, smoothstep(.3, .75, n.y));
  vec2 tr = treeAt(p.xz);
  vec3 forest = mix(vec3(.01, .034, .016), vec3(.045, .085, .024), mix(r, .3 * r + .7 * tr.y, FINE)) * mix(1., .7 + .6 * tr.x, FINE);
  vec3 grass = mix(vec3(.075, .13, .035), vec3(.19, .2, .06), r2);
  vec3 alb = mix(rock, forest, tree);
  alb = mix(alb, grass, mead);
  alb = mix(alb, vec3(.36, .31, .22), smoothstep(.018, .004, h));
  alb = mix(alb, vec3(.78, .83, .9), snow);
  float sh = shadow(p + n * .004);
  float dif = max(dot(n, KEY), 0.) * sh;
  float ao = clamp(.8 + (h - terrL(p.xz)) * 3.2, .38, 1.12);
  vec3 lin = KEYCOL * dif * 2.6 + AMB * (.35 + .35 * n.y) * ao + KEYCOL * max(dot(n, normalize(vec3(-KEY.x, 0., -KEY.z))), 0.) * .1;
  return alb * lin + snow * KEYCOL * pow(max(dot(reflect(-KEY, n), normalize(vec3(0., 1., 0.))), 0.), 6.) * .08 * sh;
}

vec3 haze(vec3 col, vec3 p, vec3 rd, float t) {
  vec3 fogc = skyBase(normalize(vec3(rd.x, .04 + max(rd.y, 0.) * .25, rd.z)));
  col = mix(col, fogc, 1. - exp(-t * t * .013 - t * .02));
  /* mist that lies on the water and in the low ground, and drifts */
  float mist = exp(-max(p.y, 0.) * 11.) * (1. - exp(-t * .9)) * (.35 + .65 * fbm(p.xz * 2.4 + vec2(uTime * .03, 0.)));
  return mix(col, fogc * 1.08 + KEYCOL * .05, mist * mix(.38, .62, max(LOW, NIGHT)));
}

void main() {
  float P = clamp(uP, 0., 1.);
  /* light mode runs from just after sunrise to just after sunset; dark mode from dusk to first light */
  float eL = mix(mix(8., 44., smoothstep(0., .45, P)), -8., smoothstep(.5, .96, P));
  float eD = mix(mix(-4.5, -30., smoothstep(0., .22, P)), 1.4, smoothstep(.76, 1., P));
  SUN = dirFrom(mix(eL, eD, uNight), mix(-26., 8., P));
  MOON = dirFrom(36., mix(40., 22., P));
  DAY = smoothstep(-.12, .16, SUN.y);
  NIGHT = 1. - smoothstep(-.3, -.06, SUN.y);
  LOW = exp(-abs(SUN.y) * 6.5) * smoothstep(-.34, -.02, SUN.y);
  SUNCOL = mix(vec3(1., .4, .13), vec3(1., .95, .86), smoothstep(0., .4, SUN.y)) * smoothstep(-.07, .04, SUN.y) * 1.25;
  float sunW = smoothstep(-.09, .01, SUN.y);
  KEY = normalize(mix(MOON, SUN, sunW));
  KEYCOL = mix(vec3(.3, .4, .62) * .2, SUNCOL, sunW);
  AMB = mix(vec3(.012, .018, .04), vec3(.34, .48, .72), DAY) + vec3(.3, .12, .1) * LOW * .5;

  /* the camera: forward along the valley and steadily down, with a slow breath so it never sits dead still */
  float z = .2 + 8.45 * P;
  vec3 ro = vec3(pathX(z) + .004 * sin(uTime * .21), .05 + 1.72 * pow(1. - P, 2.6) + .002 * sin(uTime * .33), z);
  ro.y = max(ro.y, max(terrL(ro.xz) + .1, .045));
  float zt = z + 1.3;
  vec3 ta = vec3(pathX(zt) + .004 * sin(uTime * .17), ro.y + mix(-.36, .05, smoothstep(0., .92, P)), zt);
  vec3 ww = normalize(ta - ro), uu = normalize(cross(vec3(0., 1., 0.), ww)), vv = cross(ww, uu);
  vec2 uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y;
  /* a tall phone sees the same width of land as a wide screen sees height */
  float lens = uRes.x < uRes.y ? 1.5 * uRes.x / uRes.y + .25 : 1.5;
  vec3 rd = normalize(uv.x * uu + uv.y * vv + lens * ww);
  float jit = fract(tx(gl_FragCoord.xy) + tx(gl_FragCoord.yx * .37 + 11.));

  float tmax = 16., tw = rd.y < -.0002 ? -ro.y / rd.y : 1e5;
  float lim = min(tmax, tw), t = .02, hit = -1.;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - terrM(p.xz);
    if (h < .0012 * t) { hit = t; break; }
    t += h * .46 + .0008;
    if (t > lim || (p.y > 2.1 && rd.y > 0.)) break;
  }

  vec3 col;
  float tend = tmax;
  if (hit > 0.) {
    vec3 p = ro + rd * hit;
    col = haze(ground(p, hit), p, rd, hit);
    tend = hit;
  } else if (tw < tmax) {
    /* water: ripples that move, the sky and the far shore mirrored in it, the sun's path, foam at the edge */
    vec3 p = ro + rd * tw;
    vec2 w = p.xz;
    float amp = .16 / (1. + tw * 2.2);
    vec3 nw = normalize(vec3(
      (n2(w * 70. + uTime * .5) - .5 + .5 * (n2(w * 170. - uTime * .9) - .5)) * amp, 1.,
      (n2(w * 70. + 9. - uTime * .4) - .5 + .5 * (n2(w * 170. + 5. + uTime * .7) - .5)) * amp));
    vec3 rr = reflect(rd, nw); rr.y = abs(rr.y) + .002; rr = normalize(rr);
    vec3 refl = sky(rr, .25);
    float rt = .03, rhit = -1.;
    for (int i = 0; i < 20; i++) {
      vec3 q = p + rr * rt;
      float h = q.y - terrL(q.xz);
      if (h < .003 * rt) { rhit = rt; break; }
      rt += h * .6 + .004;
      if (rt > 5.) break;
    }
    if (rhit > 0.) {
      vec3 q = p + rr * rhit;
      vec3 land = mix(vec3(.02, .045, .022), vec3(.14, .125, .11), smoothstep(.45, .8, q.y));
      land = mix(land, vec3(.7, .75, .82), smoothstep(.78, .95, q.y)) * (KEYCOL * .9 + AMB * .6);
      refl = haze(land, q, rr, rhit + tw);
    } else {
      vec4 cr = clouds(p, rr, 9., jit);
      refl = refl * (1. - cr.a) + cr.rgb;
    }
    float fres = .025 + .975 * pow(1. - max(dot(-rd, nw), 0.), 5.);
    float depth = -terrL(w);
    vec3 body = mix(vec3(.05, .2, .19), vec3(.008, .04, .07), smoothstep(0., .07, depth)) * (AMB * 1.3 + KEYCOL * .5);
    body = mix(vec3(.36, .31, .22) * (AMB * .7 + KEYCOL), body, smoothstep(0., .014, depth));
    col = mix(body, refl, fres);
    col += SUNCOL * pow(max(dot(rr, SUN), 0.), 520.) * 5. + NIGHT * vec3(.5, .6, .8) * pow(max(dot(rr, MOON), 0.), 700.) * 1.2;
    float edge = depth + .0025 * sin(uTime * 1.2 + n2(w * 30.) * 6.3);
    col = mix(col, (AMB + KEYCOL) * .6, smoothstep(.0045, .0, edge) * .7);
    col = haze(col, p, rd, tw);
    tend = tw;
  } else {
    col = sky(rd, 1.);
  }

  vec4 cl = clouds(ro, rd, tend, jit);
  col = col * (1. - cl.a) + cl.rgb;
  /* birds: two loose flocks flying on ahead, by day, below the clouds; hills hide them */
  float fly = smoothstep(.27, .36, P) * (1. - smoothstep(.9, .99, P)) * (1. - NIGHT) * smoothstep(-.05, .05, SUN.y);
  if (fly > .01) {
    float ink = 0.;
    for (int k = 0; k < 2; k++) {
      float fk = float(k), size = mix(.036, .02, fk), far = mix(.5, 1.5, fk);
      vec2 c0 = vec2((.55 * sin(uTime * .045 + fk * 2.4) + .2 * sin(uTime * .017 + fk)) * min(1., uRes.x / uRes.y), .34 + .2 * fk + .08 * sin(uTime * .06 + fk * 4.));
      for (int i = 0; i < 5; i++) {
        float fi = float(i), rank = floor((fi + 1.) * .5), side = mod(fi, 2.) * 2. - 1.;
        vec2 c = c0 + vec2(side * rank * 2.7, -rank * 1.25) * size + .25 * size * vec2(sin(uTime * .7 + fi * 2.1), cos(uTime * .53 + fi * 1.3));
        vec2 q = (uv - c) / size;
        q.x = abs(q.x);
        float beat = sin(uTime * (3.4 + fk) + fi * 1.9 + fk * 2.);
        float lift = q.x * (1.3 - .9 * q.x) * (.25 + .6 * beat) + .22 * sin(min(q.x, 1.) * 3.14159);
        float wing = abs(q.y - lift) - .13 * (1. - .85 * q.x);
        float body = length(vec2(q.x * 2.2, q.y + .04)) - .2;
        ink = max(ink, smoothstep(.06, -.04, min(wing, body)) * step(q.x, 1.) * step(far, tend));
      }
    }
    col = mix(col, AMB * .12, ink * fly * .88);
  }
  /* snow: falls around the high peaks, under the clouds, in three depths */
  float snowing = smoothstep(.19, .25, P) * (1. - smoothstep(.33, .43, P));
  if (snowing > .01) {
    float fl = 0.;
    for (int k = 0; k < 3; k++) {
      float fk = float(k), sc = 9. + fk * 9.;
      vec2 g = vec2(uv.x * sc + .6 * sin(uTime * .3 + fk * 2. + uv.y * 1.3) + uTime * (.16 + .06 * fk), uv.y * sc + uTime * (1.3 - .25 * fk) + fk * 7.);
      vec2 id = floor(g), f = fract(g) - .5 - (vec2(tx(id + fk * 19.), tx(id + 53.)) - .5) * .86;
      float big = tx(id + 23. + fk * 5.);
      fl += smoothstep(.035 + .05 * big * big, .0, length(f * vec2(1., .72))) * step(.5, tx(id + 7. + fk * 31.)) * (.9 - .22 * fk);
    }
    col = mix(col, (AMB * .9 + KEYCOL * .55 + .04) * 1.25, clamp(fl, 0., 1.) * snowing * .8);
  }
  /* light spilling through the air around the sun */
  col += SUNCOL * pow(max(dot(rd, SUN), 0.), 9.) * .1 * (1. - exp(-tend * .25));

  col *= mix(1.05, 2.6, NIGHT);
  col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, 1.14);
  col = clamp((col * (2.51 * col + .03)) / (col * (2.43 * col + .59) + .14), 0., 1.);
  col = pow(col, vec3(.4545));
  vec2 sc = gl_FragCoord.xy / uRes;
  col *= .86 + .14 * pow(16. * sc.x * sc.y * (1. - sc.x) * (1. - sc.y), .2);
  col += (jit - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}
`;
