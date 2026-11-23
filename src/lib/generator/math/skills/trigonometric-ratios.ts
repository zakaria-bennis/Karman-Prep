/*
 * m-trigonometric-ratios: sine, cosine and tangent, and how they relate. Item models after the
 * bank's own questions for this skill: a ratio from the sides of a right triangle (figure or
 * words, sometimes after finding the third side), sin x = cos(90 - x) as a value or as an
 * equation in x, a side from a given ratio, and ratios carried over by similar triangles
 * (including the altitude to the hypotenuse). Checks use identities or a numeric model.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { lin, m, n, num, sym } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  deg,
  near,
  ratSlip,
  rightTriangle,
  scaledTriples,
  shuffledNames,
  sqrtQ,
  symAnswer,
  symSlip,
  triples,
} from "./_geo2-common";

const SKILL = "m-trigonometric-ratios";
type Fn = "sin" | "cos" | "tan";
const FNS: Fn[] = ["sin", "cos", "tan"];
const WORD: Record<Fn, string> = {
  sin: "\\frac{\\text{opposite}}{\\text{hypotenuse}}",
  cos: "\\frac{\\text{adjacent}}{\\text{hypotenuse}}",
  tan: "\\frac{\\text{opposite}}{\\text{adjacent}}",
};
const fnTex = (fn: Fn, angle: string) => `\\${fn} ${angle}`;
const valueOf = (a: Answer) => a.value;
/** The exact value of fn from the squares of the opposite side, adjacent side and hypotenuse. */
const ratio = (fn: Fn, o2: number, a2: number, h2: number): Sym =>
  fn === "sin" ? sqrtQ(F(o2, h2)) : fn === "cos" ? sqrtQ(F(a2, h2)) : sqrtQ(F(o2, a2));
const rad = (d: number) => (d * Math.PI) / 180;
const MATH: Record<Fn, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan };

/**
 * Wrong answers for "the value of fn at angle U": the other two ratios of U and the flipped
 * ratio, each named, from the squares of U's opposite side, adjacent side and hypotenuse.
 */
function ratioSlips(fn: Fn, U: string, o2: number, a2: number, h2: number): Slip[] {
  const right = ratio(fn, o2, a2, h2);
  const out: Slip[] = [];
  for (const g of FNS) {
    if (g === fn) continue;
    out.push(
      symSlip(
        ratio(g, o2, a2, h2),
        `you found ${m(fnTex(g, U))}, which is ${m(WORD[g])}, instead of ${m(fnTex(fn, U))}`
      )
    );
  }
  const r = right.asRat();
  const flipped = r ? Sym.rat(r.inv()) : null;
  if (flipped) out.push(symSlip(flipped, "you flipped the ratio, putting the wrong side on top"));
  return out;
}

export const fromSides: Template = {
  id: "trig.from-sides",
  skill: SKILL,
  label: "Sine, cosine or tangent from the sides of a right triangle",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const { t } = rng.pick(scaledTriples(5, 100));
    const [hl, vl] = rng.bool() ? [t[0], t[1]] : [t[1], t[0]];
    const c = t[2];
    const names = shuffledNames(rng);
    const [r, h, v] = names;
    const atH = rng.bool();
    const X = atH ? h : v;
    const o = atH ? vl : hl;
    const a = atH ? hl : vl;
    const oSeg = atH ? `${r}${v}` : `${r}${h}`;
    const aSeg = atH ? `${r}${h}` : `${r}${v}`;
    const hSeg = `${h}${v}`;
    const fn = rng.pick(FNS);
    const mode = rng.pick(["figure", "figure", "words", "two"] as const);
    const hidden: "o" | "a" | "h" | null =
      mode !== "two"
        ? null
        : fn === "tan"
          ? rng.pick(["o", "a"] as const)
          : rng.pick([fn === "sin" ? ("o" as const) : ("a" as const), "h" as const]);
    const len = { o, a, h: c };
    const seg = { o: oSeg, a: aSeg, h: hSeg };
    const shown = (["o", "a", "h"] as const).filter((k) => k !== hidden);
    const given = shown.map((k) => m(`${seg[k]} = ${len[k]}`));
    const list =
      given.length === 3
        ? `${given[0]}, ${given[1]}, and ${given[2]}`
        : `${given[0]} and ${given[1]}`;
    let figure;
    if (mode !== "words") {
      const lab = (k: "o" | "a" | "h") => (k === hidden ? undefined : String(len[k]));
      figure = rightTriangle({
        names,
        legs: [hl, vl],
        left: rng.bool(),
        side: { horiz: lab(atH ? "a" : "o"), vert: lab(atH ? "o" : "a"), hyp: lab("h") },
      });
    }
    const stem = `In right triangle ${m(`${r}${h}${v}`)}${figure ? " shown" : ""}, angle ${m(r)} is a right angle, ${list}. What is the value of ${m(fnTex(fn, X))}?`;
    const val = fn === "sin" ? F(o, c) : fn === "cos" ? F(a, c) : F(o, a);
    const steps: Draft["steps"] = [];
    if (hidden) {
      const [p, q] = shown.map((k) => len[k]);
      steps.push({
        label: "Find the missing side",
        work:
          hidden === "h"
            ? m(`${hSeg} = \\sqrt{${p}^2 + ${q}^2} = \\sqrt{${p * p + q * q}} = ${c}`)
            : m(
                `${seg[hidden]} = \\sqrt{${c}^2 - ${p}^2} = \\sqrt{${c * c - p * p}} = ${len[hidden]}`
              ),
      });
    }
    steps.push({
      label: `Name the sides from angle ${m(X)}`,
      work: `From angle ${m(X)}, the opposite side is ${m(`${oSeg} = ${o}`)}, the adjacent leg is ${m(`${aSeg} = ${a}`)}, and the hypotenuse is ${m(`${hSeg} = ${c}`)}`,
    });
    const top = fn === "cos" ? a : o;
    const bottom = fn === "tan" ? a : c;
    steps.push({
      label: "Write the ratio",
      work: m(
        `${fnTex(fn, X)} = ${WORD[fn]} = \\frac{${top}}{${bottom}}${F(top, bottom).d === bottom ? "" : ` = ${num(val)}`}`
      ),
    });
    const check =
      fn === "tan"
        ? `${m(`\\sin ${X} = \\frac{${o}}{${c}}`)} and ${m(`\\cos ${X} = \\frac{${a}}{${c}}`)}, and ${m(`\\frac{\\sin ${X}}{\\cos ${X}} = \\frac{${o}}{${a}} = ${num(val)}`)}, which is ${m(fnTex("tan", X))}`
        : `${m(`(\\sin ${X})^2 + (\\cos ${X})^2`)} should be 1: ${m(`\\frac{${o * o}}{${c * c}} + \\frac{${a * a}}{${c * c}} = \\frac{${o * o + a * a}}{${c * c}} = 1`)}`;
    return {
      format,
      stem,
      figure,
      answer: numAnswer(val, m(num(val))),
      slips: ratioSlips(fn, X, o * o, a * a, c * c),
      asks: `the value of ${m(fnTex(fn, X))}, a ratio of two sides seen from angle ${m(X)}`,
      steps,
      check,
      tip: `SOH-CAH-TOA: sine is opposite over hypotenuse, cosine is adjacent over hypotenuse, and tangent is opposite over adjacent, always seen from the angle named`,
      hint: `Label each side as opposite, adjacent or hypotenuse as seen from angle ${m(X)}.`,
      difficulty: hidden ? 3 : mode === "words" ? 2 : format === "spr" ? 2 : 1,
      isCorrect: (cand) => {
        const x = valueOf(cand);
        if (!x || x.toNumber() <= 0) return false;
        // Identities, each using a side the forward ratio does not: sin^2 + cos^2 = 1, 1 + tan^2 = 1/cos^2.
        if (fn === "sin")
          return x
            .mul(x)
            .add(F(a * a, c * c))
            .eq(1);
        if (fn === "cos")
          return x
            .mul(x)
            .add(F(o * o, c * c))
            .eq(1);
        return x
          .mul(x)
          .add(1)
          .eq(F(c * c, a * a));
      },
    };
  },
};

export const cofunction: Template = {
  id: "trig.cofunction",
  skill: SKILL,
  label: "Complementary angles: sin x = cos(90 - x), as a value or an equation",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const [C, A, B] = shuffledNames(rng);
    if (rng.bool(0.5)) {
      // A value: the given ratio of A carried to B.
      const kind = rng.pick(["co", "co", "same", "tan"] as const);
      let o2: number;
      let h2: number;
      if (kind === "tan" || kind === "same" || format === "spr" || rng.bool(0.5)) {
        const [p, q, hyp] = rng.pick(triples(5, 120));
        const swap = rng.bool();
        o2 = (swap ? q : p) ** 2;
        h2 = hyp * hyp;
      } else {
        h2 = rng.int(3, 15) ** 2;
        o2 = rng.int(2, h2 - 1);
        need(!Number.isInteger(Math.sqrt(o2)), "a radical numerator");
      }
      const a2 = h2 - o2;
      const givenFn: Fn = kind === "tan" ? "tan" : rng.pick(["sin", "cos"] as const);
      const shown = ratio(givenFn, o2, a2, h2);
      // Asked function of B; B's opposite side is A's adjacent side.
      const askFn: Fn =
        kind === "tan" ? "tan" : kind === "co" ? (givenFn === "sin" ? "cos" : "sin") : givenFn;
      const ans = ratio(askFn, a2, o2, h2);
      need(format === "mc" || ans.isRat(), "typed answers are fractions");
      const sum = rng.bool();
      const stem = sum
        ? `In right triangle ${m(`${A}${B}${C}`)}, the sum of the measures of angle ${m(A)} and angle ${m(B)} is ${m(deg(90))}. If ${m(`${fnTex(givenFn, A)} = ${sym(shown)}`)}, what is the value of ${m(fnTex(askFn, B))}?`
        : `In triangle ${m(`${A}${B}${C}`)}, angle ${m(C)} is a right angle. If ${m(`${fnTex(givenFn, A)} = ${sym(shown)}`)}, what is the value of ${m(fnTex(askFn, B))}?`;
      const slips = ratioSlips(askFn, B, a2, o2, h2).map((x) =>
        kind === "tan" && x.value!.eq(shown)
          ? {
              ...x,
              why: `you gave ${m(`\\tan ${A}`)} itself; from angle ${m(B)} the two legs trade places`,
            }
          : x
      );
      if (kind !== "tan")
        slips.push(symSlip(ratio("tan", o2, a2, h2), `you found ${m(fnTex("tan", A))}`));
      const steps: Draft["steps"] = [
        {
          label: "Relate the two acute angles",
          work: `The acute angles of a right triangle add to ${m(deg(90))}, so the side opposite ${m(A)} is the side adjacent to ${m(B)}, and the other way around`,
        },
      ];
      if (kind === "co")
        steps.push({
          label: "Use the cofunction rule",
          work: `${m(`${fnTex(askFn, B)} = ${fnTex(givenFn, A)}`)}, because both are the same side over the hypotenuse. So ${m(`${fnTex(askFn, B)} = ${sym(ans)}`)}`,
        });
      else if (kind === "tan")
        steps.push({
          label: "Flip the tangent",
          work: `${m(`\\tan ${B} = ${WORD.tan}`)} from ${m(B)} uses the same two legs as ${m(`\\tan ${A}`)}, upside down, so ${m(`\\tan ${B} = \\frac{1}{\\tan ${A}} = ${sym(ans)}`)}`,
        });
      else {
        const other: Fn = givenFn === "sin" ? "cos" : "sin";
        steps.push(
          {
            label: "Find the missing side",
            work: `Take the hypotenuse as ${n(Math.sqrt(h2))}: the side in the numerator of ${m(fnTex(givenFn, A))} is ${n(Math.sqrt(givenFn === "sin" ? o2 : a2))}, so the third side is ${m(`\\sqrt{${h2} - ${givenFn === "sin" ? o2 : a2}} = ${Math.sqrt(givenFn === "sin" ? a2 : o2)}`)}`,
          },
          {
            label: `Read the ratio from ${m(B)}`,
            work: `${m(`${fnTex(askFn, B)} = ${fnTex(other, A)} = ${sym(ans)}`)}`,
          }
        );
      }
      const angleA = Math.atan2(Math.sqrt(o2), Math.sqrt(a2));
      return {
        format,
        stem,
        answer: symAnswer(ans),
        slips,
        asks: `the value of ${m(fnTex(askFn, B))}, where angle ${m(B)} is the complement of angle ${m(A)}`,
        steps,
        check:
          `With a triangle whose hypotenuse is ${m(`\\sqrt{${h2}}`)}, the side opposite ${m(A)} is ${m(`\\sqrt{${o2}}`)} and the side opposite ${m(B)} is ${m(`\\sqrt{${a2}}`)}; from ${m(B)}, ${m(fnTex(askFn, B))} is ${m(WORD[askFn])} ${m(`= ${sym(ans)}`)}`.replace(
            /\\sqrt\{(\d+)\}/g,
            (all, d) =>
              Number.isInteger(Math.sqrt(Number(d))) ? String(Math.sqrt(Number(d))) : all
          ),
        tip: `The sine of an acute angle equals the cosine of its complement: ${m("\\sin x^\\circ = \\cos(90 - x)^\\circ")}`,
        hint: `Which side is opposite angle ${m(B)}? Compare it with the sides in ${m(fnTex(givenFn, A))}.`,
        difficulty: kind === "co" ? (shown.isRat() ? 2 : 3) : kind === "tan" ? 3 : 4,
        isCorrect: (cand) => near(cand, MATH[askFn](Math.PI / 2 - angleA)),
      };
    }
    // An equation: cos Q = sin R for acute Q and R given as expressions in x.
    const x = rng.int(2, 20);
    const a1 = rng.int(1, 5);
    const a2 = rng.int(1, 6);
    const Qm = rng.int(12, 78);
    const Rm = 90 - Qm;
    const b1 = Qm - a1 * x;
    const b2 = Rm - a2 * x;
    need(b1 !== 0 || b2 !== 0, "both constants zero");
    const qTex = lin([[a1, "x"]], b1);
    const rTex = lin([[a2, "x"]], b2);
    const ask = rng.pick(["x", "x", "Q", "R"] as const);
    const ans = ask === "x" ? x : ask === "Q" ? Qm : Rm;
    const slips: Slip[] = [];
    if (a1 !== a2) {
      const eq = F(b2 - b1, a1 - a2);
      const v = ask === "x" ? eq : ask === "Q" ? eq.mul(a1).add(b1) : eq.mul(a2).add(b2);
      if (v.gt(0))
        slips.push(
          ratSlip(v, "you set the two angle measures equal instead of making them add to 90")
        );
    }
    const e180 = F(180 - b1 - b2, a1 + a2);
    slips.push(
      ratSlip(
        ask === "x" ? e180 : ask === "Q" ? e180.mul(a1).add(b1) : e180.mul(a2).add(b2),
        "you made the angles add to 180 instead of 90"
      )
    );
    if (ask === "x") {
      slips.push(ratSlip(Qm, `you found the measure of angle ${m(A)}, not ${m("x")}`));
      slips.push(ratSlip(Rm, `you found the measure of angle ${m(B)}, not ${m("x")}`));
    } else {
      slips.push(ratSlip(x, `you stopped at ${m(`x = ${x}`)}`));
      slips.push(ratSlip(ask === "Q" ? Rm : Qm, `you found the measure of the other angle`));
    }
    const cos = rng.bool();
    const [F1, F2] = cos ? ["cos", "sin"] : ["sin", "cos"];
    const question =
      ask === "x"
        ? `What is the value of ${m("x")}?`
        : `What is the measure, in degrees, of angle ${m(ask === "Q" ? A : B)}?`;
    const stem = `For two acute angles, ${m(A)} and ${m(B)}, ${m(`\\${F1} ${A} = \\${F2} ${B}`)}. The measures, in degrees, of angles ${m(A)} and ${m(B)} are ${m(qTex)} and ${m(rTex)}, respectively. ${question}`;
    const sub = (a: number, b: number) =>
      `${a === 1 ? "" : a}(${x})${b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${Math.abs(b)}`}`;
    return {
      format,
      stem,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks:
        ask === "x"
          ? `the value of ${m("x")}`
          : `the measure of angle ${m(ask === "Q" ? A : B)}, not ${m("x")}`,
      steps: [
        {
          label: "Turn the trig equation into angles",
          work: `For acute angles, the ${F1 === "cos" ? "cosine" : "sine"} of one equals the ${F2 === "cos" ? "cosine" : "sine"} of the other exactly when the angles are complementary, so ${m(`(${qTex}) + (${rTex}) = 90`)}`,
        },
        {
          label: `Solve for ${m("x")}`,
          work: `${m(`${lin([[a1 + a2, "x"]], b1 + b2)} = 90`)}, so ${m(`${lin([[a1 + a2, "x"]])} = ${90 - b1 - b2}`)} and ${m(`x = ${x}`)}`,
        },
        ...(ask === "x"
          ? []
          : [
              {
                label: `Find angle ${m(ask === "Q" ? A : B)}`,
                work: m(
                  `${ask === "Q" ? qTex : rTex} = ${ask === "Q" ? sub(a1, b1) : sub(a2, b2)} = ${ans}`
                ),
              },
            ]),
      ],
      check: `With ${m(`x = ${x}`)}, the angles are ${m(deg(Qm))} and ${m(deg(Rm))}, both acute, and ${m(`${Qm} + ${Rm} = 90`)}, so ${m(`\\${F1} ${deg(Qm)} = \\${F2} ${deg(Rm)}`)}`,
      tip: `When the sine of one acute angle equals the cosine of another, the two angles add to ${m(deg(90))}`,
      hint: `What must be true of two acute angles when the ${F1 === "cos" ? "cosine" : "sine"} of one equals the ${F2 === "cos" ? "cosine" : "sine"} of the other?`,
      difficulty: ask === "x" ? (b1 < 0 || b2 < 0 ? 4 : 3) : 5,
      isCorrect: (cand) => {
        const q = cand.value?.asRat();
        if (!q) return false;
        const xx = ask === "x" ? q : ask === "Q" ? q.sub(b1).div(a1) : q.sub(b2).div(a2);
        const Qd = xx.mul(a1).add(b1).toNumber();
        const Rd = xx.mul(a2).add(b2).toNumber();
        if (!(Qd > 0 && Qd < 90 && Rd > 0 && Rd < 90)) return false;
        const f1 = cos ? Math.cos : Math.sin;
        const f2 = cos ? Math.sin : Math.cos;
        return Math.abs(f1(rad(Qd)) - f2(rad(Rd))) < 1e-12;
      },
    };
  },
};

export const sideFromRatio: Template = {
  id: "trig.side-from-ratio",
  skill: SKILL,
  label: "A side of a right triangle from a given sine, cosine or tangent",
  difficulty: [3, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const base = rng.pick(triples(5, 41));
    const k = rng.int(2, Math.max(2, Math.floor(120 / base[2])));
    const [hb, vb] = rng.bool() ? [base[0], base[1]] : [base[1], base[0]];
    const names = shuffledNames(rng);
    const [r, h, v] = names;
    const atH = rng.bool();
    const X = atH ? h : v;
    const ob = atH ? vb : hb;
    const ab = atH ? hb : vb;
    const cb = base[2];
    const fn = rng.pick(FNS);
    const val = fn === "sin" ? F(ob, cb) : fn === "cos" ? F(ab, cb) : F(ob, ab);
    const roles = ["o", "a", "h"] as const;
    const known = rng.pick(roles);
    const asked = rng.pick(roles.filter((x) => x !== known));
    const third = roles.find((x) => x !== known && x !== asked)!;
    const baseLen = { o: ob, a: ab, h: cb };
    const len = { o: ob * k, a: ab * k, h: cb * k };
    const seg = {
      o: atH ? `${r}${v}` : `${r}${h}`,
      a: atH ? `${r}${h}` : `${r}${v}`,
      h: `${h}${v}`,
    };
    const sideOf = (x: "o" | "a" | "h") =>
      x === "h" ? "hyp" : (x === "o") === atH ? "vert" : "horiz";
    const figure = rightTriangle({
      names,
      legs: [hb, vb],
      left: rng.bool(),
      side: { [sideOf(known)]: String(len[known]), [sideOf(asked)]: "x" },
    });
    const ans = len[asked];
    const stem = `In right triangle ${m(`${r}${h}${v}`)} shown, ${m(`${fnTex(fn, X)} = ${num(val)}`)} and ${m(`${seg[known]} = ${len[known]}`)}. What is the value of ${m("x")}?`;
    const kv = F(len[known]);
    const slips: Slip[] = [
      ratSlip(len[third], `you found ${m(seg[third])}, the other unmarked side`),
      ratSlip(
        kv.mul(val),
        `you multiplied ${n(len[known])} by ${m(num(val))} without matching the sides of the ratio`
      ),
      ratSlip(
        kv.div(val),
        `you divided ${n(len[known])} by ${m(num(val))} without matching the sides of the ratio`
      ),
      ratSlip(baseLen[asked], "you used the numbers in the ratio as the side lengths"),
    ];
    const role = { o: "opposite side", a: "adjacent leg", h: "hypotenuse" };
    const steps = [
      {
        label: "Read the ratio as sides",
        work: `${m(`${fnTex(fn, X)} = ${num(val)}`)} means the ${fn === "cos" ? "adjacent leg" : "opposite side"} and the ${fn === "tan" ? "adjacent leg" : "hypotenuse"} are in the ratio ${m(`${fn === "cos" ? ab : ob} : ${fn === "tan" ? ab : cb}`)}, so the sides are ${m(`${ob}k`)} (opposite), ${m(`${ab}k`)} (adjacent) and ${m(`${cb}k`)} (hypotenuse), using the Pythagorean triple ${m(`${base[0]}, ${base[1]}, ${base[2]}`)}`,
      },
      {
        label: `Find the scale ${m("k")}`,
        work: `${m(seg[known])} is the ${role[known]}, so ${m(`${baseLen[known]}k = ${len[known]}`)} and ${m(`k = ${k}`)}`,
      },
      {
        label: `Find ${m("x")}`,
        work: `${m("x")} is the ${role[asked]}: ${m(`x = ${baseLen[asked]}(${k}) = ${ans}`)}`,
      },
    ];
    // Independent: exact sine and cosine from the given ratio by identities, then the sides from the known one.
    const s2 =
      fn === "sin"
        ? val.mul(val)
        : fn === "cos"
          ? F(1).sub(val.mul(val))
          : val.mul(val).div(val.mul(val).add(1));
    const sinX = sqrtQ(s2).asRat();
    const cosX = sqrtQ(F(1).sub(s2)).asRat();
    need(sinX && cosX, "rational ratios");
    const hyp: Frac = known === "h" ? kv : known === "o" ? kv.div(sinX!) : kv.div(cosX!);
    const truth = asked === "h" ? hyp : asked === "o" ? hyp.mul(sinX!) : hyp.mul(cosX!);
    return {
      format,
      stem,
      figure,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks: `the length of the side marked ${m("x")}, using the ratio and the one known side`,
      steps,
      check: `The sides ${m(`${len.o}`)}, ${m(`${len.a}`)} and ${m(`${len.h}`)} fit the Pythagorean theorem (${m(`${len.o * len.o} + ${len.a * len.a} = ${len.h * len.h}`)}), and ${m(`${fnTex(fn, X)} = \\frac{${fn === "cos" ? len.a : len.o}}{${fn === "tan" ? len.a : len.h}} = ${num(val)}`)}`,
      tip: "A trig ratio fixes the shape of a right triangle; write the sides as multiples of the ratio's numbers, then use the one known side to find the multiple",
      hint: `Is ${m(seg[known])} the opposite side, the adjacent leg or the hypotenuse from angle ${m(X)}?`,
      difficulty: Math.min(
        5,
        3 + (fn !== "tan" && known !== "h" && asked !== "h" ? 1 : 0) + (format === "spr" ? 1 : 0)
      ),
      isCorrect: (cand) => !!cand.value && cand.value.eq(truth),
    };
  },
};

export const similar: Template = {
  id: "trig.similar",
  skill: SKILL,
  label: "Ratios carried over by similar right triangles and by the altitude to the hypotenuse",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const big = rng.bool(0.5);
    const [p, q, hyp] = rng.pick(big ? triples(50, 400) : triples(13, 61));
    if (rng.bool(0.6)) {
      const [C, A, B] = shuffledNames(rng);
      const others = ["D", "E", "F", "J", "K", "L", "U", "V", "W"].filter(
        (x) => ![A, B, C].includes(x)
      );
      need(others.length >= 3, "names");
      const [F_, D, E] = rng.sample(others, 3);
      const [o, a] = rng.bool() ? [p, q] : [q, p];
      const given = rng.pick(FNS);
      const asked = rng.pick(FNS.filter((g) => g !== given));
      const shown = ratio(given, o * o, a * a, hyp * hyp);
      const ans = ratio(asked, o * o, a * a, hyp * hyp);
      const scale = rng.pick([F(3, 2), F(2), F(5, 2), F(3), F(12, 5), F(7, 4), F(4)]);
      const withScale = rng.bool(0.5);
      const stem = `Triangle ${m(`${A}${B}${C}`)} is similar to triangle ${m(`${D}${E}${F_}`)}, where ${m(A)} corresponds to ${m(D)}, ${m(B)} corresponds to ${m(E)}, and angles ${m(C)} and ${m(F_)} are right angles.${withScale ? ` The length of ${m(`\\overline{${A}${B}}`)} is ${m(num(scale, { decimal: true }))} times the length of ${m(`\\overline{${D}${E}}`)}.` : ""} If ${m(`${fnTex(given, A)} = ${sym(shown)}`)}, what is the value of ${m(fnTex(asked, D))}?`;
      const slips = ratioSlips(asked, D, o * o, a * a, hyp * hyp);
      if (withScale)
        slips.push(
          symSlip(
            ans.mul(Sym.rat(scale)),
            "you multiplied by the scale factor, but similar triangles have equal ratios"
          )
        );
      slips.push(symSlip(shown, `you gave ${m(fnTex(given, A))} itself`));
      const angle = Math.atan2(o, a);
      return {
        format,
        stem,
        answer: symAnswer(ans),
        slips,
        asks: `the value of ${m(fnTex(asked, D))}, which equals ${m(fnTex(asked, A))} because the triangles are similar`,
        steps: [
          {
            label: "Carry the angle over",
            work: `Similar triangles have equal corresponding angles, so angle ${m(D)} has the same measure as angle ${m(A)}${withScale ? "; the scale factor changes the side lengths, not the ratios" : ""}`,
          },
          {
            label: "Build sides from the ratio",
            work: `Take the sides in ${m(`${fnTex(given, A)} = ${sym(shown)}`)} as ${given === "tan" ? `${n(o)} (opposite ${m(A)}) and ${n(a)} (adjacent)` : `${n(given === "sin" ? o : a)} (${given === "sin" ? "opposite" : "adjacent"}) and ${n(hyp)} (hypotenuse)`}. The Pythagorean theorem gives the third side: ${given === "tan" ? m(`\\sqrt{${o}^2 + ${a}^2} = ${hyp}`) : m(`\\sqrt{${hyp}^2 - ${given === "sin" ? o : a}^2} = ${given === "sin" ? a : o}`)}`,
          },
          {
            label: `Find ${m(fnTex(asked, D))}`,
            work: m(`${fnTex(asked, D)} = ${fnTex(asked, A)} = ${WORD[asked]} = ${sym(ans)}`),
          },
        ],
        check: `${m(`${o}^2 + ${a}^2 = ${o * o + a * a} = ${hyp}^2`)}, so the three sides fit a right triangle, and from angle ${m(A)} the ratio ${m(WORD[asked])} is ${m(sym(ans))}`,
        tip: "Similar right triangles have equal angles, so every trig ratio of corresponding angles is the same no matter how the triangles are scaled",
        hint: `What do similar triangles tell you about angles ${m(A)} and ${m(D)}?`,
        difficulty: 4 + (big ? 1 : 0) + (withScale ? 1 : 0),
        isCorrect: (cand) => near(cand, MATH[asked](angle)),
      };
    }
    // The altitude to the hypotenuse: X right angle, W on YZ, WX perpendicular to YZ.
    const k = big ? 1 : rng.int(2, Math.max(2, Math.floor(300 / hyp)));
    const [wy, wx] = (rng.bool() ? [p, q] : [q, p]).map((x) => x * k);
    const xy = hyp * k;
    const [X, Y, Z] = ["X", "Y", "Z"];
    const asked = rng.pick(["tan", "tan", "sin", "cos"] as const);
    // Angle Z = 90 - angle Y; in right triangle XWY (right at W) from Y: opposite WX, adjacent WY.
    const ans = ratio(asked, wy * wy, wx * wx, xy * xy);
    const slips: Slip[] = [
      ...ratioSlips(asked, Z, wy * wy, wx * wx, xy * xy),
      symSlip(
        ratio(asked, wx * wx, wy * wy, xy * xy),
        `you found ${m(fnTex(asked, Y))} instead of ${m(fnTex(asked, Z))}`
      ),
    ];
    return {
      format,
      stem: `In triangle ${m(`${X}${Y}${Z}`)}, the measure of angle ${m(X)} is ${m(deg(90))}. Point ${m("W")} lies on ${m(`\\overline{${Y}${Z}}`)}, and ${m(`\\overline{W${X}}`)} is perpendicular to ${m(`\\overline{${Y}${Z}}`)}. The length of ${m(`\\overline{W${Y}}`)} is ${n(wy)}, and the length of ${m(`\\overline{W${X}}`)} is ${n(wx)}. What is the value of ${m(fnTex(asked, Z))}?`,
      answer: symAnswer(ans),
      slips,
      asks: `the value of ${m(fnTex(asked, Z))}, using the small right triangle ${m(`${X}W${Y}`)}`,
      steps: [
        {
          label: `Relate angle ${m(Z)} to angle ${m(Y)}`,
          work: `In triangle ${m(`${X}${Y}${Z}`)}, angles ${m(Y)} and ${m(Z)} add to ${m(deg(90))}. In right triangle ${m(`${X}W${Y}`)}, angles ${m(Y)} and ${m(`W${X}${Y}`)} also add to ${m(deg(90))}, so angle ${m(`W${X}${Y}`)} has the same measure as angle ${m(Z)}`,
        },
        {
          label: "Name the sides in the small triangle",
          work: `From angle ${m(`W${X}${Y}`)}: the opposite side is ${m(`W${Y} = ${wy}`)}, the adjacent leg is ${m(`W${X} = ${wx}`)}, and the hypotenuse is ${m(`${X}${Y} = \\sqrt{${wy}^2 + ${wx}^2} = ${xy}`)}`,
        },
        {
          label: `Write ${m(fnTex(asked, Z))}`,
          work: m(`${fnTex(asked, Z)} = ${WORD[asked]} = ${sym(ans)}`),
        },
      ],
      check:
        asked === "tan"
          ? `In triangle ${m(`${X}W${Y}`)}, ${m(`\\tan ${Y} = \\frac{${wx}}{${wy}}`)}. Angles ${m(Y)} and ${m(Z)} are complementary, so ${m(`\\tan ${Z} = \\frac{1}{\\tan ${Y}} = ${sym(ans)}`)}`
          : `In triangle ${m(`${X}W${Y}`)}, ${m(`\\${asked === "sin" ? "cos" : "sin"} ${Y} = \\frac{${asked === "sin" ? wy : wx}}{${xy}}`)}. Angles ${m(Y)} and ${m(Z)} are complementary, so ${m(`${fnTex(asked, Z)} = \\${asked === "sin" ? "cos" : "sin"} ${Y} = ${sym(ans)}`)}`,
      tip: "An altitude to the hypotenuse makes copies of the big triangle's angles in each small triangle; find the copy of the angle you need",
      hint: `Find an angle in triangle ${m(`${X}W${Y}`)} that has the same measure as angle ${m(Z)}.`,
      difficulty: asked === "tan" ? 6 : 7,
      isCorrect: (cand) => {
        // Coordinates: W at the origin, Y on the x-axis, X on the y-axis, Z on line YW beyond W.
        const zx = -(wx * wx) / wy; // Z = (zx, 0) makes XZ perpendicular to XY
        const angleZ = Math.atan2(wx, -zx);
        return near(cand, MATH[asked](angleZ));
      },
    };
  },
};

export const TEMPLATES: Template[] = [fromSides, cofunction, sideFromRatio, similar];
