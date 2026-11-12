import { ANIMAL_ART, STAGES, headSVG, pawsSVG, tailSVG } from "../animals";
import { blink } from "./moods";
import {
  GAP,
  MIN_PEEK,
  anchorOf,
  capFor,
  limitFor,
  setMood,
  spotNow,
  step,
  validSpot,
  type Engine,
  type Rect,
} from "./engine";
import { hop } from "./moves";

/** The drawn parts of one engine (mascot.js build). */
export interface Parts {
  root: SVGGElement;
  head: SVGGElement;
  tail: SVGGElement;
  paws: SVGGElement;
  clipP: SVGPathElement;
  front: SVGGElement;
}

export function build(E: Engine, uid: string): Parts {
  const a = ANIMAL_ART[E.M.animal];
  const st = STAGES[E.M.stage];
  E.svg.innerHTML = `<defs><clipPath id="${uid}c" clipPathUnits="userSpaceOnUse"><path id="${uid}p" clip-rule="evenodd"/></clipPath></defs>
    <g clip-path="url(#${uid}c)"><g class="c-root"><g class="c-head">${headSVG(a, st)}</g></g></g>
    <g class="c-front"><g class="c-tail">${tailSVG(a)}</g><g class="c-paws">${pawsSVG(a)}</g></g>`;
  const q = <T extends Element>(sel: string) => E.svg.querySelector(sel) as T;
  const parts: Parts = {
    root: q(".c-root"),
    head: q(".c-head"),
    tail: q(".c-tail"),
    paws: q(".c-paws"),
    clipP: q(`#${uid}p`),
    front: q(".c-front"),
  };
  E.M.s.size.x = E.M.s.size.t = st.head;
  setMood(E, E.M.mood);
  return parts;
}

// which side of the head the tail lies on: whichever is free of the bar's own contents
function tailFoot(side: number, ax: number, ay: number, size: number): Rect {
  const x1 = ax + side * 26 * size;
  const x2 = ax + side * 112 * size;
  return {
    left: Math.min(x1, x2),
    right: Math.max(x1, x2),
    top: ay - 22 * size,
    bottom: ay + 38 * size,
  };
}
function tailFree(E: Engine, side: number, ax: number, ay: number, size: number, avoid: Rect[]) {
  const f = tailFoot(side, ax, ay, size);
  if (f.left < -30 || f.right > E.host().w + 30) return false;
  return !avoid.some(
    (r) =>
      !(
        f.right < r.left - 10 ||
        f.left > r.right + 10 ||
        f.bottom < r.top - 4 ||
        f.top > r.bottom + 4
      )
  );
}
function drawTail(
  E: Engine,
  P: Parts,
  rot: number,
  ax: number,
  ay: number,
  size: number,
  shown: number
) {
  if (!P.tail.querySelector(".t-base")) return;
  const M = E.M;
  const s = M.s;
  const avoid = M.layout().avoid || [];
  const horiz = rot === 0;
  let want = M.tailSide;
  if (horiz && !tailFree(E, want, ax, ay, size, avoid))
    want = tailFree(E, -want, ax, ay, size, avoid) ? -want : 0;
  if (!horiz) {
    s.tailFade.x = 0;
    s.tailFade.v = 0;
    s.tailFade.t = 0;
  } else if (want !== 0 && want !== M.tailSide) {
    s.tailFade.t = 0;
    if (s.tailFade.x < 0.05) M.tailSide = want;
  } else s.tailFade.t = want !== 0 && shown > 0.45 && !M.next ? 1 : 0;
  const out = Math.max(0, Math.min(1, s.tailFade.x));
  const side = M.tailSide;
  const baseRot = Math.max(-5, Math.min(3, -s.tail.x * 0.3));
  const trail = M.gliding ? Math.max(-12, Math.min(12, s.slide.v * 0.03 * side)) : 0;
  const droop = M.mood === "s" ? 14 : M.mood === "z" ? 10 : 0;
  const tipRot = Math.max(-12, Math.min(26, s.tail.x + droop + trail));
  P.tail.style.opacity = out.toFixed(2);
  P.tail.setAttribute(
    "transform",
    `scale(${side} 1) translate(26 0) scale(${(0.55 + 0.45 * out).toFixed(3)} ${(out * s.puff.x).toFixed(3)}) rotate(${baseRot.toFixed(2)}) translate(-26 0)`
  );
  const tip = P.tail.querySelector<SVGGElement>(".t-tip");
  if (!tip) return;
  const k = Number(tip.dataset.k);
  tip.setAttribute(
    "transform",
    `rotate(${tipRot.toFixed(2)} 84 -5) translate(84 -5) scale(${k}) translate(-84 5)`
  );
}

/** One frame (mascot.js frame): springs, spots, the eyes, the tail, the clip. */
export function frame(E: Engine, P: Parts, t: number, dt: number, blinkAt: { t: number }) {
  const M = E.M;
  const s = M.s;
  // nothing to peek from yet (the layout's refs are not mounted): wait for the next frame
  if (!M.layout().spots.bar && !M.cache[M.spot]) return;
  // finished ducking: move the anchor to the new element, then come out of its edge
  if (M.next && s.peek.x < 0.03) {
    const nm = validSpot(E, M.next) ? M.next : "bar";
    M.next = null;
    M.spot = nm;
    const nsp = spotNow(M, nm);
    const a = anchorOf(nsp);
    s.slide.x = s.slide.t = a.horiz ? a.x : a.y;
    s.peek.v = 0;
    s.peek.t = 1;
    s.squash.v = 3;
    s.cock.x = s.cock.t = nsp.cock || 0;
    s.cock.v = 0;
  }
  // once tucked away between questions, park at home so no stale spot is left behind
  if (!M.visible && !M.next && s.peek.x < 0.03 && M.spot !== "bar") {
    M.spot = "bar";
    M.cache = {};
    const h = anchorOf(spotNow(M, "bar"));
    s.slide.x = s.slide.t = h.x;
    s.cock.x = s.cock.t = 0;
  }
  const sp = spotNow(M, M.spot);
  const a = anchorOf(sp);
  if (M.gliding && Math.abs(s.slide.x - s.slide.t) < 2) {
    M.gliding = false;
    s.peek.t = M.mood === "s" ? 0.6 : 1;
    s.squash.v = 3;
  }
  if (!M.gliding) s.slide.t = a.horiz ? a.x : a.y;
  s.cock.t = sp.cock || 0;
  // vertical bob, capped so the chin never leaves the edge
  M.bobV += 1500 * dt;
  M.bobY += M.bobV * dt;
  if (M.bobY > 0) {
    if (M.bobV > 120) s.squash.v += M.bobV * 0.004;
    M.bobY = 0;
    M.bobV = 0;
  }
  M.bobY = Math.max(M.bobY, -9);
  if (t > blinkAt.t && (M.mood === "n" || M.mood === "w")) {
    if (!M.reduced) blink(E.svg);
    blinkAt.t = t + 1800 + Math.random() * 4200;
  }
  // eyes follow a target element or point, in the head's own frame
  // still: the eyes stay put rather than following the pointer
  const lt = M.reduced
    ? null
    : M.lookTarget || (M.mood === "n" && !M.dozing && M.cursor ? M.cursor : null);
  const isPt = !!lt && !(lt instanceof Element);
  if (lt && (isPt || (lt as Element).isConnected)) {
    const r = isPt ? null : E.local((lt as Element).getBoundingClientRect());
    const tx = isPt ? (lt as { x: number }).x : (r!.left + r!.right) / 2;
    const ty = isPt ? (lt as { y: number }).y : (r!.top + r!.bottom) / 2;
    const hx = a.horiz ? s.slide.x : a.x;
    const hy = a.horiz ? a.y - 30 : s.slide.x;
    let dx = tx - hx;
    let dy = ty - hy;
    const n = Math.hypot(dx, dy) || 1;
    dx /= n;
    dy /= n;
    const rad = (-a.rot * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    s.lookX.t = lx * 5;
    s.lookY.t = ly * 3.6;
    const follow = !M.lookTarget && M.mood === "n" && M.visible && !M.next;
    const lxRaw = (tx - hx) * Math.cos(rad) - (ty - hy) * Math.sin(rad);
    const lyRaw = (tx - hx) * Math.sin(rad) + (ty - hy) * Math.cos(rad);
    M.cursorZip = Math.max(0, M.cursorZip - dt * 2.4);
    s.turn.t = follow ? Math.max(-1, Math.min(1, lxRaw / 240)) : 0;
    s.pitch.t = follow ? Math.max(-1, Math.min(1, (lyRaw + 40) / 260)) : 0;
    s.lean.t = follow ? Math.min(1, Math.max(0, 1 - n / 380) + M.cursorZip * 0.6) : 0;
  } else {
    s.lookX.t = s.lookY.t = s.turn.t = s.pitch.t = s.lean.t = 0;
  }
  s.paw.t = s.peek.x > 0.7 && !M.gliding && !M.next ? 1 : 0;
  M.wag += dt * (M.reduced ? 0 : M.wagRate);
  s.tail.t = Math.sin(M.wag) * M.wagAmp;
  Object.values(s).forEach((sp_) => step(sp_, dt, M.reduced));
  const along = s.slide.x;
  const ax = a.horiz ? along : a.x;
  const ay = a.horiz ? a.y : along;
  const size = s.size.x;
  const depth = 74;
  const breathe = M.reduced ? 1 : 1 + Math.sin(t / 900) * 0.008;
  const L = M.layout();
  const cap = capFor(M, sp, L.keepOut);
  M.cap = cap;
  // its spot lost its room: duck and come out of another fresh spot
  if (M.visible && !M.next && (cap < MIN_PEEK || !L.spots[M.spot]) && t > M.relocAt) {
    M.relocAt = t + 900;
    hop(E);
  }
  s.room.t = cap < 0.32 ? 0 : cap;
  const shown = Math.min(s.peek.x, Math.max(0, s.room.x));
  const reach = (sp.reach || 0) * Math.max(0, Math.min(1, shown, cap - 0.2));
  const leanOut = Math.min(s.lean.x * 9, Math.max(0, (cap - shown) * depth));
  const off = (1 - shown) * depth - reach - leanOut + (cap < 1 ? 0 : M.bobY) + M.push;
  const lean = M.gliding ? Math.max(-9, Math.min(9, s.slide.v * 0.02)) : 0;
  P.root.setAttribute(
    "transform",
    `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${a.rot}) scale(${size.toFixed(3)})`
  );
  P.head.setAttribute(
    "transform",
    `translate(${(s.turn.x * 9).toFixed(1)} ${off.toFixed(1)}) rotate(${(s.tilt.x + lean + s.cock.x + s.turn.x * 15).toFixed(2)} 0 -12) scale(${((2 - s.squash.x) * (1 - Math.abs(s.turn.x) * 0.05)).toFixed(3)} ${(s.squash.x * breathe * (1 + s.lean.x * 0.035 - s.pitch.x * 0.02)).toFixed(3)})`
  );
  drawTail(E, P, a.rot, ax, ay, size, shown);
  const q = <T extends Element>(sel: string) => Array.from(E.svg.querySelectorAll<T>(sel));
  q(".m-eyes").forEach((e) =>
    e.setAttribute("transform", `translate(${s.lookX.x.toFixed(2)} ${s.lookY.x.toFixed(2)})`)
  );
  q(".m-face").forEach((e) =>
    e.setAttribute(
      "transform",
      `translate(${(s.turn.x * 6).toFixed(2)} ${(s.pitch.x * 3.5).toFixed(2)})`
    )
  );
  const eg = M.gliding ? 16 : 0;
  const earsEl = q(".m-ear");
  const perk = s.lean.x * 8;
  const side = s.turn.x * 10; // the ear nearer the cursor perks forward
  earsEl[0]?.setAttribute(
    "transform",
    `rotate(${(-(s.earL.x + eg) + perk + Math.max(0, -side)).toFixed(2)} -22 -44)`
  );
  earsEl[1]?.setAttribute(
    "transform",
    `rotate(${(s.earR.x + eg - perk - Math.max(0, side)).toFixed(2)} 22 -44)`
  );
  P.front.setAttribute(
    "transform",
    `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${a.rot}) scale(${size.toFixed(3)})`
  );
  const pw = q<SVGGElement>(".m-paw");
  const lift = s.pawLift.x;
  P.paws.setAttribute("transform", `translate(0 ${((1 - s.paw.x) * 16).toFixed(1)})`);
  P.paws.style.opacity = a.horiz ? Math.max(0, Math.min(1, s.paw.x)).toFixed(2) : "0";
  pw[1]?.setAttribute(
    "transform",
    `translate(${(lift * 4).toFixed(1)} ${(-lift * 14).toFixed(1)}) rotate(${(-lift * 18).toFixed(1)} 21 1)`
  );
  // last line of defence: measure the real outline and push the head back behind its edge near text
  const lim = limitFor(sp, L.keepOut);
  if (lim !== null) {
    const hb = E.local(P.head.getBoundingClientRect());
    const v =
      sp.side === "top"
        ? lim + GAP - hb.top
        : sp.side === "bottom"
          ? hb.bottom - (lim - GAP)
          : sp.side === "right"
            ? hb.right - (lim - GAP)
            : lim + GAP - hb.left;
    if (v > 0) M.push = M.push + v / size + 0.5;
    else if (v < -6) M.push = Math.max(0, M.push - 40 * dt);
  } else M.push = Math.max(0, M.push - 40 * dt);
  // the clip hides the companion inside the element it peeks out of
  const r = sp.rect;
  const { w: W, h: H } = E.host();
  P.clipP.setAttribute(
    "d",
    `M0 0 H${W} V${H} H0Z M${r.left} ${r.top} V${r.bottom} H${r.right} V${r.top}Z`
  );
}
