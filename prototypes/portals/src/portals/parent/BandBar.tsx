import type { Band } from "@/design-system/marks/LevelMark";
import type { SkillLevel } from "@/mock";
import { cn } from "@/design-system/cn";
import { useArrived } from "./arrive";

/*
 * BandBar: the 39 skills as a share of each level, one 100 percent stacked bar
 * with 2px seams (five parts, the app rules' limit) and the legend as a table
 * of counts, each swatch the mark itself. The accent at four strengths for the
 * four levels (the heatmap’s mix), not started as the text ink at 10 percent.
 * The parts widen from zero on arrival.
 */
const MIX: Record<Band, number> = { 4: 1, 3: 0.72, 2: 0.48, 1: 0.28, 0: 0 };

export interface BandCount {
  band: Band;
  label: string;
  count: number;
}

function fill(b: Band) {
  return b === 0 ? "rgb(var(--k-text) / 0.1)" : `rgb(var(--k-accent) / ${MIX[b]})`;
}

export function BandBar({ counts, className }: { counts: BandCount[]; className?: string }) {
  const arrived = useArrived();
  const total = counts.reduce((a, c) => a + c.count, 0) || 1;
  const summary = counts.map((c) => `${c.label} ${c.count}`).join(", ");
  return (
    <div className={cn("grid gap-3", className)}>
      <div
        role="img"
        aria-label={`Skills by level: ${summary}`}
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[3px]"
      >
        {counts.map((c) =>
          c.count ? (
            <span
              key={c.band}
              className="block h-full origin-left transition-transform duration-700 ease-k"
              style={{
                flex: `0 0 ${(c.count / total) * 100}%`,
                transform: `scaleX(${arrived ? 1 : 0})`,
                background: fill(c.band),
              }}
            />
          ) : null
        )}
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-dense">
        {counts.map((c) => (
          <div key={c.band} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-4 rounded-[2px]"
              style={{ background: fill(c.band) }}
            />
            <dt className="text-muted">{c.label}</dt>
            <dd className="tabular font-medium">{c.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The same bar per section, 8px tall, with the mastered count: Reading and Writing against Math. */
export function SectionBars({ levels, className }: { levels: SkillLevel[]; className?: string }) {
  const arrived = useArrived();
  const sections: SkillLevel["section"][] = ["Reading and Writing", "Math"];
  return (
    <dl className={cn("grid gap-3", className)}>
      {sections.map((sec) => {
        const mine = levels.filter((l) => l.section === sec);
        const total = mine.length || 1;
        const mastered = mine.filter((l) => l.band === 4).length;
        const parts = ([4, 3, 2, 1, 0] as Band[]).map((b) => ({
          band: b,
          count: mine.filter((l) => l.band === b).length,
        }));
        return (
          <div key={sec} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-dense">
              <dt className="font-medium">{sec}</dt>
              <dd className="tabular text-muted">
                {mastered} of {mine.length} mastered
              </dd>
            </div>
            <dd
              role="img"
              aria-label={`${sec}: ${parts.map((p) => `${p.count} ${p.band}`).join(", ")}`}
              className="flex h-2 w-full gap-[2px] overflow-hidden rounded-[3px]"
            >
              {parts.map((p) =>
                p.count ? (
                  <span
                    key={p.band}
                    className="block h-full origin-left transition-transform duration-700 ease-k"
                    style={{
                      flex: `0 0 ${(p.count / total) * 100}%`,
                      transform: `scaleX(${arrived ? 1 : 0})`,
                      background: fill(p.band),
                    }}
                  />
                ) : null
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
