import { n as e } from "./index-5_FSq8Je.js";
import { t } from "./payload-C2YCeRNq.js";
import { o as n, r } from "./transfer-selection-TcC_wRSx.js";
var i = { status: `unavailable`, message: ``, focusRowId: null },
  a = () => ({ status: `rejected`, message: t.rejected, focusRowId: null }),
  o = () => ({ status: `unavailable`, message: t.unavailableReload, focusRowId: null });
function s(e, t) {
  (clearTimeout(e.timer),
    (e.timer = void 0),
    t === e.spoken
      ? ((e.spoken = ``),
        e.say(``),
        (e.timer = setTimeout(() => {
          ((e.timer = void 0), (e.spoken = t), e.say(t));
        }, 50)))
      : ((e.spoken = t), e.say(t)));
}
function c(e, t) {
  e.options.open
    ? !e.handle && !e.opened && (e.opened = { trigger: t, focusDue: !0 })
    : ((e.opened = { trigger: t, focusDue: !0 }), e.options.onOpenChange(!0));
}
function l(e) {
  let t = e.options.frameRef.current;
  t !== null && !t.contains(document.activeElement) && t.focus({ preventScroll: !0 });
}
function u(e, n, l) {
  let u = e.options;
  return e.dead
    ? Promise.resolve(i)
    : n.questionKey === u.questionKey
      ? (r.clear(),
        e.held.length >= 20
          ? (s(e, t.tooManyWaiting),
            Promise.resolve({ status: `queue-full`, message: t.tooManyWaiting, focusRowId: null }))
          : (e.dock(),
            u.status === `failed` && u.failure === `load`
              ? (c(e, l), s(e, t.unavailableReload), Promise.resolve(o()))
              : (c(e, l),
                u.status === `failed` && u.failure === `mount` && s(e, t.unavailableRetry),
                new Promise((t) => {
                  (e.held.push({ payload: n, trigger: l, resolve: t }), e.bump());
                }))))
      : (s(e, t.rejected), Promise.resolve(a()));
}
function d(t) {
  let r = t.handle ?? null;
  if (!t.options.open) {
    (t.wasOpen && (t.opened = null), (t.wasOpen = !1));
    return;
  }
  if (((t.wasOpen = !0), r === null || t.options.status !== `ready`)) return;
  let i = 0,
    o = !1;
  for (; t.held.length > 0 && t.handle === r; ) {
    let c = t.held.shift();
    if (c === void 0) break;
    let u;
    try {
      let e = r.applyTransfer(c.payload, c.trigger);
      u = e == null ? a() : e.status === `rejected` ? n(e) : e;
    } catch (t) {
      (e(t, null), (u = a()));
    }
    (i++,
      u.focusRowId !== null && (o = !0),
      c.trigger === `touch` && l(t),
      s(t, u.message),
      c.resolve(u));
  }
  let c = t.opened;
  i > 0 && c?.focusDue && ((c.focusDue = !1), !o && t.handle === r && r.focusOnOpen(c.trigger));
}
function f(e) {
  let { open: n, status: i, failure: a, frameRef: c } = e.options;
  (n && !e.selectionOpen && r.clear(), (e.selectionOpen = n));
  let l = `${i}:${a}`;
  if (e.failureSeen !== l && i === `failed` && e.held.length > 0) {
    if (a === `load`) {
      s(e, t.unavailableReload);
      for (let t of e.held.splice(0)) t.resolve(o());
    } else a === `mount` && s(e, t.unavailableRetry);
  }
  if (((e.failureSeen = l), !n || i !== `failed` || !e.opened?.focusDue)) return;
  let u = c.current,
    d = a === `load` ? `Reload page` : `Retry`;
  ((
    (u === null ? [] : [...u.querySelectorAll(`button`)]).find(
      (e) => e.textContent?.trim() === d
    ) ?? u
  )?.focus({ preventScroll: !0 }),
    a === `load` && (e.opened.focusDue = !1));
}
function p(e) {
  (clearTimeout(e.timer), (e.timer = void 0));
  for (let t of e.held.splice(0)) t.resolve(i);
  r.clear();
}
export { p as dispose, d as drain, f as settle, u as transfer };
