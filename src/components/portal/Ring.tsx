/*
 * Rings: every progress measure is a ring, never a bar (founder pick, 2026-11-08).
 * The track is a faint ink; the fill takes the painting's color. Numbers inside are Hanken.
 */
import type { CSSProperties, ReactNode } from "react";
import { SKILL_LEVELS, type SkillLevel } from "./skill-levels";

/** A single progress ring. `value` is a fraction from 0 to 1. */
export function Ring({
  value,
  label,
  children,
  size = 56,
  width = 6,
  color,
}: {
  value: number;
  /** What the ring measures, for screen readers ("Homework: 2 of 6 done"). */
  label: string;
  /** Text inside the ring, usually the number. */
  children?: ReactNode;
  size?: number;
  width?: number;
  /** Fill color. Defaults to the painting's third shade. */
  color?: string;
}) {
  const p = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const style = {
    "--p": p,
    "--s": `${size}px`,
    "--w": `${width}px`,
    ...(color ? { "--ring-color": color } : {}),
  } as CSSProperties;
  return (
    <span className="kp-ring" style={style} role="img" aria-label={label}>
      {children !== undefined && <b aria-hidden="true">{children}</b>}
    </span>
  );
}

/**
 * A ring split by skill level: one arc per level, sized by how many skills sit there.
 * `counts[level]` is the number of skills at that level (0 = not started).
 */
export function LevelRing({
  counts,
  children,
  size = 96,
  width = 10,
  label,
}: {
  counts: Partial<Record<SkillLevel, number>>;
  children?: ReactNode;
  size?: number;
  width?: number;
  label?: string;
}) {
  const total = SKILL_LEVELS.reduce((n, l) => n + (counts[l.level] ?? 0), 0);
  let at = 0;
  const stops: string[] = [];
  for (const l of SKILL_LEVELS) {
    const c = counts[l.level] ?? 0;
    if (!c || !total) continue;
    const from = at;
    at += c / total;
    const color = l.color ?? "color-mix(in srgb, var(--ink) 14%, transparent)";
    stops.push(`${color} ${from}turn ${at - 0.006}turn, transparent ${at - 0.006}turn ${at}turn`);
  }
  const gradient = stops.length
    ? `conic-gradient(${stops.join(", ")})`
    : "conic-gradient(color-mix(in srgb, var(--ink) 14%, transparent) 0 1turn)";
  const style = { "--s": `${size}px`, "--w": `${width}px`, "--g": gradient } as CSSProperties;
  const spoken =
    label ??
    SKILL_LEVELS.filter((l) => counts[l.level])
      .map((l) => `${l.name} ${counts[l.level]}`)
      .join(", ");
  return (
    <span className="kp-ring" style={style} role="img" aria-label={spoken || "No skills yet"}>
      {children !== undefined && <b aria-hidden="true">{children}</b>}
    </span>
  );
}
