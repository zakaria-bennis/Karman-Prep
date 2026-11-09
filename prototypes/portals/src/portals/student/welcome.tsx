import { useMemo } from "react";
import { cn } from "@/design-system/cn";
import { WELCOMES, groupsFor, type WelcomeContext, type WelcomeLine } from "@/mock/welcomes";

/*
 * The student's welcome line: the shared picker (src/mock/welcomes.ts) with
 * two corrections the founder's copy rules need. School-day lines (school,
 * class, the bus, first period) never show on a weekend, and the Daily 10 is
 * named in full (rule 53). Candidate for promotion: a `schoolDay` flag on the
 * shared lines and the rewrite of w49 in place.
 */
const SCHOOL_DAY = /\b(school|the bus|first period|class)\b/i;
const REWRITES: Record<string, string> = { w49: "Morning, {name}. Your Daily 10 is ready" };
const DAY_WORDS: Record<number, RegExp> = {
  1: /monday/i,
  2: /tuesday/i,
  3: /wednesday/i,
  4: /thursday/i,
  5: /friday/i,
  6: /saturday/i,
  0: /sunday/i,
};
const KEY = "karman-welcome-last";

export function pickStudentWelcome(
  c: WelcomeContext,
  lastId: string | null,
  hasName = true
): WelcomeLine {
  const groups = groupsFor(c);
  const weekend = c.weekday === 0 || c.weekday === 6;
  let pool = WELCOMES.map((w) => (REWRITES[w.id] ? { ...w, text: REWRITES[w.id] } : w)).filter(
    (w) => groups.slice(0, 2).includes(w.group)
  );
  if (weekend) pool = pool.filter((w) => w.group === "classday" || !SCHOOL_DAY.test(w.text));
  if (!hasName) pool = pool.filter((w) => !w.text.includes("{name}"));
  pool = pool.filter((w) => {
    const named = Object.entries(DAY_WORDS).find(([, re]) => re.test(w.text));
    return !named || Number(named[0]) === c.weekday;
  });
  pool = pool.filter((w) => w.id !== lastId);
  if (!pool.length) pool = WELCOMES.filter((w) => w.group === "any" && w.id !== lastId);
  const i = Math.abs((c.seed ?? c.hour * 7 + c.weekday) * 2654435761) % pool.length;
  return pool[i];
}

export function StudentWelcome({
  name,
  context,
  className,
}: {
  name?: string;
  context: WelcomeContext;
  className?: string;
}) {
  const line = useMemo(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(KEY);
    } catch {
      /* storage can be off */
    }
    const picked = pickStudentWelcome(context, last, Boolean(name));
    try {
      localStorage.setItem(KEY, picked.id);
    } catch {
      /* storage can be off */
    }
    return picked.text.replace("{name}", name ?? "");
  }, [context, name]);
  return <p className={cn("text-body text-muted", className)}>{line}</p>;
}

console.assert(
  Array.from(
    { length: 40 },
    (_, seed) => pickStudentWelcome({ hour: 9, weekday: 6, seed }, null).text
  ).every((t) => !SCHOOL_DAY.test(t)),
  "no school-day line on a Saturday morning"
);
console.assert(
  !WELCOMES.some((w) => REWRITES[w.id] === undefined && /Daily 10 is ready/.test(w.text)),
  "the Daily 10 is named in full"
);
