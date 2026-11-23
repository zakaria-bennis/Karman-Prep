/*
 * m-scatterplots: lines of best fit and predicting from them. Item models after the bank's own
 * questions for this skill: predict from a line of best fit given as an equation (or work back
 * from a prediction to x); residuals and the points above or below a drawn line of best fit;
 * and the meaning of the slope or the y-intercept in context. Scatterplots are drawn around the
 * chosen line with visible scatter, and every check works from the line's own equation by
 * another route (substitute back, recount the points against the line).
 */
import type { FigureSpec, PlaneFrame } from "@/lib/figures/engine/spec";
import { need } from "../core/build";
import { line, scatter } from "../core/figures";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { lin, m, num } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { numAns, numSlip, statement, stmtSlip, valueOf } from "./_data-common";

const SKILL = "m-scatterplots";

interface FitCtx {
  items: string;
  xName: string;
  yName: string;
  xTitle: string;
  yTitle: string;
  xs: [number, number, number];
  slope: [number, number];
  intercept: [number, number];
  ySing: string;
  yUnits: string;
  xSing: string;
  xUnits: string;
  xMeasure: string;
  yMeasure: string;
  x0: string;
}

const FIT_CTX: FitCtx[] = [
  {
    items: "students",
    xName: "the number of hours a student studied",
    yName: "the student's test score, in points",
    xTitle: "Hours studied",
    yTitle: "Test score (points)",
    xs: [1, 10, 1],
    slope: [20, 35],
    intercept: [40, 55],
    ySing: "point of test score",
    yUnits: "points",
    xSing: "hour studied",
    xUnits: "hours",
    xMeasure: "number of hours studied",
    yMeasure: "test score",
    x0: "a student studies 0 hours",
  },
  {
    items: "cars",
    xName: "the age of a car, in years",
    yName: "the car's value, in thousands of dollars",
    xTitle: "Age (years)",
    yTitle: "Value (thousands of dollars)",
    xs: [1, 10, 1],
    slope: [-34, -15],
    intercept: [36, 44],
    ySing: "thousand dollars of value",
    yUnits: "thousand dollars",
    xSing: "year of age",
    xUnits: "years",
    xMeasure: "age of a car",
    yMeasure: "value of a car",
    x0: "a car is 0 years old",
  },
  {
    items: "days",
    xName: "the high temperature on a day, in degrees Fahrenheit",
    yName: "the number of cups of cocoa a cafe sold that day",
    xTitle: "High temperature (degrees Fahrenheit)",
    yTitle: "Cups of cocoa sold",
    xs: [20, 70, 5],
    slope: [-12, -5],
    intercept: [90, 100],
    ySing: "cup of cocoa",
    yUnits: "cups",
    xSing: "degree Fahrenheit",
    xUnits: "degrees Fahrenheit",
    xMeasure: "high temperature",
    yMeasure: "number of cups of cocoa sold",
    x0: "the high temperature is 0 degrees Fahrenheit",
  },
  {
    items: "measurements",
    xName: "the time since an experiment began, in hours",
    yName: "the temperature of an object, in degrees Fahrenheit",
    xTitle: "Time (hours)",
    yTitle: "Temperature (degrees Fahrenheit)",
    xs: [1, 10, 1],
    slope: [30, 80],
    intercept: [20, 60],
    ySing: "degree Fahrenheit",
    yUnits: "degrees Fahrenheit",
    xSing: "hour",
    xUnits: "hours",
    xMeasure: "time since the experiment began",
    yMeasure: "temperature of the object",
    x0: "the experiment begins",
  },
  {
    items: "plants",
    xName: "the number of days since a plant was planted",
    yName: "the plant's height, in centimeters",
    xTitle: "Days since planting",
    yTitle: "Height (centimeters)",
    xs: [2, 20, 2],
    slope: [8, 24],
    intercept: [2, 9],
    ySing: "centimeter of height",
    yUnits: "centimeters",
    xSing: "day",
    xUnits: "days",
    xMeasure: "number of days since planting",
    yMeasure: "height of a plant",
    x0: "the plant is planted",
  },
  {
    items: "trees",
    xName: "the height of a tree, in feet",
    yName: "the tree's trunk diameter, in inches",
    xTitle: "Height (feet)",
    yTitle: "Trunk diameter (inches)",
    xs: [10, 60, 5],
    slope: [2, 6],
    intercept: [1, 6],
    ySing: "inch of trunk diameter",
    yUnits: "inches",
    xSing: "foot of height",
    xUnits: "feet",
    xMeasure: "height of a tree",
    yMeasure: "trunk diameter of a tree",
    x0: "a tree's height is 0 feet",
  },
];

interface Fit {
  c: FitCtx;
  slope: Frac;
  b: Frac;
  eq: string;
  at: (x: Frac | number) => Frac;
}

/** A line of best fit for the context: slope to one decimal place, a whole-number y-intercept. */
function drawFit(rng: Rng, c: FitCtx): Fit {
  const slope = F(rng.int(c.slope[0], c.slope[1]), 10);
  need(!slope.abs().eq(1), "a slope of 1 reads oddly");
  const b = F(rng.int(c.intercept[0], c.intercept[1]));
  const at = (x: Frac | number) => slope.mul(x).add(b);
  need(at(c.xs[1]).gt(2), "line leaves the first quadrant");
  return { c, slope, b, eq: `y = ${lin([[slope, "x"]], b, { decimal: true })}`, at };
}

/** A scatterplot of points around the fit line, off it by one to three grid steps. */
function scatterAround(
  rng: Rng,
  fit: Fit,
  withLine: boolean
): { figure: FigureSpec; pts: [number, number][] } {
  const [x0, x1, dx] = fit.c.xs;
  const xs: number[] = [];
  for (let x = x0; x <= x1; x += dx) xs.push(x);
  const peak = Math.max(fit.at(x0).toNumber(), fit.at(x1).toNumber());
  const yStep = [1, 2, 5, 10, 20].find((s) => peak / s <= 12) ?? 20;
  // Points sit half a grid step to one grid step off the line: visible scatter around a clear trend.
  const pg = yStep / 2;
  const pts: [number, number][] = xs.map((x) => {
    const base = Math.round(fit.at(x).toNumber() / pg) * pg;
    for (let tries = 0; tries < 12; tries++) {
      const y = base + rng.pick([-2, -1, 1, 2]) * pg;
      const off = F(y).sub(fit.at(x)).toNumber();
      if (y > 0 && Math.abs(off) >= 0.8 * pg && Math.abs(off) <= 2 * pg) return [x, y];
    }
    throw new RangeError("no point off the line");
  });
  const yTop = Math.ceil((Math.max(...pts.map((p) => p[1]), peak) + yStep) / yStep) * yStep;
  const fr: PlaneFrame = {
    x: [0, x1 + dx],
    y: [0, yTop],
    step: dx,
    yStep,
    ...(yTop / yStep > 8 ? { yLabelStep: yStep * 2 } : {}),
    ...((x1 + dx) / dx > 8 ? { labelStep: dx * 2 } : {}),
    arrows: true,
    xLabel: "x",
    yLabel: "y",
    xTitle: fit.c.xTitle,
    yTitle: fit.c.yTitle,
    originLabel: "O",
  };
  const parts = withLine
    ? [line("f", fit.eq.replace(/\s/g, ""), fit.slope.toNumber(), fit.b.toNumber(), fr)]
    : [];
  return { figure: scatter(fr, pts, parts), pts };
}

const dec = (q: Frac) => num(q, { decimal: true });
const plusB = (b: Frac) => `${b.n < 0 ? "-" : "+"} ${dec(b.abs())}`;

// ---------------------------------------------------------------- predict from the equation

export const predict: Template = {
  id: "scat.predict",
  skill: SKILL,
  label: "Predict y from a line of best fit, or find x for a predicted y",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(FIT_CTX);
    const fit = drawFit(rng, c);
    const n = rng.int(8, 14);
    const forward = rng.bool(0.65);
    const grid: number[] = [];
    for (let x = c.xs[0]; x <= c.xs[1]; x += c.xs[2]) grid.push(x);
    const wholes = grid.slice(1, -1).filter((v) => fit.at(v).isInt());
    const x = forward ? rng.int(c.xs[0], c.xs[1]) : wholes.length ? rng.pick(wholes) : -1;
    need(x > 0, "no whole prediction");
    const y = fit.at(x);
    const showPlot = rng.bool(0.4);
    const plot = showPlot ? scatterAround(rng, fit, true) : null;
    const lead = `For ${n} ${c.items}, a ${showPlot ? "scatterplot shows" : "study recorded"} the relationship between ${c.xName}, ${m("x")}, and ${c.yName}, ${m("y")}. The equation of a line of best fit for the data is ${m(fit.eq)}, for ${m(`${c.xs[0]} \\le x \\le ${c.xs[1]}`)}.`;
    const clean = (s: Slip) =>
      s.value!.asRat()!.terminates() && s.value!.asRat()!.decimalPlaces() <= 2;
    if (forward) {
      const slips: Slip[] = [
        numSlip(
          fit.slope.mul(x),
          `you multiplied by the slope but left out the y-intercept, ${dec(fit.b)}`
        ),
        numSlip(fit.b.mul(x).add(fit.slope), "you swapped the slope and the y-intercept"),
        numSlip(fit.slope.mul(x).sub(fit.b), "you subtracted the y-intercept instead of adding it"),
        numSlip(
          fit.slope.add(fit.b).add(x),
          "you added the numbers instead of multiplying the slope by x"
        ),
        numSlip(
          F(x).sub(fit.b).div(fit.slope),
          "you solved for x as if the given value were a y-value"
        ),
      ].filter(clean);
      return {
        format,
        stem: `${lead}\nWhat is the predicted value of ${m("y")} when ${m(`x = ${x}`)}?`,
        figure: plot?.figure,
        answer: numAns(y),
        slips,
        asks: `the y-value the line predicts at ${m(`x = ${x}`)}, in ${c.yUnits}`,
        steps: [
          {
            label: "Substitute the given x-value",
            work: m(`y = ${dec(fit.slope)}(${x}) ${plusB(fit.b)}`),
          },
          {
            label: "Evaluate the prediction",
            work: m(`y = ${dec(fit.slope.mul(x))} ${plusB(fit.b)} = ${dec(y)}`),
          },
        ],
        check: `Working back: ${m(`\\frac{${dec(y)} - ${dec(fit.b)}}{${dec(fit.slope)}} = ${x}`)}, the given x-value`,
        tip: "To predict from a line of best fit, substitute the x-value into its equation; the prediction is a y-value on the line, not a data point",
        hint: `Substitute ${m(`x = ${x}`)} into the equation of the line.`,
        difficulty: Math.min(3, 1 + (fit.slope.n < 0 ? 1 : 0) + (format === "spr" ? 1 : 0)),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && v.sub(fit.b).div(fit.slope).eq(x);
        },
      };
    }
    const slips: Slip[] = [
      numSlip(fit.slope.mul(y).add(fit.b), `you substituted ${dec(y)} for x instead of for y`),
      numSlip(
        y.div(fit.slope),
        "you divided by the slope without first subtracting the y-intercept"
      ),
      numSlip(y.add(fit.b).div(fit.slope), "you added the y-intercept instead of subtracting it"),
      numSlip(y.sub(fit.b), "you subtracted the y-intercept but did not divide by the slope"),
    ].filter(clean);
    return {
      format,
      stem: `${lead}\nFor what value of ${m("x")} does the line of best fit predict ${m(`y = ${dec(y)}`)}?`,
      figure: plot?.figure,
      answer: numAns(x),
      slips,
      asks: `the x-value at which the line's predicted y-value is ${dec(y)}`,
      steps: [
        {
          label: "Set the equation equal to the prediction",
          work: m(`${dec(y)} = ${lin([[fit.slope, "x"]], fit.b, { decimal: true })}`),
        },
        {
          label: `Get the ${m("x")}-term alone`,
          work: m(`${dec(y.sub(fit.b))} = ${dec(fit.slope)}x`),
        },
        {
          label: `Find ${m("x")}`,
          work: m(`x = \\frac{${dec(y.sub(fit.b))}}{${dec(fit.slope)}} = ${x}`),
        },
      ],
      check: m(`${dec(fit.slope)}(${x}) ${plusB(fit.b)} = ${dec(y)}`) + ", the prediction given",
      tip: "When the question gives a predicted y-value, set the equation equal to it and solve for x",
      hint: `Replace ${m("y")} with ${dec(y)} and solve for ${m("x")}.`,
      difficulty: format === "spr" || fit.slope.n < 0 ? 3 : 2,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && fit.at(v).eq(y);
      },
    };
  },
};

// ---------------------------------------------------------------- residuals and points off the line

export const residual: Template = {
  id: "scat.residual",
  skill: SKILL,
  label: "A residual, or how many points lie above or below a line of best fit",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(FIT_CTX);
    const fit = drawFit(rng, c);
    const { figure, pts } = scatterAround(rng, fit, true);
    const n = pts.length;
    const lead = `The scatterplot shows ${n} data points and a line of best fit for the relationship between ${c.xName}, ${m("x")}, and ${c.yName}, ${m("y")}. The line of best fit has equation ${m(fit.eq)}.`;
    if (rng.bool(0.6)) {
      const [px, py] = rng.pick(pts);
      const pred = fit.at(px);
      const res = F(py).sub(pred);
      need(res.decimalPlaces() <= 2, "clean residual");
      return {
        format,
        stem: `${lead}\nWhat is the residual for the data point ${m(`(${px}, ${py})`)}, that is, the actual ${m("y")}-value minus the ${m("y")}-value predicted by the line?`,
        figure,
        answer: numAns(res),
        slips: [
          numSlip(res.neg(), "you subtracted in the wrong order: predicted minus actual"),
          numSlip(pred, "you gave the predicted y-value instead of the difference"),
          numSlip(F(py).sub(fit.slope.mul(px)), "you left the y-intercept out of the prediction"),
          numSlip(F(py).sub(fit.b), "you subtracted only the y-intercept"),
        ],
        asks: `actual minus predicted at ${m(`x = ${px}`)}, which is positive when the point lies above the line`,
        steps: [
          {
            label: "Find the predicted value",
            work: m(`y = ${dec(fit.slope)}(${px}) ${plusB(fit.b)} = ${dec(pred)}`),
          },
          {
            label: "Subtract predicted from actual",
            work: m(`${py} - ${dec(pred)} = ${dec(res)}`),
          },
        ],
        check: `The point lies ${res.sign() > 0 ? "above" : "below"} the line in the scatterplot, so its residual is ${res.sign() > 0 ? "positive" : "negative"}, and ${m(`${dec(pred)} ${res.sign() > 0 ? "+" : "-"} ${dec(res.abs())} = ${py}`)}`,
        tip: "A residual is actual minus predicted: points above the line have positive residuals and points below have negative ones",
        hint: `Find the y-value the line predicts at ${m(`x = ${px}`)} first.`,
        difficulty: Math.min(4, 2 + (res.sign() < 0 ? 1 : 0) + (format === "spr" ? 1 : 0)),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && F(py).sub(v).sub(fit.b).div(fit.slope).eq(px);
        },
      };
    }
    const above = rng.bool(0.5);
    const isAbove = (p: [number, number]) => F(p[1]).gt(fit.at(p[0]));
    const count = pts.filter((p) => isAbove(p) === above).length;
    const half = Math.floor(n / 2);
    need(count !== half && n - count !== half, "half on each side");
    const ask = above
      ? `For how many of the data points is the actual ${m("y")}-value greater than the ${m("y")}-value predicted by the line of best fit?`
      : `For how many of the data points does the line of best fit predict a ${m("y")}-value greater than the actual ${m("y")}-value?`;
    const side = above ? "above" : "below";
    return {
      format: "mc",
      stem: `${lead}\n${ask}`,
      figure,
      answer: numAns(count),
      slips: [
        numSlip(n - count, `you counted the points ${above ? "below" : "above"} the line instead`),
        numSlip(half, "you assumed a line of best fit has half the points on each side"),
        numSlip(n, "you counted every data point"),
      ],
      asks: above
        ? "the number of points that lie above the line (actual greater than predicted)"
        : "the number of points that lie below the line (predicted greater than actual)",
      steps: [
        {
          label: "Translate the condition",
          work: above
            ? "Actual greater than predicted means the point lies above the line"
            : "Predicted greater than actual means the line passes above the point, so the point lies below the line",
        },
        {
          label: `Count the points ${side} the line`,
          work: `${count} of the ${n} points lie ${side} the line`,
        },
      ],
      check: `The other ${n - count} points lie on the other side of the line, and ${m(`${count} + ${n - count} = ${n}`)}`,
      tip: "Above the line means actual is greater than predicted (a positive residual); below means the line predicts too much",
      hint: "Decide whether the points you want lie above or below the line.",
      difficulty: above ? 3 : 4,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null) return false;
        let tally = 0;
        for (const [x, y] of pts) {
          const r = F(y).sub(fit.slope.mul(x)).sub(fit.b).sign();
          if ((above && r > 0) || (!above && r < 0)) tally++;
        }
        return v.eq(tally);
      },
    };
  },
};

// ---------------------------------------------------------------- interpret the slope or the y-intercept

/**
 * What a statement claims, tested against the line itself: "rate|sign|size|yx" says the
 * predicted y changes by size per unit of x; "start|value|x0|y" says the prediction at x = 0.
 */
function claimHolds(key: string, fit: Fit): boolean {
  const [kind, a, b, c] = key.split("|");
  if (kind === "rate")
    return (
      c === "yx" &&
      Number(a) === fit.slope.sign() &&
      Frac.parse(b).eq(fit.at(1).sub(fit.at(0)).abs())
    );
  if (kind === "start") return b === "x0" && c === "y" && fit.at(0).eq(Frac.parse(a));
  return false;
}

export const interpret: Template = {
  id: "scat.interpret",
  skill: SKILL,
  label: "Interpret the slope or y-intercept of a line of best fit in context",
  difficulty: [2, 4],
  formats: ["mc"],
  make(rng): Draft {
    const c = rng.pick(FIT_CTX);
    const fit = drawFit(rng, c);
    const { figure, pts } = scatterAround(rng, fit, true);
    const slopeQ = rng.bool(0.65);
    const s = fit.slope;
    const dir = (sign: number) => (sign > 0 ? "increases" : "decreases");
    const mag = dec(s.abs());
    const bTxt = dec(fit.b);
    const rateText = (sign: number, value: string) =>
      `The predicted ${c.yMeasure} ${dir(sign)} by ${value} ${c.yUnits} for each additional ${c.xSing}.`;
    const startText = (value: string) =>
      `The predicted ${c.yMeasure} when ${c.x0} is ${value} ${c.yUnits}.`;
    const right: Answer = slopeQ
      ? statement(rateText(s.sign(), mag), `rate|${s.sign()}|${s.abs().toDecimal()}|yx`)
      : statement(startText(bTxt), `start|${fit.b.toDecimal()}|x0|y`);
    const swapped = `The predicted ${c.xMeasure} ${dir(s.sign())} by ${mag} ${c.xUnits} for each additional ${c.ySing}.`;
    const slips: Slip[] = slopeQ
      ? [
          stmtSlip(
            rateText(-s.sign(), mag),
            `rate|${-s.sign()}|${s.abs().toDecimal()}|yx`,
            `you reversed the direction: a ${s.sign() > 0 ? "positive" : "negative"} slope means the prediction ${dir(s.sign())}`
          ),
          stmtSlip(
            rateText(s.sign(), bTxt),
            `rate|${s.sign()}|${fit.b.toDecimal()}|yx`,
            "you used the y-intercept as the rate of change"
          ),
          stmtSlip(
            swapped,
            `rate|${s.sign()}|${s.abs().toDecimal()}|xy`,
            "you swapped the roles of the two variables"
          ),
          stmtSlip(
            startText(mag),
            `start|${s.abs().toDecimal()}|x0|y`,
            "you read the slope as a starting value"
          ),
        ]
      : [
          stmtSlip(
            rateText(1, bTxt),
            `rate|1|${fit.b.toDecimal()}|yx`,
            "you read the y-intercept as a rate of change"
          ),
          stmtSlip(
            startText(mag),
            `start|${s.abs().toDecimal()}|x0|y`,
            "you used the slope as the starting value"
          ),
          stmtSlip(
            `The predicted ${c.xMeasure} when the ${c.yMeasure} is 0 is ${bTxt} ${c.xUnits}.`,
            `start|${fit.b.toDecimal()}|y0|x`,
            "you swapped the roles of the two variables"
          ),
          stmtSlip(
            rateText(s.sign(), mag),
            `rate|${s.sign()}|${s.abs().toDecimal()}|yx`,
            "you described the slope, not the y-intercept"
          ),
        ];
    return {
      format: "mc",
      stem: `The scatterplot shows the relationship between ${c.xName}, ${m("x")}, and ${c.yName}, ${m("y")}, for ${pts.length} ${c.items}. A line of best fit for the data is shown, and its equation is ${m(fit.eq)}.\nWhich of the following is the best interpretation of the ${slopeQ ? "slope" : `${m("y")}-intercept`} of the line of best fit in this context?`,
      figure,
      answer: right,
      slips,
      asks: slopeQ
        ? `what the slope, ${m(dec(s))}, means: the predicted change in ${m("y")} for each increase of 1 in ${m("x")}`
        : `what the ${m("y")}-intercept, ${m(bTxt)}, means: the predicted ${m("y")}-value when ${m("x")} is 0`,
      steps: slopeQ
        ? [
            {
              label: "Read the slope",
              work: `In ${m(fit.eq)}, the coefficient of ${m("x")} is ${m(dec(s))}`,
            },
            {
              label: "Say what it measures",
              work: `Each increase of 1 in ${m("x")} (one more ${c.xSing}) changes the predicted ${m("y")} by ${m(dec(s))}, so the predicted ${c.yMeasure} ${dir(s.sign())} by ${mag} ${c.yUnits}`,
            },
          ]
        : [
            {
              label: "Read the y-intercept",
              work: `In ${m(fit.eq)}, the constant term is ${m(bTxt)}`,
            },
            {
              label: "Say what it measures",
              work: `It is the predicted ${m("y")}-value when ${m("x = 0")}, that is, when ${c.x0}`,
            },
          ],
      check: slopeQ
        ? `From ${m("x = 1")} to ${m("x = 2")} the prediction goes from ${m(dec(fit.at(1)))} to ${m(dec(fit.at(2)))}, a change of ${m(dec(s))}`
        : `Substituting ${m("x = 0")} gives ${m(`y = ${dec(fit.at(0))}`)}`,
      tip: "In a line of best fit, the slope is the predicted change in y per unit of x, and the y-intercept is the predicted y when x is 0",
      hint: slopeQ
        ? `Ask what happens to the predicted ${m("y")} when ${m("x")} goes up by 1.`
        : `Ask what the equation predicts when ${m("x")} is 0.`,
      difficulty: slopeQ ? (s.sign() < 0 ? 3 : 2) : 4,
      isCorrect: (cand) => cand.key !== undefined && claimHolds(cand.key, fit),
    };
  },
};

export const TEMPLATES: Template[] = [predict, residual, interpret];
