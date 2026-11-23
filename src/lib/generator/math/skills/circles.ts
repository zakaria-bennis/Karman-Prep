/*
 * m-circles: arcs, sectors and angles in a circle. Item models after the bank's own questions
 * for this skill: circumference, area and the total area of two circles; arc length and sector
 * area from the fraction of the circle (and back to the radius, angle or circumference);
 * central, inscribed and semicircle angles; tangents perpendicular to the radius, the
 * two-tangent kite, and chords bisected by the perpendicular from the center. Pi stays exact.
 */
import type { Label, Part } from "@/lib/figures/engine/spec";
import { need, numAnswer } from "../core/build";
import { geometry, point } from "../core/figures";
import { F, Frac } from "../core/frac";
import { S } from "../core/sym";
import { m, n, num, sym } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { angleAt, deg, onCircle, pos, ratSlip, sq, symAnswer, symSlip } from "./_geo2-common";
import { tangent } from "./_geo2-circ-tangent";

const SKILL = "m-circles";
const CENTERS = ["O", "P", "Q", "C", "K"];
const PAIRS: [string, string][] = [
  ["A", "B"],
  ["M", "N"],
  ["R", "S"],
  ["D", "E"],
  ["F", "G"],
];

function names(rng: { pick<T>(x: readonly T[]): T }) {
  const c = rng.pick(CENTERS);
  const [a, b] = rng.pick(PAIRS.filter((p) => !p.includes(c)));
  return { c, a, b };
}

const piText = (q: Frac) => sym(S.pi(q));

/** Circle with center c, radius drawn as 100, radii to a and b at the given page angles. */
function sectorFigure(o: {
  c: string;
  a: string;
  b: string;
  start: number;
  theta: number;
  angleText: string;
  radiusText?: string;
  shade?: boolean;
}) {
  const A = onCircle(0, 0, 100, o.start);
  const B = onCircle(0, 0, 100, o.start + o.theta);
  const parts: Part[] = [
    point(o.c, 0, 0),
    point(o.a, ...A, ["k"]),
    point(o.b, ...B, ["k"]),
    { kind: "circle", id: "k", center: o.c, radius: 100 },
    { kind: "segment", id: "ra", from: o.c, to: o.a },
    { kind: "segment", id: "rb", from: o.c, to: o.b },
    { kind: "angle", id: "ac", vertex: o.c, from: o.a, to: o.b },
  ];
  if (o.shade) parts.push({ kind: "sector", id: "sec", center: o.c, from: o.a, to: o.b });
  const labels: Label[] = [
    { text: o.c, on: o.c },
    { text: o.a, on: o.a },
    { text: o.b, on: o.b },
    { text: o.angleText, on: "ac" },
  ];
  if (o.radiusText) labels.push({ text: o.radiusText, on: "ra" });
  return geometry(parts, labels);
}

export const arcSector: Template = {
  id: "circ.arc-sector",
  skill: SKILL,
  label: "Arc length and sector area from the fraction of the circle, and back",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind =
      format === "spr"
        ? rng.pick(["arc-r", "arc-c", "sec-t"] as const)
        : rng.pick(["arc", "arc", "sec", "sec", "arc-r", "arc-c", "sec-t"] as const);
    const theta = rng.pick([
      20, 30, 36, 40, 45, 60, 72, 80, 90, 100, 108, 120, 135, 140, 150, 160, 200, 210, 225, 240,
      270, 300,
    ]);
    const r = rng.int(2, 30);
    const { c, a, b } = names(rng);
    const frac = F(theta, 360);
    const arc = frac.mul(2 * r); // times pi
    const area = frac.mul(r * r); // times pi
    const useFig = theta <= 160 && rng.bool(0.6);
    const start = rng.int(-30, 200);
    let stem: string;
    let ans: Answer;
    let slips: Slip[];
    let steps: Draft["steps"];
    let check: string;
    let isCorrect: Draft["isCorrect"];
    let asks: string;
    let difficulty: number;
    let figure;
    const setup = `A circle has center ${m(c)}, and points ${m(a)} and ${m(b)} lie on the circle.`;
    const fracStep = {
      label: "Find the fraction of the circle",
      work: `The central angle is ${m(deg(theta))}, so the ${theta < 180 ? "minor " : ""}arc is ${m(`\\frac{${theta}}{360} = ${num(frac)}`)} of the circle`,
    };
    if (kind === "arc" || kind === "sec") {
      const isArc = kind === "arc";
      const v = S.pi(isArc ? arc : area);
      ans = symAnswer(v);
      figure = useFig
        ? sectorFigure({
            c,
            a,
            b,
            start,
            theta,
            angleText: `${theta}°`,
            radiusText: String(r),
            shade: !isArc,
          })
        : undefined;
      const what = isArc
        ? `the length of ${theta < 180 ? "minor " : ""}arc ${m(`${a}${b}`)}`
        : figure
          ? "the area of the shaded sector"
          : `the area of the sector bounded by ${m(`\\overline{${c}${a}}`)}, ${m(`\\overline{${c}${b}}`)} and arc ${m(`${a}${b}`)}`;
      stem = `${setup} The radius of the circle is ${n(r)}, and the measure of angle ${m(`${a}${c}${b}`)} is ${m(deg(theta))}. What is ${what}?`;
      slips = isArc
        ? [
            symSlip(S.pi(frac.mul(4 * r)), "you used the diameter in place of the radius"),
            symSlip(
              S.pi(area),
              `you used the area ${m("\\pi r^2")} instead of the circumference ${m("2\\pi r")}`
            ),
            symSlip(
              S.pi(2 * r),
              "you found the whole circumference, not the part the angle cuts off"
            ),
            symSlip(
              S.pi(frac.mul(r)),
              `you used ${m("\\pi r")} instead of ${m("2\\pi r")} for the circumference`
            ),
          ]
        : [
            symSlip(
              S.pi(arc),
              `you found the arc length, using ${m("2\\pi r")} instead of ${m("\\pi r^2")}`
            ),
            symSlip(S.pi(r * r), "you found the area of the whole circle"),
            symSlip(S.pi(frac.mul(4 * r * r)), "you used the diameter in place of the radius"),
            symSlip(S.pi(F(theta * r * r, 180)), "you divided by 180 instead of 360"),
          ];
      steps = [
        fracStep,
        isArc
          ? {
              label: "Find the whole circumference",
              work: m(`2\\pi r = 2\\pi(${r}) = ${piText(F(2 * r))}`),
            }
          : {
              label: "Find the whole area",
              work: m(`\\pi r^2 = \\pi(${r})^2 = ${piText(F(r * r))}`),
            },
        {
          label: `Take ${num(frac) === "\\frac{1}{2}" ? "half" : "that fraction"} of it`,
          work: m(`${num(frac)} \\cdot ${piText(F(isArc ? 2 * r : r * r))} = ${sym(v)}`),
        },
      ];
      check = isArc
        ? `The arc length over the circumference should equal the angle over ${m("360")}: ${m(`\\frac{${sym(v)}}{${piText(F(2 * r))}} = ${num(frac)} = \\frac{${theta}}{360}`)}`
        : `The sector area over the circle's area should equal the angle over ${m("360")}: ${m(`\\frac{${sym(v)}}{${piText(F(r * r))}} = ${num(frac)} = \\frac{${theta}}{360}`)}`;
      isCorrect = (cand) =>
        !!cand.value && cand.value.mul(360).eq(S.pi(isArc ? 2 * r * theta : r * r * theta));
      asks = isArc
        ? `the length of the arc, a fraction of the circumference`
        : "the area of the sector, a fraction of the circle's area";
      difficulty = isArc ? (frac.n === 1 ? 2 : 3) : frac.n === 1 ? 3 : 4;
    } else if (kind === "arc-r") {
      ans = numAnswer(r, m(String(r)));
      stem = `${setup} The measure of arc ${m(`${a}${b}`)} is ${m(deg(theta))}, and the length of arc ${m(`${a}${b}`)} is ${m(piText(arc))} units. What is the length, in units, of the radius of the circle?`;
      slips = [
        ratSlip(2 * r, "you found the diameter, not the radius"),
        ratSlip(
          arc.mul(frac),
          "you multiplied the arc length by the fraction instead of dividing by it"
        ),
        symSlip(S.pi(2 * r), "you found the circumference, not the radius"),
        ratSlip(arc.mul(F(theta, 180)), "you multiplied by the fraction and dropped the 2"),
      ];
      steps = [
        fracStep,
        {
          label: "Find the whole circumference",
          work: `The arc is ${m(num(frac))} of the circumference, so the circumference is ${m(`${piText(arc)} \\div ${num(frac)} = ${piText(F(2 * r))}`)}`,
        },
        {
          label: "Find the radius",
          work: m(`2\\pi r = ${piText(F(2 * r))}, \\text{ so } r = ${r}`),
        },
      ];
      check = `With radius ${n(r)}, the arc is ${m(`${num(frac)} \\cdot 2\\pi(${r}) = ${piText(arc)}`)}, which matches`;
      isCorrect = (cand) =>
        !!cand.value &&
        cand.value
          .mul(2 * theta)
          .mul(S.pi())
          .eq(S.pi(arc.mul(360)));
      asks = "the radius, working back from the arc length";
      difficulty = 4;
    } else if (kind === "arc-c") {
      const per = rng.int(1, 9);
      // An arc length L with 360 * L / theta a whole number.
      const L = F(theta * per, 360).mul(rng.pick([2, 4, 6, 8, 10, 12]));
      need(L.isInt() && L.n > 0, "whole arc length");
      const C = L.mul(360).div(theta);
      need(C.isInt(), "whole circumference");
      ans = numAnswer(C, m(num(C)));
      const unit = rng.pick(["inches", "centimeters", "feet", "meters"]);
      stem = `${setup} The measure of arc ${m(`${a}${b}`)} is ${m(deg(theta))}, and the length of arc ${m(`${a}${b}`)} is ${n(L)} ${unit}. What is the circumference, in ${unit}, of the circle?`;
      slips = [
        ratSlip(L.mul(180).div(theta), "you divided by 180 instead of 360"),
        ratSlip(
          L.mul(theta).div(360),
          "you multiplied the arc length by the fraction instead of dividing by it"
        ),
        ratSlip(L, "you gave the arc length itself"),
        ratSlip(
          L.mul(360 - theta).div(theta),
          "you found the length of the rest of the circle, not the whole circle"
        ),
      ];
      steps = [
        fracStep,
        {
          label: "Scale the arc up to the circle",
          work: `${m(`${num(frac)} \\cdot C = ${num(L)}`)}, so ${m(`C = ${num(L)} \\div ${num(frac)} = ${num(C)}`)}`,
        },
      ];
      check = `${m(num(frac))} of ${n(C)} is ${m(`${num(C)} \\cdot ${num(frac)} = ${num(L)}`)}, the arc length given`;
      isCorrect = (cand) => !!cand.value && cand.value.mul(theta).eq(L.mul(360));
      asks = "the whole circumference, given one arc and its angle";
      difficulty = theta > 180 ? 5 : 4;
    } else {
      need(theta < 360, "angle");
      ans = numAnswer(theta, m(String(theta)));
      stem = `A circle has center ${m(c)} and a radius of ${n(r)}. Points ${m(a)} and ${m(b)} lie on the circle, and sector ${m(`${a}${c}${b}`)} has an area of ${m(piText(area))}. What is the measure, in degrees, of angle ${m(`${a}${c}${b}`)}${theta > 180 ? ", where the sector is the larger of the two sectors" : ""}?`;
      slips = [
        ratSlip(area.mul(180).div(r * r), "you divided by 180 instead of 360"),
        ratSlip(
          area.mul(180).div(r),
          `you treated the area as an arc length, using ${m("2\\pi r")}`
        ),
        ratSlip(360 - theta, "you found the angle of the other sector"),
        ratSlip(F(theta, 2), "you halved the angle"),
      ];
      steps = [
        { label: "Find the whole area", work: m(`\\pi r^2 = \\pi(${r})^2 = ${piText(F(r * r))}`) },
        {
          label: "Find the fraction of the circle",
          work: m(`\\frac{${piText(area)}}{${piText(F(r * r))}} = ${num(frac)}`),
        },
        { label: "Turn the fraction into degrees", work: m(`${num(frac)} \\cdot 360 = ${theta}`) },
      ];
      check = `A ${m(deg(theta))} sector of a circle with radius ${n(r)} has area ${m(`\\frac{${theta}}{360}\\pi(${r})^2 = ${piText(area)}`)}`;
      isCorrect = (cand) => !!cand.value && cand.value.mul(r * r).eq(area.mul(360));
      asks = "the central angle of the sector, in degrees";
      difficulty = 4;
    }
    return {
      format,
      stem,
      figure,
      answer: ans,
      slips,
      asks,
      steps,
      check,
      tip: "An arc or a sector is the fraction (central angle over 360) of the whole circumference or the whole area; set up that one proportion and solve for what is missing",
      hint:
        kind === "sec-t"
          ? "What fraction of the circle's whole area is the sector?"
          : `What fraction of the full ${m(deg(360))} is ${m(deg(theta))}?`,
      difficulty,
      isCorrect,
    };
  },
};

export const inscribed: Template = {
  id: "circ.inscribed-angle",
  skill: SKILL,
  label: "Central and inscribed angles, and the angle in a semicircle",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind = rng.pick(["c2i", "i2c", "arc", "semi"] as const);
    const O = rng.pick(["O", "P", "Q"]);
    const [A, B, C] = rng.pick([
      ["A", "B", "C"],
      ["R", "S", "T"],
      ["D", "E", "F"],
      ["J", "K", "L"],
      ["X", "Y", "Z"],
    ]);
    let stem: string;
    let ans: number;
    let slips: Slip[];
    let steps: Draft["steps"];
    let truth: number;
    let figure;
    let difficulty: number;
    let asks: string;
    if (kind !== "semi") {
      const x = rng.int(20, 80);
      const central = 2 * x;
      const Ap = onCircle(0, 0, 100, 270 - x);
      const Bp = onCircle(0, 0, 100, 270 + x);
      const Cp = onCircle(0, 0, 100, 90 + rng.int(-35, 35));
      truth = kind === "i2c" ? angleAt([0, 0], Ap, Bp) : angleAt(Cp, Ap, Bp);
      const given = kind === "c2i" ? central : kind === "i2c" ? x : central;
      ans = kind === "i2c" ? central : x;
      const parts: Part[] = [
        point(O, 0, 0),
        point(A, ...Ap, ["k"]),
        point(B, ...Bp, ["k"]),
        point(C, ...Cp, ["k"]),
        { kind: "circle", id: "k", center: O, radius: 100 },
        { kind: "segment", id: "ca", from: C, to: A },
        { kind: "segment", id: "cb", from: C, to: B },
      ];
      const labels: Label[] = [O, A, B, C].map((id) => ({ text: id, on: id }));
      if (kind !== "arc") {
        parts.push(
          { kind: "segment", id: "oa", from: O, to: A },
          { kind: "segment", id: "ob", from: O, to: B },
          { kind: "angle", id: "ao", vertex: O, from: A, to: B },
          { kind: "angle", id: "ai", vertex: C, from: A, to: B }
        );
        labels.push(
          { text: kind === "c2i" ? `${central}°` : "y°", on: "ao" },
          { text: kind === "c2i" ? "y°" : `${x}°`, on: "ai" }
        );
      } else {
        parts.push({ kind: "angle", id: "ai", vertex: C, from: A, to: B });
        labels.push({ text: "y°", on: "ai" });
      }
      figure = geometry(parts, labels);
      const where = `Points ${m(A)}, ${m(B)} and ${m(C)} lie on the circle with center ${m(O)} shown.`;
      stem =
        kind === "c2i"
          ? `${where} The measure of angle ${m(`${A}${O}${B}`)} is ${m(deg(central))}, and the measure of angle ${m(`${A}${C}${B}`)} is ${m("y^\\circ")}. What is the value of ${m("y")}?`
          : kind === "i2c"
            ? `${where} The measure of angle ${m(`${A}${C}${B}`)} is ${m(deg(x))}, and the measure of angle ${m(`${A}${O}${B}`)} is ${m("y^\\circ")}. What is the value of ${m("y")}?`
            : `${where} The measure of minor arc ${m(`${A}${B}`)} is ${m(deg(central))}, and the measure of angle ${m(`${A}${C}${B}`)} is ${m("y^\\circ")}. What is the value of ${m("y")}?`;
      slips =
        kind === "i2c"
          ? [
              ratSlip(x, "you made the central angle equal to the inscribed angle"),
              ratSlip(F(x, 2), "you halved the inscribed angle instead of doubling it"),
              ratSlip(180 - x, "you used the supplement of the inscribed angle"),
              ratSlip(360 - central, "you found the angle of the major arc"),
            ]
          : [
              ratSlip(
                given,
                `you made the inscribed angle equal to the ${kind === "arc" ? "arc" : "central angle"}`
              ),
              ratSlip(2 * given, "you doubled instead of halving"),
              ratSlip(
                180 - given,
                `you subtracted the ${kind === "arc" ? "arc" : "central angle"} from 180`
              ),
              ratSlip(180 - x, "you found the supplement of the inscribed angle"),
            ];
      steps = [
        {
          label: "Find the arc both angles cut off",
          work:
            kind === "arc"
              ? `Angle ${m(`${A}${C}${B}`)} has its vertex on the circle and cuts off arc ${m(`${A}${B}`)}, which measures ${m(deg(central))}`
              : `Central angle ${m(`${A}${O}${B}`)} and inscribed angle ${m(`${A}${C}${B}`)} both cut off arc ${m(`${A}${B}`)}`,
        },
        {
          label: "Use the inscribed angle rule",
          work:
            kind === "i2c"
              ? `An inscribed angle is half its arc, and a central angle equals its arc, so the central angle is twice the inscribed angle: ${m(`y = 2(${x}) = ${central}`)}`
              : `An inscribed angle is half of the arc it cuts off: ${m(`y = \\frac{${central}}{2} = ${x}`)}`,
        },
      ];
      difficulty = kind === "i2c" ? 3 : 2;
      asks =
        kind === "i2c"
          ? "the central angle that cuts off the same arc as the given inscribed angle"
          : "the inscribed angle, which is half of the arc it cuts off";
    } else {
      const alpha = rng.int(18, 72);
      need(alpha !== 45, "both angles equal");
      const Ap = onCircle(0, 0, 100, 180);
      const Bp = onCircle(0, 0, 100, 0);
      // Angle CAB cuts off arc CB, so C sits at a page angle of twice alpha from B.
      const Cq = onCircle(0, 0, 100, 2 * alpha);
      truth = angleAt(Bp, Ap, Cq);
      ans = 90 - alpha;
      figure = geometry(
        [
          point(O, 0, 0, ["ab"]),
          point(A, ...Ap, ["k"]),
          point(B, ...Bp, ["k"]),
          point(C, ...Cq, ["k"]),
          { kind: "circle", id: "k", center: O, radius: 100 },
          { kind: "segment", id: "ab", from: A, to: B },
          { kind: "segment", id: "ac", from: A, to: C },
          { kind: "segment", id: "bc", from: B, to: C },
          { kind: "angle", id: "aa", vertex: A, from: B, to: C },
          { kind: "angle", id: "ab2", vertex: B, from: C, to: A },
        ],
        [
          ...[O, A, B, C].map((id) => ({ text: id, on: id })),
          { text: `${alpha}°`, on: "aa" },
          { text: "y°", on: "ab2" },
        ]
      );
      stem = `In the figure shown, ${m(`\\overline{${A}${B}}`)} is a diameter of the circle with center ${m(O)}, and point ${m(C)} lies on the circle. The measure of angle ${m(`${C}${A}${B}`)} is ${m(deg(alpha))}, and the measure of angle ${m(`${A}${B}${C}`)} is ${m("y^\\circ")}. What is the value of ${m("y")}?`;
      slips = [
        ratSlip(alpha, "you made the two acute angles equal"),
        ratSlip(
          180 - alpha,
          `you subtracted only ${m(deg(alpha))} from ${m(deg(180))}, leaving out the right angle at ${m(C)}`
        ),
        ratSlip(90, `you put the right angle at ${m(B)} instead of at ${m(C)}`),
        ratSlip(
          2 * alpha,
          `you used the measure of arc ${m(`${B}${C}`)}, which is twice angle ${m(`${C}${A}${B}`)}`
        ),
      ];
      steps = [
        {
          label: `Find angle ${m(C)}`,
          work: `${m(`\\overline{${A}${B}}`)} is a diameter, so it cuts off a semicircle (${m(deg(180))}), and angle ${m(`${A}${C}${B}`)}, which cuts off that semicircle, is ${m(`\\frac{180}{2} = 90`)} degrees`,
        },
        {
          label: "Use the triangle angle sum",
          work: m(`y = 180 - 90 - ${alpha} = ${90 - alpha}`),
        },
      ];
      difficulty = 3;
      asks = `the third angle of a triangle drawn in a semicircle`;
    }
    return {
      format,
      stem,
      figure,
      answer: numAnswer(ans, m(String(ans))),
      slips,
      asks,
      steps,
      check:
        kind === "semi"
          ? `The angles of triangle ${m(`${A}${B}${C}`)} are ${m(deg(alpha2(ans)))}, ${m(deg(90))} and ${m(deg(ans))}, which add to ${m(deg(180))}`
          : kind === "i2c"
            ? `Halving the central angle ${m(deg(ans))} should give back the inscribed angle: ${m(`\\frac{${ans}}{2} = ${ans / 2}`)}`
            : `Doubling the inscribed angle should give the arc: ${m(`2(${ans}) = ${2 * ans}`)}`,
      tip: "An inscribed angle (vertex on the circle) is half the arc it cuts off, a central angle equals its arc, and any angle that cuts off a diameter is a right angle",
      hint: "Find the arc the angle cuts off, then decide whether the angle's vertex is at the center or on the circle.",
      difficulty: Math.min(4, difficulty + (format === "spr" ? 1 : 0)),
      isCorrect: (cand) => {
        const q = cand.value?.asRat();
        return !!q && Math.abs(q.toNumber() - truth) < 1e-6;
      },
    };
  },
};

/** The given angle of the semicircle triangle, from its answer. */
const alpha2 = (y: number) => 90 - y;

export const basics: Template = {
  id: "circ.basics",
  skill: SKILL,
  label: "Radius, diameter, circumference and area, and two circles together",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind =
      format === "spr"
        ? rng.pick(["circ", "area", "diam"] as const)
        : rng.pick(["circ", "area", "diam", "two", "two"] as const);
    const unit = rng.pick(["centimeters", "inches", "meters", "millimeters", "feet"]);
    if (kind === "two") {
      const r1 = rng.int(2, 15);
      const r2 = rng.int(2, 15);
      need(r1 !== r2, "different circles");
      const [N1, N2] = rng.pick([
        ["A", "B"],
        ["K", "L"],
        ["M", "N"],
        ["P", "Q"],
      ]);
      const total = r1 * r1 + r2 * r2;
      return {
        format,
        stem: `Circle ${m(N1)} has a radius of ${n(r1)} ${unit}. Circle ${m(N2)} has an area of ${m(piText(F(r2 * r2)))} square ${unit}. What is the total area, in square ${unit}, of circles ${m(N1)} and ${m(N2)}?`,
        answer: symAnswer(S.pi(total)),
        slips: [
          symSlip(
            S.pi(r1 + r2 * r2),
            `you added the radius of circle ${m(N1)} as if it were an area`
          ),
          symSlip(
            S.pi(2 * r1 + r2 * r2),
            `you used the circumference ${m("2\\pi r")} for circle ${m(N1)} instead of its area`
          ),
          symSlip(S.pi((r1 + r2) ** 2), "you added the two radii first, then found one area"),
          symSlip(S.pi(r1 + r2), "you added the two radii"),
        ],
        asks: "the sum of the two areas",
        steps: [
          {
            label: `Find the area of circle ${m(N1)}`,
            work: m(`\\pi r^2 = \\pi(${r1})^2 = ${piText(F(r1 * r1))}`),
          },
          {
            label: "Add the two areas",
            work: m(`${piText(F(r1 * r1))} + ${piText(F(r2 * r2))} = ${piText(F(total))}`),
          },
        ],
        check: `Circle ${m(N2)} has radius ${n(r2)}, since ${m(`\\pi(${r2})^2 = ${piText(F(r2 * r2))}`)}; ${m(`${r1}^2 + ${r2}^2 = ${total}`)}, so the total is ${m(piText(F(total)))}`,
        tip: `Area is ${m("\\pi r^2")} and circumference is ${m("2\\pi r")}; check which one each given number is before you add`,
        hint: `Is the number given for circle ${m(N1)} an area or a length?`,
        difficulty: 2,
        isCorrect: (cand) => !!cand.value && cand.value.eq(S.pi(r1 * r1).add(S.pi(r2 * r2))),
      };
    }
    const r = rng.int(2, 60);
    if (kind === "circ") {
      const askD = rng.bool();
      const ans = askD ? 2 * r : r;
      return {
        format,
        stem: `A circle has a circumference of ${m(piText(F(2 * r)))} ${unit}. What is the ${askD ? "diameter" : "radius"}, in ${unit}, of the circle?`,
        answer: numAnswer(ans, m(String(ans))),
        slips: [
          ratSlip(
            askD ? r : 2 * r,
            askD
              ? "you found the radius, not the diameter"
              : "you found the diameter, not the radius"
          ),
          ratSlip(
            askD ? 4 * r : F(r, 2),
            askD ? "you doubled the number in front of pi" : "you divided by 4 instead of by 2"
          ),
          symSlip(S.pi(ans), `you kept the ${m("\\pi")} in the answer`),
          symSlip(S.root(2 * r), `you used the area formula ${m("\\pi r^2")}`),
        ],
        asks: `the ${askD ? "diameter" : "radius"} of the circle`,
        steps: [
          {
            label: "Write the circumference formula",
            work: `${m("C = \\pi d = 2\\pi r")}, so ${m(`${piText(F(2 * r))} = \\pi d`)}`,
          },
          {
            label: `Solve for the ${askD ? "diameter" : "radius"}`,
            work: askD
              ? m(`d = ${2 * r}`)
              : m(`d = ${2 * r}, \\text{ so } r = \\frac{${2 * r}}{2} = ${r}`),
          },
        ],
        check: `A circle with ${askD ? "diameter" : "radius"} ${n(ans)} has circumference ${m(askD ? `\\pi(${ans}) = ${piText(F(2 * r))}` : `2\\pi(${ans}) = ${piText(F(2 * r))}`)}`,
        tip: `The number in front of ${m("\\pi")} in a circumference is the diameter; halve it for the radius`,
        hint: `Write ${m("C = \\pi d")} and compare.`,
        difficulty: askD ? 1 : 2,
        isCorrect: (cand) =>
          !!cand.value &&
          cand.value
            .mul(askD ? 1 : 2)
            .mul(S.pi())
            .eq(S.pi(2 * r)),
      };
    }
    if (kind === "area") {
      const askD = rng.bool(0.4);
      const ans = askD ? 2 * r : r;
      return {
        format,
        stem: `A circle has an area of ${m(piText(F(r * r)))} square ${unit}. What is the ${askD ? "diameter" : "radius"}, in ${unit}, of the circle?`,
        answer: numAnswer(ans, m(String(ans))),
        slips: [
          ratSlip(r * r, "you did not take the square root"),
          ratSlip(
            askD ? r : 2 * r,
            askD
              ? "you found the radius, not the diameter"
              : "you found the diameter, not the radius"
          ),
          ratSlip(F(r * r, 2), `you used the circumference formula ${m("2\\pi r")}`),
          ratSlip(2 * r * r, "you doubled the area"),
        ],
        asks: `the ${askD ? "diameter" : "radius"} of the circle`,
        steps: [
          {
            label: "Write the area formula",
            work: m(`\\pi r^2 = ${piText(F(r * r))}, \\text{ so } r^2 = ${r * r}`),
          },
          {
            label: "Take the square root",
            work: askD ? m(`r = ${r}, \\text{ so } d = 2(${r}) = ${2 * r}`) : m(`r = ${r}`),
          },
        ],
        check: `${m(`\\pi(${r})^2 = ${piText(F(r * r))}`)}, the area given`,
        tip: `Divide the area by ${m("\\pi")} and take the square root to get the radius`,
        hint: `Set ${m("\\pi r^2")} equal to the area.`,
        difficulty: askD ? 3 : 2,
        isCorrect: (cand) =>
          !!cand.value && pos(cand.value) && sq(cand.value.divRat(askD ? 2 : 1)).eq(r * r),
      };
    }
    const [F1, G1, H1] = rng.pick([
      ["F", "G", "H"],
      ["A", "B", "O"],
      ["J", "K", "L"],
      ["P", "Q", "C"],
    ]);
    return {
      format,
      stem: `Points ${m(F1)} and ${m(G1)} lie on a circle with center ${m(H1)}, and ${m(`\\overline{${F1}${G1}}`)} is a diameter of the circle. If the length of ${m(`\\overline{${F1}${G1}}`)} is ${n(2 * r)} ${unit}, what is the length, in ${unit}, of ${m(`\\overline{${F1}${H1}}`)}?`,
      answer: numAnswer(r, m(String(r))),
      slips: [
        ratSlip(2 * r, "you gave the length of the diameter"),
        ratSlip(4 * r, "you doubled the diameter"),
        ratSlip(F(r, 2), "you halved twice"),
        symSlip(S.pi(2 * r), "you found the circumference"),
      ],
      asks: `the length of ${m(`\\overline{${F1}${H1}}`)}, a radius`,
      steps: [
        {
          label: "Name the segment",
          work: `${m(H1)} is the center and ${m(F1)} is on the circle, so ${m(`\\overline{${F1}${H1}}`)} is a radius`,
        },
        { label: "Halve the diameter", work: m(`${F1}${H1} = \\frac{${2 * r}}{2} = ${r}`) },
      ],
      check: `Two radii, ${m(`${F1}${H1}`)} and ${m(`${H1}${G1}`)}, make up the diameter: ${m(`${r} + ${r} = ${2 * r}`)}`,
      tip: "Every segment from the center to the circle is a radius, and a diameter is two radii",
      hint: `Where is ${m(H1)} on the diameter?`,
      difficulty: 1,
      isCorrect: (cand) => !!cand.value && cand.value.mul(2).eq(2 * r),
    };
  },
};

export { tangent };

export const TEMPLATES: Template[] = [basics, arcSector, inscribed, tangent];
