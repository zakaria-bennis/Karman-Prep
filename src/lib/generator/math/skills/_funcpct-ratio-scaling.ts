/*
 * m-ratios-and-proportions, part two: scaling (a rectangle that keeps its ratio, a shrunken
 * map, two linked ratios).
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { int, m, num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import { ans, byValue, dn, fitsBox, keep, NAMES, pc, pickW, positive, sv } from "./_funcpct-common";

const SKILL = "m-ratios-and-proportions";

export const scaling: Template = {
  id: "ratio.scaling",
  skill: SKILL,
  label: "Scaling: rectangles that keep a ratio, a shrunken map, linked ratios",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["rect", 2],
      ["map", 2],
      ["chain", 2],
    ] as const);
    if (form === "rect") {
      const a = rng.int(3, 15);
      const b = rng.int(2, 12);
      need(a > b, "longer length");
      const d = F(rng.int(2, 24), rng.pick([1, 1, 2]));
      const target = d.mul(a).div(b);
      need(target.decimalPlaces() <= 2, "clean");
      if (format === "spr") need(fitsBox(target), "fits");
      const unit = rng.pick(["meters", "feet", "inches", "yards"]);
      const thing = rng.pick(["garden", "photo", "field", "window", "patio", "tabletop"]);
      return {
        format,
        stem: `For a rectangular ${thing}, the ratio of its length to its width is ${m(`${a}`)} to ${m(`${b}`)}. The width is increased by ${m(dn(d))} ${unit}. By how many ${unit} must the length increase to keep this ratio?`,
        answer: ans(target),
        slips: positive(
          keep(
            sv(
              d,
              "you increased the length by the same amount as the width; a ratio is kept by multiplying, not adding"
            ),
            sv(d.mul(b).div(a), `you used the ratio upside down, ${m(`\\frac{${b}}{${a}}`)}`),
            sv(d.mul(a), `you multiplied by ${m(`${a}`)} without dividing by ${m(`${b}`)}`),
            sv(d.add(target), "you added the width's increase to the length's increase")
          )
        ),
        asks: `how much the length must grow so that length to width stays ${m(`${a}`)} to ${m(`${b}`)}`,
        steps: [
          {
            label: "Write the length from the width",
            work: `The length is always ${m(`\\frac{${a}}{${b}}`)} times the width`,
          },
          {
            label: "Scale the width's increase",
            work: `So a change in width changes the length ${m(`\\frac{${a}}{${b}}`)} times as much: ${m(`\\frac{${a}}{${b}} \\times ${dn(d)} = ${dn(target)}`)}`,
          },
        ],
        check: `start with a width of ${m(`${b}`)} and a length of ${m(`${a}`)}; the new sides are ${m(dn(d.add(b)))} and ${m(dn(target.add(a)))}, and ${m(`\\frac{${dn(target.add(a))}}{${dn(d.add(b))}} = \\frac{${a}}{${b}}`)}`,
        tip: "When a ratio stays the same, the changes in the two quantities are in that same ratio",
        hint: "The length must always be the same multiple of the width.",
        difficulty: format === "spr" ? 5 : 4,
        isCorrect: byValue((v) => v.mul(b).eq(d.mul(a))),
      };
    }
    if (form === "map") {
      const q = F(rng.pick([20, 25, 50, 60, 75, 80, 40, 36, 52]));
      const keepF = F(100).sub(q).div(100);
      const r = F(rng.int(4, 40));
      const side = rng.int(20, 60);
      const target = r.div(keepF);
      need(target.decimalPlaces() <= 2, "exact");
      if (format === "spr") need(fitsBox(target), "fits");
      const who = rng.pick(NAMES);
      const grow = F(100).add(q).div(100);
      return {
        format,
        stem: `${who} has a square map with a side length of ${m(`${side}`)} inches, and ${m("1")} inch on the map represents an actual distance of ${m(`${r.n}`)} miles. A smaller version of the same map is printed as a square with a side length that is ${m(pc(q))} shorter than the side length of the original map. On the smaller map, how many miles does ${m("1")} inch represent?`,
        answer: ans(target),
        slips: positive(
          keep(
            sv(
              r.mul(keepF),
              `you multiplied the scale by ${m(dn(keepF))}; on a smaller map each inch stands for more miles, not fewer`
            ),
            sv(
              r.div(grow),
              `you divided by ${m(dn(grow))}, treating the shorter side as a longer one`
            ),
            sv(
              r.mul(grow),
              `you increased the scale by ${m(pc(q))} instead of dividing by ${m(dn(keepF))}`
            ),
            sv(
              keepF.mul(side),
              "you found the side length of the smaller map, not the miles per inch"
            )
          )
        ),
        asks: "the actual distance that one inch stands for on the smaller map",
        steps: [
          {
            label: "Find the size multiplier",
            work: `Since a side ${m(pc(q))} shorter is ${m(pc(F(100).sub(q)))} of the original, the multiplier is ${m(dn(keepF))}`,
          },
          {
            label: "Spread the same miles over less map",
            work: `The smaller map shows the same land, so each inch shows ${m(`\\frac{${r.n}}{${dn(keepF)}} = ${dn(target)}`)} miles`,
          },
        ],
        check: `the original side shows ${m(`${side} \\times ${r.n} = ${int(side * r.n)}`)} miles; the smaller side is ${m(dn(keepF.mul(side)))} inches, and ${m(`${dn(keepF.mul(side))} \\times ${dn(target)} = ${int(side * r.n)}`)} miles`,
        tip: "A map's scale times a length on the map is the real distance, so shrinking the map raises the miles per inch by the same factor",
        hint: "The smaller map still shows the same land. How long is its side?",
        difficulty: rng.pick([6, 7]),
        isCorrect: byValue((v) => v.mul(keepF).eq(r)),
      };
    }
    const p = rng.int(1, 9);
    const q = rng.int(2, 9);
    const r = rng.int(1, 9);
    const s = rng.int(2, 9);
    need(p !== q && r !== s, "proper ratios");
    const target = F(p * r, q * s);
    need(!target.eq(F(p, s)) && !target.isInt(), "informative");
    if (format === "spr") need(fitsBox(target), "fits");
    const [a, b, c] = rng.pick([
      ["a", "b", "c"],
      ["x", "y", "z"],
      ["p", "q", "r"],
    ]);
    const show = (v: Frac) => num(v);
    const fr = (top: number, bottom: number) => `\\frac{${top}}{${bottom}}`;
    return {
      format,
      stem: `If ${m(`\\frac{${a}}{${b}} = ${fr(p, q)}`)} and ${m(`\\frac{${b}}{${c}} = ${fr(r, s)}`)}, what is the value of ${m(`\\frac{${a}}{${c}}`)}?`,
      answer: ans(target, show),
      slips: keep(
        sv(
          F(p, s),
          "you paired the first number of one ratio with the last number of the other",
          show
        ),
        sv(
          F(q * s, p * r),
          `you found ${m(`\\frac{${c}}{${a}}`)}, the reverse of what is asked`,
          show
        ),
        sv(F(p * s, q * r), "you divided the two ratios instead of multiplying them", show),
        sv(F(p + r, q + s), "you added the tops and the bottoms of the two ratios", show)
      ),
      asks: `${m(`\\frac{${a}}{${c}}`)}, found by linking the two ratios through ${m(b)}`,
      steps: [
        {
          label: `Link the ratios through ${m(b)}`,
          work: `${m(`\\frac{${a}}{${c}} = \\frac{${a}}{${b}} \\times \\frac{${b}}{${c}}`)}, because the ${m(b)} cancels`,
        },
        {
          label: "Multiply the fractions",
          work: m(`${fr(p, q)} \\times ${fr(r, s)} = ${fr(p * r, q * s)} = ${num(target)}`),
        },
      ],
      check: `try ${m(`${c} = ${q * s}`)}: then ${m(`${b} = ${r * q}`)} and ${m(`${a} = ${p * r}`)}, and ${m(`\\frac{${p * r}}{${r * q}} = ${num(F(p, q))}`)} as given`,
      tip: "To combine an a-to-b ratio with a b-to-c ratio, multiply them so that b cancels",
      hint: `Multiply the two fractions so that ${m(b)} cancels.`,
      difficulty: format === "spr" ? 5 : 4,
      isCorrect: byValue((v) => v.mul(q * s).eq(F(p * r))),
    };
  },
};
