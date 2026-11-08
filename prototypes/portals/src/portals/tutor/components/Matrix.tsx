import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/design-system/cn";
import { LevelMark, BANDS } from "@/design-system/marks";
import { Initials } from "./Initials";
import type { ClassSkill } from "../mock-tests";
import type { TutorStudent } from "../mock";
import { useLayout } from "../shell";

/*
 * SkillMatrix: the skills a cohort missed most (rows) against each student
 * (columns), a level mark and the miss count in every cell, the count of
 * students who missed as a tinted lead column. The board shape, the tinted
 * hero column and the plate on the row's worst cell are ported from Bench
 * Matrix (21st.dev 29454, eugeneshilow); its categorical palette, vertical
 * group labels and entry cascade were left out (one hue, no entrances).
 * Under 700px the board stacks: each skill is its full name with "n of 5",
 * then the student cells on a 44px grid under one row of initials, so the
 * skill (the identity column) is never the thing truncated and nothing
 * scrolls sideways.
 */
const STACK_MAX = 700;
const CELL = 44;

export function SkillMatrix({
  rows,
  students,
  className,
}: {
  rows: ClassSkill[];
  students: TutorStudent[];
  className?: string;
}) {
  const { width } = useLayout();
  const stacked = width < STACK_MAX;
  const cell = (r: ClassSkill, s: TutorStudent, worst: number) => {
    const m = r.missedBy.find((x) => x.student.id === s.id);
    const lvl = m?.level;
    const title = lvl
      ? `${s.name}: ${BANDS[lvl.band]}, ${m!.count} missed`
      : `${s.name}: no misses`;
    const body = lvl ? (
      <span className="grid justify-items-center">
        <LevelMark level={lvl.band} size={20} />
        <span className="tabular text-small text-muted">{m!.count}</span>
      </span>
    ) : (
      <span className="text-muted">-</span>
    );
    return { title, body, plate: !!lvl && lvl.now === worst };
  };

  if (stacked)
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-end gap-0.5 pb-1" aria-hidden="true">
          {students.map((s) => (
            <span key={s.id} className="grid place-items-center" style={{ width: CELL }}>
              <Initials initial={s.initials} hue={s.hue} size={24} />
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const worst = Math.min(...r.missedBy.map((m) => m.level.now));
            return (
              <li key={r.skill.id} className="grid gap-1 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-dense font-medium">{r.skill.label}</span>
                  <span className="tabular shrink-0 text-dense">
                    <span className="font-semibold">{r.missedBy.length}</span>
                    <span className="text-muted"> of {students.length}</span>
                  </span>
                </div>
                <div className="flex justify-end gap-0.5">
                  {students.map((s) => {
                    const c = cell(r, s, worst);
                    return (
                      <span
                        key={s.id}
                        className={cn(
                          "grid h-11 place-items-center rounded-card",
                          c.plate && "bg-raised"
                        )}
                        style={{ width: CELL }}
                        title={c.title}
                      >
                        {c.body}
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <table className="w-full table-fixed border-collapse text-dense">
        <caption className="sr-only">
          Skills missed on the latest full-length test, by student
        </caption>
        <thead>
          <tr>
            <th scope="col" className="h-10 pr-2 text-left text-small font-normal text-muted">
              Skill
            </th>
            <th
              scope="col"
              className="h-10 w-14 bg-accent/10 px-1 text-center text-small font-normal text-muted"
            >
              Missed
            </th>
            {students.map((s) => (
              <th key={s.id} scope="col" className="h-10 w-11 px-0 text-center">
                <Initials
                  initial={s.initials}
                  hue={s.hue}
                  size={24}
                  title={s.name}
                  className="mx-auto"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const worst = Math.min(...r.missedBy.map((m) => m.level.now));
            return (
              <tr key={r.skill.id}>
                <th scope="row" className="py-1.5 pr-2 text-left font-medium">
                  <SkillName label={r.skill.label} section={r.skill.section} />
                </th>
                <td className="tabular bg-accent/10 px-1 text-center font-semibold">
                  {r.missedBy.length}
                  <span className="font-normal text-muted"> of {students.length}</span>
                </td>
                {students.map((s) => {
                  const c = cell(r, s, worst);
                  return (
                    <td
                      key={s.id}
                      className={cn("h-12 px-0 text-center", c.plate && "bg-raised")}
                      title={c.title}
                    >
                      {c.body}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The skill's full name, wrapping to two lines; the section line shows only while the name fits on one. */
function SkillName({ label, section }: { label: string; section: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [wrapped, setWrapped] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setWrapped(el.getBoundingClientRect().height > 24);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);
  return (
    <>
      <span ref={ref} className="block leading-5">
        {label}
      </span>
      {wrapped ? null : (
        <span className="block truncate text-small font-normal text-muted">{section}</span>
      )}
    </>
  );
}
