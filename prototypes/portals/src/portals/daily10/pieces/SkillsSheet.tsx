import { useState } from "react";
import { Sheet } from "@/design-system/components/Sheet";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { BANDS, LevelBar, LevelMark } from "@/design-system/marks";
import { DOMAINS, type SkillLevel } from "@/mock";

/*
 * See all skills: a sheet (the design system's Drawer port, 21st.dev 31360) with
 * a segmented control (21st.dev 23552, the glass thumb on an opaque track) that
 * switches between the skills that moved today and all 39 by domain, each row a
 * still bar with today's change as a signed figure. Rows rise in a short stagger
 * (Animated List, 21st.dev 26903), again on each switch.
 */
export function SkillsSheet({
  open,
  onClose,
  moved,
  levels,
}: {
  open: boolean;
  onClose(): void;
  moved: SkillLevel[];
  levels: SkillLevel[];
}) {
  const [tab, setTab] = useState("moved");
  const [gen, setGen] = useState(0);
  const change = (id: string) => {
    setTab(id);
    setGen((g) => g + 1);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Skills">
      <GlassSegmented
        label="Which skills"
        value={tab}
        onChange={change}
        fill
        className="mb-4"
        options={[
          { value: "moved", label: `Moved today, ${moved.length}` },
          { value: "all", label: `All skills, ${levels.length}` },
        ]}
      />
      {tab === "moved" ? (
        moved.length ? (
          <div key={`m${gen}`} className="grid gap-4">
            {moved.map((s, i) => (
              <StillBar key={s.id} s={s} i={i} />
            ))}
          </div>
        ) : (
          <p className="py-6 text-body text-muted">
            Nothing moved today. Every skill you practised held its level.
          </p>
        )
      ) : (
        <div key={`a${gen}`} className="grid gap-4">
          {DOMAINS.map((dom) => (
            <div key={dom} className="grid gap-4">
              <h3 className="pt-2 text-dense font-semibold text-muted">{dom}</h3>
              {levels
                .filter((s) => s.domain === dom)
                .map((s, i) => (
                  <StillBar key={s.id} s={s} i={i} />
                ))}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function StillBar({ s, i }: { s: SkillLevel; i: number }) {
  const delta = s.now - s.was;
  return (
    <div
      className="k-rise grid gap-[6px]"
      style={{ "--i": Math.min(i, 14) } as React.CSSProperties}
    >
      <div className="flex items-baseline gap-2 text-dense">
        <LevelMark level={s.band} size={20} className="relative top-[3px] shrink-0 self-start" />
        <span className="min-w-0 flex-1 leading-[1.3]">{s.label}</span>
        {delta !== 0 ? (
          <span className={`tabular shrink-0 ${delta > 0 ? "text-positive" : "text-negative"}`}>
            {delta > 0 ? "+" : "−"}
            {Math.abs(delta)}
          </span>
        ) : null}
        <span className="shrink-0 text-right text-[13px] text-muted">{BANDS[s.band]}</span>
      </div>
      <LevelBar value={s.now} was={s.was} size="sm" />
    </div>
  );
}
