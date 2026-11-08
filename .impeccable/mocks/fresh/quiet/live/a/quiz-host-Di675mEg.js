import {
  _ as e,
  c as t,
  d as n,
  f as r,
  g as i,
  h as a,
  l as o,
  m as s,
  n as c,
  o as l,
  s as u,
  u as d,
} from "./index-5_FSq8Je.js";
import { a as f, i as p } from "./describe-DQPpUJSv.js";
import { t as m } from "./payload-C2YCeRNq.js";
var h = e(i()),
  g = s(),
  _ = 1.25,
  v = 0.1,
  y = 1e-9,
  b = 0x38d7ea4c68000,
  x = 0x38d7ea4c68000;
function S(e) {
  return y * Math.max(1, Math.abs(e));
}
var C = (e) => Number.isFinite(e) && e > 0,
  w = (e) => C(e.width) && C(e.height);
function T(e, t) {
  let n = x - t / 2;
  return Math.min(n, Math.max(-n, e));
}
function E(e, t) {
  let n = t - e,
    r = (e + t) / 2;
  if (n <= 0x38d7ea4c68000 && n >= S(r) && e >= -0x38d7ea4c68000 && t <= 0x38d7ea4c68000)
    return [e, t];
  let i = Math.min(n, b),
    a = T(r, i),
    o = Math.max(i, S(a)),
    s = x - o / 2,
    c = T(a, o);
  return c >= s || c + o / 2 > 0x38d7ea4c68000
    ? [x - o, x]
    : c <= -s || c - o / 2 < -0x38d7ea4c68000
      ? [-0x38d7ea4c68000, -0x38d7ea4c68000 + o]
      : [c - o / 2, c + o / 2];
}
function D(e) {
  let [t, n] = E(e.left, e.right),
    [r, i] = E(e.bottom, e.top);
  return { left: t, right: n, bottom: r, top: i };
}
function O(e) {
  if (!w(e)) return { left: -10, right: 10, bottom: -10, top: 10 };
  let t = (10 * e.height) / e.width;
  return { left: -10, right: 10, bottom: -t, top: t };
}
function k(e, t) {
  let n = O(t),
    r = 1e-9 * (n.right - n.left),
    i = 1e-9 * (n.top - n.bottom);
  return (
    Math.abs(e.left - n.left) <= r &&
    Math.abs(e.right - n.right) <= r &&
    Math.abs(e.bottom - n.bottom) <= i &&
    Math.abs(e.top - n.top) <= i
  );
}
function A(e, t, n) {
  let r = e / y;
  return n === 0 ? r : Math.min(r, 1 + (r - Math.sign(n) * t) / Math.abs(n));
}
function ee(e, t, n) {
  if (!C(t) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) return { ...e };
  let r = e.right - e.left,
    i = e.top - e.bottom,
    a;
  if (t < 1) a = Math.min(1, Math.max(t, r / b, i / b));
  else {
    let o = A(r, (e.left + e.right) / 2, n.x),
      s = A(i, (e.bottom + e.top) / 2, n.y);
    a = Math.max(1, Math.min(t, o, s));
  }
  if (a === 1) return D(e);
  let o = (e, t) => t + (e - t) / a;
  return D({
    left: o(e.left, n.x),
    right: o(e.right, n.x),
    bottom: o(e.bottom, n.y),
    top: o(e.top, n.y),
  });
}
function te(e, t, n) {
  return !Number.isFinite(t) || !Number.isFinite(n)
    ? { ...e }
    : D({ left: e.left + t, right: e.right + t, bottom: e.bottom + n, top: e.top + n });
}
function ne(e, t, n) {
  if (!w(t) || !w(n)) return { ...e };
  let r = (e.left + e.right) / 2,
    i = (e.bottom + e.top) / 2,
    a = ((e.right - e.left) * (n.width / t.width)) / 2,
    o = ((e.top - e.bottom) * (n.height / t.height)) / 2;
  return D({ left: r - a, right: r + a, bottom: i - o, top: i + o });
}
function j(e, t, n) {
  let { viewport: r, size: i } = e;
  return [
    ((t - r.left) / (r.right - r.left)) * i.width,
    ((r.top - n) / (r.top - r.bottom)) * i.height,
  ];
}
function re(e, t, n) {
  let { viewport: r, size: i } = e;
  return [r.left + (t / i.width) * (r.right - r.left), r.top - (n / i.height) * (r.top - r.bottom)];
}
var ie = class extends Error {
    constructor(e) {
      (super(e === null ? `deadline exceeded` : `deadline exceeded for row ${e}`),
        (this.name = `DeadlineExceeded`),
        (this.rowId = e));
    }
  },
  ae = Object.freeze({ check() {} });
function oe(e) {
  switch (e.kind) {
    case `num`:
    case `id`:
    case `const`:
      return [];
    case `add`:
    case `sub`:
    case `mul`:
    case `div`:
    case `pow`:
    case `sim`:
      return [e.left, e.right];
    case `neg`:
    case `pct`:
    case `deg`:
    case `fact`:
    case `abs`:
      return [e.arg];
    case `root`:
      return e.index === null ? [e.arg] : [e.index, e.arg];
    case `call`:
      return e.args;
    case `point`:
      return [e.x, e.y];
    case `rel`:
      return e.operands;
    case `list`:
      return e.items;
  }
}
function se(e) {
  let t = 0,
    n = [e];
  for (let e = n.pop(); e !== void 0; e = n.pop()) ((t += 1), n.push(...oe(e)));
  return t;
}
var ce = Object.freeze([
    `Trig`,
    `Inverse trig`,
    `Statistics`,
    `List operations`,
    `Visualizations`,
    `Probability distributions`,
    `Inference`,
    `Calculus`,
    `Hyperbolic trig`,
    `Geometry`,
    `Custom colors`,
    `Number theory`,
    `Matrices`,
    `Complex`,
    `Advanced`,
  ]),
  le = new Set(
    `sin.cos.tan.csc.sec.cot.arcsin.arccos.arctan.arccsc.arcsec.arccot.exp.ln.log.sinh.cosh.tanh.csch.sech.coth.arcsinh.arccosh.arctanh.arccsch.arcsech.arccoth.mod.ceil.floor.round.sign.nPr.nCr.abs`.split(
      `.`
    )
  ),
  ue = new Set([
    ...[`sin`, `cos`, `tan`, `csc`, `sec`, `cot`].flatMap((e) => [
      e,
      `arc${e}`,
      `${e}h`,
      `arc${e}h`,
    ]),
    `ln`,
    `log`,
  ]),
  M = `variadic`;
function N(e, t, n, r) {
  return Object.freeze({ name: e, category: t, phase: n, arity: r === M ? M : Object.freeze(r) });
}
var de = Object.freeze([
  N(`sin`, 1, 1, [1]),
  N(`cos`, 1, 1, [1]),
  N(`tan`, 1, 1, [1]),
  N(`csc`, 1, 1, [1]),
  N(`sec`, 1, 1, [1]),
  N(`cot`, 1, 1, [1]),
  N(`arcsin`, 2, 1, [1]),
  N(`arccos`, 2, 1, [1]),
  N(`arctan`, 2, 1, [1, 2]),
  N(`arccsc`, 2, 1, [1]),
  N(`arcsec`, 2, 1, [1]),
  N(`arccot`, 2, 1, [1]),
  N(`mean`, 3, 2, M),
  N(`median`, 3, 2, M),
  N(`min`, 3, 2, M),
  N(`max`, 3, 2, M),
  N(`quartile`, 3, 2, [2]),
  N(`quantile`, 3, 2, [2]),
  N(`stdev`, 3, 2, M),
  N(`stdevp`, 3, 2, M),
  N(`var`, 3, 2, M),
  N(`varp`, 3, 2, M),
  N(`cov`, 3, 3, [2]),
  N(`covp`, 3, 3, [2]),
  N(`mad`, 3, 2, M),
  N(`corr`, 3, 3, [2]),
  N(`spearman`, 3, 3, [2]),
  N(`stats`, 3, 3, [1]),
  N(`count`, 3, 2, M),
  N(`total`, 3, 2, M),
  N(`repeat`, 4, 3, [2]),
  N(`join`, 4, 3, M),
  N(`sort`, 4, 3, [1, 2]),
  N(`shuffle`, 4, 3, [1, 2]),
  N(`unique`, 4, 3, [1]),
  N(`length`, 4, 2, M),
  N(`histogram`, 5, 3, [1, 2]),
  N(`dotplot`, 5, 3, [1]),
  N(`boxplot`, 5, 3, [1]),
  N(`normaldist`, 6, 3, [0, 1, 2]),
  N(`tdist`, 6, 3, [1]),
  N(`chisqdist`, 6, 3, [1]),
  N(`uniformdist`, 6, 3, [0, 1, 2]),
  N(`binomialdist`, 6, 3, [2]),
  N(`poissondist`, 6, 3, [1]),
  N(`geodist`, 6, 3, [1]),
  N(`discretedist`, 6, 3, [1, 2]),
  N(`pdf`, 6, 3, [2]),
  N(`cdf`, 6, 3, [2, 3]),
  N(`inversecdf`, 6, 3, [2]),
  N(`random`, 6, 3, [0, 1, 2, 3]),
  N(`ztest`, 7, 3, [2, 4]),
  N(`ttest`, 7, 3, [1, 2]),
  N(`zproptest`, 7, 3, [2, 4]),
  N(`chisqtest`, 7, 3, M),
  N(`chisqgof`, 7, 3, [2]),
  N(`exp`, 8, 1, [1]),
  N(`ln`, 8, 1, [1]),
  N(`log`, 8, 1, [1, 2]),
  N(`sinh`, 9, 2, [1]),
  N(`cosh`, 9, 2, [1]),
  N(`tanh`, 9, 2, [1]),
  N(`csch`, 9, 2, [1]),
  N(`sech`, 9, 2, [1]),
  N(`coth`, 9, 2, [1]),
  N(`arcsinh`, 9, 2, [1]),
  N(`arccosh`, 9, 2, [1]),
  N(`arctanh`, 9, 2, [1]),
  N(`arccsch`, 9, 2, [1]),
  N(`arcsech`, 9, 2, [1]),
  N(`arccoth`, 9, 2, [1]),
  N(`polygon`, 10, 4, M),
  N(`distance`, 10, 4, [2]),
  N(`midpoint`, 10, 4, [2]),
  N(`rgb`, 11, 4, [3]),
  N(`hsv`, 11, 4, [3]),
  N(`okhsv`, 11, 4, [3]),
  N(`oklab`, 11, 4, [3]),
  N(`oklch`, 11, 4, [3]),
  N(`lcm`, 12, 2, M),
  N(`gcd`, 12, 2, M),
  N(`mod`, 12, 2, [2]),
  N(`ceil`, 12, 2, [1]),
  N(`floor`, 12, 2, [1]),
  N(`round`, 12, 2, [1, 2]),
  N(`sign`, 12, 2, [1]),
  N(`nPr`, 12, 2, [2]),
  N(`nCr`, 12, 2, [2]),
  N(`abs`, 12, 2, [1]),
  N(`det`, 13, 4, [1]),
  N(`trace`, 13, 4, [1]),
  N(`rref`, 13, 4, [1]),
  N(`rank`, 13, 4, [1]),
  N(`rows`, 13, 4, [1]),
  N(`columns`, 13, 4, [1]),
  N(`transpose`, 13, 4, [1]),
  N(`real`, 14, 4, [1]),
  N(`imag`, 14, 4, [1]),
  N(`conj`, 14, 4, [1]),
  N(`arg`, 14, 4, [1]),
  N(`tone`, 15, 4, [1, 2]),
  N(`with`, null, 4, [2]),
  N(`for`, null, 2, [2]),
  N(`and`, null, 4, [2]),
  N(`or`, null, 4, [2]),
  N(`of`, null, 1, [2]),
]);
Object.freeze([
  `null`,
  `p`,
  `pleft`,
  `pright`,
  `score`,
  `dof`,
  `stderr`,
  `conf`,
  `lower`,
  `upper`,
  `estimate`,
]);
var fe = Object.freeze([
    `sqrt`,
    `cbrt`,
    `nthroot`,
    `pi`,
    `theta`,
    `tau`,
    `phi`,
    `infinity`,
    `infty`,
    `sum`,
    `prod`,
    `int`,
  ]),
  pe = new Map(de.map((e) => [e.name, e])),
  me = de.map((e) => e.name).join(` `),
  P = fe.join(` `);
function he(e) {
  return pe.has(e);
}
function ge(e) {
  return le.has(e) && pe.has(e);
}
function _e() {
  return me;
}
function ve() {
  return P;
}
function ye(e, t) {
  return Object.freeze({ op: e, arg: t });
}
function be(e, t, n, r) {
  return Object.freeze({ name: e, label: t, spoken: n, actions: Object.freeze(r) });
}
function xe(e, t, n, r) {
  return be(e, t, n, [ye(`write`, `${r}\\left(\\right)`), ye(`keystroke`, `Left`)]);
}
var Se = [
    [`sin`, `sine`],
    [`cos`, `cosine`],
    [`tan`, `tangent`],
    [`csc`, `cosecant`],
    [`sec`, `secant`],
    [`cot`, `cotangent`],
  ],
  Ce = new Map();
for (let [e, t] of Se) Ce.set(e, [xe(e, e, t, `\\${e}`)]);
for (let [e, t] of Se) {
  let n = `arc${e}`;
  Ce.set(n, [xe(n, `${e}⁻¹`, `inverse ${t}`, `\\${e}^{-1}`)]);
}
(Ce.set(`exp`, [xe(`exp`, `exp`, `exponential`, `\\exp`)]),
  Ce.set(`ln`, [xe(`ln`, `ln`, `natural log`, `\\ln`)]),
  Ce.set(`log`, [
    xe(`log`, `log`, `log`, `\\log`),
    be(`log`, `logₐ`, `log base a`, [ye(`cmd`, `\\log`), ye(`cmd`, `_`)]),
  ]));
var we = Object.freeze(
  ce.flatMap((e, t) => {
    let n = t + 1,
      r = de.filter((e) => e.category === n && ge(e.name)).flatMap((e) => Ce.get(e.name) ?? []);
    return r.length === 0 ? [] : [Object.freeze({ id: n, heading: e, entries: Object.freeze(r) })];
  })
);
function Te() {
  return we;
}
var Ee = new Set([...de.map((e) => e.name), ...fe]),
  De = Math.max(...[...Ee].map((e) => e.length));
function Oe(e) {
  let t = [],
    n = 0;
  for (; n < e.length; ) {
    let r = e[n];
    if (r.t === `symbol` && r.ch === `_`) {
      let r = ke(e, n + 1);
      (t.push(...e.slice(n, r)), (n = r));
    } else if (r.t === `letter`) {
      let r = n + 1;
      for (; F(e[r - 1], e[r]); ) r += 1;
      (t.push(...I(e.slice(n, r))), (n = r));
    } else (t.push(r), (n += 1));
  }
  return t;
}
function ke(e, t) {
  let n = e[t];
  if (n === void 0) return t;
  if (n.t === `letter`) return t + 1;
  if (n.t !== `open` || n.ch !== `{`) return t;
  let r = 0;
  for (let n = t; n < e.length; n++) {
    let t = e[n];
    if (
      (t.t === `open` && t.ch === `{` && (r += 1), t.t === `close` && t.ch === `}` && --r, r === 0)
    )
      return n + 1;
  }
  return e.length;
}
function F(e, t) {
  return t !== void 0 && t.t === `letter` && t.span.start === e.span.end;
}
function I(e) {
  let t = [],
    n = 0;
  for (; n < e.length; ) {
    let r = Ae(e, n);
    if (r === 0) (t.push(e[n]), (n += 1));
    else {
      let i = e
          .slice(n, n + r)
          .map((e) => e.ch)
          .join(``),
        a = { start: e[n].span.start, end: e[n + r - 1].span.end };
      (t.push({ t: `command`, name: i, span: a }), (n += r));
    }
  }
  return t;
}
function Ae(e, t) {
  let n = ``,
    r = 0;
  for (let i = t; i < e.length && i - t < De; i++) ((n += e[i].ch), Ee.has(n) && (r = n.length));
  return r;
}
var je = 2048,
  L = 2e3,
  Me = new Map([
    [`−`, `-`],
    [`–`, `-`],
    [`×`, `\\cdot `],
    [`·`, `\\cdot `],
    [`÷`, `/`],
    [`π`, `\\pi `],
    [`θ`, `\\theta `],
    [`τ`, `\\tau `],
    [`≤`, `\\le `],
    [`≥`, `\\ge `],
    [`°`, `^{\\circ}`],
    [`…`, `\\ldots `],
  ]),
  R = new Map([
    [`²`, `2`],
    [`³`, `3`],
  ]),
  Ne = 8320,
  Pe = new Map([
    [`dfrac`, `\\frac`],
    [`tfrac`, `\\frac`],
    [`displaystyle`, ``],
    [`,`, ``],
    [`;`, ``],
    [`:`, ``],
    [`!`, ``],
    [` `, ``],
    [`quad`, ``],
    [`times`, `\\cdot`],
    [`div`, `/`],
    [`leq`, `\\le`],
    [`leqslant`, `\\le`],
    [`geq`, `\\ge`],
    [`geqslant`, `\\ge`],
    [`lt`, `<`],
    [`gt`, `>`],
    [`degree`, `^{\\circ}`],
    [`dots`, `\\ldots`],
  ]),
  Fe = new Map([
    [`left`, `\\lvert `],
    [`right`, `\\rvert `],
  ]),
  Ie = new Set([`operatorname`, `mathrm`, `text`]),
  Le = (e) => e !== void 0 && ((e >= `a` && e <= `z`) || (e >= `A` && e <= `Z`));
function Re(e) {
  let t = He(ze(e));
  for (let e = ``; t !== e; ) ((e = t), (t = Ge(t)));
  return t;
}
function ze(e) {
  let t = ``,
    n = 0;
  for (; n < e.length; ) {
    let r = e[n],
      i = Ve(e, n, (e) => R.get(e));
    if (i.length > 0) {
      ((t += `^{${i.text}}`), (n += i.length));
      continue;
    }
    let a = Ve(e, n, Be);
    a.length > 0 ? ((t += `_{${a.text}}`), (n += a.length)) : ((t += Me.get(r) ?? r), (n += 1));
  }
  return t;
}
function Be(e) {
  let t = e.charCodeAt(0) - Ne;
  return t >= 0 && t <= 9 ? String(t) : void 0;
}
function Ve(e, t, n) {
  let r = ``,
    i = t;
  for (let t = n(e[i] ?? ``); t !== void 0; t = n(e[i] ?? ``)) ((r += t), (i += 1));
  return { text: r, length: i - t };
}
function He(e) {
  let t = ``,
    n = 0;
  for (; n < e.length; ) {
    let r = e[n];
    r === `\\` && n + 1 < e.length
      ? ((t += e.slice(n, n + 2)), (n += 2))
      : ((t += r === `%` ? `\\%` : r), (n += 1));
  }
  return t;
}
function Ue(e, t) {
  let n = t + 1;
  if (Le(e[n])) for (; Le(e[n]); ) n += 1;
  else n < e.length && (n += 1);
  return { name: e.slice(t + 1, n), end: n };
}
function We(e, t) {
  if (e[t] !== `{`) return null;
  let n = t + 1;
  for (; Le(e[n]); ) n += 1;
  let r = e.slice(t + 1, n);
  return e[n] === `}` && he(r) ? { name: r, end: n + 1 } : null;
}
function Ge(e) {
  let t = ``,
    n = 0,
    r = (n) => {
      Le(e[n]) && /\\[A-Za-z]+$/.test(t) && (t += ` `);
    };
  for (; n < e.length; ) {
    let i = e[n];
    if (i === `^` && e.startsWith(`\\circ`, n + 1) && !Le(e[n + 6])) {
      ((t += `^{\\circ}`), (n += 6));
      continue;
    }
    if (i !== `\\`) {
      ((t += i), (n += 1));
      continue;
    }
    let { name: a, end: o } = Ue(e, n),
      s = Fe.get(a),
      c = Pe.get(a),
      l = Ie.has(a) ? We(e, o) : null;
    s === void 0
      ? c === void 0
        ? l === null
          ? ((t += e.slice(n, o)), (n = o))
          : ((t += `\\operatorname{${l.name}}`), (n = l.end))
        : ((t += c), (n = o), c === `` && r(n))
      : e[o] === `|`
        ? ((t += s), (n = o + 1))
        : ((n = e[o] === `.` ? o + 1 : o), r(n));
  }
  return t;
}
var Ke = new Set(de.filter((e) => e.category !== null).map((e) => e.name)),
  qe = new Set([
    `sin`,
    `cos`,
    `tan`,
    `csc`,
    `sec`,
    `cot`,
    `sinh`,
    `cosh`,
    `tanh`,
    `csch`,
    `sech`,
    `coth`,
  ]);
function Je(e) {
  return e.t === `command` && Ke.has(e.name);
}
function Ye(e, t) {
  if (!ge(t.name)) return z(`unsupported`, t.span, `"${t.name}" is not supported`);
  V(e);
  let n = null,
    r = null;
  for (let i = B(e); ; i = B(e))
    if (n === null && t.name === `log` && ut(i, `_`)) (V(e), (n = At(e).node));
    else if (r === null && ut(i, `^`) && !Mt(e)) (V(e), (r = At(e).node));
    else break;
  let i = ue.has(t.name);
  if (r !== null && !i) return Xe(t);
  let a = B(e);
  if (ut(a, `'`)) return z(`unsupported`, a.span, `"'" is not supported`);
  if (a.t === `open` && a.ch === `(`)
    return Ze(t.name) && Qe(e)
      ? Dt(e, it(rt(t, [], null, ct(e)), r))
      : Dt(e, it(rt(t, $e(e), n, ct(e)), r));
  if (!i) return Xe(t);
  let o = nt(e, t);
  return it(rt(t, [o], n, o.span.end), r);
}
function Xe(e) {
  return z(`function-parentheses`, e.span, `"${e.name}" needs (`, e.name);
}
function Ze(e) {
  let t = de.find((t) => t.name === e)?.arity;
  return t !== void 0 && t !== `variadic` && !t.includes(0);
}
function Qe(e) {
  let t = B(e, 1);
  return t.t !== `close` || t.ch !== `)` ? !1 : (V(e), V(e), !0);
}
function $e(e) {
  let t = Zt(e, V(e), () => {
      let t = B(e);
      ut(t, `,`) && z(`comma-side`, t.span, `an argument is missing before a comma`);
      let n = [$t(e)];
      for (let t = B(e); ut(t, `,`); t = B(e)) (V(e), et(t, B(e)), n.push($t(e)));
      return n;
    }),
    n = B(e);
  return ((n.t !== `close` || n.ch !== `)`) && Xt(e, n), V(e), t);
}
function et(e, t) {
  ut(e, `,`) &&
    (ut(t, `,`) || (t.t === `close` && t.ch === `)`)) &&
    z(`comma-side`, e.span, `an argument is missing beside a comma`);
}
function tt(e, t) {
  let n = B(e);
  if (t.kind !== `id` || n.t !== `open` || n.ch !== `(` || !e.options.userFunctions?.has(t.name))
    return t;
  let r = Qe(e) ? [] : $e(e),
    i = { start: t.span.start, end: ct(e) };
  return { kind: `call`, name: t.name, args: r, span: i };
}
function nt(e, t) {
  let n = e.pos,
    r = [];
  for (let t = B(e); lt(t); t = B(e)) (V(e), ut(t, `-`) && r.push(t));
  let i = null;
  for (; en(e) && !Je(B(e)); ) {
    let t = Et(e);
    i = i === null ? st(r, t) : ot(i, t);
  }
  let a = B(e);
  return i !== null && Je(a)
    ? z(`argument-parentheses`, t.span, `"${t.name}" needs (`, t.name)
    : i === null
      ? a.t === `end` && e.pos === n
        ? Xe(t)
        : Je(a)
          ? st(r, Ye(e, a))
          : Xt(e, a)
      : i;
}
function rt(e, t, n, r) {
  let i = { start: e.span.start, end: r };
  return { kind: `call`, name: e.name, args: n === null ? t : [...t, n], span: i };
}
function it(e, t) {
  if (t === null) return e;
  let n = e.name.slice(3);
  if (e.name.startsWith(`arc`) && qe.has(n) && at(t)) return { ...e, name: n };
  if (qe.has(e.name) && at(t)) {
    let t = `arc${e.name}`;
    return ge(t) ? { ...e, name: t } : z(`unsupported`, e.span, `"${t}" is not supported`);
  }
  return { kind: `pow`, left: e, right: t, span: e.span };
}
function at(e) {
  return e.kind === `neg` && e.arg.kind === `num` && e.arg.value === 1;
}
function ot(e, t) {
  return { kind: `mul`, left: e, right: t, span: { start: e.span.start, end: t.span.end } };
}
function st(e, t) {
  let n = t;
  for (let t = e.length - 1; t >= 0; t--)
    n = { kind: `neg`, arg: n, span: { start: e[t].span.start, end: n.span.end } };
  return n;
}
function ct(e) {
  return e.tokens[e.pos - 1].span.end;
}
function lt(e) {
  return ut(e, `+`) || ut(e, `-`);
}
function ut(e, t) {
  return e.t === `symbol` && e.ch === t;
}
var dt = Object.freeze({
    index: `Indexing a list`,
    slice: `Slicing a list`,
    filter: `Filtering a list`,
    comprehension: `Building a list with 'for'`,
    listCurves: `Graphing a list of curves`,
  }),
  ft = new Set([`id`, `call`, `list`]),
  pt = new Set([`=`, `<`, `>`]);
function mt(e, t) {
  V(e);
  let n = [],
    r = -1;
  Zt(e, t, () => {
    if (!xt(B(e)))
      for (;;) {
        let t = B(e);
        (yt(t) &&
          (n.length === 0 && vt(t),
          (r >= 0 || n.length > 2) && Xt(e, t),
          V(e),
          (r = n.length),
          bt(B(e)) && V(e),
          xt(B(e)) && vt(t)),
          n.push($t(e)));
        let i = B(e);
        if (bt(i)) V(e);
        else if (!yt(i)) return;
      }
  });
  let i = B(e);
  (xt(i) || Xt(e, i), V(e));
  let a = { start: t.span.start, end: i.span.end };
  return r < 0
    ? { kind: `list`, items: n, span: a }
    : n.length === r + 1
      ? { kind: `list`, items: n, range: !0, span: a }
      : z(`syntax`, a, `a range has one item after the ellipsis`);
}
function ht(e, t) {
  let n = B(e);
  if (n.t !== `open` || n.ch !== `[` || !ft.has(t.kind)) return;
  let r = _t(e);
  z(`unsupported`, n.span, `${r} is not supported`, r);
}
function gt(e) {
  if (e.t !== `command` || e.name !== `for`) return;
  let t = dt.comprehension;
  z(`unsupported`, e.span, `${t} is not supported`, t);
}
function _t(e) {
  let t = 0;
  for (let n = e.pos; n < e.tokens.length; n++) {
    let r = e.tokens[n];
    if ((r.t === `open` ? (t += 1) : r.t === `close` && --t, t === 0)) break;
    if (t === 1) {
      if (yt(r)) return dt.slice;
      if (
        (r.t === `symbol` && pt.has(r.ch)) ||
        (r.t === `command` && (r.name === `le` || r.name === `ge`))
      )
        return dt.filter;
    }
  }
  return dt.index;
}
function vt(e) {
  return z(`range-bound`, e.span, `a range needs an item on each side of the ellipsis`);
}
function yt(e) {
  return e.t === `command` && e.name === `ldots`;
}
function bt(e) {
  return e.t === `symbol` && e.ch === `,`;
}
function xt(e) {
  return e.t === `close` && e.ch === `]`;
}
var St = new Set([`'`]),
  Ct = new Set([`operatorname`, `text`, `mathrm`]),
  wt = new Set(
    `alpha.beta.gamma.delta.epsilon.varepsilon.zeta.eta.theta.vartheta.iota.kappa.lambda.mu.nu.xi.rho.varrho.sigma.varsigma.upsilon.phi.varphi.chi.psi.omega`.split(
      `.`
    )
  );
function Tt(e) {
  let t = B(e);
  return Je(t) ? Ye(e, t) : Et(e);
}
function Et(e) {
  return Dt(e, Ot(e));
}
function Dt(e, t) {
  let n = t,
    r = !1;
  for (let t = B(e); t.t === `symbol`; t = B(e))
    if (
      ((St.has(t.ch) || (t.ch === `.` && Gt(n))) &&
        z(`unsupported`, t.span, `"${t.ch}" is not supported`),
      t.ch === `%` || t.ch === `!`)
    )
      (V(e),
        (n = {
          kind: t.ch === `%` ? `pct` : `fact`,
          arg: n,
          span: { start: n.span.start, end: t.span.end },
        }),
        (r = !1));
    else if (t.ch === `^` && Mt(e)) {
      for (let t = 0; t < 3; t++) V(e);
      let t = V(e);
      ((n = { kind: `deg`, arg: n, span: { start: n.span.start, end: t.span.end } }), (r = !1));
    } else if (t.ch === `^`) {
      (r && Xt(e, t), V(e));
      let i = At(e),
        a = { start: n.span.start, end: i.end };
      ((n = { kind: `pow`, left: n, right: i.node, span: a }), (r = !0));
    } else break;
  return (ht(e, n), n);
}
function Ot(e) {
  let t = B(e);
  switch (t.t) {
    case `digits`:
      return (V(e), { kind: `num`, value: Number(t.text), span: t.span });
    case `letter`:
      return tt(e, zt(e, t));
    case `open`:
      return t.ch === `[` ? mt(e, t) : Nt(e, t);
    case `symbol`:
      return t.ch === `|` ? Pt(e, t, `raw`) : Xt(e, t);
    case `command`:
      return t.name === `frac`
        ? Ft(e, t)
        : t.name === `sqrt`
          ? Rt(e, t, null)
          : t.name === `cbrt` && Wt(e, t)
            ? Rt(e, t, { kind: `num`, value: 3, span: t.span })
            : t.name === `lvert`
              ? Pt(e, t, `lvert`)
              : tt(e, Bt(e, !0));
    default:
      return Xt(e, t);
  }
}
function kt(e) {
  let t = B(e);
  if (t.t === `open` && t.ch === `{`) return jt(e, t, `}`).node;
  if (t.t === `digits`) {
    let n = Ut(e, t);
    return { kind: `num`, value: Number(n.text), span: n.span };
  }
  return t.t === `letter`
    ? (V(e),
      t.ch === `e`
        ? { kind: `const`, name: `e`, span: t.span }
        : { kind: `id`, name: t.ch, span: t.span })
    : t.t === `command`
      ? Bt(e, !1)
      : Xt(e, t);
}
function At(e) {
  let t = B(e);
  if (t.t === `open` && t.ch === `{`) return jt(e, t, `}`);
  let n = kt(e);
  return { node: n, end: n.span.end };
}
function jt(e, t, n) {
  V(e);
  let r = Zt(e, t, () => $t(e)),
    i = B(e);
  return ((i.t !== `close` || i.ch !== n) && Xt(e, i), V(e), { node: r, end: i.span.end });
}
function Mt(e) {
  let [t, n, r] = [B(e, 1), B(e, 2), B(e, 3)];
  return (
    t.t === `open` &&
    t.ch === `{` &&
    n.t === `command` &&
    n.name === `circ` &&
    r.t === `close` &&
    r.ch === `}`
  );
}
function Nt(e, t) {
  V(e);
  let n = Zt(e, t, () => {
      let n = [$t(e)];
      for (let r = B(e); r.t === `symbol` && r.ch === `,`; r = B(e))
        (t.ch === `{` && Xt(e, r), V(e), n.push($t(e)));
      return n;
    }),
    r = B(e);
  ((r.t !== `close` || r.ch !== (t.ch === `(` ? `)` : `}`)) && Xt(e, r), V(e));
  let i = { start: t.span.start, end: r.span.end };
  return n.length > 2
    ? z(`point-arity`, i, `a point has 2 coordinates, not ${n.length}`)
    : n.length === 2
      ? { kind: `point`, x: n[0], y: n[1], span: i }
      : { ...n[0], span: i };
}
function Pt(e, t, n) {
  V(e);
  let r = Zt(e, t, () => {
      e.bars.push(n);
      try {
        return $t(e);
      } finally {
        e.bars.pop();
      }
    }),
    i = B(e);
  return (
    (n === `raw` ? i.t === `symbol` && i.ch === `|` : i.t === `command` && i.name === `rvert`) ||
      Xt(e, i),
    V(e),
    { kind: `abs`, arg: r, span: { start: t.span.start, end: i.span.end } }
  );
}
function Ft(e, t) {
  V(e);
  let n = At(e),
    r = At(e);
  if (It(n.node, r.node))
    return z(`unsupported`, t.span, `"\\frac{d}{d…}" (derivative) is not supported`);
  let i = { start: t.span.start, end: r.end };
  return { kind: `div`, left: n.node, right: r.node, span: i };
}
function It(e, t) {
  return Lt(e, `d`) && t.kind === `mul` && Lt(t.left, `d`) && Lt(t.right, null);
}
function Lt(e, t) {
  return e.kind !== `id` && (e.kind !== `const` || e.name !== `e`)
    ? !1
    : t === null
      ? /^[A-Za-z]$/.test(e.name)
      : e.name === t;
}
function Rt(e, t, n) {
  V(e);
  let r = B(e),
    i = n;
  i === null && r.t === `open` && r.ch === `[` && (i = jt(e, r, `]`).node);
  let a = B(e),
    o = a.t === `open` && a.ch === `(` ? jt(e, a, `)`) : At(e);
  return { kind: `root`, arg: o.node, index: i, span: { start: t.span.start, end: o.end } };
}
function zt(e, t) {
  V(e);
  let n = B(e);
  if (n.t === `symbol` && n.ch === `_`) return Vt(e, t.ch, t.span.start);
  if (t.ch === `e`) return { kind: `const`, name: `e`, span: t.span };
  if (n.t === `digits` && n.span.start === t.span.end && Kt(n)) {
    V(e);
    let r = { start: t.span.start, end: n.span.end };
    return { kind: `id`, name: `${t.ch}_{${n.text}}`, span: r };
  }
  return { kind: `id`, name: t.ch, span: t.span };
}
function Bt(e, t) {
  if (!en(e)) return Xt(e, B(e));
  let n = V(e);
  if (n.name === `pi` || n.name === `tau`) return { kind: `const`, name: n.name, span: n.span };
  if (wt.has(n.name)) {
    let r = `\\${n.name}`,
      i = B(e);
    return t && i.t === `symbol` && i.ch === `_`
      ? Vt(e, r, n.span.start)
      : { kind: `id`, name: r, span: n.span };
  }
  gt(n);
  let [r, i] = [B(e), B(e, 1)],
    a = r.t === `open` && r.ch === `{` && i.t === `close` && i.ch === `}`;
  return Ct.has(n.name) && a
    ? z(`syntax`, i.span, `"\\${n.name}{}" is empty`)
    : z(`unsupported`, n.span, `"\\${n.name}" is not supported`);
}
function Vt(e, t, n) {
  V(e);
  let r = B(e),
    i,
    a;
  if (r.t === `open` && r.ch === `{`) (V(e), (i = Zt(e, r, () => Ht(e))), (a = V(e).span.end));
  else if (r.t === `letter`) (V(e), (i = r.ch), (a = r.span.end));
  else if (r.t === `digits`) {
    let t = Ut(e, r);
    ((i = t.text), (a = t.span.end));
  } else return Xt(e, r);
  return { kind: `id`, name: `${t}_{${i}}`, span: { start: n, end: a } };
}
function Ht(e) {
  let t = ``;
  for (let n = B(e); ; n = B(e)) {
    if (n.t === `close` && n.ch === `}` && t !== ``) return t;
    if (n.t === `letter`) t += n.ch;
    else if (n.t === `digits` && !n.text.includes(`.`)) t += n.text;
    else return Xt(e, n);
    V(e);
  }
}
function Ut(e, t) {
  let n = t.text[0],
    r = { start: t.span.start, end: t.span.start + 1 };
  if (n === `.`) return z(`syntax`, r, `unexpected "."`);
  let i = t.text.slice(1);
  if (i === ``) return (V(e), { text: n, span: t.span });
  let a = r.end;
  for (; /\s/.test(e.normalized[a]); ) a += 1;
  let o = { start: a, end: t.span.end };
  return (
    (e.tokens[e.pos] =
      i === `.` ? { t: `symbol`, ch: `.`, span: o } : { t: `digits`, text: i, span: o }),
    { text: n, span: r }
  );
}
function Wt(e, t) {
  return e.normalized[t.span.start] !== `\\`;
}
function Gt(e) {
  return e.kind === `id` || e.kind === `call`;
}
function Kt(e) {
  return !e.text.includes(`.`) && e.span.end - e.span.start === e.text.length;
}
var qt = class extends Error {
    constructor(e) {
      (super(e.detail), (this.name = `ParseFailure`), (this.error = e));
    }
  },
  Jt = new Set([`cdot`, `le`, `ge`, `rvert`, `of`, `sim`, `ldots`]);
function Yt(e, t, n) {
  return { tokens: e, pos: 0, depth: 0, bars: [], normalized: t, options: n };
}
function z(e, t, n, r) {
  let i = { code: e, span: { start: t.start, end: t.end }, detail: n };
  throw new qt(r === void 0 ? i : { ...i, feature: r });
}
function Xt(e, t) {
  if (t.t === `end`) return z(`syntax`, t.span, `unexpected end of input`);
  let n = e.normalized.slice(t.span.start, t.span.end);
  return z(`syntax`, t.span, `unexpected "${n}"`);
}
function B(e, t = 0) {
  return e.tokens[Math.min(e.pos + t, e.tokens.length - 1)];
}
function V(e) {
  let t = B(e);
  return (t.t !== `end` && (e.pos += 1), t);
}
function Zt(e, t, n) {
  (e.depth >= 64 && z(`too-deep`, t.span, `more than 64 nesting levels`), (e.depth += 1));
  try {
    return n();
  } finally {
    --e.depth;
  }
}
function Qt(e) {
  let t = B(e);
  sn(t) && z(`sim-side`, t.span, `nothing before \\sim`);
  let n = [$t(e)],
    r = B(e);
  if (sn(r)) {
    (V(e), B(e).t === `end` && z(`sim-side`, r.span, `nothing after \\sim`));
    let t = $t(e),
      i = B(e);
    return (i.t !== `end` && Xt(e, i), { kind: `sim`, left: n[0], right: t, span: ln(n[0], t) });
  }
  let i = [];
  for (let t = an(e); t !== null; t = an(e)) (on(i, t), i.push(t.op), n.push($t(e)));
  let a = B(e);
  return (
    a.t !== `end` && Xt(e, a),
    i.length === 0 ? n[0] : { kind: `rel`, ops: i, operands: n, span: ln(n[0], n[n.length - 1]) }
  );
}
function $t(e) {
  let t = tn(e);
  for (let n = B(e); cn(n); n = B(e)) {
    V(e);
    let r = tn(e);
    t = { kind: n.ch === `+` ? `add` : `sub`, left: t, right: r, span: ln(t, r) };
  }
  return t;
}
function en(e) {
  let t = B(e);
  switch (t.t) {
    case `digits`:
    case `letter`:
    case `open`:
      return !0;
    case `symbol`:
      return t.ch === `|` && e.bars.length === 0;
    case `command`:
      return !Jt.has(t.name);
    default:
      return !1;
  }
}
function tn(e) {
  let { node: t, factor: n } = rn(e);
  for (;;) {
    let r = nn(B(e), n);
    if (r !== null) {
      V(e);
      let i = rn(e);
      ((t = { kind: r, left: t, right: i.node, span: ln(t, i.node) }), (n = i.factor));
    } else if (en(e)) ((n = Tt(e)), (t = { kind: `mul`, left: t, right: n, span: ln(t, n) }));
    else return t;
  }
}
function nn(e, t) {
  return e.t === `symbol`
    ? e.ch === `*`
      ? `mul`
      : e.ch === `/`
        ? `div`
        : null
    : e.t === `command` && (e.name === `cdot` || (e.name === `of` && t.kind === `pct`))
      ? `mul`
      : null;
}
function rn(e) {
  let t = [];
  for (let n = B(e); cn(n); n = B(e)) (V(e), n.ch === `-` && t.push(n));
  let n = Tt(e),
    r = n;
  for (let e = t.length - 1; e >= 0; e--)
    r = { kind: `neg`, arg: r, span: { start: t[e].span.start, end: r.span.end } };
  return { node: r, factor: n };
}
function an(e) {
  let t = B(e);
  if (t.t === `command` && (t.name === `le` || t.name === `ge`))
    return (V(e), { op: t.name === `le` ? `<=` : `>=`, span: t.span });
  if (t.t !== `symbol` || (t.ch !== `=` && t.ch !== `<` && t.ch !== `>`)) return null;
  V(e);
  let n = B(e);
  if (t.ch !== `=` && n.t === `symbol` && n.ch === `=` && n.span.start === t.span.end) {
    V(e);
    let r = { start: t.span.start, end: n.span.end };
    return { op: t.ch === `<` ? `<=` : `>=`, span: r };
  }
  return { op: t.ch, span: t.span };
}
function on(e, t) {
  if (e.length === 0) return;
  let n = e[e.length - 1];
  (t.op === `=` || n === `=` || t.op[0] !== n[0]) &&
    z(`relation-chain`, t.span, `"${t.op}" cannot follow "${n}" in a chain`);
}
function sn(e) {
  return (e.t === `symbol` && e.ch === `~`) || (e.t === `command` && e.name === `sim`);
}
function cn(e) {
  return e.t === `symbol` && (e.ch === `+` || e.ch === `-`);
}
function ln(e, t) {
  return { start: e.span.start, end: t.span.end };
}
var un = new Set([
    `+`,
    `-`,
    `*`,
    `/`,
    `^`,
    `_`,
    `!`,
    `%`,
    `=`,
    `<`,
    `>`,
    `|`,
    `,`,
    `:`,
    `.`,
    `'`,
    `~`,
  ]),
  dn = new Set([`(`, `[`, `{`]),
  fn = new Set([`)`, `]`, `}`]),
  pn = `\\operatorname{`,
  mn = `...`,
  hn = (e) => e !== void 0 && e >= `0` && e <= `9`,
  gn = (e) => e !== void 0 && ((e >= `a` && e <= `z`) || (e >= `A` && e <= `Z`)),
  _n = (e) => e !== void 0 && /\s/.test(e);
function vn(e, t) {
  return String.fromCodePoint(e.codePointAt(t));
}
function yn(e) {
  let t = [],
    n = 0;
  for (; n < e.length; ) {
    let r = e[n],
      i = (e) => ({ start: n, end: e });
    if (_n(r)) n += 1;
    else if (e.startsWith(mn, n))
      (t.push({ t: `command`, name: `ldots`, span: i(n + 3) }), (n += 3));
    else if (hn(r) || (r === `.` && hn(e[n + 1]) && !bn(t))) {
      let r = xn(e, n);
      (t.push(r), (n = r.span.end));
    } else if (gn(r)) (t.push({ t: `letter`, ch: r, span: i(n + 1) }), (n += 1));
    else if (r === `\\`) {
      let r = Sn(e, n);
      if (r === null)
        return { code: `syntax`, span: i(n + 1), detail: `a backslash ends the input` };
      (t.push(r), (n = r.span.end));
    } else if (un.has(r)) (t.push({ t: `symbol`, ch: r, span: i(n + 1) }), (n += 1));
    else if (dn.has(r)) (t.push({ t: `open`, ch: r, span: i(n + 1) }), (n += 1));
    else if (fn.has(r)) (t.push({ t: `close`, ch: r, span: i(n + 1) }), (n += 1));
    else if (r === `;`)
      return { code: `unsupported`, span: i(n + 1), detail: `";" (matrix rows) is not supported` };
    else {
      let t = vn(e, n);
      return { code: `syntax`, span: i(n + t.length), detail: `unexpected character "${t}"` };
    }
  }
  return (t.push({ t: `end`, span: { start: e.length, end: e.length } }), t);
}
function bn(e) {
  let t = e[e.length - 1];
  return t !== void 0 && t.t === `digits` && t.text.includes(`.`);
}
function xn(e, t) {
  let n = ``,
    r = t,
    i = t;
  for (;;) {
    let t = e[i];
    if (hn(t) || (t === `.` && !n.includes(`.`) && !e.startsWith(mn, i))) {
      ((n += t), (i += 1), (r = i));
      continue;
    }
    let a = i;
    for (; _n(e[a]); ) a += 1;
    let o = e[a];
    if (a === i || !(hn(o) || (o === `.` && !n.includes(`.`)))) break;
    i = a;
  }
  return { t: `digits`, text: n, span: { start: t, end: r } };
}
function Sn(e, t) {
  let n = e[t + 1];
  if (n === void 0) return null;
  if (!gn(n)) {
    let n = vn(e, t + 1),
      r = { start: t, end: t + 1 + n.length };
    return n === `%` ? { t: `symbol`, ch: `%`, span: r } : { t: `command`, name: n, span: r };
  }
  if (e.startsWith(pn, t)) {
    let n = t + 14;
    for (; gn(e[n]); ) n += 1;
    let r = e.slice(t + 14, n);
    if (e[n] === `}` && he(r)) return { t: `command`, name: r, span: { start: t, end: n + 1 } };
  }
  let r = t + 1;
  for (; gn(e[r]); ) r += 1;
  return { t: `command`, name: e.slice(t + 1, r), span: { start: t, end: r } };
}
function Cn(e) {
  let t = yn(Re(e));
  if (!Array.isArray(t) || t[0].t !== `letter`) return null;
  let n = t[0].ch,
    r = 1;
  if (Tn(t[r], `_`)) {
    let e = wn(t, r + 1);
    if (e === null) return null;
    ((n += `_{${e.text}}`), (r = e.end));
  }
  if (!En(t[r], `open`, `(`)) return null;
  let i = [];
  for (r += 1; ; r += 2) {
    let e = t[r];
    if (e === void 0 || e.t !== `letter`) return null;
    if ((i.push(e.ch), En(t[r + 1], `close`, `)`))) break;
    if (!Tn(t[r + 1], `,`)) return null;
  }
  return Tn(t[r + 2], `=`) ? { name: n, params: i } : null;
}
function wn(e, t) {
  let n = e[t];
  if (n === void 0) return null;
  if (n.t === `letter`) return { text: n.ch, end: t + 1 };
  if (n.t === `digits`) return n.text.length === 1 ? { text: n.text, end: t + 1 } : null;
  if (!En(n, `open`, `{`)) return null;
  let r = ``;
  for (let n = t + 1; n < e.length; n++) {
    let t = e[n];
    if (En(t, `close`, `}`)) return r === `` ? null : { text: r, end: n + 1 };
    if (t.t === `letter`) r += t.ch;
    else if (t.t === `digits` && !t.text.includes(`.`)) r += t.text;
    else return null;
  }
  return null;
}
function Tn(e, t) {
  return e !== void 0 && e.t === `symbol` && e.ch === t;
}
function En(e, t, n) {
  return e !== void 0 && e.t === t && e.ch === n;
}
var Dn = new Set([
    `sin`,
    `cos`,
    `tan`,
    `csc`,
    `sec`,
    `cot`,
    `arcsin`,
    `arccos`,
    `arctan`,
    `sinh`,
    `cosh`,
    `tanh`,
    `coth`,
    `exp`,
    `ln`,
    `log`,
    `arg`,
    `det`,
    `gcd`,
    `max`,
    `min`,
  ]),
  On = { "=": `=`, "<": `<`, ">": `>`, "<=": `\\le`, ">=": `\\ge` },
  kn = `1` + `0`.repeat(309),
  An = new Set([
    `num`,
    `id`,
    `const`,
    `call`,
    `abs`,
    `root`,
    `pct`,
    `deg`,
    `fact`,
    `point`,
    `list`,
  ]),
  jn = new Set([`add`, `sub`]),
  Mn = new Set([`add`, `sub`, `mul`]),
  Nn = new Set([`add`, `sub`, `mul`, `neg`]),
  Pn = new Set([`add`, `sub`, `mul`, `neg`, `rel`]);
function H(e) {
  switch (e.kind) {
    case `num`:
      return Un(e.value);
    case `id`:
      return e.name;
    case `const`:
      return e.name === `e` ? `e` : `\\${e.name}`;
    case `add`:
    case `sub`:
      return U([H(e.left), e.kind === `add` ? `+` : `-`, Bn(e.right, jn)]);
    case `mul`:
      return Fn(e.left, e.right);
    case `div`:
      return U([`\\frac{`, H(e.left), `}{`, H(e.right), `}`]);
    case `pow`:
      return U([An.has(e.left.kind) ? H(e.left) : zn(e.left), `^{`, H(e.right), `}`]);
    case `neg`:
      return U([`-`, Bn(e.arg, Nn)]);
    case `pct`:
      return U([Bn(e.arg, Pn), `\\%`]);
    case `deg`:
      return U([Bn(e.arg, Pn), `^{\\circ}`]);
    case `fact`:
      return U([Bn(e.arg, Pn), `!`]);
    case `abs`:
      return U([`\\left|`, H(e.arg), `\\right|`]);
    case `root`:
      return e.index === null
        ? U([`\\sqrt{`, H(e.arg), `}`])
        : U([`\\sqrt[`, H(e.index), `]{`, H(e.arg), `}`]);
    case `point`:
      return U([`\\left(`, H(e.x), `,`, H(e.y), `\\right)`]);
    case `list`:
      return U([`\\left[`, ...Ln(e.items, e.range === !0), `\\right]`]);
    case `rel`:
      return U(e.operands.flatMap((t, n) => (n === 0 ? [H(t)] : [On[e.ops[n - 1]], H(t)])));
    case `call`:
      return In(e.name, e.args);
    case `sim`:
      return U([H(e.left), `\\sim`, H(e.right)]);
  }
}
function Fn(e, t) {
  let n = Bn(e, jn),
    r = Bn(t, Mn);
  return e.kind === `num` && (Hn(r[0]) || r[0] === `\\`) ? U([n, r]) : U([n, `\\cdot`, r]);
}
function In(e, t) {
  let n = Dn.has(e) ? `\\${e}` : he(e) ? `\\operatorname{${e}}` : e;
  return e === `log` && t.length === 2 ? U([n, `_{`, H(t[1]), `}`, Rn([t[0]])]) : U([n, Rn(t)]);
}
function Ln(e, t) {
  let n = e.map(H);
  if (!t) return n.flatMap((e, t) => (t === 0 ? [e] : [`,`, e]));
  let r = n.length - 1,
    i = n.slice(0, r).flatMap((e, t) => (t === 0 ? [e] : [`,`, e]));
  return r === 1 ? [...i, `\\ldots`, n[r]] : [...i, `,\\ldots,`, n[r]];
}
function Rn(e) {
  return U([`\\left(`, e.map(H).join(`,`), `\\right)`]);
}
function zn(e) {
  return U([`\\left(`, H(e), `\\right)`]);
}
function Bn(e, t) {
  return t.has(e.kind) ? zn(e) : H(e);
}
function U(e) {
  let t = ``;
  for (let n of e) (Hn(n[0]) && Vn(t) && (t += ` `), (t += n));
  return t;
}
function Vn(e) {
  let t = e.length - 1;
  for (; t >= 0 && Hn(e[t]); ) --t;
  return t < e.length - 1 && t >= 0 && e[t] === `\\`;
}
function Hn(e) {
  return e !== void 0 && ((e >= `a` && e <= `z`) || (e >= `A` && e <= `Z`));
}
function Un(e) {
  if (!Number.isFinite(e)) return kn;
  let t = String(e),
    n = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(t);
  if (n === null) return t;
  let [, r, i, a = ``, o] = n,
    s = i + a,
    c = i.length + Number(o);
  return c <= 0
    ? `${r}0.${`0`.repeat(-c)}${s}`
    : c >= s.length
      ? r + s + `0`.repeat(c - s.length)
      : `${r}${s.slice(0, c)}.${s.slice(c)}`;
}
function Wn(e, t = {}) {
  let n = ``;
  try {
    if (((n = Re(e)), n.trim() === ``))
      return Gn({ code: `syntax`, span: { start: 0, end: 0 }, detail: `empty` }, n);
    let r = yn(n);
    if (!Array.isArray(r)) return Gn(r, n);
    let i = Qt(Yt(Oe(r), n, t)),
      a = se(i);
    return a > 2e3
      ? Gn(
          {
            code: `too-many-nodes`,
            span: { start: 0, end: n.length },
            detail: `${a} nodes, more than ${L}`,
          },
          n
        )
      : { ok: !0, tree: i, normalized: n };
  } catch (e) {
    if (e instanceof qt) return Gn(e.error, n);
    let t = { start: 0, end: n.length };
    return e instanceof RangeError
      ? Gn({ code: `too-deep`, span: t, detail: `nesting too deep` }, n)
      : Gn(
          {
            code: `syntax`,
            span: t,
            detail: `internal: ${e instanceof Error ? e.name : typeof e}`,
          },
          n
        );
  }
}
function Gn(e, t) {
  return { ok: !1, error: e, normalized: t };
}
var Kn = {
  alpha: `α`,
  beta: `β`,
  gamma: `γ`,
  delta: `δ`,
  epsilon: `ϵ`,
  varepsilon: `ε`,
  zeta: `ζ`,
  eta: `η`,
  theta: `θ`,
  vartheta: `ϑ`,
  iota: `ι`,
  kappa: `κ`,
  lambda: `λ`,
  mu: `μ`,
  nu: `ν`,
  xi: `ξ`,
  pi: `π`,
  rho: `ρ`,
  varrho: `ϱ`,
  sigma: `σ`,
  varsigma: `ς`,
  tau: `τ`,
  upsilon: `υ`,
  phi: `ϕ`,
  varphi: `φ`,
  chi: `χ`,
  psi: `ψ`,
  omega: `ω`,
};
function qn(e) {
  let t = /^(.*?)_\{(.*)\}$/.exec(e),
    [n, r] = t === null ? [e, null] : [t[1], t[2]];
  return r === null ? Jn(n) : `${Jn(n)}_${r}`;
}
function Jn(e) {
  return e.startsWith(`\\`) ? (Kn[e.slice(1)] ?? e) : e === `pi` || e === `tau` ? Kn[e] : e;
}
var Yn = {
    syntax: `This can't be read. Check for a missing bracket or operator.`,
    unsupported: `This calculator doesn't support that notation.`,
    "point-arity": `A point needs exactly two coordinates.`,
    "relation-chain": `A chain of inequalities must point one way and use at most one =.`,
    "too-many-nodes": `This row is too long to evaluate. Split it into smaller definitions.`,
    "too-deep": `This row is nested too deeply.`,
    "sim-side": `You need something on both sides of the '∼' symbol.`,
    "function-parentheses": `'{n}' is a function. Try using parentheses.`,
    "argument-parentheses": `Use parentheses around the argument of '{n}'.`,
    "comma-side": `You need something on both sides of the ',' symbol.`,
    "range-bound": `Range must have an upper and lower bound.`,
    "too-many-params": `Functions can have at most 8 parameters.`,
    "duplicate-definition": `You've defined '{n}' in more than one place. Try deleting some of the definitions of '{n}'.`,
    dependency: `{n} has more than one definition.`,
    cycle: `{n} is defined in terms of itself.`,
    "reserved-name": `{n} is reserved and can't be redefined.`,
    arity: `Function '{n}' requires {k} arguments.`,
    "point-coordinates": `A point's coordinates can't use x or y.`,
    "mixed-variables": `Use an equation such as y=… to graph an expression in x and y.`,
    "polar-variable": `{n} only has a meaning in a polar equation.`,
    timeout: `This is taking too long. Try a smaller range or fewer terms.`,
    "regression-data": `Regression needs a list of data.`,
    "regression-predictor": `Use the table column, such as x₁, not x.`,
    "regression-params": `A regression can fit at most 8 parameters.`,
    "regression-fit": `We couldn't find any region where this model is defined.`,
    "nested-list": `Cannot store a list of numbers in a list.`,
    "list-too-long": `Lists may not have more than 10,000 elements.`,
    "range-step": `A range can't step by 0. Make its first two values different.`,
    "list-mixed": `A list can't mix numbers and points.`,
    "too-many-variables": `Too many variables. Try defining '{n}'.`,
  },
  Xn = `{n} is for polar graphs, which aren't available yet.`,
  Zn = new Set([`r`, `θ`]),
  Qn = `{n} isn't supported yet.`,
  $n = new Set(Object.values(dt));
function er(e, t) {
  let [n = ``, r = ``] = t;
  if (e === `arity`) return tr(n, r, Number(t[2]));
  if (e === `too-many-variables`) return nr(t);
  if (e === `function-parentheses` && ue.has(n)) return tr(n, `1`, 0);
  let i = Yn[e];
  return (
    e === `unsupported` && Zn.has(n) && (i = Xn),
    e === `unsupported` && $n.has(n) && (i = Qn),
    i.replaceAll(`{n}`, () => n).replaceAll(`{k}`, () => r)
  );
}
function tr(e, t, n) {
  let r = e === `log` ? [1] : t.split(/, | or /).map(Number),
    i = Math.max(...r),
    a = (t, n) => `Function '${e}' requires ${t}. For example, try typing: ${e}(${n}).`;
  if (n === 0 && r.includes(1)) return a(`an argument`, `x`);
  if (i === 1) return a(`only 1 argument`, `x`);
  let o = Array.from({ length: i }, (e, t) => String(t + 1)).join(`, `);
  return a(`${i} arguments`, o);
}
function nr(e) {
  if (e.length === 0) return `Too many variables, I don't know what to do with this.`;
  if (e.length === 1) return `Too many variables. Try defining '${e[0]}'.`;
  let t = e[e.length - 1];
  return `Too many variables. Try defining '${e.slice(0, -1).join(`', '`)}' or '${t}'.`;
}
var rr = Object.freeze([`x`, `y`, `r`, `\\theta`]),
  ir = new Set([`e`, `pi`, `tau`]);
function ar(e) {
  let t = [],
    n = [[e, !1]];
  for (let e = n.pop(); e !== void 0; e = n.pop()) {
    let [r, i] = e;
    r.kind === `id`
      ? t.push({ name: r.name, span: r.span, call: !1, inPoint: i })
      : r.kind === `call` &&
        !he(r.name) &&
        t.push({ name: r.name, span: r.span, call: !0, inPoint: i });
    let a = i || r.kind === `point`,
      o = oe(r);
    for (let e = o.length - 1; e >= 0; --e) n.push([o[e], a]);
  }
  return t.sort((e, t) => e.span.start - t.span.start);
}
function or(e, t) {
  return rr.includes(e) || ir.has(e) || (t.complex && e === `i`) || he(e);
}
var sr = { start: 0, end: 0 },
  cr = { kind: `num`, value: NaN, span: sr },
  lr = {
    firstHeader: `The first column needs a name, such as x₁.`,
    ownColumns: `A cell can't use its own table's columns.`,
    comma: `Points are written like this: (1, 2).`,
    undefinedName: (e) => `Too many variables. Try defining '${e}'.`,
  },
  ur = (e, t, n = []) => ({ code: e, message: t, names: n, span: null });
function dr(e, t) {
  if (Re(e).trim() === ``) return { tree: null, error: null, blank: !0 };
  let n = Wn(e, { userFunctions: t });
  return n.ok
    ? { tree: n.tree, error: null, blank: !1 }
    : {
        tree: null,
        error:
          n.error.code === `point-arity` || /,/.test(e)
            ? ur(`syntax`, lr.comma)
            : ur(n.error.code, er(n.error.code, [])),
        blank: !1,
      };
}
function fr(e, t) {
  let n = e.columns ?? [];
  return {
    source: e,
    headers: n.map((e) => dr(e.latex, t)),
    cells: n.map((e) => e.values.map((e) => dr(e, t))),
  };
}
var pr = (e) => e !== null && e.kind === `id`,
  mr = (e) => !rr.includes(e);
function hr(e, t) {
  return e.headers.map((e, n) =>
    !pr(e.tree) || (n > 0 && t.has(e.tree.name)) ? null : e.tree.name
  );
}
function gr(e, t, n) {
  let r = new Set(t.filter((e) => e !== null)),
    i = [];
  return (
    t.forEach((t, a) => {
      if (t === null || !mr(t)) return;
      let o = [...e.cells[a]];
      for (; o.length > 0 && o[o.length - 1].blank; ) o.pop();
      let s = o.map((e) => (_r(e, r, n) ? e.tree : cr)),
        c = sr,
        l = { kind: `list`, items: s, span: c },
        u = { kind: `rel`, ops: [`=`], operands: [{ kind: `id`, name: t, span: c }, l], span: c };
      i.push({
        source: { id: `${e.source.id}#${a}`, latex: ``, hidden: !0 },
        empty: !1,
        tree: u,
        error: null,
        head: { name: t, type: `value`, params: [], body: l, span: c },
      });
    }),
    i
  );
}
function _r(e, t, n) {
  return e.tree !== null && vr(e, t, n) === null;
}
function vr(e, t, n) {
  if (e.error !== null || e.tree === null) return e.error;
  for (let { name: r } of ar(e.tree)) {
    if (t.has(r)) return ur(`dependency`, lr.ownColumns);
    if (!n.has(r) && !rr.includes(r)) return ur(`dependency`, lr.undefinedName(qn(r)), [qn(r)]);
  }
  return null;
}
function yr(e, t, n, r) {
  let i = new Set(t.filter((e) => e !== null));
  return {
    columns: e.headers.map((a, o) => {
      let s = e.cells[o].map((e) => vr(e, i, n)),
        c = e.cells[o].map((e, t) => (s[t] === null ? e.tree : null)),
        l = e.source.columns?.[o]?.hidden === !0,
        u = { index: o, tree: a.tree, cellErrors: s, cells: c, hidden: l };
      if (o === 0) {
        if (!pr(a.tree))
          return { ...u, role: `error`, name: null, error: ur(`syntax`, lr.firstHeader) };
      } else if (a.blank) return { ...u, role: `blank`, name: null, error: null };
      if (a.error !== null) return { ...u, role: `error`, name: null, error: a.error };
      let d = t[o];
      if (d !== null && r.has(d)) {
        let e = qn(d);
        return {
          ...u,
          role: `error`,
          name: d,
          error: ur(`duplicate-definition`, er(`duplicate-definition`, [e]), [e]),
        };
      }
      return d === null
        ? { ...u, role: `computed`, name: null, error: null }
        : { ...u, role: o === 0 ? `variable` : `data`, name: d, error: null };
    }),
    rows: Math.max(0, ...e.cells.map((e) => e.length)),
  };
}
var br = (e) => (e.kind === `mul` ? [...br(e.left), ...br(e.right)] : [e]),
  xr = (e) => (e.kind === `add` ? [...xr(e.left), ...xr(e.right)] : [e]);
function Sr(e, t, n) {
  let r = (e) => (e.kind === `id` ? t.indexOf(e.name) : -1),
    i = (e) => e.kind === `id` && e.name === n,
    a = (e) => (e.kind === `num` && e.value > 0 && e.value !== 1 ? e.value : null),
    o = (e) => {
      let t = br(e);
      if (t.length !== 2) return -1;
      let [n, a] = i(t[0]) ? [t[1], t[0]] : [t[0], t[1]];
      return i(a) ? r(n) : -1;
    },
    s = (...e) => e.every((e) => e >= 0) && new Set(e).size === e.length && e.length === t.length,
    c = br(e);
  if (c.length === 2)
    for (let [e, t] of [
      [c[0], c[1]],
      [c[1], c[0]],
    ]) {
      let n = r(e);
      if (!(n < 0)) {
        if (t.kind === `pow`) {
          let { left: e, right: c } = t;
          if (r(e) >= 0 && i(c) && s(n, r(e))) return { kind: `exponential-base`, a: n, b: r(e) };
          if (i(e) && r(c) >= 0 && s(n, r(c))) return { kind: `power`, a: n, b: r(c) };
          let l = o(c);
          if (e.kind === `const` && e.name === `e` && s(n, l))
            return { kind: `exponential-e`, a: n, b: l };
          let u = a(e);
          if (u !== null && s(n, l)) return { kind: `exponential-ac`, c: u, a: n, b: l };
        }
        if (t.kind === `call` && t.name === `exp` && t.args.length === 1) {
          let e = o(t.args[0]);
          if (s(n, e)) return { kind: `exponential-e`, a: n, b: e };
        }
      }
    }
  if (e.kind === `pow`) {
    let t = a(e.left),
      n = xr(e.right);
    if (t !== null && n.length === 2)
      for (let [e, i] of [
        [n[0], n[1]],
        [n[1], n[0]],
      ]) {
        let n = o(e),
          a = r(i);
        if (s(n, a)) return { kind: `exponential-c`, c: t, m: n, k: a };
      }
  }
  let l = xr(e);
  if (l.length === 2)
    for (let [e, t] of [
      [l[0], l[1]],
      [l[1], l[0]],
    ]) {
      let n = r(e),
        a = br(t);
      if (a.length === 2)
        for (let [e, t] of [
          [a[0], a[1]],
          [a[1], a[0]],
        ]) {
          let a = r(e);
          if (
            t.kind === `call` &&
            t.name === `ln` &&
            t.args.length === 1 &&
            i(t.args[0]) &&
            s(n, a)
          )
            return { kind: `logarithmic`, a: n, b: a };
        }
    }
  return null;
}
var Cr = { start: 0, end: 0 },
  wr = (e) => ({ code: e, message: er(e, []), names: [], span: null }),
  Tr = (e) => [...new Set(e)],
  Er = (e, t) => `${e}#~${t}`;
function Dr(e) {
  let t = e.indexOf(`#~`);
  return t < 0 ? null : e.slice(0, t);
}
function Or(e, t, n, r) {
  let i = e.filter((e) => e.error === null && e.tree?.kind === `sim`),
    a = new Set(t),
    o = new Map();
  for (let e of i) {
    let t = 1;
    for (; a.has(`e_{${t}}`); ) t++;
    (a.add(`e_{${t}}`), o.set(e.source.id, `e_{${t}}`));
  }
  let s = new Set([...n, ...o.values()]),
    c = new Map();
  for (let e of i) {
    let n = e.tree,
      i = Tr(ar(n.right).map((e) => e.name));
    if (i.includes(`x`) || i.includes(`y`)) {
      c.set(e.source.id, { analysis: null, error: wr(`regression-predictor`) });
      continue;
    }
    let a = i.filter((e) => !or(e, r) && !t.has(e) && !s.has(e));
    if (a.length > 8) {
      c.set(e.source.id, { analysis: null, error: wr(`regression-params`) });
      continue;
    }
    let l = i.filter((e) => s.has(e));
    c.set(e.source.id, {
      error: null,
      analysis: {
        rowId: e.source.id,
        observed: n.left,
        model: n.right,
        params: a,
        predictors: l,
        residual: o.get(e.source.id),
        logForm: l.length === 0 ? null : Sr(n.right, a, l[0]),
        logMode: e.source.logMode === !0,
      },
    });
  }
  return c;
}
function kr(e) {
  let t = new Set([...e.params, e.residual]),
    n = {
      kind: `list`,
      items: Tr([e.observed, e.model].flatMap((e) => ar(e).map((e) => e.name)))
        .filter((e) => !t.has(e) && e !== `x` && e !== `y`)
        .map((e) => ({ kind: `id`, name: e, span: Cr })),
      span: Cr,
    };
  return [...e.params, e.residual].map((t) => {
    let r = { name: t, type: `value`, params: [], body: n, span: Cr };
    return {
      source: { id: Er(e.rowId, t), latex: ``, hidden: !0 },
      empty: !1,
      tree: { kind: `rel`, ops: [`=`], operands: [{ kind: `id`, name: t, span: Cr }, n], span: Cr },
      error: null,
      head: r,
    };
  });
}
function Ar(e) {
  if (e.predictors.length !== 1) return null;
  let t = e.predictors[0],
    n = (e) => {
      if (e.kind === `id`) return e.name === t ? { ...e, name: `x` } : e;
      let r = { ...e };
      for (let [t, i] of Object.entries(e))
        t !== `span` &&
          (Array.isArray(i)
            ? (r[t] = i.map((e) => n(e)))
            : typeof i == `object` && i && `kind` in i && (r[t] = n(i)));
      return r;
    };
  return n(e.model);
}
var jr = new Map(
  de.flatMap((e) =>
    e.category !== null && ge(e.name) && e.arity !== `variadic` ? [[e.name, e.arity]] : []
  )
);
function Mr(e) {
  return e.length <= 1
    ? e.map(String).join(``)
    : `${e.slice(0, -1).join(`, `)} or ${e[e.length - 1]}`;
}
function Nr(e, t) {
  let n = e.map((e) => Cn(e.latex)),
    r = Pr(e, t);
  return e.map((e, i) => Ir(e, n[i], r, t));
}
function Pr(e, t) {
  return new Set(
    e.flatMap((e) => {
      let n = Cn(e.latex);
      return n !== null && !or(n.name, t) ? [n.name] : [];
    })
  );
}
function Fr(e) {
  if (e.head !== null) return { name: e.head.name, type: e.head.type, params: [...e.head.params] };
  let t = e.error === null ? null : Cn(e.source.latex);
  return t === null ? null : { name: t.name, type: `function`, params: t.params };
}
function Ir(e, t, n, r) {
  let i = { source: e, empty: !1, tree: null, error: null, head: null };
  if (Re(e.latex).trim() === ``) return { ...i, empty: !0 };
  if (t !== null && t.params.length > 8) return { ...i, error: zr(`too-many-params`, [], null) };
  let a = Wn(e.latex, { userFunctions: n });
  if (!a.ok) {
    let { code: e, feature: t, span: n } = a.error;
    return { ...i, error: zr(e, t === void 0 ? [] : [t], n) };
  }
  let o = a.tree;
  return t !== null && or(t.name, r)
    ? { ...i, tree: o, error: zr(`reserved-name`, [qn(t.name)], null) }
    : { ...i, tree: o, ...Lr(o, t, r) };
}
function Lr(e, t, n) {
  if (e.kind !== `rel` || e.ops.length !== 1 || e.ops[0] !== `=`)
    return { head: null, error: null };
  let [r, i] = e.operands;
  if (r.kind === `call` && t !== null && r.name === t.name) {
    let e = t.params,
      n = e.find((t, n) => e.indexOf(t) !== n),
      a = { name: r.name, type: `function`, params: e, body: i, span: r.span },
      o = n === void 0 ? null : [qn(n)];
    return { head: a, error: o === null ? null : zr(`duplicate-definition`, o, null) };
  }
  if (r.kind === `const`)
    return { head: Rr(r.name, i, r.span), error: zr(`reserved-name`, [qn(r.name)], null) };
  if (r.kind !== `id` || r.name === `x` || r.name === `y`) return { head: null, error: null };
  if (r.name === `r` || r.name === `\\theta`)
    return { head: null, error: zr(`unsupported`, [qn(r.name)], r.span) };
  let a = Rr(r.name, i, r.span);
  return or(r.name, n)
    ? { head: a, error: zr(`reserved-name`, [qn(r.name)], null) }
    : { head: a, error: null };
}
function Rr(e, t, n) {
  return { name: e, type: `value`, params: [], body: t, span: n };
}
function zr(e, t, n) {
  return { code: e, message: er(e, t), names: t, span: n };
}
var Br = [`r`, `\\theta`];
function Vr(e, t, n) {
  let r = t(e),
    i = e.kind === `rel` ? { ops: [...e.ops] } : null,
    a = [...r].find((e) => Br.includes(e));
  if (a !== void 0) return Yr(`unsupported`, [qn(a)], i);
  if (e.kind === `point` || Kr(e))
    return n
      ? Yr(`unsupported`, [`t`], i)
      : r.has(`x`) || r.has(`y`)
        ? Yr(`point-coordinates`, [], i)
        : Jr(`point`, { kind: `point` });
  if (e.kind === `rel`) return { ...(e.ops[0] === `=` ? Ur(e, r, t) : Gr(e, r)), relation: i };
  let o = r.has(`x`),
    s = r.has(`y`);
  return o && s
    ? Yr(`mixed-variables`, [], i)
    : o
      ? Jr(`curve-y`, { kind: `explicit`, independent: `x`, expr: e })
      : s
        ? Jr(`curve-x`, { kind: `explicit`, independent: `y`, expr: e })
        : Jr(`value`, null);
}
function Hr(e, t, n) {
  return t.length === 1
    ? {
        kind: `explicit`,
        independent: `x`,
        expr: { kind: `call`, name: e, args: [{ kind: `id`, name: `x`, span: n }], span: n },
      }
    : null;
}
function Ur(e, t, n) {
  let [r, i] = e.operands;
  for (let [t, a] of [
    [`y`, `x`],
    [`x`, `y`],
  ]) {
    let o = Wr(t, r, i, n);
    if (o === null) continue;
    let [s, c] = o;
    if (n(c).has(a))
      return Jr(t === `y` ? `curve-y` : `curve-x`, { kind: `explicit`, independent: a, expr: c });
    let l = { kind: `sub`, left: s, right: c, span: e.span };
    return t === `y`
      ? Jr(`horizontal-lines`, { kind: `lines`, orientation: `horizontal`, expr: l })
      : Jr(`vertical-lines`, { kind: `lines`, orientation: `vertical`, expr: l });
  }
  let a = { kind: `sub`, left: r, right: i, span: e.span };
  return t.has(`x`) && t.has(`y`)
    ? Jr(`implicit`, { kind: `implicit`, expr: a })
    : t.has(`x`)
      ? Jr(`vertical-lines`, { kind: `lines`, orientation: `vertical`, expr: a })
      : t.has(`y`)
        ? Jr(`horizontal-lines`, { kind: `lines`, orientation: `horizontal`, expr: a })
        : Jr(`constant-relation`, null);
}
function Wr(e, t, n, r) {
  return qr(t, e) && !r(n).has(e) ? [t, n] : qr(n, e) && !r(t).has(e) ? [n, t] : null;
}
function Gr(e, t) {
  let n = e.ops.filter((e) => e !== `=`),
    r = e.operands;
  return t.size > 0
    ? Jr(`region`, { kind: `region`, operands: r, ops: n })
    : Jr(`constant-relation`, { kind: `constant-region`, operands: r, ops: n });
}
function Kr(e) {
  return (
    e.kind === `list` &&
    e.range !== !0 &&
    e.items.length > 0 &&
    e.items.every((e) => e.kind === `point`)
  );
}
function qr(e, t) {
  return e.kind === `id` && e.name === t;
}
function Jr(e, t) {
  return { kind: e, graph: t, error: null, relation: null };
}
function Yr(e, t, n) {
  return { kind: `error`, graph: null, error: { code: e, names: t }, relation: n };
}
function Xr(e, t, n) {
  let r = {
    id: e.source.id,
    kind: `empty`,
    tree: e.tree,
    error: null,
    defines: Fr(e),
    uses: [],
    chips: [],
    complexHint: !1,
    isGraphable: !1,
    relation: null,
    graph: null,
  };
  if (e.empty) return r;
  let i = e.head?.params ?? [],
    a = e.head?.body ?? e.tree,
    o = a === null ? [] : ti(a, i, n);
  if (e.error !== null || e.tree === null || a === null)
    return { ...r, kind: `error`, error: e.error, uses: o };
  if (e.tree.kind === `sim`) return { ...r, kind: `regression`, uses: o };
  let s = Zr(e, a, i, t);
  if (s !== null) return { ...r, kind: `error`, error: s, uses: o };
  let c =
    e.head === null
      ? Vr(e.tree, (e) => t.coordinatesOf(e, []), ri(e.tree, t))
      : ni(e.head, e.tree.span, t);
  if (c.error !== null) {
    let { code: e, names: n } = c.error,
      s = e === `unsupported` ? ii(a, n[0], i, t) : null;
    return { ...r, kind: `error`, error: ei(e, n, s), uses: o };
  }
  let l = o.filter((e) => !t.isDefined(e)),
    u = c.graph !== null && l.length === 0 && !e.source.hidden;
  return {
    ...r,
    kind: c.kind === `constant-relation` && l.length > 0 ? `unsolved-relation` : c.kind,
    uses: o,
    chips: l,
    complexHint: !n.complex && l.length === 1 && l[0] === `i`,
    isGraphable: u,
    relation: c.relation,
    graph: u ? c.graph : null,
  };
}
function Zr(e, t, n, r) {
  let { head: i } = e;
  if (i !== null && r.duplicates.has(i.name)) return ei(`duplicate-definition`, [qn(i.name)], null);
  if (i !== null && r.cyclicRows.has(e.source.id)) return ei(`cycle`, [qn(i.name)], null);
  for (let e of $r(t)) {
    let t = Qr(e.name, r);
    if (t !== null && !t.includes(e.args.length)) {
      let n = String(e.args.length);
      return ei(`arity`, [qn(e.name), Mr(t), n], e.span);
    }
  }
  let a = ar(t).find(({ name: e }) => !n.includes(e) && r.duplicates.has(e));
  return a === void 0 ? null : ei(`dependency`, [qn(a.name)], a.span);
}
function Qr(e, t) {
  if (he(e)) return jr.get(e) ?? null;
  let n = t.functionArity(e);
  return n === null ? null : [n];
}
function $r(e) {
  let t = [],
    n = [e];
  for (let e = n.pop(); e !== void 0; e = n.pop())
    (e.kind === `call` && t.push(e), n.push(...oe(e)));
  return t.sort((e, t) => e.span.start - t.span.start);
}
function ei(e, t, n) {
  return { code: e, message: er(e, t), names: t, span: n };
}
function ti(e, t, n) {
  let r = new Set();
  for (let { name: i } of ar(e)) !t.includes(i) && !or(i, n) && r.add(i);
  return [...r];
}
function ni(e, t, n) {
  let r = n.coordinatesOf(e.body, e.params),
    i = { kind: `definition`, graph: null, error: null, relation: null };
  if (e.type === `value`) return r.size > 0 ? { ...i, kind: `dependent-definition` } : i;
  let a = [...r].find((e) => Br.includes(e));
  return a === void 0
    ? { ...i, kind: `function-definition`, graph: Hr(e.name, e.params, t) }
    : { ...i, kind: `error`, error: { code: `unsupported`, names: [qn(a)] } };
}
function ri(e, t) {
  return e.kind === `point` && !t.isDefined(`t`) && ar(e).some((e) => e.name === `t` && e.inPoint);
}
function ii(e, t, n, r) {
  for (let i of ar(e)) {
    if (n.includes(i.name)) continue;
    let e = { kind: `id`, name: i.name, span: i.span };
    if ([i.name, ...r.coordinatesOf(e, [])].some((e) => qn(e) === t)) return i.span;
  }
  return null;
}
var ai = 1e4,
  oi = 1e-9;
function si(e, t, n = new Set()) {
  let r = new Set(),
    i = new Set();
  for (let e of t) rr.includes(e) || r.add(e);
  let a = { names: r, isList: (e, t) => ci(e, t, r, i) };
  for (let t = !0; t; ) {
    t = !1;
    for (let o of e) {
      let e = o.type === `value` ? r : i;
      e.has(o.name) || n.has(o.name) || (a.isList(o.body, o.params) && (e.add(o.name), (t = !0)));
    }
  }
  return a;
}
function ci(e, t, n, r) {
  let i = [e];
  for (let e = i.pop(); e !== void 0; e = i.pop())
    switch (e.kind) {
      case `list`:
        return !0;
      case `id`:
        if (!t.includes(e.name) && n.has(e.name)) return !0;
        break;
      case `call`:
        if (!he(e.name) && r.has(e.name)) return !0;
        i.push(...e.args);
        break;
      default:
        i.push(...oe(e));
    }
  return !1;
}
function li(e, t, n) {
  let r = di(e);
  for (let e of r) {
    let r = e.items.find((e) => n.isList(e, t));
    if (r !== void 0) return { code: `nested-list`, names: [], span: r.span };
  }
  for (let e of r) {
    if (e.range !== !0) continue;
    let t = fi(e.items);
    if (t !== null) return { code: t, names: [], span: e.span };
  }
  return null;
}
function ui(e, t, n) {
  if (!n.isList(e, t)) return null;
  let r = null,
    i = [e];
  for (let e = i.pop(); e !== void 0; e = i.pop()) {
    if (!n.isList(e, t)) continue;
    let a = e.kind === `list` ? [] : oe(e).filter((e) => n.isList(e, t));
    a.length > 0 ? i.push(...a) : (r === null || e.span.start < r.start) && (r = e.span);
  }
  return { code: `unsupported`, names: [dt.listCurves], span: r };
}
function di(e) {
  let t = [],
    n = [e];
  for (let e = n.pop(); e !== void 0; e = n.pop())
    (e.kind === `list` && t.push(e), n.push(...oe(e)));
  return t.sort((e, t) => e.span.start - t.span.start);
}
function fi(e) {
  let t = e.map(pi);
  if (!t.every(Number.isFinite)) return null;
  let [n, r, i] = t.length === 2 ? [t[0], NaN, t[1]] : t,
    a = t.length === 2 ? (i < n ? -1 : 1) : r - n;
  return a === 0 ? `range-step` : Math.floor((i - n) / a + oi) + 1 <= ai ? null : `list-too-long`;
}
function pi(e) {
  switch (e.kind) {
    case `num`:
      return e.value;
    case `neg`:
      return -pi(e.arg);
    case `add`:
      return pi(e.left) + pi(e.right);
    case `sub`:
      return pi(e.left) - pi(e.right);
    case `mul`:
      return pi(e.left) * pi(e.right);
    case `div`:
      return pi(e.left) / pi(e.right);
    default:
      return NaN;
  }
}
function mi(e) {
  let t = new Set(e.flatMap((e) => Fr(e)?.name ?? [])),
    n = e.flatMap((e) =>
      e.head !== null && e.error === null ? [{ id: e.source.id, head: e.head }] : []
    ),
    r = hi(n.map(({ head: e }) => e.name)),
    i = gi(n.filter(({ head: e }) => !r.has(e.name))),
    a = _i(i),
    o = new Map(
      i.rows.flatMap(({ id: e, head: t }) =>
        t.type === `function` && !a.has(e) ? [[t.name, t.params.length]] : []
      )
    ),
    s = yi(n.map(({ head: e }) => e));
  return {
    isDefined: (e) => t.has(e),
    coordinatesOf(e, t) {
      let n = new Set();
      for (let { name: r } of ar(e))
        if (!t.includes(r)) {
          if (rr.includes(r)) n.add(r);
          else for (let e of s.get(r) ?? []) n.add(e);
        }
      return n;
    },
    duplicates: r,
    cyclicRows: a,
    valueOrder: vi(i).filter((e) => !a.has(e)),
    functionArity: (e) => o.get(e) ?? null,
  };
}
function hi(e) {
  return new Set(e.filter((t, n) => e.indexOf(t) !== n));
}
function gi(e) {
  let t = new Map(e.map(({ head: e }, t) => [e.name, t]));
  return {
    rows: e,
    edges: e.map(({ head: e }) => {
      let n = new Set();
      for (let { name: r } of ar(e.body)) {
        let i = e.params.includes(r) ? void 0 : t.get(r);
        i !== void 0 && n.add(i);
      }
      return [...n].sort((e, t) => e - t);
    }),
  };
}
function _i({ rows: e, edges: t }) {
  let n = e.map(() => -1),
    r = e.map(() => -1),
    i = e.map(() => !1),
    a = [],
    o = new Set(),
    s = 0,
    c = (l) => {
      ((n[l] = r[l] = s), (s += 1), a.push(l), (i[l] = !0));
      for (let e of t[l])
        n[e] === -1 ? (c(e), (r[l] = Math.min(r[l], r[e]))) : i[e] && (r[l] = Math.min(r[l], n[e]));
      if (r[l] !== n[l]) return;
      let u = a.splice(a.lastIndexOf(l));
      for (let e of u) i[e] = !1;
      if (u.length > 1 || t[l].includes(l)) for (let t of u) o.add(e[t].id);
    };
  return (
    e.forEach((e, t) => {
      n[t] === -1 && c(t);
    }),
    o
  );
}
function vi({ rows: e, edges: t }) {
  let n = e.map(() => !1),
    r = [],
    i = (a) => {
      if (!n[a]) {
        n[a] = !0;
        for (let e of t[a]) i(e);
        r.push(e[a].id);
      }
    };
  return (e.forEach((e, t) => i(t)), r);
}
function yi(e) {
  let t = new Map(),
    n = new Map();
  for (let r of e) {
    let e = t.get(r.name) ?? new Set(),
      i = n.get(r.name) ?? new Set();
    for (let { name: t } of ar(r.body))
      r.params.includes(t) || (rr.includes(t) ? e.add(t) : i.add(t));
    (t.set(r.name, e), n.set(r.name, i));
  }
  for (let e = !0; e; ) {
    e = !1;
    for (let [r, i] of t)
      for (let a of n.get(r) ?? []) for (let n of t.get(a) ?? []) i.has(n) || (i.add(n), (e = !0));
  }
  return t;
}
var bi = new Set([`definition`, `dependent-definition`, `function-definition`]);
function xi(e, t) {
  let n = Nr(e, t),
    r = Pr(e, t),
    i = e.flatMap((e, t) => (e.columns === void 0 ? [] : [{ k: t, table: fr(e, r) }])),
    a = new Set(n.flatMap((e) => Fr(e)?.name ?? [])),
    o = i.map(({ table: e }) => hr(e, a)),
    s = i.flatMap(({ table: e }, t) => o[t].filter((t, n) => t !== null && (n === 0 || Ei(e, n)))),
    c = o.flat().filter((e) => e !== null),
    l = si(Si(n), c),
    u = n.map((e) => Ci(e, l)),
    d = Or(u, new Set([...a, ...s]), new Set([...s, ...l.names]), t),
    f = [...d.values()].flatMap((e) =>
      e.analysis === null ? [] : [...e.analysis.params, e.analysis.residual]
    ),
    p = new Set([...a, ...f]),
    m = i.map(({ table: e }) => hr(e, p)),
    h = new Set([...p, ...m.flat().filter((e) => e !== null)]),
    g = i.flatMap(({ table: e }, t) => gr(e, m[t], h)),
    _ = [...d.values()].flatMap((e) => (e.analysis === null ? [] : kr(e.analysis))),
    v = [...u, ...g, ..._],
    y = mi(v),
    b = v.map((e) => Xr(e, y, t)),
    x = si(Si(v), [], new Set(f));
  (u.forEach((e, t) => {
    let n = d.get(e.source.id);
    n === void 0 ? (b[t] = Ti(b[t], e, x)) : (b[t] = Di(b[t], n, e.source.hidden));
  }),
    i.forEach(({ k: t, table: n }, r) => {
      b[t] = Oi(e[t], yr(n, m[r], h, y.duplicates), n);
    }));
  let S = new Set(),
    C = new Map();
  return (
    v.forEach(({ head: e }, t) => {
      let { id: n, kind: r, error: i } = b[t];
      if (e === null || i !== null || !bi.has(r) || (S.add(n), r === `definition` || C.has(e.name)))
        return;
      let a = r === `function-definition` ? e.params : [];
      C.set(e.name, { name: e.name, params: a, body: e.body, rowId: n });
    }),
    {
      rows: b.slice(0, u.length),
      byId: new Map(b.map((e) => [e.id, e])),
      valueOrder: y.valueOrder.filter((e) => S.has(e)),
      functions: C,
    }
  );
}
function Si(e) {
  return e.flatMap((e) => (e.head !== null && e.error === null ? [e.head] : []));
}
function Ci(e, t) {
  if (e.error !== null || e.tree === null) return e;
  let n = li(e.head?.body ?? e.tree, e.head?.params ?? [], t);
  if (n === null) return e;
  let { code: r, names: i, span: a } = n;
  return { ...e, error: { code: r, message: er(r, i), names: i, span: a } };
}
var wi = new Set([
  `curve-y`,
  `curve-x`,
  `implicit`,
  `vertical-lines`,
  `horizontal-lines`,
  `region`,
  `constant-relation`,
]);
function Ti(e, t, n) {
  if (e.error !== null || t.tree === null) return e;
  let r = t.head,
    i = e.kind === `function-definition` && r !== null && r.params.length === 1;
  if (!i && !wi.has(e.kind)) return e;
  let a = i ? ui(r.body, r.params, n) : ui(t.tree, [], n);
  if (a === null) return e;
  let { code: o, names: s, span: c } = a;
  return {
    ...e,
    kind: `error`,
    error: { code: o, message: er(o, s), names: s, span: c },
    chips: [],
    complexHint: !1,
    isGraphable: !1,
    relation: null,
    graph: null,
  };
}
function Ei(e, t) {
  return e.cells[t].some((e) => !e.blank);
}
function Di(e, t, n) {
  if (t.analysis === null) return { ...e, kind: `error`, error: t.error };
  let r = Ar(t.analysis),
    i = r !== null && !n;
  return {
    ...e,
    kind: `regression`,
    chips: [],
    isGraphable: i,
    graph: i ? { kind: `explicit`, independent: `x`, expr: r } : null,
    regression: t.analysis,
  };
}
function Oi(e, t, n) {
  let r = new Set();
  for (let e of [...n.headers, ...n.cells.flat()])
    if (e.tree !== null) for (let { name: t } of ar(e.tree)) r.add(t);
  let i =
    t.columns.some((e, t) => t > 0 && (e.role === `data` || e.role === `computed`)) &&
    t.columns[0].role === `variable` &&
    !e.hidden;
  return {
    id: e.id,
    kind: `table`,
    tree: null,
    error: null,
    defines: null,
    uses: [...r],
    chips: [],
    complexHint: !1,
    isGraphable: i,
    relation: null,
    graph: i ? { kind: `table` } : null,
    table: t,
  };
}
function ki(e) {
  return new Set([...e].flatMap(([e, t]) => (t.params.length > 0 ? [e] : [])));
}
var Ai = { text: `Turn on complex mode to use i.`, action: `Turn on complex mode` },
  ji = 12,
  Mi = 1e-6,
  Ni = 0xe8d4a51000,
  Pi = 1e-14,
  Fi = 1e-6,
  Ii = `×`,
  Li = 30,
  Ri = {
    undefined: `undefined`,
    scientific: (e, t) => `${e}${Ii}10^${t}`,
    point: (e, t) => `(${e}, ${t})`,
    list: (e, t) => `[${[...e, ...(t ? [`…`] : [])].join(`, `)}]`,
  },
  zi = {
    undefined: `\\mathrm{undefined}`,
    scientific: (e, t) => `${e}\\times10^{${t}}`,
    point: (e, t) => `\\left(${e},${t}\\right)`,
    list: (e, t) => `\\left[${[...e, ...(t ? [`\\ldots`] : [])].join(`,`)}\\right]`,
  };
function Bi(e) {
  return e.includes(`.`) ? e.replace(/0+$/, ``).replace(/\.$/, ``) : e;
}
function Vi(e, t) {
  return e.toFixed(Math.min(100, Math.max(0, t)));
}
function Hi(e, t) {
  if (!Number.isFinite(e)) return t.undefined;
  let n = Number(e.toPrecision(ji));
  if (n === 0) return `0`;
  let r = Math.abs(n);
  if (r >= Mi && r < Ni) return String(n);
  let [i, a] = n.toExponential(11).split(`e`);
  return t.scientific(Bi(i), String(Number(a)));
}
function Ui({ re: e, im: t }, n) {
  if (!Number.isFinite(e) || !Number.isFinite(t)) return n.undefined;
  let r = Math.abs(e) > Pi * Math.abs(t) ? Hi(e, n) : ``;
  if (Math.abs(t) <= Pi * Math.abs(e)) return r || `0`;
  let i = Hi(t, n),
    a = i === `1` ? `i` : i === `-1` ? `-i` : `${i}i`;
  return r ? (a.startsWith(`-`) ? `${r}${a}` : `${r}+${a}`) : a;
}
function Wi(e, t) {
  switch (e.type) {
    case `number`:
      return Hi(e.value, t);
    case `complex`:
      return Ui(e.value, t);
    case `point`:
      return t.point(Hi(e.value[0], t), Hi(e.value[1], t));
    case `list`:
      return t.list(
        e.value.slice(0, Li).map((e) => Wi(e, t)),
        e.value.length > Li
      );
    case `undefined`:
      return t.undefined;
  }
}
function Gi(e) {
  return Hi(e, Ri);
}
function Ki(e) {
  return Wi(e, Ri);
}
function qi(e) {
  return Wi(e, zi);
}
function Ji(e, t) {
  if (!Number.isFinite(e)) return Ri.undefined;
  let n = Math.floor(Math.log10(t) + 1e-9),
    r = Math.abs(e);
  if (r < Fi * t) return `0`;
  if (r >= Mi && r < Ni) {
    let t = Bi(Vi(e, -n));
    return t === `-0` ? `0` : t;
  }
  let i = Math.floor(Math.log10(r)),
    a = Vi(e / 10 ** i, i - n);
  return (
    Math.abs(Number(a)) >= 10 && ((i += 1), (a = Vi(e / 10 ** i, i - n))),
    Ri.scientific(Bi(a), String(i))
  );
}
var W = Object.freeze({ type: `undefined` });
function G(e) {
  return Number.isFinite(e) ? { type: `number`, value: e } : W;
}
function Yi(e, t) {
  return !Number.isFinite(e) || !Number.isFinite(t)
    ? W
    : t === 0
      ? { type: `number`, value: e }
      : { type: `complex`, value: { re: e, im: t } };
}
var Xi = (e) => (e !== void 0 && e.type === `number` && Number.isFinite(e.value) ? e.value : null);
function Zi(e, t, n) {
  let r = e.table,
    i = r.rows,
    a = (e) => {
      let a = r.columns[e],
        o = a.name === null ? void 0 : t.values.get(a.name);
      return o !== void 0 && o.type === `list`
        ? Array.from({ length: i }, (e, t) => Xi(o.value[t]))
        : Array.from({ length: i }, (e, r) => {
            let i = a.cells[r] ?? null;
            return i === null ? null : Xi(lc(i, t)({}, n));
          });
    },
    o = r.columns[0],
    s = o.role === `variable` ? a(0) : Array(i).fill(null),
    c = o.role === `variable` ? o.name : null;
  return {
    columns: r.columns.map((e, r) => {
      let o = () => ({ values: Array(i).fill(null), display: Array(i).fill(null) });
      if (r === 0) return { values: s, display: Array(i).fill(null) };
      if (e.role === `data`) return { values: a(r), display: Array(i).fill(null) };
      if (e.role !== `computed` || e.tree === null || c === null) return o();
      let l = lc(e.tree, t),
        u = ar(e.tree).flatMap(({ name: e }) => {
          let n = e === c ? void 0 : t.values.get(e);
          return n !== void 0 && n.type === `list` ? [[e, n.value]] : [];
        }),
        d = s.map((e, t) => {
          if (e === null) return null;
          let r = { [c]: G(e) };
          for (let [e, n] of u) r[e] = n[t] ?? G(NaN);
          return Xi(l(r, n));
        });
      return { values: d, display: d.map((e) => (e === null ? null : Gi(e))) };
    }),
  };
}
var Qi = 2220446049250313e-31,
  $i = 1e-12,
  ea = 60;
function ta(e, t, n, r) {
  let i = new Float64Array(n);
  for (let r = 0; r < n; r++) {
    let a = 0;
    for (let i = 0; i < t; i++) a += e[i * n + r] ** 2;
    i[r] = a > 0 ? Math.sqrt(a) : 1;
  }
  let a = Math.max(t, n),
    o = new Float64Array(a * n),
    s = new Float64Array(a);
  for (let a = 0; a < t; a++) {
    for (let t = 0; t < n; t++) o[a * n + t] = e[a * n + t] / i[t];
    s[a] = r[a];
  }
  na(o, a, n, s);
  let c = new Float64Array(n * n);
  for (let e = 0; e < n; e++) for (let t = e; t < n; t++) c[e * n + t] = o[e * n + t];
  let l = s.subarray(0, n),
    { u, sigma: d, v: f } = ra(c, n),
    p = Math.max(0, ...d),
    m = new Float64Array(n);
  for (let e = 0; e < n; e++) {
    if (!(d[e] > $i * p)) continue;
    let t = 0;
    for (let r = 0; r < n; r++) t += u[r * n + e] * l[r];
    let r = t / d[e];
    for (let t = 0; t < n; t++) m[t] += f[t * n + e] * r;
  }
  for (let e = 0; e < n; e++) m[e] /= i[e];
  return m;
}
function na(e, t, n, r) {
  for (let i = 0; i < Math.min(t, n); i++) {
    let a = 0;
    for (let r = i; r < t; r++) a += e[r * n + i] ** 2;
    if (((a = Math.sqrt(a)), a === 0)) continue;
    let o = e[i * n + i] > 0 ? -a : a,
      s = new Float64Array(t - i);
    for (let r = i; r < t; r++) s[r - i] = e[r * n + i];
    s[0] -= o;
    let c = 0;
    for (let e of s) c += e * e;
    if (c === 0) continue;
    for (let r = i; r < n; r++) {
      let a = 0;
      for (let o = i; o < t; o++) a += s[o - i] * e[o * n + r];
      let o = (2 * a) / c;
      for (let a = i; a < t; a++) e[a * n + r] -= o * s[a - i];
    }
    let l = 0;
    for (let e = i; e < t; e++) l += s[e - i] * r[e];
    let u = (2 * l) / c;
    for (let e = i; e < t; e++) r[e] -= u * s[e - i];
  }
}
function ra(e, t) {
  let n = Float64Array.from(e),
    r = new Float64Array(t * t);
  for (let e = 0; e < t; e++) r[e * t + e] = 1;
  for (let e = 0; e < ea; e++) {
    let e = !1;
    for (let i = 0; i < t - 1; i++)
      for (let a = i + 1; a < t; a++) {
        let o = 0,
          s = 0,
          c = 0;
        for (let e = 0; e < t; e++) {
          let r = n[e * t + i],
            l = n[e * t + a];
          ((o += r * r), (s += l * l), (c += r * l));
        }
        if (c === 0 || Math.abs(c) <= Qi * Math.sqrt(o * s)) continue;
        e = !0;
        let l = (s - o) / (2 * c),
          u = Math.sign(l || 1) / (Math.abs(l) + Math.sqrt(1 + l * l)),
          d = 1 / Math.sqrt(1 + u * u),
          f = d * u;
        for (let e = 0; e < t; e++) {
          let o = n[e * t + i],
            s = n[e * t + a];
          ((n[e * t + i] = d * o - f * s), (n[e * t + a] = f * o + d * s));
          let c = r[e * t + i],
            l = r[e * t + a];
          ((r[e * t + i] = d * c - f * l), (r[e * t + a] = f * c + d * l));
        }
      }
    if (!e) break;
  }
  let i = [];
  for (let e = 0; e < t; e++) {
    let r = 0;
    for (let i = 0; i < t; i++) r += n[i * t + e] ** 2;
    let a = Math.sqrt(r);
    if ((i.push(a), a > 0)) for (let r = 0; r < t; r++) n[r * t + e] /= a;
  }
  return { u: n, sigma: i, v: r };
}
var ia = 606e-8,
  aa = 1e-12,
  oa = 1e-10,
  sa = 200,
  ca = 40;
function la(e, t, n, r) {
  let i = 0;
  for (let a = 0; a < n.length; a++) ((r[a] = n[a] - e(t, a)), (i += r[a] * r[a]));
  return Number.isFinite(i) ? i : 1 / 0;
}
function ua(e, t, n, r = {}) {
  let i = t.length,
    a = n.length,
    o = r.maxIterations ?? sa,
    s = Float64Array.from(n),
    c = new Float64Array(i),
    l = new Float64Array(i),
    u = la(e, s, t, c),
    d = -1,
    f = !1,
    p = 0,
    m = new Float64Array(i * a);
  for (; p < o && Number.isFinite(u); p++) {
    for (let t = 0; t < a; t++) {
      let n = ia * Math.max(1, Math.abs(s[t])),
        r = Float64Array.from(s),
        o = Float64Array.from(s);
      ((r[t] += n), (o[t] -= n));
      for (let s = 0; s < i; s++) m[s * a + t] = (e(r, s) - e(o, s)) / (2 * n);
    }
    let n = new Float64Array(a);
    for (let e = 0; e < a; e++) {
      let t = 0;
      for (let n = 0; n < i; n++) t += m[n * a + e] ** 2;
      n[e] = Math.max(Math.sqrt(t), 1e-300);
    }
    d < 0 && (d = 0.001);
    let r = !1;
    for (let o = 0; o < ca; o++) {
      let o = new Float64Array((i + a) * a),
        p = new Float64Array(i + a);
      (o.set(m), p.set(c));
      let h = Math.sqrt(d);
      for (let e = 0; e < a; e++) o[(i + e) * a + e] = h * n[e];
      let g = ta(o, i + a, a, p),
        _ = Float64Array.from(s, (e, t) => e + g[t]),
        v = la(e, _, t, l);
      if (v <= u) {
        let e = 0,
          t = 0;
        for (let n = 0; n < a; n++) ((e += g[n] ** 2), (t += _[n] ** 2));
        let n = u === 0 ? 0 : (u - v) / u;
        ((s = _),
          c.set(l),
          (u = v),
          (d = Math.max(d / 3, 1e-12)),
          (r = !0),
          (n < aa || Math.sqrt(e) < oa * (Math.sqrt(t) + oa)) && (f = !0));
        break;
      }
      d *= 4;
    }
    if (!r || f) {
      ((f ||= !r && u < 1 / 0 && d > 1e10), p++);
      break;
    }
  }
  return { params: s, sse: u, converged: f, iterations: p };
}
var da = `We couldn't find any region where this model is defined.`,
  fa = [1, 0.1, -1, 0, 10],
  pa = 1e-9,
  ma = (e, t) => ({
    ok: !1,
    error: da,
    params: [],
    r2: null,
    r: null,
    rmse: null,
    residuals: [],
    logMode: { available: e, on: t },
    approximate: !1,
  }),
  ha = (e) => {
    let t = 0;
    for (let n = 0; n < e.length; n++) t += e[n];
    return t / e.length;
  };
function ga(e, t) {
  let n = ha(e),
    r = ha(t),
    i = 0,
    a = 0,
    o = 0;
  for (let s = 0; s < e.length; s++)
    ((i += (e[s] - n) * (t[s] - r)), (a += (e[s] - n) ** 2), (o += (t[s] - r) ** 2));
  let s = a > 0 ? i / a : 0,
    c = a > 0 && o > 0 ? i / Math.sqrt(a * o) : null;
  return { slope: s, intercept: r - s * n, r: c, ssTotal: o };
}
function _a(e, t, n) {
  let r = e.kind === `power` || e.kind === `logarithmic`,
    i = e.kind !== `logarithmic`;
  for (let e = 0; e < t.length; e++) if ((r && !(t[e] > 0)) || (i && !(n[e] > 0))) return null;
  return {
    u: Float64Array.from(t, (e) => (r ? Math.log(e) : e)),
    v: Float64Array.from(n, (e) => (i ? Math.log(e) : e)),
  };
}
function va(e, t, n) {
  let r = new Float64Array(t),
    { slope: i, intercept: a } = n;
  switch (e.kind) {
    case `exponential-base`:
      ((r[e.a] = Math.exp(a)), (r[e.b] = Math.exp(i)));
      break;
    case `exponential-e`:
    case `power`:
      ((r[e.a] = Math.exp(a)), (r[e.b] = i));
      break;
    case `exponential-ac`:
      ((r[e.a] = Math.exp(a)), (r[e.b] = i / Math.log(e.c)));
      break;
    case `exponential-c`:
      ((r[e.m] = i / Math.log(e.c)), (r[e.k] = a / Math.log(e.c)));
      break;
    case `logarithmic`:
      ((r[e.a] = a), (r[e.b] = i));
  }
  return r;
}
function ya(e, t, n) {
  let r = new Float64Array(n),
    i = Float64Array.from({ length: t }, (t, n) => e(r, n)),
    a = Array.from({ length: n }, (r, a) => {
      let o = new Float64Array(n);
      return ((o[a] = 1), Float64Array.from({ length: t }, (t, n) => e(o, n) - i[n]));
    });
  if (![...i, ...a.flatMap((e) => [...e])].every(Number.isFinite)) return null;
  for (let r of [0.37, -1.91]) {
    let o = Float64Array.from({ length: n }, (e, t) => r * (t + 1.3));
    for (let r = 0; r < t; r++) {
      let t = i[r];
      for (let e = 0; e < n; e++) t += o[e] * a[e][r];
      let s = e(o, r);
      if (!(Math.abs(s - t) <= pa * Math.max(1, Math.abs(s), Math.abs(t)))) return null;
    }
  }
  return { f0: i, cols: a };
}
function ba(e) {
  let { params: t, model: n, logForm: r } = e,
    i = t.length,
    a = [e.observed, e.predictor, ...(e.others ?? [])],
    o = Math.min(...a.map((e) => e.length)),
    s = Float64Array.from(e.observed.slice(0, o)),
    c = Float64Array.from(e.predictor.slice(0, o)),
    l = r === null || o === 0 ? null : _a(r, c, s),
    u = l !== null,
    d = u && e.logMode;
  if (o === 0 || a.some((e) => e.slice(0, o).some((e) => !Number.isFinite(e)))) return ma(u, d);
  let f = new Float64Array(i),
    p = !1,
    m = !1,
    h = l === null ? null : ga(l.u, l.v);
  if (d && h !== null) f = va(r, i, h);
  else if (i > 0) {
    let e = ya(n, o, i);
    if (e !== null) {
      let t = new Float64Array(o * i);
      for (let n = 0; n < o; n++) for (let r = 0; r < i; r++) t[n * i + r] = e.cols[r][n];
      ((f = ta(
        t,
        o,
        i,
        Float64Array.from(s, (t, n) => t - e.f0[n])
      )),
        (m =
          i === 2 &&
          e.f0.every((e) => e === 0) &&
          e.cols.some((e) => e.every((e) => e === 1)) &&
          e.cols.some((e) => e.every((e, t) => e === c[t]))));
    } else {
      let e = fa.map((e) => new Float64Array(i).fill(e));
      h !== null && e.push(va(r, i, h));
      let t = null;
      for (let r of e) {
        let e = ua(n, s, r);
        Number.isFinite(e.sse) && (t === null || e.sse < t.sse) && (t = e);
      }
      if (t === null) return ma(u, d);
      ((f = t.params), (p = !t.converged));
    }
  }
  let g = Float64Array.from({ length: o }, (e, t) => n(f, t));
  if (!g.every(Number.isFinite) || !f.every(Number.isFinite)) return ma(u, d);
  let _ = Array.from(s, (e, t) => e - g[t]),
    v = _.reduce((e, t) => e + t * t, 0),
    y,
    b;
  if (d && h !== null && l !== null) ((y = h.r === null ? null : h.r * h.r), (b = h.r));
  else {
    let e = ha(s),
      t = s.reduce((t, n) => t + (n - e) ** 2, 0);
    ((y = o > i && t > 0 ? 1 - v / t : null), (b = m ? ga(c, s).r : null));
  }
  return {
    ok: !0,
    error: null,
    params: t.map((e, t) => ({ name: e, value: f[t] })),
    r2: y,
    r: b,
    rmse: y === null ? Math.sqrt(v / o) : null,
    residuals: _,
    logMode: { available: u, on: d },
    approximate: p,
  };
}
var xa = (e) => (e !== void 0 && e.type === `number` && Number.isFinite(e.value) ? e.value : NaN),
  Sa = (e) => (e !== void 0 && e.type === `list` ? e.value.map((e) => xa(e)) : null),
  Ca = (e) => ({
    ok: !1,
    error: er(`regression-data`, []),
    params: [],
    r2: null,
    r: null,
    rmse: null,
    residuals: [],
    logMode: { available: !1, on: !1 },
    approximate: !1,
    residualName: e.residual,
  });
function wa(e, t, n) {
  let r = Sa(lc(e.observed, t)({}, n));
  if (r === null) return Ca(e);
  let i = e.predictors.map((e) => Sa(t.values.get(e)) ?? []),
    a = lc(e.model, t),
    o = {};
  return {
    ...ba({
      observed: r,
      predictor: i[0] ?? r.map(() => 0),
      others: i.slice(1),
      params: e.params,
      model: (t, r) => (
        n.check(),
        e.params.forEach((e, n) => (o[e] = G(t[n]))),
        e.predictors.forEach((e, t) => (o[e] = G(i[t][r] ?? NaN))),
        xa(a(o, n))
      ),
      logForm: e.logForm,
      logMode: e.logMode,
    }),
    residualName: e.residual,
  };
}
function Ta(e) {
  return e.ok
    ? [
        ...e.params.map(({ name: e, value: t }) => [e, G(t)]),
        [e.residualName, { type: `list`, value: e.residuals.map((e) => G(e)) }],
      ]
    : [];
}
var Ea = Object.freeze({ re: 0, im: 1 }),
  Da = Math.PI / 2,
  Oa = Object.freeze({ re: NaN, im: NaN }),
  ka = Object.freeze({ re: 1, im: 0 });
function Aa(e, t) {
  return { re: e.re + t.re, im: e.im + t.im };
}
function ja(e, t) {
  return { re: e.re - t.re, im: e.im - t.im };
}
function Ma(e, t) {
  return { re: e.re * t.re - e.im * t.im, im: e.re * t.im + e.im * t.re };
}
function Na(e, t) {
  if (t.re === 0 && t.im === 0) return { ...Oa };
  if (Math.abs(t.re) >= Math.abs(t.im)) {
    let n = t.im / t.re,
      r = t.re + t.im * n;
    return { re: (e.re + e.im * n) / r, im: (e.im - e.re * n) / r };
  }
  let n = t.re / t.im,
    r = t.re * n + t.im;
  return { re: (e.re * n + e.im) / r, im: (e.im * n - e.re) / r };
}
function Pa(e) {
  let t = Math.exp(e.re);
  return { re: t * Math.cos(e.im), im: t * Math.sin(e.im) };
}
function Fa(e) {
  if (e.re === 0 && e.im === 0) return { ...Oa };
  let t = Math.atan2(e.im, e.re);
  return { re: Math.log(Math.hypot(e.re, e.im)), im: t === -Math.PI ? Math.PI : t };
}
function Ia(e) {
  let t = Math.sqrt(Math.abs(e.re) / 2 + Math.hypot(e.re, e.im) / 2);
  return t === 0
    ? { re: 0, im: e.im }
    : e.re >= 0
      ? { re: t, im: e.im / (2 * t) }
      : { re: Math.abs(e.im) / (2 * t), im: e.im < 0 ? -t : t };
}
function La(e) {
  return { re: Math.sin(e.re) * Math.cosh(e.im), im: Math.cos(e.re) * Math.sinh(e.im) };
}
function Ra(e) {
  return { re: Math.cos(e.re) * Math.cosh(e.im), im: -Math.sin(e.re) * Math.sinh(e.im) };
}
function za(e) {
  return Na(La(e), Ra(e));
}
function Ba(e) {
  if (e.im === 0 && Math.abs(e.re) > 1)
    return { re: Math.sign(e.re) * Da, im: Math.acosh(Math.abs(e.re)) };
  let t = Fa(Aa(Ma(Ea, e), Ia(ja(ka, Ma(e, e)))));
  return { re: t.im, im: -t.re };
}
function Va(e) {
  return ja({ re: Da, im: 0 }, Ba(e));
}
function Ha(e) {
  if (e.re === 0 && Math.abs(e.im) > 1) return { re: Da, im: Math.atanh(1 / e.im) };
  let t = Ma(Ea, e),
    n = ja(Fa(ja(ka, t)), Fa(Aa(ka, t)));
  return { re: -n.im / 2, im: n.re / 2 };
}
function Ua(e, t) {
  return e.re === 0 && e.im === 0
    ? t.re === 0 && t.im === 0
      ? { ...ka }
      : t.re > 0
        ? { re: 0, im: 0 }
        : { ...Oa }
    : Pa(Ma(t, Fa(e)));
}
var Wa = Object.freeze({ re: 1, im: 0 }),
  Ga = Math.PI / 2;
function Ka(e) {
  return { re: Math.sinh(e.re) * Math.cos(e.im), im: Math.cosh(e.re) * Math.sin(e.im) };
}
function qa(e) {
  return { re: Math.cosh(e.re) * Math.cos(e.im), im: Math.sinh(e.re) * Math.sin(e.im) };
}
function Ja(e) {
  return Na(Ka(e), qa(e));
}
var Ya = (e) => Na(Wa, e);
function Xa(e) {
  let t = Ba({ re: -e.im, im: e.re });
  return { re: t.im, im: -t.re };
}
function Za(e) {
  return Fa(Aa(e, Ma(Ia(Aa(e, Wa)), Ia(ja(e, Wa)))));
}
function Qa(e) {
  if (e.im === 0 && Math.abs(e.re) > 1) return { re: Math.atanh(1 / e.re), im: Ga };
  let t = ja(Fa(Aa(Wa, e)), Fa(ja(Wa, e)));
  return { re: t.re / 2, im: t.im / 2 };
}
function $a(e, t, n = !1) {
  return { angle: `none`, extendsToComplex: n, real: (t) => e(t[0]), complex: (e) => t(e[0]) };
}
var eo = [
    [`sinh`, $a(Math.sinh, Ka)],
    [`cosh`, $a(Math.cosh, qa)],
    [`tanh`, $a(Math.tanh, Ja)],
    [
      `csch`,
      $a(
        (e) => 1 / Math.sinh(e),
        (e) => Ya(Ka(e))
      ),
    ],
    [
      `sech`,
      $a(
        (e) => 1 / Math.cosh(e),
        (e) => Ya(qa(e))
      ),
    ],
    [
      `coth`,
      $a(
        (e) => 1 / Math.tanh(e),
        (e) => Ya(Ja(e))
      ),
    ],
    [`arcsinh`, $a(Math.asinh, Xa)],
    [`arccosh`, $a(Math.acosh, Za, !0)],
    [`arctanh`, $a(Math.atanh, Qa, !0)],
    [
      `arccsch`,
      $a(
        (e) => Math.asinh(1 / e),
        (e) => Xa(Ya(e))
      ),
    ],
    [
      `arcsech`,
      $a(
        (e) => Math.acosh(1 / e),
        (e) => Za(Ya(e)),
        !0
      ),
    ],
    [
      `arccoth`,
      $a(
        (e) => Math.atanh(1 / e),
        (e) => Qa(Ya(e)),
        !0
      ),
    ],
  ],
  to = 607 / 128,
  no = Object.freeze([
    0.9999999999999971, 57.15623566586292, -59.59796035547549, 14.136097974741746,
    -0.4919138160976202, 3399464998481189e-20, 4652362892704858e-20, -9837447530487956e-20,
    0.0001580887032249125, -0.00021026444172410488, 0.00021743961811521265, -0.0001643181065367639,
    8441822398385275e-20, -26190838401581408e-21, 36899182659531625e-22,
  ]),
  ro = Math.sqrt(2 * Math.PI),
  io = null;
function ao(e) {
  if (io === null) {
    let e = [1],
      t = BigInt(1);
    for (let n = 1; n <= 170; n++) ((t *= BigInt(n)), e.push(Number(t)));
    io = e;
  }
  return io[e];
}
function oo(e) {
  let t = e % 2;
  return t === 0 || t === 1 || t === -1 ? 0 : Math.sin(Math.PI * t);
}
function so(e) {
  let t = e - 1,
    n = no[0];
  for (let e = 1; e < no.length; e++) n += no[e] / (t + e);
  let r = t + to + 0.5,
    i = r ** ((t + 0.5) / 2);
  return ro * n * (i * Math.exp(-r)) * i;
}
function co(e) {
  if (Number.isNaN(e)) return NaN;
  if (Number.isInteger(e)) return e <= 0 || e > 171 ? NaN : ao(e - 1);
  if (e < 0.5 && 1 - e > 171) return 0;
  let t = e < 0.5 ? Math.PI / (oo(e) * so(1 - e)) : so(e);
  return Number.isFinite(t) && t !== 0 ? t : NaN;
}
function lo(e) {
  if (Number.isInteger(e) && e <= 0) return 0;
  let t = co(e);
  return Number.isNaN(t) || t === 0 ? NaN : 1 / t;
}
function uo(e) {
  if (e < 0.5) {
    let t = oo(e);
    return { log: Math.log(Math.PI / Math.abs(t)) - uo(1 - e).log, sign: Math.sign(t) };
  }
  let t = e - 1,
    n = no[0];
  for (let e = 1; e < no.length; e++) n += no[e] / (t + e);
  let r = t + to + 0.5;
  return { log: Math.log(ro * n) + (t + 0.5) * Math.log(r) - r, sign: 1 };
}
function fo(e) {
  return co(e + 1);
}
var po = 1e3,
  mo = Object.freeze({ re: NaN, im: NaN });
function ho(e, t = 0) {
  let n = Math.round(t);
  if (n === 0) return Math.round(e) + 0;
  let r = 10 ** n,
    i = go(e, n);
  return r === 0 || !Number.isFinite(r) || !Number.isFinite(i)
    ? NaN
    : Math.abs(i) >= 2 ** 52
      ? e
      : go(Math.round(i), -n) + 0;
}
function go(e, t) {
  let [n, r = `0`] = String(e).split(`e`);
  return Number(`${n}e${Number(r) + t}`);
}
var _o = 8 * 2 ** -52;
function vo(e, t) {
  if (t === 0) return NaN;
  if (!Number.isInteger(e) || !Number.isInteger(t)) {
    let n = e / t;
    if (Math.abs(n) < 2 ** 52 && Math.abs(n - Math.round(n)) <= _o * Math.abs(n)) return 0;
  }
  let n = e % t;
  return (n !== 0 && n < 0 != t < 0 ? n + t : n) + 0;
}
function yo(e, t, n) {
  let r = 1;
  for (let i = 0; i < t && r !== 0 && Number.isFinite(r); i++)
    r = n ? (r * (e - i)) / (i + 1) : r * (e - i);
  return r;
}
function bo(e, t) {
  let n = Number.isInteger(e);
  return n && e < 0 && Number.isInteger(t) && t < 0
    ? t > e
      ? 0
      : bo(e, e - t)
    : Number.isInteger(t) && t >= 0
      ? n && e < 0
        ? (t % 2 == 0 ? 1 : -1) * bo(t - e - 1, t) + 0
        : n
          ? t > e
            ? 0
            : yo(e, Math.min(t, e - t), !0) + 0
          : t <= po
            ? yo(e, t, !0) + 0
            : xo(e, t)
      : co(e + 1) * lo(t + 1) * lo(e - t + 1) + 0;
}
function xo(e, t) {
  let n = uo(e + 1),
    r = uo(t + 1),
    i = uo(e - t + 1),
    a = n.sign * r.sign * i.sign * Math.exp(n.log - r.log - i.log);
  return Number.isFinite(a) ? a + 0 : NaN;
}
function So(e, t) {
  if (Number.isInteger(t) && t >= 0) return yo(e, t, !1) + 0;
  let n = e + 1,
    r = e - t + 1;
  return Number.isInteger(n) && n <= 0 && Number.isInteger(r) && r <= 0
    ? Co(-n, -r) + 0
    : co(e + 1) * lo(e - t + 1) + 0;
}
function Co(e, t) {
  let n = (e - t) % 2 == 0 ? 1 : -1;
  for (
    let r = Math.min(e, t) + 1;
    r <= Math.max(e, t) && ((n = e > t ? n / r : n * r), n !== 0 && Number.isFinite(n));
    r++
  );
  return n;
}
function wo(e) {
  return { angle: `none`, extendsToComplex: !1, real: (t) => e(t[0]), complex: () => mo };
}
function To(e) {
  return { angle: `none`, extendsToComplex: !1, real: (t) => e(t[0], t[1]), complex: () => mo };
}
var Eo = [
    [`floor`, wo((e) => Math.floor(e) + 0)],
    [`ceil`, wo((e) => Math.ceil(e) + 0)],
    [
      `round`,
      {
        angle: `none`,
        extendsToComplex: !1,
        real: (e) => ho(e[0], e.length === 2 ? e[1] : 0),
        complex: () => mo,
      },
    ],
    [`sign`, wo((e) => Math.sign(e) + 0)],
    [`mod`, To(vo)],
    [`nCr`, To(bo)],
    [`nPr`, To(So)],
    [
      `abs`,
      {
        angle: `none`,
        extendsToComplex: !1,
        real: (e) => Math.abs(e[0]),
        complex: (e) => ({ re: Math.hypot(e[0].re, e[0].im), im: 0 }),
      },
    ],
  ],
  Do = 99,
  Oo = 4,
  ko = new DataView(new ArrayBuffer(8));
function Ao(e) {
  if (!Number.isFinite(e)) return NaN;
  ko.setFloat64(0, e);
  let t = (ko.getUint16(0) >> 4) & 2047;
  return t === 0 ? Number.MIN_VALUE : 2 ** (t - 1075);
}
function jo(e) {
  if (!Number.isFinite(e)) return null;
  let t = Oo * Ao(e);
  for (let n = 1; n <= Do; n++) {
    let r = Math.round(e * n);
    if (Math.abs(e - r / n) <= t) return { p: r + 0, q: n };
  }
  return null;
}
function Mo(e) {
  let t = 1,
    n = e;
  for (; n.kind === `neg`; ) ((t = -t), (n = n.arg));
  if (n.kind !== `div`) return null;
  let r = No(n.left),
    i = No(n.right);
  if (r === null || i === null || i === 0) return null;
  let a = Po(Math.abs(r), Math.abs(i)),
    o = (t * Math.sign(i) * r) / a,
    s = Math.abs(i) / a;
  return s > Do ? null : { p: o + 0, q: s };
}
function No(e) {
  let t = e.kind === `neg`,
    n = t ? e.arg : e;
  return n.kind !== `num` || !Number.isSafeInteger(n.value) ? null : t ? -n.value : n.value;
}
function Po(e, t) {
  for (; t !== 0; ) [e, t] = [t, e % t];
  return e;
}
function Fo(e, t, n) {
  if (Number.isNaN(e) || Number.isNaN(t)) return NaN;
  let r;
  if (e < 0 && !Number.isInteger(t)) {
    let i = n ?? jo(t);
    if (i === null || i.q > Do || i.q % 2 == 0) return NaN;
    r = (Math.abs(i.p) % 2 == 1 ? -1 : 1) * (-e) ** +t;
  } else r = e ** +t;
  return Number.isFinite(r) ? r : NaN;
}
function Io(e, t) {
  if (t === 0 || !Number.isFinite(t)) return NaN;
  if (!Number.isInteger(t)) return Fo(e, 1 / t, null);
  if (e < 0 && Math.abs(t) % 2 == 0) return NaN;
  let n = e < 0 ? -Lo(-e, t) : Lo(e, t);
  return Number.isFinite(n) ? n : NaN;
}
function Lo(e, t) {
  return t === 3 ? Math.cbrt(e) : t === 2 ? Math.sqrt(e) : e ** (1 / t);
}
var Ro = Object.freeze([
    0, 0.25881904510252074, 0.5, 0.7071067811865476, 0.8660254037844386, 0.9659258262890683, 1,
  ]),
  zo = Object.freeze([
    0, 0.2679491924311227, 0.5773502691896257, 1, 1.7320508075688772, 3.732050807568877,
  ]),
  Bo = 2 ** 20,
  Vo = 4,
  Ho = 8,
  Uo = Math.PI / 2;
function Wo(e) {
  return Number.isFinite(e) ? e + 0 : NaN;
}
function Go(e) {
  let t = Math.round((12 * e) / Math.PI);
  if (!(Math.abs(t) <= Bo)) return null;
  let n = (t * Math.PI) / 12;
  return Math.abs(e - n) <= Vo * Ao(n) ? 15 * t + 0 : null;
}
function Ko(e, t, n) {
  if (n === `degrees`) return Jo(e, t);
  let r = Go(t);
  if (r !== null) return Jo(e, r);
  switch (e) {
    case `sin`:
      return Wo(Math.sin(t));
    case `cos`:
      return Wo(Math.cos(t));
    case `tan`:
      return Wo(Math.tan(t));
    case `csc`:
      return qo(1, Math.sin(t));
    case `sec`:
      return qo(1, Math.cos(t));
    case `cot`:
      return qo(Math.cos(t), Math.sin(t));
  }
}
function qo(e, t) {
  return t === 0 ? NaN : Wo(e / t);
}
function Jo(e, t) {
  if (!Number.isFinite(t)) return NaN;
  let n = t % 360;
  n > 180 ? (n -= 360) : n <= -180 && (n += 360);
  let r = Math.round(n / 90),
    i = n - 90 * r,
    a = ((r % 4) + 4) % 4,
    o = i % 15 == 0 ? Math.abs(i) / 15 : -1;
  if (e === `tan`) return Wo(Yo(i, a % 2 == 1, o));
  let s = (i * Math.PI) / 180,
    c = o >= 0 ? Math.sign(i) * Ro[o] : Math.sin(s),
    l = o >= 0 ? Ro[6 - o] : Math.cos(s),
    u = a === 0 ? c : a === 1 ? l : a === 2 ? -c : -l,
    d = a === 0 ? l : a === 1 ? -c : a === 2 ? -l : c;
  switch (e) {
    case `sin`:
      return Wo(u);
    case `cos`:
      return Wo(d);
    case `csc`:
      return qo(1, u);
    case `sec`:
      return qo(1, d);
    case `cot`:
      return qo(d, u);
  }
}
function Yo(e, t, n) {
  if (t && e === 0) return NaN;
  if (n >= 0) return t ? -Math.sign(e) * zo[6 - n] : Math.sign(e) * zo[n];
  let r = Math.tan((e * Math.PI) / 180);
  return t ? -1 / r : r;
}
function Xo(e, t, n) {
  return $o(Zo(e, t), n);
}
function Zo(e, t) {
  switch (e) {
    case `arcsin`:
      return Math.asin(t);
    case `arccos`:
      return Math.acos(t);
    case `arctan`:
      return Math.atan(t);
    case `arccsc`:
      return Math.asin(1 / t);
    case `arcsec`:
      return Math.acos(1 / t);
    case `arccot`:
      return t === 0 ? Uo : t > 0 ? Math.atan(1 / t) : Math.PI + Math.atan(1 / t);
  }
}
function Qo(e, t, n) {
  if (e === 0 && t === 0) return NaN;
  let r = Math.atan2(e, t);
  return $o(r === -Math.PI ? Math.PI : r, n);
}
function $o(e, t) {
  if (t === `radians`) return Wo(e);
  let n = (e * 180) / Math.PI,
    r = 15 * Math.round(n / 15);
  return Wo(Math.abs(n - r) <= Ho * Ao(r) ? r : n);
}
var es = Object.freeze({ re: NaN, im: NaN }),
  ts = Object.freeze({ re: 1, im: 0 }),
  ns = Object.freeze({ re: Math.PI / 2, im: 0 }),
  rs = Object.freeze({ re: Math.LN10, im: 0 });
function is(e, t) {
  return {
    angle: `input`,
    extendsToComplex: !1,
    real: (t, n) => Ko(e, t[0], n),
    complex: (e) => t(e[0]),
  };
}
function as(e, t, n) {
  return {
    angle: `output`,
    extendsToComplex: t,
    real: (t, n) => Xo(e, t[0], n),
    complex: (e) => n(e[0]),
  };
}
function os(e) {
  let t = e[0];
  if (!(t > 0)) return NaN;
  if (e.length === 1) return Math.log10(t);
  let n = e[1];
  return !(n > 0) || n === 1 ? NaN : Math.log(t) / Math.log(n);
}
function ss(e) {
  return Na(Fa(e[0]), e.length === 1 ? rs : Fa(e[1]));
}
var cs = new Map([
  [`sin`, is(`sin`, La)],
  [`cos`, is(`cos`, Ra)],
  [`tan`, is(`tan`, za)],
  [`csc`, is(`csc`, (e) => Na(ts, La(e)))],
  [`sec`, is(`sec`, (e) => Na(ts, Ra(e)))],
  [`cot`, is(`cot`, (e) => Na(Ra(e), La(e)))],
  [`arcsin`, as(`arcsin`, !0, Ba)],
  [`arccos`, as(`arccos`, !0, Va)],
  [
    `arctan`,
    {
      angle: `output`,
      extendsToComplex: !1,
      real: (e, t) => (e.length === 2 ? Qo(e[0], e[1], t) : Xo(`arctan`, e[0], t)),
      complex: (e) => (e.length === 2 ? { ...es } : Ha(e[0])),
    },
  ],
  [`arccsc`, as(`arccsc`, !0, (e) => Ba(Na(ts, e)))],
  [`arcsec`, as(`arcsec`, !0, (e) => Va(Na(ts, e)))],
  [`arccot`, as(`arccot`, !1, (e) => ja(ns, Ha(e)))],
  [
    `exp`,
    { angle: `none`, extendsToComplex: !1, real: (e) => Math.exp(e[0]), complex: (e) => Pa(e[0]) },
  ],
  [
    `ln`,
    {
      angle: `none`,
      extendsToComplex: !0,
      real: (e) => (e[0] > 0 ? Math.log(e[0]) : NaN),
      complex: (e) => Fa(e[0]),
    },
  ],
  [`log`, { angle: `none`, extendsToComplex: !0, real: os, complex: ss }],
  ...eo,
  ...Eo,
]);
function ls(e) {
  return Number.isFinite(e) ? e : NaN;
}
var us = new Map(
  [...jr].flatMap(([e, t]) => {
    let n = cs.get(e);
    return n
      ? [
          [
            e,
            Object.freeze({
              name: e,
              arity: t,
              angle: n.angle,
              extendsToComplex: n.extendsToComplex,
              real: (e, t) => ls(n.real(e, t)),
              complex: n.complex,
            }),
          ],
        ]
      : [];
  })
);
function ds(e, t, n, r) {
  let i = us.get(e);
  if (!i || !i.arity.includes(t.length)) return W;
  let a = !0;
  for (let e of t)
    if (e.type === `complex`) a = !1;
    else if (e.type !== `number`) return W;
  if (!a) return ps(i.complex(t.map(fs)));
  let o = t.map((e) => (e.type === `number` ? e.value : NaN)),
    s = i.real(o, n);
  return Number.isNaN(s) && r && i.extendsToComplex
    ? ps(i.complex(o.map((e) => ({ re: e, im: 0 }))))
    : G(s);
}
function fs(e) {
  return e.type === `complex` ? e.value : { re: e.type === `number` ? e.value : NaN, im: 0 };
}
function ps(e) {
  return Yi(e.re, e.im);
}
var ms = 1e-12;
function hs(e) {
  return e.type === `number` ? { re: e.value, im: 0 } : e.type === `complex` ? e.value : null;
}
function gs(e) {
  return Yi(e.re, e.im);
}
function _s(e, t, n, r) {
  if (e.type === `number` && t.type === `number`) return G(n(e.value, t.value));
  let i = hs(e),
    a = hs(t);
  return i && a ? gs(r(i, a)) : W;
}
function vs(e, t) {
  return _s(e, t, (e, t) => e + t, Aa);
}
function ys(e, t) {
  return _s(e, t, (e, t) => e - t, ja);
}
function bs(e, t) {
  return _s(e, t, (e, t) => e * t, Ma);
}
function xs(e, t) {
  return _s(e, t, (e, t) => e / t, Na);
}
function Ss(e) {
  return e.type === `number`
    ? G(-e.value)
    : e.type === `complex`
      ? Yi(-e.value.re, -e.value.im)
      : W;
}
function Cs(e) {
  return e.type === `number`
    ? G(e.value / 100)
    : e.type === `complex`
      ? Yi(e.value.re / 100, e.value.im / 100)
      : W;
}
function ws(e) {
  return e.type === `number`
    ? G(Math.abs(e.value))
    : e.type === `complex`
      ? G(Math.hypot(e.value.re, e.value.im))
      : W;
}
function Ts(e) {
  return e.type === `number` ? G(fo(e.value)) : W;
}
function Es(e, t) {
  return e.type !== `number` && e.type !== `complex`
    ? W
    : t === `degrees`
      ? e
      : e.type === `number`
        ? G((e.value * Math.PI) / 180)
        : Yi((e.value.re * Math.PI) / 180, (e.value.im * Math.PI) / 180);
}
function Ds(e, t, n, r) {
  if (e.type === `number` && t.type === `number`) {
    let i = Fo(e.value, t.value, n);
    return Number.isNaN(i) && r && e.value < 0
      ? gs(Ua({ re: e.value, im: 0 }, { re: t.value, im: 0 }))
      : G(i);
  }
  let i = hs(e),
    a = hs(t);
  return i && a ? gs(Ua(i, a)) : W;
}
function Os(e, t, n) {
  if (e.type === `number` && (t === null || t.type === `number`)) {
    let r = Io(e.value, t === null ? 2 : t.value);
    return Number.isNaN(r) && n && e.value < 0 ? ks({ re: e.value, im: 0 }, t) : G(r);
  }
  let r = hs(e);
  return r ? ks(r, t) : W;
}
function ks(e, t) {
  if (t === null) return gs(Ia(e));
  let n = hs(t);
  return n ? gs(Ua(e, Na({ re: 1, im: 0 }, n))) : W;
}
function As(e) {
  if (e.type === `number`) return e.value;
  if (e.type !== `complex`) return NaN;
  let { re: t, im: n } = e.value;
  return Math.abs(n) <= ms * Math.max(1, Math.abs(t)) ? t : NaN;
}
function js(e, t, n) {
  switch (t) {
    case `=`:
      return e === n;
    case `<`:
      return e < n;
    case `>`:
      return e > n;
    case `<=`:
      return e <= n;
    case `>=`:
      return e >= n;
  }
}
function Ms(e, t) {
  if (e.length !== t.length + 1) return !1;
  let n = NaN;
  for (let r = 0; r < e.length; r++) {
    let i = e[r];
    if (i.type !== `number` || !Number.isFinite(i.value) || (r > 0 && !js(n, t[r - 1], i.value)))
      return !1;
    n = i.value;
  }
  return !0;
}
var Ns = new Set([`sin`, `cos`, `tan`, `csc`, `sec`, `cot`]),
  Ps = () => NaN;
function Fs(e) {
  return Number.isFinite(e) ? e : NaN;
}
function Is(e) {
  return e === `e` ? Math.E : e === `pi` ? Math.PI : 2 * Math.PI;
}
function Ls(e, t) {
  if (!Ns.has(e) || t.length !== 1) return null;
  let [n] = t;
  return n.kind === `deg` ? n.arg : null;
}
function Rs(e, t) {
  let n = {
      scope: t,
      slots: new Map([
        [`x`, 0],
        [`y`, 1],
      ]),
      env: [NaN, NaN],
      bound: [1, 1],
      stack: [],
      boundStack: [],
      sp: 0,
      depth: 0,
      functions: new Map(),
    },
    r = zs(e, n),
    i = n.env;
  return (e, t) => ((i[0] = Fs(e)), (i[1] = Fs(t)), r());
}
function zs(e, t) {
  switch (e.kind) {
    case `num`: {
      let t = Fs(e.value);
      return () => t;
    }
    case `const`: {
      let t = Is(e.name);
      return () => t;
    }
    case `id`:
      return Ks(e.name, t);
    case `add`:
    case `sub`:
    case `mul`:
    case `div`:
      return Bs(e, t);
    case `pow`:
      return Vs(e, t);
    case `neg`: {
      let n = zs(e.arg, t);
      return () => -n();
    }
    case `pct`: {
      let n = zs(e.arg, t);
      return () => n() / 100;
    }
    case `abs`: {
      let n = zs(e.arg, t);
      return () => Math.abs(n());
    }
    case `deg`: {
      let n = zs(e.arg, t);
      return t.scope.settings.angleMode === `degrees` ? n : () => Fs((n() * Math.PI) / 180);
    }
    case `root`: {
      let n = zs(e.arg, t);
      if (e.index === null) return () => Io(n(), 2);
      let r = zs(e.index, t);
      return () => Io(n(), r());
    }
    case `call`:
      return Hs(e, t);
    case `rel`:
      return Ys(e.operands, e.ops, t);
    case `fact`: {
      let n = zs(e.arg, t);
      return () => fo(n());
    }
    case `point`:
    case `list`:
    case `sim`:
      return Ps;
  }
}
function Bs(e, t) {
  let n = zs(e.left, t),
    r = zs(e.right, t);
  switch (e.kind) {
    case `add`:
      return () => Fs(n() + r());
    case `sub`:
      return () => Fs(n() - r());
    case `mul`:
      return () => Fs(n() * r());
    default:
      return () => Fs(n() / r());
  }
}
function Vs(e, t) {
  if (e.left.kind === `const` && e.left.name === `e`) return Us(`exp`, [e.right], t);
  let n = zs(e.left, t),
    r = zs(e.right, t),
    i = Mo(e.right);
  return () => Fo(n(), r(), i);
}
function Hs(e, t) {
  if (he(e.name)) return Us(e.name, e.args, t);
  let n = Gs(e.name, t);
  return n === null || n.slots.length !== e.args.length
    ? Ps
    : Ws(
        n,
        e.args.map((e) => zs(e, t)),
        t
      );
}
function Us(e, t, n) {
  let r = Ls(e, t);
  if (r !== null) {
    let t = zs(r, n);
    return () => Ko(e, t(), `degrees`);
  }
  let i = us.get(e);
  if (i === void 0 || !i.arity.includes(t.length)) return Ps;
  let a = t.map((e) => zs(e, n)),
    o = a.map(() => NaN),
    s = a.length,
    c = n.scope.settings.angleMode,
    l = n.stack;
  return () => {
    let e = n.sp;
    for (let t = 0; t < s; t++) {
      let r = a[t]();
      if (Number.isNaN(r)) return ((n.sp = e), NaN);
      ((l[e + t] = r), (n.sp = e + t + 1));
    }
    for (let t = 0; t < s; t++) o[t] = l[e + t];
    return ((n.sp = e), i.real(o, c));
  };
}
function Ws(e, t, n) {
  let { env: r, bound: i, stack: a, boundStack: o } = n,
    s = t.length;
  return () => {
    if (n.depth >= 64) return NaN;
    let c = n.sp;
    for (let e = 0; e < s; e++) ((a[c + e] = t[e]()), (n.sp = c + e + 1));
    for (let t = 0; t < s; t++) {
      let n = e.slots[t],
        s = r[n];
      ((r[n] = a[c + t]), (a[c + t] = s), (o[c + t] = i[n]), (i[n] = 1));
    }
    n.depth += 1;
    let l = e.body();
    --n.depth;
    for (let t = s - 1; t >= 0; t--) {
      let n = e.slots[t];
      ((r[n] = a[c + t]), (i[n] = o[c + t]));
    }
    return ((n.sp = c), l);
  };
}
function Gs(e, t) {
  let n = t.functions.get(e);
  if (n !== void 0) return n;
  let r = t.scope.functions.get(e);
  if (r === void 0) return null;
  let i = { slots: r.params.map((e) => Js(e, t)), body: Ps };
  return (t.functions.set(e, i), (i.body = zs(r.body, t)), i);
}
function Ks(e, t) {
  let n = Js(e, t),
    { env: r, bound: i } = t,
    a = qs(e, t);
  return () => (i[n] === 1 ? r[n] : a());
}
function qs(e, t) {
  let { scope: n } = t;
  if (n.settings.complex && e === `i`) return Ps;
  let r = n.values.get(e);
  if (r !== void 0) {
    let e = r.type === `number` ? r.value : NaN;
    return () => e;
  }
  let i = Gs(e, t);
  return i !== null && i.slots.length === 0 ? Ws(i, [], t) : Ps;
}
function Js(e, t) {
  let n = t.slots.get(e);
  if (n !== void 0) return n;
  let r = t.env.length;
  return (t.slots.set(e, r), t.env.push(NaN), t.bound.push(0), r);
}
function Ys(e, t, n) {
  let r = e.map((e) => zs(e, n)),
    i = t.length;
  return () => {
    let e = r[0]();
    if (Number.isNaN(e)) return NaN;
    for (let n = 0; n < i; n++) {
      let i = r[n + 1]();
      if (Number.isNaN(i) || !js(e, t[n], i)) return NaN;
      e = i;
    }
    return 1;
  };
}
var Xs = 1e-9,
  Zs = class extends Error {
    constructor(e) {
      (super(e), (this.name = `ListError`), (this.code = e));
    }
  };
function Qs(e) {
  return Object.freeze({ type: `undefined`, error: e });
}
var $s = (e) => e.type === `list`;
function ec(e) {
  if (e.length > 1e4) throw new Zs(`list-too-long`);
  let t = 0,
    n = 0;
  for (let r of e) {
    if ($s(r)) throw new Zs(`nested-list`);
    r.type === `point` ? (t += 1) : r.type !== `undefined` && (n += 1);
  }
  if (t > 0 && n > 0) throw new Zs(`list-mixed`);
  return { type: `list`, value: e };
}
function tc(e, t, n) {
  if ((t === null ? [e, n] : [e, t, n]).some($s)) throw new Zs(`nested-list`);
  let [r, i, a] = [e, t ?? e, n].map((e) => (e.type === `number` ? e.value : NaN));
  if (![r, i, a].every(Number.isFinite)) return W;
  let o = t === null ? (a < r ? -1 : 1) : i - r;
  if (o === 0) throw new Zs(`range-step`);
  let s = Math.floor((a - r) / o + Xs) + 1;
  if (!(s <= 1e4)) throw new Zs(`list-too-long`);
  let c = [];
  for (let e = 0; e < s; e++) {
    let t = r + e * o,
      n = e === s - 1 && Math.abs(t - a) <= Xs * Math.abs(o);
    c.push({ type: `number`, value: n ? a : t });
  }
  return { type: `list`, value: c };
}
function nc(e, t) {
  return $s(e) ? { type: `list`, value: e.value.map(t) } : t(e);
}
function rc(e, t, n) {
  if (!$s(e) && !$s(t)) return n(e, t);
  let r = Math.min($s(e) ? e.value.length : 1 / 0, $s(t) ? t.value.length : 1 / 0),
    i = [];
  for (let a = 0; a < r; a++) i.push(n($s(e) ? e.value[a] : e, $s(t) ? t.value[a] : t));
  return { type: `list`, value: i };
}
function ic(e, t) {
  let n = 1 / 0;
  for (let t of e) $s(t) && (n = Math.min(n, t.value.length));
  if (n === 1 / 0) return t([...e]);
  let r = [];
  for (let i = 0; i < n; i++) r.push(t(e.map((e) => ($s(e) ? e.value[i] : e))));
  return { type: `list`, value: r };
}
function ac(e, t) {
  return rc(e, t, (e, t) => ({ type: `point`, value: [As(e), As(t)] }));
}
var oc = Object.freeze(G(1)),
  sc = Object.freeze(Yi(Ea.re, Ea.im)),
  cc = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
function lc(e, t) {
  let n = dc(e, { scope: t, functions: new Map(), depth: 0 });
  return (e, t) => {
    try {
      return n(e, t);
    } catch (e) {
      if (e instanceof Zs) return Qs(e.code);
      throw e;
    }
  };
}
function uc(e) {
  return () => e;
}
function dc(e, t) {
  let { angleMode: n, complex: r } = t.scope.settings;
  switch (e.kind) {
    case `num`:
      return uc(Object.freeze(G(e.value)));
    case `const`:
      return uc(Object.freeze(G(Is(e.name))));
    case `id`:
      return yc(e.name, t);
    case `add`:
      return pc(e, t, vs);
    case `sub`:
      return pc(e, t, ys);
    case `mul`:
      return pc(e, t, bs);
    case `div`:
      return pc(e, t, xs);
    case `pow`:
      return mc(e, t);
    case `neg`:
      return fc(e.arg, t, Ss);
    case `pct`:
      return fc(e.arg, t, Cs);
    case `abs`:
      return fc(e.arg, t, ws);
    case `deg`:
      return fc(e.arg, t, (e) => Es(e, n));
    case `fact`:
      return fc(e.arg, t, Ts);
    case `root`: {
      let n = dc(e.arg, t),
        i = e.index === null ? null : dc(e.index, t);
      return i === null
        ? (e, t) => nc(n(e, t), (e) => Os(e, null, r))
        : (e, t) => rc(n(e, t), i(e, t), (e, t) => Os(e, t, r));
    }
    case `call`:
      return hc(e, t);
    case `list`: {
      let n = e.items.map((e) => dc(e, t));
      if (e.range !== !0) return (e, t) => ec(n.map((n) => n(e, t)));
      let [r, i, a] = n.length === 2 ? [n[0], null, n[1]] : n;
      return (e, t) => tc(r(e, t), i?.(e, t) ?? null, a(e, t));
    }
    case `sim`:
      return uc(W);
    case `point`: {
      let n = dc(e.x, t),
        r = dc(e.y, t);
      return (e, t) => ac(n(e, t), r(e, t));
    }
    case `rel`: {
      let n = e.operands.map((e) => dc(e, t)),
        r = e.ops;
      return (e, t) =>
        Ms(
          n.map((n) => n(e, t)),
          r
        )
          ? oc
          : W;
    }
  }
}
function fc(e, t, n) {
  let r = dc(e, t);
  return (e, t) => nc(r(e, t), n);
}
function pc(e, t, n) {
  let r = dc(e.left, t),
    i = dc(e.right, t);
  return (e, t) => rc(r(e, t), i(e, t), n);
}
function mc(e, t) {
  if (e.left.kind === `const` && e.left.name === `e`) return gc(`exp`, [e.right], t);
  let n = dc(e.left, t),
    r = dc(e.right, t),
    i = Mo(e.right),
    { complex: a } = t.scope.settings;
  return (e, t) => rc(n(e, t), r(e, t), (e, t) => Ds(e, t, i, a));
}
function hc(e, t) {
  if (he(e.name)) return gc(e.name, e.args, t);
  let n = vc(e.name, t);
  return n === null || n.params.length !== e.args.length
    ? uc(W)
    : _c(
        n,
        e.args.map((e) => dc(e, t)),
        t
      );
}
function gc(e, t, n) {
  let { angleMode: r, complex: i } = n.scope.settings,
    a = Ls(e, t);
  if (a !== null) {
    let t = dc(a, n);
    return (n, a) =>
      nc(t(n, a), (t) =>
        t.type === `number` ? G(Ko(e, t.value, `degrees`)) : ds(e, [Es(t, r)], r, i)
      );
  }
  let o = t.map((e) => dc(e, n));
  return (t, n) =>
    ic(
      o.map((e) => e(t, n)),
      (t) => ds(e, t, r, i)
    );
}
function _c(e, t, n) {
  return (r, i) => {
    let a = t.map((e) => e(r, i));
    if ((i.check(), n.depth >= 64)) return W;
    let o = { ...r };
    (e.params.forEach((e, t) => {
      o[e] = a[t];
    }),
      (n.depth += 1));
    try {
      return e.body(o, i);
    } finally {
      --n.depth;
    }
  };
}
function vc(e, t) {
  let n = t.functions.get(e);
  if (n !== void 0) return n;
  let r = t.scope.functions.get(e);
  if (r === void 0) return null;
  let i = { params: r.params, body: uc(W) };
  return (t.functions.set(e, i), (i.body = dc(r.body, t)), i);
}
function yc(e, t) {
  let n = bc(e, t);
  return (t, r) => (cc(t, e) ? t[e] : n(t, r));
}
function bc(e, t) {
  let { scope: n } = t;
  if (n.settings.complex && e === `i`) return uc(sc);
  let r = n.values.get(e);
  if (r !== void 0) return uc(r);
  let i = vc(e, t);
  return i !== null && i.params.length === 0 ? _c(i, [], t) : uc(W);
}
function xc(e, t, n) {
  if (!n.settings.complex) {
    let r = Rs(e, n);
    return t === `x` ? (e) => r(e, NaN) : (e) => r(NaN, e);
  }
  let r = lc(e, n);
  return t === `x` ? (e) => As(r({ x: G(e), y: W }, ae)) : (e) => As(r({ x: W, y: G(e) }, ae));
}
function Sc(e, t) {
  if (!t.settings.complex) return Rs(e, t);
  let n = lc(e, t);
  return (e, t) => As(n({ x: G(e), y: G(t) }, ae));
}
function Cc(e, t) {
  return t.includes(e.kind) && e.error === null && e.chips.length === 0;
}
function wc(e) {
  let { tree: t } = e;
  return t !== null && t.kind === `rel` && t.operands.length === 2 ? t.operands[1] : null;
}
function Tc(e, t, n, r) {
  let i = new Map(),
    a = new Map(),
    o = { functions: e.functions, values: a, settings: t },
    s = (e, t) => {
      let r = n(e);
      try {
        r.check();
        let n = lc(t, o)({}, r);
        return (i.set(e, n), n);
      } catch (e) {
        if (e instanceof ie) return null;
        throw e;
      }
    },
    c = new Set();
  for (let t of e.valueOrder) {
    let l = Dr(t);
    if (l !== null) {
      let t = e.byId.get(l)?.regression;
      if (t === void 0 || c.has(l)) continue;
      c.add(l);
      let s = n(l);
      s.check();
      let u = wa(t, o, s);
      for (let [e, t] of Ta(u)) (a.set(e, t), i.set(Er(l, e), t));
      r?.regression(l, u);
      continue;
    }
    let u = e.byId.get(t),
      d = u === void 0 ? null : wc(u);
    if (u === void 0 || d === null || u.defines === null || !Cc(u, [`definition`])) continue;
    let f = s(t, d);
    f !== null && a.set(u.defines.name, f.type === `undefined` ? W : f);
  }
  for (let t of e.rows) Cc(t, [`value`, `point`]) && t.tree !== null && s(t.id, t.tree);
  if (r !== void 0)
    for (let t of e.rows) {
      if (t.kind !== `table` || t.table === void 0) continue;
      let e = n(t.id);
      (e.check(), r.table(t.id, Zi(t, o, e)));
    }
  return i;
}
function Ec(e, t, n) {
  let r = new Map();
  for (let n of e.byId.values())
    n.kind === `definition` &&
      n.defines?.type === `value` &&
      t.has(n.id) &&
      r.set(n.defines.name, t.get(n.id));
  return { functions: e.functions, values: r, settings: n };
}
function Dc(e, t, n) {
  let { id: r, graph: i } = e;
  if (i === null) return null;
  switch (i.kind) {
    case `explicit`:
      return {
        rowId: r,
        kind: `explicit`,
        independent: i.independent,
        f: xc(i.expr, i.independent, t),
      };
    case `implicit`:
      return { rowId: r, kind: `implicit`, F: Sc(i.expr, t) };
    case `lines`:
      return {
        rowId: r,
        kind: `lines`,
        orientation: i.orientation,
        f: xc(i.expr, i.orientation === `vertical` ? `x` : `y`, t),
      };
    case `region`:
      return { rowId: r, kind: `region`, terms: i.operands.map((e) => Sc(e, t)), ops: [...i.ops] };
    case `constant-region`: {
      let n = lc(
        {
          kind: `rel`,
          ops: i.ops,
          operands: i.operands,
          span: e.tree?.span ?? { start: 0, end: 0 },
        },
        t
      )({}, ae);
      return { rowId: r, kind: `constant-region`, holds: n.type === `number` && n.value === 1 };
    }
    case `table`:
      return null;
    case `point`: {
      let e = n?.type === `list` ? n.value : n === null ? [] : [n],
        t = [];
      for (let n of e) {
        if (n.type !== `point`) continue;
        let [e, r] = n.value;
        Number.isFinite(e) && Number.isFinite(r) && t.push([e, r]);
      }
      return t.length > 0 ? { rowId: r, kind: `points`, points: t } : null;
    }
  }
}
var Oc = 2e4,
  kc = 25e4,
  Ac = 1024,
  jc = class {
    constructor(e, t) {
      ((this.count = 0), (this.nextCheck = Ac), (this.limit = e), (this.deadline = t));
    }
    get used() {
      return this.count;
    }
    get remaining() {
      return this.limit - this.count;
    }
    take(e = 1) {
      let t = this.count + e;
      return t > this.limit
        ? !1
        : ((this.count = t),
          t >= this.nextCheck &&
            ((this.nextCheck = (Math.floor(t / Ac) + 1) * Ac), this.deadline.check()),
          !0);
    }
  };
function Mc(e, t, n) {
  return re(e, t + 0.5, n + 0.5);
}
var Nc = 0,
  Pc = 1,
  Fc = 2,
  Ic = 3,
  Lc = 4,
  Rc = class {
    constructor(e, t, n) {
      ((this.state = Nc), (this.children = null), (this.i = e), (this.j = t), (this.edge = n));
    }
  };
function zc(e) {
  return Number.isFinite(e) && e > 0 ? Math.ceil(e) : 0;
}
function Bc(e, t) {
  return Math.max(1, Math.ceil((e - 1) / t));
}
var Vc = class {
  constructor(e, t, n, r, i) {
    ((this.leaves = []),
      (this.unresolved = []),
      (this.index = new Map()),
      (this.slots = 0),
      (this.coarse = []),
      (this.queue = []),
      (this.view = e),
      (this.count = t),
      (this.callsPerNode = n),
      (this.evaluate = r),
      (this.budget = i),
      (this.width = zc(e.size.width)),
      (this.height = zc(e.size.height)));
    let a = 4,
      o = (e) => (Bc(this.width, e) + 1) * (Bc(this.height, e) + 1) * n,
      s = (e) => Bc(this.width, e) === 1 && Bc(this.height, e) === 1;
    for (; o(a) > i.limit / 4 && !s(a); ) a *= 2;
    ((this.cell = a),
      (this.cellsX = Bc(this.width, a)),
      (this.cellsY = Bc(this.height, a)),
      (this.lastI = this.cellsX * a),
      (this.lastJ = this.cellsY * a),
      (this.stride = this.lastI + 1),
      (this.store = new Float64Array(Math.max(1, t) * 1024)),
      (this.scratch = new Float64Array(t)));
  }
  value(e, t, n) {
    let r = this.slotOf(e, t);
    return r === void 0 ? NaN : this.store[r * this.count + n];
  }
  pixelValue(e, t, n) {
    let r = this.slotOf(e, t);
    if (r !== void 0) return this.store[r * this.count + n];
    let i = this.locate(e, t);
    if (i.state !== Ic) return this.value(i.i, i.j, n);
    let a = e - i.i > i.i + i.edge - e,
      o = t - i.j > i.j + i.edge - t;
    return this.value(a ? i.i + i.edge : i.i, o ? i.j + i.edge : i.j, n);
  }
  boundaryMixes(e, t) {
    return this.mixes(this.boundarySlots(e), t);
  }
  run() {
    let { cell: e, cellsX: t, cellsY: n } = this,
      r = !1;
    for (let i = 0; i <= n && !r; i++)
      for (let n = 0; n <= t && !r; n++) r = !this.evaluateNode(n * e, i * e);
    for (let r = 0; r < n; r++)
      for (let n = 0; n < t; n++) this.coarse.push(new Rc(n * e, r * e, e));
    for (let e of this.coarse)
      this.cornersEvaluated(e) ? this.active(e) && this.enqueue(e) : this.markUnresolved(e);
    let { queue: i } = this;
    for (let e = 0; e < i.length; e++) {
      let t = i[e];
      if (t.edge === 1) this.markLeaf(t);
      else if (!this.split(t)) {
        for (let t = e; t < i.length; t++)
          i[t].edge === 1 ? this.markLeaf(i[t]) : this.markUnresolved(i[t]);
        break;
      }
    }
    return this;
  }
  split(e) {
    let { i: t, j: n, edge: r } = e,
      i = r / 2,
      a = [
        [t + i, n, t + i, n - 1],
        [t, n + i, t - 1, n + i],
        [t + i, n + i, NaN, NaN],
        [t + r, n + i, t + r, n + i],
        [t + i, n + r, t + i, n + r],
      ].filter(([e, t]) => this.slotOf(e, t) === void 0);
    for (let [e, t] of a) if (!this.evaluateNode(e, t)) return !1;
    ((e.state = Lc),
      (e.children = [
        new Rc(t, n, i),
        new Rc(t + i, n, i),
        new Rc(t, n + i, i),
        new Rc(t + i, n + i, i),
      ]));
    for (let t of e.children) this.active(t) && this.enqueue(t);
    for (let [, , e, t] of a) {
      if (!(e >= 0 && e < this.lastI && t >= 0 && t < this.lastJ)) continue;
      let n = this.locate(e, t);
      n.state === Nc && this.active(n) && this.enqueue(n);
    }
    return !0;
  }
  active(e) {
    let t = this.boundarySlots(e);
    for (let n = 0; n < this.count; n++) if (this.mixes(t, n) || this.nearZero(e, n)) return !0;
    return !1;
  }
  mixes(e, t) {
    let n = !1,
      r = !1,
      i = !1,
      a = !1,
      o = !1;
    for (let s of e) {
      let e = this.store[s * this.count + t];
      Number.isNaN(e) ? (r = !0) : ((n = !0), e > 0 ? (i = !0) : e < 0 ? (a = !0) : (o = !0));
    }
    return n && (r || o || (i && a));
  }
  nearZero(e, t) {
    let { i: n, j: r, edge: i } = e,
      a = this.value(n, r, t),
      o = this.value(n + i, r, t),
      s = this.value(n + i, r + i, t),
      c = this.value(n, r + i, t);
    return Number.isFinite(a) && Number.isFinite(o) && Number.isFinite(s) && Number.isFinite(c)
      ? Math.min(Math.abs(a), Math.abs(o), Math.abs(s), Math.abs(c)) <=
          1 * Math.max(Math.abs(a - o), Math.abs(o - s), Math.abs(s - c), Math.abs(c - a))
      : !1;
  }
  boundarySlots(e) {
    let { i: t, j: n, edge: r } = e,
      i = [],
      a = (e, t) => {
        let n = this.slotOf(e, t);
        n !== void 0 && i.push(n);
      };
    for (let e = 0; e <= r; e++) (a(t + e, n), a(t + e, n + r));
    for (let e = 1; e < r; e++) (a(t, n + e), a(t + r, n + e));
    return i;
  }
  cornersEvaluated(e) {
    let { i: t, j: n, edge: r } = e,
      i = (e, t) => this.slotOf(e, t) !== void 0;
    return i(t, n) && i(t + r, n) && i(t, n + r) && i(t + r, n + r);
  }
  locate(e, t) {
    let n = Math.min(Math.max(Math.floor(e / this.cell), 0), this.cellsX - 1),
      r = Math.min(Math.max(Math.floor(t / this.cell), 0), this.cellsY - 1),
      i = this.coarse[r * this.cellsX + n];
    for (; i.children !== null; ) {
      let n = i.edge / 2;
      i = i.children[(t >= i.j + n ? 2 : 0) + +(e >= i.i + n)];
    }
    return i;
  }
  slotOf(e, t) {
    if (e >= 0 && e <= this.lastI && t >= 0 && t <= this.lastJ)
      return this.index.get(t * this.stride + e);
  }
  evaluateNode(e, t) {
    if (!this.budget.take(this.callsPerNode)) return !1;
    let [n, r] = Mc(this.view, e, t),
      { scratch: i, count: a } = this;
    if ((i.fill(NaN), this.evaluate(n, r, i), (this.slots + 1) * a > this.store.length)) {
      let e = new Float64Array(this.store.length * 2);
      (e.set(this.store), (this.store = e));
    }
    let o = this.slots * a;
    for (let e = 0; e < a; e++) this.store[o + e] = Number.isFinite(i[e]) ? i[e] : NaN;
    return (this.index.set(t * this.stride + e, this.slots++), !0);
  }
  enqueue(e) {
    ((e.state = Pc), this.queue.push(e));
  }
  markLeaf(e) {
    ((e.state = Fc), this.leaves.push(e));
  }
  markUnresolved(e) {
    ((e.state = Ic), this.unresolved.push(e));
  }
};
function Hc(e, t, n, r, i) {
  return new Vc(e, t, n, r, i).run();
}
function Uc(e, t, n) {
  let r = e.cellsX * e.cell + 1,
    i = (e, t) => 2 * (t * r + e),
    a = (e, t) => 2 * (t * r + e) + 1,
    o = new Map(),
    s = (e, t, r, i, a) => {
      if (!o.has(e)) {
        let s = i / (i - a),
          [c, l] = e % 2 == 0 ? [t + 0.5 + s, r + 0.5] : [t + 0.5, r + 0.5 + s];
        o.set(e, re(n, c, l));
      }
      return e;
    },
    c = [];
  for (let { i: n, j: r } of e.leaves) {
    let o = e.value(n, r, t),
      l = e.value(n + 1, r, t),
      u = e.value(n + 1, r + 1, t),
      d = e.value(n, r + 1, t);
    if (!(Number.isFinite(o) && Number.isFinite(l) && Number.isFinite(u) && Number.isFinite(d)))
      continue;
    let [f, p, m, h] = [o < 0, l < 0, u < 0, d < 0],
      g = f === p ? -1 : s(i(n, r), n, r, o, l),
      _ = p === m ? -1 : s(a(n + 1, r), n + 1, r, l, u),
      v = h === m ? -1 : s(i(n, r + 1), n, r + 1, d, u),
      y = f === h ? -1 : s(a(n, r), n, r, o, d),
      b = [g, _, v, y].filter((e) => e >= 0);
    b.length === 2
      ? c.push(b[0], b[1])
      : b.length === 4 &&
        (((o + l + u + d) / 4 < 0 ? !f : f) ? c.push(y, g, _, v) : c.push(g, _, v, y));
  }
  let l = [];
  for (let e of Wc(c)) {
    l.length > 0 && l.push(NaN, NaN);
    for (let t of e) l.push(...o.get(t));
  }
  let u = [];
  for (let r of e.unresolved) {
    if (!e.boundaryMixes(r, t)) continue;
    let [i, a] = Mc(n, r.i, r.j),
      [o, s] = Mc(n, r.i + r.edge, r.j + r.edge);
    u.push(i, o, s, a);
  }
  return { polylines: l, bands: u };
}
function Wc(e) {
  let t = e.length / 2,
    n = new Map(),
    r = new Map(),
    i = [];
  for (let t = 0; t < e.length; t++) {
    let a = t >> 1;
    n.has(e[t]) ? r.set(e[t], a) : (n.set(e[t], a), i.push(e[t]));
  }
  let a = new Uint8Array(t),
    o = (t, i) => {
      let o = [t],
        [s, c] = [t, i];
      for (;;) {
        ((a[c] = 1), (s = e[2 * c] === s ? e[2 * c + 1] : e[2 * c]), o.push(s));
        let t = n.get(s),
          i = r.get(s),
          l = a[t] ? (i !== void 0 && !a[i] ? i : -1) : t;
        if (l < 0) return o;
        c = l;
      }
    },
    s = [];
  for (let e of i) {
    let t = n.get(e);
    !r.has(e) && !a[t] && s.push(o(e, t));
  }
  for (let n = 0; n < t; n++) a[n] || s.push(o(e[2 * n], n));
  return s;
}
function Gc(e, t, n, r) {
  let i = new jc(kc, r),
    { polylines: a, bands: o } = Uc(
      Hc(
        n,
        1,
        1,
        (e, n, r) => {
          r[0] = t(e, n);
        },
        i
      ),
      0,
      n
    );
  return {
    rowId: e,
    kind: `curve`,
    polylines: Float64Array.from(a),
    bands: Float64Array.from(o),
    dashed: !1,
    evaluations: i.used,
  };
}
var Kc = Number.isFinite,
  qc = (Math.sqrt(5) - 1) / 2,
  Jc = 480;
function Yc(e, t, n, r) {
  let i = n.size.height / n.size.width,
    a = Jc,
    o = Gc(
      `poi`,
      e,
      { viewport: t, size: { width: a, height: Math.max(1, Math.round(a * i)) }, dpr: 1 },
      r
    ),
    s = [],
    c = { xs: [], ys: [] };
  for (let e = 0; e + 1 < o.polylines.length; e += 2) {
    let t = o.polylines[e],
      n = o.polylines[e + 1];
    Number.isNaN(t) || Number.isNaN(n)
      ? (c.xs.length > 1 && s.push(c), (c = { xs: [], ys: [] }))
      : (c.xs.push(t), c.ys.push(n));
  }
  return (c.xs.length > 1 && s.push(c), s);
}
function Xc(e, t, n) {
  let r = e(t),
    i = e(n);
  if (!Kc(r) || !Kc(i)) return NaN;
  if (r === 0) return t;
  if (i === 0) return n;
  if (r > 0 == i > 0) return NaN;
  for (let a = 0; a < 100; a++) {
    let a = (t + n) / 2;
    if (a === t || a === n) break;
    let o = e(a);
    if (!Kc(o)) return NaN;
    if (o === 0) return a;
    o > 0 == r > 0 ? ([t, r] = [a, o]) : ([n, i] = [a, o]);
  }
  return (t + n) / 2;
}
function Zc(e, t, n) {
  let r = t,
    i = n,
    a = n - qc * (n - t),
    o = t + qc * (n - t),
    s = e(a),
    c = e(o);
  for (let r = 0; r < 200 && n - t > 1e-15 * Math.max(1, Math.abs(t)); r++)
    s >= c
      ? ((n = o), (o = a), (c = s), (a = n - qc * (n - t)), (s = e(a)))
      : ((t = a), (a = o), (s = c), (o = t + qc * (n - t)), (c = e(o)));
  let l = s >= c ? a : o,
    u = 0.001 * (i - r);
  return l - r < u || i - l < u ? null : l;
}
function Qc(e, t, n) {
  let r = [],
    i = 4 * n.x,
    a = 4 * n.y;
  for (let { xs: o, ys: s } of t)
    for (let t = 0; t < o.length; t++) {
      let c = t > 0 ? s[t - 1] : null,
        l = t + 1 < s.length ? s[t + 1] : null;
      if (c === null && l === null) continue;
      let u = s[t],
        d = (c === null || u > c) && (l === null || u >= l),
        f = (c === null || u < c) && (l === null || u <= l);
      for (let s of [d ? `top` : null, f ? `bottom` : null]) {
        if (s === null) continue;
        let c = s === `top` ? 1 : -1,
          l = u,
          d = (t) => {
            let n = Xc((n) => e(t, n), l - a, l + a);
            return Kc(n) ? c * n : -1 / 0;
          },
          f = Zc(d, o[t] - i, o[t] + i);
        if (f === null) continue;
        let p = c * d(f);
        Kc(p) &&
          (r.some((e) => e.kind === s && Math.abs(e.x - f) < n.x && Math.abs(e.y - p) < n.y) ||
            r.push({ x: f, y: p, kind: s }));
      }
    }
  return r;
}
function $c(e, t, n, r, i) {
  let a = n,
    o = r;
  for (let s = 0; s < 50; s++) {
    let s = e(n, r),
      c = t(n, r);
    if (!Kc(s) || !Kc(c)) return null;
    let l = 1e-7 * Math.max(1, Math.abs(n)),
      u = 1e-7 * Math.max(1, Math.abs(r)),
      d = (e(n + l, r) - e(n - l, r)) / (2 * l),
      f = (e(n, r + u) - e(n, r - u)) / (2 * u),
      p = (t(n + l, r) - t(n - l, r)) / (2 * l),
      m = (t(n, r + u) - t(n, r - u)) / (2 * u),
      h = d * m - f * p;
    if (!Kc(h) || h === 0) return null;
    let g = (s * m - f * c) / h,
      _ = (d * c - s * p) / h;
    if (((n -= g), (r -= _), Math.hypot(n - a, r - o) > i)) return null;
    if (
      Math.abs(g) <= 1e-14 * Math.max(1, Math.abs(n)) &&
      Math.abs(_) <= 1e-14 * Math.max(1, Math.abs(r))
    )
      return [n, r];
  }
  let s = e(n, r),
    c = t(n, r);
  return Kc(s) && Kc(c) ? [n, r] : null;
}
function el(e, t, n, r) {
  let i = [],
    a = 6 * Math.hypot(r.x, r.y);
  for (let { xs: o, ys: s } of n) {
    let n = t(o[0], s[0]);
    for (let c = 1; c < o.length; c++) {
      let l = t(o[c], s[c]);
      if (Kc(n) && Kc(l) && (l === 0 || n > 0 != l > 0)) {
        let n = $c(e, t, (o[c - 1] + o[c]) / 2, (s[c - 1] + s[c]) / 2, a);
        n !== null &&
          !i.some((e) => Math.abs(e[0] - n[0]) < r.x && Math.abs(e[1] - n[1]) < r.y) &&
          i.push(n);
      }
      n = l;
    }
  }
  return i;
}
var tl = 2220446049250313e-31,
  nl = (Math.sqrt(5) - 1) / 2,
  rl = 1e-8,
  il = 1e-5,
  al = 0.001,
  ol = Number.isFinite;
function sl(e, t) {
  let n = Math.max(2, Math.floor(t.samples)),
    r = [],
    i = [];
  for (let a = 0; a <= n; a++) {
    let o = t.lo + ((t.hi - t.lo) * a) / n;
    (r.push(o), i.push(e(o)));
  }
  return { t: r, v: i };
}
function cl(e, t, n, r, i) {
  let a = t,
    o = r,
    s = n - t,
    c = s;
  for (let l = 0; l < 200; l++) {
    Math.abs(o) < Math.abs(i) && (([t, n, a] = [n, a, n]), ([r, i, o] = [i, o, i]));
    let l = 2 * tl * Math.abs(n) + 1e-300,
      u = (a - n) / 2;
    if (Math.abs(u) <= l || i === 0) break;
    if (Math.abs(c) < l || Math.abs(r) <= Math.abs(i)) s = c = u;
    else {
      let e,
        d,
        f = i / r;
      if (t === a) ((e = 2 * u * f), (d = 1 - f));
      else {
        let a = i / o,
          s = r / o;
        ((e = f * (2 * u * s * (s - a) - (n - t) * (a - 1))), (d = (s - 1) * (a - 1) * (f - 1)));
      }
      (e > 0 ? (d = -d) : (e = -e),
        2 * e < Math.min(3 * u * d - Math.abs(l * d), Math.abs(c * d))
          ? ((c = s), (s = e / d))
          : (s = c = u));
    }
    if (((t = n), (r = i), (n += Math.abs(s) > l ? s : u > 0 ? l : -l), (i = e(n)), !ol(i)))
      return null;
    ((i > 0 && o > 0) || (i < 0 && o < 0)) && ((a = t), (o = r), (s = c = n - t));
  }
  return { t: n, size: Math.min(Math.abs(i), Math.abs(o)) };
}
function ll(e, t, n) {
  let r = n - nl * (n - t),
    i = t + nl * (n - t),
    a = e(r),
    o = e(i);
  for (let s = 0; s < 200 && n - t > 4 * tl * Math.max(1, Math.abs(t) + Math.abs(n)); s++)
    a <= o
      ? ((n = i), (i = r), (o = a), (r = n - nl * (n - t)), (a = e(r)))
      : ((t = r), (r = i), (a = o), (i = t + nl * (n - t)), (o = e(i)));
  return a <= o ? r : i;
}
function ul(e, t, n) {
  for (let r = 0; r < 80; r++) {
    let r = (t + n) / 2;
    if (r === t || r === n) break;
    ol(e(r)) ? (t = r) : (n = r);
  }
  return t;
}
var dl = (e, t) => Math.abs(e - t) <= 1e-9 * Math.max(1, Math.abs(e));
function fl(e, t) {
  e.some((e) => dl(e, t)) || e.push(t);
}
function pl(e, t) {
  let { t: n, v: r } = sl(e, t),
    i = [];
  for (let t = 0; t < n.length; t++) {
    let a = r[t],
      o = r[t + 1];
    if ((a === 0 && fl(i, n[t]), t === n.length - 1)) break;
    if (ol(a) && ol(o) && a !== 0 && o !== 0 && a > 0 != o > 0) {
      let r = cl(e, n[t], n[t + 1], a, o);
      r !== null && r.size <= al * Math.min(Math.abs(a), Math.abs(o)) && fl(i, r.t);
    } else if (ol(a) !== ol(o)) {
      let [r, s, c] = ol(a) ? [n[t], n[t + 1], a] : [n[t + 1], n[t], o],
        l = ul(e, r, s),
        u = e(l);
      ol(u) && c !== 0 && Math.abs(u) <= il * Math.abs(c) && fl(i, l);
    }
    if (t > 0 && ol(r[t - 1]) && ol(a) && ol(o) && a !== 0) {
      let s = Math.abs(r[t - 1]),
        c = Math.abs(a),
        l = Math.abs(o);
      if (r[t - 1] > 0 == a > 0 && a > 0 == o > 0 && c < s && c <= l) {
        let r = ll((t) => Math.abs(e(t)), n[t - 1], n[t + 1]),
          a = Math.abs(e(r));
        ol(a) && a <= rl * Math.max(s, l) && fl(i, r);
      }
    }
  }
  return i.sort((e, t) => e - t);
}
function ml(e, t) {
  let { t: n, v: r } = sl(e, t),
    i = [];
  for (let t = 1; t < n.length - 1; t++) {
    let a = r[t - 1],
      o = r[t],
      s = r[t + 1];
    if (!ol(a) || !ol(o) || !ol(s)) continue;
    let c = o > a && o >= s ? `maximum` : o < a && o <= s ? `minimum` : null;
    if (c === null) continue;
    let l = c === `maximum` ? -1 : 1,
      u = ll(
        (t) => {
          let n = e(t);
          return ol(n) ? l * n : 1 / 0;
        },
        n[t - 1],
        n[t + 1]
      ),
      d = e(u),
      f = Math.max(Math.abs(o - a), Math.abs(o - s));
    !ol(d) || Math.abs(d - o) > 4 * f || i.some((e) => dl(e.t, u)) || i.push({ t: u, kind: c });
  }
  return i.sort((e, t) => e.t - t.t);
}
var hl = [
    `zero`,
    `x-intercept`,
    `y-intercept`,
    `maximum`,
    `minimum`,
    `top`,
    `bottom`,
    `intersection`,
  ],
  gl = 0.1,
  _l = 2,
  vl = 1e-9,
  yl = 1e-7,
  bl = new Set([`maximum`, `minimum`, `top`, `bottom`]),
  xl = Number.isFinite;
function Sl(e) {
  let { left: t, right: n, bottom: r, top: i } = e.viewport,
    a = (n - t) * gl,
    o = (i - r) * gl;
  return { left: t - a, right: n + a, bottom: r - o, top: i + o };
}
function Cl(e) {
  switch (e.kind) {
    case `explicit`:
      return e.independent === `x` ? (t, n) => n - e.f(t) : (t, n) => t - e.f(n);
    case `implicit`:
      return e.F;
    case `lines`:
      return e.orientation === `vertical` ? (t) => e.f(t) : (t, n) => e.f(n);
  }
}
function wl(e, t, n, r) {
  let i = Sl(n),
    a = {
      x: (n.viewport.right - n.viewport.left) / n.size.width,
      y: (n.viewport.top - n.viewport.bottom) / n.size.height,
    },
    o = { lo: i.left, hi: i.right, samples: Math.ceil(n.size.width * 1.2 * _l) },
    s = { lo: i.bottom, hi: i.top, samples: Math.ceil(n.size.height * 1.2 * _l) },
    c = [],
    l = (e, t, n, r = null) => {
      xl(e) && xl(t) && c.push({ x: e, y: t, kind: n, withRowId: r });
    };
  switch ((r.check(), e.kind)) {
    case `explicit`: {
      let { f: n } = e,
        r = e.independent === `x`,
        i = r ? o : s,
        a = (e, t) => (r ? [e, t] : [t, e]);
      for (let e of pl(n, i)) l(...a(e, 0), `zero`);
      let c = n(0);
      0 >= i.lo && 0 <= i.hi && l(...a(0, c), r ? `y-intercept` : `x-intercept`);
      for (let e of ml(n, i)) l(...a(e.t, n(e.t)), e.kind);
      for (let e of t) {
        let t = Cl(e.curve);
        for (let o of pl((e) => (r ? t(e, n(e)) : t(n(e), e)), i))
          l(...a(o, n(o)), `intersection`, e.rowId);
      }
      break;
    }
    case `lines`: {
      let n = e.orientation === `vertical`;
      for (let r of pl(e.f, n ? o : s)) {
        n ? l(r, 0, `x-intercept`) : l(0, r, `y-intercept`);
        for (let e of t) {
          let t = Cl(e.curve);
          for (let i of pl((e) => (n ? t(r, e) : t(e, r)), n ? s : o))
            n ? l(r, i, `intersection`, e.rowId) : l(i, r, `intersection`, e.rowId);
        }
      }
      break;
    }
    case `implicit`: {
      let { F: c } = e;
      if (0 >= i.bottom && 0 <= i.top) for (let e of pl((e) => c(e, 0), o)) l(e, 0, `x-intercept`);
      if (0 >= i.left && 0 <= i.right) for (let e of pl((e) => c(0, e), s)) l(0, e, `y-intercept`);
      r.check();
      let u = Yc(c, i, n, r);
      for (let e of Qc(c, u, a)) l(e.x, e.y, e.kind);
      r.check();
      for (let e of t) {
        let t = e.curve;
        if (t.kind === `explicit`) {
          let { f: n } = t,
            r = t.independent === `x`;
          for (let t of pl((e) => (r ? c(e, n(e)) : c(n(e), e)), r ? o : s))
            r ? l(t, n(t), `intersection`, e.rowId) : l(n(t), t, `intersection`, e.rowId);
        } else if (t.kind === `lines`) {
          let n = t.orientation === `vertical`;
          for (let r of pl(t.f, n ? o : s))
            for (let t of pl((e) => (n ? c(r, e) : c(e, r)), n ? s : o))
              n ? l(r, t, `intersection`, e.rowId) : l(t, r, `intersection`, e.rowId);
        } else for (let [n, r] of el(c, t.F, u, a)) l(n, r, `intersection`, e.rowId);
      }
      break;
    }
  }
  return Tl(c, n);
}
function Tl(e, t) {
  let n = new Map();
  for (let t of e) n.set(t.kind, (n.get(t.kind) ?? 0) + 1);
  let r = [];
  for (let t of e) {
    if ((n.get(t.kind) ?? 0) > 100) continue;
    let e = r.find((e) => {
      let n = bl.has(t.kind) || e.kinds.some((e) => bl.has(e)) ? yl : vl;
      return (
        Math.abs(e.x - t.x) <= n * Math.max(1, Math.abs(t.x)) &&
        Math.abs(e.y - t.y) <= n * Math.max(1, Math.abs(t.y))
      );
    });
    e === void 0
      ? r.push({ x: t.x, y: t.y, kinds: [t.kind], withRowId: t.withRowId })
      : (e.kinds.includes(t.kind) || e.kinds.push(t.kind), (e.withRowId ??= t.withRowId));
  }
  let { left: i, right: a, bottom: o, top: s } = t.viewport;
  return r
    .filter((e) => e.x >= i && e.x <= a && e.y >= o && e.y <= s)
    .map((e) => ({
      ...e,
      x: e.x === 0 ? 0 : e.x,
      y: e.y === 0 ? 0 : e.y,
      kinds: [...e.kinds].sort((e, t) => hl.indexOf(e) - hl.indexOf(t)),
    }))
    .sort((e, t) => e.x - t.x || e.y - t.y);
}
var El = (e, t) => ({ kind: `sub`, left: e, right: t, span: e.span }),
  Dl = (e, t) => e.kind === `id` && e.name === t,
  Ol = (e, t) => ar(e).some((e) => e.name === t);
function kl(e, t) {
  let n = e.graph;
  if (n === null) return [];
  switch (n.kind) {
    case `explicit`:
      return [{ kind: `explicit`, independent: n.independent, f: xc(n.expr, n.independent, t) }];
    case `implicit`:
      return [{ kind: `implicit`, F: Sc(n.expr, t) }];
    case `lines`:
      return [
        {
          kind: `lines`,
          orientation: n.orientation,
          f: xc(n.expr, n.orientation === `vertical` ? `x` : `y`, t),
        },
      ];
    case `region`: {
      let e = [];
      for (let r = 0; r + 1 < n.operands.length; r++) {
        let i = n.operands[r],
          a = n.operands[r + 1],
          o = [`y`, `x`].find((e) => (Dl(i, e) && !Ol(a, e)) || (Dl(a, e) && !Ol(i, e)));
        if (o !== void 0) {
          let n = Dl(i, o) ? a : i,
            r = o === `y` ? `x` : `y`;
          e.push({ kind: `explicit`, independent: r, f: xc(n, r, t) });
        } else e.push({ kind: `implicit`, F: Sc(El(i, a), t) });
      }
      return e;
    }
    default:
      return [];
  }
}
function Al(e, t, n, r, i) {
  let a = t.byId.get(e);
  if (a === void 0 || !a.isGraphable) return [];
  let o = t.rows.flatMap((t) =>
      t.id !== e && t.isGraphable ? kl(t, n).map((e) => ({ rowId: t.id, curve: e })) : []
    ),
    s = kl(a, n);
  return s.length === 1
    ? wl(s[0], o, r, i)
    : s.flatMap((e) => wl(e, o, r, i)).sort((e, t) => e.x - t.x || e.y - t.y);
}
var jl = [`c1`, `c2`, `c3`, `c5`, `c4`, `c6`],
  Ml = [`c1`, `c2`, `#388c46`, `c4`, `c6`],
  Nl = 0.4;
function Pl(e) {
  return `#${(16777215 - Number.parseInt(e.slice(1), 16)).toString(16).padStart(6, `0`)}`;
}
var Fl = {
    classic: {
      normal: {
        dark: !1,
        roles: {
          paper: `#ffffff`,
          list: `#ffffff`,
          chrome: `#f0f0f0`,
          key: `#ffffff`,
          keyOperator: `#ededed`,
          accent: `#2f72dc`,
          text: `#000000`,
          textSecondary: `#666666`,
          error: `#ce4945`,
          warning: `#e66b3c`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#191919`,
          gridMajor: `#999999`,
          gridMinor: `#e0e0e0`,
          focusRing: `#005fcc`,
          focusBar: `#2f72dc`,
          focusBarLabel: `#ffffff`,
          accentLabel: `#ffffff`,
          boundary: `#bbbbbb`,
          selection: `#b4d5fe`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    observatory: {
      normal: {
        dark: !0,
        roles: {
          paper: `#111c19`,
          list: `#1b2b25`,
          chrome: `#111c19`,
          key: `#293c32`,
          keyOperator: `#1b2b25`,
          accent: `#d8bc7d`,
          text: `#f4f3e7`,
          textSecondary: `#bfcdc1`,
          error: `#f2a5bd`,
          warning: `#fa7e19`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#f4f3e7`,
          gridMajor: `#77817a`,
          gridMinor: `#303a36`,
          focusRing: `#92cced`,
          focusBar: `#92cced`,
          focusBarLabel: `#111c19`,
          accentLabel: `#111c19`,
          boundary: `#74877a`,
          selection: `#3f5b61`,
        },
        curves: {
          c1: `#38bbbf`,
          c2: `#d28f4c`,
          c3: `#cb7abc`,
          c4: `#9fbd59`,
          c5: `#0581e6`,
          c6: `#ffffff`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    charcoal: {
      normal: {
        dark: !0,
        roles: {
          paper: `#101319`,
          list: `#1b2029`,
          chrome: `#101319`,
          key: `#272f3a`,
          keyOperator: `#1b2029`,
          accent: `#dcc089`,
          text: `#eef2fa`,
          textSecondary: `#b7c3d4`,
          error: `#ffa0b7`,
          warning: `#fa7e19`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#eef2fa`,
          gridMajor: `#6c737c`,
          gridMinor: `#2f343c`,
          focusRing: `#79c9ff`,
          focusBar: `#79c9ff`,
          focusBarLabel: `#101319`,
          accentLabel: `#101319`,
          boundary: `#6a7a8f`,
          selection: `#375369`,
        },
        curves: {
          c1: `#38bbbf`,
          c2: `#d28f4c`,
          c3: `#cb7abc`,
          c4: `#9fbd59`,
          c5: `#0581e6`,
          c6: `#ffffff`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    forest: {
      normal: {
        dark: !0,
        roles: {
          paper: `#0c1814`,
          list: `#172820`,
          chrome: `#0c1814`,
          key: `#23392e`,
          keyOperator: `#172820`,
          accent: `#dfc986`,
          text: `#eef5e9`,
          textSecondary: `#b9cbbd`,
          error: `#f5a4b8`,
          warning: `#fa7e19`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#eef5e9`,
          gridMajor: `#758079`,
          gridMinor: `#2e3833`,
          focusRing: `#86cfff`,
          focusBar: `#86cfff`,
          focusBarLabel: `#0c1814`,
          accentLabel: `#0c1814`,
          boundary: `#668574`,
          selection: `#385a63`,
        },
        curves: {
          c1: `#38bbbf`,
          c2: `#d28f4c`,
          c3: `#cb7abc`,
          c4: `#9fbd59`,
          c5: `#0581e6`,
          c6: `#ffffff`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    ivory: {
      normal: {
        dark: !1,
        roles: {
          paper: `#fffdf7`,
          list: `#fffdf7`,
          chrome: `#e8ede4`,
          key: `#fffdf7`,
          keyOperator: `#f8f6ef`,
          accent: `#6f521c`,
          text: `#23332f`,
          textSecondary: `#405044`,
          error: `#8f375d`,
          warning: `#d46700`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#23332f`,
          gridMajor: `#868e85`,
          gridMinor: `#ced3c8`,
          focusRing: `#285b79`,
          focusBar: `#285b79`,
          focusBarLabel: `#fffdf7`,
          accentLabel: `#fffdf7`,
          boundary: `#7a8978`,
          selection: `#bfccd1`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    paper: {
      normal: {
        dark: !1,
        roles: {
          paper: `#ffffff`,
          list: `#ffffff`,
          chrome: `#e8edf4`,
          key: `#ffffff`,
          keyOperator: `#f5f7fa`,
          accent: `#6d531f`,
          text: `#18283c`,
          textSecondary: `#3e4e64`,
          error: `#9c2f5c`,
          warning: `#d66800`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#18283c`,
          gridMajor: `#8d949d`,
          gridMinor: `#cdd4dd`,
          focusRing: `#145e99`,
          focusBar: `#0f5b96`,
          focusBarLabel: `#ffffff`,
          accentLabel: `#ffffff`,
          boundary: `#77879d`,
          selection: `#b9cfe0`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    sand: {
      normal: {
        dark: !1,
        roles: {
          paper: `#fbf6ee`,
          list: `#fbf6ee`,
          chrome: `#e7dccb`,
          key: `#fbf6ee`,
          keyOperator: `#f1e8db`,
          accent: `#6c4e19`,
          text: `#32281e`,
          textSecondary: `#514233`,
          error: `#932e52`,
          warning: `#c45f00`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#32281e`,
          gridMajor: `#8e867d`,
          gridMinor: `#d3cbc1`,
          focusRing: `#155988`,
          focusBar: `#135886`,
          focusBarLabel: `#fbf6ee`,
          accentLabel: `#fbf6ee`,
          boundary: `#8e7961`,
          selection: `#b6c7cf`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    sage: {
      normal: {
        dark: !1,
        roles: {
          paper: `#f6faf3`,
          list: `#f6faf3`,
          chrome: `#dce8d8`,
          key: `#f6faf3`,
          keyOperator: `#eaf0e8`,
          accent: `#665118`,
          text: `#243b2c`,
          textSecondary: `#354f3c`,
          error: `#8f3459`,
          warning: `#cd6300`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#243b2c`,
          gridMajor: `#8a938a`,
          gridMinor: `#c7d0c6`,
          focusRing: `#165b86`,
          focusBar: `#125883`,
          focusBarLabel: `#f6faf3`,
          accentLabel: `#f6faf3`,
          boundary: `#6e8770`,
          selection: `#b3cad2`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    lavender: {
      normal: {
        dark: !1,
        roles: {
          paper: `#faf8ff`,
          list: `#faf8ff`,
          chrome: `#e2daf0`,
          key: `#faf8ff`,
          keyOperator: `#efebf6`,
          accent: `#704e18`,
          text: `#342944`,
          textSecondary: `#4e3f5c`,
          error: `#92305a`,
          warning: `#c45f00`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#342944`,
          gridMajor: `#8e8a94`,
          gridMinor: `#d0ccd7`,
          focusRing: `#285992`,
          focusBar: `#25568f`,
          focusBarLabel: `#faf8ff`,
          accentLabel: `#faf8ff`,
          boundary: `#86769c`,
          selection: `#bbc8de`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    peach: {
      normal: {
        dark: !1,
        roles: {
          paper: `#fff8f2`,
          list: `#fff8f2`,
          chrome: `#efdacd`,
          key: `#fff8f2`,
          keyOperator: `#f7eae0`,
          accent: `#724d15`,
          text: `#432d26`,
          textSecondary: `#5b3f34`,
          error: `#963050`,
          warning: `#c76000`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#432d26`,
          gridMajor: `#988d87`,
          gridMinor: `#d8ccc5`,
          focusRing: `#155986`,
          focusBar: `#155986`,
          focusBarLabel: `#fff8f2`,
          accentLabel: `#fff8f2`,
          boundary: `#987464`,
          selection: `#b9c8d2`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    rose: {
      normal: {
        dark: !1,
        roles: {
          paper: `#fff7fa`,
          list: `#fff7fa`,
          chrome: `#ecd8e1`,
          key: `#fff7fa`,
          keyOperator: `#f6e8ed`,
          accent: `#714c18`,
          text: `#482a3b`,
          textSecondary: `#5b3a4c`,
          error: `#952d5c`,
          warning: `#c45f00`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#482a3b`,
          gridMajor: `#988d93`,
          gridMinor: `#d8cbd2`,
          focusRing: `#285c8e`,
          focusBar: `#225688`,
          focusBarLabel: `#fff7fa`,
          accentLabel: `#fff7fa`,
          boundary: `#987187`,
          selection: `#bfc8da`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    blush: {
      normal: {
        dark: !1,
        roles: {
          paper: `#fff9f7`,
          list: `#fff9f7`,
          chrome: `#f0ddda`,
          key: `#fff9f7`,
          keyOperator: `#faeeed`,
          accent: `#724e15`,
          text: `#472d33`,
          textSecondary: `#5d3f47`,
          error: `#992956`,
          warning: `#c96100`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#472d33`,
          gridMajor: `#9a8d90`,
          gridMinor: `#dbccce`,
          focusRing: `#265b8a`,
          focusBar: `#235887`,
          focusBarLabel: `#fff9f7`,
          accentLabel: `#fff9f7`,
          boundary: `#9b757d`,
          selection: `#becad6`,
        },
        curves: {
          c1: `#c74440`,
          c2: `#2d70b3`,
          c3: `#348543`,
          c4: `#6042a6`,
          c5: `#fa7e19`,
          c6: `#000000`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
    plum: {
      normal: {
        dark: !0,
        roles: {
          paper: `#201321`,
          list: `#302034`,
          chrome: `#201321`,
          key: `#412c46`,
          keyOperator: `#302034`,
          accent: `#e8c488`,
          text: `#f9edf8`,
          textSecondary: `#d2bbd4`,
          error: `#ffa1c6`,
          warning: `#fa7e19`,
          tooltipLabel: `#ffffff`,
          tooltip: `#000000`,
          axis: `#f9edf8`,
          gridMajor: `#898189`,
          gridMinor: `#3b343b`,
          focusRing: `#96ceff`,
          focusBar: `#96ceff`,
          focusBarLabel: `#201321`,
          accentLabel: `#201321`,
          boundary: `#98769c`,
          selection: `#4f5471`,
        },
        curves: {
          c1: `#38bbbf`,
          c2: `#d28f4c`,
          c3: `#cb7abc`,
          c4: `#9fbd59`,
          c5: `#0581e6`,
          c6: `#ffffff`,
        },
        fillAlpha: { c1: 0.4, c2: 0.4, c3: 0.4, c4: 0.4, c5: 0.4, c6: 0.4 },
      },
    },
  },
  Il = [
    `classic`,
    `observatory`,
    `charcoal`,
    `forest`,
    `ivory`,
    `paper`,
    `sand`,
    `sage`,
    `lavender`,
    `peach`,
    `rose`,
    `blush`,
    `plum`,
  ],
  Ll = [
    `paper`,
    `list`,
    `chrome`,
    `key`,
    `keyOperator`,
    `accent`,
    `text`,
    `textSecondary`,
    `error`,
    `warning`,
    `tooltipLabel`,
    `tooltip`,
    `axis`,
    `gridMajor`,
    `gridMinor`,
    `focusRing`,
    `focusBar`,
    `focusBarLabel`,
    `accentLabel`,
    `boundary`,
    `selection`,
  ],
  Rl = [`c1`, `c2`, `c3`, `c4`, `c5`, `c6`],
  zl = {
    paper: `--kc-paper`,
    list: `--kc-list`,
    chrome: `--kc-chrome`,
    key: `--kc-key`,
    keyOperator: `--kc-key-operator`,
    accent: `--kc-accent`,
    text: `--kc-text`,
    textSecondary: `--kc-text-secondary`,
    error: `--kc-error`,
    warning: `--kc-warning`,
    tooltipLabel: `--kc-tooltip-label`,
    tooltip: `--kc-tooltip`,
    axis: `--kc-axis`,
    gridMajor: `--kc-grid-major`,
    gridMinor: `--kc-grid-minor`,
    focusRing: `--kc-focus-ring`,
    focusBar: `--kc-focus-bar`,
    focusBarLabel: `--kc-focus-bar-label`,
    accentLabel: `--kc-accent-label`,
    boundary: `--kc-boundary`,
    selection: `--kc-selection`,
  },
  Bl = {
    c1: `--kc-curve-1`,
    c2: `--kc-curve-2`,
    c3: `--kc-curve-3`,
    c4: `--kc-curve-4`,
    c5: `--kc-curve-5`,
    c6: `--kc-curve-6`,
  },
  Vl = {
    c1: `--kc-fill-alpha-1`,
    c2: `--kc-fill-alpha-2`,
    c3: `--kc-fill-alpha-3`,
    c4: `--kc-fill-alpha-4`,
    c5: `--kc-fill-alpha-5`,
    c6: `--kc-fill-alpha-6`,
  },
  Hl = /^#[0-9a-f]{6}$/i;
function Ul(e) {
  return Xl(e) ? e : `classic`;
}
function Wl(e) {
  let { roles: t, curves: n, fillAlpha: r } = Fl[e].normal;
  return `:host{${[...Ll.map((e) => `${zl[e]}:${t[e]}`), ...Rl.map((e) => `${Bl[e]}:${n[e]}`), ...Rl.map((e) => `${Vl[e]}:${String(r[e])}`)].join(`;`)}}`;
}
function Gl(e) {
  let t = Ml.length;
  return Ml[((e % t) + t) % t];
}
function Kl(e, t) {
  let n = e === `c3` ? Ml[2] : e === `c5` ? `c4` : e?.toLowerCase(),
    r = n === void 0 ? -1 : Ml.indexOf(n);
  return r < 0 ? Gl(t) : Ml[(r + 1) % Ml.length];
}
function ql(e, t) {
  let { dark: n, curves: r, fillAlpha: i } = Fl[t].normal;
  if (Yl(e)) return { hex: r[e], fillAlpha: i[e] };
  if (!Hl.test(e)) return ql(Rl[0], t);
  let a = e.toLowerCase();
  return { hex: n ? Pl(a) : a, fillAlpha: Nl };
}
function Jl(e, t) {
  return ql(e.toLowerCase() === `#388c46` ? `c3` : e, t).hex;
}
function Yl(e) {
  return Rl.includes(e);
}
function Xl(e) {
  return typeof e == `string` && Il.includes(e);
}
function Zl() {
  return new Worker(
    new URL(new URL(`compute.worker-DZHBYraC.js`, import.meta.url).href, `` + import.meta.url),
    { type: `module`, name: `karman-calculator` }
  );
}
function Ql(e) {
  switch (e.kind) {
    case `curve`:
      return [e.polylines, e.bands];
    case `lines`:
      return [e.positions];
    case `points`:
      return [e.coords];
    case `region`:
      return [e.spans, ...e.boundaries.flatMap(Ql)];
    case `table`:
      return e.series.map((e) => e.coords);
  }
}
function $l(e) {
  let t = [];
  for (let n of Ql(e)) {
    let e = n.buffer;
    t.includes(e) || t.push(e);
  }
  return t;
}
var eu = 4096,
  tu = 0.5,
  nu = 1,
  ru = 1e-6;
function iu(e, t) {
  let { viewport: n, size: r } = e;
  return t === `x`
    ? { t0: n.left, t1: n.right, tPx: r.width, v0: n.bottom, v1: n.top, vPx: r.height }
    : { t0: n.bottom, t1: n.top, tPx: r.height, v0: n.left, v1: n.right, vPx: r.width };
}
var au = class {
  constructor(e, t, n) {
    ((this.t = []),
      (this.v = []),
      (this.next = []),
      (this.col = []),
      (this.poleBreak = []),
      (this.pairColumn = (e) => [this.col[e], this.col[e]]),
      (this.turnColumns = (e) => [this.col[e.prev], this.col[e.k]]),
      (this.f = e),
      (this.frame = t),
      (this.budget = n));
    let r = Number.isFinite(t.tPx) ? Math.ceil(t.tPx) : 1;
    ((this.columns = Math.max(1, Math.min(r, eu, Math.floor((n.remaining - 1) / 2)))),
      (this.band = new Uint8Array(this.columns)));
    let i = t.v1 - t.v0;
    ((this.vScale = t.vPx / i), (this.guardLow = t.v0 - tu * i), (this.guardHigh = t.v1 + tu * i));
  }
  evaluate(e) {
    if (!this.budget.take()) return;
    let t = this.f(e);
    return Number.isFinite(t) ? t : NaN;
  }
  push(e, t, n, r) {
    return (
      this.t.push(e),
      this.v.push(t),
      this.next.push(n),
      this.col.push(r),
      this.poleBreak.push(0),
      this.t.length - 1
    );
  }
  insertAfter(e, t, n) {
    let r = this.push(t, n, this.next[e], this.col[e]);
    return ((this.next[e] = r), r);
  }
  jumpPx(e) {
    return Math.abs(this.v[this.next[e]] - this.v[e]) * this.vScale;
  }
  offView(e, t) {
    return (e > this.guardHigh && t > this.guardHigh) || (e < this.guardLow && t < this.guardLow);
  }
  midpoint(e, t) {
    let n = 0.5 * (this.t[e] + this.t[t]);
    return n > this.t[e] && n < this.t[t] ? n : NaN;
  }
  grid() {
    let { t0: e, t1: t } = this.frame,
      n = 2 * this.columns,
      r = (t - e) / this.columns;
    for (let i = 0; i <= n; i++) {
      let a = i === n ? t : e + (i * r) / 2,
        o = this.evaluate(a);
      (o === void 0 &&
        ((this.band[Math.max(0, Math.floor((i - 1) / 2))] = 1),
        (this.band[Math.min(this.columns - 1, Math.floor(i / 2))] = 1)),
        this.push(a, o ?? NaN, i < n ? i + 1 : -1, i < n ? Math.floor(i / 2) : -1));
    }
  }
  refineAll(e, t, n) {
    for (let r = 0; r < e.length; r++) {
      let [i, a] = n(e[r]);
      if (!this.band.subarray(i, a + 1).every((e) => e === 1) && !t(e[r])) {
        for (let t = r; t < e.length; t++) {
          let [r, i] = n(e[t]);
          this.band.fill(1, r, i + 1);
        }
        return;
      }
    }
  }
  poles() {
    let e = [];
    for (let t = 0; this.next[t] >= 0; t = this.next[t]) {
      let n = this.v[t],
        r = this.v[this.next[t]];
      if (Number.isNaN(n) || Number.isNaN(r) || this.offView(n, r)) continue;
      let i = this.jumpPx(t);
      (i > this.frame.vPx || (n * r < 0 && i > 1)) && e.push(t);
    }
    this.refineAll(e, (e) => this.bisectPole(e), this.pairColumn);
  }
  bisectPole(e) {
    let t = e;
    for (let e = 0; e < 30; e++) {
      let e = this.next[t],
        n = this.midpoint(t, e);
      if (Number.isNaN(n)) break;
      let r = this.evaluate(n);
      if (r === void 0) return !1;
      let i = this.insertAfter(t, n, r);
      if (
        Number.isNaN(r) ||
        (Math.abs(this.v[e] - r) > Math.abs(r - this.v[t]) && (t = i), this.jumpPx(t) <= 1)
      )
        return !0;
    }
    return (
      this.jumpPx(t) > this.frame.vPx ? (this.poleBreak[t] = 1) : (this.band[this.col[t]] = 1),
      !0
    );
  }
  edges() {
    let e = [];
    for (let t = 0; this.next[t] >= 0; t = this.next[t])
      Number.isNaN(this.v[t]) !== Number.isNaN(this.v[this.next[t]]) && e.push(t);
    this.refineAll(e, (e) => this.bisectEdge(e), this.pairColumn);
  }
  bisectEdge(e) {
    let t = e;
    for (let e = 0; e < 12; e++) {
      let e = this.midpoint(t, this.next[t]);
      if (Number.isNaN(e)) break;
      let n = this.evaluate(e);
      if (n === void 0) return !1;
      let r = this.insertAfter(t, e, n);
      Number.isNaN(n) === Number.isNaN(this.v[t]) && (t = r);
    }
    return !0;
  }
  breaks(e) {
    return Number.isNaN(this.v[e]) || Number.isNaN(this.v[this.next[e]]) || this.poleBreak[e] === 1;
  }
  turns() {
    let e = [],
      t = 0;
    for (let n = -1, r = 0; this.next[r] >= 0; n = r, r = this.next[r]) {
      if ((this.breaks(r) && t++, n < 0 || this.breaks(n) || this.breaks(r))) continue;
      let i = this.v[r] - this.v[n],
        a = this.v[this.next[r]] - this.v[r];
      ((i > 0 && a <= 0) || (i < 0 && a >= 0)) && e.push({ k: r, prev: n, max: i > 0, run: t });
    }
    return e;
  }
  oscillation() {
    let e = this.turns(),
      t = this.frame.tPx / (this.frame.t1 - this.frame.t0);
    for (let n = 1; n < e.length; n++) {
      let [r, i] = [e[n - 1], e[n]];
      r.run === i.run &&
        (this.t[i.k] - this.t[r.k]) * t < 2 &&
        Math.abs(this.v[i.k] - this.v[r.k]) * this.vScale >= nu &&
        this.band.fill(1, this.col[r.prev], this.col[i.k] + 1);
    }
  }
  split(e) {
    let t = this.midpoint(e, this.next[e]);
    if (Number.isNaN(t)) return -1;
    let n = this.evaluate(t);
    return n === void 0 ? void 0 : this.insertAfter(e, t, n);
  }
  extrema() {
    let e = this.turns().filter(
      ({ k: e, prev: t }) =>
        (!this.offView(this.v[t], this.v[e]) || !this.offView(this.v[e], this.v[this.next[e]])) &&
        Math.max(this.jumpPx(t), this.jumpPx(e)) >= ru
    );
    this.refineAll(e, (e) => this.refineTurn(e), this.turnColumns);
  }
  refineTurn(e) {
    let t = e.k,
      n = e.prev;
    for (; this.next[n] !== t; ) n = this.next[n];
    let r = (t, n) => t >= 0 && (e.max ? this.v[t] > this.v[n] : this.v[t] < this.v[n]);
    for (let e = 0; e < 5; e++) {
      let e = this.split(n);
      if (e === void 0) return !1;
      let i = this.split(t);
      if (i === void 0) return !1;
      if (e < 0 && i < 0) break;
      r(e, t) && !r(i, e) ? (t = e) : r(i, t) ? ([n, t] = [t, i]) : e >= 0 && (n = e);
    }
    return !0;
  }
  holdsVisiblePair(e) {
    for (let t = 2 * e; t !== 2 * e + 2; t = this.next[t])
      if (!this.offView(this.v[t], this.v[this.next[t]])) return !0;
    return !1;
  }
  bandSamples() {
    let e = [];
    for (let t = 0; t < this.columns; t++)
      this.band[t] === 1 && this.holdsVisiblePair(t) && e.push(t);
    if (e.length === 0) return;
    let t = Math.min(64, Math.floor(this.budget.remaining / e.length)),
      n = (this.frame.t1 - this.frame.t0) / this.columns;
    for (let r of e) {
      let e = 2 * r + 2,
        i = 2 * r;
      for (let a = 0; a < t; a++) {
        let o = this.t[2 * r] + ((a + 0.5) * n) / t;
        for (; this.next[i] !== e && this.t[this.next[i]] <= o; ) i = this.next[i];
        if (!(o > this.t[i] && o < this.t[this.next[i]])) continue;
        let s = this.evaluate(o);
        if (s === void 0) return;
        i = this.insertAfter(i, o, s);
      }
    }
  }
  crossing(e, t, n) {
    let [r, i] = [this.t[e], this.v[e]];
    return [r + ((n - i) / (this.v[t] - i)) * (this.t[t] - r), n];
  }
  endpoint(e, t, n) {
    let r = this.v[n];
    return r > this.guardHigh
      ? [...this.crossing(e, t, this.guardHigh), !0]
      : r < this.guardLow
        ? [...this.crossing(e, t, this.guardLow), !0]
        : [this.t[n], r, !1];
  }
  assemble() {
    let { v0: e, v1: t } = this.frame,
      n = [],
      r = new Float64Array(this.columns).fill(1 / 0),
      i = new Float64Array(this.columns).fill(-1 / 0),
      a = -1;
    for (let o = 0; this.next[o] >= 0; o = this.next[o]) {
      let s = this.next[o],
        c = this.col[o],
        [l, u] = [this.v[o], this.v[s]];
      if (this.band[c] === 1) {
        for (let e of [l, u])
          Number.isNaN(e) || ((r[c] = Math.min(r[c], e)), (i[c] = Math.max(i[c], e)));
        a = -1;
        continue;
      }
      let d = (l > t && u > t) || (l < e && u < e);
      if (Number.isNaN(l) || Number.isNaN(u) || this.poleBreak[o] === 1 || d) continue;
      let [f, p] = this.endpoint(o, s, o),
        [m, h, g] = this.endpoint(o, s, s);
      (a !== o && (n.length > 0 && n.push(NaN, NaN), n.push(f, p)), n.push(m, h), (a = g ? -1 : s));
    }
    let o = [];
    for (let e = 0; e < this.columns; e++) {
      if (this.band[e] === 0 || r[e] > i[e]) continue;
      let t = Math.max(r[e], this.guardLow),
        n = Math.min(i[e], this.guardHigh);
      t <= n && o.push(this.t[2 * e], this.t[2 * e + 2], t, n);
    }
    return { polyline: n, bands: o };
  }
};
function ou(e, t, n) {
  let r = new au(e, t, n);
  return (
    r.grid(),
    r.poles(),
    r.oscillation(),
    r.edges(),
    r.extrema(),
    r.bandSamples(),
    r.assemble()
  );
}
function su(e, t, n, r, i) {
  let a = new jc(Oc, i),
    { polyline: o, bands: s } = ou(n, iu(r, t), a);
  if (t === `y`) {
    for (let e = 0; e + 1 < o.length; e += 2) [o[e], o[e + 1]] = [o[e + 1], o[e]];
    for (let e = 0; e + 3 < s.length; e += 4)
      [s[e], s[e + 1], s[e + 2], s[e + 3]] = [s[e + 2], s[e + 3], s[e], s[e + 1]];
  }
  return {
    rowId: e,
    kind: `curve`,
    polylines: Float64Array.from(o),
    bands: Float64Array.from(s),
    dashed: !1,
    evaluations: a.used,
  };
}
var cu = 1e-9;
function lu(e, t) {
  return (e < 0 && t > 0) || (e > 0 && t < 0);
}
var uu = class {
  constructor(e, t, n, r, i) {
    ((this.f = e), (this.budget = i));
    let a = 2 * r;
    ((this.spacing = (n - t) / a),
      (this.t = new Float64Array(a + 1)),
      (this.v = new Float64Array(a + 1)));
    for (let e = 0; e <= a; e++)
      ((this.t[e] = t + (e * (n - t)) / a), (this.v[e] = this.evaluate(this.t[e]) ?? NaN));
  }
  evaluate(e) {
    if (!this.budget.take()) return;
    let t = this.f(e);
    return Number.isFinite(t) ? t : NaN;
  }
  roots() {
    let { t: e, v: t } = this,
      n = [],
      r = (e) => {
        typeof e == `number` && n.push(e);
      };
    for (let i = 0; i < e.length; i++)
      t[i] === 0
        ? n.push(e[i])
        : (this.touches(i) && r(this.touchingRoot(i)),
          i + 1 < e.length && lu(t[i], t[i + 1]) && r(this.bracketRoot(i)));
    return n.sort((e, t) => e - t);
  }
  bracketRoot(e) {
    let t = Math.min(Math.abs(this.v[e]), Math.abs(this.v[e + 1])),
      [n, r, i, a] = [this.t[e], this.t[e + 1], this.v[e], this.v[e + 1]];
    for (let e = 0; e < 10; e++) {
      let e = 0.5 * (n + r);
      if (!(e > n && e < r)) break;
      let t = this.evaluate(e);
      if (t === void 0) return;
      if (t === 0) return e;
      if (Number.isNaN(t)) return null;
      Math.sign(t) === Math.sign(i) ? ([n, i] = [e, t]) : ([r, a] = [e, t]);
    }
    let o = 0.5 * (n + r),
      s = this.evaluate(o);
    if (s !== void 0)
      return Number.isNaN(s) || (Math.abs(s) > t && Math.min(Math.abs(i), Math.abs(a)) > t)
        ? null
        : o;
  }
  touches(e) {
    if (e === 0 || e + 1 >= this.t.length) return !1;
    let [t, n, r] = [this.v[e - 1], this.v[e], this.v[e + 1]];
    return (
      ((t > 0 && n > 0 && r > 0) || (t < 0 && n < 0 && r < 0)) &&
      Math.abs(n) < Math.abs(t) &&
      Math.abs(n) <= Math.abs(r)
    );
  }
  touchingRoot(e) {
    let t = this.v[e] > 0 ? 1 : -1,
      n = cu * Math.max(Math.abs(this.v[e - 1]), Math.abs(this.v[e + 1])),
      [r, i, a] = [this.t[e], t * this.v[e], this.spacing];
    for (let e = 0; e < 16; e++) {
      a /= 2;
      let [e, n] = [r - a, r + a];
      if (e === r && n === r) break;
      let o = r;
      for (let a of [e, n]) {
        if (a === r) continue;
        let e = this.evaluate(a);
        if (e === void 0) return;
        let n = t * e;
        if (n <= 0) return a;
        n < i && ([o, i] = [a, n]);
      }
      r = o;
    }
    return i <= n ? r : null;
  }
};
function du(e, t, n, r, i) {
  let { viewport: a, size: o } = r,
    [s, c, l] = t === `vertical` ? [a.left, a.right, o.width] : [a.bottom, a.top, o.height],
    u = Math.max(1, Math.min(Number.isFinite(l) ? Math.ceil(l) : 1, eu)),
    d = new jc(Oc, i),
    f = new uu(n, s, c, u, d).roots();
  return {
    rowId: e,
    kind: `lines`,
    orientation: t,
    positions: Float64Array.from(f),
    dashed: !1,
    evaluations: d.used,
  };
}
function fu(e, t) {
  let n = [];
  for (let e of t) Number.isFinite(e[0]) && Number.isFinite(e[1]) && n.push(e[0], e[1]);
  return { rowId: e, kind: `points`, coords: Float64Array.from(n), evaluations: 0 };
}
function pu(e, t) {
  switch (e) {
    case `<`:
      return t < 0;
    case `<=`:
      return t <= 0;
    case `>`:
      return t > 0;
    case `>=`:
      return t >= 0;
  }
}
function mu(e, t, n) {
  let { width: r, height: i } = n.size,
    a = (n, r) => {
      for (let i = 0; i < t.length; i++) if (!pu(t[i], e.pixelValue(n, r, i))) return !1;
      return !0;
    },
    o = [];
  for (let t = 0; t < e.height; t++) {
    let n = -1;
    for (let s = 0; s <= e.width; s++) {
      let c = s < e.width && a(s, t);
      c && n < 0
        ? (n = s)
        : !c && n >= 0 && (o.push(t, Math.min(t + 1, i), n, Math.min(s, r)), (n = -1));
    }
  }
  return o;
}
function hu(e, t, n, r, i) {
  let a = new jc(kc, i),
    o = new Float64Array(t.length),
    s = Hc(
      r,
      n.length,
      t.length,
      (e, r, i) => {
        for (let n = 0; n < t.length; n++) o[n] = t[n](e, r);
        for (let e = 0; e < n.length; e++) i[e] = o[e] - o[e + 1];
      },
      a
    ),
    c = n.map((t, n) => {
      let { polylines: i, bands: a } = Uc(s, n, r);
      return {
        rowId: e,
        kind: `curve`,
        polylines: Float64Array.from(i),
        bands: Float64Array.from(a),
        dashed: t === `<` || t === `>`,
        evaluations: 0,
      };
    });
  return {
    rowId: e,
    kind: `region`,
    spans: Float32Array.from(mu(s, n, r)),
    boundaries: c,
    evaluations: a.used,
  };
}
function gu(e, t, n) {
  let { width: r, height: i } = n.size;
  return {
    rowId: e,
    kind: `region`,
    spans: Float32Array.from(t ? [0, i, 0, r] : []),
    boundaries: [],
    evaluations: 0,
  };
}
var _u = ({ size: e }) =>
  Number.isFinite(e.width) && Number.isFinite(e.height) && e.width >= 1 && e.height >= 1;
function vu(e) {
  let { rowId: t } = e;
  switch (e.kind) {
    case `explicit`:
    case `implicit`:
      return {
        rowId: t,
        kind: `curve`,
        polylines: Float64Array.from([]),
        bands: Float64Array.from([]),
        dashed: !1,
        evaluations: 0,
      };
    case `lines`:
      return {
        rowId: t,
        kind: `lines`,
        orientation: e.orientation,
        positions: Float64Array.from([]),
        dashed: !1,
        evaluations: 0,
      };
    case `points`:
      return fu(t, e.points);
    case `region`:
    case `constant-region`:
      return {
        rowId: t,
        kind: `region`,
        spans: Float32Array.from([]),
        boundaries: [],
        evaluations: 0,
      };
  }
}
function yu(e, t, n) {
  if (!_u(t)) return vu(e);
  switch (e.kind) {
    case `explicit`:
      return su(e.rowId, e.independent, e.f, t, n);
    case `implicit`:
      return Gc(e.rowId, e.F, t, n);
    case `lines`:
      return du(e.rowId, e.orientation, e.f, t, n);
    case `points`:
      return fu(e.rowId, e.points);
    case `region`:
      return hu(e.rowId, e.terms, e.ops, t, n);
    case `constant-region`:
      return gu(e.rowId, e.holds, t);
  }
}
function bu(e, t, n) {
  let r = n.columns[0]?.values ?? [],
    i = [];
  return (
    t.columns.forEach((e, t) => {
      if (t === 0 || e.hidden || (e.role !== `data` && e.role !== `computed`)) return;
      let a = n.columns[t]?.values ?? [],
        o = [];
      (r.forEach((e, t) => {
        let n = a[t];
        e !== null && n != null && o.push(e, n);
      }),
        i.push({ column: t, coords: Float64Array.from(o) }));
    }),
    { kind: `table`, rowId: e, evaluations: 0, series: i }
  );
}
var xu = class {
  constructor(e, t) {
    ((this.sliceStart = -1 / 0),
      (this.lastPost = -1 / 0),
      (this.timing = e),
      (this.postHeartbeat = t));
  }
  startSlice() {
    this.sliceStart = this.timing.now();
  }
  shouldYield() {
    return this.timing.now() - this.sliceStart >= this.timing.sliceMs;
  }
  notePost() {
    this.lastPost = this.timing.now();
  }
  pulse() {
    let { heartbeatMs: e, sliceMs: t } = this.timing;
    this.timing.now() - this.lastPost >= e - t && (this.postHeartbeat(), this.notePost());
  }
};
function Su(e) {
  let { clock: t, now: n, limitMs: r, rowId: i, onExpire: a } = e;
  if (r === null) return { check: () => t.pulse() };
  let o = n() + r,
    s = !1;
  return {
    check() {
      if ((t.pulse(), !s && n() >= o && ((s = !0), a?.(i)), s)) throw new ie(i);
    },
  };
}
var Cu = Object.freeze({ analyzeRows: xi, evaluateRows: Tc, plotInputFor: Dc, plotRow: yu });
function wu(e, t) {
  let n = t instanceof Error ? t.name : typeof t;
  e.post({ v: 1, type: `fault`, generation: e.generation, message: n });
}
function Tu(e, t) {
  let n = new Map();
  return (r) => {
    let i = n.get(r);
    if (i !== void 0) return i;
    let a = Su({ clock: e.clock, now: e.now, limitMs: 250, rowId: r, onExpire: () => t.add(r) });
    return (e.post({ v: 1, type: `begin`, generation: e.generation, rowId: r }), n.set(r, a), a);
  };
}
function Eu(e, t, n, r = Cu) {
  let i = e.map(({ id: e, latex: t, hidden: n, columns: r, logMode: i }) =>
      r === null
        ? { id: e, latex: t, hidden: n, logMode: i }
        : { id: e, latex: t, hidden: n, columns: r }
    ),
    a = r.analyzeRows(i, t),
    o = new Set(),
    s = a,
    c = new Map(),
    l = new Map(),
    u = new Map();
  for (;;)
    try {
      ((l = new Map()),
        (u = new Map()),
        (c = r.evaluateRows(s, t, Tu(n, o), {
          table: (e, t) => l.set(e, t),
          regression: (e, t) => u.set(e, t),
        })));
      break;
    } catch (e) {
      if (e instanceof ie && e.rowId !== null) {
        let { rowId: n } = e;
        if (s.byId.has(n)) {
          o.add(n);
          let e = i.filter((e) => !o.has(e.id));
          s = r.analyzeRows(e, t);
          continue;
        }
      }
      (wu(n, e), (c = new Map()));
      break;
    }
  let { generation: d } = n;
  for (let e of a.rows) {
    let { id: t, kind: r, error: i, isGraphable: a } = e;
    if (
      (n.post({
        v: 1,
        type: `analysis`,
        generation: d,
        rowId: t,
        analysis: { kind: r, error: i, isGraphable: a },
      }),
      o.has(t))
    )
      n.post({ v: 1, type: `overrun`, generation: d, rowId: t });
    else {
      let e = c.get(t) ?? W;
      n.post({ v: 1, type: `value`, generation: d, rowId: t, jobId: null, value: e });
      let r = l.get(t);
      r !== void 0 && n.post({ v: 1, type: `table`, generation: d, rowId: t, table: r });
      let i = u.get(t);
      i !== void 0 && n.post({ v: 1, type: `regression`, generation: d, rowId: t, result: i });
    }
  }
  let f = Ec(s, c, t);
  return { analysis: s, values: c, tables: l, scope: f, overrun: o };
}
function Du(e, t, n, r, i = Cu) {
  if (t.overrun.has(e.id)) return;
  let { generation: a } = r,
    o = e.id;
  if (e.kind === `table`) {
    let n = t.tables.get(o);
    if (e.table === void 0 || n === void 0) return;
    let i = bu(o, e.table, n);
    r.post({ v: 1, type: `plot`, generation: a, rowId: o, geometry: i }, $l(i));
  } else
    try {
      let s = i.plotInputFor(e, t.scope, t.values.get(o) ?? null);
      if (s === null) return;
      r.post({ v: 1, type: `begin`, generation: a, rowId: o });
      let c = Su({ clock: r.clock, now: r.now, limitMs: null, rowId: o }),
        l = i.plotRow(s, n, c);
      r.post({ v: 1, type: `plot`, generation: a, rowId: o, geometry: l }, $l(l));
    } catch (e) {
      wu(r, e);
    }
}
function Ou(e, t) {
  return Wn(e, { userFunctions: ki(t.functions) });
}
function ku(e, t, n) {
  let r = W;
  try {
    let i = Ou(e.latex, t.analysis);
    if (i.ok && i.tree.kind !== `rel`) {
      let e = Su({ clock: n.clock, now: n.now, limitMs: 250, rowId: null });
      r = lc(i.tree, t.scope)({}, e);
    }
  } catch (e) {
    e instanceof ie || wu(n, e);
  }
  let { generation: i } = n;
  n.post({ v: 1, type: `value`, generation: i, rowId: null, jobId: e.jobId, value: r });
}
function Au(e, t, n, r) {
  let { generation: i } = r;
  try {
    let a = Su({ clock: r.clock, now: r.now, limitMs: 500, rowId: e }),
      o = t.overrun.has(e) ? [] : Al(e, t.analysis, t.scope, n, a);
    r.post({ v: 1, type: `poi`, generation: i, rowId: e, points: o });
  } catch (e) {
    e instanceof ie || wu(r, e);
  }
}
var ju = `karman-compute`,
  Mu = (e) => typeof e == `object` && !!e && !Array.isArray(e),
  Nu = (e) => typeof e == `number`,
  Pu = (e) => typeof e == `string`,
  Fu = (e, t) => Mu(e) && Pu(e[t]),
  Iu = (e, t) => Mu(e) && t.every((t) => Nu(e[t]));
function Lu(e) {
  return Mu(e) && e.v === 1;
}
function Ru(e) {
  return (
    Mu(e) && Pu(e.kind) && (e.error === null || Mu(e.error)) && typeof e.isGraphable == `boolean`
  );
}
function zu(e) {
  if (!Lu(e)) return !1;
  let t = e;
  switch (t.type) {
    case `ready`:
      return t.worker === ju;
    case `poi`:
      return (
        Nu(t.generation) &&
        Pu(t.rowId) &&
        Array.isArray(t.points) &&
        t.points.every((e) => Iu(e, [`x`, `y`]) && Array.isArray(e.kinds))
      );
    case `table`:
      return Nu(t.generation) && Pu(t.rowId) && Mu(t.table) && Array.isArray(t.table.columns);
    case `regression`:
      return (
        Nu(t.generation) &&
        Pu(t.rowId) &&
        Mu(t.result) &&
        typeof t.result.ok == `boolean` &&
        Array.isArray(t.result.params) &&
        Array.isArray(t.result.residuals)
      );
    case `begin`:
    case `overrun`:
      return Nu(t.generation) && Pu(t.rowId);
    case `analysis`:
      return Nu(t.generation) && Pu(t.rowId) && Ru(t.analysis);
    case `value`:
      return (
        Nu(t.generation) &&
        (t.rowId === null || Pu(t.rowId)) &&
        (t.jobId === null || Nu(t.jobId)) &&
        Fu(t.value, `type`)
      );
    case `plot`:
      return Nu(t.generation) && Pu(t.rowId) && Fu(t.geometry, `kind`);
    case `heartbeat`:
    case `done`:
      return Nu(t.generation);
    case `fault`:
      return (t.generation === null || Nu(t.generation)) && Pu(t.message);
    default:
      return !1;
  }
}
function Bu(e) {
  e.unref?.();
}
function Vu() {
  let e = null,
    t = !1,
    n = [],
    r = () => {
      let e = new MessageChannel();
      return ((e.port1.onmessage = () => n.shift()?.()), Bu(e.port1), Bu(e.port2), e);
    };
  return {
    yieldToEventLoop: () =>
      new Promise((i) => {
        t || ((e ??= r()), n.push(i), e.port2.postMessage(null));
      }),
    close() {
      t || ((t = !0), (n.length = 0), e?.port1.close(), e?.port2.close());
    },
  };
}
var Hu = 8,
  Uu = 200,
  Wu = (e) => (e instanceof Error ? e.name : typeof e),
  Gu = class {
    constructor(e, t = {}) {
      ((this.disposed = !1),
        (this.running = !1),
        (this.readyPending = !1),
        (this.latestGeneration = 0),
        (this.runningGeneration = 0),
        (this.state = null),
        (this.view = null),
        (this.jobs = []),
        (this.outcome = null),
        (this.valuesFor = null),
        (this.plottedFor = null),
        (this.doneFor = null),
        (this.selected = null),
        (this.poiFor = null),
        (this.port = e));
      let { yieldToEventLoop: n } = t;
      if (n === void 0) {
        let e = Vu();
        ((this.ownedYield = e), (n = e.yieldToEventLoop));
      } else this.ownedYield = null;
      ((this.timing = {
        now: t.now ?? (() => performance.now()),
        yieldToEventLoop: n,
        sliceMs: t.sliceMs ?? Hu,
        heartbeatMs: t.heartbeatMs ?? Uu,
      }),
        (this.clock = new xu(this.timing, () =>
          this.post({ v: 1, type: `heartbeat`, generation: this.runningGeneration })
        )));
    }
    receive(e) {
      if (!this.disposed) {
        switch (e.type) {
          case `hello`:
            this.readyPending = !0;
            break;
          case `state`:
            ((this.state = e),
              (this.latestGeneration = Math.max(this.latestGeneration, e.generation)),
              (this.jobs = this.jobs.filter((t) => t.generation >= e.generation)));
            break;
          case `view`:
            ((this.view = { viewport: e.viewport, size: e.size, dpr: e.dpr }),
              (this.latestGeneration = Math.max(this.latestGeneration, e.generation)));
            break;
          case `evaluate`: {
            if (this.state !== null && e.generation < this.state.generation) return;
            let { jobId: t, generation: n, latex: r } = e;
            this.jobs.push({ jobId: t, generation: n, latex: r });
            break;
          }
          case `select`:
            ((this.selected = e.rowId), (this.poiFor = null));
            break;
          case `dispose`:
            this.dispose();
            return;
        }
        this.start();
      }
    }
    dispose() {
      ((this.disposed = !0), (this.jobs = []), (this.readyPending = !1), this.ownedYield?.close());
    }
    post(e, t = []) {
      this.disposed || (this.port.post(e, t), this.clock.notePost());
    }
    start() {
      this.running ||
        ((this.running = !0),
        this.run().catch((e) => {
          this.running = !1;
          let t = Wu(e);
          this.post({ v: 1, type: `fault`, generation: this.runningGeneration, message: t });
        }));
    }
    async run() {
      for (;;)
        if (
          (await this.timing.yieldToEventLoop(),
          this.disposed ||
            (this.clock.startSlice(), (await this.iterate(this.latestGeneration)) !== `restart`))
        )
          return;
    }
    async iterate(e) {
      this.runningGeneration = e;
      let t = {
        generation: e,
        clock: this.clock,
        now: () => this.timing.now(),
        post: (e, t) => this.post(e, t),
      };
      this.readyPending &&
        ((this.readyPending = !1), this.post({ v: 1, type: `ready`, worker: ju }));
      let n = this.state;
      if (n !== null && this.valuesFor !== n) {
        ((this.outcome = Eu(n.rows, n.settings, t)), (this.valuesFor = n));
        let r = await this.afterUnit(e);
        if (r !== `go`) return r;
      }
      for (; this.outcome !== null && this.jobs.length > 0; ) {
        ku(this.jobs.shift(), this.outcome, t);
        let n = await this.afterUnit(e);
        if (n !== `go`) return n;
      }
      let r = this.outcome,
        i = this.view;
      if (r !== null && i !== null && this.plottedFor !== e) {
        for (let n of r.analysis.rows) {
          if (!n.isGraphable) continue;
          Du(n, r, i, t);
          let a = await this.afterUnit(e);
          if (a !== `go`) return a;
        }
        this.plottedFor = e;
      }
      let a = this.selected;
      if (r !== null && i !== null && a !== null) {
        let n = `${e}:${a}`;
        if (this.poiFor !== n) {
          (Au(a, r, i, t), (this.poiFor = n));
          let o = await this.afterUnit(e);
          if (o !== `go`) return o;
        }
      }
      return (
        this.state !== null &&
          this.doneFor !== e &&
          (this.post({ v: 1, type: `done`, generation: e }), (this.doneFor = e)),
        e === this.latestGeneration && (this.jobs.length === 0 || this.outcome === null)
          ? ((this.running = !1), `idle`)
          : `restart`
      );
    }
    async afterUnit(e) {
      return this.disposed
        ? `stop`
        : e === this.latestGeneration
          ? this.clock.shouldYield()
            ? (this.clock.pulse(),
              await this.timing.yieldToEventLoop(),
              this.disposed
                ? `stop`
                : (this.clock.startSlice(), e === this.latestGeneration ? `go` : `restart`))
            : `go`
          : `restart`;
    }
  },
  Ku = 1500,
  qu = 3e3,
  Ju = { v: 1, type: `dispose` };
function Yu() {
  let e = new Set();
  return {
    add(t) {
      return (
        e.add(t),
        () => {
          e.delete(t);
        }
      );
    },
    emit(t) {
      for (let n of [...e]) n(t);
    },
    clear() {
      e.clear();
    },
  };
}
function Xu(e) {
  let t = Yu(),
    n = new Gu({ post: (e) => t.emit(e) }, e),
    r = !1,
    i = () => {
      r || ((r = !0), n.receive(Ju), t.clear());
    };
  return {
    kind: `main-thread`,
    post: (e) => (e.type === `dispose` ? i() : n.receive(e)),
    onMessage: (e) => t.add(e),
    dispose: i,
  };
}
function Zu() {
  return Xu({});
}
var Qu = class {
  constructor(e) {
    ((this.listeners = Yu()),
      (this.worker = null),
      (this.ready = !1),
      (this.readyTimer = null),
      (this.watchdog = null),
      (this.mainThread = null),
      (this.disposed = !1),
      (this.hello = null),
      (this.state = null),
      (this.view = null),
      (this.select = null),
      (this.jobs = new Map()),
      (this.latestGeneration = 0),
      (this.latestDone = !0),
      (this.lastBegin = null),
      (this.quarantine = new Map()),
      (this.options = e),
      this.spawn());
  }
  get kind() {
    return this.mainThread === null ? `worker` : `main-thread`;
  }
  post(e) {
    if (this.disposed) return;
    if (e.type === `dispose`) return this.dispose();
    let t = this.isActive();
    (this.forward(this.record(e)), this.ready && !t && this.isActive() && this.armWatchdog());
  }
  onMessage(e) {
    return this.listeners.add(e);
  }
  dispose() {
    this.disposed ||
      ((this.disposed = !0),
      this.worker?.postMessage(Ju),
      this.retire(),
      this.mainThread?.dispose(),
      this.clearTimers(),
      this.listeners.clear());
  }
  isActive() {
    return this.state !== null && (!this.latestDone || this.jobs.size > 0);
  }
  record(e) {
    switch (e.type) {
      case `hello`:
        return ((this.hello = e), e);
      case `state`:
        ((this.state = e), this.noteGeneration(e.generation));
        for (let [t, n] of this.jobs) n.generation < e.generation && this.jobs.delete(t);
        for (let t of e.rows) {
          let e = this.quarantine.get(t.id);
          e !== void 0 && e !== t.latex && this.quarantine.delete(t.id);
        }
        return this.withoutQuarantined(e);
      case `view`:
        return ((this.view = e), this.noteGeneration(e.generation), e);
      case `evaluate`:
        return (
          (this.state === null || e.generation >= this.state.generation) &&
            this.jobs.set(e.jobId, e),
          e
        );
      case `select`:
        return ((this.select = e), e);
    }
  }
  noteGeneration(e) {
    ((this.latestGeneration = e), (this.latestDone = !1));
  }
  withoutQuarantined(e) {
    if (this.quarantine.size === 0) return e;
    let t = [],
      n = e.rows.filter((e) => {
        let n = this.quarantine.get(e.id) === e.latex;
        return (n && t.push(e.id), !n);
      });
    if (t.length > 0) {
      let { generation: n } = e;
      queueMicrotask(() => {
        if (!this.disposed)
          for (let e of t) this.listeners.emit({ v: 1, type: `overrun`, generation: n, rowId: e });
      });
    }
    return { ...e, rows: n };
  }
  forward(e) {
    this.mainThread === null ? this.worker?.postMessage(e) : this.mainThread.post(e);
  }
  replay() {
    (this.hello !== null && this.forward(this.hello),
      this.state !== null && this.forward(this.withoutQuarantined(this.state)),
      this.view !== null && this.forward(this.view),
      this.select !== null && this.forward(this.select));
    for (let e of this.jobs.values()) this.forward(e);
  }
  spawn() {
    let e;
    try {
      e = this.options.createWorker();
    } catch {
      return this.fallBack();
    }
    ((this.worker = e),
      (this.ready = !1),
      (e.onmessage = (t) => this.receive(e, t.data)),
      (e.onerror = (t) => this.onError(e, t)),
      (this.readyTimer = setTimeout(() => {
        ((this.readyTimer = null), this.fallBack());
      }, this.options.readyTimeoutMs)),
      this.replay());
  }
  retire() {
    let e = this.worker;
    e !== null &&
      ((this.worker = null),
      (this.ready = !1),
      (e.onmessage = null),
      (e.onerror = null),
      e.terminate());
  }
  fallBack() {
    (this.clearTimers(), this.retire());
    let e = Zu();
    (e.onMessage((e) => this.listeners.emit(e)), (this.mainThread = e), this.replay());
  }
  onError(e, t) {
    e !== this.worker || this.ready || (t.preventDefault(), this.fallBack());
  }
  receive(e, t) {
    e === this.worker &&
      zu(t) &&
      (t.type === `ready` && !this.ready && ((this.ready = !0), this.clearReadyTimer()),
      this.track(t),
      this.ready && (this.isActive() ? this.armWatchdog() : this.clearWatchdog()),
      this.listeners.emit(t));
  }
  track(e) {
    switch (e.type) {
      case `begin`:
        this.lastBegin = e.rowId;
        break;
      case `value`:
        (e.jobId !== null && this.jobs.delete(e.jobId),
          e.rowId !== null && e.rowId === this.lastBegin && (this.lastBegin = null));
        break;
      case `plot`:
      case `overrun`:
        e.rowId === this.lastBegin && (this.lastBegin = null);
        break;
      case `done`:
        ((this.lastBegin = null), e.generation === this.latestGeneration && (this.latestDone = !0));
    }
  }
  onWatchdog() {
    ((this.watchdog = null), this.retire());
    let e = this.lastBegin;
    if (((this.lastBegin = null), e !== null)) {
      let t = this.state?.rows.find((t) => t.id === e);
      (t !== void 0 && this.quarantine.set(e, t.latex),
        this.listeners.emit({
          v: 1,
          type: `overrun`,
          generation: this.latestGeneration,
          rowId: e,
        }));
    }
    this.spawn();
  }
  armWatchdog() {
    (this.clearWatchdog(),
      (this.watchdog = setTimeout(() => this.onWatchdog(), this.options.watchdogMs)));
  }
  clearWatchdog() {
    (this.watchdog !== null && clearTimeout(this.watchdog), (this.watchdog = null));
  }
  clearReadyTimer() {
    (this.readyTimer !== null && clearTimeout(this.readyTimer), (this.readyTimer = null));
  }
  clearTimers() {
    (this.clearReadyTimer(), this.clearWatchdog());
  }
};
function $u(e = {}) {
  return new Qu({
    createWorker: e.createWorker ?? Zl,
    watchdogMs: e.watchdogMs ?? Ku,
    readyTimeoutMs: e.readyTimeoutMs ?? qu,
  });
}
function ed() {
  return typeof window < `u` && typeof Worker == `function` ? $u() : Zu();
}
function td(e) {
  typeof requestAnimationFrame == `function` ? requestAnimationFrame(() => e()) : setTimeout(e, 16);
}
function nd() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
var rd = Object.freeze({ width: 800, height: 600 }),
  id = 1e3,
  ad = /^[0-9]{1,15}$/,
  od = 1e3;
function sd(e) {
  return Object.freeze(
    e.map((e) => {
      if ((e.sliderBounds !== void 0 && Object.freeze(e.sliderBounds), e.columns !== void 0)) {
        for (let t of e.columns) Object.freeze(Object.freeze(t).values);
        Object.freeze(e.columns);
      }
      return Object.freeze(e);
    })
  );
}
function cd(e, t) {
  return e.length === t.length && e.every((e, n) => ud(e, t[n]));
}
function ld(e, t) {
  return e === t
    ? !0
    : e === void 0 || t === void 0 || e.length !== t.length
      ? !1
      : e.every((e, n) => {
          let r = t[n];
          return (
            e.latex === r.latex &&
            e.color === r.color &&
            e.hidden === r.hidden &&
            e.lines === r.lines &&
            e.lineStyle === r.lineStyle &&
            e.pointStyle === r.pointStyle &&
            e.values.length === r.values.length &&
            e.values.every((e, t) => e === r.values[t])
          );
        });
}
function ud(e, t) {
  if (e === t) return !0;
  if (e.type !== t.type || e.logMode !== t.logMode || !ld(e.columns, t.columns)) return !1;
  let n = e.sliderBounds,
    r = t.sliderBounds;
  return (
    e.id === t.id &&
    e.latex === t.latex &&
    e.color === t.color &&
    e.hidden === t.hidden &&
    e.lineStyle === t.lineStyle &&
    e.pointStyle === t.pointStyle &&
    (n === r ||
      (n !== void 0 && r !== void 0 && n.min === r.min && n.max === r.max && n.step === r.step))
  );
}
var dd = class {
    constructor() {
      ((this.list = []),
        (this.counter = 0),
        (this.past = []),
        (this.future = []),
        (this.group = null),
        this.reset());
    }
    get rows() {
      return this.list;
    }
    reset() {
      ((this.list = sd([{ id: `1`, latex: ``, color: `c1`, hidden: !1 }])),
        (this.counter = 1),
        this.clearHistory());
    }
    nextId() {
      let e = this.counter;
      for (let { id: t } of this.list) ad.test(t) && (e = Math.max(e, Number(t)));
      return ((this.counter = e + 1), String(this.counter));
    }
    commit(e, t) {
      let n = e.length > 0 ? e : [{ id: this.nextId(), latex: ``, color: `c1`, hidden: !1 }];
      if (t.kind === `group`) {
        let e = this.group;
        ((e !== null && e.rowId === t.rowId && t.at - e.at < id) || this.record(),
          (this.group = { rowId: t.rowId, at: t.at }));
      } else (t.kind === `step` && this.record(), (this.group = null));
      this.list = sd(n);
    }
    endGroup() {
      this.group = null;
    }
    undo() {
      this.group = null;
      let e = this.past.pop();
      return e !== void 0 && (this.future.push(this.list), (this.list = e), !0);
    }
    redo() {
      this.group = null;
      let e = this.future.pop();
      return e !== void 0 && (this.past.push(this.list), (this.list = e), !0);
    }
    clearHistory() {
      ((this.past = []), (this.future = []), (this.group = null));
    }
    canUndo() {
      return this.past.length > 0;
    }
    canRedo() {
      return this.future.length > 0;
    }
    record() {
      (this.past.push(this.list), this.past.length > 100 && this.past.shift(), (this.future = []));
    }
  },
  fd = class extends Error {
    constructor(e, t) {
      (super(t), (this.name = `KarmanCalculatorError`), (this.code = e));
    }
  };
function pd(e, t) {
  for (let n = 1; ; n++) {
    let r = { x: `x_{${n}}`, ys: Array.from({ length: t }, (e, t) => `y_{${n + t}}`) };
    if (!e.has(r.x) && r.ys.every((t) => !e.has(t))) return r;
  }
}
function md(e, t, n) {
  let r = (e) => {
    switch (e.kind) {
      case `id`:
        return e.name === t ? { ...e, name: n } : e;
      case `add`:
      case `sub`:
      case `mul`:
      case `div`:
      case `pow`:
        return { ...e, left: r(e.left), right: r(e.right) };
      case `neg`:
      case `pct`:
      case `deg`:
      case `fact`:
      case `abs`:
        return { ...e, arg: r(e.arg) };
      case `root`:
        return { ...e, arg: r(e.arg), index: e.index === null ? null : r(e.index) };
      case `call`:
        return { ...e, args: e.args.map(r) };
      case `point`:
        return { ...e, x: r(e.x), y: r(e.y) };
      case `rel`:
        return { ...e, operands: e.operands.map(r) };
      case `list`:
        return { ...e, items: e.items.map(r) };
      default:
        return e;
    }
  };
  return r(e);
}
var hd = (e, t) => H(md(e, t, `\\placeholder`)) !== H(e);
function gd(e, t) {
  let n = Wn(e, { userFunctions: t });
  if (!n.ok) return null;
  let r = n.tree;
  if (r.kind !== `rel` || r.ops.length !== 1 || r.ops[0] !== `=`) return null;
  let [i, a] = r.operands;
  if (i.kind === `id` && i.name === `y` && !hd(a, `y`)) return (e) => H(md(a, `x`, e));
  if (i.kind === `call` && t.has(i.name) && i.args.length === 1) {
    let [e] = i.args;
    return e.kind === `id` ? (t) => H({ ...i, args: [{ ...e, name: t }] }) : null;
  }
  return null;
}
function _d(e, t) {
  let n = new Set();
  for (let e of t.byId.values()) {
    e.defines !== null && n.add(e.defines.name);
    for (let t of e.uses) n.add(t);
  }
  for (let t of e) for (let e of t.columns ?? []) n.add(e.latex);
  return n;
}
function vd(e, t, n) {
  let r = pd(n, 1),
    i = Gl(t),
    a = (e) => ({ latex: e, values: [], color: i, hidden: !1 });
  return { id: e, latex: ``, color: i, hidden: !1, type: `table`, columns: [a(r.x), a(r.ys[0])] };
}
function yd(e) {
  let t = Math.max(0, ...e.map((e) => e.values.length));
  for (; t > 0 && e.every((e) => (e.values[t - 1] ?? ``) === ``); ) t--;
  return e.map((e) => ({ ...e, values: Array.from({ length: t }, (t, n) => e.values[n] ?? ``) }));
}
function bd(e, t, n, r) {
  let i = e.columns ?? [];
  if (r.length > 128) return `char-limit`;
  if (n < 0 || n >= 1e3 || t < 0 || t >= i.length) return `row-limit`;
  let a = i.map((e, i) => {
    if (i !== t) return e;
    let a = [...e.values];
    for (; a.length <= n; ) a.push(``);
    return ((a[n] = r), { ...e, values: a });
  });
  return { ...e, columns: yd(a) };
}
function xd(e, t, n) {
  let r = e.columns ?? [];
  if (n.length > 128) return `char-limit`;
  if (t === r.length) {
    if (r.length >= 10) return `row-limit`;
    let t = { latex: n, values: [], color: Sd(r.at(-1)?.color, r.length), hidden: !1 };
    return { ...e, columns: yd([...r, t]) };
  }
  return t < 0 || t > r.length
    ? `row-limit`
    : { ...e, columns: r.map((e, r) => (r === t ? { ...e, latex: n } : e)) };
}
function Sd(e, t) {
  return Kl(e, t);
}
function Cd(e, t) {
  let n = (e.columns ?? []).map((e) => ({ ...e, values: e.values.filter((e, n) => n !== t) }));
  return { ...e, columns: yd(n) };
}
function wd(e, t, n, r) {
  let i = new Set(t.flatMap((e) => Cn(e.latex)?.name ?? [])),
    a = e.type === `table` ? null : gd(e.latex, i);
  if (a === null) return null;
  let o = pd(r, 1).x,
    s = (t, n) => ({ latex: t, values: n, color: e.color, hidden: !1 });
  return {
    id: n(),
    latex: ``,
    color: e.color,
    hidden: !1,
    type: `table`,
    columns: [s(o, [`-2`, `-1`, `0`, `1`, `2`]), s(a(o), [])],
  };
}
function Td(e, t) {
  let n = e.columns ?? [];
  return t < 1 || t >= n.length ? e : { ...e, columns: yd(n.filter((e, n) => n !== t)) };
}
function Ed(e, t, n) {
  return { ...e, columns: (e.columns ?? []).map((e, r) => (r === t ? { ...e, ...n } : e)) };
}
function Dd(e) {
  return { id: e.id, latex: ``, color: e.color, hidden: !1 };
}
function Od(e, t) {
  throw new fd(`invalid-argument`, `${e}: ${t}`);
}
function kd(e) {
  let t = `HelperExpression`;
  Object.prototype.toString.call(e) !== `[object Object]` && Od(t, `spec must be an object`);
  let n = e,
    r = Object.keys(n).find((e) => e !== `latex`);
  r !== void 0 && Od(t, `spec has an unknown key "${r}"`);
  let i = Object.prototype.hasOwnProperty.call(n, `latex`) ? n.latex : void 0;
  return (
    typeof i != `string` && Od(t, `latex must be a string`),
    i.length > 2048 && Od(t, `latex is longer than ${je} characters`),
    i
  );
}
function Ad(e, t) {
  return (e !== `numericValue` && e !== `listValue` && Od(t, `unknown name ${String(e)}`), e);
}
function jd(e, t, n = !1) {
  if (typeof e == `function`) return e;
  if (!(n && e === void 0)) return Od(t, `callback must be a function`);
}
function Md(e) {
  return e.type === `number` && Number.isFinite(e.value) ? e.value : NaN;
}
function Nd(e) {
  if (e.type !== `list`) return;
  let t = e.value.map((e) => (e.type === `number` ? e.value : e.type === `undefined` ? NaN : null));
  return t.includes(null) ? void 0 : Object.freeze(t);
}
var Pd = class {
    constructor(e, t) {
      ((this.numeric = NaN),
        (this.list = void 0),
        (this.callbacks = { numericValue: new Set(), listValue: new Set() }),
        (this.latex = e),
        (this.stop = t));
    }
    get numericValue() {
      return this.numeric;
    }
    get listValue() {
      return this.list;
    }
    observe(e, t) {
      let n = this.callbacks[Ad(e, `observe`)],
        r = jd(t, `observe`);
      return (
        n.add(r),
        () => {
          n.delete(r);
        }
      );
    }
    unobserve(e, t) {
      let n = this.callbacks[Ad(e, `unobserve`)],
        r = jd(t, `unobserve`, !0);
      r === void 0 ? n.clear() : n.delete(r);
    }
    destroy() {
      (this.stop(this), this.callbacks.numericValue.clear(), this.callbacks.listValue.clear());
    }
    update(e) {
      ((this.numeric = Md(e)), (this.list = Nd(e)));
      for (let e of [`numericValue`, `listValue`]) {
        let t = this.callbacks[e];
        for (let e of [...t]) t.has(e) && e();
      }
    }
  },
  Fd = class {
    constructor(e) {
      ((this.live = new Map()), (this.lastJobId = 0), (this.disposed = !1), (this.deps = e));
    }
    create(e) {
      let t = new Pd(kd(e), (e) => this.live.delete(e));
      return (this.disposed || this.send(t), t);
    }
    reissue() {
      for (let e of [...this.live.keys()]) this.send(e);
    }
    receive(e, t) {
      [...this.live].find(([, t]) => t === e)?.[0].update(t);
    }
    dispose() {
      ((this.disposed = !0), this.live.clear());
    }
    send(e) {
      let t = ++this.lastJobId;
      this.live.set(e, t);
      let n = this.deps.generation();
      this.deps.post({ v: 1, type: `evaluate`, jobId: t, generation: n, latex: e.latex });
    }
  },
  Id = Object.freeze({ value: null, overrun: !1 });
function Ld(e, t) {
  return e.map((e) => {
    let { kind: n, isGraphable: r } = t.byId.get(e.id);
    return { id: e.id, latex: Rd(e), hidden: e.hidden, kind: n, isGraphable: r };
  });
}
function Rd(e) {
  return e.type === `table`
    ? JSON.stringify((e.columns ?? []).map((e) => [e.latex, e.values, e.hidden]))
    : e.logMode === !0
      ? `${e.latex}\u0000log`
      : e.latex;
}
var zd = class {
    constructor(e) {
      ((this.rows = new Map()),
        (this.results = new Map()),
        (this.plots = new Map()),
        (this.plotted = new Set()),
        (this.stateGeneration = 0),
        (this.latestGeneration = 0),
        (this.points = null),
        (this.hooks = e));
    }
    noteState(e, t) {
      let n = new Map(t.map((e) => [e.id, e])),
        r = (e) => {
          let t = this.rows.get(e),
            r = n.get(e);
          return !t || !r || r.latex !== t.latex || r.hidden !== t.hidden;
        };
      for (let e of this.rows.keys()) r(e) && this.results.delete(e);
      (this.points !== null && r(this.points.rowId) && (this.points = null),
        this.keepGeometry((e) => !r(e) && n.get(e).isGraphable),
        (this.rows = n),
        (this.stateGeneration = this.latestGeneration = e),
        (this.plotted = new Set()));
    }
    noteView(e) {
      ((this.latestGeneration = e),
        (this.plotted = new Set()),
        this.keepGeometry((e, t) => t.kind !== `region`));
    }
    receive(e) {
      switch (e.type) {
        case `ready`:
          return !0;
        case `analysis`:
          return (this.accepts(e) && this.checkKind(e.rowId, e.analysis.kind), !1);
        case `value`:
          return e.jobId === null
            ? this.store(e, { value: e.value, overrun: !1 })
            : (this.hooks.onHelperValue(e.jobId, e.value), !1);
        case `overrun`:
          return this.store(e, { value: null, overrun: !0 });
        case `table`: {
          if (!this.accepts(e)) return !1;
          let t = this.results.get(e.rowId) ?? Id;
          return (this.results.set(e.rowId, { ...t, table: e.table }), !0);
        }
        case `regression`: {
          if (!this.accepts(e)) return !1;
          let t = this.results.get(e.rowId) ?? Id;
          return (this.results.set(e.rowId, { ...t, regression: e.result }), !0);
        }
        case `plot`: {
          let { generation: t, rowId: n, geometry: r } = e,
            i = this.rows.get(n)?.isGraphable === !0;
          return t !== this.latestGeneration || !i
            ? !1
            : ((this.plots = new Map(this.plots).set(n, r)), this.plotted.add(n), !0);
        }
        case `done`:
          return (
            e.generation === this.latestGeneration && this.keepGeometry((e) => this.plotted.has(e))
          );
        case `poi`:
          return e.generation !== this.latestGeneration || !this.rows.has(e.rowId)
            ? !1
            : ((this.points = Object.freeze({ rowId: e.rowId, points: Object.freeze(e.points) })),
              !0);
        case `fault`:
          return (this.hooks.onFault(e.message), !1);
        default:
          return !1;
      }
    }
    result(e) {
      return this.results.get(e) ?? Id;
    }
    get geometry() {
      return this.plots;
    }
    get poi() {
      return this.points;
    }
    reset() {
      ((this.rows = new Map()),
        this.results.clear(),
        (this.plots = new Map()),
        (this.plotted = new Set()),
        (this.points = null),
        (this.stateGeneration = this.latestGeneration = 0));
    }
    accepts(e) {
      let { generation: t, rowId: n } = e;
      return n !== null && t >= this.stateGeneration && this.rows.has(n);
    }
    store(e, t) {
      return this.accepts(e) ? (this.results.set(e.rowId, t), !0) : !1;
    }
    keepGeometry(e) {
      let t = new Map([...this.plots].filter(([t, n]) => e(t, n)));
      return t.size !== this.plots.size && ((this.plots = t), !0);
    }
    checkKind(e, t) {}
  },
  Bd = Object.freeze({
    angleMode: `radians`,
    complex: !1,
    showGrid: !0,
    polarGrid: !1,
    minorGridlines: !0,
    arrows: !1,
    axisNumbers: !0,
    xAxis: Object.freeze({ show: !0, label: ``, step: null }),
    yAxis: Object.freeze({ show: !0, label: ``, step: null }),
    lockViewport: !1,
    piAxisLabels: !1,
    displaySize: `default`,
    reverseContrast: !1,
    keypad: !1,
    expressionsCollapsed: !1,
    mode: `graphing`,
    reducedMotion: !1,
  });
function Vd(e) {
  return e.map((e) => ({
    id: e.id,
    type: e.type === `table` ? `table` : `expression`,
    latex: e.latex,
    columns:
      e.type === `table`
        ? (e.columns ?? []).map((e) => ({
            latex: e.latex,
            values: [...e.values],
            hidden: e.hidden,
          }))
        : null,
    hidden: e.hidden,
    sliderBounds: e.sliderBounds ? { ...e.sliderBounds } : null,
    logMode: e.logMode === !0,
  }));
}
function Hd(e) {
  return { angleMode: e.angleMode, complex: e.complex };
}
function Ud(e, t, n) {
  let r = Hd(n);
  return { v: 1, type: `state`, generation: e, rows: Vd(t), settings: r, sliders: {} };
}
function Wd(e, t, n, r) {
  return { v: 1, type: `view`, generation: e, viewport: { ...t }, size: { ...n }, dpr: r };
}
function Gd(e, t) {
  let n = { ...e };
  return (
    t.latex !== void 0 && (n.latex = t.latex),
    t.color !== void 0 && (n.color = t.color),
    t.hidden !== void 0 && (n.hidden = t.hidden),
    t.lineStyle !== void 0 && (n.lineStyle = t.lineStyle),
    t.pointStyle !== void 0 && (n.pointStyle = t.pointStyle),
    t.sliderBounds !== void 0 && (n.sliderBounds = { ...t.sliderBounds }),
    t.type === `expression` && (delete n.type, delete n.columns),
    t.type === `table` && (n.type = `table`),
    t.columns !== void 0 &&
      (n.columns = t.columns.map((t) => ({
        latex: t.latex,
        values: [...t.values],
        color: t.color ?? e.color,
        hidden: t.hidden ?? !1,
      }))),
    n.type === `table` && ((n.latex = ``), (n.columns ??= [])),
    n
  );
}
function Kd(e, t) {
  return { id: e, latex: ``, color: Gl(t), hidden: !1 };
}
function qd(e, t) {
  let n = [...e];
  for (let e of t) {
    let t = n.findIndex((t) => t.id === e.id);
    t >= 0 ? (n[t] = Gd(n[t], e)) : n.push(Gd(Kd(e.id, n.length), e));
  }
  return n;
}
function Jd(e) {
  return e.map((e, t) => Gd(Kd(e.id, t), e));
}
function Yd(e) {
  let t = {
    id: e.id,
    type: e.type === `table` ? `table` : `expression`,
    latex: e.latex,
    color: e.color,
    hidden: e.hidden,
  };
  return (
    e.type === `table` &&
      (t.columns = (e.columns ?? []).map((e) => ({
        latex: e.latex,
        values: [...e.values],
        color: e.color,
        hidden: e.hidden,
      }))),
    e.lineStyle !== void 0 && (t.lineStyle = e.lineStyle),
    e.pointStyle !== void 0 && (t.pointStyle = e.pointStyle),
    e.sliderBounds !== void 0 && (t.sliderBounds = { ...e.sliderBounds }),
    t
  );
}
function Xd(e) {
  return Object.freeze({
    ...e,
    xAxis: Object.freeze({ ...e.xAxis }),
    yAxis: Object.freeze({ ...e.yAxis }),
  });
}
function Zd(e) {
  let t = Bd;
  return Xd({
    ...t,
    angleMode: e.angleMode ?? t.angleMode,
    keypad: e.keypad ?? t.keypad,
    expressionsCollapsed: e.expressionsCollapsed ?? t.expressionsCollapsed,
    reducedMotion: e.reducedMotion ?? t.reducedMotion,
    displaySize: e.displaySize ?? t.displaySize,
    reverseContrast: e.reverseContrast ?? t.reverseContrast,
    mode: e.mode ?? t.mode,
  });
}
function Qd(e) {
  return Xd({ ...Bd, displaySize: e.displaySize, reverseContrast: e.reverseContrast });
}
function $d(e, t) {
  if (e === t) return !0;
  if (typeof e != `object` || typeof t != `object` || e === null || t === null) return !1;
  let n = e,
    r = t;
  return n.show === r.show && n.label === r.label && n.step === r.step;
}
function ef(e, t) {
  let n = Object.entries(t).filter(([t, n]) => n !== void 0 && !$d(e[t], n));
  if (n.length === 0) return { settings: e, wireChanged: !1 };
  let r = Xd({ ...e, ...Object.fromEntries(n) });
  return { settings: r, wireChanged: r.angleMode !== e.angleMode || r.complex !== e.complex };
}
function tf(e, t, n) {
  return {
    version: 1,
    mode: `graphing`,
    settings: { ...t, xAxis: { ...t.xAxis }, yAxis: { ...t.yAxis } },
    viewport: { left: n.left, right: n.right, bottom: n.bottom, top: n.top },
    expressions: e.map((e) => Yd(e)),
    scientific: {},
  };
}
function nf(e, t) {
  return e.left === t.left && e.right === t.right && e.bottom === t.bottom && e.top === t.top;
}
var rf = (e) => Number.isFinite(e) && e > 0;
function af(e, t, n) {
  let { viewport: r, size: i, dpr: a } = n;
  if (
    !(
      rf(i.width) &&
      rf(i.height) &&
      rf(a) &&
      [r.left, r.right, r.bottom, r.top].every((e) => Number.isFinite(e)) &&
      r.left < r.right &&
      r.bottom < r.top
    )
  )
    return null;
  let { width: o, height: s } = i;
  return e?.dpr !== a || e.size.width !== o || e.size.height !== s
    ? Object.freeze({ size: Object.freeze({ width: o, height: s }), dpr: a })
    : nf(r, t)
      ? null
      : e;
}
var of = class {
    constructor(e) {
      ((this.callbacks = new Map()),
        (this.dirty = new Set()),
        (this.scheduled = !1),
        (this.disposed = !1),
        (this.scheduleFrame = e));
    }
    add(e, t) {
      if (!this.disposed) {
        let n = this.callbacks.get(e) ?? new Set();
        this.callbacks.set(e, n.add(t));
      }
      return () => this.remove(e, t);
    }
    remove(e, t) {
      t === void 0 ? this.callbacks.delete(e) : this.callbacks.get(e)?.delete(t);
    }
    markDirty(e) {
      this.disposed ||
        (this.dirty.add(e),
        !this.scheduled && ((this.scheduled = !0), this.scheduleFrame(() => this.flush())));
    }
    dispose() {
      ((this.disposed = !0), this.callbacks.clear(), this.dirty.clear());
    }
    flush() {
      this.scheduled = !1;
      let e = [...this.dirty];
      this.dirty.clear();
      for (let t of e)
        for (let e of [...(this.callbacks.get(t) ?? [])])
          !this.disposed && this.callbacks.get(t)?.has(e) && e();
    }
  },
  sf = new Set([`expressionAnalysis`, `graphpaperBounds`, `settings`, `focusedExpression`, `mode`]);
function cf(e, t) {
  throw new fd(`invalid-argument`, `${e}: ${t}`);
}
function lf(e, t) {
  return (sf.has(e) || cf(t, `unknown name ${String(e)}`), e);
}
function uf(e, t) {
  e !== `change` && cf(t, `unknown event ${String(e)}`);
}
function df(e, t, n = !1) {
  return (
    typeof e != `function` && !(n && e === void 0) && cf(t, `callback must be a function`),
    e
  );
}
var ff = class {
  constructor(e, t) {
    ((this.listeners = new Set()),
      (this.changeCallbacks = new Set()),
      (this.userInitiated = !1),
      (this.bounds = null),
      (this.registry = new of(e)),
      (this.revision = t),
      (this.sentRevision = t()),
      this.registry.add(`snapshot`, () => this.runListeners()),
      this.registry.add(`change`, () => this.sendChange()));
  }
  subscribe(e) {
    return (
      this.listeners.add(e),
      () => {
        this.listeners.delete(e);
      }
    );
  }
  observe(e, t) {
    return this.registry.add(lf(e, `observe`), df(t, `observe`));
  }
  unobserve(e, t) {
    this.registry.remove(lf(e, `unobserve`), df(t, `unobserve`, !0));
  }
  observeEvent(e, t) {
    uf(e, `observeEvent`);
    let n = df(t, `observeEvent`);
    return (
      this.changeCallbacks.add(n),
      () => {
        this.changeCallbacks.delete(n);
      }
    );
  }
  unobserveEvent(e, t) {
    uf(e, `unobserveEvent`);
    let n = df(t, `unobserveEvent`, !0);
    n === void 0 ? this.changeCallbacks.clear() : this.changeCallbacks.delete(n);
  }
  markDirty(e) {
    this.registry.markDirty(e);
  }
  noteBounds(e, t) {
    let n = this.bounds;
    ((this.bounds = { viewport: e, size: t }),
      n !== null &&
        (n.size.width !== t.width || n.size.height !== t.height || !nf(n.viewport, e)) &&
        this.registry.markDirty(`graphpaperBounds`));
  }
  committed(e) {
    ((this.userInitiated ||= e), this.registry.markDirty(`change`), this.runListeners());
  }
  workerChanged(e) {
    (this.registry.markDirty(`snapshot`),
      (e === `value` || e === `overrun`) && this.registry.markDirty(`expressionAnalysis`));
  }
  dispose() {
    (this.registry.dispose(), this.listeners.clear(), this.changeCallbacks.clear());
  }
  runListeners() {
    for (let e of [...this.listeners]) e();
  }
  sendChange() {
    let e = this.revision(),
      t = this.userInitiated;
    if (((this.userInitiated = !1), e !== this.sentRevision)) {
      this.sentRevision = e;
      for (let n of [...this.changeCallbacks])
        this.changeCallbacks.has(n) && n({ revision: e, isUserInitiated: t });
    }
  }
};
function pf() {
  return { code: `timeout`, message: er(`timeout`, []), names: [], span: null };
}
function mf(e) {
  if (typeof e == `object` && e) {
    for (let t of Object.values(e)) mf(t);
    Object.freeze(e);
  }
  return e;
}
function hf(e, t) {
  let n = { type: `other`, display: t ?? `` };
  switch (e.type) {
    case `number`:
      return Number.isFinite(e.value) ? { type: `number`, value: e.value } : { type: `undefined` };
    case `complex`: {
      let { re: t, im: n } = e.value;
      return !Number.isFinite(t) || !Number.isFinite(n)
        ? { type: `undefined` }
        : { type: `complex`, value: { re: t, im: n } };
    }
    case `point`:
      return { type: `point`, value: [e.value[0], e.value[1]] };
    case `list`: {
      let t = e.value.map((e) =>
        e.type === `number` ? e.value : e.type === `undefined` ? NaN : null
      );
      return t.includes(null) ? n : { type: `list`, value: t };
    }
    case `undefined`:
      return { type: `undefined` };
    default:
      return n;
  }
}
function gf(e, t, n) {
  return (
    (e.kind === `value` || e.kind === `definition`) &&
    e.error === null &&
    e.chips.length === 0 &&
    !n &&
    t !== null &&
    vf(t) === null
  );
}
function _f(e) {
  if (e.chips.length === 0 || e.complexHint) return null;
  let t = e.chips.map(qn);
  return { code: `too-many-variables`, message: er(`too-many-variables`, t), names: t, span: null };
}
function vf(e) {
  if (e === null || e.type !== `undefined` || e.error === void 0) return null;
  let t = e.error;
  return { code: t, message: er(t, []), names: [], span: null };
}
function yf(e, t, n) {
  let { value: r, overrun: i } = n;
  return {
    id: e.id,
    latex: e.latex,
    hidden: e.hidden,
    color: e.color,
    kind: t.kind,
    error: i ? pf() : (t.error ?? _f(t) ?? vf(r) ?? xf(n.regression)),
    chips: [...t.chips],
    complexHint: t.complexHint,
    value: r,
    valueText: r !== null && gf(t, r, i) ? Ki(r) : null,
    overrun: i,
    type: e.type === `table` ? `table` : `expression`,
    columns: e.type === `table` ? (e.columns ?? []) : null,
    table: t.table === void 0 ? null : { analysis: t.table, result: n.table ?? null },
    regression:
      t.regression === void 0 ? null : { analysis: t.regression, result: n.regression ?? null },
  };
}
function bf(e, t) {
  let n = new Map();
  for (let { id: r } of e) {
    let { value: e, regression: i } = t(r);
    if ((e !== null && n.set(r, e), i !== void 0)) for (let [e, t] of Ta(i)) n.set(Er(r, e), t);
  }
  return n;
}
function xf(e) {
  return e === void 0 || e.ok || e.error === null
    ? null
    : {
        code: e.error === er(`regression-data`, []) ? `regression-data` : `regression-fit`,
        message: e.error,
        names: [],
        span: null,
      };
}
function Sf(e, t) {
  let n = e.map((e) => {
    let n = t.byId.get(e.id),
      r = e.value !== null && gf(n, e.value, e.overrun);
    return [
      e.id,
      {
        isGraphable: n.isGraphable,
        isError: e.error !== null,
        ...(e.error !== null && { errorMessage: e.error.message }),
        evaluationDisplayed: r,
        ...(r && { evaluation: hf(e.value, e.valueText) }),
      },
    ];
  });
  return mf(Object.fromEntries(n));
}
var Cf = new WeakMap();
function wf(e, t) {
  let n = Cf.get(e);
  return (n === void 0 && ((n = Sf(e.rows, t)), Cf.set(e, n)), n);
}
var Tf = Object.freeze([
  `angleMode`,
  `complex`,
  `showGrid`,
  `polarGrid`,
  `minorGridlines`,
  `arrows`,
  `axisNumbers`,
  `xAxis`,
  `yAxis`,
  `lockViewport`,
  `piAxisLabels`,
  `displaySize`,
  `reverseContrast`,
  `keypad`,
  `expressionsCollapsed`,
  `mode`,
  `reducedMotion`,
]);
function K(e, t) {
  throw new fd(`invalid-argument`, `${e}: ${t}`);
}
function Ef(e, t) {
  throw new fd(`unsupported`, `${e}: ${t}`);
}
function Df(e, t, n, r) {
  Object.prototype.toString.call(e) !== `[object Object]` && K(t, `${n} must be an object`);
  let i = e;
  for (let e of Object.keys(i)) r.includes(e) || K(t, `${n} has an unknown key "${e}"`);
  return i;
}
function q(e, t) {
  return Object.prototype.hasOwnProperty.call(e, t) ? e[t] : void 0;
}
var Of = (e, t, n) => (typeof e == `boolean` ? e : K(t, `${n} must be true or false`)),
  kf = (e, t, n) => (typeof e == `string` ? e : K(t, `${n} must be a string`));
function Af(e) {
  return (t, n, r) =>
    typeof t == `string` && e.includes(t)
      ? t
      : K(n, `${r} must be ${e.map((e) => `"${e}"`).join(` or `)}`);
}
function jf(e, t) {
  return (n, r, i) => {
    let a = e(n, r, i);
    return (a !== t && Ef(r, `${i} accepts only ${JSON.stringify(t)} for now`), a);
  };
}
var Mf = [`show`, `label`, `step`],
  Nf = (e, t, n) => {
    let r = Df(e, t, n, Mf),
      i = q(r, `step`);
    return (
      i !== null &&
        !(typeof i == `number` && Number.isFinite(i) && i > 0) &&
        K(t, `${n}.step must be null or a finite number greater than 0`),
      { show: Of(q(r, `show`), t, `${n}.show`), label: kf(q(r, `label`), t, `${n}.label`), step: i }
    );
  },
  Pf = {
    angleMode: Af([`radians`, `degrees`]),
    complex: Of,
    showGrid: Of,
    polarGrid: Of,
    minorGridlines: Of,
    arrows: Of,
    axisNumbers: Of,
    xAxis: Nf,
    yAxis: Nf,
    lockViewport: jf(Of, !1),
    piAxisLabels: jf(Of, !1),
    displaySize: jf(Af([`default`, `large`]), `default`),
    reverseContrast: jf(Of, !1),
    keypad: Of,
    expressionsCollapsed: Of,
    mode: jf(Af([`graphing`, `scientific`]), `graphing`),
    reducedMotion: Of,
  },
  Ff = {
    mode: Pf.mode,
    angleMode: Pf.angleMode,
    keypad: Of,
    expressionsCollapsed: Of,
    onError: (e, t, n) => (typeof e == `function` ? e : K(t, `${n} must be a function`)),
    seed: (e, t, n) =>
      typeof e == `number` && Number.isFinite(e) ? e : K(t, `${n} must be a finite number`),
    reducedMotion: Of,
    displaySize: Pf.displaySize,
    reverseContrast: Pf.reverseContrast,
  },
  If = Object.keys(Ff);
function Lf(e) {
  if (e === void 0) return {};
  let t = `KarmanCalculator`,
    n = Df(e, t, `options`, If),
    r = {};
  for (let e of If) {
    let i = q(n, e);
    i !== void 0 && (r[e] = Ff[e](i, t, `options.${e}`));
  }
  return r;
}
function Rf(e) {
  return Bf(e, `updateSettings`, `settings`, !1);
}
function zf(e) {
  return Bf(e, `setState`, `settings`, !0);
}
function Bf(e, t, n, r) {
  let i = Df(e, t, n, Tf),
    a = {};
  for (let e of Tf) {
    let o = r ? `${n}.${e}` : e,
      s = q(i, e);
    s === void 0 ? r && K(t, `${o} is missing`) : (a[e] = Pf[e](s, t, o));
  }
  return a;
}
var Vf = [`left`, `right`, `bottom`, `top`];
function Hf(e, t, n, r) {
  let i = Df(e, t, n, Vf),
    [a, o, s, c] = Vf.map((e) => {
      let n = q(i, e);
      return typeof n == `number` && Number.isFinite(n)
        ? n
        : K(t, `${r}${e} must be a finite number`);
    });
  return (
    a < o || K(t, `${r}left must be less than ${r}right`),
    s < c || K(t, `${r}bottom must be less than ${r}top`),
    { left: a, right: o, bottom: s, top: c }
  );
}
function Uf(e) {
  return Hf(e, `setMathBounds`, `bounds`, ``);
}
var Wf = [
    `id`,
    `type`,
    `latex`,
    `color`,
    `hidden`,
    `lineStyle`,
    `pointStyle`,
    `sliderBounds`,
    `columns`,
  ],
  Gf = [`note`, `folder`, `image`, `text`],
  Kf = [`latex`, `values`, `color`, `hidden`],
  qf = /^#[0-9a-f]{6}$/i,
  Jf = [`min`, `max`, `step`],
  Yf = (e, t, n) =>
    typeof e == `string` && e !== `` ? e : K(t, `${n} must be a non-empty string`),
  Xf = (e, t, n) => {
    let r = kf(e, t, n);
    return (r.length > 2048 && K(t, `${n} is longer than ${je} characters`), r);
  },
  Zf = (e, t, n) => {
    if (typeof e == `string`) {
      if (Rl.includes(e)) return e;
      if (qf.test(e)) return e.toLowerCase();
    }
    return K(t, `${n} must be "c1" to "c6" or "#rrggbb"`);
  },
  Qf = (e, t, n) => {
    let r = Df(e, t, n, Jf);
    return {
      min: kf(q(r, `min`), t, `${n}.min`),
      max: kf(q(r, `max`), t, `${n}.max`),
      step: kf(q(r, `step`), t, `${n}.step`),
    };
  },
  $f = (e, t, n) =>
    Array.isArray(e)
      ? (e.length > 10 && K(t, `${n} has more than 10 columns: at most 10 columns`),
        e.map((e, r) => {
          let i = `${n}[${r}]`,
            a = Df(e, t, i, Kf),
            o = q(a, `values`);
          (!Array.isArray(o) || o.length > 1e3) &&
            K(t, `${i}.values must be an array of at most ${od} strings`);
          let s = {
            latex: kf(q(a, `latex`), t, `${i}.latex`),
            values: o.map((e, n) => {
              let r = kf(e, t, `${i}.values[${n}]`);
              return (r.length > 128 && K(t, `${i}.values[${n}] is too long`), r);
            }),
          };
          return (
            q(a, `color`) !== void 0 && (s.color = Zf(q(a, `color`), t, `${i}.color`)),
            q(a, `hidden`) !== void 0 && (s.hidden = Of(q(a, `hidden`), t, `${i}.hidden`)),
            s
          );
        }))
      : K(t, `${n} must be an array`);
function ep(e, t, n, r) {
  if (Object.prototype.toString.call(e) === `[object Object]`) {
    let n = q(e, `type`);
    typeof n == `string` && Gf.includes(n) && Ef(t, `${r}type "${n}" is not supported`);
  }
  let i = Df(e, t, n, Wf),
    a = { id: Yf(q(i, `id`), t, `${r}id`) },
    o = (e) => q(i, e),
    s = (e, n) => n(o(e), t, `${r}${e}`);
  return (
    o(`type`) !== void 0 && (a.type = s(`type`, Af([`expression`, `table`]))),
    o(`latex`) !== void 0 && (a.latex = s(`latex`, Xf)),
    o(`color`) !== void 0 && (a.color = s(`color`, Zf)),
    o(`hidden`) !== void 0 && (a.hidden = s(`hidden`, Of)),
    o(`lineStyle`) !== void 0 && (a.lineStyle = s(`lineStyle`, Af([`solid`, `dashed`, `dotted`]))),
    o(`pointStyle`) !== void 0 && (a.pointStyle = s(`pointStyle`, Af([`filled`, `open`, `cross`]))),
    o(`sliderBounds`) !== void 0 && (a.sliderBounds = s(`sliderBounds`, Qf)),
    o(`columns`) !== void 0 &&
      (a.type !== `table` && K(t, `${r}columns needs type "table"`),
      (a.columns = s(`columns`, $f))),
    a
  );
}
function tp(e) {
  return ep(e, `setExpression`, `state`, ``);
}
function np(e) {
  let t = `removeExpressions`;
  Array.isArray(e) || K(t, `list must be an array`);
  let n = [];
  for (let r = 0; r < e.length; r++) {
    let i = Df(e[r], t, `list[${r}]`, [`id`]);
    n.push({ id: Yf(q(i, `id`), t, `list[${r}].id`) });
  }
  return n;
}
var rp = [`version`, `mode`, `settings`, `viewport`, `expressions`, `scientific`];
function ip(e) {
  let t = `setState`,
    n = Df(e, t, `state`, rp);
  for (let e of rp) q(n, e) === void 0 && K(t, `${e} is missing`);
  (q(n, `version`) !== 1 && K(t, `version must be 1`), Pf.mode(q(n, `mode`), t, `mode`));
  let r = zf(q(n, `settings`)),
    i = Hf(q(n, `viewport`), t, `viewport`, `viewport.`),
    a = q(n, `expressions`);
  (Array.isArray(a) || K(t, `expressions must be an array`),
    a.length > 100 && K(t, `more than 100 rows`));
  let o = new Set(),
    s = a.map((e, n) => {
      let r = ep(e, t, `expressions[${n}]`, `expressions[${n}].`);
      return (o.has(r.id) && K(t, `expressions[${n}].id is a duplicate`), o.add(r.id), r);
    });
  return (
    Df(q(n, `scientific`), t, `scientific`, []),
    { version: 1, mode: `graphing`, settings: r, viewport: i, expressions: s, scientific: {} }
  );
}
function ap(e, t) {
  if (e === void 0) return !1;
  let n = q(Df(e, t, `options`, [`allowUndo`]), `allowUndo`);
  return n !== void 0 && Of(n, t, `options.allowUndo`);
}
var op = { kind: `step` },
  sp = [{ id: `1`, latex: ``, color: `c1`, hidden: !1 }],
  cp = class {
    constructor(e, t) {
      ((this.doc = new dd()),
        (this.inbox = new zd({
          onFault: (e) => this.options.onError?.(Error(`Calculator worker fault: ${e}`)),
          onHelperValue: (e, t) => this.helpers.receive(e, t),
        })),
        (this.helpers = new Fd({
          post: (e) => this.deps.backend.post(e),
          generation: () => this.generation,
        })),
        (this.currentSettings = Bd),
        (this.graph = null),
        (this.revision = 0),
        (this.generation = 0),
        (this.snapshot = null),
        (this.focusedRowId = null),
        (this.activeRowId = null),
        (this.selectedRowId = null),
        (this.destroyed = !1),
        (this.options = Lf(e)),
        (this.deps = t),
        (this.observers = new ff(t.scheduleFrame, () => this.revision)),
        t.backend.onMessage((e) => {
          !this.destroyed &&
            this.inbox.receive(e) &&
            ((this.snapshot = null), this.observers.workerChanged(e.type));
        }),
        this.resetDocument(Zd(this.options), !1));
    }
    setExpression(e) {
      this.live().upsert(`setExpression`, [tp(e)]);
    }
    setExpressions(e) {
      (this.live(), Array.isArray(e) || lp(`setExpressions: list must be an array`));
      let t = e.map((e) => tp(e));
      this.upsert(`setExpressions`, t);
    }
    removeExpression(e) {
      this.removeExpressions([e]);
    }
    removeExpressions(e) {
      this.live();
      let t = new Set(np(e).map((e) => e.id)),
        n = this.doc.rows.filter((e) => !t.has(e.id));
      this.commitRows(n, op);
    }
    getExpressions() {
      return this.live().doc.rows.map((e) => Yd(e));
    }
    getState() {
      return tf(this.live().doc.rows, this.currentSettings, this.viewport);
    }
    setState(e, t) {
      this.live();
      let n = ip(e),
        r = ap(t, `setState`),
        i = Jd(n.expressions);
      (r
        ? cd(i, this.doc.rows) || this.doc.commit(i, op)
        : (this.doc.commit(i, { kind: `none` }), this.doc.clearHistory()),
        this.storeSettings(n.settings));
      let a = D(n.viewport),
        o = !nf(a, this.viewport);
      ((this.viewport = Object.freeze(a)),
        this.analyze(),
        this.revision++,
        this.postState(o),
        this.changed());
    }
    setBlank(e) {
      (this.live(),
        this.resetDocument(Qd(this.currentSettings), ap(e, `setBlank`)),
        this.revision++,
        this.changed());
    }
    setMathBounds(e) {
      this.live();
      let t = D(Uf(e));
      nf(t, this.viewport) || this.moveViewport(t);
    }
    updateSettings(e) {
      let t = this.live().currentSettings,
        n = this.storeSettings(Rf(e));
      this.currentSettings !== t &&
        (this.revision++, n && (this.analyze(), this.postState()), this.changed());
    }
    get settings() {
      return this.live().currentSettings;
    }
    get mode() {
      return (this.live(), `graphing`);
    }
    observe(e, t) {
      return this.live().observers.observe(e, t);
    }
    unobserve(e, t) {
      this.live().observers.unobserve(e, t);
    }
    observeEvent(e, t) {
      return this.live().observers.observeEvent(e, t);
    }
    unobserveEvent(e, t) {
      this.live().observers.unobserveEvent(e, t);
    }
    HelperExpression(e) {
      return this.live().helpers.create(e);
    }
    get expressionAnalysis() {
      return wf(this.live().getSnapshot(), this.analysis);
    }
    get graphpaperBounds() {
      let { width: e, height: t } = this.live().graph?.size ?? rd;
      return { mathCoordinates: { ...this.viewport }, pixelCoordinates: { width: e, height: t } };
    }
    undo() {
      this.live().doc.undo() && this.afterCommit();
    }
    redo() {
      this.live().doc.redo() && this.afterCommit();
    }
    clearHistory() {
      let e = this.live().doc.canUndo() || this.doc.canRedo();
      (this.doc.clearHistory(), e && this.changed());
    }
    canUndo() {
      return this.live().doc.canUndo();
    }
    canRedo() {
      return this.live().doc.canRedo();
    }
    focusExpression(e) {
      this.live().activate(e, `focusExpression`);
    }
    focusFirstExpression() {
      this.live().activate(this.doc.rows[0].id, `focusFirstExpression`);
    }
    activateExpression(e) {
      this.live().activate(e, `activateExpression`);
    }
    get focusedExpression() {
      return this.live().activeRowId;
    }
    destroy() {
      this.destroyed ||
        ((this.destroyed = !0),
        this.helpers.dispose(),
        this.observers.dispose(),
        this.deps.backend.dispose());
    }
    subscribe(e) {
      return this.observers.subscribe(e);
    }
    getSnapshot() {
      return ((this.snapshot ??= this.buildSnapshot()), this.snapshot);
    }
    editRow(e, t, n) {
      let r = this.doc.rows.find((t) => t.id === e);
      if (r === void 0) return null;
      if (t.length > 2048) return `char-limit`;
      if (t === r.latex) return null;
      let i =
        n === `typing` || n === `keypad` ? { kind: `group`, rowId: e, at: this.deps.now() } : op;
      return (this.commitRows(this.withRow(e, { latex: t }), i, !0), null);
    }
    endEditGroup() {
      this.doc.endGroup();
    }
    insertRowAfter(e) {
      let t = this.doc.rows;
      if (this.destroyed || t.length >= 100) return `row-limit`;
      let n = e === null ? -1 : t.findIndex((t) => t.id === e),
        r = n < 0 ? t.length : n + 1,
        i = Gl(r),
        a = { id: this.doc.nextId(), latex: ``, color: i, hidden: !1 };
      return (this.commitRows([...t.slice(0, r), a, ...t.slice(r)], op, !0), { id: a.id });
    }
    insertTableAfter(e) {
      let t = this.doc.rows;
      if (this.destroyed || t.length >= 100) return `row-limit`;
      let n = e === null ? -1 : t.findIndex((t) => t.id === e),
        r = n < 0 ? t.length : n + 1,
        i = vd(this.doc.nextId(), r, _d(t, this.analysis));
      return (this.commitRows([...t.slice(0, r), i, ...t.slice(r)], op, !0), { id: i.id });
    }
    replaceWithTable(e) {
      let t = this.doc.rows,
        n = t.findIndex((t) => t.id === e),
        r = t[n];
      if (r === void 0 || r.type === `table` || !/^(t(a(b(l(e)?)?)?)?)?$/.test(r.latex))
        return this.insertTableAfter(e);
      if (this.destroyed) return `row-limit`;
      let i = vd(r.id, n, _d(t, this.analysis));
      return (
        this.commitRows(
          t.map((t) => (t.id === e ? i : t)),
          op,
          !0
        ),
        { id: e }
      );
    }
    editRows(e) {
      if (this.destroyed) return null;
      let t = this.doc.rows,
        n = e(t, { nextId: () => this.doc.nextId(), used: _d(t, this.analysis) });
      return n === null ? null : n.length > 100 ? `row-limit` : (this.commitRows(n, op, !0), null);
    }
    editCell(e, t, n, r, i) {
      return this.editTable(e, i, (e) => bd(e, t, n, r));
    }
    editHeader(e, t, n, r) {
      return this.editTable(e, r, (e) => xd(e, t, n));
    }
    deleteTableRow(e, t) {
      this.editTable(e, `api`, (e) => Cd(e, t));
    }
    deleteTableColumn(e, t) {
      this.editTable(e, `api`, (e) => Td(e, t));
    }
    setColumnStyle(e, t, n) {
      this.editTable(e, `api`, (e) => Ed(e, t, n));
    }
    deleteRow(e) {
      let t = this.doc.rows,
        n = t.find((t) => t.id === e);
      if (n?.type === `table`) {
        let r = Dd(n);
        this.commitRows(
          t.map((t) => (t.id === e ? r : t)),
          op,
          !0
        );
        return;
      }
      if (!t.some((t) => t.id === e)) return;
      let r = t.length === 1 ? [{ ...t[0], latex: `` }] : t.filter((t) => t.id !== e);
      this.commitRows(r, op, !0);
    }
    clearAll() {
      this.commitRows([], op, !0);
    }
    setRowHidden(e, t) {
      this.commitRows(this.withRow(e, { hidden: t }), op, !0);
    }
    setView(e) {
      let t = this.destroyed ? null : af(this.graph, this.viewport, e);
      t !== null && ((this.graph = t), this.moveViewport({ ...e.viewport }, !0));
    }
    setFocusedRow(e) {
      (this.doc.endGroup(),
        this.setFocus(e, e ?? this.activeRowId),
        e !== null && this.setSelectedRow(e));
    }
    poiCurves(e) {
      let t = this.analysis.byId.get(e);
      if (t === void 0 || !t.isGraphable) return [];
      let n = bf(this.doc.rows, (e) => this.inbox.result(e));
      return kl(t, Ec(this.analysis, n, Hd(this.currentSettings)));
    }
    setSelectedRow(e) {
      let t = e !== null && this.doc.rows.some((t) => t.id === e) ? e : null;
      this.destroyed ||
        t === this.selectedRowId ||
        ((this.selectedRowId = t),
        this.deps.backend.post({ v: 1, type: `select`, rowId: t }),
        this.changed());
    }
    live() {
      if (this.destroyed) throw new fd(`destroyed`, `the calculator is destroyed`);
      return this;
    }
    activate(e, t) {
      (this.doc.rows.some((t) => t.id === e) || lp(`${t}: no row has id ${String(e)}`),
        this.setFocus(this.focusedRowId, e),
        this.setSelectedRow(e));
    }
    setFocus(e, t) {
      this.destroyed ||
        (e === this.focusedRowId && t === this.activeRowId) ||
        (t !== this.activeRowId && this.observers.markDirty(`focusedExpression`),
        ([this.focusedRowId, this.activeRowId] = [e, t]),
        this.changed());
    }
    resetDocument(e, t) {
      (this.selectedRowId !== null &&
        ((this.selectedRowId = null),
        this.deps.backend.post({ v: 1, type: `select`, rowId: null })),
        t ? cd(sp, this.doc.rows) || this.doc.commit(sp, op) : this.doc.reset(),
        this.storeSettings(e),
        (this.viewport = Object.freeze(O(this.graph?.size ?? rd))),
        this.analyze());
      let n = this.options.seed ?? this.deps.randomSeed();
      (this.deps.backend.post({ v: 1, type: `hello`, seed: n }),
        this.inbox.reset(),
        this.postState(!0));
    }
    storeSettings(e) {
      let { settings: t, wireChanged: n } = ef(this.currentSettings, e);
      return (
        t !== this.currentSettings && this.observers.markDirty(`settings`),
        (this.currentSettings = t),
        n
      );
    }
    moveViewport(e, t = !1) {
      ((this.viewport = Object.freeze(e)), this.revision++, this.postView(), this.changed(t));
    }
    upsert(e, t) {
      let n = qd(this.doc.rows, t);
      (n.length > 100 && lp(`${e}: more than 100 rows`), this.commitRows(n, op));
    }
    withRow(e, t) {
      return this.doc.rows.map((n) => (n.id === e ? { ...n, ...t } : n));
    }
    editTable(e, t, n) {
      let r = this.doc.rows.find((t) => t.id === e);
      if (r === void 0 || r.type !== `table`) return null;
      let i = n(r);
      if (typeof i == `string`) return i;
      let a =
        t === `typing` || t === `keypad` ? { kind: `group`, rowId: e, at: this.deps.now() } : op;
      return (
        this.commitRows(
          this.doc.rows.map((t) => (t.id === e ? i : t)),
          a,
          !0
        ),
        null
      );
    }
    commitRows(e, t, n = !1) {
      this.destroyed || cd(e, this.doc.rows) || (this.doc.commit(e, t), this.afterCommit(n));
    }
    afterCommit(e = !1) {
      (this.analyze(), this.revision++, this.postState(), this.changed(e));
    }
    analyze() {
      let e = this.doc.rows.map(
        ({ id: e, latex: t, hidden: n, type: r, columns: i, logMode: a }) =>
          r === `table`
            ? { id: e, latex: t, hidden: n, columns: i ?? [] }
            : { id: e, latex: t, hidden: n, logMode: a === !0 }
      );
      ((this.analysis = xi(e, Hd(this.currentSettings))),
        this.observers.markDirty(`expressionAnalysis`));
      let t = (e) => (e !== null && this.analysis.byId.has(e) ? e : null);
      (t(this.activeRowId) !== this.activeRowId && this.observers.markDirty(`focusedExpression`),
        ([this.focusedRowId, this.activeRowId] = [t(this.focusedRowId), t(this.activeRowId)]),
        this.selectedRowId !== null &&
          t(this.selectedRowId) === null &&
          ((this.selectedRowId = null),
          this.deps.backend.post({ v: 1, type: `select`, rowId: null })));
    }
    postState(e = !1) {
      (this.generation++,
        this.deps.backend.post(Ud(this.generation, this.doc.rows, this.currentSettings)),
        this.inbox.noteState(this.generation, Ld(this.doc.rows, this.analysis)),
        e && this.postView(),
        this.helpers.reissue());
    }
    postView() {
      this.observers.noteBounds(this.viewport, this.graph?.size ?? rd);
      let e = this.graph;
      e !== null &&
        (this.generation++,
        this.deps.backend.post(Wd(this.generation, this.viewport, e.size, e.dpr)),
        this.inbox.noteView(this.generation));
    }
    changed(e = !1) {
      ((this.snapshot = null), this.observers.committed(e));
    }
    buildSnapshot() {
      return {
        revision: this.revision,
        rows: this.doc.rows.map((e) =>
          yf(e, this.analysis.byId.get(e.id), this.inbox.result(e.id))
        ),
        settings: this.currentSettings,
        viewport: this.viewport,
        view: this.graph && { viewport: this.viewport, size: this.graph.size, dpr: this.graph.dpr },
        geometry: this.inbox.geometry,
        focusedRowId: this.focusedRowId,
        activeRowId: this.activeRowId,
        selectedRowId: this.selectedRowId,
        poi: this.inbox.poi?.rowId === this.selectedRowId ? this.inbox.poi : null,
        canUndo: this.doc.canUndo(),
        canRedo: this.doc.canRedo(),
        backendKind: this.deps.backend.kind,
      };
    }
  };
function lp(e) {
  throw new fd(`invalid-argument`, e);
}
function up(e, t) {
  return (
    Lf(e),
    new cp(e, {
      backend: t?.backend ?? ed(),
      scheduleFrame: t?.scheduleFrame ?? td,
      now: t?.now ?? (() => performance.now()),
      randomSeed: t?.randomSeed ?? nd,
    })
  );
}
var dp = `/* vendor/mathquill/mathquill.css */
/*
 * MathQuill v0.10.1, by Han, Jeanine, and Mary
 * http://mathquill.com | maintainers@mathquill.com
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL
 * was not distributed with this file, You can obtain
 * one at http://mozilla.org/MPL/2.0/.
 */
.mq-aria-alert {
  position: absolute;
  left: -1000px;
  top: -1000px;
  width: 0px;
  height: 0px;
  text-align: left;
  overflow: hidden;
}
.mq-mathspeak {
  position: absolute;
  left: -1000px;
  top: -1000px;
  width: 0px;
  height: 0px;
  text-align: left;
  overflow: hidden;
}
.mq-editable-field {
  display: -moz-inline-box;
  display: inline-block;
}
.mq-editable-field .mq-cursor {
  border-left: 1px solid currentColor;
  margin-left: -1px;
  position: relative;
  z-index: 1;
  padding: 0;
  display: -moz-inline-box;
  display: inline-block;
}
.mq-editable-field .mq-cursor.mq-blink {
  visibility: hidden;
}
.mq-editable-field,
.mq-math-mode .mq-editable-field {
  border: 1px solid gray;
}
.mq-editable-field.mq-focused,
.mq-math-mode .mq-editable-field.mq-focused {
  -webkit-box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;
  -moz-box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;
  box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;
  border-color: #709AC0;
}
.mq-math-mode .mq-editable-field {
  margin: 1px;
}
.mq-editable-field .mq-latex-command-input {
  color: inherit;
  font-family: "Courier New", monospace;
  border: 1px solid gray;
  padding-right: 1px;
  margin-right: 1px;
  margin-left: 2px;
}
.mq-editable-field .mq-latex-command-input.mq-empty {
  background: transparent;
}
.mq-editable-field .mq-latex-command-input.mq-hasCursor {
  border-color: ActiveBorder;
}
.mq-editable-field.mq-empty:after,
.mq-editable-field.mq-text-mode:after,
.mq-math-mode .mq-empty:after {
  visibility: hidden;
  content: 'c';
}
.mq-editable-field .mq-cursor:only-child:after,
.mq-editable-field .mq-textarea + .mq-cursor:last-child:after {
  visibility: hidden;
  content: 'c';
}
.mq-editable-field .mq-text-mode .mq-cursor:only-child:after {
  content: '';
}
.mq-editable-field.mq-text-mode {
  overflow-x: auto;
  overflow-y: hidden;
}
.mq-root-block,
.mq-math-mode .mq-root-block {
  display: -moz-inline-box;
  display: inline-block;
  width: 100%;
  padding: 2px;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  vertical-align: middle;
}
.mq-root-block .mq-digit,
.mq-math-mode .mq-root-block .mq-digit {
  margin-left: 0.009em;
  margin-right: 0.009em;
}
.mq-root-block .mq-group-start,
.mq-math-mode .mq-root-block .mq-group-start {
  margin-left: 0.11em;
  margin-right: -0.01em;
}
.mq-root-block .mq-group-other,
.mq-math-mode .mq-root-block .mq-group-other {
  margin-left: -0.01em;
  margin-right: -0.01em;
}
.mq-root-block .mq-group-leading-1,
.mq-math-mode .mq-root-block .mq-group-leading-1,
.mq-root-block .mq-group-leading-2,
.mq-math-mode .mq-root-block .mq-group-leading-2 {
  margin-left: 0;
  margin-right: -0.01em;
}
.mq-root-block .mq-group-leading-3,
.mq-math-mode .mq-root-block .mq-group-leading-3 {
  margin-left: 0.036em;
  margin-right: -0.01em;
}
.mq-root-block.mq-suppress-grouping .mq-group-start,
.mq-math-mode .mq-root-block.mq-suppress-grouping .mq-group-start,
.mq-root-block.mq-suppress-grouping .mq-group-other,
.mq-math-mode .mq-root-block.mq-suppress-grouping .mq-group-other,
.mq-root-block.mq-suppress-grouping .mq-group-leading-1,
.mq-math-mode .mq-root-block.mq-suppress-grouping .mq-group-leading-1,
.mq-root-block.mq-suppress-grouping .mq-group-leading-2,
.mq-math-mode .mq-root-block.mq-suppress-grouping .mq-group-leading-2,
.mq-root-block.mq-suppress-grouping .mq-group-leading-3,
.mq-math-mode .mq-root-block.mq-suppress-grouping .mq-group-leading-3 {
  margin-left: 0.009em;
  margin-right: 0.009em;
}
.mq-math-mode {
  font-variant: normal;
  font-weight: normal;
  font-style: normal;
  font-size: 115%;
  line-height: 1;
  display: -moz-inline-box;
  display: inline-block;
}
.mq-math-mode .mq-non-leaf,
.mq-math-mode .mq-scaled {
  display: -moz-inline-box;
  display: inline-block;
}
.mq-math-mode var {
  font-family: var(--kc-font-math, "Times New Roman", serif);
  font-style: italic;
  line-height: .9;
}
.mq-math-mode .mq-text-mode,
.mq-math-mode .mq-nonSymbola {
  font-family: var(--kc-font-math, "Times New Roman", serif);
  line-height: .9;
}
.mq-math-mode svg {
  fill: currentColor;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.mq-math-mode * {
  font-size: inherit;
  line-height: inherit;
  margin: 0;
  padding: 0;
  border-color: black;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  box-sizing: border-box;
}
.mq-math-mode .mq-empty {
  background: rgba(0, 0, 0, 0.2);
}
.mq-math-mode .mq-empty.mq-root-block {
  background: transparent;
}
.mq-math-mode .mq-empty.mq-quiet-delimiter {
  background: transparent;
}
.mq-math-mode.mq-empty {
  background: transparent;
}
.mq-math-mode .mq-text-mode {
  display: inline-block;
  white-space: pre;
}
.mq-math-mode .mq-text-mode.mq-hasCursor {
  box-shadow: inset darkgray 0 .1em .2em;
  padding: 0 .1em;
  margin: 0 -0.1em;
  min-width: 1ex;
}
.mq-math-mode .mq-font {
  font: 1em var(--kc-font-math, "Times New Roman", serif);
}
.mq-math-mode .mq-font * {
  font-family: inherit;
  font-style: inherit;
}
.mq-math-mode b,
.mq-math-mode b.mq-font {
  font-weight: bolder;
}
.mq-math-mode var,
.mq-math-mode i,
.mq-math-mode i.mq-font {
  font-style: italic;
}
.mq-math-mode var.mq-f {
  margin-right: 0.2em;
  margin-left: 0.1em;
}
.mq-math-mode .mq-roman var.mq-f {
  margin: 0;
}
.mq-math-mode big {
  font-size: 200%;
}
.mq-math-mode .mq-int > big {
  display: inline-block;
  -webkit-transform: scaleX(0.7);
  -moz-transform: scaleX(0.7);
  -ms-transform: scaleX(0.7);
  -o-transform: scaleX(0.7);
  transform: scaleX(0.7);
  vertical-align: -0.16em;
}
.mq-math-mode .mq-int > .mq-supsub {
  font-size: 80%;
  vertical-align: -1.1em;
  padding-right: .2em;
}
.mq-math-mode .mq-int > .mq-supsub > .mq-sup > .mq-sup-inner {
  vertical-align: 1.3em;
}
.mq-math-mode .mq-int > .mq-supsub > .mq-sub {
  margin-left: -0.35em;
}
.mq-math-mode .mq-roman {
  font-style: normal;
}
.mq-math-mode .mq-sans-serif {
  font-family: sans-serif, "Times New Roman", serif;
}
.mq-math-mode .mq-monospace {
  font-family: monospace, "Times New Roman", serif;
}
.mq-math-mode .mq-overline {
  border-top: 1px solid;
  margin-top: 1px;
}
.mq-math-mode .mq-underline {
  border-bottom: 1px solid;
  margin-bottom: 1px;
}
.mq-math-mode .mq-binary-operator {
  padding: 0 0.2em;
  display: -moz-inline-box;
  display: inline-block;
}
.mq-math-mode .mq-supsub {
  text-align: left;
  font-size: 90%;
  vertical-align: -0.5em;
}
.mq-math-mode .mq-supsub.mq-sup-only {
  vertical-align: .5em;
}
.mq-math-mode .mq-supsub.mq-sup-only > .mq-sup {
  display: inline-block;
  vertical-align: text-bottom;
}
.mq-math-mode .mq-supsub .mq-sup {
  display: block;
}
.mq-math-mode .mq-supsub .mq-sub {
  display: block;
  float: left;
}
.mq-math-mode .mq-supsub .mq-binary-operator {
  padding: 0 .1em;
}
.mq-math-mode .mq-supsub .mq-fraction {
  font-size: 70%;
}
.mq-math-mode sup.mq-nthroot {
  font-size: 80%;
  vertical-align: 0.8em;
  margin-right: -0.6em;
  margin-left: .2em;
  min-width: .5em;
}
.mq-math-mode .mq-ghost svg {
  opacity: 0.2;
}
.mq-math-mode .mq-bracket-middle {
  margin-top: .1em;
  margin-bottom: .1em;
}
.mq-math-mode .mq-bracket-l,
.mq-math-mode .mq-bracket-r {
  position: absolute;
  top: 0;
  bottom: 2px;
}
.mq-math-mode .mq-bracket-l {
  left: 0;
}
.mq-math-mode .mq-bracket-r {
  right: 0;
}
.mq-math-mode .mq-bracket-container {
  position: relative;
}
.mq-math-mode .mq-array {
  vertical-align: middle;
  text-align: center;
}
.mq-math-mode .mq-array > span {
  display: block;
}
.mq-math-mode .mq-operator-name {
  font-family: var(--kc-font-math, "Times New Roman", serif);
  line-height: .9;
  font-style: normal;
}
.mq-math-mode var.mq-operator-name.mq-first {
  padding-left: .2em;
}
.mq-math-mode var.mq-operator-name.mq-last,
.mq-math-mode .mq-supsub.mq-after-operator-name {
  padding-right: .2em;
}
.mq-math-mode .mq-fraction {
  font-size: 90%;
  text-align: center;
  vertical-align: -0.4em;
  padding: 0 .2em;
}
.mq-math-mode .mq-fraction,
.mq-math-mode .mq-large-operator,
.mq-math-mode x:-moz-any-link {
  display: -moz-groupbox;
}
.mq-math-mode .mq-fraction,
.mq-math-mode .mq-large-operator,
.mq-math-mode x:-moz-any-link,
.mq-math-mode x:default {
  display: inline-block;
}
.mq-math-mode .mq-numerator,
.mq-math-mode .mq-denominator,
.mq-math-mode .mq-dot-recurring {
  display: block;
}
.mq-math-mode .mq-numerator {
  padding: 0 0.1em;
}
.mq-math-mode .mq-denominator {
  border-top: 1px solid;
  float: right;
  width: 100%;
  padding: 0.1em;
}
.mq-math-mode .mq-dot-recurring {
  text-align: center;
  height: 0.3em;
}
.mq-math-mode .mq-sqrt-prefix {
  position: absolute;
  top: 1px;
  bottom: 0.15em;
  width: 0.95em;
}
.mq-math-mode .mq-sqrt-container {
  position: relative;
}
.mq-math-mode .mq-sqrt-stem {
  border-top: 1px solid;
  margin-top: 1px;
  margin-left: 0.9em;
  padding-left: .15em;
  padding-right: .2em;
  margin-right: .1em;
  padding-top: 1px;
}
.mq-math-mode .mq-diacritic-above {
  display: block;
  text-align: center;
  line-height: .4em;
}
.mq-math-mode .mq-diacritic-stem {
  display: block;
  text-align: center;
}
.mq-math-mode .mq-hat-prefix {
  display: block;
  text-align: center;
  line-height: .95em;
  margin-bottom: -0.7em;
  transform: scaleX(1.5);
  -moz-transform: scaleX(1.5);
  -o-transform: scaleX(1.5);
  -webkit-transform: scaleX(1.5);
}
.mq-math-mode .mq-hat-stem {
  display: block;
}
.mq-math-mode .mq-large-operator {
  vertical-align: -0.2em;
  padding: .2em;
  text-align: center;
}
.mq-math-mode .mq-large-operator .mq-from,
.mq-math-mode .mq-large-operator big,
.mq-math-mode .mq-large-operator .mq-to {
  display: block;
}
.mq-math-mode .mq-large-operator .mq-from,
.mq-math-mode .mq-large-operator .mq-to {
  font-size: 80%;
}
.mq-math-mode .mq-large-operator .mq-from {
  float: right;
  /* take out of normal flow to manipulate baseline */
  width: 100%;
}
.mq-math-mode,
.mq-math-mode .mq-editable-field {
  cursor: text;
  font-family: var(--kc-font-math, "Times New Roman", serif);
}
.mq-math-mode .mq-overarc {
  border-top: 1px solid black;
  -webkit-border-top-right-radius: 50% .3em;
  -moz-border-radius-topright: 50% .3em;
  border-top-right-radius: 50% .3em;
  -webkit-border-top-left-radius: 50% .3em;
  -moz-border-radius-topleft: 50% .3em;
  border-top-left-radius: 50% .3em;
  margin-top: 1px;
  padding-top: 0.15em;
}
.mq-math-mode .mq-overarrow {
  min-width: .5em;
  border-top: 1px solid black;
  margin-top: 1px;
  padding-top: 0.2em;
  text-align: center;
  position: relative;
}
.mq-math-mode .mq-overarrow:after {
  position: absolute;
  right: -0.1em;
  top: -0.48em;
  font-size: 0.5em;
  content: '\\27A4';
}
.mq-math-mode .mq-overarrow.mq-arrow-left:after {
  content: '';
  display: none;
}
.mq-math-mode .mq-overarrow.mq-arrow-left:before,
.mq-math-mode .mq-overarrow.mq-arrow-leftright:before {
  position: absolute;
  top: -0.48em;
  left: -0.1em;
  font-size: 0.5em;
  content: '\\27A4';
  -moz-transform: scaleX(-1);
  -o-transform: scaleX(-1);
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
  filter: FlipH;
  -ms-filter: "FlipH";
}
.mq-math-mode .mq-selection,
.mq-editable-field .mq-selection,
.mq-math-mode .mq-selection .mq-non-leaf,
.mq-editable-field .mq-selection .mq-non-leaf,
.mq-math-mode .mq-selection .mq-scaled,
.mq-editable-field .mq-selection .mq-scaled {
  background: #B4D5FE !important;
}
.mq-math-mode .mq-selection.mq-blur,
.mq-editable-field .mq-selection.mq-blur,
.mq-math-mode .mq-selection.mq-blur .mq-non-leaf,
.mq-editable-field .mq-selection.mq-blur .mq-non-leaf,
.mq-math-mode .mq-selection.mq-blur .mq-scaled,
.mq-editable-field .mq-selection.mq-blur .mq-scaled {
  background: #D4D4D4 !important;
  color: black;
  border-color: black;
}
html body .mq-math-mode .mq-selection .mq-nthroot-container *,
html body .mq-editable-field .mq-selection .mq-nthroot-container * {
  background: transparent !important;
}
.mq-editable-field .mq-textarea,
.mq-math-mode .mq-textarea {
  position: relative;
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
}
.mq-editable-field .mq-textarea *,
.mq-math-mode .mq-textarea * {
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
  position: absolute;
  clip: rect(1em 1em 1em 1em);
  -webkit-transform: scale(0);
  -moz-transform: scale(0);
  -ms-transform: scale(0);
  -o-transform: scale(0);
  transform: scale(0);
  resize: none;
  width: 1px;
  height: 1px;
  box-sizing: content-box;
}

/* src/components/calculator/styles/tokens.css */
/* The calculator's design tokens: the one source for type, size, geometry, motion and the tones
   mixed from the skin's colour roles. Values are the reference graphing calculator's measurements
   (rea-targets visual MASTER.md section 1). On the classic skin (text #000000, list #ffffff) each
   mixed tone equals the measured value; other skins mix from their own roles (TH-3). */
:host {
  /* Type */
  --kc-font-ui: Arial, Arimo, "Liberation Sans", sans-serif;
  --kc-font-math: "Times New Roman", Tinos, "Liberation Serif", serif;
  --kc-size-ui: 16px;
  --kc-size-list: 17.6px;
  --kc-size-math: 20.24px;
  --kc-size-row-index: 10.4px;
  --kc-size-small: 12.8px;
  --kc-size-tooltip: 14px;
  --kc-line-tooltip: 15.4px;
  --kc-size-eval: 15.2px;
  --kc-size-eval-math: 17.48px;
  --kc-size-slider-letter: 15.64px;
  --kc-size-slider-word: 13.6px;

  /* Geometry; the list width is set inline on .kc-app by useListWidth (EL-1 default, square snap) */
  --kc-list-width: 320px;
  --kc-toolbar-h: 48px;
  --kc-tool-size: 40px;
  --kc-gutter: 38px;
  --kc-colour-icon: 29px;
  --kc-radius-chip: 4px;
  --kc-radius-button: 5px;
  --kc-radius-small: 3px;
  --kc-graph-button: 37px;

  /* Icon and control opacities */
  --kc-icon-rest: 0.6;
  --kc-icon-hover: 0.8;
  --kc-icon-hover-graph: 0.9;
  --kc-icon-pressed: 1;
  --kc-icon-disabled: 0.3;
  --kc-delete-rest: 0.2;
  --kc-delete-hover: 0.6;
  --kc-delete-pressed: 0.8;
  --kc-equals-opacity: 0.55;
  --kc-menu-item-rest: 0.5;
  --kc-menu-item-hover: 0.8;

  /* Tones mixed from the roles */
  --kc-rule: color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-row-rule: color-mix(in srgb, var(--kc-text) 15.2%, transparent); /* rgba(206,206,206,0.8) */
  --kc-tab: color-mix(in srgb, var(--kc-text) 6.7%, var(--kc-list));
  --kc-tab-rule: color-mix(in srgb, var(--kc-text) 6%, transparent);
  --kc-toolbar-top: color-mix(in srgb, var(--kc-text) 1.2%, var(--kc-list));
  --kc-toolbar-bottom: color-mix(in srgb, var(--kc-text) 8.2%, var(--kc-list));
  --kc-hover-fill: color-mix(in srgb, var(--kc-text) 10%, transparent);
  --kc-pressed-fill: color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-chip-fill: color-mix(in srgb, var(--kc-text) 4%, transparent);
  --kc-row-number: color-mix(in srgb, var(--kc-text) 65%, transparent);
  --kc-text-muted: color-mix(in srgb, var(--kc-text) 60%, transparent);
  --kc-empty-block: color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-hidden-ring: color-mix(in srgb, var(--kc-text-secondary) 70%, var(--kc-list));
  --kc-panel-shadow: color-mix(in srgb, var(--kc-text) 10%, transparent);
  --kc-tooltip-error: var(--kc-text-secondary);
  --kc-letter-top: color-mix(in srgb, var(--kc-text) 3.5%, var(--kc-list));
  --kc-letter-bottom: color-mix(
    in srgb,
    var(--kc-accent) 1.5%,
    color-mix(in srgb, var(--kc-text) 4.5%, var(--kc-list))
  );
  --kc-letter-border: color-mix(in srgb, var(--kc-text) 12.5%, transparent);
  --kc-pill: color-mix(in srgb, var(--kc-text) 7%, var(--kc-list));
  --kc-pill-pressed: color-mix(in srgb, var(--kc-text) 9%, var(--kc-list));
  --kc-pill-border: color-mix(in srgb, var(--kc-text) 10%, transparent);
  --kc-pill-shadow: 0 0 5px color-mix(in srgb, var(--kc-text) 10%, transparent);
  --kc-popover-shadow: 0 5px 10px color-mix(in srgb, var(--kc-text) 20%, transparent);

  /* Keypad (VIS-KEYPAD-1 to 41): mixed from the skin's roles (TH-3); on the classic skin each
     mix equals the reference's measured value. Keys: */
  --kc-kp-light-top: var(--kc-key);
  --kc-kp-light-bottom: color-mix(in srgb, var(--kc-text) 2%, var(--kc-key));
  --kc-kp-light-border: color-mix(in srgb, var(--kc-text) 15.3%, var(--kc-key));
  --kc-kp-light-hover: color-mix(in srgb, var(--kc-text) 4%, var(--kc-key));
  --kc-kp-light-pressed: color-mix(in srgb, var(--kc-text) 7.8%, var(--kc-key));
  --kc-kp-light-pressed-border: color-mix(in srgb, var(--kc-text) 18.8%, var(--kc-key));
  --kc-kp-dark-top: color-mix(in srgb, var(--kc-text) 13%, transparent);
  --kc-kp-dark-bottom: color-mix(in srgb, var(--kc-text) 16%, transparent);
  --kc-kp-dark-hover: color-mix(in srgb, var(--kc-text) 16%, transparent);
  --kc-kp-dark-pressed: color-mix(in srgb, var(--kc-text) 19%, transparent);
  --kc-kp-accent-hover: color-mix(in srgb, var(--kc-text) 10%, var(--kc-accent));
  --kc-kp-accent-pressed: color-mix(in srgb, var(--kc-text) 20%, var(--kc-accent));
  --kc-kp-edge: color-mix(in srgb, var(--kc-text) 10%, transparent);
  --kc-kp-shine: color-mix(in srgb, var(--kc-key) 25%, transparent);
  --kc-kp-shine-dark: color-mix(in srgb, var(--kc-key) 10%, transparent);
  --kc-kp-shade: color-mix(in srgb, var(--kc-text) 2%, transparent);
  --kc-kp-shade-accent: color-mix(in srgb, var(--kc-text) 4%, transparent);
  --kc-kp-dim: color-mix(in srgb, var(--kc-text) 47%, transparent);
  /* Keypad Functions popover buttons */
  --kc-kp-fn-top: color-mix(in srgb, var(--kc-text) 3.5%, var(--kc-key));
  --kc-kp-fn-bottom: color-mix(in srgb, var(--kc-text) 5.9%, var(--kc-key));
  --kc-kp-fn-hover: color-mix(in srgb, var(--kc-text) 7%, var(--kc-key));
  --kc-kp-fn-hover-border: color-mix(in srgb, var(--kc-text) 13%, transparent);
  --kc-kp-fn-pressed: color-mix(in srgb, var(--kc-text) 12%, var(--kc-key));
  --kc-kp-fn-pressed-border: color-mix(in srgb, var(--kc-text) 15%, transparent);

  /* Motion: hover and press are instant; the rest use ease or ease-out. */
  --kc-dur-hover: 0ms;
  --kc-dur-200: 200ms;
  --kc-dur-250: 250ms;
  --kc-dur-300: 300ms;
  --kc-dur-400: 400ms;
  --kc-dur-800: 800ms;
  --kc-ease: ease;
  --kc-ease-out: ease-out;
}
@media (prefers-reduced-motion: reduce) {
  :host {
    --kc-dur-200: 0ms;
    --kc-dur-250: 0ms;
    --kc-dur-300: 0ms;
    --kc-dur-400: 0ms;
    --kc-dur-800: 0ms;
  }
}
:host([data-reduced-motion="true"]) {
  --kc-dur-200: 0ms;
  --kc-dur-250: 0ms;
  --kc-dur-300: 0ms;
  --kc-dur-400: 0ms;
  --kc-dur-800: 0ms;
}

/* src/components/calculator/styles/base.css */
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
  line-height: 1.4;
  color: var(--kc-text);
  background: var(--kc-list);
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
/* TH-14: the one keyboard focus ring of every control in the shadow root, a 2 px focus-ring outline
   2 px out; other rules only move it (an inset offset) where the control is clipped. */
:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: 2px;
}
/* AN-13, AR-38: the OS preference or the quiz setting makes every motion instant. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
}
:host([data-reduced-motion="true"]) *,
:host([data-reduced-motion="true"]) *::before,
:host([data-reduced-motion="true"]) *::after {
  transition-duration: 0ms !important;
  animation-duration: 0ms !important;
  animation-delay: 0ms !important;
  animation-iteration-count: 1 !important;
}
button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}
.kc-root {
  width: 100%;
  height: 100%;
}
.kc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  white-space: nowrap;
  clip-path: inset(50%);
}

/* L-1, L-2: one grid, areas keyed on data-kc-layout, so a layout switch never remounts a MathField
   (AR-26). DOM order stays list, graph, keypad (10 Decision 1). Side by side (RS-2, RS-4) the list
   column is clamp(320px, 160px + 20%, 500px), the graph spans the full height and the open keypad
   lies across the bottom over both, so the graph never resizes for it. Stacked (RS-3) the graph
   keeps the top 42% and the keypad takes its height from the list. */
.kc-app {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.kc-app[data-kc-layout="desktop"] {
  grid-template:
    "list graph" minmax(0, 1fr)
    "keypad keypad" auto
    / var(--kc-list-width) minmax(0, 1fr);
}
.kc-app[data-kc-layout="desktop"] > .kc-graph-region {
  grid-row: 1 / 3;
}
.kc-app[data-kc-layout="desktop"][data-collapsed="true"] {
  grid-template-columns: 0 minmax(0, 1fr);
}
.kc-app[data-kc-layout="stacked"] {
  grid-template:
    "graph" 42%
    "list" minmax(0, 1fr)
    "keypad" auto
    / minmax(0, 1fr);
}
.kc-app[data-kc-layout="stacked"][data-collapsed="true"] {
  grid-template-rows: minmax(0, 1fr) 0 auto;
}
/* The list paints over the graph's edge for its shadow strip and the Expand list button. */
.kc-list-region {
  position: relative;
  z-index: 2;
  grid-area: list;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.kc-list-region > .kc-list-panel {
  flex: 1 1 0;
  min-height: 0;
}
/* EL-4: the resize divider, 15 px from 3 px inside the list's edge, over the graph. */
.kc-list-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--kc-list-width) - 3px);
  z-index: 2;
  width: 15px;
  cursor: ew-resize;
  touch-action: none;
}

.kc-list-resizer:focus-visible {
  outline-offset: -2px;
}

.kc-graph-region {
  grid-area: graph;
  position: relative;
  min-width: 0;
  min-height: 0;
}
/* The keypad paints over the list (stacked) or graph (desktop) so its top shadow shows. */
.kc-keypad-region {
  grid-area: keypad;
  position: relative;
  z-index: 3;
  min-width: 0;
}
/* L-14: the keypad sits in flow below the list, so the list's scroll box ends at its top edge;
   reveal-row.ts scrolls the focused or active row back into view when that box resizes. */
[data-row-id] {
  scroll-margin-block: 8px;
}

/* TH-17: math at --kc-size-math (20.24 px, 115% of the 17.6 px list text); this comes after
   MathQuill's 115% rule, so it wins wherever the parent text is another size. */
.mq-math-mode,
.mq-editable-field {
  font-size: var(--kc-size-math);
}

/* src/components/calculator/styles/error-tip.css */
/* R-2, D-6, D-10: the warning glyph and the tooltip that holds an error's message. The tooltip is
   portalled into the calculator root and placed from the marker's bounding box (ErrorMarker.tsx),
   so no row's overflow clips it and it overlaps the rows below. Colours come only from roles. */

/* The exclamation mark is the list colour showing through the triangle. */
.kc-warning-mark {
  stroke: var(--kc-list);
}

.kc-warning-mark-dot {
  fill: var(--kc-list);
}

/* D-6: a table cell's or header's marker, 16 px wide, at the left inside it. */
.kc-cell-warning {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--kc-warning);
  cursor: pointer;
}

/* The field beside a marker takes the rest of the cell and may shrink below its content. */
.kc-cell-warning ~ .kc-table-field {
  flex: 1 1 0;
  min-width: 0;
}

.kc-cell-warning:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: -1px;
}

.kc-list-panel[data-pointer="coarse"] .kc-cell-warning {
  width: 24px;
}

/* VIS-35: a grey box 200 px wide, white 14 px text on a 15.4 px line, 5 px by 8 px padding, 4 px
   radius, under its marker with a 5 px arrow pointing up at it (--kc-tip-arrow is the marker's
   centre inside the box), or above it with the arrow pointing down when there is no room below. */
.kc-error-tip {
  --kc-tip-arrow: 50%;
  position: fixed;
  z-index: 10;
  box-sizing: border-box;
  width: 200px;
  padding: 5px 8px;
  border-radius: var(--kc-radius-chip);
  background: var(--kc-tooltip-error);
  color: var(--kc-tooltip-label);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-tooltip);
  line-height: var(--kc-line-tooltip);
  text-align: center;
  overflow-wrap: anywhere;
  pointer-events: none;
  animation: kc-error-tip-in var(--kc-dur-300) var(--kc-ease);
}

/* VIS-32: a click pins the tooltip; it turns black and its text can be selected. */
.kc-error-tip[data-pinned="true"] {
  background: var(--kc-tooltip);
  pointer-events: auto;
  user-select: text;
  cursor: text;
}

.kc-error-tip[data-pinned="true"]::before {
  border-bottom-color: var(--kc-tooltip);
}

.kc-error-tip[data-pinned="true"][data-side="above"]::before {
  border-top-color: var(--kc-tooltip);
  border-bottom-color: transparent;
}

.kc-error-tip[hidden] {
  display: none;
}

.kc-error-tip::before {
  content: "";
  position: absolute;
  top: -5px;
  left: var(--kc-tip-arrow);
  margin-left: -5px;
  border: 5px solid transparent;
  border-top-width: 0;
  border-bottom-color: var(--kc-tooltip-error);
}

.kc-error-tip[data-side="above"]::before {
  top: auto;
  bottom: -5px;
  border-top-width: 5px;
  border-bottom-width: 0;
  border-top-color: var(--kc-tooltip-error);
  border-bottom-color: transparent;
}

/* A 300 ms opacity fade; reduced motion sets the duration to 0 (base.css). */
@keyframes kc-error-tip-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* src/components/calculator/styles/graph.css */
/* The graph panel (G-5, A11Y-1; the DOM contract). The paper is the panel's background, so a
   canvas pixel without shading stays transparent. Colours come only from role variables (TH-3). */
.kc-graph {
  position: relative;
  width: 100%;
  height: 100%;
  min-block-size: 0;
  overflow: hidden;
  background: var(--kc-paper);
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.kc-graph-layers,
.kc-graph-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* The graph's one tab stop. The 4 px inset keeps the focus outline inside the clipped panel.
   GP-50: the paper keeps the default cursor, also while dragging. */
.kc-graph-surface {
  position: absolute;
  inset: 4px;
  cursor: auto;
}

.kc-graph-surface:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: 2px;
}

/* G-5, GP-40 to GP-44: Graph settings, the Zoom group and Home as grey pills 5 px from the top and
   inline end, 5 px apart: 37 px boxes (the zoom group 37 by 73 with two 35 px halves), a 1 px faint
   border, 5 px radius and a soft shadow; icons rest at 0.6, 0.9 on hover, 1 pressed. */
.kc-graph-controls {
  position: absolute;
  top: 5px;
  inset-inline-end: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.kc-graph-controls > button,
.kc-zoom-group {
  border: 1px solid var(--kc-pill-border);
  border-radius: var(--kc-radius-button);
  background: var(--kc-pill);
  box-shadow: var(--kc-pill-shadow);
}

.kc-graph-controls button {
  display: grid;
  place-items: center;
  width: var(--kc-graph-button);
  height: var(--kc-graph-button);
  padding: 0;
  color: var(--kc-text);
  cursor: pointer;
}

.kc-graph-controls button > svg {
  opacity: var(--kc-icon-rest);
}

/* GP-40, GP-41: the reference's glyphs sit off the box centre: the wrench 1.3 px left and a little up,
   the plus and minus half a px left and 1 px down, the house a little left and 1 px up. */
.kc-graph-controls > button:first-child > svg {
  translate: -1.3px -0.2px;
}

.kc-zoom-group > button > svg {
  translate: -0.5px 1px;
}

.kc-graph-controls [data-graph-home] > svg {
  translate: -0.4px -1px;
}

.kc-graph-controls button:hover > svg {
  opacity: var(--kc-icon-hover-graph);
}

.kc-graph-controls button:active {
  background: var(--kc-pill-pressed);
}

.kc-graph-controls button:active > svg {
  opacity: var(--kc-icon-pressed);
}

.kc-zoom-group {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kc-zoom-group > button {
  width: 35px;
  height: 35px;
  border: none;
  background: transparent;
}

.kc-zoom-group > button + button {
  height: 36px;
  border-top: 1px solid var(--kc-pill-border);
}

.kc-graph-controls button:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: 2px;
}

/* Karman addition (D4 kept until the founder decides): on a coarse pointer the 37 px pills take
   touches over a 44 px box; the drawn pill keeps the reference size. The zoom halves stay 35 px
   (their group clips them, and they clear the 24 px minimum). */
@media (pointer: coarse) {
  .kc-graph-controls > button {
    position: relative;
  }

  .kc-graph-controls > button::before {
    content: "";
    position: absolute;
    inset: -3.5px;
  }
}

/* RS (responsive.md): on a touch screen with a calculator under 450 by 495 px the zoom buttons
   go; pinch zoom stands in for them. CalculatorLayout marks that case. */
.kc-app[data-compact-touch="true"] .kc-zoom-group {
  display: none;
}

/* AN-8: Home fades in and out with the same duration and easing. */
.kc-graph-controls [data-graph-home] {
  transition: opacity var(--kc-dur-250) var(--kc-ease-out);
}

.kc-graph-controls [data-graph-home][data-phase="entering"],
.kc-graph-controls [data-graph-home][data-phase="leaving"] {
  opacity: 0;
}

.kc-graph-controls [data-graph-home][data-phase="leaving"] {
  pointer-events: none;
}

/* POI-13, POI-19: open coordinate labels; the overlay never takes pointer input. */
.kc-poi-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* GP-37: a white box with a faint 1 px border, 5 px radius and a soft shadow; the coordinates in
   the 20.24 px math serif in near-black, padded 7/4/5 px, 42.27 px tall in all. */
.kc-poi-label {
  position: absolute;
  padding: 7px 4px 5px;
  border: 1px solid color-mix(in srgb, var(--kc-text) 11%, var(--kc-paper));
  border-radius: 5px;
  background: var(--kc-paper);
  color: color-mix(in srgb, var(--kc-text) 87%, var(--kc-paper));
  box-shadow: 0 0 5px color-mix(in srgb, var(--kc-text) 20%, transparent);
  font: 20.24px/28.27px var(--kc-font-math);
  white-space: nowrap;
}

/* src/components/calculator/styles/keypad.css */
/* The keypad, drawn to the reference keypad (rea-targets visual keypad.md, VIS-KEYPAD-1 to 41).
   Its --kc-kp-* colours are in tokens.css. */

.kc-keypad {
  /* Type: keys at 17.6 px, words at 90 % of that, maths at 18.216 px (VIS-KEYPAD-14, 15) */
  --kc-kp-word: 15.84px;
  --kc-kp-math: 18.216px;
}

/* VIS-KEYPAD-1: a full-width tray, 1 px edge plus 168 px of keys, fixed to the bottom. */
.kc-keypad {
  position: relative;
  box-sizing: border-box;
  height: 169px;
  border-top: 1px solid var(--kc-kp-edge);
  background-color: var(--kc-chrome);
  box-shadow: 0 -1px 3px var(--kc-kp-edge);
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
  font-size: 17.6px;
}

/* VIS-KEYPAD-2: the key block is at most 835 px wide, centred, padded 4 px by 3 px. */
.kc-keypad-keys {
  position: relative;
  box-sizing: border-box;
  max-width: 835px;
  margin-inline: auto;
  padding: 4px 3px;
}

/* VIS-KEYPAD-3: 40 px rows; each cell carries a 2 px margin round a 36 px key. */
.kc-keypad-row {
  position: relative;
  height: 40px;
}

/* Inline --kc-x and --kc-w place each cell as fractions of the row. */
.kc-key {
  --kc-x: 0;
  --kc-w: 0;
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: calc(var(--kc-x) * 100% + 2px);
  width: calc(var(--kc-w) * 100% - 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 2px;
  color: var(--kc-text);
  font-family: var(--kc-font-math);
  font-size: var(--kc-kp-math);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation; /* K-7: no double-tap zoom, so a double tap on = reaches the key */
  user-select: none;
}

/* A full-width key block starts on a whole pixel; there, like the reference, each key's edges
   are rounded to whole pixels (browsers without round() keep the plain calc() above). */
.kc-keypad[data-full-width="true"] .kc-key {
  left: round(calc(var(--kc-x) * 100% + 2px), 1px);
  width: calc(
    round(calc((var(--kc-x) + var(--kc-w)) * 100% - 2px), 1px) -
      round(calc(var(--kc-x) * 100% + 2px), 1px)
  );
}

/* VIS-KEYPAD-6: white keys. */
.kc-key[data-tone="light"] {
  border-color: var(--kc-kp-light-border);
  background: linear-gradient(var(--kc-kp-light-top), var(--kc-kp-light-bottom));
  box-shadow:
    inset 0 1px 0 var(--kc-kp-shine),
    inset 0 -1px 0 var(--kc-kp-shade);
}

/* VIS-KEYPAD-7: grey keys, a darkening of the tray. */
.kc-key[data-tone="dark"] {
  border-color: var(--kc-boundary);
  background: linear-gradient(var(--kc-kp-dark-top), var(--kc-kp-dark-bottom));
  box-shadow:
    inset 0 1px 0 var(--kc-kp-shine-dark),
    inset 0 -1px 0 var(--kc-kp-shade);
}

/* VIS-KEYPAD-8: Enter, the one key that eases its colour (200 ms). */
.kc-key[data-tone="accent"] {
  border-radius: 3px;
  background-color: var(--kc-accent);
  box-shadow:
    inset 0 1px 0 var(--kc-kp-shine-dark),
    inset 0 -1px 0 var(--kc-kp-shade-accent);
  color: var(--kc-accent-label);
  transition: background-color var(--kc-dur-200) var(--kc-ease);
}

/* VIS-KEYPAD-10: hover is a flat face (mouse only). */
@media (hover: hover) {
  .kc-key[data-tone="light"]:hover {
    background: var(--kc-kp-light-hover);
  }

  .kc-key[data-tone="dark"]:hover {
    background: var(--kc-kp-dark-hover);
  }

  .kc-key[data-tone="accent"]:hover {
    background-color: var(--kc-kp-accent-hover);
  }
}

/* VIS-KEYPAD-11: pressed is flatter still and drops the inset shadows. */
.kc-key:is(:active, [data-pressed="true"]) {
  box-shadow: none;
}

.kc-key[data-tone="light"]:is(:active, [data-pressed="true"]) {
  border-color: var(--kc-kp-light-pressed-border);
  background: var(--kc-kp-light-pressed);
}

.kc-key[data-tone="dark"]:is(:active, [data-pressed="true"]) {
  background: var(--kc-kp-dark-pressed);
}

.kc-key[data-tone="accent"]:is(:active, [data-pressed="true"]) {
  background-color: var(--kc-kp-accent-pressed);
}

/* VIS-KEYPAD-14 to 23: the faces. */
.kc-key-var {
  font-style: italic;
}

/* Maths sits 1 px below the key's centre. */
.kc-key > span:not(.kc-key-word) {
  position: relative;
  top: 0.5px;
}

.kc-key-word {
  font-family: var(--kc-font-ui);
  font-size: var(--kc-kp-word);
}

.kc-key-sup,
.kc-key-sub {
  font-size: 80%;
  line-height: 0;
}

.kc-key-sup {
  padding-left: 1px;
  vertical-align: 0.42em;
}

.kc-key-sub {
  font-size: 64%;
  vertical-align: -0.25em;
}

.kc-key-raised {
  font-size: 75%;
  line-height: 0;
  vertical-align: 0.45em;
}

.kc-key-dual {
  display: flex;
  gap: 0.3em;
}

.kc-key-dual > [data-selected="false"] {
  color: var(--kc-kp-dim);
}

.kc-key-icon,
.kc-key-sqrt {
  flex: none;
}

.kc-key-sqrt {
  margin-top: -2px;
}

/* VIS-KEYPAD-39: the ABC key's smaller font on narrow keypads. */
.kc-keypad[data-abc-size="m"] .kc-key[data-key="letters"] .kc-key-word {
  font-size: 14.256px;
}

.kc-keypad[data-abc-size="s"] .kc-key[data-key="letters"] .kc-key-word {
  font-size: 12.67px;
}

.kc-keypad[data-abc-size="xs"] .kc-key[data-key="letters"] .kc-key-word {
  font-size: 11.09px;
}

/* VIS-KEYPAD-9: with nothing to trace the audio key is a grey key at half strength, no hover. */
.kc-key[data-tone="dark"][aria-disabled="true"] {
  border-color: color-mix(in srgb, var(--kc-boundary) 50%, var(--kc-chrome));
  background: linear-gradient(
    color-mix(in srgb, var(--kc-text) 6.5%, transparent),
    color-mix(in srgb, var(--kc-text) 8%, transparent)
  );
  color: color-mix(in srgb, var(--kc-text) 53%, var(--kc-chrome));
  cursor: auto;
}

/* VIS-KEYPAD-33: the Hide keypad tab, joined to the tray's top-left corner. */
.kc-hide-keypad {
  position: absolute;
  top: -41px;
  left: -1px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 90px;
  height: 42px;
  padding: 0 20px 6px;
  border: none;
  border-top: 1px solid var(--kc-kp-edge);
  border-radius: 5px 5px 0 0;
  background-color: var(--kc-chrome);
  box-shadow: 0 -1px 3px var(--kc-kp-edge);
  color: var(--kc-text);
  cursor: pointer;
}

.kc-hide-keypad > svg {
  flex: none;
  opacity: 0.7;
}

.kc-hide-keypad:hover > svg {
  opacity: var(--kc-icon-hover-graph);
}

.kc-hide-keypad:active > svg {
  opacity: var(--kc-icon-pressed);
}

/* VIS-KEYPAD-32: the Show keypad pill at the bottom left while the keypad is closed: 78 by 42,
   5 px from the edges, a keyboard and an up caret at 0.6 (0.9 hover, 1 pressed). */
.kc-show-keypad {
  position: absolute;
  inset-inline-start: 5px;
  bottom: 5px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 78px;
  height: 42px;
  padding: 4px 14px;
  border: 1px solid var(--kc-pill-border);
  border-radius: var(--kc-radius-button);
  background-color: var(--kc-pill);
  box-shadow: var(--kc-pill-shadow);
  color: var(--kc-text);
  cursor: pointer;
}

.kc-show-keypad > svg {
  flex: none;
  opacity: var(--kc-icon-rest);
}

/* KP-32: the keyboard sits 2.5 px above the tab's centre line, the triangle on it. */
.kc-show-keypad > svg:first-child {
  margin-bottom: 6px;
}

.kc-show-keypad > svg:last-child {
  margin-bottom: 2px;
}

.kc-show-keypad:hover > svg {
  opacity: var(--kc-icon-hover-graph);
}

.kc-show-keypad:active {
  background-color: var(--kc-pill-pressed);
}

.kc-show-keypad:active > svg {
  opacity: var(--kc-icon-pressed);
}

/* VIS-KEYPAD-25: the Functions popover, 310 by 344 inside, its right edge on the Functions key's
   cell and its bottom 12 px above the cell, kept 4 px inside the calculator on narrow widths. */
.kc-functions-panel {
  position: absolute;
  right: 2px;
  bottom: calc(100% + 7px);
  z-index: 1;
  box-sizing: border-box;
  width: 312px;
  max-width: calc(100vw - 8px);
  height: 346px;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 10px 8px 9px 9px;
  border: 1px solid var(--kc-boundary);
  border-radius: 6px;
  background-color: var(--kc-key);
  box-shadow: var(--kc-popover-shadow);
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
}

.kc-keypad[data-narrow="true"] .kc-functions-panel {
  right: 0;
}

.kc-function sup,
.kc-function sub {
  font-size: 80%;
  line-height: 0;
}

.kc-function sup {
  vertical-align: 0.45em;
}

/* VIS-KEYPAD-26: the arrow's tip touches the Functions key's cell (the last two of 11 units). */
.kc-functions-arrow {
  position: absolute;
  right: calc(4px + (100% - 6px) / 11 - 12px);
  bottom: calc(100% - 5px);
  z-index: 1;
  fill: var(--kc-key);
  stroke: var(--kc-boundary);
}

/* VIS-KEYPAD-27: upper-case headings and three columns of 93 by 38 buttons. */
.kc-functions-panel h3 {
  box-sizing: border-box;
  height: 25px;
  margin: 0;
  padding: 5px;
  color: var(--kc-text-secondary);
  font-size: 13.2px;
  font-weight: normal;
  line-height: 15px;
  text-transform: uppercase;
}

.kc-functions-category > [role="group"] {
  display: grid;
  grid-template-columns: repeat(3, 97.23px);
  margin-bottom: 18px;
}

.kc-function {
  box-sizing: border-box;
  height: 38px;
  margin: 2px;
  padding: 0 4px 2px;
  border: 1px solid var(--kc-kp-edge);
  border-radius: 3px;
  background: linear-gradient(var(--kc-kp-fn-top), var(--kc-kp-fn-bottom));
  box-shadow:
    inset 0 1px 0 var(--kc-kp-shine),
    inset 0 -1px 0 var(--kc-kp-shade);
  color: var(--kc-text);
  font-family: var(--kc-font-math);
  font-size: 14.57px;
  cursor: pointer;
}

@media (hover: hover) {
  .kc-function:hover {
    border-color: var(--kc-kp-fn-hover-border);
    background: var(--kc-kp-fn-hover);
  }
}

.kc-function:active {
  border-color: var(--kc-kp-fn-pressed-border);
  background: var(--kc-kp-fn-pressed);
  box-shadow: none;
}

/* VIS-KEYPAD-35, 36: hidden, the tray stays mounted 255 px down at opacity 0 (AN-1); it slides
   and fades over 300 ms with ease, and is visibility:hidden once the slide ends. */
.kc-keypad[data-open="false"] {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  transform: translateY(255px);
  opacity: 0;
  visibility: hidden;
}

.kc-keypad {
  transition:
    transform var(--kc-dur-300) var(--kc-ease),
    opacity var(--kc-dur-300) var(--kc-ease),
    visibility 0s linear var(--kc-dur-300);
}

.kc-keypad[data-open="true"] {
  transition:
    transform var(--kc-dur-300) var(--kc-ease),
    opacity var(--kc-dur-300) var(--kc-ease),
    visibility 0s linear 0s;
}

/* VIS-KEYPAD-40: the narrow layout does not slide; it fades in and leaves at once. */
.kc-keypad[data-narrow="true"] {
  transition: opacity var(--kc-dur-300) var(--kc-ease);
}

.kc-keypad[data-narrow="true"][data-open="false"] {
  transition: none;
}

/* VIS-KEYPAD-36: after the tray has gone, Show keypad rises 10 px and fades in over 300 ms. */
@keyframes kc-show-keypad-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

.kc-show-keypad[data-returning="true"] {
  animation: kc-show-keypad-in var(--kc-dur-300) var(--kc-ease) var(--kc-dur-300) backwards;
}

/* Phone faces at 2x and above (measured against the reference at 375 by 812, DPR 2): there the
   1x half-pixel drop above shows as a whole device pixel, so digits and the like sit 1 px higher,
   italic letters and brackets higher still, and the ABC word and the audio icon move by 1 px. */
@media (min-resolution: 2dppx) {
  .kc-key > span:not(.kc-key-word) {
    top: -0.5px;
  }

  .kc-key > i {
    position: relative;
    top: -1px;
  }

  .kc-key:is([data-key="lparen"], [data-key="rparen"]) > span {
    top: -1.5px;
  }

  .kc-key:is(
      [data-key="squared"],
      [data-key="power"],
      [data-key="divide"],
      [data-key="times"],
      [data-key="minus"],
      [data-key="plus"],
      [data-key="equals"],
      [data-key="lt"],
      [data-key="gt"],
      [data-key="le"],
      [data-key="ge"]
    )
    > span {
    top: 0.5px;
  }

  .kc-key[data-key="letters"] .kc-key-word {
    position: relative;
    top: 1px;
  }

  .kc-key[data-key="audio"] > svg {
    position: relative;
    top: -1px;
  }
}

/* src/components/calculator/styles/list.css */
/* The expression list: panel, rows, colour icon, delete control, value line, the lines under the
   math, ghost row, row menu and toast (the toolbar is toolbar.css). Geometry and tones follow the reference graphing calculator
   (expression-list VIS-1 to VIS-50) through tokens.css; colours come only from roles (TH-3). */

/* VIS-5: the panel's 1 px right rule and the 4 px shadow strip that falls on the graph. */
.kc-list-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-right: 1px solid var(--kc-rule);
  background: var(--kc-list);
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
}

.kc-list-panel::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(100% + 1px);
  width: 4px;
  background: linear-gradient(to right, var(--kc-panel-shadow), transparent);
  pointer-events: none;
}

/* RS-3: stacked, the list sits under the graph behind a 1 px top rule, and its 4 px shadow strip
   falls upward onto the graph (phone-375). */
.kc-list-panel[data-layout="stacked"] {
  border-top: 1px solid var(--kc-rule);
  border-right: none;
}

.kc-list-panel[data-layout="stacked"]::after {
  top: -5px;
  bottom: auto;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to top, var(--kc-panel-shadow), transparent);
}

.kc-list-panel:is([data-list-state="collapsed"], [data-list-state="collapsing"])::after {
  content: none;
}

.kc-list-panel:is([data-list-state="collapsed"], [data-list-state="collapsing"]) {
  border: none;
  background: transparent;
}

/* VIS-49: the toolbar and the list slide out together; the column keeps its width meanwhile. */
.kc-list-slide {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  background: var(--kc-list);
  transition: transform var(--kc-dur-250) var(--kc-ease-out);
}

.kc-list-panel[data-list-state="collapsing"] .kc-list-slide,
.kc-list-slide[data-enter="true"] {
  transform: translateX(-100%);
}

/* While collapsing, the slide is an overlay (inline size) anchored where the column was. */
.kc-list-panel[data-list-state="collapsing"] > .kc-list-slide {
  top: 0;
}

.kc-list-panel[data-layout="stacked"][data-list-state="collapsing"] > .kc-list-slide {
  top: auto;
  bottom: 0;
}

.kc-list-panel[data-layout="stacked"][data-list-state="collapsing"] .kc-list-slide,
.kc-list-panel[data-layout="stacked"] .kc-list-slide[data-enter="true"] {
  transform: translateY(100%);
}

/* L-3, TH-14: a row reached from the keyboard also carries a 2 px outline inside its accent
   borders; the panel marks keyboard use, so a click keeps the reference look. */
.kc-list-panel[data-input="keyboard"] .kc-row[data-focused="true"] {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: -2px;
}

/* VIS-47: the list scrolls under the fixed toolbar with the platform scrollbar. */
.kc-list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  font-size: var(--kc-size-list);
}

.kc-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* VIS-14: each row's top rule overlaps the one above; the transparent right and bottom borders are
   the room the focused row's borders take. */
.kc-row {
  position: relative;
  display: grid;
  margin-top: -1px;
  border-top: 1px solid var(--kc-row-rule);
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  background: var(--kc-list);
}

.kc-row-inner {
  position: relative;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 6px;
}

/* VIS-22: the focused row, or the keypad's target row while focus is in the keypad: 2 px accent
   top and bottom, 1 px right, an accent tab with a white number; the inner box gives back the
   extra pixels so the row keeps its height. A blurred row (a graph click, Escape) goes back to
   the plain look, as the reference's does. */
.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"]) {
  border-top: 2px solid var(--kc-focus-bar);
  border-right-color: var(--kc-focus-bar);
  border-bottom: 2px solid var(--kc-focus-bar);
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  > .kc-row-inner {
  margin: -1px 0;
}

/* VIS-20, VIS-21: the 38 px grey tab down the row's left edge, the row number at its top-left. */
.kc-row-gutter {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--kc-gutter);
  padding: 1px 2px;
  border-right: 1px solid var(--kc-tab-rule);
  background: var(--kc-tab);
}

.kc-row-number {
  display: block;
  color: var(--kc-row-number);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-row-index);
  line-height: 11px;
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  .kc-row-gutter {
  border-right-color: transparent;
  background: var(--kc-focus-bar);
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  .kc-row-number {
  color: var(--kc-focus-bar-label);
}

/* VIS-24 to VIS-26: the 29 px colour icon filled with the row colour and a white kind glyph;
   hidden, it is an empty grey ring. The inline --kc-row-color overrides this default (TH-3). */
.kc-row-tab {
  --kc-row-color: var(--kc-curve-1);
  position: absolute;
  top: 13.5px;
  left: 4px;
  width: var(--kc-colour-icon);
  height: var(--kc-colour-icon);
  padding: 0;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  background: var(--kc-row-color);
  box-shadow: inset 0 0 3px var(--kc-rule);
  color: var(--kc-list);
  cursor: pointer;
}

.kc-row-tab > svg {
  display: block;
}

.kc-row-tab[aria-pressed="false"] {
  background: transparent;
}

.kc-row-tab[aria-pressed="false"]::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 5px solid var(--kc-hidden-ring);
  border-radius: 50%;
  opacity: 0.25;
}

.kc-row-tab[aria-pressed="false"]:hover::after {
  opacity: 0.3125;
}

/* VIS-34: the warning triangle stands where the colour icon would, fading in after 0.8 s. */
.kc-row-warning {
  position: absolute;
  top: 11.3px;
  left: 5px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--kc-warning);
  cursor: pointer;
  animation: kc-warning-in var(--kc-dur-200) var(--kc-ease) var(--kc-dur-800) both;
}

/* EL-34: the exclamation mark is cut out of the triangle, so the tab shows through it. */
.kc-row-warning .kc-warning-mark {
  stroke: var(--kc-tab);
}

.kc-row-warning .kc-warning-mark-dot {
  fill: var(--kc-tab);
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  .kc-row-warning {
  color: var(--kc-focus-bar-label);
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  .kc-warning-mark {
  stroke: var(--kc-focus-bar);
}

.kc-row:is([data-focused="true"], .kc-app:has(.kc-keypad:focus-within) [data-active="true"])
  .kc-warning-mark-dot {
  fill: var(--kc-focus-bar);
}

@keyframes kc-warning-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* VIS-16: the math starts 53 px from the panel edge, 15 px below the row's top rule. */
.kc-row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kc-row-field {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 14px 35px 10px 53px;
}

.kc-row-field > .kc-math-field {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

/* A row's field draws no box, focused or not; the row's borders and tab are its focus indicator
   (TH-14). Role-safe values that beat math-field.css's role borders by specificity. */
.kc-row-field .kc-math-field.mq-editable-field,
.kc-row-field .kc-math-field.mq-editable-field.mq-focused {
  border-style: none;
  border-color: transparent;
  box-shadow: none;
  outline: none;
}

.kc-row-field .mq-root-block {
  margin: -6px 0;
  padding: 8px 5px 8px 2px;
  vertical-align: top;
}

/* VIS-29: the delete cross, always shown at 0.2, in a hit box at the row's top-right corner. */
.kc-row-delete {
  position: absolute;
  top: 0;
  right: 0;
  width: 45px;
  height: 46.4px;
  padding: 8px 7px 20px 20px;
  border: none;
  background: transparent;
  color: var(--kc-text);
  cursor: pointer;
}

.kc-row-delete > svg {
  display: block;
  opacity: var(--kc-delete-rest);
}

.kc-row-delete:hover > svg {
  opacity: var(--kc-delete-hover);
}

.kc-row-delete:active > svg {
  opacity: var(--kc-delete-pressed);
}

.kc-row-delete:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: -4px;
}

/* VIS-31, VIS-32: the value line under the math, right-aligned 5 px from the edge: a faint "=" and
   the value in a light chip; a list result shows one chip per element (NM-38). It fades in. */
.kc-row-value {
  margin-top: -4px;
  padding: 0 5px 0 53px;
  font-size: var(--kc-size-eval);
  text-align: end;
  cursor: default;
  animation: kc-warning-in var(--kc-dur-800) var(--kc-ease);
}

.kc-row-value-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}

.kc-row-equals {
  margin-right: -1px;
  padding: 0 0.2em;
  font-family: var(--kc-font-math);
  font-size: var(--kc-size-eval-math);
  opacity: var(--kc-equals-opacity);
}

.kc-row-value-box {
  padding: 3px 5px 1px;
  border: 1px solid var(--kc-row-rule);
  border-radius: var(--kc-radius-chip);
  background: var(--kc-chip-fill);
  font-family: var(--kc-font-math);
  font-size: var(--kc-size-eval-math);
  line-height: 21.5px;
  overflow-wrap: anywhere;
}

/* EL-36, FN-16: the lines under the math (add slider, Label, the complex-mode hint), 53 px in,
   in small muted text, fading in like the value line. */
.kc-row-under,
.kc-row-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding: 0 35px 0 53px;
  color: var(--kc-text-muted);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-small);
  animation: kc-warning-in var(--kc-dur-800) var(--kc-ease);
}

.kc-add-slider {
  margin-top: -1px;
  margin-bottom: 2px;
}

/* EL-36: 5 px from "add slider:" to the first button (with the 3 px gap); error-1440: the label's
   baseline sits a pixel below the buttons' line. */
.kc-add-slider-label {
  position: relative;
  top: 1px;
  margin-right: 2px;
}

/* EL-36: 35 by 26 letter buttons on a light gradient that cools toward the bottom (#f6f6f6 to
   #eff2f3) behind a lighter border; one undefined letter, and "all", are blue. */
.kc-letter-button,
.kc-row-hint-action {
  min-width: 35px;
  height: 26px;
  padding: 0 4px;
  border: 1px solid var(--kc-letter-border);
  border-radius: var(--kc-radius-small);
  background: linear-gradient(var(--kc-letter-top), var(--kc-letter-bottom));
  box-shadow:
    inset 0 1px color-mix(in srgb, var(--kc-list) 25%, transparent),
    inset 0 -1px color-mix(in srgb, var(--kc-text) 2%, transparent);
  color: var(--kc-text);
  font: inherit;
  cursor: pointer;
}

.kc-letter-button {
  padding-bottom: 2px;
  font-family: var(--kc-font-math);
  font-size: var(--kc-size-slider-letter);
  font-style: italic;
}

/* "all" is upright, 13.6 px, centred without the letters' lift. */
.kc-letter-button[data-word="true"] {
  padding-bottom: 0;
  font-size: var(--kc-size-slider-word);
  font-style: normal;
}

.kc-letter-button:not([data-tone="accent"]):hover,
.kc-row-hint-action:hover {
  border-color: var(--kc-boundary);
  background: var(--kc-letter-bottom);
}

.kc-letter-button[data-tone="accent"] {
  border-color: var(--kc-accent);
  background: var(--kc-accent);
  box-shadow:
    inset 0 1px color-mix(in srgb, var(--kc-list) 10%, transparent),
    inset 0 -1px color-mix(in srgb, var(--kc-text) 4%, transparent);
  color: var(--kc-accent-label);
}

/* EL-15: a point row's Label line: a 14 px white box with a 1 px grey edge and 3 px corners, then
   the caption 5 px on. Point labels are not drawn yet, so the line is shown unavailable: the
   not-allowed cursor over both, and no hover or press look. */
.kc-point-label {
  gap: 5px;
  height: 14px;
  margin-bottom: 4px;
  cursor: not-allowed;
}

/* "Label" at its normal line height, its box 1.5 px below the centred position, puts the text on
   the reference's device pixel at both 1x and 2x. */
.kc-point-label > label {
  position: relative;
  top: 1.5px;
  line-height: normal;
  cursor: inherit;
}

.kc-checkbox {
  flex: none;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  margin: 0;
  border: 1px solid var(--kc-boundary);
  border-radius: var(--kc-radius-small);
  background: var(--kc-list);
  appearance: none;
  cursor: inherit;
}

.kc-row-main > .kc-regression {
  padding-right: 35px;
  padding-left: 53px;
}

/* VIS-30, VIS-MOTION-8: a row is added at once; a row deleted with its cross shrinks about its
   centre to a tenth while it fades over 200 ms, in place, and the rows below move up when it is
   removed. A keyboard removal has no motion (row-presence). */
.kc-row[data-motion="exit"] {
  opacity: 0;
  transform: scale(0.1);
  transform-origin: center;
  transition:
    transform var(--kc-dur-200) var(--kc-ease),
    opacity var(--kc-dur-200) var(--kc-ease);
}

/* VIS-23: the next row's number on a tab that fades out downward; a press adds the row. */
.kc-ghost-row {
  position: relative;
  height: 54px;
  margin-top: -1px;
  border-top: 1px solid var(--kc-row-rule);
  border-right: 1px solid transparent; /* as a row's, so the rule stops short of the panel edge */
  background: var(--kc-list); /* as a row's, so its rule covers a focused row's lower bar pixel */
  cursor: text;
}

.kc-ghost-row::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--kc-gutter);
  border-right: 1px solid var(--kc-tab-rule);
  background: var(--kc-tab);
  mask-image: linear-gradient(to bottom, var(--kc-text) 50%, transparent);
}

/* The room the reference leaves under the ghost row, so the last row scrolls clear of Show
   keypad. */
.kc-list-panel[data-layout="desktop"][data-keypad="false"] .kc-ghost-row {
  margin-bottom: 104px;
}

.kc-ghost-row > .kc-row-number {
  position: relative;
  padding: 1px 2px;
}

.kc-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

/* D-13: the row menu from the colour icon, over the row below it. */
.kc-row-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px;
  border: 1px solid var(--kc-boundary);
  border-radius: 6px;
  background: var(--kc-list);
}

/* D-13: the list's toast, at the foot of the list body. */
.kc-toast {
  position: sticky;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  margin: 8px auto;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--kc-text);
  color: var(--kc-list);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
}

.kc-toast-action {
  padding: 2px 6px;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

/* src/components/calculator/styles/math-field.css */
/* Role colours for the vendored MathQuill rules (TH-3, OI-34). The vendored sheet already sets the
   math in the --kc-font-math Times stack with italic variables (patch 0008; VIS-TYPOGRAPHY-ICONS-14,
   -15); selection is a light blue behind ink glyphs (VIS-18) and empty slots are a 20% ink box
   (TY-29). */
/* VIS-TYPOGRAPHY-ICONS-19: "=", "+", "<" and the other binary operators take a 23.8 px box at
   20.24 px. They stay in the math stack's upright Times (the reference's own fallback face, whose
   thin strokes match its operators on every platform), a tenth larger so "=" is 13 px wide with
   its bars 4 px apart, padded out to the box and lowered onto the reference's line. A 1.11
   vertical stretch puts the "=" bars on the reference's rows (typed-1440: y 79-80 and 83-84);
   the face itself stays Times (Symbola's licence rules out bundling it). */
.mq-math-mode .mq-binary-operator {
  position: relative;
  top: 2px;
  transform: translateY(-0.4px) scaleY(1.11);
  padding: 0 0.2533em;
  font-size: 1.1em;
  line-height: 0.8182;
}

/* graph-points-1440: a unary minus (MathQuill drops its binary class, leaving class="") keeps
   about 2 px of air on each side, as the reference's does: "(−3,−2)" is 69 px wide. */
.mq-math-mode span[class=""] {
  padding: 0 0.11em;
}

/* VIS-TYPOGRAPHY-ICONS-20: an exponent clears its base by a pixel and rises one above the vendored
   position, as the reference's does. */
.mq-math-mode .mq-supsub.mq-sup-only {
  vertical-align: 0.512em;
}

.mq-math-mode .mq-supsub.mq-sup-only > .mq-sup {
  position: relative;
  top: -1px;
}

/* EL (error-1440 measurement): the fraction bar sits a pixel lower than the vendored one, with
   the numerator and denominator where they were. */
.mq-math-mode .mq-fraction .mq-denominator {
  margin-top: 1px;
  padding-top: calc(0.1em - 1px);
}

/* VIS-MOTION-24: the caret sits a pixel lower than the vendored one and stays one line tall after
   an exponent, as the reference's does (focused-1440: y 72 to 92). */
.mq-editable-field .mq-cursor {
  top: 1px;
  border-left-color: var(--kc-text);
}

/* VIS-MOTION-24: under reduced motion the caret stays on. MathQuill blinks it by toggling a class
   from script, which base.css's zero durations do not reach. */
@media (prefers-reduced-motion: reduce) {
  .mq-editable-field .mq-cursor.mq-blink {
    visibility: visible;
  }
}

:host([data-reduced-motion="true"]) .mq-editable-field .mq-cursor.mq-blink {
  visibility: visible;
}

.mq-editable-field,
.mq-math-mode .mq-editable-field,
.mq-editable-field .mq-latex-command-input {
  border-color: var(--kc-boundary);
}

.mq-editable-field.mq-focused,
.mq-math-mode .mq-editable-field.mq-focused {
  box-shadow: none;
  border-color: var(--kc-focus-ring);
}

.mq-editable-field .mq-latex-command-input.mq-hasCursor {
  border-color: var(--kc-focus-ring);
}

.mq-math-mode * {
  border-color: var(--kc-text);
}

.mq-math-mode .mq-overarc,
.mq-math-mode .mq-overarrow {
  border-top-color: var(--kc-text);
}

.mq-math-mode .mq-empty {
  background: var(--kc-empty-block);
}

.mq-math-mode .mq-text-mode.mq-hasCursor {
  box-shadow: inset 0 0.1em 0.2em var(--kc-boundary);
}

.mq-math-mode .mq-selection,
.mq-editable-field .mq-selection,
.mq-math-mode .mq-selection .mq-non-leaf,
.mq-editable-field .mq-selection .mq-non-leaf,
.mq-math-mode .mq-selection .mq-scaled,
.mq-editable-field .mq-selection .mq-scaled {
  background: var(--kc-selection) !important;
  color: var(--kc-text);
  border-color: var(--kc-text);
}

.mq-math-mode .mq-selection.mq-blur,
.mq-editable-field .mq-selection.mq-blur,
.mq-math-mode .mq-selection.mq-blur .mq-non-leaf,
.mq-editable-field .mq-selection.mq-blur .mq-non-leaf,
.mq-math-mode .mq-selection.mq-blur .mq-scaled,
.mq-editable-field .mq-selection.mq-blur .mq-scaled {
  background: var(--kc-chrome) !important;
  color: var(--kc-text);
  border-color: var(--kc-text);
}

/* src/components/calculator/styles/menus.css */
/* Hover tooltips, the Add item menu and the other small popups of the list (popovers-menus.md
   VIS-28 to VIS-31). Colours come only from roles. */

/* VIS-29 to VIS-31: the hover tooltip, a black box with white 14 px text and a 5 px arrow. Below
   its button (the list toolbar) its top is 3 px under the button and it is centred on it, kept
   2 px inside the calculator (--kc-tip-shift); to the left of a graph control it is vertically
   centred 5 px from it. It fades in over 300 ms and leaves with no fade. */
.kc-list-tool {
  position: relative;
}

.kc-tooltip {
  --kc-tip-shift: 0px;
  position: absolute;
  top: calc(100% + 3px);
  left: 50%;
  z-index: 10;
  width: max-content;
  max-width: 200px;
  padding: 5px 8px;
  border-radius: var(--kc-radius-chip);
  background: var(--kc-tooltip);
  color: var(--kc-tooltip-label);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-tooltip);
  font-weight: 400;
  line-height: var(--kc-line-tooltip);
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(calc(-50% + var(--kc-tip-shift)));
  animation: kc-tooltip-in var(--kc-dur-300) var(--kc-ease);
}

/* PM-29: under Expand list the tooltip sits 5 px below the button. */
.kc-list-panel > .kc-list-tool > .kc-tooltip {
  top: calc(100% + 5px);
}

.kc-tooltip::before {
  content: "";
  position: absolute;
  top: -5px;
  left: calc(50% - var(--kc-tip-shift));
  margin-left: -5px;
  border: 5px solid transparent;
  border-top-width: 0;
  border-bottom-color: var(--kc-tooltip);
}

.kc-tooltip[data-side="left"] {
  top: 50%;
  right: calc(100% + 5px);
  left: auto;
  transform: translateY(-50%);
}

.kc-tooltip[data-side="left"]::before {
  top: 50%;
  right: -5px;
  left: auto;
  margin: -5px 0 0;
  border-width: 5px 0 5px 5px;
  border-color: transparent;
  border-left-color: var(--kc-tooltip);
}

@keyframes kc-tooltip-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* S-2, S-11: the Add item menu, a popover below Add item (desktop) or to its right (stacked). */
.kc-add-item {
  position: relative;
  display: inline-flex;
}

/* EL-42, PM-1, PM-2: the popover under +, 126 px wide, white with a 1 px grey border, 6 px radius
   and a soft drop shadow; a 24 by 12 arrow (a white triangle over a grey one 1 px further out)
   points at the + button. Stacked, it opens to the button's right with a sideways arrow. */
.kc-add-menu {
  position: absolute;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
  width: 126px;
  padding: 14px 12px 12px;
  border: 1px solid var(--kc-boundary);
  border-radius: 6px;
  background: var(--kc-list);
  box-shadow: var(--kc-popover-shadow);
}

.kc-add-menu[data-placement="below"] {
  top: calc(100% + 10px);
  left: -1px;
}

.kc-add-menu[data-placement="right"] {
  top: -1px;
  left: calc(100% + 11px);
}

.kc-add-menu::before,
.kc-add-menu::after {
  content: "";
  position: absolute;
  border: 12px solid transparent;
}

.kc-add-menu[data-placement="below"]::before,
.kc-add-menu[data-placement="below"]::after {
  left: 7px;
  border-top-width: 0;
}

.kc-add-menu[data-placement="below"]::before {
  top: -13px;
  border-bottom-color: var(--kc-boundary);
}

.kc-add-menu[data-placement="below"]::after {
  top: -12px;
  border-bottom-color: var(--kc-list);
}

.kc-add-menu[data-placement="right"]::before,
.kc-add-menu[data-placement="right"]::after {
  top: 9px;
  border-left-width: 0;
}

.kc-add-menu[data-placement="right"]::before {
  left: -13px;
  border-right-color: var(--kc-boundary);
}

.kc-add-menu[data-placement="right"]::after {
  left: -12px;
  border-right-color: var(--kc-list);
}

/* EL-43: a 30 px icon cell, 8 px gap, a lower-case 12.8 px label; the item rests at 0.5 and
   rises to 0.8 on hover, with no background. */
.kc-add-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-small);
  text-align: left;
  opacity: var(--kc-menu-item-rest);
  cursor: pointer;
}

.kc-add-menu-item:hover,
.kc-add-menu-item:focus-visible {
  opacity: var(--kc-menu-item-hover);
}

/* Karman addition (D4 kept until the founder decides): on a coarse pointer each item takes
   touches over the full 40 px pitch, up to its neighbours, with the drawn layout unchanged. */
@media (pointer: coarse) {
  .kc-add-menu-item {
    position: relative;
  }

  .kc-add-menu-item::before {
    content: "";
    position: absolute;
    inset: -8px -12px;
  }
}

.kc-add-menu-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  width: 30px;
  height: 27px;
}

.kc-add-menu-icon > svg {
  width: 26px;
  height: 26px;
  fill: currentColor;
}

/* The reference hides the Show keypad pill while the Add item menu is open. */
.kc-app:has(.kc-add-menu) .kc-show-keypad {
  visibility: hidden;
}

/* EL-43: the reference's f(x) icon is italic throughout, brackets included, and sits a little
   high in its cell. */
.kc-add-menu-fx {
  position: relative;
  top: -1.5px;
  font-family: var(--kc-font-math);
  font-size: 17px;
  font-style: italic;
  line-height: 24px;
}

/* The label sits 1 px above the cell's centre line, as the reference's does. */
.kc-add-menu-item > span:last-child {
  position: relative;
  top: -1px;
}

/* VIS-3, VIS-22 to VIS-24, VIS-38: a table column's style menu, the shared popover box 220 px wide
   below the column icon with an 8 px arrow (a white triangle over a grey one 1 px further out) on
   the icon's centre. ColumnStyleMenu portals it into the calculator root and sets its fixed
   position, max-height and --kc-arrow-at. Sections sit under 1 px rules; their content fades in
   over 300 ms. */
.kc-style-menu {
  --kc-arrow-at: 10px;
  position: fixed;
  z-index: 6;
  display: flex;
  flex-direction: column;
  width: 220px;
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
  line-height: normal;
  text-align: left;
}

.kc-style-body {
  min-height: 0;
  margin: -1px;
  overflow: auto;
  border: 1px solid var(--kc-boundary);
  border-radius: 6px;
  background: var(--kc-list);
  box-shadow: var(--kc-popover-shadow);
}

.kc-style-menu::before,
.kc-style-menu::after {
  content: "";
  position: absolute;
  left: var(--kc-arrow-at);
  z-index: 1;
  border: 8px solid transparent;
  border-top-width: 0;
  pointer-events: none;
}

.kc-style-menu::before {
  top: -9px;
  border-bottom-color: var(--kc-boundary);
}

.kc-style-menu::after {
  top: -8px;
  border-bottom-color: var(--kc-list);
}

.kc-style-section {
  padding: 10px;
}

.kc-style-section + .kc-style-section {
  border-top: 1px solid var(--kc-pop-rule);
}

.kc-style-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 18px;
}

/* VIS-13: point-style buttons are 28 px squares, line-style buttons 33 by 30. */
.kc-style-menu .kc-segments[data-theme="mini"] .kc-segment {
  justify-content: center;
  width: 33px;
  padding: 0;
}

.kc-style-menu .kc-segments[aria-label="Point style"] .kc-segment {
  width: 28px;
  height: 28px;
}

.kc-style-content {
  margin-top: 8px;
  animation: kc-tooltip-in var(--kc-dur-300) var(--kc-ease);
}

/* VIS-24: six 30 px tiles 4 px apart with 3 px corners; the chosen one shows a white tick, a
   hovered one a 2 px ring. */
.kc-style-swatches {
  display: grid;
  grid-template-columns: repeat(6, 30px);
  gap: 4px;
  animation: kc-tooltip-in var(--kc-dur-300) var(--kc-ease);
}

.kc-style-swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 3px;
  background: var(--kc-row-color);
  cursor: pointer;
}

.kc-style-swatch:hover {
  box-shadow: var(--kc-pop-swatch-ring);
}

.kc-style-swatch > input {
  appearance: none;
  position: absolute;
  inset: 0;
  margin: 0;
  border-radius: 3px;
  cursor: pointer;
}

.kc-style-swatch > svg {
  position: relative;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--kc-list);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  visibility: hidden;
  pointer-events: none;
}

.kc-style-swatch > input:checked + svg {
  visibility: visible;
}

.kc-style-swatch > input:focus-visible {
  outline: 2px solid var(--kc-accent);
  outline-offset: 2px;
}

/* Add regression and Delete column, plain text actions. */
.kc-style-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.kc-style-action {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--kc-text);
  font: inherit;
  cursor: pointer;
}

.kc-style-action:hover {
  text-decoration: underline;
}

.kc-style-action:focus-visible {
  outline: 2px solid var(--kc-accent);
  outline-offset: 2px;
}

/* src/components/calculator/styles/regression.css */
/* A regression row's results (D-37). Colours come only from role variables (TH-3). Statistics and
   Residuals sit side by side and wrap onto two lines when the list is too narrow for both. */

.kc-regression {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
  color: var(--kc-text);
}

.kc-regression-log {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kc-regression-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 24px;
}

.kc-regression-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.kc-regression-heading {
  margin: 0;
  color: var(--kc-text-secondary);
  font-size: var(--kc-size-ui);
  font-weight: 600;
}

.kc-regression-value {
  min-width: 0;
  max-width: 100%;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--kc-text);
  font-family: var(--kc-font-math);
  font-size: var(--kc-size-ui);
}

.kc-regression-value:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: 0;
}

.kc-regression-residual {
  font-family: var(--kc-font-math);
}

.kc-regression-action {
  padding: 2px 8px;
  border: 1px solid var(--kc-boundary);
  border-radius: 4px;
  color: var(--kc-text);
  cursor: pointer;
}

.kc-regression-note {
  margin: 0;
  color: var(--kc-text-secondary);
}

/* src/components/calculator/styles/settings.css */
/* The settings popover (S-1, S-7) and the popover controls it shares with the column style menu
   (ui/settings/controls.tsx), drawn to popovers-menus.md VIS-1 to VIS-19. Colours come only from
   role variables (TH-3); the reference's fixed greys are mixed from --kc-text over --kc-list, so
   on the classic skin each equals the measured value.
   SettingsPopover sets top, left, data-side, --kc-arrow-at and --kc-settings-max-h inline. */

/* Tones of the popovers (wanted as shared tokens, see the report). */
.kc-settings,
.kc-style-menu {
  --kc-pop-rule: color-mix(in srgb, var(--kc-text) 11.4%, var(--kc-list)); /* #e2e2e2 */
  --kc-pop-hover-border: color-mix(in srgb, var(--kc-text) 42%, var(--kc-list)); /* #949494 */
  --kc-pop-ink-strong: color-mix(in srgb, var(--kc-text) 73%, var(--kc-list)); /* #454545 */
  --kc-pop-line: color-mix(in srgb, var(--kc-text) 42%, transparent); /* rgba(0,0,0,.42) */
  --kc-pop-line-hover: color-mix(in srgb, var(--kc-text) 62%, transparent);
  --kc-pop-field-line: color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-pop-seg-text: color-mix(in srgb, var(--kc-text) 85%, transparent);
  --kc-pop-seg-on: color-mix(in srgb, var(--kc-text) 65%, transparent);
  --kc-pop-placeholder: color-mix(in srgb, var(--kc-text) 47%, transparent);
  --kc-pop-track: color-mix(in srgb, var(--kc-text) 13.3%, var(--kc-list)); /* #ddd */
  --kc-pop-knob: color-mix(in srgb, var(--kc-text) 4%, var(--kc-list)); /* #f5f5f5 */
  --kc-pop-knob-hover: color-mix(in srgb, var(--kc-text) 8%, var(--kc-list)); /* #ebebeb */
  --kc-pop-knob-on-hover: color-mix(in srgb, var(--kc-text) 66.7%, var(--kc-list)); /* #555 */
  --kc-pop-knob-shadow:
    0 2px 2px color-mix(in srgb, var(--kc-text) 20%, transparent),
    0 0 3px color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-pop-circle: color-mix(in srgb, var(--kc-text) 2.4%, var(--kc-list)); /* #f9f9f9 */
  --kc-pop-circle-ink: color-mix(
    in srgb,
    var(--kc-text) 30%,
    var(--kc-list)
  ); /* lighter than #777: our thinner lines read darker */
  --kc-pop-circle-shadow: inset 0 0 2px color-mix(in srgb, var(--kc-text) 20%, transparent);
  --kc-pop-mini-ink: color-mix(in srgb, var(--kc-text) 42%, var(--kc-list)); /* #949494 */
  --kc-pop-mini-on: color-mix(in srgb, var(--kc-accent) 25%, transparent);
  --kc-pop-mini-hover: color-mix(in srgb, var(--kc-text) 4%, transparent);
  --kc-pop-swatch-ring: 0 0 0 2px color-mix(in srgb, var(--kc-text) 10%, transparent);
}

.kc-settings {
  /* Placement, set inline by SettingsPopover. */
  --kc-arrow-at: 18.5px;
  --kc-settings-max-h: none;

  /* VIS-1: the positioned wrapper; its body is the white box, 1 px outside it on every side. */
  position: absolute;
  z-index: 6;
  width: 290px;
  max-width: calc(100% - 10px);
  color: var(--kc-text);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
  line-height: normal;
}

.kc-settings-body {
  box-sizing: border-box;
  max-height: var(--kc-settings-max-h);
  margin: -1px;
  padding: 10px;
  overflow: auto;
  border: 1px solid var(--kc-boundary);
  border-radius: 6px;
  background: var(--kc-list);
  box-shadow: var(--kc-popover-shadow);
}

/* VIS-2: a 24 by 12 arrow, a white triangle over a grey one 1 px further out, centred on the
   anchor. Left of the anchor it points right; below it, up. */
.kc-settings::before,
.kc-settings::after {
  content: "";
  position: absolute;
  z-index: 1;
  border: 12px solid transparent;
  pointer-events: none;
}

.kc-settings[data-side="left"]::before,
.kc-settings[data-side="left"]::after {
  top: calc(var(--kc-arrow-at) - 12px);
  border-right-width: 0;
}

.kc-settings[data-side="left"]::before {
  left: calc(100% + 1px);
  border-left-color: var(--kc-boundary);
}

.kc-settings[data-side="left"]::after {
  left: 100%;
  border-left-color: var(--kc-list);
}

.kc-settings[data-side="below"]::before,
.kc-settings[data-side="below"]::after {
  left: calc(var(--kc-arrow-at) - 12px);
  border-top-width: 0;
}

.kc-settings[data-side="below"]::before {
  top: -13px;
  border-bottom-color: var(--kc-boundary);
}

.kc-settings[data-side="below"]::after {
  top: -12px;
  border-bottom-color: var(--kc-list);
}

/* VIS-16: sections after the first sit under a 1 px rule with 10 px above and below. */
.kc-settings-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--kc-pop-rule);
}

/* VIS-11: a 17.6 px box (1.1em) with a 1 px border and 3 px corners; checked shows a blue tick
   1.15em tall that overflows the box's top-right corner. The whole label is the target. */
.kc-check {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.kc-check[data-size="small"] {
  font-size: 13.6px;
}

.kc-check[data-size="axis"] {
  font-size: 15.2px;
}

.kc-check-box {
  position: relative;
  flex: none;
  width: 1.1em;
  height: 1.1em;
}

.kc-check-box > input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0;
  border: 1px solid var(--kc-boundary);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
}

.kc-check:hover .kc-check-box > input {
  border-color: var(--kc-pop-hover-border);
}

.kc-check-tick {
  position: absolute;
  top: -0.175em;
  left: 0.115em;
  width: 1.15em;
  height: 1.15em;
  fill: none;
  stroke: var(--kc-accent);
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  visibility: hidden;
  pointer-events: none;
}

.kc-check-box > input:checked + .kc-check-tick {
  visibility: visible;
}

/* VIS-17: Grid, its two round buttons and Arrows in a 110 px column; the small checkboxes beside. */
.kc-settings-grid {
  display: flex;
  padding-bottom: 2px;
}

.kc-settings-grid-main {
  display: flex;
  flex-direction: column;
  width: 110px;
  padding-top: 3px;
}

.kc-settings-grid-side {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 3px;
}

/* VIS-18: 28 px circles, 4.5 px apart, indented under the Grid label. */
.kc-grid-types {
  display: flex;
  gap: 4.5px;
  margin: 2px 0 8px 24px;
}

.kc-grid-type {
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.kc-grid-type > input {
  appearance: none;
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  margin: 0;
  border: 1px solid var(--kc-pop-line);
  border-radius: 50%;
  background: var(--kc-pop-circle);
  box-shadow: var(--kc-pop-circle-shadow);
  cursor: pointer;
}

.kc-grid-type > input:checked {
  background: var(--kc-text-secondary);
}

.kc-grid-type > svg {
  position: relative;
  width: 26px;
  height: 26px;
  color: var(--kc-pop-circle-ink);
  pointer-events: none;
}

.kc-grid-type > input:checked + svg {
  color: color-mix(in srgb, var(--kc-list) 55%, var(--kc-text-secondary));
}

.kc-grid-type-lines {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
}

/* VIS-17, VIS-19: each axis. The title row ends level with the Label field's bottom border. */
.kc-settings-axes {
  padding-top: 5px;
}

.kc-settings-axis + .kc-settings-axis {
  margin-top: 12px;
}

/* An error line makes room under its axis. */
.kc-settings-error + .kc-settings-error {
  margin-top: 0;
}

.kc-settings-axis-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.kc-settings-axis-title > .kc-check {
  margin-bottom: 8.4px;
}

.kc-settings-label {
  position: relative;
  display: block;
  padding-top: 9.6px;
}

.kc-settings-legend {
  position: absolute;
  top: 2px;
  left: 4px;
  padding: 0 3px;
  background: var(--kc-list);
  color: var(--kc-text-secondary);
  font-size: 12.92px;
  line-height: 15px;
}

.kc-settings-label-input {
  box-sizing: border-box;
  display: block;
  width: 121.5px;
  height: 31px;
  margin: 0;
  padding: 7px;
  border: 1px solid var(--kc-pop-line);
  border-radius: 5px;
  background: var(--kc-list);
  color: var(--kc-pop-ink-strong);
  font-family: var(--kc-font-ui);
  font-size: 13.68px;
}

.kc-settings-label-input::placeholder,
.kc-settings-step-input::placeholder {
  color: var(--kc-pop-placeholder);
}

/* VIS-15: the bounds as inline math and Step: with borderless fields underlined 1 px. */
.kc-settings-axis-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24.6px;
  margin-top: 3.6px;
}

.kc-settings-bounds {
  display: flex;
  align-items: center;
  min-width: 0;
}

.kc-settings-bound {
  display: inline-flex;
  flex: none;
  min-width: 35px;
}

.kc-settings-bound > .mq-editable-field,
.kc-settings .kc-settings-bound > .mq-math-mode.mq-editable-field {
  box-sizing: border-box;
  min-width: 35px;
  min-height: 22.2px;
  padding: 1px 3px;
  border: none;
  border-bottom: 1px solid var(--kc-pop-field-line);
  border-radius: 0;
  font-size: 15.2px;
}

.kc-settings .kc-settings-bound > .mq-editable-field.mq-focused {
  border-bottom: 2px solid var(--kc-accent);
}

.kc-settings-relation > var {
  font-size: 18.4px;
  line-height: 20px;
}

/* VIS-17: "≤ x ≤" overlaps the fields' right and left padding by 6 px, as the reference's does. */
.kc-settings-relation {
  position: relative;
  top: -1px;
  display: flex;
  flex: none;
  align-items: center;
  margin: 0 -6px;
  padding: 0 2px;
  font-family: var(--kc-font-math);
  font-size: 15.2px;
  white-space: nowrap;
}

.kc-settings-relation > span {
  padding: 0 0.25em;
  /* The operator is set as the math field's are (math-field.css): Times, a tenth larger. */
  /* The operator is set as the math field's are (math-field.css): Times, a tenth larger. */
  font-size: 22.26px;
  line-height: 18.4px;
  font-family: var(--kc-font-math);
}

.kc-settings-step {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--kc-pop-ink-strong);
  font-size: 13.6px;
}

.kc-settings-step > span {
  position: relative;
  top: -1px;
}

/* The field is 22.2 px tall, 1 px inside its 24.2 px line, as the bounds fields are. */
.kc-settings-step-input {
  box-sizing: border-box;
  width: 37px;
  height: 22.2px;
  margin: 1px 0;
  padding: 1px 2px;
  border: none;
  border-bottom: 1px solid var(--kc-pop-field-line);
  border-radius: 0;
  background: transparent;
  color: var(--kc-text);
  font-family: var(--kc-font-math);
  font-size: 15.2px;
}

.kc-settings-step-input:focus {
  outline: none;
  border-bottom: 2px solid var(--kc-accent);
}

/* S-7: a bound or step error below its line, on --kc-list (TH-1). */
.kc-settings-error {
  margin: 4px 0 0;
  color: var(--kc-error);
  font-size: 13.6px;
}

/* VIS-14: Complex Mode with its toggle on the right. */
.kc-settings-complex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 18px;
}

.kc-toggle {
  position: relative;
  display: block;
  width: 40px;
  height: 24px;
  margin-right: -5px;
  cursor: pointer;
}

.kc-toggle > input {
  appearance: none;
  position: absolute;
  inset: 0;
  margin: 0;
  cursor: pointer;
}

.kc-toggle-track {
  position: absolute;
  top: 7px;
  left: 5px;
  width: 30px;
  height: 10px;
  border-radius: 10px;
  background: var(--kc-pop-track);
  pointer-events: none;
}

.kc-toggle-knob {
  position: absolute;
  top: 3px;
  left: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--kc-pop-knob);
  box-shadow: var(--kc-pop-knob-shadow);
  pointer-events: none;
  transition:
    transform var(--kc-dur-200) var(--kc-ease),
    background-color var(--kc-dur-200) var(--kc-ease);
}

.kc-toggle:hover .kc-toggle-knob {
  background: var(--kc-pop-knob-hover);
}

.kc-toggle > input:checked ~ .kc-toggle-knob {
  background: var(--kc-text-secondary);
  transform: translateX(12px);
}

.kc-toggle:hover > input:checked ~ .kc-toggle-knob {
  background: var(--kc-pop-knob-on-hover);
}

/* VIS-12: joined 36 px buttons; the selected one is dark grey with white text. */
.kc-segments {
  display: flex;
  padding: 0 1px 1px 0;
}

.kc-segment {
  position: relative;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 36px;
  margin: 0 -1px -1px 0;
  padding: 0 8px;
  border: 1px solid var(--kc-pop-line);
  color: var(--kc-pop-seg-text);
  cursor: pointer;
}

.kc-segment:first-child {
  border-radius: 3px 0 0 3px;
}

.kc-segment:last-child {
  border-radius: 0 3px 3px 0;
}

.kc-segment:hover {
  z-index: 1;
  border-color: var(--kc-pop-line-hover);
  color: var(--kc-text);
}

.kc-segment:has(> input:checked) {
  z-index: 2;
  border-color: var(--kc-pop-seg-on);
  background: var(--kc-pop-seg-on);
  color: var(--kc-list);
}

.kc-segment > input {
  appearance: none;
  position: absolute;
  inset: 0;
  margin: 0;
  cursor: pointer;
}

.kc-segment-text {
  position: relative;
  line-height: 34px;
  white-space: nowrap;
  pointer-events: none;
}

/* VIS-13: the mini theme, icon buttons with #bbb borders; the selected one is tinted blue. */
.kc-segments[data-theme="mini"] .kc-segment {
  flex: none;
  height: 30px;
  padding: 4px 6px;
  border-color: var(--kc-boundary);
  color: var(--kc-pop-mini-ink);
}

.kc-segments[data-theme="mini"] .kc-segment:hover {
  border-color: var(--kc-boundary);
  background: var(--kc-pop-mini-hover);
  color: var(--kc-text);
}

.kc-segments[data-theme="mini"] .kc-segment:has(> input:checked) {
  border-color: var(--kc-accent);
  background: var(--kc-pop-mini-on);
  color: var(--kc-accent);
}

.kc-segment-icon {
  position: relative;
  display: flex;
  pointer-events: none;
}

.kc-segment-icon > svg {
  width: 20.8px;
  height: 20.8px;
}

/* VIS-9: a 2 px blue ring 2 px outside the focused control. */
.kc-check-box > input:focus-visible,
.kc-grid-type > input:focus-visible,
.kc-settings-label-input:focus-visible {
  outline: 2px solid var(--kc-accent);
  outline-offset: 2px;
}

.kc-toggle:has(> input:focus-visible),
.kc-segment:has(> input:focus-visible) {
  outline: 2px solid var(--kc-accent);
  outline-offset: 2px;
}

@media (pointer: coarse) {
  .kc-check {
    min-height: 32px;
  }
}

/* src/components/calculator/styles/table.css */
/* Table items in the expression list (D-5, D-19, D-42). Colours come only from role
   variables (TH-3). Every column keeps one width, and a table wider than the list scrolls sideways
   inside its own item (D-42); the focused cell is scrolled into view by the focus controller. */

/* EL-41: a table item's grid and buttons start 53 px in, clear of the 38 px gutter tab, with the
   delete cross's room at the right. */
.kc-table-item .kc-row-main {
  padding: 15px 35px 0 53px;
}

.kc-table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  font-family: var(--kc-font-math);
  font-size: var(--kc-size-math);
}

.kc-table-row {
  display: flex;
}

.kc-table-cell {
  display: flex;
  flex: 0 0 96px; /* D-42: one width for every column */
  align-items: center;
  box-sizing: border-box;
  min-width: 0;
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--kc-boundary);
  margin: 0 -1px -1px 0;
  overflow: hidden;
  color: var(--kc-text);
}

.kc-table-row[data-header="true"] > .kc-table-cell {
  background: var(--kc-chrome);
}

/* D-10, D-19: computed cells are read-only and set apart by their secondary text. */
.kc-table-cell[data-computed="true"] {
  color: var(--kc-text-secondary);
}

.kc-table-cell:focus-within {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: -2px;
}

.kc-table-field .kc-math-field.mq-editable-field,
.kc-table-field .kc-math-field.mq-editable-field.mq-focused {
  border-style: none;
  border-color: transparent;
  box-shadow: none;
  outline: none;
  min-width: 100%;
}

/* D-8: the per-row delete control shows on hover or focus, and always with a coarse pointer. */
.kc-table-control {
  display: flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
}

.kc-table-row-delete,
.kc-table-add-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  color: var(--kc-text-secondary);
  cursor: pointer;
}

.kc-table-row-delete {
  opacity: 0;
}

.kc-table-row:hover .kc-table-row-delete,
.kc-table-row:focus-within .kc-table-row-delete,
.kc-table-row-delete:focus-visible,
.kc-list-panel[data-pointer="coarse"] .kc-table-row-delete {
  opacity: 1;
}

.kc-table-add-row[aria-disabled="true"] {
  cursor: default;
  opacity: 0.5;
}

/* D-12: a later column's colour and style tab, inside its header cell (its style menu is in
   menus.css). */
.kc-column-style {
  position: relative;
  display: inline-flex;
  flex: none;
}

.kc-column-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--kc-row-color);
  cursor: pointer;
  touch-action: none;
}

.kc-table-field {
  flex: 1 1 auto;
  min-width: 0;
}

/* src/components/calculator/styles/toolbar.css */
/* The list toolbar and what hangs off it: the 48 px toolbar and its 40 px buttons,
   the Expand list button over the graph, and Edit list mode's toolbar and row actions (EL-44,
   EL-45); the tooltips and the Add item menu are in menus.css. Colours come only from roles. */

/* VIS-7, VIS-8, VIS-13: the 48 px toolbar, + at the left, Undo and Redo in the free space between,
   Edit list and Collapse list at the right; a shadow while the list below is scrolled. */
.kc-list-toolbar {
  position: relative;
  z-index: 1;
  display: flex;
  flex: none;
  align-items: center;
  height: var(--kc-toolbar-h);
  padding: 6px 5px 5px;
  border-bottom: 1px solid var(--kc-rule);
  background: linear-gradient(var(--kc-toolbar-top), var(--kc-toolbar-bottom));
  transition: box-shadow var(--kc-dur-200) var(--kc-ease);
}

/* VIS-5: side by side, the toolbar runs under the panel's right rule, so the rule over it is
   the toolbar tone darkened rather than the list's. */
.kc-list-panel[data-layout="desktop"] .kc-list-toolbar {
  margin-right: -1px;
  border-right: 1px solid var(--kc-rule);
}

.kc-list-panel[data-scrolled="true"] .kc-list-toolbar {
  box-shadow: -2px 2px 4px var(--kc-panel-shadow);
}

.kc-toolbar-zone {
  display: flex;
  align-items: center;
}

.kc-toolbar-zone[data-zone="centre"] {
  flex: 1 1 auto;
  justify-content: center;
  padding-left: 4px;
}

/* VIS-RESPONSIVE-9: the stacked mouse layout's Keypad toggle sits 4 px after Add item (its glyph
   centre 66 px in); Undo and Redo keep their place. */
.kc-list-tool[data-tool="keypad"] {
  margin-left: 3px;
}

.kc-list-toolbar:has([data-tool="keypad"]) > [data-zone="centre"] {
  padding-left: 0;
}

/* VIS-9, VIS-10: 40 px buttons on a 38 px pitch; the glyph rests at 0.6, 0.8 on hover over a 10%
   fill, 1 pressed over 20%; a disabled button is 0.3 as a whole. Every change is instant. */
.kc-list-tool {
  display: grid;
  place-items: center;
  width: var(--kc-tool-size);
  height: var(--kc-tool-size);
  margin: -1px;
  padding: 0;
  border: none;
  border-radius: var(--kc-radius-button);
  background: transparent;
  color: var(--kc-text);
  cursor: pointer;
}

.kc-list-tool > svg {
  opacity: var(--kc-icon-rest);
}

/* VIS-RESPONSIVE-9: stacked, the reference draws the toolbar's +, Keypad and chevrons half a pixel
   right of and below the button centre and the gear half a pixel lower; its down chevrons are
   16 px tall. Undo and Redo stay centred. */
.kc-list-panel[data-layout="stacked"] .kc-list-tool:not([data-tool="history"]) > svg {
  translate: 0.5px 0.5px;
}

.kc-list-panel[data-layout="stacked"] .kc-list-tool[data-tool="edit"] > svg {
  translate: 0 0.5px;
}

.kc-list-panel[data-layout="stacked"] .kc-list-tool[data-tool="collapse"] > svg {
  transform-origin: bottom;
  scale: 1 0.96;
}

.kc-list-tool:not([aria-disabled="true"]):is(
    :hover,
    [aria-pressed="true"],
    [aria-expanded="true"]
  ) {
  background: var(--kc-hover-fill);
}

.kc-list-tool:not([aria-disabled="true"]):is(:hover, [aria-pressed="true"], [aria-expanded="true"])
  > svg {
  opacity: var(--kc-icon-hover);
}

.kc-list-tool:not([aria-disabled="true"]):active {
  background: var(--kc-pressed-fill);
}

.kc-list-tool:not([aria-disabled="true"]):active > svg {
  opacity: var(--kc-icon-pressed);
}

/* KB-2: Undo and Redo at the ends of the stack stay in the Tab order (KB-13). */
.kc-list-tool[aria-disabled="true"] {
  opacity: var(--kc-icon-disabled);
  cursor: default;
}

/* VIS-50: with the list hidden, Expand list sits over the graph's top-left corner (stacked: the
   bottom-right corner, pointing up); it fades in once the panel has slid away. */
.kc-list-panel > .kc-list-tool {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 3;
  width: var(--kc-graph-button);
  height: var(--kc-graph-button);
  margin: 0;
  animation: kc-tooltip-in var(--kc-dur-300) var(--kc-ease) var(--kc-dur-400) both;
}

.kc-list-panel[data-layout="stacked"] > .kc-list-tool {
  top: auto;
  right: 5px;
  bottom: 5px;
  left: auto;
}

/* KB-5, EL-44: Edit list mode's red Delete All and blue Done, 35 px tall, in the toolbar. */
.kc-edit-action {
  height: 35px;
  margin: 0 1px;
  padding: 0 15px;
  border: none;
  border-radius: var(--kc-radius-small);
  box-shadow:
    inset 0 1px color-mix(in srgb, var(--kc-list) 10%, transparent),
    inset 0 -1px color-mix(in srgb, var(--kc-text) 4%, transparent);
  color: var(--kc-accent-label);
  font-family: var(--kc-font-ui);
  font-size: var(--kc-size-ui);
  cursor: pointer;
}

.kc-edit-action[data-tone="danger"] {
  background: var(--kc-error);
}

.kc-edit-action[data-tone="accent"] {
  background: var(--kc-accent);
}

.kc-edit-action:focus-visible {
  outline-offset: 3px;
}

/* EL-45: a row's Edit list actions, 44 px buttons at its top-right with 20 px glyphs at 0.6. */
.kc-edit-row-actions {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  gap: 2px;
}

.kc-edit-row-action {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--kc-radius-button);
  background: transparent;
  color: var(--kc-text);
  cursor: pointer;
}

.kc-edit-row-action > svg {
  opacity: var(--kc-icon-rest);
}

.kc-edit-row-action:hover {
  background: var(--kc-hover-fill);
}

.kc-edit-row-action:active > svg {
  opacity: var(--kc-icon-pressed);
}

.kc-edit-row-action:focus-visible {
  outline: 2px solid var(--kc-focus-ring);
  outline-offset: -2px;
}
`,
  fp = `381cfceb9d81e6fe`,
  pp = 50;
function mp(e) {
  let t = new Set(),
    n = new Map(),
    r = !1;
  function i(e) {
    (e.clear !== null && clearTimeout(e.clear),
      e.write !== null && clearTimeout(e.write),
      (e.clear = null),
      (e.write = null),
      t.delete(e),
      e.key !== void 0 && n.get(e.key) === e && n.delete(e.key));
  }
  return {
    announce(a, o = {}) {
      if (r) return;
      let { delayMs: s = 0, key: c } = o;
      if (c !== void 0) {
        let e = n.get(c);
        e && i(e);
      }
      let l = { key: c, clear: null, write: null };
      ((l.clear = setTimeout(
        () => {
          ((l.clear = null), (e.textContent = ``));
        },
        Math.max(0, s - pp)
      )),
        (l.write = setTimeout(
          () => {
            ((l.write = null), i(l), (e.textContent = a));
          },
          Math.max(s, pp)
        )),
        t.add(l),
        c !== void 0 && n.set(c, l));
    },
    cancel(e) {
      if (r) return;
      let t = n.get(e);
      t && i(t);
    },
    destroy() {
      if (!r) {
        r = !0;
        for (let e of [...t]) i(e);
        e.textContent = ``;
      }
    },
  };
}
var hp = (0, h.createContext)(null);
function gp() {
  let e = (0, h.useContext)(hp);
  if (e === null) throw Error(`useAnnouncer must be used inside AnnouncerContext`);
  return e;
}
Object.freeze({ open: !1 });
function _p(e, t) {
  let n = t.type === `touch-focus-row` || t.open;
  return n === e.open ? e : { open: n };
}
function vp(e) {
  if (e.isComposing) return null;
  let { code: t, ctrlKey: n, metaKey: r, altKey: i, shiftKey: a } = e;
  return (n || r) && !i && t === `KeyZ`
    ? a
      ? `redo`
      : `undo`
    : n && !i && t === `KeyY`
      ? `redo`
      : (n || i) && !r && t === `KeyK`
        ? `toggle-keypad`
        : i && (t === `Enter` || t === `NumpadEnter`)
          ? `add-row-end`
          : i && !n && !r && t === `KeyT`
            ? `audio-trace`
            : null;
}
var yp = new Set([`undo`, `redo`, `add-row-end`]);
function bp(e) {
  let t = e.composedPath()[0];
  return !(t instanceof Element) || t.closest(`.mq-textarea`) !== null
    ? !1
    : t.tagName === `SELECT` || (t.tagName === `INPUT` && !xp.has(t.type));
}
var xp = new Set([
  `checkbox`,
  `radio`,
  `button`,
  `submit`,
  `reset`,
  `range`,
  `color`,
  `file`,
  `image`,
]);
function Sp(e, t) {
  let n = (e) => {
    if (!e.isComposing && t.onKey?.(e) === !0) {
      (e.preventDefault(), e.stopPropagation());
      return;
    }
    if (e.key === `Escape` && !e.isComposing) {
      t.onEscape() && e.preventDefault();
      return;
    }
    let n = vp(e);
    n !== null &&
      ((yp.has(n) && bp(e)) || (e.preventDefault(), e.stopPropagation(), t.onShortcut(n)));
  };
  return (
    e.addEventListener(`keydown`, n, { capture: !0 }),
    () => e.removeEventListener(`keydown`, n, { capture: !0 })
  );
}
var Cp = Object.freeze({ keypad: 1, letters: 2, functions: 3 }),
  wp = 4;
function Tp(e) {
  return Object.prototype.hasOwnProperty.call(Cp, e) ? Cp[e] : wp;
}
function Ep() {
  let e = [];
  return {
    push(t) {
      let n = { layer: t };
      return (
        e.push(n),
        () => {
          let t = e.indexOf(n);
          t >= 0 && e.splice(t, 1);
        }
      );
    },
    handleEscape() {
      let t = -1;
      for (let n = 0; n < e.length; n++)
        (t < 0 || Tp(e[n].layer.id) >= Tp(e[t].layer.id)) && (t = n);
      if (t < 0) return !1;
      let [{ layer: n }] = e.splice(t, 1);
      return (n.close(), !0);
    },
  };
}
var Dp = (0, h.createContext)(null);
function Op(e, t, n) {
  return `${e}:${t}:${n}`;
}
function kp(e) {
  e.element.scrollIntoView?.({ block: `nearest` });
}
function Ap(e, t) {
  (e.focus(),
    t === `all` ? e.select() : e.keystroke(t === `start` ? `Ctrl-Home` : `Ctrl-End`),
    kp(e));
}
function jp(e) {
  let t = new Map(),
    n = new Set(),
    r = null,
    i = null,
    a = new Map(),
    o = () => {
      for (let e of [...n]) e();
    },
    s = () => {
      let { focusedRowId: t, rows: n } = e.getSnapshot();
      t === null ? i !== null && !n.some((e) => e.id === i) && (i = null) : (i = t);
    };
  return (
    s(),
    e.subscribe(() => {
      (s(), o());
    }),
    {
      registerField(e, n) {
        if ((t.set(e, n), r?.rowId === e)) {
          let { caret: e } = r;
          ((r = null), Ap(n, e));
        }
        return (
          o(),
          () => {
            t.get(e) === n && (t.delete(e), o());
          }
        );
      },
      field: (e) => t.get(e) ?? null,
      fields() {
        let n = new Map(e.getSnapshot().rows.map((e, t) => [e.id, t])),
          r = (e) => n.get(e) ?? n.size;
        return [...t].sort(([e], [t]) => r(e) - r(t)).map(([, e]) => e);
      },
      focusRow(e, n) {
        let i = t.get(e);
        i === void 0 ? (r = { rowId: e, caret: n }) : ((r = null), Ap(i, n));
      },
      activateRow(n) {
        ((r = null), e.activateExpression(n));
        let i = t.get(n);
        i !== void 0 && kp(i);
      },
      activeRowId: () => e.getSnapshot().activeRowId,
      lastFocusedRowId: () => i,
      noteCell: (e, t) => void a.set(e, t),
      lastCell: (e) => a.get(e) ?? null,
      subscribe(e) {
        return (
          n.add(e),
          () => {
            n.delete(e);
          }
        );
      },
    }
  );
}
var Mp = (0, h.createContext)(null),
  Np = (0, h.createContext)(`ivory`);
function Pp() {
  return (0, h.useContext)(Np);
}
var Fp = `−`,
  Ip = 12,
  Lp = 5,
  Rp = 5,
  zp = 1e-6,
  Bp = 0xe8d4a51000,
  Vp = (e) => Math.min(Ip, Math.max(0, e));
function Hp(e) {
  return Vp(Math.max(Lp, Math.ceil(-Math.log10(e)) + 3));
}
function Up(e) {
  return Vp(Math.ceil(-Math.log10(e)) + 1);
}
function Wp(e, t) {
  if (!Number.isFinite(e)) return `undefined`;
  let n = Number(e.toFixed(Vp(t)));
  if (n === 0) return `0`;
  let r = Math.abs(n),
    i = r >= zp && r < Bp ? String(n) : Gi(Number(e.toPrecision(Math.max(1, t))));
  return i.startsWith(`-`) ? Fp + i.slice(1) : i;
}
var Gp = (e) => {
  let { viewport: t, size: n } = e;
  return { x: (t.right - t.left) / n.width, y: (t.top - t.bottom) / n.height };
};
function Kp(e, t) {
  let n = Gp(t);
  return `(${Wp(e.x, Hp(n.x))}, ${Wp(e.y, Hp(n.y))})`;
}
function qp(e, t) {
  return Number(e.toFixed(Up(Gp(t).x)));
}
function Jp(e, t, n) {
  return `(${Wp(e, Up(Gp(n).x))}, ${Wp(t, Rp)})`;
}
var Yp = `Page Down and Page Up move between points of interest, Left and Right move along the curve, Home and End go to its ends, Escape stops.`,
  Xp = `No more points of interest.`,
  Zp = 0.01,
  Qp = {
    zero: `Zero`,
    "x-intercept": `X-intercept`,
    "y-intercept": `Y-intercept`,
    maximum: `Maximum`,
    minimum: `Minimum`,
    top: `Top`,
    bottom: `Bottom`,
    intersection: `Intersection`,
  };
function $p(e, t, n) {
  return e
    .map((e) => {
      let r = t === null ? void 0 : n.get(t);
      return e === `intersection` && r !== void 0 ? `Intersection with Expression ${r}` : Qp[e];
    })
    .join(` and `);
}
function em(e) {
  let [t, n] = e.slice(1, -1).split(`, `),
    r = (e) => (e.startsWith(`−`) ? `negative ${e.slice(1)}` : e);
  return `x ${r(t)}, y ${r(n)}`;
}
function tm(e, t, n) {
  return `${$p(e.kinds, e.withRowId, t)} at ${em(Kp(e, n))}`;
}
var nm = class {
    constructor(e) {
      ((this.current = null),
        (this.pending = null),
        (this.listeners = new Set()),
        (this.offEngine = null),
        (this.deps = e));
    }
    get state() {
      return this.current;
    }
    subscribe(e) {
      return (this.listeners.add(e), () => this.listeners.delete(e));
    }
    toggle(e) {
      if (this.current !== null) {
        this.stop();
        return;
      }
      let t = this.deps.engine.getSnapshot(),
        n = e ?? t.rows.find((e) => this.traceable(e.id))?.id ?? null;
      n !== null &&
        ((this.offEngine = this.deps.engine.subscribe(() => this.onEngine())),
        this.begin(n, `Audio trace on. ${Yp} `));
    }
    stop() {
      if (this.current === null) return;
      let { rowId: e } = this.current;
      ((this.current = null),
        (this.pending = null),
        this.offEngine?.(),
        (this.offEngine = null),
        this.deps.announce(`Audio trace off`),
        this.deps.focusRow(e),
        this.notify());
    }
    handleKey(e) {
      let t = this.current;
      if (t === null) return !1;
      let n = e.ctrlKey || e.metaKey;
      switch (e.key) {
        case `Escape`:
          return (this.stop(), !0);
        case `PageDown`:
        case `PageUp`:
          return (this.step(e.key === `PageDown` ? 1 : -1), !0);
        case `Home`:
        case `End`:
          return (
            this.moveTo(e.key === `Home` ? this.view().viewport.left : this.view().viewport.right),
            !0
          );
        case `ArrowLeft`:
        case `ArrowRight`: {
          let { left: n, right: r } = this.view().viewport;
          return (this.moveTo(t.x + (e.key === `ArrowRight` ? 1 : -1) * Zp * (r - n)), !0);
        }
        case `ArrowUp`:
        case `ArrowDown`: {
          if (!n) return !1;
          let r = this.deps.engine.getSnapshot(),
            i = r.rows.filter((e) => e.id === t.rowId || this.traceable(e.id)),
            a = i[i.findIndex((e) => e.id === t.rowId) + (e.key === `ArrowDown` ? 1 : -1)];
          return (a !== void 0 && this.begin(a.id, `Expression ${r.rows.indexOf(a) + 1}. `), !0);
        }
        default:
          return !1;
      }
    }
    begin(e, t) {
      (this.deps.engine.setSelectedRow(e),
        (this.current = { rowId: e, x: 0, y: 0, index: null }),
        (this.pending = t),
        this.notify(),
        this.onEngine());
    }
    onEngine() {
      let e = this.current;
      if (e === null || this.pending === null) return;
      let t = this.deps.engine.getSnapshot();
      if (t.poi === null || t.poi.rowId !== e.rowId || t.view === null) return;
      let n = this.pending;
      this.pending = null;
      let r = t.poi.points[0];
      if (r === void 0) {
        let { left: e, right: r } = t.view.viewport;
        this.moveTo((e + r) / 2, n);
      } else
        ((this.current = { rowId: e.rowId, x: r.x, y: r.y, index: 0 }),
          this.notify(),
          this.deps.announce(`${n}${tm(r, this.rowNumbers(), t.view)}`));
    }
    step(e) {
      let t = this.current,
        n = this.deps.engine.getSnapshot(),
        r = n.poi?.rowId === t.rowId ? n.poi.points : [],
        i;
      i =
        t.index === null
          ? e > 0
            ? r.findIndex((e) => e.x > t.x)
            : r.findLastIndex((e) => e.x < t.x)
          : t.index + e;
      let a = this.view();
      if (i < 0 || i >= r.length) {
        let e = t.index === null ? null : r[t.index],
          n = e == null ? em(Jp(t.x, t.y, a)) : tm(e, this.rowNumbers(), a);
        this.deps.announce(`${Xp} ${n}`);
        return;
      }
      let o = r[i];
      ((this.current = { rowId: t.rowId, x: o.x, y: o.y, index: i }),
        this.notify(),
        this.deps.announce(tm(o, this.rowNumbers(), a)));
    }
    moveTo(e, t = ``) {
      let n = this.current,
        r = this.view(),
        i = this.deps.engine.poiCurves(n.rowId)[0];
      if (i === void 0 || i.kind !== `explicit` || i.independent !== `x`) return;
      let { left: a, right: o } = r.viewport,
        s = qp(Math.min(o, Math.max(a, e)), r),
        c = i.f(s);
      Number.isFinite(c) &&
        ((this.current = { rowId: n.rowId, x: s, y: c, index: null }),
        this.notify(),
        this.deps.announce(`${t}${em(Jp(s, c, r))}`));
    }
    traceable(e) {
      return this.deps.engine.poiCurves(e).length > 0;
    }
    view() {
      let e = this.deps.engine.getSnapshot();
      return e.view ?? { viewport: e.viewport, size: { width: 800, height: 600 }, dpr: 1 };
    }
    rowNumbers() {
      return new Map(this.deps.engine.getSnapshot().rows.map((e, t) => [e.id, t + 1]));
    }
    notify() {
      for (let e of [...this.listeners]) e();
    }
  },
  rm = (0, h.createContext)(null),
  im = (0, h.createContext)(null);
function am(e) {
  let t = (0, h.useCallback)((t) => e.subscribe(t), [e]),
    n = (0, h.useCallback)(() => e.getSnapshot(), [e]);
  return (0, h.useSyncExternalStore)(t, n, n);
}
function om() {
  let e = (0, h.useContext)(im);
  if (e === null) throw Error(`useEngine must be used inside EngineContext`);
  return e;
}
var sm = 2.5,
  cm = 3.5,
  lm = 1.5,
  um = 0.25,
  dm = [11, 7],
  fm = 8.1,
  pm = 0.1,
  mm = 2.83,
  hm = 2.8,
  gm = 0.3,
  _m = `14px Arial, sans-serif`,
  vm = 1.5,
  ym = 6.3,
  bm = 0.8,
  xm = `17px Arial, sans-serif`,
  Sm = `italic 20px "Times New Roman", Times, serif`,
  Cm = 1.5,
  wm = 11.6,
  Tm = 3.1,
  Em = 5.5,
  Dm = 17 / 16,
  Om = [1, 2, 5],
  km = 1e-9;
function Am(e, t, n) {
  let r = e * t;
  return r === 0 ? 0 : n >= 0 ? r * 10 ** n : r / 10 ** -n;
}
function jm(e, t, n) {
  return [Math.ceil(e / n - km), Math.floor(t / n + km)];
}
function Mm(e, t, n) {
  let r = { step: 0, major: [], minor: [] };
  if (![e, t, n].every(Number.isFinite) || t <= e || n <= 0) return r;
  let i = ((t - e) * 80) / n;
  if (!Number.isFinite(i) || i <= 0) return r;
  let a = Math.floor(Math.log10(i)),
    o = null;
  for (let e = a - 1; e <= a + 1 && o === null; e++) {
    let t = Om.find((t) => Am(1, t, e) >= i * 0.999999999);
    t !== void 0 && (o = { m: t, k: e });
  }
  if (o === null) return r;
  let { m: s, k: c } = o,
    l = Am(1, s, c),
    u = [],
    [d, f] = jm(e, t, l);
  for (let e = d; e <= f; e++) u.push(Am(e, s, c));
  let [p, m] = s === 1 ? [2, c - 1] : s === 2 ? [5, c - 1] : [1, c],
    h = s === 2 ? 4 : 5,
    g = [],
    [_, v] = jm(e, t, Am(1, p, m));
  for (let e = _; e <= v; e++) e % h !== 0 && g.push(Am(e, p, m));
  return { step: l, major: u, minor: g };
}
function Nm(e, t) {
  let n = Math.max(Math.abs(e), Math.abs(t));
  return !(n > 5e-5 && n < 5e6);
}
var Pm = (e) => (e.includes(`.`) ? e.replace(/0+$/, ``).replace(/\.$/, ``) : e),
  Fm = (e, t) => e.toFixed(Math.min(100, Math.max(0, t)));
function Im(e, t, n) {
  if (!n || !Number.isFinite(e) || e === 0) return { text: Ji(e, t) };
  let r = Math.abs(e);
  if (r < 1e-6 * t) return { text: `0` };
  let i = Math.floor(Math.log10(t) + 1e-9),
    a = Math.floor(Math.log10(r)),
    o = Fm(e / 10 ** a, a - i);
  return (
    Math.abs(Number(o)) >= 10 && ((a += 1), (o = Fm(e / 10 ** a, a - i))),
    { text: `${Pm(o)}×10`, exponent: String(a) }
  );
}
function Lm(e) {
  let {
    showGrid: t,
    polarGrid: n,
    minorGridlines: r,
    arrows: i,
    axisNumbers: a,
    xAxis: o,
    yAxis: s,
  } = e;
  return {
    showGrid: t,
    polarGrid: n,
    minorGridlines: r,
    arrows: i,
    axisNumbers: a,
    xAxis: o,
    yAxis: s,
  };
}
var Rm = 14,
  zm = 30,
  Bm = 1e-9;
function Vm(e, t, n, r) {
  return e === null || !Number.isFinite(e) || e <= 0
    ? !1
    : Math.floor(n / e) - Math.ceil(t / e) + 1 <= r / 8;
}
function Hm(e, t, n) {
  let r = [];
  for (let i = Math.ceil(e / n), a = Math.floor(t / n); i <= a; i++) r.push(i * n + 0);
  let i = n / 5,
    a = [];
  for (let r = Math.ceil(e / i), o = Math.floor(t / i); r <= o; r++) {
    let e = r * i + 0;
    Math.abs(e - Math.round(e / n) * n) > Bm * n && a.push(e);
  }
  return { step: n, major: r, minor: a };
}
function Um(e, t, n, r) {
  return Vm(r, e, t, n) ? Hm(e, t, r) : Mm(e, t, n);
}
var Wm = ({ viewport: e, size: t }) =>
  [e.left, e.right, e.bottom, e.top, t.width, t.height].every(Number.isFinite) &&
  e.right > e.left &&
  e.top > e.bottom &&
  t.width > 0 &&
  t.height > 0;
function Gm(e, t, n, r) {
  let { width: i, height: a } = t.size,
    o = (e) => {
      let n = j(t, e, 0)[0];
      return { x0: n, y0: 0, x1: n, y1: a };
    },
    s = (e) => {
      let n = j(t, 0, e)[1];
      return { x0: 0, y0: n, x1: i, y1: n };
    },
    c = (e, t) => [
      ...e.filter((e) => !(e === 0 && r.yAxisDrawn)).map(o),
      ...t.filter((e) => !(e === 0 && r.xAxisDrawn)).map(s),
    ];
  e.majorLines = c(r.xs.major, r.ys.major);
  let l = (e, t) => [...e, ...t].sort((e, t) => e - t);
  n.minorGridlines && (e.minorLines = c(l(r.xs.minor, r.xs.major), l(r.ys.minor, r.ys.major)));
}
function Km(e, t, n) {
  let { viewport: r, size: i } = t,
    { width: a, height: o } = i,
    [s, c] = j(t, 0, 0),
    l = r.right - r.left,
    u = r.top - r.bottom,
    d = Math.min(a / l, o / u),
    f = Math.hypot(Math.max(r.left, 0, -r.right), Math.max(r.bottom, 0, -r.top)),
    p = Math.hypot(
      Math.max(Math.abs(r.left), Math.abs(r.right)),
      Math.max(Math.abs(r.bottom), Math.abs(r.top))
    ),
    m = n.xAxis.step,
    h = Vm(m, r.left, r.right, a) && m * d >= 8 ? Hm(f, p, m) : Mm(f, p, (p - f) * d),
    g = (e) => ({ cx: s, cy: c, rx: (e * a) / l, ry: (e * o) / u });
  ((e.majorEllipses = h.major.filter((e) => e > 0).map(g)),
    n.minorGridlines && (e.minorEllipses = h.minor.filter((e) => e > 0).map(g)));
  let _ = Math.hypot(
      Math.max(Math.abs(s), Math.abs(a - s)),
      Math.max(Math.abs(c), Math.abs(o - c))
    ),
    v = Math.max(2 * (a + o), _);
  for (let t = 0; t < 360; t += 15) {
    let r = t % zm === 0;
    if (!r && !n.minorGridlines) continue;
    let i = (t * Math.PI) / 180,
      d = (Math.cos(i) * a) / l,
      f = (-Math.sin(i) * o) / u,
      p = v / Math.hypot(d, f);
    (r ? e.majorLines : e.minorLines).push({ x0: s, y0: c, x1: s + d * p, y1: c + f * p });
  }
}
var qm = 15.8,
  Jm = 5,
  Ym = 3.8,
  Xm = 3,
  Zm = 13.8,
  Qm = 6.2,
  $m = 4.8,
  eh = 33,
  th = 17,
  nh = 22.4,
  rh = 29;
function ih(e, t) {
  let n = e.align === `left` ? e.x : e.align === `right` ? e.x - t : e.x - t / 2;
  return { left: n, right: n + t, top: e.y - Rm, bottom: e.y };
}
var ah = (e, t) => e.left < t.right && t.left < e.right && e.top < t.bottom && t.top < e.bottom,
  oh = (e, t, n) => Math.min(Math.max(e, t), Math.max(t, n));
function sh(e, t, n) {
  let r = Im(e, t, n);
  return r.exponent === void 0 ? { text: r.text } : { text: r.text, exponent: r.exponent };
}
function ch(e, t, n, r) {
  let { width: i, height: a } = e.size,
    [o, s] = j(e, 0, 0),
    c = [],
    l = (e) => r(e.text, e.font) + (e.exponent === void 0 ? 0 : r(e.exponent, e.font) - bm),
    u = (e) => {
      let t = null;
      for (let n of e) {
        let e = ih(n, l(n));
        (t !== null && ah(e, t)) || (c.push(n), (t = e));
      }
    },
    d = (e) => (e.exponent === void 0 ? e : { ...e, y: e.y + $m }),
    f = e.viewport;
  if (t.axisNumbers) {
    let p = Nm(f.left, f.right),
      m = Nm(f.bottom, f.top),
      h = a - Qm,
      g = s < 0 || s + qm > h,
      _ = s < 0 ? Zm : g ? h : s + qm;
    (u(
      (t.xAxis.show ? n.xs.major.filter((e) => e !== 0) : []).map((t) => {
        let a = sh(t, n.xs.step, p),
          o = l(a),
          s = r(a.text),
          c = a.text.startsWith(`-`) ? r(`-`) / 2 : 0,
          u = oh(j(e, t, 0)[0] - c, Xm + s / 2, i - Xm - o + s / 2),
          f = { ...a, x: u, y: _, align: `center` };
        return d(g ? { ...f, pinned: !0 } : f);
      })
    ),
      u(
        (t.yAxis.show ? n.ys.major.filter((e) => e !== 0) : []).map((t) => {
          let s = sh(t, n.ys.step, m),
            c = l(s),
            u = c - r(s.text),
            f = oh(j(e, 0, t)[1] + Ym, Zm, a - Qm),
            p;
          return (
            (p =
              o > i
                ? { ...s, x: i - Xm - u, y: f, align: `right`, pinned: !0 }
                : o - Jm - c < Xm
                  ? { ...s, x: Xm, y: f, align: `left`, pinned: !0 }
                  : { ...s, x: o - Jm - u, y: f, align: `right` }),
            d(p)
          );
        })
      ),
      n.xAxisDrawn &&
        n.yAxisDrawn &&
        t.xAxis.show &&
        t.yAxis.show &&
        c.push({ text: `0`, x: o - Jm, y: s + qm, align: `right` }));
  }
  let p = (e) => ([...e].length === 1 ? `letter` : `title`),
    m = t.xAxis.show ? t.xAxis.label : ``;
  m !== `` && n.xAxisDrawn && c.push({ text: m, x: i - th, y: s + eh, align: `right`, font: p(m) });
  let h = t.yAxis.show ? t.yAxis.label : ``;
  return (
    h !== `` && n.yAxisDrawn && c.push({ text: h, x: o - nh, y: rh, align: `right`, font: p(h) }),
    c
  );
}
function lh(e, t, n) {
  let [r, i] = j(t, 0, 0),
    a = Em / 2;
  if (n.xAxisDrawn)
    for (let r of n.xs.major) {
      if (r === 0 && n.yAxisDrawn) continue;
      let o = j(t, r, 0)[0] - um,
        s = i - um;
      e.ticks.push({ x0: o, y0: s - a, x1: o, y1: s + a });
    }
  if (n.yAxisDrawn)
    for (let i of n.ys.major) {
      if (i === 0 && n.xAxisDrawn) continue;
      let o = j(t, 0, i)[1] - um,
        s = r - um;
      e.ticks.push({ x0: s - a, y0: o, x1: s + a, y1: o });
    }
}
function uh(e, t, n) {
  let r = {
    minorLines: [],
    majorLines: [],
    axes: [],
    ticks: [],
    minorEllipses: [],
    majorEllipses: [],
    polar: t.polarGrid,
    arrows: [],
    labels: [],
  };
  if (!Wm(e)) return r;
  let { viewport: i, size: a } = e,
    o = {
      xs: Um(i.left, i.right, a.width, t.xAxis.step),
      ys: Um(i.bottom, i.top, a.height, t.yAxis.step),
      xAxisDrawn: t.xAxis.show && i.bottom <= 0 && 0 <= i.top,
      yAxisDrawn: t.yAxis.show && i.left <= 0 && 0 <= i.right,
    };
  t.showGrid ? (t.polarGrid ? Km(r, e, t) : Gm(r, e, t, o)) : lh(r, e, o);
  let [s, c] = j(e, 0, 0).map((e) => e - um);
  if (o.xAxisDrawn) {
    let e = t.arrows ? a.width - 3 : a.width;
    (r.axes.push({ x0: 0, y0: c, x1: e, y1: c }),
      t.arrows && r.arrows.push({ x: a.width - Cm, y: c, direction: `right` }));
  }
  if (o.yAxisDrawn) {
    let e = t.arrows ? 3 : 0;
    (r.axes.push({ x0: s, y0: e, x1: s, y1: a.height }),
      t.arrows && r.arrows.push({ x: s, y: Cm, direction: `up` }));
  }
  return ((r.labels = ch(e, t, o, n)), r);
}
var dh = (e) => [1, 3, 5].map((t) => parseInt(e.slice(t, t + 2), 16));
function fh(e) {
  let t = dh(e.paper),
    n = dh(e.text);
  return `#${t
    .map((e, t) => Math.round(e + (n[t] - e) * gm))
    .map((e) => e.toString(16).padStart(2, `0`))
    .join(``)}`;
}
function ph(e, t, n, r) {
  let { width: i, height: a } = t.size;
  for (let o of [!1, !0]) {
    let s = o ? 5 : 4,
      c = !1;
    for (let l of r) {
      if (l.open !== o) continue;
      let [r, u] = j(t, l.x, l.y);
      r >= -s &&
        r <= i + s &&
        u >= -s &&
        u <= a + s &&
        (c || ((c = !0), (e.fillStyle = o ? n.text : fh(n)), e.beginPath()),
        e.moveTo(r + s, u),
        e.arc(r, u, s, 0, 2 * Math.PI));
    }
    c && e.fill();
  }
}
function mh(e, t, n) {
  let [r, i] = j(t, n.x, n.y);
  (e.beginPath(), e.arc(r, i, 4, 0, 2 * Math.PI), (e.fillStyle = n.color), e.fill());
}
function hh(e, t) {
  (e.setTransform(1, 0, 0, 1, 0, 0),
    e.clearRect(0, 0, e.canvas.width, e.canvas.height),
    e.setTransform(t, 0, 0, t, 0, 0));
}
function gh(e, t) {
  let { width: n, height: r } = e.size;
  return { left: -t, top: -t, right: n + t, bottom: r + t };
}
var _h = ([e, t], n) => e >= n.left && e <= n.right && t >= n.top && t <= n.bottom;
function vh(e, t, n) {
  if (![e[0], e[1], t[0], t[1]].every(Number.isFinite)) return null;
  let r = t[0] - e[0],
    i = t[1] - e[1],
    a = 0,
    o = 1,
    s = [
      [-r, e[0] - n.left],
      [r, n.right - e[0]],
      [-i, e[1] - n.top],
      [i, n.bottom - e[1]],
    ];
  for (let [e, t] of s) {
    if (e === 0) {
      if (t < 0) return null;
      continue;
    }
    let n = t / e;
    if (e < 0) {
      if (n > o) return null;
      n > a && (a = n);
    } else {
      if (n < a) return null;
      n < o && (o = n);
    }
  }
  let c = (t) => [e[0] + t * r, e[1] + t * i];
  return [a === 0 ? e : c(a), o === 1 ? t : c(o)];
}
function yh(e, t, n) {
  if (t.length !== 0) {
    e.setTransform(1, 0, 0, 1, 0, 0);
    for (let n of t)
      ((e.fillStyle = n.color), (e.globalAlpha = n.alpha), e.fillRect(n.x, n.y, n.width, n.height));
    ((e.globalAlpha = 1), e.setTransform(n, 0, 0, n, 0, 0));
  }
}
var bh = (e, t) => Number.isFinite(e[t]) && Number.isFinite(e[t + 1]);
function xh(e, t, n, r) {
  let i = sm / 2;
  for (let a = 0; a + 3 < n.length; a += 4) {
    if (!bh(n, a) || !bh(n, a + 2)) continue;
    let [o, s] = j(t, n[a], n[a + 3]),
      [c, l] = j(t, n[a + 1], n[a + 2]),
      u = Math.max(r.left, Math.min(o, c) - i),
      d = Math.min(r.right, Math.max(o, c) + i),
      f = Math.max(r.top, Math.min(s, l) - i),
      p = Math.min(r.bottom, Math.max(s, l) + i);
    d > u && p > f && e.fillRect(u, f, d - u, p - f);
  }
}
var Sh = 1,
  Ch = 0.5;
function wh(e, t, n, r) {
  let { width: i, height: a } = e.size;
  if (
    !(t[0] <= Sh || t[1] <= Sh || t[0] >= i - Sh || t[1] >= a - Sh) ||
    !_h(t, r) ||
    t[0] < -0.5 ||
    t[0] > i + Ch
  )
    return 0;
  let o = Math.hypot(t[0] - n[0], t[1] - n[1]);
  if (!(o > 0)) return 0;
  let s = [(t[0] - n[0]) / o, (t[1] - n[1]) / o],
    c = 1 / 0;
  for (let e of [0, 1]) {
    let [n, a] = e === 0 ? [-0.5, i + Ch] : [r.top, r.bottom];
    s[e] > 0
      ? (c = Math.min(c, (a - t[e]) / s[e]))
      : s[e] < 0 && (c = Math.min(c, (n - t[e]) / s[e]));
  }
  return Number.isFinite(c) ? c : 0;
}
function Th(e) {
  let t = Float64Array.from(e);
  for (let n = 0; n + 1 < e.length; ) {
    if (!bh(e, n)) {
      n += 2;
      continue;
    }
    let r = n + 2;
    for (; r + 1 < e.length && bh(e, r); ) r += 2;
    let i = e[r - 2] - e[n],
      a = e[r - 1] - e[n + 1],
      o = Math.abs(i) >= Math.abs(a);
    if ((o && i < 0) || (!o && a < 0))
      for (let i = n; i < r; i += 2) ((t[n + r - 2 - i] = e[i]), (t[n + r - 1 - i] = e[i + 1]));
    n = r;
  }
  return t;
}
function Eh(e, t, n, r, i) {
  let a = i || n.dashed,
    o = e.lineWidth;
  (i && (e.lineWidth = 2 * o), e.setLineDash(i ? [pm, fm - pm] : n.dashed ? [...dm] : []));
  let s = n.polylines,
    c = 0,
    l = null;
  for (let n = 0; n + 1 < s.length; ) {
    if (!bh(s, n)) {
      n += 2;
      continue;
    }
    let i = n + 2;
    for (; i + 1 < s.length && bh(s, i); ) i += 2;
    let o = j(t, s[n], s[n + 1]);
    if (i - n >= 4) {
      (l !== null && Math.hypot(o[0] - l[0], o[1] - l[1]) <= 0.5) ||
        (c = wh(t, o, j(t, s[n + 2], s[n + 3]), r));
      let u = c,
        d = null,
        f = o;
      for (let a = n + 2; a < i; a += 2) {
        let n = j(t, s[a], s[a + 1]),
          i = vh(f, n, r);
        if (i !== null) {
          let [t, n] = i;
          (d === null && e.beginPath(),
            (d === null || d[0] !== t[0] || d[1] !== t[1]) && e.moveTo(...t),
            e.lineTo(...n),
            (d = n),
            (c += Math.hypot(n[0] - t[0], n[1] - t[1])));
        }
        f = n;
      }
      (d !== null && ((e.lineDashOffset = a ? u : 0), e.stroke()), (l = f));
    }
    n = i;
  }
  e.lineWidth = o;
}
function Dh(e, t, n, r) {
  (e.setLineDash(n.dashed ? [...dm] : []), (e.lineDashOffset = 0));
  let { width: i, height: a } = t.size,
    o = n.orientation === `vertical`,
    [s, c] = o ? [r.left, r.right] : [r.top, r.bottom];
  for (let r of n.positions) {
    if (!Number.isFinite(r)) continue;
    let [n, l] = j(t, o ? r : 0, o ? 0 : r),
      u = o ? n : l;
    u >= s &&
      u <= c &&
      (e.beginPath(),
      o ? (e.moveTo(n, 0), e.lineTo(n, a)) : (e.moveTo(0, l), e.lineTo(i, l)),
      e.stroke());
  }
}
function Oh(e, t, n, r, i = !1) {
  n.kind === `lines` ? Dh(e, t, n, r) : (xh(e, t, n.bands, r), Eh(e, t, n, r, i));
}
function kh(e, t, n, r = new Map()) {
  (hh(e, t.dpr), (e.lineWidth = sm), (e.lineJoin = `round`), (e.lineCap = `round`));
  let i = gh(t, sm + 3);
  for (let a of n) {
    let n = a.geometry;
    if (n.kind !== `points` && n.kind !== `table`) {
      if (
        ((e.strokeStyle = a.color),
        (e.fillStyle = a.color),
        (e.lineWidth = a.selected === !0 ? cm : sm),
        n.kind === `region`)
      ) {
        (yh(e, r.get(a.rowId) ?? [], t.dpr), (e.fillStyle = a.color));
        for (let r of n.boundaries)
          Oh(e, t, r.kind === `curve` && r.dashed ? { ...r, polylines: Th(r.polylines) } : r, i);
      } else Oh(e, t, n, i, a.lineStyle === `dotted`);
    }
  }
}
function Ah(e, t, n, r) {
  hh(e, t.dpr);
  let i = gh(t, 8);
  (e.setLineDash([]), (e.lineCap = `round`), (e.lineWidth = hm));
  for (let a of n) {
    let n = a.geometry;
    if (n.kind !== `points`) continue;
    let o = a.pointStyle ?? `filled`,
      s = [];
    for (let e = 0; e + 1 < n.coords.length; e += 2) {
      if (!bh(n.coords, e)) continue;
      let r = j(t, n.coords[e], n.coords[e + 1]);
      _h(r, i) && s.push(r);
    }
    if (s.length !== 0) {
      ((e.fillStyle = a.color), (e.strokeStyle = a.color), e.beginPath());
      for (let [t, n] of s)
        if (o === `cross`) {
          let r = mm;
          (e.moveTo(t - r, n - r),
            e.lineTo(t + r, n + r),
            e.moveTo(t - r, n + r),
            e.lineTo(t + r, n - r));
        } else (e.moveTo(t + 4, n), e.arc(t, n, 4, 0, 2 * Math.PI));
      if (o === `cross`) e.stroke();
      else if ((e.fill(), o === `open`)) {
        ((e.fillStyle = r), e.beginPath());
        for (let [t, n] of s) (e.moveTo(t + 2, n), e.arc(t, n, 2, 0, 2 * Math.PI));
        e.fill();
      }
    }
  }
}
var jh = 1e5,
  Mh = 0.1,
  Nh = 4096,
  Ph = (e) => Math.floor(e + 1e-6);
function Fh(e, t, n, r, i = Math.round) {
  let a = Math.max(1, Math.round(n * r)),
    o = (e) => i(e * r) - Math.floor(a / 2),
    s = (e, t) => [Math.round(Math.min(e, t) * r), Math.round(Math.max(e, t) * r)];
  if (t.x0 === t.x1) {
    let [n, r] = s(t.y0, t.y1);
    e.fillRect(o(t.x0), n, a, r - n);
  } else if (t.y0 === t.y1) {
    let [n, r] = s(t.x0, t.x1);
    e.fillRect(n, o(t.y0), r - n, a);
  }
}
function Ih(e, t) {
  if (e.cx >= t.left && e.cx <= t.right && e.cy >= t.top && e.cy <= t.bottom)
    return [0, 2 * Math.PI];
  let n = (t, n) => Math.atan2((n - e.cy) / e.ry, (t - e.cx) / e.rx),
    r = n((t.left + t.right) / 2, (t.top + t.bottom) / 2),
    i = 0,
    a = 0;
  for (let e of [t.left, t.right])
    for (let o of [t.top, t.bottom]) {
      let t = n(e, o) - r;
      ((t -= 2 * Math.PI * Math.round(t / (2 * Math.PI))),
        (i = Math.min(i, t)),
        (a = Math.max(a, t)));
    }
  return [r + i, r + a];
}
function Lh(e, t, n) {
  if (!(t.rx > 0 && t.ry > 0)) return;
  let r = Math.max(t.rx, t.ry);
  if (r <= jh) {
    (e.moveTo(t.cx + t.rx, t.cy), e.ellipse(t.cx, t.cy, t.rx, t.ry, 0, 0, 2 * Math.PI));
    return;
  }
  let [i, a] = Ih(t, n),
    o = Math.min(Nh, Math.max(1, Math.ceil((a - i) * Math.sqrt(r / (8 * Mh))))),
    s = (e) => {
      let n = i + ((a - i) * e) / o;
      return [t.cx + t.rx * Math.cos(n), t.cy + t.ry * Math.sin(n)];
    },
    c = null,
    l = s(0);
  for (let t = 1; t <= o; t++) {
    let r = s(t),
      i = vh(l, r, n);
    (i !== null &&
      ((c === null || c[0] !== i[0][0] || c[1] !== i[0][1]) && e.moveTo(...i[0]),
      e.lineTo(...i[1]),
      (c = i[1])),
      (l = r));
  }
}
function Rh(e, t, n, r, i, a) {
  let { dpr: o } = t;
  if (!n) {
    if (r.length === 0) return;
    ((e.fillStyle = a), e.setTransform(1, 0, 0, 1, 0, 0));
    for (let t of r) Fh(e, t, 1, o, Ph);
    e.setTransform(o, 0, 0, o, 0, 0);
    return;
  }
  if (r.length === 0 && i.length === 0) return;
  let { width: s, height: c } = t.size,
    l = { left: -1, top: -1, right: s + 1, bottom: c + 1 };
  ((e.strokeStyle = a), e.beginPath());
  for (let t of r) {
    let n = vh([t.x0, t.y0], [t.x1, t.y1], l);
    n !== null && (e.moveTo(...n[0]), e.lineTo(...n[1]));
  }
  for (let t of i) Lh(e, t, l);
  e.stroke();
}
var zh = (e) => [1, 3, 5].reduce((t, n) => t + parseInt(e.slice(n, n + 2), 16), 0) / 3,
  Bh = /^#[0-9a-f]{6}$/i;
function Vh(e, t) {
  let n = {
      minor: 1,
      major: 1,
      axis: 1,
      color: { minor: e.gridMinor, major: e.gridMajor, axis: e.axis },
    },
    r = [e.paper, e.text, e.gridMinor, e.gridMajor, e.axis];
  if (!r.every((e) => Bh.test(e))) return n;
  let [i, a, o, s, c] = r.map(zh);
  if (Math.abs(i - a) < 32) return n;
  let l = (e) => (i - e) / (i - a),
    u = { minor: l(o), major: t ? 1 - (s - a) / (o - a) : l(s), axis: l(c) };
  return [u.minor, u.major, u.axis].every((e) => Number.isFinite(e) && e > 0 && e <= 1)
    ? { ...u, color: { minor: e.text, major: e.text, axis: e.text } }
    : n;
}
function Hh(e = `axis`) {
  return e === `title` ? xm : e === `letter` ? Sm : _m;
}
function Uh(e, t) {
  if (t.length !== 0) {
    e.beginPath();
    for (let n of t) (e.moveTo(n.x0, n.y0), e.lineTo(n.x1, n.y1));
    e.stroke();
  }
}
function Wh(e, t, n) {
  ((e.lineWidth = 2 * vm),
    (e.lineJoin = `miter`),
    (e.miterLimit = 2),
    (e.strokeStyle = n.paper),
    (e.textBaseline = `alphabetic`));
  let r = (t, n, r) => {
    (e.strokeText(t, n, r), e.fillText(t, n, r));
  };
  for (let i of t) {
    if (
      ((e.font = Hh(i.font)),
      (e.fillStyle = i.pinned === !0 ? n.gridMajor : n.text),
      (e.textAlign = i.align),
      r(i.text, i.x, i.y),
      i.exponent === void 0)
    )
      continue;
    let t = e.measureText(i.text).width,
      a = i.align === `left` ? i.x + t : i.align === `right` ? i.x : i.x + t / 2;
    ((e.textAlign = `left`), r(i.exponent, a - bm, i.y - ym));
  }
}
function Gh(e, t, n, r) {
  let { dpr: i } = r;
  (e.setTransform(1, 0, 0, 1, 0, 0),
    e.clearRect(0, 0, e.canvas.width, e.canvas.height),
    e.setTransform(i, 0, 0, i, 0, 0),
    e.setLineDash([]),
    (e.lineWidth = 1),
    (e.lineJoin = `round`),
    (e.lineCap = `butt`));
  let a = Vh(n, t.minorLines.length + t.minorEllipses.length > 0);
  if (
    ((e.globalAlpha = a.minor),
    Rh(e, r, t.polar, t.minorLines, t.minorEllipses, a.color.minor),
    (e.globalAlpha = a.major),
    Rh(e, r, t.polar, t.majorLines, t.majorEllipses, a.color.major),
    (e.globalAlpha = a.axis),
    (e.strokeStyle = a.color.axis),
    (e.fillStyle = a.color.axis),
    (e.lineWidth = lm),
    Uh(e, t.axes),
    Uh(e, t.ticks),
    t.arrows.length > 0)
  ) {
    e.beginPath();
    for (let { x: n, y: r, direction: i } of t.arrows)
      (e.moveTo(n, r),
        i === `right`
          ? (e.lineTo(n - wm, r - Tm), e.lineTo(n - wm, r + Tm))
          : (e.lineTo(n - Tm, r + wm), e.lineTo(n + Tm, r + wm)),
        e.closePath());
    (e.fill(), e.stroke());
  }
  ((e.globalAlpha = 1), t.labels.length > 0 && Wh(e, t.labels, n));
}
var Kh = (e) => Math.round(e).toString(16).padStart(2, `0`);
function qh(e) {
  let t = 0,
    n = [0, 0, 0];
  for (let { color: r, alpha: i } of e) {
    let e = Math.min(1, Math.max(0, i)),
      a = [1, 3, 5].map((e) => parseInt(r.slice(e, e + 2), 16));
    for (let t = 0; t < 3; t++) n[t] = a[t] * e + n[t] * (1 - e);
    t = e + t * (1 - e);
  }
  return t === 0
    ? { color: e[0]?.color ?? ``, alpha: 0 }
    : { color: `#${n.map((e) => Kh(e / t)).join(``)}`, alpha: t };
}
var Jh = (e, t) => Math.ceil(e * t - 0.5);
function Yh(e, t, n, r) {
  let i = [];
  return (
    e.forEach(({ spans: e }, a) => {
      for (let o = 0; o + 3 < e.length; o += 4) {
        let s = Math.max(0, Jh(e[o], r)),
          c = Math.min(n, Jh(e[o + 1], r)),
          l = Math.max(0, Jh(e[o + 2], r)),
          u = Math.min(t, Jh(e[o + 3], r));
        s < c && l < u && i.push({ r0: s, r1: c, c0: l, c1: u, index: a });
      }
    }),
    i.sort((e, t) => e.r0 - t.r0)
  );
}
function Xh(e, t) {
  let n = [];
  for (let t of e) n.push([t.c0, 1, t.index], [t.c1, -1, t.index]);
  n.sort((e, t) => e[0] - t[0]);
  let r = [];
  for (let e = 0; e < n.length; ) {
    let i = n[e][0];
    for (; e < n.length && n[e][0] === i; e++) t[n[e][2]] += n[e][1];
    if (e === n.length) break;
    let a = [];
    if (
      (t.forEach((e, t) => {
        e > 0 && a.push(t);
      }),
      a.length === 0)
    )
      continue;
    let o = a.join(`,`),
      s = r[r.length - 1];
    s && s.x1 === i && s.key === o ? (s.x1 = n[e][0]) : r.push({ x0: i, x1: n[e][0], key: o });
  }
  return r;
}
var Zh = (e, t) =>
  e.length === t.length &&
  e.every((e, n) => e.x0 === t[n].x0 && e.x1 === t[n].x1 && e.key === t[n].key);
function Qh(e, t, n) {
  let r = Math.round(t.width * n),
    i = Math.round(t.height * n);
  if (!(r > 0 && i > 0)) return [];
  let a = Yh(e, r, i, n),
    o = [...new Set(a.flatMap((e) => [e.r0, e.r1]))].sort((e, t) => e - t),
    s = (e) => ({ color: e.color, alpha: e.fillAlpha }),
    c = new Map(),
    l = (t) => {
      let n = c.get(t);
      return (n === void 0 && ((n = qh(t.split(`,`).map((t) => s(e[Number(t)])))), c.set(t, n)), n);
    },
    u = e.map(() => 0),
    d = [],
    f = [],
    p = 0,
    m = [],
    h = [];
  for (let e = 0; e + 1 < o.length; e++) {
    let t = o[e],
      n = o[e + 1] - t;
    for (f = f.filter((e) => e.r1 > t); p < a.length && a[p].r0 <= t; p++) f.push(a[p]);
    let r = Xh(f, u);
    if (r.length > 0 && Zh(r, m)) for (let e of h) e.height += n;
    else
      ((h = r.map((e) => ({ x: e.x0, y: t, width: e.x1 - e.x0, height: n, ...l(e.key) }))),
        d.push(...h));
    m = r;
  }
  return d;
}
var $h = 1e-12,
  eg = 1e-9;
function tg(e, t) {
  let n = $h * Math.abs(t.right - t.left),
    r = $h * Math.abs(t.top - t.bottom);
  return (
    Math.abs(e.left - t.left) <= n &&
    Math.abs(e.right - t.right) <= n &&
    Math.abs(e.bottom - t.bottom) <= r &&
    Math.abs(e.top - t.top) <= r
  );
}
var ng = (e, t) => Math.abs(e - t) <= eg * Math.max(Math.abs(e), Math.abs(t));
function rg(e, t) {
  let { viewport: n, size: r } = e,
    { viewport: i } = t;
  return (
    ng((n.right - n.left) / r.width, (i.right - i.left) / r.width) &&
    ng((n.top - n.bottom) / r.height, (i.top - i.bottom) / r.height)
  );
}
var ig = (e, t) => e.width === t.width && e.height === t.height;
function ag(e, t, n) {
  if (ig(t.size, n.size) && tg(n.viewport, t.viewport)) return e;
  if (!ig(t.size, n.size) || !rg(t, n)) return { ...e, spans: new Float32Array() };
  let { left: r, right: i, bottom: a, top: o } = t.viewport,
    s = [(r + i) / 2, (a + o) / 2],
    [c, l] = j(t, ...s),
    [u, d] = j(n, ...s),
    f = u - c,
    p = d - l,
    m = new Float32Array(e.spans.length);
  for (let t = 0; t + 3 < e.spans.length; t += 4)
    ((m[t] = e.spans[t] + p),
      (m[t + 1] = e.spans[t + 1] + p),
      (m[t + 2] = e.spans[t + 2] + f),
      (m[t + 3] = e.spans[t + 3] + f));
  return { ...e, spans: m };
}
var og = [`grid`, `curves`, `points`],
  sg = /^#[0-9a-f]{6}$/i,
  cg = (e, t) => e.spans === t.spans && e.color === t.color && e.fillAlpha === t.fillAlpha,
  lg = class {
    constructor(e) {
      ((this.shading = new Map()),
        (this.destroyed = !1),
        (this.canvases = og.map((t) => {
          let n = e.ownerDocument.createElement(`canvas`);
          return (
            (n.className = `kc-graph-canvas`),
            (n.dataset.layer = t),
            n.setAttribute(`aria-hidden`, `true`),
            e.append(n),
            n
          );
        })),
        (this.contexts = this.canvases.map(() => null)));
    }
    render(e) {
      if (this.destroyed) return;
      let { view: t, theme: n } = e,
        { width: r, height: i } = t.size;
      if (!(r > 0 && i > 0) || !sg.test(n.paper)) return;
      let a = Math.round(r * t.dpr),
        o = Math.round(i * t.dpr);
      if (!(a > 0 && o > 0)) return;
      for (let e of this.canvases)
        (e.width !== a && (e.width = a), e.height !== o && (e.height = o));
      let s = this.layerContexts();
      if (s === null) return;
      let [c, l, u] = s;
      (Gh(
        c,
        uh(t, e.grid, (e, t) => ((c.font = Hh(t)), c.measureText(e).width)),
        n,
        t
      ),
        kh(l, t, e.rows, this.shadingRects(e)),
        Ah(u, t, e.rows, n.paper),
        e.poi !== void 0 && e.poi.length > 0 && ph(u, t, n, e.poi),
        e.trace && mh(u, t, e.trace));
    }
    destroy() {
      if (!this.destroyed) {
        ((this.destroyed = !0), this.shading.clear());
        for (let e of this.canvases) ((e.width = 0), (e.height = 0), e.remove());
        this.contexts.fill(null);
      }
    }
    layerContexts() {
      return (
        this.canvases.forEach((e, t) => {
          this.contexts[t] ??= e.getContext(`2d`);
        }),
        this.contexts.every((e) => e !== null) ? this.contexts : null
      );
    }
    shadingRects({ view: e, rows: t }) {
      let { size: n, dpr: r } = e,
        i = new Map(),
        a = new Map();
      for (let { rowId: e, geometry: o, color: s, fillAlpha: c } of t) {
        if (o.kind !== `region`) continue;
        let t = { spans: o.spans, color: s, fillAlpha: c },
          l = this.shading.get(e),
          u =
            l !== void 0 &&
            l.width === n.width &&
            l.height === n.height &&
            l.dpr === r &&
            cg(l.region, t)
              ? l
              : { region: t, width: n.width, height: n.height, dpr: r, rects: Qh([t], n, r) };
        (i.set(e, u), a.set(e, u.rects));
      }
      return ((this.shading = i), a);
    }
  };
function ug(e) {
  let t = getComputedStyle(e),
    n = (e) => t.getPropertyValue(e).trim(),
    r = (e) => Object.fromEntries(Rl.map((t) => [t, e(t)]));
  return {
    paper: n(zl.paper),
    text: n(zl.text),
    axis: n(zl.axis),
    gridMajor: n(zl.gridMajor),
    gridMinor: n(zl.gridMinor),
    focusRing: n(zl.focusRing),
    curves: r((e) => n(Bl[e])),
    fillAlpha: r((e) => parseFloat(n(Vl[e]))),
  };
}
var dg = new Set([
  `curve-y`,
  `curve-x`,
  `implicit`,
  `vertical-lines`,
  `horizontal-lines`,
  `region`,
]);
function fg(e) {
  let t = Number(e.toPrecision(4));
  if (t === 0) return `0`;
  let n = Math.abs(t);
  if (n >= 1e-4 && n < 1e6) return String(t);
  let [r, i] = t.toExponential(3).split(`e`);
  return `${r.replace(/0+$/, ``).replace(/\.$/, ``)}×10^${String(Number(i))}`;
}
function pg(e, t) {
  if (dg.has(e.kind)) return !0;
  switch (e.kind) {
    case `point`:
      return (
        e.value?.type === `point` &&
        Number.isFinite(e.value.value[0]) &&
        Number.isFinite(e.value.value[1])
      );
    case `table`: {
      let n = t.get(e.id);
      return n?.kind === `table` && n.series.some((e) => e.coords.length > 0);
    }
    case `constant-relation`: {
      let n = t.get(e.id);
      return n?.kind === `region` && n.spans.length > 0;
    }
    case `function-definition`:
      return t.has(e.id);
    default:
      return !1;
  }
}
function mg(e, t) {
  let n = 0;
  for (let r of e) !r.hidden && r.error === null && r.chips.length === 0 && pg(r, t) && n++;
  return n;
}
function hg(e, t) {
  let n = fg,
    { left: r, right: i, bottom: a, top: o } = e;
  return `Graph from x=${n(r)} to ${n(i)}, y=${n(a)} to ${n(o)}, ${t} plot${t === 1 ? `` : `s`}`;
}
var gg = [0.1, 0.2, 1 / 3, 0.5, 0.7, 14 / 15, 1],
  _g = [`left`, `right`, `bottom`, `top`],
  vg = (e, t, n) => ({
    left: e.left + (t.left - e.left) * n,
    right: e.right + (t.right - e.right) * n,
    bottom: e.bottom + (t.bottom - e.bottom) * n,
    top: e.top + (t.top - e.top) * n,
  }),
  yg = (e, t) => _g.every((n) => e[n] === t[n]);
function bg(e) {
  let t = null,
    n = null,
    r = () => {
      (t !== null && cancelAnimationFrame(t), (t = null), (n = null));
    };
  return {
    cancel: r,
    target: () => n,
    run(i, a) {
      if ((r(), a)) {
        e.setMathBounds(i);
        return;
      }
      let o = e.getSnapshot().viewport;
      n = i;
      let s = 0,
        c = o,
        l = () => {
          if (((t = null), !yg(e.getSnapshot().viewport, c))) {
            n = null;
            return;
          }
          let r = gg[s++];
          ((c = r === 1 ? i : vg(o, i, r)),
            e.setMathBounds(c),
            r === 1 ? (n = null) : (t = requestAnimationFrame(l)));
        };
      t = requestAnimationFrame(l);
    },
  };
}
function xg(e) {
  for (let t of e.frames.splice(0)) cancelAnimationFrame(t);
  (e.timeout !== null && clearTimeout(e.timeout), (e.timeout = null));
}
function Sg(e, t) {
  let [n, r] = (0, h.useState)(e ? `present` : `absent`),
    i = (0, h.useRef)(n),
    a = (0, h.useRef)(t),
    o = (0, h.useRef)({ frames: [], timeout: null });
  return (
    (0, h.useLayoutEffect)(() => {
      a.current = t;
    }),
    (0, h.useLayoutEffect)(() => {
      let t = o.current,
        n = (e) => {
          ((i.current = e), r(e));
        },
        s = i.current;
      if (e) {
        if (s === `present` || s === `entering`) return;
        if ((xg(t), s === `leaving` || a.current() <= 0)) {
          n(`present`);
          return;
        }
        (n(`entering`),
          t.frames.push(
            requestAnimationFrame(() => {
              t.frames.push(
                requestAnimationFrame(() => {
                  ((t.frames.length = 0), n(`present`));
                })
              );
            })
          ));
      } else {
        if (s === `absent` || s === `leaving`) return;
        xg(t);
        let e = a.current();
        if (!(e > 0)) {
          n(`absent`);
          return;
        }
        (n(`leaving`),
          (t.timeout = setTimeout(() => {
            ((t.timeout = null), n(`absent`));
          }, e)));
      }
    }, [e]),
    (0, h.useEffect)(() => {
      let e = o.current;
      return () => xg(e);
    }, []),
    n
  );
}
function Cg(e) {
  let t = /^\s*(-?[\d.]+(?:e[+-]?\d+)?)(ms|s)\s*$/i.exec(e ?? ``);
  if (t === null) return NaN;
  let n = Number(t[1]);
  return t[2].toLowerCase() === `s` ? n * 1e3 : n;
}
function wg(e, t) {
  if (e || t === null) return 0;
  let n = getComputedStyle(t),
    r = (n.transitionProperty ?? ``).split(`,`).map((e) => e.trim()),
    i = (n.transitionDuration ?? ``).split(`,`),
    a = r.findIndex((e) => e === `opacity` || e === `all`);
  if (a < 0 || i.length === 0) return 0;
  let o = Cg(i[a % i.length]);
  return Number.isFinite(o) && o > 0 ? o : 0;
}
var J = r(),
  Tg = { className: `kc-glyph`, "aria-hidden": !0, focusable: !1 };
function Eg() {
  let e = `kc-wrench-jaw-${(0, h.useId)().replace(/[^\w-]/g, ``)}`;
  return (0, J.jsxs)(`svg`, {
    ...Tg,
    width: 16,
    height: 16,
    viewBox: `0 0 16 16`,
    children: [
      (0, J.jsx)(`clipPath`, {
        id: e,
        children: (0, J.jsx)(`path`, {
          clipRule: `evenodd`,
          d: `M0 0H16V16H0Z M12.1 5.61L17.3 2.61L15.9 0.19L10.7 3.19Z M2.55 13.9A0.65 0.65 0 1 0 1.25 13.9A0.65 0.65 0 1 0 2.55 13.9Z`,
        }),
      }),
      (0, J.jsxs)(`g`, {
        clipPath: `url(#${e})`,
        fill: `currentColor`,
        children: [
          (0, J.jsx)(`path`, {
            d: `M1.9 13.9L8.6 7.2`,
            stroke: `currentColor`,
            strokeWidth: `3.4`,
            strokeLinecap: `round`,
          }),
          (0, J.jsx)(`circle`, { cx: `11`, cy: `4.7`, r: `4.6` }),
        ],
      }),
    ],
  });
}
function Dg(e) {
  return (0, J.jsx)(`svg`, {
    ...Tg,
    width: 12,
    height: 12,
    viewBox: `0 0 12 12`,
    children: (0, J.jsx)(`path`, {
      d:
        e.out === !0
          ? `M0 4.85H12V7.15H0Z`
          : `M4.85 0H7.15V4.85H12V7.15H7.15V12H4.85V7.15H0V4.85H4.85Z`,
      fill: `currentColor`,
    }),
  });
}
function Og() {
  return (0, J.jsxs)(`svg`, {
    ...Tg,
    width: 16,
    height: 16,
    viewBox: `0 0 16 16`,
    children: [
      (0, J.jsx)(`path`, {
        d: `M0.6 8.4L8 1.9L15.4 8.4`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: `1.5`,
        strokeLinejoin: `miter`,
      }),
      (0, J.jsx)(`path`, { d: `M11.2 1.9H13V5.6L11.2 4Z`, fill: `currentColor` }),
      (0, J.jsx)(`path`, {
        d: `M2.6 8.7L8 4L13.4 8.7V14H9.2V10.4H6.8V14H2.6Z`,
        fill: `currentColor`,
      }),
    ],
  });
}
var kg = {
    group: `Graph controls`,
    settings: `Graph settings`,
    zoomIn: `Zoom in`,
    zoomOut: `Zoom out`,
    home: `Home`,
  },
  Ag = 10,
  jg = 10,
  Mg = 42.27,
  Ng = [`ne`, `nw`, `se`, `sw`];
function Pg(e) {
  return { width: jg + Ag * e.length, height: Mg };
}
var Fg = (e, t) =>
  e.left < t.left + t.width &&
  t.left < e.left + e.width &&
  e.top < t.top + t.height &&
  t.top < e.top + e.height;
function Ig(e, t, n, r) {
  return {
    left: n.endsWith(`e`) ? e + 5 : e - 5 - r.width,
    top: n.startsWith(`n`) ? t - 5 - r.height : t + 5,
    ...r,
  };
}
function Lg(e, t, n) {
  let r = [];
  return e.map(({ x: e, y: i, text: a }) => {
    let o = Pg(a),
      s = null;
    for (let a of Ng) {
      let c = Ig(e, i, a, o),
        l =
          (c.left < 0 || c.top < 0 || c.left + c.width > n.width || c.top + c.height > n.height
            ? 1e3
            : 0) +
          r.filter((e) => Fg(e, c)).length * 100;
      for (let [e, n] of t)
        e >= c.left && e <= c.left + c.width && n >= c.top && n <= c.top + c.height && (l += 1);
      (s === null || l < s.score) && (s = { box: c, q: a, score: l });
    }
    return (r.push(s.box), { left: s.box.left, top: s.box.top, quadrant: s.q });
  });
}
function Rg({ labels: e, curve: t, size: n, trace: r = null }) {
  if (e.length === 0 && r === null) return null;
  let i = r === null ? e : [...e, r],
    a = Lg(i, t, n);
  return (0, J.jsx)(`div`, {
    className: `kc-poi-overlay`,
    "data-poi-overlay": ``,
    children: i.map((e, t) => {
      let n = r !== null && t === i.length - 1;
      return (0, J.jsx)(
        `div`,
        {
          className: `kc-poi-label`,
          role: `note`,
          "data-poi-label": n ? void 0 : ``,
          "data-trace-label": n ? `` : void 0,
          "data-quadrant": a[t].quadrant,
          style: { left: a[t].left, top: a[t].top },
          children: e.text,
        },
        n ? `trace` : `${e.text}@${Math.round(e.x)},${Math.round(e.y)}`
      );
    }),
  });
}
function zg(e) {
  return JSON.stringify([e.kind, e.hidden, e.latex]);
}
var Bg = (e, t) => e !== void 0 && e.error === null && zg(e) === t;
function Vg(e, t) {
  let n = new Map(t.rows.map((e) => [e.id, e])),
    r = null;
  for (let [t, i] of e) Bg(n.get(t), i.key) || (r ??= new Map(e)).delete(t);
  if (t.view !== null) {
    let i = { viewport: t.viewport, size: t.view.size, dpr: t.view.dpr };
    for (let [a, o] of t.geometry) {
      let t = n.get(a);
      o.kind === `region` &&
        t !== void 0 &&
        t.error === null &&
        (r ?? e).get(a)?.geometry !== o &&
        (r ??= new Map(e)).set(a, { key: zg(t), geometry: o, source: i });
    }
  }
  return r ?? e;
}
function Hg(e, t) {
  let n = null;
  for (let [r, i] of t) e.geometry.has(r) || (n ??= new Map(e.geometry)).set(r, i.geometry);
  return n ?? e.geometry;
}
function Ug(e, t, n, r) {
  let i = [];
  for (let a of e.rows) {
    if (a.hidden) continue;
    let o = r.get(a.id),
      s = e.geometry.get(a.id) ?? o?.geometry;
    if (s === void 0) continue;
    let c = s.kind === `region` ? ag(s, o?.source ?? n, n) : s;
    if (c.kind === `table`) {
      i.push(...Wg(a, c, t, a.id === e.selectedRowId));
      continue;
    }
    let { hex: l, fillAlpha: u } = ql(a.color, t);
    i.push({
      rowId: a.id,
      color: l,
      fillAlpha: u,
      geometry: c,
      selected: a.id === e.selectedRowId,
    });
  }
  return i;
}
function Wg(e, t, n, r) {
  let i = [];
  for (let { column: a, coords: o } of t.series) {
    let t = e.columns?.[a];
    if (t === void 0) continue;
    let { hex: s, fillAlpha: c } = ql(t.color, n);
    (t.lines === !0 &&
      i.push({
        rowId: e.id,
        color: s,
        fillAlpha: c,
        selected: r,
        geometry: {
          kind: `curve`,
          rowId: e.id,
          evaluations: 0,
          polylines: o,
          bands: new Float64Array(),
          dashed: t.lineStyle === `dashed`,
        },
        lineStyle: t.lineStyle,
      }),
      i.push({
        rowId: e.id,
        color: s,
        fillAlpha: c,
        selected: r,
        geometry: { kind: `points`, rowId: e.id, evaluations: 0, coords: o },
        pointStyle: t.pointStyle,
      }));
  }
  return i;
}
function Gg(e) {
  (e.current !== null && clearTimeout(e.current), (e.current = null));
}
function Kg(e, t, n = {}) {
  let { maxWaitMs: r } = n,
    [i, a] = (0, h.useState)(e),
    o = (0, h.useRef)(e),
    s = (0, h.useRef)(e),
    c = (0, h.useRef)(null),
    l = (0, h.useRef)(null);
  return (
    (0, h.useEffect)(() => {
      if (((s.current = e), Gg(c), Object.is(e, o.current))) {
        Gg(l);
        return;
      }
      let n = () => {
        (Gg(c), Gg(l));
        let e = s.current;
        ((o.current = e), a(() => e));
      };
      ((c.current = setTimeout(n, t)),
        r !== void 0 && l.current === null && (l.current = setTimeout(n, r)));
    }, [e, t, r]),
    (0, h.useEffect)(
      () => () => {
        (Gg(c), Gg(l));
      },
      []
    ),
    i
  );
}
var qg = (e) => ({ x: (e.left + e.right) / 2, y: (e.bottom + e.top) / 2 });
function Jg(e, t) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return null;
  let n = t.viewport,
    r = v * (n.right - n.left),
    i = v * (n.top - n.bottom);
  switch (e.key) {
    case `ArrowRight`:
      return te(n, r, 0);
    case `ArrowLeft`:
      return te(n, -r, 0);
    case `ArrowUp`:
      return te(n, 0, i);
    case `ArrowDown`:
      return te(n, 0, -i);
    case `+`:
    case `=`:
      return ee(n, _, qg(n));
    case `-`:
      return ee(n, 1 / _, qg(n));
    case `Home`:
      return O(t.size);
    default:
      return null;
  }
}
function Yg(e, t, n) {
  let { viewport: r, size: i } = e;
  return te(r, (-t * (r.right - r.left)) / i.width, (n * (r.top - r.bottom)) / i.height);
}
function Xg(e, t, n) {
  let r = t.distance < 1 ? 1 : n.distance / t.distance;
  if (!Number.isFinite(r)) return e.viewport;
  let [i, a] = re(e, ...t.mid),
    o = ee(e.viewport, r, { x: i, y: a });
  return Yg({ ...e, viewport: o }, n.mid[0] - t.mid[0], n.mid[1] - t.mid[1]);
}
function Zg(e, t, n) {
  if (!(t !== 0 && Number.isFinite(t))) return e.viewport;
  let [r, i] = re(e, ...n),
    a = t < 0 ? Dm : 1 / Dm;
  return ee(e.viewport, a, { x: r, y: i });
}
function Qg(e, t, n) {
  return k(e, t ?? rd) ? O(n) : t === null ? e : ne(e, t, n);
}
var $g = (e) => (e.pointerType === `mouse` ? `fine` : `coarse`),
  e_ = (e, t) => ({
    mid: [(e[0] + t[0]) / 2, (e[1] + t[1]) / 2],
    distance: Math.hypot(t[0] - e[0], t[1] - e[1]),
  });
function t_(e) {
  let { panel: t, surface: n, engine: r, size: i, interaction: a } = e,
    o = (0, h.useRef)({
      pending: null,
      frame: null,
      wheeled: !1,
      pointers: new Map(),
      gesture: null,
      press: null,
    }),
    s = (0, h.useRef)({ engine: r, size: i, interaction: a });
  (0, h.useLayoutEffect)(() => {
    s.current = { engine: r, size: i, interaction: a };
  });
  let c = (0, h.useCallback)(() => {
      let { engine: e, size: t } = s.current;
      return t === null ? null : { viewport: o.current.pending ?? e.getSnapshot().viewport, ...t };
    }, []),
    l = (0, h.useCallback)(() => {
      let e = o.current;
      (e.frame !== null && cancelAnimationFrame(e.frame),
        (e.frame = null),
        (e.pending = null),
        (e.wheeled = !1));
    }, []),
    u = (0, h.useCallback)((e) => {
      let t = o.current,
        n = [...t.pointers.keys()];
      if (n.length >= 2) {
        let r = [n[0], n[1]];
        t.gesture = {
          kind: `pinch`,
          ids: r,
          start: e,
          from: e_(t.pointers.get(r[0]), t.pointers.get(r[1])),
        };
      } else
        t.gesture =
          n.length === 1 ? { kind: `drag`, id: n[0], start: e, at: t.pointers.get(n[0]) } : null;
    }, []),
    d = (0, h.useCallback)(
      (e) => {
        let t = c();
        if (t === null) return !1;
        let n = e(t);
        return (
          n !== null &&
          (l(),
          s.current.interaction?.viewChanged(),
          s.current.engine.setMathBounds(n),
          o.current.gesture !== null && u({ ...t, viewport: n }),
          !0)
        );
      },
      [u, l, c]
    ),
    f = (0, h.useCallback)(
      (e) => {
        d((t) => Jg(e.nativeEvent, t)) && e.preventDefault();
      },
      [d]
    );
  return (
    (0, h.useEffect)(() => {
      let e = t.current;
      if (e === null) return;
      let r = o.current,
        i = (e) => {
          ((r.pending = e),
            r.frame === null &&
              (r.frame = requestAnimationFrame(() => {
                let e = r.pending;
                ((r.frame = null),
                  (r.pending = null),
                  (r.wheeled = !1),
                  e !== null && s.current.engine.setMathBounds(e));
              })));
        },
        a = (t) => {
          let n = e.getBoundingClientRect();
          return [t.clientX - n.left, t.clientY - n.top];
        },
        d = (t) => {
          let i = c();
          if (
            i === null ||
            (t.target instanceof Element && t.target.closest(`.kc-graph-controls`) !== null) ||
            t.button !== 0
          )
            return;
          n.current?.focus({ preventScroll: !0 });
          try {
            e.setPointerCapture(t.pointerId);
          } catch {}
          let o = a(t),
            l = $g(t),
            d = s.current.interaction;
          if ((r.pointers.set(t.pointerId, o), r.pointers.size === 1)) {
            let e = d?.claim?.(o, l) === !0;
            if (((r.press = { id: t.pointerId, at: o, pointer: l, moved: !1, claimed: e }), e)) {
              r.gesture = null;
              return;
            }
          } else
            r.press !== null &&
              (r.press.claimed && d?.release?.(),
              (r.press = { ...r.press, moved: !0, claimed: !1 }),
              d?.viewChanged());
          (n.current !== null && (n.current.dataset.dragging = ``), u(i));
        },
        f = (e) => {
          if (s.current.size === null || !r.pointers.has(e.pointerId)) return;
          let t = a(e);
          r.pointers.set(e.pointerId, t);
          let n = r.press;
          if (n !== null && n.id === e.pointerId) {
            if (!n.moved) {
              if (Math.hypot(t[0] - n.at[0], t[1] - n.at[1]) < 4) return;
              ((n.moved = !0), n.claimed || s.current.interaction?.viewChanged());
            }
            if (n.claimed) {
              s.current.interaction?.move?.(t);
              return;
            }
          }
          let o = r.gesture;
          if (o?.kind === `drag` && o.id === e.pointerId) {
            let e = r.pointers.get(o.id);
            i(Yg(o.start, e[0] - o.at[0], e[1] - o.at[1]));
          } else if (o?.kind === `pinch` && o.ids.includes(e.pointerId)) {
            let e = e_(r.pointers.get(o.ids[0]), r.pointers.get(o.ids[1]));
            i(Xg(o.start, o.from, e));
          }
        },
        p = (e) => {
          if (s.current.size === null || !r.pointers.delete(e.pointerId)) return;
          let t = r.press;
          if (t !== null && t.id === e.pointerId) {
            r.press = null;
            let n = s.current.interaction;
            t.claimed && t.moved
              ? n?.release?.()
              : !t.moved && e.type === `pointerup` && n?.click(t.at, t.pointer);
          }
          let i = c();
          (i !== null && u(i),
            r.pointers.size === 0 && n.current !== null && delete n.current.dataset.dragging);
        },
        m = (e) => {
          let t = c();
          t !== null &&
            (e.preventDefault(),
            !(r.wheeled || e.deltaY === 0) &&
              (s.current.interaction?.viewChanged(), i(Zg(t, e.deltaY, a(e))), (r.wheeled = !0)));
        };
      return (
        e.addEventListener(`pointerdown`, d),
        e.addEventListener(`pointermove`, f),
        e.addEventListener(`pointerup`, p),
        e.addEventListener(`pointercancel`, p),
        e.addEventListener(`lostpointercapture`, p),
        e.addEventListener(`wheel`, m, { passive: !1 }),
        () => {
          (e.removeEventListener(`pointerdown`, d),
            e.removeEventListener(`pointermove`, f),
            e.removeEventListener(`pointerup`, p),
            e.removeEventListener(`pointercancel`, p),
            e.removeEventListener(`lostpointercapture`, p),
            e.removeEventListener(`wheel`, m),
            l(),
            r.pointers.clear(),
            (r.gesture = null),
            (r.press = null));
        }
      );
    }, [t, n, u, l, c]),
    { onKeyDown: f, applyNow: d }
  );
}
var n_ = () => window.devicePixelRatio || 1,
  r_ = (e, t, n) => e.size.width === t.width && e.size.height === t.height && e.dpr === n;
function i_(e, t) {
  let [n, r] = (0, h.useState)(null),
    i = (0, h.useRef)(null);
  return (
    (0, h.useEffect)(() => {
      let n = e.current;
      if (n === null) return;
      i.current = null;
      let a = null,
        o = n_(),
        s = () => {
          let e = i.current;
          if (a === null || (e !== null && r_(e, a, o))) return;
          let n = { size: a, dpr: o },
            s = Qg(t.getSnapshot().viewport, e?.size ?? null, a);
          ((i.current = n), t.setView({ viewport: s, size: a, dpr: o }), r(n));
        },
        c = new ResizeObserver((e) => {
          let t = e[e.length - 1]?.contentRect;
          t !== void 0 &&
            t.width > 0 &&
            t.height > 0 &&
            ((a = { width: t.width, height: t.height }), s());
        });
      c.observe(n);
      let l = null,
        u = () => {
          ((o = n_()), d(), s());
        },
        d = () => {
          (l?.removeEventListener(`change`, u),
            (l = window.matchMedia(`(resolution: ${o}dppx)`)),
            l.addEventListener(`change`, u));
        };
      return (
        d(),
        () => {
          (c.disconnect(), l?.removeEventListener(`change`, u));
        }
      );
    }, [e, t]),
    n
  );
}
var a_ = Object.freeze({ fine: 12, coarse: 14 }),
  o_ = Object.freeze({ fine: 8, coarse: 16 });
function s_(e, t, n, r) {
  let i = null,
    a = a_[r];
  return (
    e.forEach((e, r) => {
      let [o, s] = j(t, e.x, e.y),
        c = Math.hypot(o - n[0], s - n[1]);
      c <= a && ((i = r), (a = c));
    }),
    i
  );
}
function c_(e, t, n) {
  let r = n[0] - t[0],
    i = n[1] - t[1],
    a = r * r + i * i,
    o = a === 0 ? 0 : Math.max(0, Math.min(1, ((e[0] - t[0]) * r + (e[1] - t[1]) * i) / a));
  return Math.hypot(e[0] - (t[0] + o * r), e[1] - (t[1] + o * i));
}
function l_(e, t, n) {
  let r = e.polylines,
    i = 1 / 0,
    a = null;
  for (let e = 0; e + 1 < r.length; e += 2) {
    if (!Number.isFinite(r[e]) || !Number.isFinite(r[e + 1])) {
      a = null;
      continue;
    }
    let o = j(t, r[e], r[e + 1]);
    ((i = Math.min(i, a === null ? Math.hypot(o[0] - n[0], o[1] - n[1]) : c_(n, a, o))), (a = o));
  }
  return i;
}
function u_(e, t, n) {
  let r = 1 / 0;
  for (let i of e.positions) {
    let [a, o] = j(t, i, i);
    r = Math.min(r, Math.abs(e.orientation === `vertical` ? a - n[0] : o - n[1]));
  }
  return r;
}
function d_(e, t, n) {
  switch (e.kind) {
    case `curve`:
      return l_(e, t, n);
    case `lines`:
      return u_(e, t, n);
    case `region`:
      return Math.min(1 / 0, ...e.boundaries.map((e) => d_(e, t, n)));
    case `points`: {
      let r = 1 / 0;
      for (let i = 0; i + 1 < e.coords.length; i += 2) {
        let [a, o] = j(t, e.coords[i], e.coords[i + 1]);
        r = Math.min(r, Math.hypot(a - n[0], o - n[1]));
      }
      return r;
    }
    default:
      return 1 / 0;
  }
}
function f_(e, t, n, r) {
  let i = null,
    a = o_[r];
  for (let r of e) {
    let e = d_(r.geometry, t, n);
    e <= a && ((i = r.rowId), (a = e));
  }
  return i;
}
var p_ = Object.freeze({ rowId: null, open: Object.freeze([]) }),
  m_ = (e, t) =>
    Math.abs(e.x - t.x) <= 1e-9 * Math.max(1, Math.abs(e.x)) &&
    Math.abs(e.y - t.y) <= 1e-9 * Math.max(1, Math.abs(e.y)),
  h_ = (e) => (e === null ? p_ : { rowId: e, open: [] });
function g_(e, t) {
  switch (t.type) {
    case `click-poi`: {
      if (t.rowId !== e.rowId) return h_(t.rowId);
      let n = e.open.some((e) => m_(e, t.point))
        ? e.open.filter((e) => !m_(e, t.point))
        : [...e.open, t.point];
      return { rowId: e.rowId, open: n };
    }
    case `click-curve`:
      return t.rowId === e.rowId ? e : h_(t.rowId);
    case `click-empty`:
      return p_;
    case `view-changed`:
    case `row-edited`:
    case `escape`:
      return e.open.length === 0 ? e : h_(e.rowId);
    case `row-focused`:
      return h_(t.rowId);
    case `show`:
      return { rowId: t.rowId, open: [t.point] };
    case `selection`:
      return t.rowId === e.rowId ? e : h_(t.rowId);
    case `poi-updated`: {
      if (t.rowId !== e.rowId) return e;
      let n = e.open.filter((e) => t.points.some((t) => m_(e, t)));
      return n.length === e.open.length ? e : { rowId: e.rowId, open: n };
    }
  }
}
var __ = Object.freeze([]);
function v_(e) {
  return e.poi !== null && e.poi.rowId === e.selectedRowId ? e.poi.points : __;
}
function y_(e, t) {
  let n = t.rowId === e.selectedRowId ? t.open : [];
  return v_(e).map(({ x: e, y: t }) => ({
    x: e,
    y: t,
    open: n.some((n) => n.x === e && n.y === t),
  }));
}
function b_(e, t, n) {
  return t.rowId === e.selectedRowId
    ? t.open.map((e) => {
        let [t, r] = j(n, e.x, e.y);
        return { x: t, y: r, text: Kp(e, n) };
      })
    : [];
}
function x_(e, t) {
  let [n, r] = (0, h.useReducer)(g_, p_),
    i = (0, h.useContext)(Dp),
    a = (0, h.useContext)(hp),
    o = (0, h.useRef)(-1);
  (0, h.useEffect)(() => r({ type: `selection`, rowId: e.selectedRowId }), [e.selectedRowId]);
  let s = (0, h.useRef)(e.revision);
  ((0, h.useEffect)(() => {
    s.current !== e.revision && ((s.current = e.revision), r({ type: `row-edited` }));
  }, [e.revision]),
    (0, h.useEffect)(() => {
      e.focusedRowId !== null && r({ type: `row-focused`, rowId: e.focusedRowId });
    }, [e.focusedRowId]));
  let c = v_(e);
  (0, h.useEffect)(() => {
    e.selectedRowId !== null && r({ type: `poi-updated`, rowId: e.selectedRowId, points: c });
  }, [c, e.selectedRowId]);
  let l = n.open.length > 0;
  return (
    (0, h.useEffect)(() => {
      if (l && i !== null) return i.push({ id: `poi-labels`, close: () => r({ type: `escape` }) });
    }, [l, i]),
    {
      labels: n,
      click: (0, h.useCallback)(
        (e, n, i, a) => {
          let o = t.getSnapshot(),
            s = v_(o),
            c = s_(s, i, e, n);
          if (c !== null && o.selectedRowId !== null) {
            r({ type: `click-poi`, rowId: o.selectedRowId, point: s[c] });
            return;
          }
          let l = f_(a, i, e, n);
          l === null
            ? (r({ type: `click-empty` }), t.setSelectedRow(null))
            : (r({ type: `click-curve`, rowId: l }), t.setSelectedRow(l));
        },
        [t]
      ),
      viewChanged: (0, h.useCallback)(() => r({ type: `view-changed` }), []),
      step: (0, h.useCallback)(
        (e, n) => {
          let i = t.getSnapshot(),
            s = v_(i);
          if (s.length === 0 || i.selectedRowId === null) return !1;
          let c = o.current + e;
          o.current = c < 0 ? s.length - 1 : c >= s.length ? 0 : c;
          let l = s[o.current];
          r({ type: `show`, rowId: i.selectedRowId, point: l });
          let u = new Map(i.rows.map((e, t) => [e.id, t + 1]));
          return (a?.announce(tm(l, u, n)), !0);
        },
        [t, a]
      ),
    }
  );
}
var S_ = Number.isFinite;
function C_(e, t, n) {
  if (n === `x`) return qp(e, t);
  let { viewport: r, size: i } = t;
  return qp(e, {
    ...t,
    viewport: { left: r.bottom, right: r.top, bottom: r.left, top: r.right },
    size: { width: i.height, height: i.width },
  });
}
function w_(e, t, n) {
  let r =
      e.kind === `curve`
        ? [e.polylines]
        : e.kind === `region`
          ? e.boundaries.flatMap((e) => (e.kind === `curve` ? [e.polylines] : []))
          : [],
    i = null,
    a = 1 / 0;
  for (let e of r)
    for (let r = 0; r + 1 < e.length; r += 2) {
      if (!S_(e[r]) || !S_(e[r + 1])) continue;
      let [o, s] = j(t, e[r], e[r + 1]),
        c = Math.hypot(o - n[0], s - n[1]);
      c < a && ((a = c), (i = [e[r], e[r + 1]]));
    }
  return i;
}
function T_(e, t, n, r, i) {
  let [a, o] = re(t, n[0], n[1]),
    s = null,
    c = e.curve;
  if (c !== null && c.kind === `explicit`) {
    let e = c.independent === `x`,
      n = C_(e ? a : o, t, e ? `x` : `y`),
      r = c.f(n);
    S_(r) && (s = e ? { x: n, y: r } : { x: r, y: n });
  } else if (c !== null && c.kind === `lines` && e.geometry?.kind === `lines`) {
    let n = c.orientation === `vertical`,
      r = null;
    for (let t of e.geometry.positions) {
      let e = Math.abs(t - (n ? a : o));
      (r === null || e < Math.abs(r - (n ? a : o))) && (r = t);
    }
    r !== null && (s = n ? { x: r, y: C_(o, t, `y`) } : { x: C_(a, t, `x`), y: r });
  } else if (e.geometry !== null) {
    let r = w_(e.geometry, t, n);
    r !== null && (s = { x: r[0], y: r[1] });
  }
  if (s === null) return null;
  if (i === `fine`) {
    let [e, i] = j(t, s.x, s.y),
      a = r.find((r) => {
        let [a, o] = j(t, r.x, r.y);
        return Math.min(Math.hypot(a - e, o - i), Math.hypot(a - n[0], o - n[1])) <= 3;
      });
    if (a !== void 0) return { x: a.x, y: a.y, label: Kp(a, t) };
  }
  return { ...s, label: Jp(s.x, s.y, t) };
}
function E_(e) {
  let [t, n] = (0, h.useState)(null),
    r = (0, h.useRef)(null);
  return {
    trace: t,
    claim: (0, h.useCallback)(
      (t, n, i, a) => {
        let o = f_(a, i, t, n);
        if (o === null) return !1;
        let s = a.find((e) => e.rowId === o);
        return (
          (r.current = {
            rowId: o,
            pointer: n,
            color: s.color,
            source: { curve: e.poiCurves(o)[0] ?? null, geometry: s.geometry },
          }),
          !0
        );
      },
      [e]
    ),
    move: (0, h.useCallback)(
      (t, i) => {
        let a = r.current;
        if (a === null) return;
        e.getSnapshot().selectedRowId !== a.rowId && e.setSelectedRow(a.rowId);
        let o = e.getSnapshot(),
          s = o.selectedRowId === a.rowId ? v_(o) : [],
          c = T_(a.source, i, t, s, a.pointer);
        if (c === null) return;
        let [l, u] = j(i, c.x, c.y);
        n({ x: l, y: u, wx: c.x, wy: c.y, text: c.label, color: a.color });
      },
      [e]
    ),
    release: (0, h.useCallback)(() => {
      ((r.current = null), n(null));
    }, []),
  };
}
var D_ = new Map();
function O_(e) {
  (e.current !== null && cancelAnimationFrame(e.current), (e.current = null));
}
function k_(e, t, n) {
  let r = (0, h.useRef)(null),
    i = (0, h.useRef)(null),
    a = (0, h.useRef)(t);
  ((0, h.useLayoutEffect)(() => {
    a.current = t;
  }),
    (0, h.useLayoutEffect)(() => {
      let t = e.current;
      if (t === null) return;
      let n = new lg(t);
      return (
        (r.current = n),
        () => {
          (O_(i), (r.current = null), n.destroy());
        }
      );
    }, [e]));
  let { snapshot: o, skin: s, size: c, labels: l, trace: u } = t;
  (0, h.useEffect)(() => {
    c !== null &&
      i.current === null &&
      (i.current = requestAnimationFrame(() => {
        i.current = null;
        let t = e.current,
          { snapshot: n, skin: o, cache: s, size: c, host: l, labels: u, trace: d } = a.current;
        if (r.current === null || t === null || c === null) return;
        let f = { viewport: n.viewport, size: c.size, dpr: c.dpr };
        (r.current.render({
          view: f,
          grid: Lm(n.settings),
          rows: Ug(n, o, f, s),
          theme: ug(l),
          poi: y_(n, u),
          trace: d === null ? null : { x: d.wx, y: d.wy, color: d.color },
        }),
          (t.dataset.renderedRevision = String(n.revision)));
      }));
  }, [e, o, s, n, c, l, u]);
}
function A_(e, t) {
  e !== null && e.getRootNode().activeElement === e && t.current?.focus({ preventScroll: !0 });
}
function j_({ phase: e, homeRef: t, surface: n, onActivate: r }) {
  ((0, h.useLayoutEffect)(() => {
    e === `leaving` && A_(t.current, n);
  }, [e, t, n]),
    (0, h.useLayoutEffect)(() => {
      let e = t.current;
      return () => A_(e, n);
    }, [t, n]));
  let i = e === `leaving`;
  return (0, J.jsx)(`button`, {
    ref: t,
    type: `button`,
    "aria-label": kg.home,
    title: kg.home,
    "data-graph-home": ``,
    "data-phase": e,
    tabIndex: i ? -1 : void 0,
    "aria-hidden": i ? `true` : void 0,
    onClick: r,
    children: (0, J.jsx)(Og, {}),
  });
}
function M_(e, t) {
  let n = e.selectedRowId === null ? void 0 : e.geometry.get(e.selectedRowId);
  if (n === void 0 || n.kind !== `curve`) return [];
  let r = [];
  for (let e = 0; e + 1 < n.polylines.length; e += 8)
    Number.isFinite(n.polylines[e]) && r.push(j(t, n.polylines[e], n.polylines[e + 1]));
  return r;
}
var N_ = () => () => void 0;
function P_(e) {
  let t = (0, h.useMemo)(() => bg(e), [e]);
  return ((0, h.useEffect)(() => () => t.cancel(), [t]), t);
}
function F_(e, t, n, r) {
  let i = e?.state ?? null;
  if (i === null || n === null) return null;
  let a = t.poi?.rowId === i.rowId ? t.poi.points.find((e) => e.x === i.x && e.y === i.y) : void 0,
    [o, s] = j(n, i.x, i.y),
    c = a === void 0 ? Jp(i.x, i.y, n) : Kp(a, n),
    l = r.find((e) => e.rowId === i.rowId);
  return l === void 0 ? null : { x: o, y: s, wx: i.x, wy: i.y, text: c, color: l.color };
}
function I_(e) {
  let { host: t, themeRevision: n, reducedMotion: r, settingsOpen: i, onOpenSettings: a } = e,
    o = om(),
    s = am(o),
    c = Pp(),
    l = (0, h.useRef)(null),
    u = (0, h.useRef)(null),
    d = (0, h.useRef)(null),
    f = (0, h.useRef)(null),
    p = i_(u, o),
    m = x_(s, o),
    g = E_(o),
    _ = (0, h.useContext)(rm);
  (0, h.useSyncExternalStore)(_ === null ? N_ : (e) => _.subscribe(e), () => _?.state ?? null);
  let v = (0, h.useRef)({ snapshot: s, skin: c, size: p, cache: D_ }),
    y = () => {
      let { snapshot: e, skin: t, size: n, cache: r } = v.current;
      if (n === null) return null;
      let i = { viewport: e.viewport, size: n.size, dpr: n.dpr };
      return { view: i, rows: Ug(e, t, i, r) };
    },
    b = t_({
      panel: l,
      surface: d,
      engine: o,
      size: p,
      interaction: {
        claim(e, t) {
          let n = y();
          return n !== null && g.claim(e, t, n.view, n.rows);
        },
        move(e) {
          let t = y();
          t !== null && g.move(e, t.view);
        },
        release: g.release,
        click(e, t) {
          let n = y();
          n !== null && m.click(e, t, n.view, n.rows);
        },
        viewChanged: m.viewChanged,
      },
    }),
    x = (0, h.useRef)({ snapshot: null, cache: D_ });
  x.current.snapshot !== s && (x.current = { snapshot: s, cache: Vg(x.current.cache, s) });
  let { cache: S } = x.current;
  (0, h.useLayoutEffect)(() => {
    v.current = { snapshot: s, skin: c, size: p, cache: S };
  });
  let C = p === null ? null : { viewport: s.viewport, size: p.size, dpr: p.dpr },
    w = mg(s.rows, Hg(s, S)),
    T = Kg(hg(s.viewport, w), 250, { maxWaitMs: 400 }),
    E = g.trace ?? F_(_, s, C, C === null ? [] : Ug(s, c, C, S));
  k_(u, { snapshot: s, skin: c, cache: S, size: p, host: t, labels: m.labels, trace: E }, n);
  let D = (e) => {
      (e.key === `[` || e.key === `]`) && C !== null
        ? m.step(e.key === `]` ? 1 : -1, C) && e.preventDefault()
        : b.onKeyDown(e);
    },
    A = Sg(p !== null && !k(s.viewport, p.size), () =>
      f.current === null ? +!r : wg(r, f.current)
    ),
    te = P_(o),
    ne = (e) => {
      b.applyNow((t) => {
        let n = e({ ...t, viewport: te.target() ?? t.viewport });
        return r ? n : (m.viewChanged(), te.run(n, !1), null);
      });
    },
    j = (e) =>
      ne((t) => {
        let { left: n, right: r, bottom: i, top: a } = t.viewport;
        return ee(t.viewport, e, { x: (n + r) / 2, y: (i + a) / 2 });
      });
  return (0, J.jsxs)(`div`, {
    ref: l,
    className: `kc-graph`,
    "data-graph-panel": ``,
    children: [
      (0, J.jsx)(`div`, {
        ref: u,
        className: `kc-graph-layers`,
        "data-graph-layers": ``,
        "aria-hidden": `true`,
      }),
      (0, J.jsx)(`div`, {
        ref: d,
        className: `kc-graph-surface`,
        role: `img`,
        "aria-label": T,
        tabIndex: 0,
        onKeyDown: D,
      }),
      C !== null &&
        (0, J.jsx)(Rg, { labels: b_(s, m.labels, C), curve: M_(s, C), size: C.size, trace: E }),
      (0, J.jsxs)(`div`, {
        className: `kc-graph-controls`,
        role: `group`,
        "aria-label": kg.group,
        children: [
          (0, J.jsx)(`button`, {
            type: `button`,
            "aria-label": kg.settings,
            title: kg.settings,
            "aria-haspopup": `dialog`,
            "aria-expanded": i,
            onClick: (e) => a(e.currentTarget),
            children: (0, J.jsx)(Eg, {}),
          }),
          (0, J.jsxs)(`div`, {
            className: `kc-zoom-group`,
            role: `group`,
            "aria-label": `Zoom`,
            children: [
              (0, J.jsx)(`button`, {
                type: `button`,
                "aria-label": kg.zoomIn,
                title: kg.zoomIn,
                onClick: () => j(2),
                children: (0, J.jsx)(Dg, {}),
              }),
              (0, J.jsx)(`button`, {
                type: `button`,
                "aria-label": kg.zoomOut,
                title: kg.zoomOut,
                onClick: () => j(1 / 2),
                children: (0, J.jsx)(Dg, { out: !0 }),
              }),
            ],
          }),
          A !== `absent` &&
            (0, J.jsx)(j_, {
              phase: A,
              homeRef: f,
              surface: d,
              onActivate: () => {
                (d.current?.focus({ preventScroll: !0 }), ne((e) => O(e.size)));
              },
            }),
        ],
      }),
    ],
  });
}
function L_(e) {
  return (0, J.jsx)(`svg`, {
    className: e.className ?? `kc-glyph`,
    width: e.size,
    height: e.size,
    viewBox: `0 0 24 24`,
    overflow: e.overflow === !0 ? `visible` : void 0,
    "aria-hidden": `true`,
    focusable: `false`,
    children: e.children,
  });
}
function R_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 17.6,
    overflow: !0,
    children: (0, J.jsx)(`path`, {
      d: `M12.34 3.4V21.3M3.4 12.34H21.3`,
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: 5.28,
      strokeLinecap: `round`,
    }),
  });
}
function z_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 21.12,
    children: (0, J.jsxs)(`g`, {
      transform: e.redo === !0 ? `matrix(-1 0 0 1 24 0)` : void 0,
      children: [
        (0, J.jsx)(`path`, { d: `M0.5 6.5V17.5H11.5Z`, fill: `currentColor` }),
        (0, J.jsx)(`path`, {
          d: `M5 13A11 11 0 0 1 23 10`,
          fill: `none`,
          stroke: `currentColor`,
          strokeWidth: 3.8,
        }),
      ],
    }),
  });
}
function B_() {
  let e = 0.2,
    t = (e, t) => `${(12 + e * Math.cos(t)).toFixed(2)} ${(12 + e * Math.sin(t)).toFixed(2)}`,
    n = [];
  for (let r = 0; r < 8; r++) {
    let i = (r * 2 * Math.PI) / 8,
      a = (12 / 9) * e * 1.05;
    n.push(
      `${r === 0 ? `M` : `L`}${t(9, i - a)}`,
      `L${t(12, i - e)}`,
      `L${t(12, i + e)}`,
      `L${t(9, i + a)}`
    );
    let o = ((r + 1) * 2 * Math.PI) / 8;
    n.push(`A9 9 0 0 1 ${t(9, o - a)}`);
  }
  let r = 4.2;
  return `${n.join(``)}Z M16.2 12a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`;
}
var V_ = B_();
function H_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 17.6,
    children: (0, J.jsx)(`path`, { d: V_, fill: `currentColor`, fillRule: `evenodd` }),
  });
}
function U_(e) {
  let t = { left: 0, up: 90, right: 180, down: 270 }[e.direction];
  return (0, J.jsx)(L_, {
    size: e.size ?? 17.6,
    children: (0, J.jsx)(`path`, {
      d: `M13.2 0.8L3 12L13.2 23.2M22.6 0.8L12.4 12L22.6 23.2`,
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: 3.2,
      transform: t === 0 ? void 0 : `rotate(${t} 12 12)`,
    }),
  });
}
function W_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 18.4,
    children: (0, J.jsx)(`path`, {
      d: `M1.6 0.95L22.4 21.75M22.4 0.95L1.6 21.75`,
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: 5.1,
    }),
  });
}
var G_ = Array.from({ length: 25 }, (e, t) => {
  let n = 12 - 6 * Math.sin((2 * Math.PI * (t - 1)) / 20);
  return `${t === 0 ? `M` : `L`}${t} ${n.toFixed(2)}`;
}).join(``);
function K_(e) {
  if (e.kind === null) return null;
  let t;
  if (e.kind === `wave`)
    t = (0, J.jsx)(`path`, { d: G_, fill: `none`, stroke: `currentColor`, strokeWidth: 3.6 });
  else if (e.kind === `point`)
    t = (0, J.jsx)(`circle`, { cx: 12, cy: 12, r: 3.1, fill: `currentColor` });
  else {
    let n = e.kind === `region-strict`;
    t = (0, J.jsxs)(J.Fragment, {
      children: [
        (0, J.jsx)(`path`, { d: `M24 0V24H0Z`, fill: `currentColor`, opacity: 0.5 }),
        (0, J.jsx)(`path`, {
          d: `M0 24L24 0`,
          fill: `none`,
          stroke: `currentColor`,
          strokeWidth: n ? 2.4 : 2.8,
          strokeDasharray: n ? `6 4` : void 0,
        }),
      ],
    });
  }
  return (0, J.jsx)(L_, { size: 29, children: t });
}
function q_(e) {
  let t = e.width ?? 28,
    n = [];
  for (let e = 0; e < 5; e++)
    n.push((0, J.jsx)(`rect`, { x: 5.2 + e * 4, y: 4.2, width: 2.6, height: 2.6 }, `a${e}`));
  for (let e = 0; e < 4; e++)
    n.push((0, J.jsx)(`rect`, { x: 7.2 + e * 4, y: 8.2, width: 2.6, height: 2.6 }, `b${e}`));
  return (0, J.jsxs)(`svg`, {
    className: `kc-glyph`,
    width: t,
    height: (t * 18) / 28,
    viewBox: `0 0 28 18`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: [
      (0, J.jsx)(`rect`, {
        x: 0.75,
        y: 0.75,
        width: 26.5,
        height: 16.5,
        rx: 2.5,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 1.5,
      }),
      (0, J.jsxs)(`g`, {
        fill: `currentColor`,
        children: [n, (0, J.jsx)(`rect`, { x: 9, y: 12.2, width: 11, height: 2.4 })],
      }),
    ],
  });
}
function J_() {
  return (0, J.jsx)(`svg`, {
    className: `kc-glyph`,
    width: 12,
    height: 7,
    viewBox: `0 0 12 7`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, { d: `M0 7L6 0L12 7Z`, fill: `currentColor` }),
  });
}
function Y_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 20,
    children: (0, J.jsx)(`path`, {
      d: `M1 1H9V4.2H4.2V9H1ZM15 1H23V9H19.8V4.2H15ZM1 15H4.2V19.8H9V23H1ZM19.8 15H23V23H15V19.8H19.8Z`,
      fill: `currentColor`,
    }),
  });
}
function X_(e) {
  return (0, J.jsxs)(L_, {
    size: e.size ?? 20,
    children: [
      (0, J.jsx)(`path`, { d: `M1.5 21.2L21.8 2.6L23.2 4.1L2.9 22.7Z`, fill: `currentColor` }),
      (0, J.jsx)(`circle`, { cx: 5, cy: 14, r: 3, fill: `currentColor` }),
      (0, J.jsx)(`circle`, { cx: 12, cy: 13, r: 3, fill: `currentColor` }),
      (0, J.jsx)(`circle`, { cx: 19, cy: 6, r: 3, fill: `currentColor` }),
    ],
  });
}
function Z_() {
  return (0, J.jsxs)(`svg`, {
    className: `kc-glyph`,
    width: 25,
    height: 22,
    viewBox: `0 0 25 22`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: [
      (0, J.jsx)(`rect`, { x: 0.5, y: 0.5, width: 24, height: 6, fill: `currentColor` }),
      (0, J.jsxs)(`g`, {
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 1,
        children: [
          (0, J.jsx)(`rect`, { x: 0.5, y: 0.5, width: 24, height: 21 }),
          (0, J.jsx)(`path`, { d: `M0.5 11.5H24.5M0.5 16.5H24.5M8.5 6.5V21.5M16.5 6.5V21.5` }),
        ],
      }),
    ],
  });
}
function Q_(e) {
  return (0, J.jsx)(L_, {
    size: e.size ?? 20,
    children: (0, J.jsxs)(`g`, {
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: 2.2,
      children: [
        (0, J.jsx)(`rect`, { x: 8, y: 2, width: 13, height: 15, rx: 2 }),
        (0, J.jsx)(`path`, { d: `M4.5 6.5V20a1.5 1.5 0 0 0 1.5 1.5H16.5` }),
      ],
    }),
  });
}
var Y = {
    value: (e, t) => `Expression ${e} equals ${t}`,
    error: (e, t) => `Expression ${e}: ${t}`,
    clearAll: `All expressions cleared. Undo is available.`,
    undone: `Undone.`,
    redone: `Redone.`,
    rowLimit: `The calculator holds at most 100 expressions.`,
    charLimit: `Each expression can be up to 2,048 characters.`,
    tilde: `tilde`,
    added: (e, t) => `${e} ${t} added`,
    angle: (e) => `Angle set to ${e}.`,
    boundNotNumber: `Enter an expression with a finite value.`,
    boundOrder: `The minimum must be less than the maximum.`,
    stepInvalid: `Enter a positive number, or leave blank for automatic.`,
  },
  $_ = new Set();
function ev(e) {
  $_.add(e);
}
function tv(e, t) {
  let n = new Map(e.map((e) => [e.row.id, e.motion])),
    r = new Set(t.map((e) => e.id)),
    i = t.map((e) => {
      let t = n.get(e.id);
      return { row: e, motion: t === void 0 || t === `exit` ? `enter` : t };
    });
  return (
    e.forEach((e, t) => {
      r.has(e.row.id) ||
        $_.delete(e.row.id) ||
        i.splice(Math.min(t, i.length), 0, { row: e.row, motion: `exit` });
    }),
    i
  );
}
function nv(e) {
  let [t, n] = (0, h.useState)(() => ({
      rows: e,
      items: e.map((e) => ({ row: e, motion: `idle` })),
    })),
    r = t;
  t.rows !== e && ((r = { rows: e, items: tv(t.items, e) }), n(r));
  let { items: i } = r;
  return (
    (0, h.useEffect)(() => {
      i.some((e) => e.motion === `enter`) &&
        n((e) => ({
          rows: e.rows,
          items: e.items.map((e) => (e.motion === `enter` ? { ...e, motion: `idle` } : e)),
        }));
    }, [i]),
    {
      items: i,
      exitDone: (0, h.useCallback)((e) => {
        n((t) =>
          t.items.some((t) => t.row.id === e && t.motion === `exit`)
            ? { rows: t.rows, items: t.items.filter((t) => t.row.id !== e || t.motion !== `exit`) }
            : t
        );
      }, []),
    }
  );
}
var rv = new WeakMap();
function iv(e, t) {
  rv.set(e, (rv.get(e) ?? 0) + 1);
  try {
    t();
  } finally {
    let t = (rv.get(e) ?? 1) - 1;
    t > 0 ? rv.set(e, t) : rv.delete(e);
  }
}
function av(e, t) {
  return e.getSnapshot().rows.findIndex((e) => e.id === t);
}
function ov(e, t, n, r, i) {
  let a = e.insertRowAfter(r);
  return typeof a == `string`
    ? (n?.announce(Y.rowLimit), null)
    : (i === `focus` ? t.focusRow(a.id, `start`) : t.activateRow(a.id), a.id);
}
function sv(e, t, n, r) {
  let i = ov(e, t, n, r, `focus`);
  return (i !== null && n?.announce(Y.added(`Expression`, av(e, i) + 1)), i);
}
function cv(e, t, n) {
  let r = e.replaceWithTable(n);
  typeof r != `string` && t.focusRow(Op(r.id, 0, 0), `start`);
}
function lv(e, t, n, r) {
  let i = r === null ? e.insertTableAfter(null) : e.replaceWithTable(r);
  return typeof i == `string`
    ? (n?.announce(Y.rowLimit), null)
    : (t.focusRow(Op(i.id, 0, 0), `start`), n?.announce(Y.added(`Table`, av(e, i.id) + 1)), i.id);
}
function uv(e, t, n, r) {
  let { rows: i } = e.getSnapshot(),
    a = av(e, n);
  a < 0 ||
    (r === `up`
      ? a > 0 && t.focusRow(i[a - 1].id, `end`)
      : a < i.length - 1 && t.focusRow(i[a + 1].id, `start`));
}
function dv(e, t, n, r) {
  let { rows: i } = e.getSnapshot(),
    a = av(e, n);
  if (a < 0) return;
  if ((i.length > 1 && ev(n), e.deleteRow(n), i.length === 1)) {
    t.focusRow(n, `start`);
    return;
  }
  let o = a > 0 ? i[a - 1] : null,
    s = a < i.length - 1 ? i[a + 1] : null;
  if (r === `left`) {
    if (o?.type === `table`) {
      let e = Math.max(0, ...(o.columns ?? []).map((e) => e.values.length));
      t.focusRow(Op(o.id, 0, e), `start`);
    } else o === null ? s !== null && t.focusRow(s.id, `start`) : t.focusRow(o.id, `end`);
  } else s === null ? o !== null && t.focusRow(o.id, `end`) : t.focusRow(s.id, `start`);
}
function fv(e, t, n) {
  let r = av(e, n);
  if (r < 0) return;
  e.deleteRow(n);
  let { rows: i } = e.getSnapshot(),
    a = i[Math.min(r, i.length - 1)];
  a !== void 0 && t.focusRow(a.id, `end`);
}
function pv(e, t, n) {
  e.editRows((e, t) => {
    let r = e.findIndex((e) => e.id === n),
      i = e[r];
    if (i === void 0 || i.type === `table`) return null;
    let a = { ...i, id: t.nextId() };
    return [...e.slice(0, r + 1), a, ...e.slice(r + 1)];
  }) === `row-limit` && t?.announce(Y.rowLimit);
}
function mv(e, t, n) {
  (e.clearAll(), n?.announce(Y.clearAll), t.focusRow(e.getSnapshot().rows[0].id, `start`));
}
function hv(e, t) {
  e.canUndo() && (e.undo(), t?.announce(Y.undone));
}
function gv(e, t) {
  e.canRedo() && (e.redo(), t?.announce(Y.redone));
}
function _v(e, t, n, r, i, a = (t) => e.editRow(n, t, `keypad`)) {
  let o = r.latex();
  iv(r, () => i(r));
  let s = a(r.latex());
  return (s === `char-limit` && (iv(r, () => r.latex(o)), t?.announce(Y.charLimit)), s);
}
function vv(e) {
  return rv.has(e);
}
function yv(e) {
  let t = /^([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(ms|s)$/i.exec(e.trim());
  if (t === null) return null;
  let n = Number(t[1]);
  return Number.isFinite(n) ? (t[2].toLowerCase() === `s` ? n * 1e3 : n) : null;
}
function bv(e) {
  let t = e.ownerDocument.defaultView,
    n = t ? t.getComputedStyle(e) : getComputedStyle(e),
    r = 0;
  for (let e of (n.transitionDuration ?? ``).split(`,`)) {
    let t = yv(e);
    t !== null && t > r && (r = t);
  }
  return r;
}
var xv = (0, h.createContext)(bv),
  X = (function () {
    var e = function (t, n) {
      return (
        (e =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
          }),
        e(t, n)
      );
    };
    return function (t, n) {
      if (typeof n != `function` && n !== null)
        throw TypeError(`Class extends value ` + String(n) + ` is not a constructor or null`);
      e(t, n);
      function r() {
        this.constructor = t;
      }
      t.prototype = n === null ? Object.create(n) : ((r.prototype = n.prototype), new r());
    };
  })(),
  Sv = function () {
    return (
      (Sv =
        Object.assign ||
        function (e) {
          for (var t, n = 1, r = arguments.length; n < r; n++)
            for (var i in ((t = arguments[n]), t))
              Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
          return e;
        }),
      Sv.apply(this, arguments)
    );
  },
  Cv = (function () {
    var e = Math.min,
      t = Math.max;
    function n() {}
    function r(e, t) {
      if (!t) throw Error(`prayer failed: ` + e);
    }
    function i(e) {
      r(`a direction was passed`, e === -1 || e === 1);
    }
    new URLSearchParams(window.location.search);
    function a(e) {
      var t = document.implementation.createHTMLDocument(``);
      if (((t.body.innerHTML = e), t.body.children.length === 1)) return t.body.children[0];
      for (var n = document.createDocumentFragment(); t.body.firstChild; )
        n.appendChild(t.body.firstChild);
      return n;
    }
    var o = function (e, t, n) {
      var r;
      switch (e) {
        case `svg`:
        case `path`:
          r = document.createElementNS(`http://www.w3.org/2000/svg`, e);
          break;
        default:
          r = document.createElement(e);
      }
      for (var i in t) {
        var a = t[i];
        a !== void 0 && r.setAttribute(i, typeof a == `string` ? a : String(a));
      }
      if (n) for (var o = 0; o < n.length; o++) r.appendChild(n[o]);
      return r;
    };
    ((o.text = function (e) {
      return document.createTextNode(e);
    }),
      (o.block = function (e, t, n) {
        var r = o(e, t, [n.html()]);
        return (n.setDOM(r), E.linkElementByBlockNode(r, n), r);
      }),
      (o.entityText = function (e) {
        var t = a(e);
        return (
          r(
            `entity parses to a single text node`,
            t instanceof DocumentFragment &&
              t.childNodes.length === 1 &&
              t.childNodes[0] instanceof Text
          ),
          t.childNodes[0]
        );
      }));
    function s(e, t) {
      if (typeof e?.closest == `function`) return e.closest(t);
      if (!(e instanceof HTMLElement)) return null;
      var n =
          Element.prototype.matches ||
          Element.prototype.msMatchesSelector ||
          Element.prototype.webkitMatchesSelector,
        r = e;
      do {
        if (n.call(r, t)) return r;
        r = r?.parentElement ?? r?.parentNode ?? null;
      } while (r !== null && r.nodeType === 1);
      return null;
    }
    var c = `\xA0`,
      l = `​`,
      u = `˙`,
      d = `∑`,
      f = `∏`,
      p = `∐`,
      m = `∫`;
    function h(e) {
      return e.getClientRects().length
        ? e.getBoundingClientRect()
        : { top: 0, left: 0, height: 0, width: 0, x: 0, y: 0, bottom: 0, right: 0 };
    }
    function g() {
      return window.pageXOffset === void 0
        ? (document.documentElement || document.body.parentNode || document.body).scrollLeft
        : window.pageXOffset;
    }
    function _() {
      return window.pageYOffset === void 0
        ? (document.documentElement || document.body.parentNode || document.body).scrollTop
        : window.pageYOffset;
    }
    var v = (function () {
        var e, t;
        return (
          typeof requestAnimationFrame == `function` && typeof cancelAnimationFrame == `function`
            ? ((e = requestAnimationFrame), (t = cancelAnimationFrame))
            : ((e = function (e) {
                return setTimeout(e, 13);
              }),
              (t = clearTimeout)),
          function (n, r) {
            var i = Date.now(),
              a,
              o = 0;
            function s() {
              var e = (Date.now() - i) / n;
              (e <= o ? l() : (o = e), r(o, l, c));
            }
            function c() {
              (a !== void 0 && t(a), (a = void 0));
            }
            function l() {
              (c(), (a = e(s)));
            }
            r(+(n <= 0), l, c);
          }
        );
      })(),
      y = (function () {
        function e(e) {
          ((this.span = o(`span`, {
            class: `mq-aria-alert`,
            "aria-live": `assertive`,
            "aria-atomic": `true`,
          })),
            (this.msg = ``),
            (this.items = []),
            (this.controller = e));
        }
        return (
          (e.prototype.attach = function () {
            var e = this.controller.container;
            this.span.parentNode !== e && b(e).prepend(b(this.span));
          }),
          (e.prototype.queue = function (e, t) {
            t === void 0 && (t = !1);
            var n = ``;
            if (e instanceof be) {
              var r = e.mathspeak({ ignoreShorthand: !0 });
              (t &&
                (e.parent && e.parent.ariaLabel && e.ariaLabel === `block`
                  ? (n = e.parent.ariaLabel + ` ` + r)
                  : e.ariaLabel && (n = e.ariaLabel + ` ` + r)),
                n === `` && (n = r));
            } else n = e || ``;
            return (this.items.push(n), this);
          }),
          (e.prototype.queueDirOf = function (e) {
            return (i(e), this.queue(e === -1 ? `before` : `after`));
          }),
          (e.prototype.queueDirEndOf = function (e) {
            return (i(e), this.queue(e === -1 ? `beginning of` : `end of`));
          }),
          (e.prototype.alert = function (e) {
            return (
              this.attach(),
              e && this.queue(e),
              this.items.length &&
                ((this.msg = this.items
                  .join(` `)
                  .replace(/ +(?= )/g, ``)
                  .trim()),
                this.controller.containerHasFocus() && (this.span.textContent = this.msg)),
              this.clear()
            );
          }),
          (e.prototype.clear = function () {
            return ((this.items.length = 0), this);
          }),
          e
        );
      })(),
      b = (function () {
        function e(e, t) {
          var n;
          (arguments.length === 1 && (t = e),
            e && t && (this.ends = ((n = {}), (n[-1] = e), (n[1] = t), n)));
        }
        return (
          (e.create = function (t, n) {
            (arguments.length === 1 && (n = t), r(`No half-empty DOMFragments`, !!t == !!n));
            var i = new e(t, n);
            return (r(`last is a forward sibling of first`, i.isValid()), i);
          }),
          (e.prototype.isEmpty = function () {
            return this.ends === void 0;
          }),
          (e.prototype.isOneNode = function () {
            return !!(this.ends && this.ends[-1] === this.ends[1]);
          }),
          (e.prototype.isValid = function () {
            if (!this.ends || this.ends[-1] === this.ends[1]) return !0;
            var e;
            return (
              this.eachNode(function (t) {
                return (e = t);
              }),
              e === this.ends[1]
            );
          }),
          (e.prototype.firstNode = function () {
            return (r(`Fragment is not empty`, this.ends), this.ends[-1]);
          }),
          (e.prototype.lastNode = function () {
            return (r(`Fragment is not empty`, this.ends), this.ends[1]);
          }),
          (e.prototype.children = function () {
            var t = this.oneNode(),
              n = t.firstChild,
              r = t.lastChild;
            return n && r ? new e(n, r) : new e();
          }),
          (e.prototype.join = function (t) {
            if (!this.ends) return t;
            if (!t.ends) return this;
            for (var n = !1, i = this.ends[1].nextSibling; i; ) {
              if (i === t.ends[-1]) {
                n = !0;
                break;
              }
              i = i.nextSibling;
            }
            return (
              r(`sibling must be a forward DOM sibling of this fragment`, n),
              new e(this.ends[-1], t.ends[1])
            );
          }),
          (e.prototype.oneNode = function () {
            return (
              r(`Fragment has a single node`, this.ends && this.ends[-1] === this.ends[1]),
              this.ends[-1]
            );
          }),
          (e.prototype.oneElement = function () {
            var e = this.oneNode();
            return (r(`Node is an Element`, e.nodeType === Node.ELEMENT_NODE), e);
          }),
          (e.prototype.oneText = function () {
            var e = this.oneNode();
            return (r(`Node is Text`, e.nodeType === Node.TEXT_NODE), e);
          }),
          (e.prototype.eachNode = function (e) {
            if (!this.ends) return this;
            for (
              var t = this.ends[1], n = this.ends[-1], r = void 0;
              n && ((r = n.nextSibling), e(n), n !== t);
              n = r
            );
            return this;
          }),
          (e.prototype.eachElement = function (e) {
            return (
              this.eachNode(function (t) {
                t.nodeType === Node.ELEMENT_NODE && e(t);
              }),
              this
            );
          }),
          (e.prototype.text = function () {
            var e = ``;
            return (
              this.eachNode(function (t) {
                e += t.textContent || ``;
              }),
              e
            );
          }),
          (e.prototype.toNodeArray = function () {
            var e = [];
            return (
              this.eachNode(function (t) {
                return e.push(t);
              }),
              e
            );
          }),
          (e.prototype.toElementArray = function () {
            var e = [];
            return (
              this.eachElement(function (t) {
                return e.push(t);
              }),
              e
            );
          }),
          (e.prototype.toDocumentFragment = function () {
            var e = document.createDocumentFragment();
            return (
              this.eachNode(function (t) {
                return e.appendChild(t);
              }),
              e
            );
          }),
          (e.prototype.insertBefore = function (e) {
            return this.insDirOf(-1, e);
          }),
          (e.prototype.insertAfter = function (e) {
            return this.insDirOf(1, e);
          }),
          (e.prototype.append = function (e) {
            return (e.appendTo(this.oneElement()), this);
          }),
          (e.prototype.prepend = function (e) {
            return (e.prependTo(this.oneElement()), this);
          }),
          (e.prototype.appendTo = function (e) {
            return this.insAtDirEnd(1, e);
          }),
          (e.prototype.prependTo = function (e) {
            return this.insAtDirEnd(-1, e);
          }),
          (e.prototype.parent = function () {
            if (!this.ends) return this;
            var t = this.ends[-1].parentNode;
            return t ? new e(t) : new e();
          }),
          (e.prototype.wrapAll = function (e) {
            if (((e.textContent = ``), !this.ends)) return this;
            var t = this.ends[-1].parentNode,
              n = this.ends[1].nextSibling;
            return (this.appendTo(e), t && t.insertBefore(e, n), this);
          }),
          (e.prototype.replaceWith = function (e) {
            var t = this.ends?.[1],
              n = t?.parentNode,
              r = t?.nextSibling;
            this.detach();
            var i = e.toDocumentFragment();
            return (!t || !n || n.insertBefore(i, r || null), this);
          }),
          (e.prototype.nthElement = function (e) {
            if (this.ends && !(e < 0 || e !== Math.floor(e)))
              for (var t = this.ends[-1]; t; ) {
                if (t.nodeType === Node.ELEMENT_NODE) {
                  if (e <= 0) return t;
                  --e;
                }
                if (t === this.ends[1]) return;
                t = t.nextSibling;
              }
          }),
          (e.prototype.firstElement = function () {
            return this.nthElement(0);
          }),
          (e.prototype.lastElement = function () {
            if (this.ends)
              for (var e = this.ends[1]; e; ) {
                if (e.nodeType === Node.ELEMENT_NODE) return e;
                if (e === this.ends[-1]) return;
                e = e.previousSibling;
              }
          }),
          (e.prototype.first = function () {
            return new e(this.firstElement());
          }),
          (e.prototype.last = function () {
            return new e(this.lastElement());
          }),
          (e.prototype.eq = function (t) {
            return new e(this.nthElement(t));
          }),
          (e.prototype.slice = function (t) {
            if (!this.ends) return this;
            var n = this.nthElement(t);
            return n ? new e(n, this.ends[1]) : new e();
          }),
          (e.prototype.next = function () {
            for (var t = this.oneNode(); t; )
              if (((t = t.nextSibling), t && t.nodeType === Node.ELEMENT_NODE)) return new e(t);
            return new e();
          }),
          (e.prototype.prev = function () {
            for (var t = this.oneNode(); t; )
              if (((t = t.previousSibling), t && t.nodeType === Node.ELEMENT_NODE)) return new e(t);
            return new e();
          }),
          (e.prototype.empty = function () {
            return (
              this.eachElement(function (e) {
                e.textContent = ``;
              }),
              this
            );
          }),
          (e.prototype.remove = function () {
            return (this.toDocumentFragment(), this);
          }),
          (e.prototype.detach = function () {
            return this.remove();
          }),
          (e.prototype.insDirOf = function (e, t) {
            if (!this.ends) return this;
            var n = t.ends?.[e];
            return !n || !n.parentNode
              ? this.detach()
              : (x(e, n.parentNode, this.toDocumentFragment(), n), this);
          }),
          (e.prototype.insAtDirEnd = function (e, t) {
            return (this.ends && S(e, this.toDocumentFragment(), t), this);
          }),
          (e.prototype.hasClass = function (e) {
            var t = !1;
            return (
              this.eachElement(function (n) {
                n.classList.contains(e) && (t = !0);
              }),
              t
            );
          }),
          (e.prototype.addClass = function (e) {
            for (
              var t = function (e) {
                  if (!e) return `continue`;
                  n.eachElement(function (t) {
                    t.classList.add(e);
                  });
                },
                n = this,
                r = 0,
                i = e.split(/\s+/);
              r < i.length;
              r++
            ) {
              var a = i[r];
              t(a);
            }
            return this;
          }),
          (e.prototype.removeClass = function (e) {
            for (
              var t = function (e) {
                  if (!e) return `continue`;
                  n.eachElement(function (t) {
                    t.classList.remove(e);
                  });
                },
                n = this,
                r = 0,
                i = e.split(/\s+/);
              r < i.length;
              r++
            ) {
              var a = i[r];
              t(a);
            }
            return this;
          }),
          (e.prototype.toggleClass = function (e, t) {
            if (t === !0) return this.addClass(e);
            if (t === !1) return this.removeClass(e);
            for (
              var n = function (e) {
                  if (!e) return `continue`;
                  r.eachElement(function (t) {
                    t.classList.toggle(e);
                  });
                },
                r = this,
                i = 0,
                a = e.split(/\s+/);
              i < a.length;
              i++
            ) {
              var o = a[i];
              n(o);
            }
            return this;
          }),
          e
        );
      })().create;
    function x(e, t, n, r) {
      t.insertBefore(n, e === -1 ? r : r.nextSibling);
    }
    function S(e, t, n) {
      e === -1 ? n.insertBefore(t, n.firstChild) : n.appendChild(t);
    }
    var C = (function () {
      function e(e, t, n) {
        this.init(e, t, n);
      }
      return (
        (e.prototype.init = function (e, t, n) {
          ((this.parent = e), (this[-1] = t), (this[1] = n));
        }),
        (e.copy = function (t) {
          return new e(t.parent, t[-1], t[1]);
        }),
        e
      );
    })();
    function w(e, t) {
      var n = e[-1];
      if (n) {
        var r = e[1];
        if (r) for (r = r[1]; n !== r && t(n) !== !1; n = n[1]);
      }
    }
    function T(e, t, n) {
      var r = e[-1];
      if (!r) return t;
      var i = e[1];
      if (!i) return t;
      for (i = i[1]; r !== i; r = r[1]) t = n(t, r);
      return t;
    }
    var E = (function () {
      function e() {
        var r;
        ((this[t] = 0),
          (this[n] = 0),
          (this.parent = 0),
          (this.ends = ((r = {}), (r[-1] = 0), (r[1] = 0), r)),
          (this.id = e.uniqueNodeId()));
      }
      ((e.uniqueNodeId = function () {
        return (e.idCounter += 1);
      }),
        (e.getNodeOfElement = function (e) {
          if (e) {
            if (!e.nodeType) throw Error(`must pass an Element to NodeBase.getNodeOfElement`);
            var t = e;
            return t.mqBlockNode || t.mqCmdNode;
          }
        }),
        (e.linkElementByBlockNode = function (e, t) {
          e.mqBlockNode = t;
        }),
        (e.linkElementByCmdNode = function (e, t) {
          e.mqCmdNode = t;
        }),
        (e.prototype.setEnds = function (e) {
          ((this.ends = e), r(`No half-empty node ends`, !!this.ends[-1] == !!this.ends[1]));
        }),
        (e.prototype.getEnd = function (e) {
          return this.ends[e];
        }),
        (e.prototype.toString = function () {
          return `{{ MathQuill Node #` + this.id + ` }}`;
        }),
        (e.prototype.setDOM = function (e) {
          return (
            e &&
              r(
                `DOM is an element or a text node`,
                e.nodeType === Node.ELEMENT_NODE || e.nodeType === Node.TEXT_NODE
              ),
            (this._el = e),
            this
          );
        }),
        (e.prototype.domFrag = function () {
          return b(this._el);
        }),
        (e.prototype.createDir = function (e, t) {
          i(e);
          var n = this;
          return (
            n.html(),
            n.domFrag().insDirOf(e, t.domFrag()),
            (t[e] = n.adopt(t.parent, t[-1], t[1])),
            n
          );
        }),
        (e.prototype.createLeftOf = function (e) {
          this.createDir(-1, e);
        }),
        (e.prototype.selectChildren = function (e, t) {
          return new j(e, t);
        }),
        (e.prototype.bubble = function (e) {
          for (var t = this.getSelfNode(); t && e(t) !== !1; t = t.parent);
          return this;
        }),
        (e.prototype.postOrder = function (e) {
          var t = this.getSelfNode();
          return (
            (function t(n) {
              return n ? (n.eachChild(t), e(n), !0) : !1;
            })(t),
            t
          );
        }),
        (e.prototype.isEmpty = function () {
          return this.ends[-1] === 0 && this.ends[1] === 0;
        }),
        (e.prototype.isQuietEmptyDelimiter = function (e) {
          if (!this.isEmpty() || !e || !this.parent || this.parent.ctrlSeq === void 0) return !1;
          var t = this.parent.ctrlSeq.replace(/^\\(left|right)?/, ``);
          return e.hasOwnProperty(t);
        }),
        (e.prototype.isStyleBlock = function () {
          return !1;
        }),
        (e.prototype.isTextBlock = function () {
          return !1;
        }),
        (e.prototype.children = function () {
          return new O(this.getEnd(-1), this.getEnd(1));
        }),
        (e.prototype.eachChild = function (e) {
          return (w(this.ends, e), this);
        }),
        (e.prototype.foldChildren = function (e, t) {
          return T(this.ends, e, t);
        }),
        (e.prototype.withDirAdopt = function (e, t, n, r) {
          var i = this.getSelfNode();
          return (new O(i, i).withDirAdopt(e, t, n, r), this);
        }),
        (e.prototype.adopt = function (e, t, n) {
          var r = this.getSelfNode();
          return (new O(r, r).adopt(e, t, n), this.getSelfNode());
        }),
        (e.prototype.disown = function () {
          var e = this.getSelfNode();
          return (new O(e, e).disown(), this);
        }),
        (e.prototype.remove = function () {
          return (this.domFrag().remove(), this.disown());
        }),
        (e.prototype.shouldIgnoreSubstitutionInSimpleSubscript = function (e) {
          return !(
            !e.disableAutoSubstitutionInSubscripts ||
            !this.parent ||
            !(this.parent.parent instanceof ht) ||
            !this.parent.domFrag().hasClass(`mq-sub`)
          );
        }),
        (e.prototype.getSelfNode = function () {
          return this;
        }),
        (e.prototype.parser = function () {
          r(`Abstract parser() method is never called`, !1);
        }),
        (e.prototype.html = function () {
          throw Error(`html() unimplemented in NodeBase`);
        }),
        (e.prototype.text = function () {
          return ``;
        }),
        (e.prototype.latex = function () {
          return ``;
        }),
        (e.prototype.finalizeTree = function (e, t) {}),
        (e.prototype.contactWeld = function (e, t) {}),
        (e.prototype.blur = function (e) {}),
        (e.prototype.focus = function () {}),
        (e.prototype.intentionalBlur = function () {}),
        (e.prototype.reflow = function () {}),
        (e.prototype.registerInnerField = function (e, t) {}),
        (e.prototype.chToCmd = function (e, t) {
          r(`Abstract chToCmd() method is never called`, !1);
        }),
        (e.prototype.mathspeak = function (e) {
          return ``;
        }),
        (e.prototype.seek = function (e, t) {}),
        (e.prototype.siblingDeleted = function (e, t) {}),
        (e.prototype.siblingCreated = function (e, t) {}),
        (e.prototype.finalizeInsert = function (e, t) {}),
        (e.prototype.fixDigitGrouping = function (e) {}),
        (e.prototype.writeLatex = function (e, t) {}),
        (e.prototype.write = function (e, t) {}));
      var t = -1,
        n = 1;
      return ((e.idCounter = 0), e);
    })();
    function D(e, t, n) {
      (r(`a parent is always present`, e),
        r(
          `leftward is properly set up`,
          (function () {
            return t ? t[1] === n && t.parent === e : e.getEnd(-1) === n;
          })()
        ),
        r(
          `rightward is properly set up`,
          (function () {
            return n ? n[-1] === t && n.parent === e : e.getEnd(1) === t;
          })()
        ));
    }
    var O = (function () {
        function e(e, t, n) {
          var a, o;
          if (
            ((this.disowned = !1),
            n === void 0 && (n = -1),
            i(n),
            r(`no half-empty fragments`, !e == !t),
            !e || !t)
          )
            this.setEnds(((a = {}), (a[-1] = 0), (a[1] = 0), a));
          else {
            (r(`withDir is passed to Fragment`, e instanceof be),
              r(`oppDir is passed to Fragment`, t instanceof be),
              r(`withDir and oppDir have the same parent`, e.parent === t.parent));
            var s = ((o = {}), (o[n] = e), (o[-n] = t), o);
            this.setEnds(s);
            var c = 0;
            (this.each(function (e) {
              c = e;
            }),
              r(`following direction siblings from start reaches end`, c === s[1]));
          }
        }
        return (
          (e.prototype.getDOMFragFromEnds = function () {
            var e = this.ends[-1],
              t = this.ends[1];
            return e === 0 || t === 0 ? b() : e === t ? e.domFrag() : e.domFrag().join(t.domFrag());
          }),
          (e.prototype.setEnds = function (e) {
            this.ends = e;
          }),
          (e.prototype.getEnd = function (e) {
            return this.ends ? this.ends[e] : 0;
          }),
          (e.prototype.domFrag = function () {
            return this.getDOMFragFromEnds();
          }),
          (e.prototype.withDirAdopt = function (e, t, n, r) {
            return e === -1 ? this.adopt(t, n, r) : this.adopt(t, r, n);
          }),
          (e.prototype.adopt = function (e, t, n) {
            var r;
            D(e, t, n);
            var i = this;
            this.disowned = !1;
            var a = i.ends[-1];
            if (!a) return this;
            var o = i.ends[1];
            if (!o) return this;
            var s = ((r = {}), (r[-1] = e.getEnd(-1)), (r[1] = e.getEnd(1)), r);
            return (
              t || (s[-1] = a),
              n ? (n[-1] = o) : (s[1] = o),
              e.setEnds(s),
              (o[1] = n),
              i.each(function (n) {
                return ((n[-1] = t), (n.parent = e), t && (t[1] = n), (t = n), !0);
              }),
              i
            );
          }),
          (e.prototype.disown = function () {
            var e,
              t = this,
              n = t.ends[-1];
            if (!n || t.disowned) return t;
            this.disowned = !0;
            var r = t.ends[1];
            if (!r) return t;
            var i = n.parent;
            (D(i, n[-1], n), D(i, r, r[1]));
            var a = ((e = {}), (e[-1] = i.getEnd(-1)), (e[1] = i.getEnd(1)), e);
            if (n[-1]) {
              var o = n[-1];
              o[1] = r[1];
            } else a[-1] = r[1];
            if (r[1]) {
              var s = r[1];
              s[-1] = n[-1];
            } else a[1] = n[-1];
            return (a[-1] && a[1] ? i.setEnds(a) : (i.ends = a), t);
          }),
          (e.prototype.remove = function () {
            return (this.domFrag().remove(), this.disown());
          }),
          (e.prototype.each = function (e) {
            return (w(this.ends, e), this);
          }),
          (e.prototype.fold = function (e, t) {
            return T(this.ends, e, t);
          }),
          e
        );
      })(),
      k = {},
      A = {};
    function ee(e) {
      return e && e.prototype instanceof be;
    }
    var te = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return ((t.ancestors = {}), t);
        }
        return (
          (t.fromCursor = function (e) {
            return new t(e.parent, e[-1], e[1]);
          }),
          t
        );
      })(C),
      ne = (function (e) {
        X(t, e);
        function t(t, n, r) {
          var i = e.call(this, t, 0, 0) || this;
          return (
            (i.options = n),
            (i.controller = r),
            (i.upDownCache = {}),
            (i.cursorElement = o(`span`, { class: `mq-cursor` }, [o.text(l)])),
            (i._domFrag = b()),
            i.setDOMFrag(b(i.cursorElement)),
            (i.blink = function () {
              b(i.cursorElement).toggleClass(`mq-blink`);
            }),
            i
          );
        }
        return (
          (t.prototype.setDOMFrag = function (e) {
            return ((this._domFrag = e), this);
          }),
          (t.prototype.domFrag = function () {
            return this._domFrag;
          }),
          (t.prototype.show = function () {
            if (
              (b(this.cursorElement).removeClass(`mq-blink`),
              this.setDOMFrag(b(this.cursorElement)),
              this.intervalId)
            )
              clearInterval(this.intervalId);
            else {
              var e = this[1];
              if (e) {
                var t = this.selection;
                t && t.getEnd(-1)[-1] === this[-1]
                  ? this.domFrag().insertBefore(t.domFrag())
                  : this.domFrag().insertBefore(e.domFrag());
              } else this.domFrag().appendTo(this.parent.domFrag().oneElement());
              this.parent.focus();
            }
            return ((this.intervalId = setInterval(this.blink, 500)), this);
          }),
          (t.prototype.hide = function () {
            return (
              this.intervalId && clearInterval(this.intervalId),
              (this.intervalId = 0),
              this.domFrag().detach(),
              this.setDOMFrag(b()),
              this
            );
          }),
          (t.prototype.withDirInsertAt = function (e, t, n, r) {
            var i = this.parent;
            ((this.parent = t), (this[e] = n), (this[-e] = r), i !== t && i.blur && i.blur(this));
          }),
          (t.prototype.insDirOf = function (e, t) {
            return (
              i(e),
              this.domFrag().insDirOf(e, t.domFrag()),
              this.withDirInsertAt(e, t.parent, t[e], t),
              this.parent.domFrag().addClass(`mq-hasCursor`),
              this
            );
          }),
          (t.prototype.insLeftOf = function (e) {
            return this.insDirOf(-1, e);
          }),
          (t.prototype.insRightOf = function (e) {
            return this.insDirOf(1, e);
          }),
          (t.prototype.insAtDirEnd = function (e, t) {
            return (
              i(e),
              this.domFrag().insAtDirEnd(e, t.domFrag().oneElement()),
              this.withDirInsertAt(e, t, 0, t.getEnd(e)),
              t.focus(),
              this
            );
          }),
          (t.prototype.insAtLeftEnd = function (e) {
            return this.insAtDirEnd(-1, e);
          }),
          (t.prototype.insAtRightEnd = function (e) {
            return this.insAtDirEnd(1, e);
          }),
          (t.prototype.jumpUpDown = function (e, t) {
            var n = this;
            n.upDownCache[e.id] = C.copy(n);
            var r = n.upDownCache[t.id];
            if (r) {
              var i = r[1];
              i ? n.insLeftOf(i) : n.insAtRightEnd(r.parent);
            } else {
              var a = n.getBoundingClientRectWithoutMargin().left;
              t.seek(a, n);
            }
            n.controller.aria.queue(t, !0);
          }),
          (t.prototype.getBoundingClientRectWithoutMargin = function () {
            var e = this.domFrag();
            e.removeClass(`mq-cursor`);
            var t = h(e.oneElement()),
              n = t.left,
              r = t.right;
            return (e.addClass(`mq-cursor`), { left: n, right: r });
          }),
          (t.prototype.unwrapGramp = function () {
            var e = this.parent.parent,
              t = e.parent,
              n = e[1],
              r = this,
              i = e[-1];
            if (
              (e.disown().eachChild(function (r) {
                return (
                  r.isEmpty() ||
                    (r
                      .children()
                      .adopt(t, i, n)
                      .each(function (t) {
                        return (t.domFrag().insertBefore(e.domFrag()), !0);
                      }),
                    (i = r.getEnd(1))),
                  !0
                );
              }),
              !this[1])
            ) {
              var a = this[-1];
              if (a) this[1] = a[1];
              else
                for (; !this[1]; ) {
                  var o = this.parent[1];
                  if (o) ((this.parent = o), (this[1] = o.getEnd(-1)));
                  else {
                    ((this[1] = e[1]), (this.parent = t));
                    break;
                  }
                }
            }
            var s = this[1];
            (s ? this.insLeftOf(s) : this.insAtRightEnd(t), e.domFrag().remove());
            var c = e[-1],
              l = e[1];
            (c && c.siblingDeleted(r.options, 1), l && l.siblingDeleted(r.options, -1));
          }),
          (t.prototype.startSelection = function () {
            for (
              var e = (this.anticursor = te.fromCursor(this)), t = e.ancestors, n = e;
              n.parent;
              n = n.parent
            )
              t[n.parent.id] = n;
          }),
          (t.prototype.endSelection = function () {
            delete this.anticursor;
          }),
          (t.prototype.select = function () {
            var e,
              t = this.anticursor;
            if (this[-1] === t[-1] && this.parent === t.parent) return !1;
            for (var n = this; n.parent; n = n.parent)
              if (n.parent.id in t.ancestors) {
                e = n.parent;
                break;
              }
            r(`cursor and anticursor in the same tree`, e);
            var i = e,
              a = t.ancestors[i.id],
              o,
              s,
              c = 1;
            if (n[-1] !== a) {
              for (var l = n; l; l = l[1])
                if (l[1] === a[1]) {
                  ((c = -1), (o = n), (s = a));
                  break;
                }
            }
            (c === 1 && ((o = a), (s = n)),
              o instanceof C && (o = o[1]),
              s instanceof C && (s = s[-1]),
              (this.hide().selection = i.selectChildren(o, s)));
            var u = this.selection.getEnd(c);
            return (this.insDirOf(c, u), this.selectionChanged(), !0);
          }),
          (t.prototype.resetToEnd = function (e) {
            this.clearSelection();
            var t = e.root;
            ((this[1] = 0), (this[-1] = t.getEnd(1)), (this.parent = t));
          }),
          (t.prototype.clearSelection = function () {
            return (
              this.selection &&
                (this.selection.clear(), delete this.selection, this.selectionChanged()),
              this
            );
          }),
          (t.prototype.deleteSelection = function () {
            var e = this.selection;
            e &&
              ((this[-1] = e.getEnd(-1)[-1]),
              (this[1] = e.getEnd(1)[1]),
              e.remove(),
              this.selectionChanged(),
              delete this.selection);
          }),
          (t.prototype.replaceSelection = function () {
            var e = this.selection;
            return (
              e &&
                ((this[-1] = e.getEnd(-1)[-1]), (this[1] = e.getEnd(1)[1]), delete this.selection),
              e
            );
          }),
          (t.prototype.depth = function () {
            for (var e = this, t = 0; (e = e.parent); ) t += +(e instanceof Ne);
            return t;
          }),
          (t.prototype.isTooDeep = function (e) {
            return (
              this.options.maxDepth !== void 0 && this.depth() + (e || 0) > this.options.maxDepth
            );
          }),
          (t.prototype.selectionChanged = function () {}),
          t
        );
      })(C),
      j = (function (e) {
        X(t, e);
        function t(t, n, r) {
          var i = e.call(this, t, n, r) || this;
          return (
            (i._el = o(`span`, { class: `mq-selection` })),
            i.getDOMFragFromEnds().wrapAll(i._el),
            i
          );
        }
        return (
          (t.prototype.isCleared = function () {
            return this._el === void 0;
          }),
          (t.prototype.domFrag = function () {
            return this.isCleared() ? this.getDOMFragFromEnds() : b(this._el);
          }),
          (t.prototype.setEnds = function (e) {
            (r(`Selection ends are never empty`, e[-1] && e[1]), (this.ends = e));
          }),
          (t.prototype.getEnd = function (e) {
            return this.ends[e];
          }),
          (t.prototype.adopt = function (t, n, r) {
            return (this.clear(), e.prototype.adopt.call(this, t, n, r));
          }),
          (t.prototype.clear = function () {
            var e = this.getDOMFragFromEnds();
            return (this.domFrag().replaceWith(e), (this._el = void 0), this);
          }),
          (t.prototype.join = function (e, t) {
            return (
              t === void 0 && (t = ``),
              this.fold(``, function (n, r) {
                return n + t + r[e]();
              })
            );
          }),
          t
        );
      })(O),
      re = (function () {
        function e(e, t, n) {
          ((this.root = e),
            (this.container = t),
            (this.options = n),
            (this.textareaEventListeners = {}),
            (this.id = e.id),
            (this.data = {}),
            (this.aria = new y(this.getControllerSelf())),
            (this.ariaLabel = `Math Input`),
            (this.ariaPostLabel = ``),
            (e.controller = this.getControllerSelf()),
            (this.cursor = e.cursor = new ne(e, n, this.getControllerSelf())));
        }
        return (
          (e.prototype.getControllerSelf = function () {
            return this;
          }),
          (e.prototype.handle = function (e, t) {
            var n = this.options.handlers,
              i = this.options.handlers?.fns[e];
            if (i) {
              var a = n?.APIClasses[this.KIND_OF_MQ];
              r(`APIClass is defined`, a);
              var o = new a(this);
              t === -1 || t === 1 ? i(t, o) : i(o);
            }
          }),
          (e.onNotify = function (t) {
            e.notifyees.push(t);
          }),
          (e.prototype.notify = function (t) {
            for (var n = 0; n < e.notifyees.length; n += 1) e.notifyees[n](this.cursor, t);
            return this;
          }),
          (e.prototype.setAriaLabel = function (e) {
            var t = this.getAriaLabel();
            return (
              (this.ariaLabel =
                e && typeof e == `string` && e !== `` ? e : this.editable ? `Math Input` : ``),
              this.ariaLabel !== t && !this.containerHasFocus() && this.updateMathspeak(),
              this
            );
          }),
          (e.prototype.getAriaLabel = function () {
            return this.ariaLabel === `Math Input`
              ? this.editable
                ? `Math Input`
                : ``
              : this.ariaLabel;
          }),
          (e.prototype.setAriaPostLabel = function (e, t) {
            var n = this;
            return (
              e && typeof e == `string` && e !== ``
                ? (e !== this.ariaPostLabel &&
                    typeof t == `number` &&
                    (this._ariaAlertTimeout && clearTimeout(this._ariaAlertTimeout),
                    (this._ariaAlertTimeout = setTimeout(function () {
                      n.containerHasFocus()
                        ? n.aria.alert(n.root.mathspeak().trim() + ` ` + e.trim())
                        : n.updateMathspeak();
                    }, t))),
                  (this.ariaPostLabel = e))
                : (this._ariaAlertTimeout && clearTimeout(this._ariaAlertTimeout),
                  (this.ariaPostLabel = ``)),
              this
            );
          }),
          (e.prototype.getAriaPostLabel = function () {
            return this.ariaPostLabel || ``;
          }),
          (e.prototype.containerHasFocus = function () {
            var e = this.container.getRootNode().activeElement;
            return !!e && this.container.contains(e);
          }),
          (e.prototype.getTextareaOrThrow = function () {
            var e = this.textarea;
            if (!e) throw Error(`expected a textarea`);
            return e;
          }),
          (e.prototype.getTextareaSpanOrThrow = function () {
            var e = this.textareaSpan;
            if (!e) throw Error(`expected a textareaSpan`);
            return e;
          }),
          (e.prototype.addTextareaEventListeners = function (e) {
            if (this.textarea)
              for (var t in e) {
                var n = t;
                (this.removeTextareaEventListener(n), this.textarea.addEventListener(n, e[n]));
              }
          }),
          (e.prototype.removeTextareaEventListener = function (e) {
            if (this.textarea) {
              var t = this.textareaEventListeners[e];
              t && this.textarea.removeEventListener(e, t);
            }
          }),
          (e.prototype.exportMathSpeak = function () {
            return this.root.mathspeak();
          }),
          (e.prototype.updateMathspeak = function () {}),
          (e.prototype.scrollHoriz = function () {}),
          (e.prototype.selectionChanged = function () {}),
          (e.prototype.setOverflowClasses = function () {}),
          (e.notifyees = []),
          e
        );
      })(),
      ie = {},
      ae = {},
      oe = {},
      se = (function () {
        function e(e) {
          this.version = e;
        }
        return (
          (e.prototype.assertJquery = function () {
            return (
              r(`Interface versions > 2 do not depend on JQuery`, this.version <= 2),
              r(`JQuery is set for interface v < 3`, this.jQuery),
              this.jQuery
            );
          }),
          e
        );
      })(),
      ce = (function () {
        function e() {}
        return e;
      })(),
      le = function () {
        window.console &&
          console.warn(`You are using the MathQuill API without specifying an interface version, which will fail in v1.0.0. Easiest fix is to do the following before doing anything else:

    MathQuill = MathQuill.getInterface(1);
    // now MathQuill.MathField() works like it used to

See also the "\`dev\` branch (2014–2015) → v0.10.0 Migration Guide" at
  https://github.com/mathquill/mathquill/wiki/%60dev%60-branch-(2014%E2%80%932015)-%E2%86%92-v0.10.0-Migration-Guide`);
      },
      ue;
    function M(e) {
      return (le(), (ue ||= fe(1)), ue(e));
    }
    ((M.prototype = ce.prototype),
      (M.VERSION = `v0.10.1`),
      (M.interfaceVersion = function (e) {
        if (e !== 1) throw `Only interface version 1 supported. You specified: ` + e;
        return (
          (le = function () {
            window.console &&
              console.warn(`You called MathQuill.interfaceVersion(1); to specify the interface version, which will fail in v1.0.0. You can fix this easily by doing this before doing anything else:

    MathQuill = MathQuill.getInterface(1);
    // now MathQuill.MathField() works like it used to

See also the "\`dev\` branch (2014–2015) → v0.10.0 Migration Guide" at
  https://github.com/mathquill/mathquill/wiki/%60dev%60-branch-(2014%E2%80%932015)-%E2%86%92-v0.10.0-Migration-Guide`);
          }),
          le(),
          M
        );
      }),
      (M.getInterface = fe));
    var N = (fe.MIN = 1),
      de = (fe.MAX = 3);
    function fe(e) {
      if (e !== 1 && e !== 2 && e !== 3)
        throw (
          `Only interface versions between ` + N + ` and ` + de + ` supported. You specified: ` + e
        );
      var t = e;
      if (t < 3) {
        var n = window.jQuery;
        if (!n) throw `MathQuill interface version ${t} requires jQuery 1.5.2+ to be loaded first`;
        se.prototype.jQuery = n;
      }
      var i = Sv(Sv({}, oe), {
        handlers: function (e) {
          return { fns: e || {}, APIClasses: u };
        },
      });
      function a(e, n) {
        for (var r in n)
          if (n.hasOwnProperty(r)) {
            if (r === `substituteKeyboardEvents` && t >= 3)
              throw Error(
                [
                  `As of interface version 3, the 'substituteKeyboardEvents'`,
                  `option is no longer supported. Use 'overrideTypedText' and`,
                  `'overrideKeystroke' instead.`,
                ].join(` `)
              );
            var a = n[r],
              o = i[r];
            e[r] = o ? o(a) : a;
          }
      }
      var s =
          t < 3
            ? se
            : (function (e) {
                X(t, e);
                function t() {
                  return (e !== null && e.apply(this, arguments)) || this;
                }
                return t;
              })(se),
        c = (function (e) {
          X(n, e);
          function n(t) {
            var n = e.call(this) || this;
            return (
              (n.__controller = t),
              (n.__options = t.options),
              (n.id = t.id),
              (n.data = t.data),
              n
            );
          }
          return (
            (n.prototype.mathquillify = function (e) {
              var n = this.__controller,
                r = n.root,
                i = n.container;
              n.createTextarea();
              var a = b(i).addClass(e).children().detach();
              (r.setDOM(
                b(o(`span`, { class: `mq-root-block`, "aria-hidden": !0 }))
                  .appendTo(i)
                  .oneElement()
              ),
                E.linkElementByBlockNode(r.domFrag().oneElement(), r),
                this.latex(a.text()),
                (this.revert = function () {
                  return (
                    n.removeTextareaEventListener(`focus`),
                    n.removeTextareaEventListener(`blur`),
                    n.releaseFocusBlur(),
                    n.removeMouseEventListener(),
                    b(i)
                      .removeClass(`mq-editable-field mq-math-mode mq-text-mode`)
                      .empty()
                      .append(a),
                    t < 3 ? this.__options.assertJquery()(i) : i
                  );
                }));
            }),
            (n.prototype.setAriaLabel = function (e) {
              return (this.__controller.setAriaLabel(e), this);
            }),
            (n.prototype.getAriaLabel = function () {
              return this.__controller.getAriaLabel();
            }),
            (n.prototype.config = function (e) {
              return (a(this.__options, e), this);
            }),
            (n.prototype.el = function () {
              return this.__controller.container;
            }),
            (n.prototype.text = function () {
              return this.__controller.exportText();
            }),
            (n.prototype.mathspeak = function () {
              return this.__controller.exportMathSpeak();
            }),
            (n.prototype.latex = function (e) {
              if (arguments.length > 0) {
                this.__controller.renderLatexMath(e);
                var t = this.__controller.cursor;
                return (this.__controller.blurred && t.hide().parent.blur(t), this);
              }
              return this.__controller.exportLatex();
            }),
            (n.prototype.html = function () {
              return this.__controller.root
                .domFrag()
                .oneElement()
                .innerHTML.replace(/ jQuery\d+="(?:\d+|null)"/g, ``)
                .replace(/ mathquill-(?:command|block)-id="?\d+"?/g, ``)
                .replace(/<span class="?mq-cursor( mq-blink)?"?>.?<\/span>/i, ``)
                .replace(/ mq-hasCursor|mq-hasCursor ?/, ``)
                .replace(/ class=(""|(?= |>))/g, ``);
            }),
            (n.prototype.reflow = function () {
              return (
                this.__controller.root.postOrder(function (e) {
                  e.reflow();
                }),
                this
              );
            }),
            n
          );
        })(ce),
        l = (function (e) {
          X(t, e);
          function t() {
            return (e !== null && e.apply(this, arguments)) || this;
          }
          return (
            (t.prototype.mathquillify = function (t) {
              return (
                e.prototype.mathquillify.call(this, t),
                (this.__controller.editable = !0),
                this.__controller.addMouseEventListener(),
                this.__controller.editablesTextareaEvents(),
                this
              );
            }),
            (t.prototype.focus = function () {
              return (
                this.__controller.getTextareaOrThrow().focus(),
                this.__controller.scrollHoriz(),
                this
              );
            }),
            (t.prototype.blur = function () {
              return (this.__controller.getTextareaOrThrow().blur(), this);
            }),
            (t.prototype.write = function (e) {
              (this.__controller.writeLatex(e), this.__controller.scrollHoriz());
              var t = this.__controller.cursor;
              return (this.__controller.blurred && t.hide().parent.blur(t), this);
            }),
            (t.prototype.empty = function () {
              var e,
                t = this.__controller.root,
                n = this.__controller.cursor;
              return (
                t.setEnds(((e = {}), (e[-1] = 0), (e[1] = 0), e)),
                t.domFrag().empty(),
                delete n.selection,
                n.insAtRightEnd(t),
                this
              );
            }),
            (t.prototype.cmd = function (e) {
              var t = this.__controller.notify(void 0),
                n = t.cursor;
              if (/^\\[a-z]+$/i.test(e) && !n.isTooDeep()) {
                e = e.slice(1);
                var r = k[e],
                  i;
                r &&
                  ((i = r.constructor ? new r(e) : r(e)),
                  n.selection && i.replaces(n.replaceSelection()),
                  i.createLeftOf(n.show()));
              } else n.parent.write(n, e);
              return (t.scrollHoriz(), t.blurred && n.hide().parent.blur(n), this);
            }),
            (t.prototype.select = function () {
              return (this.__controller.selectAll(), this);
            }),
            (t.prototype.clearSelection = function () {
              return (this.__controller.cursor.clearSelection(), this);
            }),
            (t.prototype.selectionLatex = function () {
              var e = this.__controller.cursor.selection;
              return e ? this.__controller.cleanLatex(e.join(`latex`)) : null;
            }),
            (t.prototype.moveToDirEnd = function (e) {
              return (
                this.__controller.notify(`move`).cursor.insAtDirEnd(e, this.__controller.root),
                this
              );
            }),
            (t.prototype.moveToLeftEnd = function () {
              return this.moveToDirEnd(-1);
            }),
            (t.prototype.moveToRightEnd = function () {
              return this.moveToDirEnd(1);
            }),
            (t.prototype.keystroke = function (e, t) {
              for (var n = e.replace(/^\s+|\s+$/g, ``).split(/\s+/), r = 0; r < n.length; r += 1)
                this.__controller.keystroke(n[r], t);
              return this;
            }),
            (t.prototype.typedText = function (e) {
              for (var t = 0; t < e.length; t += 1) this.__controller.typedText(e.charAt(t));
              return this;
            }),
            (t.prototype.dropEmbedded = function (e, t, n) {
              var r = e - g(),
                i = t - _(),
                a = document.elementFromPoint(r, i);
              (this.__controller.seek(a, r, i),
                new Pt().setOptions(n).createLeftOf(this.__controller.cursor));
            }),
            (t.prototype.setAriaPostLabel = function (e, t) {
              return (this.__controller.setAriaPostLabel(e, t), this);
            }),
            (t.prototype.getAriaPostLabel = function () {
              return this.__controller.getAriaPostLabel();
            }),
            (t.prototype.clickAt = function (e, t, n) {
              n ||= document.elementFromPoint(e, t);
              var r = this.__controller,
                i = r.root.domFrag().oneElement();
              return (i.contains(n) || (n = i), r.seek(n, e, t), r.blurred && this.focus(), this);
            }),
            (t.prototype.ignoreNextMousedown = function (e) {
              return ((this.__controller.cursor.options.ignoreNextMousedown = e), this);
            }),
            t
          );
        })(c),
        u = { AbstractMathQuill: c, EditableField: l };
      (r(`API.StaticMath defined`, ie.StaticMath),
        (u.StaticMath = ie.StaticMath(u)),
        r(`API.MathField defined`, ie.MathField),
        (u.MathField = ie.MathField(u)),
        r(`API.InnerMathField defined`, ie.InnerMathField),
        (u.InnerMathField = ie.InnerMathField(u)),
        ie.TextField && (u.TextField = ie.TextField(u)));
      var d = function (e) {
        if (!e || !e.nodeType) return null;
        for (var t, n = b(e).children().toElementArray(), r = 0, i = n; r < i.length; r++) {
          var a = i[r];
          if (a.classList.contains(`mq-root-block`)) {
            t = a;
            break;
          }
        }
        var o = E.getNodeOfElement(t),
          s = o && o.controller,
          c = s && u[s.KIND_OF_MQ];
        return s && c ? new c(s) : null;
      };
      ((d.L = -1),
        (d.R = 1),
        (d.config = function (e) {
          return (a(s.prototype, e), this);
        }),
        (d.registerEmbed = function (e, t) {
          if (!/^[a-z][a-z0-9]*$/i.test(e))
            throw `Embed name must start with letter and be only letters and digits`;
          ae[e] = t;
        }),
        (d.StaticMath = f(`StaticMath`, u.StaticMath)),
        (d.MathField = f(`MathField`, u.MathField)),
        (d.InnerMathField = f(`InnerMathField`, u.InnerMathField)),
        u.TextField && (d.TextField = f(`TextField`, u.TextField)),
        (d.prototype = c.prototype),
        (d.EditableField = function () {
          throw `wtf don't call me, I'm 'abstract'`;
        }),
        (d.EditableField.prototype = l.prototype),
        t < 3 && (d.saneKeyboardEvents = De));
      function f(e, n) {
        r(e + ` is defined`, n);
        function i(r, i) {
          if (!r || !r.nodeType) return null;
          var a = d(r);
          if (a instanceof n) return a;
          var o = new Oe(new n.RootBlock(), r, new s(t));
          return ((o.KIND_OF_MQ = e), new n(o).__mathquillify(i || {}, t));
        }
        return ((i.prototype = n.prototype), i);
      }
      return d;
    }
    function pe(e) {
      ((e.moveOutOf = function (e) {
        (r(`controller is defined`, this.controller), this.controller.handle(`moveOutOf`, e));
      }),
        (e.deleteOutOf = function (e) {
          (r(`controller is defined`, this.controller), this.controller.handle(`deleteOutOf`, e));
        }),
        (e.selectOutOf = function (e) {
          (r(`controller is defined`, this.controller), this.controller.handle(`selectOutOf`, e));
        }),
        (e.upOutOf = function () {
          (r(`controller is defined`, this.controller), this.controller.handle(`upOutOf`));
        }),
        (e.downOutOf = function () {
          (r(`controller is defined`, this.controller), this.controller.handle(`downOutOf`));
        }),
        (e.reflow = function () {
          (r(`controller is defined`, this.controller),
            this.controller.handle(`reflow`),
            this.controller.handle(`edited`),
            this.controller.handle(`edit`));
        }));
    }
    function me(e, t) {
      throw ((e = e ? `'` + e + `'` : `EOF`), `Parse Error: ` + t + ` at ` + e);
    }
    var P = (function () {
        function e(e) {
          this._ = e;
        }
        return (
          (e.prototype.parse = function (t) {
            return this.skip(e.eof)._(`` + t, n, me);
            function n(e, t) {
              return t;
            }
          }),
          (e.prototype.or = function (t) {
            r(`or is passed a parser`, t instanceof e);
            var n = this;
            return new e(function (e, r, i) {
              return n._(e, r, a);
              function a(n) {
                return t._(e, r, i);
              }
            });
          }),
          (e.prototype.then = function (t) {
            var n = this;
            return new e(function (i, a, o) {
              return n._(i, s, o);
              function s(n, i) {
                var s = t instanceof e ? t : t(i);
                return (r(`a parser is returned`, s instanceof e), s._(n, a, o));
              }
            });
          }),
          (e.prototype.many = function () {
            var t = this;
            return new e(function (e, n, r) {
              for (var i = []; t._(e, a, o); );
              return n(e, i);
              function a(t, n) {
                return ((e = t), i.push(n), !0);
              }
              function o() {
                return !1;
              }
            });
          }),
          (e.prototype.times = function (t, n) {
            arguments.length < 2 && (n = t);
            var r = this;
            return new e(function (e, i, a) {
              for (var o = [], s = !0, c, l = 0; l < t; l += 1)
                if (((s = !!r._(e, u, d)), !s)) return a(e, c);
              for (; l < n && s; l += 1) r._(e, u, f);
              return i(e, o);
              function u(t, n) {
                return (o.push(n), (e = t), !0);
              }
              function d(t, n) {
                return ((c = n), (e = t), !1);
              }
              function f(e, t) {
                return !1;
              }
            });
          }),
          (e.prototype.result = function (t) {
            return this.then(e.succeed(t));
          }),
          (e.prototype.atMost = function (e) {
            return this.times(0, e);
          }),
          (e.prototype.atLeast = function (e) {
            var t = this;
            return t.times(e).then(function (e) {
              return t.many().map(function (t) {
                return e.concat(t);
              });
            });
          }),
          (e.prototype.map = function (t) {
            return this.then(function (n) {
              return e.succeed(t(n));
            });
          }),
          (e.prototype.skip = function (e) {
            return this.then(function (t) {
              return e.result(t);
            });
          }),
          (e.string = function (t) {
            var n = t.length,
              r = `expected '` + t + `'`;
            return new e(function (e, i, a) {
              var o = e.slice(0, n);
              return o === t ? i(e.slice(n), o) : a(e, r);
            });
          }),
          (e.regex = function (t) {
            r(`regexp parser is anchored`, t.toString().charAt(1) === `^`);
            var n = `expected ` + t;
            return new e(function (e, r, i) {
              var a = t.exec(e);
              if (a) {
                var o = a[0];
                return r(e.slice(o.length), o);
              }
              return i(e, n);
            });
          }),
          (e.succeed = function (t) {
            return new e(function (e, n) {
              return n(e, t);
            });
          }),
          (e.fail = function (t) {
            return new e(function (e, n, r) {
              return r(e, t);
            });
          }),
          (e.letter = e.regex(/^[a-z]/i)),
          (e.letters = e.regex(/^[a-z]*/i)),
          (e.digit = e.regex(/^[0-9]/)),
          (e.digits = e.regex(/^[0-9]*/)),
          (e.whitespace = e.regex(/^\s+/)),
          (e.optWhitespace = e.regex(/^\s*/)),
          (e.any = new e(function (e, t, n) {
            return e ? t(e.slice(1), e.charAt(0)) : n(e, `expected any character`);
          })),
          (e.all = new e(function (e, t, n) {
            return t(``, e);
          })),
          (e.eof = new e(function (e, t, n) {
            return e ? n(e, `expected EOF`) : t(e, e);
          })),
          e
        );
      })(),
      he = (function () {
        function e() {
          this.fn = n;
        }
        return (
          (e.prototype.listen = function (e) {
            ((this.fn = e), clearTimeout(this.timeoutId), (this.timeoutId = setTimeout(this.fn)));
          }),
          (e.prototype.listenOnce = function (e) {
            var t = this;
            this.listen(function () {
              var n = [...arguments];
              (t.clearListener(), e.apply(void 0, n));
            });
          }),
          (e.prototype.clearListener = function () {
            ((this.fn = n), clearTimeout(this.timeoutId));
          }),
          (e.prototype.trigger = function () {
            var e = [...arguments];
            this.fn.apply(this, e);
          }),
          e
        );
      })(),
      ge = (function () {
        var e = {
            8: `Backspace`,
            9: `Tab`,
            10: `Enter`,
            13: `Enter`,
            16: `Shift`,
            17: `Control`,
            18: `Alt`,
            20: `CapsLock`,
            27: `Esc`,
            32: `Spacebar`,
            33: `PageUp`,
            34: `PageDown`,
            35: `End`,
            36: `Home`,
            37: `Left`,
            38: `Up`,
            39: `Right`,
            40: `Down`,
            45: `Insert`,
            46: `Del`,
            144: `NumLock`,
          },
          t = {
            ArrowRight: `Right`,
            ArrowLeft: `Left`,
            ArrowDown: `Down`,
            ArrowUp: `Up`,
            Delete: `Del`,
            Escape: `Esc`,
            " ": `Spacebar`,
          };
        function n(e) {
          switch (i(e)) {
            case `Right`:
            case `Left`:
            case `Down`:
            case `Up`:
              return !0;
          }
          return !1;
        }
        function r(e) {
          return e.length === 1 && e >= `a` && e <= `z`;
        }
        function i(n) {
          if (n.key === void 0) {
            var i = n.which || n.keyCode;
            return e[i] || String.fromCharCode(i);
          }
          return r(n.key) ? n.key.toUpperCase() : (t[n.key] ?? n.key);
        }
        function a(e) {
          var t = i(e),
            n = [];
          return (
            e.ctrlKey && n.push(`Ctrl`),
            e.metaKey && n.push(`Meta`),
            e.altKey && n.push(`Alt`),
            e.shiftKey && n.push(`Shift`),
            n.length ? (n.push(t), n.join(`-`)) : t
          );
        }
        return function (e, t) {
          var r = null,
            i = null,
            o = new he();
          function s() {
            try {
              e instanceof HTMLTextAreaElement && e.select();
            } catch {}
          }
          function c(t) {
            (o.trigger(),
              o.clearListener(),
              e instanceof HTMLTextAreaElement && (e.value = t),
              t && s(),
              (l = !!t));
          }
          var l = !1;
          function u() {
            return !(`selectionStart` in e) || !(e instanceof HTMLTextAreaElement)
              ? !1
              : e.selectionStart !== e.selectionEnd;
          }
          function d() {
            t.options && t.options.overrideKeystroke
              ? t.options.overrideKeystroke(a(r), r)
              : t.keystroke(a(r), r);
          }
          function f(t) {
            (o.trigger(t),
              t.target === e &&
                ((r = t),
                (i = null),
                l &&
                  o.listenOnce(function (e) {
                    (e && e.type === `focusout`) || s();
                  }),
                d()));
          }
          function p(t) {
            (o.trigger(t),
              t.target === e && (r && i && d(), (i = t), n(t) ? o.listenOnce(g) : o.listen(h)));
          }
          function m(t) {
            (o.trigger(t), t.target === e && r && !i && (n(t) ? o.listenOnce(g) : o.listen(h)));
          }
          function h() {
            if (!u() && e instanceof HTMLTextAreaElement) {
              var n = e.value;
              n.length === 1
                ? ((e.value = ``),
                  t.options && t.options.overrideTypedText
                    ? t.options.overrideTypedText(n)
                    : t.typedText(n))
                : g();
            }
          }
          function g() {
            e instanceof HTMLTextAreaElement && e.value.length > 1 && s();
          }
          function _() {
            ((r = null),
              (i = null),
              o.clearListener(),
              e instanceof HTMLTextAreaElement && (e.value = ``));
          }
          function v(n) {
            (o.trigger(),
              n.target === e &&
                (e.getRootNode().activeElement !== e && e.focus(),
                o.listen(function () {
                  if (e instanceof HTMLTextAreaElement) {
                    var n = e.value;
                    ((e.value = ``), n && t.paste(n));
                  }
                })));
          }
          function y(e) {
            o.trigger(e);
          }
          return (
            t.options && t.options.disableCopyPaste
              ? t.addTextareaEventListeners({
                  keydown: f,
                  keypress: p,
                  keyup: m,
                  focusout: _,
                  copy: function (e) {
                    e.preventDefault();
                  },
                  cut: function (e) {
                    e.preventDefault();
                  },
                  paste: function (e) {
                    (o.trigger(), e.preventDefault());
                  },
                  input: y,
                })
              : t.addTextareaEventListeners({
                  keydown: f,
                  keypress: p,
                  keyup: m,
                  focusout: _,
                  cut: function () {
                    o.listenOnce(function () {
                      t.cut();
                    });
                  },
                  copy: function () {
                    o.listenOnce(function () {
                      t.copy();
                    });
                  },
                  paste: v,
                  input: y,
                }),
            { select: c }
          );
        };
      })(),
      _e = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.exportText = function () {
            return this.root.foldChildren(``, function (e, t) {
              return e + t.text();
            });
          }),
          t
        );
      })(re);
    re.onNotify(function (e, t) {
      if (t === `edit` || t === `replace` || t === void 0) {
        var n = e.controller;
        if (!n || !n.options.enableDigitGrouping || n.blurred !== !1) return;
        n.disableGroupingForSeconds(1);
      }
    });
    var ve = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return (
            (t.handleTextareaFocusEditable = function () {
              var e = t.cursor;
              (t.updateMathspeak(),
                (t.blurred = !1),
                clearTimeout(t.blurTimeout),
                b(t.container).addClass(`mq-focused`),
                e.parent || e.insAtRightEnd(t.root),
                e.selection
                  ? (e.selection.domFrag().removeClass(`mq-blur`), t.selectionChanged())
                  : e.show(),
                t.setOverflowClasses());
            }),
            (t.handleTextareaBlurEditable = function () {
              ((t.textareaSelectionTimeout &&= (clearTimeout(t.textareaSelectionTimeout), 0)),
                t.disableGroupingForSeconds(0),
                (t.blurred = !0),
                (t.blurTimeout = setTimeout(function () {
                  (t.root.postOrder(function (e) {
                    e.intentionalBlur();
                  }),
                    t.cursor.clearSelection().endSelection(),
                    t.blur(),
                    t.updateMathspeak(),
                    t.scrollHoriz());
                })),
                window.addEventListener(`blur`, t.handleWindowBlur));
            }),
            (t.handleTextareaFocusStatic = function () {
              t.blurred = !1;
            }),
            (t.handleTextareaBlurStatic = function () {
              (t.cursor.selection && t.cursor.selection.clear(),
                setTimeout(function () {
                  (b(t.getTextareaSpanOrThrow()).detach(), (t.blurred = !0));
                }));
            }),
            (t.handleWindowBlur = function () {
              (clearTimeout(t.blurTimeout),
                t.cursor.selection && t.cursor.selection.domFrag().addClass(`mq-blur`),
                t.blur(),
                t.updateMathspeak());
            }),
            t
          );
        }
        return (
          (t.prototype.disableGroupingForSeconds = function (e) {
            var t = this;
            (clearTimeout(this.__disableGroupingTimeout),
              e === 0
                ? this.root.domFrag().removeClass(`mq-suppress-grouping`)
                : (this.root.domFrag().addClass(`mq-suppress-grouping`),
                  (this.__disableGroupingTimeout = setTimeout(function () {
                    t.root.domFrag().removeClass(`mq-suppress-grouping`);
                  }, e * 1e3))));
          }),
          (t.prototype.releaseFocusBlur = function () {
            (clearTimeout(this.blurTimeout),
              clearTimeout(this.textareaSelectionTimeout),
              (this.textareaSelectionTimeout = 0),
              window.removeEventListener(`blur`, this.handleWindowBlur),
              this.cursor.hide());
          }),
          (t.prototype.blur = function () {
            (this.cursor.hide().parent.blur(this.cursor),
              b(this.container).removeClass(`mq-focused`),
              window.removeEventListener(`blur`, this.handleWindowBlur),
              this.options && this.options.resetCursorOnBlur && this.cursor.resetToEnd(this));
          }),
          (t.prototype.addEditableFocusBlurListeners = function () {
            var e = this,
              t = e.cursor;
            (this.addTextareaEventListeners({
              focus: this.handleTextareaFocusEditable,
              blur: this.handleTextareaBlurEditable,
            }),
              (e.blurred = !0),
              t.hide().parent.blur(t));
          }),
          (t.prototype.addStaticFocusBlurListeners = function () {
            this.addTextareaEventListeners({
              focus: this.handleTextareaFocusStatic,
              blur: this.handleTextareaBlurStatic,
            });
          }),
          t
        );
      })(_e),
      ye = !1,
      be = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.keystroke = function (e, n, r) {
            var i = r.cursor;
            switch (e) {
              case `Ctrl-Shift-Backspace`:
              case `Ctrl-Backspace`:
                r.ctrlDeleteDir(-1);
                break;
              case `Shift-Backspace`:
              case `Backspace`:
                r.backspace();
                break;
              case `Esc`:
              case `Tab`:
                r.escapeDir(1, e, n);
                return;
              case `Shift-Tab`:
              case `Shift-Esc`:
                r.escapeDir(-1, e, n);
                return;
              case `End`:
                (r.notify(`move`).cursor.insAtRightEnd(i.parent),
                  r.aria.queue(`end of`).queue(i.parent, !0));
                break;
              case `Ctrl-End`:
                (r.notify(`move`).cursor.insAtRightEnd(r.root),
                  r.aria.queue(`end of`).queue(r.ariaLabel).queue(r.root).queue(r.ariaPostLabel));
                break;
              case `Shift-End`:
                r.selectToBlockEndInDir(1);
                break;
              case `Ctrl-Shift-End`:
                r.selectToRootEndInDir(1);
                break;
              case `Home`:
                (r.notify(`move`).cursor.insAtLeftEnd(i.parent),
                  r.aria.queue(`beginning of`).queue(i.parent, !0));
                break;
              case `Ctrl-Home`:
                (r.notify(`move`).cursor.insAtLeftEnd(r.root),
                  r.aria
                    .queue(`beginning of`)
                    .queue(r.ariaLabel)
                    .queue(r.root)
                    .queue(r.ariaPostLabel));
                break;
              case `Shift-Home`:
                r.selectToBlockEndInDir(-1);
                break;
              case `Ctrl-Shift-Home`:
                r.selectToRootEndInDir(-1);
                break;
              case `Left`:
                r.moveLeft();
                break;
              case `Shift-Left`:
                r.selectLeft();
                break;
              case `Ctrl-Left`:
                break;
              case `Right`:
                r.moveRight();
                break;
              case `Shift-Right`:
                r.selectRight();
                break;
              case `Ctrl-Right`:
                break;
              case `Up`:
                r.moveUp();
                break;
              case `Down`:
                r.moveDown();
                break;
              case `Shift-Up`:
                r.withIncrementalSelection(function (e) {
                  if (i[-1]) for (; i[-1]; ) e(-1);
                  else e(-1);
                });
                break;
              case `Shift-Down`:
                r.withIncrementalSelection(function (e) {
                  if (i[1]) for (; i[1]; ) e(1);
                  else e(1);
                });
                break;
              case `Ctrl-Up`:
                break;
              case `Ctrl-Down`:
                break;
              case `Ctrl-Shift-Del`:
              case `Ctrl-Del`:
                r.ctrlDeleteDir(1);
                break;
              case `Shift-Del`:
              case `Del`:
                r.deleteForward();
                break;
              case `Meta-A`:
              case `Ctrl-A`:
                r.selectAll();
                break;
              case `Ctrl-Alt-Up`:
                i.parent.parent && i.parent.parent instanceof t
                  ? r.aria.queue(i.parent.parent)
                  : r.aria.queue(`nothing above`);
                break;
              case `Ctrl-Alt-Down`:
                i.parent && i.parent instanceof t
                  ? r.aria.queue(i.parent)
                  : r.aria.queue(`block is empty`);
                break;
              case `Ctrl-Alt-Left`:
                i.parent.parent && i.parent.parent.getEnd(-1)
                  ? r.aria.queue(i.parent.parent.getEnd(-1))
                  : r.aria.queue(`nothing to the left`);
                break;
              case `Ctrl-Alt-Right`:
                i.parent.parent && i.parent.parent.getEnd(1)
                  ? r.aria.queue(i.parent.parent.getEnd(1))
                  : r.aria.queue(`nothing to the right`);
                break;
              case `Ctrl-Alt-Shift-Down`:
                i.selection
                  ? r.aria.queue(i.selection.join(`mathspeak`, ` `).trim() + ` selected`)
                  : r.aria.queue(`nothing selected`);
                break;
              case `Ctrl-Alt-=`:
              case `Ctrl-Alt-Shift-Right`:
                r.ariaPostLabel.length ? r.aria.queue(r.ariaPostLabel) : r.aria.queue(`no answer`);
                break;
              default:
                return;
            }
            (r.aria.alert(), n?.preventDefault(), r.scrollHoriz());
          }),
          (t.prototype.moveOutOf = function (e, t, n) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.moveTowards = function (e, t, n) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.deleteOutOf = function (e, t) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.deleteTowards = function (e, t) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.unselectInto = function (e, t) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.selectOutOf = function (e, t) {
            r(`overridden or never called on this node`, !1);
          }),
          (t.prototype.selectTowards = function (e, t) {
            r(`overridden or never called on this node`, !1);
          }),
          t
        );
      })(E);
    (re.onNotify(function (e, t) {
      (t === `move` || t === `upDown`) && e.show().clearSelection();
    }),
      (oe.leftRightIntoCmdGoes = function (e) {
        if (e && e !== `up` && e !== `down`)
          throw `"up" or "down" required for leftRightIntoCmdGoes option, got "` + e + `"`;
        return e;
      }),
      re.onNotify(function (e, t) {
        t !== `upDown` && (e.upDownCache = {});
      }),
      re.onNotify(function (e, t) {
        t === `edit` && e.show().deleteSelection();
      }),
      re.onNotify(function (e, t) {
        t !== `select` && e.endSelection();
      }));
    var xe = (function (e) {
      X(t, e);
      function t() {
        return (e !== null && e.apply(this, arguments)) || this;
      }
      return (
        (t.prototype.keystroke = function (e, t) {
          this.cursor.parent.keystroke(e, t, this.getControllerSelf());
        }),
        (t.prototype.escapeDir = function (e, t, n) {
          i(e);
          var r = this.cursor;
          if ((r.parent !== this.root && n?.preventDefault(), r.parent !== this.root))
            return (
              r.clearSelection(),
              r.parent.moveOutOf(e, r),
              r.controller.aria.alert(),
              this.notify(`move`)
            );
        }),
        (t.prototype.moveDir = function (e) {
          i(e);
          var t = this.cursor,
            n = t.options.leftRightIntoCmdGoes,
            r = t[e];
          return (
            t.selection
              ? t.insDirOf(e, t.selection.getEnd(e))
              : r
                ? r.moveTowards(e, t, n)
                : t.parent.moveOutOf(e, t, n),
            this.notify(`move`)
          );
        }),
        (t.prototype.moveLeft = function () {
          return this.moveDir(-1);
        }),
        (t.prototype.moveRight = function () {
          return this.moveDir(1);
        }),
        (t.prototype.moveUp = function () {
          return this.moveUpDown(`up`);
        }),
        (t.prototype.moveDown = function () {
          return this.moveUpDown(`down`);
        }),
        (t.prototype.moveUpDown = function (e) {
          var t = this,
            n = t.notify(`upDown`).cursor,
            r,
            i;
          e === `up` ? ((r = `upInto`), (i = `upOutOf`)) : ((r = `downInto`), (i = `downOutOf`));
          var a = n[-1],
            o = n[1],
            s = o && o[r],
            c = a && a[r];
          return (
            s
              ? n.insAtLeftEnd(s)
              : c
                ? n.insAtRightEnd(c)
                : n.parent.bubble(function (e) {
                    var t = e[i];
                    if (
                      t &&
                      (typeof t == `function` && (t = t.call(e, n)),
                      t instanceof be && n.jumpUpDown(e, t),
                      t !== !0)
                    )
                      return !1;
                  }),
            t
          );
        }),
        (t.prototype.deleteDir = function (e) {
          i(e);
          var t = this.cursor,
            n = t[e],
            r = t.parent.parent,
            a = t.controller;
          if (n && n instanceof be)
            n.sides
              ? a.aria.queue(n.parent.chToCmd(n.sides[-e].ch).mathspeak({ createdLeftOf: t }))
              : !n.blocks && n.parent.ctrlSeq !== `\\text` && a.aria.queue(n);
          else if (r && r instanceof be) {
            if (r.sides)
              a.aria.queue(r.parent.chToCmd(r.sides[e].ch).mathspeak({ createdLeftOf: t }));
            else if (r.blocks && r.mathspeakTemplate) {
              if (r.upInto && r.downInto) a.aria.queue(r.mathspeakTemplate[1]);
              else {
                var o = r.mathspeakTemplate,
                  s = e === -1 ? o[0] : o[o.length - 1];
                a.aria.queue(s);
              }
            } else a.aria.queue(r);
          }
          var c = t.selection;
          if ((this.notify(`edit`), !c)) {
            var l = t[e];
            l ? l.deleteTowards(e, t) : t.parent.deleteOutOf(e, t);
          }
          var u = t[-1],
            d = t[1];
          return (
            u.siblingDeleted && u.siblingDeleted(t.options, 1),
            d.siblingDeleted && d.siblingDeleted(t.options, -1),
            t.parent.bubble(function (e) {
              e.reflow();
            }),
            this
          );
        }),
        (t.prototype.ctrlDeleteDir = function (e) {
          i(e);
          var t = this.cursor;
          if (!t[e] || t.selection) return this.deleteDir(e);
          this.notify(`edit`);
          var n = e === -1 ? new O(t.parent.getEnd(-1), t[-1]) : new O(t[1], t.parent.getEnd(1));
          (t.controller.aria.queue(n), n.remove(), t.insAtDirEnd(e, t.parent));
          var r = t[-1],
            a = t[1];
          return (
            r && r.siblingDeleted(t.options, 1),
            a && a.siblingDeleted(t.options, -1),
            t.parent.bubble(function (e) {
              e.reflow();
            }),
            this
          );
        }),
        (t.prototype.backspace = function () {
          return this.deleteDir(-1);
        }),
        (t.prototype.deleteForward = function () {
          return this.deleteDir(1);
        }),
        (t.prototype.startIncrementalSelection = function () {
          (r(`Multiple selections can't be simultaneously open`, !ye),
            (ye = !0),
            this.notify(`select`));
          var e = this.cursor;
          e.anticursor || e.startSelection();
        }),
        (t.prototype.selectDirIncremental = function (e) {
          (r(`A selection is open`, ye), (ye = !0));
          var t = this.cursor,
            n = t.selection;
          i(e);
          var a = t[e];
          a
            ? n && n.getEnd(e) === a && t.anticursor[-e] !== a
              ? a.unselectInto(e, t)
              : a.selectTowards(e, t)
            : t.parent.selectOutOf(e, t);
        }),
        (t.prototype.finishIncrementalSelection = function () {
          r(`A selection is open`, ye);
          var e = this.cursor;
          (e.clearSelection(), e.select() || e.show());
          var t = e.selection;
          (t && e.controller.aria.clear().queue(t.join(`mathspeak`, ` `).trim() + ` selected`),
            (ye = !1));
        }),
        (t.prototype.withIncrementalSelection = function (e) {
          var t = this;
          try {
            this.startIncrementalSelection();
            try {
              e(function (e) {
                return t.selectDirIncremental(e);
              });
            } finally {
              this.finishIncrementalSelection();
            }
          } finally {
            ye = !1;
          }
        }),
        (t.prototype.selectDir = function (e) {
          this.withIncrementalSelection(function (t) {
            return t(e);
          });
        }),
        (t.prototype.selectLeft = function () {
          return this.selectDir(-1);
        }),
        (t.prototype.selectRight = function () {
          return this.selectDir(1);
        }),
        (t.prototype.selectAll = function () {
          this.notify(`move`);
          var e = this.cursor;
          (e.insAtRightEnd(this.root),
            this.withIncrementalSelection(function (t) {
              for (; e[-1]; ) t(-1);
            }));
        }),
        (t.prototype.selectToBlockEndInDir = function (e) {
          var t = this.cursor;
          this.withIncrementalSelection(function (n) {
            for (; t[e]; ) n(e);
          });
        }),
        (t.prototype.selectToRootEndInDir = function (e) {
          var t = this,
            n = this.cursor;
          this.withIncrementalSelection(function (r) {
            for (; n[e] || n.parent !== t.root; ) r(e);
          });
        }),
        t
      );
    })(ve);
    (function (e) {
      X(t, e);
      function t(t) {
        return e.call(this) || this;
      }
      return t;
    })(be);
    var Se = (function () {
      function e(e) {
        var t = new Ne();
        return (e.adopt(t, 0, 0), t);
      }
      function t(e) {
        for (var t = e[0] || new Ne(), n = 1; n < e.length; n += 1)
          e[n].children().adopt(t, t.getEnd(1), 0);
        return t;
      }
      var n = P.string,
        r = P.regex,
        i = P.letter,
        a = P.digit,
        o = P.any,
        s = P.optWhitespace,
        c = P.succeed,
        l = P.fail,
        u = i.map(function (e) {
          return new Ge(e);
        }),
        d = a.map(function (e) {
          return new He(e);
        }),
        f = r(/^[^${}\\_^]/).map(function (e) {
          return new je(e);
        }),
        p = r(/^[^\\a-eg-zA-Z]/)
          .or(
            n(`\\`).then(
              r(/^[a-z]+/i)
                .or(r(/^\s+/).result(` `))
                .or(o)
            )
          )
          .then(function (e) {
            var t = k[e];
            return t
              ? t.constructor
                ? new t(e).parser()
                : t(e).parser()
              : l(`unknown command: \\` + e);
          })
          .or(u)
          .or(d)
          .or(f),
        m = n(`{`)
          .then(function () {
            return g;
          })
          .skip(n(`}`)),
        h = s.then(m.or(p.map(e))),
        g = h.many().map(t).skip(s),
        _ = n(`[`)
          .then(
            h
              .then(function (e) {
                return e.join(`latex`) === `]` ? l(``) : c(e);
              })
              .many()
              .map(t)
              .skip(s)
          )
          .skip(n(`]`)),
        v = g;
      return ((v.block = h), (v.optBlock = _), v);
    })();
    oe.maxDepth = function (e) {
      return typeof e == `number` ? e : void 0;
    };
    var Ce = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.cleanLatex = function (e) {
            return e.replace(/(\\[a-z]+) (?![a-z])/gi, `$1`);
          }),
          (t.prototype.exportLatex = function () {
            return this.cleanLatex(this.root.latex());
          }),
          (t.prototype.writeLatex = function (e) {
            var t = this.notify(`edit`).cursor;
            return (t.parent.writeLatex(t, e), this);
          }),
          (t.prototype.classifyLatexForEfficientUpdate = function (e) {
            if (typeof e == `string`) {
              var t = e.match(/-?[0-9.]+$/g);
              if (t && t.length === 1)
                return { latex: e, prefix: e.substr(0, e.length - t[0].length), digits: t[0] };
            }
          }),
          (t.prototype.updateLatexMathEfficiently = function (e, t) {
            var n,
              r,
              i,
              a,
              o = this.root,
              s,
              c = this.classifyLatexForEfficientUpdate(e);
            if (c) {
              if (((s = this.classifyLatexForEfficientUpdate(t)), !s || s.prefix !== c.prefix))
                return !1;
            } else return !1;
            var l = s.digits,
              u = c.digits,
              d = !1,
              f = !1;
            (l[0] === `-` && ((d = !0), (l = l.substr(1))),
              u[0] === `-` && ((f = !0), (u = u.substr(1))));
            for (var p = this.root.getEnd(1), m = [], h = l.length - 1; h >= 0; h--) {
              if (!p || p.ctrlSeq !== l[h] || p.parent !== o) return !1;
              (m.unshift(p), (p = p[-1]));
            }
            if (d && !f) {
              var g = p;
              if (!g || g.ctrlSeq !== `-` || g[1] !== m[0] || g.parent !== o) return !1;
              var _ = g[-1];
              if (_ && _.parent !== o) return !1;
              ((m[0][-1] = g[-1]),
                o.getEnd(-1) === g &&
                  o.setEnds(((n = {}), (n[-1] = m[0]), (n[1] = o.getEnd(1)), n)),
                _ && (_[1] = m[0]),
                g.domFrag().remove());
            }
            if (!d && f) {
              var v = new tt(`-`),
                y = document.createElement(`span`);
              ((y.textContent = `-`), v.setDOM(y));
              var b = m[0][-1];
              (b && (b[1] = v),
                o.getEnd(-1) === m[0] &&
                  o.setEnds(((r = {}), (r[-1] = v), (r[1] = o.getEnd(1)), r)),
                (v.parent = o),
                (v[-1] = m[0][-1]),
                (v[1] = m[0]),
                (m[0][-1] = v),
                v.contactWeld(this.cursor),
                v.domFrag().insertBefore(m[0].domFrag()));
            }
            var x = Math.min(l.length, u.length);
            for (h = 0; h < x; h++) {
              var S = u[h];
              ((p = m[h]),
                p.ctrlSeq !== S &&
                  ((p.ctrlSeq = S),
                  (p.domFrag().oneElement().textContent = S),
                  (p.mathspeakName = S)));
            }
            if (l.length > u.length)
              for (
                p = m[u.length - 1],
                  o.setEnds(((i = {}), (i[-1] = o.getEnd(-1)), (i[1] = p), i)),
                  p[1] = 0,
                  h = l.length - 1;
                h >= x;
                h--
              )
                m[h].domFrag().remove();
            if (u.length > l.length) {
              var C = document.createDocumentFragment();
              for (h = x; h < u.length; h++) {
                var w = document.createElement(`span`);
                ((w.className = `mq-digit`), (w.textContent = u[h]));
                var T = new He(u[h]);
                ((T.parent = o), T.setDOM(w), C.appendChild(w), (T[-1] = o.getEnd(1)), (T[1] = 0));
                var E = T[-1];
                ((E[1] = T), o.setEnds(((a = {}), (a[-1] = o.getEnd(-1)), (a[1] = T), a)));
              }
              o.domFrag().oneElement().appendChild(C);
            }
            var D = this.exportLatex();
            if (D !== e)
              return (
                console.warn(
                  `tried updating latex efficiently but did not work. Attempted: ` +
                    e +
                    ` but wrote: ` +
                    D
                ),
                !1
              );
            var O = o.getEnd(1);
            return (O && O.fixDigitGrouping(this.cursor.options), !0);
          }),
          (t.prototype.renderLatexMathFromScratch = function (e) {
            var t,
              n = this.root,
              r = this.cursor,
              i = P.all,
              a = P.eof,
              o = Se.skip(a).or(i.result(!1)).parse(e);
            if (
              (n.setEnds(((t = {}), (t[-1] = 0), (t[1] = 0), t)),
              o && o.children().adopt(n, 0, 0),
              o)
            ) {
              var s = n.domFrag();
              (s.children().remove(),
                s.oneElement().appendChild(o.html()),
                n.finalizeInsert(r.options, r));
            } else n.domFrag().empty();
          }),
          (t.prototype.renderLatexMath = function (e) {
            var t = this.cursor,
              n = this.root;
            (this.notify(`replace`), t.clearSelection());
            var r = this.exportLatex();
            ((!n.getEnd(-1) || !n.getEnd(1) || r !== e) &&
              (this.updateLatexMathEfficiently(e, r) || this.renderLatexMathFromScratch(e),
              this.updateMathspeak()),
              t.insAtRightEnd(n));
          }),
          (t.prototype.renderLatexText = function (e) {
            var t,
              n = this.root,
              r = this.cursor;
            (n.domFrag().children().slice(1).remove(),
              n.setEnds(((t = {}), (t[-1] = 0), (t[1] = 0), t)),
              delete r.selection,
              r.show().insAtRightEnd(n));
            var i = P.regex,
              a = P.string,
              o = P.eof,
              s = P.all,
              c = a(`$`)
                .then(Se)
                .skip(a(`$`).or(o))
                .map(function (e) {
                  var t = new ze(r);
                  t.createBlocks();
                  var n = t.getEnd(-1);
                  return (e.children().adopt(n, 0, 0), t);
                }),
              l = a(`\\$`)
                .result(`$`)
                .or(i(/^[^$]/))
                .map(function (e) {
                  return new je(e);
                }),
              u = c.or(l).many().skip(o).or(s.result(!1)).parse(e);
            if (u) {
              for (var d = 0; d < u.length; d += 1) u[d].adopt(n, n.getEnd(1), 0);
              (b(n.html()).appendTo(n.domFrag().oneElement()), n.finalizeInsert(r.options, r));
            }
          }),
          t
        );
      })(xe),
      we = function (e) {
        return !1;
      };
    se.prototype.ignoreNextMousedown = we;
    var Te;
    (function () {
      re.onNotify(function (e, t) {
        (t === `edit` || t === `replace`) && Te && Te.cursor === e && Te.cb();
      });
    })();
    var Ee = (function (e) {
      X(t, e);
      function t() {
        return (e !== null && e.apply(this, arguments)) || this;
      }
      return (
        (t.prototype.setOverflowClasses = function () {
          var e = this.root.domFrag().oneElement(),
            t = !1,
            n = !1;
          if (!this.blurred) {
            var r = h(e).width,
              i = e.scrollWidth,
              a = e.scrollLeft;
            ((t = i > r + a), (n = a > 0));
          }
          (e.classList.contains(`mq-editing-overflow-right`) !== t &&
            e.classList.toggle(`mq-editing-overflow-right`),
            e.classList.contains(`mq-editing-overflow-left`) !== n &&
              e.classList.toggle(`mq-editing-overflow-left`));
        }),
        (t.prototype.scrollHoriz = function () {
          var e = this,
            t = this.cursor,
            n = t.selection,
            r = h(this.root.domFrag().oneElement());
          if (t.domFrag().isEmpty() && !n) {
            this.cancelScrollHoriz &&= (this.cancelScrollHoriz(), void 0);
            var i = this.root.domFrag().oneElement(),
              a = i.scrollLeft;
            v(this.getScrollAnimationDuration(), function (t, n, r) {
              t >= 1
                ? ((e.cancelScrollHoriz = void 0), (i.scrollLeft = 0), e.setOverflowClasses())
                : ((e.cancelScrollHoriz = r), n(), (i.scrollLeft = Math.round((1 - t) * a)));
            });
          } else {
            if (n) {
              var o = h(n.domFrag().oneElement()),
                s = o.left - (r.left + 20),
                c = o.right - (r.right - 20);
              if (n.getEnd(-1) === t[1]) {
                if (s < 0) var l = s;
                else if (c > 0) {
                  if (o.left - c < r.left + 20) var l = s;
                  else var l = c;
                } else return;
              } else if (c > 0) var l = c;
              else if (s < 0) {
                if (o.right - s > r.right - 20) var l = c;
                else var l = s;
              } else return;
            } else {
              var u = h(t.domFrag().oneElement()).left;
              if (u > r.right - 20) var l = u - (r.right - 20);
              else if (u < r.left + 20) var l = u - (r.left + 20);
              else return;
            }
            var d = this.root.domFrag().oneElement();
            if (
              !(l < 0 && d.scrollLeft === 0) &&
              !(l > 0 && d.scrollWidth <= d.scrollLeft + r.width)
            ) {
              this.cancelScrollHoriz &&= (this.cancelScrollHoriz(), void 0);
              var f = this.root.domFrag().oneElement(),
                p = f.scrollLeft;
              v(this.getScrollAnimationDuration(), function (t, n, r) {
                t >= 1
                  ? ((e.cancelScrollHoriz = void 0),
                    (f.scrollLeft = Math.round(p + l)),
                    e.setOverflowClasses())
                  : ((e.cancelScrollHoriz = r), n(), (f.scrollLeft = Math.round(p + t * l)));
              });
            }
          }
        }),
        (t.prototype.getScrollAnimationDuration = function () {
          return this.options.scrollAnimationDuration ?? 100;
        }),
        t
      );
    })(
      (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return (
            (t.handleMouseDown = function (e) {
              var r = s(e.target, `.mq-root-block`),
                i =
                  (r && E.getNodeOfElement(r)) || E.getNodeOfElement(t.root.domFrag().oneElement()),
                a = i.domFrag().firstNode().ownerDocument,
                o = i.controller,
                c = o.cursor,
                l = c.blink,
                u = o.getTextareaSpanOrThrow(),
                d = o.getTextareaOrThrow();
              if (
                (e.preventDefault(), (e.target.unselectable = !0), c.options.ignoreNextMousedown(e))
              )
                return;
              c.options.ignoreNextMousedown = we;
              var f = null;
              function p(e) {
                f = e.target;
              }
              function m(e) {
                (c.anticursor || c.startSelection(),
                  o.seek(f, e.clientX, e.clientY).cursor.select(),
                  c.selection &&
                    c.controller.aria
                      .clear()
                      .queue(c.selection.join(`mathspeak`) + ` selected`)
                      .alert(),
                  (f = null));
              }
              function h() {
                (r?.removeEventListener(`mousemove`, p),
                  a?.removeEventListener(`mousemove`, m),
                  a?.removeEventListener(`mouseup`, _),
                  (Te = void 0));
              }
              function g() {
                o.editable ? (c.show(), c.controller.aria.queue(c.parent).alert()) : b(u).detach();
              }
              function _() {
                ((c.blink = l), c.selection || g(), h());
              }
              var v;
              ((Te = {
                cursor: c,
                cb: function () {
                  ((v = !0), (c.blink = l), c.clearSelection(), g(), h());
                },
              }),
                !(o.blurred && (r && !o.editable && b(r).prepend(b(u)), d.focus(), v)) &&
                  ((c.blink = n),
                  o.seek(e.target, e.clientX, e.clientY).cursor.startSelection(),
                  r?.addEventListener(`mousemove`, p),
                  a?.addEventListener(`mousemove`, m),
                  a?.addEventListener(`mouseup`, _)));
            }),
            t
          );
        }
        return (
          (t.prototype.addMouseEventListener = function () {
            this.container.addEventListener(`mousedown`, this.handleMouseDown);
          }),
          (t.prototype.removeMouseEventListener = function () {
            this.container.removeEventListener(`mousedown`, this.handleMouseDown);
          }),
          (t.prototype.seek = function (e, t, n) {
            for (var r = this.notify(`select`).cursor, i; e && ((i = E.getNodeOfElement(e)), !i); )
              e = e.parentElement;
            return (
              (i ||= this.root),
              r.clearSelection().show(),
              i.seek(t, r),
              this.scrollHoriz(),
              this
            );
          }),
          t
        );
      })(Ce)
    );
    se.prototype.substituteTextarea = function () {
      return o(`textarea`, {
        autocapitalize: `off`,
        autocomplete: `off`,
        autocorrect: `off`,
        spellcheck: !1,
        "x-palm-disable-ste-all": !0,
      });
    };
    function De(e, t) {
      return ge(e[0], t);
    }
    se.prototype.substituteKeyboardEvents = De;
    var Oe = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return ((t.selectFn = n), t);
        }
        return (
          (t.prototype.createTextarea = function () {
            this.textareaSpan = o(`span`, { class: `mq-textarea` });
            var e = this.options.substituteTextarea();
            if (!e.nodeType) throw `substituteTextarea() must return a DOM element, got ` + e;
            this.textarea = b(e).appendTo(this.textareaSpan).oneElement();
            var t = this;
            t.cursor.selectionChanged = function () {
              t.selectionChanged();
            };
          }),
          (t.prototype.selectionChanged = function () {
            var e = this;
            e.textareaSelectionTimeout ||= setTimeout(function () {
              e.setTextareaSelection();
            });
          }),
          (t.prototype.setTextareaSelection = function () {
            this.textareaSelectionTimeout = 0;
            var e = ``;
            (this.cursor.selection &&
              ((e = this.cleanLatex(this.cursor.selection.join(`latex`))),
              this.options.statelessClipboard && (e = `$` + e + `$`)),
              this.selectFn(e));
          }),
          (t.prototype.staticMathTextareaEvents = function () {
            var e = this;
            (this.removeTextareaEventListener(`cut`),
              this.removeTextareaEventListener(`paste`),
              e.options.disableCopyPaste
                ? this.removeTextareaEventListener(`copy`)
                : this.addTextareaEventListeners({
                    copy: function () {
                      e.setTextareaSelection();
                    },
                  }),
              this.addStaticFocusBlurListeners(),
              (e.selectFn = function (t) {
                var n = e.getTextareaOrThrow();
                n instanceof HTMLTextAreaElement && ((n.value = t), t && n.select());
              }));
          }),
          (t.prototype.editablesTextareaEvents = function () {
            var e = this,
              t = e.getTextareaOrThrow(),
              n = e.getTextareaSpanOrThrow();
            if (this.options.version < 3) {
              var r = this.options.assertJquery(),
                i = this.options.substituteKeyboardEvents(r(t), this);
              this.selectFn = function (e) {
                i.select(e);
              };
            } else {
              var a = ge(t, this).select;
              this.selectFn = a;
            }
            (b(this.container).prepend(b(n)),
              this.addEditableFocusBlurListeners(),
              this.updateMathspeak());
          }),
          (t.prototype.unbindEditablesEvents = function () {
            var e = this,
              t = e.getTextareaOrThrow(),
              n = e.getTextareaSpanOrThrow();
            ((this.selectFn = function (e) {
              t instanceof HTMLTextAreaElement && ((t.value = e), e && t.select());
            }),
              b(n).remove(),
              this.removeTextareaEventListener(`focus`),
              this.removeTextareaEventListener(`blur`),
              (e.blurred = !0),
              this.removeTextareaEventListener(`cut`),
              this.removeTextareaEventListener(`paste`));
          }),
          (t.prototype.typedText = function (e) {
            if (
              e ===
              `
`
            )
              return this.handle(`enter`);
            var t = this.notify(void 0).cursor;
            (t.parent.write(t, e), this.scrollHoriz());
          }),
          (t.prototype.cut = function () {
            var e = this,
              t = e.cursor;
            t.selection &&
              setTimeout(function () {
                (e.notify(`edit`),
                  t.parent.bubble(function (e) {
                    e.reflow();
                  }),
                  e.options && e.options.onCut && e.options.onCut());
              });
          }),
          (t.prototype.copy = function () {
            this.setTextareaSelection();
          }),
          (t.prototype.paste = function (e) {
            (this.options.statelessClipboard &&
              (e =
                e.slice(0, 1) === `$` && e.slice(-1) === `$`
                  ? e.slice(1, -1)
                  : `\\text{` + e + `}`),
              this.writeLatex(e).cursor.show(),
              this.scrollHoriz(),
              this.options && this.options.onPaste && this.options.onPaste());
          }),
          (t.prototype.setupStaticField = function () {
            ((this.mathspeakSpan = o(`span`, { class: `mq-mathspeak` })),
              b(this.container).prepend(b(this.mathspeakSpan)),
              this.updateMathspeak(),
              (this.blurred = !0),
              this.cursor.hide().parent.blur(this.cursor));
          }),
          (t.prototype.updateMathspeak = function () {
            var e = this,
              t = e.getAriaLabel(),
              n = /[A-Za-z0-9]$/.test(t) ? t + `:` : t,
              r = e.root.mathspeak().trim();
            this.aria.clear();
            var i = e.getTextareaOrThrow();
            e.mathspeakSpan &&
              (i.setAttribute(`aria-label`, ``),
              (e.mathspeakSpan.textContent = (n + ` ` + r).trim()));
          }),
          t
        );
      })(Ee),
      ke = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.finalizeInsert = function (e, t) {
            var n = this;
            (n.postOrder(function (t) {
              t.finalizeTree(e);
            }),
              n.postOrder(function (e) {
                e.contactWeld(t);
              }),
              n.postOrder(function (e) {
                e.blur(t);
              }),
              n.postOrder(function (e) {
                e.reflow();
              }));
            var r = n[1],
              i = n[-1];
            (r && r.siblingCreated(e, -1),
              i && i.siblingCreated(e, 1),
              n.bubble(function (e) {
                e.reflow();
              }));
          }),
          (t.prototype.prepareInsertionAt = function (e) {
            var t = e.options.maxDepth;
            if (t !== void 0) {
              var n = e.depth();
              if (n > t) return !1;
              this.removeNodesDeeperThan(t - n);
            }
            return !0;
          }),
          (t.prototype.removeNodesDeeperThan = function (e) {
            for (var t = 0, n = [[this, t]], r; (r = n.shift()); ) {
              var i = r;
              i[0].children().each(function (r) {
                var a = +(r instanceof Ne);
                ((t = i[1] + a), t <= e ? n.push([r, t]) : (a ? r.children() : r).remove());
              });
            }
          }),
          t
        );
      })(be),
      F = (function () {
        function e(e, t) {
          ((this.childCount = e), (this.render = t));
        }
        return e;
      })(),
      I = (function (e) {
        X(t, e);
        function t(t, n, r) {
          var i = e.call(this) || this;
          return (
            (i.textTemplate = [``]),
            (i.mathspeakTemplate = [``]),
            i.setCtrlSeqHtmlAndText(t, n, r),
            i
          );
        }
        return (
          (t.prototype.setEnds = function (e) {
            (r(`MathCommand ends are never empty`, e[-1] && e[1]), (this.ends = e));
          }),
          (t.prototype.getEnd = function (e) {
            return this.ends[e];
          }),
          (t.prototype.setCtrlSeqHtmlAndText = function (e, t, n) {
            ((this.ctrlSeq ||= e), t && (this.domView = t), n && (this.textTemplate = n));
          }),
          (t.prototype.replaces = function (e) {
            (e.disown(), (this.replacedFragment = e));
          }),
          (t.prototype.isEmpty = function () {
            return this.foldChildren(!0, function (e, t) {
              return e && t.isEmpty();
            });
          }),
          (t.prototype.parser = function () {
            var e = this;
            return Se.block.times(this.numBlocks()).map(function (t) {
              e.blocks = t;
              for (var n = 0; n < t.length; n += 1) t[n].adopt(e, e.getEnd(1), 0);
              return e;
            });
          }),
          (t.prototype.createLeftOf = function (t) {
            var n = this,
              r = n.replacedFragment;
            if ((n.createBlocks(), e.prototype.createLeftOf.call(this, t), r)) {
              var i = n.getEnd(-1);
              (r.adopt(i, 0, 0),
                r.domFrag().appendTo(i.domFrag().oneElement()),
                n.placeCursor(t),
                n.prepareInsertionAt(t));
            }
            (n.finalizeInsert(t.options, t), n.placeCursor(t));
          }),
          (t.prototype.createBlocks = function () {
            for (var e = this, t = e.numBlocks(), n = (e.blocks = Array(t)), r = 0; r < t; r += 1)
              (n[r] = new Ne()).adopt(e, e.getEnd(1), 0);
          }),
          (t.prototype.placeCursor = function (e) {
            e.insAtRightEnd(
              this.foldChildren(this.getEnd(-1), function (e, t) {
                return e.isEmpty() ? e : t;
              })
            );
          }),
          (t.prototype.moveTowards = function (e, t, n) {
            var r;
            n === `up` ? (r = this.upInto) : n === `down` && (r = this.downInto);
            var i = r || this.getEnd(-e);
            (t.insAtDirEnd(-e, i), t.controller.aria.queueDirEndOf(-e).queue(t.parent, !0));
          }),
          (t.prototype.deleteTowards = function (e, t) {
            this.isEmpty() ? (t[e] = this.remove()[e]) : this.moveTowards(e, t);
          }),
          (t.prototype.selectTowards = function (e, t) {
            ((t[-e] = this), (t[e] = this[e]));
          }),
          (t.prototype.selectChildren = function () {
            return new j(this, this);
          }),
          (t.prototype.unselectInto = function (e, t) {
            var n = t.anticursor.ancestors[this.id];
            t.insAtDirEnd(-e, n);
          }),
          (t.prototype.seek = function (e, t) {
            function n(e) {
              var t,
                n = e.domFrag().oneElement(),
                r = h(n).left,
                i = r + n.offsetWidth;
              return ((t = {}), (t[-1] = r), (t[1] = i), t);
            }
            var r = this,
              i = n(r);
            if (e < i[-1]) return t.insLeftOf(r);
            if (e > i[1]) return t.insRightOf(r);
            var a = i[-1];
            r.eachChild(function (o) {
              var s = n(o);
              if (e < s[-1])
                return (
                  e - a < s[-1] - e
                    ? o[-1]
                      ? t.insAtRightEnd(o[-1])
                      : t.insLeftOf(r)
                    : t.insAtLeftEnd(o),
                  !1
                );
              if (e > s[1])
                o[1] ? (a = s[1]) : i[1] - e < e - s[1] ? t.insRightOf(r) : t.insAtRightEnd(o);
              else return (o.seek(e, t), !1);
            });
          }),
          (t.prototype.numBlocks = function () {
            return this.domView.childCount;
          }),
          (t.prototype.html = function () {
            var e = this.blocks;
            r(`domView is defined`, this.domView);
            var t = this.domView.render(e || []);
            return (this.setDOM(t), E.linkElementByCmdNode(t, this), t);
          }),
          (t.prototype.latex = function () {
            return this.foldChildren(this.ctrlSeq || ``, function (e, t) {
              return e + `{` + (t.latex() || ` `) + `}`;
            });
          }),
          (t.prototype.text = function () {
            var e = this,
              t = 0;
            return e.foldChildren(e.textTemplate[t], function (n, r) {
              t += 1;
              var i = r.text();
              return n && e.textTemplate[t] === `(` && i[0] === `(` && i.slice(-1) === `)`
                ? n + i.slice(1, -1) + e.textTemplate[t]
                : n + i + (e.textTemplate[t] || ``);
            });
          }),
          (t.prototype.mathspeak = function () {
            var e = this,
              t = 0;
            return e.foldChildren(
              e.mathspeakTemplate[t] || `Start` + e.ctrlSeq + ` `,
              function (n, r) {
                return (
                  (t += 1),
                  n +
                    ` ` +
                    r.mathspeak() +
                    ` ` +
                    (e.mathspeakTemplate[t] + ` ` || `End` + e.ctrlSeq + ` `)
                );
              }
            );
          }),
          t
        );
      })(ke),
      Ae = (function (e) {
        X(t, e);
        function t(t, n, r, i) {
          var a = e.call(this) || this;
          return (
            a.setCtrlSeqHtmlTextAndMathspeak(
              t,
              n
                ? new F(0, function () {
                    return n.cloneNode(!0);
                  })
                : void 0,
              r,
              i
            ),
            a
          );
        }
        return (
          (t.prototype.setCtrlSeqHtmlTextAndMathspeak = function (t, n, r, i) {
            (!r && t && (r = t.replace(/^\\/, ``)),
              (this.mathspeakName = i || r),
              e.prototype.setCtrlSeqHtmlAndText.call(this, t, n, [r || ``]));
          }),
          (t.prototype.parser = function () {
            return P.succeed(this);
          }),
          (t.prototype.numBlocks = function () {
            return 0;
          }),
          (t.prototype.replaces = function (e) {
            e.remove();
          }),
          (t.prototype.createBlocks = function () {}),
          (t.prototype.moveTowards = function (e, t) {
            (t.domFrag().insDirOf(e, this.domFrag()),
              (t[-e] = this),
              (t[e] = this[e]),
              t.controller.aria.queue(this));
          }),
          (t.prototype.deleteTowards = function (e, t) {
            t[e] = this.remove()[e];
          }),
          (t.prototype.seek = function (e, t) {
            var n = this.domFrag().oneElement();
            return (e - h(n).left < n.offsetWidth / 2 ? t.insLeftOf(this) : t.insRightOf(this), t);
          }),
          (t.prototype.latex = function () {
            return this.ctrlSeq || ``;
          }),
          (t.prototype.text = function () {
            return this.textTemplate.join(``);
          }),
          (t.prototype.mathspeak = function (e) {
            return this.mathspeakName || ``;
          }),
          (t.prototype.placeCursor = function () {}),
          (t.prototype.isEmpty = function () {
            return !0;
          }),
          t
        );
      })(I),
      je = (function (e) {
        X(t, e);
        function t(t, n, r) {
          return e.call(this, t, o(`span`, {}, [n || o.text(t)]), void 0, r) || this;
        }
        return t;
      })(Ae);
    function L(e, t, n) {
      return function () {
        return new je(e, t ? o.entityText(t) : void 0, n);
      };
    }
    var Me = (function (e) {
      X(t, e);
      function t(t, n, r, i, a) {
        var s = this;
        return (
          (s = a
            ? e.call(this, t, o(`span`, {}, [n || o.text(t || ``)]), void 0, i) || this
            : e.call(this, t, o(`span`, { class: `mq-binary-operator` }, n ? [n] : []), r, i) ||
              this),
          s
        );
      }
      return t;
    })(Ae);
    function R(e, t, n, r) {
      return function () {
        return new Me(e, t ? o.entityText(t) : void 0, n, r);
      };
    }
    var Ne = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return ((t.ariaLabel = `block`), t);
      }
      return (
        (t.prototype.join = function (e) {
          return this.foldChildren(``, function (t, n) {
            return t + n[e]();
          });
        }),
        (t.prototype.html = function () {
          var e = document.createDocumentFragment();
          return (
            this.eachChild(function (t) {
              var n = t.html();
              e.appendChild(n);
            }),
            e
          );
        }),
        (t.prototype.latex = function () {
          return this.join(`latex`);
        }),
        (t.prototype.text = function () {
          var e = this.getEnd(-1);
          return e === this.getEnd(1) && e !== 0 ? e.text() : this.join(`text`);
        }),
        (t.prototype.mathspeak = function () {
          var e = ``,
            t = {};
          return (
            this.controller && (t = this.controller.options.autoOperatorNames),
            this.foldChildren([], function (n, r) {
              if (r.isPartOfOperator) e += r.mathspeak();
              else {
                if (e !== ``) {
                  if (t._maxLength > 0) {
                    var i = t[e.toLowerCase()];
                    typeof i == `string` && (e = i);
                  }
                  (n.push(e + ` `), (e = ``));
                }
                var a = r.mathspeak(),
                  o = r.ctrlSeq;
                (isNaN(o) &&
                  o !== `.` &&
                  (!r.parent || !r.parent.parent || !r.parent.parent.isTextBlock()) &&
                  (a = ` ` + a + ` `),
                  n.push(a));
              }
              return n;
            })
              .join(``)
              .replace(/ +(?= )/g, ``)
              .replace(/(\.)([0-9]+)/g, function (e, t, n) {
                return t + n.split(``).join(` `).trim();
              })
          );
        }),
        (t.prototype.keystroke = function (t, n, r) {
          if (r.options.spaceBehavesLikeTab && (t === `Spacebar` || t === `Shift-Spacebar`))
            (n?.preventDefault(), r.escapeDir(t === `Shift-Spacebar` ? -1 : 1, t, n));
          else return e.prototype.keystroke.call(this, t, n, r);
        }),
        (t.prototype.moveOutOf = function (e, t, n) {
          var r;
          if (
            (n === `up` ? (r = this.parent.upInto) : n === `down` && (r = this.parent.downInto),
            !r && this[e])
          ) {
            var i = -e;
            (t.insAtDirEnd(i, this[e]), t.controller.aria.queueDirEndOf(i).queue(t.parent, !0));
          } else (t.insDirOf(e, this.parent), t.controller.aria.queueDirOf(e).queue(this.parent));
        }),
        (t.prototype.selectOutOf = function (e, t) {
          t.insDirOf(e, this.parent);
        }),
        (t.prototype.deleteOutOf = function (e, t) {
          t.unwrapGramp();
        }),
        (t.prototype.seek = function (e, t) {
          var n = this.getEnd(1);
          if (!n) return t.insAtRightEnd(this);
          var r = n.domFrag().oneElement();
          if (h(r).left + r.offsetWidth < e) return t.insAtRightEnd(this);
          if (e < h(this.getEnd(-1).domFrag().oneElement()).left) return t.insAtLeftEnd(this);
          for (; e < h(n.domFrag().oneElement()).left; ) n = n[-1];
          return n.seek(e, t);
        }),
        (t.prototype.chToCmd = function (e, t) {
          var n;
          return e.match(/^[a-eg-zA-Z]$/)
            ? new Ge(e)
            : /^\d$/.test(e)
              ? new He(e)
              : t && t.typingSlashWritesDivisionSymbol && e === `/`
                ? k[`÷`](e)
                : t && t.typingAsteriskWritesTimesSymbol && e === `*`
                  ? k[`×`](e)
                  : t && t.typingPercentWritesPercentOf && e === `%`
                    ? k.percentof(e)
                    : (n = A[e] || k[e])
                      ? n.constructor
                        ? new n(e)
                        : n(e)
                      : new je(e);
        }),
        (t.prototype.write = function (e, t) {
          var n = this.chToCmd(t, e.options);
          (e.selection && n.replaces(e.replaceSelection()),
            e.isTooDeep() ||
              (n.createLeftOf(e.show()),
              t === `/`
                ? e.controller.aria.alert(`over`)
                : e.controller.aria.alert(n.mathspeak({ createdLeftOf: e }))));
        }),
        (t.prototype.writeLatex = function (e, t) {
          var n = P.all,
            r = P.eof,
            i = Se.skip(r).or(n.result(!1)).parse(t);
          if (i && !i.isEmpty() && i.prepareInsertionAt(e)) {
            (i.children().adopt(e.parent, e[-1], e[1]),
              b(i.html()).insertBefore(e.domFrag()),
              (e[-1] = i.getEnd(1)),
              i.finalizeInsert(e.options, e));
            var a = i.getEnd(1),
              o = i.getEnd(-1),
              s = a[1],
              c = o[-1];
            (s && s.siblingCreated(e.options, -1),
              c && c.siblingCreated(e.options, 1),
              e.parent.bubble(function (e) {
                e.reflow();
              }));
          }
        }),
        (t.prototype.focus = function () {
          return (
            this.domFrag().addClass(`mq-hasCursor`),
            this.domFrag().removeClass(`mq-empty`),
            this
          );
        }),
        (t.prototype.blur = function (e) {
          return (
            this.domFrag().removeClass(`mq-hasCursor`),
            this.isEmpty() &&
              (this.domFrag().addClass(`mq-empty`),
              e &&
                this.isQuietEmptyDelimiter(e.options.quietEmptyDelimiters) &&
                this.domFrag().addClass(`mq-quiet-delimiter`)),
            this
          );
        }),
        t
      );
    })(ke);
    ((se.prototype.mouseEvents = !0),
      (ie.StaticMath = function (e) {
        var t = (function (t) {
          X(n, t);
          function n(n) {
            var r = t.call(this, n) || this,
              i = (r.innerFields = []);
            return (
              r.__controller.root.postOrder(function (t) {
                t.registerInnerField(i, e.InnerMathField);
              }),
              r
            );
          }
          return (
            (n.prototype.__mathquillify = function (e, n) {
              return (
                this.config(e),
                t.prototype.mathquillify.call(this, `mq-math-mode`),
                this.__controller.setupStaticField(),
                this.__options.mouseEvents &&
                  (this.__controller.addMouseEventListener(),
                  this.__controller.staticMathTextareaEvents()),
                this
              );
            }),
            (n.prototype.latex = function (n) {
              var r = t.prototype.latex.apply(this, arguments);
              if (arguments.length > 0) {
                var i = (this.innerFields = []);
                (this.__controller.root.postOrder(function (t) {
                  t.registerInnerField(i, e.InnerMathField);
                }),
                  this.__controller.updateMathspeak());
              }
              return r;
            }),
            (n.prototype.setAriaLabel = function (e) {
              return (this.__controller.setAriaLabel(e), this);
            }),
            (n.prototype.getAriaLabel = function () {
              return this.__controller.getAriaLabel();
            }),
            n
          );
        })(e.AbstractMathQuill);
        return ((t.RootBlock = Ne), t);
      }));
    var Pe = (function (e) {
      X(t, e);
      function t() {
        return (e !== null && e.apply(this, arguments)) || this;
      }
      return t;
    })(Ne);
    (pe(Pe.prototype),
      (ie.MathField = function (e) {
        var t = (function (e) {
          X(t, e);
          function t() {
            return (e !== null && e.apply(this, arguments)) || this;
          }
          return (
            (t.prototype.__mathquillify = function (t, r) {
              return (
                this.config(t),
                r > 1 && (this.__controller.root.reflow = n),
                e.prototype.mathquillify.call(this, `mq-editable-field mq-math-mode`),
                delete this.__controller.root.reflow,
                this
              );
            }),
            t
          );
        })(e.EditableField);
        return ((t.RootBlock = Pe), t);
      }),
      (ie.InnerMathField = function (e) {
        return (
          r(`MathField class is defined`, e.MathField),
          (function (e) {
            X(t, e);
            function t() {
              return (e !== null && e.apply(this, arguments)) || this;
            }
            return (
              (t.prototype.makeStatic = function () {
                ((this.__controller.editable = !1),
                  this.__controller.root.blur(),
                  this.__controller.unbindEditablesEvents(),
                  b(this.__controller.container).removeClass(`mq-editable-field`));
              }),
              (t.prototype.makeEditable = function () {
                ((this.__controller.editable = !0),
                  this.__controller.editablesTextareaEvents(),
                  this.__controller.cursor.insAtRightEnd(this.__controller.root),
                  b(this.__controller.container).addClass(`mq-editable-field`));
              }),
              t
            );
          })(e.MathField)
        );
      }));
    var Fe = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return (
          (t.ctrlSeq = `\\text`),
          (t.ariaLabel = `Text`),
          (t.mathspeakTemplate = [`StartText`, `EndText`]),
          t
        );
      }
      return (
        (t.prototype.replaces = function (e) {
          e instanceof O
            ? (this.replacedText = e.remove().domFrag().text())
            : typeof e == `string` && (this.replacedText = e);
        }),
        (t.prototype.setDOMFrag = function (t) {
          e.prototype.setDOM.call(this, t);
          var n = this.getEnd(-1);
          if (n) {
            var r = this.domFrag().children();
            r.isEmpty() || n.setDOM(r.oneText());
          }
          return this;
        }),
        (t.prototype.createLeftOf = function (t) {
          var n = this;
          if ((e.prototype.createLeftOf.call(this, t), t.insAtRightEnd(n), n.replacedText))
            for (var r = 0; r < n.replacedText.length; r += 1) n.write(t, n.replacedText.charAt(r));
          var i = n[1];
          i && i.siblingCreated(t.options, -1);
          var a = n[-1];
          (a && a.siblingCreated(t.options, 1),
            n.bubble(function (e) {
              e.reflow();
            }));
        }),
        (t.prototype.parser = function () {
          var e = this,
            t = P.string,
            n = P.regex;
          return P.optWhitespace
            .then(t(`{`))
            .then(n(/^[^}]*/))
            .skip(t(`}`))
            .map(function (t) {
              return t.length === 0 ? new O(0, 0) : (new Le(t).adopt(e, 0, 0), e);
            });
        }),
        (t.prototype.textContents = function () {
          return this.foldChildren(``, function (e, t) {
            return e + t.textStr;
          });
        }),
        (t.prototype.text = function () {
          return `"` + this.textContents() + `"`;
        }),
        (t.prototype.latex = function () {
          var e = this.textContents();
          return e.length === 0
            ? ``
            : this.ctrlSeq + `{` + e.replace(/\\/g, `\\backslash `).replace(/[{}]/g, `\\$&`) + `}`;
        }),
        (t.prototype.html = function () {
          var e = o(`span`, { class: `mq-text-mode` }, [o.text(this.textContents())]);
          return (this.setDOM(e), E.linkElementByCmdNode(e, this), e);
        }),
        (t.prototype.mathspeak = function (e) {
          return e && e.ignoreShorthand
            ? this.mathspeakTemplate[0] +
                `, ` +
                this.textContents() +
                `, ` +
                this.mathspeakTemplate[1]
            : this.textContents();
        }),
        (t.prototype.isTextBlock = function () {
          return !0;
        }),
        (t.prototype.moveTowards = function (e, t) {
          (t.insAtDirEnd(-e, this), t.controller.aria.queueDirEndOf(-e).queue(t.parent, !0));
        }),
        (t.prototype.moveOutOf = function (e, t) {
          (t.insDirOf(e, this), t.controller.aria.queueDirOf(e).queue(this));
        }),
        (t.prototype.unselectInto = function (e, t) {
          this.moveTowards(e, t);
        }),
        (t.prototype.selectTowards = function (e, t) {
          I.prototype.selectTowards.call(this, e, t);
        }),
        (t.prototype.deleteTowards = function (e, t) {
          I.prototype.deleteTowards.call(this, e, t);
        }),
        (t.prototype.selectOutOf = function (e, t) {
          t.insDirOf(e, this);
        }),
        (t.prototype.deleteOutOf = function (e, t) {
          this.isEmpty() && t.insRightOf(this);
        }),
        (t.prototype.write = function (n, r) {
          if ((n.show().deleteSelection(), r !== `$`)) {
            var i = n[-1];
            i ? i instanceof Le && i.appendText(r) : new Le(r).createLeftOf(n);
          } else if (this.isEmpty())
            (n.insRightOf(this), new je(`\\$`, o.text(`$`)).createLeftOf(n));
          else if (!n[1]) n.insRightOf(this);
          else if (!n[-1]) n.insLeftOf(this);
          else {
            var a = new t(),
              s = this.getEnd(-1);
            (s && (s.disown().domFrag().detach(), s.adopt(a, 0, 0)),
              n.insLeftOf(this),
              e.prototype.createLeftOf.call(a, n));
          }
          (this.bubble(function (e) {
            e.reflow();
          }),
            n.controller.aria.alert(r));
        }),
        (t.prototype.writeLatex = function (e, t) {
          var n = e[-1];
          (n ? n instanceof Le && n.appendText(t) : new Le(t).createLeftOf(e),
            this.bubble(function (e) {
              e.reflow();
            }));
        }),
        (t.prototype.seek = function (e, t) {
          t.hide();
          var n = Ie(this);
          if (n) {
            var r = this.domFrag().children().oneText(),
              i = document.createRange();
            i.selectNodeContents(r);
            var a = i.getClientRects();
            if (a.length === 1) {
              var o = a[0],
                s = o.width,
                c = o.left,
                l = s / this.textContents().length,
                u = Math.round((e - c) / l);
              u <= 0
                ? t.insAtLeftEnd(this)
                : u >= n.textStr.length
                  ? t.insAtRightEnd(this)
                  : t.insLeftOf(n.splitRight(u));
            } else t.insAtLeftEnd(this);
            for (
              var d = e - t.show().getBoundingClientRectWithoutMargin().left,
                f = d && d < 0 ? -1 : 1,
                p = f;
              t[f] && d * p > 0;
            )
              (t[f].moveTowards(f, t),
                (p = d),
                (d = e - t.getBoundingClientRectWithoutMargin().left));
            if ((f * d < -f * p && t[-f].moveTowards(-f, t), !t.anticursor)) {
              var m = t[-1];
              this.anticursorPosition = m && m.textStr.length;
            } else if (t.anticursor.parent === this) {
              var m = t[-1],
                h = m && m.textStr.length;
              if (this.anticursorPosition === h) t.anticursor = te.fromCursor(t);
              else {
                if (this.anticursorPosition < h) {
                  var g = m.splitRight(this.anticursorPosition);
                  t[-1] = g;
                } else var g = t[1].splitRight(this.anticursorPosition - h);
                t.anticursor = new te(this, g[-1], g);
              }
            }
          }
        }),
        (t.prototype.blur = function (e) {
          (Ne.prototype.blur.call(this, e),
            e &&
              (this.textContents() === ``
                ? (this.remove(),
                  e[-1] === this ? (e[-1] = this[-1]) : e[1] === this && (e[1] = this[1]))
                : Ie(this)));
        }),
        (t.prototype.focus = function () {
          Ne.prototype.focus.call(this);
        }),
        t
      );
    })(be);
    function Ie(e) {
      e.domFrag().oneElement().normalize();
      var t = e.domFrag().children();
      if (!t.isEmpty()) {
        var n = t.oneText();
        r(`only node in TextBlock span is Text node`, n.nodeType === 3);
        var i = new Le(n.data);
        return (i.setDOM(n), e.children().disown(), i.adopt(e, 0, 0), i);
      }
    }
    var Le = (function (e) {
      X(t, e);
      function t(t) {
        var n = e.call(this) || this;
        return ((n.textStr = t), n);
      }
      return (
        (t.prototype.html = function () {
          var e = o.text(this.textStr);
          return (this.setDOM(e), e);
        }),
        (t.prototype.appendText = function (e) {
          ((this.textStr += e), this.domFrag().oneText().appendData(e));
        }),
        (t.prototype.prependText = function (e) {
          ((this.textStr = e + this.textStr), this.domFrag().oneText().insertData(0, e));
        }),
        (t.prototype.insTextAtDirEnd = function (e, t) {
          (i(t), t === 1 ? this.appendText(e) : this.prependText(e));
        }),
        (t.prototype.splitRight = function (e) {
          var n = new t(this.textStr.slice(e)).adopt(this.parent, this, this[1]);
          return (
            n.setDOM(this.domFrag().oneText().splitText(e)),
            (this.textStr = this.textStr.slice(0, e)),
            n
          );
        }),
        (t.prototype.endChar = function (e, t) {
          return t.charAt(e === -1 ? 0 : -1 + t.length);
        }),
        (t.prototype.moveTowards = function (e, n) {
          i(e);
          var r = this.endChar(-e, this.textStr),
            a = this[-e];
          return (
            a instanceof t ? a.insTextAtDirEnd(r, e) : new t(r).createDir(-e, n),
            this.deleteTowards(e, n)
          );
        }),
        (t.prototype.mathspeak = function () {
          return this.textStr;
        }),
        (t.prototype.latex = function () {
          return this.textStr;
        }),
        (t.prototype.deleteTowards = function (e, t) {
          if (this.textStr.length > 1) {
            var n;
            (e === 1
              ? (this.domFrag().oneText().deleteData(0, 1),
                (n = this.textStr[0]),
                (this.textStr = this.textStr.slice(1)))
              : (this.domFrag()
                  .oneText()
                  .deleteData(-1 + this.textStr.length, 1),
                (n = this.textStr[this.textStr.length - 1]),
                (this.textStr = this.textStr.slice(0, -1))),
              t.controller.aria.queue(n));
          } else (this.remove(), (t[e] = this[e]), t.controller.aria.queue(this.textStr));
        }),
        (t.prototype.selectTowards = function (e, n) {
          i(e);
          var r = n.anticursor;
          if (r) {
            var a = this.endChar(-e, this.textStr);
            if (r[e] === this) {
              var o = new t(a).createDir(e, n);
              ((r[e] = o), n.insDirOf(e, o));
            } else {
              var s = this[-e];
              if (s instanceof t) s.insTextAtDirEnd(a, e);
              else {
                var o = new t(a).createDir(-e, n),
                  c = n.selection;
                c && o.domFrag().insDirOf(-e, c.domFrag());
              }
              this.textStr.length === 1 && r[-e] === this && (r[-e] = this[-e]);
            }
            return this.deleteTowards(e, n);
          }
        }),
        t
      );
    })(be);
    k.text = k.textnormal = k.textrm = k.textup = k.textmd = Fe;
    function Re(e, t, n, r) {
      return (function (i) {
        X(a, i);
        function a() {
          var n = (i !== null && i.apply(this, arguments)) || this;
          return (
            (n.ctrlSeq = e),
            (n.mathspeakTemplate = [`Start` + t, `End` + t]),
            (n.ariaLabel = t),
            n
          );
        }
        return (
          (a.prototype.html = function () {
            var e = o(n, r, [o.text(this.textContents())]);
            return (this.setDOM(e), E.linkElementByCmdNode(e, this), e);
          }),
          a
        );
      })(Fe);
    }
    ((k.em =
      k.italic =
      k.italics =
      k.emph =
      k.textit =
      k.textsl =
        Re(`\\textit`, `Italic`, `i`, { class: `mq-text-mode` })),
      (k.strong = k.bold = k.textbf = Re(`\\textbf`, `Bold`, `b`, { class: `mq-text-mode` })),
      (k.sf = k.textsf =
        Re(`\\textsf`, `Sans serif font`, `span`, { class: `mq-sans-serif mq-text-mode` })),
      (k.tt = k.texttt =
        Re(`\\texttt`, `Mono space font`, `span`, { class: `mq-monospace mq-text-mode` })),
      (k.textsc = Re(`\\textsc`, `Variable font`, `span`, {
        style: `font-variant:small-caps`,
        class: `mq-text-mode`,
      })),
      (k.uppercase = Re(`\\uppercase`, `Uppercase`, `span`, {
        style: `text-transform:uppercase`,
        class: `mq-text-mode`,
      })),
      (k.lowercase = Re(`\\lowercase`, `Lowercase`, `span`, {
        style: `text-transform:lowercase`,
        class: `mq-text-mode`,
      })));
    var ze = (function (e) {
        X(t, e);
        function t(t) {
          var n = e.call(this, `$`) || this;
          return (
            (n.domView = new F(1, function (e) {
              return o.block(`span`, { class: `mq-math-mode` }, e[0]);
            })),
            (n.cursor = t),
            n
          );
        }
        return (
          (t.prototype.createBlocks = function () {
            e.prototype.createBlocks.call(this);
            var t = this.getEnd(-1);
            ((t.cursor = this.cursor),
              (t.write = function (e, t) {
                t === `$`
                  ? this.isEmpty()
                    ? (e.insRightOf(this.parent),
                      this.parent.deleteTowards(void 0, e),
                      new je(`\\$`, o.text(`$`)).createLeftOf(e.show()))
                    : e[1]
                      ? e[-1]
                        ? Ne.prototype.write.call(this, e, t)
                        : e.insLeftOf(this.parent)
                      : e.insRightOf(this.parent)
                  : Ne.prototype.write.call(this, e, t);
              }));
          }),
          (t.prototype.latex = function () {
            return `$` + this.getEnd(-1).latex() + `$`;
          }),
          t
        );
      })(I),
      Be = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.keystroke = function (t, n, r) {
            if (t !== `Spacebar` && t !== `Shift-Spacebar`)
              return e.prototype.keystroke.call(this, t, n, r);
          }),
          (t.prototype.write = function (e, t) {
            if ((e.show().deleteSelection(), t === `$`)) new ze(e).createLeftOf(e);
            else {
              var n;
              (t === `<` ? (n = o.entityText(`&lt;`)) : t === `>` && (n = o.entityText(`&gt;`)),
                new je(t, n).createLeftOf(e));
            }
          }),
          t
        );
      })(Pe);
    ((ie.TextField = function (e) {
      var t = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.__mathquillify = function () {
            return (e.prototype.mathquillify.call(this, `mq-editable-field mq-text-mode`), this);
          }),
          (t.prototype.latex = function (e) {
            return e
              ? (this.__controller.renderLatexText(e),
                this.__controller.blurred && this.__controller.cursor.hide().parent.blur(),
                this)
              : this.__controller.exportLatex();
          }),
          t
        );
      })(e.EditableField);
      return ((t.RootBlock = Be), t);
    }),
      (k.notin =
        k.cong =
        k.equiv =
        k.oplus =
        k.otimes =
          function (e) {
            return new Me(`\\` + e + ` `, o.entityText(`&` + e + `;`));
          }),
      (k[`∗`] = k.ast = k.star = k.loast = k.lowast = R(`\\ast `, `&lowast;`, `low asterisk`)),
      (k.therefor = k.therefore = R(`\\therefore `, `&there4;`, `therefore`)),
      (k.cuz = k.because = R(`\\because `, `&#8757;`, `because`)),
      (k.prop = k.propto = R(`\\propto `, `&prop;`, `proportional to`)),
      (k[`≈`] = k.asymp = k.approx = R(`\\approx `, `&asymp;`, `approximately equal to`)),
      (k.isin = k.in = R(`\\in `, `&isin;`, `is in`)),
      (k.ni = k.contains = R(`\\ni `, `&ni;`, `is not in`)),
      (k.notni =
        k.niton =
        k.notcontains =
        k.doesnotcontain =
          R(`\\not\\ni `, `&#8716;`, `does not contain`)),
      (k.sub = k.subset = R(`\\subset `, `&sub;`, `subset`)),
      (k.sup = k.supset = k.superset = R(`\\supset `, `&sup;`, `superset`)),
      (k.nsub =
        k.notsub =
        k.nsubset =
        k.notsubset =
          R(`\\not\\subset `, `&#8836;`, `not a subset`)),
      (k.nsup =
        k.notsup =
        k.nsupset =
        k.notsupset =
        k.nsuperset =
        k.notsuperset =
          R(`\\not\\supset `, `&#8837;`, `not a superset`)),
      (k.sube =
        k.subeq =
        k.subsete =
        k.subseteq =
          R(`\\subseteq `, `&sube;`, `subset or equal to`)),
      (k.supe =
        k.supeq =
        k.supsete =
        k.supseteq =
        k.supersete =
        k.superseteq =
          R(`\\supseteq `, `&supe;`, `superset or equal to`)),
      (k.nsube =
        k.nsubeq =
        k.notsube =
        k.notsubeq =
        k.nsubsete =
        k.nsubseteq =
        k.notsubsete =
        k.notsubseteq =
          R(`\\not\\subseteq `, `&#8840;`, `not subset or equal to`)),
      (k.nsupe =
        k.nsupeq =
        k.notsupe =
        k.notsupeq =
        k.nsupsete =
        k.nsupseteq =
        k.notsupsete =
        k.notsupseteq =
        k.nsupersete =
        k.nsuperseteq =
        k.notsupersete =
        k.notsuperseteq =
          R(`\\not\\supseteq `, `&#8841;`, `not superset or equal to`)),
      (k.mathbb = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.createLeftOf = function (e) {}),
          (t.prototype.numBlocks = function () {
            return 1;
          }),
          (t.prototype.parser = function () {
            var e = P.string,
              t = P.regex,
              n = P.optWhitespace;
            return n
              .then(e(`{`))
              .then(n)
              .then(t(/^[NPZQRCH]/))
              .skip(n)
              .skip(e(`}`))
              .map(function (e) {
                var t = k[e];
                return ee(t) ? new t() : t();
              });
          }),
          t
        );
      })(I)),
      (k.N = k.naturals = k.Naturals = L(`\\mathbb{N}`, `&#8469;`, `naturals`)),
      (k.P =
        k.primes =
        k.Primes =
        k.projective =
        k.Projective =
        k.probability =
        k.Probability =
          L(`\\mathbb{P}`, `&#8473;`, `P`)),
      (k.Z = k.integers = k.Integers = L(`\\mathbb{Z}`, `&#8484;`, `integers`)),
      (k.Q = k.rationals = k.Rationals = L(`\\mathbb{Q}`, `&#8474;`, `rationals`)),
      (k.R = k.reals = k.Reals = L(`\\mathbb{R}`, `&#8477;`, `reals`)),
      (k.C =
        k.complex =
        k.Complex =
        k.complexes =
        k.Complexes =
        k.complexplane =
        k.Complexplane =
        k.ComplexPlane =
          L(`\\mathbb{C}`, `&#8450;`, `complexes`)),
      (k.H =
        k.Hamiltonian =
        k.quaternions =
        k.Quaternions =
          L(`\\mathbb{H}`, `&#8461;`, `quaternions`)),
      (k.quad = k.emsp = L(`\\quad `, `    `, `4 spaces`)),
      (k.qquad = L(`\\qquad `, `        `, `8 spaces`)),
      (k.diamond = L(`\\diamond `, `&#9671;`, `diamond`)),
      (k.bigtriangleup = L(`\\bigtriangleup `, `&#9651;`, `triangle up`)),
      (k.ominus = L(`\\ominus `, `&#8854;`, `o minus`)),
      (k.uplus = L(`\\uplus `, `&#8846;`, `disjoint union`)),
      (k.bigtriangledown = L(`\\bigtriangledown `, `&#9661;`, `triangle down`)),
      (k.sqcap = L(`\\sqcap `, `&#8851;`, `greatest lower bound`)),
      (k.triangleleft = L(`\\triangleleft `, `&#8882;`, `triangle left`)),
      (k.sqcup = L(`\\sqcup `, `&#8852;`, `least upper bound`)),
      (k.triangleright = L(`\\triangleright `, `&#8883;`, `triangle right`)),
      (k.odot = k.circledot = L(`\\odot `, `&#8857;`, `circle dot`)),
      (k.bigcirc = L(`\\bigcirc `, `&#9711;`, `circle`)),
      (k.dagger = L(`\\dagger `, `&#0134;`, `dagger`)),
      (k.ddagger = L(`\\ddagger `, `&#135;`, `big dagger`)),
      (k.wr = L(`\\wr `, `&#8768;`, `wreath`)),
      (k.amalg = L(`\\amalg `, `&#8720;`, `amalgam`)),
      (k.models = L(`\\models `, `&#8872;`, `models`)),
      (k.prec = L(`\\prec `, `&#8826;`, `precedes`)),
      (k.succ = L(`\\succ `, `&#8827;`, `succeeds`)),
      (k.preceq = L(`\\preceq `, `&#8828;`, `precedes or equals`)),
      (k.succeq = L(`\\succeq `, `&#8829;`, `succeeds or equals`)),
      (k.simeq = L(`\\simeq `, `&#8771;`, `similar or equal to`)),
      (k.mid = L(`\\mid `, `&#8739;`, `divides`)),
      (k.ll = L(`\\ll `, `&#8810;`, `ll`)),
      (k.gg = L(`\\gg `, `&#8811;`, `gg`)),
      (k.parallel = L(`\\parallel `, `&#8741;`, `parallel with`)),
      (k.nparallel = L(`\\nparallel `, `&#8742;`, `not parallel with`)),
      (k.bowtie = L(`\\bowtie `, `&#8904;`, `bowtie`)),
      (k.sqsubset = L(`\\sqsubset `, `&#8847;`, `square subset`)),
      (k.sqsupset = L(`\\sqsupset `, `&#8848;`, `square superset`)),
      (k.smile = L(`\\smile `, `&#8995;`, `smile`)),
      (k.sqsubseteq = L(`\\sqsubseteq `, `&#8849;`, `square subset or equal to`)),
      (k.sqsupseteq = L(`\\sqsupseteq `, `&#8850;`, `square superset or equal to`)),
      (k.doteq = L(`\\doteq `, `&#8784;`, `dotted equals`)),
      (k.frown = L(`\\frown `, `&#8994;`, `frown`)),
      (k.vdash = L(`\\vdash `, `&#8870;`, `v dash`)),
      (k.dashv = L(`\\dashv `, `&#8867;`, `dash v`)),
      (k.nless = L(`\\nless `, `&#8814;`, `not less than`)),
      (k.ngtr = L(`\\ngtr `, `&#8815;`, `not greater than`)),
      (k.longleftarrow = L(`\\longleftarrow `, `&#8592;`, `left arrow`)),
      (k.longrightarrow = L(`\\longrightarrow `, `&#8594;`, `right arrow`)),
      (k.Longleftarrow = L(`\\Longleftarrow `, `&#8656;`, `left arrow`)),
      (k.Longrightarrow = L(`\\Longrightarrow `, `&#8658;`, `right arrow`)),
      (k.longleftrightarrow = L(`\\longleftrightarrow `, `&#8596;`, `left and right arrow`)),
      (k.updownarrow = L(`\\updownarrow `, `&#8597;`, `up and down arrow`)),
      (k.Longleftrightarrow = L(`\\Longleftrightarrow `, `&#8660;`, `left and right arrow`)),
      (k.Updownarrow = L(`\\Updownarrow `, `&#8661;`, `up and down arrow`)),
      (k.mapsto = L(`\\mapsto `, `&#8614;`, `maps to`)),
      (k.nearrow = L(`\\nearrow `, `&#8599;`, `northeast arrow`)),
      (k.hookleftarrow = L(`\\hookleftarrow `, `&#8617;`, `hook left arrow`)),
      (k.hookrightarrow = L(`\\hookrightarrow `, `&#8618;`, `hook right arrow`)),
      (k.searrow = L(`\\searrow `, `&#8600;`, `southeast arrow`)),
      (k.leftharpoonup = L(`\\leftharpoonup `, `&#8636;`, `left harpoon up`)),
      (k.rightharpoonup = L(`\\rightharpoonup `, `&#8640;`, `right harpoon up`)),
      (k.swarrow = L(`\\swarrow `, `&#8601;`, `southwest arrow`)),
      (k.leftharpoondown = L(`\\leftharpoondown `, `&#8637;`, `left harpoon down`)),
      (k.rightharpoondown = L(`\\rightharpoondown `, `&#8641;`, `right harpoon down`)),
      (k.nwarrow = L(`\\nwarrow `, `&#8598;`, `northwest arrow`)),
      (k.ldots = L(`\\ldots `, `&#8230;`, `l dots`)),
      (k.cdots = L(`\\cdots `, `&#8943;`, `c dots`)),
      (k.vdots = L(`\\vdots `, `&#8942;`, `v dots`)),
      (k.ddots = L(`\\ddots `, `&#8945;`, `d dots`)),
      (k.surd = L(`\\surd `, `&#8730;`, `unresolved root`)),
      (k.triangle = L(`\\triangle `, `&#9651;`, `triangle`)),
      (k.ell = L(`\\ell `, `&#8467;`, `ell`)),
      (k.top = L(`\\top `, `&#8868;`, `top`)),
      (k.flat = L(`\\flat `, `&#9837;`, `flat`)),
      (k.natural = L(`\\natural `, `&#9838;`, `natural`)),
      (k.sharp = L(`\\sharp `, `&#9839;`, `sharp`)),
      (k.wp = L(`\\wp `, `&#8472;`, `wp`)),
      (k.bot = L(`\\bot `, `&#8869;`, `bot`)),
      (k.clubsuit = L(`\\clubsuit `, `&#9827;`, `club suit`)),
      (k.diamondsuit = L(`\\diamondsuit `, `&#9826;`, `diamond suit`)),
      (k.heartsuit = L(`\\heartsuit `, `&#9825;`, `heart suit`)),
      (k.spadesuit = L(`\\spadesuit `, `&#9824;`, `spade suit`)),
      (k.parallelogram = L(`\\parallelogram `, `&#9649;`, `parallelogram`)),
      (k.square = L(`\\square `, `&#11036;`, `square`)),
      (k.oint = L(`\\oint `, `&#8750;`, `o int`)),
      (k.bigcap = L(`\\bigcap `, `&#8745;`, `big cap`)),
      (k.bigcup = L(`\\bigcup `, `&#8746;`, `big cup`)),
      (k.bigsqcup = L(`\\bigsqcup `, `&#8852;`, `big square cup`)),
      (k.bigvee = L(`\\bigvee `, `&#8744;`, `big vee`)),
      (k.bigwedge = L(`\\bigwedge `, `&#8743;`, `big wedge`)),
      (k.bigodot = L(`\\bigodot `, `&#8857;`, `big o dot`)),
      (k.bigotimes = L(`\\bigotimes `, `&#8855;`, `big o times`)),
      (k.bigoplus = L(`\\bigoplus `, `&#8853;`, `big o plus`)),
      (k.biguplus = L(`\\biguplus `, `&#8846;`, `big u plus`)),
      (k.lfloor = L(`\\lfloor `, `&#8970;`, `left floor`)),
      (k.rfloor = L(`\\rfloor `, `&#8971;`, `right floor`)),
      (k.lceil = L(`\\lceil `, `&#8968;`, `left ceiling`)),
      (k.rceil = L(`\\rceil `, `&#8969;`, `right ceiling`)),
      (k.opencurlybrace = k.lbrace = L(`\\lbrace `, `{`, `left brace`)),
      (k.closecurlybrace = k.rbrace = L(`\\rbrace `, `}`, `right brace`)),
      (k.lbrack = L(`[`, `left bracket`)),
      (k.rbrack = L(`]`, `right bracket`)),
      (k.slash = L(`/`, `slash`)),
      (k.vert = L(`|`, `vertical bar`)),
      (k.perp = k.perpendicular = L(`\\perp `, `&perp;`, `perpendicular`)),
      (k.nabla = k.del = L(`\\nabla `, `&nabla;`)),
      (k.hbar = L(`\\hbar `, `&#8463;`, `horizontal bar`)),
      (k.AA = k.Angstrom = k.angstrom = L(`\\text\\AA `, `&#8491;`, `AA`)),
      (k.ring = k.circ = k.circle = L(`\\circ `, `&#8728;`, `circle`)),
      (k.bull = k.bullet = L(`\\bullet `, `&bull;`, `bullet`)),
      (k.setminus = k.smallsetminus = L(`\\setminus `, `&#8726;`, `set minus`)),
      (k.not = k[`¬`] = k.neg = L(`\\neg `, `&not;`, `not`)),
      (k[`…`] =
        k.dots =
        k.ellip =
        k.hellip =
        k.ellipsis =
        k.hellipsis =
          L(`\\dots `, `&hellip;`, `ellipsis`)),
      (k.converges =
        k.darr =
        k.dnarr =
        k.dnarrow =
        k.downarrow =
          L(`\\downarrow `, `&darr;`, `converges with`)),
      (k.dArr = k.dnArr = k.dnArrow = k.Downarrow = L(`\\Downarrow `, `&dArr;`, `down arrow`)),
      (k.diverges = k.uarr = k.uparrow = L(`\\uparrow `, `&uarr;`, `diverges from`)),
      (k.uArr = k.Uparrow = L(`\\Uparrow `, `&uArr;`, `up arrow`)),
      (k.rarr = k.rightarrow = L(`\\rightarrow `, `&rarr;`, `right arrow`)),
      (k.implies = R(`\\Rightarrow `, `&rArr;`, `implies`)),
      (k.rArr = k.Rightarrow = L(`\\Rightarrow `, `&rArr;`, `right arrow`)),
      (k.gets = R(`\\gets `, `&larr;`, `gets`)),
      (k.larr = k.leftarrow = L(`\\leftarrow `, `&larr;`, `left arrow`)),
      (k.impliedby = R(`\\Leftarrow `, `&lArr;`, `implied by`)),
      (k.lArr = k.Leftarrow = L(`\\Leftarrow `, `&lArr;`, `left arrow`)),
      (k.harr =
        k.lrarr =
        k.leftrightarrow =
          L(`\\leftrightarrow `, `&harr;`, `left and right arrow`)),
      (k.iff = R(`\\Leftrightarrow `, `&hArr;`, `if and only if`)),
      (k.hArr =
        k.lrArr =
        k.Leftrightarrow =
          L(`\\Leftrightarrow `, `&hArr;`, `left and right arrow`)),
      (k.Re = k.Real = k.real = L(`\\Re `, `&real;`, `real`)),
      (k.Im =
        k.imag =
        k.image =
        k.imagin =
        k.imaginary =
        k.Imaginary =
          L(`\\Im `, `&image;`, `imaginary`)),
      (k.part = k.partial = L(`\\partial `, `&part;`, `partial`)),
      (k.pounds = L(`\\pounds `, `&pound;`)),
      (k.alef = k.alefsym = k.aleph = k.alephsym = L(`\\aleph `, `&alefsym;`, `alef sym`)),
      (k.xist =
        k.xists =
        k.exist =
        k.exists =
          L(`\\exists `, `&exist;`, `there exists at least 1`)),
      (k.nexists = k.nexist = L(`\\nexists `, `&#8708;`, `there is no`)),
      (k.and = k.land = k.wedge = R(`\\wedge `, `&and;`, `and`)),
      (k.or = k.lor = k.vee = R(`\\vee `, `&or;`, `or`)),
      (k.o =
        k.O =
        k.empty =
        k.emptyset =
        k.oslash =
        k.Oslash =
        k.nothing =
        k.varnothing =
          R(`\\varnothing `, `&empty;`, `nothing`)),
      (k.cup = k.union = R(`\\cup `, `&cup;`, `union`)),
      (k.cap = k.intersect = k.intersection = R(`\\cap `, `&cap;`, `intersection`)),
      (k.deg = k.degree = L(`\\degree `, `&deg;`, `degrees`)),
      (k.ang = k.angle = L(`\\angle `, `&ang;`, `angle`)),
      (k.measuredangle = L(`\\measuredangle `, `&#8737;`, `measured angle`)));
    var Ve = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.finalizeTree = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (t.prototype.siblingDeleted = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (t.prototype.siblingCreated = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (t.prototype.sharedSiblingMethod = function (e, n) {
            (n !== -1 && this[1] instanceof t) || this.fixDigitGrouping(e);
          }),
          (t.prototype.fixDigitGrouping = function (e) {
            if (e.enableDigitGrouping) {
              var t = this,
                n = this,
                r = 0,
                i = [],
                a = `\\ `,
                o = `.`,
                s = t;
              do
                if (/^[0-9]$/.test(s.ctrlSeq)) t = s;
                else if (s.ctrlSeq === a) ((t = s), (r += 1));
                else if (s.ctrlSeq === o) ((t = s), i.push(s));
                else break;
              while ((s = t[-1]));
              for (; (s = n[1]); )
                if (/^[0-9]$/.test(s.ctrlSeq)) n = s;
                else if (s.ctrlSeq === a) ((n = s), (r += 1));
                else if (s.ctrlSeq === o) ((n = s), i.push(s));
                else break;
              for (; n !== t && t && t.ctrlSeq === a; ) ((t = t[1]), --r);
              for (; n !== t && n && n.ctrlSeq === a; ) ((n = n[-1]), --r);
              (t === n && t && t.ctrlSeq === a) ||
                (r > 0 || i.length > 1
                  ? this.removeGroupingBetween(t, n)
                  : i[0]
                    ? (i[0] !== t && this.addGroupingBetween(i[0][-1], t),
                      i[0] !== n && this.removeGroupingBetween(i[0][1], n))
                    : this.addGroupingBetween(n, t));
            }
          }),
          (t.prototype.removeGroupingBetween = function (e, n) {
            var r = e;
            do if ((r instanceof t && r.setGroupingClass(void 0), !r || r === n)) break;
            while ((r = r[1]));
          }),
          (t.prototype.addGroupingBetween = function (e, n) {
            for (var r = e, i = 0, a = 0, r = e; r && ((a += 1), r !== n); ) r = r[-1];
            var o = a % 3;
            o === 0 && (o = 3);
            for (var r = e; r; ) {
              i += 1;
              var s = void 0;
              if (
                (a >= 4 &&
                  (i === a
                    ? (s = `mq-group-leading-` + o)
                    : i % 3 == 0 && i !== a && (s = `mq-group-start`),
                  (s ||= `mq-group-other`)),
                r instanceof t && r.setGroupingClass(s),
                r === n)
              )
                break;
              r = r[-1];
            }
          }),
          (t.prototype.setGroupingClass = function (e) {
            this._groupingClass !== e &&
              (this._groupingClass && this.domFrag().removeClass(this._groupingClass),
              e && this.domFrag().addClass(e),
              (this._groupingClass = e));
          }),
          t
        );
      })(Ae),
      He = (function (e) {
        X(t, e);
        function t(t, n) {
          return e.call(this, t, o(`span`, { class: `mq-digit` }, [o.text(t)]), void 0, n) || this;
        }
        return (
          (t.prototype.createLeftOf = function (t) {
            var n = t[-1],
              r = n && n[-1],
              i = t.parent.parent instanceof ht ? t.parent.parent.sub : void 0;
            t.options.autoSubscriptNumerals &&
            t.parent !== i &&
            ((n instanceof Ue && n.isItalic !== !1) ||
              (n instanceof ht && r instanceof Ue && r.isItalic !== !1))
              ? (new _t().createLeftOf(t),
                e.prototype.createLeftOf.call(this, t),
                t.insRightOf(t.parent.parent))
              : e.prototype.createLeftOf.call(this, t);
          }),
          (t.prototype.mathspeak = function (t) {
            if (t && t.createdLeftOf) {
              var n = t.createdLeftOf,
                r = n[-1],
                i = r && r[-1],
                a = n.parent.parent instanceof ht ? n.parent.parent.sub : void 0;
              if (
                n.options.autoSubscriptNumerals &&
                n.parent !== a &&
                ((r instanceof Ue && r.isItalic !== !1) ||
                  (n[-1] instanceof ht && i instanceof Ue && i.isItalic !== !1))
              )
                return `Subscript ` + e.prototype.mathspeak.call(this) + ` Baseline`;
            }
            return e.prototype.mathspeak.call(this);
          }),
          t
        );
      })(Ve),
      Ue = (function (e) {
        X(t, e);
        function t(t, n) {
          return e.call(this, t, o(`var`, {}, [n || o.text(t)])) || this;
        }
        return (
          (t.prototype.text = function () {
            var e = this.ctrlSeq || ``;
            return (
              this.isPartOfOperator
                ? e[0] == `\\`
                  ? (e = e.slice(1, e.length))
                  : e[e.length - 1] == ` ` && (e = e.slice(0, -1))
                : (this[-1] &&
                    !(this[-1] instanceof t) &&
                    !(this[-1] instanceof Me) &&
                    this[-1].ctrlSeq !== `\\ ` &&
                    (e = `*` + e),
                  this[1] && !(this[1] instanceof Me) && !(this[1] instanceof ht) && (e += `*`)),
              e
            );
          }),
          (t.prototype.mathspeak = function () {
            var t = this.ctrlSeq || ``;
            return this.isPartOfOperator ||
              t.length > 1 ||
              (this.parent && this.parent.parent && this.parent.parent.isTextBlock())
              ? e.prototype.mathspeak.call(this)
              : `"` + t + `"`;
          }),
          t
        );
      })(Ae);
    function We(e, t, n) {
      return function () {
        return new Ue(e, o.entityText(t));
      };
    }
    ((se.prototype.autoCommands = { _maxLength: 0 }),
      (oe.autoCommands = function (e) {
        if (typeof e != `string` || !/^[a-z]+(?: [a-z]+)*$/i.test(e))
          throw `"` + e + `" not a space-delimited list of only letters`;
        for (var n = e.split(` `), r = {}, i = 0, a = 0; a < n.length; a += 1) {
          var o = n[a];
          if (o.length < 2) throw `autocommand "` + o + `" not minimum length of 2`;
          if (k[o] === Ye) throw `"` + o + `" is a built-in operator name`;
          ((r[o] = 1), (i = t(i, o.length)));
        }
        return ((r._maxLength = i), r);
      }),
      (se.prototype.quietEmptyDelimiters = {}),
      (oe.quietEmptyDelimiters = function (e) {
        e === void 0 && (e = ``);
        for (var t = e.split(` `), n = {}, r = 0; r < t.length; r += 1) {
          var i = t[r];
          n[i] = 1;
        }
        return n;
      }),
      (se.prototype.autoParenthesizedFunctions = { _maxLength: 0 }),
      (oe.autoParenthesizedFunctions = function (e) {
        if (typeof e != `string` || !/^[a-z]+(?: [a-z]+)*$/i.test(e))
          throw `"` + e + `" not a space-delimited list of only letters`;
        for (var n = e.split(` `), r = {}, i = 0, a = 0; a < n.length; a += 1) {
          var o = n[a];
          if (o.length < 2) throw `autocommand "` + o + `" not minimum length of 2`;
          ((r[o] = 1), (i = t(i, o.length)));
        }
        return ((r._maxLength = i), r);
      }));
    var Ge = (function (t) {
        X(n, t);
        function n(e) {
          var n = t.call(this, e) || this;
          return ((n.letter = e), n);
        }
        return (
          (n.prototype.checkAutoCmds = function (e) {
            if (!this.shouldIgnoreSubstitutionInSimpleSubscript(e.options)) {
              var t = e.options.autoCommands,
                r = t._maxLength || 0;
              if (r > 0) {
                for (
                  var i = ``, a = this, o = 0;
                  a instanceof n && a.ctrlSeq === a.letter && o < r;
                )
                  ((i = a.letter + i), (a = a[-1]), (o += 1));
                for (; i.length; ) {
                  if (t.hasOwnProperty(i) && !this.endsLongerOperatorName(e.options, i.length)) {
                    for (a = this, o = 1; a && o < i.length; o += 1, a = a[-1]);
                    (new O(a, this).remove(), (e[-1] = a[-1]));
                    var s = k[i];
                    return (ee(s) ? new s(i) : s(i)).createLeftOf(e);
                  }
                  i = i.slice(1);
                }
              }
            }
          }),
          (n.prototype.endsLongerOperatorName = function (e, t) {
            for (
              var r = e.autoOperatorNames, i = ``, a = this, o = 0;
              a instanceof n && o < (r._maxLength || 0);
              o++, a = a[-1]
            )
              if (((i = a.letter + i), i.length > t && r.hasOwnProperty(i))) return !0;
            return !1;
          }),
          (n.prototype.autoParenthesize = function (e) {
            var t = e.parent.getEnd(1);
            if (
              !(t && t instanceof Et && t.ctrlSeq === `\\left(`) &&
              !this.shouldIgnoreSubstitutionInSimpleSubscript(e.options)
            ) {
              for (
                var r = ``,
                  i = this,
                  a = 0,
                  o = e.options.autoParenthesizedFunctions,
                  s = o._maxLength || 0,
                  c = e.options.autoOperatorNames;
                i instanceof n && a < s;
              )
                ((r = i.letter + r), (i = i[-1]), (a += 1));
              for (; r.length; ) {
                if (o.hasOwnProperty(r) && c.hasOwnProperty(r)) return e.parent.write(e, `(`);
                r = r.slice(1);
              }
            }
          }),
          (n.prototype.createLeftOf = function (e) {
            (t.prototype.createLeftOf.call(this, e),
              this.checkAutoCmds(e),
              this.autoParenthesize(e));
          }),
          (n.prototype.italicize = function (e) {
            return (
              (this.isItalic = e),
              (this.isPartOfOperator = !e),
              this.domFrag().toggleClass(`mq-operator-name`, !e),
              this
            );
          }),
          (n.prototype.finalizeTree = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (n.prototype.siblingDeleted = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (n.prototype.siblingCreated = function (e, t) {
            this.sharedSiblingMethod(e, t);
          }),
          (n.prototype.sharedSiblingMethod = function (e, t) {
            (t !== -1 && this[1] instanceof n) || this.autoUnItalicize(e);
          }),
          (n.prototype.autoUnItalicize = function (t) {
            var r = t.autoOperatorNames;
            if (r._maxLength !== 0 && !this.shouldIgnoreSubstitutionInSimpleSubscript(t)) {
              for (var i = this.letter, a = this[-1]; a instanceof n; a = a[-1]) i = a.letter + i;
              for (var o = this[1]; o instanceof n; o = o[1]) i += o.letter;
              var s = a && a[1],
                c = o && o[-1];
              new O(s || this.parent.getEnd(-1), c || this.parent.getEnd(1)).each(function (e) {
                e instanceof n &&
                  (e.italicize(!0).domFrag().removeClass(`mq-first mq-last mq-followed-by-supsub`),
                  (e.ctrlSeq = e.letter));
              });
              var l = r._maxLength || 0;
              outer: for (
                var u = 0, d = a[1] || this.parent.getEnd(-1);
                d && u < i.length;
                u += 1, d = d[1]
              )
                for (var f = e(l, i.length - u); f > 0; --f) {
                  var p = i.slice(u, u + f),
                    m = void 0;
                  if (r.hasOwnProperty(p)) {
                    for (var h = 0, g = d; h < f; h += 1, g = g[1])
                      g instanceof n && (g.italicize(!1), (m = g));
                    var _ = Ke.hasOwnProperty(p);
                    if (
                      ((d.ctrlSeq = (_ ? `\\` : `\\operatorname{`) + d.ctrlSeq),
                      (m.ctrlSeq += _ ? ` ` : `}`),
                      qe.hasOwnProperty(p))
                    ) {
                      var v = m[-1],
                        y = v && v[-1];
                      (y && y[-1]).domFrag().addClass(`mq-last`);
                    }
                    if (
                      (this.shouldOmitPadding(d[-1]) || d.domFrag().addClass(`mq-first`),
                      !this.shouldOmitPadding(m[1]))
                    ) {
                      if (m[1] instanceof ht) {
                        var b = m[1];
                        (b.siblingCreated = b.siblingDeleted =
                          function () {
                            b.domFrag().toggleClass(
                              `mq-after-operator-name`,
                              !(b[1] instanceof Et)
                            );
                          })();
                      } else m.domFrag().toggleClass(`mq-last`, !(m[1] instanceof Et));
                    }
                    ((u += f - 1), (d = m));
                    continue outer;
                  }
                }
            }
          }),
          (n.prototype.shouldOmitPadding = function (e) {
            return !e || e.ctrlSeq === `.` || e instanceof Me || e instanceof vt;
          }),
          n
        );
      })(Ue),
      Ke = {};
    se.prototype.autoOperatorNames = Je();
    var qe = { limsup: 1, liminf: 1, projlim: 1, injlim: 1 };
    function Je() {
      for (
        var e = { _maxLength: 9 },
          t =
            `arg deg det dim exp gcd hom inf ker lg lim ln log max min sup limsup liminf injlim projlim Pr`.split(
              ` `
            ),
          n = 0;
        n < t.length;
        n += 1
      )
        Ke[t[n]] = e[t[n]] = 1;
      for (
        var r = `sin cos tan arcsin arccos arctan sinh cosh tanh sec csc cot coth`.split(` `),
          n = 0;
        n < r.length;
        n += 1
      )
        Ke[r[n]] = 1;
      for (
        var i = `sin cos tan sec cosec csc cotan cot ctg`.split(` `), n = 0;
        n < i.length;
        n += 1
      )
        e[i[n]] =
          e[`arc` + i[n]] =
          e[i[n] + `h`] =
          e[`ar` + i[n] + `h`] =
          e[`arc` + i[n] + `h`] =
            1;
      for (var a = `gcf hcf lcm proj span`.split(` `), n = 0; n < a.length; n += 1) e[a[n]] = 1;
      return e;
    }
    oe.autoOperatorNames = function (e) {
      if (typeof e != `string`) throw `"` + e + `" not a space-delimited list`;
      if (!/^[a-z\|\-]+(?: [a-z\|\-]+)*$/i.test(e))
        throw `"` + e + `" not a space-delimited list of letters or "|"`;
      for (var n = e.split(` `), r = {}, i = 0, a = 0; a < n.length; a += 1) {
        var o = n[a];
        if (o.length < 2) throw `"` + o + `" not minimum length of 2`;
        if (o.indexOf(`|`) < 0) ((r[o] = o), (i = t(i, o.length)));
        else {
          var s = o.split(`|`);
          if (s.length > 2) throw `"` + o + `" has more than 1 mathspeak delimiter`;
          if (s[0].length < 2) throw `"` + o[0] + `" not minimum length of 2`;
          ((r[s[0]] = s[1].replace(/-/g, ` `)), (i = t(i, s[0].length)));
        }
      }
      return ((r._maxLength = i), r);
    };
    var Ye = (function (e) {
      X(t, e);
      function t(t) {
        return e.call(this, t || ``) || this;
      }
      return (
        (t.prototype.createLeftOf = function (e) {
          for (var t = this.ctrlSeq, n = 0; n < t.length; n += 1)
            new Ge(t.charAt(n)).createLeftOf(e);
        }),
        (t.prototype.parser = function () {
          for (var e = this.ctrlSeq, t = new Ne(), n = 0; n < e.length; n += 1)
            new Ge(e.charAt(n)).adopt(t, t.getEnd(1), 0);
          return P.succeed(t.children());
        }),
        t
      );
    })(Ae);
    for (var Xe in se.prototype.autoOperatorNames)
      se.prototype.autoOperatorNames.hasOwnProperty(Xe) && (k[Xe] = Ye);
    ((k.operatorname = (function (e) {
      X(t, e);
      function t() {
        return (e !== null && e.apply(this, arguments)) || this;
      }
      return (
        (t.prototype.createLeftOf = function () {}),
        (t.prototype.numBlocks = function () {
          return 1;
        }),
        (t.prototype.parser = function () {
          return Se.block.map(function (e) {
            var t = !0,
              n = ``,
              r = e.children();
            return (
              r.each(function (e) {
                e instanceof Ge ? (n += e.letter) : (t = !1);
              }),
              t && n === `ans` ? bt() : r
            );
          });
        }),
        t
      );
    })(I)),
      (k.f = (function (e) {
        X(t, e);
        function t() {
          var t = this,
            n = `f`;
          return (
            (t = e.call(this, n) || this),
            (t.letter = n),
            (t.domView = new F(0, function () {
              return o(`var`, { class: `mq-f` }, [o.text(`f`)]);
            })),
            t
          );
        }
        return (
          (t.prototype.italicize = function (t) {
            return (
              this.domFrag().eachElement(function (e) {
                return (e.textContent = `f`);
              }),
              this.domFrag().toggleClass(`mq-f`, t),
              e.prototype.italicize.call(this, t)
            );
          }),
          t
        );
      })(Ge)),
      (k[` `] = k.space =
        function () {
          return new Ve(`\\ `, o(`span`, {}, [o.text(c)]), ` `);
        }));
    var Ze = (function (e) {
      X(t, e);
      function t() {
        return e.call(this, `.`, o(`span`, { class: `mq-digit` }, [o.text(`.`)]), `.`) || this;
      }
      return (
        (t.prototype.createLeftOf = function (n) {
          var r = n[-1],
            i = r && r[-1],
            a = n.parent && n.parent.parent;
          r instanceof t && i instanceof t && a instanceof Et && a.sides[-1].ch === `[`
            ? ((n[-1] = i[-1]), new O(i, r).remove(), k.ldots(`\\ldots`).createLeftOf(n))
            : e.prototype.createLeftOf.call(this, n);
        }),
        t
      );
    })(Ve);
    ((k[`.`] = function () {
      return new Ze();
    }),
      (k[`'`] = k.prime = L(`'`, `&prime;`, `prime`)),
      (k[`″`] = k.dprime = L(`″`, `&Prime;`, `double prime`)),
      (k.backslash = L(`\\backslash `, `\\`, `backslash`)),
      (A[`\\`] ||= k.backslash),
      (k.$ = L(`\\$`, `$`, `dollar`)),
      (k.square = L(`\\square `, `□`, `square`)),
      (k.mid = L(`\\mid `, `∣`, `mid`)));
    var Qe = (function (e) {
      X(t, e);
      function t(t, n, r) {
        return e.call(this, t, o(`span`, { class: `mq-nonSymbola` }, [n || o.text(t)])) || this;
      }
      return t;
    })(Ae);
    ((k[`@`] = function () {
      return new Qe(`@`);
    }),
      (k[`&`] = function () {
        return new Qe(`\\&`, o.entityText(`&amp;`), `and`);
      }),
      (k[`%`] = (function (e) {
        X(t, e);
        function t() {
          return e.call(this, `\\%`, o.text(`%`), `percent`) || this;
        }
        return (
          (t.prototype.parser = function () {
            var t = P.optWhitespace,
              n = P.string;
            return t
              .then(
                n(`\\operatorname{of}`).map(function () {
                  return xt();
                })
              )
              .or(e.prototype.parser.call(this));
          }),
          t
        );
      })(Qe)),
      (k[`∥`] = k.parallel = L(`\\parallel `, `&#x2225;`, `parallel`)),
      (k[`∦`] = k.nparallel = L(`\\nparallel `, `&#x2226;`, `not parallel`)),
      (k[`⟂`] = k.perp = L(`\\perp `, `&#x27C2;`, `perpendicular`)),
      (k.alpha =
        k.beta =
        k.gamma =
        k.delta =
        k.zeta =
        k.eta =
        k.theta =
        k.iota =
        k.kappa =
        k.mu =
        k.nu =
        k.xi =
        k.rho =
        k.sigma =
        k.tau =
        k.chi =
        k.psi =
        k.omega =
          function (e) {
            return new Ue(`\\` + e + ` `, o.entityText(`&` + e + `;`));
          }),
      (k.phi = We(`\\phi `, `&#981;`, `phi`)),
      (k.phiv = k.varphi = We(`\\varphi `, `&phi;`, `phi`)),
      (k.epsilon = We(`\\epsilon `, `&#1013;`, `epsilon`)),
      (k.epsiv = k.varepsilon = We(`\\varepsilon `, `&epsilon;`, `epsilon`)),
      (k.piv = k.varpi = We(`\\varpi `, `&piv;`, `piv`)),
      (k.sigmaf = k.sigmav = k.varsigma = We(`\\varsigma `, `&sigmaf;`, `sigma`)),
      (k.thetav = k.vartheta = k.thetasym = We(`\\vartheta `, `&thetasym;`, `theta`)),
      (k.upsilon = k.upsi = We(`\\upsilon `, `&upsilon;`, `upsilon`)),
      (k.gammad = k.Gammad = k.digamma = We(`\\digamma `, `&#989;`, `gamma`)),
      (k.kappav = k.varkappa = We(`\\varkappa `, `&#1008;`, `kappa`)),
      (k.rhov = k.varrho = We(`\\varrho `, `&#1009;`, `rho`)),
      (k.pi = k.π =
        function () {
          return new Qe(`\\pi `, o.entityText(`&pi;`), `pi`);
        }),
      (k.lambda = function () {
        return new Qe(`\\lambda `, o.entityText(`&lambda;`), `lambda`);
      }),
      (k.Upsilon =
        k.Upsi =
        k.upsih =
        k.Upsih =
          function () {
            return new Ae(
              `\\Upsilon `,
              o(`var`, { style: `font-family: serif` }, [o.entityText(`&upsih;`)]),
              `capital upsilon`
            );
          }),
      (k.Gamma =
        k.Delta =
        k.Theta =
        k.Lambda =
        k.Xi =
        k.Pi =
        k.Sigma =
        k.Phi =
        k.Psi =
        k.Omega =
        k.forall =
          function (e) {
            return new je(`\\` + e + ` `, o.entityText(`&` + e + `;`));
          }));
    var $e = (function (e) {
      X(t, e);
      function t(t) {
        var n = e.call(this) || this;
        return ((n.latexStr = t), n);
      }
      return (
        (t.prototype.createLeftOf = function (e) {
          var t = Se.parse(this.latexStr);
          (t.children().adopt(e.parent, e[-1], e[1]),
            (e[-1] = t.getEnd(1)),
            b(t.html()).insertBefore(e.domFrag()),
            t.finalizeInsert(e.options, e));
          var n = t.getEnd(1),
            r = n && n[1];
          r && r.siblingCreated(e.options, -1);
          var i = t.getEnd(-1),
            a = i && i[-1];
          (a && a.siblingCreated(e.options, 1),
            e.parent.bubble(function (e) {
              e.reflow();
            }));
        }),
        (t.prototype.mathspeak = function () {
          return Se.parse(this.latexStr).mathspeak();
        }),
        (t.prototype.parser = function () {
          var e = Se.parse(this.latexStr).children();
          return P.succeed(e);
        }),
        t
      );
    })(I);
    ((k[`⁰`] = function () {
      return new $e(`^0`);
    }),
      (k[`¹`] = function () {
        return new $e(`^1`);
      }),
      (k[`²`] = function () {
        return new $e(`^2`);
      }),
      (k[`³`] = function () {
        return new $e(`^3`);
      }),
      (k[`⁴`] = function () {
        return new $e(`^4`);
      }),
      (k[`⁵`] = function () {
        return new $e(`^5`);
      }),
      (k[`⁶`] = function () {
        return new $e(`^6`);
      }),
      (k[`⁷`] = function () {
        return new $e(`^7`);
      }),
      (k[`⁸`] = function () {
        return new $e(`^8`);
      }),
      (k[`⁹`] = function () {
        return new $e(`^9`);
      }),
      (k[`¼`] = function () {
        return new $e(`\\frac14`);
      }),
      (k[`½`] = function () {
        return new $e(`\\frac12`);
      }),
      (k[`¾`] = function () {
        return new $e(`\\frac34`);
      }),
      (k[`√`] = function () {
        return new $e(`\\sqrt{}`);
      }));
    function et(e) {
      if (!e) return !1;
      var t = e[-1];
      if (t) {
        if (t instanceof Me || /^(\\ )|[,;:\(\[]$/.test(t.ctrlSeq)) return !1;
      } else if (e.parent && e.parent.parent && e.parent.parent.isStyleBlock())
        return et(e.parent.parent);
      else return !1;
      return !0;
    }
    var tt = (function (e) {
      X(t, e);
      function t(t, n, r) {
        return e.call(this, t, n, void 0, r, !0) || this;
      }
      return (
        (t.prototype.contactWeld = function (e, t) {
          this.sharedSiblingMethod(e.options, t);
        }),
        (t.prototype.siblingCreated = function (e, t) {
          this.sharedSiblingMethod(e, t);
        }),
        (t.prototype.siblingDeleted = function (e, t) {
          this.sharedSiblingMethod(e, t);
        }),
        (t.prototype.sharedSiblingMethod = function (e, t) {
          if (t !== 1)
            return (
              (this.domFrag().oneElement().className = et(this) ? `mq-binary-operator` : ``),
              this
            );
        }),
        t
      );
    })(Me);
    k[`+`] = (function (e) {
      X(t, e);
      function t() {
        return e.call(this, `+`, o.text(`+`)) || this;
      }
      return (
        (t.prototype.mathspeak = function () {
          return et(this) ? `plus` : `positive`;
        }),
        t
      );
    })(tt);
    var nt = (function (e) {
      X(t, e);
      function t() {
        return e.call(this, `-`, o.entityText(`&minus;`)) || this;
      }
      return (
        (t.prototype.mathspeak = function () {
          return et(this) ? `minus` : `negative`;
        }),
        t
      );
    })(tt);
    ((k[`−`] = k[`—`] = k[`–`] = k[`-`] = nt),
      (k[`±`] =
        k.pm =
        k.plusmn =
        k.plusminus =
          function () {
            return new tt(`\\pm `, o.entityText(`&plusmn;`), `plus-or-minus`);
          }),
      (k.mp =
        k.mnplus =
        k.minusplus =
          function () {
            return new tt(`\\mp `, o.entityText(`&#8723;`), `minus-or-plus`);
          }),
      (A[`*`] = k.sdot = k.cdot = R(`\\cdot `, `&middot;`, `*`, `times`)));
    var rt = (function (e) {
      X(t, e);
      function t() {
        return e.call(this, `\\to `, o.entityText(`&rarr;`), `to`) || this;
      }
      return (
        (t.prototype.deleteTowards = function (t, n) {
          if (t === -1) {
            var r = n[-1];
            (new O(r, this).remove(),
              (n[-1] = r[-1]),
              new nt().createLeftOf(n),
              n[-1].bubble(function (e) {
                e.reflow();
              }));
          } else e.prototype.deleteTowards.call(this, t, n);
        }),
        t
      );
    })(Me);
    k[`→`] = k.to = rt;
    var it = (function (e) {
        X(t, e);
        function t(t, n) {
          var r = this,
            i = n ? `Strict` : ``;
          return (
            (r =
              e.call(
                this,
                t[`ctrlSeq${i}`],
                o.entityText(t[`htmlEntity${i}`]),
                t[`text${i}`],
                t[`mathspeak${i}`]
              ) || this),
            (r.data = t),
            (r.strict = n),
            r
          );
        }
        return (
          (t.prototype.swap = function (e) {
            this.strict = e;
            var t = e ? `Strict` : ``;
            ((this.ctrlSeq = this.data[`ctrlSeq${t}`]),
              this.domFrag()
                .children()
                .replaceWith(b(o.entityText(this.data[`htmlEntity${t}`]))),
              (this.textTemplate = [this.data[`text${t}`]]),
              (this.mathspeakName = this.data[`mathspeak${t}`]));
          }),
          (t.prototype.deleteTowards = function (t, n) {
            t === -1 && !this.strict
              ? (this.swap(!0),
                this.bubble(function (e) {
                  e.reflow();
                }))
              : e.prototype.deleteTowards.call(this, t, n);
          }),
          t
        );
      })(Me),
      at = {
        ctrlSeq: `\\le `,
        htmlEntity: `&le;`,
        text: `≤`,
        mathspeak: `less than or equal to`,
        ctrlSeqStrict: `<`,
        htmlEntityStrict: `&lt;`,
        textStrict: `<`,
        mathspeakStrict: `less than`,
      },
      ot = {
        ctrlSeq: `\\ge `,
        htmlEntity: `&ge;`,
        text: `≥`,
        mathspeak: `greater than or equal to`,
        ctrlSeqStrict: `>`,
        htmlEntityStrict: `&gt;`,
        textStrict: `>`,
        mathspeakStrict: `greater than`,
      },
      st = (function (e) {
        X(t, e);
        function t() {
          return e.call(this, ot, !0) || this;
        }
        return (
          (t.prototype.createLeftOf = function (t) {
            var n = t[-1];
            if (n instanceof Me && n.ctrlSeq === `-`) {
              var r = n;
              ((t[-1] = r[-1]),
                r.remove(),
                new rt().createLeftOf(t),
                t[-1].bubble(function (e) {
                  e.reflow();
                }));
            } else e.prototype.createLeftOf.call(this, t);
          }),
          t
        );
      })(it);
    ((k[`<`] = k.lt =
      function () {
        return new it(at, !0);
      }),
      (k[`>`] = k.gt = st),
      (k[`≤`] =
        k.le =
        k.leq =
          function () {
            return new it(at, !1);
          }),
      (k[`≥`] =
        k.ge =
        k.geq =
          function () {
            return new it(ot, !1);
          }),
      (k.infty = k.infin = k.infinity = L(`\\infty `, `&infin;`, `infinity`)),
      (k[`≠`] = k.ne = k.neq = R(`\\ne `, `&ne;`, `not equal`)));
    var ct = (function (e) {
      X(t, e);
      function t() {
        return e.call(this, `=`, o.text(`=`), `=`, `equals`) || this;
      }
      return (
        (t.prototype.createLeftOf = function (t) {
          var n = t[-1];
          n instanceof it && n.strict
            ? (n.swap(!1),
              n.bubble(function (e) {
                e.reflow();
              }))
            : e.prototype.createLeftOf.call(this, t);
        }),
        t
      );
    })(Me);
    ((k[`=`] = ct),
      (k[`×`] = k.times = R(`\\times `, `&times;`, `[x]`, `times`)),
      (k[`÷`] = k.div = k.divide = k.divides = R(`\\div `, `&divide;`, `[/]`, `over`)));
    var lt = (function (e) {
        X(t, e);
        function t() {
          return e.call(this, `\\sim `, o.text(`~`), `~`, `tilde`) || this;
        }
        return (
          (t.prototype.createLeftOf = function (n) {
            if (n[-1] instanceof t) {
              var r = n[-1];
              ((n[-1] = r[-1]),
                r.remove(),
                new ut().createLeftOf(n),
                n[-1].bubble(function (e) {
                  e.reflow();
                }));
            } else e.prototype.createLeftOf.call(this, n);
          }),
          t
        );
      })(Me),
      ut = (function (e) {
        X(t, e);
        function t() {
          return (
            e.call(this, `\\approx `, o.entityText(`&approx;`), `≈`, `approximately equal`) || this
          );
        }
        return (
          (t.prototype.deleteTowards = function (t, n) {
            if (t === -1) {
              var r = n[-1];
              (new O(r, this).remove(),
                (n[-1] = r[-1]),
                new lt().createLeftOf(n),
                n[-1].bubble(function (e) {
                  e.reflow();
                }));
            } else e.prototype.deleteTowards.call(this, t, n);
          }),
          t
        );
      })(Me);
    ((A[`~`] = k.sim = lt), (k[`≈`] = k.approx = ut));
    var dt = {
        sqrt: {
          width: ``,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 32 54` }, [
              o(`path`, {
                d: `M0 33 L7 27 L12.5 47 L13 47 L30 0 L32 0 L13 54 L11 54 L4.5 31 L0 33`,
              }),
            ]);
          },
        },
        "|": {
          width: `.4em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 10 54` }, [
              o(`path`, { d: `M4.4 0 L4.4 54 L5.6 54 L5.6 0` }),
            ]);
          },
        },
        "[": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 11 24` }, [
              o(`path`, { d: `M8 0 L3 0 L3 24 L8 24 L8 23 L4 23 L4 1 L8 1` }),
            ]);
          },
        },
        "]": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 11 24` }, [
              o(`path`, { d: `M3 0 L8 0 L8 24 L3 24 L3 23 L7 23 L7 1 L3 1` }),
            ]);
          },
        },
        "(": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `3 0 106 186` }, [
              o(`path`, { d: `M85 0 A61 101 0 0 0 85 186 L75 186 A75 101 0 0 1 75 0` }),
            ]);
          },
        },
        ")": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `3 0 106 186` }, [
              o(`path`, { d: `M24 0 A61 101 0 0 1 24 186 L34 186 A75 101 0 0 0 34 0` }),
            ]);
          },
        },
        "{": {
          width: `.7em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `10 0 210 350` }, [
              o(`path`, {
                d: `M170 0 L170 6 A47 52 0 0 0 123 60 L123 127 A35 48 0 0 1 88 175 A35 48 0 0 1 123 223 L123 290 A47 52 0 0 0 170 344 L170 350 L160 350 A58 49 0 0 1 102 301 L103 220 A45 40 0 0 0 58 180 L58 170 A45 40 0 0 0 103 130 L103 49 A58 49 0 0 1 161 0`,
              }),
            ]);
          },
        },
        "}": {
          width: `.7em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `10 0 210 350` }, [
              o(`path`, {
                d: `M60 0 L60 6 A47 52 0 0 1 107 60 L107 127 A35 48 0 0 0 142 175 A35 48 0 0 0 107 223 L107 290 A47 52 0 0 1 60 344 L60 350 L70 350 A58 49 0 0 0 128 301 L127 220 A45 40 0 0 1 172 180 L172 170 A45 40 0 0 1 127 130 L127 49 A58 49 0 0 0 70 0`,
              }),
            ]);
          },
        },
        "&#8741;": {
          width: `.7em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 10 54` }, [
              o(`path`, { d: `M3.2 0 L3.2 54 L4 54 L4 0 M6.8 0 L6.8 54 L6 54 L6 0` }),
            ]);
          },
        },
        "&lang;": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 10 54` }, [
              o(`path`, { d: `M6.8 0 L3.2 27 L6.8 54 L7.8 54 L4.2 27 L7.8 0` }),
            ]);
          },
        },
        "&rang;": {
          width: `.55em`,
          html: function () {
            return o(`svg`, { preserveAspectRatio: `none`, viewBox: `0 0 10 54` }, [
              o(`path`, { d: `M3.2 0 L6.8 27 L3.2 54 L2.2 54 L5.8 27 L2.2 0` }),
            ]);
          },
        },
      },
      ft = (function (e) {
        X(t, e);
        function t(t, n, r, i, a) {
          var s =
            e.call(
              this,
              t,
              new F(1, function (e) {
                return o.block(n, r, e[0]);
              })
            ) || this;
          return (
            (s.ariaLabel = i || t.replace(/^\\/, ``)),
            (s.mathspeakTemplate = [`Start` + s.ariaLabel + `,`, `End` + s.ariaLabel]),
            (s.shouldNotSpeakDelimiters = a && a.shouldNotSpeakDelimiters),
            s
          );
        }
        return (
          (t.prototype.mathspeak = function (t) {
            return !this.shouldNotSpeakDelimiters || (t && t.ignoreShorthand)
              ? e.prototype.mathspeak.call(this)
              : this.foldChildren(``, function (e, n) {
                  return e + ` ` + n.mathspeak(t);
                }).trim();
          }),
          t
        );
      })(I);
    ((k.mathrm = (function (e) {
      X(t, e);
      function t() {
        return (
          e.call(this, `\\mathrm`, `span`, { class: `mq-roman mq-font` }, `Roman Font`, {
            shouldNotSpeakDelimiters: !0,
          }) || this
        );
      }
      return (
        (t.prototype.isTextBlock = function () {
          return !0;
        }),
        t
      );
    })(ft)),
      (k.mathit = function () {
        return new ft(`\\mathit`, `i`, { class: `mq-font` }, `Italic Font`);
      }),
      (k.mathbf = function () {
        return new ft(`\\mathbf`, `b`, { class: `mq-font` }, `Bold Font`);
      }),
      (k.mathsf = function () {
        return new ft(`\\mathsf`, `span`, { class: `mq-sans-serif mq-font` }, `Serif Font`);
      }),
      (k.mathtt = function () {
        return new ft(`\\mathtt`, `span`, { class: `mq-monospace mq-font` }, `Math Text`);
      }),
      (k.underline = function () {
        return new ft(`\\underline`, `span`, { class: `mq-non-leaf mq-underline` }, `Underline`);
      }),
      (k.overline = k.bar =
        function () {
          return new ft(`\\overline`, `span`, { class: `mq-non-leaf mq-overline` }, `Overline`);
        }),
      (k.overrightarrow = function () {
        return new ft(
          `\\overrightarrow`,
          `span`,
          { class: `mq-non-leaf mq-overarrow mq-arrow-right` },
          `Over Right Arrow`
        );
      }),
      (k.overleftarrow = function () {
        return new ft(
          `\\overleftarrow`,
          `span`,
          { class: `mq-non-leaf mq-overarrow mq-arrow-left` },
          `Over Left Arrow`
        );
      }),
      (k.overleftrightarrow = function () {
        return new ft(
          `\\overleftrightarrow `,
          `span`,
          { class: `mq-non-leaf mq-overarrow mq-arrow-leftright` },
          `Over Left and Right Arrow`
        );
      }),
      (k.overarc = function () {
        return new ft(`\\overarc`, `span`, { class: `mq-non-leaf mq-overarc` }, `Over Arc`);
      }),
      (k.dot = function () {
        return new I(
          `\\dot`,
          new F(1, function (e) {
            return o(`span`, { class: `mq-non-leaf` }, [
              o(`span`, { class: `mq-dot-recurring-inner` }, [
                o(`span`, { class: `mq-dot-recurring` }, [o.text(u)]),
                o.block(`span`, { class: `mq-empty-box` }, e[0]),
              ]),
            ]);
          })
        );
      }),
      (k.textcolor = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.setColor = function (e) {
            ((this.color = e),
              (this.domView = new F(1, function (t) {
                return o.block(`span`, { class: `mq-textcolor`, style: `color:` + e }, t[0]);
              })),
              (this.ariaLabel = e.replace(/^\\/, ``)),
              (this.mathspeakTemplate = [
                `Start ` + this.ariaLabel + `,`,
                `End ` + this.ariaLabel,
              ]));
          }),
          (t.prototype.latex = function () {
            var e = this.blocks[0];
            return `\\textcolor{` + this.color + `}{` + e.latex() + `}`;
          }),
          (t.prototype.parser = function () {
            var t = this,
              n = P.optWhitespace,
              r = P.string,
              i = P.regex;
            return n
              .then(r(`{`))
              .then(i(/^[#\w\s.,()%-]*/))
              .skip(r(`}`))
              .then(function (n) {
                return (t.setColor(n), e.prototype.parser.call(t));
              });
          }),
          (t.prototype.isStyleBlock = function () {
            return !0;
          }),
          t
        );
      })(I)),
      (k.class = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.parser = function () {
            var t = this,
              n = P.string,
              r = P.regex;
            return P.optWhitespace
              .then(n(`{`))
              .then(r(/^[-\w\s\\\xA0-\xFF]*/))
              .skip(n(`}`))
              .then(function (n) {
                return (
                  (t.cls = n || ``),
                  (t.domView = new F(1, function (e) {
                    return o.block(`span`, { class: `mq-class ${n}` }, e[0]);
                  })),
                  (t.ariaLabel = n + ` class`),
                  (t.mathspeakTemplate = [`Start ` + t.ariaLabel + `,`, `End ` + t.ariaLabel]),
                  e.prototype.parser.call(t)
                );
              });
          }),
          (t.prototype.latex = function () {
            var e = this.blocks[0];
            return `\\class{` + this.cls + `}{` + e.latex() + `}`;
          }),
          (t.prototype.isStyleBlock = function () {
            return !0;
          }),
          t
        );
      })(I)));
    var pt = /^[\+\-]?[\d]+$/;
    function mt(e) {
      if (!e) return ``;
      var t = ``;
      return (
        e.eachChild(function (e) {
          e.ctrlSeq !== void 0 && (t += e.ctrlSeq);
        }),
        t
      );
    }
    se.prototype.charsThatBreakOutOfSupSub = ``;
    var ht = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return ((t.ctrlSeq = `_{...}^{...}`), t);
      }
      return (
        (t.prototype.setEnds = function (e) {
          (r(`SupSub ends must be MathBlocks`, e[-1] instanceof Ne && e[1] instanceof Ne),
            (this.ends = e));
        }),
        (t.prototype.getEnd = function (e) {
          return this.ends[e];
        }),
        (t.prototype.createLeftOf = function (t) {
          if (this.replacedFragment || t[-1] || !t.options.supSubsRequireOperand)
            return e.prototype.createLeftOf.call(this, t);
        }),
        (t.prototype.contactWeld = function (e) {
          for (var n = -1; n; n = n === -1 && 1) {
            var r = this[n],
              i = void 0;
            if (r instanceof t) {
              for (var a = `sub`; a; a = a === `sub` && `sup`) {
                var o = this[a],
                  s = r[a];
                if (o) {
                  if (!s) r.addBlock(o.disown());
                  else if (o.isEmpty()) i = new C(s, 0, s.getEnd(-1));
                  else {
                    o.domFrag().children().insAtDirEnd(-n, s.domFrag().oneElement());
                    var c = o.children().disown();
                    ((i = new C(s, c.getEnd(1), s.getEnd(-1))),
                      n === -1 ? c.adopt(s, s.getEnd(1), 0) : c.adopt(s, 0, s.getEnd(-1)));
                  }
                  this.placeCursor = (function (e, t) {
                    return function (r) {
                      r.insAtDirEnd(-n, e || t);
                    };
                  })(s, o);
                }
              }
              (this.remove(),
                e &&
                  e[-1] === this &&
                  (n === 1 && i
                    ? i[-1]
                      ? e.insRightOf(i[-1])
                      : e.insAtLeftEnd(i.parent)
                    : e.insRightOf(r)));
              break;
            }
          }
        }),
        (t.prototype.finalizeTree = function () {
          var e = this.getEnd(-1);
          e.write = function (e, t) {
            var n =
              e[-1] && !e[1] && !e.selection && e.options.charsThatBreakOutOfSupSub.indexOf(t) > -1;
            if (!n && e.options.autoSubscriptNumerals && this === this.parent.sub) {
              if (t === `_`) return;
              var r = this.chToCmd(t, e.options);
              (r instanceof Ae ? e.deleteSelection() : e.clearSelection().insRightOf(this.parent),
                r.createLeftOf(e.show()),
                e.controller.aria.queue(`Baseline`).alert(r.mathspeak({ createdLeftOf: e })));
            } else
              (n && (e.insRightOf(this.parent), e.controller.aria.queue(`Baseline`)),
                Ne.prototype.write.call(this, e, t));
          };
        }),
        (t.prototype.moveTowards = function (t, n, r) {
          n.options.autoSubscriptNumerals && !this.sup
            ? n.insDirOf(t, this)
            : e.prototype.moveTowards.call(this, t, n, r);
        }),
        (t.prototype.deleteTowards = function (t, n) {
          if (n.options.autoSubscriptNumerals && this.sub) {
            var r = this.sub.getEnd(-t);
            (r instanceof Ae ? r.remove() : r && r.deleteTowards(t, n.insAtDirEnd(-t, this.sub)),
              this.sub.isEmpty() &&
                (this.sub.deleteOutOf(-1, n.insAtLeftEnd(this.sub)),
                this.sup && n.insDirOf(-t, this)));
          } else e.prototype.deleteTowards.call(this, t, n);
        }),
        (t.prototype.latex = function () {
          function e(e, t) {
            var n = t && t.latex();
            return t ? e + `{` + (n || ` `) + `}` : ``;
          }
          return e(`_`, this.sub) + e(`^`, this.sup);
        }),
        (t.prototype.text = function () {
          function e(e, t) {
            var n = (t && t.text()) || ``;
            return t ? e + (n.length === 1 ? n : `(` + (n || ` `) + `)`) : ``;
          }
          return e(`_`, this.sub) + e(`^`, this.sup);
        }),
        (t.prototype.addBlock = function (e) {
          this.supsub === `sub`
            ? ((this.sup = this.upInto = this.sub.upOutOf = e),
              (e.adopt(this, this.sub, 0).downOutOf = this.sub),
              e.setDOM(
                b(o(`span`, { class: `mq-sup` }))
                  .append(e.domFrag().children())
                  .prependTo(this.domFrag().oneElement())
                  .oneElement()
              ),
              E.linkElementByBlockNode(e.domFrag().oneElement(), e))
            : ((this.sub = this.downInto = this.sup.downOutOf = e),
              (e.adopt(this, 0, this.sup).upOutOf = this.sup),
              this.domFrag().removeClass(`mq-sup-only`),
              e.setDOM(
                b(o(`span`, { class: `mq-sub` }))
                  .append(e.domFrag().children())
                  .appendTo(this.domFrag().oneElement())
                  .oneElement()
              ),
              E.linkElementByBlockNode(e.domFrag().oneElement(), e),
              this.domFrag().append(
                b(o(`span`, { style: `display:inline-block;width:0` }, [o.text(l)]))
              ));
          for (var t = 0; t < 2; t += 1)
            (function (e, t, n, r) {
              var i = e[t];
              i.deleteOutOf = function (i, a) {
                if ((a.insDirOf(this[i] ? -i : i, this.parent), !this.isEmpty())) {
                  var o = this.getEnd(i);
                  (this.children()
                    .disown()
                    .withDirAdopt(i, a.parent, a[i], a[-i])
                    .domFrag()
                    .insDirOf(-i, a.domFrag()),
                    (a[-i] = o));
                }
                ((e.supsub = n), delete e[t], delete e[`${r}Into`]);
                var s = e[n];
                ((s[`${r}OutOf`] = gt),
                  delete s.deleteOutOf,
                  t === `sub` && e.domFrag().addClass(`mq-sup-only`).children().last().remove(),
                  this.remove());
              };
            })(this, `sub sup`.split(` `)[t], `sup sub`.split(` `)[t], `down up`.split(` `)[t]);
        }),
        t
      );
    })(I);
    function gt(e) {
      var t = this.parent,
        n = e;
      do {
        if (n[1]) return e.insLeftOf(t);
        n = n.parent.parent;
      } while (n !== t);
      e.insRightOf(t);
    }
    var _t = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return (
          (t.supsub = `sub`),
          (t.domView = new F(1, function (e) {
            return o(`span`, { class: `mq-supsub mq-non-leaf` }, [
              o.block(`span`, { class: `mq-sub` }, e[0]),
              o(`span`, { style: `display:inline-block;width:0` }, [o.text(l)]),
            ]);
          })),
          (t.textTemplate = [`_`]),
          (t.mathspeakTemplate = [`Subscript,`, `, Baseline`]),
          (t.ariaLabel = `subscript`),
          t
        );
      }
      return (
        (t.prototype.finalizeTree = function () {
          ((this.downInto = this.sub = this.getEnd(-1)),
            (this.sub.upOutOf = gt),
            e.prototype.finalizeTree.call(this));
        }),
        t
      );
    })(ht);
    ((k.subscript = k._ = _t),
      (k.superscript =
        k.supscript =
        k[`^`] =
          (function (e) {
            X(t, e);
            function t() {
              var t = (e !== null && e.apply(this, arguments)) || this;
              return (
                (t.supsub = `sup`),
                (t.domView = new F(1, function (e) {
                  return o(`span`, { class: `mq-supsub mq-non-leaf mq-sup-only` }, [
                    o.block(`span`, { class: `mq-sup` }, e[0]),
                  ]);
                })),
                (t.textTemplate = [`^(`, `)`]),
                (t.ariaLabel = `superscript`),
                (t.mathspeakTemplate = [`Superscript,`, `, Baseline`]),
                t
              );
            }
            return (
              (t.prototype.mathspeak = function (t) {
                var n = this.upInto;
                if (n !== void 0) {
                  var r = mt(n);
                  if ((!t || !t.ignoreShorthand) && pt.test(r)) {
                    if (r === `0`) return `to the 0 power`;
                    if (r === `2`) return `squared`;
                    if (r === `3`) return `cubed`;
                    var i = ``;
                    return (
                      /^[+-]?\d{1,3}$/.test(r) &&
                        (/(11|12|13|4|5|6|7|8|9|0)$/.test(r)
                          ? (i = `th`)
                          : /1$/.test(r)
                            ? (i = `st`)
                            : /2$/.test(r)
                              ? (i = `nd`)
                              : /3$/.test(r) && (i = `rd`)),
                      `to the ` + (typeof n == `object` ? n.mathspeak() : r) + i + ` power`
                    );
                  }
                }
                return e.prototype.mathspeak.call(this);
              }),
              (t.prototype.finalizeTree = function () {
                ((this.upInto = this.sup = this.getEnd(1)),
                  (this.sup.downOutOf = gt),
                  e.prototype.finalizeTree.call(this));
              }),
              t
            );
          })(ht)));
    var vt = (function (e) {
      X(t, e);
      function t(t, n, r) {
        var i = e.call(this) || this;
        i.ariaLabel = r || t.replace(/^\\/, ``);
        var a = new F(2, function (e) {
          return o(`span`, { class: `mq-large-operator mq-non-leaf` }, [
            o(`span`, { class: `mq-to` }, [o.block(`span`, {}, e[1])]),
            o(`big`, {}, [o.text(n)]),
            o(`span`, { class: `mq-from` }, [o.block(`span`, {}, e[0])]),
          ]);
        });
        return (Ae.prototype.setCtrlSeqHtmlTextAndMathspeak.call(i, t, a), i);
      }
      return (
        (t.prototype.createLeftOf = function (t) {
          (e.prototype.createLeftOf.call(this, t),
            t.options.sumStartsWithNEquals &&
              (new Ge(`n`).createLeftOf(t), new ct().createLeftOf(t)));
        }),
        (t.prototype.latex = function () {
          function e(e) {
            return `{` + (e || ` `) + `}`;
          }
          return this.ctrlSeq + `_` + e(this.getEnd(-1).latex()) + `^` + e(this.getEnd(1).latex());
        }),
        (t.prototype.mathspeak = function () {
          return (
            `Start ` +
            this.ariaLabel +
            ` from ` +
            this.getEnd(-1).mathspeak() +
            ` to ` +
            this.getEnd(1).mathspeak() +
            `, end ` +
            this.ariaLabel +
            `, `
          );
        }),
        (t.prototype.parser = function () {
          for (
            var e = P.string,
              t = P.optWhitespace,
              n = P.succeed,
              r = Se.block,
              i = this,
              a = (i.blocks = [new Ne(), new Ne()]),
              o = 0;
            o < a.length;
            o += 1
          )
            a[o].adopt(i, i.getEnd(1), 0);
          return t
            .then(e(`_`).or(e(`^`)))
            .then(function (e) {
              var t = a[e === `_` ? 0 : 1];
              return r.then(function (e) {
                return (e.children().adopt(t, t.getEnd(1), 0), n(i));
              });
            })
            .many()
            .result(i);
        }),
        (t.prototype.finalizeTree = function () {
          var e = this.getEnd(-1),
            t = this.getEnd(1);
          ((e.ariaLabel = `lower bound`),
            (t.ariaLabel = `upper bound`),
            (this.downInto = e),
            (this.upInto = t),
            (e.upOutOf = t),
            (t.downOutOf = e));
        }),
        t
      );
    })(I);
    ((k[`∑`] =
      k.sum =
      k.summation =
        function () {
          return new vt(`\\sum `, d, `sum`);
        }),
      (k[`∏`] =
        k.prod =
        k.product =
          function () {
            return new vt(`\\prod `, f, `product`);
          }),
      (k.coprod = k.coproduct =
        function () {
          return new vt(`\\coprod `, p, `co product`);
        }),
      (k[`∫`] =
        k.int =
        k.integral =
          (function (e) {
            X(t, e);
            function t() {
              var t = e.call(this, `\\int `, ``, `integral`) || this;
              return (
                (t.ariaLabel = `integral`),
                (t.domView = new F(2, function (e) {
                  return o(`span`, { class: `mq-int mq-non-leaf` }, [
                    o(`big`, {}, [o.text(m)]),
                    o(`span`, { class: `mq-supsub mq-non-leaf` }, [
                      o(`span`, { class: `mq-sup` }, [
                        o.block(`span`, { class: `mq-sup-inner` }, e[1]),
                      ]),
                      o.block(`span`, { class: `mq-sub` }, e[0]),
                      o(`span`, { style: `display:inline-block;width:0` }, [o.text(l)]),
                    ]),
                  ]);
                })),
                t
              );
            }
            return (
              (t.prototype.createLeftOf = function (e) {
                I.prototype.createLeftOf.call(this, e);
              }),
              t
            );
          })(vt)));
    var yt =
        (k.over =
        A[`/`] =
          (function (e) {
            X(t, e);
            function t() {
              return (e !== null && e.apply(this, arguments)) || this;
            }
            return (
              (t.prototype.createLeftOf = function (t) {
                if (!this.replacedFragment) {
                  var r = t[-1];
                  if (!t.options.typingSlashCreatesNewFraction)
                    for (
                      ;
                      r &&
                      !(
                        r instanceof Me ||
                        r instanceof (k.text || n) ||
                        r instanceof vt ||
                        r.ctrlSeq === `\\ ` ||
                        /^[,;:]$/.test(r.ctrlSeq)
                      );
                    )
                      r = r[-1];
                  if (r instanceof vt && r[1] instanceof ht) {
                    r = r[1];
                    var i = r[1];
                    i instanceof ht && i.ctrlSeq != r.ctrlSeq && (r = r[1]);
                  }
                  if (r !== t[-1] && !t.isTooDeep(1)) {
                    var i = r[1],
                      a = t[-1];
                    (this.replaces(new O(i || t.parent.getEnd(-1), a)), (t[-1] = r));
                  }
                }
                e.prototype.createLeftOf.call(this, t);
              }),
              t
            );
          })(
            (k.frac =
              k.dfrac =
              k.cfrac =
              k.fraction =
                (function (e) {
                  X(t, e);
                  function t() {
                    var t = (e !== null && e.apply(this, arguments)) || this;
                    return (
                      (t.ctrlSeq = `\\frac`),
                      (t.domView = new F(2, function (e) {
                        return o(`span`, { class: `mq-fraction mq-non-leaf` }, [
                          o.block(`span`, { class: `mq-numerator` }, e[0]),
                          o.block(`span`, { class: `mq-denominator` }, e[1]),
                          o(`span`, { style: `display:inline-block;width:0` }, [o.text(l)]),
                        ]);
                      })),
                      (t.textTemplate = [`(`, `)/(`, `)`]),
                      t
                    );
                  }
                  return (
                    (t.prototype.finalizeTree = function () {
                      var e = this.getEnd(-1),
                        t = this.getEnd(1);
                      ((this.upInto = t.upOutOf = e),
                        (this.downInto = e.downOutOf = t),
                        (e.ariaLabel = `numerator`),
                        (t.ariaLabel = `denominator`),
                        (this.mathspeakTemplate =
                          this.getFracDepth() > 1
                            ? [`StartNestedFraction,`, `NestedOver`, `, EndNestedFraction`]
                            : [`StartFraction,`, `Over`, `, EndFraction`]));
                    }),
                    (t.prototype.mathspeak = function (t) {
                      if (t && t.createdLeftOf) return t.createdLeftOf.parent.mathspeak();
                      var n = mt(this.getEnd(-1)),
                        r = mt(this.getEnd(1));
                      if ((!t || !t.ignoreShorthand) && pt.test(n) && pt.test(r)) {
                        var i = n === `1` || n === `-1`,
                          a = ``;
                        if (
                          (r === `2`
                            ? (a = i ? `half` : `halves`)
                            : r === `3`
                              ? (a = i ? `third` : `thirds`)
                              : r === `4`
                                ? (a = i ? `quarter` : `quarters`)
                                : r === `5`
                                  ? (a = i ? `fifth` : `fifths`)
                                  : r === `6`
                                    ? (a = i ? `sixth` : `sixths`)
                                    : r === `7`
                                      ? (a = i ? `seventh` : `sevenths`)
                                      : r === `8`
                                        ? (a = i ? `eighth` : `eighths`)
                                        : r === `9` && (a = i ? `ninth` : `ninths`),
                          a !== ``)
                        ) {
                          for (var o = ``, s = !1, c = this[-1]; c && c[-1] !== void 0; c = c[-1])
                            if (c.ctrlSeq === `\\ `) continue;
                            else if (pt.test(c.ctrlSeq || ``)) s = !0;
                            else {
                              s = !1;
                              break;
                            }
                          return (
                            s && (o += `and `),
                            (o += this.getEnd(-1).mathspeak() + ` ` + a),
                            o
                          );
                        }
                      }
                      return e.prototype.mathspeak.call(this);
                    }),
                    (t.prototype.getFracDepth = function () {
                      var e = 0,
                        t = function (e, n) {
                          return (
                            e instanceof be &&
                              e.ctrlSeq &&
                              e.ctrlSeq.toLowerCase().search(`frac`) >= 0 &&
                              (n += 1),
                            e && e.parent ? t(e.parent, n) : n
                          );
                        };
                      return t(this, e);
                    }),
                    t
                  );
                })(I))
          )),
      bt = function () {
        return new Ae(
          `\\operatorname{ans}`,
          o(`span`, { class: `mq-ans` }, [o.text(`ans`)]),
          `ans`
        );
      };
    k.ans = bt;
    var xt = function () {
      return new Ae(
        `\\%\\operatorname{of}`,
        o(`span`, { class: `mq-nonSymbola mq-operator-name` }, [o.text(`% of `)]),
        `percent of`
      );
    };
    k.percent = k.percentof = xt;
    var St = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return (
          (t.ctrlSeq = `\\sqrt`),
          (t.domView = new F(1, function (e) {
            return o(`span`, { class: `mq-non-leaf mq-sqrt-container` }, [
              o(`span`, { class: `mq-scaled mq-sqrt-prefix` }, [dt.sqrt.html()]),
              o.block(`span`, { class: `mq-non-leaf mq-sqrt-stem` }, e[0]),
            ]);
          })),
          (t.textTemplate = [`sqrt(`, `)`]),
          (t.mathspeakTemplate = [`StartRoot,`, `, EndRoot`]),
          (t.ariaLabel = `root`),
          t
        );
      }
      return (
        (t.prototype.parser = function () {
          return Se.optBlock
            .then(function (e) {
              return Se.block.map(function (t) {
                var n = new Ct();
                return ((n.blocks = [e, t]), e.adopt(n, 0, 0), t.adopt(n, e, 0), n);
              });
            })
            .or(e.prototype.parser.call(this));
        }),
        t
      );
    })(I);
    ((k.sqrt = St),
      (k.hat = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return (
            (t.ctrlSeq = `\\hat`),
            (t.domView = new F(1, function (e) {
              return o(`span`, { class: `mq-non-leaf` }, [
                o(`span`, { class: `mq-hat-prefix` }, [o.text(`^`)]),
                o.block(`span`, { class: `mq-hat-stem` }, e[0]),
              ]);
            })),
            (t.textTemplate = [`hat(`, `)`]),
            t
          );
        }
        return t;
      })(I)));
    var Ct = (function (e) {
      X(t, e);
      function t() {
        var t = (e !== null && e.apply(this, arguments)) || this;
        return (
          (t.domView = new F(2, function (e) {
            return o(`span`, { class: `mq-nthroot-container mq-non-leaf` }, [
              o.block(`sup`, { class: `mq-nthroot mq-non-leaf` }, e[0]),
              o(`span`, { class: `mq-scaled mq-sqrt-container` }, [
                o(`span`, { class: `mq-sqrt-prefix mq-scaled` }, [dt.sqrt.html()]),
                o.block(`span`, { class: `mq-sqrt-stem mq-non-leaf` }, e[1]),
              ]),
            ]);
          })),
          (t.textTemplate = [`sqrt[`, `](`, `)`]),
          t
        );
      }
      return (
        (t.prototype.latex = function () {
          return `\\sqrt[` + this.getEnd(-1).latex() + `]{` + this.getEnd(1).latex() + `}`;
        }),
        (t.prototype.mathspeak = function () {
          var e = this.getEnd(-1).mathspeak(),
            t = this.getEnd(1).mathspeak();
          return (
            (this.getEnd(-1).ariaLabel = `Index`),
            (this.getEnd(1).ariaLabel = `Radicand`),
            e === `3`
              ? `Start Cube Root, ` + t + `, End Cube Root`
              : `Root Index ` + e + `, Start Root, ` + t + `, End Root`
          );
        }),
        t
      );
    })(St);
    ((k.nthroot = Ct),
      (k.cbrt = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.createLeftOf = function (t) {
            (e.prototype.createLeftOf.call(this, t),
              new He(`3`).createLeftOf(t),
              t.controller.moveRight());
          }),
          t
        );
      })(Ct)));
    var wt = (function (e) {
      X(t, e);
      function t(t, n, r) {
        var i = this,
          a = new F(1, function (e) {
            return o(`span`, { class: `mq-non-leaf` }, [
              o(`span`, { class: `mq-diacritic-above` }, [n]),
              o.block(`span`, { class: `mq-diacritic-stem` }, e[0]),
            ]);
          });
        return ((i = e.call(this, t, a, r) || this), i);
      }
      return t;
    })(I);
    ((k.vec = function () {
      return new wt(`\\vec`, o.entityText(`&rarr;`), [`vec(`, `)`]);
    }),
      (k.tilde = function () {
        return new wt(`\\tilde`, o.text(`~`), [`tilde(`, `)`]);
      }));
    var Tt = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.setDOM = function (t) {
            var n;
            e.prototype.setDOM.call(this, t);
            var r = this.domFrag().children();
            return (
              r.isEmpty() ||
                (this.delimFrags = ((n = {}), (n[-1] = r.first()), (n[1] = r.last()), n)),
              this
            );
          }),
          t
        );
      })(I),
      Et = (function (e) {
        X(t, e);
        function t(t, n, r, i, a) {
          var o,
            s = e.call(this, `\\left` + i, void 0, [n, r]) || this;
          return (
            (s.side = t),
            (s.sides =
              ((o = {}), (o[-1] = { ch: n, ctrlSeq: i }), (o[1] = { ch: r, ctrlSeq: a }), o)),
            s
          );
        }
        return (
          (t.prototype.numBlocks = function () {
            return 1;
          }),
          (t.prototype.html = function () {
            var t = this,
              n = this.getSymbol(-1),
              r = this.getSymbol(1);
            return (
              (this.domView = new F(1, function (e) {
                return o(`span`, { class: `mq-non-leaf mq-bracket-container` }, [
                  o(
                    `span`,
                    {
                      style: `width:` + n.width,
                      class: `mq-scaled mq-bracket-l mq-paren` + (t.side === 1 ? ` mq-ghost` : ``),
                    },
                    [n.html()]
                  ),
                  o.block(
                    `span`,
                    {
                      style: `margin-left:` + n.width + `;margin-right:` + r.width,
                      class: `mq-bracket-middle mq-non-leaf`,
                    },
                    e[0]
                  ),
                  o(
                    `span`,
                    {
                      style: `width:` + r.width,
                      class: `mq-scaled mq-bracket-r mq-paren` + (t.side === -1 ? ` mq-ghost` : ``),
                    },
                    [r.html()]
                  ),
                ]);
              })),
              e.prototype.html.call(this)
            );
          }),
          (t.prototype.getSymbol = function (e) {
            return dt[this.sides[e || 1].ch] || { width: `0`, html: `` };
          }),
          (t.prototype.latex = function () {
            return (
              `\\left` +
              this.sides[-1].ctrlSeq +
              this.getEnd(-1).latex() +
              `\\right` +
              this.sides[1].ctrlSeq
            );
          }),
          (t.prototype.mathspeak = function (t) {
            var n = this.sides[-1].ch,
              r = this.sides[1].ch;
            if (n === `|` && r === `|`)
              ((this.mathspeakTemplate = [`StartAbsoluteValue,`, `, EndAbsoluteValue`]),
                (this.ariaLabel = `absolute value`));
            else if (t && t.createdLeftOf && this.side) {
              var i = ``;
              return (
                this.side === -1
                  ? (i = this.textTemplate[0])
                  : this.side === 1 && (i = this.textTemplate[1]),
                (this.side === -1 ? `left ` : `right `) + kt[i]
              );
            } else
              ((this.mathspeakTemplate = [`left ` + kt[n] + `,`, `, right ` + kt[r]]),
                (this.ariaLabel = kt[n] + ` block`));
            return e.prototype.mathspeak.call(this);
          }),
          (t.prototype.matchBrack = function (e, n, r) {
            return (
              r instanceof t &&
              r.side &&
              r.side !== -n &&
              (!e.restrictMismatchedBrackets ||
                Ot[this.sides[this.side].ch] === r.sides[r.side].ch) &&
              r
            );
          }),
          (t.prototype.closeOpposing = function (e) {
            ((e.side = 0), (e.sides[this.side] = this.sides[this.side]));
            var t = e.delimFrags[this.side === -1 ? -1 : 1].removeClass(`mq-ghost`);
            this.replaceBracket(t, this.side);
          }),
          (t.prototype.createLeftOf = function (t) {
            var n;
            if (!this.replacedFragment) {
              var r = t.options;
              n =
                this.sides[-1].ch === `|`
                  ? this.matchBrack(r, 1, t[1]) ||
                    this.matchBrack(r, -1, t[-1]) ||
                    this.matchBrack(r, 0, t.parent.parent)
                  : this.matchBrack(r, -this.side, t[-this.side]) ||
                    this.matchBrack(r, -this.side, t.parent.parent);
            }
            if (n) {
              var i = (this.side = -n.side);
              (this.closeOpposing(n),
                n === t.parent.parent &&
                  t[i] &&
                  new O(t[i], t.parent.getEnd(i), -i)
                    .disown()
                    .withDirAdopt(-i, n.parent, n, n[i])
                    .domFrag()
                    .insDirOf(i, n.domFrag()),
                n.bubble(function (e) {
                  e.reflow();
                }));
            } else
              ((n = this),
                (i = n.side),
                n.replacedFragment
                  ? (n.side = 0)
                  : t[-i] && (n.replaces(new O(t[-i], t.parent.getEnd(-i), i)), (t[-i] = 0)),
                e.prototype.createLeftOf.call(this, t));
            i === -1 ? t.insAtLeftEnd(n.getEnd(-1)) : t.insRightOf(n);
          }),
          (t.prototype.placeCursor = function () {}),
          (t.prototype.unwrap = function () {
            (this.getEnd(-1)
              .children()
              .disown()
              .adopt(this.parent, this, this[1])
              .domFrag()
              .insertAfter(this.domFrag()),
              this.remove());
          }),
          (t.prototype.deleteSide = function (e, t, n) {
            var r = this.parent,
              i = this[e],
              a = r.getEnd(e);
            if (e === this.side) (this.unwrap(), i ? n.insDirOf(-e, i) : n.insAtDirEnd(e, r));
            else {
              var o = n.options,
                s = !this.side;
              if (((this.side = -e), this.matchBrack(o, e, this.getEnd(-1).getEnd(this.side)))) {
                this.closeOpposing(this.getEnd(-1).getEnd(this.side));
                var c = this.getEnd(-1).getEnd(e);
                (this.unwrap(),
                  c && c.siblingCreated(n.options, e),
                  i ? n.insDirOf(-e, i) : n.insAtDirEnd(e, r));
              } else {
                if (this.matchBrack(o, e, this.parent.parent))
                  (this.parent.parent.closeOpposing(this), this.parent.parent.unwrap());
                else if (t && s) {
                  (this.unwrap(), i ? n.insDirOf(-e, i) : n.insAtDirEnd(e, r));
                  return;
                } else {
                  ((this.sides[e] = Dt(this)),
                    this.delimFrags[-1].removeClass(`mq-ghost`),
                    this.delimFrags[1].removeClass(`mq-ghost`));
                  var l = this.delimFrags[e].addClass(`mq-ghost`);
                  this.replaceBracket(l, e);
                }
                if (i) {
                  var u = this.getEnd(-1),
                    c = u.getEnd(e);
                  (u.domFrag().removeClass(`mq-empty`),
                    new O(i, a, -e)
                      .disown()
                      .withDirAdopt(-e, u, c, 0)
                      .domFrag()
                      .insAtDirEnd(e, u.domFrag().oneElement()),
                    c && c.siblingCreated(n.options, e),
                    n.insDirOf(-e, i));
                } else t ? n.insDirOf(e, this) : n.insAtDirEnd(e, this.getEnd(-1));
              }
            }
          }),
          (t.prototype.replaceBracket = function (e, t) {
            var n = this.getSymbol(t);
            if (
              (e.children().replaceWith(b(n.html())),
              (e.oneElement().style.width = n.width),
              t === -1)
            ) {
              var r = e.next();
              r.isEmpty() || (r.oneElement().style.marginLeft = n.width);
            } else {
              var i = e.prev();
              i.isEmpty() || (i.oneElement().style.marginRight = n.width);
            }
          }),
          (t.prototype.deleteTowards = function (e, t) {
            this.deleteSide(-e, !1, t);
          }),
          (t.prototype.finalizeTree = function () {
            ((this.getEnd(-1).deleteOutOf = function (e, t) {
              this.parent.deleteSide(e, !0, t);
            }),
              (this.finalizeTree = this.intentionalBlur =
                function () {
                  (this.delimFrags[this.side === -1 ? 1 : -1].removeClass(`mq-ghost`),
                    (this.side = 0));
                }));
          }),
          (t.prototype.siblingCreated = function (e, t) {
            t === -this.side && this.finalizeTree();
          }),
          t
        );
      })(Tt);
    function Dt(e) {
      var t = e.side,
        n = e.sides[t];
      return { ch: Ot[n.ch], ctrlSeq: Ot[n.ctrlSeq] };
    }
    var Ot = {
        "(": `)`,
        ")": `(`,
        "[": `]`,
        "]": `[`,
        "{": `}`,
        "}": `{`,
        "\\{": `\\}`,
        "\\}": `\\{`,
        "&lang;": `&rang;`,
        "&rang;": `&lang;`,
        "\\langle ": `\\rangle `,
        "\\rangle ": `\\langle `,
        "|": `|`,
        "\\lVert ": `\\rVert `,
        "\\rVert ": `\\lVert `,
      },
      kt = { "&lang;": `angle-bracket`, "&rang;": `angle-bracket`, "|": `pipe` };
    function At(e, t, n) {
      var t = t || e,
        r = Ot[e],
        i = Ot[t];
      ((A[e] = function () {
        return new Et(-1, e, r, t, i);
      }),
        (A[r] = function () {
          return new Et(1, e, r, t, i);
        }),
        (kt[e] = kt[r] = n));
    }
    (At(`(`, ``, `parenthesis`),
      At(`[`, ``, `bracket`),
      At(`{`, `\\{`, `brace`),
      (k.langle = function () {
        return new Et(-1, `&lang;`, `&rang;`, `\\langle `, `\\rangle `);
      }),
      (k.rangle = function () {
        return new Et(1, `&lang;`, `&rang;`, `\\langle `, `\\rangle `);
      }),
      (A[`|`] = function () {
        return new Et(-1, `|`, `|`, `|`, `|`);
      }),
      (k.lVert = function () {
        return new Et(-1, `&#8741;`, `&#8741;`, `\\lVert `, `\\rVert `);
      }),
      (k.rVert = function () {
        return new Et(1, `&#8741;`, `&#8741;`, `\\lVert `, `\\rVert `);
      }),
      (k.left = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.parser = function () {
            var e = P.regex,
              t = P.string,
              n = P.optWhitespace;
            return n
              .then(e(/^(?:[([|]|\\\{|\\langle(?![a-zA-Z])|\\lVert(?![a-zA-Z]))/))
              .then(function (r) {
                var i = r.replace(/^\\/, ``);
                return (
                  r == `\\langle` && ((i = `&lang;`), (r += ` `)),
                  r == `\\lVert` && ((i = `&#8741;`), (r += ` `)),
                  Se.then(function (a) {
                    return t(`\\right`)
                      .skip(n)
                      .then(e(/^(?:[\])|]|\\\}|\\rangle(?![a-zA-Z])|\\rVert(?![a-zA-Z]))/))
                      .map(function (e) {
                        var t = e.replace(/^\\/, ``);
                        (e == `\\rangle` && ((t = `&rang;`), (e += ` `)),
                          e == `\\rVert` && ((t = `&#8741;`), (e += ` `)));
                        var n = new Et(0, i, t, r, e);
                        return ((n.blocks = [a]), a.adopt(n, 0, 0), n);
                      });
                  })
                );
              });
          }),
          t
        );
      })(I)),
      (k.right = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.parser = function () {
            return P.fail(`unmatched \\right`);
          }),
          t
        );
      })(I)));
    var jt = dt[`(`],
      Mt = dt[`)`],
      Nt = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return (
            (t.ctrlSeq = `\\binom`),
            (t.domView = new F(2, function (e) {
              return o(`span`, { class: `mq-non-leaf mq-bracket-container` }, [
                o(
                  `span`,
                  { style: `width:` + jt.width, class: `mq-paren mq-bracket-l mq-scaled` },
                  [jt.html()]
                ),
                o(
                  `span`,
                  {
                    style: `margin-left:` + jt.width + `; margin-right:` + Mt.width,
                    class: `mq-non-leaf mq-bracket-middle`,
                  },
                  [
                    o(`span`, { class: `mq-array mq-non-leaf` }, [
                      o.block(`span`, {}, e[0]),
                      o.block(`span`, {}, e[1]),
                    ]),
                  ]
                ),
                o(
                  `span`,
                  { style: `width:` + Mt.width, class: `mq-paren mq-bracket-r mq-scaled` },
                  [Mt.html()]
                ),
              ]);
            })),
            (t.textTemplate = [`choose(`, `,`, `)`]),
            (t.mathspeakTemplate = [`StartBinomial,`, `Choose`, `, EndBinomial`]),
            (t.ariaLabel = `binomial`),
            t
          );
        }
        return t;
      })(Tt);
    ((k.binom = k.binomial = Nt),
      (k.choose = (function (e) {
        X(t, e);
        function t() {
          return (e !== null && e.apply(this, arguments)) || this;
        }
        return (
          (t.prototype.createLeftOf = function (e) {
            yt.prototype.createLeftOf(e);
          }),
          t
        );
      })(Nt)),
      (k.editable = k.MathQuillMathField =
        (function (e) {
          X(t, e);
          function t() {
            var t = (e !== null && e.apply(this, arguments)) || this;
            return (
              (t.ctrlSeq = `\\MathQuillMathField`),
              (t.domView = new F(1, function (e) {
                return o(`span`, { class: `mq-editable-field` }, [
                  o.block(`span`, { class: `mq-root-block`, "aria-hidden": `true` }, e[0]),
                ]);
              })),
              t
            );
          }
          return (
            (t.prototype.parser = function () {
              var t = this,
                n = P.string,
                r = P.regex,
                i = P.succeed;
              return n(`[`)
                .then(r(/^[a-z][a-z0-9]*/i))
                .skip(n(`]`))
                .map(function (e) {
                  t.name = e;
                })
                .or(i(void 0))
                .then(e.prototype.parser.call(this));
            }),
            (t.prototype.finalizeTree = function (e) {
              var t = new Oe(this.getEnd(-1), this.domFrag().oneElement(), e);
              ((t.KIND_OF_MQ = `MathField`),
                (t.editable = !0),
                t.createTextarea(),
                t.editablesTextareaEvents(),
                t.cursor.insAtRightEnd(t.root),
                pe(t.root));
              function n(e) {
                if (
                  (e.parentNode && !b(e).hasClass(`mq-root-block`) && n(e.parentNode),
                  e.nodeType === Node.ELEMENT_NODE)
                ) {
                  var t = e;
                  t.getAttribute(`aria-hidden`) === `true` &&
                    (t.removeAttribute(`aria-hidden`),
                    b(e)
                      .children()
                      .eachElement(function (e) {
                        e.setAttribute(`aria-hidden`, `true`);
                      }));
                }
              }
              (n(this.domFrag().parent().oneElement()),
                this.domFrag().oneElement().removeAttribute(`aria-hidden`));
            }),
            (t.prototype.registerInnerField = function (e, t) {
              var n = this.getEnd(-1).controller,
                r = new t(n);
              ((e[this.name] = r), e.push(r));
            }),
            (t.prototype.latex = function () {
              return this.getEnd(-1).latex();
            }),
            (t.prototype.text = function () {
              return this.getEnd(-1).text();
            }),
            t
          );
        })(I)));
    var Pt = (function (e) {
      X(t, e);
      function t() {
        return (e !== null && e.apply(this, arguments)) || this;
      }
      return (
        (t.prototype.setOptions = function (e) {
          function t() {
            return ``;
          }
          return (
            (this.text = e.text || t),
            (this.domView = new F(0, function () {
              return o(`span`, {}, [a(e.htmlString || ``)]);
            })),
            (this.latex = e.latex || t),
            this
          );
        }),
        (t.prototype.parser = function () {
          var e = this,
            t = P.string,
            n = P.regex,
            r = P.succeed;
          return t(`{`)
            .then(n(/^[a-z][a-z0-9]*/i))
            .skip(t(`}`))
            .then(function (i) {
              return t(`[`)
                .then(n(/^[-\w\s]*/))
                .skip(t(`]`))
                .or(r(void 0))
                .map(function (t) {
                  return e.setOptions(ae[i](t));
                });
            });
        }),
        t
      );
    })(Ae);
    return (
      (k.embed = Pt),
      (A[`\\`] = (function (e) {
        X(t, e);
        function t() {
          var t = (e !== null && e.apply(this, arguments)) || this;
          return (
            (t.ctrlSeq = `\\`),
            (t.domView = new F(1, function (e) {
              return o(`span`, { class: `mq-latex-command-input-wrapper mq-non-leaf` }, [
                o(`span`, { class: `mq-latex-command-input mq-non-leaf` }, [
                  o.text(`\\`),
                  o.block(`span`, {}, e[0]),
                ]),
              ]);
            })),
            (t.textTemplate = [`\\`]),
            t
          );
        }
        return (
          (t.prototype.replaces = function (e) {
            ((this._replacedFragment = e.disown()),
              (this.isEmpty = function () {
                return !1;
              }));
          }),
          (t.prototype.createBlocks = function () {
            e.prototype.createBlocks.call(this);
            var t = this.getEnd(-1);
            ((t.focus = function () {
              return (
                this.parent.domFrag().addClass(`mq-hasCursor`),
                this.isEmpty() && this.parent.domFrag().removeClass(`mq-empty`),
                this
              );
            }),
              (t.blur = function () {
                return (
                  this.parent.domFrag().removeClass(`mq-hasCursor`),
                  this.isEmpty() && this.parent.domFrag().addClass(`mq-empty`),
                  this
                );
              }),
              (t.write = function (e, t) {
                if ((e.show().deleteSelection(), t.match(/[a-z]/i)))
                  (new je(t).createLeftOf(e), e.controller.aria.alert(t));
                else {
                  var n = this.parent.renderCommand(e);
                  (e.controller.aria.queue(n.mathspeak({ createdLeftOf: e })),
                    t !== `\\` || !this.isEmpty()
                      ? e.parent.write(e, t)
                      : e.controller.aria.alert());
                }
              }));
            var n = t.keystroke;
            t.keystroke = function (e, t, r) {
              if (e === `Tab` || e === `Enter` || e === `Spacebar`) {
                var i = this.parent.renderCommand(r.cursor);
                (r.aria.alert(i.mathspeak({ createdLeftOf: r.cursor })), t?.preventDefault());
              } else return n.call(this, e, t, r);
            };
          }),
          (t.prototype.createLeftOf = function (t) {
            if ((e.prototype.createLeftOf.call(this, t), this._replacedFragment)) {
              var n = this.domFrag(),
                r = n.oneElement();
              this._replacedFragment.domFrag().addClass(`mq-blur`);
              var i = function (e) {
                return ((e.target = r), r.dispatchEvent(e), !1);
              };
              (r.addEventListener(`mousedown`, i),
                r.addEventListener(`mouseup`, i),
                this._replacedFragment.domFrag().insertBefore(n.children().first()));
            }
          }),
          (t.prototype.latex = function () {
            return `\\` + this.getEnd(-1).latex() + ` `;
          }),
          (t.prototype.renderCommand = function (e) {
            (this.setDOM(this.domFrag().children().lastElement()),
              this.remove(),
              this[1] ? e.insLeftOf(this[1]) : e.insAtRightEnd(this.parent));
            var t = this.getEnd(-1).latex();
            t ||= ` `;
            var n = k[t];
            if (n) {
              var r = void 0;
              return (
                (r = ee(n) ? new n(t) : n(t)),
                this._replacedFragment && r.replaces(this._replacedFragment),
                r.createLeftOf(e),
                r
              );
            }
            var r = new Fe();
            return (
              r.replaces(t),
              r.createLeftOf(e),
              e.insRightOf(r),
              this._replacedFragment && this._replacedFragment.remove(),
              r
            );
          }),
          t
        );
      })(I)),
      M
    );
  })(),
  wv = `+-=<>~,`,
  Tv = Object.freeze([`Ctrl-Z`, `Meta-Z`, `Ctrl-Shift-Z`, `Meta-Shift-Z`, `Ctrl-Y`]);
function Ev(e) {
  return Tv.includes(e);
}
function Dv() {
  return {
    autoOperatorNames: _e(),
    autoCommands: ve(),
    charsThatBreakOutOfSupSub: wv,
    autoSubscriptNumerals: !0,
    disableAutoSubstitutionInSubscripts: !0,
    restrictMismatchedBrackets: !0,
    enableDigitGrouping: !0,
    disableCopyPaste: !0,
    typingAsteriskWritesTimesSymbol: !1,
    typingPercentWritesPercentOf: !1,
    typingSlashWritesDivisionSymbol: !1,
    typingSlashCreatesNewFraction: !1,
  };
}
var Ov = Object.freeze({
    displaystyle: ``,
    tfrac: `\\frac`,
    leqslant: `\\le`,
    geqslant: `\\ge`,
    lvert: `\\left|`,
    rvert: `\\right|`,
  }),
  kv = /\\(displaystyle|tfrac|leqslant|geqslant|lvert|rvert)(?![a-zA-Z])|\\[,;:!]/g,
  Av = (e, t) => t.split(` `).map((t) => [t, e]),
  jv = new Map([
    ...Av([`math`, `math`], `frac dfrac cfrac fraction binom binomial nthroot`),
    ...Av(
      [`math`],
      `sqrt cbrt mathrm mathit mathbf mathsf mathtt dot hat vec tilde underline overline bar overrightarrow overleftarrow overleftrightarrow overarc`
    ),
    ...Av(
      [`text`],
      `text textnormal textrm textup textmd em italic italics emph textit textsl strong bold textbf sf textsf tt texttt uppercase lowercase operatorname mathbb`
    ),
    ...Av([`text`, `math`], `textcolor class`),
  ]),
  Mv = new Set([..._e().split(` `), ...ve().split(` `)]),
  Nv = Math.max(...[...Mv].map((e) => e.length)),
  Pv = new Set(de.filter((e) => e.category !== null).map((e) => e.name)),
  Fv = new Set(de.filter((e) => e.category === null).map((e) => e.name)),
  Iv = new Set(`cdot times div le leq ge geq lt gt`.split(` `)),
  Lv = new Set([`*`, `/`, `=`, `<`, `>`, `:`]),
  Rv = new Set([`!`, `%`, `'`]),
  zv = new Set([`operatorname`, `text`, `mathrm`]),
  Bv = /\^(?:\s*\{\s*\\circ\s*\}|\\circ(?![a-zA-Z]))/y,
  Vv = (e) => e !== void 0 && /^[a-zA-Z]$/.test(e),
  Hv = (e) => e !== void 0 && e >= `0` && e <= `9`,
  Uv = (e) => e !== void 0 && /^\s$/.test(e),
  Wv = (e) => (e === `none` ? `none` : `factors`),
  Gv = (e, t) => (Pv.has(e) ? `start` : Fv.has(e) ? `none` : Wv(t));
function Kv(e) {
  return qv({ s: e.replace(kv, (e, t) => (t === void 0 ? `` : Ov[t])), i: 0 }, null).text;
}
function qv(e, t) {
  let { s: n } = e,
    r = { text: ``, comma: !1, sum: !1 },
    i = `other`,
    a = `none`,
    o = [];
  for (; e.i < n.length; ) {
    let s = n[e.i];
    if ((s === t && o.length === 0) || (s === `}` && t !== null)) break;
    if (Uv(s)) {
      r.text += ty(e);
      continue;
    }
    let c = r.text.trim() === ``;
    if (Vv(s)) {
      let t = e.i;
      for (; Vv(n[e.i]); ) e.i += 1;
      let o = n.slice(t, e.i),
        s = Jv(o);
      for (let e of s) a = e.name ? Gv(e.text, a) : Wv(a);
      let c = !s[s.length - 1].name,
        l = c && a === `none` && !o.endsWith(`e`) ? Yv(e) : ``;
      ((r.text += o + l), (i = c && l === `` ? `identifier` : `other`));
    } else if (s === `\\`) {
      let t = Xv(e);
      ((r.text += t.text),
        (i = `other`),
        t.name !== `left` && t.name !== `right` && (a = Iv.has(t.name) ? `none` : Gv(t.name, a)));
    } else if (s === `^`) {
      Bv.lastIndex = e.i;
      let t = i === `superscript` ? Bv.exec(n) : null;
      t === null
        ? ((e.i += 1), (r.text += `^` + Qv(e, `math`)), (i = `superscript`))
        : ((e.i += t[0].length), (r.text += Vv(n[e.i]) ? `\\degree ` : `\\degree`), (i = `other`));
    } else
      s === `_`
        ? ((e.i += 1), (r.text += `_` + Qv(e, `text`)), i !== `identifier` && (i = `other`))
        : s === `{`
          ? ((r.text += $v(e, i === `identifier`, a)), (i = `other`), (a = Wv(a)))
          : (s === `(` || s === `[`
              ? (o.push(a === `start` && s === `(` ? `none` : Wv(a)), (a = `none`))
              : s === `)` || s === `]`
                ? (a = o.pop() ?? `none`)
                : s === `+` || s === `-`
                  ? (o.length === 0 && !c && (r.sum = !0), a !== `start` && (a = `none`))
                  : s === `,`
                    ? (o.length === 0 && (r.comma = !0), (a = `none`))
                    : Lv.has(s)
                      ? (a = `none`)
                      : Rv.has(s) || (a = Wv(a)),
            (r.text += s),
            (e.i += 1),
            (i = `other`));
  }
  return r;
}
function Jv(e) {
  let t = [];
  for (let n = 0; n < e.length; ) {
    let r = 0;
    for (let t = 1; t <= Nv && n + t <= e.length; t++) Mv.has(e.slice(n, n + t)) && (r = t);
    (t.push(r === 0 ? { text: e[n], name: !1 } : { text: e.slice(n, n + r), name: !0 }),
      (n += Math.max(r, 1)));
  }
  return t;
}
function Yv(e) {
  let { s: t } = e,
    n = e.i;
  for (; Uv(t[n]); ) n += 1;
  if (!Hv(t[n])) return ``;
  let r = n,
    i = n > e.i,
    a = !1;
  for (;;)
    if (Hv(t[n])) n += 1;
    else if (t[n] === `.` && !a) ((a = !0), (n += 1));
    else {
      let e = n;
      for (; Uv(t[e]); ) e += 1;
      if (e === n || !(Hv(t[e]) || (t[e] === `.` && !a))) break;
      ((i = !0), (n = e));
    }
  return !i || a ? `` : ((e.i = n), `\\cdot` + t.slice(r, n));
}
function Xv(e) {
  let { s: t } = e,
    n = e.i + 1;
  if (Vv(t[n])) for (; Vv(t[n]); ) n += 1;
  else n < t.length && (n += 1);
  let r = t.slice(e.i + 1, n),
    i = t.slice(e.i, n);
  if (((e.i = n), r === `sqrt`)) return { text: i + Zv(e), name: r };
  let a = (jv.get(r) ?? []).map((t) => Qv(e, t));
  i += a.join(``);
  let o = zv.has(r) ? /^\{([a-zA-Z]+)\}$/.exec(a[0]) : null;
  return { text: i, name: o === null ? r : o[1] };
}
function Zv(e) {
  let { s: t } = e,
    n = ty(e);
  t[e.i] === `[` &&
    ((e.i += 1), (n += `[` + qv(e, `]`).text), t[e.i] === `]` && ((n += `]`), (e.i += 1)));
  let r = e.i,
    i = ty(e);
  if (t[e.i] !== `(`) return ((e.i = r), n + Qv(e, `math`));
  e.i += 1;
  let a = qv(e, `)`).text;
  return t[e.i] === `)` ? ((e.i += 1), `${n}${i}{${a}}`) : `${n}${i}(${a}`;
}
function Qv(e, t) {
  let { s: n } = e,
    r = ty(e),
    i = n[e.i];
  if (i === `{`) {
    e.i += 1;
    let i = t === `math` ? qv(e, `}`).text : ey(e),
      a = n[e.i] === `}`;
    return (a && (e.i += 1), `${r}{${i}${a ? `}` : ``}`);
  }
  return i === `\\` ? r + Xv(e).text : i === void 0 || i === `}` ? r : ((e.i += 1), r + i);
}
function $v(e, t, n) {
  let { s: r } = e;
  e.i += 1;
  let i = qv(e, `}`),
    a = r[e.i] === `}`;
  a && (e.i += 1);
  let o = `{${i.text}${a ? `}` : ``}`;
  return !a || i.comma || i.text.trim() === `` || n === `factors` || (n === `start` && !i.sum)
    ? o
    : `${t ? `\\cdot` : ``}\\left(${i.text}\\right)`;
}
function ey(e) {
  let { s: t } = e,
    n = e.i,
    r = 0;
  for (; e.i < t.length; ) {
    let n = t[e.i];
    if (n === `}` && r === 0) break;
    (n === `{` ? (r += 1) : n === `}` && --r, (e.i += n === `\\` ? 2 : 1));
  }
  return ((e.i = Math.min(e.i, t.length)), t.slice(n, e.i));
}
function ty(e) {
  let t = e.i;
  for (; Uv(e.s[e.i]); ) e.i += 1;
  return e.s.slice(t, e.i);
}
var ny = new Map([
    [`sin`, `sine`],
    [`cos`, `cosine`],
    [`tan`, `tangent`],
    [`csc`, `cosecant`],
    [`sec`, `secant`],
    [`cot`, `cotangent`],
    [`arcsin`, `arc sine`],
    [`arccos`, `arc cosine`],
    [`arctan`, `arc tangent`],
    [`arccsc`, `arc cosecant`],
    [`arcsec`, `arc secant`],
    [`arccot`, `arc cotangent`],
    [`ln`, `natural log`],
    [`log`, `log`],
    [`exp`, `exp`],
  ]),
  ry = new Map([
    [2, [`half`, `halves`]],
    [3, [`third`, `thirds`]],
    [4, [`fourth`, `fourths`]],
    [5, [`fifth`, `fifths`]],
    [6, [`sixth`, `sixths`]],
    [7, [`seventh`, `sevenths`]],
    [8, [`eighth`, `eighths`]],
    [9, [`ninth`, `ninths`]],
    [10, [`tenth`, `tenths`]],
  ]),
  iy = {
    "=": `equals`,
    "<": `less than`,
    ">": `greater than`,
    "<=": `less than or equal to`,
    ">=": `greater than or equal to`,
  };
function ay(e) {
  let t = Cn(e),
    n = Wn(e, { userFunctions: new Set(t === null ? [] : [t.name]) });
  return n.ok ? oy(n.tree, n.normalized).trim() : ``;
}
function oy(e, t) {
  let n = (e, n) => {
    let r = oy(e, t);
    return sy(e) < n ? cy(r) : r;
  };
  switch (e.kind) {
    case `num`:
      return ly(e, t);
    case `id`:
      return dy(e.name);
    case `const`:
      return e.name;
    case `add`:
      return Z(n(e.left, 2), `plus`, n(e.right, 2));
    case `sub`:
      return Z(n(e.left, 2), `minus`, n(e.right, 3));
    case `mul`: {
      let t = n(e.right, 3),
        r = /^[0-9.]/.test(t) ? [`times`] : [];
      return Z(n(e.left, 3), ...r, t);
    }
    case `div`:
      return fy(e.left, e.right, t);
    case `pow`:
      return py(n(e.left, 7), e.right, t);
    case `neg`:
      return Z(`negative`, n(e.arg, 4));
    case `pct`:
      return Z(n(e.arg, 7), `percent`);
    case `deg`:
      return Z(n(e.arg, 7), `degrees`);
    case `fact`:
      return Z(n(e.arg, 7), `factorial`);
    case `abs`:
      return `Start Absolute Value, ${oy(e.arg, t)}, End Absolute Value`;
    case `root`:
      return my(e.arg, e.index, t);
    case `call`: {
      let t = e.args.map((e) => n(e, 6));
      return hy(e.name, t);
    }
    case `list`:
      return Z(`list`, ...e.items.map((e) => oy(e, t)));
    case `sim`:
      return Z(oy(e.left, t), `is fitted to`, oy(e.right, t));
    case `point`:
      return Z(`left parenthesis`, oy(e.x, t), `comma`, oy(e.y, t), `right parenthesis`);
    case `rel`: {
      let n = [oy(e.operands[0], t)];
      return (e.ops.forEach((r, i) => n.push(iy[r], oy(e.operands[i + 1], t))), Z(...n));
    }
  }
}
function sy(e) {
  switch (e.kind) {
    case `rel`:
      return 1;
    case `add`:
    case `sub`:
      return 2;
    case `mul`:
      return 3;
    case `neg`:
      return 4;
    case `call`:
      return 5;
    case `pow`:
    case `pct`:
    case `deg`:
    case `fact`:
      return 6;
    default:
      return 7;
  }
}
function cy(e) {
  return Z(`left parenthesis`, e, `right parenthesis`);
}
function Z(...e) {
  return e.join(` `);
}
function ly(e, t) {
  let n = t.slice(e.span.start, e.span.end).replace(/[^0-9.]/g, ``);
  return n === `` ? String(e.value) : n;
}
function uy(e, t) {
  return e.kind === `num` && /^[0-9]+$/.test(ly(e, t));
}
function dy(e) {
  let t = /^(.+?)_\{(.+)\}$/.exec(e);
  return t === null
    ? e.startsWith(`\\`)
      ? e.slice(1).replace(/^var/, ``)
      : /^[A-Z]$/.test(e)
        ? Z(`upper`, e)
        : e
    : Z(dy(t[1]), `sub`, t[2]);
}
function fy(e, t, n) {
  if (uy(e, n) && uy(t, n)) {
    let r = ly(e, n),
      i = ry.get(Number(ly(t, n)));
    if (i !== void 0) return Z(r, r === `1` ? i[0] : i[1]);
  }
  return `Start Fraction, ${oy(e, n)} Over ${oy(t, n)}, End Fraction`;
}
function py(e, t, n) {
  return t.kind === `num` && t.value === 2
    ? Z(e, `squared`)
    : t.kind === `num` && t.value === 3
      ? Z(e, `cubed`)
      : `${e} Superscript, ${oy(t, n)}, Baseline`;
}
function my(e, t, n) {
  let r = oy(e, n);
  return t === null
    ? `Start Root, ${r}, End Root`
    : t.kind === `num` && t.value === 3
      ? `Start Cube Root, ${r}, End Cube Root`
      : `Start Root Index ${oy(t, n)}, ${r}, End Root`;
}
function hy(e, t) {
  return e === `log` && t.length === 2
    ? Z(`log base`, t[1], `of`, t[0])
    : Z(ny.get(e) ?? dy(e), `of`, t.join(` comma `));
}
var gy = null;
function _y() {
  return ((gy ??= Cv.getInterface(3)), gy);
}
var vy = Object.freeze({
    autocapitalize: `off`,
    autocomplete: `off`,
    autocorrect: `off`,
    spellcheck: `false`,
  }),
  yy = class {
    constructor(e, t) {
      ((this.textarea = null),
        (this.listeners = []),
        (this.silent = 0),
        (this.lastLatex = ``),
        (this.destroyed = !1),
        (this.options = t),
        (this.element = e.ownerDocument.createElement(`span`)),
        (this.element.className = `kc-math-field`),
        e.append(this.element));
      let n = {
        ...Dv(),
        substituteTextarea: () => this.createTextarea(),
        overrideTypedText: (e) => this.transact((t) => t.typedText(e)),
        overrideKeystroke: (e, t) => {
          Ev(e) ? t.preventDefault() : this.transact((n) => n.keystroke(e, t));
        },
        handlers: {
          edit: () => this.edited(),
          enter: () => this.live() && this.options.onEnter(),
          upOutOf: () => this.live() && this.options.onArrowOut(`up`),
          downOutOf: () => this.live() && this.options.onArrowOut(`down`),
          moveOutOf: (e) => this.live() && this.options.onMoveOutOf?.(e < 0 ? `left` : `right`),
          deleteOutOf: (e) => this.live() && this.options.onDeleteOutOf(e < 0 ? `left` : `right`),
        },
      };
      this.silent++;
      try {
        this.mq = _y().MathField(this.element, n);
      } finally {
        this.silent--;
      }
    }
    focus() {
      this.live()?.focus();
    }
    blur() {
      this.live()?.blur();
    }
    latex(e) {
      let t = this.live();
      if (e === void 0) return t ? t.latex() : ``;
      if (!t) return;
      let n = t.latex(),
        r = !1;
      this.silent++;
      try {
        (t.latex(Kv(e)), t.latex().length > this.options.maxLength && (t.latex(n), (r = !0)));
      } finally {
        this.silent--;
      }
      ((this.lastLatex = t.latex()), r && this.options.onRefused(`char-limit`));
    }
    write(e) {
      this.transact((t) => t.write(Kv(e)));
    }
    cmd(e) {
      this.transact((t) => t.cmd(e));
    }
    keystroke(e) {
      this.transact((t) => t.keystroke(e));
    }
    typedText(e) {
      this.transact((t) => t.typedText(e));
    }
    run(e) {
      this.transact((t) => {
        for (let { op: n, arg: r } of e)
          n === `write`
            ? t.write(Kv(r))
            : n === `cmd`
              ? t.cmd(r)
              : n === `keystroke`
                ? t.keystroke(r)
                : t.typedText(r);
      });
    }
    select() {
      this.live()?.select();
    }
    clearSelection() {
      this.live()?.clearSelection();
    }
    selectedLatex() {
      return this.live()?.selectionLatex() ?? null;
    }
    reflow() {
      let e = this.live();
      e && e.reflow();
    }
    setInputMode(e) {
      this.live() && this.textarea?.setAttribute(`inputmode`, e);
    }
    speechText() {
      let e = this.live(),
        t = e ? e.latex() : ``;
      return !e || t === `` ? `` : ay(t) || e.mathspeak().trim();
    }
    destroy() {
      let e = this.live();
      if (!this.destroyed) {
        this.destroyed = !0;
        for (let [e, t] of this.listeners) this.textarea?.removeEventListener(e, t);
        ((this.listeners = []), e && (e.blur(), e.revert()), this.element.remove());
      }
    }
    live() {
      return this.destroyed || this.mq === void 0 ? null : this.mq;
    }
    transact(e) {
      let t = this.live();
      if (!t) return;
      let n = t.latex();
      this.silent++;
      try {
        e(t);
      } finally {
        this.silent--;
      }
      if (this.destroyed) return;
      let r = t.latex();
      if (r.length > this.options.maxLength) {
        this.silent++;
        try {
          t.latex(n);
        } finally {
          this.silent--;
        }
        this.options.onRefused(`char-limit`);
      } else r !== this.lastLatex && ((this.lastLatex = r), this.options.onEdit(r));
    }
    edited() {
      let e = this.live();
      if (!e || this.silent > 0) return;
      let t = e.latex();
      t !== this.lastLatex && ((this.lastLatex = t), this.options.onEdit(t));
    }
    createTextarea() {
      let e = this.element.ownerDocument.createElement(`textarea`);
      for (let [t, n] of Object.entries(vy)) e.setAttribute(t, n);
      (e.setAttribute(`inputmode`, `text`), e.setAttribute(`aria-label`, this.options.ariaLabel));
      let t = (e) => e.preventDefault();
      this.listeners = [
        [`focus`, () => this.live() && this.options.onFocus()],
        [`blur`, () => this.live() && this.options.onBlur()],
        [
          `beforeinput`,
          (e) => {
            let { inputType: t } = e;
            (t === `historyUndo` || t === `historyRedo`) && e.preventDefault();
          },
        ],
        [`copy`, t],
        [`cut`, t],
        [`paste`, t],
      ];
      for (let [t, n] of this.listeners) e.addEventListener(t, n);
      return ((this.textarea = e), e);
    }
  };
function by(e, t) {
  return new yy(e, t);
}
var xy = (0, h.createContext)(by),
  Sy = new Set([
    `curve-y`,
    `curve-x`,
    `implicit`,
    `vertical-lines`,
    `horizontal-lines`,
    `region`,
    `constant-relation`,
  ]);
function Cy(e) {
  return e.kind === `point` ? `point` : Sy.has(e.kind) ? `line` : null;
}
function wy(e) {
  let t = (t) => `kc-row-${e}-${t}`;
  return {
    label: t(`label`),
    speech: t(`speech`),
    value: t(`value`),
    error: t(`error`),
    hint: t(`hint`),
  };
}
function Ty(e) {
  return e.element.querySelector(`textarea`) ?? e.element;
}
var Ey = `Each cell can be up to 128 characters.`,
  Dy = `Tables hold up to 1,000 rows.`;
function Oy(e) {
  let { tableId: t, column: n, row: r } = e,
    i = om(),
    a = (0, h.useContext)(Mp),
    o = gp(),
    s = (0, h.useContext)(xy),
    c = (0, h.useRef)(null),
    l = (0, h.useRef)(null),
    u = (0, h.useRef)(!1),
    d = (0, h.useRef)(!1),
    f = (0, h.useRef)(e);
  (0, h.useLayoutEffect)(() => {
    f.current = e;
  });
  let p = Op(t, n, r);
  return (
    (0, h.useLayoutEffect)(() => {
      let e = s(c.current, {
        ariaLabel: f.current.name,
        maxLength: 128,
        onEdit(t) {
          if (u.current || vv(e)) return;
          let n = f.current.onEdit(i, t);
          n !== null &&
            ((u.current = !0),
            e.latex(f.current.latex),
            (u.current = !1),
            o.announce(n === `char-limit` ? Ey : Dy));
        },
        onEnter: () => f.current.keys.onEnter(),
        onArrowOut: (e) => f.current.keys.onArrowOut(e),
        onMoveOutOf: (e) => f.current.keys.onMoveOutOf(e),
        onDeleteOutOf(t) {
          t === `left` && e.latex() === `` && f.current.keys.onDeleteOutOf();
        },
        onFocus() {
          (a.noteCell(t, Op(t, f.current.column, f.current.row)),
            i.setFocusedRow(t),
            i.activateExpression(t),
            d.current && f.current.onTouchFocus(t),
            (d.current = !1));
        },
        onBlur() {
          (i.setFocusedRow(null), i.endEditGroup());
        },
        onRefused: () => o.announce(Ey),
      });
      ((l.current = e), (u.current = !0), e.latex(f.current.latex), (u.current = !1));
      let n = (e) => {
          e.key !== `Tab` ||
            e.defaultPrevented ||
            e.altKey ||
            e.ctrlKey ||
            e.metaKey ||
            (f.current.keys.onTab(e.shiftKey) && e.preventDefault());
        },
        r = c.current;
      return (
        r.addEventListener(`keydown`, n),
        () => {
          (r.removeEventListener(`keydown`, n), (l.current = null), e.destroy());
        }
      );
    }, [o, s, i, a, t]),
    (0, h.useLayoutEffect)(() => {
      let e = l.current;
      if (e !== null) return a.registerField(p, e);
    }, [a, p, o, s, i, t]),
    (0, h.useLayoutEffect)(() => {
      let t = l.current;
      t !== null && t.latex() !== e.latex && ((u.current = !0), t.latex(e.latex), (u.current = !1));
    }, [e.latex]),
    (0, h.useLayoutEffect)(() => {
      l.current?.setInputMode(e.keypadOpen ? `none` : `text`);
    }, [e.keypadOpen, o, s, i, a, t]),
    (0, h.useLayoutEffect)(() => {
      let t = l.current;
      if (t === null) return;
      let n = Ty(t);
      (n.setAttribute(`aria-label`, e.name),
        e.errorId === null
          ? (n.removeAttribute(`aria-invalid`), n.removeAttribute(`aria-describedby`))
          : (n.setAttribute(`aria-invalid`, `true`),
            n.setAttribute(`aria-describedby`, e.errorId)));
    }),
    (0, J.jsx)(`div`, {
      className: `kc-table-field`,
      ref: c,
      onPointerDown: (e) => {
        d.current = e.pointerType === `touch`;
      },
    })
  );
}
var ky = `₀₁₂₃₄₅₆₇₈₉`;
function Ay(e, t) {
  let n = ay(e).trim();
  return n === ``
    ? `Column ${t + 1}`
    : n.replace(
        /\b([A-Za-z]) sub (\d+)\b/g,
        (e, t, n) => `${t}${[...n].map((e) => ky[Number(e)]).join(``)}`
      );
}
function jy(e) {
  return Math.max(0, ...(e.columns ?? []).map((e) => e.values.length));
}
function My(e, t, n) {
  let r = (e, t) => `${e} ${t}${e === 1 ? `` : `s`}`;
  return `Table ${e}, ${r(t, `column`)}, ${r(n, `row`)}`;
}
function Ny(e, t, n) {
  return `${e}, row ${t + 1}${n.trim() === `` ? `, blank` : ``}`;
}
function Py(e, t, n) {
  return `${e}, row ${t + 1}, computed${n === null ? `` : `, ${n}`}`;
}
function Fy(e, t, n) {
  return `kc-row-${e}-cell-${t}-${n}-error`;
}
var Iy = `New column header`;
function Ly(e, { column: t, row: n }, r) {
  e.focus.focusRow(Op(e.tableId, t, n), r === `select` ? `all` : r);
}
function Ry(e) {
  return e.engine.getSnapshot().rows.find((t) => t.id === e.tableId);
}
function zy(e) {
  let t = e.columns ?? [],
    n = e.table?.analysis.columns ?? [],
    r = t.map((e, t) => t).filter((e) => n[e]?.role !== `computed`),
    i = t.map((e, t) => ({ column: t, row: `h` })),
    a = jy(e);
  for (let e = 0; e <= a; e++) for (let t of r) i.push({ column: t, row: e });
  return i;
}
function By(e, t, n) {
  let r = e.filter((e) => e.row === n);
  return r.length === 0
    ? null
    : r.reduce((e, n) => (Math.abs(n.column - t) < Math.abs(e.column - t) ? n : e));
}
function Vy(e) {
  e.engine.getSnapshot().rows.at(-1)?.id === e.tableId
    ? ov(e.engine, e.focus, e.announcer, e.tableId, `focus`)
    : uv(e.engine, e.focus, e.tableId, `down`);
}
function Hy(e, t, n) {
  return t === `up`
    ? e === `h`
      ? null
      : e === 0
        ? `h`
        : e - 1
    : e === `h`
      ? 0
      : e < n
        ? e + 1
        : null;
}
function Uy(e, t, n) {
  let r = (e) => ({ view: e, places: zy(e), rows: jy(e) }),
    i = () => {
      let t = Ry(e);
      return t === void 0 ? null : r(t);
    };
  return {
    onEnter() {
      let r = i();
      if (r === null) return;
      if (n !== `h` && n >= r.rows) return Vy(e);
      let a = By(r.places, t, n === `h` ? 0 : n + 1);
      a !== null && Ly(e, a, `select`);
    },
    onArrowOut: (r) => {
      let a = i();
      if (a === null) return;
      let o = Hy(n, r, a.rows),
        s = o === null ? null : By(a.places, t, o);
      s === null
        ? r === `up`
          ? uv(e.engine, e.focus, e.tableId, `up`)
          : Vy(e)
        : Ly(e, s, `select`);
    },
    onMoveOutOf(r) {
      let a = i();
      if (a === null) return;
      let o = a.places.filter((e) => e.row === n),
        s = o.findIndex((e) => e.column === t),
        c = o[r === `left` ? s - 1 : s + 1];
      s >= 0 && c !== void 0 && Ly(e, c, r === `left` ? `end` : `start`);
    },
    onTab(r) {
      let a = i();
      if (a === null) return !1;
      let o = a.places.findIndex((e) => e.column === t && e.row === n),
        s = a.places[r ? o - 1 : o + 1];
      return o >= 0 && s !== void 0 && (Ly(e, s, `select`), !0);
    },
    onDeleteOutOf() {
      let a = i();
      if (a === null) return;
      if (n === `h`) {
        t > 0 && Ly(e, { column: t - 1, row: `h` }, `end`);
        return;
      }
      if (n >= a.rows) {
        let n = a.rows > 0 ? By(a.places, t, a.rows - 1) : null;
        n !== null && Ly(e, n, `select`);
        return;
      }
      if ((a.view.columns ?? []).every((e) => (e.values[n] ?? ``).trim() === ``)) {
        e.engine.deleteTableRow(e.tableId, n);
        let i = By(r(Ry(e) ?? a.view).places, t, Math.max(0, n - 1));
        i !== null && Ly(e, i, `select`);
        return;
      }
      let o = By(a.places, t, n === 0 ? `h` : n - 1);
      o !== null && Ly(e, o, n === 0 ? `end` : `select`);
    },
  };
}
function Wy(e) {
  let t = Ry(e);
  if (t === void 0) return;
  let n = jy(t);
  if (n >= 1e3) {
    e.announcer?.announce(Dy);
    return;
  }
  let r = By(zy(t), 0, n);
  r !== null && Ly(e, r, `start`);
}
function Gy(e, t) {
  e.engine.deleteTableRow(e.tableId, t);
  let n = Ry(e);
  if (n === void 0) return;
  let r = jy(n),
    i = By(zy(n), 0, r === 0 ? 0 : Math.min(t, r - 1));
  i !== null && Ly(e, i, `end`);
}
function Ky(e) {
  let t = /:(\d+):(\d+|h)$/.exec(e);
  return t === null ? null : { column: Number(t[1]), row: t[2] === `h` ? `h` : Number(t[2]) };
}
function qy(e, t, n, r) {
  let i = e.getSnapshot().rows.find((e) => e.id === r);
  if (i === void 0 || i.type !== `table`) return null;
  let a = i.columns ?? [],
    o = t.lastCell(r),
    s = o === null ? null : Ky(o);
  (s === null || s.column >= a.length || t.field(o) === null) && (s = { column: 0, row: jy(i) });
  let { column: c, row: l } = s,
    u = t.field(Op(r, c, l));
  return u === null
    ? null
    : {
        field: u,
        commit: (t) =>
          l === `h` ? e.editHeader(r, c, t, `keypad`) : e.editCell(r, c, l, t, `keypad`),
        keys: Uy({ engine: e, focus: t, announcer: n, tableId: r }, c, l),
      };
}
var Jy = [
    { op: `keystroke`, arg: `Backspace` },
    { op: `typedText`, arg: `~` },
  ],
  Yy = new WeakMap();
function Xy(e) {
  let t = Yy.get(e);
  return (t === void 0 && ((t = () => e.clear()), Yy.set(e, t)), t);
}
function Zy(e) {
  let t = Ty(e);
  return t.getRootNode().activeElement === t;
}
function Qy(e, t, n) {
  let r = e.activeRowId() ?? e.lastFocusedRowId() ?? t.rows[0]?.id ?? null;
  if (r === null) return null;
  if (t.rows.find((e) => e.id === r)?.type === `table`) {
    let t = qy(n, e, null, r);
    return t === null ? null : { rowId: r, field: t.field, cell: t };
  }
  let i = e.field(r);
  return i === null ? null : { rowId: r, field: i };
}
function $y(e, t) {
  let { engine: n, focus: r, announcer: i, doubleTap: a } = e,
    { behaviour: o } = t;
  if (o.type !== `insert` && o.type !== `enter`) return;
  let s = Qy(r, n.getSnapshot(), n);
  if (s === null) return;
  let { rowId: c, field: l, cell: u } = s;
  if (o.type === `enter`) {
    if ((a.clear(), u !== void 0)) return u.keys.onEnter();
    ov(n, r, i, c, Zy(l) ? `focus` : `activate`);
    return;
  }
  if (t.id === `equals` && a.matches(c, l.latex())) {
    (n.endEditGroup(),
      _v(n, i, c, l, (e) => e.run(Jy), u?.commit),
      n.endEditGroup(),
      a.clear(),
      i?.announce(Y.tilde));
    return;
  }
  let { op: d, arg: f } = o.action,
    p = l.latex(),
    m = _v(n, i, c, l, (e) => e[d](f), u?.commit),
    h = l.latex();
  t.id === `equals` && m === null && h !== p
    ? (a.record(c, h), l.element.addEventListener(`keydown`, Xy(a), { once: !0 }))
    : a.clear();
}
function eb(e) {
  let t = null;
  return {
    record(n, r) {
      t = { rowId: n, latex: r, at: e() };
    },
    matches(n, r) {
      return t !== null && t.rowId === n && t.latex === r && e() - t.at <= 300;
    },
    clear() {
      t = null;
    },
  };
}
var tb = {
  1: `Trig Functions`,
  2: `Inverse Trig Functions`,
  3: `Statistics`,
  4: `List Operations`,
  5: `Visualizations`,
  6: `Probability Distributions`,
  7: `Inference`,
  8: `Calculus`,
  9: `Hyperbolic Trig Functions`,
  10: `Geometry`,
  11: `Custom Colors`,
  12: `Number Theory`,
  13: `Matrices`,
  14: `Complex`,
  15: `Advanced`,
};
function nb(e) {
  let { label: t } = e;
  return t.endsWith(`⁻¹`)
    ? (0, J.jsxs)(J.Fragment, { children: [t.slice(0, -2), (0, J.jsx)(`sup`, { children: `−1` })] })
    : t.endsWith(`ₐ`)
      ? (0, J.jsxs)(J.Fragment, {
          children: [
            t.slice(0, -1),
            (0, J.jsx)(`sub`, { children: (0, J.jsx)(`i`, { children: `a` }) }),
          ],
        })
      : (0, J.jsx)(J.Fragment, { children: t });
}
var rb = { inert: !0 },
  ib = (e) => e.preventDefault();
function ab(e) {
  let { id: t, state: n, onInsert: r } = e;
  return (0, J.jsx)(`div`, {
    id: t,
    className: `kc-functions-panel`,
    role: `group`,
    "aria-label": `Functions`,
    "data-state": n,
    ...(n === `closing` ? rb : {}),
    children: Te().map((e) =>
      (0, J.jsxs)(
        `div`,
        {
          className: `kc-functions-category`,
          children: [
            (0, J.jsx)(`h3`, { children: tb[e.id] ?? e.heading }),
            (0, J.jsx)(`div`, {
              role: `group`,
              "aria-label": e.heading,
              children: e.entries.map((e) =>
                (0, J.jsx)(
                  `button`,
                  {
                    type: `button`,
                    className: `kc-function`,
                    "aria-label": e.spoken,
                    onMouseDown: ib,
                    onClick: () => r(e),
                    children: (0, J.jsx)(nb, { label: e.label }),
                  },
                  e.spoken
                )
              ),
            }),
          ],
        },
        e.id
      )
    ),
  });
}
function ob() {
  let e = null,
    t = null,
    n = () => {
      (e !== null && clearTimeout(e), t !== null && clearInterval(t), (e = null), (t = null));
    };
  return {
    start(r) {
      (n(),
        r(),
        (e = setTimeout(() => {
          ((e = null), r(), (t = setInterval(r, 80)));
        }, 400)));
    },
    stop: n,
  };
}
function sb(e) {
  return (0, J.jsx)(`svg`, {
    className: `kc-key-icon`,
    width: e.w,
    height: e.h,
    viewBox: `0 0 ${e.w} ${e.h}`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: e.children,
  });
}
function cb(e) {
  return (0, J.jsx)(sb, {
    w: 18,
    h: 10,
    children: (0, J.jsxs)(`g`, {
      transform: e.flip ? `translate(18 0) scale(-1 1)` : void 0,
      fill: `currentColor`,
      children: [
        (0, J.jsx)(`rect`, { x: 4, y: 4.15, width: 13.5, height: 1.7 }),
        (0, J.jsx)(`path`, { d: `M0.5 5L4.7 2.1V7.9Z` }),
      ],
    }),
  });
}
var lb = {
  left: () => (0, J.jsx)(cb, { flip: !1 }),
  right: () => (0, J.jsx)(cb, { flip: !0 }),
  backspace: () =>
    (0, J.jsx)(sb, {
      w: 18,
      h: 12,
      children: (0, J.jsx)(`path`, {
        fillRule: `evenodd`,
        fill: `currentColor`,
        d: `M0.4 6L5 0.6H16.4A1.2 1.2 0 0 1 17.6 1.8V10.2A1.2 1.2 0 0 1 16.4 11.4H5Z M7.5 4L8.6 2.9L10.6 4.9L12.6 2.9L13.7 4L11.7 6L13.7 8L12.6 9.1L10.6 7.1L8.6 9.1L7.5 8L9.5 6Z`,
      }),
    }),
  enter: () =>
    (0, J.jsxs)(sb, {
      w: 24,
      h: 14,
      children: [
        (0, J.jsx)(`path`, {
          d: `M20.4 3.2V6.8Q20.4 10 17.2 10H4.6`,
          fill: `none`,
          stroke: `currentColor`,
          strokeWidth: 2.2,
        }),
        (0, J.jsx)(`path`, { d: `M0.6 10L5.2 6.4V13.6Z`, fill: `currentColor` }),
      ],
    }),
  audio: () =>
    (0, J.jsxs)(sb, {
      w: 16,
      h: 14,
      children: [
        (0, J.jsx)(`path`, { fill: `currentColor`, d: `M1 4.6H4L7.8 1.4V12.6L4 9.4H1Z` }),
        (0, J.jsxs)(`g`, {
          fill: `none`,
          stroke: `currentColor`,
          strokeWidth: 1.3,
          strokeLinecap: `round`,
          children: [
            (0, J.jsx)(`path`, { d: `M10 5A2.6 2.6 0 0 1 10 9` }),
            (0, J.jsx)(`path`, { d: `M12 3A5.2 5.2 0 0 1 12 11` }),
          ],
        }),
      ],
    }),
  shift: () =>
    (0, J.jsx)(sb, {
      w: 14,
      h: 15,
      children: (0, J.jsx)(`path`, {
        fill: `currentColor`,
        d: `M7 0.6L13.4 7.4H9.6V14H4.4V7.4H0.6Z`,
      }),
    }),
};
function ub(e) {
  return lb[e.icon]();
}
function db() {
  let e = [];
  for (let t = 0; t < 5; t++)
    e.push((0, J.jsx)(`rect`, { x: 5.4 + t * 3.7, y: 4.8, width: 2.3, height: 2.3 }, `a${t}`));
  for (let t = 0; t < 4; t++)
    e.push((0, J.jsx)(`rect`, { x: 7.2 + t * 3.7, y: 8.4, width: 2.3, height: 2.3 }, `b${t}`));
  return (0, J.jsxs)(`svg`, {
    className: `kc-glyph`,
    width: 28,
    height: 19,
    viewBox: `0 0 28 19`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: [
      (0, J.jsx)(`rect`, {
        x: 0.9,
        y: 1.1,
        width: 26.2,
        height: 16.6,
        rx: 2.5,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 1.6,
      }),
      (0, J.jsxs)(`g`, {
        fill: `currentColor`,
        children: [e, (0, J.jsx)(`rect`, { x: 8.8, y: 12.4, width: 10.4, height: 2 })],
      }),
    ],
  });
}
function fb() {
  return (0, J.jsx)(`svg`, {
    className: `kc-glyph`,
    width: 12,
    height: 12,
    viewBox: `0 0 12 12`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, { d: `M0.2 3.8L6 11L11.8 3.8Z`, fill: `currentColor` }),
  });
}
function pb() {
  return (0, J.jsxs)(`svg`, {
    className: `kc-key-sqrt`,
    width: 19,
    height: 18,
    viewBox: `0 0 19 18`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: [
      (0, J.jsx)(`path`, {
        d: `M1 10.2L3.4 8.9L7.6 16.6L14.2 1.4H18.6`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 1,
        strokeLinejoin: `miter`,
      }),
      (0, J.jsx)(`path`, { d: `M3.4 8.9L4.2 8.5L8 15.4L7.6 16.6Z`, fill: `currentColor` }),
    ],
  });
}
var mb = (e) => (0, J.jsx)(`i`, { className: `kc-key-var`, children: e.children });
function hb(e) {
  let { face: t } = e;
  switch (t.kind) {
    case `math`:
      return t.italic
        ? (0, J.jsx)(mb, { children: t.text })
        : (0, J.jsx)(`span`, { children: t.text });
    case `word`:
      return (0, J.jsx)(`span`, { className: `kc-key-word`, children: t.text });
    case `icon`:
      return (0, J.jsx)(ub, { icon: t.icon });
    case `power`:
      return (0, J.jsxs)(`span`, {
        children: [
          (0, J.jsx)(mb, { children: `a` }),
          (0, J.jsx)(`sup`, {
            className: `kc-key-sup`,
            children: t.italic ? (0, J.jsx)(mb, { children: t.exponent }) : t.exponent,
          }),
        ],
      });
    case `subscript`:
      return (0, J.jsxs)(`span`, {
        children: [
          (0, J.jsx)(mb, { children: `a` }),
          (0, J.jsx)(`sub`, {
            className: `kc-key-sub`,
            children: (0, J.jsx)(mb, { children: `b` }),
          }),
        ],
      });
    case `abs`:
      return (0, J.jsxs)(`span`, { children: [`|`, (0, J.jsx)(mb, { children: `a` }), `|`] });
    case `sqrt`:
      return (0, J.jsx)(pb, {});
    case `dual`: {
      let e = t.raised
        ? (0, J.jsx)(`sup`, { className: `kc-key-raised`, children: t.second })
        : t.second;
      return (0, J.jsxs)(`span`, {
        className: `kc-key-dual`,
        children: [
          (0, J.jsx)(`span`, { "data-selected": String(t.selected === 0), children: t.first }),
          (0, J.jsx)(`span`, { "data-selected": String(t.selected === 1), children: e }),
        ],
      });
    }
  }
}
var gb = (e) => `spacer` in e,
  _b = (e, t) => ({ type: `insert`, action: { op: e, arg: t } }),
  Q = (e) => _b(`typedText`, e),
  vb = (e, t = !1) => ({ kind: `math`, text: e, italic: t });
function $(e, t, n, r = `light`, i = vb(e)) {
  return { label: e, face: i, name: t, behaviour: n, tone: r, repeat: !1 };
}
function yb(e, t, n, r = `dark`, i = !1) {
  return { label: ``, face: { kind: `icon`, icon: e }, name: t, behaviour: n, tone: r, repeat: i };
}
var bb = {
  x: $(`x`, `x`, Q(`x`), `light`, vb(`x`, !0)),
  y: $(`y`, `y`, Q(`y`), `light`, vb(`y`, !0)),
  squared: $(`a²`, `Squared`, _b(`write`, `^2`), `light`, {
    kind: `power`,
    exponent: `2`,
    italic: !1,
  }),
  power: $(`aᵇ`, `Power`, _b(`cmd`, `^`), `light`, { kind: `power`, exponent: `b`, italic: !0 }),
  lparen: $(`(`, `Left parenthesis`, Q(`(`)),
  rparen: $(`)`, `Right parenthesis`, Q(`)`)),
  lt: $(`<`, `Less than`, Q(`<`)),
  gt: $(`>`, `Greater than`, Q(`>`)),
  abs: $(`|a|`, `Absolute value`, _b(`cmd`, `|`), `light`, { kind: `abs` }),
  comma: $(`,`, `Comma`, Q(`,`)),
  le: $(`≤`, `Less than or equal to`, _b(`cmd`, `\\le`)),
  ge: $(`≥`, `Greater than or equal to`, _b(`cmd`, `\\ge`)),
  sqrt: $(`√`, `Square root`, _b(`cmd`, `\\sqrt`), `light`, { kind: `sqrt` }),
  pi: $(`π`, `Pi`, _b(`cmd`, `\\pi`)),
  point: $(`.`, `Decimal point`, Q(`.`), `dark`),
  divide: $(`÷`, `Divide`, Q(`/`)),
  times: $(`×`, `Multiply`, Q(`*`)),
  minus: $(`−`, `Minus`, Q(`-`)),
  plus: $(`+`, `Plus`, Q(`+`)),
  equals: $(`=`, `Equals`, Q(`=`)),
  audio: yb(`audio`, `Audio trace`, { type: `audio` }),
  left: yb(`left`, `Left arrow`, _b(`keystroke`, `Left`), `dark`, !0),
  right: yb(`right`, `Right arrow`, _b(`keystroke`, `Right`), `dark`, !0),
  backspace: yb(`backspace`, `Backspace`, _b(`keystroke`, `Backspace`), `dark`, !0),
  enter: yb(`enter`, `Enter`, { type: `enter` }, `accent`),
  shift: yb(`shift`, `Shift`, { type: `shift` }),
};
function xb(e, t) {
  let n = (e, n, r, i, a = !1) => {
    let o = +!!t,
      s = { kind: `dual`, first: e, second: n, selected: o, raised: a };
    return { label: `${e} ${n}`, face: s, name: r[o], behaviour: i[o], tone: `light`, repeat: !1 };
  };
  switch (e) {
    case `theta`:
      return t
        ? $(`τ`, `Tau`, _b(`cmd`, `\\tau`), `light`, vb(`τ`, !0))
        : $(`θ`, `Theta`, _b(`cmd`, `\\theta`), `light`, vb(`θ`, !0));
    case `subscript`:
      return t
        ? $(`aᵇ`, `Superscript`, _b(`cmd`, `^`), `light`, {
            kind: `power`,
            exponent: `b`,
            italic: !0,
          })
        : $(`aᵦ`, `Subscript`, _b(`cmd`, `_`), `light`, { kind: `subscript` });
    case `bang`:
      return n(`!`, `′`, [`Factorial`, `Prime`], [Q(`!`), Q(`'`)]);
    case `bracket`:
      return n(`[`, `]`, [`Left bracket`, `Right bracket`], [Q(`[`), Q(`]`)]);
    case `brace`:
      return n(`{`, `}`, [`Left brace`, `Right brace`], [Q(`{`), Q(`}`)]);
    case `tilde`:
      return n(`~`, `%`, [`Tilde`, `Percent`], [Q(`~`), Q(`%`)], !0);
    case `colon`:
      return n(`:`, `;`, [`Colon`, `Semicolon`], [Q(`:`), Q(`;`)]);
    default:
      return null;
  }
}
function Sb(e, t, n, r, i) {
  if (/^[0-9]$/.test(e))
    return {
      id: e,
      label: e,
      face: vb(e),
      name: e,
      behaviour: Q(e),
      width: t,
      tone: `dark`,
      repeat: !1,
    };
  if (/^[a-z]$/.test(e) && n === `letters`) {
    let n = r ? e.toUpperCase() : e,
      i = Q(n);
    return {
      id: e,
      label: n,
      face: vb(n, !0),
      name: n,
      behaviour: i,
      width: t,
      tone: `light`,
      repeat: !1,
    };
  }
  if (e === `letters`) {
    let r = n === `main` ? (i > 600 ? `A B C` : `ABC`) : `1 2 3`;
    return {
      id: e,
      label: r,
      face: { kind: `word`, text: r },
      name: `ABC`,
      behaviour: { type: `letters` },
      width: t,
      tone: `dark`,
      repeat: !1,
    };
  }
  if (e === `functions`) {
    let n = i < 450 ? `funcs` : `functions`;
    return {
      id: e,
      label: n,
      face: { kind: `word`, text: n },
      name: `Functions`,
      behaviour: { type: `functions` },
      width: t,
      tone: `dark`,
      repeat: !1,
    };
  }
  let a = xb(e, r) ?? bb[e];
  if (!a) throw Error(`Unknown keypad key "${e}"`);
  return { id: e, ...a, width: t };
}
var Cb = [
    { grid: 11, tokens: `x y squared power _0.5 7 8 9 divide _0.5 functions*2` },
    { grid: 11, tokens: `lparen rparen lt gt _0.5 4 5 6 times _0.5 left right` },
    { grid: 11, tokens: `abs comma le ge _0.5 1 2 3 minus _1 backspace*1.5` },
    { grid: 11, tokens: `letters audio sqrt pi _0.5 0 point equals plus _0.5 enter*2` },
  ],
  wb = [
    { grid: 10, tokens: `q w e r t y u i o p` },
    { grid: 10, tokens: `a s d f g h j k l theta` },
    { grid: 10, tokens: `shift*1.5/11 _ z x c v b n m _ backspace*1.5/11` },
    { grid: 10, tokens: `letters*2/11 _ subscript bang bracket brace tilde colon _ enter*2/11` },
  ];
function Tb(e, t) {
  if (e === void 0) return 1 / t;
  let [n, r] = e.split(`/`);
  return Number(n) / (r === void 0 ? t : Number(r));
}
function Eb(e, t, n, r) {
  return e.map(({ grid: e, tokens: i }) =>
    i.split(` `).map((i) => {
      if (i === `_`) return { spacer: `fill` };
      if (i.startsWith(`_`)) return { spacer: Number(i.slice(1)) / e };
      let [a, o] = i.split(`*`);
      return Sb(a, Tb(o, e), t, n, r);
    })
  );
}
function Db(e, t, n) {
  return { page: e, rows: Eb(e === `main` ? Cb : wb, e, n && e === `letters`, t) };
}
function Ob(e) {
  let t = e.reduce((e, t) => e + (gb(t) ? (t.spacer === `fill` ? 0 : t.spacer) : t.width), 0),
    n = e.filter((e) => gb(e) && e.spacer === `fill`).length,
    r = n === 0 ? 0 : Math.max(0, 1 - t) / n,
    i = [],
    a = 0;
  for (let t of e)
    gb(t)
      ? (a += t.spacer === `fill` ? r : t.spacer)
      : (i.push({ key: t, x: a, width: t.width }), (a += t.width));
  return i;
}
var kb = { inert: !0 };
function Ab(e) {
  if (e === null) return !1;
  let t = e.getRootNode().activeElement;
  return t !== null && e.contains(t);
}
var jb = (e) => e.preventDefault();
function Mb(e, t, n, r) {
  let i = (0, h.useRef)(r);
  ((0, h.useLayoutEffect)(() => {
    i.current = r;
  }),
    (0, h.useEffect)(() => {
      if (n && e !== null) return e.push({ id: t, close: () => i.current() });
    }, [e, t, n]));
}
function Nb(e, t, n, r, i, a, o) {
  switch (e.behaviour.type) {
    case `letters`:
      return { "aria-pressed": t === `letters` };
    case `shift`:
      return { "aria-pressed": n };
    case `functions`:
      return { "aria-expanded": i, "aria-controls": r };
    case `audio`:
      return { "aria-pressed": a, "aria-disabled": a || o ? void 0 : !0, title: e.name };
    default:
      return {};
  }
}
var Pb = () => () => void 0;
function Fb(e) {
  let { containerWidth: t, pointer: n, open: r, onOpenChange: i } = e,
    a = om(),
    o = (0, h.useContext)(Mp),
    s = (0, h.useContext)(hp),
    c = (0, h.useContext)(rm),
    l =
      (0, h.useSyncExternalStore)(
        c === null ? Pb : (e) => c.subscribe(e),
        () => c?.state ?? null
      ) !== null,
    u = (0, h.useRef)(null),
    d = (0, h.useSyncExternalStore)(
      (e) => a.subscribe(e),
      () => {
        if (!r) return !1;
        let e = a.getSnapshot();
        if (u.current?.snapshot !== e) {
          let t = e.rows.some((e) => a.poiCurves(e.id).length > 0);
          u.current = { snapshot: e, available: t };
        }
        return u.current.available;
      }
    ),
    f = (0, h.useContext)(Dp),
    p = (0, h.useContext)(xv),
    [m, g] = (0, h.useState)(`main`),
    [_, v] = (0, h.useState)(!1),
    [y, b] = (0, h.useState)(null),
    [x] = (0, h.useState)(() => eb(() => performance.now())),
    [S] = (0, h.useState)(ob),
    C = (0, h.useRef)(new Set()),
    w = (0, h.useId)(),
    [T, E] = (0, h.useState)(`closed`),
    D = (0, h.useRef)(null),
    O = (0, h.useRef)(null),
    k = (0, h.useRef)(null),
    A = (0, h.useRef)(null),
    [ee, te] = (0, h.useState)(r);
  r && !ee && te(!0);
  let ne = (e) => {
    let t = Ab(e ? k.current : D.current);
    ((A.current = t ? (e ? `hide` : `show`) : null), i(e, `student`));
  };
  if (
    ((0, h.useLayoutEffect)(() => {
      let e = A.current;
      if (e === null || (e === `hide`) !== r) return;
      A.current = null;
      let t = k.current ?? D.current?.closest(`.kc-app`)?.querySelector(`[data-tool="keypad"]`);
      (e === `hide` ? O.current : t)?.focus();
    }, [r]),
    (0, h.useEffect)(() => {
      r || (S.stop(), C.current.clear(), b(null), g(`main`), v(!1), E(`closed`));
    }, [r, S]),
    (0, h.useEffect)(() => () => S.stop(), [S]),
    Mb(f, `keypad`, r, () => ne(!1)),
    Mb(f, `letters`, r && m === `letters`, () => g(`main`)),
    Mb(f, `functions`, r && T === `open`, () => {
      let e = D.current,
        t = e?.querySelector(`.kc-functions-panel`) ?? null;
      (t !== null &&
        t.contains(t.ownerDocument.activeElement) &&
        e?.querySelector(`[data-key="functions"]`)?.focus(),
        E(`closing`));
    }),
    (0, h.useLayoutEffect)(() => {
      if (T !== `closing`) return;
      let e = D.current?.querySelector(`.kc-functions-panel`) ?? null,
        t = e === null ? 0 : p(e);
      if (t <= 0) {
        E(`closed`);
        return;
      }
      let n = setTimeout(() => E(`closed`), t);
      return () => clearTimeout(n);
    }, [T, p]),
    f === null)
  )
    throw Error(`Keypad must be used inside EscapeContext`);
  if (o === null) throw Error(`Keypad must be used inside FocusContext`);
  let j = () => {
      let { focusedRowId: e, rows: t } = a.getSnapshot();
      if (e !== null) return;
      let n = o.lastFocusedRowId() ?? t.find((e) => e.type !== `table`)?.id;
      n !== void 0 && o.focusRow(n, `end`);
    },
    re = Db(m, t, _),
    ie = n === `fine` && e.layout === `desktop`,
    ae = { engine: a, focus: o, announcer: s, doubleTap: x },
    oe = (e) => {
      x.clear();
      let t = Qy(o, a.getSnapshot(), a);
      if (t !== null) {
        let { rowId: n, field: r, cell: i } = t;
        _v(a, s, n, r, (t) => t.run(e.actions), i?.commit);
      }
      (E(`closing`), t?.field.focus());
    },
    se = (e) => {
      switch (e.behaviour.type) {
        case `letters`:
          g((e) => (e === `main` ? `letters` : `main`));
          return;
        case `shift`:
          v((e) => !e);
          return;
        case `insert`:
        case `enter`:
          $y(ae, e);
          return;
        case `functions`:
          E((e) => (e === `open` ? `closing` : `open`));
          return;
        case `audio`:
          c?.toggle(Qy(o, a.getSnapshot(), a)?.rowId ?? null);
          return;
      }
    },
    ce = (e, t) => {
      e.button > 0 || (b(t.id), t.repeat && (C.current.add(t.id), S.start(() => $y(ae, t))));
    },
    le = (e) => {
      (b((t) => (t === e.id ? null : t)), e.repeat && S.stop());
    },
    ue = (e) => {
      C.current.delete(e.id) || se(e);
    },
    M = (e, t, n) =>
      (0, J.jsx)(
        `button`,
        {
          style: { "--kc-x": t, "--kc-w": n },
          type: `button`,
          className: `kc-key`,
          "aria-label": e.name,
          "data-key": e.id,
          "data-tone": e.tone,
          "data-pressed": y === e.id ? `true` : void 0,
          ...Nb(e, m, _, w, T === `open`, l, d),
          onMouseDown: jb,
          onPointerDown: (t) => ce(t, e),
          onPointerUp: () => le(e),
          onPointerCancel: () => le(e),
          onPointerLeave: () => le(e),
          onKeyDown: () => C.current.delete(e.id),
          onClick: () => ue(e),
          children: (0, J.jsx)(hb, { face: e.face }),
        },
        e.id
      );
  return (0, J.jsxs)(J.Fragment, {
    children: [
      (0, J.jsxs)(`section`, {
        ref: D,
        className: `kc-keypad`,
        role: `region`,
        "aria-label": `Keypad`,
        "aria-hidden": !r || void 0,
        ...(r ? {} : kb),
        "data-open": String(r),
        "data-narrow": t < 450 ? `true` : void 0,
        "data-full-width": t <= Ib ? `true` : void 0,
        "data-abc-size": Lb(t),
        "data-pointer": n,
        "data-page": m,
        children: [
          ie &&
            (0, J.jsxs)(`button`, {
              ref: O,
              type: `button`,
              className: `kc-hide-keypad`,
              "aria-label": `Hide keypad`,
              onClick: () => ne(!1),
              children: [(0, J.jsx)(db, {}), (0, J.jsx)(fb, {})],
            }),
          (0, J.jsxs)(`div`, {
            className: `kc-keypad-keys`,
            children: [
              re.rows.map((e, t) =>
                (0, J.jsx)(
                  `div`,
                  {
                    className: `kc-keypad-row`,
                    children: Ob(e).map((e) => M(e.key, e.x, e.width)),
                  },
                  t
                )
              ),
              T !== `closed` &&
                (0, J.jsxs)(J.Fragment, {
                  children: [(0, J.jsx)(ab, { id: w, state: T, onInsert: oe }), (0, J.jsx)(Rb, {})],
                }),
            ],
          }),
        ],
      }),
      !r &&
        ie &&
        (0, J.jsxs)(`button`, {
          ref: k,
          type: `button`,
          className: `kc-show-keypad`,
          "aria-label": `Show keypad`,
          "data-returning": ee ? `true` : void 0,
          onClick: (e) => {
            if (e.detail === 0) return ne(!0);
            ((A.current = null), i(!0, `student`), j());
          },
          children: [(0, J.jsx)(q_, {}), (0, J.jsx)(J_, {})],
        }),
    ],
  });
}
var Ib = 835;
function Lb(e) {
  if (e < 380) return `xs`;
  if (e < 420) return `s`;
  if (e < 490) return `m`;
}
function Rb() {
  return (0, J.jsx)(`svg`, {
    className: `kc-functions-arrow`,
    width: 24,
    height: 13,
    viewBox: `0 0 24 13`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, { d: `M0 0.5L12 12.5L24 0.5` }),
  });
}
var zb = 2;
function Bb(e) {
  let [t, n] = (0, h.useState)(!1),
    r = (0, h.useRef)(null),
    i = () => {
      (r.current !== null && clearTimeout(r.current), (r.current = null));
    },
    a = () => {
      (i(), n(!1));
    };
  return (
    (0, h.useEffect)(
      () => () => {
        r.current !== null && clearTimeout(r.current);
      },
      []
    ),
    {
      open: t && !e,
      handlers: {
        onPointerEnter(t) {
          e || t.pointerType === `touch` || (i(), (r.current = setTimeout(() => n(!0), 500)));
        },
        onPointerLeave() {
          (i(), (r.current = setTimeout(() => n(!1), 170)));
        },
        onPointerDown: a,
        onFocus(t) {
          !e && t.currentTarget.matches(`:focus-visible`) && n(!0);
        },
        onBlur: a,
      },
    }
  );
}
function Vb(e) {
  let t = e.side ?? `below`,
    n = (0, h.useRef)(null);
  return (
    (0, h.useLayoutEffect)(() => {
      let e = n.current,
        r = e?.closest(`.kc-app`);
      if (e === null || r == null || t !== `below`) return;
      let i = e.getBoundingClientRect(),
        a = r.getBoundingClientRect(),
        o =
          i.left < a.left + zb
            ? a.left + zb - i.left
            : i.right > a.right - zb
              ? a.right - zb - i.right
              : 0;
      e.style.setProperty(`--kc-tip-shift`, `${o}px`);
    }, [e.text, t]),
    (0, J.jsx)(`span`, {
      ref: n,
      className: `kc-tooltip`,
      "data-side": t,
      "aria-hidden": `true`,
      children: e.text,
    })
  );
}
function Hb() {
  return (0, J.jsx)(`span`, {
    className: `kc-add-menu-fx`,
    "aria-hidden": `true`,
    children: `f(x)`,
  });
}
function Ub() {
  return (0, J.jsx)(`svg`, {
    viewBox: `0 0 26 26`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, {
      fillRule: `evenodd`,
      d: `M0 0h26v26H0zM1 7v5.5h11.5V7zm12.5 0v5.5H25V7zM1 13.5V19h11.5v-5.5zm12.5 0V19H25v-5.5zM1 20v5h11.5v-5zm12.5 0v5H25v-5z`,
    }),
  });
}
function Wb(e) {
  return e != null && e.getRootNode().activeElement === e;
}
var Gb = { preventScroll: !0, focusVisible: !1 },
  Kb = [
    { id: `expression`, label: `Add expression`, text: `expression`, icon: Hb },
    { id: `table`, label: `Add table`, text: `table`, icon: Ub },
  ];
function qb({ layout: e }) {
  let t = om(),
    n = (0, h.useContext)(Mp),
    r = gp(),
    i = (0, h.useContext)(Dp),
    [a, o] = (0, h.useState)(!1),
    s = Bb(a),
    c = (0, h.useRef)(null),
    l = (0, h.useRef)(null),
    u = (0, h.useRef)([]),
    d = (e) => {
      (o(!1), e && c.current?.focus());
    },
    f = (0, h.useRef)(!1);
  ((0, h.useEffect)(() => {
    a && (f.current ? u.current[0]?.focus() : Wb(c.current) && u.current[0]?.focus(Gb));
  }, [a]),
    (0, h.useEffect)(() => {
      if (a && i !== null)
        return i.push({ id: `add-item-menu`, close: () => d(f.current || u.current.some(Wb)) });
    }, [a, i]),
    (0, h.useEffect)(() => {
      if (!a) return;
      let e = l.current?.getRootNode();
      if (e === void 0) return;
      let t = (e) => {
        let t = e.composedPath();
        t.includes(l.current) ||
          t.includes(c.current) ||
          (u.current.some(Wb) && c.current?.focus(Gb), o(!1));
      };
      return (
        e.addEventListener(`pointerdown`, t, { capture: !0 }),
        () => e.removeEventListener(`pointerdown`, t, { capture: !0 })
      );
    }, [a]));
  let p = (e) => {
      o(!1);
      let i = t.getSnapshot().activeRowId;
      e === `expression` ? sv(t, n, r, i) : lv(t, n, r, i);
    },
    m = (e) => {
      (e.key === `ArrowDown` || e.key === `Enter` || e.key === ` `) &&
        (e.preventDefault(), (f.current = !0), o(!0));
    },
    g = (e, t) => {
      let n = Kb.length - 1,
        r = (t) => {
          (e.preventDefault(), u.current[t]?.focus());
        };
      switch (e.key) {
        case `ArrowDown`:
          return r(t === n ? 0 : t + 1);
        case `ArrowUp`:
          return r(t === 0 ? n : t - 1);
        case `Home`:
          return r(0);
        case `End`:
          return r(n);
        case `Tab`:
          return (e.preventDefault(), d(!0));
        case `Enter`:
        case ` `:
          return (e.preventDefault(), p(Kb[t].id));
      }
    };
  return (0, J.jsxs)(`div`, {
    className: `kc-add-item`,
    children: [
      (0, J.jsxs)(`button`, {
        type: `button`,
        ref: c,
        className: `kc-list-tool`,
        "aria-label": `Add item`,
        "aria-haspopup": `menu`,
        "aria-expanded": a,
        onMouseDown: (e) => e.preventDefault(),
        onClick: (e) => {
          ((f.current = e.detail === 0), o((e) => !e));
        },
        onKeyDown: m,
        ...s.handlers,
        children: [(0, J.jsx)(R_, {}), s.open && (0, J.jsx)(Vb, { text: `Add Item` })],
      }),
      a &&
        (0, J.jsx)(`div`, {
          ref: l,
          className: `kc-add-menu`,
          role: `menu`,
          "aria-label": `Add item`,
          "data-placement": e === `stacked` ? `right` : `below`,
          children: Kb.map((e, t) => {
            let n = e.icon;
            return (0, J.jsxs)(
              `button`,
              {
                type: `button`,
                role: `menuitem`,
                ref: (e) => {
                  u.current[t] = e;
                },
                className: `kc-add-menu-item`,
                "aria-label": e.label,
                tabIndex: -1,
                onClick: () => p(e.id),
                onKeyDown: (e) => g(e, t),
                children: [
                  (0, J.jsx)(`span`, {
                    className: `kc-add-menu-icon`,
                    children: (0, J.jsx)(n, {}),
                  }),
                  (0, J.jsx)(`span`, { "aria-hidden": `true`, children: e.text }),
                ],
              },
              e.id
            );
          }),
        }),
    ],
  });
}
function Jb(e) {
  return Number.isFinite(e) ? Gi(Number(e.toPrecision(6))) : `undefined`;
}
function Yb(e) {
  return Number.isFinite(e) ? Gi(Number(e.toFixed(4))) : `undefined`;
}
function Xb(e) {
  return e.replace(/^[-−]/, `negative `);
}
var Zb = (e, t, n, r) => ({ key: e, shown: t, value: r, spoken: `${n} equals ${Xb(r)}` });
function Qb(e) {
  let t = e.regression?.result;
  return t == null || !t.ok
    ? []
    : t.params.map(({ name: e, value: t }, n) => Zb(`p${n}`, Ay(e, n), ay(e), Jb(t)));
}
function $b(e) {
  let t = e.regression?.result;
  if (t == null || !t.ok) return [];
  let n = [];
  return (
    t.r2 === null
      ? t.rmse !== null && n.push(Zb(`rmse`, `RMSE`, `RMSE`, Jb(t.rmse)))
      : n.push(Zb(`r2`, `R²`, `R squared`, Yb(t.r2))),
    t.r !== null && n.push(Zb(`r`, `r`, `r`, Yb(t.r))),
    n
  );
}
function ex(e) {
  let t = e.regression?.result;
  return t == null || !t.ok
    ? null
    : `Regression: ${[...Qb(e), ...$b(e)].map((e) => e.spoken).join(`, `)}`;
}
function tx(e, t) {
  return e.kind === `regression` ? ex(e) : e.valueText === null ? null : Y.value(t, e.valueText);
}
var nx = 50,
  rx = { setTimeout: (e, t) => setTimeout(e, t), clearTimeout: (e) => clearTimeout(e) };
function ix(e) {
  return e.error === null ? null : `${e.error.code}|${e.error.message}`;
}
function ax(e) {
  return e.map(({ id: e, latex: t }) => ({ id: e, latex: t }));
}
function ox(e, t) {
  return e.length === t.length && e.every((e, n) => e.id === t[n].id && e.latex === t[n].latex);
}
function sx(e, t, n = {}) {
  let r = n.delayMs ?? 750,
    i = n.timers ?? rx,
    a = new Map(),
    o = new Set(),
    s = !1,
    c = null,
    l = null,
    u = ax(e.getSnapshot().rows),
    d = (e, n) => {
      (t.announce(n, { delayMs: nx, key: e }), o.add(e));
    },
    f = (e) => {
      a.clear();
      for (let t of e) a.set(t.id, ix(t));
    },
    p = () => {
      (c !== null && i.clearTimeout(c.handle), (c = null));
    };
  f(e.getSnapshot().rows);
  let m = () => {
      c = null;
      let { rows: t, focusedRowId: n, activeRowId: r } = e.getSnapshot();
      (t.forEach((e, t) => {
        let n = ix(e);
        e.error !== null &&
          n !== a.get(e.id) &&
          d(`error:${e.id}`, Y.error(t + 1, e.error.message));
      }),
        f(t));
      let i = n ?? r,
        o = t.findIndex((e) => e.id === i);
      if (o < 0 || t[o].error !== null) return;
      let { id: s } = t[o],
        u = tx(t[o], o + 1);
      u === null ? (l = s) : d(`value:${s}`, u);
    },
    h = (n) => {
      let { rows: a } = e.getSnapshot();
      if (!ox(u, a)) {
        u = ax(a);
        for (let e of o) t.cancel(e);
        (o.clear(),
          (l = null),
          (s = n.isUserInitiated),
          p(),
          s ? (c = { handle: i.setTimeout(m, Math.max(0, r - nx)) }) : f(a));
      }
    },
    g = () => {
      let { rows: t } = e.getSnapshot();
      if (l !== null) {
        let e = t.findIndex((e) => e.id === l),
          n = e < 0 ? null : tx(t[e], e + 1);
        n !== null && (d(`value:${l}`, n), (l = null));
      }
      t.forEach((e, t) => {
        let n = ix(e);
        e.error?.code === `timeout` &&
          n !== a.get(e.id) &&
          (s && d(`error:${e.id}`, Y.error(t + 1, e.error.message)), a.set(e.id, n));
      });
    },
    _ = e.observeEvent(`change`, h),
    v = e.subscribe(g);
  return {
    destroy() {
      (_(), v(), p());
      for (let e of o) t.cancel(e);
      o.clear();
    },
  };
}
var cx = a(),
  lx = 20;
function ux(e) {
  let t = e.hidden === !0 || e.style === `open`;
  return (0, J.jsx)(`svg`, {
    className: `kc-glyph`,
    "data-style": e.style,
    "data-hidden": e.hidden === !0 ? `true` : void 0,
    width: lx,
    height: lx,
    viewBox: `0 0 20 20`,
    "aria-hidden": `true`,
    focusable: `false`,
    children:
      e.style === `cross` && e.hidden !== !0
        ? (0, J.jsx)(`path`, {
            d: `M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5`,
            stroke: `currentColor`,
            strokeWidth: 2.5,
          })
        : (0, J.jsx)(`circle`, {
            cx: 10,
            cy: 10,
            r: t ? 4.5 : 5,
            fill: t ? `none` : `currentColor`,
            stroke: t ? `currentColor` : void 0,
            strokeWidth: t ? 2 : void 0,
          }),
  });
}
function dx(e) {
  let t = e.size ?? 22;
  return (0, J.jsxs)(`svg`, {
    className: `kc-glyph kc-warning-glyph`,
    width: t,
    height: (t * 20) / 22,
    viewBox: `0 0 22 20`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: [
      (0, J.jsx)(`path`, {
        d: `M11 1.4L21.1 19H0.9Z`,
        fill: `currentColor`,
        stroke: `currentColor`,
        strokeWidth: 1.2,
        strokeLinejoin: `round`,
      }),
      (0, J.jsx)(`path`, {
        className: `kc-warning-mark`,
        d: `M11 7V13.2`,
        fill: `none`,
        strokeWidth: 2,
      }),
      (0, J.jsx)(`rect`, { className: `kc-warning-mark-dot`, x: 10, y: 14.6, width: 2, height: 2 }),
    ],
  });
}
function fx(e) {
  let t = (0, h.useRef)(null),
    n = (0, h.useRef)(!1),
    r = (0, h.useRef)(e);
  ((0, h.useEffect)(() => {
    r.current = e;
  }),
    (0, h.useEffect)(() => () => clearTimeout(t.current ?? void 0), []));
  let i = () => {
    (t.current !== null && clearTimeout(t.current), (t.current = null));
  };
  return {
    trigger: {
      onContextMenu(e) {
        r.current() !== !1 && e.preventDefault();
      },
      onKeyDown(e) {
        ((e.key === `F10` && e.shiftKey) || e.key === `ContextMenu`) &&
          r.current() !== !1 &&
          e.preventDefault();
      },
      onPointerDown() {
        ((n.current = !1),
          i(),
          (t.current = setTimeout(() => {
            ((t.current = null), (n.current = r.current() !== !1));
          }, 500)));
      },
      onPointerUp: i,
      onPointerLeave: i,
    },
    consumeClick() {
      let e = n.current;
      return ((n.current = !1), e);
    },
  };
}
function px(e, t, n, r, i) {
  let a = (0, h.useRef)(i);
  ((0, h.useEffect)(() => {
    a.current = i;
  }),
    (0, h.useEffect)(() => {
      if (e && r !== null) return r.push({ id: t, close: () => a.current(!0) });
    }, [e, r, t]),
    (0, h.useEffect)(() => {
      if (!e) return;
      let t = n.popup.current?.getRootNode();
      if (t === void 0) return;
      let r = (e) => {
        let t = e.composedPath();
        [n.popup.current, n.trigger.current].some((e) => e !== null && t.includes(e)) ||
          a.current(!1);
      };
      return (
        t.addEventListener(`pointerdown`, r, { capture: !0 }),
        () => t.removeEventListener(`pointerdown`, r, { capture: !0 })
      );
    }, [e, n.popup, n.trigger]));
}
var mx = 7,
  hx = 2;
function gx(e, t, n) {
  let r = t.getBoundingClientRect(),
    i = n.getBoundingClientRect(),
    a = e.offsetWidth,
    o = e.offsetHeight,
    s = r.left + r.width / 2,
    c = Math.max(i.left + hx, Math.min(s - a / 2, i.right - a - hx)),
    l = r.bottom + mx,
    u = `below`;
  (l + o > i.bottom - hx && r.top - mx - o >= i.top + hx && ((l = r.top - mx - o), (u = `above`)),
    (e.style.left = `${c}px`),
    (e.style.top = `${l}px`));
  let d = e.getBoundingClientRect();
  (d.width > 0 &&
    (Math.abs(d.left - c) > 0.5 || Math.abs(d.top - l) > 0.5) &&
    ((e.style.left = `${c - (d.left - c)}px`), (e.style.top = `${l - (d.top - l)}px`)),
    e.style.setProperty(`--kc-tip-arrow`, `${s - c}px`),
    (e.dataset.side = u));
}
function _x({ id: e, message: t, variant: n }) {
  let r = (0, h.useContext)(Dp),
    [i, a] = (0, h.useState)(!1),
    [o, s] = (0, h.useState)(!1),
    c = (0, h.useRef)(null),
    [l, u] = (0, h.useState)(null),
    d = (0, h.useRef)(null),
    f = (0, h.useRef)(null),
    p = (0, h.useRef)(``);
  (0, h.useLayoutEffect)(() => {
    let e = d.current;
    u(e.closest(`.kc-app`) ?? e.parentElement);
  }, []);
  let m = () => {
      (c.current !== null && clearTimeout(c.current), (c.current = null));
    },
    g = (e, t) => {
      (m(),
        (c.current = setTimeout(() => {
          ((c.current = null), a(t));
        }, e)));
    };
  (0, h.useEffect)(
    () => () => {
      c.current !== null && clearTimeout(c.current);
    },
    []
  );
  let _ = (0, h.useCallback)(() => {
    (c.current !== null && clearTimeout(c.current), (c.current = null), a(!1), s(!1));
  }, []);
  (px(i && l !== null, `error-tooltip`, { popup: f, trigger: d }, r, _),
    (0, h.useLayoutEffect)(() => {
      let e = f.current,
        t = d.current;
      if (!i || e === null || t === null || l === null) return;
      let n = () => gx(e, t, l);
      return (
        n(),
        window.addEventListener(`scroll`, n, { capture: !0, passive: !0 }),
        window.addEventListener(`resize`, n),
        () => {
          (window.removeEventListener(`scroll`, n, { capture: !0 }),
            window.removeEventListener(`resize`, n));
        }
      );
    }, [i, l, t]));
  let v = (e) => e.pointerType === `touch`;
  return (0, J.jsxs)(J.Fragment, {
    children: [
      (0, J.jsx)(`button`, {
        ref: d,
        type: `button`,
        className: n === `row` ? `kc-row-warning` : `kc-cell-warning`,
        "aria-label": `Error`,
        "aria-describedby": e,
        "aria-expanded": i,
        onPointerDown: (e) => {
          p.current = e.pointerType;
        },
        onPointerEnter: (e) => {
          !v(e) && !i && g(500, !0);
        },
        onPointerLeave: (e) => {
          v(e) || o || (i ? g(170, !1) : m());
        },
        onFocus: () => {
          p.current === `` && (m(), a(!0));
        },
        onBlur: () => {
          ((p.current = ``), o || _());
        },
        onClick: () => {
          if ((m(), p.current === `touch`)) return a((e) => !e);
          if (p.current === ``) return a(!0);
          (s((e) => !e), a(!0));
        },
        children: (0, J.jsx)(dx, { size: n === `row` ? 22 : 16 }),
      }),
      l === null
        ? null
        : (0, cx.createPortal)(
            (0, J.jsx)(`div`, {
              ref: f,
              className: `kc-error-tip`,
              role: `tooltip`,
              id: e,
              hidden: !i,
              "data-pinned": o ? `true` : void 0,
              children: t,
            }),
            l
          ),
    ],
  });
}
var vx = (e, t) => e.findIndex((e) => e.id === t);
function yx(e, t) {
  let n = null;
  return (
    e.editRows((e, r) => {
      let i = vx(e, t),
        a = i < 0 ? null : wd(e[i], e, r.nextId, r.used);
      return a === null ? null : ((n = a.id), [...e.slice(0, i + 1), a, ...e.slice(i + 1)]);
    }) ?? (n === null ? null : { id: n })
  );
}
function bx(e, t, n) {
  e.editRows((e) => {
    let r = vx(e, t);
    return r < 0 || (e[r].logMode === !0) === n
      ? null
      : e.map((e, t) => (t === r ? { ...e, logMode: n } : e));
  });
}
function xx(e, t) {
  let n = e.getSnapshot().rows.find((e) => e.id === t),
    r = n?.regression?.analysis;
  if (n === void 0 || r === void 0 || r.observed.kind !== `id`) return null;
  let i = r.observed.name,
    a = e
      .getSnapshot()
      .rows.find((e) => e.type === `table` && e.columns?.some((e) => e.latex === i));
  return a === void 0 || a.columns.some((e) => e.latex === r.residual)
    ? null
    : (e.editRows((e) => {
        let i = vx(e, a.id);
        if (i < 0) return null;
        let o = e[i].columns?.length ?? 0,
          s = xd(e[i], o, r.residual);
        if (typeof s == `string`) return null;
        let c = Ed(s, o, { color: Sd(n.color, vx(e, t)) });
        return e.map((e, t) => (t === i ? c : e));
      }),
      a.id);
}
function Sx(e) {
  if (!e.has(`m`) && !e.has(`b`)) return [`m`, `b`];
  for (let t = 1; ; t++) {
    let n = [`m_{${t}}`, `b_{${t}}`];
    if (!n.some((t) => e.has(t))) return n;
  }
}
function Cx(e, t, n = 1) {
  let r = null;
  return (
    e.editRows((e, i) => {
      let a = vx(e, t),
        o = e[a]?.columns ?? [];
      if (a < 0 || n < 1 || n >= o.length) return null;
      let s = o[0].latex.trim(),
        c = o[n].latex.trim();
      if (s === `` || c === ``) return null;
      let [l, u] = Sx(i.used),
        d = {
          id: i.nextId(),
          latex: `${c}\\sim ${l}${s}+${u}`,
          color: Sd(o[n].color, a + 1),
          hidden: !1,
        };
      return ((r = d.id), [...e.slice(0, a + 1), d, ...e.slice(a + 1)]);
    }) ?? (r === null ? null : { id: r })
  );
}
var wx = `Has graph and regression. To access statistics, press Tab.`;
function Tx({ v: e }) {
  return (0, J.jsx)(`input`, {
    type: `text`,
    readOnly: !0,
    className: `kc-regression-value`,
    value: `${e.shown} = ${e.value}`,
    "aria-label": e.spoken,
    size: Math.max(4, e.shown.length + e.value.length + 3),
  });
}
function Ex({ row: e }) {
  let t = om(),
    { rows: n } = am(t),
    r = e.regression?.result,
    i = e.regression?.analysis;
  if (r == null || !r.ok || i === void 0) return null;
  let a = i.observed.kind === `id` ? i.observed.name : null,
    o = n.find((e) => e.type === `table` && e.columns?.some((e) => e.latex === a)),
    s = o?.columns?.some((e) => e.latex === i.residual) === !0,
    c = Qb(e);
  return (0, J.jsxs)(`div`, {
    className: `kc-regression`,
    "data-regression": ``,
    children: [
      r.logMode.available &&
        (0, J.jsxs)(`label`, {
          className: `kc-regression-log`,
          children: [
            (0, J.jsx)(`input`, {
              type: `checkbox`,
              checked: r.logMode.on,
              onChange: () => bx(t, e.id, !r.logMode.on),
            }),
            (0, J.jsx)(`span`, { children: `Log mode` }),
          ],
        }),
      c.length > 0 &&
        (0, J.jsxs)(`section`, {
          className: `kc-regression-group`,
          "aria-label": `Regression parameters`,
          children: [
            (0, J.jsx)(`h3`, {
              className: `kc-regression-heading`,
              children: `Regression parameters`,
            }),
            c.map((e) => (0, J.jsx)(Tx, { v: e }, e.key)),
          ],
        }),
      (0, J.jsxs)(`div`, {
        className: `kc-regression-columns`,
        children: [
          (0, J.jsxs)(`section`, {
            className: `kc-regression-group`,
            "aria-label": `Statistics`,
            children: [
              (0, J.jsx)(`h3`, { className: `kc-regression-heading`, children: `Statistics` }),
              $b(e).map((e) => (0, J.jsx)(Tx, { v: e }, e.key)),
            ],
          }),
          (0, J.jsxs)(`section`, {
            className: `kc-regression-group`,
            "aria-label": `Residuals`,
            children: [
              (0, J.jsx)(`h3`, { className: `kc-regression-heading`, children: `Residuals` }),
              (0, J.jsx)(`span`, {
                className: `kc-regression-residual`,
                children: Ay(i.residual, 0),
              }),
              o !== void 0 &&
                !s &&
                (0, J.jsx)(`button`, {
                  type: `button`,
                  className: `kc-regression-action`,
                  onClick: () => xx(t, e.id),
                  children: `Plot residuals`,
                }),
            ],
          }),
        ],
      }),
      r.approximate &&
        (0, J.jsx)(`p`, { className: `kc-regression-note`, children: `Approximate fit` }),
    ],
  });
}
var Dx = 6e3,
  Ox = (0, h.createContext)(null);
function kx({ children: e }) {
  let t = gp(),
    [n, r] = (0, h.useState)(null),
    [i] = (0, h.useState)(() => ({
      show: (e) => r((t) => ({ spec: e, serial: (t?.serial ?? 0) + 1 })),
    }));
  return (
    (0, h.useEffect)(() => {
      if (n === null) return;
      t.announce(
        n.spec.action ? `${n.spec.text} ${n.spec.action.label} is available.` : n.spec.text
      );
      let e = setTimeout(() => r(null), Dx);
      return () => clearTimeout(e);
    }, [n, t]),
    (0, J.jsxs)(Ox.Provider, {
      value: i,
      children: [
        e,
        n !== null &&
          (0, J.jsxs)(`div`, {
            className: `kc-toast`,
            "data-toast": ``,
            children: [
              (0, J.jsx)(`span`, { children: n.spec.text }),
              n.spec.action &&
                (0, J.jsx)(`button`, {
                  type: `button`,
                  className: `kc-toast-action`,
                  onClick: () => {
                    (r(null), n.spec.action.run());
                  },
                  children: n.spec.action.label,
                }),
            ],
          }),
      ],
    })
  );
}
var Ax = `Table created.`;
function jx(e, t) {
  let n = e.getSnapshot().rows,
    r = n.find((e) => e.id === t);
  if (r === void 0 || r.type === `table`) return !1;
  let i = new Set(n.flatMap((e) => Cn(e.latex)?.name ?? []));
  return gd(r.latex, i) !== null;
}
function Mx(e, t, n, r, i) {
  let a = yx(e, i);
  a !== null &&
    typeof a != `string` &&
    (t.focusRow(Op(a.id, 0, 0), `all`),
    r?.show({ text: Ax, action: { label: `Undo`, run: () => hv(e, n) } }));
}
function Nx({ rowId: e, number: t, trigger: n, onClose: r }) {
  let i = om(),
    a = (0, h.useContext)(Mp),
    o = gp(),
    s = (0, h.useContext)(Dp),
    c = (0, h.useContext)(Ox),
    l = (0, h.useRef)(null),
    u = (0, h.useRef)(null);
  return (
    px(!0, `row-menu`, { popup: l, trigger: n }, s, r),
    (0, h.useEffect)(() => u.current?.focus(), []),
    (0, J.jsx)(`div`, {
      ref: l,
      className: `kc-row-menu`,
      role: `menu`,
      "aria-label": `Options for expression ${t}`,
      children: (0, J.jsx)(`button`, {
        type: `button`,
        ref: u,
        role: `menuitem`,
        className: `kc-add-menu-item`,
        onClick: () => {
          (r(!1), Mx(i, a, o, c, e));
        },
        onKeyDown: (e) => {
          e.key === `Tab` && (e.preventDefault(), r(!0));
        },
        children: `Create table`,
      }),
    })
  );
}
function Px(e) {
  let { engine: t, focus: n, announcer: r, rowId: i, number: a } = e;
  return (0, J.jsxs)(`div`, {
    className: `kc-edit-row-actions`,
    children: [
      e.canTabulate &&
        (0, J.jsx)(`button`, {
          type: `button`,
          className: `kc-edit-row-action`,
          "aria-label": `Create table from expression ${a}`,
          onClick: e.onCreateTable,
          children: (0, J.jsx)(Z_, {}),
        }),
      (0, J.jsx)(`button`, {
        type: `button`,
        className: `kc-edit-row-action`,
        "aria-label": `Duplicate expression ${a}`,
        onClick: () => pv(t, r, i),
        children: (0, J.jsx)(Q_, {}),
      }),
      (0, J.jsx)(`button`, {
        type: `button`,
        className: `kc-edit-row-action`,
        "aria-label": `Delete expression ${a}`,
        onClick: () => fv(t, n, i),
        children: (0, J.jsx)(W_, { size: 18 }),
      }),
    ],
  });
}
function Fx(e) {
  return e.replace(/(^|[^0-9.])([0-9]{4,})/g, (e, t, n) => t + n.replace(/\B(?=(\d{3})+$)/g, ` `));
}
var Ix = `…`;
function Lx(e, t) {
  if (e?.type !== `list` || e.value.length === 0) return { boxes: [t], spoken: `equals ${t}` };
  let n = e.value.slice(0, 30).map((e) => Ki(e)),
    r = e.value.length > 30;
  return { boxes: r ? [...n, Ix] : n, spoken: `equals ${n.join(`, `)}${r ? `, ${Ix}` : ``}` };
}
function Rx(e) {
  let { boxes: t, spoken: n } = Lx(e.value, e.valueText);
  return (0, J.jsxs)(`div`, {
    className: `kc-row-value`,
    id: e.id,
    children: [
      (0, J.jsxs)(`span`, {
        className: `kc-row-value-line`,
        "aria-hidden": `true`,
        children: [
          (0, J.jsx)(`span`, { className: `kc-row-equals`, children: `=` }),
          t.map((e, t) =>
            (0, J.jsx)(`span`, { className: `kc-row-value-box`, children: Fx(e) }, t)
          ),
        ],
      }),
      (0, J.jsx)(`span`, { className: `kc-visually-hidden`, children: n }),
    ],
  });
}
function zx(e, t, n, r) {
  e.editRows((e, t) => {
    let i = e.findIndex((e) => e.id === n);
    if (i < 0 || r.length === 0) return null;
    let a = r.map((e, n) => ({
      id: t.nextId(),
      latex: `${e}=1`,
      color: Gl(i + 1 + n),
      hidden: !1,
    }));
    return [...e.slice(0, i + 1), ...a, ...e.slice(i + 1)];
  }) === `row-limit` && t?.announce(Y.rowLimit);
}
function Bx(e) {
  let { names: t } = e,
    n = t.length === 1;
  return (0, J.jsxs)(`div`, {
    className: `kc-row-under kc-add-slider`,
    role: `group`,
    "aria-label": `Add slider`,
    children: [
      (0, J.jsx)(`span`, {
        className: `kc-add-slider-label`,
        "aria-hidden": `true`,
        children: `add slider:`,
      }),
      t.map((t) =>
        (0, J.jsx)(
          `button`,
          {
            type: `button`,
            className: `kc-letter-button`,
            "data-tone": n ? `accent` : void 0,
            "aria-label": `Add slider for ${qn(t)}`,
            onClick: () => e.onAdd([t]),
            children: qn(t),
          },
          t
        )
      ),
      !n &&
        (0, J.jsx)(`button`, {
          type: `button`,
          className: `kc-letter-button`,
          "data-tone": `accent`,
          "data-word": `true`,
          "aria-label": `Add sliders for all`,
          onClick: () => e.onAdd(t),
          children: `all`,
        }),
    ],
  });
}
function Vx(e) {
  let t = `kc-label-${(0, h.useId)().replace(/:/g, ``)}`;
  return (0, J.jsxs)(`div`, {
    className: `kc-row-under kc-point-label`,
    children: [
      (0, J.jsx)(`input`, {
        id: t,
        type: `checkbox`,
        className: `kc-checkbox`,
        "aria-disabled": `true`,
        "aria-describedby": `${t}-note`,
        checked: !1,
        onChange: () => void 0,
        onClick: (e) => e.preventDefault(),
      }),
      (0, J.jsx)(`label`, { htmlFor: t, children: `Label` }),
      (0, J.jsxs)(`span`, {
        id: `${t}-note`,
        hidden: !0,
        children: [`Point labels for expression `, e.rowNumber, ` are not available yet.`],
      }),
    ],
  });
}
function Hx(e, t, n) {
  n.current = !0;
  try {
    e.latex(t);
  } finally {
    n.current = !1;
  }
}
function Ux(e) {
  return (
    e instanceof Element &&
    e.closest(`button, a, input, select, textarea, .mq-editable-field`) === null
  );
}
function Wx(e, t) {
  return t === `point`
    ? `point`
    : e.kind === `region`
      ? /\\(?:le|ge|leq|geq)\b|≤|≥/.test(e.latex)
        ? `region`
        : `region-strict`
      : `wave`;
}
function Gx() {
  let e = (0, h.useContext)(Mp);
  if (e === null) throw Error(`ExpressionRow must be used inside FocusContext`);
  return e;
}
function Kx(e) {
  let { row: t, number: n, keypadOpen: r, motion: i } = e,
    a = i === `exit`,
    o = om(),
    { focusedRowId: s, activeRowId: c } = am(o),
    l = Gx(),
    u = gp(),
    d = (0, h.useContext)(xy),
    f = (0, h.useContext)(xv),
    p = (0, h.useContext)(Ox),
    m = e.editing === !0 && !a,
    g = Jl(t.color, Pp()),
    _ = (0, h.useMemo)(() => wy(t.id), [t.id]),
    v = (0, h.useMemo)(() => ay(t.latex), [t.latex]),
    y = t.error,
    b = y === null ? Cy(t) : null,
    x = y === null ? t.valueText : null,
    S = [
      _.speech,
      x === null ? null : _.value,
      y === null ? null : _.error,
      t.complexHint ? _.hint : null,
    ]
      .filter((e) => e !== null)
      .join(` `),
    C = (0, h.useRef)(null),
    w = (0, h.useRef)(null),
    [T, E] = (0, h.useState)(!1),
    D = fx(() => {
      let e = jx(o, t.id);
      return (e && E(!0), e);
    }),
    O = (0, h.useRef)(null),
    k = (0, h.useRef)(null),
    A = (0, h.useRef)(!1),
    ee = (0, h.useRef)(!1),
    te = (0, h.useRef)({
      latex: t.latex,
      number: n,
      onTouchFocus: e.onTouchFocus,
      onExitDone: e.onExitDone,
    });
  return (
    (0, h.useLayoutEffect)(() => {
      te.current = {
        latex: t.latex,
        number: n,
        onTouchFocus: e.onTouchFocus,
        onExitDone: e.onExitDone,
      };
    }),
    (0, h.useLayoutEffect)(() => {
      let e = t.id,
        n = d(O.current, {
          ariaLabel: `Expression ${te.current.number}`,
          maxLength: je,
          onEdit(t) {
            let n = k.current;
            A.current ||
              n === null ||
              vv(n) ||
              (t === `table`
                ? cv(o, l, e)
                : o.editRow(e, t, `typing`) === `char-limit` &&
                  (Hx(n, te.current.latex, A), u.announce(Y.charLimit)));
          },
          onEnter: () => ov(o, l, u, e, `focus`),
          onArrowOut: (t) => uv(o, l, e, t),
          onDeleteOutOf(t) {
            k.current?.latex() === `` && dv(o, l, e, t);
          },
          onFocus() {
            let t = ee.current;
            ((ee.current = !1),
              o.setFocusedRow(e),
              o.activateExpression(e),
              t && te.current.onTouchFocus(e));
          },
          onBlur() {
            ((ee.current = !1), o.setFocusedRow(null), o.endEditGroup());
          },
          onRefused(e) {
            e === `char-limit` && u.announce(Y.charLimit);
          },
        });
      return (
        (k.current = n),
        Hx(n, te.current.latex, A),
        () => {
          ((k.current = null), n.destroy());
        }
      );
    }, [u, d, o, l, t.id]),
    (0, h.useLayoutEffect)(() => {
      let e = k.current;
      if (!(e === null || a)) return l.registerField(t.id, e);
    }, [a, u, d, o, l, t.id]),
    (0, h.useLayoutEffect)(() => {
      i === `enter` && C.current?.offsetHeight;
    }, [i]),
    (0, h.useLayoutEffect)(() => {
      let e = C.current;
      if (e === null || !a) return;
      e.setAttribute(`inert`, ``);
      let n = t.id,
        r = () => te.current.onExitDone(n),
        i = f(e);
      if (i <= 0) return (r(), () => e.removeAttribute(`inert`));
      let o = setTimeout(r, i);
      return () => {
        (clearTimeout(o), e.removeAttribute(`inert`));
      };
    }, [a, f, t.id]),
    (0, h.useLayoutEffect)(() => {
      let e = k.current;
      e !== null && e.latex() !== t.latex && Hx(e, t.latex, A);
    }, [t.latex]),
    (0, h.useLayoutEffect)(() => {
      k.current?.setInputMode(r ? `none` : `text`);
    }, [r, u, d, o, l, t.id]),
    (0, h.useLayoutEffect)(() => {
      let e = k.current;
      if (e === null) return;
      let t = Ty(e);
      (t.setAttribute(`aria-labelledby`, _.label),
        t.setAttribute(`aria-describedby`, S),
        y === null ? t.removeAttribute(`aria-invalid`) : t.setAttribute(`aria-invalid`, `true`));
    }),
    (0, J.jsx)(`li`, {
      ref: C,
      className: `kc-row`,
      "data-row-id": t.id,
      "data-focused": s === t.id ? `true` : void 0,
      "data-active": c === t.id ? `true` : void 0,
      "data-motion": i,
      "aria-hidden": a ? `true` : void 0,
      onTransitionEnd: (e) => {
        if (e.target !== e.currentTarget || a) return;
        let { focusedRowId: n, activeRowId: r } = o.getSnapshot();
        (n ?? r) === t.id && C.current?.scrollIntoView({ block: `nearest` });
      },
      children: (0, J.jsxs)(`div`, {
        className: `kc-row-inner`,
        onPointerDown: (e) => {
          !a && Ux(e.target) && (ee.current = e.pointerType === `touch`);
        },
        onMouseDown: (e) => {
          !a && Ux(e.target) && e.preventDefault();
        },
        onClick: (e) => {
          !a && Ux(e.target) && l.focusRow(t.id, `end`);
        },
        onContextMenu: a ? void 0 : D.trigger.onContextMenu,
        onKeyDown: a ? void 0 : D.trigger.onKeyDown,
        children: [
          (0, J.jsxs)(`div`, {
            className: `kc-row-gutter`,
            children: [
              (0, J.jsx)(`span`, { className: `kc-row-number`, children: a ? null : n }),
              b !== null &&
                (0, J.jsx)(`button`, {
                  type: `button`,
                  className: `kc-row-tab`,
                  "aria-label": `${t.hidden ? `Show` : `Hide`} expression ${n}`,
                  "aria-pressed": !t.hidden,
                  "data-kind": Wx(t, b),
                  style: { "--kc-row-color": g },
                  ref: w,
                  "aria-haspopup": `menu`,
                  "aria-expanded": T,
                  onClick: () => {
                    D.consumeClick() || o.setRowHidden(t.id, !t.hidden);
                  },
                  onPointerDown: D.trigger.onPointerDown,
                  onMouseDown: (e) => e.preventDefault(),
                  onPointerUp: D.trigger.onPointerUp,
                  onPointerLeave: D.trigger.onPointerLeave,
                  children: !t.hidden && (0, J.jsx)(K_, { kind: m ? null : Wx(t, b) }),
                }),
              T &&
                (0, J.jsx)(Nx, {
                  rowId: t.id,
                  number: n,
                  trigger: w,
                  onClose: (e) => {
                    (E(!1),
                      e && (w.current === null ? l.focusRow(t.id, `end`) : w.current.focus()));
                  },
                }),
              y !== null && (0, J.jsx)(_x, { id: _.error, message: y.message, variant: `row` }),
            ],
          }),
          (0, J.jsxs)(`div`, {
            className: `kc-row-main`,
            children: [
              (0, J.jsx)(`div`, {
                className: `kc-row-field`,
                ref: O,
                onPointerDown: (e) => {
                  ee.current = e.pointerType === `touch`;
                },
              }),
              (0, J.jsx)(`span`, {
                id: _.label,
                hidden: !0,
                children:
                  t.regression?.result?.ok === !0 ? `Expression ${n}. ${wx}` : `Expression ${n}`,
              }),
              (0, J.jsx)(`span`, { id: _.speech, hidden: !0, children: v }),
              x !== null && (0, J.jsx)(Rx, { id: _.value, value: t.value, valueText: x }),
              t.complexHint &&
                (0, J.jsxs)(`div`, {
                  className: `kc-row-hint`,
                  children: [
                    (0, J.jsx)(`span`, { id: _.hint, children: Ai.text }),
                    (0, J.jsx)(`button`, {
                      type: `button`,
                      className: `kc-row-hint-action`,
                      onClick: () => {
                        (o.updateSettings({ complex: !0 }), l.focusRow(t.id, `end`));
                      },
                      children: Ai.action,
                    }),
                  ],
                }),
              y?.code === `too-many-variables` &&
                (0, J.jsx)(Bx, { names: t.chips, onAdd: (e) => zx(o, u, t.id, e) }),
              b === `point` && (0, J.jsx)(Vx, { rowNumber: n }),
              y === null && (0, J.jsx)(Ex, { row: t }),
            ],
          }),
          m
            ? (0, J.jsx)(Px, {
                engine: o,
                focus: l,
                announcer: u,
                rowId: t.id,
                number: n,
                canTabulate: jx(o, t.id),
                onCreateTable: () => Mx(o, l, u, p, t.id),
              })
            : (0, J.jsx)(`button`, {
                type: `button`,
                className: `kc-row-delete`,
                "aria-label": `Delete expression ${n}`,
                onClick: (e) => {
                  if (e.detail === 0) {
                    fv(o, l, t.id);
                    return;
                  }
                  let n = C.current?.closest(`.kc-list`);
                  (o.deleteRow(t.id), n?.focus({ preventScroll: !0 }));
                },
                children: (0, J.jsx)(W_, {}),
              }),
        ],
      }),
    })
  );
}
var qx = 0.1;
function Jx(e, t) {
  if (t > e) {
    let n = (t - e) * qx;
    return [e - n, t + n];
  }
  let n = Math.max(1, qx * Math.abs(e));
  return [e - n, e + n];
}
function Yx(e) {
  let t = 1 / 0,
    n = -1 / 0,
    r = 1 / 0,
    i = -1 / 0;
  for (let a of e)
    for (let e = 0; e + 1 < a.length; e += 2) {
      let o = a[e],
        s = a[e + 1];
      Number.isFinite(o) &&
        Number.isFinite(s) &&
        ((t = Math.min(t, o)), (n = Math.max(n, o)), (r = Math.min(r, s)), (i = Math.max(i, s)));
    }
  if (t > n) return null;
  let [a, o] = Jx(t, n),
    [s, c] = Jx(r, i);
  return { left: a, right: o, bottom: s, top: c };
}
function Xx() {
  return (0, J.jsx)(`svg`, {
    className: `kc-check-tick`,
    viewBox: `0 0 20 20`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, { d: `M3 10.8 9.2 16.2 18.8 4.8` }),
  });
}
function Zx(e) {
  return (0, J.jsxs)(`label`, {
    className: `kc-check`,
    "data-size": e.size ?? `normal`,
    children: [
      (0, J.jsxs)(`span`, {
        className: `kc-check-box`,
        children: [
          (0, J.jsx)(`input`, {
            type: `checkbox`,
            "aria-label": e.name,
            checked: e.checked,
            onChange: (t) => e.onChange(t.currentTarget.checked),
          }),
          (0, J.jsx)(Xx, {}),
        ],
      }),
      (0, J.jsx)(`span`, { className: `kc-check-text`, children: e.label }),
    ],
  });
}
function Qx(e) {
  return (0, J.jsxs)(`label`, {
    className: `kc-toggle`,
    children: [
      (0, J.jsx)(`input`, {
        ref: e.inputRef,
        type: `checkbox`,
        "aria-label": e.name,
        checked: e.checked,
        onChange: (t) => e.onChange(t.currentTarget.checked),
      }),
      (0, J.jsx)(`span`, { className: `kc-toggle-track`, "aria-hidden": `true` }),
      (0, J.jsx)(`span`, { className: `kc-toggle-knob`, "aria-hidden": `true` }),
    ],
  });
}
function $x(e) {
  let t = e.theme === `mini`;
  return (0, J.jsx)(`div`, {
    className: `kc-segments`,
    "data-theme": t ? `mini` : void 0,
    role: `radiogroup`,
    "aria-label": e.label,
    children: e.options.map((n) =>
      (0, J.jsxs)(
        `label`,
        {
          className: `kc-segment`,
          children: [
            (0, J.jsx)(`input`, {
              type: `radio`,
              name: e.name,
              "aria-label": t ? n.label : void 0,
              checked: e.value === n.value,
              onChange: () => e.onSelect(n.value),
            }),
            t
              ? (0, J.jsx)(`span`, {
                  className: `kc-segment-icon`,
                  "aria-hidden": `true`,
                  children: n.icon,
                })
              : (0, J.jsx)(`span`, { className: `kc-segment-text`, children: n.label }),
          ],
        },
        n.value
      )
    ),
  });
}
function eS(e) {
  return (0, J.jsxs)(`label`, {
    className: `kc-grid-type`,
    children: [
      (0, J.jsx)(`input`, {
        type: `radio`,
        name: e.name,
        "aria-label": e.label,
        checked: e.checked,
        onChange: e.onSelect,
      }),
      e.children,
    ],
  });
}
var tS = 12,
  nS = [-8.5, -4.25, 0, 4.25, 8.5]
    .map((e) => {
      let t = Math.sqrt(144 - e * e).toFixed(2);
      return `M${13 + e} 13m0 -${t}v${2 * Number(t)}M13 ${13 + e}m-${t} 0h${2 * Number(t)}`;
    })
    .join(``),
  rS = Array.from({ length: 6 }, (e, t) => {
    let n = (t * Math.PI) / 6,
      r = (tS * Math.cos(n)).toFixed(2),
      i = (tS * Math.sin(n)).toFixed(2);
    return `M${(13 - Number(r)).toFixed(2)} ${(13 - Number(i)).toFixed(2)}L${(13 + Number(r)).toFixed(2)} ${(13 + Number(i)).toFixed(2)}`;
  }).join(``);
function iS() {
  return (0, J.jsx)(`svg`, {
    viewBox: `0 0 26 26`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`g`, {
      className: `kc-grid-type-lines`,
      children: (0, J.jsx)(`path`, { d: nS }),
    }),
  });
}
function aS() {
  return (0, J.jsx)(`svg`, {
    viewBox: `0 0 26 26`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsxs)(`g`, {
      className: `kc-grid-type-lines`,
      children: [
        (0, J.jsx)(`circle`, { cx: `13`, cy: `13`, r: `1.5` }),
        (0, J.jsx)(`circle`, { cx: `13`, cy: `13`, r: `4.25` }),
        (0, J.jsx)(`circle`, { cx: `13`, cy: `13`, r: `8.5` }),
        (0, J.jsx)(`path`, { d: rS }),
      ],
    }),
  });
}
var oS = [
  [`filled`, `Filled circle`],
  [`open`, `Open circle`],
  [`cross`, `Cross`],
].map(([e, t]) => ({ value: e, label: t, icon: (0, J.jsx)(ux, { style: e }) }));
function sS(e) {
  let t = e.style === `dashed` ? `4.5 3` : e.style === `dotted` ? `0.1 4` : void 0;
  return (0, J.jsx)(`svg`, {
    viewBox: `0 0 20 20`,
    "aria-hidden": `true`,
    focusable: `false`,
    children: (0, J.jsx)(`path`, {
      d: `M2.5 17.5 17.5 2.5`,
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: 2.5,
      strokeLinecap: `round`,
      strokeDasharray: t,
    }),
  });
}
var cS = [
    [`solid`, `Solid`],
    [`dashed`, `Dashed`],
    [`dotted`, `Dotted`],
  ].map(([e, t]) => ({ value: e, label: t, icon: (0, J.jsx)(sS, { style: e }) })),
  lS = 10,
  uS = 8,
  dS = 2;
function fS(e, t, n) {
  let r = t.getBoundingClientRect(),
    i = n.getBoundingClientRect(),
    a = r.left + r.width / 2,
    o = e.offsetWidth,
    s = Math.max(i.left + dS, Math.min(a - lS - uS, i.right - o - dS)),
    c = r.bottom + 3;
  ((e.style.left = `${s}px`),
    (e.style.top = `${c}px`),
    (e.style.maxHeight = `${Math.max(0, i.bottom - c - dS)}px`));
  let l = e.getBoundingClientRect();
  (l.width > 0 &&
    (Math.abs(l.left - s) > 0.5 || Math.abs(l.top - c) > 0.5) &&
    ((e.style.left = `${2 * s - l.left}px`), (e.style.top = `${2 * c - l.top}px`)),
    e.style.setProperty(`--kc-arrow-at`, `${a - s - uS}px`));
}
function pS(e) {
  let { tableId: t, column: n, stored: r, header: i } = e,
    a = om(),
    o = Pp(),
    s = (0, h.useContext)(Dp),
    [c, l] = (0, h.useState)(!1),
    u = (0, h.useRef)(null),
    d = (0, h.useRef)(null),
    f = (0, h.useRef)(null),
    p = ql(r.color, o),
    m = (e) => a.setColumnStyle(t, n, e),
    g = (e) => {
      (l(!1), e && u.current?.focus());
    },
    { trigger: _, consumeClick: v } = fx(() => l(!0));
  px(c, `column-style-menu`, { popup: d, trigger: u }, s, g);
  let [y, b] = (0, h.useState)(null);
  ((0, h.useLayoutEffect)(() => {
    b(u.current?.closest(`.kc-app`) ?? null);
  }, []),
    (0, h.useLayoutEffect)(() => {
      let e = d.current;
      c && e !== null && u.current !== null && y !== null && fS(e, u.current, y);
    }),
    (0, h.useEffect)(() => {
      c && f.current?.focus();
    }, [c]));
  let x = r.pointStyle ?? `filled`,
    S = r.lineStyle ?? `solid`,
    C = `kc-style-${t}-${n}`,
    w = (e) => (y === null ? e : (0, cx.createPortal)(e, y));
  return (0, J.jsxs)(`div`, {
    className: `kc-column-style`,
    children: [
      (0, J.jsx)(`button`, {
        type: `button`,
        ref: u,
        className: `kc-column-icon`,
        "aria-label": `Points for ${i}`,
        "aria-pressed": !r.hidden,
        "aria-haspopup": `dialog`,
        "aria-expanded": c,
        "aria-keyshortcuts": `Shift+F10`,
        style: { "--kc-row-color": p.hex },
        onClick: () => {
          v() || m({ hidden: !r.hidden });
        },
        ..._,
        children: (0, J.jsx)(ux, { style: x, hidden: r.hidden }),
      }),
      c &&
        w(
          (0, J.jsx)(`div`, {
            ref: d,
            className: `kc-style-menu`,
            role: `dialog`,
            "aria-label": `Style for ${i}`,
            children: (0, J.jsxs)(`div`, {
              className: `kc-style-body`,
              children: [
                (0, J.jsxs)(`div`, {
                  className: `kc-style-section`,
                  children: [
                    (0, J.jsxs)(`div`, {
                      className: `kc-style-title`,
                      children: [
                        (0, J.jsx)(`span`, { "aria-hidden": `true`, children: `Points` }),
                        (0, J.jsx)(Qx, {
                          name: `Show points`,
                          inputRef: f,
                          checked: !r.hidden,
                          onChange: () => m({ hidden: !r.hidden }),
                        }),
                      ],
                    }),
                    (0, J.jsx)(`div`, {
                      className: `kc-style-content`,
                      children: (0, J.jsx)($x, {
                        name: `${C}-point`,
                        label: `Point style`,
                        theme: `mini`,
                        options: oS,
                        value: x,
                        onSelect: (e) => m({ pointStyle: e }),
                      }),
                    }),
                  ],
                }),
                (0, J.jsx)(`div`, {
                  className: `kc-style-section`,
                  children: (0, J.jsx)(`div`, {
                    className: `kc-style-swatches`,
                    role: `radiogroup`,
                    "aria-label": `Colour`,
                    children: jl.map((e, t) =>
                      (0, J.jsxs)(
                        `label`,
                        {
                          className: `kc-style-swatch`,
                          style: { "--kc-row-color": ql(e, o).hex },
                          children: [
                            (0, J.jsx)(`input`, {
                              type: `radio`,
                              name: `${C}-colour`,
                              "aria-label": `Colour ${t + 1}`,
                              checked: mS(r.color, e),
                              onChange: () => m({ color: e }),
                            }),
                            (0, J.jsx)(`svg`, {
                              viewBox: `0 0 16 16`,
                              "aria-hidden": `true`,
                              focusable: `false`,
                              children: (0, J.jsx)(`path`, { d: `M3 8.4 6.4 11.8 13 4.6` }),
                            }),
                          ],
                        },
                        e
                      )
                    ),
                  }),
                }),
                (0, J.jsxs)(`div`, {
                  className: `kc-style-section`,
                  children: [
                    (0, J.jsxs)(`div`, {
                      className: `kc-style-title`,
                      children: [
                        (0, J.jsx)(`span`, { "aria-hidden": `true`, children: `Lines` }),
                        (0, J.jsx)(Qx, {
                          name: `Connect points`,
                          checked: r.lines === !0,
                          onChange: () => m({ lines: r.lines !== !0 }),
                        }),
                      ],
                    }),
                    (0, J.jsx)(`div`, {
                      className: `kc-style-content`,
                      children: (0, J.jsx)($x, {
                        name: `${C}-line`,
                        label: `Line style`,
                        theme: `mini`,
                        options: cS,
                        value: S,
                        onSelect: (e) => m({ lineStyle: e }),
                      }),
                    }),
                  ],
                }),
                (0, J.jsxs)(`div`, {
                  className: `kc-style-section kc-style-actions`,
                  children: [
                    (0, J.jsx)(`button`, {
                      type: `button`,
                      className: `kc-style-action`,
                      onClick: () => {
                        (l(!1), e.onAddRegression());
                      },
                      children: `Add regression`,
                    }),
                    (0, J.jsx)(`button`, {
                      type: `button`,
                      className: `kc-style-action`,
                      onClick: () => {
                        (l(!1), a.deleteTableColumn(t, n), e.onDeleted());
                      },
                      children: `Delete column`,
                    }),
                  ],
                }),
              ],
            }),
          })
        ),
    ],
  });
}
function mS(e, t) {
  return e === t || (t === `c3` && e.toLowerCase() === `#388c46`);
}
function hS(e) {
  let { row: t, number: n, keypadOpen: r, motion: i } = e,
    a = i === `exit`,
    o = om(),
    { focusedRowId: s, activeRowId: c, geometry: l } = am(o),
    u = (0, h.useContext)(Mp),
    d = { engine: o, focus: u, announcer: gp(), tableId: t.id },
    [f, p] = (0, h.useState)(!1),
    m = (0, h.useRef)(null),
    g = (0, h.useRef)(e.onExitDone);
  ((0, h.useLayoutEffect)(() => {
    g.current = e.onExitDone;
  }),
    (0, h.useLayoutEffect)(() => {
      a && g.current(t.id);
    }, [a, t.id]));
  let _ = t.columns ?? [],
    v = t.table?.analysis.columns ?? [],
    y = t.table?.result?.columns ?? [],
    b = jy(t),
    x = _.map((e, t) => Ay(e.latex, t)),
    S = (e) => v[e]?.role === `computed`,
    C = f && _.length < 10,
    w = (e) => {
      let n = Cx(o, t.id, e);
      n !== null && typeof n != `string` && u.focusRow(n.id, `end`);
    },
    T = l.get(t.id),
    E = T?.kind === `table` ? Yx(T.series.map((e) => e.coords)) : null,
    D = () => p(!0),
    O = (e) => {
      let t = e.relatedTarget;
      (!(t instanceof Node) || !m.current?.contains(t)) && p(!1);
    },
    k = (n, i) => {
      let a = _[n].values[i] ?? ``;
      if (S(n)) {
        let e = i < b ? (y[n]?.display[i] ?? null) : null;
        return (0, J.jsx)(
          `div`,
          {
            role: `gridcell`,
            className: `kc-table-cell`,
            "data-computed": `true`,
            "aria-readonly": `true`,
            "aria-label": Py(x[n], i, e),
            children: e,
          },
          n
        );
      }
      let o = v[n]?.cellErrors[i] ?? null,
        s = o === null ? null : Fy(t.id, n, i);
      return (0, J.jsxs)(
        `div`,
        {
          role: `gridcell`,
          className: `kc-table-cell`,
          children: [
            o !== null && (0, J.jsx)(_x, { id: s, message: o.message, variant: `cell` }),
            (0, J.jsx)(Oy, {
              tableId: t.id,
              column: n,
              row: i,
              latex: a,
              name: Ny(x[n], i, a),
              errorId: s,
              keypadOpen: r,
              onTouchFocus: e.onTouchFocus,
              keys: Uy(d, n, i),
              onEdit: (e, r) => e.editCell(t.id, n, i, r, `typing`),
            }),
          ],
        },
        n
      );
    };
  return (0, J.jsx)(`li`, {
    className: `kc-row kc-table-item`,
    "data-row-id": t.id,
    "data-focused": s === t.id ? `true` : void 0,
    "data-active": c === t.id ? `true` : void 0,
    "data-motion": i,
    "aria-hidden": a ? `true` : void 0,
    children: (0, J.jsxs)(`div`, {
      className: `kc-row-inner`,
      children: [
        (0, J.jsx)(`div`, {
          className: `kc-row-gutter`,
          children: (0, J.jsx)(`span`, { className: `kc-row-number`, children: a ? null : n }),
        }),
        (0, J.jsxs)(`div`, {
          className: `kc-row-main`,
          children: [
            (0, J.jsxs)(`div`, {
              ref: m,
              role: `grid`,
              className: `kc-table`,
              "aria-label": My(n, _.length, b),
              onFocus: D,
              onBlur: O,
              children: [
                (0, J.jsx)(`div`, {
                  role: `row`,
                  className: `kc-table-row`,
                  "data-header": `true`,
                  children: [..._.map((e) => e.latex), ...(C ? [null] : [])].map((n, i) => {
                    let a = n === null ? null : (v[i]?.error ?? null),
                      o = a === null ? null : Fy(t.id, i, `h`);
                    return (0, J.jsxs)(
                      `div`,
                      {
                        role: `columnheader`,
                        className: `kc-table-cell`,
                        children: [
                          a !== null &&
                            (0, J.jsx)(_x, { id: o, message: a.message, variant: `cell` }),
                          n !== null &&
                            i > 0 &&
                            (0, J.jsx)(pS, {
                              tableId: t.id,
                              column: i,
                              stored: _[i],
                              header: x[i],
                              onDeleted: () => u.focusRow(Op(t.id, i - 1, `h`), `end`),
                              onAddRegression: () => w(i),
                            }),
                          (0, J.jsx)(Oy, {
                            tableId: t.id,
                            column: i,
                            row: `h`,
                            latex: n ?? ``,
                            name: n === null ? Iy : `Column ${i + 1} header`,
                            errorId: o,
                            keypadOpen: r,
                            onTouchFocus: e.onTouchFocus,
                            keys: Uy(d, i, `h`),
                            onEdit: (e, n) => e.editHeader(t.id, i, n, `typing`),
                          }),
                        ],
                      },
                      `h-${i}`
                    );
                  }),
                }),
                Array.from({ length: b + 1 }, (e, t) =>
                  (0, J.jsxs)(
                    `div`,
                    {
                      role: `row`,
                      className: `kc-table-row`,
                      children: [
                        _.map((e, n) => k(n, t)),
                        t < b &&
                          (0, J.jsx)(`div`, {
                            role: `gridcell`,
                            className: `kc-table-control`,
                            children: (0, J.jsx)(`button`, {
                              type: `button`,
                              className: `kc-table-row-delete`,
                              "aria-label": `Delete table ${n} row ${t + 1}`,
                              onClick: () => Gy(d, t),
                              children: (0, J.jsx)(W_, { size: 12 }),
                            }),
                          }),
                      ],
                    },
                    t
                  )
                ),
              ],
            }),
            (0, J.jsx)(`button`, {
              type: `button`,
              className: `kc-table-add-row`,
              "aria-label": `Add row to table ${n}`,
              "aria-disabled": b >= 1e3 ? `true` : void 0,
              onClick: () => Wy(d),
              children: (0, J.jsx)(R_, { size: 14 }),
            }),
            (0, J.jsx)(`button`, {
              type: `button`,
              className: `kc-table-add-row`,
              "aria-label": `Zoom to fit table ${n}`,
              "aria-disabled": E === null ? `true` : void 0,
              onClick: () => E !== null && o.setMathBounds(E),
              children: (0, J.jsx)(Y_, { size: 14 }),
            }),
            (0, J.jsx)(`button`, {
              type: `button`,
              className: `kc-table-add-row`,
              "aria-label": `Add regression for table ${n}`,
              "aria-disabled": _.length < 2 ? `true` : void 0,
              onClick: () => w(1),
              children: (0, J.jsx)(X_, { size: 14 }),
            }),
          ],
        }),
        (0, J.jsx)(`button`, {
          type: `button`,
          className: `kc-row-delete`,
          "aria-label": `Delete table ${n}`,
          onClick: () => fv(o, u, t.id),
          children: (0, J.jsx)(W_, {}),
        }),
      ],
    }),
  });
}
var gS = new Set([`Tab`, `ArrowUp`, `ArrowDown`]);
function _S() {
  let e = (0, h.useRef)(!1);
  return {
    onKeyDownCapture: (t) => {
      t.key !== `Shift` && (e.current = gS.has(t.key));
    },
    onKeyUpCapture: (e) => {
      e.key === `Tab` && (e.currentTarget.dataset.input = `keyboard`);
    },
    onFocusCapture: (t) => {
      e.current && (t.currentTarget.dataset.input = `keyboard`);
    },
    onPointerDownCapture: (t) => {
      ((e.current = !1), (t.currentTarget.dataset.input = `pointer`));
    },
  };
}
function vS(e) {
  let t = Bb(e.disabled === !0);
  return (0, J.jsxs)(`button`, {
    type: `button`,
    className: `kc-list-tool`,
    ref: e.buttonRef,
    "aria-label": e.label,
    "aria-pressed": e.pressed,
    "aria-disabled": e.disabled,
    "data-tool": e.tool,
    onMouseDown: (e) => e.preventDefault(),
    onClick: e.onClick,
    ...t.handlers,
    children: [e.icon, t.open && (0, J.jsx)(Vb, { text: e.tooltip })],
  });
}
function yS(e, t) {
  let n = (0, h.useContext)(xv),
    [r, i] = (0, h.useState)(t ? `collapsed` : `expanded`),
    [a, o] = (0, h.useState)(t),
    s = (0, h.useRef)(null);
  t !== a && (o(t), s.current === t ? (s.current = null) : i(t ? `collapsed` : `expanded`));
  let c = (0, h.useRef)(null),
    l = (0, h.useRef)(null),
    u = (0, h.useRef)(null),
    d = (0, h.useRef)(null),
    f = (0, h.useRef)(null),
    p = (0, h.useRef)(null);
  ((0, h.useLayoutEffect)(() => {
    let e = l.current;
    if ((r !== `collapsing` && r !== `expanding`) || e === null) return;
    r === `expanding` && (e.offsetHeight, e.removeAttribute(`data-enter`));
    let t = () => i(r === `collapsing` ? `collapsed` : `expanded`),
      a = n(e);
    if (a <= 0) {
      t();
      return;
    }
    let o = setTimeout(t, a);
    return () => clearTimeout(o);
  }, [r, n]),
    (0, h.useLayoutEffect)(() => {
      p.current === `expand` && r === `collapsed`
        ? ((p.current = null), u.current?.focus())
        : p.current === `collapse` && r === `expanded` && ((p.current = null), d.current?.focus());
    }, [r]));
  let m = f.current;
  return {
    listState: r,
    panelRef: c,
    bodyRef: l,
    expandRef: u,
    collapseRef: d,
    collapse: () => {
      if (r !== `expanded`) return;
      let t = l.current;
      ((f.current = t === null ? null : { width: t.offsetWidth, height: t.offsetHeight }),
        (p.current = `expand`),
        (s.current = !0),
        e.updateSettings({ expressionsCollapsed: !0 }),
        i(`collapsing`));
    },
    expand: () => {
      r === `collapsed` &&
        ((p.current = `collapse`),
        (s.current = !1),
        e.updateSettings({ expressionsCollapsed: !1 }),
        i(`expanding`));
    },
    overlayStyle:
      r === `collapsing`
        ? {
            position: `absolute`,
            left: 0,
            zIndex: 1,
            ...(m === null ? {} : { width: m.width, height: m.height }),
          }
        : void 0,
  };
}
function bS(e) {
  let t = om(),
    { rows: n, canUndo: r, canRedo: i, settings: a } = am(t),
    o = (0, h.useContext)(Mp),
    s = gp(),
    [c, l] = (0, h.useState)(!1),
    [u, d] = (0, h.useState)(!1),
    f = (0, h.useRef)(null),
    p = nv(n),
    m = yS(t, a.expressionsCollapsed),
    g = _S(),
    { items: _, exitDone: v } = p;
  if (
    ((0, h.useEffect)(() => {
      if (m.listState === `collapsed`) for (let e of _) e.motion === `exit` && v(e.row.id);
    }, [m.listState, _, v]),
    (0, h.useEffect)(() => {
      let e = sx(t, s);
      return () => e.destroy();
    }, [t, s]),
    o === null)
  )
    throw Error(`ExpressionPanel must be used inside FocusContext`);
  let y = (0, h.useRef)(!1),
    b = () => {
      ((y.current = !0), l(!1));
    };
  (0, h.useLayoutEffect)(() => {
    !c && y.current && ((y.current = !1), f.current?.focus());
  }, [c]);
  let x = 0,
    S = _.map((e) => {
      let t = e.motion === `exit`;
      return (t || (x += 1), { ...e, number: t ? x + 1 : x });
    }),
    { listState: C } = m,
    w = e.layout === `stacked`,
    T = (e) => {
      (e.preventDefault(), ov(t, o, s, null, `focus`));
    };
  return (0, J.jsxs)(`section`, {
    ref: m.panelRef,
    className: `kc-list-panel`,
    "aria-label": `Expression list`,
    "data-layout": e.layout,
    "data-pointer": e.pointer,
    "data-list-state": C,
    "data-keypad": String(e.keypadOpen),
    "data-scrolled": u ? `true` : void 0,
    ...g,
    children: [
      (C === `collapsed` || C === `collapsing`) &&
        (0, J.jsx)(vS, {
          label: `Expand list`,
          tooltip: `Show List`,
          icon: (0, J.jsx)(U_, { direction: w ? `up` : `right` }),
          buttonRef: m.expandRef,
          onClick: m.expand,
        }),
      C !== `collapsed` &&
        (0, J.jsxs)(`div`, {
          className: `kc-list-slide`,
          ref: m.bodyRef,
          "data-enter": C === `expanding` ? `true` : void 0,
          style: m.overlayStyle,
          children: [
            (0, J.jsxs)(`div`, {
              className: `kc-list-toolbar`,
              role: `toolbar`,
              "aria-label": `List tools`,
              "data-editing": c ? `true` : void 0,
              children: [
                (0, J.jsx)(`div`, {
                  className: `kc-toolbar-zone`,
                  children: c
                    ? (0, J.jsx)(`button`, {
                        type: `button`,
                        className: `kc-edit-action`,
                        "data-tone": `danger`,
                        onClick: () => mv(t, o, s),
                        children: `Delete All`,
                      })
                    : (0, J.jsxs)(J.Fragment, {
                        children: [
                          (0, J.jsx)(qb, { layout: e.layout }),
                          w &&
                            e.pointer === `fine` &&
                            (0, J.jsx)(vS, {
                              label: `Keypad`,
                              tooltip: `Keypad`,
                              icon: (0, J.jsx)(q_, { width: 22 }),
                              tool: `keypad`,
                              pressed: e.keypadOpen,
                              onClick: e.onToggleKeypad,
                            }),
                        ],
                      }),
                }),
                (0, J.jsxs)(`div`, {
                  className: `kc-toolbar-zone`,
                  "data-zone": `centre`,
                  children: [
                    (0, J.jsx)(vS, {
                      label: `Undo`,
                      tooltip: `Undo (CTRL+Z)`,
                      icon: (0, J.jsx)(z_, {}),
                      tool: `history`,
                      disabled: !r,
                      onClick: () => hv(t, s),
                    }),
                    (0, J.jsx)(vS, {
                      label: `Redo`,
                      tooltip: `Redo (CTRL+Y)`,
                      icon: (0, J.jsx)(z_, { redo: !0 }),
                      tool: `history`,
                      disabled: !i,
                      onClick: () => gv(t, s),
                    }),
                  ],
                }),
                (0, J.jsx)(`div`, {
                  className: `kc-toolbar-zone`,
                  children: c
                    ? (0, J.jsx)(`button`, {
                        type: `button`,
                        className: `kc-edit-action`,
                        "data-tone": `accent`,
                        onClick: b,
                        children: `Done`,
                      })
                    : (0, J.jsxs)(J.Fragment, {
                        children: [
                          (0, J.jsx)(vS, {
                            label: `Edit list`,
                            tooltip: `Edit List`,
                            icon: (0, J.jsx)(H_, {}),
                            tool: `edit`,
                            buttonRef: f,
                            onClick: () => l(!0),
                          }),
                          (0, J.jsx)(vS, {
                            label: `Collapse list`,
                            tooltip: `Hide Expression List`,
                            icon: (0, J.jsx)(U_, { direction: w ? `down` : `left` }),
                            tool: `collapse`,
                            buttonRef: m.collapseRef,
                            onClick: m.collapse,
                          }),
                        ],
                      }),
                }),
              ],
            }),
            (0, J.jsx)(`div`, {
              className: `kc-list-body`,
              onScroll: (e) => d(e.currentTarget.scrollTop > 0),
              children: (0, J.jsxs)(kx, {
                children: [
                  (0, J.jsx)(`ol`, {
                    className: `kc-list`,
                    role: `list`,
                    "aria-label": `Expressions`,
                    tabIndex: -1,
                    children: S.map(({ row: t, motion: n, number: r }) =>
                      t.type === `table`
                        ? (0, J.jsx)(
                            hS,
                            {
                              row: t,
                              number: r,
                              keypadOpen: e.keypadOpen,
                              onTouchFocus: e.onTouchFocusRow,
                              motion: n,
                              onExitDone: v,
                            },
                            t.id
                          )
                        : (0, J.jsx)(
                            Kx,
                            {
                              row: t,
                              number: r,
                              editing: c,
                              keypadOpen: e.keypadOpen,
                              onTouchFocus: e.onTouchFocusRow,
                              motion: n,
                              onExitDone: v,
                            },
                            t.id
                          )
                    ),
                  }),
                  (0, J.jsx)(`div`, {
                    className: `kc-ghost-row`,
                    "aria-hidden": `true`,
                    onMouseDown: T,
                    children: (0, J.jsx)(`span`, { className: `kc-row-number`, children: x + 1 }),
                  }),
                ],
              }),
            }),
          ],
        }),
    ],
  });
}
function xS(e, t, n = 1e3) {
  return new Promise((r) => {
    let i = e.HelperExpression({ latex: t }),
      a = !1,
      o = (e) => {
        a || ((a = !0), clearTimeout(c), i.unobserve(`numericValue`, s), i.destroy(), r(e));
      },
      s = () => {
        let e = i.numericValue;
        o(Number.isFinite(e) ? e : null);
      },
      c = setTimeout(() => o(null), n);
    i.observe(`numericValue`, s);
  });
}
function SS(e) {
  let { error: t } = e,
    [n, r] = (0, h.useState)(null),
    i = () => {
      n !== null && (r(null), (n !== e.value || t !== null) && e.onCommit(n));
    };
  return (0, J.jsx)(`input`, {
    className: e.className,
    type: `text`,
    "aria-label": e.name,
    autoComplete: `off`,
    spellCheck: !1,
    inputMode: e.inputMode,
    placeholder: e.placeholder,
    value: n ?? e.value,
    "aria-invalid": t !== null || void 0,
    "aria-describedby": t === null ? void 0 : e.errorId,
    onChange: (e) => r(e.currentTarget.value),
    onBlur: i,
    onKeyDown: (e) => {
      e.key === `Enter` && (e.preventDefault(), i());
    },
  });
}
function CS(e) {
  return qi({ type: `number`, value: Number(e.toPrecision(6)) });
}
function wS(e) {
  let t = (0, h.useContext)(xy),
    n = (0, h.useRef)(null),
    r = (0, h.useRef)(null),
    [i, a] = (0, h.useState)(!1),
    o = CS(e.value),
    { label: s, error: c, errorId: l } = e,
    u = (0, h.useRef)(e.onCommit);
  return (
    (0, h.useLayoutEffect)(() => {
      u.current = e.onCommit;
    }),
    (0, h.useLayoutEffect)(() => {
      let e = () => {
          let e = r.current;
          e !== null && u.current(e.latex());
        },
        i = t(n.current, {
          ariaLabel: s,
          maxLength: je,
          onEdit: () => void 0,
          onEnter: e,
          onArrowOut: () => void 0,
          onDeleteOutOf: () => void 0,
          onFocus: () => a(!0),
          onBlur: () => {
            (e(), a(!1));
          },
          onRefused: () => void 0,
        });
      return (
        (r.current = i),
        () => {
          ((r.current = null), i.destroy());
        }
      );
    }, [t, s]),
    (0, h.useLayoutEffect)(() => {
      let e = r.current;
      e !== null && !i && e.latex() !== o && e.latex(o);
    }, [t, o, i, s]),
    (0, h.useLayoutEffect)(() => {
      let e = r.current;
      if (e === null) return;
      let t = Ty(e);
      c === null
        ? (t.removeAttribute(`aria-invalid`), t.removeAttribute(`aria-describedby`))
        : (t.setAttribute(`aria-invalid`, `true`), t.setAttribute(`aria-describedby`, l));
    }),
    (0, J.jsx)(`span`, { className: `kc-settings-bound`, ref: n })
  );
}
function TS(e, t, n, r) {
  return t === `x`
    ? n === `min`
      ? { ...e, left: r }
      : { ...e, right: r }
    : n === `min`
      ? { ...e, bottom: r }
      : { ...e, top: r };
}
function ES(e) {
  let t = e.trim(),
    n = Number(t);
  return t === `` ? { step: null } : Number.isFinite(n) && n > 0 ? { step: n } : null;
}
function DS(e) {
  let { axis: t } = e,
    n = om(),
    { settings: r, viewport: i } = am(n),
    a = (0, h.useId)(),
    [o, s] = (0, h.useState)({ min: null, max: null }),
    [c, l] = (0, h.useState)(null),
    u = (0, h.useRef)({ min: 0, max: 0 }),
    d = t === `x` ? r.xAxis : r.yAxis,
    f = t === `x` ? { min: i.left, max: i.right } : { min: i.bottom, max: i.top },
    p = { min: `${a}-min-error`, max: `${a}-max-error` },
    m = (e) =>
      n.updateSettings(
        t === `x`
          ? { xAxis: { ...n.settings.xAxis, ...e } }
          : { yAxis: { ...n.settings.yAxis, ...e } }
      ),
    g = (e, t) => s((n) => (n[e] === t ? n : { ...n, [e]: t })),
    _ = (e, r) => {
      let i = ++u.current[e];
      r === CS(f[e])
        ? g(e, null)
        : xS(n, r).then((r) => {
            if (i !== u.current[e]) return;
            if (r === null) return g(e, Y.boundNotNumber);
            let a = TS(n.getSnapshot().viewport, t, e, r);
            if (!(a.left < a.right && a.bottom < a.top)) return g(e, Y.boundOrder);
            (n.setMathBounds(a), g(e, null));
          });
    },
    v = (e) => {
      let t = ES(e);
      t === null ? l(Y.stepInvalid) : (m(t), l(null));
    },
    y = (e) =>
      (0, J.jsx)(wS, {
        label: `${t} ${e === `min` ? `minimum` : `maximum`}`,
        value: f[e],
        error: o[e],
        errorId: p[e],
        onCommit: (t) => _(e, t),
      }),
    b = `${a}-step-error`;
  return (0, J.jsxs)(`div`, {
    className: `kc-settings-axis`,
    children: [
      (0, J.jsxs)(`div`, {
        className: `kc-settings-axis-title`,
        children: [
          (0, J.jsx)(Zx, {
            label: `${t.toUpperCase()}-Axis`,
            name: `Show ${t}-axis`,
            size: `axis`,
            checked: d.show,
            onChange: (e) => m({ show: e }),
          }),
          (0, J.jsxs)(`span`, {
            className: `kc-settings-label`,
            children: [
              (0, J.jsx)(`span`, {
                className: `kc-settings-legend`,
                "aria-hidden": `true`,
                children: `Label`,
              }),
              (0, J.jsx)(SS, {
                name: `${t}-axis label`,
                className: `kc-settings-label-input`,
                placeholder: `e.g. \u201c${t}\u201d`,
                value: d.label,
                error: null,
                errorId: ``,
                onCommit: (e) => m({ label: e }),
              }),
            ],
          }),
        ],
      }),
      (0, J.jsxs)(`div`, {
        className: `kc-settings-axis-line`,
        children: [
          (0, J.jsxs)(`span`, {
            className: `kc-settings-bounds`,
            children: [
              y(`min`),
              (0, J.jsxs)(`span`, {
                className: `kc-settings-relation`,
                "aria-hidden": `true`,
                children: [
                  (0, J.jsx)(`span`, { children: `≤` }),
                  (0, J.jsx)(`var`, { children: t }),
                  (0, J.jsx)(`span`, { children: `≤` }),
                ],
              }),
              y(`max`),
            ],
          }),
          (0, J.jsxs)(`span`, {
            className: `kc-settings-step`,
            children: [
              (0, J.jsx)(`span`, { "aria-hidden": `true`, children: `Step:` }),
              (0, J.jsx)(SS, {
                name: `${t}-axis step`,
                className: `kc-settings-step-input`,
                value: d.step === null ? `` : String(d.step),
                inputMode: `decimal`,
                error: c,
                errorId: b,
                onCommit: v,
              }),
            ],
          }),
        ],
      }),
      [`min`, `max`].map(
        (e) =>
          o[e] !== null &&
          (0, J.jsx)(`p`, { id: p[e], className: `kc-settings-error`, children: o[e] }, e)
      ),
      c !== null && (0, J.jsx)(`p`, { id: b, className: `kc-settings-error`, children: c }),
    ],
  });
}
var OS = 12,
  kS = 5,
  AS = [
    { value: `radians`, label: `Radians` },
    { value: `degrees`, label: `Degrees` },
  ];
function jS(e, t) {
  let n = e.offsetParent;
  if (t === null || !(n instanceof HTMLElement)) return;
  let r = t.getBoundingClientRect(),
    i = n.getBoundingClientRect(),
    a = i.left + n.clientLeft,
    o = i.top + n.clientTop,
    s = e.offsetWidth,
    c = r.left - a - OS - s,
    l,
    u,
    d;
  (c >= kS
    ? ((e.dataset.side = `left`), (l = r.top - o), (u = c), (d = r.top + r.height / 2 - o - l))
    : ((e.dataset.side = `below`),
      (l = r.bottom - o + OS),
      (u = Math.max(kS, Math.min(r.right - a - s, n.clientWidth - s - kS))),
      (d = r.left + r.width / 2 - a - u)),
    (e.style.top = `${l}px`),
    (e.style.left = `${u}px`),
    e.style.setProperty(`--kc-arrow-at`, `${d}px`),
    e.style.setProperty(`--kc-settings-max-h`, `${Math.max(0, n.clientHeight - l - kS)}px`));
}
function MS() {
  let e = (0, h.useContext)(Dp);
  if (e === null) throw Error(`SettingsPopover must be used inside EscapeContext`);
  return e;
}
function NS(e) {
  let { anchor: t, open: n } = e,
    r = om(),
    { settings: i } = am(r),
    a = gp(),
    o = MS(),
    s = (0, h.useId)(),
    c = (0, h.useRef)(null),
    l = (0, h.useRef)({ anchor: t, onClose: e.onClose });
  return (
    (0, h.useLayoutEffect)(() => {
      l.current = { anchor: t, onClose: e.onClose };
    }),
    (0, h.useLayoutEffect)(() => {
      c.current !== null && jS(c.current, t);
    }),
    (0, h.useLayoutEffect)(() => {
      if (n)
        return o.push({
          id: `popover`,
          close() {
            (l.current.onClose(), l.current.anchor?.focus());
          },
        });
    }, [o, n]),
    (0, h.useEffect)(() => {
      let e = c.current;
      if (!n || e === null) return;
      let t = e.ownerDocument,
        r = (t) => {
          let n = t.composedPath(),
            r = l.current;
          n.includes(e) || (r.anchor !== null && n.includes(r.anchor)) || r.onClose();
        };
      return (
        t.addEventListener(`pointerdown`, r, !0),
        () => t.removeEventListener(`pointerdown`, r, !0)
      );
    }, [n]),
    n
      ? (0, J.jsx)(`div`, {
          ref: c,
          className: `kc-settings`,
          role: `dialog`,
          "aria-label": `Graph settings`,
          children: (0, J.jsxs)(`div`, {
            className: `kc-settings-body`,
            children: [
              (0, J.jsxs)(`div`, {
                className: `kc-settings-grid`,
                children: [
                  (0, J.jsxs)(`div`, {
                    className: `kc-settings-grid-main`,
                    children: [
                      (0, J.jsx)(Zx, {
                        label: `Grid`,
                        checked: i.showGrid,
                        onChange: (e) => r.updateSettings({ showGrid: e }),
                      }),
                      (0, J.jsxs)(`div`, {
                        className: `kc-grid-types`,
                        role: `radiogroup`,
                        "aria-label": `Grid type`,
                        children: [
                          (0, J.jsx)(eS, {
                            name: `${s}-grid`,
                            label: `Cartesian`,
                            checked: !i.polarGrid,
                            onSelect: () => r.updateSettings({ polarGrid: !1 }),
                            children: (0, J.jsx)(iS, {}),
                          }),
                          (0, J.jsx)(eS, {
                            name: `${s}-grid`,
                            label: `Polar`,
                            checked: i.polarGrid,
                            onSelect: () => r.updateSettings({ polarGrid: !0 }),
                            children: (0, J.jsx)(aS, {}),
                          }),
                        ],
                      }),
                      (0, J.jsx)(Zx, {
                        label: `Arrows`,
                        checked: i.arrows,
                        onChange: (e) => r.updateSettings({ arrows: e }),
                      }),
                    ],
                  }),
                  (0, J.jsxs)(`div`, {
                    className: `kc-settings-grid-side`,
                    children: [
                      (0, J.jsx)(Zx, {
                        label: `Axis Numbers`,
                        name: `Axis numbers`,
                        size: `small`,
                        checked: i.axisNumbers,
                        onChange: (e) => r.updateSettings({ axisNumbers: e }),
                      }),
                      (0, J.jsx)(Zx, {
                        label: `Minor Gridlines`,
                        name: `Minor gridlines`,
                        size: `small`,
                        checked: i.minorGridlines,
                        onChange: (e) => r.updateSettings({ minorGridlines: e }),
                      }),
                    ],
                  }),
                ],
              }),
              (0, J.jsxs)(`div`, {
                className: `kc-settings-section kc-settings-axes`,
                children: [(0, J.jsx)(DS, { axis: `x` }), (0, J.jsx)(DS, { axis: `y` })],
              }),
              (0, J.jsxs)(`div`, {
                className: `kc-settings-section kc-settings-complex`,
                children: [
                  (0, J.jsx)(`span`, { "aria-hidden": `true`, children: `Complex Mode` }),
                  (0, J.jsx)(Qx, {
                    name: `Complex mode`,
                    checked: i.complex,
                    onChange: (e) => r.updateSettings({ complex: e }),
                  }),
                ],
              }),
              (0, J.jsx)(`div`, {
                className: `kc-settings-section`,
                children: (0, J.jsx)($x, {
                  name: `${s}-angle`,
                  label: `Angle`,
                  options: AS,
                  value: i.angleMode,
                  onSelect: (e) => {
                    (r.updateSettings({ angleMode: e }), a.announce(Y.angle(e)));
                  },
                }),
              }),
            ],
          }),
        })
      : null
  );
}
var PS = 200,
  FS = 10,
  IS = 10,
  LS = 50;
function RS(e, t) {
  let n = Math.max(320, t - PS);
  return Math.round(Math.min(n, Math.max(320, e)));
}
function zS(e) {
  return Math.min(500, Math.max(320, 160 + 0.2 * e));
}
function BS(e, t, n) {
  let r = t - n;
  return Math.abs(r - e) <= FS ? r : e;
}
function VS(e, t) {
  let [n, r] = (0, h.useState)(null),
    i = BS(n === null ? zS(e) : RS(n, e), e, t);
  return { width: i, setWidth: r, style: { "--kc-list-width": `${i}px` } };
}
function HS(e) {
  let { containerWidth: t, onResize: n } = e,
    r = (0, h.useRef)(0);
  return (0, J.jsx)(`div`, {
    className: `kc-list-resizer`,
    role: `separator`,
    tabIndex: 0,
    "aria-label": `Resize expression list`,
    "aria-orientation": `vertical`,
    "aria-valuemin": 320,
    "aria-valuemax": Math.max(320, t - PS),
    "aria-valuenow": Math.round(e.width),
    onPointerDown: (t) => {
      if (t.button !== 0) return;
      t.preventDefault();
      let n = t.currentTarget.parentElement.getBoundingClientRect().left;
      ((r.current = t.clientX - (n + e.width)), t.currentTarget.setPointerCapture(t.pointerId));
    },
    onPointerMove: (e) => {
      let i = e.currentTarget;
      if (!i.hasPointerCapture(e.pointerId)) return;
      let a = i.parentElement.getBoundingClientRect().left;
      n(RS(e.clientX - a - r.current, t));
    },
    onKeyDown: (r) => {
      let i = e.width,
        a = r.shiftKey ? LS : IS,
        o =
          r.key === `ArrowLeft`
            ? i - a
            : r.key === `ArrowRight`
              ? i + a
              : r.key === `Home`
                ? 320
                : r.key === `End`
                  ? t - PS
                  : null;
      o !== null && (r.preventDefault(), r.stopPropagation(), n(RS(o, t)));
    },
  });
}
function US(e, t) {
  t !== null &&
    [...e.querySelectorAll(`[data-row-id]`)]
      .find((e) => e.dataset.rowId === t)
      ?.scrollIntoView({ block: `nearest` });
}
function WS(e) {
  let t = (0, h.useRef)(null),
    n = (0, h.useRef)(e.revealRowId);
  ((n.current = e.revealRowId),
    (0, h.useEffect)(() => {
      let e = t.current;
      if (e === null) return;
      let r = new ResizeObserver(() => US(e, n.current));
      return (r.observe(e), () => r.disconnect());
    }, []));
  let r = VS(e.containerWidth, e.containerHeight ?? 1 / 0),
    i = e.layout === `desktop` && !e.collapsed,
    a = () => e.host.shadowRoot.activeElement?.closest(`[data-row-id]`) != null;
  return (0, J.jsxs)(`section`, {
    ref: e.rootRef,
    className: `kc-app`,
    role: `region`,
    "aria-label": `Graphing calculator`,
    "data-kc-layout": e.layout,
    "data-collapsed": String(e.collapsed),
    "data-keypad": String(e.keypadOpen),
    "data-compact-touch":
      e.pointer === `coarse` && (e.containerWidth < 450 || (e.containerHeight ?? 1 / 0) < 495)
        ? `true`
        : void 0,
    style: e.layout === `desktop` ? r.style : void 0,
    children: [
      (0, J.jsx)(`div`, {
        ref: t,
        className: `kc-list-region`,
        onFocus: () => {
          e.settingsAnchor !== null && e.onCloseSettings();
        },
        children: (0, J.jsx)(bS, {
          layout: e.layout,
          pointer: e.pointer,
          keypadOpen: e.keypadOpen,
          onToggleKeypad: e.onToggleKeypad,
          onTouchFocusRow: e.onTouchFocusRow,
        }),
      }),
      i &&
        (0, J.jsx)(HS, { width: r.width, containerWidth: e.containerWidth, onResize: r.setWidth }),
      (0, J.jsx)(`div`, {
        className: `kc-graph-region`,
        children: (0, J.jsx)(I_, {
          host: e.host,
          themeRevision: e.themeRevision,
          reducedMotion: e.reducedMotion,
          settingsOpen: e.settingsAnchor !== null,
          onOpenSettings: e.onOpenSettings,
        }),
      }),
      (0, J.jsx)(`div`, {
        className: `kc-keypad-region`,
        onMouseDownCapture: (e) => {
          a() && e.preventDefault();
        },
        children: (0, J.jsx)(Fb, {
          containerWidth: e.containerWidth,
          layout: e.layout,
          pointer: e.pointer,
          open: e.keypadOpen,
          onOpenChange: e.onKeypadChange,
        }),
      }),
      (0, J.jsx)(NS, {
        anchor: e.settingsAnchor,
        open: e.settingsAnchor !== null,
        onClose: e.onCloseSettings,
      }),
    ],
  });
}
function GS(e) {
  let t = e.currentTarget,
    n = (e.target instanceof Element ? e.target : null)?.closest(
      `button, input, select, textarea, [tabindex]`
    );
  if (!(n instanceof HTMLElement) || !t.contains(n)) return;
  let r = t.getRootNode();
  if (!(r instanceof ShadowRoot)) return;
  let i = r.activeElement;
  if (i !== null && t.contains(i)) return;
  let a = t.ownerDocument.activeElement;
  (a === null || a.contains(r.host)) && n.focus({ preventScroll: !0 });
}
function KS(e) {
  let t = e.getRootNode(),
    n = t instanceof ShadowRoot ? t.activeElement : null;
  if (n === null || n.closest(`.mq-editable-field`) === null) return !1;
  let r = n.closest(`.kc-list-panel`)?.querySelector(`.kc-list`);
  return r != null && (r.focus({ preventScroll: !0 }), !0);
}
function qS(e) {
  let { engine: t, host: n, store: r, focus: i, escape: a, announcer: o } = e,
    s = am(t),
    c = (0, h.useSyncExternalStore)(r.subscribe, r.get, r.get),
    [l, u] = (0, h.useState)(null),
    d = (0, h.useRef)(null),
    { settings: f } = s,
    p = (0, h.useMemo)(
      () =>
        new nm({
          engine: t,
          announce: (e) => o.announce(e),
          focusRow: (e) => i.focusRow(e, `end`),
        }),
      [t, o, i]
    );
  (0, h.useLayoutEffect)(() => {
    n.dataset.reducedMotion = String(f.reducedMotion);
  }, [n, f.reducedMotion]);
  let m = (0, h.useCallback)((e) => u((t) => (t === null ? e : null)), []),
    g = (0, h.useCallback)(() => u(null), []),
    _ = (0, h.useCallback)(
      (e) => {
        let n = t.settings.keypad,
          r = _p({ open: n }, e);
        r.open !== n && t.updateSettings({ keypad: r.open });
      },
      [t]
    ),
    v = (0, h.useCallback)(
      () => _({ type: `set`, open: !t.settings.keypad, by: `student` }),
      [t, _]
    ),
    y = (0, h.useCallback)((e, t) => _({ type: `set`, open: e, by: t }), [_]),
    b = (0, h.useCallback)(() => _({ type: `touch-focus-row` }), [_]),
    x = (0, h.useRef)(() => {});
  return (
    (x.current = (e) => {
      switch (e) {
        case `undo`:
          return hv(t, o);
        case `redo`:
          return gv(t, o);
        case `toggle-keypad`:
          return v();
        case `add-row-end`:
          ov(t, i, o, null, `focus`);
          return;
        case `audio-trace`: {
          let e = t.getSnapshot();
          return p.toggle(e.focusedRowId ?? e.selectedRowId ?? e.activeRowId);
        }
      }
    }),
    (0, h.useEffect)(() => {
      let e = d.current,
        t = Sp(e, {
          onShortcut: (e) => x.current(e),
          onEscape: () => a.handleEscape() || KS(e),
          onKey: (e) => p.handleKey(e),
        });
      return (
        e.addEventListener(`click`, GS),
        () => {
          (t(), e.removeEventListener(`click`, GS));
        }
      );
    }, [a, p]),
    (0, J.jsx)(im.Provider, {
      value: t,
      children: (0, J.jsx)(Mp.Provider, {
        value: i,
        children: (0, J.jsx)(Dp.Provider, {
          value: a,
          children: (0, J.jsx)(hp.Provider, {
            value: o,
            children: (0, J.jsx)(rm.Provider, {
              value: p,
              children: (0, J.jsx)(Np.Provider, {
                value: c.skin,
                children: (0, J.jsx)(WS, {
                  layout: c.layout,
                  containerWidth: c.size.width,
                  containerHeight: c.size.height,
                  pointer: c.pointer,
                  collapsed: f.expressionsCollapsed,
                  keypadOpen: f.keypad,
                  host: n,
                  themeRevision: c.themeRevision,
                  reducedMotion: f.reducedMotion || c.reducedMotionMedia,
                  settingsAnchor: l,
                  revealRowId: s.focusedRowId ?? s.activeRowId,
                  rootRef: d,
                  onOpenSettings: m,
                  onCloseSettings: g,
                  onToggleKeypad: v,
                  onKeypadChange: y,
                  onTouchFocusRow: b,
                }),
              }),
            }),
          }),
        }),
      }),
    })
  );
}
var JS = {
    message: `The calculator hit a problem.`,
    retry: `Retry`,
    reset: `Reset this question's calculator`,
  },
  YS = class extends h.Component {
    constructor(...e) {
      (super(...e),
        (this.state = { error: null, generation: 0 }),
        (this.retryRef = (0, h.createRef)()),
        (this.retry = () => {
          this.setState(({ generation: e }) => ({ error: null, generation: e + 1 }));
        }),
        (this.reset = () => {
          (this.props.onReset(), this.retry());
        }));
    }
    static getDerivedStateFromError(e) {
      return { error: e };
    }
    componentDidCatch(e) {
      this.props.onError(e);
    }
    componentDidUpdate(e, t) {
      t.error === null &&
        this.state.error !== null &&
        document.activeElement === this.props.host &&
        this.retryRef.current?.focus();
    }
    render() {
      let { error: e, generation: t } = this.state;
      return e === null
        ? (0, J.jsx)(h.Fragment, { children: this.props.children }, t)
        : (0, J.jsxs)(`div`, {
            className: `kc-error`,
            children: [
              (0, J.jsx)(`p`, { children: JS.message }),
              (0, J.jsx)(`button`, {
                type: `button`,
                ref: this.retryRef,
                onClick: this.retry,
                children: JS.retry,
              }),
              (0, J.jsx)(`button`, { type: `button`, onClick: this.reset, children: JS.reset }),
            ],
          });
    }
  },
  XS = `button, input, select, textarea, [href], [tabindex]`,
  ZS = `[hidden], [inert], [aria-hidden="true"]`;
function QS(e) {
  if (e.tabIndex < 0 || e.matches(`:disabled, input[type="hidden"]`) || e.closest(ZS) !== null)
    return !1;
  let { visibility: t } = getComputedStyle(e);
  return t !== `hidden` && t !== `collapse`;
}
function $S(e) {
  return [...e.querySelectorAll(XS)].filter(QS);
}
function eC(e, t) {
  let n = $S(e);
  t === `last` && n.reverse();
  for (let t of n) if ((t.focus(), e.activeElement === t)) return;
}
var tC = `(any-pointer: coarse)`;
function nC(e, t, n) {
  let r = e.matchMedia(t),
    i = (e) => n(e.matches);
  return (
    r.addEventListener(`change`, i),
    { initial: r.matches, dispose: () => r.removeEventListener(`change`, i) }
  );
}
function rC(e, t, n) {
  let r = `fine`,
    i = () => {
      r !== `coarse` && ((r = `coarse`), n(`coarse`));
    },
    a = nC(e, tC, (e) => {
      e && i();
    });
  a.initial && (r = `coarse`);
  let o = (e) => {
    let { pointerType: t } = e;
    (t === `touch` || t === `pen`) && i();
  };
  return (
    t.addEventListener(`pointerdown`, o, { capture: !0 }),
    {
      initial: r,
      dispose() {
        (a.dispose(), t.removeEventListener(`pointerdown`, o, { capture: !0 }));
      },
    }
  );
}
function iC(e, t, n) {
  let r = t[n];
  if (r === void 0) return !0;
  if (n === `size`) {
    let t = r;
    return t.width === e.size.width && t.height === e.size.height;
  }
  return Object.is(r, e[n]);
}
function aC(e) {
  let t = e,
    n = new Set();
  return {
    get: () => t,
    set(e) {
      let r = Object.keys(e).filter((n) => !iC(t, e, n));
      if (r.length !== 0) {
        t = { ...t, ...Object.fromEntries(r.map((t) => [t, e[t]])) };
        for (let e of [...n]) e();
      }
    },
    subscribe(e) {
      return (
        n.add(e),
        () => {
          n.delete(e);
        }
      );
    },
  };
}
var oC = new WeakMap();
function sC(e) {
  return (
    typeof globalThis.CSSStyleSheet?.prototype?.replaceSync == `function` &&
    `adoptedStyleSheets` in e
  );
}
function cC(e, t) {
  let n = oC.get(e);
  n || oC.set(e, (n = new Map()));
  let r = n.get(t);
  return (r || ((r = new CSSStyleSheet()), r.replaceSync(t), n.set(t, r)), r);
}
function lC(e, t) {
  let n = e.ownerDocument;
  if (sC(e)) {
    let r = cC(n, t),
      i = new CSSStyleSheet();
    return (
      (e.adoptedStyleSheets = [...e.adoptedStyleSheets, r, i]),
      {
        setSkinCss: (e) => i.replaceSync(e),
        dispose: () => {
          e.adoptedStyleSheets = e.adoptedStyleSheets.filter((e) => e !== r && e !== i);
        },
      }
    );
  }
  let r = n.createElement(`style`);
  (r.setAttribute(`data-kc-base`, ``), (r.textContent = t));
  let i = n.createElement(`style`);
  return (
    i.setAttribute(`data-kc-skin`, ``),
    e.append(r, i),
    {
      setSkinCss: (e) => {
        i.textContent = e;
      },
      dispose: () => {
        (r.remove(), i.remove());
      },
    }
  );
}
var uC = `(prefers-contrast: more)`,
  dC = `(forced-colors: active)`;
function fC(e, t, n) {
  let r = 0,
    i = () => ({ skin: Ul(e.dataset.calculatorSkin ?? null), revision: r }),
    a = () => n(i()),
    o = () => {
      ((r += 1), a());
    },
    s = [nC(t, uC, o), nC(t, dC, o)],
    c = new MutationObserver(a);
  return (
    c.observe(e, { attributes: !0, attributeFilter: [`data-calculator-skin`, `class`] }),
    {
      initial: i(),
      dispose() {
        c.disconnect();
        for (let e of s) e.dispose();
      },
    }
  );
}
var pC = (e) => {
  requestAnimationFrame(() => e());
};
function mC(e, t, n, r = pC) {
  let i = e.field(t);
  if (i !== null) return (n(i), () => {});
  let a = !1,
    o = 0,
    s = () => {
      if (a) return;
      let r = e.field(t);
      r === null ? o < 60 && c() : n(r);
    },
    c = () => {
      ((o += 1), r(s));
    };
  return (
    c(),
    () => {
      a = !0;
    }
  );
}
function hC(e) {
  return e.width >= 450 ? `desktop` : `stacked`;
}
function gC(e, t) {
  let n = new ResizeObserver((e) => {
    let n = e.at(-1);
    n !== void 0 && t({ width: n.contentRect.width, height: n.contentRect.height });
  });
  return (
    n.observe(e),
    {
      measure() {
        let n = e.getBoundingClientRect();
        t({ width: n.width, height: n.height });
      },
      dispose: () => n.disconnect(),
    }
  );
}
var _C = `karman-calculator:lazy-chunk`,
  vC = `Calculator cleared for this question.`,
  yC = `(prefers-reduced-motion: reduce)`,
  bC = new WeakMap(),
  xC = 0,
  SC = class {
    static {
      this.version = fp;
    }
    static {
      this.apiVersion = 1;
    }
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    #s;
    #c;
    #l;
    #u;
    #d = [];
    #f;
    #p = 0;
    #m = () => {};
    #h = !1;
    constructor(e, t, n) {
      let r = (e) => {
        try {
          t?.onError?.(e);
        } catch {}
      };
      ((this.#l = r),
        (this.engine = up({ ...t, onError: r })),
        (this.#f = t?.reducedMotion ?? !1),
        (this.#e = e),
        (this.#c = n?.chromeSlot ?? null),
        (e.dataset.karmanCalculator = _C),
        (e.id ||= `karman-calculator-host-${++xC}`));
      let i = e.shadowRoot ?? e.attachShadow({ mode: `open` });
      (i.replaceChildren(), (this.#t = i));
      let a = fC(document.documentElement, window, (e) => {
        (this.#n.setSkinCss(Wl(e.skin)),
          this.#o.set({ skin: e.skin, themeRevision: e.revision + this.#p }));
      });
      ((this.#n = lC(i, dp)), this.#n.setSkinCss(Wl(a.initial.skin)));
      let o = document.createElement(`div`);
      o.className = `kc-root`;
      let s = document.createElement(`div`);
      ((s.className = `kc-sr-only`),
        s.setAttribute(`role`, `status`),
        s.setAttribute(`aria-live`, `polite`),
        i.append(o, s),
        (this.#r = mp(s)),
        (this.#i = jp(this.engine)),
        (this.#a = Ep()),
        (this.#o = aC({
          size: { width: 0, height: 0 },
          layout: `stacked`,
          skin: a.initial.skin,
          themeRevision: a.initial.revision,
          reducedMotionMedia: !1,
          pointer: `fine`,
        })),
        this.#d.push(a.dispose));
      let c = gC(e, (e) => this.#o.set({ size: e, layout: hC(e) }));
      (this.#d.push(c.dispose), (this.#u = c.measure), c.measure());
      let l = nC(window, yC, (e) => this.#o.set({ reducedMotionMedia: e }));
      this.#d.push(l.dispose);
      let u = rC(window, i, (e) => this.#o.set({ pointer: e }));
      (this.#d.push(u.dispose),
        this.#o.set({ reducedMotionMedia: l.initial, pointer: u.initial }),
        (this.#s = (0, g.createRoot)(o, {
          onCaughtError: () => {},
          onUncaughtError: (e) => r(e instanceof Error ? e : Error(String(e))),
        })),
        this.#g(),
        bC.set(this, { focus: this.#i }),
        n?.announceResetOnMount && this.#r.announce(vC, { delayMs: 500, key: `reset` }));
    }
    #g() {
      let e = (0, h.createElement)(qS, {
          engine: this.engine,
          host: this.#e,
          store: this.#o,
          focus: this.#i,
          escape: this.#a,
          announcer: this.#r,
          chromeSlot: this.#c,
        }),
        t = { host: this.#e, onError: this.#l, onReset: () => this.#_() };
      this.#s.render((0, h.createElement)(YS, t, e));
    }
    #_() {
      (this.engine.setBlank(), this.engine.updateSettings({ reducedMotion: this.#f }));
    }
    #v() {
      if (this.#h) throw new fd(`destroyed`, `The calculator was destroyed.`);
      return this.engine;
    }
    #y(e, t) {
      (this.#m(), (this.#m = mC(this.#i, e, t)));
    }
    setExpression(...e) {
      return this.#v().setExpression(...e);
    }
    setExpressions(...e) {
      return this.#v().setExpressions(...e);
    }
    removeExpression(...e) {
      return this.#v().removeExpression(...e);
    }
    removeExpressions(...e) {
      return this.#v().removeExpressions(...e);
    }
    getExpressions(...e) {
      return this.#v().getExpressions(...e);
    }
    getState(...e) {
      return this.#v().getState(...e);
    }
    setState(...e) {
      return this.#v().setState(...e);
    }
    setBlank(...e) {
      return this.#v().setBlank(...e);
    }
    setMathBounds(...e) {
      return this.#v().setMathBounds(...e);
    }
    updateSettings(...e) {
      let t = this.#v().updateSettings(...e),
        n = e[0]?.reducedMotion;
      return (typeof n == `boolean` && (this.#f = n), t);
    }
    observe(...e) {
      return this.#v().observe(...e);
    }
    unobserve(...e) {
      return this.#v().unobserve(...e);
    }
    observeEvent(...e) {
      return this.#v().observeEvent(...e);
    }
    unobserveEvent(...e) {
      return this.#v().unobserveEvent(...e);
    }
    HelperExpression(...e) {
      return this.#v().HelperExpression(...e);
    }
    undo(...e) {
      return this.#v().undo(...e);
    }
    redo(...e) {
      return this.#v().redo(...e);
    }
    clearHistory(...e) {
      return this.#v().clearHistory(...e);
    }
    canUndo(...e) {
      return this.#v().canUndo(...e);
    }
    canRedo(...e) {
      return this.#v().canRedo(...e);
    }
    get expressionAnalysis() {
      return this.#v().expressionAnalysis;
    }
    get graphpaperBounds() {
      return this.#v().graphpaperBounds;
    }
    get settings() {
      return this.#v().settings;
    }
    get focusedExpression() {
      return this.#v().focusedExpression;
    }
    get mode() {
      return this.#v().mode;
    }
    focusExpression(e) {
      (this.#v().focusExpression(e), this.#y(e, () => this.#i.focusRow(e, `end`)));
    }
    focusFirstExpression() {
      this.#v().focusFirstExpression();
      let e = this.engine.getExpressions()[0]?.id;
      typeof e == `string` && this.#y(e, () => this.#i.focusRow(e, `end`));
    }
    activateExpression(e) {
      (this.#v().activateExpression(e), this.#y(e, () => this.#i.activateRow(e)));
    }
    resize() {
      (this.#v(), this.#u());
    }
    focusBoundary(e) {
      this.#h || eC(this.#t, e);
    }
    reflow() {
      if (!this.#h) {
        for (let e of this.#i.fields()) e.reflow();
        ((this.#p += 1), this.#o.set({ themeRevision: this.#o.get().themeRevision + 1 }));
      }
    }
    destroy() {
      if (!this.#h) {
        ((this.#h = !0), this.#m(), this.#s.unmount());
        for (let e of [...this.#d].reverse()) e();
        ((this.#d.length = 0),
          this.#r.destroy(),
          this.#n.dispose(),
          this.engine.destroy(),
          this.#t.replaceChildren(),
          delete this.#e.dataset.reducedMotion);
      }
    }
  };
function CC(e) {
  return bC.get(e)?.focus.lastFocusedRowId() ?? null;
}
function wC(e, t, n) {
  let r = f(e);
  if (!r.ok) return null;
  let i = e;
  for (let e = r.tokens.length - 1; e >= 0; e--) {
    let a = r.tokens[e];
    a.kind === `name` && a.text === t && (i = i.slice(0, a.start) + n + i.slice(a.end));
  }
  return i;
}
function TC(e) {
  return e.replace(/_(?:\{[^{}]*\}|[A-Za-z0-9])$/, ``);
}
var EC = { status: `rejected` },
  DC = /^[1-9][0-9]*$/,
  OC = new Set([`x`, `y`, `r`, `\\theta`]);
function kC(e, t) {
  let n = Cn(e);
  return n === null ? t : new Set([...t, n.name]);
}
function AC(e, t) {
  let n = Wn(e, { userFunctions: kC(e, t) });
  return n.ok ? H(n.tree) : null;
}
function jC(e, t) {
  let n = Cn(e),
    r = Wn(e, { userFunctions: kC(e, t) });
  if (!r.ok) return null;
  let i = r.tree;
  if (i.kind !== `rel` || i.ops.length !== 1 || i.ops[0] !== `=`) return null;
  let a = i.operands[0];
  return a.kind === `call` && n !== null && a.name === n.name
    ? n.name
    : a.kind === `id` && !OC.has(a.name)
      ? a.name
      : null;
}
function MC(e, t, n) {
  let r = new Set(),
    i = new Set(n);
  for (let e of t.byId.values()) {
    (e.defines !== null && r.add(e.defines.name),
      e.defines?.type === `function` && i.add(e.defines.name));
    for (let t of e.uses) r.add(t);
  }
  for (let t of e) for (let e of t.columns ?? []) r.add(e.latex);
  let a = new Map(e.map((e) => [e.id, e.type === `table` ? null : e.latex])),
    o = new Map();
  for (let e of t.byId.values()) {
    if (e.defines === null) continue;
    let t = a.get(e.id) ?? null,
      n = t === null ? null : AC(t, i);
    o.set(e.defines.name, [...(o.get(e.defines.name) ?? []), n]);
  }
  return { used: r, definitions: o, functions: i };
}
function NC(e, t) {
  let n = e;
  for (let [e, r] of t) n !== null && (n = wC(n, e, r));
  return n;
}
function PC(e, t, n) {
  let r = new Map();
  for (let i of e) {
    let e = jC(i, t.functions),
      a = e === null ? void 0 : t.definitions.get(e);
    if (e === null || a === void 0 || r.has(e)) continue;
    let o = NC(i, r);
    if (o === null) return null;
    let s = AC(o, t.functions);
    if (s !== null && a.includes(s)) continue;
    let c = null;
    for (let r = 2; c === null && r <= n.size + 2; r++) {
      let i = `${TC(e)}_{${r}}`,
        a = wC(o, e, i);
      if (a === null) return null;
      let s = AC(a, t.functions);
      s !== null && t.definitions.get(i)?.includes(s) ? (c = i) : n.has(i) || (c = i);
    }
    if (c === null) return null;
    (r.set(e, c), n.add(c));
  }
  return r;
}
function FC(e) {
  let { existing: t, payload: n, settings: r } = e,
    i = n.rows ?? [];
  if (n.format !== `rows` || i.length === 0) return EC;
  let a = [...n.dependencies, ...i].flatMap((e) => Cn(e) ?? []),
    o = MC(
      t,
      zC(t, r),
      a.map((e) => e.name)
    ),
    s = n.dependencies.filter((e) => {
      let t = jC(e, o.functions);
      return t === null || !o.used.has(t);
    }),
    c = new Set(o.used);
  for (let e of [...s, ...i]) {
    let t = jC(e, o.functions);
    t !== null && c.add(t);
  }
  let l = PC(i, o, c);
  if (l === null) return EC;
  let u = [];
  for (let e of i) {
    let t = NC(e, l);
    if (t === null) return EC;
    u.push(t);
  }
  let d = new Set(o.functions);
  for (let e of u) {
    let t = Cn(e);
    t !== null && d.add(t.name);
  }
  let f = new Map();
  for (let e of t) {
    let t = e.type === `table` ? null : AC(e.latex ?? ``, d);
    t !== null && !f.has(t) && f.set(t, e.id);
  }
  let p = [...s, ...u],
    m = [],
    h = new Map(),
    g = p.map((e) => {
      let t = AC(e, d),
        n = t === null ? void 0 : f.get(t);
      if (n !== void 0) return { existing: n };
      let r = t === null ? void 0 : h.get(t);
      return r === void 0 ? (t !== null && h.set(t, m.length), m.push(e), null) : { write: r };
    }),
    _ = g.slice(s.length),
    v = _[0];
  if (_.every((e) => e !== null && `existing` in e) && v && `existing` in v) {
    let e = t.findIndex((e) => e.id === v.existing) + 1;
    return { status: `already-present`, focusRowId: v.existing, row: e };
  }
  let y = IC(t, m),
    b =
      v === null
        ? y[g.slice(0, s.length).filter((e) => e === null).length]?.id
        : `existing` in v
          ? v.existing
          : y[v.write]?.id;
  if (b === void 0 || !RC(t, y, r)) return EC;
  let [x] = l;
  return x === void 0
    ? { status: `added`, writes: y, focusRowId: b, rename: null }
    : { status: `renamed`, writes: y, focusRowId: b, rename: { from: x[0], to: x[1] } };
}
function IC(e, t) {
  let n = 1 + Math.max(0, ...e.flatMap((e) => (DC.test(e.id) ? [+e.id] : []))),
    r = e.at(-1),
    i = r !== void 0 && LC(r) ? r.id : null;
  return t.map((e, t) => ({ id: t === 0 && i !== null ? i : String(n++), latex: e }));
}
function LC(e) {
  return e.type !== `table` && (e.latex ?? ``).trim() === ``;
}
function RC(e, t, n) {
  if (t.some((e) => e.latex.length > 2048)) return !1;
  let r = new Map(t.map((e) => [e.id, e.latex])),
    i = e.map((e) => {
      let t = r.get(e.id);
      return t === void 0 ? e : { ...e, latex: t };
    }),
    a = new Set(e.map((e) => e.id));
  for (let e of t) a.has(e.id) || i.push({ id: e.id, latex: e.latex });
  if (i.length > 100) return !1;
  let o = zC(e, n);
  return zC(i, n).rows.every(
    (e) => e.error === null || (!r.has(e.id) && (o.byId.get(e.id)?.error ?? null) !== null)
  );
}
function zC(e, t) {
  return xi(
    e.map((e) => {
      let t = { id: e.id, latex: e.latex ?? ``, hidden: e.hidden ?? !1 };
      return e.type === `table` ? { ...t, latex: ``, columns: e.columns ?? [] } : t;
    }),
    t
  );
}
var BC = {
  functions: new Map(),
  values: new Map(),
  settings: { angleMode: `radians`, complex: !1 },
};
function VC(e) {
  let t = Wn(e, { userFunctions: new Set() });
  return t.ok ? lc(t.tree, BC)({}, ae) : null;
}
function HC(e) {
  let t = VC(e);
  return t?.type === `number` ? t.value : null;
}
function UC(e) {
  let t = VC(e);
  return t?.type === `point` && t.value.every(Number.isFinite) ? [t.value[0], t.value[1]] : null;
}
function WC(e) {
  let [t, ...n] = e.map((e) => e.map(HC));
  return n.flatMap((e) =>
    e.flatMap((e, n) => {
      let r = t[n];
      return r === null || e === null ? [] : [[r, e]];
    })
  );
}
function GC(e, t) {
  if (t.length === 0) return;
  let n = e.graphpaperBounds.mathCoordinates;
  if (t.some(([e, t]) => e >= n.left && e <= n.right && t >= n.bottom && t <= n.top)) return;
  let r = Yx([Float64Array.from(t.flat())]);
  r !== null && e.setMathBounds(r);
}
var KC = 8,
  qC = 200;
function JC(e, t) {
  let n = new Set();
  for (let r of zC(e, t).byId.values()) {
    r.defines !== null && n.add(r.defines.name);
    for (let e of r.uses) n.add(e);
  }
  for (let t of e) for (let e of t.columns ?? []) n.add(e.latex);
  return n;
}
function YC(e, t = 1) {
  let n = e[0]?.length ?? 0;
  return (
    e.length >= t &&
    e.length <= KC &&
    n >= 1 &&
    n <= qC &&
    e.every((e) => e.length === n && e.every((e) => e.trim() !== `` && e.length <= 128))
  );
}
function XC(e, t, n, r) {
  if (t.length > 100) return !1;
  let i = zC(e, r);
  return zC(t, r).rows.every((e) =>
    e.id === n
      ? e.error === null &&
        (e.table?.columns ?? []).every(
          (e) => e.error === null && e.cellErrors.every((e) => e === null)
        )
      : e.error === null || (i.byId.get(e.id)?.error ?? null) !== null
  );
}
function ZC(e, t) {
  let n = e.findIndex((e) => e.id === t.id);
  return n < 0 ? [...e, t] : e.map((e, r) => (r === n ? { ...e, ...t, latex: `` } : e));
}
function QC(e, t, n) {
  let { headers: r, columns: i } = t;
  if (!YC(i) || r.length !== i.length) return { status: `rejected` };
  let a = pd(JC(e, n), i.length - 1),
    o = [a.x, ...a.ys],
    [{ id: s }] = IC(e, [``]),
    c = { id: s, type: `table`, columns: i.map((e, t) => ({ latex: o[t], values: [...e] })) };
  if (!XC(e, ZC(e, c), s, n)) return { status: `rejected` };
  let l = o.map((e, t) => {
    let n = r[t];
    return n ? `${p(e)} is ${n}` : p(e);
  });
  return { status: `added`, write: c, focusRowId: s, message: m.tableAdded(l, i[0].length) };
}
function $C() {
  let e = new WeakMap();
  return (t) => {
    let n = e.get(t);
    return (n === void 0 && e.set(t, (n = new Map())), n);
  };
}
var ew = $C(),
  tw = $C();
function nw(e, t) {
  if (t === void 0) return null;
  let n = e.find((e) => e.id === t.id),
    r = n?.type === `table` ? (n.columns ?? []) : [];
  return r.length === 2 && r[0].latex === t.x && r[1].latex === t.y ? (n ?? null) : null;
}
function rw(e, t, n, r, i) {
  if (r.length === 0 || !YC([r.map((e) => e[0]), r.map((e) => e[1])], 2))
    return { status: `rejected` };
  let a = nw(e, t.get(n)),
    [o, s] = a?.columns ?? [],
    c = new Set((o?.values ?? []).map((e, t) => `${e}\u0000${s?.values[t] ?? ``}`)),
    l = [];
  for (let [e, t] of r) {
    let n = `${e.trim()}\u0000${t.trim()}`;
    c.has(n) || (c.add(n), l.push([e.trim(), t.trim()]));
  }
  if (a !== null && l.length === 0) {
    let t = e.findIndex((e) => e.id === a.id) + 1;
    return { status: `already-present`, focusRowId: a.id, message: m.alreadyPresent(t) };
  }
  let u, d, f;
  if (a !== null && o !== void 0 && s !== void 0) {
    if (
      ((u = { id: a.id, x: o.latex, y: s.latex }),
      (f = o.values.length + 1),
      f - 1 + l.length > 1e3)
    )
      return { status: `rejected` };
    d = {
      ...a,
      columns: [
        { ...o, values: [...o.values, ...l.map((e) => e[0])] },
        { ...s, values: [...s.values, ...l.map((e) => e[1])] },
      ],
    };
  } else {
    let t = pd(JC(e, i), 1),
      [{ id: n }] = IC(e, [``]);
    ((u = { id: n, x: t.x, y: t.ys[0] }),
      (f = 1),
      (d = {
        id: n,
        type: `table`,
        columns: [
          { latex: u.x, values: l.map((e) => e[0]) },
          { latex: u.y, values: l.map((e) => e[1]) },
        ],
      }));
  }
  return XC(e, ZC(e, d), u.id, i)
    ? {
        status: `added`,
        kind: a === null ? `create` : `append`,
        table: u,
        write: d,
        added: l,
        focusRowId: u.id,
        message: m.pairAppended(p(u.x), p(u.y), f),
      }
    : { status: `rejected` };
}
var iw = (e) => (`engine` in e ? e.engine : e),
  aw = o({
    version: t(1),
    questionKey: d().min(1),
    sourceId: d().min(1),
    description: d(),
    format: l([`rows`, `point`, `tableRow`, `evaluate`, `table`]),
    dependencies: u(d()).max(100),
    rows: u(d()).max(100).optional(),
    table: o({ headers: u(d().nullable()), columns: u(u(d())) })
      .strict()
      .optional(),
    pairs: u(n([d(), d()])).optional(),
    pointTableKey: d().optional(),
  }).strict(),
  ow = { status: `rejected`, message: m.rejected, focusRowId: null },
  sw = (e) => {
    let { angleMode: t, complex: n } = e.settings;
    return { angleMode: t, complex: n };
  };
function cw(e, t) {
  let n = t.format === `point` ? (t.rows ?? []).map(UC) : [];
  if (n.some((e) => e === null)) return { status: `rejected` };
  let r = FC({
    existing: e.getExpressions(),
    payload: t.format === `point` ? { ...t, format: `rows` } : t,
    settings: sw(e),
  });
  if (r.status === `rejected`) return r;
  if (r.status === `already-present`) return { ...r, message: m.alreadyPresent(r.row) };
  let i =
      r.status === `renamed` && r.rename !== null
        ? m.renamed(p(r.rename.to), p(r.rename.from))
        : m.added(t.description),
    a = new Set(r.writes.map((e) => e.latex));
  return {
    status: r.status,
    write: () => e.setExpressions(r.writes),
    focusRowId: r.focusRowId,
    message: i,
    points: (t.rows ?? []).flatMap((e, t) => {
      let r = n[t];
      return r && a.has(e) ? [r] : [];
    }),
  };
}
function lw(e, t) {
  let n = t.table;
  if (n === void 0) return { status: `rejected` };
  let r = e.getExpressions(),
    i = tw(e),
    a = r.find((e) => e.id === i.get(t.sourceId)),
    o = a?.type === `table` ? (a.columns ?? []) : [];
  if (
    o.length === n.columns.length &&
    o.every((e, t) => e.values.join(`\0`) === n.columns[t].join(`\0`))
  ) {
    let e = r.findIndex((e) => e.id === a?.id) + 1;
    return { status: `already-present`, focusRowId: r[e - 1].id, message: m.alreadyPresent(e) };
  }
  let s = QC(r, n, sw(e));
  return s.status === `rejected`
    ? s
    : {
        ...s,
        write: () => {
          (e.setExpressions([s.write]), i.set(t.sourceId, s.focusRowId));
        },
        points: WC(n.columns),
      };
}
function uw(e, t) {
  let { pairs: n, pointTableKey: r } = t;
  if (
    n === void 0 ||
    r === void 0 ||
    n.map(([e, t]) => [HC(e), HC(t)]).some(([e, t]) => e === null || t === null)
  )
    return { status: `rejected` };
  let i = ew(e),
    a = rw(e.getExpressions(), i, r, n, sw(e));
  return a.status === `added`
    ? {
        status: `added`,
        focusRowId: a.focusRowId,
        message: a.message,
        points: a.added.flatMap(([e, t]) => {
          let n = [HC(e), HC(t)];
          return n[0] === null || n[1] === null ? [] : [[n[0], n[1]]];
        }),
        write: () => {
          (a.kind === `create` ? e.setExpressions([a.write]) : dw(iw(e), a.table.id, a.added),
            i.set(r, a.table));
        },
      }
    : a;
}
function dw(e, t, n) {
  e.editRows((e) =>
    e.map((e) =>
      e.id !== t || e.columns === void 0
        ? e
        : {
            ...e,
            columns: e.columns.map((e, t) => ({
              ...e,
              values: [...e.values, ...n.map((e) => e[t])],
            })),
          }
    )
  );
}
function fw(e) {
  let t = new Set(e.getExpressions().map((e) => e.id)),
    n = ew(e);
  for (let [e, r] of n) t.has(r.id) || n.delete(e);
  let r = tw(e);
  for (let [e, n] of r) t.has(n) || r.delete(e);
}
function pw(e, t) {
  switch ((fw(e), t.format)) {
    case `table`:
      return lw(e, t);
    case `tableRow`:
      return uw(e, t);
    case `rows`:
    case `point`:
      return cw(e, t);
    default:
      return { status: `rejected` };
  }
}
function mw(e, t, n) {
  let r = aw.safeParse(t);
  if (!r.success) return ow;
  let i;
  try {
    i = pw(e, r.data);
  } catch {
    return ow;
  }
  if (i.status === `rejected`) return ow;
  try {
    (i.status !== `already-present` && i.write(),
      e.settings.expressionsCollapsed && e.updateSettings({ expressionsCollapsed: !1 }));
  } catch {
    return ow;
  }
  try {
    i.status !== `already-present` && GC(e, i.points);
  } catch {}
  try {
    n === `touch` ? e.activateExpression(i.focusRowId) : e.focusExpression(i.focusRowId);
  } catch {}
  return { status: i.status, message: i.message, focusRowId: i.focusRowId };
}
function hw(e) {
  return () => void 0;
}
function gw(e) {
  let t = new SC(
      e.element,
      { reducedMotion: e.reducedMotion, onError: (e) => c(e, fp) },
      { chromeSlot: e.chromeSlot, announceResetOnMount: e.announceReset }
    ),
    n = hw(t.engine),
    r = !1;
  return {
    calculator: t,
    focusOnOpen(n) {
      let r = CC(t) ?? t.getExpressions()[0].id;
      n === `touch`
        ? (t.activateExpression(r), e.frame.focus({ preventScroll: !0 }))
        : t.focusExpression(r);
    },
    focusBoundary(e) {
      t.focusBoundary(e);
    },
    setReducedMotion(e) {
      t.updateSettings({ reducedMotion: e });
    },
    reflow() {
      t.reflow();
    },
    applyTransfer: (e, n) => mw(t, e, n),
    destroy() {
      r || ((r = !0), n(), t.destroy());
    },
  };
}
export { gw as mountQuizCalculator };
