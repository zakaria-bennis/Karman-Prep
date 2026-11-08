var e = [
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
    `ln`,
    `log`,
    `exp`,
  ],
  t = [
    `alpha`,
    `beta`,
    `gamma`,
    `delta`,
    `epsilon`,
    `zeta`,
    `eta`,
    `theta`,
    `iota`,
    `kappa`,
    `lambda`,
    `mu`,
    `nu`,
    `xi`,
    `rho`,
    `sigma`,
    `upsilon`,
    `phi`,
    `chi`,
    `psi`,
    `omega`,
  ],
  n = [`cm`, `mm`, `km`, `ft`, `yd`, `mi`, `in`, `hr`, `kg`, `lb`, `oz`, `mL`],
  r = new Set(
    `prime.ldots.cdots.dots.approx.sim.cong.equiv.ne.neq.pm.mp.infty.in.notin.subset.cup.cap.to.Rightarrow.iff.text.mathrm.textrm.mbox.circ.degree.angle.measuredangle.triangle.overleftrightarrow.overrightarrow.widehat.parallel.perp.square.odot.overline`.split(
      `.`
    )
  ),
  i = new Set([`'`, `?`, `°`, `$`, `¢`, `€`, `£`, `¥`]),
  a = new Set([`cases`, `aligned`, `gathered`, `array`]),
  o = /^[pbvBV]?matrix$|^smallmatrix$/,
  s = {
    "+": `op`,
    "-": `op`,
    "/": `op`,
    "^": `op`,
    _: `op`,
    "=": `rel`,
    "<": `rel`,
    ">": `rel`,
    "(": `open`,
    ")": `close`,
    "{": `open`,
    "}": `close`,
    ",": `comma`,
    ";": `semi`,
  },
  c = (e) => e !== void 0 && /^[A-Za-z]$/.test(e),
  l = (e) => e !== void 0 && e >= `0` && e <= `9`,
  u = (e) => e !== void 0 && /^\s$/.test(e),
  d = class extends Error {
    constructor(e, t) {
      (super(t), (this.rule = e), (this.detail = t));
    }
  },
  f = (e, t) => {
    throw new d(e, t);
  };
function p(e) {
  try {
    return { ok: !0, tokens: new m(e).run() };
  } catch (e) {
    if (e instanceof d) return { ok: !1, rule: e.rule, detail: e.detail };
    throw e;
  }
}
var m = class {
    constructor(e) {
      ((this.s = e),
        (this.i = 0),
        (this.tokens = []),
        (this.environments = 0),
        (this.sqrtIndexes = 0));
    }
    run() {
      let { s: e } = this;
      for (; this.i < e.length; ) {
        let t = e[this.i];
        u(t)
          ? this.i++
          : l(t) || (t === `.` && l(e[this.i + 1]))
            ? this.number()
            : t === `.`
              ? f(e.startsWith(`...`, this.i) ? `TR-9` : `TR-8`, `stray .`)
              : c(t)
                ? this.letters()
                : t === `\\`
                  ? this.command()
                  : this.symbol(t);
      }
      return this.tokens;
    }
    push(e, t, n, r) {
      (this.tokens.push({ kind: e, text: t, start: n, end: r }), (this.i = r));
    }
    skipSpaces(e) {
      let t = e;
      for (; u(this.s[t]); ) t++;
      return t;
    }
    number() {
      let { s: e } = this,
        t = this.i,
        n = t;
      for (; l(e[n]); ) n++;
      if (e[n] === `.` && l(e[n + 1])) for (n++; l(e[n]); ) n++;
      (e[n] === `.` && f(e.startsWith(`...`, n) ? `TR-9` : `TR-8`, `dot after a number`),
        this.push(`num`, e.slice(t, n), t, n));
    }
    letters() {
      let { s: t } = this,
        r = this.i,
        i = r;
      for (; c(t[i]); ) i++;
      let a = t.slice(r, i);
      if (e.includes(a)) return this.push(`fn`, a, r, i);
      (a.length >= 3 && f(`TR-9`, `letter run ${a}`),
        n.includes(a) && this.tokens.at(-1)?.kind === `num` && f(`TR-9`, `unit ${a}`));
      for (let e = r; e < i; e++)
        (t[e] === `i` && f(`TR-9`, `identifier i`),
          e < i - 1 ? this.push(`name`, t[e], e, e + 1) : this.identifier(t[e], e, e + 1));
    }
    identifier(e, t, n) {
      let { s: r } = this,
        i = this.skipSpaces(n);
      if (r[i] !== `_`) return this.push(`name`, e, t, n);
      let a = r[i + 1];
      if (a === `{`) {
        let n = r.indexOf(`}`, i + 2),
          a = n < 0 ? `` : r.slice(i + 2, n);
        return (
          /^[A-Za-z0-9]+$/.test(a) || f(`TR-8`, `subscript`),
          this.push(`name`, `${e}_{${a}}`, t, n + 1)
        );
      }
      return c(a) || l(a) ? this.push(`name`, `${e}_{${a}}`, t, i + 2) : f(`TR-8`, `subscript`);
    }
    command() {
      let { s: n } = this,
        i = this.i,
        a = i + 1;
      for (; c(n[a]); ) a++;
      if (a === i + 1) return this.controlSymbol(i);
      let o = n.slice(i + 1, a),
        s = this.skipSpaces(a);
      switch (o) {
        case `frac`:
          return (
            n[s] !== `{` && f(`TR-8`, `brace-less \\frac`),
            this.push(`frac`, `\\frac`, i, a)
          );
        case `sqrt`:
          return (
            n[s] === `[` ? this.sqrtIndexes++ : n[s] !== `{` && f(`TR-8`, `brace-less \\sqrt`),
            this.push(`sqrt`, `\\sqrt`, i, a)
          );
        case `cdot`:
          return this.push(`op`, `*`, i, a);
        case `div`:
          return this.push(`op`, `/`, i, a);
        case `le`:
          return this.push(`rel`, `<=`, i, a);
        case `ge`:
          return this.push(`rel`, `>=`, i, a);
        case `pi`:
          return this.push(`pi`, `\\pi`, i, a);
        case `left`:
        case `right`:
          return this.delimiter(o, i, s);
        case `begin`:
        case `end`:
          return this.environment(o, i, s);
      }
      if (e.includes(o)) return this.push(`fn`, o, i, a);
      if (t.includes(o)) return this.identifier(`\\${o}`, i, a);
      (r.has(o) && f(`TR-9`, `\\${o}`), f(`TR-8`, `\\${o}`));
    }
    controlSymbol(e) {
      let t = this.s[e + 1];
      if (t === `\\` && this.environments > 0) return this.push(`newline`, `\\\\`, e, e + 2);
      ((t === `$` || t === `%`) && f(`TR-9`, `\\${t}`), f(`TR-8`, `\\${t ?? ``}`));
    }
    delimiter(e, t, n) {
      let { s: r } = this,
        i = r[n],
        a = n + 1;
      if (e === `left` && i === `(`) return this.push(`open`, `(`, t, a);
      if (e === `right` && i === `)`) return this.push(`close`, `)`, t, a);
      if (i === `|`) return this.push(e === `left` ? `absOpen` : `absClose`, `\\${e}|`, t, a);
      if (e === `left` && r.startsWith(`\\{`, n))
        return this.push(`sysOpen`, `\\left\\{`, t, n + 2);
      if (e === `right` && i === `.`) return this.push(`sysClose`, `\\right.`, t, a);
      ((i === `[` || i === `]`) && f(`TR-9`, `bracket`), f(`TR-8`, `\\${e}`));
    }
    environment(e, t, n) {
      let { s: r } = this,
        i = r[n] === `{` ? r.indexOf(`}`, n) : -1,
        s = i < 0 ? `` : r.slice(n + 1, i);
      (o.test(s) && f(`TR-9`, `matrix ${s}`), a.has(s) || f(`TR-8`, `environment ${s}`));
      let c = i + 1;
      if (e === `begin` && s === `array`) {
        let e = this.skipSpaces(c),
          t = r[e] === `{` ? r.indexOf(`}`, e) : -1,
          n = t < 0 ? `` : r.slice(e + 1, t).replace(/\s/g, ``);
        ((n.match(/[lcr]/g) ?? []).length > 1 && f(`TR-9`, `multi-column array`),
          /^[lcr]$/.test(n) || f(`TR-8`, `array column spec`),
          (c = t + 1));
      }
      ((this.environments += e === `begin` ? 1 : -1), this.push(e, s, t, c));
    }
    symbol(e) {
      let t = this.i;
      if (e === `&` && this.environments > 0) return this.push(`amp`, `&`, t, t + 1);
      if (e === `[`)
        return (
          this.tokens.at(-1)?.kind !== `sqrt` && f(`TR-9`, `bracket`),
          this.push(`open`, `[`, t, t + 1)
        );
      if (e === `]`)
        return (
          this.sqrtIndexes === 0 && f(`TR-9`, `bracket`),
          this.sqrtIndexes--,
          this.s[this.skipSpaces(t + 1)] !== `{` && f(`TR-8`, `\\sqrt index without argument`),
          this.push(`close`, `]`, t, t + 1)
        );
      i.has(e) && f(`TR-9`, e);
      let n = s[e];
      if (!n) return f(`TR-8`, e);
      this.push(n, e, t, t + 1);
    }
  },
  h = `αβγδεζηθικλμνξρσυφχψω`,
  g = Object.fromEntries(t.map((e, t) => [e, h[t]])),
  _ = {
    cdot: [`·`, `operator`],
    times: [`·`, `operator`],
    div: [`÷`, `operator`],
    pi: [`π`, `operand`],
  },
  v = { le: `≤`, leq: `≤`, ge: `≥`, geq: `≥` },
  y = `₀₁₂₃₄₅₆₇₈₉`,
  b = /[\s+\-·÷/*^=<>≤≥]/,
  x = /^\p{L}(?:[₀-₉]+|_[A-Za-z0-9]+)?$/u,
  S = /^[\p{L}\d(√∛∜]/u,
  C = class {
    constructor(e) {
      ((this.s = e),
        (this.i = 0),
        (this.out = []),
        (this.last = `start`),
        (this.pendingFraction = -1),
        (this.functionSpace = !1));
    }
    run() {
      for (; this.i < this.s.length; ) this.step();
      return this.out.join(``).replace(/ {2,}/g, ` `).trim();
    }
    emit(e, t, n = !1) {
      e !== `` &&
        (this.pendingFraction >= 0 &&
          S.test(e) &&
          (this.out[this.pendingFraction] = `(${this.out[this.pendingFraction]})`),
        (this.pendingFraction = -1),
        this.functionSpace &&
          !n &&
          (/^[\p{L}\d]/u.test(e) && (e = ` ${e}`), (this.functionSpace = !1)),
        this.out.push(e),
        (this.last = t));
    }
    argument() {
      let { s: e } = this;
      for (; /\s/.test(e[this.i] ?? ``); ) this.i++;
      let t = this.i;
      if (e[t] === `{`) {
        let n = 0;
        for (let r = t; r < e.length; r++)
          if (e[r] === `\\`) r++;
          else if (e[r] === `{`) n++;
          else if (e[r] === `}` && --n === 0) return ((this.i = r + 1), e.slice(t + 1, r));
        return ((this.i = e.length), e.slice(t + 1));
      }
      if (e[t] === `\\`) {
        let n = t + 1;
        for (; /[A-Za-z]/.test(e[n] ?? ``); ) n++;
        return ((this.i = Math.max(n, t + 2)), e.slice(t, this.i));
      }
      return ((this.i = t + 1), e.slice(t, t + 1));
    }
    step() {
      let t = this.s[this.i];
      if (/\s/.test(t)) this.i++;
      else if (/[0-9.]/.test(t)) {
        let e = this.i;
        for (; /[0-9.]/.test(this.s[e] ?? ``); ) e++;
        (this.emit(this.s.slice(this.i, e), `operand`), (this.i = e));
      } else if (/[A-Za-z]/.test(t)) {
        let n = this.i;
        for (; /[A-Za-z]/.test(this.s[n] ?? ``); ) n++;
        let r = this.s.slice(this.i, n);
        e.includes(r) ? ((this.i = n), this.function(r)) : (this.emit(t, `operand`), this.i++);
      } else
        t === `\\`
          ? this.command()
          : t === `^` || t === `_`
            ? (this.i++, this.script(t))
            : this.symbol(t);
    }
    symbol(e) {
      if ((this.i++, e === `=` || e === `<` || e === `>`)) this.emit(` ${e} `, `operator`);
      else if (e === `+` || e === `-`)
        this.emit(this.last === `operand` ? ` ${e} ` : e, `operator`);
      else if (e === `(` || e === `[`) this.emit(e, `open`);
      else if (e === `)` || e === `]`) this.emit(e, `operand`);
      else if (e === `|`) this.emit(`|`, this.last === `operand` ? `operand` : `open`);
      else if (e === `,` || e === `;`) this.emit(`${e} `, `operator`);
      else if (e === `*`) this.emit(`·`, `operator`);
      else if (e === `/`) this.emit(`/`, `operator`);
      else if (e === `{` || e === `}` || e === `&`) return;
      else this.emit(e, `operand`);
    }
    command() {
      let { s: t } = this,
        n = this.i,
        r = n + 1;
      for (; /[A-Za-z]/.test(t[r] ?? ``); ) r++;
      if (r === n + 1) {
        let e = t[n + 1] ?? ``;
        ((this.i = n + 2),
          (e === `{` || e === `}`) && this.emit(e, e === `{` ? `open` : `operand`));
        return;
      }
      let i = t.slice(n + 1, r);
      if (((this.i = r), i === `left` || i === `right`)) return this.delimiter(i);
      if (i === `frac`) return this.fraction();
      if (i === `sqrt`) return this.radical();
      if (v[i]) return this.emit(` ${v[i]} `, `operator`);
      let a = _[i];
      if (a) return this.emit(a[0], a[1]);
      if (g[i]) return this.emit(g[i], `operand`);
      if (e.includes(i)) return this.function(i);
      this.emit(i, `operand`);
    }
    delimiter(e) {
      for (; /\s/.test(this.s[this.i] ?? ``); ) this.i++;
      let t = this.s[this.i];
      if (t !== void 0) {
        if (t === `\\`) {
          this.i += 2;
          let t = this.s[this.i - 1];
          (t === `{` || t === `}`) && this.emit(t, e === `left` ? `open` : `operand`);
        } else (this.i++, t !== `.` && this.emit(t, e === `left` ? `open` : `operand`));
      }
    }
    function(e) {
      (this.emit(e, `operand`), (this.functionSpace = !0));
    }
    script(e) {
      let t = this.functionSpace,
        n = w(this.argument()),
        r;
      ((r =
        e === `_`
          ? /^\d+$/.test(n)
            ? [...n].map((e) => y[Number(e)]).join(``)
            : `_${n}`
          : n === `2` || n === `3`
            ? n === `2`
              ? `²`
              : `³`
            : /^\d+$/.test(n) || [...n].length === 1
              ? `^${n}`
              : `^(${n})`),
        this.emit(r, `operand`, !0),
        (this.functionSpace = t));
    }
    fraction() {
      let e = (e) => {
          let t = w(e);
          return b.test(t) ? `(${t})` : t;
        },
        t = e(this.argument()),
        n = e(this.argument());
      (this.emit(`${t}/${n}`, `operand`), (this.pendingFraction = this.out.length - 1));
    }
    radical() {
      for (; /\s/.test(this.s[this.i] ?? ``); ) this.i++;
      let e = null;
      if (this.s[this.i] === `[`) {
        let t = this.s.indexOf(`]`, this.i);
        ((e = w(this.s.slice(this.i + 1, t < 0 ? this.s.length : t))),
          (this.i = t < 0 ? this.s.length : t + 1));
      }
      let t = w(this.argument()),
        n = /^\d+$/.test(t) || x.test(t);
      e === null || e === `2`
        ? this.emit(n ? `√${t}` : `√(${t})`, `operand`)
        : e === `3` || e === `4`
          ? this.emit(`${e === `3` ? `∛` : `∜`}${n ? t : `(${t})`}`, `operand`)
          : this.emit(`√[${e}](${t})`, `operand`);
    }
  };
function w(e) {
  return new C(e).run();
}
function T(e) {
  let t = w(e);
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}
function E(e) {
  let t = e.length;
  return `system of ${t} ${e.every((e) => e === `equation`) ? (t === 1 ? `equation` : `equations`) : e.every((e) => e === `inequality`) ? (t === 1 ? `inequality` : `inequalities`) : `equations and inequalities`}`;
}
function D(e) {
  return `choice ${e}`;
}
export { p as a, w as i, T as n, E as r, D as t };
