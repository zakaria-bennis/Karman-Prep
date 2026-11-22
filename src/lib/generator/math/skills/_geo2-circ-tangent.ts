/*
 * m-circles, continued: tangents perpendicular to the radius, the two-tangent kite, and chords
 * bisected by the perpendicular from the center. Split from circles.ts to keep files short;
 * circles.ts lists it in TEMPLATES.
 */
import type { Mark } from "@/lib/figures/engine/spec";
import { numAnswer } from "../core/build";
import { geometry, point } from "../core/figures";
import { F } from "../core/frac";
import { S } from "../core/sym";
import { m, n, num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import { pos, ratSlip, scaledTriples, sq, symSlip, triples } from "./_geo2-common";

const SKILL = "m-circles";
type Pt = [number, number];

export const tangent: Template = {
  id: "circ.tangent",
  skill: SKILL,
  label: "Tangents meet the radius at a right angle; chords and the perpendicular from the center",
  difficulty: [3, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind = rng.pick(["tan", "tan", "dist", "kite", "chord", "chord"] as const);
    const O = rng.pick(["O", "Q", "C"]);
    if (kind === "kite") {
      const [p, q, h] = rng.pick(triples(25, 400));
      const k = h < 100 ? rng.int(2, Math.max(2, Math.floor(400 / h))) : 1;
      const [rr, t] = (rng.bool() ? [p, q] : [q, p]).map((x) => x * k);
      const dist = h * k;
      const per = 2 * rr + 2 * t;
      const [A, B, P] = rng.pick([
        ["A", "B", "P"],
        ["M", "N", "H"],
        ["R", "S", "T"],
        ["D", "E", "F"],
      ]);
      const unit = rng.pick(["millimeters", "centimeters", "inches"]);
      return {
        format,
        stem: `A circle has center ${m(O)}, and points ${m(A)} and ${m(B)} lie on the circle. Segments ${m(`${A}${P}`)} and ${m(`${B}${P}`)} are tangent to the circle at ${m(A)} and ${m(B)}, respectively. The radius of the circle is ${n(rr)} ${unit}, and the perimeter of quadrilateral ${m(`${O}${A}${P}${B}`)} is ${n(per)} ${unit}. What is the distance, in ${unit}, between points ${m(O)} and ${m(P)}?`,
        answer: numAnswer(dist, m(num(dist))),
        slips: [
          ratSlip(
            t,
            `you found the length of a tangent segment, ${m(`${A}${P}`)}, not ${m(`${O}${P}`)}`
          ),
          ratSlip(rr + t, "you added the radius and the tangent length"),
          ratSlip(F(per, 2), "you took half the perimeter"),
          ratSlip(per - 2 * rr, "you found the two tangent segments together"),
        ],
        asks: `the distance ${m(`${O}${P}`)}, the hypotenuse of the right triangle ${m(`${O}${A}${P}`)}`,
        steps: [
          {
            label: "Find the tangent length",
            work: `The quadrilateral has two radii of ${n(rr)} and two equal tangent segments, so ${m(`2(${rr}) + 2(${A}${P}) = ${per}`)} and ${m(`${A}${P} = \\frac{${per} - ${2 * rr}}{2} = ${t}`)}`,
          },
          {
            label: "Spot the right angle",
            work: `A tangent is perpendicular to the radius at the point of tangency, so triangle ${m(`${O}${A}${P}`)} has a right angle at ${m(A)}`,
          },
          {
            label: `Find ${m(`${O}${P}`)}`,
            work: m(`${O}${P} = \\sqrt{${rr}^2 + ${t}^2} = \\sqrt{${rr * rr + t * t}} = ${dist}`),
          },
        ],
        check: `${m(`${rr}, ${t}, ${dist}`)} is ${k > 1 ? `${n(k)} times the Pythagorean triple ${m(`${p < q ? p : q}, ${p < q ? q : p}, ${h}`)}` : "a Pythagorean triple"}, and ${m(`${O}${P}`)} is longer than both ${n(rr)} and ${n(t)}, as a hypotenuse must be`,
        tip: "Draw the radius to each point of tangency: it makes a right angle with the tangent, and the two tangent segments from one outside point are equal",
        hint: "Two sides of the quadrilateral are radii. What do the other two have in common?",
        difficulty: dist > 1000 ? 7 : 6,
        isCorrect: (cand) =>
          !!cand.value && pos(cand.value) && sq(cand.value).eq(rr * rr + ((per - 2 * rr) / 2) ** 2),
      };
    }
    const tri = rng.pick(scaledTriples(5, 100)).t;
    const [l1, l2, hyp] = rng.bool() ? [tri[0], tri[1], tri[2]] : [tri[1], tri[0], tri[2]];
    if (kind === "tan" || kind === "dist") {
      const [T, P] = rng.pick([
        ["T", "P"],
        ["A", "B"],
        ["R", "S"],
      ]);
      const rr = l1;
      const t = l2;
      const ratio = Math.min(2.4, Math.max(0.7, t / rr));
      const Tp: Pt = [0, -100];
      const Pp: Pt = [100 * ratio, -100];
      const askTan = kind === "tan";
      const figure = geometry(
        [
          point(O, 0, 0),
          point(T, ...Tp, ["k"]),
          point(P, ...Pp),
          { kind: "circle", id: "k", center: O, radius: 100 },
          { kind: "segment", id: "ot", from: O, to: T },
          { kind: "segment", id: "tp", from: T, to: P },
          { kind: "segment", id: "op", from: O, to: P },
        ],
        [
          ...[O, T, P].map((id) => ({ text: id, on: id })),
          { text: String(rr), on: "ot" },
          { text: askTan ? "x" : String(t), on: "tp" },
          { text: askTan ? String(hyp) : "x", on: "op" },
        ]
      );
      const ans = askTan ? t : hyp;
      return {
        format,
        stem: `In the figure, ${m(`\\overline{${T}${P}}`)} is tangent to the circle with center ${m(O)} at point ${m(T)}, ${m(`${O}${T} = ${rr}`)}, and ${askTan ? m(`${O}${P} = ${hyp}`) : m(`${T}${P} = ${t}`)}. What is the value of ${m("x")}?`,
        figure,
        answer: numAnswer(ans, m(String(ans))),
        slips: askTan
          ? [
              symSlip(
                S.root(hyp * hyp + rr * rr),
                `you added the squares, treating ${m(`${O}${P}`)} as a leg`
              ),
              ratSlip(hyp - rr, "you subtracted the lengths instead of their squares"),
              ratSlip(hyp + rr, "you added the two lengths"),
              ratSlip(hyp * hyp - rr * rr, "you did not take the square root"),
            ]
          : [
              ratSlip(rr + t, "you added the radius and the tangent length"),
              symSlip(
                S.root(Math.abs(t * t - rr * rr)),
                "you subtracted the squares instead of adding them"
              ),
              ratSlip(rr * rr + t * t, "you did not take the square root"),
              ratSlip(
                t,
                "you assumed the segment from the center has the same length as the tangent"
              ),
            ],
        asks: askTan
          ? `the length of the tangent segment ${m(`${T}${P}`)}`
          : `the distance ${m(`${O}${P}`)} from the center to the outside point`,
        steps: [
          {
            label: "Spot the right angle",
            work: `A tangent is perpendicular to the radius drawn to the point of tangency, so angle ${m(`${O}${T}${P}`)} is a right angle and ${m(`\\overline{${O}${P}}`)} is the hypotenuse`,
          },
          {
            label: "Apply the Pythagorean theorem",
            work: askTan
              ? `${m(`${rr}^2 + x^2 = ${hyp}^2`)}, so ${m(`x^2 = ${hyp * hyp} - ${rr * rr} = ${t * t}`)}`
              : m(`x^2 = ${rr}^2 + ${t}^2 = ${rr * rr} + ${t * t} = ${hyp * hyp}`),
          },
          { label: "Take the square root", work: m(`x = ${ans}`) },
        ],
        check: `${m(`${rr}^2 + ${t}^2 = ${rr * rr + t * t} = ${hyp}^2`)}, and the hypotenuse ${n(hyp)} is the longest side`,
        tip: "Whenever a tangent appears, draw the radius to the point of tangency; it makes a right angle, so the Pythagorean theorem applies",
        hint: `What angle does a tangent make with the radius at ${m(T)}?`,
        difficulty: 3 + (format === "spr" ? 1 : 0),
        isCorrect: (cand) =>
          !!cand.value &&
          pos(cand.value) &&
          (askTan
            ? sq(cand.value)
                .add(rr * rr)
                .eq(hyp * hyp)
            : sq(cand.value).eq(rr * rr + t * t)),
      };
    }
    // A chord bisected by the perpendicular from the center.
    const [A, B, M] = rng.pick([
      ["A", "B", "M"],
      ["R", "S", "T"],
      ["D", "E", "F"],
    ]);
    const d = l1;
    const half = l2;
    const rr = hyp;
    const askChord = rng.bool(0.6);
    const yy = (100 * d) / rr;
    const xx = (100 * half) / rr;
    const figure = geometry(
      [
        point(O, 0, 0),
        point(A, -xx, yy, ["k"]),
        point(B, xx, yy, ["k"]),
        point(M, 0, yy, ["ab"]),
        { kind: "circle", id: "k", center: O, radius: 100 },
        { kind: "segment", id: "ab", from: A, to: B },
        { kind: "segment", id: "om", from: O, to: M },
        { kind: "segment", id: "oa", from: O, to: A },
        { kind: "angle", id: "am", vertex: M, from: O, to: B },
      ],
      [
        ...[O, A, B, M].map((id) => ({ text: id, on: id })),
        { text: String(d), on: "om" },
        { text: askChord ? String(rr) : "r", on: "oa" },
      ],
      [{ kind: "right_angle", on: ["am"] }] as Mark[]
    );
    const ans = askChord ? 2 * half : rr;
    return {
      format,
      stem: askChord
        ? `In the circle with center ${m(O)} shown, ${m(`\\overline{${O}${M}}`)} is perpendicular to chord ${m(`\\overline{${A}${B}}`)}, ${m(`${O}${M} = ${d}`)}, and the radius is ${n(rr)}. What is the length of chord ${m(`\\overline{${A}${B}}`)}?`
        : `In the circle with center ${m(O)} shown, ${m(`\\overline{${O}${M}}`)} is perpendicular to chord ${m(`\\overline{${A}${B}}`)}, ${m(`${O}${M} = ${d}`)}, and ${m(`${A}${B} = ${2 * half}`)}. What is the radius ${m("r")} of the circle?`,
      figure,
      answer: numAnswer(ans, m(String(ans))),
      slips: askChord
        ? [
            ratSlip(half, `you found ${m(`${A}${M}`)}, half of the chord`),
            symSlip(
              S.root(rr * rr + d * d, 2),
              "you added the squares instead of subtracting them"
            ),
            ratSlip(2 * (rr - d), "you subtracted the lengths instead of their squares"),
            ratSlip(rr + d, "you added the radius and the distance"),
          ]
        : [
            symSlip(
              S.root(4 * half * half + d * d),
              `you used the whole chord ${n(2 * half)} as a leg instead of half of it`
            ),
            ratSlip(half + d, "you added the legs instead of their squares"),
            ratSlip(2 * rr, "you found the diameter"),
            ratSlip(rr * rr, "you did not take the square root"),
          ],
      asks: askChord ? "the length of the whole chord" : "the radius of the circle",
      steps: [
        {
          label: "Halve the chord",
          work: `A segment from the center perpendicular to a chord cuts the chord in half, so ${m(`${A}${M} = ${M}${B}`)}${askChord ? "" : ` and ${m(`${A}${M} = \\frac{${2 * half}}{2} = ${half}`)}`}`,
        },
        {
          label: "Use the right triangle",
          work: askChord
            ? `In right triangle ${m(`${O}${M}${A}`)}, the radius ${m(`${O}${A} = ${rr}`)} is the hypotenuse: ${m(`${A}${M} = \\sqrt{${rr}^2 - ${d}^2} = \\sqrt{${rr * rr - d * d}} = ${half}`)}`
            : `In right triangle ${m(`${O}${M}${A}`)}, the radius ${m(`${O}${A}`)} is the hypotenuse: ${m(`r = \\sqrt{${half}^2 + ${d}^2} = \\sqrt{${half * half + d * d}} = ${rr}`)}`,
        },
        ...(askChord
          ? [{ label: "Double it", work: m(`${A}${B} = 2(${half}) = ${2 * half}`) }]
          : []),
      ],
      check: `${m(`${half}^2 + ${d}^2 = ${half * half + d * d} = ${rr}^2`)}, so the half chord, the distance from the center and the radius fit a right triangle`,
      tip: "The perpendicular from the center to a chord bisects the chord, which makes a right triangle with the radius as its hypotenuse",
      hint: `Draw the radius ${m(`\\overline{${O}${A}}`)}. What kind of triangle do you get?`,
      difficulty: askChord ? 4 : 5,
      isCorrect: (cand) =>
        !!cand.value &&
        pos(cand.value) &&
        (askChord
          ? sq(cand.value.divRat(2))
              .add(d * d)
              .eq(rr * rr)
          : sq(cand.value).eq(half * half + d * d)),
    };
  },
};
