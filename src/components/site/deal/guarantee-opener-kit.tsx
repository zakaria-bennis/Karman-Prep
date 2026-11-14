"use client";

// TRIAL: what the five guarantee openings share (GuaranteeOpeners.tsx): the sum itself, a number that runs
// to its new value, and the signature.
import { useEffect, useRef, useState } from "react";
import { arman, SIG } from "@/components/site/home/signature";
import {
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  PRIVATE_PACKAGES,
  guaranteedGain,
} from "@/lib/marketing/offer";

const [P10, P20] = PRIVATE_PACKAGES;
export const PLANS = [
  { id: "cohort", name: "The cohort", short: "Cohort", price: MP.price },
  { id: "private-10", name: P10.name, short: P10.name, price: P10.price },
  { id: "private-20", name: P20.name, short: P20.name, price: P20.price },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];

export const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export const MIN = 800;
export const MAX = 1590;

/** Everything the pictures need for one starting score on one plan. */
export function deal(start: number, planId: PlanId) {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const gain = guaranteedGain(start, G.trackOf[planId]);
  const cohort = planId === "cohort";
  const sessions = cohort ? 0 : G.private.packages[planId].freeSessions;
  return {
    plan,
    start,
    cohort,
    /** Points promised; null from 1460, where the promise is only that the score rises. */
    gain,
    target: gain === null ? null : Math.min(G.topScore, start + gain),
    price: plan.price,
    half: plan.price / 2,
    /** The most that comes back. */
    most: cohort ? plan.price : plan.price / 2,
    orElse: cohort ? "the next cohort free" : `${sessions} free sessions`,
  };
}
export type Deal = ReturnType<typeof deal>;

/** A number that runs to its new value instead of jumping. */
export function useRun(to: number, ms = 520) {
  const [v, setV] = useState(to);
  const at = useRef(to);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      at.current = to;
      setV(to);
      return;
    }
    const from = at.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      at.current = from + (to - from) * (1 - Math.pow(1 - k, 3));
      setV(at.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

/** "Karman" as the founder signs it: the home page's signature (home/Guarantee.tsx), repeated here for the
 *  trial only. */
export function Signature() {
  return (
    <svg className="go-sig" viewBox="130 118 850 196" role="img" aria-label="Signed, Karman">
      <path pathLength={1} d="M176 128 C 179 170, 178 232, 162 300" />
      <path
        pathLength={1}
        d="M312 150 C 314 132, 298 126, 284 140 C 256 172, 214 222, 166 266 C 190 240, 232 212, 268 212 C 304 213, 322 250, 360 274 C 400 298, 470 306, 590 302 C 720 298, 850 290, 958 278"
      />
      <path className="brush" pathLength={1} style={{ strokeWidth: SIG.pen }} d={arman(SIG)} />
      <path pathLength={1} d="M741 212 C 765 220, 800 221, 845 216 C 895 212, 930 222, 950 230" />
    </svg>
  );
}
