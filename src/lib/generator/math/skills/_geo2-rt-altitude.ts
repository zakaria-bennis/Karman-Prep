/*
 * m-right-triangles, continued: the altitude to the hypotenuse (similar right triangles).
 * Split from right-triangles.ts to keep files short; right-triangles.ts lists it in TEMPLATES.
 */
import { need, numAnswer } from "../core/build";
import { geometry, point } from "../core/figures";
import { F } from "../core/frac";
import { m, n, num } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import { TRIANGLE_NAMES, near, ratSlip, triples } from "./_geo2-common";

const SKILL = "m-right-triangles";
const about = (x: number) => n(F(Math.round(x * 100), 100), { decimal: true });

export const altitude: Template = {
  id: "rt.altitude",
  skill: SKILL,
  label: "The altitude to the hypotenuse: similar right triangles",
  difficulty: [5, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const [P, Q, R] = rng.pick(TRIANGLE_NAMES.filter((t) => !t.includes("D")));
    const D = "D";
    if (rng.bool(0.55)) {
      const a = rng.int(6, 40);
      const e = rng.int(3, 30);
      need(a !== e, "equal numbers");
      const flip = rng.bool(0.3);
      const ans = flip ? F(a, a + e) : F(a + e, a);
      const target = flip ? `\\frac{${Q}${D}}{${Q}${R}}` : `\\frac{${Q}${R}}{${Q}${D}}`;
      const qr = Math.sqrt((a + e) ** 2 - a * a);
      const qd = (a * qr) / (a + e);
      return {
        format,
        stem: `Triangle ${m(`${P}${Q}${R}`)} has a right angle at ${m(Q)}. Point ${m(D)} lies on ${m(`\\overline{${P}${R}}`)}, and ${m(`\\overline{${Q}${D}}`)} is perpendicular to ${m(`\\overline{${P}${R}}`)}. If ${m(`${P}${Q} = ${a}`)} and the length of ${m(`\\overline{${P}${R}}`)} is ${n(e)} more than the length of ${m(`\\overline{${P}${Q}}`)}, what is the value of ${m(target)}?`,
        answer: numAnswer(ans, m(num(ans))),
        slips: [
          ratSlip(
            ans.inv(),
            "you flipped the ratio; match each side to the side in the same position of the similar triangle"
          ),
          ratSlip(F(e, a), `you used the difference ${n(e)} as a side length`),
          ratSlip(
            F(a, e),
            `you used the difference ${n(e)} as a side length and flipped the ratio`
          ),
          ratSlip(F(e, a + e), `you used the difference ${n(e)} as a side length`),
        ],
        asks: `the ratio ${m(target)}, using the two similar right triangles`,
        steps: [
          {
            label: "Find the similar triangles",
            work: `Triangles ${m(`${P}${Q}${R}`)} and ${m(`${P}${D}${Q}`)} share angle ${m(P)} and each has a right angle, so they are similar`,
          },
          {
            label: "Match corresponding sides",
            work: `Across from angle ${m(P)} are ${m(`${Q}${D}`)} in the small triangle and ${m(`${Q}${R}`)} in the large one, and the hypotenuses are ${m(`${P}${Q}`)} and ${m(`${P}${R}`)}. So ${m(`\\frac{${Q}${D}}{${P}${Q}} = \\frac{${Q}${R}}{${P}${R}}`)}`,
          },
          {
            label: "Rearrange for the ratio",
            work: `${m(`${P}${R} = ${a} + ${e} = ${a + e}`)}, so ${m(`${target} = ${flip ? `\\frac{${P}${Q}}{${P}${R}}` : `\\frac{${P}${R}}{${P}${Q}}`} = ${num(ans)}`)}`,
          },
        ],
        check: `With numbers: ${m(`${Q}${R} = \\sqrt{${a + e}^2 - ${a}^2}`)} is about ${about(qr)}, and ${m(`${Q}${D} = \\frac{${P}${Q} \\cdot ${Q}${R}}{${P}${R}}`)} (the area found two ways) is about ${about(qd)}. Their ratio is about ${about(flip ? qd / qr : qr / qd)}, which matches ${m(num(ans))}`,
        tip: "An altitude to the hypotenuse splits a right triangle into two smaller triangles similar to the whole one; match sides by the angles they face",
        hint: `Look for two triangles that share angle ${m(P)} and both have a right angle.`,
        difficulty: flip || format === "spr" ? 7 : 6,
        isCorrect: (cand) => {
          // Coordinates: Q at the origin, P on the y-axis, R on the x-axis, D the foot from Q.
          const t = (a * a) / (a * a + qr * qr);
          const QD = Math.hypot(t * qr, a - t * a);
          return near(cand, flip ? QD / qr : qr / QD);
        },
      };
    }
    const base = rng.pick(triples(5, 41));
    const k = rng.int(1, Math.max(1, Math.floor(60 / base[2])));
    const [p, q, r] = (rng.bool() ? [base[0], base[1], base[2]] : [base[1], base[0], base[2]]).map(
      (x) => x * k
    );
    const ask = rng.pick(["alt", "alt", "near", "far"] as const);
    const pd = F(p * p, r);
    const rd = F(q * q, r);
    const bd = F(p * q, r);
    const ans = ask === "alt" ? bd : ask === "near" ? pd : rd;
    const seg = ask === "alt" ? `${Q}${D}` : ask === "near" ? `${P}${D}` : `${R}${D}`;
    const s = 260 / r;
    const ad = ((p * p) / r) * s;
    const h = ((p * q) / r) * s;
    const figure = geometry(
      [
        point(P, 0, h),
        point(R, r * s, h),
        point(Q, ad, 0),
        point(D, ad, h, ["pr"]),
        { kind: "segment", id: "pq", from: P, to: Q },
        { kind: "segment", id: "qr", from: Q, to: R },
        { kind: "segment", id: "pr", from: P, to: R },
        { kind: "segment", id: "qd", from: Q, to: D },
        { kind: "angle", id: "aq", vertex: Q, from: P, to: R },
        { kind: "angle", id: "ad", vertex: D, from: R, to: Q },
      ],
      [
        ...[P, Q, R, D].map((id) => ({ text: id, on: id })),
        { text: String(p), on: "pq" },
        { text: String(q), on: "qr" },
      ],
      [
        { kind: "right_angle", on: ["aq"] },
        { kind: "right_angle", on: ["ad"] },
      ]
    );
    const slips: Slip[] =
      ask === "alt"
        ? [
            ratSlip(F(r, 2), `you assumed ${m(D)} is the midpoint of ${m(`\\overline{${P}${R}}`)}`),
            ratSlip(p * q, `you multiplied the legs and did not divide by ${m(`${P}${R} = ${r}`)}`),
            ratSlip(F(p * q, 2), "you found the area of the triangle"),
            ratSlip(F(p + q, 2), "you averaged the two legs"),
          ]
        : [
            ratSlip(
              ask === "near" ? rd : pd,
              `you found ${m(ask === "near" ? `${R}${D}` : `${P}${D}`)}, the other part of the hypotenuse`
            ),
            ratSlip(F(r, 2), `you assumed ${m(D)} is the midpoint of ${m(`\\overline{${P}${R}}`)}`),
            ratSlip(
              ask === "near" ? F(p * p, q) : F(q * q, p),
              "you divided by the other leg instead of the hypotenuse"
            ),
            ratSlip(bd, `you found the altitude ${m(`${Q}${D}`)}`),
          ];
    const leg = ask === "near" ? p : q;
    const legName = ask === "near" ? `${P}${Q}` : `${Q}${R}`;
    const end = ask === "near" ? P : R;
    const steps =
      ask === "alt"
        ? [
            {
              label: "Find the hypotenuse",
              work: m(`${P}${R} = \\sqrt{${p}^2 + ${q}^2} = \\sqrt{${p * p + q * q}} = ${r}`),
            },
            {
              label: "Write the area two ways",
              work: `With the legs as base and height, the area is ${m(`\\frac{1}{2}(${p})(${q}) = ${num(F(p * q, 2))}`)}. With ${m(`\\overline{${P}${R}}`)} as the base, it is ${m(`\\frac{1}{2}(${r})(${Q}${D})`)}`,
            },
            {
              label: `Solve for ${m(`${Q}${D}`)}`,
              work: m(`${Q}${D} = \\frac{${p} \\cdot ${q}}{${r}} = ${num(bd)}`),
            },
          ]
        : [
            {
              label: "Find the hypotenuse",
              work: m(`${P}${R} = \\sqrt{${p}^2 + ${q}^2} = \\sqrt{${p * p + q * q}} = ${r}`),
            },
            {
              label: "Use the similar triangles",
              work: `Triangles ${m(`${end}${D}${Q}`)} and ${m(`${end}${Q}${ask === "near" ? R : P}`)} share angle ${m(end)} and each has a right angle, so ${m(`\\frac{${seg}}{${legName}} = \\frac{${legName}}{${P}${R}}`)}`,
            },
            {
              label: `Solve for ${m(seg)}`,
              work: m(`${seg} = \\frac{${leg}^2}{${r}} = ${num(ans)}`),
            },
          ];
    const check =
      ask === "alt"
        ? `Similar triangles agree: in triangle ${m(`${P}${D}${Q}`)}, ${m(`\\frac{${Q}${D}}{${P}${Q}} = ${num(bd.div(p))}`)}, and in triangle ${m(`${P}${Q}${R}`)}, ${m(`\\frac{${Q}${R}}{${P}${R}} = \\frac{${q}}{${r}} = ${num(F(q, r))}`)}`
        : `The two parts of the hypotenuse should add to ${n(r)}: ${m(`${P}${D} + ${R}${D} = ${num(pd)} + ${num(rd)} = ${num(pd.add(rd))}`)}`;
    const t = (p * p) / (p * p + q * q);
    const truth =
      ask === "alt" ? Math.hypot(t * q, p - t * p) : ask === "near" ? t * r : (1 - t) * r;
    return {
      format,
      stem: `In the figure, angle ${m(Q)} is a right angle, ${m(`\\overline{${Q}${D}}`)} is perpendicular to ${m(`\\overline{${P}${R}}`)}, ${m(`${P}${Q} = ${p}`)}, and ${m(`${Q}${R} = ${q}`)}. What is the length of ${m(`\\overline{${seg}}`)}?`,
      figure,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks:
        ask === "alt"
          ? `the length of the altitude ${m(`\\overline{${Q}${D}}`)} to the hypotenuse`
          : `the length of ${m(`\\overline{${seg}}`)}, one of the two parts the altitude cuts the hypotenuse into`,
      steps,
      check,
      tip:
        ask === "alt"
          ? "The altitude to the hypotenuse equals the product of the legs divided by the hypotenuse, because the area can be found with either base"
          : "The altitude to the hypotenuse makes two small right triangles similar to the large one; each leg squared equals the hypotenuse times the part of the hypotenuse next to that leg",
      hint:
        ask === "alt"
          ? "Find the area with the legs, then again with the hypotenuse as the base."
          : `Find a small right triangle that shares angle ${m(end)} with the large triangle.`,
      difficulty: format === "spr" || ask !== "alt" ? 6 : 5,
      // Coordinates: Q at the origin, P = (0, PQ), R = (QR, 0); D is the foot from Q.
      isCorrect: (cand) => near(cand, truth),
    };
  },
};
