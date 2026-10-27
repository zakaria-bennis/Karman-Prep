// FN-53 to FN-58 against live Desmos (College Board version, https://www.desmos.com/testing/
// collegeboard/graphing, captured 2026-10-26): each row `T=…` and the members read after it, as
// the expression list showed them (Calc.expressionAnalysis values, full precision). Undefined is
// NaN; an error is a string.

import { describe, expect, it } from "vitest";
import { evaluateLatex } from "../eval/compile";
import type { Value } from "../eval/values";

const M = {
  estimate: "\\operatorname{estimate}",
  stderr: "\\operatorname{stderr}",
  score: "\\operatorname{score}",
  p: "p",
  pleft: "\\operatorname{pleft}",
  pright: "\\operatorname{pright}",
  dof: "\\operatorname{dof}",
  lower: "\\operatorname{conf}(0.95).\\operatorname{lower}",
  upper: "\\operatorname{conf}(0.95).\\operatorname{upper}",
} as const;
type Member = keyof typeof M;

// Desmos's values; a member Desmos refused is left out (analysis.test covers those errors).
const CASES: [string, Partial<Record<Member, number>>][] = [
  [
    "\\operatorname{zproptest}(12,40)",
    { estimate: 0.3, stderr: 0.07245688373094719, score: -2.5298221281347035, p: 0.011412036386001658, lower: 0.1579871174553373, upper: 0.44201288254466264 }, // prettier-ignore
  ],
  [
    "\\operatorname{ztest}(10,2,25)",
    { estimate: 2, stderr: 7.905694150420948, score: 0.25298221281347033, p: 0.8002819583293618, pleft: 0.5998590208353192, pright: 0.4001409791646809, lower: -13.49487580761404, upper: 17.49487580761404 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}([1,2,3,4,5])",
    { estimate: 3, stderr: 0.7071067811865476, score: 4.242640687119285, p: 0.013235599563682674, pleft: 0.9933822002181587, pright: 0.006617799781841337, dof: 4, lower: 1.0367568385224422, upper: 4.963243161477558 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}([1,2,3,4,5],[2,4,6,9])",
    { estimate: -2.25, stderr: 1.6520189667999174, score: -1.3619698352243594, p: 0.23971948011118535, pleft: 0.11985974005559268, pright: 0.8801402599444074, dof: 4.333221109334231, lower: -6.700928814252318, upper: 2.2009288142523182 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}([1,2,3,4,5],[2,4,6,9,7])",
    { estimate: -2.6, stderr: 1.4, score: -1.8571428571428574, p: 0.1092325368271916, pleft: 0.0546162684135958, pright: 0.9453837315864042, dof: 6.45213301981861, lower: -5.9683196957906075, upper: 0.7683196957906073 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}([1,2,3,4,5]-[2,4,6,9,7])",
    { estimate: -2.6, stderr: 0.6782329983125267, score: -3.833490860027326, p: 0.018562564501560474, dof: 4, lower: -4.483076688348438, upper: -0.7169233116515614 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}(10,2,3,12,4,5)",
    { estimate: -2, stderr: 1.7272328544042153, score: -1.1579214666396975, p: 0.26173186379891833, dof: 18.367345875241025, lower: -5.6235863881938535, upper: 1.623586388193853 }, // prettier-ignore
  ],
  [
    "\\operatorname{ztest}(10,2,3,12,4,5)",
    { estimate: -2, stderr: 1.7272328544042153, score: -1.1579214666396975, p: 0.24689608636420415, lower: -5.385314187546577, upper: 1.385314187546577 }, // prettier-ignore
  ],
  [
    "\\operatorname{ztest}([1,2,3],2,[4,5,6,7],3)",
    { estimate: -3.5, stderr: 1.8929694486000912, score: -1.84894690328381, p: 0.06446548007781994, lower: -7.210151943090825, upper: 0.2101519430908243 }, // prettier-ignore
  ],
  [
    "\\operatorname{ttest}(10,2,3)",
    { estimate: 2, stderr: 0.9486832980505138, score: 2.1081851067789197, p: 0.06425884909585154, dof: 9, lower: -0.14607071791199377, upper: 4.146070717911994 }, // prettier-ignore
  ],
  [
    "\\operatorname{zproptest}(12,40,30,50)",
    { estimate: -0.3, stderr: 0.10024968827881711, score: -2.834733547569204, p: 0.004586392080253492, pleft: 0.002293196040126746, lower: -0.49648577848784875, upper: -0.10351422151215123 }, // prettier-ignore
  ],
  ["\\operatorname{chisqtest}([10,20],[30,25])", { score: 3.505892255892255, p: 0.0611508975760674, dof: 1 }], // prettier-ignore
  ["\\operatorname{chisqgof}([10,20,30])", { score: 10, p: 0.006737946999085466, dof: 2 }],
  ["\\operatorname{chisqgof}([10,20,30],[1,1,2])", { score: 3.3333333333333335, p: 0.18887560283756177, dof: 2 }], // prettier-ignore
  ["\\operatorname{ztest}([1,2],-1)", { score: -2.121320343559643, p: 0.03389485352468927 }],
  ["\\operatorname{ztest}([1,2],0)", { score: NaN, p: 0 }],
  ["\\operatorname{ttest}([1,1,1])", { score: NaN, p: 0 }],
  ["\\operatorname{zproptest}(50,40)", { score: NaN, p: NaN }],
  ["\\operatorname{zproptest}(-1,40)", { score: -6.640783086353597, p: 3.1202094184962167e-11 }],
  ["\\operatorname{ttest}(10,2,-3)", { score: NaN, p: NaN }],
  ["\\operatorname{ttest}(10.5,2,3)", { score: 2.160246899469287, p: 0.05748475475050734 }],
];

// `T.null(h)` and `T.conf(c)` and their members (captured the same day)
const DERIVED: [string, string, number | number[]][] = [
  ["\\operatorname{zproptest}(12,40)", "\\operatorname{null}(0.4).\\operatorname{pleft}", 0.09835280122947346], // prettier-ignore
  ["\\operatorname{zproptest}(12,40)", "\\operatorname{null}(0.4).\\operatorname{score}", -1.2909944487358056], // prettier-ignore
  ["\\operatorname{zproptest}(12,40)", "\\operatorname{conf}(0.9).\\operatorname{lower}", 0.18081903199755034], // prettier-ignore
  ["\\operatorname{zproptest}(12,40)", "\\operatorname{null}(1).p", 0],
  ["\\operatorname{zproptest}(12,40,30,50)", "\\operatorname{null}(1).p", 1.8673564717497658e-38], // prettier-ignore
  ["\\operatorname{zproptest}(12,40,30,50)", "\\operatorname{conf}(0.9).\\operatorname{lower}", -0.46489606336616685], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{null}(1).\\operatorname{pright}", 0.02371032779215983], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{null}([1,2]).p", [0.04742065558431966, 0.23019964108049887]], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{conf}([0.9,0.99]).\\operatorname{lower}", [1.4925566809376762, -0.25558670475778555]], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{conf}(0).\\operatorname{lower}", 3],
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{conf}(1).\\operatorname{lower}", NaN],
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{conf}(-0.5).\\operatorname{lower}", NaN],
  ["\\operatorname{ttest}([1,2,3,4,5])", "\\operatorname{null}(1).\\operatorname{dof}", 4],
  ["\\operatorname{ttest}([1,2,3])", "\\operatorname{null}(1).\\operatorname{score}", 1.732050807568877], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3])", "\\operatorname{conf}(0.9).\\operatorname{upper}", 3.6858544608470494], // prettier-ignore
  ["\\operatorname{ttest}([1,2,3],[4,5,6,7])", "\\operatorname{null}(1).p", 0.003562063385422038], // prettier-ignore
  ["\\operatorname{ztest}([1,2,3],2)", "\\operatorname{null}(1).p", 0.3864762307712328],
  ["\\operatorname{ztest}([1,2,3],2,[4,5,6,7],3)", "\\operatorname{null}(1).p", 0.017443801536039555], // prettier-ignore
  ["\\operatorname{ztest}([1,2],-1)", "\\operatorname{null}(-1).p", 0.00040695201744495886],
  ["\\operatorname{ztest}([1,2,3],[2,3])", "p", [0.08326451666355049, 0.24821307898992362]],
  ["\\operatorname{ttest}([3,4],[1,2,3],[4,5,6])", "p", [0.7072299781154402, 0.4821989517510823]], // prettier-ignore
];

function numbersOf(v: Value): number | number[] | string {
  if (v.type === "number") return v.value;
  if (v.type === "undefined") return v.error ?? NaN;
  if (v.type === "list") return v.value.map((x) => (x.type === "number" ? x.value : NaN));
  return v.type;
}

function close(actual: number, expected: number): void {
  if (Number.isNaN(expected)) expect(actual).toBeNaN();
  else if (expected === 0) expect(Math.abs(actual)).toBeLessThan(1e-300);
  else expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(1e-11);
}

function check(actual: number | number[] | string, expected: number | number[]): void {
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    (expected as number[]).forEach((e, k) => close((actual as number[])[k], e));
  } else {
    expect(typeof actual).toBe("number");
    close(actual as number, expected);
  }
}

describe("inference against live Desmos (FN-53 to FN-58)", () => {
  for (const [test, members] of CASES) {
    for (const [member, expected] of Object.entries(members) as [Member, number][]) {
      it(`${test}.${member}`, () => {
        const v = evaluateLatex(`T.${M[member]}`, { rows: [`T=${test}`] });
        check(numbersOf(v), expected);
      });
    }
  }
  for (const [test, member, expected] of DERIVED) {
    it(`${test}.${member}`, () => {
      check(numbersOf(evaluateLatex(`T.${member}`, { rows: [`T=${test}`] })), expected);
    });
  }
  it("a member reads straight off a call, `ttest(L).p` (no name needed)", () => {
    const v = evaluateLatex("\\operatorname{ttest}([1,2,3,4,5]).p");
    check(numbersOf(v), 0.013235599563682674);
  });
  it("`ittest` is the two-sample t test of two lists", () => {
    const v = evaluateLatex("\\operatorname{ittest}([1,2,3,4,5],[2,4,6,9,7]).\\operatorname{dof}");
    check(numbersOf(v), 6.45213301981861);
  });
});
