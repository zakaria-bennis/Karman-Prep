// Complex arithmetic stays local. Graphing and table coordinates require real values.
const isComplex = (v) =>
  v && typeof v === "object" && Number.isFinite(v.re) && Number.isFinite(v.im);
const parts = (v) => (isComplex(v) ? v : { re: v, im: 0 });
const complex = (re, im) => (Math.abs(im) < 1e-14 ? re : { re, im });
const addValue = (a, b) => {
  if (!isComplex(a) && !isComplex(b)) return a + b;
  a = parts(a);
  b = parts(b);
  return complex(a.re + b.re, a.im + b.im);
};
const negValue = (a) => (isComplex(a) ? complex(-a.re, -a.im) : -a);
const multiplyValue = (a, b) => {
  if (!isComplex(a) && !isComplex(b)) return a * b;
  a = parts(a);
  b = parts(b);
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
};
const divideValue = (a, b) => {
  if (!isComplex(a) && !isComplex(b)) return a / b;
  a = parts(a);
  b = parts(b);
  const d = b.re * b.re + b.im * b.im;
  return complex((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
function complexMath(base, enabled, unit) {
  const exp = (a) => {
    if (!isComplex(a)) return Math.exp(a);
    return complex(Math.exp(a.re) * Math.cos(a.im), Math.exp(a.re) * Math.sin(a.im));
  };
  const log = (a) => {
    if (!isComplex(a) && a >= 0) return Math.log(a);
    a = parts(a);
    return complex(Math.log(Math.hypot(a.re, a.im)), Math.atan2(a.im, a.re));
  };
  const pow = (a, b) => {
    if (!isComplex(a) && !isComplex(b) && (!(a < 0 && !Number.isInteger(b)) || !enabled))
      return a ** b;
    return exp(multiplyValue(b, log(a)));
  };
  const operations = {
    add: addValue,
    sub: (a, b) => addValue(a, negValue(b)),
    mul: multiplyValue,
    div: divideValue,
    pow,
    neg: negValue,
  };
  if (!enabled) return Object.freeze({ ...base, ...operations });
  return Object.freeze({
    ...base,
    ...operations,
    exp,
    ln: log,
    log: (a) => divideValue(log(a), Math.LN10),
    sqrt: (a) => pow(a, 0.5),
    abs: (a) => (isComplex(a) ? Math.hypot(a.re, a.im) : Math.abs(a)),
    sin: (a) => {
      if (!isComplex(a)) return base.sin(a);
      a = parts(multiplyValue(a, unit));
      return complex(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
    },
    cos: (a) => {
      if (!isComplex(a)) return base.cos(a);
      a = parts(multiplyValue(a, unit));
      return complex(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
    },
  });
}
