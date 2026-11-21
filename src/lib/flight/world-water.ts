// The endless world's water (founder, 2026-11-21: "the water, rivers, lakes, ocean, and reflections", and
// nothing glassy or "plasticky"). Rivers, lakes and the sea are one surface at sea level; what changes
// from land to land is how rough it is, how clear, and whether a river runs (world.ts).
//
// - The surface is real waves (scripts/dev/world-waves.mjs), laid at three sizes that each move at their
//   own speed, so long swell outruns short chop. In a river they stream down the valley instead.
// - It mirrors the sky and the shore, broken up by those waves, and the rougher or farther the water the
//   softer the mirror: never a sheet of glass.
// - Sunlight glitters on it: each wave facet that tilts the sun to the eye flashes, and far off the
//   flashes merge into the sun's path.
// - What lies under it is seen through it: the water swallows red first, then green, so clear shallows
//   over sand are turquoise and deep water is dark blue; murky water hides its bed within a step.
//   Sunlight focused by the waves dances on a clear bed.
// - Surf runs up the beaches, the open sea breaks white in a wind, and a river foams along its banks.
// shader.ts puts this in before main() where WORLD is set; main() calls sea() for water it meets.

export const WORLD_SEA = `
uniform sampler2D uWaves;   /* the sea's surface: slope across (r) and along (g) the wind, height (b) */
vec3 wav(vec2 uv) { vec3 t = texture2D(uWaves, uv).rgb; return vec3(t.xy * 2. - 1., t.z); }
/* the waves in the file run along +x, turned a little: this way */
const vec2 WIND = vec2(.969, .247);

vec3 sea(vec3 p, vec3 rd, float tw, float jit) {
  vec2 w = p.xz;
  vec4 w8 = land(p.z, 8.), w7 = land(p.z, 7.);
  vec4 w11 = land(p.z, 11.);
  float riv = w11.x, waves = w11.y;
  float ice = land(p.z, 9.).a, clearv = w8.a;
  float depth = -terrL(w);
  float T = uTime;
  /* inside a river's banks the water runs down the valley, rippled and streaming */
  float inRiver = riv * smoothstep(.07, .03, abs(w.x - riverX(w.y)));
  float rough = mix(waves, .15, inRiver);
  /* the wind ruffles the water in patches and leaves calm lanes between */
  float slick = mix(.3, 1., smoothstep(.3, .72, n2(w * 2.6 + T * .015)));
  /* three sizes of wave, each moving downwind at its own speed: swell (about 60 m), chop (15 m) and
     ripples (4 m); each size's slope is turned back from its own copy to the ground's axes */
  vec3 a = wav(w * 1.1 + WIND * T * .011), b = wav(M2 * w * 4.2 + WIND * T * .022), c = wav(M2 * M2 * w * 15. + WIND * T * .04);
  vec2 sl = a.xy * (.05 + .32 * rough) + (b.xy * M2) * (.08 + .2 * rough) * slick + (c.xy * M2 * M2) * .1 * mix(.5, 1., slick);
  float crest = a.z * .55 + b.z * .45;
  if (riv > .01) {
    vec3 rb = wav(vec2(w.x * 9., w.y * 3.5 - T * .05)), rc = wav(vec2(w.x * 31., w.y * 11. - T * .12) + .37);
    sl = mix(sl, rb.xy * vec2(.09, .14) + rc.xy * .08, inRiver);
    crest = mix(crest, rb.z, inRiver);
  }
  sl *= 1. - ice;
  vec3 n = normalize(vec3(-sl.x, 1., -sl.y));
  /* how soft the mirror is: rough water, and far water whose waves are smaller than the eye can see */
  float r = clamp(.025 + .1 * rough * slick + tw * .04 * (rough + .15), .02, .45);

  /* what it mirrors: the shore if the reflected ray meets land, else the sky and its clouds */
  vec3 rr = reflect(rd, n); rr.y = abs(rr.y) + .002; rr = normalize(rr);
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
    vec4 m2 = land(q.z, 2.), m3 = land(q.z, 3.), m4 = land(q.z, 4.), m6 = land(q.z, 6.);
    float mt = m2.x * 1.2, ms = m2.y * 1.5;
    vec3 shore = mix(m6.rgb * .8, mix(m3.rgb, m4.rgb * 1.7, m2.z), smoothstep(mt, mt - .16, q.y));
    shore = mix(shore, vec3(.78, .83, .9), smoothstep(ms, ms + .12, q.y));
    /* slopes that face the sun are bright in the mirror too */
    float face = clamp(.6 + 9. * (q.y - terrL(q.xz + KEY.xz * .03)), .15, 1.3);
    shore *= KEYCOL * face * 1.5 + AMB * .6;
    refl = haze(shore, q, rr, rhit + tw);
  } else {
    vec4 cr = clouds(p, rr, 9., jit);
    refl = refl * (1. - cr.a) + cr.rgb;
  }
  /* a rough surface mirrors a blur: the sky's own soft colour, and the shore's shapes lose their edges */
  refl = mix(refl, skyBase(normalize(vec3(rr.x, rr.y + .35, rr.z))) * .9, min(r * 1.6, .6));
  float cv = max(dot(-rd, n), 0.);
  float fres = (.02 + .98 * pow(1. - cv, 5.)) * mix(1., .75, r);

  /* what lies under it, seen through it: down to the bed and back, the water swallows red first */
  float cosT = sqrt(1. - (1. - cv * cv) / 1.77);
  float path = max(depth, 0.) * (1. + 1. / max(cosT, .2));
  /* (the world's water is deeper than real water: a lagoon here is fifty metres deep, so the water is
     made clearer than real water by the same measure) */
  vec3 eat = mix(vec3(2.4, 1.5, 1.3), vec3(.42, .065, .034), clearv) * 350.;
  vec3 through = exp(-eat * path);
  vec3 lit = AMB * 1.15 + KEYCOL * .5 * max(KEY.y, 0.);
  /* deep water takes the land's own water colour: turquoise lagoons, teal fjords, green lakes */
  vec3 deep = w8.rgb * mix(.5, .62, clearv) * lit;
  /* the bed: sand, and coral beds under clear shallow water; light focused by the waves dances on it */
  vec2 bw = w + n.xz * depth * .6;
  float reefBed = w7.a * smoothstep(.1, .012, depth) * smoothstep(.46, .6, n2(bw * 13. + 2.));
  vec3 coral = mix(vec3(.5, .16, .2), vec3(.55, .32, .08), step(.5, n2(bw * 37.)));
  coral = mix(coral, vec3(.3, .16, .46), step(.74, n2(bw * 29. + 8.)));
  vec3 bedC = mix(w7.rgb, coral * (.5 + .7 * n2(bw * 90.)), reefBed * .8);
  float caus = smoothstep(.09, .0, abs(wav(bw * 52. + WIND * T * .03).z - wav(M2 * bw * 47. - WIND * T * .026).z));
  bedC *= AMB * .7 + KEYCOL * max(KEY.y, 0.) * (1. + 2.2 * caus * clearv);
  /* fish: small dark shapes in shoals under the shallows, all swimming one way; a few are gold in clear water */
  vec2 fg = w * 46. + vec2(T * .22, .12 * sin(T * .4 + w.x * 9.)), fid = floor(fg);
  vec2 ff = fract(fg) - .5 - (vec2(tx(fid + 3.), tx(fid + 19.)) - .5) * .6;
  float shoal = smoothstep(.5, .66, n2(w * 5. + vec2(T * .01, 4.)));
  float fish = smoothstep(.16, .06, length(ff * vec2(1., 3.))) * step(.5, tx(fid + 47.)) * shoal * smoothstep(.004, .02, depth) * smoothstep(.16, .05, depth) * (1. - ice) * clearv;
  vec3 body = bedC * through + deep * (1. - through);
  body = mix(body, mix(body * .25, vec3(.8, .3, .06) * lit, step(.8, tx(fid + 61.))), fish * .8);
  /* where a wave's crest stands between the eye and the sun, light shines through it, green-blue */
  body += mix(w8.rgb, vec3(.05, .35, .3), .5) * KEYCOL * pow(max(dot(rd, KEY), 0.), 3.) * max(crest - .5, 0.) * 1.6 * (.3 + rough);

  /* ice: a frozen lake, pale and dull, with long cracks; it mirrors much less */
  float crack = smoothstep(.03, .0, abs(n2(w * 9.) - .5)) + .6 * smoothstep(.02, .0, abs(n2(w * 23. + 4.) - .5));
  vec3 frozen = mix(vec3(.62, .72, .8), vec3(.3, .44, .56), clamp(crack, 0., 1.)) * (AMB * .9 + KEYCOL * .7);
  vec3 col = mix(mix(body, refl, fres), mix(frozen, refl, fres * .35), ice);

  /* sunlight glitters: each facet that tilts the sun to the eye flashes (GGX); far off they merge into a path */
  vec3 hv = normalize(SUN - rd), hm = normalize(MOON - rd);
  float a2 = r * r, nh = max(dot(n, hv), 0.), nm = max(dot(n, hm), 0.);
  float dS = a2 / (3.14159 * pow(nh * nh * (a2 - 1.) + 1., 2.)), dM = a2 / (3.14159 * pow(nm * nm * (a2 - 1.) + 1., 2.));
  float fs = .02 + .98 * pow(1. - max(dot(hv, -rd), 0.), 5.);
  col += (SUNCOL * dS * fs * .6 + NIGHT * vec3(.5, .6, .8) * dM * .012) * (1. - .7 * ice);

  /* foam: surf running up the beaches in lines, the open sea breaking white in a wind, a river along its banks */
  float surf = mix(.0012, .009, rough), lace = smoothstep(.42, .72, wav(w * 70. + WIND * T * .05).z);
  float runIn = fract(depth / surf * 1.6 + T * .2 + .35 * n2(w * 16.));
  float foam = smoothstep(surf, 0., depth) * (smoothstep(.72, .97, runIn) * lace + smoothstep(surf * .3, 0., depth) * mix(1., lace, inRiver));
  foam += smoothstep(.62, .86, crest) * smoothstep(.45, 1., rough) * slick * smoothstep(.3, .6, lace) * .8;
  foam += inRiver * (smoothstep(.72, .92, crest) * .35 + smoothstep(.006, .0, depth) * .6) * lace;
  foam = clamp(foam, 0., 1.) * (1. - ice);
  col = mix(col, vec3(.92, .94, .95) * (AMB * .95 + KEYCOL * (.4 + .8 * max(KEY.y, 0.))), foam * .85);
  /* by night the sea shines blue where it breaks on the shore, and in patches where it is stirred */
  col += NIGHT * vec3(.08, .55, .8) * (smoothstep(surf * 1.5, .0, depth) * .5 * smoothstep(.0, .03, max(depth, -terrL(w + vec2(0., .05)))) + .05 * smoothstep(.6, .8, n2(w * 9. + T * .05)) * smoothstep(.1, .0, depth)) * (1. - ice) * (1. - inRiver);

  /* boats: a few small sailing boats out on the deeper water, each with a lantern at night */
  vec2 bg = w * 8., bid = floor(bg);
  vec2 bf = fract(bg) - .5 - (vec2(tx(bid + 3.), tx(bid + 17.)) - .5) * .6;
  bf.x -= .12 * sin(T * .04 + tx(bid) * 6.3);
  float boat = step(.84, tx(bid + 41.)) * smoothstep(.03, .06, depth) * (1. - ice) * (1. - inRiver);
  float hull = smoothstep(.05, .03, length(bf * vec2(1., 2.4)));
  float sail = smoothstep(.028, .014, length((bf + vec2(.004, 0.)) * vec2(2.6, 1.3)));
  col = mix(col, vec3(.2, .13, .08) * (AMB + KEYCOL), hull * boat);
  col = mix(col, vec3(.92, .9, .84) * (AMB * .9 + KEYCOL), sail * boat);
  col += NIGHT * vec3(1., .6, .25) * boat * smoothstep(.09, .0, length(bf)) * .5;
  /* swans near the shore, each trailing a wake */
  vec2 sg = w * 16. + vec2(T * .02, 0.), sid = floor(sg);
  vec2 sf = fract(sg) - .5 - (vec2(tx(sid + 3.), tx(sid + 17.)) - .5) * .6;
  float swan = step(.8, tx(sid + 43.)) * smoothstep(.004, .012, depth) * smoothstep(.1, .05, depth) * (1. - ice) * (1. - inRiver);
  float bird = max(smoothstep(.07, .045, length(sf * vec2(1., 1.7))), smoothstep(.03, .015, length(sf - vec2(.07, 0.))));
  float wake = smoothstep(.02, .0, abs(abs(sf.y) + (sf.x + .05) * .5)) * step(sf.x, -.05) * smoothstep(-.45, -.1, sf.x);
  col += (AMB + KEYCOL) * .12 * wake * swan;
  col = mix(col, vec3(.95, .94, .9) * (AMB * .9 + KEYCOL), bird * swan);
  return col;
}
`;
