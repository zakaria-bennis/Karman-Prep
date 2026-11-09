const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = ["./transfer-report-send-CIxhL5Wt.js", "./index-5_FSq8Je.js", "./index-Bpqebwq7.css"])
) => i.map((i) => d[i]);
import { r as e } from "./index-5_FSq8Je.js";
var t = new WeakSet();
function n(e) {
  return (t.add(e), e);
}
function r(e) {
  return t.has(e);
}
function i(t, n) {
  e(
    () => import(`./transfer-report-send-CIxhL5Wt.js`).then((e) => e.sendTransferRejection(t, n)),
    __vite__mapDeps([0, 1, 2]),
    import.meta.url
  ).catch(() => {});
}
var a = (e) => e === `touch` || e === `pen`;
function o(e) {
  return e.pointerType === `mouse` || (e.pointerType === `pen` && e.buttons === 0);
}
function s(e, t, n, r) {
  return !a(e.pointerType) || !a(t.pointerType)
    ? !1
    : Math.max(n, Math.hypot(t.x - e.x, t.y - e.y)) <= 10 && t.t - e.t < 500 && r;
}
function c(e, t) {
  return e === null
    ? `keyboard`
    : e.pointerType === `touch`
      ? `touch`
      : e.pointerType === `pen`
        ? t
          ? `mouse`
          : `touch`
        : `mouse`;
}
var l = null,
  u = new Set();
function d(e) {
  l = e;
  for (let e of [...u]) e();
}
var f = {
  get() {
    return l;
  },
  toggle(e) {
    d(
      l !== null && l.questionKey === e.questionKey && l.sourceId === e.sourceId
        ? null
        : { questionKey: e.questionKey, sourceId: e.sourceId }
    );
  },
  clear() {
    l !== null && d(null);
  },
  subscribe(e) {
    return (u.add(e), () => u.delete(e));
  },
  resetForTests() {
    ((l = null), u.clear());
  },
};
export { r as a, c as i, s as n, n as o, f as r, i as s, o as t };
