import type { SkillLevel } from "@/mock";
import { BANDS, LevelBar, band } from "@/design-system/marks/LevelMark";
import { cn } from "@/design-system/cn";
import { useArrived } from "./arrive";

/*
 * SkillField: every skill of a section by domain, each with its four level
 * bars and the level's name; the one element only Karman has. The fill runs
 * from zero to the level on arrival, staggered down the list, the entrance of
 * Skills Progress Dashboard (21st.dev 19138, shadcnspace); its colour per row
 * and percent badge were left out: one hue, and the level's name in words.
 * A not-started skill is four empty bars. A domain header counts its mastered.
 * The name is the identity column and is never cut: on a wide frame it has
 * the level's word beside the bars; on a phone the word column goes (the
 * bars say the level, and name it for a screen reader) and the word appears
 * under the name only when the band changed this week.
 */
export function SkillField({
  levels,
  section,
  wide,
  className,
}: {
  levels: SkillLevel[];
  section: "Reading and Writing" | "Math";
  /** Measured on the frame: room for the level's word beside the bars. */
  wide: boolean;
  className?: string;
}) {
  const arrived = useArrived();
  const mine = levels.filter((l) => l.section === section);
  const domains = [...new Set(mine.map((l) => l.domain))];
  let row = 0;
  return (
    <div className={cn("grid gap-5", className)}>
      {domains.map((d) => {
        const skills = mine.filter((l) => l.domain === d);
        const mastered = skills.filter((l) => l.band === 4).length;
        return (
          <section key={d} aria-label={d}>
            <h3 className="flex items-baseline justify-between gap-3 pb-1 text-dense font-semibold">
              <span className="min-w-0">{d}</span>
              <span className="tabular shrink-0 font-normal text-muted">
                {mastered} of {skills.length} mastered
              </span>
            </h3>
            <ul className="divide-y divide-line border-t border-line">
              {skills.map((s) => {
                const delay = row++ * 35;
                const changed = band(s.was) !== s.band;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "grid min-h-11 items-center gap-3 py-1.5",
                      wide
                        ? "grid-cols-[minmax(0,1fr)_88px_84px]"
                        : "grid-cols-[minmax(0,1fr)_88px]"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-body">{s.label}</span>
                      {!wide && changed ? (
                        <span className="block text-dense text-muted">Now {BANDS[s.band]}</span>
                      ) : null}
                    </span>
                    <span
                      role="img"
                      aria-label={BANDS[s.band]}
                      className="block [&_span]:transition-[width] [&_span]:duration-700 [&_span]:ease-k"
                      style={{ transitionDelay: `${delay}ms` }}
                    >
                      <LevelBar value={arrived ? s.now : 0} size="sm" />
                    </span>
                    {wide ? (
                      <span
                        className={cn(
                          "text-right text-dense",
                          s.band === 4 ? "text-text" : "text-muted"
                        )}
                      >
                        {BANDS[s.band]}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
