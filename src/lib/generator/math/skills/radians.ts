/*
 * m-radians: radians, degrees and the unit circle. Item models after the bank's own questions:
 * converting degrees to radians (kept exact, as k pi) and radians to degrees, sums and
 * multiples of angles given in radians, arc length s = r theta and sector area (1/2) r^2 theta
 * with theta in radians, and exact sine, cosine and tangent at special angles anywhere on the
 * unit circle, including large coterminal angles. Checks recompute with exact Sym or Math.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { S, Sym } from "../core/sym";
import { m, n, num, sym } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { deg, exactSinCos, exactTan, near, ratSlip, symAnswer, symSlip } from "./_geo2-common";

const SKILL = "m-radians";
const piFrac = (q: Frac) => sym(S.pi(q));
/** A value divided by pi (a slip from turning the conversion upside down). */
function overPi(q: Frac, why: string): Slip {
  const value = Sym.from([[{ pi: -1, rad: 1 }, q]]);
  const text = q.isInt() ? m(`\\frac{${num(q)}}{\\pi}`) : m(`\\frac{${q.n}}{${q.d}\\pi}`);
  return { text, value, why };
}
const ANGLE_NAMES = ["A", "B", "K", "R", "S", "T", "Z", "H", "F"];

export const convert: Template = {
  id: "rad.convert",
  skill: SKILL,
  label: "Convert between degrees and radians, with sums and multiples of angles",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind =
      format === "spr"
        ? rng.pick(["k", "r2d", "sum", "times"] as const)
        : rng.pick(["d2r", "d2r", "k", "r2d", "sum", "times"] as const);
    const A = rng.pick(ANGLE_NAMES);
    const common = [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
    if (kind === "d2r" || kind === "k") {
      const easy = rng.bool(0.4);
      const d = easy ? rng.pick(common) : 5 * rng.int(1, 144);
      need(easy || !common.includes(d), "uncommon angle");
      const k = F(d, 180);
      const isK = kind === "k";
      const slips: Slip[] = isK
        ? [
            ratSlip(F(d, 360), "you divided by 360 instead of 180"),
            ratSlip(F(180, d), "you turned the conversion fraction upside down"),
            ratSlip(F(d, 90), "you divided by 90 instead of 180"),
            ...(d < 180
              ? [ratSlip(F(180 - d, 180), "you converted the supplement of the angle")]
              : []),
          ]
        : [
            symSlip(S.pi(F(d, 360)), "you divided by 360 instead of 180"),
            symSlip(S.pi(F(d, 90)), "you divided by 90 instead of 180"),
            ratSlip(k, `you left out the ${m("\\pi")}`),
            ...(d < 180
              ? [symSlip(S.pi(F(180 - d, 180)), "you converted the supplement of the angle")]
              : []),
            overPi(
              F(180 * d),
              `you multiplied by ${m("\\frac{180}{\\pi}")} instead of ${m("\\frac{\\pi}{180}")}`
            ),
          ];
      return {
        format,
        stem: isK
          ? `The measure of angle ${m(A)} is ${m(deg(d))}, which is equivalent to ${m("k\\pi")} radians, where ${m("k")} is a constant. What is the value of ${m("k")}?`
          : `The measure of angle ${m(A)} is ${m(deg(d))}. What is the measure, in radians, of angle ${m(A)}?`,
        answer: isK ? numAnswer(k, m(num(k))) : symAnswer(S.pi(k)),
        slips,
        asks: isK
          ? `the number ${m("k")} in front of ${m("\\pi")} when ${m(deg(d))} is written in radians`
          : `the angle in radians`,
        steps: [
          {
            label: "Use the conversion factor",
            work: `${m(deg(180))} equals ${m("\\pi")} radians, so multiply degrees by ${m("\\frac{\\pi}{180}")}`,
          },
          {
            label: "Multiply and simplify",
            work: m(`${d} \\cdot \\frac{\\pi}{180} = \\frac{${d}\\pi}{180} = ${piFrac(k)}`),
          },
          ...(isK ? [{ label: `Read off ${m("k")}`, work: m(`k = ${num(k)}`) }] : []),
        ],
        check: `Convert back: ${m(`${piFrac(k)} \\cdot \\frac{180}{\\pi} = ${d}`)} degrees`,
        tip: `Multiply by ${m("\\frac{\\pi}{180}")} to go from degrees to radians and by ${m("\\frac{180}{\\pi}")} to go back; ${m(deg(180))} is ${m("\\pi")} radians`,
        hint: `How many degrees are in ${m("\\pi")} radians?`,
        difficulty: Math.min(3, (easy ? 1 : 2) + (isK && format === "spr" ? 1 : 0)),
        isCorrect: (cand) => !!cand.value && cand.value.mul(180).eq(isK ? Sym.rat(d) : S.pi(d)),
      };
    }
    if (kind === "r2d") {
      const q = rng.pick([2, 3, 4, 5, 6, 9, 10, 12, 15, 18, 20, 36]);
      const p = rng.int(1, 3 * q);
      const t = F(p, q);
      need(t.d === q || rng.bool(0.3), "keep most fractions as drawn");
      const D = t.mul(180);
      need(D.isInt(), "whole degrees");
      return {
        format,
        stem: `The measure of angle ${m(A)} is ${m(piFrac(t))} radians. What is the measure of angle ${m(A)}, in degrees?`,
        answer: numAnswer(D, m(num(D))),
        slips: [
          ratSlip(t.mul(90), `you used 90 degrees for each ${m("\\pi")} instead of 180`),
          ratSlip(t.mul(360), `you used 360 degrees for each ${m("\\pi")} instead of 180`),
          ...(D.lt(180) ? [ratSlip(F(180).sub(D), "you found the supplement of the angle")] : []),
          ratSlip(t.inv().mul(180), "you turned the fraction upside down"),
        ],
        asks: "the same angle measured in degrees",
        steps: [
          {
            label: `Replace ${m("\\pi")} with ${m(deg(180))}`,
            work: `${m("\\pi")} radians is ${m(deg(180))}`,
          },
          { label: "Multiply", work: m(`${num(t)} \\cdot 180 = ${num(D)}`) },
        ],
        check: `Convert back: ${m(`${num(D)} \\cdot \\frac{\\pi}{180} = ${piFrac(t)}`)}`,
        tip: `Replace ${m("\\pi")} with ${m("180")} to turn radians into degrees`,
        hint: `How many degrees is ${m("\\pi")} radians?`,
        difficulty: D.gt(360) ? 3 : 2,
        isCorrect: (cand) => !!cand.value && cand.value.mul(S.pi()).eq(S.pi(t.mul(180))),
      };
    }
    const [R, T] = rng.pick([
      ["R", "T"],
      ["S", "T"],
      ["A", "B"],
      ["P", "Q"],
    ]);
    if (kind === "sum") {
      const q1 = rng.pick([3, 4, 6, 12]);
      const q2 = rng.pick([4, 6, 12, 18]);
      const t1 = F(rng.int(1, 2 * q1 - 1), q1);
      const t2 = F(rng.int(1, 2 * q2 - 1), q2);
      need(!t1.eq(t2), "different angles");
      const tot = t1.add(t2);
      const D = tot.mul(180);
      need(D.isInt() && D.lt(720), "whole degrees");
      return {
        format,
        stem: `The measure of angle ${m(R)} is ${m(piFrac(t1))} radians. The measure of angle ${m(T)} is ${m(piFrac(t2))} radians greater than the measure of angle ${m(R)}. What is the measure of angle ${m(T)}, in degrees?`,
        answer: numAnswer(D, m(num(D))),
        slips: [
          ratSlip(t2.mul(180), `you converted only the increase of ${m(piFrac(t2))} radians`),
          ratSlip(t1.mul(180), `you found the measure of angle ${m(R)}`),
          ratSlip(D.mul(2), `you used 360 degrees for each ${m("\\pi")} instead of 180`),
          ratSlip(t1.sub(t2).abs().mul(180), "you subtracted the angles instead of adding"),
        ],
        asks: `the measure of angle ${m(T)} in degrees, where angle ${m(T)} is angle ${m(R)} plus the increase`,
        steps: [
          {
            label: "Add the radian measures",
            work: m(`${piFrac(t1)} + ${piFrac(t2)} = ${piFrac(tot)}`),
          },
          { label: "Convert to degrees", work: m(`${num(tot)} \\cdot 180 = ${num(D)}`) },
        ],
        check: `In degrees: angle ${m(R)} is ${m(num(t1.mul(180)))} and the increase is ${m(num(t2.mul(180)))}; ${m(`${num(t1.mul(180))} + ${num(t2.mul(180))} = ${num(D)}`)}`,
        tip: "Add angles in the same unit, then convert once at the end",
        hint: `Find the measure of angle ${m(T)} in radians first.`,
        difficulty: 4,
        isCorrect: (cand) =>
          near(cand, ((t1.toNumber() + t2.toNumber()) * Math.PI * 180) / Math.PI),
      };
    }
    const q = rng.pick([5, 6, 7, 9, 10, 11, 12, 13, 15, 18]);
    const p = rng.int(1, q - 1);
    const t = F(p, q);
    const mult = rng.int(2, 9);
    const D = t.mul(180 * mult);
    return {
      format,
      stem: `The measure of angle ${m(R)} is ${m(piFrac(t))} radians. The measure of angle ${m(T)} is ${n(mult)} times the measure of angle ${m(R)}. What is the measure of angle ${m(T)}, in degrees?`,
      answer: numAnswer(D, m(num(D))),
      slips: [
        ratSlip(t.mul(180), `you converted angle ${m(R)} and did not multiply by ${n(mult)}`),
        ratSlip(t.mul(90 * mult), `you used 90 degrees for each ${m("\\pi")} instead of 180`),
        ratSlip(t.mul(360 * mult), `you used 360 degrees for each ${m("\\pi")} instead of 180`),
        ratSlip(t.mul(180).add(mult), `you added ${n(mult)} instead of multiplying`),
      ],
      asks: `the measure of angle ${m(T)} in degrees`,
      steps: [
        {
          label: `Find angle ${m(T)} in radians`,
          work: m(`${mult} \\cdot ${piFrac(t)} = ${piFrac(t.mul(mult))}`),
        },
        { label: "Convert to degrees", work: m(`${num(t.mul(mult))} \\cdot 180 = ${num(D)}`) },
      ],
      check: `Angle ${m(R)} is ${m(`${num(t)} \\cdot 180 = ${num(t.mul(180))}`)} degrees, and ${m(`${mult} \\cdot ${num(t.mul(180))} = ${num(D)}`)}`,
      tip: `Replace ${m("\\pi")} with ${m("180")} to turn radians into degrees; scaling the angle first or last gives the same result`,
      hint: `What is ${m(piFrac(t))} radians in degrees?`,
      difficulty: D.isInt() ? 4 : 5,
      isCorrect: (cand) => near(cand, (mult * t.toNumber() * Math.PI * 180) / Math.PI),
    };
  },
};

export const arcSector: Template = {
  id: "rad.arc-sector",
  skill: SKILL,
  label: "Arc length s = r theta and sector area with the angle in radians",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const r = rng.int(2, 20);
    const withPi = format === "mc" && rng.bool(0.5);
    const theta: Sym = withPi
      ? S.pi(F(rng.int(1, 11), rng.pick([2, 3, 4, 6, 8, 9, 12])))
      : Sym.rat(F(rng.int(1, 15), rng.pick([1, 2, 3, 4, 5])));
    need(theta.toNumber() < 2 * Math.PI, "less than a full turn");
    const kind = rng.pick(["arc", "arc", "sector", "theta", "radius"] as const);
    const s = theta.mul(r);
    const area = theta.mul(F(r * r, 2));
    const tt = sym(theta);
    const unit = rng.pick(["centimeters", "inches", "meters", "feet"]);
    const O = rng.pick(["O", "P", "Q"]);
    let stem: string;
    let ans: Sym;
    let slips: Slip[];
    let steps: Draft["steps"];
    let check: string;
    let isCorrect: (a: Answer) => boolean;
    let difficulty: number;
    let asks: string;
    if (kind === "arc") {
      ans = s;
      stem = `A circle with center ${m(O)} has a radius of ${n(r)} ${unit}. A central angle of the circle measures ${m(tt)} radians. What is the length, in ${unit}, of the arc that the angle intercepts?`;
      slips = [
        symSlip(area, `you used the sector area formula ${m("\\frac{1}{2}r^2\\theta")}`),
        symSlip(theta.mul(2 * r), "you used the diameter in place of the radius"),
        symSlip(theta.divRat(r), "you divided the angle by the radius instead of multiplying"),
        symSlip(
          theta.mul(S.pi(2 * r)),
          `you multiplied by the circumference ${m("2\\pi r")} as well`
        ),
      ];
      steps = [
        {
          label: "Use the radian arc formula",
          work: `With the angle in radians, the arc length is ${m("s = r\\theta")}`,
        },
        { label: "Substitute", work: m(`s = ${r} \\cdot ${tt} = ${sym(s)}`) },
      ];
      check = `Dividing the arc length by the radius should give back the angle: ${m(`${sym(s)} \\div ${r} = ${tt}`)}`;
      isCorrect = (c) => !!c.value && c.value.eq(theta.mul(r));
      difficulty = 2;
      asks = "the arc length";
    } else if (kind === "sector") {
      ans = area;
      stem = `A circle with center ${m(O)} has a radius of ${n(r)} ${unit}. A sector of the circle has a central angle of ${m(tt)} radians. What is the area, in square ${unit}, of the sector?`;
      slips = [
        symSlip(s, `you found the arc length ${m("r\\theta")}`),
        symSlip(theta.mul(r * r), `you left out the ${m("\\frac{1}{2}")}`),
        symSlip(theta.mul(F(r, 2)), `you used ${m("r")} instead of ${m("r^2")}`),
        symSlip(theta.mul(2 * r * r), "you used the diameter in place of the radius"),
      ];
      steps = [
        {
          label: "Use the radian sector formula",
          work: `With the angle in radians, the sector area is ${m("\\frac{1}{2}r^2\\theta")}`,
        },
        {
          label: "Substitute",
          work: m(
            `\\frac{1}{2}(${r})^2 \\cdot ${tt} = ${num(F(r * r, 2))} \\cdot ${tt} = ${sym(area)}`
          ),
        },
      ];
      check = `A sector's area is also half the radius times its arc length, and the arc is ${m(`${r} \\cdot ${tt} = ${sym(s)}`)}: ${m(`\\frac{1}{2}(${r})\\left(${sym(s)}\\right) = ${sym(area)}`)}`;
      isCorrect = (c) => !!c.value && c.value.mul(2).eq(theta.mul(r * r));
      difficulty = 3;
      asks = "the area of the sector";
    } else if (kind === "theta") {
      ans = theta;
      stem = `In a circle with radius ${n(r)} ${unit}, an arc has length ${m(sym(s))} ${unit}. What is the measure, in radians, of the central angle that intercepts this arc?`;
      slips = [
        symSlip(s.mul(r), "you multiplied the arc length by the radius instead of dividing"),
        ...(s.isRat()
          ? [ratSlip(F(r).div(s.asRat()!), "you divided the radius by the arc length")]
          : []),
        symSlip(theta.divRat(2), "you used the diameter in place of the radius"),
        symSlip(
          theta.mul(2),
          `you used ${m("s = \\frac{1}{2}r\\theta")}, mixing in the sector area formula`
        ),
      ];
      steps = [
        {
          label: "Use the radian arc formula",
          work: m("s = r\\theta, \\text{ so } \\theta = \\frac{s}{r}"),
        },
        { label: "Substitute", work: m(`\\theta = \\frac{${sym(s)}}{${r}} = ${tt}`) },
      ];
      check = `${m(`${r} \\cdot ${tt} = ${sym(s)}`)}, the arc length given`;
      isCorrect = (c) => !!c.value && c.value.mul(r).eq(s);
      difficulty = 4;
      asks = "the central angle in radians";
    } else {
      ans = Sym.rat(r);
      stem = `A central angle of ${m(tt)} radians intercepts an arc of length ${m(sym(s))} ${unit}. What is the radius, in ${unit}, of the circle?`;
      slips = [
        symSlip(s.mul(theta), "you multiplied the arc length by the angle instead of dividing"),
        ratSlip(
          F(r, 2),
          `you used ${m("s = 2r\\theta")}, as if the formula held the circumference's 2`
        ),
        symSlip(s, "you gave the arc length"),
      ];
      steps = [
        {
          label: "Use the radian arc formula",
          work: m("s = r\\theta, \\text{ so } r = \\frac{s}{\\theta}"),
        },
        { label: "Substitute", work: m(`r = ${sym(s)} \\div ${tt} = ${r}`) },
      ];
      check = `${m(`${r} \\cdot ${tt} = ${sym(s)}`)}, the arc length given`;
      isCorrect = (c) => !!c.value && c.value.mul(theta).eq(s);
      difficulty = 4;
      asks = "the radius of the circle";
    }
    return {
      format,
      stem,
      answer: symAnswer(ans),
      slips,
      asks,
      steps,
      check,
      tip: `With the angle in radians, arc length is ${m("r\\theta")} and sector area is ${m("\\frac{1}{2}r^2\\theta")}; no ${m("360")} is needed`,
      hint: `Which formula links the radius, the arc and an angle in radians?`,
      difficulty: Math.min(5, difficulty + (format === "spr" && kind !== "arc" ? 1 : 0)),
      isCorrect,
    };
  },
};

export const unitCircle: Template = {
  id: "rad.unit-circle",
  skill: SKILL,
  label: "Exact sine, cosine and tangent at special angles in radians, around the unit circle",
  difficulty: [2, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const q = rng.pick([6, 4, 3, 6, 4]);
    const kind = rng.pick(["basic", "big", "big", "point", "times"] as const);
    const raw = rng.int(1, 2 * q - 1);
    const p =
      kind === "big"
        ? raw + 2 * q * rng.int(1, 40)
        : kind === "point"
          ? raw + 2 * q * rng.int(0, 30)
          : kind === "basic" && rng.bool(0.35)
            ? -raw
            : raw;
    const t = F(p, q);
    // Whole turns to remove so the angle lands in [0, 2 pi).
    const turns = Math.floor(t.toNumber() / 2);
    const base = t.sub(2 * turns);
    const d = base.mul(180).n;
    const degreesNow = t.mul(180);
    need(degreesNow.isInt(), "whole degrees");
    const fn =
      kind === "point"
        ? rng.pick(["cos", "sin"] as const)
        : rng.pick(["sin", "cos", "tan"] as const);
    need(!(fn === "tan" && (d === 90 || d === 270)), "tangent undefined");
    need(d % 90 !== 0 || rng.bool(0.25), "few quadrantal angles");
    const value = fn === "tan" ? exactTan(d) : exactSinCos(d)[fn];
    need(format === "mc" || value.isRat(), "typed answers are rational");
    const ref = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
    const quadrant = d < 90 ? 1 : d < 180 ? 2 : d < 270 ? 3 : 4;
    const A = rng.pick(ANGLE_NAMES);
    const fnOf = (g: "sin" | "cos" | "tan", x: number) =>
      g === "tan" ? exactTan(x) : exactSinCos(x)[g];
    const sign = value.toNumber() < 0 ? -1 : 1;
    const slips: Slip[] = [];
    if (!value.isZero())
      slips.push(
        symSlip(
          value.neg(),
          `you used the wrong sign for an angle in quadrant ${quadrant === 1 ? "I" : quadrant === 2 ? "II" : quadrant === 3 ? "III" : "IV"}`
        )
      );
    for (const g of ["sin", "cos", "tan"] as const) {
      if (g === fn || (g === "tan" && (d === 90 || d === 270))) continue;
      slips.push(
        symSlip(fnOf(g, d), `you found ${m(`\\${g}`)} of the angle instead of ${m(`\\${fn}`)}`)
      );
    }
    for (const other of [30, 45, 60]) {
      if (other === ref || ref % 90 === 0) continue;
      const v = fnOf(fn, other);
      slips.push(
        symSlip(
          v.mul(sign).mul(v.toNumber() < 0 ? -1 : 1),
          `you used the value for a ${m(deg(other))} reference angle instead of ${m(deg(ref))}`
        )
      );
    }
    if (fn === "tan" && value.isRat() && !value.isZero())
      slips.push(ratSlip(value.asRat()!.inv(), "you flipped the ratio"));
    let stem: string;
    let lead: Draft["steps"] = [];
    let difficulty = quadrant === 1 && d % 90 !== 0 ? 2 : 3;
    if (kind === "times") {
      const mult = rng.int(5, 90);
      const small = t.div(mult);
      stem = `The measure of angle ${m(A)} is ${m(piFrac(small))} radians. The measure of angle ${m("B")} is ${n(mult)} times the measure of angle ${m(A)}. What is the value of ${m(`\\${fn} B`)}?`;
      need(A !== "B", "distinct names");
      lead = [
        {
          label: `Find angle ${m("B")}`,
          work: m(`${mult} \\cdot ${piFrac(small)} = ${piFrac(t)}`),
        },
      ];
      difficulty = 6;
    } else if (kind === "point") {
      const coord = fn === "cos" ? "a" : "b";
      stem = `Point ${m("N")} lies on a unit circle in the ${m("xy")}-plane and has coordinates ${m("(1, 0)")}. Point ${m("O")} is the center of the circle at ${m("(0, 0)")}. Point ${m("M")} also lies on the unit circle, and the measure of angle ${m("NOM")}, measured counterclockwise from ${m("\\overline{ON}")}, is ${m(piFrac(t))} radians. If the coordinates of point ${m("M")} are ${m("(a, b)")}, what is the value of ${m(coord)}?`;
      lead = [
        {
          label: "Link the point to the angle",
          work: `On a unit circle, the point at angle ${m("\\theta")} from ${m("(1, 0)")} is ${m("(\\cos\\theta, \\sin\\theta)")}, so ${m(coord)} is ${m(`\\${fn}`)} of ${m(piFrac(t))}`,
        },
      ];
      difficulty += 1;
    } else {
      stem = rng.bool()
        ? `The measure of angle ${m(A)} is ${m(piFrac(t))} radians. What is the value of ${m(`\\${fn}(${A})`)}?`
        : `What is the exact value of ${m(`\\${fn}\\left(${piFrac(t)}\\right)`)}?`;
    }
    if (turns > 0) difficulty = Math.max(difficulty, 5);
    if (turns < 0) difficulty = Math.max(difficulty, 4);
    const steps: Draft["steps"] = [
      ...lead,
      ...(turns > 0
        ? [
            {
              label: "Remove full turns",
              work: `Each full turn is ${m("2\\pi")}, so subtract ${m(`${turns}(2\\pi) = ${piFrac(F(2 * turns))}`)}: ${m(`${piFrac(t)} - ${piFrac(F(2 * turns))} = ${piFrac(base)}`)}, which has the same sine, cosine and tangent`,
            },
          ]
        : turns < 0
          ? [
              {
                label: "Add a full turn",
                work: `A negative angle turns clockwise; adding ${m("2\\pi")} gives ${m(`${piFrac(t)} + 2\\pi = ${piFrac(base)}`)}, which has the same sine, cosine and tangent`,
              },
            ]
          : []),
      {
        label: "Find the reference angle",
        work: `${m(piFrac(base))} radians is ${m(deg(d))}, ${d % 90 === 0 ? "on an axis" : `in quadrant ${["I", "II", "III", "IV"][quadrant - 1]}, with reference angle ${m(deg(ref))}`}`,
      },
      {
        label: "Apply the value and sign",
        work: `${m(`\\${fn} ${deg(d)} = ${sym(value)}`)}${d % 90 === 0 ? "" : `, since ${m(`\\${fn}`)} is ${sign > 0 ? "positive" : "negative"} in quadrant ${["I", "II", "III", "IV"][quadrant - 1]}`}`,
      },
    ];
    const cs = exactSinCos(d);
    return {
      format,
      stem,
      answer: symAnswer(value),
      slips,
      asks:
        kind === "point"
          ? `the ${fn === "cos" ? "x" : "y"}-coordinate of the point, which is ${m(`\\${fn}`)} of the angle`
          : `the exact value of ${m(`\\${fn}`)} at the angle`,
      steps,
      check: `The point at ${m(deg(d))} on the unit circle is ${m(`(${sym(cs.cos)}, ${sym(cs.sin)})`)}, and ${m(`\\${fn}`)} of the angle is ${fn === "cos" ? `its ${m("x")}-coordinate` : fn === "sin" ? `its ${m("y")}-coordinate` : `its ${m("y")}-coordinate divided by its ${m("x")}-coordinate`}, ${m(sym(value))}`,
      tip: "Find the reference angle and the quadrant: the reference angle gives the size of the value and the quadrant gives its sign",
      hint:
        turns > 0
          ? `Subtract full turns of ${m("2\\pi")} first.`
          : turns < 0
            ? `Add ${m("2\\pi")} to get a positive angle first.`
            : "Change the angle to degrees, then find its quadrant.",
      difficulty: Math.min(6, difficulty),
      isCorrect: (cand) => {
        const x = t.toNumber() * Math.PI;
        const truth = fn === "sin" ? Math.sin(x) : fn === "cos" ? Math.cos(x) : Math.tan(x);
        return near(cand, Math.abs(truth) < 1e-9 ? 0 : truth);
      },
    };
  },
};

export const TEMPLATES: Template[] = [convert, arcSector, unitCircle];
