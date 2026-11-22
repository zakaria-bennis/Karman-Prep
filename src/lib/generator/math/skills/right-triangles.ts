/*
 * m-right-triangles: the Pythagorean theorem and special right triangles. Item models after the
 * bank's own questions for this skill: a missing side from two sides (figure, words and
 * contexts such as ladders and screens), exact radical sides, the 45-45-90 and 30-60-90
 * families (squares and equilateral triangles too), and the altitude to the hypotenuse.
 * Every check is exact: squares of sides compared with Sym arithmetic, or a coordinate model.
 */
import { need, numAnswer } from "../core/build";
import { F } from "../core/frac";
import { S, Sym } from "../core/sym";
import { m, n, num, sym } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  deg,
  scaledTriples,
  shuffledNames,
  plain,
  pos,
  ratSlip,
  rightTriangle,
  sq,
  symAnswer,
  symSlip,
  triples,
} from "./_geo2-common";
import { altitude } from "./_geo2-rt-altitude";

const SKILL = "m-right-triangles";

const ok = (cand: Answer, test: (v: Sym) => boolean) =>
  !!cand.value && pos(cand.value) && test(cand.value);
const about = (x: number) => n(F(Math.round(x * 100), 100), { decimal: true });

export const pythagorean: Template = {
  id: "rt.pythagorean",
  skill: SKILL,
  label: "Find a missing side of a right triangle (whole-number answers, figures and contexts)",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const big = rng.bool(0.3);
    const { t, base, k } = rng.pick(big ? scaledTriples(61, 150) : scaledTriples(5, 60));
    const [a, b, c] = t;
    const askHyp = rng.bool(0.5);
    const mode = rng.pick(["figure", "figure", "words", "context"] as const);
    const names = shuffledNames(rng);
    const [r, h, v] = names;
    const [hl, vl] = rng.bool() ? [b, a] : [a, b];
    const knownIsH = rng.bool();
    const p = askHyp ? hl : knownIsH ? hl : vl; // a known leg
    const q = askHyp ? vl : c; // the other known side (a leg, or the hypotenuse)
    const ans = askHyp ? c : knownIsH ? vl : hl;
    let stem: string;
    let T = "x";
    let figure;
    if (mode === "figure") {
      const side = askHyp
        ? { horiz: String(hl), vert: String(vl), hyp: "x" }
        : knownIsH
          ? { horiz: String(hl), vert: "x", hyp: String(c) }
          : { horiz: "x", vert: String(vl), hyp: String(c) };
      figure = rightTriangle({ names, legs: [hl, vl], left: rng.bool(), side });
      const given = askHyp
        ? `the legs have lengths ${n(p)} and ${n(q)}`
        : `the hypotenuse has length ${n(q)} and one leg has length ${n(p)}`;
      stem = rng.bool()
        ? `In right triangle ${m(`${r}${h}${v}`)} shown, ${given}. What is the value of ${m("x")}?`
        : `The figure shows right triangle ${m(`${r}${h}${v}`)}, in which ${given}. What is the value of ${m("x")}?`;
    } else if (mode === "words") {
      const hs = `${r}${h}`;
      const vs = `${r}${v}`;
      const cs = `${h}${v}`;
      const given = askHyp
        ? `${m(`${hs} = ${hl}`)}, and ${m(`${vs} = ${vl}`)}`
        : knownIsH
          ? `${m(`${hs} = ${hl}`)}, and ${m(`${cs} = ${c}`)}`
          : `${m(`${vs} = ${vl}`)}, and ${m(`${cs} = ${c}`)}`;
      T = askHyp ? cs : knownIsH ? vs : hs;
      stem = `In right triangle ${m(`${r}${h}${v}`)}, angle ${m(r)} is a right angle, ${given}. What is the length of ${m(`\\overline{${T}}`)}?`;
    } else {
      T = "d";
      const lo = Math.min(hl, vl);
      const hi = Math.max(hl, vl);
      if (askHyp) {
        stem = rng.bool()
          ? `A rectangular screen is ${n(hi)} inches wide and ${n(lo)} inches tall. What is the length, in inches, of the screen's diagonal?`
          : `A hiker walks ${n(lo)} kilometers due north and then ${n(hi)} kilometers due east. What is the straight-line distance, in kilometers, between the hiker's starting point and ending point?`;
      } else {
        stem = rng.bool()
          ? `A ladder that is ${n(c)} feet long leans against a vertical wall, and its base rests on level ground ${n(p)} feet from the wall. How many feet above the ground is the top of the ladder?`
          : `A straight ramp is ${n(c)} meters long and covers a horizontal distance of ${n(p)} meters. How many meters does the ramp rise from bottom to top?`;
      }
    }
    const slips: Slip[] = askHyp
      ? [
          ratSlip(p + q, "you added the legs instead of adding their squares"),
          ratSlip(
            p * p + q * q,
            `you stopped at ${m(`${T}^2 = ${p * p + q * q}`)} without taking the square root`
          ),
          symSlip(
            S.root(Math.abs(q * q - p * p)),
            "you subtracted the squares of the legs, which finds a leg, not the hypotenuse"
          ),
          symSlip(S.root(2 * p + 2 * q), "you doubled each leg instead of squaring it"),
        ]
      : [
          symSlip(
            S.root(q * q + p * p),
            "you added the squares; to find a leg, subtract the square of the known leg from the square of the hypotenuse"
          ),
          ratSlip(q - p, "you subtracted the lengths instead of their squares"),
          ratSlip(
            q * q - p * p,
            `you stopped at ${m(`${T}^2 = ${q * q - p * p}`)} without taking the square root`
          ),
          ratSlip(q + p, "you added the two given lengths"),
        ];
    const steps = askHyp
      ? [
          {
            label: "Identify the hypotenuse",
            work: `The side across from the right angle is the hypotenuse, so ${m(T)} is the hypotenuse and ${n(p)} and ${n(q)} are the legs`,
          },
          {
            label: "Apply the Pythagorean theorem",
            work: m(`${T}^2 = ${p}^2 + ${q}^2 = ${p * p} + ${q * q} = ${p * p + q * q}`),
          },
          {
            label: "Take the square root",
            work: `${m(`${T} = \\sqrt{${p * p + q * q}} = ${ans}`)}, since a length is positive`,
          },
        ]
      : [
          {
            label: "Identify the hypotenuse",
            work: `The side across from the right angle has length ${n(q)}, so it is the hypotenuse and ${m(T)} is a leg`,
          },
          {
            label: "Apply the Pythagorean theorem",
            work: `${m(`${T}^2 + ${p}^2 = ${q}^2`)}, so ${m(`${T}^2 = ${q * q} - ${p * p} = ${q * q - p * p}`)}`,
          },
          {
            label: "Take the square root",
            work: `${m(`${T} = \\sqrt{${q * q - p * p}} = ${ans}`)}, since a length is positive`,
          },
        ];
    const triple = `${base[0]}, ${base[1]}, ${base[2]}`;
    const check =
      (k > 1
        ? `Dividing the sides ${m(`${a}, ${b}, ${c}`)} by ${n(k)} gives ${m(triple)}, a known Pythagorean triple, so the three lengths fit a right triangle. `
        : `${m(triple)} is a known Pythagorean triple. `) +
      `Also, the hypotenuse ${n(c)} is the longest side and is shorter than the sum of the legs, ${m(`${a} + ${b} = ${a + b}`)}`;
    const d = Math.min(3, 1 + (askHyp ? 0 : 1) + (big || c > 60 || mode === "context" ? 1 : 0));
    return {
      format,
      stem,
      figure,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks: askHyp
        ? "the length of the hypotenuse, the side across from the right angle"
        : "the length of a leg, given the hypotenuse and the other leg",
      steps,
      check,
      tip: rng.bool()
        ? `Know the common Pythagorean triples (${m("3, 4, 5")}, ${m("5, 12, 13")}, ${m("8, 15, 17")}, ${m("7, 24, 25")}) and their multiples; they skip the square root`
        : "Square the legs and add to get the square of the hypotenuse; to find a leg, subtract instead",
      hint: askHyp
        ? "Which side is across from the right angle? Write the Pythagorean theorem with that side alone."
        : "The hypotenuse is one of the given sides, so the missing side is a leg.",
      difficulty: d,
      isCorrect: (cand) =>
        ok(cand, (x) =>
          askHyp
            ? sq(x).eq(p * p + q * q)
            : sq(x)
                .add(p * p)
                .eq(q * q)
        ),
    };
  },
};

export const radical: Template = {
  id: "rt.radical",
  skill: SKILL,
  label: "Find a side of a right triangle as an exact radical",
  difficulty: [2, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const kind = rng.pick(["hyp", "hyp", "leg", "scaled"] as const);
    const names = shuffledNames(rng);
    const [r, h, v] = names;
    let stem: string;
    let figure;
    let ans: Sym;
    let slips: Slip[];
    let steps: Draft["steps"];
    let check: string;
    let isCorrect: Draft["isCorrect"];
    let difficulty: number;
    let asks: string;
    const rootTex = (s2: number, x: Sym) =>
      sym(x) === `\\sqrt{${s2}}` ? `\\sqrt{${s2}}` : `\\sqrt{${s2}} = ${sym(x)}`;
    if (kind === "hyp") {
      const p = rng.int(2, 30);
      const q = rng.int(2, 36);
      need(p !== q, "equal legs");
      const s2 = p * p + q * q;
      need(!Number.isInteger(Math.sqrt(s2)), "a triple gives a whole number");
      ans = S.root(s2);
      const useFig = rng.bool(0.6);
      const X = useFig ? "x" : `${h}${v}`;
      slips = [
        symSlip(S.root(p + q), "you added the legs under the root without squaring them"),
        symSlip(S.root(2 * p + 2 * q), "you doubled each leg instead of squaring it"),
        symSlip(S.root(p * q), "you multiplied the legs instead of adding their squares"),
        ratSlip(p + q, "you added the legs"),
        ratSlip(s2, "you did not take the square root"),
      ];
      steps = [
        {
          label: "Identify the hypotenuse",
          work: `The unknown side is across from the right angle, so the legs are ${n(p)} and ${n(q)}`,
        },
        {
          label: "Apply the Pythagorean theorem",
          work: m(`${X}^2 = ${p}^2 + ${q}^2 = ${p * p} + ${q * q} = ${s2}`),
        },
        { label: "Take the square root", work: m(`${X} = ${rootTex(s2, ans)}`) },
      ];
      check = `${m(X)} should be longer than the longer leg ${n(Math.max(p, q))} and shorter than ${m(`${p} + ${q} = ${p + q}`)}; ${m(sym(ans))} is about ${about(ans.toNumber())}, which is`;
      isCorrect = (c) => ok(c, (x) => sq(x).eq(s2));
      asks = "the exact length of the hypotenuse";
      difficulty = 2;
      figure = useFig
        ? rightTriangle({
            names,
            legs: [p, q],
            left: rng.bool(),
            side: { horiz: String(p), vert: String(q), hyp: "x" },
            showNames: false,
          })
        : undefined;
      stem = figure
        ? `In the right triangle shown, the legs have lengths ${n(p)} and ${n(q)}. What is the value of ${m("x")}?`
        : `In right triangle ${m(`${r}${h}${v}`)}, angle ${m(r)} is a right angle, ${m(`${r}${h} = ${p}`)}, and ${m(`${r}${v} = ${q}`)}. What is the length of ${m(`\\overline{${h}${v}}`)}?`;
    } else if (kind === "leg") {
      const hyp = rng.int(6, 45);
      const leg = rng.int(2, hyp - 1);
      const d2 = hyp * hyp - leg * leg;
      need(!Number.isInteger(Math.sqrt(d2)), "a triple gives a whole number");
      ans = S.root(d2);
      slips = [
        symSlip(
          S.root(hyp * hyp + leg * leg),
          "you added the squares; to find a leg, subtract them"
        ),
        ratSlip(hyp - leg, "you subtracted the lengths instead of their squares"),
        symSlip(S.root(2 * hyp - 2 * leg), "you doubled each length instead of squaring it"),
        ratSlip(d2, "you did not take the square root"),
      ];
      steps = [
        {
          label: "Identify the hypotenuse",
          work: `The side of length ${n(hyp)} is across from the right angle, so it is the hypotenuse and ${m("x")} is a leg`,
        },
        {
          label: "Apply the Pythagorean theorem",
          work: `${m(`x^2 + ${leg}^2 = ${hyp}^2`)}, so ${m(`x^2 = ${hyp * hyp} - ${leg * leg} = ${d2}`)}`,
        },
        { label: "Take the square root", work: m(`x = ${rootTex(d2, ans)}`) },
      ];
      check = `A leg is shorter than the hypotenuse: ${m(sym(ans))} is about ${about(ans.toNumber())}, less than ${n(hyp)}. And ${m(`(${sym(ans)})^2 + ${leg}^2 = ${d2} + ${leg * leg} = ${hyp * hyp}`)}`;
      isCorrect = (c) =>
        ok(c, (x) =>
          sq(x)
            .add(leg * leg)
            .eq(hyp * hyp)
        );
      asks = "the exact length of the missing leg";
      difficulty = 3;
      const horizIsLeg = rng.bool();
      figure = rightTriangle({
        names,
        legs: horizIsLeg ? [leg, ans.toNumber()] : [ans.toNumber(), leg],
        left: rng.bool(),
        side: horizIsLeg
          ? { horiz: String(leg), vert: "x", hyp: String(hyp) }
          : { horiz: "x", vert: String(leg), hyp: String(hyp) },
      });
      stem = `In right triangle ${m(`${r}${h}${v}`)} shown, the hypotenuse has length ${n(hyp)} and one leg has length ${n(leg)}. What is the value of ${m("x")}?`;
    } else {
      const [k1, k2, k3] = rng.pick(triples(5, 41));
      const root = rng.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 23]);
      const leg1 = S.root(root, k1);
      const leg2 = S.root(root, k2);
      ans = S.root(root, k3);
      slips = [
        symSlip(
          S.root(root, k1 + k2),
          "you added the legs instead of using the Pythagorean theorem"
        ),
        symSlip(S.root(root, k2 - k1), "you subtracted the legs"),
        ratSlip(
          k3,
          `you found ${m(`\\sqrt{${k1}^2 + ${k2}^2} = ${k3}`)} and dropped the ${m(`\\sqrt{${root}}`)}`
        ),
        ratSlip(k3 * k3 * root, "you did not take the square root"),
      ];
      steps = [
        {
          label: "Identify the hypotenuse",
          work: `Angle ${m(r)} is the right angle, so ${m(`\\overline{${h}${v}}`)} is the hypotenuse`,
        },
        {
          label: "Square each leg",
          work: `${m(`(${sym(leg1)})^2 = ${k1 * k1}(${root}) = ${k1 * k1 * root}`)} and ${m(`(${sym(leg2)})^2 = ${k2 * k2}(${root}) = ${k2 * k2 * root}`)}`,
        },
        {
          label: "Add and take the square root",
          work: `${m(`(${h}${v})^2 = ${k1 * k1 * root + k2 * k2 * root} = ${k3 * k3}(${root})`)}, so ${m(`${h}${v} = ${k3}\\sqrt{${root}}`)}`,
        },
      ];
      check = `Factor out ${m(`\\sqrt{${root}}`)}: the legs are ${n(k1)} and ${n(k2)} times ${m(`\\sqrt{${root}}`)}, and ${m(`${k1}, ${k2}, ${k3}`)} is a Pythagorean triple, so the hypotenuse is ${n(k3)} times ${m(`\\sqrt{${root}}`)}`;
      isCorrect = (c) => ok(c, (x) => sq(x).eq(sq(leg1).add(sq(leg2))));
      asks = `the length of the hypotenuse ${m(`\\overline{${h}${v}}`)}`;
      difficulty = 4;
      stem = `In triangle ${m(`${r}${h}${v}`)}, angle ${m(r)} is a right angle. The length of ${m(`\\overline{${r}${h}}`)} is ${m(sym(leg1))}, and the length of ${m(`\\overline{${r}${v}}`)} is ${m(sym(leg2))}. What is the length of ${m(`\\overline{${h}${v}}`)}?`;
    }
    return {
      format,
      stem,
      figure,
      answer: symAnswer(ans),
      slips,
      asks,
      steps,
      check,
      tip: "Simplify a square root by pulling out the largest perfect-square factor, and compare answer choices only after they are simplified",
      hint: "Find which side is across from the right angle before you square anything.",
      difficulty,
      isCorrect,
    };
  },
};

type Role = "short" | "long" | "hyp";
const RATIO: Record<Role, Sym> = { short: S.rat(1), long: S.root(3), hyp: S.rat(2) };
const ROLE_NAME: Record<Role, string> = {
  short: "shorter leg",
  long: "longer leg",
  hyp: "hypotenuse",
};

export const special: Template = {
  id: "rt.special",
  skill: SKILL,
  label: "45-45-90 and 30-60-90 triangles, squares and equilateral triangles",
  difficulty: [2, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const iso = rng.bool(0.45);
    // A 45-45-90 triangle uses "short" for each leg.
    const roles: Role[] = iso ? ["short", "hyp"] : ["short", "long", "hyp"];
    const known = rng.pick(roles);
    const asked = rng.pick(roles.filter((x) => x !== known));
    const ratio = (role: Role) => (iso ? (role === "hyp" ? S.root(2) : S.rat(1)) : RATIO[role]);
    const nInt = rng.int(2, 40);
    const radicalGiven = rng.bool(0.35) && known !== "short";
    const knownValue = radicalGiven
      ? ratio(known).mul(nInt)
      : S.rat(nInt * (known === "hyp" && !iso ? 2 : 1));
    // The unit (the shorter leg, or a leg) from the known side: divide by its ratio.
    const unitSq = sq(knownValue).divRat(sq(ratio(known)).asRat()!);
    const unit = iso
      ? known === "hyp"
        ? knownValue.mul(S.root(2, F(1, 2)))
        : knownValue
      : known === "short"
        ? knownValue
        : known === "hyp"
          ? knownValue.divRat(2)
          : knownValue.mul(S.root(3, F(1, 3)));
    const ans = unit.mul(ratio(asked));
    need(format === "mc" || ans.isRat(), "a typed answer must be a whole number");
    const wantWords = rng.bool(0.3);
    const words = wantWords && (iso || (known !== "short" && asked !== "short"));
    const names = shuffledNames(rng);
    let stem: string;
    let figure;
    if (words && iso) {
      const kn = known === "hyp" ? "diagonal" : "side length";
      const an = asked === "hyp" ? "diagonal" : "side length";
      stem = `A square has a ${kn} of ${m(sym(knownValue))} units. What is the ${an}, in units, of the square?`;
    } else if (words) {
      const kn = known === "hyp" ? "side length" : "height";
      const an = asked === "hyp" ? "side length" : "height";
      stem = `An equilateral triangle has a ${kn} of ${m(sym(knownValue))} units. What is the ${an}, in units, of the triangle?`;
    } else {
      const longH = rng.bool();
      const legOf = (role: Role): "horiz" | "vert" | "hyp" =>
        role === "hyp"
          ? "hyp"
          : iso
            ? rng.bool()
              ? "horiz"
              : "vert"
            : (role === "long") === longH
              ? "horiz"
              : "vert";
      const kSide = legOf(known);
      let aSide = legOf(asked);
      if (aSide === kSide) aSide = kSide === "horiz" ? "vert" : "horiz";
      const side: Record<string, string> = { [kSide]: plain(knownValue), [aSide]: "x" };
      const angle = iso
        ? rng.bool()
          ? { horiz: "45°" }
          : { vert: "45°" }
        : rng.bool()
          ? { [longH ? "horiz" : "vert"]: "30°" }
          : { [longH ? "vert" : "horiz"]: "60°" };
      figure = rightTriangle({
        names,
        legs: iso ? [1, 1] : longH ? [Math.sqrt(3), 1] : [1, Math.sqrt(3)],
        left: rng.bool(),
        side,
        angle,
      });
      const angleText = iso ? deg(45) : Object.values(angle)[0] === "30°" ? deg(30) : deg(60);
      stem = `In right triangle ${m(names.join(""))} shown, one angle measures ${m(angleText)} and the side marked ${m(sym(knownValue))} is the ${iso ? (known === "hyp" ? "hypotenuse" : "leg") : ROLE_NAME[known]}. What is the value of ${m("x")}?`;
    }
    const roleName = (role: Role) =>
      iso ? (role === "hyp" ? "hypotenuse" : "leg") : ROLE_NAME[role];
    const knownName = roleName(known);
    const askedName = roleName(asked);
    const ratioTex = iso ? "1 : 1 : \\sqrt{2}" : "1 : \\sqrt{3} : 2";
    // Each wrong factor, and the role the known side would need for it to be right.
    const factors: [Sym, string, Role | null][] = iso
      ? [
          [S.root(2), `multiplied by ${m("\\sqrt{2}")}`, "short"],
          [S.root(2, F(1, 2)), `divided by ${m("\\sqrt{2}")}`, "hyp"],
          [S.rat(2), "doubled it", null],
          [S.rat(F(1, 2)), "halved it", null],
          [S.root(3), `multiplied by ${m("\\sqrt{3}")}`, null],
        ]
      : [
          [S.rat(2), "multiplied by 2", "short"],
          [S.rat(F(1, 2)), "divided by 2", "hyp"],
          [S.root(3), `multiplied by ${m("\\sqrt{3}")}`, "short"],
          [S.root(3, F(1, 3)), `divided by ${m("\\sqrt{3}")}`, "long"],
          [S.root(2), `multiplied by ${m("\\sqrt{2}")}`, null],
          [S.root(2, F(1, 2)), `divided by ${m("\\sqrt{2}")}`, null],
        ];
    const others = roles.filter((x) => x !== asked).map((x) => [x, unit.mul(ratio(x))] as const);
    const slips: Slip[] = [];
    for (const [fac, verb, asIf] of factors) {
      const value = knownValue.mul(fac);
      if (value.eq(ans)) continue;
      const same = others.find(([, val]) => val.eq(value));
      const foreign = iso ? verb.includes("{3}") : verb.includes("{2}");
      const why = same
        ? `you ${verb}, which gives the ${roleName(same[0])}, not the ${askedName}`
        : foreign
          ? `you ${verb}, a ratio from the other special right triangle`
          : asIf && asIf !== known
            ? `you ${verb} as if the side of length ${m(sym(knownValue))} were the ${roleName(asIf)}`
            : `you ${verb}, but the sides are in the ratio ${m(ratioTex)}`;
      slips.push(symSlip(value, why));
    }
    slips.sort((x, y) => Number(/gives the/.test(y.why)) - Number(/gives the/.test(x.why)));
    const what = iso ? "leg, leg, hypotenuse" : "shorter leg, longer leg, hypotenuse";
    const intro = words
      ? iso
        ? "A diagonal cuts a square into two isosceles right triangles: the sides are the legs and the diagonal is the hypotenuse. "
        : "The height of an equilateral triangle cuts it into two 30-60-90 triangles: a side is the hypotenuse, the height is the longer leg, and half a side is the shorter leg. "
      : "";
    const unitName = iso ? "leg" : "shorter leg";
    const steps = [
      {
        label: "Recognize the special triangle",
        work: `${intro}The sides are in the ratio ${m(ratioTex)} (${what})`,
      },
      ...(known === "short"
        ? []
        : [
            {
              label: `Find the ${unitName}`,
              work: `The ${knownName} is ${m(sym(knownValue))}, so the ${unitName} is ${m(`${sym(knownValue)} \\div ${sym(ratio(known))} = ${sym(unit)}`)}`,
            },
          ]),
      ...(asked === "short"
        ? []
        : [
            {
              label: `Find the ${askedName}`,
              work: `Multiply the ${unitName} by ${m(sym(ratio(asked)))}: ${m(`${sym(unit)} \\cdot ${sym(ratio(asked))} = ${sym(ans)}`)}`,
            },
          ]),
    ];
    const sq0 = roles.map((x) => num(sq(unit.mul(ratio(x))).asRat()!));
    const check = iso
      ? `By the Pythagorean theorem, leg squared plus leg squared should be the hypotenuse squared: ${m(`${sq0[0]} + ${sq0[0]} = ${sq0[1]}`)}`
      : `By the Pythagorean theorem, ${m(`${sq0[0]} + ${sq0[1]} = ${sq0[2]}`)}, so the three sides fit a right triangle, and the hypotenuse is twice the shorter leg`;
    let d = iso ? (asked === "hyp" ? 2 : 3) : known === "short" ? 3 : 4;
    if (radicalGiven) d += 1;
    if (words) d += 1;
    const wordName = (role: Role) =>
      iso
        ? role === "hyp"
          ? "diagonal"
          : "side length"
        : role === "hyp"
          ? "side length"
          : "height";
    return {
      format,
      stem,
      figure,
      answer: symAnswer(ans),
      slips,
      asks: words
        ? `the ${wordName(asked)}, given the ${wordName(known)}`
        : `the ${askedName} of a ${iso ? "45-45-90" : "30-60-90"} triangle, given the ${knownName}`,
      steps,
      check,
      tip: `In a 45-45-90 triangle the hypotenuse is a leg times ${m("\\sqrt{2}")}; in a 30-60-90 triangle the hypotenuse is twice the shorter leg and the longer leg is the shorter leg times ${m("\\sqrt{3}")}`,
      hint: iso
        ? "Use the side ratio of a 45-45-90 triangle."
        : "Find the shorter leg first; the other two sides follow from it.",
      difficulty: Math.max(2, Math.min(6, d)),
      isCorrect: (cand) => ok(cand, (x) => sq(x).eq(unitSq.mul(sq(ratio(asked))))),
    };
  },
};

export { altitude };

export const TEMPLATES: Template[] = [pythagorean, radical, special, altitude];
