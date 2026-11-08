import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/design-system/cn";
import { LevelBar, LevelMark, BANDS, type Band } from "@/design-system/marks";
import { Icon } from "@/design-system/icons";
import { DOMAINS, type SkillLevel } from "@/mock";

/*
 * The 39 approved skills by domain, each as four bars (Learning, Developing,
 * Proficient, Mastered; not started is four empty bars). The filter chips with
 * live counts are ported from Filter Grid (21st.dev 23525, ddoemonn: segmented
 * radio chips, arrow keys, a count on each); its animated reflowing grid was
 * not, since a list of skills reads best as rows under domain headings.
 */
type FilterId = "all" | "rw" | "math" | "work" | "new";
const FILTERS: { id: FilterId; label: string; match(s: SkillLevel): boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "rw", label: "Reading and Writing", match: (s) => s.section === "Reading and Writing" },
  { id: "math", label: "Math", match: (s) => s.section === "Math" },
  { id: "work", label: "Needs work", match: (s) => s.now > 0 && s.now < 60 },
  { id: "new", label: "Not started", match: (s) => s.now === 0 },
];

export function SkillFilters({
  levels,
  value,
  onChange,
}: {
  levels: SkillLevel[];
  value: FilterId;
  onChange(id: FilterId): void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, levels.filter(f.match).length])),
    [levels]
  );
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = FILTERS.length;
    const to =
      e.key === "ArrowRight"
        ? (i + 1) % n
        : e.key === "ArrowLeft"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    refs.current[to]?.focus();
    onChange(FILTERS[to].id);
  };
  return (
    <div role="radiogroup" aria-label="Show skills" className="flex flex-wrap gap-1.5">
      {FILTERS.map((f, i) => {
        const on = f.id === value;
        return (
          <button
            key={f.id}
            ref={(n) => {
              refs.current[i] = n;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(f.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "inline-flex min-h-tap min-w-tap items-center justify-center gap-1.5 rounded-pill border px-3 text-dense font-medium transition-colors",
              on
                ? "border-transparent bg-raised text-text"
                : "border-line text-muted hover:text-text"
            )}
          >
            {f.label}
            <span className="tabular text-small text-muted">{counts[f.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SkillRow({
  skill,
  onPress,
}: {
  skill: SkillLevel;
  onPress?(skill: SkillLevel): void;
}) {
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      {...(onPress ? { type: "button", onClick: () => onPress(skill) } : {})}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-1 py-2 text-left sm:grid-cols-[minmax(0,1fr)_120px_96px] sm:gap-y-0",
        onPress &&
          "min-h-12 rounded-card hover:bg-raised/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      )}
    >
      <span className="break-words text-body">{skill.label}</span>
      <span className="row-start-2 w-[132px] sm:row-start-auto sm:w-auto">
        <LevelBar value={skill.now} was={skill.was} size="sm" />
      </span>
      <span className="row-start-2 flex items-center justify-end gap-1 text-dense text-muted sm:row-start-auto">
        {BANDS[skill.band]}
        {onPress ? <Icon name="chevronRight" size={20} /> : null}
      </span>
    </Tag>
  );
}

/** Every skill, grouped under its domain, filtered by the chips. */
export function SkillList({
  levels,
  onPick,
  className,
}: {
  levels: SkillLevel[];
  onPick?(skill: SkillLevel): void;
  className?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const match = FILTERS.find((f) => f.id === filter)!.match;
  const groups = DOMAINS.map((d) => ({
    domain: d,
    skills: levels.filter((s) => s.domain === d && match(s)),
  })).filter((g) => g.skills.length);
  return (
    <div className={cn("grid gap-4", className)}>
      <SkillFilters levels={levels} value={filter} onChange={setFilter} />
      {groups.length ? (
        groups.map((g) => (
          <section key={g.domain} aria-label={g.domain}>
            <h3 className="px-1 pb-1 text-dense text-muted">{g.domain}</h3>
            <div className="divide-y divide-line">
              {g.skills.map((s) => (
                <SkillRow key={s.id} skill={s} onPress={onPick} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="rounded-card border border-dashed border-border/60 px-4 py-5 text-dense text-muted">
          No skills match this filter.
        </p>
      )}
    </div>
  );
}

/** The five bands as a divided strip: how many skills sit in each. */
export function BandStrip({ levels, className }: { levels: SkillLevel[]; className?: string }) {
  const counts = [4, 3, 2, 1, 0].map((b) => ({ b, n: levels.filter((s) => s.band === b).length }));
  return (
    <dl
      className={cn(
        "grid grid-cols-5 divide-x divide-line rounded-card border border-line",
        className
      )}
    >
      {counts.map(({ b, n }) => (
        <div key={b} className="grid justify-items-center gap-1 px-1 py-2 text-center">
          <LevelMark level={b as Band} size={20} />
          <dd className="tabular text-kpi leading-7">{n}</dd>
          <dt className="text-small text-muted">{BANDS[b]}</dt>
        </div>
      ))}
    </dl>
  );
}
