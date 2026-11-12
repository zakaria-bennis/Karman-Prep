/*
 * Which numbers count up (Num, portal-motion.css): a whole number with an optional sign or $
 * before it and an optional % after it, such as 1340, +40, 62% or $39. Anything else (a decimal,
 * a thousands comma, a range, words) stays as written.
 */
import type { ReactNode } from "react";

export interface CountParts {
  pre: string;
  value: number;
  post: string;
}

const SHAPE = /^([+−-]?\$?)(\d{1,6})(%?)$/;

export function countParts(children: ReactNode): CountParts | null {
  // JSX splits `{n}%` into ["62", "%"]: join plain pieces back into one string.
  const pieces = Array.isArray(children) ? children : [children];
  if (!pieces.every((p) => typeof p === "string" || typeof p === "number")) return null;
  if (pieces.some((p) => typeof p === "number" && !Number.isInteger(p))) return null;
  const text = pieces.join("").trim();
  const m = SHAPE.exec(text);
  if (!m) return null;
  // The sign stays in front as written; the counter climbs the digits.
  return { pre: m[1], value: Number(m[2]), post: m[3] };
}
