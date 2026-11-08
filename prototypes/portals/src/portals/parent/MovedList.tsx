import type { SkillLevel } from "@/mock";
import { BANDS, LevelBar, band } from "@/design-system/marks/LevelMark";
import { cn } from "@/design-system/cn";
import { useArrived } from "./arrive";

/*
 * MovedList: the skills that moved this week. A row: the skill, its four
 * level bars (the lost stretch drawn when it fell), and the change as a
 * signed number in the positive or negative ink. The second line appears only
 * when the level changed band ("Now Proficient"), a state (rule 51). The name
 * is the identity column and wraps rather than being cut. Bars fill on
 * arrival, the entrance of Skills Progress Dashboard (21st.dev 19138).
 */
export function MovedList({
  items,
  max = 5,
  className,
}: {
  items: SkillLevel[];
  max?: number;
  className?: string;
}) {
  const arrived = useArrived();
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {items.slice(0, max).map((s, i) => {
        const d = s.now - s.was;
        const changed = band(s.was) !== s.band;
        return (
          <li
            key={s.id}
            className="grid min-h-12 grid-cols-[minmax(0,1fr)_88px_40px] items-center gap-3 py-2"
          >
            <span className="min-w-0">
              <span className="block text-body font-medium">{s.label}</span>
              {changed ? (
                <span className="block text-dense text-muted">Now {BANDS[s.band]}</span>
              ) : null}
            </span>
            <span
              className="block [&_span]:transition-[width] [&_span]:duration-700 [&_span]:ease-k"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <LevelBar value={arrived ? s.now : 0} was={arrived ? s.was : 0} size="sm" />
            </span>
            <span
              className={cn(
                "tabular text-right text-dense font-semibold",
                d > 0 ? "text-positive" : "text-negative"
              )}
            >
              {d > 0 ? `+${d}` : d}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
