(function () {
  function e(e) {
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
  function t(t) {
    let n = 0,
      r = [t];
    for (let t = r.pop(); t !== void 0; t = r.pop()) ((n += 1), r.push(...e(t)));
    return n;
  }
  let n = Object.freeze([
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
    r = /* @__PURE__ */ new Set(
      /* @__PURE__ */ `sin.cos.tan.csc.sec.cot.arcsin.arccos.arctan.arccsc.arcsec.arccot.exp.ln.log.sinh.cosh.tanh.csch.sech.coth.arcsinh.arccosh.arctanh.arccsch.arcsech.arccoth.mod.ceil.floor.round.sign.nPr.nCr.abs`.split(
        `.`
      )
    ),
    i = /* @__PURE__ */ new Set([
      ...[`sin`, `cos`, `tan`, `csc`, `sec`, `cot`].flatMap((e) => [
        e,
        `arc${e}`,
        `${e}h`,
        `arc${e}h`,
      ]),
      `ln`,
      `log`,
    ]),
    a = `variadic`;
  function o(e, t, n, r) {
    return Object.freeze({ name: e, category: t, phase: n, arity: r === a ? a : Object.freeze(r) });
  }
  let s = Object.freeze([
    o(`sin`, 1, 1, [1]),
    o(`cos`, 1, 1, [1]),
    o(`tan`, 1, 1, [1]),
    o(`csc`, 1, 1, [1]),
    o(`sec`, 1, 1, [1]),
    o(`cot`, 1, 1, [1]),
    o(`arcsin`, 2, 1, [1]),
    o(`arccos`, 2, 1, [1]),
    o(`arctan`, 2, 1, [1, 2]),
    o(`arccsc`, 2, 1, [1]),
    o(`arcsec`, 2, 1, [1]),
    o(`arccot`, 2, 1, [1]),
    o(`mean`, 3, 2, a),
    o(`median`, 3, 2, a),
    o(`min`, 3, 2, a),
    o(`max`, 3, 2, a),
    o(`quartile`, 3, 2, [2]),
    o(`quantile`, 3, 2, [2]),
    o(`stdev`, 3, 2, a),
    o(`stdevp`, 3, 2, a),
    o(`var`, 3, 2, a),
    o(`varp`, 3, 2, a),
    o(`cov`, 3, 3, [2]),
    o(`covp`, 3, 3, [2]),
    o(`mad`, 3, 2, a),
    o(`corr`, 3, 3, [2]),
    o(`spearman`, 3, 3, [2]),
    o(`stats`, 3, 3, [1]),
    o(`count`, 3, 2, a),
    o(`total`, 3, 2, a),
    o(`repeat`, 4, 3, [2]),
    o(`join`, 4, 3, a),
    o(`sort`, 4, 3, [1, 2]),
    o(`shuffle`, 4, 3, [1, 2]),
    o(`unique`, 4, 3, [1]),
    o(`length`, 4, 2, a),
    o(`histogram`, 5, 3, [1, 2]),
    o(`dotplot`, 5, 3, [1]),
    o(`boxplot`, 5, 3, [1]),
    o(`normaldist`, 6, 3, [0, 1, 2]),
    o(`tdist`, 6, 3, [1]),
    o(`chisqdist`, 6, 3, [1]),
    o(`uniformdist`, 6, 3, [0, 1, 2]),
    o(`binomialdist`, 6, 3, [2]),
    o(`poissondist`, 6, 3, [1]),
    o(`geodist`, 6, 3, [1]),
    o(`discretedist`, 6, 3, [1, 2]),
    o(`pdf`, 6, 3, [2]),
    o(`cdf`, 6, 3, [2, 3]),
    o(`inversecdf`, 6, 3, [2]),
    o(`random`, 6, 3, [0, 1, 2, 3]),
    o(`ztest`, 7, 3, [2, 4]),
    o(`ttest`, 7, 3, [1, 2]),
    o(`zproptest`, 7, 3, [2, 4]),
    o(`chisqtest`, 7, 3, a),
    o(`chisqgof`, 7, 3, [2]),
    o(`exp`, 8, 1, [1]),
    o(`ln`, 8, 1, [1]),
    o(`log`, 8, 1, [1, 2]),
    o(`sinh`, 9, 2, [1]),
    o(`cosh`, 9, 2, [1]),
    o(`tanh`, 9, 2, [1]),
    o(`csch`, 9, 2, [1]),
    o(`sech`, 9, 2, [1]),
    o(`coth`, 9, 2, [1]),
    o(`arcsinh`, 9, 2, [1]),
    o(`arccosh`, 9, 2, [1]),
    o(`arctanh`, 9, 2, [1]),
    o(`arccsch`, 9, 2, [1]),
    o(`arcsech`, 9, 2, [1]),
    o(`arccoth`, 9, 2, [1]),
    o(`polygon`, 10, 4, a),
    o(`distance`, 10, 4, [2]),
    o(`midpoint`, 10, 4, [2]),
    o(`rgb`, 11, 4, [3]),
    o(`hsv`, 11, 4, [3]),
    o(`okhsv`, 11, 4, [3]),
    o(`oklab`, 11, 4, [3]),
    o(`oklch`, 11, 4, [3]),
    o(`lcm`, 12, 2, a),
    o(`gcd`, 12, 2, a),
    o(`mod`, 12, 2, [2]),
    o(`ceil`, 12, 2, [1]),
    o(`floor`, 12, 2, [1]),
    o(`round`, 12, 2, [1, 2]),
    o(`sign`, 12, 2, [1]),
    o(`nPr`, 12, 2, [2]),
    o(`nCr`, 12, 2, [2]),
    o(`abs`, 12, 2, [1]),
    o(`det`, 13, 4, [1]),
    o(`trace`, 13, 4, [1]),
    o(`rref`, 13, 4, [1]),
    o(`rank`, 13, 4, [1]),
    o(`rows`, 13, 4, [1]),
    o(`columns`, 13, 4, [1]),
    o(`transpose`, 13, 4, [1]),
    o(`real`, 14, 4, [1]),
    o(`imag`, 14, 4, [1]),
    o(`conj`, 14, 4, [1]),
    o(`arg`, 14, 4, [1]),
    o(`tone`, 15, 4, [1, 2]),
    o(`with`, null, 4, [2]),
    o(`for`, null, 2, [2]),
    o(`and`, null, 4, [2]),
    o(`or`, null, 4, [2]),
    o(`of`, null, 1, [2]),
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
  let c = Object.freeze([
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
    l = new Map(s.map((e) => [e.name, e]));
  (s.map((e) => e.name).join(` `), c.join(` `));
  function u(e) {
    return l.has(e);
  }
  function d(e) {
    return r.has(e) && l.has(e);
  }
  function f(e, t) {
    return Object.freeze({ op: e, arg: t });
  }
  function p(e, t, n, r) {
    return Object.freeze({ name: e, label: t, spoken: n, actions: Object.freeze(r) });
  }
  function m(e, t, n, r) {
    return p(e, t, n, [f(`write`, `${r}\\left(\\right)`), f(`keystroke`, `Left`)]);
  }
  let h = [
      [`sin`, `sine`],
      [`cos`, `cosine`],
      [`tan`, `tangent`],
      [`csc`, `cosecant`],
      [`sec`, `secant`],
      [`cot`, `cotangent`],
    ],
    g = /* @__PURE__ */ new Map();
  for (let [e, t] of h) g.set(e, [m(e, e, t, `\\${e}`)]);
  for (let [e, t] of h) {
    let n = `arc${e}`;
    g.set(n, [m(n, `${e}⁻¹`, `inverse ${t}`, `\\${e}^{-1}`)]);
  }
  (g.set(`exp`, [m(`exp`, `exp`, `exponential`, `\\exp`)]),
    g.set(`ln`, [m(`ln`, `ln`, `natural log`, `\\ln`)]),
    g.set(`log`, [
      m(`log`, `log`, `log`, `\\log`),
      p(`log`, `logₐ`, `log base a`, [f(`cmd`, `\\log`), f(`cmd`, `_`)]),
    ]),
    Object.freeze(
      n.flatMap((e, t) => {
        let n = t + 1,
          r = s.filter((e) => e.category === n && d(e.name)).flatMap((e) => g.get(e.name) ?? []);
        return r.length === 0
          ? []
          : [Object.freeze({ id: n, heading: e, entries: Object.freeze(r) })];
      })
    ));
  let _ = /* @__PURE__ */ new Set([...s.map((e) => e.name), ...c]),
    v = Math.max(...[..._].map((e) => e.length));
  function y(e) {
    let t = [],
      n = 0;
    for (; n < e.length; ) {
      let r = e[n];
      if (r.t === `symbol` && r.ch === `_`) {
        let r = b(e, n + 1);
        (t.push(...e.slice(n, r)), (n = r));
      } else if (r.t === `letter`) {
        let r = n + 1;
        for (; ee(e[r - 1], e[r]); ) r += 1;
        (t.push(...te(e.slice(n, r))), (n = r));
      } else (t.push(r), (n += 1));
    }
    return t;
  }
  function b(e, t) {
    let n = e[t];
    if (n === void 0) return t;
    if (n.t === `letter`) return t + 1;
    if (n.t !== `open` || n.ch !== `{`) return t;
    let r = 0;
    for (let n = t; n < e.length; n++) {
      let t = e[n];
      if (
        (t.t === `open` && t.ch === `{` && (r += 1),
        t.t === `close` && t.ch === `}` && --r,
        r === 0)
      )
        return n + 1;
    }
    return e.length;
  }
  function ee(e, t) {
    return t !== void 0 && t.t === `letter` && t.span.start === e.span.end;
  }
  function te(e) {
    let t = [],
      n = 0;
    for (; n < e.length; ) {
      let r = ne(e, n);
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
  function ne(e, t) {
    let n = ``,
      r = 0;
    for (let i = t; i < e.length && i - t < v; i++) ((n += e[i].ch), _.has(n) && (r = n.length));
    return r;
  }
  let re = /* @__PURE__ */ new Map([
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
    ie = /* @__PURE__ */ new Map([
      [`²`, `2`],
      [`³`, `3`],
    ]),
    ae = /* @__PURE__ */ new Map([
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
    oe = /* @__PURE__ */ new Map([
      [`left`, `\\lvert `],
      [`right`, `\\rvert `],
    ]),
    se = /* @__PURE__ */ new Set([`operatorname`, `mathrm`, `text`]),
    ce = (e) => e !== void 0 && ((e >= `a` && e <= `z`) || (e >= `A` && e <= `Z`));
  function le(e) {
    let t = pe(ue(e));
    for (let e = ``; t !== e; ) ((e = t), (t = ge(t)));
    return t;
  }
  function ue(e) {
    let t = ``,
      n = 0;
    for (; n < e.length; ) {
      let r = e[n],
        i = fe(e, n, (e) => ie.get(e));
      if (i.length > 0) {
        ((t += `^{${i.text}}`), (n += i.length));
        continue;
      }
      let a = fe(e, n, de);
      a.length > 0 ? ((t += `_{${a.text}}`), (n += a.length)) : ((t += re.get(r) ?? r), (n += 1));
    }
    return t;
  }
  function de(e) {
    let t = e.charCodeAt(0) - 8320;
    return t >= 0 && t <= 9 ? String(t) : void 0;
  }
  function fe(e, t, n) {
    let r = ``,
      i = t;
    for (let t = n(e[i] ?? ``); t !== void 0; t = n(e[i] ?? ``)) ((r += t), (i += 1));
    return { text: r, length: i - t };
  }
  function pe(e) {
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
  function me(e, t) {
    let n = t + 1;
    if (ce(e[n])) for (; ce(e[n]); ) n += 1;
    else n < e.length && (n += 1);
    return { name: e.slice(t + 1, n), end: n };
  }
  function he(e, t) {
    if (e[t] !== `{`) return null;
    let n = t + 1;
    for (; ce(e[n]); ) n += 1;
    let r = e.slice(t + 1, n);
    return e[n] === `}` && u(r) ? { name: r, end: n + 1 } : null;
  }
  function ge(e) {
    let t = ``,
      n = 0,
      r = (n) => {
        ce(e[n]) && /\\[A-Za-z]+$/.test(t) && (t += ` `);
      };
    for (; n < e.length; ) {
      let i = e[n];
      if (i === `^` && e.startsWith(`\\circ`, n + 1) && !ce(e[n + 6])) {
        ((t += `^{\\circ}`), (n += 6));
        continue;
      }
      if (i !== `\\`) {
        ((t += i), (n += 1));
        continue;
      }
      let { name: a, end: o } = me(e, n),
        s = oe.get(a),
        c = ae.get(a),
        l = se.has(a) ? he(e, o) : null;
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
  let _e = new Set(s.filter((e) => e.category !== null).map((e) => e.name)),
    ve = /* @__PURE__ */ new Set([
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
  function ye(e) {
    return e.t === `command` && _e.has(e.name);
  }
  function be(e, t) {
    if (!d(t.name)) return S(`unsupported`, t.span, `"${t.name}" is not supported`);
    T(e);
    let n = null,
      r = null;
    for (let i = w(e); ; i = w(e))
      if (n === null && t.name === `log` && x(i, `_`)) (T(e), (n = et(e).node));
      else if (r === null && x(i, `^`) && !nt(e)) (T(e), (r = et(e).node));
      else break;
    let a = i.has(t.name);
    if (r !== null && !a) return xe(t);
    let o = w(e);
    if (x(o, `'`)) return S(`unsupported`, o.span, `"'" is not supported`);
    if (o.t === `open` && o.ch === `(`)
      return Se(t.name) && Ce(e)
        ? Ze(e, ke(Oe(t, [], null, Ne(e)), r))
        : Ze(e, ke(Oe(t, we(e), n, Ne(e)), r));
    if (!a) return xe(t);
    let s = De(e, t);
    return ke(Oe(t, [s], n, s.span.end), r);
  }
  function xe(e) {
    return S(`function-parentheses`, e.span, `"${e.name}" needs (`, e.name);
  }
  function Se(e) {
    let t = s.find((t) => t.name === e)?.arity;
    return t !== void 0 && t !== `variadic` && !t.includes(0);
  }
  function Ce(e) {
    let t = w(e, 1);
    return t.t !== `close` || t.ch !== `)` ? !1 : (T(e), T(e), !0);
  }
  function we(e) {
    let t = bt(e, T(e), () => {
        let t = w(e);
        x(t, `,`) && S(`comma-side`, t.span, `an argument is missing before a comma`);
        let n = [E(e)];
        for (let t = w(e); x(t, `,`); t = w(e)) (T(e), Te(t, w(e)), n.push(E(e)));
        return n;
      }),
      n = w(e);
    return ((n.t !== `close` || n.ch !== `)`) && C(e, n), T(e), t);
  }
  function Te(e, t) {
    x(e, `,`) &&
      (x(t, `,`) || (t.t === `close` && t.ch === `)`)) &&
      S(`comma-side`, e.span, `an argument is missing beside a comma`);
  }
  function Ee(e, t) {
    let n = w(e);
    if (t.kind !== `id` || n.t !== `open` || n.ch !== `(` || !e.options.userFunctions?.has(t.name))
      return t;
    let r = Ce(e) ? [] : we(e),
      i = { start: t.span.start, end: Ne(e) };
    return { kind: `call`, name: t.name, args: r, span: i };
  }
  function De(e, t) {
    let n = e.pos,
      r = [];
    for (let t = w(e); Pe(t); t = w(e)) (T(e), x(t, `-`) && r.push(t));
    let i = null;
    for (; St(e) && !ye(w(e)); ) {
      let t = Xe(e);
      i = i === null ? Me(r, t) : je(i, t);
    }
    let a = w(e);
    return i !== null && ye(a)
      ? S(`argument-parentheses`, t.span, `"${t.name}" needs (`, t.name)
      : i === null
        ? a.t === `end` && e.pos === n
          ? xe(t)
          : ye(a)
            ? Me(r, be(e, a))
            : C(e, a)
        : i;
  }
  function Oe(e, t, n, r) {
    let i = { start: e.span.start, end: r };
    return { kind: `call`, name: e.name, args: n === null ? t : [...t, n], span: i };
  }
  function ke(e, t) {
    if (t === null) return e;
    let n = e.name.slice(3);
    if (e.name.startsWith(`arc`) && ve.has(n) && Ae(t)) return { ...e, name: n };
    if (ve.has(e.name) && Ae(t)) {
      let t = `arc${e.name}`;
      return d(t) ? { ...e, name: t } : S(`unsupported`, e.span, `"${t}" is not supported`);
    }
    return { kind: `pow`, left: e, right: t, span: e.span };
  }
  function Ae(e) {
    return e.kind === `neg` && e.arg.kind === `num` && e.arg.value === 1;
  }
  function je(e, t) {
    return { kind: `mul`, left: e, right: t, span: { start: e.span.start, end: t.span.end } };
  }
  function Me(e, t) {
    let n = t;
    for (let t = e.length - 1; t >= 0; t--)
      n = { kind: `neg`, arg: n, span: { start: e[t].span.start, end: n.span.end } };
    return n;
  }
  function Ne(e) {
    return e.tokens[e.pos - 1].span.end;
  }
  function Pe(e) {
    return x(e, `+`) || x(e, `-`);
  }
  function x(e, t) {
    return e.t === `symbol` && e.ch === t;
  }
  let Fe = Object.freeze({
      index: `Indexing a list`,
      slice: `Slicing a list`,
      filter: `Filtering a list`,
      comprehension: `Building a list with 'for'`,
      listCurves: `Graphing a list of curves`,
    }),
    Ie = /* @__PURE__ */ new Set([`id`, `call`, `list`]),
    Le = /* @__PURE__ */ new Set([`=`, `<`, `>`]);
  function Re(e, t) {
    T(e);
    let n = [],
      r = -1;
    bt(e, t, () => {
      if (!Ge(w(e)))
        for (;;) {
          let t = w(e);
          (Ue(t) &&
            (n.length === 0 && He(t),
            (r >= 0 || n.length > 2) && C(e, t),
            T(e),
            (r = n.length),
            We(w(e)) && T(e),
            Ge(w(e)) && He(t)),
            n.push(E(e)));
          let i = w(e);
          if (We(i)) T(e);
          else if (!Ue(i)) return;
        }
    });
    let i = w(e);
    (Ge(i) || C(e, i), T(e));
    let a = { start: t.span.start, end: i.span.end };
    return r < 0
      ? { kind: `list`, items: n, span: a }
      : n.length === r + 1
        ? { kind: `list`, items: n, range: !0, span: a }
        : S(`syntax`, a, `a range has one item after the ellipsis`);
  }
  function ze(e, t) {
    let n = w(e);
    if (n.t !== `open` || n.ch !== `[` || !Ie.has(t.kind)) return;
    let r = Ve(e);
    S(`unsupported`, n.span, `${r} is not supported`, r);
  }
  function Be(e) {
    if (e.t !== `command` || e.name !== `for`) return;
    let t = Fe.comprehension;
    S(`unsupported`, e.span, `${t} is not supported`, t);
  }
  function Ve(e) {
    let t = 0;
    for (let n = e.pos; n < e.tokens.length; n++) {
      let r = e.tokens[n];
      if ((r.t === `open` ? (t += 1) : r.t === `close` && --t, t === 0)) break;
      if (t === 1) {
        if (Ue(r)) return Fe.slice;
        if (
          (r.t === `symbol` && Le.has(r.ch)) ||
          (r.t === `command` && (r.name === `le` || r.name === `ge`))
        )
          return Fe.filter;
      }
    }
    return Fe.index;
  }
  function He(e) {
    return S(`range-bound`, e.span, `a range needs an item on each side of the ellipsis`);
  }
  function Ue(e) {
    return e.t === `command` && e.name === `ldots`;
  }
  function We(e) {
    return e.t === `symbol` && e.ch === `,`;
  }
  function Ge(e) {
    return e.t === `close` && e.ch === `]`;
  }
  let Ke = /* @__PURE__ */ new Set([`'`]),
    qe = /* @__PURE__ */ new Set([`operatorname`, `text`, `mathrm`]),
    Je = /* @__PURE__ */ new Set(
      /* @__PURE__ */ `alpha.beta.gamma.delta.epsilon.varepsilon.zeta.eta.theta.vartheta.iota.kappa.lambda.mu.nu.xi.rho.varrho.sigma.varsigma.upsilon.phi.varphi.chi.psi.omega`.split(
        `.`
      )
    );
  function Ye(e) {
    let t = w(e);
    return ye(t) ? be(e, t) : Xe(e);
  }
  function Xe(e) {
    return Ze(e, Qe(e));
  }
  function Ze(e, t) {
    let n = t,
      r = !1;
    for (let t = w(e); t.t === `symbol`; t = w(e))
      if (
        ((Ke.has(t.ch) || (t.ch === `.` && ht(n))) &&
          S(`unsupported`, t.span, `"${t.ch}" is not supported`),
        t.ch === `%` || t.ch === `!`)
      )
        (T(e),
          (n = {
            kind: t.ch === `%` ? `pct` : `fact`,
            arg: n,
            span: { start: n.span.start, end: t.span.end },
          }),
          (r = !1));
      else if (t.ch === `^` && nt(e)) {
        for (let t = 0; t < 3; t++) T(e);
        let t = T(e);
        ((n = { kind: `deg`, arg: n, span: { start: n.span.start, end: t.span.end } }), (r = !1));
      } else if (t.ch === `^`) {
        (r && C(e, t), T(e));
        let i = et(e),
          a = { start: n.span.start, end: i.end };
        ((n = { kind: `pow`, left: n, right: i.node, span: a }), (r = !0));
      } else break;
    return (ze(e, n), n);
  }
  function Qe(e) {
    let t = w(e);
    switch (t.t) {
      case `digits`:
        return (T(e), { kind: `num`, value: Number(t.text), span: t.span });
      case `letter`:
        return Ee(e, lt(e, t));
      case `open`:
        return t.ch === `[` ? Re(e, t) : rt(e, t);
      case `symbol`:
        return t.ch === `|` ? it(e, t, `raw`) : C(e, t);
      case `command`:
        return t.name === `frac`
          ? at(e, t)
          : t.name === `sqrt`
            ? ct(e, t, null)
            : t.name === `cbrt` && mt(e, t)
              ? ct(e, t, { kind: `num`, value: 3, span: t.span })
              : t.name === `lvert`
                ? it(e, t, `lvert`)
                : Ee(e, ut(e, !0));
      default:
        return C(e, t);
    }
  }
  function $e(e) {
    let t = w(e);
    if (t.t === `open` && t.ch === `{`) return tt(e, t, `}`).node;
    if (t.t === `digits`) {
      let n = pt(e, t);
      return { kind: `num`, value: Number(n.text), span: n.span };
    }
    return t.t === `letter`
      ? (T(e),
        t.ch === `e`
          ? { kind: `const`, name: `e`, span: t.span }
          : { kind: `id`, name: t.ch, span: t.span })
      : t.t === `command`
        ? ut(e, !1)
        : C(e, t);
  }
  function et(e) {
    let t = w(e);
    if (t.t === `open` && t.ch === `{`) return tt(e, t, `}`);
    let n = $e(e);
    return { node: n, end: n.span.end };
  }
  function tt(e, t, n) {
    T(e);
    let r = bt(e, t, () => E(e)),
      i = w(e);
    return ((i.t !== `close` || i.ch !== n) && C(e, i), T(e), { node: r, end: i.span.end });
  }
  function nt(e) {
    let [t, n, r] = [w(e, 1), w(e, 2), w(e, 3)];
    return (
      t.t === `open` &&
      t.ch === `{` &&
      n.t === `command` &&
      n.name === `circ` &&
      r.t === `close` &&
      r.ch === `}`
    );
  }
  function rt(e, t) {
    T(e);
    let n = bt(e, t, () => {
        let n = [E(e)];
        for (let r = w(e); r.t === `symbol` && r.ch === `,`; r = w(e))
          (t.ch === `{` && C(e, r), T(e), n.push(E(e)));
        return n;
      }),
      r = w(e);
    ((r.t !== `close` || r.ch !== (t.ch === `(` ? `)` : `}`)) && C(e, r), T(e));
    let i = { start: t.span.start, end: r.span.end };
    return n.length > 2
      ? S(`point-arity`, i, `a point has 2 coordinates, not ${n.length}`)
      : n.length === 2
        ? { kind: `point`, x: n[0], y: n[1], span: i }
        : { ...n[0], span: i };
  }
  function it(e, t, n) {
    T(e);
    let r = bt(e, t, () => {
        e.bars.push(n);
        try {
          return E(e);
        } finally {
          e.bars.pop();
        }
      }),
      i = w(e);
    return (
      (n === `raw` ? i.t === `symbol` && i.ch === `|` : i.t === `command` && i.name === `rvert`) ||
        C(e, i),
      T(e),
      { kind: `abs`, arg: r, span: { start: t.span.start, end: i.span.end } }
    );
  }
  function at(e, t) {
    T(e);
    let n = et(e),
      r = et(e);
    if (ot(n.node, r.node))
      return S(`unsupported`, t.span, `"\\frac{d}{d…}" (derivative) is not supported`);
    let i = { start: t.span.start, end: r.end };
    return { kind: `div`, left: n.node, right: r.node, span: i };
  }
  function ot(e, t) {
    return st(e, `d`) && t.kind === `mul` && st(t.left, `d`) && st(t.right, null);
  }
  function st(e, t) {
    return e.kind !== `id` && (e.kind !== `const` || e.name !== `e`)
      ? !1
      : t === null
        ? /^[A-Za-z]$/.test(e.name)
        : e.name === t;
  }
  function ct(e, t, n) {
    T(e);
    let r = w(e),
      i = n;
    i === null && r.t === `open` && r.ch === `[` && (i = tt(e, r, `]`).node);
    let a = w(e),
      o = a.t === `open` && a.ch === `(` ? tt(e, a, `)`) : et(e);
    return { kind: `root`, arg: o.node, index: i, span: { start: t.span.start, end: o.end } };
  }
  function lt(e, t) {
    T(e);
    let n = w(e);
    if (n.t === `symbol` && n.ch === `_`) return dt(e, t.ch, t.span.start);
    if (t.ch === `e`) return { kind: `const`, name: `e`, span: t.span };
    if (n.t === `digits` && n.span.start === t.span.end && gt(n)) {
      T(e);
      let r = { start: t.span.start, end: n.span.end };
      return { kind: `id`, name: `${t.ch}_{${n.text}}`, span: r };
    }
    return { kind: `id`, name: t.ch, span: t.span };
  }
  function ut(e, t) {
    if (!St(e)) return C(e, w(e));
    let n = T(e);
    if (n.name === `pi` || n.name === `tau`) return { kind: `const`, name: n.name, span: n.span };
    if (Je.has(n.name)) {
      let r = `\\${n.name}`,
        i = w(e);
      return t && i.t === `symbol` && i.ch === `_`
        ? dt(e, r, n.span.start)
        : { kind: `id`, name: r, span: n.span };
    }
    Be(n);
    let [r, i] = [w(e), w(e, 1)],
      a = r.t === `open` && r.ch === `{` && i.t === `close` && i.ch === `}`;
    return qe.has(n.name) && a
      ? S(`syntax`, i.span, `"\\${n.name}{}" is empty`)
      : S(`unsupported`, n.span, `"\\${n.name}" is not supported`);
  }
  function dt(e, t, n) {
    T(e);
    let r = w(e),
      i,
      a;
    if (r.t === `open` && r.ch === `{`) (T(e), (i = bt(e, r, () => ft(e))), (a = T(e).span.end));
    else if (r.t === `letter`) (T(e), (i = r.ch), (a = r.span.end));
    else if (r.t === `digits`) {
      let t = pt(e, r);
      ((i = t.text), (a = t.span.end));
    } else return C(e, r);
    return { kind: `id`, name: `${t}_{${i}}`, span: { start: n, end: a } };
  }
  function ft(e) {
    let t = ``;
    for (let n = w(e); ; n = w(e)) {
      if (n.t === `close` && n.ch === `}` && t !== ``) return t;
      if (n.t === `letter`) t += n.ch;
      else if (n.t === `digits` && !n.text.includes(`.`)) t += n.text;
      else return C(e, n);
      T(e);
    }
  }
  function pt(e, t) {
    let n = t.text[0],
      r = { start: t.span.start, end: t.span.start + 1 };
    if (n === `.`) return S(`syntax`, r, `unexpected "."`);
    let i = t.text.slice(1);
    if (i === ``) return (T(e), { text: n, span: t.span });
    let a = r.end;
    for (; /\s/.test(e.normalized[a]); ) a += 1;
    let o = { start: a, end: t.span.end };
    return (
      (e.tokens[e.pos] =
        i === `.` ? { t: `symbol`, ch: `.`, span: o } : { t: `digits`, text: i, span: o }),
      { text: n, span: r }
    );
  }
  function mt(e, t) {
    return e.normalized[t.span.start] !== `\\`;
  }
  function ht(e) {
    return e.kind === `id` || e.kind === `call`;
  }
  function gt(e) {
    return !e.text.includes(`.`) && e.span.end - e.span.start === e.text.length;
  }
  var _t = class extends Error {
    constructor(e) {
      (super(e.detail), (this.name = `ParseFailure`), (this.error = e));
    }
  };
  let vt = /* @__PURE__ */ new Set([`cdot`, `le`, `ge`, `rvert`, `of`, `sim`, `ldots`]);
  function yt(e, t, n) {
    return { tokens: e, pos: 0, depth: 0, bars: [], normalized: t, options: n };
  }
  function S(e, t, n, r) {
    let i = { code: e, span: { start: t.start, end: t.end }, detail: n };
    throw new _t(r === void 0 ? i : { ...i, feature: r });
  }
  function C(e, t) {
    if (t.t === `end`) return S(`syntax`, t.span, `unexpected end of input`);
    let n = e.normalized.slice(t.span.start, t.span.end);
    return S(`syntax`, t.span, `unexpected "${n}"`);
  }
  function w(e, t = 0) {
    return e.tokens[Math.min(e.pos + t, e.tokens.length - 1)];
  }
  function T(e) {
    let t = w(e);
    return (t.t !== `end` && (e.pos += 1), t);
  }
  function bt(e, t, n) {
    (e.depth >= 64 && S(`too-deep`, t.span, `more than 64 nesting levels`), (e.depth += 1));
    try {
      return n();
    } finally {
      --e.depth;
    }
  }
  function xt(e) {
    let t = w(e);
    Ot(t) && S(`sim-side`, t.span, `nothing before \\sim`);
    let n = [E(e)],
      r = w(e);
    if (Ot(r)) {
      (T(e), w(e).t === `end` && S(`sim-side`, r.span, `nothing after \\sim`));
      let t = E(e),
        i = w(e);
      return (i.t !== `end` && C(e, i), { kind: `sim`, left: n[0], right: t, span: At(n[0], t) });
    }
    let i = [];
    for (let t = Et(e); t !== null; t = Et(e)) (Dt(i, t), i.push(t.op), n.push(E(e)));
    let a = w(e);
    return (
      a.t !== `end` && C(e, a),
      i.length === 0 ? n[0] : { kind: `rel`, ops: i, operands: n, span: At(n[0], n[n.length - 1]) }
    );
  }
  function E(e) {
    let t = Ct(e);
    for (let n = w(e); kt(n); n = w(e)) {
      T(e);
      let r = Ct(e);
      t = { kind: n.ch === `+` ? `add` : `sub`, left: t, right: r, span: At(t, r) };
    }
    return t;
  }
  function St(e) {
    let t = w(e);
    switch (t.t) {
      case `digits`:
      case `letter`:
      case `open`:
        return !0;
      case `symbol`:
        return t.ch === `|` && e.bars.length === 0;
      case `command`:
        return !vt.has(t.name);
      default:
        return !1;
    }
  }
  function Ct(e) {
    let { node: t, factor: n } = Tt(e);
    for (;;) {
      let r = wt(w(e), n);
      if (r !== null) {
        T(e);
        let i = Tt(e);
        ((t = { kind: r, left: t, right: i.node, span: At(t, i.node) }), (n = i.factor));
      } else if (St(e)) ((n = Ye(e)), (t = { kind: `mul`, left: t, right: n, span: At(t, n) }));
      else return t;
    }
  }
  function wt(e, t) {
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
  function Tt(e) {
    let t = [];
    for (let n = w(e); kt(n); n = w(e)) (T(e), n.ch === `-` && t.push(n));
    let n = Ye(e),
      r = n;
    for (let e = t.length - 1; e >= 0; e--)
      r = { kind: `neg`, arg: r, span: { start: t[e].span.start, end: r.span.end } };
    return { node: r, factor: n };
  }
  function Et(e) {
    let t = w(e);
    if (t.t === `command` && (t.name === `le` || t.name === `ge`))
      return (T(e), { op: t.name === `le` ? `<=` : `>=`, span: t.span });
    if (t.t !== `symbol` || (t.ch !== `=` && t.ch !== `<` && t.ch !== `>`)) return null;
    T(e);
    let n = w(e);
    if (t.ch !== `=` && n.t === `symbol` && n.ch === `=` && n.span.start === t.span.end) {
      T(e);
      let r = { start: t.span.start, end: n.span.end };
      return { op: t.ch === `<` ? `<=` : `>=`, span: r };
    }
    return { op: t.ch, span: t.span };
  }
  function Dt(e, t) {
    if (e.length === 0) return;
    let n = e[e.length - 1];
    (t.op === `=` || n === `=` || t.op[0] !== n[0]) &&
      S(`relation-chain`, t.span, `"${t.op}" cannot follow "${n}" in a chain`);
  }
  function Ot(e) {
    return (e.t === `symbol` && e.ch === `~`) || (e.t === `command` && e.name === `sim`);
  }
  function kt(e) {
    return e.t === `symbol` && (e.ch === `+` || e.ch === `-`);
  }
  function At(e, t) {
    return { start: e.span.start, end: t.span.end };
  }
  let jt = /* @__PURE__ */ new Set([
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
    Mt = /* @__PURE__ */ new Set([`(`, `[`, `{`]),
    Nt = /* @__PURE__ */ new Set([`)`, `]`, `}`]),
    Pt = (e) => e !== void 0 && e >= `0` && e <= `9`,
    Ft = (e) => e !== void 0 && ((e >= `a` && e <= `z`) || (e >= `A` && e <= `Z`)),
    It = (e) => e !== void 0 && /\s/.test(e);
  function Lt(e, t) {
    return String.fromCodePoint(e.codePointAt(t));
  }
  function Rt(e) {
    let t = [],
      n = 0;
    for (; n < e.length; ) {
      let r = e[n],
        i = (e) => ({ start: n, end: e });
      if (It(r)) n += 1;
      else if (e.startsWith(`...`, n))
        (t.push({ t: `command`, name: `ldots`, span: i(n + 3) }), (n += 3));
      else if (Pt(r) || (r === `.` && Pt(e[n + 1]) && !zt(t))) {
        let r = Bt(e, n);
        (t.push(r), (n = r.span.end));
      } else if (Ft(r)) (t.push({ t: `letter`, ch: r, span: i(n + 1) }), (n += 1));
      else if (r === `\\`) {
        let r = Vt(e, n);
        if (r === null)
          return { code: `syntax`, span: i(n + 1), detail: `a backslash ends the input` };
        (t.push(r), (n = r.span.end));
      } else if (jt.has(r)) (t.push({ t: `symbol`, ch: r, span: i(n + 1) }), (n += 1));
      else if (Mt.has(r)) (t.push({ t: `open`, ch: r, span: i(n + 1) }), (n += 1));
      else if (Nt.has(r)) (t.push({ t: `close`, ch: r, span: i(n + 1) }), (n += 1));
      else if (r === `;`)
        return {
          code: `unsupported`,
          span: i(n + 1),
          detail: `";" (matrix rows) is not supported`,
        };
      else {
        let t = Lt(e, n);
        return { code: `syntax`, span: i(n + t.length), detail: `unexpected character "${t}"` };
      }
    }
    return (t.push({ t: `end`, span: { start: e.length, end: e.length } }), t);
  }
  function zt(e) {
    let t = e[e.length - 1];
    return t !== void 0 && t.t === `digits` && t.text.includes(`.`);
  }
  function Bt(e, t) {
    let n = ``,
      r = t,
      i = t;
    for (;;) {
      let t = e[i];
      if (Pt(t) || (t === `.` && !n.includes(`.`) && !e.startsWith(`...`, i))) {
        ((n += t), (i += 1), (r = i));
        continue;
      }
      let a = i;
      for (; It(e[a]); ) a += 1;
      let o = e[a];
      if (a === i || !(Pt(o) || (o === `.` && !n.includes(`.`)))) break;
      i = a;
    }
    return { t: `digits`, text: n, span: { start: t, end: r } };
  }
  function Vt(e, t) {
    let n = e[t + 1];
    if (n === void 0) return null;
    if (!Ft(n)) {
      let n = Lt(e, t + 1),
        r = { start: t, end: t + 1 + n.length };
      return n === `%` ? { t: `symbol`, ch: `%`, span: r } : { t: `command`, name: n, span: r };
    }
    if (e.startsWith(`\\operatorname{`, t)) {
      let n = t + 14;
      for (; Ft(e[n]); ) n += 1;
      let r = e.slice(t + 14, n);
      if (e[n] === `}` && u(r)) return { t: `command`, name: r, span: { start: t, end: n + 1 } };
    }
    let r = t + 1;
    for (; Ft(e[r]); ) r += 1;
    return { t: `command`, name: e.slice(t + 1, r), span: { start: t, end: r } };
  }
  function Ht(e) {
    let t = Rt(le(e));
    if (!Array.isArray(t) || t[0].t !== `letter`) return null;
    let n = t[0].ch,
      r = 1;
    if (Wt(t[r], `_`)) {
      let e = Ut(t, r + 1);
      if (e === null) return null;
      ((n += `_{${e.text}}`), (r = e.end));
    }
    if (!Gt(t[r], `open`, `(`)) return null;
    let i = [];
    for (r += 1; ; r += 2) {
      let e = t[r];
      if (e === void 0 || e.t !== `letter`) return null;
      if ((i.push(e.ch), Gt(t[r + 1], `close`, `)`))) break;
      if (!Wt(t[r + 1], `,`)) return null;
    }
    return Wt(t[r + 2], `=`) ? { name: n, params: i } : null;
  }
  function Ut(e, t) {
    let n = e[t];
    if (n === void 0) return null;
    if (n.t === `letter`) return { text: n.ch, end: t + 1 };
    if (n.t === `digits`) return n.text.length === 1 ? { text: n.text, end: t + 1 } : null;
    if (!Gt(n, `open`, `{`)) return null;
    let r = ``;
    for (let n = t + 1; n < e.length; n++) {
      let t = e[n];
      if (Gt(t, `close`, `}`)) return r === `` ? null : { text: r, end: n + 1 };
      if (t.t === `letter`) r += t.ch;
      else if (t.t === `digits` && !t.text.includes(`.`)) r += t.text;
      else return null;
    }
    return null;
  }
  function Wt(e, t) {
    return e !== void 0 && e.t === `symbol` && e.ch === t;
  }
  function Gt(e, t, n) {
    return e !== void 0 && e.t === t && e.ch === n;
  }
  `` + `0`.repeat(309);
  function Kt(e, n = {}) {
    let r = ``;
    try {
      if (((r = le(e)), r.trim() === ``))
        return qt({ code: `syntax`, span: { start: 0, end: 0 }, detail: `empty` }, r);
      let i = Rt(r);
      if (!Array.isArray(i)) return qt(i, r);
      let a = xt(yt(y(i), r, n)),
        o = t(a);
      return o > 2e3
        ? qt(
            {
              code: `too-many-nodes`,
              span: { start: 0, end: r.length },
              detail: `${o} nodes, more than 2000`,
            },
            r
          )
        : { ok: !0, tree: a, normalized: r };
    } catch (e) {
      if (e instanceof _t) return qt(e.error, r);
      let t = { start: 0, end: r.length };
      return e instanceof RangeError
        ? qt({ code: `too-deep`, span: t, detail: `nesting too deep` }, r)
        : qt(
            {
              code: `syntax`,
              span: t,
              detail: `internal: ${e instanceof Error ? e.name : typeof e}`,
            },
            r
          );
    }
  }
  function qt(e, t) {
    return { ok: !1, error: e, normalized: t };
  }
  let Jt = {
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
  function D(e) {
    let t = /^(.*?)_\{(.*)\}$/.exec(e),
      [n, r] = t === null ? [e, null] : [t[1], t[2]];
    return r === null ? Yt(n) : `${Yt(n)}_${r}`;
  }
  function Yt(e) {
    return e.startsWith(`\\`) ? (Jt[e.slice(1)] ?? e) : e === `pi` || e === `tau` ? Jt[e] : e;
  }
  let Xt = {
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
    Zt = /* @__PURE__ */ new Set([`r`, `θ`]),
    Qt = new Set(Object.values(Fe));
  function O(e, t) {
    let [n = ``, r = ``] = t;
    if (e === `arity`) return $t(n, r, Number(t[2]));
    if (e === `too-many-variables`) return en(t);
    if (e === `function-parentheses` && i.has(n)) return $t(n, `1`, 0);
    let a = Xt[e];
    return (
      e === `unsupported` &&
        Zt.has(n) &&
        (a = `{n} is for polar graphs, which aren't available yet.`),
      e === `unsupported` && Qt.has(n) && (a = `{n} isn't supported yet.`),
      a.replaceAll(`{n}`, () => n).replaceAll(`{k}`, () => r)
    );
  }
  function $t(e, t, n) {
    let r = e === `log` ? [1] : t.split(/, | or /).map(Number),
      i = Math.max(...r),
      a = (t, n) => `Function '${e}' requires ${t}. For example, try typing: ${e}(${n}).`;
    if (n === 0 && r.includes(1)) return a(`an argument`, `x`);
    if (i === 1) return a(`only 1 argument`, `x`);
    let o = Array.from({ length: i }, (e, t) => String(t + 1)).join(`, `);
    return a(`${i} arguments`, o);
  }
  function en(e) {
    if (e.length === 0) return `Too many variables, I don't know what to do with this.`;
    if (e.length === 1) return `Too many variables. Try defining '${e[0]}'.`;
    let t = e[e.length - 1];
    return `Too many variables. Try defining '${e.slice(0, -1).join(`', '`)}' or '${t}'.`;
  }
  let tn = Object.freeze([`x`, `y`, `r`, `\\theta`]),
    nn = /* @__PURE__ */ new Set([`e`, `pi`, `tau`]);
  function k(t) {
    let n = [],
      r = [[t, !1]];
    for (let t = r.pop(); t !== void 0; t = r.pop()) {
      let [i, a] = t;
      i.kind === `id`
        ? n.push({ name: i.name, span: i.span, call: !1, inPoint: a })
        : i.kind === `call` &&
          !u(i.name) &&
          n.push({ name: i.name, span: i.span, call: !0, inPoint: a });
      let o = a || i.kind === `point`,
        s = e(i);
      for (let e = s.length - 1; e >= 0; --e) r.push([s[e], o]);
    }
    return n.sort((e, t) => e.span.start - t.span.start);
  }
  function rn(e, t) {
    return tn.includes(e) || nn.has(e) || (t.complex && e === `i`) || u(e);
  }
  let an = { start: 0, end: 0 },
    on = { kind: `num`, value: NaN, span: an },
    sn = {
      firstHeader: `The first column needs a name, such as x₁.`,
      ownColumns: `A cell can't use its own table's columns.`,
      comma: `Points are written like this: (1, 2).`,
      undefinedName: (e) => `Too many variables. Try defining '${e}'.`,
    },
    cn = (e, t, n = []) => ({ code: e, message: t, names: n, span: null });
  function ln(e, t) {
    if (le(e).trim() === ``) return { tree: null, error: null, blank: !0 };
    let n = Kt(e, { userFunctions: t });
    return n.ok
      ? { tree: n.tree, error: null, blank: !1 }
      : {
          tree: null,
          error:
            n.error.code === `point-arity` || /,/.test(e)
              ? cn(`syntax`, sn.comma)
              : cn(n.error.code, O(n.error.code, [])),
          blank: !1,
        };
  }
  function un(e, t) {
    let n = e.columns ?? [];
    return {
      source: e,
      headers: n.map((e) => ln(e.latex, t)),
      cells: n.map((e) => e.values.map((e) => ln(e, t))),
    };
  }
  let dn = (e) => e !== null && e.kind === `id`,
    fn = (e) => !tn.includes(e);
  function pn(e, t) {
    return e.headers.map((e, n) =>
      !dn(e.tree) || (n > 0 && t.has(e.tree.name)) ? null : e.tree.name
    );
  }
  function mn(e, t, n) {
    let r = new Set(t.filter((e) => e !== null)),
      i = [];
    return (
      t.forEach((t, a) => {
        if (t === null || !fn(t)) return;
        let o = [...e.cells[a]];
        for (; o.length > 0 && o[o.length - 1].blank; ) o.pop();
        let s = o.map((e) => (hn(e, r, n) ? e.tree : on)),
          c = an,
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
  function hn(e, t, n) {
    return e.tree !== null && gn(e, t, n) === null;
  }
  function gn(e, t, n) {
    if (e.error !== null || e.tree === null) return e.error;
    for (let { name: r } of k(e.tree)) {
      if (t.has(r)) return cn(`dependency`, sn.ownColumns);
      if (!n.has(r) && !tn.includes(r)) return cn(`dependency`, sn.undefinedName(D(r)), [D(r)]);
    }
    return null;
  }
  function _n(e, t, n, r) {
    let i = new Set(t.filter((e) => e !== null));
    return {
      columns: e.headers.map((a, o) => {
        let s = e.cells[o].map((e) => gn(e, i, n)),
          c = e.cells[o].map((e, t) => (s[t] === null ? e.tree : null)),
          l = e.source.columns?.[o]?.hidden === !0,
          u = { index: o, tree: a.tree, cellErrors: s, cells: c, hidden: l };
        if (o === 0) {
          if (!dn(a.tree))
            return { ...u, role: `error`, name: null, error: cn(`syntax`, sn.firstHeader) };
        } else if (a.blank) return { ...u, role: `blank`, name: null, error: null };
        if (a.error !== null) return { ...u, role: `error`, name: null, error: a.error };
        let d = t[o];
        if (d !== null && r.has(d)) {
          let e = D(d);
          return {
            ...u,
            role: `error`,
            name: d,
            error: cn(`duplicate-definition`, O(`duplicate-definition`, [e]), [e]),
          };
        }
        return d === null
          ? { ...u, role: `computed`, name: null, error: null }
          : { ...u, role: o === 0 ? `variable` : `data`, name: d, error: null };
      }),
      rows: Math.max(0, ...e.cells.map((e) => e.length)),
    };
  }
  let vn = (e) => (e.kind === `mul` ? [...vn(e.left), ...vn(e.right)] : [e]),
    yn = (e) => (e.kind === `add` ? [...yn(e.left), ...yn(e.right)] : [e]);
  function bn(e, t, n) {
    let r = (e) => (e.kind === `id` ? t.indexOf(e.name) : -1),
      i = (e) => e.kind === `id` && e.name === n,
      a = (e) => (e.kind === `num` && e.value > 0 && e.value !== 1 ? e.value : null),
      o = (e) => {
        let t = vn(e);
        if (t.length !== 2) return -1;
        let [n, a] = i(t[0]) ? [t[1], t[0]] : [t[0], t[1]];
        return i(a) ? r(n) : -1;
      },
      s = (...e) => e.every((e) => e >= 0) && new Set(e).size === e.length && e.length === t.length,
      c = vn(e);
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
        n = yn(e.right);
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
    let l = yn(e);
    if (l.length === 2)
      for (let [e, t] of [
        [l[0], l[1]],
        [l[1], l[0]],
      ]) {
        let n = r(e),
          a = vn(t);
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
  let xn = { start: 0, end: 0 },
    Sn = (e) => ({ code: e, message: O(e, []), names: [], span: null }),
    Cn = (e) => [...new Set(e)],
    wn = (e, t) => `${e}#~${t}`;
  function Tn(e) {
    let t = e.indexOf(`#~`);
    return t < 0 ? null : e.slice(0, t);
  }
  function En(e, t, n, r) {
    let i = e.filter((e) => e.error === null && e.tree?.kind === `sim`),
      a = new Set(t),
      o = /* @__PURE__ */ new Map();
    for (let e of i) {
      let t = 1;
      for (; a.has(`e_{${t}}`); ) t++;
      (a.add(`e_{${t}}`), o.set(e.source.id, `e_{${t}}`));
    }
    let s = /* @__PURE__ */ new Set([...n, ...o.values()]),
      c = /* @__PURE__ */ new Map();
    for (let e of i) {
      let n = e.tree,
        i = Cn(k(n.right).map((e) => e.name));
      if (i.includes(`x`) || i.includes(`y`)) {
        c.set(e.source.id, { analysis: null, error: Sn(`regression-predictor`) });
        continue;
      }
      let a = i.filter((e) => !rn(e, r) && !t.has(e) && !s.has(e));
      if (a.length > 8) {
        c.set(e.source.id, { analysis: null, error: Sn(`regression-params`) });
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
          logForm: l.length === 0 ? null : bn(n.right, a, l[0]),
          logMode: e.source.logMode === !0,
        },
      });
    }
    return c;
  }
  function Dn(e) {
    let t = /* @__PURE__ */ new Set([...e.params, e.residual]),
      n = {
        kind: `list`,
        items: Cn([e.observed, e.model].flatMap((e) => k(e).map((e) => e.name)))
          .filter((e) => !t.has(e) && e !== `x` && e !== `y`)
          .map((e) => ({ kind: `id`, name: e, span: xn })),
        span: xn,
      };
    return [...e.params, e.residual].map((t) => {
      let r = { name: t, type: `value`, params: [], body: n, span: xn };
      return {
        source: { id: wn(e.rowId, t), latex: ``, hidden: !0 },
        empty: !1,
        tree: {
          kind: `rel`,
          ops: [`=`],
          operands: [{ kind: `id`, name: t, span: xn }, n],
          span: xn,
        },
        error: null,
        head: r,
      };
    });
  }
  function On(e) {
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
  let kn = new Map(
    s.flatMap((e) =>
      e.category !== null && d(e.name) && e.arity !== `variadic` ? [[e.name, e.arity]] : []
    )
  );
  function An(e) {
    return e.length <= 1
      ? e.map(String).join(``)
      : `${e.slice(0, -1).join(`, `)} or ${e[e.length - 1]}`;
  }
  function jn(e, t) {
    let n = e.map((e) => Ht(e.latex)),
      r = Mn(e, t);
    return e.map((e, i) => Pn(e, n[i], r, t));
  }
  function Mn(e, t) {
    return new Set(
      e.flatMap((e) => {
        let n = Ht(e.latex);
        return n !== null && !rn(n.name, t) ? [n.name] : [];
      })
    );
  }
  function Nn(e) {
    if (e.head !== null)
      return { name: e.head.name, type: e.head.type, params: [...e.head.params] };
    let t = e.error === null ? null : Ht(e.source.latex);
    return t === null ? null : { name: t.name, type: `function`, params: t.params };
  }
  function Pn(e, t, n, r) {
    let i = { source: e, empty: !1, tree: null, error: null, head: null };
    if (le(e.latex).trim() === ``) return { ...i, empty: !0 };
    if (t !== null && t.params.length > 8) return { ...i, error: A(`too-many-params`, [], null) };
    let a = Kt(e.latex, { userFunctions: n });
    if (!a.ok) {
      let { code: e, feature: t, span: n } = a.error;
      return { ...i, error: A(e, t === void 0 ? [] : [t], n) };
    }
    let o = a.tree;
    return t !== null && rn(t.name, r)
      ? { ...i, tree: o, error: A(`reserved-name`, [D(t.name)], null) }
      : { ...i, tree: o, ...Fn(o, t, r) };
  }
  function Fn(e, t, n) {
    if (e.kind !== `rel` || e.ops.length !== 1 || e.ops[0] !== `=`)
      return { head: null, error: null };
    let [r, i] = e.operands;
    if (r.kind === `call` && t !== null && r.name === t.name) {
      let e = t.params,
        n = e.find((t, n) => e.indexOf(t) !== n),
        a = { name: r.name, type: `function`, params: e, body: i, span: r.span },
        o = n === void 0 ? null : [D(n)];
      return { head: a, error: o === null ? null : A(`duplicate-definition`, o, null) };
    }
    if (r.kind === `const`)
      return { head: In(r.name, i, r.span), error: A(`reserved-name`, [D(r.name)], null) };
    if (r.kind !== `id` || r.name === `x` || r.name === `y`) return { head: null, error: null };
    if (r.name === `r` || r.name === `\\theta`)
      return { head: null, error: A(`unsupported`, [D(r.name)], r.span) };
    let a = In(r.name, i, r.span);
    return rn(r.name, n)
      ? { head: a, error: A(`reserved-name`, [D(r.name)], null) }
      : { head: a, error: null };
  }
  function In(e, t, n) {
    return { name: e, type: `value`, params: [], body: t, span: n };
  }
  function A(e, t, n) {
    return { code: e, message: O(e, t), names: t, span: n };
  }
  let Ln = [`r`, `\\theta`];
  function Rn(e, t, n) {
    let r = t(e),
      i = e.kind === `rel` ? { ops: [...e.ops] } : null,
      a = [...r].find((e) => Ln.includes(e));
    if (a !== void 0) return Gn(`unsupported`, [D(a)], i);
    if (e.kind === `point` || Un(e))
      return n
        ? Gn(`unsupported`, [`t`], i)
        : r.has(`x`) || r.has(`y`)
          ? Gn(`point-coordinates`, [], i)
          : j(`point`, { kind: `point` });
    if (e.kind === `rel`) return { ...(e.ops[0] === `=` ? Bn(e, r, t) : Hn(e, r)), relation: i };
    let o = r.has(`x`),
      s = r.has(`y`);
    return o && s
      ? Gn(`mixed-variables`, [], i)
      : o
        ? j(`curve-y`, { kind: `explicit`, independent: `x`, expr: e })
        : s
          ? j(`curve-x`, { kind: `explicit`, independent: `y`, expr: e })
          : j(`value`, null);
  }
  function zn(e, t, n) {
    return t.length === 1
      ? {
          kind: `explicit`,
          independent: `x`,
          expr: { kind: `call`, name: e, args: [{ kind: `id`, name: `x`, span: n }], span: n },
        }
      : null;
  }
  function Bn(e, t, n) {
    let [r, i] = e.operands;
    for (let [t, a] of [
      [`y`, `x`],
      [`x`, `y`],
    ]) {
      let o = Vn(t, r, i, n);
      if (o === null) continue;
      let [s, c] = o;
      if (n(c).has(a))
        return j(t === `y` ? `curve-y` : `curve-x`, { kind: `explicit`, independent: a, expr: c });
      let l = { kind: `sub`, left: s, right: c, span: e.span };
      return t === `y`
        ? j(`horizontal-lines`, { kind: `lines`, orientation: `horizontal`, expr: l })
        : j(`vertical-lines`, { kind: `lines`, orientation: `vertical`, expr: l });
    }
    let a = { kind: `sub`, left: r, right: i, span: e.span };
    return t.has(`x`) && t.has(`y`)
      ? j(`implicit`, { kind: `implicit`, expr: a })
      : t.has(`x`)
        ? j(`vertical-lines`, { kind: `lines`, orientation: `vertical`, expr: a })
        : t.has(`y`)
          ? j(`horizontal-lines`, { kind: `lines`, orientation: `horizontal`, expr: a })
          : j(`constant-relation`, null);
  }
  function Vn(e, t, n, r) {
    return Wn(t, e) && !r(n).has(e) ? [t, n] : Wn(n, e) && !r(t).has(e) ? [n, t] : null;
  }
  function Hn(e, t) {
    let n = e.ops.filter((e) => e !== `=`),
      r = e.operands;
    return t.size > 0
      ? j(`region`, { kind: `region`, operands: r, ops: n })
      : j(`constant-relation`, { kind: `constant-region`, operands: r, ops: n });
  }
  function Un(e) {
    return (
      e.kind === `list` &&
      e.range !== !0 &&
      e.items.length > 0 &&
      e.items.every((e) => e.kind === `point`)
    );
  }
  function Wn(e, t) {
    return e.kind === `id` && e.name === t;
  }
  function j(e, t) {
    return { kind: e, graph: t, error: null, relation: null };
  }
  function Gn(e, t, n) {
    return { kind: `error`, graph: null, error: { code: e, names: t }, relation: n };
  }
  function Kn(e, t, n) {
    let r = {
      id: e.source.id,
      kind: `empty`,
      tree: e.tree,
      error: null,
      defines: Nn(e),
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
      o = a === null ? [] : Zn(a, i, n);
    if (e.error !== null || e.tree === null || a === null)
      return { ...r, kind: `error`, error: e.error, uses: o };
    if (e.tree.kind === `sim`) return { ...r, kind: `regression`, uses: o };
    let s = qn(e, a, i, t);
    if (s !== null) return { ...r, kind: `error`, error: s, uses: o };
    let c =
      e.head === null
        ? Rn(e.tree, (e) => t.coordinatesOf(e, []), $n(e.tree, t))
        : Qn(e.head, e.tree.span, t);
    if (c.error !== null) {
      let { code: e, names: n } = c.error,
        s = e === `unsupported` ? er(a, n[0], i, t) : null;
      return { ...r, kind: `error`, error: Xn(e, n, s), uses: o };
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
  function qn(e, t, n, r) {
    let { head: i } = e;
    if (i !== null && r.duplicates.has(i.name))
      return Xn(`duplicate-definition`, [D(i.name)], null);
    if (i !== null && r.cyclicRows.has(e.source.id)) return Xn(`cycle`, [D(i.name)], null);
    for (let e of Yn(t)) {
      let t = Jn(e.name, r);
      if (t !== null && !t.includes(e.args.length)) {
        let n = String(e.args.length);
        return Xn(`arity`, [D(e.name), An(t), n], e.span);
      }
    }
    let a = k(t).find(({ name: e }) => !n.includes(e) && r.duplicates.has(e));
    return a === void 0 ? null : Xn(`dependency`, [D(a.name)], a.span);
  }
  function Jn(e, t) {
    if (u(e)) return kn.get(e) ?? null;
    let n = t.functionArity(e);
    return n === null ? null : [n];
  }
  function Yn(t) {
    let n = [],
      r = [t];
    for (let t = r.pop(); t !== void 0; t = r.pop())
      (t.kind === `call` && n.push(t), r.push(...e(t)));
    return n.sort((e, t) => e.span.start - t.span.start);
  }
  function Xn(e, t, n) {
    return { code: e, message: O(e, t), names: t, span: n };
  }
  function Zn(e, t, n) {
    let r = /* @__PURE__ */ new Set();
    for (let { name: i } of k(e)) !t.includes(i) && !rn(i, n) && r.add(i);
    return [...r];
  }
  function Qn(e, t, n) {
    let r = n.coordinatesOf(e.body, e.params),
      i = { kind: `definition`, graph: null, error: null, relation: null };
    if (e.type === `value`) return r.size > 0 ? { ...i, kind: `dependent-definition` } : i;
    let a = [...r].find((e) => Ln.includes(e));
    return a === void 0
      ? { ...i, kind: `function-definition`, graph: zn(e.name, e.params, t) }
      : { ...i, kind: `error`, error: { code: `unsupported`, names: [D(a)] } };
  }
  function $n(e, t) {
    return e.kind === `point` && !t.isDefined(`t`) && k(e).some((e) => e.name === `t` && e.inPoint);
  }
  function er(e, t, n, r) {
    for (let i of k(e)) {
      if (n.includes(i.name)) continue;
      let e = { kind: `id`, name: i.name, span: i.span };
      if ([i.name, ...r.coordinatesOf(e, [])].some((e) => D(e) === t)) return i.span;
    }
    return null;
  }
  function tr(e, t, n = /* @__PURE__ */ new Set()) {
    let r = /* @__PURE__ */ new Set(),
      i = /* @__PURE__ */ new Set();
    for (let e of t) tn.includes(e) || r.add(e);
    let a = { names: r, isList: (e, t) => nr(e, t, r, i) };
    for (let t = !0; t; ) {
      t = !1;
      for (let o of e) {
        let e = o.type === `value` ? r : i;
        e.has(o.name) || n.has(o.name) || (a.isList(o.body, o.params) && (e.add(o.name), (t = !0)));
      }
    }
    return a;
  }
  function nr(t, n, r, i) {
    let a = [t];
    for (let t = a.pop(); t !== void 0; t = a.pop())
      switch (t.kind) {
        case `list`:
          return !0;
        case `id`:
          if (!n.includes(t.name) && r.has(t.name)) return !0;
          break;
        case `call`:
          if (!u(t.name) && i.has(t.name)) return !0;
          a.push(...t.args);
          break;
        default:
          a.push(...e(t));
      }
    return !1;
  }
  function rr(e, t, n) {
    let r = ar(e);
    for (let e of r) {
      let r = e.items.find((e) => n.isList(e, t));
      if (r !== void 0) return { code: `nested-list`, names: [], span: r.span };
    }
    for (let e of r) {
      if (e.range !== !0) continue;
      let t = or(e.items);
      if (t !== null) return { code: t, names: [], span: e.span };
    }
    return null;
  }
  function ir(t, n, r) {
    if (!r.isList(t, n)) return null;
    let i = null,
      a = [t];
    for (let t = a.pop(); t !== void 0; t = a.pop()) {
      if (!r.isList(t, n)) continue;
      let o = t.kind === `list` ? [] : e(t).filter((e) => r.isList(e, n));
      o.length > 0 ? a.push(...o) : (i === null || t.span.start < i.start) && (i = t.span);
    }
    return { code: `unsupported`, names: [Fe.listCurves], span: i };
  }
  function ar(t) {
    let n = [],
      r = [t];
    for (let t = r.pop(); t !== void 0; t = r.pop())
      (t.kind === `list` && n.push(t), r.push(...e(t)));
    return n.sort((e, t) => e.span.start - t.span.start);
  }
  function or(e) {
    let t = e.map(M);
    if (!t.every(Number.isFinite)) return null;
    let [n, r, i] = t.length === 2 ? [t[0], NaN, t[1]] : t,
      a = t.length === 2 ? (i < n ? -1 : 1) : r - n;
    return a === 0
      ? `range-step`
      : Math.floor((i - n) / a + 1e-9) + 1 <= 1e4
        ? null
        : `list-too-long`;
  }
  function M(e) {
    switch (e.kind) {
      case `num`:
        return e.value;
      case `neg`:
        return -M(e.arg);
      case `add`:
        return M(e.left) + M(e.right);
      case `sub`:
        return M(e.left) - M(e.right);
      case `mul`:
        return M(e.left) * M(e.right);
      case `div`:
        return M(e.left) / M(e.right);
      default:
        return NaN;
    }
  }
  function sr(e) {
    let t = new Set(e.flatMap((e) => Nn(e)?.name ?? [])),
      n = e.flatMap((e) =>
        e.head !== null && e.error === null ? [{ id: e.source.id, head: e.head }] : []
      ),
      r = cr(n.map(({ head: e }) => e.name)),
      i = lr(n.filter(({ head: e }) => !r.has(e.name))),
      a = ur(i),
      o = new Map(
        i.rows.flatMap(({ id: e, head: t }) =>
          t.type === `function` && !a.has(e) ? [[t.name, t.params.length]] : []
        )
      ),
      s = fr(n.map(({ head: e }) => e));
    return {
      isDefined: (e) => t.has(e),
      coordinatesOf(e, t) {
        let n = /* @__PURE__ */ new Set();
        for (let { name: r } of k(e))
          if (!t.includes(r)) {
            if (tn.includes(r)) n.add(r);
            else for (let e of s.get(r) ?? []) n.add(e);
          }
        return n;
      },
      duplicates: r,
      cyclicRows: a,
      valueOrder: dr(i).filter((e) => !a.has(e)),
      functionArity: (e) => o.get(e) ?? null,
    };
  }
  function cr(e) {
    return new Set(e.filter((t, n) => e.indexOf(t) !== n));
  }
  function lr(e) {
    let t = new Map(e.map(({ head: e }, t) => [e.name, t]));
    return {
      rows: e,
      edges: e.map(({ head: e }) => {
        let n = /* @__PURE__ */ new Set();
        for (let { name: r } of k(e.body)) {
          let i = e.params.includes(r) ? void 0 : t.get(r);
          i !== void 0 && n.add(i);
        }
        return [...n].sort((e, t) => e - t);
      }),
    };
  }
  function ur({ rows: e, edges: t }) {
    let n = e.map(() => -1),
      r = e.map(() => -1),
      i = e.map(() => !1),
      a = [],
      o = /* @__PURE__ */ new Set(),
      s = 0,
      c = (l) => {
        ((n[l] = r[l] = s), (s += 1), a.push(l), (i[l] = !0));
        for (let e of t[l])
          n[e] === -1
            ? (c(e), (r[l] = Math.min(r[l], r[e])))
            : i[e] && (r[l] = Math.min(r[l], n[e]));
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
  function dr({ rows: e, edges: t }) {
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
  function fr(e) {
    let t = /* @__PURE__ */ new Map(),
      n = /* @__PURE__ */ new Map();
    for (let r of e) {
      let e = t.get(r.name) ?? /* @__PURE__ */ new Set(),
        i = n.get(r.name) ?? /* @__PURE__ */ new Set();
      for (let { name: t } of k(r.body))
        r.params.includes(t) || (tn.includes(t) ? e.add(t) : i.add(t));
      (t.set(r.name, e), n.set(r.name, i));
    }
    for (let e = !0; e; ) {
      e = !1;
      for (let [r, i] of t)
        for (let a of n.get(r) ?? [])
          for (let n of t.get(a) ?? []) i.has(n) || (i.add(n), (e = !0));
    }
    return t;
  }
  let pr = /* @__PURE__ */ new Set([`definition`, `dependent-definition`, `function-definition`]);
  function mr(e, t) {
    let n = jn(e, t),
      r = Mn(e, t),
      i = e.flatMap((e, t) => (e.columns === void 0 ? [] : [{ k: t, table: un(e, r) }])),
      a = new Set(n.flatMap((e) => Nn(e)?.name ?? [])),
      o = i.map(({ table: e }) => pn(e, a)),
      s = i.flatMap(({ table: e }, t) =>
        o[t].filter((t, n) => t !== null && (n === 0 || yr(e, n)))
      ),
      c = o.flat().filter((e) => e !== null),
      l = tr(hr(n), c),
      u = n.map((e) => gr(e, l)),
      d = En(
        u,
        /* @__PURE__ */ new Set([...a, ...s]),
        /* @__PURE__ */ new Set([...s, ...l.names]),
        t
      ),
      f = [...d.values()].flatMap((e) =>
        e.analysis === null ? [] : [...e.analysis.params, e.analysis.residual]
      ),
      p = /* @__PURE__ */ new Set([...a, ...f]),
      m = i.map(({ table: e }) => pn(e, p)),
      h = /* @__PURE__ */ new Set([...p, ...m.flat().filter((e) => e !== null)]),
      g = i.flatMap(({ table: e }, t) => mn(e, m[t], h)),
      _ = [...d.values()].flatMap((e) => (e.analysis === null ? [] : Dn(e.analysis))),
      v = [...u, ...g, ..._],
      y = sr(v),
      b = v.map((e) => Kn(e, y, t)),
      ee = tr(hr(v), [], new Set(f));
    (u.forEach((e, t) => {
      let n = d.get(e.source.id);
      n === void 0 ? (b[t] = vr(b[t], e, ee)) : (b[t] = br(b[t], n, e.source.hidden));
    }),
      i.forEach(({ k: t, table: n }, r) => {
        b[t] = xr(e[t], _n(n, m[r], h, y.duplicates), n);
      }));
    let te = /* @__PURE__ */ new Set(),
      ne = /* @__PURE__ */ new Map();
    return (
      v.forEach(({ head: e }, t) => {
        let { id: n, kind: r, error: i } = b[t];
        if (
          e === null ||
          i !== null ||
          !pr.has(r) ||
          (te.add(n), r === `definition` || ne.has(e.name))
        )
          return;
        let a = r === `function-definition` ? e.params : [];
        ne.set(e.name, { name: e.name, params: a, body: e.body, rowId: n });
      }),
      {
        rows: b.slice(0, u.length),
        byId: new Map(b.map((e) => [e.id, e])),
        valueOrder: y.valueOrder.filter((e) => te.has(e)),
        functions: ne,
      }
    );
  }
  function hr(e) {
    return e.flatMap((e) => (e.head !== null && e.error === null ? [e.head] : []));
  }
  function gr(e, t) {
    if (e.error !== null || e.tree === null) return e;
    let n = rr(e.head?.body ?? e.tree, e.head?.params ?? [], t);
    if (n === null) return e;
    let { code: r, names: i, span: a } = n;
    return { ...e, error: { code: r, message: O(r, i), names: i, span: a } };
  }
  let _r = /* @__PURE__ */ new Set([
    `curve-y`,
    `curve-x`,
    `implicit`,
    `vertical-lines`,
    `horizontal-lines`,
    `region`,
    `constant-relation`,
  ]);
  function vr(e, t, n) {
    if (e.error !== null || t.tree === null) return e;
    let r = t.head,
      i = e.kind === `function-definition` && r !== null && r.params.length === 1;
    if (!i && !_r.has(e.kind)) return e;
    let a = i ? ir(r.body, r.params, n) : ir(t.tree, [], n);
    if (a === null) return e;
    let { code: o, names: s, span: c } = a;
    return {
      ...e,
      kind: `error`,
      error: { code: o, message: O(o, s), names: s, span: c },
      chips: [],
      complexHint: !1,
      isGraphable: !1,
      relation: null,
      graph: null,
    };
  }
  function yr(e, t) {
    return e.cells[t].some((e) => !e.blank);
  }
  function br(e, t, n) {
    if (t.analysis === null) return { ...e, kind: `error`, error: t.error };
    let r = On(t.analysis),
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
  function xr(e, t, n) {
    let r = /* @__PURE__ */ new Set();
    for (let e of [...n.headers, ...n.cells.flat()])
      if (e.tree !== null) for (let { name: t } of k(e.tree)) r.add(t);
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
  function Sr(e) {
    return new Set([...e].flatMap(([e, t]) => (t.params.length > 0 ? [e] : [])));
  }
  var Cr = class extends Error {
    constructor(e) {
      (super(e === null ? `deadline exceeded` : `deadline exceeded for row ${e}`),
        (this.name = `DeadlineExceeded`),
        (this.rowId = e));
    }
  };
  let wr = Object.freeze({ check() {} }),
    Tr = {
      undefined: `undefined`,
      scientific: (e, t) => `${e}×10^${t}`,
      point: (e, t) => `(${e}, ${t})`,
      list: (e, t) => `[${[...e, ...(t ? [`…`] : [])].join(`, `)}]`,
    };
  function Er(e) {
    return e.includes(`.`) ? e.replace(/0+$/, ``).replace(/\.$/, ``) : e;
  }
  function Dr(e, t) {
    if (!Number.isFinite(e)) return t.undefined;
    let n = Number(e.toPrecision(12));
    if (n === 0) return `0`;
    let r = Math.abs(n);
    if (r >= 1e-6 && r < 0xe8d4a51000) return String(n);
    let [i, a] = n.toExponential(11).split(`e`);
    return t.scientific(Er(i), String(Number(a)));
  }
  function Or(e) {
    return Dr(e, Tr);
  }
  let N = Object.freeze({ type: `undefined` });
  function P(e) {
    return Number.isFinite(e) ? { type: `number`, value: e } : N;
  }
  function F(e, t) {
    return !Number.isFinite(e) || !Number.isFinite(t)
      ? N
      : t === 0
        ? { type: `number`, value: e }
        : { type: `complex`, value: { re: e, im: t } };
  }
  let kr = (e) =>
    e !== void 0 && e.type === `number` && Number.isFinite(e.value) ? e.value : null;
  function Ar(e, t, n) {
    let r = e.table,
      i = r.rows,
      a = (e) => {
        let a = r.columns[e],
          o = a.name === null ? void 0 : t.values.get(a.name);
        return o !== void 0 && o.type === `list`
          ? Array.from({ length: i }, (e, t) => kr(o.value[t]))
          : Array.from({ length: i }, (e, r) => {
              let i = a.cells[r] ?? null;
              return i === null ? null : kr(G(i, t)({}, n));
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
        let l = G(e.tree, t),
          u = k(e.tree).flatMap(({ name: e }) => {
            let n = e === c ? void 0 : t.values.get(e);
            return n !== void 0 && n.type === `list` ? [[e, n.value]] : [];
          }),
          d = s.map((e, t) => {
            if (e === null) return null;
            let r = { [c]: P(e) };
            for (let [e, n] of u) r[e] = n[t] ?? P(NaN);
            return kr(l(r, n));
          });
        return { values: d, display: d.map((e) => (e === null ? null : Or(e))) };
      }),
    };
  }
  function jr(e, t, n, r) {
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
    Mr(o, a, n, s);
    let c = new Float64Array(n * n);
    for (let e = 0; e < n; e++) for (let t = e; t < n; t++) c[e * n + t] = o[e * n + t];
    let l = s.subarray(0, n),
      { u, sigma: d, v: f } = Nr(c, n),
      p = Math.max(0, ...d),
      m = new Float64Array(n);
    for (let e = 0; e < n; e++) {
      if (!(d[e] > 1e-12 * p)) continue;
      let t = 0;
      for (let r = 0; r < n; r++) t += u[r * n + e] * l[r];
      let r = t / d[e];
      for (let t = 0; t < n; t++) m[t] += f[t * n + e] * r;
    }
    for (let e = 0; e < n; e++) m[e] /= i[e];
    return m;
  }
  function Mr(e, t, n, r) {
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
  function Nr(e, t) {
    let n = Float64Array.from(e),
      r = new Float64Array(t * t);
    for (let e = 0; e < t; e++) r[e * t + e] = 1;
    for (let e = 0; e < 60; e++) {
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
          if (c === 0 || Math.abs(c) <= 2220446049250313e-31 * Math.sqrt(o * s)) continue;
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
  let Pr = 1e-10;
  function Fr(e, t, n, r) {
    let i = 0;
    for (let a = 0; a < n.length; a++) ((r[a] = n[a] - e(t, a)), (i += r[a] * r[a]));
    return Number.isFinite(i) ? i : 1 / 0;
  }
  function Ir(e, t, n, r = {}) {
    let i = t.length,
      a = n.length,
      o = r.maxIterations ?? 200,
      s = Float64Array.from(n),
      c = new Float64Array(i),
      l = new Float64Array(i),
      u = Fr(e, s, t, c),
      d = -1,
      f = !1,
      p = 0,
      m = new Float64Array(i * a);
    for (; p < o && Number.isFinite(u); p++) {
      for (let t = 0; t < a; t++) {
        let n = 606e-8 * Math.max(1, Math.abs(s[t])),
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
      for (let o = 0; o < 40; o++) {
        let o = new Float64Array((i + a) * a),
          p = new Float64Array(i + a);
        (o.set(m), p.set(c));
        let h = Math.sqrt(d);
        for (let e = 0; e < a; e++) o[(i + e) * a + e] = h * n[e];
        let g = jr(o, i + a, a, p),
          _ = Float64Array.from(s, (e, t) => e + g[t]),
          v = Fr(e, _, t, l);
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
            (n < 1e-12 || Math.sqrt(e) < Pr * (Math.sqrt(t) + Pr)) && (f = !0));
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
  let Lr = [1, 0.1, -1, 0, 10],
    Rr = (e, t) => ({
      ok: !1,
      error: `We couldn't find any region where this model is defined.`,
      params: [],
      r2: null,
      r: null,
      rmse: null,
      residuals: [],
      logMode: { available: e, on: t },
      approximate: !1,
    }),
    zr = (e) => {
      let t = 0;
      for (let n = 0; n < e.length; n++) t += e[n];
      return t / e.length;
    };
  function Br(e, t) {
    let n = zr(e),
      r = zr(t),
      i = 0,
      a = 0,
      o = 0;
    for (let s = 0; s < e.length; s++)
      ((i += (e[s] - n) * (t[s] - r)), (a += (e[s] - n) ** 2), (o += (t[s] - r) ** 2));
    let s = a > 0 ? i / a : 0,
      c = a > 0 && o > 0 ? i / Math.sqrt(a * o) : null;
    return { slope: s, intercept: r - s * n, r: c, ssTotal: o };
  }
  function Vr(e, t, n) {
    let r = e.kind === `power` || e.kind === `logarithmic`,
      i = e.kind !== `logarithmic`;
    for (let e = 0; e < t.length; e++) if ((r && !(t[e] > 0)) || (i && !(n[e] > 0))) return null;
    return {
      u: Float64Array.from(t, (e) => (r ? Math.log(e) : e)),
      v: Float64Array.from(n, (e) => (i ? Math.log(e) : e)),
    };
  }
  function Hr(e, t, n) {
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
  function Ur(e, t, n) {
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
        if (!(Math.abs(s - t) <= 1e-9 * Math.max(1, Math.abs(s), Math.abs(t)))) return null;
      }
    }
    return { f0: i, cols: a };
  }
  function Wr(e) {
    let { params: t, model: n, logForm: r } = e,
      i = t.length,
      a = [e.observed, e.predictor, ...(e.others ?? [])],
      o = Math.min(...a.map((e) => e.length)),
      s = Float64Array.from(e.observed.slice(0, o)),
      c = Float64Array.from(e.predictor.slice(0, o)),
      l = r === null || o === 0 ? null : Vr(r, c, s),
      u = l !== null,
      d = u && e.logMode;
    if (o === 0 || a.some((e) => e.slice(0, o).some((e) => !Number.isFinite(e)))) return Rr(u, d);
    let f = new Float64Array(i),
      p = !1,
      m = !1,
      h = l === null ? null : Br(l.u, l.v);
    if (d && h !== null) f = Hr(r, i, h);
    else if (i > 0) {
      let e = Ur(n, o, i);
      if (e !== null) {
        let t = new Float64Array(o * i);
        for (let n = 0; n < o; n++) for (let r = 0; r < i; r++) t[n * i + r] = e.cols[r][n];
        ((f = jr(
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
        let e = Lr.map((e) => new Float64Array(i).fill(e));
        h !== null && e.push(Hr(r, i, h));
        let t = null;
        for (let r of e) {
          let e = Ir(n, s, r);
          Number.isFinite(e.sse) && (t === null || e.sse < t.sse) && (t = e);
        }
        if (t === null) return Rr(u, d);
        ((f = t.params), (p = !t.converged));
      }
    }
    let g = Float64Array.from({ length: o }, (e, t) => n(f, t));
    if (!g.every(Number.isFinite) || !f.every(Number.isFinite)) return Rr(u, d);
    let _ = Array.from(s, (e, t) => e - g[t]),
      v = _.reduce((e, t) => e + t * t, 0),
      y,
      b;
    if (d && h !== null && l !== null) ((y = h.r === null ? null : h.r * h.r), (b = h.r));
    else {
      let e = zr(s),
        t = s.reduce((t, n) => t + (n - e) ** 2, 0);
      ((y = o > i && t > 0 ? 1 - v / t : null), (b = m ? Br(c, s).r : null));
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
  let Gr = (e) => (e !== void 0 && e.type === `number` && Number.isFinite(e.value) ? e.value : NaN),
    Kr = (e) => (e !== void 0 && e.type === `list` ? e.value.map((e) => Gr(e)) : null),
    qr = (e) => ({
      ok: !1,
      error: O(`regression-data`, []),
      params: [],
      r2: null,
      r: null,
      rmse: null,
      residuals: [],
      logMode: { available: !1, on: !1 },
      approximate: !1,
      residualName: e.residual,
    });
  function Jr(e, t, n) {
    let r = Kr(G(e.observed, t)({}, n));
    if (r === null) return qr(e);
    let i = e.predictors.map((e) => Kr(t.values.get(e)) ?? []),
      a = G(e.model, t),
      o = {};
    return {
      ...Wr({
        observed: r,
        predictor: i[0] ?? r.map(() => 0),
        others: i.slice(1),
        params: e.params,
        model: (t, r) => (
          n.check(),
          e.params.forEach((e, n) => (o[e] = P(t[n]))),
          e.predictors.forEach((e, t) => (o[e] = P(i[t][r] ?? NaN))),
          Gr(a(o, n))
        ),
        logForm: e.logForm,
        logMode: e.logMode,
      }),
      residualName: e.residual,
    };
  }
  function Yr(e) {
    return e.ok
      ? [
          ...e.params.map(({ name: e, value: t }) => [e, P(t)]),
          [e.residualName, { type: `list`, value: e.residuals.map((e) => P(e)) }],
        ]
      : [];
  }
  let Xr = Object.freeze({ re: 0, im: 1 }),
    Zr = Math.PI / 2,
    Qr = Object.freeze({ re: NaN, im: NaN }),
    $r = Object.freeze({ re: 1, im: 0 });
  function ei(e, t) {
    return { re: e.re + t.re, im: e.im + t.im };
  }
  function I(e, t) {
    return { re: e.re - t.re, im: e.im - t.im };
  }
  function ti(e, t) {
    return { re: e.re * t.re - e.im * t.im, im: e.re * t.im + e.im * t.re };
  }
  function L(e, t) {
    if (t.re === 0 && t.im === 0) return { ...Qr };
    if (Math.abs(t.re) >= Math.abs(t.im)) {
      let n = t.im / t.re,
        r = t.re + t.im * n;
      return { re: (e.re + e.im * n) / r, im: (e.im - e.re * n) / r };
    }
    let n = t.re / t.im,
      r = t.re * n + t.im;
    return { re: (e.re * n + e.im) / r, im: (e.im * n - e.re) / r };
  }
  function ni(e) {
    let t = Math.exp(e.re);
    return { re: t * Math.cos(e.im), im: t * Math.sin(e.im) };
  }
  function R(e) {
    if (e.re === 0 && e.im === 0) return { ...Qr };
    let t = Math.atan2(e.im, e.re);
    return { re: Math.log(Math.hypot(e.re, e.im)), im: t === -Math.PI ? Math.PI : t };
  }
  function ri(e) {
    let t = Math.sqrt(Math.abs(e.re) / 2 + Math.hypot(e.re, e.im) / 2);
    return t === 0
      ? { re: 0, im: e.im }
      : e.re >= 0
        ? { re: t, im: e.im / (2 * t) }
        : { re: Math.abs(e.im) / (2 * t), im: e.im < 0 ? -t : t };
  }
  function ii(e) {
    return { re: Math.sin(e.re) * Math.cosh(e.im), im: Math.cos(e.re) * Math.sinh(e.im) };
  }
  function ai(e) {
    return { re: Math.cos(e.re) * Math.cosh(e.im), im: -Math.sin(e.re) * Math.sinh(e.im) };
  }
  function oi(e) {
    return L(ii(e), ai(e));
  }
  function si(e) {
    if (e.im === 0 && Math.abs(e.re) > 1)
      return { re: Math.sign(e.re) * Zr, im: Math.acosh(Math.abs(e.re)) };
    let t = R(ei(ti(Xr, e), ri(I($r, ti(e, e)))));
    return { re: t.im, im: -t.re };
  }
  function ci(e) {
    return I({ re: Zr, im: 0 }, si(e));
  }
  function li(e) {
    if (e.re === 0 && Math.abs(e.im) > 1) return { re: Zr, im: Math.atanh(1 / e.im) };
    let t = ti(Xr, e),
      n = I(R(I($r, t)), R(ei($r, t)));
    return { re: -n.im / 2, im: n.re / 2 };
  }
  function ui(e, t) {
    return e.re === 0 && e.im === 0
      ? t.re === 0 && t.im === 0
        ? { ...$r }
        : t.re > 0
          ? { re: 0, im: 0 }
          : { ...Qr }
      : ni(ti(t, R(e)));
  }
  let di = Object.freeze({ re: 1, im: 0 }),
    fi = Math.PI / 2;
  function pi(e) {
    return { re: Math.sinh(e.re) * Math.cos(e.im), im: Math.cosh(e.re) * Math.sin(e.im) };
  }
  function mi(e) {
    return { re: Math.cosh(e.re) * Math.cos(e.im), im: Math.sinh(e.re) * Math.sin(e.im) };
  }
  function hi(e) {
    return L(pi(e), mi(e));
  }
  let gi = (e) => L(di, e);
  function _i(e) {
    let t = si({ re: -e.im, im: e.re });
    return { re: t.im, im: -t.re };
  }
  function vi(e) {
    return R(ei(e, ti(ri(ei(e, di)), ri(I(e, di)))));
  }
  function yi(e) {
    if (e.im === 0 && Math.abs(e.re) > 1) return { re: Math.atanh(1 / e.re), im: fi };
    let t = I(R(ei(di, e)), R(I(di, e)));
    return { re: t.re / 2, im: t.im / 2 };
  }
  function z(e, t, n = !1) {
    return { angle: `none`, extendsToComplex: n, real: (t) => e(t[0]), complex: (e) => t(e[0]) };
  }
  let bi = [
      [`sinh`, z(Math.sinh, pi)],
      [`cosh`, z(Math.cosh, mi)],
      [`tanh`, z(Math.tanh, hi)],
      [
        `csch`,
        z(
          (e) => 1 / Math.sinh(e),
          (e) => gi(pi(e))
        ),
      ],
      [
        `sech`,
        z(
          (e) => 1 / Math.cosh(e),
          (e) => gi(mi(e))
        ),
      ],
      [
        `coth`,
        z(
          (e) => 1 / Math.tanh(e),
          (e) => gi(hi(e))
        ),
      ],
      [`arcsinh`, z(Math.asinh, _i)],
      [`arccosh`, z(Math.acosh, vi, !0)],
      [`arctanh`, z(Math.atanh, yi, !0)],
      [
        `arccsch`,
        z(
          (e) => Math.asinh(1 / e),
          (e) => _i(gi(e))
        ),
      ],
      [
        `arcsech`,
        z(
          (e) => Math.acosh(1 / e),
          (e) => vi(gi(e)),
          !0
        ),
      ],
      [
        `arccoth`,
        z(
          (e) => Math.atanh(1 / e),
          (e) => yi(gi(e)),
          !0
        ),
      ],
    ],
    xi = 607 / 128,
    Si = Object.freeze([
      0.9999999999999971, 57.15623566586292, -59.59796035547549, 14.136097974741746,
      -0.4919138160976202, 3399464998481189e-20, 4652362892704858e-20, -9837447530487956e-20,
      0.0001580887032249125, -0.00021026444172410488, 0.00021743961811521265,
      -0.0001643181065367639, 8441822398385275e-20, -26190838401581408e-21, 36899182659531625e-22,
    ]),
    Ci = Math.sqrt(2 * Math.PI),
    wi = null;
  function Ti(e) {
    if (wi === null) {
      let e = [1],
        t = BigInt(1);
      for (let n = 1; n <= 170; n++) ((t *= BigInt(n)), e.push(Number(t)));
      wi = e;
    }
    return wi[e];
  }
  function Ei(e) {
    let t = e % 2;
    return t === 0 || t === 1 || t === -1 ? 0 : Math.sin(Math.PI * t);
  }
  function Di(e) {
    let t = e - 1,
      n = Si[0];
    for (let e = 1; e < Si.length; e++) n += Si[e] / (t + e);
    let r = t + xi + 0.5,
      i = r ** ((t + 0.5) / 2);
    return Ci * n * (i * Math.exp(-r)) * i;
  }
  function Oi(e) {
    if (Number.isNaN(e)) return NaN;
    if (Number.isInteger(e)) return e <= 0 || e > 171 ? NaN : Ti(e - 1);
    if (e < 0.5 && 1 - e > 171) return 0;
    let t = e < 0.5 ? Math.PI / (Ei(e) * Di(1 - e)) : Di(e);
    return Number.isFinite(t) && t !== 0 ? t : NaN;
  }
  function ki(e) {
    if (Number.isInteger(e) && e <= 0) return 0;
    let t = Oi(e);
    return Number.isNaN(t) || t === 0 ? NaN : 1 / t;
  }
  function Ai(e) {
    if (e < 0.5) {
      let t = Ei(e);
      return { log: Math.log(Math.PI / Math.abs(t)) - Ai(1 - e).log, sign: Math.sign(t) };
    }
    let t = e - 1,
      n = Si[0];
    for (let e = 1; e < Si.length; e++) n += Si[e] / (t + e);
    let r = t + xi + 0.5;
    return { log: Math.log(Ci * n) + (t + 0.5) * Math.log(r) - r, sign: 1 };
  }
  function ji(e) {
    return Oi(e + 1);
  }
  let Mi = Object.freeze({ re: NaN, im: NaN });
  function Ni(e, t = 0) {
    let n = Math.round(t);
    if (n === 0) return Math.round(e) + 0;
    let r = 10 ** n,
      i = Pi(e, n);
    return r === 0 || !Number.isFinite(r) || !Number.isFinite(i)
      ? NaN
      : Math.abs(i) >= 2 ** 52
        ? e
        : Pi(Math.round(i), -n) + 0;
  }
  function Pi(e, t) {
    let [n, r = `0`] = String(e).split(`e`);
    return Number(`${n}e${Number(r) + t}`);
  }
  let Fi = 8 * 2 ** -52;
  function Ii(e, t) {
    if (t === 0) return NaN;
    if (!Number.isInteger(e) || !Number.isInteger(t)) {
      let n = e / t;
      if (Math.abs(n) < 2 ** 52 && Math.abs(n - Math.round(n)) <= Fi * Math.abs(n)) return 0;
    }
    let n = e % t;
    return (n !== 0 && n < 0 != t < 0 ? n + t : n) + 0;
  }
  function Li(e, t, n) {
    let r = 1;
    for (let i = 0; i < t && r !== 0 && Number.isFinite(r); i++)
      r = n ? (r * (e - i)) / (i + 1) : r * (e - i);
    return r;
  }
  function Ri(e, t) {
    let n = Number.isInteger(e);
    return n && e < 0 && Number.isInteger(t) && t < 0
      ? t > e
        ? 0
        : Ri(e, e - t)
      : Number.isInteger(t) && t >= 0
        ? n && e < 0
          ? (t % 2 == 0 ? 1 : -1) * Ri(t - e - 1, t) + 0
          : n
            ? t > e
              ? 0
              : Li(e, Math.min(t, e - t), !0) + 0
            : t <= 1e3
              ? Li(e, t, !0) + 0
              : zi(e, t)
        : Oi(e + 1) * ki(t + 1) * ki(e - t + 1) + 0;
  }
  function zi(e, t) {
    let n = Ai(e + 1),
      r = Ai(t + 1),
      i = Ai(e - t + 1),
      a = n.sign * r.sign * i.sign * Math.exp(n.log - r.log - i.log);
    return Number.isFinite(a) ? a + 0 : NaN;
  }
  function Bi(e, t) {
    if (Number.isInteger(t) && t >= 0) return Li(e, t, !1) + 0;
    let n = e + 1,
      r = e - t + 1;
    return Number.isInteger(n) && n <= 0 && Number.isInteger(r) && r <= 0
      ? Vi(-n, -r) + 0
      : Oi(e + 1) * ki(e - t + 1) + 0;
  }
  function Vi(e, t) {
    let n = (e - t) % 2 == 0 ? 1 : -1;
    for (
      let r = Math.min(e, t) + 1;
      r <= Math.max(e, t) && ((n = e > t ? n / r : n * r), n !== 0 && Number.isFinite(n));
      r++
    );
    return n;
  }
  function Hi(e) {
    return { angle: `none`, extendsToComplex: !1, real: (t) => e(t[0]), complex: () => Mi };
  }
  function Ui(e) {
    return { angle: `none`, extendsToComplex: !1, real: (t) => e(t[0], t[1]), complex: () => Mi };
  }
  let Wi = [
      [`floor`, Hi((e) => Math.floor(e) + 0)],
      [`ceil`, Hi((e) => Math.ceil(e) + 0)],
      [
        `round`,
        {
          angle: `none`,
          extendsToComplex: !1,
          real: (e) => Ni(e[0], e.length === 2 ? e[1] : 0),
          complex: () => Mi,
        },
      ],
      [`sign`, Hi((e) => Math.sign(e) + 0)],
      [`mod`, Ui(Ii)],
      [`nCr`, Ui(Ri)],
      [`nPr`, Ui(Bi)],
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
    Gi = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
  function Ki(e) {
    if (!Number.isFinite(e)) return NaN;
    Gi.setFloat64(0, e);
    let t = (Gi.getUint16(0) >> 4) & 2047;
    return t === 0 ? Number.MIN_VALUE : 2 ** (t - 1075);
  }
  function qi(e) {
    if (!Number.isFinite(e)) return null;
    let t = 4 * Ki(e);
    for (let n = 1; n <= 99; n++) {
      let r = Math.round(e * n);
      if (Math.abs(e - r / n) <= t) return { p: r + 0, q: n };
    }
    return null;
  }
  function Ji(e) {
    let t = 1,
      n = e;
    for (; n.kind === `neg`; ) ((t = -t), (n = n.arg));
    if (n.kind !== `div`) return null;
    let r = Yi(n.left),
      i = Yi(n.right);
    if (r === null || i === null || i === 0) return null;
    let a = Xi(Math.abs(r), Math.abs(i)),
      o = (t * Math.sign(i) * r) / a,
      s = Math.abs(i) / a;
    return s > 99 ? null : { p: o + 0, q: s };
  }
  function Yi(e) {
    let t = e.kind === `neg`,
      n = t ? e.arg : e;
    return n.kind !== `num` || !Number.isSafeInteger(n.value) ? null : t ? -n.value : n.value;
  }
  function Xi(e, t) {
    for (; t !== 0; ) [e, t] = [t, e % t];
    return e;
  }
  function Zi(e, t, n) {
    if (Number.isNaN(e) || Number.isNaN(t)) return NaN;
    let r;
    if (e < 0 && !Number.isInteger(t)) {
      let i = n ?? qi(t);
      if (i === null || i.q > 99 || i.q % 2 == 0) return NaN;
      r = (Math.abs(i.p) % 2 == 1 ? -1 : 1) * (-e) ** +t;
    } else r = e ** +t;
    return Number.isFinite(r) ? r : NaN;
  }
  function Qi(e, t) {
    if (t === 0 || !Number.isFinite(t)) return NaN;
    if (!Number.isInteger(t)) return Zi(e, 1 / t, null);
    if (e < 0 && Math.abs(t) % 2 == 0) return NaN;
    let n = e < 0 ? -$i(-e, t) : $i(e, t);
    return Number.isFinite(n) ? n : NaN;
  }
  function $i(e, t) {
    return t === 3 ? Math.cbrt(e) : t === 2 ? Math.sqrt(e) : e ** (1 / t);
  }
  let ea = Object.freeze([
      0, 0.25881904510252074, 0.5, 0.7071067811865476, 0.8660254037844386, 0.9659258262890683, 1,
    ]),
    ta = Object.freeze([
      0, 0.2679491924311227, 0.5773502691896257, 1, 1.7320508075688772, 3.732050807568877,
    ]),
    na = 2 ** 20,
    ra = Math.PI / 2;
  function B(e) {
    return Number.isFinite(e) ? e + 0 : NaN;
  }
  function ia(e) {
    let t = Math.round((12 * e) / Math.PI);
    if (!(Math.abs(t) <= na)) return null;
    let n = (t * Math.PI) / 12;
    return Math.abs(e - n) <= 4 * Ki(n) ? 15 * t + 0 : null;
  }
  function aa(e, t, n) {
    if (n === `degrees`) return sa(e, t);
    let r = ia(t);
    if (r !== null) return sa(e, r);
    switch (e) {
      case `sin`:
        return B(Math.sin(t));
      case `cos`:
        return B(Math.cos(t));
      case `tan`:
        return B(Math.tan(t));
      case `csc`:
        return oa(1, Math.sin(t));
      case `sec`:
        return oa(1, Math.cos(t));
      case `cot`:
        return oa(Math.cos(t), Math.sin(t));
    }
  }
  function oa(e, t) {
    return t === 0 ? NaN : B(e / t);
  }
  function sa(e, t) {
    if (!Number.isFinite(t)) return NaN;
    let n = t % 360;
    n > 180 ? (n -= 360) : n <= -180 && (n += 360);
    let r = Math.round(n / 90),
      i = n - 90 * r,
      a = ((r % 4) + 4) % 4,
      o = i % 15 == 0 ? Math.abs(i) / 15 : -1;
    if (e === `tan`) return B(ca(i, a % 2 == 1, o));
    let s = (i * Math.PI) / 180,
      c = o >= 0 ? Math.sign(i) * ea[o] : Math.sin(s),
      l = o >= 0 ? ea[6 - o] : Math.cos(s),
      u = a === 0 ? c : a === 1 ? l : a === 2 ? -c : -l,
      d = a === 0 ? l : a === 1 ? -c : a === 2 ? -l : c;
    switch (e) {
      case `sin`:
        return B(u);
      case `cos`:
        return B(d);
      case `csc`:
        return oa(1, u);
      case `sec`:
        return oa(1, d);
      case `cot`:
        return oa(d, u);
    }
  }
  function ca(e, t, n) {
    if (t && e === 0) return NaN;
    if (n >= 0) return t ? -Math.sign(e) * ta[6 - n] : Math.sign(e) * ta[n];
    let r = Math.tan((e * Math.PI) / 180);
    return t ? -1 / r : r;
  }
  function la(e, t, n) {
    return fa(ua(e, t), n);
  }
  function ua(e, t) {
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
        return t === 0 ? ra : t > 0 ? Math.atan(1 / t) : Math.PI + Math.atan(1 / t);
    }
  }
  function da(e, t, n) {
    if (e === 0 && t === 0) return NaN;
    let r = Math.atan2(e, t);
    return fa(r === -Math.PI ? Math.PI : r, n);
  }
  function fa(e, t) {
    if (t === `radians`) return B(e);
    let n = (e * 180) / Math.PI,
      r = 15 * Math.round(n / 15);
    return B(Math.abs(n - r) <= 8 * Ki(r) ? r : n);
  }
  let pa = Object.freeze({ re: NaN, im: NaN }),
    ma = Object.freeze({ re: 1, im: 0 }),
    ha = Object.freeze({ re: Math.PI / 2, im: 0 }),
    ga = Object.freeze({ re: Math.LN10, im: 0 });
  function _a(e, t) {
    return {
      angle: `input`,
      extendsToComplex: !1,
      real: (t, n) => aa(e, t[0], n),
      complex: (e) => t(e[0]),
    };
  }
  function va(e, t, n) {
    return {
      angle: `output`,
      extendsToComplex: t,
      real: (t, n) => la(e, t[0], n),
      complex: (e) => n(e[0]),
    };
  }
  function ya(e) {
    let t = e[0];
    if (!(t > 0)) return NaN;
    if (e.length === 1) return Math.log10(t);
    let n = e[1];
    return !(n > 0) || n === 1 ? NaN : Math.log(t) / Math.log(n);
  }
  function ba(e) {
    return L(R(e[0]), e.length === 1 ? ga : R(e[1]));
  }
  let xa = new Map([
    [`sin`, _a(`sin`, ii)],
    [`cos`, _a(`cos`, ai)],
    [`tan`, _a(`tan`, oi)],
    [`csc`, _a(`csc`, (e) => L(ma, ii(e)))],
    [`sec`, _a(`sec`, (e) => L(ma, ai(e)))],
    [`cot`, _a(`cot`, (e) => L(ai(e), ii(e)))],
    [`arcsin`, va(`arcsin`, !0, si)],
    [`arccos`, va(`arccos`, !0, ci)],
    [
      `arctan`,
      {
        angle: `output`,
        extendsToComplex: !1,
        real: (e, t) => (e.length === 2 ? da(e[0], e[1], t) : la(`arctan`, e[0], t)),
        complex: (e) => (e.length === 2 ? { ...pa } : li(e[0])),
      },
    ],
    [`arccsc`, va(`arccsc`, !0, (e) => si(L(ma, e)))],
    [`arcsec`, va(`arcsec`, !0, (e) => ci(L(ma, e)))],
    [`arccot`, va(`arccot`, !1, (e) => I(ha, li(e)))],
    [
      `exp`,
      {
        angle: `none`,
        extendsToComplex: !1,
        real: (e) => Math.exp(e[0]),
        complex: (e) => ni(e[0]),
      },
    ],
    [
      `ln`,
      {
        angle: `none`,
        extendsToComplex: !0,
        real: (e) => (e[0] > 0 ? Math.log(e[0]) : NaN),
        complex: (e) => R(e[0]),
      },
    ],
    [`log`, { angle: `none`, extendsToComplex: !0, real: ya, complex: ba }],
    ...bi,
    ...Wi,
  ]);
  function Sa(e) {
    return Number.isFinite(e) ? e : NaN;
  }
  let Ca = new Map(
    [...kn].flatMap(([e, t]) => {
      let n = xa.get(e);
      return n
        ? [
            [
              e,
              Object.freeze({
                name: e,
                arity: t,
                angle: n.angle,
                extendsToComplex: n.extendsToComplex,
                real: (e, t) => Sa(n.real(e, t)),
                complex: n.complex,
              }),
            ],
          ]
        : [];
    })
  );
  function wa(e, t, n, r) {
    let i = Ca.get(e);
    if (!i || !i.arity.includes(t.length)) return N;
    let a = !0;
    for (let e of t)
      if (e.type === `complex`) a = !1;
      else if (e.type !== `number`) return N;
    if (!a) return Ea(i.complex(t.map(Ta)));
    let o = t.map((e) => (e.type === `number` ? e.value : NaN)),
      s = i.real(o, n);
    return Number.isNaN(s) && r && i.extendsToComplex
      ? Ea(i.complex(o.map((e) => ({ re: e, im: 0 }))))
      : P(s);
  }
  function Ta(e) {
    return e.type === `complex` ? e.value : { re: e.type === `number` ? e.value : NaN, im: 0 };
  }
  function Ea(e) {
    return F(e.re, e.im);
  }
  function Da(e) {
    return e.type === `number` ? { re: e.value, im: 0 } : e.type === `complex` ? e.value : null;
  }
  function Oa(e) {
    return F(e.re, e.im);
  }
  function ka(e, t, n, r) {
    if (e.type === `number` && t.type === `number`) return P(n(e.value, t.value));
    let i = Da(e),
      a = Da(t);
    return i && a ? Oa(r(i, a)) : N;
  }
  function Aa(e, t) {
    return ka(e, t, (e, t) => e + t, ei);
  }
  function ja(e, t) {
    return ka(e, t, (e, t) => e - t, I);
  }
  function Ma(e, t) {
    return ka(e, t, (e, t) => e * t, ti);
  }
  function Na(e, t) {
    return ka(e, t, (e, t) => e / t, L);
  }
  function Pa(e) {
    return e.type === `number`
      ? P(-e.value)
      : e.type === `complex`
        ? F(-e.value.re, -e.value.im)
        : N;
  }
  function Fa(e) {
    return e.type === `number`
      ? P(e.value / 100)
      : e.type === `complex`
        ? F(e.value.re / 100, e.value.im / 100)
        : N;
  }
  function Ia(e) {
    return e.type === `number`
      ? P(Math.abs(e.value))
      : e.type === `complex`
        ? P(Math.hypot(e.value.re, e.value.im))
        : N;
  }
  function La(e) {
    return e.type === `number` ? P(ji(e.value)) : N;
  }
  function Ra(e, t) {
    return e.type !== `number` && e.type !== `complex`
      ? N
      : t === `degrees`
        ? e
        : e.type === `number`
          ? P((e.value * Math.PI) / 180)
          : F((e.value.re * Math.PI) / 180, (e.value.im * Math.PI) / 180);
  }
  function za(e, t, n, r) {
    if (e.type === `number` && t.type === `number`) {
      let i = Zi(e.value, t.value, n);
      return Number.isNaN(i) && r && e.value < 0
        ? Oa(ui({ re: e.value, im: 0 }, { re: t.value, im: 0 }))
        : P(i);
    }
    let i = Da(e),
      a = Da(t);
    return i && a ? Oa(ui(i, a)) : N;
  }
  function Ba(e, t, n) {
    if (e.type === `number` && (t === null || t.type === `number`)) {
      let r = Qi(e.value, t === null ? 2 : t.value);
      return Number.isNaN(r) && n && e.value < 0 ? Va({ re: e.value, im: 0 }, t) : P(r);
    }
    let r = Da(e);
    return r ? Va(r, t) : N;
  }
  function Va(e, t) {
    if (t === null) return Oa(ri(e));
    let n = Da(t);
    return n ? Oa(ui(e, L({ re: 1, im: 0 }, n))) : N;
  }
  function Ha(e) {
    if (e.type === `number`) return e.value;
    if (e.type !== `complex`) return NaN;
    let { re: t, im: n } = e.value;
    return Math.abs(n) <= 1e-12 * Math.max(1, Math.abs(t)) ? t : NaN;
  }
  function Ua(e, t, n) {
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
  function Wa(e, t) {
    if (e.length !== t.length + 1) return !1;
    let n = NaN;
    for (let r = 0; r < e.length; r++) {
      let i = e[r];
      if (i.type !== `number` || !Number.isFinite(i.value) || (r > 0 && !Ua(n, t[r - 1], i.value)))
        return !1;
      n = i.value;
    }
    return !0;
  }
  let Ga = /* @__PURE__ */ new Set([`sin`, `cos`, `tan`, `csc`, `sec`, `cot`]),
    Ka = () => NaN;
  function V(e) {
    return Number.isFinite(e) ? e : NaN;
  }
  function qa(e) {
    return e === `e` ? Math.E : e === `pi` ? Math.PI : 2 * Math.PI;
  }
  function Ja(e, t) {
    if (!Ga.has(e) || t.length !== 1) return null;
    let [n] = t;
    return n.kind === `deg` ? n.arg : null;
  }
  function Ya(e, t) {
    let n = {
        scope: t,
        slots: /* @__PURE__ */ new Map([
          [`x`, 0],
          [`y`, 1],
        ]),
        env: [NaN, NaN],
        bound: [1, 1],
        stack: [],
        boundStack: [],
        sp: 0,
        depth: 0,
        functions: /* @__PURE__ */ new Map(),
      },
      r = H(e, n),
      i = n.env;
    return (e, t) => ((i[0] = V(e)), (i[1] = V(t)), r());
  }
  function H(e, t) {
    switch (e.kind) {
      case `num`: {
        let t = V(e.value);
        return () => t;
      }
      case `const`: {
        let t = qa(e.name);
        return () => t;
      }
      case `id`:
        return no(e.name, t);
      case `add`:
      case `sub`:
      case `mul`:
      case `div`:
        return Xa(e, t);
      case `pow`:
        return Za(e, t);
      case `neg`: {
        let n = H(e.arg, t);
        return () => -n();
      }
      case `pct`: {
        let n = H(e.arg, t);
        return () => n() / 100;
      }
      case `abs`: {
        let n = H(e.arg, t);
        return () => Math.abs(n());
      }
      case `deg`: {
        let n = H(e.arg, t);
        return t.scope.settings.angleMode === `degrees` ? n : () => V((n() * Math.PI) / 180);
      }
      case `root`: {
        let n = H(e.arg, t);
        if (e.index === null) return () => Qi(n(), 2);
        let r = H(e.index, t);
        return () => Qi(n(), r());
      }
      case `call`:
        return Qa(e, t);
      case `rel`:
        return ao(e.operands, e.ops, t);
      case `fact`: {
        let n = H(e.arg, t);
        return () => ji(n());
      }
      case `point`:
      case `list`:
      case `sim`:
        return Ka;
    }
  }
  function Xa(e, t) {
    let n = H(e.left, t),
      r = H(e.right, t);
    switch (e.kind) {
      case `add`:
        return () => V(n() + r());
      case `sub`:
        return () => V(n() - r());
      case `mul`:
        return () => V(n() * r());
      default:
        return () => V(n() / r());
    }
  }
  function Za(e, t) {
    if (e.left.kind === `const` && e.left.name === `e`) return $a(`exp`, [e.right], t);
    let n = H(e.left, t),
      r = H(e.right, t),
      i = Ji(e.right);
    return () => Zi(n(), r(), i);
  }
  function Qa(e, t) {
    if (u(e.name)) return $a(e.name, e.args, t);
    let n = to(e.name, t);
    return n === null || n.slots.length !== e.args.length
      ? Ka
      : eo(
          n,
          e.args.map((e) => H(e, t)),
          t
        );
  }
  function $a(e, t, n) {
    let r = Ja(e, t);
    if (r !== null) {
      let t = H(r, n);
      return () => aa(e, t(), `degrees`);
    }
    let i = Ca.get(e);
    if (i === void 0 || !i.arity.includes(t.length)) return Ka;
    let a = t.map((e) => H(e, n)),
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
  function eo(e, t, n) {
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
  function to(e, t) {
    let n = t.functions.get(e);
    if (n !== void 0) return n;
    let r = t.scope.functions.get(e);
    if (r === void 0) return null;
    let i = { slots: r.params.map((e) => io(e, t)), body: Ka };
    return (t.functions.set(e, i), (i.body = H(r.body, t)), i);
  }
  function no(e, t) {
    let n = io(e, t),
      { env: r, bound: i } = t,
      a = ro(e, t);
    return () => (i[n] === 1 ? r[n] : a());
  }
  function ro(e, t) {
    let { scope: n } = t;
    if (n.settings.complex && e === `i`) return Ka;
    let r = n.values.get(e);
    if (r !== void 0) {
      let e = r.type === `number` ? r.value : NaN;
      return () => e;
    }
    let i = to(e, t);
    return i !== null && i.slots.length === 0 ? eo(i, [], t) : Ka;
  }
  function io(e, t) {
    let n = t.slots.get(e);
    if (n !== void 0) return n;
    let r = t.env.length;
    return (t.slots.set(e, r), t.env.push(NaN), t.bound.push(0), r);
  }
  function ao(e, t, n) {
    let r = e.map((e) => H(e, n)),
      i = t.length;
    return () => {
      let e = r[0]();
      if (Number.isNaN(e)) return NaN;
      for (let n = 0; n < i; n++) {
        let i = r[n + 1]();
        if (Number.isNaN(i) || !Ua(e, t[n], i)) return NaN;
        e = i;
      }
      return 1;
    };
  }
  let oo = 1e-9;
  var U = class extends Error {
    constructor(e) {
      (super(e), (this.name = `ListError`), (this.code = e));
    }
  };
  function so(e) {
    return Object.freeze({ type: `undefined`, error: e });
  }
  let W = (e) => e.type === `list`;
  function co(e) {
    if (e.length > 1e4) throw new U(`list-too-long`);
    let t = 0,
      n = 0;
    for (let r of e) {
      if (W(r)) throw new U(`nested-list`);
      r.type === `point` ? (t += 1) : r.type !== `undefined` && (n += 1);
    }
    if (t > 0 && n > 0) throw new U(`list-mixed`);
    return { type: `list`, value: e };
  }
  function lo(e, t, n) {
    if ((t === null ? [e, n] : [e, t, n]).some(W)) throw new U(`nested-list`);
    let [r, i, a] = [e, t ?? e, n].map((e) => (e.type === `number` ? e.value : NaN));
    if (![r, i, a].every(Number.isFinite)) return N;
    let o = t === null ? (a < r ? -1 : 1) : i - r;
    if (o === 0) throw new U(`range-step`);
    let s = Math.floor((a - r) / o + oo) + 1;
    if (!(s <= 1e4)) throw new U(`list-too-long`);
    let c = [];
    for (let e = 0; e < s; e++) {
      let t = r + e * o,
        n = e === s - 1 && Math.abs(t - a) <= oo * Math.abs(o);
      c.push({ type: `number`, value: n ? a : t });
    }
    return { type: `list`, value: c };
  }
  function uo(e, t) {
    return W(e) ? { type: `list`, value: e.value.map(t) } : t(e);
  }
  function fo(e, t, n) {
    if (!W(e) && !W(t)) return n(e, t);
    let r = Math.min(W(e) ? e.value.length : 1 / 0, W(t) ? t.value.length : 1 / 0),
      i = [];
    for (let a = 0; a < r; a++) i.push(n(W(e) ? e.value[a] : e, W(t) ? t.value[a] : t));
    return { type: `list`, value: i };
  }
  function po(e, t) {
    let n = 1 / 0;
    for (let t of e) W(t) && (n = Math.min(n, t.value.length));
    if (n === 1 / 0) return t([...e]);
    let r = [];
    for (let i = 0; i < n; i++) r.push(t(e.map((e) => (W(e) ? e.value[i] : e))));
    return { type: `list`, value: r };
  }
  function mo(e, t) {
    return fo(e, t, (e, t) => ({ type: `point`, value: [Ha(e), Ha(t)] }));
  }
  let ho = Object.freeze(P(1)),
    go = Object.freeze(F(Xr.re, Xr.im)),
    _o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
  function G(e, t) {
    let n = q(e, { scope: t, functions: /* @__PURE__ */ new Map(), depth: 0 });
    return (e, t) => {
      try {
        return n(e, t);
      } catch (e) {
        if (e instanceof U) return so(e.code);
        throw e;
      }
    };
  }
  function K(e) {
    return () => e;
  }
  function q(e, t) {
    let { angleMode: n, complex: r } = t.scope.settings;
    switch (e.kind) {
      case `num`:
        return K(Object.freeze(P(e.value)));
      case `const`:
        return K(Object.freeze(P(qa(e.name))));
      case `id`:
        return To(e.name, t);
      case `add`:
        return yo(e, t, Aa);
      case `sub`:
        return yo(e, t, ja);
      case `mul`:
        return yo(e, t, Ma);
      case `div`:
        return yo(e, t, Na);
      case `pow`:
        return bo(e, t);
      case `neg`:
        return vo(e.arg, t, Pa);
      case `pct`:
        return vo(e.arg, t, Fa);
      case `abs`:
        return vo(e.arg, t, Ia);
      case `deg`:
        return vo(e.arg, t, (e) => Ra(e, n));
      case `fact`:
        return vo(e.arg, t, La);
      case `root`: {
        let n = q(e.arg, t),
          i = e.index === null ? null : q(e.index, t);
        return i === null
          ? (e, t) => uo(n(e, t), (e) => Ba(e, null, r))
          : (e, t) => fo(n(e, t), i(e, t), (e, t) => Ba(e, t, r));
      }
      case `call`:
        return xo(e, t);
      case `list`: {
        let n = e.items.map((e) => q(e, t));
        if (e.range !== !0) return (e, t) => co(n.map((n) => n(e, t)));
        let [r, i, a] = n.length === 2 ? [n[0], null, n[1]] : n;
        return (e, t) => lo(r(e, t), i?.(e, t) ?? null, a(e, t));
      }
      case `sim`:
        return K(N);
      case `point`: {
        let n = q(e.x, t),
          r = q(e.y, t);
        return (e, t) => mo(n(e, t), r(e, t));
      }
      case `rel`: {
        let n = e.operands.map((e) => q(e, t)),
          r = e.ops;
        return (e, t) =>
          Wa(
            n.map((n) => n(e, t)),
            r
          )
            ? ho
            : N;
      }
    }
  }
  function vo(e, t, n) {
    let r = q(e, t);
    return (e, t) => uo(r(e, t), n);
  }
  function yo(e, t, n) {
    let r = q(e.left, t),
      i = q(e.right, t);
    return (e, t) => fo(r(e, t), i(e, t), n);
  }
  function bo(e, t) {
    if (e.left.kind === `const` && e.left.name === `e`) return So(`exp`, [e.right], t);
    let n = q(e.left, t),
      r = q(e.right, t),
      i = Ji(e.right),
      { complex: a } = t.scope.settings;
    return (e, t) => fo(n(e, t), r(e, t), (e, t) => za(e, t, i, a));
  }
  function xo(e, t) {
    if (u(e.name)) return So(e.name, e.args, t);
    let n = wo(e.name, t);
    return n === null || n.params.length !== e.args.length
      ? K(N)
      : Co(
          n,
          e.args.map((e) => q(e, t)),
          t
        );
  }
  function So(e, t, n) {
    let { angleMode: r, complex: i } = n.scope.settings,
      a = Ja(e, t);
    if (a !== null) {
      let t = q(a, n);
      return (n, a) =>
        uo(t(n, a), (t) =>
          t.type === `number` ? P(aa(e, t.value, `degrees`)) : wa(e, [Ra(t, r)], r, i)
        );
    }
    let o = t.map((e) => q(e, n));
    return (t, n) =>
      po(
        o.map((e) => e(t, n)),
        (t) => wa(e, t, r, i)
      );
  }
  function Co(e, t, n) {
    return (r, i) => {
      let a = t.map((e) => e(r, i));
      if ((i.check(), n.depth >= 64)) return N;
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
  function wo(e, t) {
    let n = t.functions.get(e);
    if (n !== void 0) return n;
    let r = t.scope.functions.get(e);
    if (r === void 0) return null;
    let i = { params: r.params, body: K(N) };
    return (t.functions.set(e, i), (i.body = q(r.body, t)), i);
  }
  function To(e, t) {
    let n = Eo(e, t);
    return (t, r) => (_o(t, e) ? t[e] : n(t, r));
  }
  function Eo(e, t) {
    let { scope: n } = t;
    if (n.settings.complex && e === `i`) return K(go);
    let r = n.values.get(e);
    if (r !== void 0) return K(r);
    let i = wo(e, t);
    return i !== null && i.params.length === 0 ? Co(i, [], t) : K(N);
  }
  function Do(e, t, n) {
    if (!n.settings.complex) {
      let r = Ya(e, n);
      return t === `x` ? (e) => r(e, NaN) : (e) => r(NaN, e);
    }
    let r = G(e, n);
    return t === `x` ? (e) => Ha(r({ x: P(e), y: N }, wr)) : (e) => Ha(r({ x: N, y: P(e) }, wr));
  }
  function Oo(e, t) {
    if (!t.settings.complex) return Ya(e, t);
    let n = G(e, t);
    return (e, t) => Ha(n({ x: P(e), y: P(t) }, wr));
  }
  function ko(e, t) {
    return t.includes(e.kind) && e.error === null && e.chips.length === 0;
  }
  function Ao(e) {
    let { tree: t } = e;
    return t !== null && t.kind === `rel` && t.operands.length === 2 ? t.operands[1] : null;
  }
  function jo(e, t, n, r) {
    let i = /* @__PURE__ */ new Map(),
      a = /* @__PURE__ */ new Map(),
      o = { functions: e.functions, values: a, settings: t },
      s = (e, t) => {
        let r = n(e);
        try {
          r.check();
          let n = G(t, o)({}, r);
          return (i.set(e, n), n);
        } catch (e) {
          if (e instanceof Cr) return null;
          throw e;
        }
      },
      c = /* @__PURE__ */ new Set();
    for (let t of e.valueOrder) {
      let l = Tn(t);
      if (l !== null) {
        let t = e.byId.get(l)?.regression;
        if (t === void 0 || c.has(l)) continue;
        c.add(l);
        let s = n(l);
        s.check();
        let u = Jr(t, o, s);
        for (let [e, t] of Yr(u)) (a.set(e, t), i.set(wn(l, e), t));
        r?.regression(l, u);
        continue;
      }
      let u = e.byId.get(t),
        d = u === void 0 ? null : Ao(u);
      if (u === void 0 || d === null || u.defines === null || !ko(u, [`definition`])) continue;
      let f = s(t, d);
      f !== null && a.set(u.defines.name, f.type === `undefined` ? N : f);
    }
    for (let t of e.rows) ko(t, [`value`, `point`]) && t.tree !== null && s(t.id, t.tree);
    if (r !== void 0)
      for (let t of e.rows) {
        if (t.kind !== `table` || t.table === void 0) continue;
        let e = n(t.id);
        (e.check(), r.table(t.id, Ar(t, o, e)));
      }
    return i;
  }
  function Mo(e, t, n) {
    let r = /* @__PURE__ */ new Map();
    for (let n of e.byId.values())
      n.kind === `definition` &&
        n.defines?.type === `value` &&
        t.has(n.id) &&
        r.set(n.defines.name, t.get(n.id));
    return { functions: e.functions, values: r, settings: n };
  }
  function No(e, t, n) {
    let { id: r, graph: i } = e;
    if (i === null) return null;
    switch (i.kind) {
      case `explicit`:
        return {
          rowId: r,
          kind: `explicit`,
          independent: i.independent,
          f: Do(i.expr, i.independent, t),
        };
      case `implicit`:
        return { rowId: r, kind: `implicit`, F: Oo(i.expr, t) };
      case `lines`:
        return {
          rowId: r,
          kind: `lines`,
          orientation: i.orientation,
          f: Do(i.expr, i.orientation === `vertical` ? `x` : `y`, t),
        };
      case `region`:
        return {
          rowId: r,
          kind: `region`,
          terms: i.operands.map((e) => Oo(e, t)),
          ops: [...i.ops],
        };
      case `constant-region`: {
        let n = G(
          {
            kind: `rel`,
            ops: i.ops,
            operands: i.operands,
            span: e.tree?.span ?? { start: 0, end: 0 },
          },
          t
        )({}, wr);
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
  function Po(e) {
    switch (e.kind) {
      case `curve`:
        return [e.polylines, e.bands];
      case `lines`:
        return [e.positions];
      case `points`:
        return [e.coords];
      case `region`:
        return [e.spans, ...e.boundaries.flatMap(Po)];
      case `table`:
        return e.series.map((e) => e.coords);
    }
  }
  function Fo(e) {
    let t = [];
    for (let n of Po(e)) {
      let e = n.buffer;
      t.includes(e) || t.push(e);
    }
    return t;
  }
  let Io = 2e4,
    Lo = 25e4,
    Ro = 1024;
  var zo = class {
    constructor(e, t) {
      ((this.count = 0), (this.nextCheck = Ro), (this.limit = e), (this.deadline = t));
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
            ((this.nextCheck = (Math.floor(t / Ro) + 1) * Ro), this.deadline.check()),
          !0);
    }
  };
  let Bo = 4096,
    Vo = 0.5;
  function Ho(e, t) {
    let { viewport: n, size: r } = e;
    return t === `x`
      ? { t0: n.left, t1: n.right, tPx: r.width, v0: n.bottom, v1: n.top, vPx: r.height }
      : { t0: n.bottom, t1: n.top, tPx: r.height, v0: n.left, v1: n.right, vPx: r.width };
  }
  var Uo = class {
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
      ((this.columns = Math.max(1, Math.min(r, Bo, Math.floor((n.remaining - 1) / 2)))),
        (this.band = new Uint8Array(this.columns)));
      let i = t.v1 - t.v0;
      ((this.vScale = t.vPx / i),
        (this.guardLow = t.v0 - Vo * i),
        (this.guardHigh = t.v1 + Vo * i));
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
      return (
        Number.isNaN(this.v[e]) || Number.isNaN(this.v[this.next[e]]) || this.poleBreak[e] === 1
      );
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
          Math.abs(this.v[i.k] - this.v[r.k]) * this.vScale >= 1 &&
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
          Math.max(this.jumpPx(t), this.jumpPx(e)) >= 1e-6
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
        (a !== o && (n.length > 0 && n.push(NaN, NaN), n.push(f, p)),
          n.push(m, h),
          (a = g ? -1 : s));
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
  function Wo(e, t, n) {
    let r = new Uo(e, t, n);
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
  function Go(e, t, n, r, i) {
    let a = new zo(Io, i),
      { polyline: o, bands: s } = Wo(n, Ho(r, t), a);
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
  function Ko(e, t, n) {
    let { viewport: r, size: i } = e;
    return [
      r.left + (t / i.width) * (r.right - r.left),
      r.top - (n / i.height) * (r.top - r.bottom),
    ];
  }
  function qo(e, t, n) {
    return Ko(e, t + 0.5, n + 0.5);
  }
  var Jo = class {
    constructor(e, t, n) {
      ((this.state = 0), (this.children = null), (this.i = e), (this.j = t), (this.edge = n));
    }
  };
  function Yo(e) {
    return Number.isFinite(e) && e > 0 ? Math.ceil(e) : 0;
  }
  function Xo(e, t) {
    return Math.max(1, Math.ceil((e - 1) / t));
  }
  var Zo = class {
    constructor(e, t, n, r, i) {
      ((this.leaves = []),
        (this.unresolved = []),
        (this.index = /* @__PURE__ */ new Map()),
        (this.slots = 0),
        (this.coarse = []),
        (this.queue = []),
        (this.view = e),
        (this.count = t),
        (this.callsPerNode = n),
        (this.evaluate = r),
        (this.budget = i),
        (this.width = Yo(e.size.width)),
        (this.height = Yo(e.size.height)));
      let a = 4,
        o = (e) => (Xo(this.width, e) + 1) * (Xo(this.height, e) + 1) * n,
        s = (e) => Xo(this.width, e) === 1 && Xo(this.height, e) === 1;
      for (; o(a) > i.limit / 4 && !s(a); ) a *= 2;
      ((this.cell = a),
        (this.cellsX = Xo(this.width, a)),
        (this.cellsY = Xo(this.height, a)),
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
      if (i.state !== 3) return this.value(i.i, i.j, n);
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
        for (let n = 0; n < t; n++) this.coarse.push(new Jo(n * e, r * e, e));
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
      ((e.state = 4),
        (e.children = [
          new Jo(t, n, i),
          new Jo(t + i, n, i),
          new Jo(t, n + i, i),
          new Jo(t + i, n + i, i),
        ]));
      for (let t of e.children) this.active(t) && this.enqueue(t);
      for (let [, , e, t] of a) {
        if (!(e >= 0 && e < this.lastI && t >= 0 && t < this.lastJ)) continue;
        let n = this.locate(e, t);
        n.state === 0 && this.active(n) && this.enqueue(n);
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
      let [n, r] = qo(this.view, e, t),
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
      ((e.state = 1), this.queue.push(e));
    }
    markLeaf(e) {
      ((e.state = 2), this.leaves.push(e));
    }
    markUnresolved(e) {
      ((e.state = 3), this.unresolved.push(e));
    }
  };
  function Qo(e, t, n, r, i) {
    return new Zo(e, t, n, r, i).run();
  }
  function $o(e, t, n) {
    let r = e.cellsX * e.cell + 1,
      i = (e, t) => 2 * (t * r + e),
      a = (e, t) => 2 * (t * r + e) + 1,
      o = /* @__PURE__ */ new Map(),
      s = (e, t, r, i, a) => {
        if (!o.has(e)) {
          let s = i / (i - a),
            [c, l] = e % 2 == 0 ? [t + 0.5 + s, r + 0.5] : [t + 0.5, r + 0.5 + s];
          o.set(e, Ko(n, c, l));
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
    for (let e of es(c)) {
      l.length > 0 && l.push(NaN, NaN);
      for (let t of e) l.push(...o.get(t));
    }
    let u = [];
    for (let r of e.unresolved) {
      if (!e.boundaryMixes(r, t)) continue;
      let [i, a] = qo(n, r.i, r.j),
        [o, s] = qo(n, r.i + r.edge, r.j + r.edge);
      u.push(i, o, s, a);
    }
    return { polylines: l, bands: u };
  }
  function es(e) {
    let t = e.length / 2,
      n = /* @__PURE__ */ new Map(),
      r = /* @__PURE__ */ new Map(),
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
  function ts(e, t, n, r) {
    let i = new zo(Lo, r),
      { polylines: a, bands: o } = $o(
        Qo(
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
  function ns(e, t) {
    return (e < 0 && t > 0) || (e > 0 && t < 0);
  }
  var rs = class {
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
            i + 1 < e.length && ns(t[i], t[i + 1]) && r(this.bracketRoot(i)));
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
        n = 1e-9 * Math.max(Math.abs(this.v[e - 1]), Math.abs(this.v[e + 1])),
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
  function is(e, t, n, r, i) {
    let { viewport: a, size: o } = r,
      [s, c, l] = t === `vertical` ? [a.left, a.right, o.width] : [a.bottom, a.top, o.height],
      u = Math.max(1, Math.min(Number.isFinite(l) ? Math.ceil(l) : 1, Bo)),
      d = new zo(Io, i),
      f = new rs(n, s, c, u, d).roots();
    return {
      rowId: e,
      kind: `lines`,
      orientation: t,
      positions: Float64Array.from(f),
      dashed: !1,
      evaluations: d.used,
    };
  }
  function as(e, t) {
    let n = [];
    for (let e of t) Number.isFinite(e[0]) && Number.isFinite(e[1]) && n.push(e[0], e[1]);
    return { rowId: e, kind: `points`, coords: Float64Array.from(n), evaluations: 0 };
  }
  function os(e, t) {
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
  function ss(e, t, n) {
    let { width: r, height: i } = n.size,
      a = (n, r) => {
        for (let i = 0; i < t.length; i++) if (!os(t[i], e.pixelValue(n, r, i))) return !1;
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
  function cs(e, t, n, r, i) {
    let a = new zo(Lo, i),
      o = new Float64Array(t.length),
      s = Qo(
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
        let { polylines: i, bands: a } = $o(s, n, r);
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
      spans: Float32Array.from(ss(s, n, r)),
      boundaries: c,
      evaluations: a.used,
    };
  }
  function ls(e, t, n) {
    let { width: r, height: i } = n.size;
    return {
      rowId: e,
      kind: `region`,
      spans: Float32Array.from(t ? [0, i, 0, r] : []),
      boundaries: [],
      evaluations: 0,
    };
  }
  let us = ({ size: e }) =>
    Number.isFinite(e.width) && Number.isFinite(e.height) && e.width >= 1 && e.height >= 1;
  function ds(e) {
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
        return as(t, e.points);
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
  function fs(e, t, n) {
    if (!us(t)) return ds(e);
    switch (e.kind) {
      case `explicit`:
        return Go(e.rowId, e.independent, e.f, t, n);
      case `implicit`:
        return ts(e.rowId, e.F, t, n);
      case `lines`:
        return is(e.rowId, e.orientation, e.f, t, n);
      case `points`:
        return as(e.rowId, e.points);
      case `region`:
        return cs(e.rowId, e.terms, e.ops, t, n);
      case `constant-region`:
        return ls(e.rowId, e.holds, t);
    }
  }
  function ps(e, t, n) {
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
  let J = Number.isFinite,
    ms = (Math.sqrt(5) - 1) / 2;
  function hs(e, t, n, r) {
    let i = n.size.height / n.size.width,
      a = ts(
        `poi`,
        e,
        { viewport: t, size: { width: 480, height: Math.max(1, Math.round(480 * i)) }, dpr: 1 },
        r
      ),
      o = [],
      s = { xs: [], ys: [] };
    for (let e = 0; e + 1 < a.polylines.length; e += 2) {
      let t = a.polylines[e],
        n = a.polylines[e + 1];
      Number.isNaN(t) || Number.isNaN(n)
        ? (s.xs.length > 1 && o.push(s), (s = { xs: [], ys: [] }))
        : (s.xs.push(t), s.ys.push(n));
    }
    return (s.xs.length > 1 && o.push(s), o);
  }
  function gs(e, t, n) {
    let r = e(t),
      i = e(n);
    if (!J(r) || !J(i)) return NaN;
    if (r === 0) return t;
    if (i === 0) return n;
    if (r > 0 == i > 0) return NaN;
    for (let a = 0; a < 100; a++) {
      let a = (t + n) / 2;
      if (a === t || a === n) break;
      let o = e(a);
      if (!J(o)) return NaN;
      if (o === 0) return a;
      o > 0 == r > 0 ? ([t, r] = [a, o]) : ([n, i] = [a, o]);
    }
    return (t + n) / 2;
  }
  function _s(e, t, n) {
    let r = t,
      i = n,
      a = n - ms * (n - t),
      o = t + ms * (n - t),
      s = e(a),
      c = e(o);
    for (let r = 0; r < 200 && n - t > 1e-15 * Math.max(1, Math.abs(t)); r++)
      s >= c
        ? ((n = o), (o = a), (c = s), (a = n - ms * (n - t)), (s = e(a)))
        : ((t = a), (a = o), (s = c), (o = t + ms * (n - t)), (c = e(o)));
    let l = s >= c ? a : o,
      u = 0.001 * (i - r);
    return l - r < u || i - l < u ? null : l;
  }
  function vs(e, t, n) {
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
              let n = gs((n) => e(t, n), l - a, l + a);
              return J(n) ? c * n : -1 / 0;
            },
            f = _s(d, o[t] - i, o[t] + i);
          if (f === null) continue;
          let p = c * d(f);
          J(p) &&
            (r.some((e) => e.kind === s && Math.abs(e.x - f) < n.x && Math.abs(e.y - p) < n.y) ||
              r.push({ x: f, y: p, kind: s }));
        }
      }
    return r;
  }
  function ys(e, t, n, r, i) {
    let a = n,
      o = r;
    for (let s = 0; s < 50; s++) {
      let s = e(n, r),
        c = t(n, r);
      if (!J(s) || !J(c)) return null;
      let l = 1e-7 * Math.max(1, Math.abs(n)),
        u = 1e-7 * Math.max(1, Math.abs(r)),
        d = (e(n + l, r) - e(n - l, r)) / (2 * l),
        f = (e(n, r + u) - e(n, r - u)) / (2 * u),
        p = (t(n + l, r) - t(n - l, r)) / (2 * l),
        m = (t(n, r + u) - t(n, r - u)) / (2 * u),
        h = d * m - f * p;
      if (!J(h) || h === 0) return null;
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
    return J(s) && J(c) ? [n, r] : null;
  }
  function bs(e, t, n, r) {
    let i = [],
      a = 6 * Math.hypot(r.x, r.y);
    for (let { xs: o, ys: s } of n) {
      let n = t(o[0], s[0]);
      for (let c = 1; c < o.length; c++) {
        let l = t(o[c], s[c]);
        if (J(n) && J(l) && (l === 0 || n > 0 != l > 0)) {
          let n = ys(e, t, (o[c - 1] + o[c]) / 2, (s[c - 1] + s[c]) / 2, a);
          n !== null &&
            !i.some((e) => Math.abs(e[0] - n[0]) < r.x && Math.abs(e[1] - n[1]) < r.y) &&
            i.push(n);
        }
        n = l;
      }
    }
    return i;
  }
  let xs = 2220446049250313e-31,
    Ss = (Math.sqrt(5) - 1) / 2,
    Y = Number.isFinite;
  function Cs(e, t) {
    let n = Math.max(2, Math.floor(t.samples)),
      r = [],
      i = [];
    for (let a = 0; a <= n; a++) {
      let o = t.lo + ((t.hi - t.lo) * a) / n;
      (r.push(o), i.push(e(o)));
    }
    return { t: r, v: i };
  }
  function ws(e, t, n, r, i) {
    let a = t,
      o = r,
      s = n - t,
      c = s;
    for (let l = 0; l < 200; l++) {
      Math.abs(o) < Math.abs(i) && (([t, n, a] = [n, a, n]), ([r, i, o] = [i, o, i]));
      let l = 2 * xs * Math.abs(n) + 1e-300,
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
      if (((t = n), (r = i), (n += Math.abs(s) > l ? s : u > 0 ? l : -l), (i = e(n)), !Y(i)))
        return null;
      ((i > 0 && o > 0) || (i < 0 && o < 0)) && ((a = t), (o = r), (s = c = n - t));
    }
    return { t: n, size: Math.min(Math.abs(i), Math.abs(o)) };
  }
  function Ts(e, t, n) {
    let r = n - Ss * (n - t),
      i = t + Ss * (n - t),
      a = e(r),
      o = e(i);
    for (let s = 0; s < 200 && n - t > 4 * xs * Math.max(1, Math.abs(t) + Math.abs(n)); s++)
      a <= o
        ? ((n = i), (i = r), (o = a), (r = n - Ss * (n - t)), (a = e(r)))
        : ((t = r), (r = i), (a = o), (i = t + Ss * (n - t)), (o = e(i)));
    return a <= o ? r : i;
  }
  function Es(e, t, n) {
    for (let r = 0; r < 80; r++) {
      let r = (t + n) / 2;
      if (r === t || r === n) break;
      Y(e(r)) ? (t = r) : (n = r);
    }
    return t;
  }
  let Ds = (e, t) => Math.abs(e - t) <= 1e-9 * Math.max(1, Math.abs(e));
  function Os(e, t) {
    e.some((e) => Ds(e, t)) || e.push(t);
  }
  function X(e, t) {
    let { t: n, v: r } = Cs(e, t),
      i = [];
    for (let t = 0; t < n.length; t++) {
      let a = r[t],
        o = r[t + 1];
      if ((a === 0 && Os(i, n[t]), t === n.length - 1)) break;
      if (Y(a) && Y(o) && a !== 0 && o !== 0 && a > 0 != o > 0) {
        let r = ws(e, n[t], n[t + 1], a, o);
        r !== null && r.size <= 0.001 * Math.min(Math.abs(a), Math.abs(o)) && Os(i, r.t);
      } else if (Y(a) !== Y(o)) {
        let [r, s, c] = Y(a) ? [n[t], n[t + 1], a] : [n[t + 1], n[t], o],
          l = Es(e, r, s),
          u = e(l);
        Y(u) && c !== 0 && Math.abs(u) <= 1e-5 * Math.abs(c) && Os(i, l);
      }
      if (t > 0 && Y(r[t - 1]) && Y(a) && Y(o) && a !== 0) {
        let s = Math.abs(r[t - 1]),
          c = Math.abs(a),
          l = Math.abs(o);
        if (r[t - 1] > 0 == a > 0 && a > 0 == o > 0 && c < s && c <= l) {
          let r = Ts((t) => Math.abs(e(t)), n[t - 1], n[t + 1]),
            a = Math.abs(e(r));
          Y(a) && a <= 1e-8 * Math.max(s, l) && Os(i, r);
        }
      }
    }
    return i.sort((e, t) => e - t);
  }
  function ks(e, t) {
    let { t: n, v: r } = Cs(e, t),
      i = [];
    for (let t = 1; t < n.length - 1; t++) {
      let a = r[t - 1],
        o = r[t],
        s = r[t + 1];
      if (!Y(a) || !Y(o) || !Y(s)) continue;
      let c = o > a && o >= s ? `maximum` : o < a && o <= s ? `minimum` : null;
      if (c === null) continue;
      let l = c === `maximum` ? -1 : 1,
        u = Ts(
          (t) => {
            let n = e(t);
            return Y(n) ? l * n : 1 / 0;
          },
          n[t - 1],
          n[t + 1]
        ),
        d = e(u),
        f = Math.max(Math.abs(o - a), Math.abs(o - s));
      !Y(d) || Math.abs(d - o) > 4 * f || i.some((e) => Ds(e.t, u)) || i.push({ t: u, kind: c });
    }
    return i.sort((e, t) => e.t - t.t);
  }
  let As = [
      `zero`,
      `x-intercept`,
      `y-intercept`,
      `maximum`,
      `minimum`,
      `top`,
      `bottom`,
      `intersection`,
    ],
    js = 0.1,
    Ms = /* @__PURE__ */ new Set([`maximum`, `minimum`, `top`, `bottom`]),
    Ns = Number.isFinite;
  function Ps(e) {
    let { left: t, right: n, bottom: r, top: i } = e.viewport,
      a = (n - t) * js,
      o = (i - r) * js;
    return { left: t - a, right: n + a, bottom: r - o, top: i + o };
  }
  function Fs(e) {
    switch (e.kind) {
      case `explicit`:
        return e.independent === `x` ? (t, n) => n - e.f(t) : (t, n) => t - e.f(n);
      case `implicit`:
        return e.F;
      case `lines`:
        return e.orientation === `vertical` ? (t) => e.f(t) : (t, n) => e.f(n);
    }
  }
  function Is(e, t, n, r) {
    let i = Ps(n),
      a = {
        x: (n.viewport.right - n.viewport.left) / n.size.width,
        y: (n.viewport.top - n.viewport.bottom) / n.size.height,
      },
      o = { lo: i.left, hi: i.right, samples: Math.ceil(n.size.width * 1.2 * 2) },
      s = { lo: i.bottom, hi: i.top, samples: Math.ceil(n.size.height * 1.2 * 2) },
      c = [],
      l = (e, t, n, r = null) => {
        Ns(e) && Ns(t) && c.push({ x: e, y: t, kind: n, withRowId: r });
      };
    switch ((r.check(), e.kind)) {
      case `explicit`: {
        let { f: n } = e,
          r = e.independent === `x`,
          i = r ? o : s,
          a = (e, t) => (r ? [e, t] : [t, e]);
        for (let e of X(n, i)) l(...a(e, 0), `zero`);
        let c = n(0);
        0 >= i.lo && 0 <= i.hi && l(...a(0, c), r ? `y-intercept` : `x-intercept`);
        for (let e of ks(n, i)) l(...a(e.t, n(e.t)), e.kind);
        for (let e of t) {
          let t = Fs(e.curve);
          for (let o of X((e) => (r ? t(e, n(e)) : t(n(e), e)), i))
            l(...a(o, n(o)), `intersection`, e.rowId);
        }
        break;
      }
      case `lines`: {
        let n = e.orientation === `vertical`;
        for (let r of X(e.f, n ? o : s)) {
          n ? l(r, 0, `x-intercept`) : l(0, r, `y-intercept`);
          for (let e of t) {
            let t = Fs(e.curve);
            for (let i of X((e) => (n ? t(r, e) : t(e, r)), n ? s : o))
              n ? l(r, i, `intersection`, e.rowId) : l(i, r, `intersection`, e.rowId);
          }
        }
        break;
      }
      case `implicit`: {
        let { F: c } = e;
        if (0 >= i.bottom && 0 <= i.top) for (let e of X((e) => c(e, 0), o)) l(e, 0, `x-intercept`);
        if (0 >= i.left && 0 <= i.right) for (let e of X((e) => c(0, e), s)) l(0, e, `y-intercept`);
        r.check();
        let u = hs(c, i, n, r);
        for (let e of vs(c, u, a)) l(e.x, e.y, e.kind);
        r.check();
        for (let e of t) {
          let t = e.curve;
          if (t.kind === `explicit`) {
            let { f: n } = t,
              r = t.independent === `x`;
            for (let t of X((e) => (r ? c(e, n(e)) : c(n(e), e)), r ? o : s))
              r ? l(t, n(t), `intersection`, e.rowId) : l(n(t), t, `intersection`, e.rowId);
          } else if (t.kind === `lines`) {
            let n = t.orientation === `vertical`;
            for (let r of X(t.f, n ? o : s))
              for (let t of X((e) => (n ? c(r, e) : c(e, r)), n ? s : o))
                n ? l(r, t, `intersection`, e.rowId) : l(t, r, `intersection`, e.rowId);
          } else for (let [n, r] of bs(c, t.F, u, a)) l(n, r, `intersection`, e.rowId);
        }
        break;
      }
    }
    return Ls(c, n);
  }
  function Ls(e, t) {
    let n = /* @__PURE__ */ new Map();
    for (let t of e) n.set(t.kind, (n.get(t.kind) ?? 0) + 1);
    let r = [];
    for (let t of e) {
      if ((n.get(t.kind) ?? 0) > 100) continue;
      let e = r.find((e) => {
        let n = Ms.has(t.kind) || e.kinds.some((e) => Ms.has(e)) ? 1e-7 : 1e-9;
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
        kinds: [...e.kinds].sort((e, t) => As.indexOf(e) - As.indexOf(t)),
      }))
      .sort((e, t) => e.x - t.x || e.y - t.y);
  }
  let Rs = (e, t) => ({ kind: `sub`, left: e, right: t, span: e.span }),
    zs = (e, t) => e.kind === `id` && e.name === t,
    Bs = (e, t) => k(e).some((e) => e.name === t);
  function Vs(e, t) {
    let n = e.graph;
    if (n === null) return [];
    switch (n.kind) {
      case `explicit`:
        return [{ kind: `explicit`, independent: n.independent, f: Do(n.expr, n.independent, t) }];
      case `implicit`:
        return [{ kind: `implicit`, F: Oo(n.expr, t) }];
      case `lines`:
        return [
          {
            kind: `lines`,
            orientation: n.orientation,
            f: Do(n.expr, n.orientation === `vertical` ? `x` : `y`, t),
          },
        ];
      case `region`: {
        let e = [];
        for (let r = 0; r + 1 < n.operands.length; r++) {
          let i = n.operands[r],
            a = n.operands[r + 1],
            o = [`y`, `x`].find((e) => (zs(i, e) && !Bs(a, e)) || (zs(a, e) && !Bs(i, e)));
          if (o !== void 0) {
            let n = zs(i, o) ? a : i,
              r = o === `y` ? `x` : `y`;
            e.push({ kind: `explicit`, independent: r, f: Do(n, r, t) });
          } else e.push({ kind: `implicit`, F: Oo(Rs(i, a), t) });
        }
        return e;
      }
      default:
        return [];
    }
  }
  function Hs(e, t, n, r, i) {
    let a = t.byId.get(e);
    if (a === void 0 || !a.isGraphable) return [];
    let o = t.rows.flatMap((t) =>
        t.id !== e && t.isGraphable ? Vs(t, n).map((e) => ({ rowId: t.id, curve: e })) : []
      ),
      s = Vs(a, n);
    return s.length === 1
      ? Is(s[0], o, r, i)
      : s.flatMap((e) => Is(e, o, r, i)).sort((e, t) => e.x - t.x || e.y - t.y);
  }
  var Us = class {
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
  function Ws(e) {
    let { clock: t, now: n, limitMs: r, rowId: i, onExpire: a } = e;
    if (r === null) return { check: () => t.pulse() };
    let o = n() + r,
      s = !1;
    return {
      check() {
        if ((t.pulse(), !s && n() >= o && ((s = !0), a?.(i)), s)) throw new Cr(i);
      },
    };
  }
  let Gs = Object.freeze({ analyzeRows: mr, evaluateRows: jo, plotInputFor: No, plotRow: fs });
  function Ks(e, t) {
    let n = t instanceof Error ? t.name : typeof t;
    e.post({ v: 1, type: `fault`, generation: e.generation, message: n });
  }
  function qs(e, t) {
    let n = /* @__PURE__ */ new Map();
    return (r) => {
      let i = n.get(r);
      if (i !== void 0) return i;
      let a = Ws({ clock: e.clock, now: e.now, limitMs: 250, rowId: r, onExpire: () => t.add(r) });
      return (e.post({ v: 1, type: `begin`, generation: e.generation, rowId: r }), n.set(r, a), a);
    };
  }
  function Js(e, t, n, r = Gs) {
    let i = e.map(({ id: e, latex: t, hidden: n, columns: r, logMode: i }) =>
        r === null
          ? { id: e, latex: t, hidden: n, logMode: i }
          : { id: e, latex: t, hidden: n, columns: r }
      ),
      a = r.analyzeRows(i, t),
      o = /* @__PURE__ */ new Set(),
      s = a,
      c = /* @__PURE__ */ new Map(),
      l = /* @__PURE__ */ new Map(),
      u = /* @__PURE__ */ new Map();
    for (;;)
      try {
        ((l = /* @__PURE__ */ new Map()),
          (u = /* @__PURE__ */ new Map()),
          (c = r.evaluateRows(s, t, qs(n, o), {
            table: (e, t) => l.set(e, t),
            regression: (e, t) => u.set(e, t),
          })));
        break;
      } catch (e) {
        if (e instanceof Cr && e.rowId !== null) {
          let { rowId: n } = e;
          if (s.byId.has(n)) {
            o.add(n);
            let e = i.filter((e) => !o.has(e.id));
            s = r.analyzeRows(e, t);
            continue;
          }
        }
        (Ks(n, e), (c = /* @__PURE__ */ new Map()));
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
        let e = c.get(t) ?? N;
        n.post({ v: 1, type: `value`, generation: d, rowId: t, jobId: null, value: e });
        let r = l.get(t);
        r !== void 0 && n.post({ v: 1, type: `table`, generation: d, rowId: t, table: r });
        let i = u.get(t);
        i !== void 0 && n.post({ v: 1, type: `regression`, generation: d, rowId: t, result: i });
      }
    }
    let f = Mo(s, c, t);
    return { analysis: s, values: c, tables: l, scope: f, overrun: o };
  }
  function Ys(e, t, n, r, i = Gs) {
    if (t.overrun.has(e.id)) return;
    let { generation: a } = r,
      o = e.id;
    if (e.kind === `table`) {
      let n = t.tables.get(o);
      if (e.table === void 0 || n === void 0) return;
      let i = ps(o, e.table, n);
      r.post({ v: 1, type: `plot`, generation: a, rowId: o, geometry: i }, Fo(i));
    } else
      try {
        let s = i.plotInputFor(e, t.scope, t.values.get(o) ?? null);
        if (s === null) return;
        r.post({ v: 1, type: `begin`, generation: a, rowId: o });
        let c = Ws({ clock: r.clock, now: r.now, limitMs: null, rowId: o }),
          l = i.plotRow(s, n, c);
        r.post({ v: 1, type: `plot`, generation: a, rowId: o, geometry: l }, Fo(l));
      } catch (e) {
        Ks(r, e);
      }
  }
  function Xs(e, t) {
    return Kt(e, { userFunctions: Sr(t.functions) });
  }
  function Zs(e, t, n) {
    let r = N;
    try {
      let i = Xs(e.latex, t.analysis);
      if (i.ok && i.tree.kind !== `rel`) {
        let e = Ws({ clock: n.clock, now: n.now, limitMs: 250, rowId: null });
        r = G(i.tree, t.scope)({}, e);
      }
    } catch (e) {
      e instanceof Cr || Ks(n, e);
    }
    let { generation: i } = n;
    n.post({ v: 1, type: `value`, generation: i, rowId: null, jobId: e.jobId, value: r });
  }
  function Qs(e, t, n, r) {
    let { generation: i } = r;
    try {
      let a = Ws({ clock: r.clock, now: r.now, limitMs: 500, rowId: e }),
        o = t.overrun.has(e) ? [] : Hs(e, t.analysis, t.scope, n, a);
      r.post({ v: 1, type: `poi`, generation: i, rowId: e, points: o });
    } catch (e) {
      e instanceof Cr || Ks(r, e);
    }
  }
  let Z = (e) => typeof e == `object` && !!e && !Array.isArray(e),
    Q = (e) => typeof e == `number`,
    $ = (e) => typeof e == `string`,
    $s = (e, t) => Z(e) && t.every((t) => Q(e[t]));
  function ec(e) {
    return Z(e) && e.v === 1;
  }
  function tc(e) {
    if (!Z(e)) return !1;
    let t = e.sliderBounds,
      n = e.columns,
      r =
        Array.isArray(n) &&
        n.every(
          (e) =>
            Z(e) &&
            $(e.latex) &&
            Array.isArray(e.values) &&
            e.values.every($) &&
            typeof e.hidden == `boolean`
        );
    return (
      $(e.id) &&
      ((e.type === `expression` && n === null) || (e.type === `table` && r)) &&
      $(e.latex) &&
      typeof e.logMode == `boolean` &&
      typeof e.hidden == `boolean` &&
      (t === null || (Z(t) && $(t.min) && $(t.max) && $(t.step)))
    );
  }
  function nc(e) {
    return (
      Z(e) &&
      (e.angleMode === `radians` || e.angleMode === `degrees`) &&
      typeof e.complex == `boolean`
    );
  }
  function rc(e) {
    if (!ec(e)) return !1;
    let t = e;
    switch (t.type) {
      case `hello`:
        return Q(t.seed);
      case `state`:
        return (
          Q(t.generation) &&
          Array.isArray(t.rows) &&
          t.rows.every(tc) &&
          nc(t.settings) &&
          Z(t.sliders) &&
          Object.values(t.sliders).every(Q)
        );
      case `view`:
        return (
          Q(t.generation) &&
          $s(t.viewport, [`left`, `right`, `bottom`, `top`]) &&
          $s(t.size, [`width`, `height`]) &&
          Q(t.dpr)
        );
      case `evaluate`:
        return Q(t.jobId) && Q(t.generation) && $(t.latex);
      case `select`:
        return t.rowId === null || $(t.rowId);
      case `dispose`:
        return !0;
      default:
        return !1;
    }
  }
  function ic(e) {
    e.unref?.();
  }
  function ac() {
    let e = null,
      t = !1,
      n = [],
      r = () => {
        let e = new MessageChannel();
        return ((e.port1.onmessage = () => n.shift()?.()), ic(e.port1), ic(e.port2), e);
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
  let oc = (e) => (e instanceof Error ? e.name : typeof e);
  var sc = class {
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
        let e = ac();
        ((this.ownedYield = e), (n = e.yieldToEventLoop));
      } else this.ownedYield = null;
      ((this.timing = {
        now: t.now ?? (() => performance.now()),
        yieldToEventLoop: n,
        sliceMs: t.sliceMs ?? 8,
        heartbeatMs: t.heartbeatMs ?? 200,
      }),
        (this.clock = new Us(this.timing, () =>
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
          let t = oc(e);
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
        ((this.readyPending = !1), this.post({ v: 1, type: `ready`, worker: `karman-compute` }));
      let n = this.state;
      if (n !== null && this.valuesFor !== n) {
        ((this.outcome = Js(n.rows, n.settings, t)), (this.valuesFor = n));
        let r = await this.afterUnit(e);
        if (r !== `go`) return r;
      }
      for (; this.outcome !== null && this.jobs.length > 0; ) {
        Zs(this.jobs.shift(), this.outcome, t);
        let n = await this.afterUnit(e);
        if (n !== `go`) return n;
      }
      let r = this.outcome,
        i = this.view;
      if (r !== null && i !== null && this.plottedFor !== e) {
        for (let n of r.analysis.rows) {
          if (!n.isGraphable) continue;
          Ys(n, r, i, t);
          let a = await this.afterUnit(e);
          if (a !== `go`) return a;
        }
        this.plottedFor = e;
      }
      let a = this.selected;
      if (r !== null && i !== null && a !== null) {
        let n = `${e}:${a}`;
        if (this.poiFor !== n) {
          (Qs(a, r, i, t), (this.poiFor = n));
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
  };
  let cc = globalThis,
    lc = new sc({ post: (e, t) => cc.postMessage(e, t) });
  cc.onmessage = (e) => {
    rc(e.data) && lc.receive(e.data);
  };
})();
