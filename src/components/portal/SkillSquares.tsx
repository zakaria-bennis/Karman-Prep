/*
 * Skills are squares (founder pick, 2026-11-08): an outline for not started, then the four
 * shades of the day's painting for New, Learning, Understanding and Conquered.
 */
import { clampLevel, levelName } from "./skill-levels";

export interface SkillSquare {
  /** 0 not started, 1 New, 2 Learning, 3 Understanding, 4 Conquered. */
  level: number;
  /** The skill's name, shown on hover and read by screen readers. */
  name?: string;
}

export function SkillSquares({
  skills,
  label,
  align = "start",
}: {
  skills: (SkillSquare | number)[];
  /** Names the group, for example "Algebra: 3 of 5 at Understanding or above". */
  label: string;
  align?: "start" | "end";
}) {
  return (
    <span
      className="kp-sqs"
      role="img"
      aria-label={label}
      style={{ justifyContent: align === "end" ? "flex-end" : "flex-start" }}
    >
      {skills.map((s, i) => {
        const sq = typeof s === "number" ? { level: s } : s;
        const level = clampLevel(sq.level);
        const title = sq.name ? `${sq.name}: ${levelName(level)}` : levelName(level);
        return <i key={i} className="kp-sq" data-level={level} title={title} />;
      })}
    </span>
  );
}
