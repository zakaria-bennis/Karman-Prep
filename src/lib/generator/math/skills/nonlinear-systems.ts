/*
 * m-nonlinear-systems: where a line meets a parabola or a circle. Item models after the bank's
 * own questions for this skill: a vertical or horizontal line meeting a parabola, a slanted line
 * meeting a parabola (a possible x, the x with a condition, a y, the ordered pair, the sum of
 * the x-coordinates), a line meeting a circle, and in _adveq-nlsys.ts how many solutions there
 * are and the constant or point for exactly one. Every check substitutes into both original
 * equations, or solves the printed system again by the formula.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, lin, m, n, num, paren, poly, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  factorTex,
  pairAnswer,
  pairOf,
  pairSlip,
  productTex,
  slip,
  solveQuad,
  valueOf,
} from "./_adveq-common";
import { countTangent } from "./_adveq-nlsys";

const SKILL = "m-nonlinear-systems";

const system = (e1: string, e2: string) => `${block(e1)}\n${block(e2)}`;

/** a(x)^2 + b(x) + c written out for a substitution, zero terms left out. */
const sub = (a: number, b: number, c: number, x: number) =>
  [`${times(a, x)}^2`, b ? `${b < 0 ? "-" : "+"} ${times(Math.abs(b), x)}` : "", c ? signed(c) : ""]
    .filter(Boolean)
    .join(" ");

type Ask = "x" | "xpos" | "y" | "pair" | "sum";

export const lineParabola: Template = {
  id: "nl-sys.line-parabola",
  skill: SKILL,
  label: "A line meets a parabola: a coordinate, the point, or the sum of the x-coordinates",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const variant = rng.pick(["vertical", "horizontal", "slant", "slant", "slant"] as const);
    if (variant === "vertical") {
      const k = rng.nonzero(-8, 9);
      const a = rng.pick([1, 1, 2, 3, -1, -2, 4, 5]);
      const b = rng.int(-12, 12);
      const c = rng.nonzero(-30, 30);
      const shift = rng.bool(0.5) ? 0 : rng.nonzero(-12, 12);
      const lineEq = shift === 0 ? `x = ${k}` : `x ${signed(shift)} = ${k + shift}`;
      const par = `y = ${poly([a, b, c], "x")}`;
      const y = a * k * k + b * k + c;
      const pairAsk = format === "mc" && rng.bool(0.5);
      const P = (x: number) => a * x * x + b * x + c;
      const wrongX = k + shift;
      const slips: Slip[] = pairAsk
        ? [
            pairSlip(
              k,
              a * a * k * k + b * k + c,
              `you squared ${m(`${a}(${k})`)} instead of only ${n(k)}`
            ),
            pairSlip(
              wrongX,
              P(wrongX),
              `you used ${m(`x = ${wrongX}`)}, the right side of ${m(lineEq)}, without solving for ${m("x")}`
            ),
            pairSlip(y, k, "you swapped the coordinates"),
            pairSlip(k, a * 2 * k + b * k + c, `you doubled ${n(k)} instead of squaring it`),
            pairSlip(k, -a * k * k + b * k + c, `you wrote ${m(`(${k})^2`)} as ${n(-k * k)}`),
          ]
        : [
            slip(
              a * a * k * k + b * k + c,
              `you squared ${m(`${a}(${k})`)} instead of only ${n(k)}`
            ),
            ...(shift
              ? [
                  slip(
                    P(wrongX),
                    `you used ${m(`x = ${wrongX}`)} without solving ${m(lineEq)} for ${m("x")}`
                  ),
                ]
              : []),
            slip(a * 2 * k + b * k + c, `you doubled ${n(k)} instead of squaring it`),
            slip(-a * k * k + b * k + c, `you wrote ${m(`(${k})^2`)} as ${n(-k * k)}`),
            slip(k, `you gave the x-coordinate, ${n(k)}`),
          ];
      return {
        format,
        stem: `${system(lineEq, par)}\nThe graphs of the equations in the given system intersect at the point ${m("(x, y)")} in the xy-plane. ${pairAsk ? "What is the point of intersection?" : `What is the value of ${m("y")}?`}`,
        answer: pairAsk ? pairAnswer(k, y) : numAnswer(y, m(num(y))),
        slips,
        asks: pairAsk
          ? "the point that lies on both graphs"
          : "the y-coordinate of the point on both graphs",
        steps: [
          ...(shift
            ? [
                {
                  label: `Solve the first equation for ${m("x")}`,
                  work: `${shift > 0 ? `Subtract ${shift} from` : `Add ${-shift} to`} both sides: ${m(`x = ${k}`)}`,
                },
              ]
            : []),
          { label: "Substitute into the parabola", work: m(`y = ${sub(a, b, c, k)} = ${num(y)}`) },
        ],
        check: `The point ${m(`(${k}, ${num(y)})`)} is on the line ${m(`x = ${k}`)}, and ${m(`${sub(a, b, c, k)} = ${num(y)}`)}, so it is on the parabola too`,
        tip: "A vertical line fixes x; substitute that value into the other equation to find y",
        hint: shift
          ? `Solve ${m(lineEq)} for ${m("x")} first.`
          : "Substitute the known value of $x$ into the other equation.",
        difficulty: shift || pairAsk ? 2 : 1,
        isCorrect: (cand) => {
          if (pairAsk) {
            const pt = pairOf(cand);
            return (
              pt !== null && pt[0].add(shift).eq(k + shift) && pt[1].eq(P(pt[0].n)) && pt[0].isInt()
            );
          }
          const v = valueOf(cand);
          return v !== null && v.eq(P(k));
        },
      };
    }
    if (variant === "horizontal") {
      const a = rng.pick([1, 2, 3, 4, 5, 6, 7]);
      const r = rng.int(2, 12);
      const c0 = rng.bool(0.5) ? 0 : rng.nonzero(-20, 20);
      const k = a * r * r + c0;
      const lead = poly([a, 0, c0], "x");
      const intro = `${system(`y = ${k}`, `y = ${lead}`)}\nThe graphs of the equations in the given system intersect at the point ${m("(x, y)")} in the xy-plane`;
      return {
        format,
        stem:
          format === "spr"
            ? `${intro}, where ${m("x > 0")}. What is the value of ${m("x")}?`
            : `${intro}. What is a possible value of ${m("x")}?`,
        answer: numAnswer(r, m(String(r))),
        slips: [
          slip(r * r, `you found ${m(`x^2 = ${r * r}`)} and did not take the square root`),
          slip(k, `you gave the y-coordinate, ${n(k)}`),
          ...(c0 ? [slip(F(k + c0, a), `you moved ${n(c0)} with the wrong sign`)] : []),
          ...(a > 1 ? [slip(a * r, `you took the square root before dividing by ${a}`)] : []),
          slip(2 * r, `you doubled ${r} instead of keeping ${m(`x = ${r}`)}`),
        ].filter((s) => !s.value!.eq(F(-r))),
        asks: `an x-coordinate where the parabola reaches the height ${m(`y = ${k}`)}`,
        steps: [
          { label: "Set the two expressions equal", work: m(`${lead} = ${k}`) },
          ...(a > 1 || c0
            ? [
                {
                  label: `Get ${m("x^2")} alone`,
                  work: `${c0 ? `${c0 > 0 ? "Subtract" : "Add"} ${Math.abs(c0)}${a > 1 ? ` and divide by ${a}` : ""}` : `Divide by ${a}`}: ${m(`x^2 = ${r * r}`)}`,
                },
              ]
            : []),
          {
            label: "Take square roots",
            work: `${m(`x = ${r}`)} or ${m(`x = -${r}`)}; ${format === "spr" ? `the positive one is ${n(r)}` : `only ${n(r)} is a choice`}`,
          },
        ],
        check: `${m(`${a === 1 ? "" : a}(${r})^2 ${c0 ? signed(c0) : ""} = ${k}`.replace("  ", " "))}, so the point ${m(`(${r}, ${k})`)} is on both graphs`,
        tip: "Where two graphs meet, their y-values are equal, so set the right sides equal and solve",
        hint: `Set ${m(lead)} equal to ${n(k)}.`,
        difficulty: format === "spr" || c0 ? 3 : 2,
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && v.mul(v).mul(a).add(c0).eq(k) && (format === "mc" || v.sign() > 0);
        },
      };
    }
    // slant: y = M x + B and y = a x^2 + b x + c meeting at integer x1 < x2.
    const a = rng.pick([1, 1, 1, 2, -1, -2, 3]);
    const M = rng.nonzero(-8, 8);
    const B = rng.int(-20, 20);
    const [x1, x2] = rng
      .sample(
        Array.from({ length: 21 }, (_, i) => i - 10),
        2
      )
      .sort((u, w) => u - w);
    const b = M - a * (x1 + x2);
    const c = B + a * x1 * x2;
    need(Math.abs(c) <= 60 && Math.abs(b) <= 30, "tidy parabola");
    const Yl = (x: number) => M * x + B;
    const Pq = (x: number) => a * x * x + b * x + c;
    const asks: Ask[] = format === "spr" ? ["xpos", "sum"] : ["x", "x", "xpos", "y", "pair", "sum"];
    const ask = rng.pick(asks);
    need(ask !== "xpos" || (x1 <= 0 && x2 > 0), "exactly one positive x");
    const lineForm = rng.bool(0.5);
    const lineText = lineForm
      ? `y = ${lin([[M, "x"]], B)}`
      : `${lin([
          [-M, "x"],
          [1, "y"],
        ])} = ${B}`;
    const par = `y = ${poly([a, b, c], "x")}`;
    const diffEq = poly([a, b - M, c - B], "x");
    const trueXs = () =>
      solveQuad(a, b - M, c - B)
        .map((s) => s.asRat())
        .filter((q): q is Frac => q !== null && q.isInt() && F(Pq(q.n)).eq(Yl(q.n)));
    const pick = rng.pick([x1, x2]);
    let answer: Answer;
    let slips: Slip[];
    let question: string;
    if (ask === "x" || ask === "xpos") {
      const ans = ask === "xpos" ? x2 : pick;
      answer = numAnswer(ans, m(num(ans)));
      question =
        ask === "xpos"
          ? `A solution to the given system is ${m("(x, y)")}, where ${m("x > 0")}. What is the value of ${m("x")}?`
          : `A solution to the given system is ${m("(x, y)")}. What is a possible value of ${m("x")}?`;
      slips = [
        slip(-x1, "you solved the quadratic with the signs reversed"),
        slip(-x2, "you solved the quadratic with the signs reversed"),
        slip(Yl(ans), "you gave the y-coordinate of the solution"),
        ...(ask === "xpos" ? [slip(x1, `you gave the solution with ${m(`x \\le 0`)}`)] : []),
        slip(x1 + x2, "you added the two x-coordinates"),
      ];
    } else if (ask === "y") {
      const ans = Yl(pick);
      answer = numAnswer(ans, m(num(ans)));
      question = `A solution to the given system is ${m("(x, y)")}. What is a possible value of ${m("y")}?`;
      slips = [
        slip(pick, "you gave the x-coordinate, not the y-coordinate"),
        slip(Yl(-pick), `you used ${m(`x = ${-pick}`)}, a sign slip when solving the quadratic`),
        slip(x1 === pick ? x2 : x1, "you gave the other x-coordinate"),
        slip(Pq(0), "you gave the parabola's y-intercept"),
      ];
    } else if (ask === "pair") {
      answer = pairAnswer(pick, Yl(pick));
      question = `Which ordered pair ${m("(x, y)")} is a solution to the given system of equations?`;
      slips = [
        pairSlip(Yl(pick), pick, "you swapped the coordinates"),
        pairSlip(-pick, Yl(pick), "you used the wrong sign for the x-coordinate"),
        pairSlip(pick, Pq(-pick), "you evaluated the parabola at the opposite x-value"),
        pairSlip(0, B, "you gave the line's y-intercept, which is not on the parabola"),
        pairSlip(0, c, "you gave the parabola's y-intercept, which is not on the line"),
      ];
    } else {
      const ans = F(x1 + x2);
      answer = numAnswer(ans, m(num(ans)));
      question = `The graphs of the equations in the given system intersect at two points in the xy-plane. What is the sum of the x-coordinates of the two points?`;
      slips = [
        slip(-(x1 + x2), `you took ${m("\\frac{b}{a}")} instead of ${m("-\\frac{b}{a}")}`),
        slip(F(-b, a), `you used ${m(par)} alone, without first setting it equal to the line`),
        slip(Yl(x1) + Yl(x2), "you added the y-coordinates"),
        slip(x1 * x2, "you multiplied the x-coordinates"),
      ];
    }
    const steps = [
      ...(lineForm
        ? []
        : [{ label: `Solve the line for ${m("y")}`, work: m(`y = ${lin([[M, "x"]], B)}`) }]),
      {
        label: "Set the right sides equal",
        work: m(`${poly([a, b, c], "x")} = ${lin([[M, "x"]], B)}`),
      },
      {
        label: "Solve the quadratic",
        work: `${m(`${diffEq} = 0`)}, which is ${m(`${productTex(a, [factorTex(F(x1)), factorTex(F(x2))])} = 0`)}, so ${m(`x = ${x1}`)} or ${m(`x = ${x2}`)}`,
      },
      ask === "sum"
        ? { label: "Add the x-coordinates", work: m(`${x1} ${signed(x2)} = ${x1 + x2}`) }
        : ask === "y" || ask === "pair"
          ? {
              label: `Find ${m("y")} from the line`,
              work: m(`y = ${times(M, pick)} ${signed(B)} = ${Yl(pick)}`),
            }
          : {
              label: "Choose the requested value",
              work:
                ask === "xpos"
                  ? `The positive value is ${n(x2)}`
                  : `Of these, only ${n(pick)} is a choice`,
            },
    ];
    const shown = ask === "xpos" ? x2 : pick;
    return {
      format,
      stem: `${system(par, lineText)}\n${question}`,
      answer,
      slips,
      asks:
        ask === "sum"
          ? "the sum of the x-coordinates of the two intersection points"
          : ask === "pair"
            ? "a point that satisfies both equations"
            : `the ${ask === "y" ? "y" : "x"}-coordinate of a point on both graphs`,
      steps,
      check:
        ask === "sum"
          ? `For ${m(`${diffEq} = 0`)} the solutions add to ${m(`-\\frac{b}{a} = ${num(F(-(b - M), a))}`)}, the same sum`
          : `At ${m(`x = ${shown}`)} the line gives ${m(`y = ${Yl(shown)}`)} and the parabola gives ${m(`${sub(a, b, c, shown)} = ${Pq(shown)}`)}, the same point`,
      tip: "To solve a line and a parabola together, substitute the line's y into the parabola and solve the quadratic; each solution x gives one intersection point",
      hint: lineForm
        ? "Set the two expressions for $y$ equal to each other."
        : "Solve the linear equation for $y$, then substitute.",
      difficulty: ask === "sum" ? 5 : ask === "y" ? 5 : ask === "xpos" ? 3 : 4,
      isCorrect: (cand) => {
        const xs = trueXs();
        if (ask === "sum") {
          const v = valueOf(cand);
          return v !== null && xs.length === 2 && xs[0].add(xs[1]).eq(v);
        }
        if (ask === "pair") {
          const pt = pairOf(cand);
          return pt !== null && pt[0].isInt() && pt[1].eq(Yl(pt[0].n)) && pt[1].eq(Pq(pt[0].n));
        }
        const v = valueOf(cand);
        if (v === null) return false;
        if (ask === "y") return M !== 0 && xs.some((x) => F(Yl(x.n)).eq(v));
        return xs.some((x) => x.eq(v)) && (ask === "x" || v.sign() > 0);
      },
    };
  },
};

export const lineCircle: Template = {
  id: "nl-sys.line-circle",
  skill: SKILL,
  label: "A line meets a circle centered at the origin",
  difficulty: [4, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const slope = rng.bool(0.7);
    const shifted = rng.bool(0.5);
    const h = shifted ? rng.nonzero(-5, 5) : 0;
    const w = shifted ? rng.nonzero(-5, 5) : 0;
    const circle = (R: number) =>
      shifted
        ? `(${poly([1, -h], "x")})^2 + (${poly([1, -w], "y")})^2 = ${num(R)}`
        : `x^2 + y^2 = ${num(R)}`;
    const onCircle = (x: Frac, y: Frac, R: number) => x.sub(h).pow(2).add(y.sub(w).pow(2)).eq(R);
    if (slope) {
      const k = rng.pick([2, 3, 4, 5, 6, 7, -2, -3, -4, -5, -6, -7]);
      const x0 = rng.int(1, 12);
      const R = x0 * x0 * (1 + k * k);
      need(R <= 3000, "size");
      const neg = rng.bool(0.5);
      const xs = h + (neg ? -x0 : x0);
      const ys = w + k * (xs - h);
      const askY = rng.bool(0.6);
      const B = w - k * h;
      const lineEq =
        !shifted && rng.bool(0.5) ? `y ${signed(-k)}x = 0` : `y = ${lin([[k, "x"]], B)}`;
      const cond = m(`x ${neg ? "<" : ">"} ${h}`);
      const ans = askY ? ys : xs;
      const otherX = h + (neg ? x0 : -x0);
      const slips: Slip[] = askY
        ? [
            slip(xs, "you gave the x-coordinate, not the y-coordinate"),
            slip(
              w + k * (otherX - h),
              `you used the solution where ${m(`x ${neg ? ">" : "<"} ${h}`)}`
            ),
            slip(
              w + k * (neg ? -1 : 1) * x0 * x0,
              `you multiplied ${n(k)} by ${m(`${shifted ? `(x ${signed(-h)})` : "x"}^2`)} instead of by ${m(shifted ? `x ${signed(-h)}` : "x")}`
            ),
            slip(k, `you gave the slope, ${n(k)}`),
          ]
        : [
            slip(ys, "you gave the y-coordinate, not the x-coordinate"),
            slip(otherX, "you took the wrong square root for the stated condition"),
            slip(
              h + (neg ? -1 : 1) * x0 * x0,
              `you stopped at ${m(`${shifted ? `(x ${signed(-h)})` : "x"}^2 = ${x0 * x0}`)}`
            ),
            slip(k, `you gave the slope, ${n(k)}`),
          ];
      const u = shifted ? `(x ${signed(-h)})` : "x";
      return {
        format,
        stem: `${system(circle(R), lineEq)}\nA solution to the given system of equations is ${m("(x, y)")}, where ${cond}. What is the value of ${m(askY ? "y" : "x")}?`,
        answer: numAnswer(ans, m(num(ans))),
        slips,
        asks: `the ${askY ? "y" : "x"}-coordinate of the intersection point with ${cond}`,
        steps: [
          {
            label: "Substitute the line into the circle",
            work: shifted
              ? `The line gives ${m(`y ${signed(-w)} = ${k}${u}`)}, so ${m(`${u}^2 + (${k}${u})^2 = ${num(R)}`)}, which is ${m(`${1 + k * k}${u}^2 = ${num(R)}`)}`
              : `${m(`y = ${k}x`)}, so ${m(`x^2 + (${k}x)^2 = ${num(R)}`)}, which is ${m(`${1 + k * k}x^2 = ${num(R)}`)}`,
          },
          {
            label: `Solve for ${m("x")}`,
            work: `${m(`${u}^2 = ${x0 * x0}`)}, so ${m(`${shifted ? `x ${signed(-h)}` : "x"} = ${x0}`)} or ${m(`${shifted ? `x ${signed(-h)}` : "x"} = -${x0}`)}. With ${cond}, ${m(`x = ${xs}`)}`,
          },
          ...(askY
            ? [
                {
                  label: `Find ${m("y")}`,
                  work: m(
                    `y = ${k}${paren(xs)} ${signed(B)} = ${ys}`
                      .replace(" + 0 ", " ")
                      .replace(" - 0 ", " ")
                  ),
                },
              ]
            : []),
        ],
        check: `The point ${m(`(${xs}, ${ys})`)} satisfies the line, and ${m(shifted ? `(${xs} ${signed(-h)})^2 + (${ys} ${signed(-w)})^2 = ${num((xs - h) ** 2)} + ${num((ys - w) ** 2)} = ${num(R)}` : `${paren(xs)}^2 + ${paren(ys)}^2 = ${num(xs * xs)} + ${num(ys * ys)} = ${num(R)}`)}, so it is on the circle too`,
        tip: "Substitute the line's expression for y into the circle's equation, solve for x, and use the stated condition to pick the solution",
        hint: "Substitute the line into the circle's equation.",
        difficulty: shifted ? (askY ? 6 : 5) : askY ? 5 : 4,
        isCorrect: (cand) => {
          const v = valueOf(cand);
          if (v === null) return false;
          const x = askY ? v.sub(B).div(k) : v;
          const y = askY ? v : v.mul(k).add(B);
          return onCircle(x, y, R) && (neg ? x.lt(h) : x.gt(h));
        },
      };
    }
    // horizontal line y = c meets x^2 + y^2 = r^2 at x = +/- a (a Pythagorean triple).
    const [p, q, r] = rng.pick([
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
      [6, 8, 10],
      [9, 12, 15],
      [12, 16, 20],
      [20, 21, 29],
    ]);
    const [ax, cy] = rng.bool(0.5) ? [p, q] : [q, p];
    const c = rng.bool(0.5) ? cy : -cy;
    const lineEq = rng.bool(0.5) ? `y = ${c + w}` : `y ${signed(-(c + w))} = 0`;
    const X = h + ax;
    return {
      format,
      stem: `${system(circle(r * r), lineEq.replace("y + 0 = 0", "y = 0").replace("y - 0 = 0", "y = 0"))}\nA solution to the given system of equations is ${m("(x, y)")}, where ${m(`x > ${h}`)}. What is the value of ${m("x")}?`,
      answer: numAnswer(X, m(String(X))),
      slips: [
        slip(h + r, `you took the square root of ${n(r * r)} and ignored the line`),
        slip(
          h + r * r - c * c,
          `you found ${m(`${shifted ? `(x ${signed(-h)})` : "x"}^2`)} and did not take the square root`
        ),
        slip(h + r - Math.abs(c), "you subtracted the square roots instead of the squares"),
        ...(shifted
          ? [
              slip(
                ax,
                `you found ${m(`x ${signed(-h)}`)} and forgot to ${h > 0 ? "add" : "subtract"} ${n(Math.abs(h))}`
              ),
            ]
          : []),
        slip(Math.abs(c + w), "you gave the size of the y-coordinate"),
      ],
      asks: `the x-coordinate, greater than ${n(h)}, where the horizontal line meets the circle`,
      steps: [
        {
          label: "Substitute the line into the circle",
          work: m(`${shifted ? `(x ${signed(-h)})` : "x"}^2 + ${paren(c)}^2 = ${num(r * r)}`),
        },
        {
          label: `Solve for ${m("x")}`,
          work: `${m(`${shifted ? `(x ${signed(-h)})` : "x"}^2 = ${num(r * r)} - ${c * c} = ${ax * ax}`)}, so ${m(`${shifted ? `x ${signed(-h)}` : "x"} = ${ax}`)} or ${m(`${shifted ? `x ${signed(-h)}` : "x"} = -${ax}`)}. With ${m(`x > ${h}`)}, ${m(`x = ${X}`)}`,
        },
      ],
      check: `${m(`${shifted ? `(${X} ${signed(-h)})` : X}^2 + ${paren(c)}^2 = ${num(ax * ax)} + ${num(c * c)} = ${num(r * r)}`)}, so ${m(`(${X}, ${c + w})`)} is on the circle and on the line`,
      tip: "Substitute the line into the circle's equation; a horizontal line fixes y, leaving an equation in x alone",
      hint: `Replace ${m("y")} with ${n(c + w)} in the first equation.`,
      difficulty: shifted ? 5 : 4,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && v.gt(h) && onCircle(v, F(c + w), r * r);
      },
    };
  },
};

export const TEMPLATES: Template[] = [lineParabola, lineCircle, countTangent];
