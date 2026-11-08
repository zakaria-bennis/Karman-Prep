import { _ as e, a as t, f as n, g as r, h as i, i as a, t as o } from "./index-5_FSq8Je.js";
import { a as s, i as c, n as l, r as u, t as d } from "./describe-DQPpUJSv.js";
import { a as f, i as p, n as m, r as h, s as ee, t as te } from "./transfer-selection-TcC_wRSx.js";
var ne = t(`arrow-up-right`, [
    [`path`, { d: `M7 7h10v10`, key: `1tivn9` }],
    [`path`, { d: `M7 17 17 7`, key: `1vkiza` }],
  ]),
  g = null;
function re(e) {
  g = e;
}
var _ = (...e) => {
  if (g === null) throw Error(`splitMathText is not installed (transfer-classifier)`);
  return g(...e);
};
function v(e) {
  return !/[\\{}^_]/.test(e);
}
var y = /^(?:displaystyle|quad|(?:big|Big|bigg|Bigg)[lrm]?)$/,
  b = { dfrac: `frac`, tfrac: `frac`, leq: `le`, geq: `ge`, times: `cdot` },
  x = new Set([`,`, `;`, `:`, `!`]),
  S = {
    "−": `-`,
    "–": `-`,
    "×": `\\cdot`,
    "·": `\\cdot`,
    "÷": `\\div`,
    "≤": `\\le`,
    "≥": `\\ge`,
    "²": `^{2}`,
    "³": `^{3}`,
    π: `\\pi`,
    θ: `\\theta`,
  },
  C = (e) => e !== void 0 && /^[A-Za-z]$/.test(e);
function w(e, t) {
  let n = t + 1;
  for (; C(e[n]); ) n++;
  return n > t + 1 ? { name: e.slice(t + 1, n), end: n } : null;
}
function T(e) {
  let t = ``,
    n = (e) => {
      (C(e[0]) && /\\[A-Za-z]+$/.test(t) && (t += ` `), (t += e));
    },
    r = 0;
  for (; r < e.length; ) {
    let t = e[r];
    if (t === `\\`) {
      let t = w(e, r);
      if (!t) {
        let t = e[r + 1];
        (t === void 0 ? n(`\\`) : x.has(t) || n(`\\${t}`), (r += 2));
        continue;
      }
      let i = t.end;
      for (; e[i] === ` `; ) i++;
      if (t.name === `text` && e[i] === `{`) {
        let t = e.indexOf(`}`, i),
          a = t < 0 ? null : e.slice(i + 1, t);
        if (a !== null && !a.includes(`{`) && /^\s*$/.test(a)) {
          r = t + 1;
          continue;
        }
        (n(`\\text`), (r = i));
        continue;
      }
      (y.test(t.name) || n(`\\${b[t.name] ?? t.name}`), (r = i));
    } else (n(S[t] ?? t), r++);
  }
  return t;
}
function E(e) {
  let t = 0;
  for (;;) {
    let n = e.indexOf(`√(`, t);
    if (n < 0) return e;
    let r = 0,
      i = -1;
    for (let t = n + 1; t < e.length; t++)
      if (e[t] === `(`) r++;
      else if (e[t] === `)` && --r === 0) {
        i = t;
        break;
      }
    i < 0 ? (t = n + 2) : (e = `${e.slice(0, n)}\\sqrt{${e.slice(n + 2, i)}}${e.slice(i + 1)}`);
  }
}
function D(e) {
  return e
    .replace(/(?<![A-Za-z0-9.^_}\\])(\d+) +(\d+)\/(\d+)(?![\d.^])/g, `$1\\frac{$2}{$3}`)
    .replace(/(?<![A-Za-z0-9.^_}\\])(\d+)\/(\d+)(?![\d.^])/g, `\\frac{$1}{$2}`);
}
var O = (e, t) => (t === BigInt(0) ? e : O(t, e % t));
function ie(e) {
  return e.replace(/(\d*)\.(\d*)\\overline\{(\d+)\}/g, (e, t, n, r) => {
    if (t.length + n.length + r.length > 15) return e;
    let i = BigInt(10),
      a = BigInt(1),
      o = i ** BigInt(n.length),
      s = i ** BigInt(r.length) - a,
      c = (BigInt(t || `0`) * o + BigInt(n || `0`)) * s + BigInt(r),
      l = o * s,
      u = O(c, l);
    return l / u === a ? `${c / u}` : `\\frac{${c / u}}{${l / u}}`;
  });
}
var ae = /(?:[+\-*/^=<>([{,]|\\cdot|\\div|\\le|\\ge|\\left\|)$/;
function oe(e) {
  let t = [],
    n = new Map(),
    r = -1,
    i = 0;
  for (; i < e.length; )
    if (e[i] === `\\`) {
      let t = w(e, i);
      if (t && (t.name === `left` || t.name === `right`) && e[t.end] === `|`) {
        ((i = t.end + 1), t.name === `left` && (r = i));
        continue;
      }
      i = t ? t.end : i + 2;
    } else {
      if (e[i] === `|`) {
        let a = e.slice(0, i).trimEnd(),
          o = a.length === r || ae.test(a),
          s = t.at(-1);
        s !== void 0 && !o
          ? (t.pop(), n.set(s, `open`), n.set(i, `close`))
          : (t.push(i), (r = i + 1));
      }
      i++;
    }
  if (t.length > 0 || n.size === 0) return e;
  let a = ``;
  for (let t = 0; t < e.length; t++) {
    let r = n.get(t);
    a += r === `open` ? `\\left|` : r === `close` ? `\\right|` : e[t];
  }
  return a;
}
var se = /(?:^|[+\-*/=<>,([{]|\\cdot|\\div|\\le|\\ge)$/;
function ce(e, t) {
  return e.replace(/(\d+)\s*\\frac\{(\d+)\}\{(\d+)\}/g, (n, r, i, a, o) => {
    let s = e.slice(0, o);
    if (/[\d.]$/.test(s) || !se.test(s.trimEnd())) return n;
    let [c, l, u] = [BigInt(r), BigInt(i), BigInt(a)];
    return l <= BigInt(0) || l >= u
      ? n
      : t === `math`
        ? `\\left(${r}+\\frac{${i}}{${a}}\\right)`
        : `\\frac{${c * u + l}}{${a}}`;
  });
}
function k(e, t) {
  let n = e.trim(),
    r = v(n),
    i = T(n);
  return (
    (i = i.replace(/(\d)\{,\}(?=\d)/g, `$1`)),
    (i = E(i)),
    r && (i = D(i)),
    (i = ie(i)),
    (i = oe(i)),
    (i = i.replace(/(?<!\\|\\right)[,.;:]$/, ``).trim()),
    ce(i, t)
  );
}
var le = /^[A-Za-z](?:_\{[A-Za-z0-9]+\})?$/,
  ue = /\[\[\/?[ui]\]\]|<\/?[ui]>/g;
function de(e) {
  let t = s(k(e, `math`));
  if (!t.ok) return null;
  let [n, r, i, a, ...o] = t.tokens;
  return n?.kind !== `name` || !le.test(n.text)
    ? null
    : r === void 0 ||
        (r.kind === `open` &&
          r.text === `(` &&
          i?.kind === `name` &&
          a?.kind === `close` &&
          a.text === `)` &&
          o.length === 0)
      ? n.text
      : null;
}
function fe(e) {
  let t = [];
  for (let n of e) {
    let e = t.at(-1);
    n.kind === `text`
      ? e?.kind === `text`
        ? (e.value += n.value.replace(ue, ``))
        : t.push({ kind: `text`, value: n.value.replace(ue, ``) })
      : t.push({ kind: `math`, latex: n.latex });
  }
  return t;
}
var pe = /^\s*(?:,\s*and\b|,|and\b)/;
function A(e) {
  let t = new Set(),
    n = fe(e);
  return (
    n.forEach((e, r) => {
      if (e.kind === `text`)
        for (let i of e.value.matchAll(/\bfunctions?\b/gi)) {
          let e = i[0].length > 8,
            a = { r, i: (i.index ?? 0) + i[0].length };
          for (;;) {
            let r = me(n, a);
            if (!r || (t.add(r.name), (a = r.after), !e)) break;
            let i = n[a.r];
            if (i?.kind !== `text`) break;
            let o = i.value.slice(a.i).match(pe);
            if (!o) break;
            a = { r: a.r, i: a.i + o[0].length };
          }
        }
    }),
    t
  );
}
function me(e, t) {
  let n = e[t.r];
  if (n?.kind !== `text`) return null;
  let r = t.i;
  for (; /\s/.test(n.value[r] ?? ``); ) r++;
  if (r >= n.value.length) {
    let n = e[t.r + 1],
      r = n?.kind === `math` ? de(n.latex) : null;
    return r ? { name: r, after: { r: t.r + 2, i: 0 } } : null;
  }
  let i = n.value[r];
  return /[A-Za-z]/.test(i) && !/[A-Za-z]/.test(n.value[r + 1] ?? ``)
    ? { name: i, after: { r: t.r, i: r + 1 } }
    : null;
}
var j = { characters: 2048, tokens: 600, depth: 64 },
  M = class extends Error {
    constructor(e, t) {
      (super(t), (this.rule = e), (this.detail = t));
    }
  },
  N = (e, t) => {
    throw new M(e, t);
  },
  he = new Set([`num`, `name`, `pi`, `absOpen`, `frac`, `sqrt`, `fn`]),
  ge = class {
    constructor(e, t) {
      ((this.tokens = e), (this.callNames = t), (this.i = 0), (this.depth = 0));
    }
    parseRow() {
      let e = [this.chain()];
      for (; this.at(`comma`) || this.at(`semi`); ) (this.i++, e.push(this.chain()));
      return (
        this.i < this.tokens.length && N(`TR-8`, `unexpected ${this.peek()?.text}`),
        e.length > 1 &&
          !e.every((e) => e.length === 1 && e[0].t === `point`) &&
          N(`TR-8`, `top-level comma outside a pair list`),
        e
      );
    }
    peek(e = 0) {
      return this.tokens[this.i + e];
    }
    at(e, t) {
      let n = this.peek();
      return n !== void 0 && n.kind === e && (t === void 0 || n.text === t);
    }
    expect(e, t) {
      (this.at(e, t) || N(`TR-8`, `expected ${t}`), this.i++);
    }
    nested(e) {
      ++this.depth > j.depth && N(`TR-21`, `too-deep`);
      let t = e();
      return (this.depth--, t);
    }
    braced(e, t) {
      return this.nested(() => {
        this.expect(`open`, e);
        let n = this.sum();
        return (this.expect(`close`, t), n);
      });
    }
    chain() {
      let e = [this.sum()];
      for (; this.at(`rel`); ) (this.i++, e.push(this.sum()));
      return e;
    }
    sum() {
      let e = this.term();
      for (; this.at(`op`, `+`) || this.at(`op`, `-`); )
        e = { t: `bin`, op: this.tokens[this.i++].text, a: e, b: this.term() };
      return e;
    }
    term() {
      let e = this.factor();
      for (;;)
        if (this.at(`op`, `*`) || this.at(`op`, `/`))
          e = { t: `bin`, op: this.tokens[this.i++].text, a: e, b: this.factor() };
        else if (this.startsAtom()) e = { t: `bin`, op: `juxt`, a: e, b: this.postfix() };
        else return e;
    }
    startsAtom() {
      let e = this.peek();
      return e !== void 0 && (he.has(e.kind) || (e.kind === `open` && e.text === `(`));
    }
    factor() {
      return this.at(`op`, `+`) || this.at(`op`, `-`)
        ? { t: `sign`, op: this.tokens[this.i++].text, a: this.postfix() }
        : this.postfix();
    }
    postfix() {
      let e = this.atom();
      return this.at(`op`, `^`) ? (this.i++, { t: `pow`, base: e, exp: this.script() }) : e;
    }
    script() {
      return this.at(`open`, `{`)
        ? this.braced(`{`, `}`)
        : this.nested(() => {
            let e = this.peek();
            return e?.kind === `num` && /^\d$/.test(e.text)
              ? (this.i++, { t: `num`, text: e.text })
              : e?.kind === `name` && /^[A-Za-z]$/.test(e.text)
                ? (this.i++, { t: `name`, text: e.text })
                : e?.kind === `pi`
                  ? (this.i++, { t: `pi` })
                  : N(`TR-8`, `exponent`);
          });
    }
    atom() {
      let e = this.peek();
      if (!e) return N(`TR-8`, `missing operand`);
      switch (e.kind) {
        case `num`:
          return (this.i++, { t: `num`, text: e.text });
        case `pi`:
          return (this.i++, { t: `pi` });
        case `name`:
          return (
            this.i++,
            this.callNames.has(e.text) && this.at(`open`, `(`)
              ? this.call(e.text)
              : { t: `name`, text: e.text }
          );
        case `open`:
          if (e.text === `(`) return this.parenthesised();
          break;
        case `absOpen`:
          return this.nested(() => {
            this.i++;
            let e = this.sum();
            return (
              this.at(`absClose`) || N(`TR-8`, `unclosed bar`),
              this.i++,
              { t: `abs`, inner: e }
            );
          });
        case `frac`:
          return (this.i++, { t: `frac`, num: this.braced(`{`, `}`), den: this.braced(`{`, `}`) });
        case `sqrt`:
          return (
            this.i++,
            {
              t: `sqrt`,
              index: this.at(`open`, `[`) ? this.braced(`[`, `]`) : null,
              arg: this.braced(`{`, `}`),
            }
          );
        case `fn`:
          return this.fn(e.text);
      }
      return N(`TR-8`, `unexpected ${e.text}`);
    }
    parenthesised() {
      return this.nested(() => {
        this.i++;
        let e = [this.sum()];
        for (; this.at(`comma`); ) (this.i++, e.push(this.sum()));
        return (
          this.expect(`close`, `)`),
          e.length === 1
            ? { t: `group`, inner: e[0] }
            : e.length === 2
              ? { t: `point`, items: e }
              : N(`TR-8`, `tuple`)
        );
      });
    }
    argumentList() {
      return this.nested(() => {
        this.expect(`open`, `(`);
        let e = [this.sum()];
        for (; this.at(`comma`); ) (this.i++, e.push(this.sum()));
        return (this.expect(`close`, `)`), e);
      });
    }
    call(e) {
      let t = this.argumentList();
      return (
        t.length !== 1 && N(`TR-13`, `${e} takes one argument`),
        { t: `call`, name: e, arg: t[0] }
      );
    }
    fn(e) {
      this.i++;
      let t = null,
        n = null;
      for (;;)
        if (t === null && this.at(`op`, `^`)) (this.i++, (t = this.script()));
        else if (n === null && e === `log` && this.at(`op`, `_`)) (this.i++, (n = this.script()));
        else break;
      if (this.at(`open`, `(`)) {
        let r = this.argumentList();
        return (
          r.length > (e === `arctan` ? 2 : 1) && N(`TR-8`, `${e} arguments`),
          { t: `fn`, name: e, exp: t, base: n, args: r }
        );
      }
      if (!this.startsAtom()) return N(`TR-8`, `${e} without an argument`);
      let r = this.postfix();
      for (; this.startsAtom(); ) r = { t: `bin`, op: `juxt`, a: r, b: this.postfix() };
      return { t: `fn`, name: e, exp: t, base: n, args: [r] };
    }
  },
  P = () => ({ names: [], calls: [], pointNames: [], points: [] }),
  F = (e, t) => {
    e.includes(t) || e.push(t);
  };
function I(e, t, n = !1) {
  e.t === `name`
    ? (F(t.names, e.text), n && F(t.pointNames, e.text))
    : e.t === `call`
      ? F(t.calls, e.name)
      : e.t === `point` && t.points.push(e.items);
  for (let r of _e(e)) I(r, t, n || e.t === `point`);
}
function _e(e) {
  switch (e.t) {
    case `bin`:
      return [e.a, e.b];
    case `sign`:
      return [e.a];
    case `pow`:
      return [e.base, e.exp];
    case `group`:
    case `abs`:
      return [e.inner];
    case `point`:
      return e.items;
    case `frac`:
      return [e.num, e.den];
    case `sqrt`:
      return e.index ? [e.index, e.arg] : [e.arg];
    case `call`:
      return [e.arg];
    case `fn`:
      return [e.exp, e.base, ...e.args].filter((e) => e !== null);
    default:
      return [];
  }
}
function L(e) {
  switch (e.t) {
    case `num`:
    case `pi`:
      return !0;
    case `sign`:
      return L(e.a);
    case `group`:
      return L(e.inner);
    case `bin`:
      return e.op !== `+` && e.op !== `-` && e.op !== `juxt` && L(e.a) && L(e.b);
    case `frac`:
      return L(e.num) && L(e.den);
    case `sqrt`:
      return (e.index === null || L(e.index)) && L(e.arg);
    case `pow`:
      return L(e.base) && R(e.exp);
    default:
      return !1;
  }
}
var R = (e) =>
  e.t === `num` ? !e.text.includes(`.`) : e.t === `sign` ? R(e.a) : e.t === `group` && R(e.inner);
function ve(e) {
  let t = s(e);
  if (!t.ok || t.tokens.length === 0 || t.tokens.length > j.tokens) return !1;
  try {
    let e = new ge(t.tokens, new Set()).parseRow();
    return e.length === 1 && e[0].length === 1 && L(e[0][0]);
  } catch (e) {
    if (e instanceof M) return !1;
    throw e;
  }
}
var z = (e, t, n) => e !== void 0 && e.kind === t && (n === void 0 || e.text === n);
function ye(e) {
  let t = z(e[0], `op`, `+`) || z(e[0], `op`, `-`) ? e.slice(1) : e,
    n = (e) =>
      z(t[e], `frac`) &&
      z(t[e + 1], `open`, `{`) &&
      z(t[e + 2], `num`) &&
      z(t[e + 3], `close`, `}`) &&
      z(t[e + 4], `open`, `{`) &&
      z(t[e + 5], `num`) &&
      z(t[e + 6], `close`, `}`);
  return t.length === 1
    ? z(t[0], `num`)
    : t.length === 7
      ? n(0)
      : t.length === 11 &&
        z(t[0], `open`, `(`) &&
        z(t[1], `num`) &&
        z(t[2], `op`, `+`) &&
        n(3) &&
        z(t[10], `close`, `)`);
}
function be(e) {
  return ye(e)
    ? !0
    : z(e[0], `name`)
      ? e.length === 1
        ? !0
        : z(e[1], `op`, `^`)
          ? e.length === 3
            ? z(e[2], `num`)
            : z(e[2], `open`, `{`) && z(e.at(-1), `close`, `}`) && ye(e.slice(3, -1))
          : e.length === 4 && z(e[1], `open`, `(`) && z(e[2], `name`) && z(e[3], `close`, `)`)
      : !1;
}
var xe = /^[A-Za-z](?:_\{[A-Za-z0-9]+\})?$/;
function B(e, t, n) {
  let r = e.filter((e) => e.kind === `rel`).map((e) => e.text),
    i = r.length === 1 && r[0] === `=`,
    a =
      i &&
      z(e[0], `name`) &&
      xe.test(e[0].text) &&
      z(e[1], `open`, `(`) &&
      z(e[2], `name`) &&
      /^[A-Za-z]$/.test(e[2].text) &&
      z(e[3], `close`, `)`) &&
      z(e[4], `rel`, `=`),
    o = i && z(e[0], `name`) && z(e[1], `rel`, `=`) && e[0].text !== `x` && e[0].text !== `y`,
    s = new Set(n);
  a && s.add(e[0].text);
  let c = new ge(e, s).parseRow(),
    l = c.length > 1 || (c[0].length === 1 && c[0][0].t === `point`),
    u = c.length === 1 ? c[0] : [],
    d;
  if (r.length === 0) d = `expression`;
  else if (i) d = a ? `function` : `equation`;
  else if (r.every((e) => e === `<` || e === `<=`) || r.every((e) => e === `>` || e === `>=`))
    d = `inequality`;
  else return N(`TR-11`, `mixed relation chain`);
  let f = a
      ? { name: e[0].text, type: `function`, param: e[2].text }
      : o
        ? { name: e[0].text, type: `value`, param: null }
        : null,
    p = P();
  for (let e of c) for (let t of f ? e.slice(1) : e) I(t, p);
  let m = (e) => e.filter((e) => e !== f?.param);
  return {
    tokens: e,
    sums: u,
    pair: l,
    row: {
      latex: t,
      kind: d,
      defines: f,
      names: m(p.names),
      calls: p.calls,
      pointNames: m(p.pointNames),
    },
  };
}
function Se(e) {
  let { row: t, tokens: n } = e;
  {
    let e = n.find((e) => e.kind === `fn` && /^(sinh|cosh|tanh)$/.test(e.text));
    (e && N(`TR-77`, `${e.text} waits for FN-68`),
      n.some((e) => e.kind === `name` && e.text.startsWith(`\\theta`)) &&
        N(`TR-77`, `θ waits for RC-16`));
    let r = n.some((e) => e.kind === `name` && e.text === `r`),
      i =
        t.defines?.type === `function`
          ? t.defines.param === `r`
          : t.defines?.type === `value` && t.defines.name !== `r`;
    r && !i && N(`TR-77`, `r outside a definition waits for RC-18`);
  }
}
function Ce(e, t) {
  let [n, r] = e.sums;
  return (
    e.sums.length === 2 &&
    e.row.kind === `equation` &&
    n.t === `call` &&
    t.has(n.name) &&
    L(n.arg) &&
    L(r)
  );
}
function we(e) {
  let t = [],
    n = 0,
    r = !0;
  for (let i = 0; i < e.length; i++) {
    let a = e[i];
    (n === 0 && r && a.kind === `name` && /^[A-Z]$/.test(a.text) && z(e[i + 1], `open`, `(`)) ||
      (a.kind === `open` ? n++ : a.kind === `close` && n--,
      (r = n === 0 && (a.kind === `comma` || a.kind === `semi`)),
      t.push(a));
  }
  return t.length < e.length ? t : null;
}
function Te(e, t, n) {
  let r = we(e);
  if (r === null) return null;
  try {
    let e = B(r, t, n);
    return e.pair ? e : null;
  } catch (e) {
    if (e instanceof M) return null;
    throw e;
  }
}
function Ee(e) {
  let { row: t, sums: n } = e,
    r = t.defines;
  (t.kind === `expression` &&
    t.names.includes(`x`) &&
    t.names.includes(`y`) &&
    N(`TR-21`, `mixed-variables`),
    (r?.name === `e` || (r?.type === `function` && (r.name === `x` || r.name === `y`))) &&
      N(`TR-21`, `reserved-name`));
  let i = n[0];
  (n.length === 2 &&
    (i.t === `pi` || (i.t === `name` && i.text === `e`)) &&
    N(`TR-21`, `reserved-name`),
    r?.param && [`r`, `e`, `i`].includes(r.param) && N(`TR-21`, `reserved-name`),
    r && (t.names.includes(r.name) || t.calls.includes(r.name)) && N(`TR-21`, `cycle`));
  let a = P();
  for (let e of n) I(e, a);
  for (let e of a.points) {
    let t = P();
    for (let n of e) I(n, t);
    (t.names.includes(`x`) || t.names.includes(`y`)) && N(`TR-21`, `point-coordinates`);
  }
}
function De(e) {
  if (
    !e.some(
      (e) => e.kind === `begin` || e.kind === `end` || e.kind === `sysOpen` || e.kind === `sysClose`
    )
  )
    return null;
  let t = z(e[0], `sysOpen`),
    n = t ? e.slice(1, -1) : e,
    r = n[0],
    i = n.at(-1);
  (t && !z(e.at(-1), `sysClose`) && N(`TR-12`, `unclosed system wrapper`),
    (!r || !i || r.kind !== `begin` || i.kind !== `end` || i.text !== r.text) &&
      N(`TR-12`, `system environment not at the top level`));
  let a = n.slice(1, -1);
  a.some((e) => [`begin`, `end`, `sysOpen`, `sysClose`].includes(e.kind)) &&
    N(`TR-12`, `nested system`);
  let o = [[]];
  for (let e of a) e.kind === `newline` ? o.push([]) : o[o.length - 1].push(e);
  let s = o.filter((e) => e.length > 0);
  return (s.length === 0 && N(`TR-12`, `empty system`), s);
}
function Oe(e, t, n) {
  try {
    return ke(e, t, n);
  } catch (e) {
    if (e instanceof M) return { ok: !1, rule: e.rule, detail: e.detail };
    throw e;
  }
}
function ke(e, t, n) {
  e.length > j.characters && N(`TR-21`, `limits`);
  let r = s(e);
  if (!r.ok) return r;
  let { tokens: i } = r;
  (i.length > j.tokens && N(`TR-21`, `limits`), i.length === 0 && N(`TR-8`, `empty segment`));
  let a = De(i);
  if (a) {
    let t = a.map((t) => {
      let r = t[0],
        i = t[t.length - 1],
        a = e.slice(r.start, i.end).replace(/&/g, ``).trim();
      return B(
        t.filter((e) => e.kind !== `amp`),
        a,
        n
      );
    });
    t.some((e) => e.row.kind === `expression`) && N(`TR-12`, `expression line`);
    for (let e of t) Se(e);
    for (let e of t) Ee(e);
    return { ok: !0, kind: `system`, rows: t.map((e) => e.row) };
  }
  let o = Te(i, e, n) ?? B(i, e, n);
  return (
    t === `stem` && be(i) && N(`TR-10`, `lone symbol`),
    Se(o),
    o.pair
      ? ((o.row.names.length > 0 || o.row.calls.length > 0) && N(`TR-15`, `a pair holds a name`),
        { ok: !0, kind: `pair`, rows: [o.row] })
      : (Ee(o),
        Ce(o, n)
          ? { ok: !0, kind: `functionCoordinate`, rows: [{ ...o.row, calls: [] }] }
          : { ok: !0, kind: o.row.kind, rows: [o.row] })
  );
}
var V = (e, t, n) => e !== void 0 && e.kind === t && (n === void 0 || e.text === n),
  H = (e, t, n) => e.slice(t.end, n.start).trim(),
  U = (e) => (ve(e) ? e : null);
function Ae(e) {
  let t = k(e, `coordinate`),
    n = s(t);
  if (!n.ok) return null;
  let r = n.tokens,
    i = [],
    a = 0;
  for (; a < r.length; ) {
    if (i.length > 0) {
      if (!V(r[a], `comma`) && !V(r[a], `semi`)) return null;
      a++;
    }
    V(r[a], `name`) && /^[A-Z]$/.test(r[a].text) && a++;
    let e = r[a];
    if (!V(e, `open`, `(`)) return null;
    let n = 0,
      o = null,
      s = null;
    for (a++; a < r.length && s === null; a++) {
      let e = r[a];
      if (e.kind === `open` || e.kind === `absOpen`) n++;
      else if (e.kind === `absClose`) n--;
      else if (e.kind === `close`) n === 0 ? (s = e) : n--;
      else if (n === 0 && e.kind === `comma`) {
        if (o !== null) return null;
        o = e;
      }
    }
    if (o === null || s === null) return null;
    let c = U(H(t, e, o)),
      l = U(H(t, o, s));
    if (c === null || l === null) return null;
    i.push([c, l]);
  }
  return i.length > 0 ? i : null;
}
function je(e) {
  let t = k(e, `coordinate`),
    n = s(t);
  if (!n.ok) return null;
  let r = n.tokens,
    i = r.findIndex((e) => V(e, `rel`, `=`)),
    a = r[i - 1];
  if (!V(r[0], `name`) || !V(r[1], `open`, `(`) || !V(a, `close`, `)`)) return null;
  let o = U(H(t, r[1], a)),
    c = U(t.slice(r[i].end).trim());
  return o === null || c === null ? null : { name: r[0].text, a: o, b: c };
}
function Me(e, t) {
  let n = ``;
  for (let r = t - 1; r >= 0; r--) {
    let t = e[r];
    if (t.kind !== `text`) continue;
    let i = Math.max(
      t.value.lastIndexOf(`. `),
      t.value.lastIndexOf(`? `),
      t.value.lastIndexOf(`! `)
    );
    if (((n = (i >= 0 ? t.value.slice(i + 2) : t.value) + n), i >= 0)) break;
  }
  return /\b(?:interval|domain|range)\b/i.test(n);
}
var Ne = ([e, t]) => `(${e},${t})`;
function Pe(e, t, n, r, i, a) {
  let o = { version: 1, sourceId: e, description: n },
    s = { ...o, format: `point`, dependencies: [], rows: r.map(Ne) },
    c = {
      ...o,
      format: `tableRow`,
      dependencies: [],
      pairs: r.map(([e, t]) => [e, t]),
      pointTableKey: i,
    };
  return {
    sourceId: e,
    kind: t,
    ruleId: t === `pair` ? `TR-15` : `TR-17`,
    description: n,
    payload: s,
    chooser: { point: { ...s }, tableRow: c, evaluate: a },
  };
}
function Fe(e, t, n) {
  let [r] = t;
  return Pe(
    e,
    `pair`,
    n ?? (t.length === 1 ? `point (${c(r[0])}, ${c(r[1])})` : `${t.length} points`),
    t,
    `points`,
    null
  );
}
function Ie(e, t, n, r) {
  let { name: i, a, b: o } = t,
    s = `Evaluate ${c(`${i}(${a})`)}`;
  return Pe(e, `functionCoordinate`, r ?? l(`${i}(${a})=${o}`), [[a, o]], i, {
    label: s,
    reason: n,
  });
}
var W = {
    undefined: (e) => `${c(e)} isn't defined in the calculator or this question`,
    usesName: (e, t) => `${c(e)} uses ${c(t)}, which has no value`,
    ambiguous: (e) => `${c(e)} has more than one definition in this question`,
    noValue: (e, t) => `${c(`${e}(${t})`)} has no value in the calculator`,
  },
  Le = {
    expression: `TR-11`,
    equation: `TR-13`,
    inequality: `TR-11`,
    function: `TR-13`,
    system: `TR-12`,
    choice: `TR-40`,
    table: `TR-22`,
    pair: `TR-15`,
    functionCoordinate: `TR-17`,
  },
  Re = 200;
function G() {
  let e = new Map();
  return (t, n) => {
    let r = e.get(t);
    if (r !== void 0) return r;
    e.size >= Re && e.clear();
    let i = n();
    return (e.set(t, i), i);
  };
}
var K = (e) => `${e.serializedFunctionLines}\u0000${e.text}`;
function ze(e) {
  let t = s(e);
  if (!t.ok) return [];
  let n = [[]];
  for (let e of t.tokens)
    e.kind === `newline`
      ? n.push([])
      : [`begin`, `end`, `sysOpen`, `sysClose`, `amp`].includes(e.kind) || n[n.length - 1].push(e);
  return n.flatMap(([e, t, n, r, i]) =>
    e?.kind === `name` &&
    le.test(e.text) &&
    t?.kind === `open` &&
    t.text === `(` &&
    n?.kind === `name` &&
    /^[A-Za-z]$/.test(n.text) &&
    r?.kind === `close` &&
    r.text === `)` &&
    i?.kind === `rel` &&
    i.text === `=`
      ? [e.text]
      : []
  );
}
function Be(e, t, n, r) {
  let i =
    t === `system`
      ? u(n.map((e) => (e.kind === `inequality` ? `inequality` : `equation`)))
      : l(n[0].latex);
  return {
    sourceId: e,
    kind: t,
    ruleId: Le[t],
    description: i,
    payload: {
      version: 1,
      sourceId: e,
      description: i,
      format: `rows`,
      dependencies: r,
      rows: n.map((e) => e.latex),
    },
  };
}
var Ve = class {
  constructor(e) {
    ((this.candidates = new Map()), (this.definitions = new Map()), (this.verdicts = new Map()));
    let t = e ? _(e.text, e.serializedFunctionLines, !0, !0) : [];
    this.split = t;
    let n = t.flatMap((e, t) =>
      e.kind === `text` ? [] : [{ index: t, latex: k(e.latex, `math`) }]
    );
    ((this.functionNames = new Set([...A(t), ...n.flatMap((e) => ze(e.latex))])),
      (this.segments = n.map((e) => ({
        index: e.index,
        result: Oe(e.latex, `stem`, this.functionNames),
      }))));
    for (let { index: e, result: t } of this.segments) {
      let n = t.ok && t.rows.length === 1 ? t.rows[0].defines : null;
      t.ok &&
        n &&
        (this.candidates.set(e, t.rows[0]),
        this.definitions.set(n.name, [...(this.definitions.get(n.name) ?? []), e]));
    }
    this.cycleSet = this.findCycleSet();
  }
  findCycleSet() {
    let e = (e) => {
        let t = this.candidates.get(e);
        return t ? [...t.names, ...t.calls].flatMap((e) => this.definitions.get(e) ?? []) : [];
      },
      t = new Map(),
      n = new Map(),
      r = [],
      i = new Set(),
      a = new Set(),
      o = (s) => {
        (t.set(s, t.size), n.set(s, t.size - 1), r.push(s), i.add(s));
        for (let r of e(s))
          t.has(r)
            ? i.has(r) && n.set(s, Math.min(n.get(s) ?? 0, t.get(r) ?? 0))
            : (o(r), n.set(s, Math.min(n.get(s) ?? 0, n.get(r) ?? 0)));
        if (n.get(s) !== t.get(s)) return;
        let c = [];
        for (let e = r.pop(); e !== void 0 && (i.delete(e), c.push(e), e !== s); e = r.pop());
        if (c.length > 1) for (let e of c) a.add(e);
      };
    for (let e of this.candidates.keys()) t.has(e) || o(e);
    return a;
  }
  resolve(e) {
    let t = this.verdicts.get(e);
    if (t) return t;
    let n = this.segments.find((t) => t.index === e),
      r;
    if (!n) r = { rule: `TR-1`, detail: `not a math segment` };
    else if (!n.result.ok) r = { rule: n.result.rule, detail: n.result.detail };
    else if (this.cycleSet.has(e)) r = { rule: `TR-21`, detail: `cycle` };
    else if (n.result.kind === `pair` || n.result.kind === `functionCoordinate`)
      r = this.chooserVerdict(e, n.result.kind);
    else {
      let { kind: t, rows: i } = n.result,
        a = this.resolveRows(i);
      r =
        `rule` in a
          ? a
          : {
              item: Be(
                `stem:${e}`,
                t,
                i,
                a.dependencies.map((e) => e.latex)
              ),
            };
    }
    return (this.verdicts.set(e, r), r);
  }
  chooserVerdict(e, t) {
    let n = this.split[e],
      r = n.kind === `text` ? `` : n.latex,
      i = `stem:${e}`;
    if (t === `pair`) {
      if (Me(this.split, e)) return { rule: `TR-16`, detail: `an interval` };
      let t = Ae(r);
      return t ? { item: Fe(i, t) } : { rule: `TR-15`, detail: `coordinates` };
    }
    let a = je(r);
    return a === null
      ? { rule: `TR-17`, detail: `coordinates` }
      : { item: Ie(i, a, this.evaluateReason(a)) };
  }
  evaluateReason({ name: e, a: t }) {
    let n = this.definitions.get(e) ?? [];
    if (n.length === 0) return W.undefined(e);
    if (n.length > 1) return W.ambiguous(e);
    let [r] = this.exportable(e);
    if (r === void 0) return W.undefined(e);
    let i = r.names.find((e) => this.exportable(e).length !== 1);
    return i === void 0 ? W.noValue(e, t) : W.usesName(e, i);
  }
  isExportable(e) {
    return !this.cycleSet.has(e) && `item` in this.resolve(e);
  }
  exportable(e) {
    return (this.definitions.get(e) ?? []).flatMap((e) => {
      let t = this.candidates.get(e);
      return t && this.isExportable(e) ? [t] : [];
    });
  }
  resolveRows(e) {
    let t = e.filter((e) => e.defines !== null),
      n = new Set(t.map((e) => e.defines?.name));
    for (let t of e)
      for (let e of t.calls)
        if (!n.has(e) && this.exportable(e).length !== 1)
          return { rule: `TR-20`, detail: `${e} needs one exportable definition` };
    let r = [],
      i = new Set(),
      a = (e) => {
        if (n.has(e) || i.has(e)) return;
        let t = this.exportable(e);
        if (t.length === 1) {
          i.add(e);
          for (let e of [...t[0].names, ...t[0].calls]) a(e);
          r.push(t[0]);
        }
      };
    for (let t of e) for (let e of [...t.names, ...t.calls]) a(e);
    if (n.size < t.length) return { rule: `TR-21`, detail: `duplicate-definition` };
    let o = new Map();
    for (let e of [...t, ...r]) e.defines && o.set(e.defines.name, e);
    if (He(o)) return { rule: `TR-21`, detail: `cycle` };
    if (e.some((e) => e.defines === null) && r.some((e) => e.names.includes(`r`)))
      return { rule: `TR-77`, detail: `r through a dependency waits for RC-18` };
    if (!o.has(`t`))
      for (let t of e) {
        let e = [...t.pointNames],
          n = new Set();
        for (let t = e.pop(); t !== void 0; t = e.pop()) {
          if (t === `t`) return { rule: `TR-77`, detail: `a point uses an undefined t` };
          n.has(t) || (n.add(t), e.push(...(o.get(t)?.names ?? [])));
        }
      }
    return { dependencies: r };
  }
};
function He(e) {
  let t = new Map(),
    n = (r) => {
      let i = e.get(r);
      return !i || t.get(r) === `done`
        ? !1
        : t.get(r) === `open` || (t.set(r, `open`), [...i.names, ...i.calls].some(n))
          ? !0
          : (t.set(r, `done`), !1);
    };
  return [...e.keys()].some(n);
}
var Ue = G(),
  We = (e) => Ue(e ? K(e) : `\0none`, () => new Ve(e)),
  Ge = G();
function Ke(e) {
  return Ge(K(e), () => {
    let t = We(e);
    return new Map(t.segments.map(({ index: e }) => [e, t.resolve(e)]));
  });
}
var qe = G();
function Je(e) {
  return qe(K(e), () => {
    let t = new Map();
    for (let [n, r] of Ke(e)) `item` in r && t.set(n, r.item);
    return t;
  });
}
var Ye = /^[0-9A-Za-z+\-−×·÷/^=<>≤≥().,\sπ√²³]+$/,
  Xe = /^(?:[\s,;]|\band\b)*$/i;
function Ze(e, t) {
  let n = _(e.text, !1, !0, !0),
    r = n.flatMap((e) => (e.kind === `text` ? [] : [e.latex]));
  if (r.length === 0) {
    let t = e.text.trim();
    if (t === `` || !Ye.test(t)) return { rule: `TR-40`, detail: `not plain math` };
    r.push(t);
  } else if (n.some((e) => e.kind === `text` && !Xe.test(e.value)))
    return { rule: `TR-40`, detail: `prose outside math` };
  let i = We(t),
    a = r.map((e) => k(e, `math`)),
    o = new Set([...i.functionNames, ...a.flatMap(ze), ...A(n)]),
    s = [],
    c = [];
  for (let e of a) {
    let t = Oe(e, `choice`, o);
    if (!t.ok) return { rule: t.rule, detail: t.detail };
    (s.push(...t.rows), c.push(t.kind));
  }
  let l = `choice:${e.letter}`,
    u = d(e.letter);
  if (c.every((e) => e === `pair`)) {
    let e = r.map(Ae);
    return e.some((e) => e === null)
      ? { rule: `TR-15`, detail: `coordinates` }
      : {
          item: Fe(
            l,
            e.flatMap((e) => e ?? []),
            u
          ),
        };
  }
  if (c.includes(`functionCoordinate`)) {
    let e = c.length === 1 ? je(r[0]) : null;
    return e === null
      ? { rule: `TR-17`, detail: `a function coordinate among other math` }
      : { item: Ie(l, e, i.evaluateReason(e), u) };
  }
  let f = i.resolveRows(s);
  return `rule` in f
    ? f
    : {
        item: {
          sourceId: l,
          kind: `choice`,
          ruleId: Le.choice,
          description: u,
          payload: {
            version: 1,
            sourceId: l,
            description: u,
            format: `rows`,
            dependencies: f.dependencies.map((e) => e.latex),
            rows: s.map((e) => e.latex),
          },
        },
      };
}
var Qe = G();
function $e(e, t) {
  return Qe(`${e.letter}\u0000${e.text}\u0000${t ? K(t) : ``}`, () => {
    let n = Ze(e, t);
    return `item` in n ? n.item : null;
  });
}
function q(e) {
  let t = new Map(),
    n = new Map();
  for (let r of e) {
    let e = (t.get(r.description) ?? 0) + 1;
    t.set(r.description, e);
    let i = e > 1 ? `, occurrence ${e}` : ``;
    n.set(r.sourceId, `Transfer to Calculator: ${r.description}${i}`);
  }
  return n;
}
var J = e(r()),
  et = { variables: 8, points: 200 },
  tt = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
function nt(e) {
  let t = _(e, !1, !0, !0),
    n = t.flatMap((e) => (e.kind === `text` ? [] : [e.latex])),
    r = t.flatMap((e) => (e.kind === `text` ? [e.value] : [])).join(``);
  if (n.length > 1 || (n.length === 1 && r.trim() !== ``)) return { text: e.trim(), numeric: null };
  let i = (n[0] ?? e).trim().replace(/−/g, `-`),
    a = k(tt.test(i) ? i.replace(/,/g, ``) : i, `cell`),
    o = a !== `` && ve(a) ? a : null;
  return { text: n.length === 1 ? c(a) : e.trim(), numeric: o };
}
var rt = (e) => e.numeric === null && e.text !== ``;
function it(e, t) {
  let n = e === null ? t : [e, ...t],
    r = n[0]?.length ?? 0;
  if (r === 0 || n.some((e) => e.length !== r))
    return { rule: n.length === 0 ? `TR-23` : `TR-22`, detail: `mixed shape` };
  let i = !1;
  if (e === null || e.every(rt)) {
    if (t.every((e) => e.every((e) => e.numeric !== null)))
      return {
        headers: Array.from({ length: r }, (t, n) => (e ? e[n].text : null)),
        columns: Array.from({ length: r }, (e, n) => t.map((e) => e[n].numeric ?? ``)),
      };
    i = !0;
  }
  let a = n.every((t, n) => rt(t[0]) || (n === 0 && e !== null && t[0].text === ``)),
    o = e === null || e.slice(1).every((e) => e.numeric !== null);
  if (a && o && r > 1) {
    if (t.every((e) => e.slice(1).every((e) => e.numeric !== null)))
      return {
        headers: n.map((e) => (e[0].text === `` ? null : e[0].text)),
        columns: n.map((e) => e.slice(1).map((e) => e.numeric ?? ``)),
      };
    i = !0;
  }
  return i
    ? { rule: `TR-24`, detail: `a cell is not a numeric constant` }
    : { rule: `TR-22`, detail: `not a table 5.1 shape` };
}
var at = (e) => `${e} ${e === 1 ? `row` : `rows`}`;
function ot(e) {
  let t = it(
    e.headers && e.headers.length > 0 ? e.headers.map(nt) : null,
    e.rows.map((e) => e.map(nt))
  );
  if (`rule` in t) return t;
  let { columns: n } = t,
    r = n[0].length;
  if (n.length > et.variables || r < 1 || r > et.points)
    return { rule: `TR-23`, detail: `${n.length} variables, ${r} points` };
  let i = e.letter === void 0 ? `table, ${at(r)}` : d(e.letter),
    { sourceId: a } = e;
  return {
    item: {
      sourceId: a,
      kind: `table`,
      ruleId: `TR-22`,
      description: i,
      payload: {
        version: 1,
        sourceId: a,
        description: i,
        format: `table`,
        dependencies: [],
        table: { headers: t.headers, columns: n },
      },
    },
  };
}
var Y = new Map();
function st(e) {
  let t = JSON.stringify([e.sourceId, e.letter ?? null, e.headers, e.rows]),
    n = Y.get(t);
  if (n !== void 0) return n;
  Y.size >= 200 && Y.clear();
  let r = ot(e),
    i = `item` in r ? r.item : null;
  return (Y.set(t, i), i);
}
var ct = i(),
  X = n(),
  lt = new Map();
function ut(e, t, n, r) {
  let i = Math.min(e.top, t.top) - 4 - n.height,
    a = Math.max(e.bottom, t.bottom) + 4,
    o = i >= 16,
    s = a + n.height <= r.height - 16,
    c =
      o || (!s && i + n.height - 16 > r.height - 16 - a)
        ? Math.max(16, i)
        : Math.min(a, Math.max(16, r.height - 16 - n.height));
  return {
    left: Math.min(Math.max(16, t.right - n.width), Math.max(16, r.width - 16 - n.width)),
    top: c,
  };
}
function dt(e) {
  let { options: t, questionKey: n, coarse: r, control: i, item: a, onChoose: o, onClose: s } = e,
    c = (0, J.useRef)(null),
    l = (0, J.useRef)(null),
    u = (0, J.useId)(),
    d = [
      { format: `point`, label: `Point`, disabled: !1 },
      { format: `tableRow`, label: `Table row`, disabled: !1 },
      ...(t.evaluate ? [{ format: `evaluate`, label: t.evaluate.label, disabled: !0 }] : []),
    ],
    f = () => [...(c.current?.querySelectorAll(`[role=menuitem]`) ?? [])],
    p = (e) => {
      let t = f();
      t[(e + t.length) % t.length]?.focus({ preventScroll: !0 });
    };
  ((0, J.useLayoutEffect)(() => {
    let e = c.current;
    if (e === null) return;
    let t = () => {
      let t = e.getBoundingClientRect(),
        { left: n, top: r } = ut(
          (a ?? i).getBoundingClientRect(),
          i.getBoundingClientRect(),
          { width: t.width, height: t.height },
          { width: window.innerWidth, height: window.innerHeight }
        );
      ((e.style.left = `${n}px`), (e.style.top = `${r}px`));
    };
    t();
    let r = lt.get(n);
    return (
      p(
        Math.max(
          0,
          d.findIndex((e) => e.format === r)
        )
      ),
      window.addEventListener(`scroll`, t, !0),
      window.addEventListener(`resize`, t),
      () => {
        (window.removeEventListener(`scroll`, t, !0), window.removeEventListener(`resize`, t));
      }
    );
  }, []),
    (0, J.useEffect)(() => {
      let e = (e) => {
        let t = e.target;
        (t instanceof Node && (c.current?.contains(t) || i.contains(t))) || s(!1);
      };
      return (
        document.addEventListener(`pointerdown`, e, !0),
        () => document.removeEventListener(`pointerdown`, e, !0)
      );
    }, [i, s]));
  let m = (e, t) => {
    let r = d[e];
    r === void 0 || r.disabled || r.format === `evaluate` || (lt.set(n, r.format), o(r.format, t));
  };
  return (0, ct.createPortal)(
    (0, X.jsx)(`div`, {
      ref: c,
      id: e.id,
      role: `menu`,
      "aria-label": `Transfer as`,
      "data-transfer-chooser": ``,
      "data-reveal": r ? `coarse` : `fine`,
      onKeyDown: (e) => {
        let t = f(),
          n = t.findIndex((e) => e === document.activeElement),
          r = () => {
            (e.preventDefault(), e.stopPropagation());
          };
        if (e.key === `ArrowDown` || e.key === `ArrowUp`)
          (r(), p(n + (e.key === `ArrowDown` ? 1 : -1)));
        else if (e.key === `Home` || e.key === `End`) (r(), p(e.key === `Home` ? 0 : t.length - 1));
        else if (e.key === `Enter` || e.key === ` `) (r(), m(n, `keyboard`));
        else if (e.key === `Escape`) (r(), s(!0));
        else if (e.key === `Tab`) (e.stopPropagation(), s(!0));
        else if (/^\p{L}$/u.test(e.key)) {
          let t = d.findIndex((t) => t.label.toLowerCase().startsWith(e.key.toLowerCase()));
          t >= 0 && (r(), p(t));
        }
      },
      children: d.map((e, n) =>
        (0, X.jsxs)(
          `button`,
          {
            type: `button`,
            role: `menuitem`,
            tabIndex: -1,
            "data-format": e.format,
            "aria-disabled": e.disabled ? `true` : void 0,
            "aria-label": e.format === `evaluate` ? e.label : void 0,
            "aria-describedby": e.format === `evaluate` ? u : void 0,
            onPointerDown: (e) => {
              ((l.current = e.pointerType), e.stopPropagation());
            },
            onClick: (e) => {
              e.stopPropagation();
              let t = l.current;
              ((l.current = null),
                m(n, t === `touch` || t === `pen` ? `touch` : t ? `mouse` : `keyboard`));
            },
            children: [
              e.label,
              e.format === `evaluate` &&
                t.evaluate &&
                (0, X.jsx)(`span`, {
                  id: u,
                  "data-transfer-reason": ``,
                  children: t.evaluate.reason,
                }),
            ],
          },
          e.format
        )
      ),
    }),
    document.body
  );
}
var ft = `Transfer to Calculator`,
  pt = 8;
function mt(e, t, n, r, i) {
  let a = t.getClientRects();
  if (a.length === 0) return;
  let o = e.getBoundingClientRect(),
    s = r === `inline` ? a[a.length - 1] : t.getBoundingClientRect();
  ((n.style.left = `${s.right - o.left - i}px`),
    (n.style.top = r === `inline` ? `${s.top - o.top - i + 4}px` : `${s.top - o.top}px`));
}
function ht(e, t, n) {
  let r = e.getBoundingClientRect(),
    i = t.getBoundingClientRect(),
    a = n.getBoundingClientRect();
  if (i.width === 0 || a.width === 0) return;
  let o = i.right + a.width <= window.innerWidth - pt;
  ((n.style.left = `${(o ? i.right : i.left - a.width) - r.left}px`),
    (n.style.top = `${i.top - r.top + (i.height - a.height) / 2}px`));
}
function Z(e) {
  let t = o();
  return t ? (0, X.jsx)(_t, { ...e, bridge: t }) : null;
}
var gt = (e) => {
  for (let [t, n, r] of e) t.addEventListener(n, r);
  return () => {
    for (let [t, n, r] of e) t.removeEventListener(n, r);
  };
};
function _t({ item: e, accessibleName: t, placement: n, bridge: r }) {
  let i = (0, J.useRef)(null),
    o = (0, J.useRef)(null),
    s = (0, J.useRef)(null),
    c = (0, J.useRef)({ bridge: r, item: e });
  c.current = { bridge: r, item: e };
  let l = (0, J.useSyncExternalStore)(
      h.subscribe,
      () => {
        let t = h.get();
        return t !== null && t.questionKey === r.questionKey && t.sourceId === e.sourceId;
      },
      () => !1
    ),
    [u, d] = (0, J.useState)(!1),
    [g, re] = (0, J.useState)(!1),
    [_, v] = (0, J.useState)(!1),
    [y, b] = (0, J.useState)(null),
    x = (0, J.useId)(),
    S = (0, J.useRef)({
      overItem: !1,
      overControl: !1,
      hoverType: ``,
      lastDown: null,
      focusing: !1,
      timer: null,
      focused: !1,
      selected: !1,
      chooserOpen: !1,
      tooltip: !1,
      escaped: !1,
      leftSinceEscape: !1,
      place: () => {},
    }),
    C = n !== `cluster`,
    w = u || l || g || y !== null;
  ((S.current.focused = u),
    (S.current.selected = l),
    (S.current.chooserOpen = y !== null),
    (S.current.tooltip = _),
    (0, J.useEffect)(() => {
      let e = i.current,
        t = o.current;
      if (e === null || t === null) return;
      let r = S.current,
        a =
          n === `cluster`
            ? e.closest(`[data-calculator-cluster]`)?.parentElement
            : e.previousElementSibling;
      r.place = () => {
        if (C && a instanceof HTMLElement) {
          let i = r.selected ? 44 : 24;
          mt(e, a, t, n, i);
        }
      };
      let s = () => {
          let t = (r.overItem || r.overControl) && !r.escaped;
          if (C) {
            let n = r.focused || r.selected || r.chooserOpen || t;
            (n && e.dataset.visible !== `true` && r.place(), (e.dataset.visible = String(n)));
          } else r.overItem ? (e.dataset.hover = `true`) : delete e.dataset.hover;
          re(t);
        },
        l = (t) => (n) => {
          te(n) &&
            (t === `overItem` &&
              r.leftSinceEscape &&
              ((r.escaped = !1), (r.leftSinceEscape = !1), delete e.dataset.escaped),
            (r[t] = !0),
            (r.hoverType = n.pointerType),
            s());
        },
        u = (e) => (t) => {
          t.pointerType !== `touch` &&
            (e === `overItem` && r.escaped && (r.leftSinceEscape = !0), (r[e] = !1), s());
        },
        d = () => {
          (r.timer !== null && clearTimeout(r.timer), (r.timer = null), v(!1));
        },
        f = (t) => {
          if (
            t.key !== `Escape` ||
            r.chooserOpen ||
            (!C && window.matchMedia?.(`(any-pointer: coarse)`).matches)
          )
            return;
          let n = (r.overItem || r.overControl) && !r.escaped;
          (r.tooltip || r.timer !== null || r.selected || (!r.focused && n)) &&
            (d(),
            !r.focused &&
              (n || r.selected) &&
              ((r.escaped = !0), (r.leftSinceEscape = !1), C || (e.dataset.escaped = `true`)),
            r.selected && h.clear(),
            s(),
            t.preventDefault(),
            t.stopPropagation());
        };
      document.addEventListener(`keydown`, f);
      let p = [
        [e, `pointerenter`, l(`overControl`)],
        [
          e,
          `pointerleave`,
          (e) => {
            (u(`overControl`)(e), d());
          },
        ],
        [
          t,
          `pointerenter`,
          (e) => {
            te(e) &&
              (c.current.bridge.prefetch(),
              r.timer === null &&
                !r.escaped &&
                (r.timer = setTimeout(() => {
                  ((r.timer = null), v(!0));
                }, 300)));
          },
        ],
        [
          t,
          `pointerleave`,
          (t) => {
            t.buttons !== 0 && (r.lastDown = null);
            let n = t.relatedTarget;
            (n instanceof Node && e.contains(n)) || d();
          },
        ],
        [t, `pointercancel`, () => (r.lastDown = null)],
      ];
      if (
        a instanceof HTMLElement &&
        (a.setAttribute(`data-transfer-item`, ``),
        C || p.push([a, `pointerenter`, l(`overItem`)], [a, `pointerleave`, u(`overItem`)]),
        C)
      ) {
        let e = null,
          t = 0,
          n = (e) => ({ pointerType: e.pointerType, x: e.clientX, y: e.clientY, t: e.timeStamp });
        p.push(
          [a, `pointerenter`, l(`overItem`)],
          [a, `pointerleave`, u(`overItem`)],
          [
            a,
            `pointerdown`,
            (r) => {
              ((e = r.pointerType === `touch` || r.pointerType === `pen` ? n(r) : null), (t = 0));
            },
          ],
          [
            a,
            `pointermove`,
            (n) => {
              e !== null && (t = Math.max(t, Math.hypot(n.clientX - e.x, n.clientY - e.y)));
            },
          ],
          [a, `pointercancel`, () => (e = null)],
          [
            a,
            `pointerup`,
            (i) => {
              let a = e;
              e = null;
              let o = window.getSelection?.()?.isCollapsed ?? !0;
              if (a === null || !m(a, n(i), t, o)) return;
              ((r.escaped = !1), (r.leftSinceEscape = !1));
              let s = c.current;
              (h.toggle({ questionKey: s.bridge.questionKey, sourceId: s.item.sourceId }),
                s.bridge.prefetch());
            },
          ]
        );
      }
      let ee = gt(p);
      return () => {
        (ee(),
          document.removeEventListener(`keydown`, f),
          d(),
          a instanceof HTMLElement &&
            (a.removeAttribute(`data-transfer-item`), a.removeAttribute(`data-transfer-selected`)));
      };
    }, [n, C]),
    (0, J.useEffect)(() => {
      let e = i.current,
        t = e?.previousElementSibling;
      if (!l || !C || e === null || !(t instanceof HTMLElement)) return;
      let n = null,
        r = 0,
        a = (e) => ({ pointerType: e.pointerType, x: e.clientX, y: e.clientY, t: e.timeStamp }),
        o = (n) => n instanceof Node && (t.contains(n) || e.contains(n)),
        s = [
          [
            `pointerdown`,
            (e) => {
              ((n = o(e.target) ? null : a(e)), (r = 0));
            },
          ],
          [
            `pointermove`,
            (e) => {
              n !== null && (r = Math.max(r, Math.hypot(e.clientX - n.x, e.clientY - n.y)));
            },
          ],
          [`pointercancel`, () => (n = null)],
          [
            `pointerup`,
            (e) => {
              let t = n;
              n = null;
              let i = window.getSelection?.()?.isCollapsed ?? !0;
              t !== null && !o(e.target) && m(t, a(e), r, i) && h.clear();
            },
          ],
        ];
      for (let [e, t] of s) document.addEventListener(e, t, !0);
      return () => {
        for (let [e, t] of s) document.removeEventListener(e, t, !0);
      };
    }, [l, C]),
    (0, J.useLayoutEffect)(() => {
      let e = i.current?.previousElementSibling;
      if (!C || !w || !(e instanceof HTMLElement)) return;
      let t = S.current.place;
      if ((t(), typeof ResizeObserver > `u`)) return;
      let n = new ResizeObserver(() => t());
      return (n.observe(e), () => n.disconnect());
    }, [w, l, C]),
    (0, J.useLayoutEffect)(() => {
      let [e, t, n] = [i.current, o.current, s.current];
      _ && e !== null && t !== null && n !== null && ht(e, t, n);
    }, [_, w, l]),
    (0, J.useEffect)(() => {
      let e = i.current?.previousElementSibling;
      C &&
        e instanceof HTMLElement &&
        (l || u || y !== null
          ? e.setAttribute(`data-transfer-selected`, `true`)
          : e.removeAttribute(`data-transfer-selected`));
    }, [l, u, y, C]));
  let T = () => {
      let e = S.current;
      return e.hoverType === `pen` && (e.overItem || e.overControl);
    },
    E = () => {
      let e = S.current;
      ((e.focusing = !0), o.current?.focus({ preventScroll: !0 }), (e.focusing = !1));
    };
  async function D(e, t) {
    h.clear();
    let { bridge: n, item: r } = c.current,
      i = await n.transfer({ ...e, questionKey: n.questionKey }, t);
    i.status === `rejected` &&
      f(i) &&
      ee(n.questionKey.slice(n.questionKey.indexOf(`:`) + 1), r.ruleId);
  }
  function O(t) {
    t.stopPropagation();
    let n = S.current,
      r = p(n.lastDown, T());
    (E(),
      (n.lastDown = null),
      e.chooser ? b((e) => (e ? null : { coarse: r === `touch` || l })) : D(e.payload, r));
  }
  let ie = (0, J.useCallback)((e) => {
    (b(null), e && E());
  }, []);
  return (0, X.jsxs)(`span`, {
    ref: i,
    "data-transfer-control": ``,
    "data-source-id": e.sourceId,
    "data-placement": n,
    "data-visible": C ? String(w) : void 0,
    "data-reveal": C ? (l ? `coarse` : `fine`) : void 0,
    children: [
      (0, X.jsx)(`button`, {
        ref: o,
        type: `button`,
        "aria-label": t,
        "aria-haspopup": e.chooser ? `menu` : void 0,
        "aria-expanded": e.chooser ? y !== null : void 0,
        "aria-controls": y === null ? void 0 : x,
        onPointerDown: (e) => {
          ((S.current.lastDown = { pointerType: e.pointerType }), e.stopPropagation());
        },
        onKeyDown: (t) => {
          ((S.current.lastDown = null),
            (t.key === `Enter` || t.key === ` `) && t.stopPropagation(),
            t.key === `ArrowDown` &&
              e.chooser &&
              y === null &&
              (t.preventDefault(), t.stopPropagation(), b({ coarse: l })));
        },
        onFocus: () => {
          (d(!0), r.prefetch(), S.current.lastDown === null && !S.current.focusing && v(!0));
        },
        onBlur: () => {
          ((S.current.lastDown = null), d(!1), v(!1));
        },
        onClick: O,
        children: (0, X.jsxs)(`span`, {
          "data-transfer-glyph": ``,
          "aria-hidden": `true`,
          children: [(0, X.jsx)(a, { size: 16 }), (0, X.jsx)(ne, { size: 16 })],
        }),
      }),
      (0, X.jsx)(`span`, {
        ref: s,
        "data-transfer-tooltip": ``,
        "aria-hidden": `true`,
        hidden: !_ || y !== null,
        children: ft,
      }),
      y !== null &&
        e.chooser &&
        o.current &&
        (0, X.jsx)(dt, {
          id: x,
          options: e.chooser,
          questionKey: r.questionKey,
          coarse: y.coarse,
          control: o.current,
          item: C ? i.current?.previousElementSibling : null,
          onChoose: (e, t) => {
            let n = c.current.item.chooser;
            (b(null), E(), n && D(n[e], t));
          },
          onClose: ie,
        }),
    ],
  });
}
var vt = new WeakMap(),
  yt = new WeakMap();
function bt(e, t, n) {
  let r = vt.get(e);
  r === void 0 && ((r = _(e.text, e.serializedFunctionLines, !0, !0)), vt.set(e, r));
  let i = r[t],
    a = Je(e),
    o = a.get(t);
  if (i === void 0 || i.kind === `text` || i.latex !== n || !o) return null;
  let s = yt.get(a);
  s === void 0 && ((s = q([...a.values()])), yt.set(a, s));
  let c = s.get(o.sourceId);
  return c === void 0
    ? null
    : { item: o, accessibleName: c, placement: i.kind === `block` ? `block` : `inline` };
}
function xt(e, t, n) {
  let r = $e({ letter: e, text: t }, n),
    i = r && q([r]).get(r.sourceId);
  return r && i ? { item: r, accessibleName: i, placement: `cluster` } : null;
}
var Q = new Map(),
  $ = new Set(),
  St = () => $.forEach((e) => e()),
  Ct = (e) => ($.add(e), () => void $.delete(e));
function wt(e, t) {
  (0, J.useLayoutEffect)(() => {
    if (t !== void 0)
      return (
        Q.set(e, t),
        St(),
        () => {
          Q.get(e) === t && (Q.delete(e), St());
        }
      );
  }, [e, t]);
}
function Tt(e) {
  return (0, J.useSyncExternalStore)(
    Ct,
    () => Q.get(e) ?? null,
    () => null
  );
}
function Et(e) {
  let { latex: t, segmentIndex: n, stem: r, questionKey: i } = e;
  wt(i, r);
  let a = r !== void 0 && n !== void 0 ? bt(r, n, t) : null;
  return a && (0, X.jsx)(Z, { ...a });
}
function Dt(e) {
  let t = Tt(e.questionKey),
    n = xt(e.letter, e.text, e.stem ?? t);
  return n && (0, X.jsx)(Z, { ...n });
}
function Ot(e) {
  if (e.slot !== `cluster` && e.itemId !== `table`) return null;
  let t = e.itemId ?? `table`,
    n = t.startsWith(`choice:`) ? t.slice(7) : void 0,
    r = st({ sourceId: t, headers: e.headers ?? null, rows: e.rows, letter: n }),
    i = r && q([r]).get(r.sourceId);
  if (!r || !i) return null;
  let a = e.slot === `cluster` ? `cluster` : `block`;
  return (0, X.jsx)(Z, { item: r, accessibleName: i, placement: a });
}
export {
  Dt as ChoiceTransferAction,
  Ye as PLAIN_CHOICE,
  Et as StemTransferAction,
  Ot as TableTransferAction,
  Z as TransferControl,
  q as accessibleNames,
  xt as choiceControl,
  $e as classifyChoice,
  Je as classifyStem,
  Ze as explainChoice,
  Ke as explainStem,
  re as installMathSplit,
  bt as stemControl,
};
