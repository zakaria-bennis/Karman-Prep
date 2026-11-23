/*
 * m-circle-equations: the equation of a circle in the xy-plane. Item models after the bank's own
 * questions for this skill: the center and radius from (x - h)^2 + (y - k)^2 = r^2, writing the
 * equation from a center and a radius or a point, completing the square from the expanded form,
 * points on a circle, circles that grow or move, and tangent lines (perpendicular to the radius).
 * Checks substitute points into the equations or use the symmetry of the expanded form.
 */
import { need, numAnswer } from "../core/build";
import { F } from "../core/frac";
import { S } from "../core/sym";
import { block, lin, m, n, pair, paren, sym } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { pos, ratSlip, scaledTriples, sq, symAnswer, symSlip } from "./_geo2-common";
import {
  XY,
  eqAnswer,
  eqSlip,
  eqTex,
  ptAnswer,
  ptOf,
  ptSlip,
  sqTerm,
  tangentLine,
} from "./_geo2-ceq-tangent";

const SKILL = "m-circle-equations";
export const standard: Template = {
  id: "ceq.standard",
  skill: SKILL,
  label: "Center and radius from the standard form, and writing the equation",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = rng.nonzero(-12, 12);
    const k = rng.nonzero(-12, 12);
    need(Math.abs(h) !== Math.abs(k), "distinct coordinates");
    const r = rng.int(2, 20);
    const R = r * r;
    const kind =
      format === "spr"
        ? "radius"
        : rng.pick(["radius", "center", "write", "write-point", "write-k"] as const);
    const lhs = (x: number, y: number) => (x - h) ** 2 + (y - k) ** 2;
    if (kind === "radius") {
      const power = rng.bool(0.25);
      const rhs = power ? `${r}^2` : String(R);
      const askD = !power && rng.bool(0.25);
      const ans = askD ? 2 * r : r;
      return {
        format,
        stem: `${block(eqTex(h, k, rhs))}\nIn the ${XY}, the graph of the given equation is a circle. What is the length of the circle's ${askD ? "diameter" : "radius"}?`,
        answer: numAnswer(ans, m(String(ans))),
        slips: [
          ratSlip(R, "you read the right side as the radius, but it is the radius squared"),
          ratSlip(
            askD ? r : 2 * r,
            askD ? "you found the radius, not the diameter" : "you found the diameter"
          ),
          power
            ? ratSlip(F(r, 2), "you halved the number that is squared")
            : ratSlip(F(R, 2), "you halved the right side instead of taking its square root"),
          power
            ? symSlip(S.root(r), `you took the square root of ${n(r)}`)
            : ratSlip(Math.abs(h) + Math.abs(k), "you used the numbers inside the parentheses"),
        ],
        asks: `the ${askD ? "diameter" : "radius"}, from the right side of the equation`,
        steps: [
          {
            label: "Match the standard form",
            work: `A circle with center ${m("(h, k)")} and radius ${m("r")} has equation ${m("(x - h)^2 + (y - k)^2 = r^2")}`,
          },
          {
            label: "Read the radius",
            work: power
              ? `Here ${m(`r^2 = ${r}^2`)}, so ${m(`r = ${r}`)}`
              : `Here ${m(`r^2 = ${R}`)}, so ${m(`r = \\sqrt{${R}} = ${r}`)}`,
          },
          ...(askD ? [{ label: "Double the radius", work: m(`d = 2(${r}) = ${2 * r}`) }] : []),
        ],
        check: `The point ${m(pair(h + r, k))} is ${n(r)} units to the right of the center ${m(pair(h, k))}; substituting it gives ${m(`${r}^2 + 0^2 = ${R}`)}, so it lies on the circle`,
        tip: "In (x - h)^2 + (y - k)^2 = r^2 the right side is the radius squared; take its square root".replace(
          "(x - h)^2 + (y - k)^2 = r^2",
          m("(x - h)^2 + (y - k)^2 = r^2")
        ),
        hint: "What does the number on the right side of the standard form stand for?",
        difficulty: askD ? 2 : 1,
        // The point (h + radius, k) must satisfy the equation: (radius)^2 + 0^2 = right side.
        isCorrect: (cand) =>
          !!cand.value && pos(cand.value) && sq(cand.value.divRat(askD ? 2 : 1)).eq(R),
      };
    }
    if (kind === "center") {
      return {
        format,
        stem: `${block(eqTex(h, k, String(R)))}\nIn the ${XY}, the graph of the given equation is a circle. What are the coordinates ${m("(x, y)")} of the center of the circle?`,
        answer: ptAnswer(h, k),
        slips: [
          ptSlip(-h, -k, "you took the numbers with the signs shown inside the parentheses"),
          ptSlip(
            h,
            -k,
            `you changed the sign of the ${m("x")}-coordinate but not the ${m("y")}-coordinate`
          ),
          ptSlip(
            -h,
            k,
            `you changed the sign of the ${m("y")}-coordinate but not the ${m("x")}-coordinate`
          ),
          ptSlip(k, h, `you swapped the ${m("x")}- and ${m("y")}-coordinates`),
        ],
        asks: "the center of the circle",
        steps: [
          {
            label: "Match the standard form",
            work: `The standard form is ${m("(x - h)^2 + (y - k)^2 = r^2")}, with center ${m("(h, k)")}`,
          },
          {
            label: "Read each coordinate",
            work: `${m(sqTerm("x", h))} is ${m(`(x - ${paren(h)})^2`)}, so ${m(`h = ${h}`)}; ${m(sqTerm("y", k))} is ${m(`(y - ${paren(k)})^2`)}, so ${m(`k = ${k}`)}`,
          },
        ],
        check: `Substituting the center ${m(pair(h, k))} makes both squares zero, and the points ${m(pair(h + r, k))} and ${m(pair(h, k + r))}, each ${n(r)} from it, satisfy the equation`,
        tip: `The center's coordinates have the opposite signs of the numbers shown inside the parentheses: ${m("(x + 2)^2")} means ${m("h = -2")}`,
        hint: `Rewrite ${m(sqTerm("x", h))} in the form ${m("(x - h)^2")}.`,
        difficulty: 2,
        isCorrect: (cand) => {
          const p = ptOf(cand);
          if (!p || !p[0].isInt() || !p[1].isInt()) return false;
          const [a, b] = [p[0].n, p[1].n];
          return lhs(a, b) === 0 && lhs(a + r, b) === R && lhs(a, b + r) === R;
        },
      };
    }
    if (kind === "write-k") {
      const c = rng.int(2, 9);
      const text = (coef: number, pw: number) => m(eqTex(h, k, `${coef}${pw === 2 ? "k^2" : "k"}`));
      const opts: [number, number, string, string][] = [
        [c * c, 2, "", "right"],
        [c * c, 1, "you squared the number but not the variable", ""],
        [c, 1, "you used the radius instead of its square", ""],
        [c, 2, "you squared only the variable", ""],
      ];
      const make = (coef: number, pw: number): Answer => ({
        text: text(coef, pw),
        key: `${coef}k${pw}`,
      });
      return {
        format,
        stem: `A circle in the ${XY} has its center at ${m(pair(h, k))} and has a radius of ${m(`${c}k`)}, where ${m("k")} is a positive constant. Which equation represents this circle?`,
        answer: make(c * c, 2),
        slips: opts.slice(1).map(([coef, pw, why]) => ({ ...make(coef, pw), why })),
        asks: "the equation of the circle with the given center and radius",
        steps: [
          {
            label: "Use the standard form",
            work: `Center ${m(pair(h, k))} gives ${m(`${sqTerm("x", h)} + ${sqTerm("y", k)}`)} on the left`,
          },
          { label: "Square the radius", work: m(`(${c}k)^2 = ${c * c}k^2`) },
        ],
        check: `With ${m("k = 1")} the radius is ${n(c)}, and the point ${m(pair(h + c, k))} gives ${m(`${c}^2 + 0^2 = ${c * c}`)}, which matches ${m(`${c * c}k^2`)} at ${m("k = 1")}`,
        tip: "Square the whole radius, number and variable together",
        hint: `What is ${m(`(${c}k)^2`)}?`,
        difficulty: 3,
        isCorrect: (cand) => {
          const mt = /^(\d+)k(\d)$/.exec(cand.key ?? "");
          if (!mt) return false;
          return [1.3, 2.7].every(
            (kv) => Math.abs(Number(mt[1]) * kv ** Number(mt[2]) - (c * kv) ** 2) < 1e-9
          );
        },
      };
    }
    // Write the equation from the center and the radius, or a point on the circle.
    const point = kind === "write-point";
    const dx = point ? rng.nonzero(-7, 7) : 0;
    const dy = point ? rng.nonzero(-7, 7) : 0;
    const RR = point ? dx * dx + dy * dy : R;
    const bad = point ? Math.abs(dx) + Math.abs(dy) : r;
    need(bad !== RR, "distinct right sides");
    const P = [h + dx, k + dy];
    return {
      format,
      stem: point
        ? `A circle in the ${XY} has its center at ${m(pair(h, k))}, and the point ${m(pair(P[0], P[1]))} lies on the circle. Which equation represents this circle?`
        : `A circle in the ${XY} has its center at ${m(pair(h, k))} and has a radius of ${n(r)}. Which equation represents this circle?`,
      answer: eqAnswer(h, k, RR),
      slips: [
        eqSlip(-h, -k, RR, "you kept the signs of the center's coordinates inside the parentheses"),
        eqSlip(
          h,
          k,
          bad,
          point
            ? "you added the horizontal and vertical distances instead of squaring them"
            : "you used the radius on the right side instead of its square"
        ),
        eqSlip(
          -h,
          -k,
          bad,
          point
            ? "you kept the signs of the center and added the distances"
            : "you kept the signs of the center and did not square the radius"
        ),
      ],
      asks: "the equation of the circle",
      steps: [
        {
          label: "Write the left side",
          work: `Center ${m(pair(h, k))} gives ${m(`${sqTerm("x", h)} + ${sqTerm("y", k)}`)}`,
        },
        point
          ? {
              label: "Find the radius squared",
              work: `The radius runs from the center to ${m(pair(P[0], P[1]))}: ${m(`r^2 = (${P[0]} - ${paren(h)})^2 + (${P[1]} - ${paren(k)})^2 = ${dx * dx} + ${dy * dy} = ${RR}`)}`,
            }
          : { label: "Square the radius", work: m(`r^2 = ${r}^2 = ${R}`) },
      ],
      check: point
        ? `Substituting ${m(pair(P[0], P[1]))} into the equation gives ${m(`${dx < 0 ? `(${dx})` : dx}^2 + ${dy < 0 ? `(${dy})` : dy}^2 = ${RR}`)}, so the point is on the circle`
        : `The point ${m(pair(h, k + r))} is ${n(r)} above the center; substituting it gives ${m(`0^2 + ${r}^2 = ${R}`)}`,
      tip: `In ${m("(x - h)^2 + (y - k)^2 = r^2")}, write the center's coordinates with the opposite signs and put the radius squared on the right`,
      hint: point
        ? "The radius is the distance from the center to the given point."
        : `What goes on the right side: ${m("r")} or ${m("r^2")}?`,
      difficulty: point ? 4 : 2,
      isCorrect: (cand) => {
        const mt = /^(-?\d+)\|(-?\d+)\|(\d+)$/.exec(cand.key ?? "");
        if (!mt) return false;
        const [a, b, Rc] = mt.slice(1).map(Number);
        const radius = Math.sqrt(RR);
        // Three points of the true circle must satisfy the candidate equation.
        const pts: [number, number][] = [
          [h + radius, k],
          [h - radius, k],
          [h, k + radius],
        ];
        return pts.every(([x, y]) => Math.abs((x - a) ** 2 + (y - b) ** 2 - Rc) < 1e-9);
      },
    };
  },
};

export const completeSquare: Template = {
  id: "ceq.complete-square",
  skill: SKILL,
  label: "Center, radius or diameter by completing the square",
  difficulty: [4, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = rng.nonzero(-10, 10);
    const k = rng.nonzero(-10, 10);
    need(Math.abs(h) !== Math.abs(k), "distinct coordinates");
    const perfect = format === "spr" || rng.bool(0.5);
    const R = perfect ? rng.int(2, 15) ** 2 : rng.int(5, 200);
    need(perfect || !Number.isInteger(Math.sqrt(R)), "not a square");
    const D = -2 * h;
    const E = -2 * k;
    const C0 = h * h + k * k - R;
    need(C0 !== 0, "a constant term");
    const ask =
      format === "spr"
        ? rng.pick(["radius", "diameter"] as const)
        : rng.pick(["center", "center", "radius", "diameter"] as const);
    const moved = rng.bool(0.4);
    const eq = moved
      ? `${lin([
          [1, "x^2"],
          [D, "x"],
          [1, "y^2"],
        ])} = ${lin([[-E, "y"]], -C0)}`
      : `${lin(
          [
            [1, "x^2"],
            [1, "y^2"],
            [D, "x"],
            [E, "y"],
          ],
          C0
        )} = 0`;
    const f = (x: number, y: number) => x * x + y * y + D * x + E * y + C0;
    const right = -C0; // the constant once moved to the right
    const rad = S.root(R);
    let answer: Answer;
    let slips: Slip[];
    if (ask === "center") {
      answer = ptAnswer(h, k);
      slips = [
        ptSlip(D, E, `you used the coefficients of ${m("x")} and ${m("y")} as the coordinates`),
        ptSlip(-h, -k, "you halved the coefficients but did not change their signs"),
        ptSlip(h, -k, `you changed the sign for ${m("x")} but not for ${m("y")}`),
        ptSlip(D, C0, `you used the coefficient of ${m("x")} and the constant term`),
      ];
    } else {
      const twice = ask === "diameter" ? 2 : 1;
      answer = symAnswer(rad.mul(twice));
      slips = [
        ...(right > 0
          ? [
              symSlip(
                S.root(right, twice),
                "you took the square root of the constant without completing the squares"
              ),
            ]
          : []),
        ...(right + h * h > 0
          ? [
              symSlip(
                S.root(right + h * h, twice),
                `you completed the square for ${m("x")} but not for ${m("y")}`
              ),
            ]
          : []),
        symSlip(
          S.root(right + D * D + E * E, twice),
          "you added the squares of the whole coefficients instead of the squares of their halves"
        ),
        ask === "diameter"
          ? symSlip(rad, "you found the radius, not the diameter")
          : ratSlip(R, "you did not take the square root of the right side"),
        ...(ask === "diameter"
          ? [symSlip(S.root(2 * R), "you doubled the number under the square root")]
          : []),
      ];
    }
    const steps: Draft["steps"] = [
      {
        label: "Group the terms",
        work: `Put the ${m("x")}-terms together, the ${m("y")}-terms together, and the constant on the right: ${m(
          `${lin([
            [1, "x^2"],
            [D, "x"],
          ])} + ${lin([
            [1, "y^2"],
            [E, "y"],
          ])} = ${right}`
        )}`,
      },
      {
        label: "Complete both squares",
        work: `Add ${m(`\\left(\\frac{${D}}{2}\\right)^2 = ${h * h}`)} and ${m(`\\left(\\frac{${E}}{2}\\right)^2 = ${k * k}`)} to both sides: ${m(eqTex(h, k, `${right} + ${h * h} + ${k * k} = ${R}`))}`,
      },
      {
        label: ask === "center" ? "Read the center" : `Read the ${ask}`,
        work:
          ask === "center"
            ? `The center is ${m(pair(h, k))}, the opposite signs of the numbers in the parentheses`
            : ask === "radius"
              ? m(`r = \\sqrt{${R}}${sym(rad) === `\\sqrt{${R}}` ? "" : ` = ${sym(rad)}`}`)
              : m(`r = ${sym(rad)}, \\text{ so } d = 2r = ${sym(rad.mul(2))}`),
      },
    ];
    return {
      format,
      stem: `${block(eq)}\nIn the ${XY}, the graph of the given equation is a circle. ${ask === "center" ? `What are the coordinates ${m("(x, y)")} of the center of the circle?` : `What is the length of the circle's ${ask}?`}`,
      answer,
      slips,
      asks: ask === "center" ? "the center of the circle" : `the ${ask} of the circle`,
      steps,
      check:
        ask === "center"
          ? `Expanding ${m(eqTex(h, k, String(R)))} gives back ${m(`x^2 + y^2 ${D < 0 ? "-" : "+"} ${Math.abs(D)}x ${E < 0 ? "-" : "+"} ${Math.abs(E)}y`)} with constant ${m(`${h * h + k * k} - ${R} = ${C0}`)}`
          : `The shortcut ${m("r^2 = \\left(\\frac{D}{2}\\right)^2 + \\left(\\frac{E}{2}\\right)^2 - C")} for ${m("x^2 + y^2 + Dx + Ey + C = 0")} gives ${m(`${h * h} + ${k * k} - ${paren(C0)} = ${R}`)}`,
      tip: "To complete the square, add the square of half of each linear coefficient to both sides",
      hint: `Group the ${m("x")}-terms and the ${m("y")}-terms, then complete the square for each.`,
      difficulty: Math.min(
        6,
        (ask === "center" ? 4 : ask === "radius" ? 5 : 6) + (moved && ask !== "diameter" ? 1 : 0)
      ),
      isCorrect: (cand) => {
        if (ask === "center") {
          const p = ptOf(cand);
          if (!p) return false;
          const [a, b] = p.map((q) => q.toNumber());
          // The expanded form is symmetric about the center in both directions.
          return (
            Math.abs(f(a + 1, b) - f(a - 1, b)) < 1e-9 && Math.abs(f(a, b + 1) - f(a, b - 1)) < 1e-9
          );
        }
        if (!cand.value || !pos(cand.value)) return false;
        const rr = cand.value.divRat(ask === "diameter" ? 2 : 1);
        return sq(rr).eq(
          F(D * D, 4)
            .add(F(E * E, 4))
            .sub(C0)
        );
      },
    };
  },
};

export const pointsAndMoves: Template = {
  id: "ceq.points-and-moves",
  skill: SKILL,
  label: "Points on a circle, and circles that grow or move",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = rng.nonzero(-12, 12);
    const k = rng.nonzero(-12, 12);
    const kind = rng.pick(["point", "point", "grow", "scale", "shift"] as const);
    if (kind === "point") {
      const greatest = rng.bool(0.6);
      let dx: number;
      let dy: number;
      let r: number;
      if (greatest) {
        const t = rng.pick(scaledTriples(5, 30)).t;
        [dx, dy] = rng.bool() ? [t[0], t[1]] : [t[1], t[0]];
        dx *= rng.sign();
        r = t[2];
      } else {
        r = rng.int(2, 12);
        dx = r * rng.sign();
        dy = 0;
      }
      const x0 = h + dx;
      const R = r * r;
      const ans = k + Math.abs(dy);
      const slips: Slip[] = greatest
        ? [
            ratSlip(k - Math.abs(dy), `you found the smaller value of ${m("c")}`),
            ratSlip(
              -k + Math.abs(dy),
              `you used the wrong sign for the ${m("y")}-coordinate of the center`
            ),
            ratSlip(
              k + r,
              `you added the radius to the center's ${m("y")}-coordinate, which works only directly above the center`
            ),
            ratSlip(k + dy * dy, "you did not take the square root"),
          ]
        : [
            ratSlip(-k, `you used the wrong sign for the ${m("y")}-coordinate of the center`),
            ratSlip(k + r, "you added the radius to the y-coordinate as well"),
            ratSlip(k - r, "you subtracted the radius from the y-coordinate as well"),
            ratSlip(R, "you used the right side of the equation"),
          ];
      return {
        format,
        stem: `In the ${XY}, the graph of the equation ${m(eqTex(h, k, String(R)))} is a circle. The point ${m(`(${x0}, c)`)}, where ${m("c")} is a constant, lies on this circle. ${greatest ? `What is the greatest possible value of ${m("c")}?` : `What is the value of ${m("c")}?`}`,
        answer: numAnswer(ans, m(String(ans))),
        slips,
        asks: greatest
          ? `the larger of the two ${m("y")}-values on the circle at ${m(`x = ${x0}`)}`
          : `the ${m("y")}-coordinate of the point`,
        steps: [
          {
            label: "Substitute the point",
            work: `${m(`(${x0} - ${paren(h)})^2 + (c - ${paren(k)})^2 = ${R}`)}, so ${m(`${dx * dx} + ${sqTerm("c", k)} = ${R}`)}`,
          },
          {
            label: `Solve for ${m("c")}`,
            work: greatest
              ? `${m(`${sqTerm("c", k)} = ${dy * dy}`)}, so ${m(`c ${k > 0 ? "-" : "+"} ${Math.abs(k)} = \\pm ${Math.abs(dy)}`)}. The greater value is ${m(`c = ${ans}`)}`
              : `${m(`${sqTerm("c", k)} = 0`)}, so ${m(`c = ${k}`)}; the point is ${n(r)} units ${dx > 0 ? "right" : "left"} of the center, on the same horizontal line`,
          },
        ],
        check: `Substituting ${m(pair(x0, ans))}: ${m(`${dx * dx} + ${dy * dy} = ${R}`)}, which matches the right side`,
        tip: "To test or find a point on a circle, substitute its coordinates into the equation; two answers usually appear, one above and one below the center",
        hint: `Substitute ${m(`x = ${x0}`)} into the equation.`,
        difficulty: greatest ? 4 : 2,
        isCorrect: (cand) => {
          const q = cand.value?.asRat();
          if (!q) return false;
          const ok = q
            .sub(k)
            .pow(2)
            .add(dx * dx)
            .eq(R);
          return ok && (!greatest || q.toNumber() >= k);
        },
      };
    }
    const r = rng.int(2, 12);
    const R = r * r;
    const [N1, N2] = rng.pick([
      ["A", "B"],
      ["F", "G"],
      ["M", "P"],
      ["K", "L"],
    ]);
    if (kind === "grow" || kind === "scale") {
      const grow = kind === "grow";
      const d = rng.int(1, 6);
      const mult = rng.pick([2, 3]);
      const newR = grow ? r + d : mult * r;
      const ans = newR * newR;
      const change = grow
        ? `${n(d)} ${d === 1 ? "unit" : "units"} greater than the radius of circle ${m(N1)}`
        : `${mult === 2 ? "twice" : "three times"} the radius of circle ${m(N1)}`;
      return {
        format,
        stem: `In the ${XY}, circle ${m(N1)} is defined by the equation ${m(eqTex(h, k, String(R)))}. Circle ${m(N2)} has the same center as circle ${m(N1)}, and the radius of circle ${m(N2)} is ${change}. Circle ${m(N2)} is defined by the equation ${m(eqTex(h, k, "p"))}, where ${m("p")} is a constant. What is the value of ${m("p")}?`,
        answer: numAnswer(ans, m(String(ans))),
        slips: grow
          ? [
              ratSlip(R + d, `you added ${n(d)} to the radius squared instead of to the radius`),
              ratSlip(R + d * d, `you added ${m(`${d}^2`)} to the radius squared`),
              ratSlip(newR, `you found the new radius, ${n(newR)}, and did not square it`),
              ratSlip((R + d) ** 2, "you added to the radius squared and then squared again"),
            ]
          : [
              ratSlip(
                mult * R,
                `you multiplied the radius squared by ${n(mult)} instead of squaring the new radius`
              ),
              ratSlip(newR, `you found the new radius, ${n(newR)}, and did not square it`),
              ratSlip(R * R * mult * mult, "you squared the right side again"),
              ratSlip(R + mult, `you added ${n(mult)} to the right side`),
            ],
        asks: `the new right side, the square of the new radius`,
        steps: [
          {
            label: `Find the radius of circle ${m(N1)}`,
            work: m(`r^2 = ${R}, \\text{ so } r = ${r}`),
          },
          {
            label: `Find the radius of circle ${m(N2)}`,
            work: grow ? m(`${r} + ${d} = ${newR}`) : m(`${mult}(${r}) = ${newR}`),
          },
          { label: "Square it", work: m(`p = ${newR}^2 = ${ans}`) },
        ],
        check: `The point ${m(pair(h + newR, k))} is ${n(newR)} from the center; substituting it gives ${m(`${newR}^2 + 0^2 = ${ans}`)}`,
        tip: "Change the radius, not the radius squared: find r, adjust it, then square it again",
        hint: `What is the radius of circle ${m(N1)}?`,
        difficulty: grow ? 3 : 3,
        // p must be the square of the new radius: the point (h + new radius, k) lies on circle B.
        isCorrect: (cand) => {
          const q = cand.value?.asRat();
          return !!q && q.isInt() && q.n > 0 && S.root(q.n).eq(newR);
        },
      };
    }
    const sx = rng.nonzero(-9, 9);
    const sy = rng.nonzero(-9, 9);
    const nh = h + sx;
    const nk = k + sy;
    need(nh !== 0 && nk !== 0, "new center off the axes");
    const ans = -nh - nk;
    const move = `${Math.abs(sx)} ${Math.abs(sx) === 1 ? "unit" : "units"} to the ${sx > 0 ? "right" : "left"} and ${Math.abs(sy)} ${Math.abs(sy) === 1 ? "unit" : "units"} ${sy > 0 ? "up" : "down"}`;
    return {
      format,
      stem: `Circle ${m(N1)} in the ${XY} is represented by the equation ${m(eqTex(h, k, String(R)))}. Circle ${m(N2)} is obtained by shifting circle ${m(N1)} ${move}. An equation representing circle ${m(N2)} is ${m(`(x + a)^2 + (y + b)^2 = ${R}`)}, where ${m("a")} and ${m("b")} are constants. What is the value of ${m("a + b")}?`,
      answer: numAnswer(ans, m(String(ans))),
      slips: [
        ratSlip(
          nh + nk,
          `you used the new center's coordinates without changing their signs for the form ${m("(x + a)^2")}`
        ),
        ratSlip(-(h - sx) - (k - sy), "you shifted the center in the opposite directions"),
        ratSlip(-h - k, "you used the original circle's center"),
        ratSlip(-(h + sy) - (k + sx), "you mixed up the horizontal and vertical shifts"),
      ],
      asks: `the sum ${m("a + b")} for the shifted circle, written with plus signs`,
      steps: [
        { label: `Find the center of circle ${m(N1)}`, work: `The center is ${m(pair(h, k))}` },
        {
          label: "Shift the center",
          work: `Right and up are positive: ${m(`(${h} ${sx > 0 ? "+" : "-"} ${Math.abs(sx)}, ${k} ${sy > 0 ? "+" : "-"} ${Math.abs(sy)}) = ${pair(nh, nk)}`)}`,
        },
        {
          label: "Match the plus-sign form",
          work: `${m(eqTex(nh, nk, String(R)))} is ${m(`(x + ${paren(-nh)})^2 + (y + ${paren(-nk)})^2`)}, so ${m(`a = ${-nh}`)}, ${m(`b = ${-nk}`)} and ${m(`a + b = ${ans}`)}`,
        },
      ],
      check: `Shifting moves every point the same way: the old rightmost point ${m(pair(h + r, k))} moves to ${m(pair(nh + r, nk))}, which satisfies ${m(eqTex(nh, nk, String(R)))}`,
      tip: "Move the center, then write each coordinate with the opposite sign inside the parentheses",
      hint: `Where does the center ${m(pair(h, k))} end up after the shift?`,
      difficulty: 5,
      isCorrect: (cand) => {
        const q = cand.value?.asRat();
        if (!q) return false;
        // The shifted rightmost point lies on the new circle exactly when -a, -b is the new center.
        const c2 = [h + r + sx, k + sy];
        return q.eq(-(c2[0] - r) - c2[1]);
      },
    };
  },
};

export { tangentLine };

export const TEMPLATES: Template[] = [standard, completeSquare, pointsAndMoves, tangentLine];
