import { useMemo, useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { BANDS } from "@/design-system/marks/LevelMark";
import { usePlan } from "@/plans/PlanProvider";
import type { SkillLevel } from "@/mock";
import { Shell, useWide } from "./Shell";
import { ParentProvider, useParent, useBlock } from "./view";
import { LockedPanel } from "./LockedPanel";
import { BandBar } from "./BandBar";
import { SkillField } from "./SkillField";
import { levelsOf, bandCounts, weakestOf } from "./mock";
import { STAMP } from "./Home";

/*
 * Skills: "Where is my child strong and weak?" All 39 skills by domain, each
 * with its four level bars, both sections side by side on desktop and one at
 * a time on a phone. No action: the parent reads; the student practises.
 */
type Section = "Reading and Writing" | "Math";
const SECTIONS: Section[] = ["Reading and Writing", "Math"];

export default function Skills() {
  return (
    <ParentProvider lock="parent">
      <SkillsScreen />
    </ParentProvider>
  );
}

function SkillsScreen() {
  const v = useParent();
  const { has } = usePlan();
  const blk = useBlock();
  const levels = useMemo(() => levelsOf(v.student, v.state), [v.student, v.state]);
  const counts = bandCounts(levels);
  const mastered = counts.find((c) => c.band === 4)?.count ?? 0;
  const proficient = counts.find((c) => c.band === 3)?.count ?? 0;
  const weak = weakestOf(levels);
  const started = levels.filter((l) => l.now > 0).length;
  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="60%" />
  ) : !started ? (
    `Nothing started yet. ${v.student.name}’s levels appear after about 30 questions.`
  ) : (
    `${mastered} of 39 mastered, ${proficient} proficient.` +
    (weak ? ` Weakest: ${weak.label}, ${BANDS[weak.band].toLowerCase()}.` : "")
  );
  const body = (
    <div className="grid gap-4">
      <Panel as="section" className="p-4">
        <h2 className="text-section">By level</h2>
        {blk.loading ? (
          <Skeleton.Text lines={2} className="mt-4" />
        ) : (
          <BandBar counts={counts} className="mt-3" />
        )}
      </Panel>
      {blk.error ? (
        <ErrorBlock what="the skill levels" lastGood={STAMP} onRetry={blk.retry} />
      ) : null}
      <Fields levels={levels} loading={blk.loading} />
    </div>
  );
  return (
    <Shell
      screen="skills"
      title="Skills"
      finding={finding}
      back={{ label: "Progress", to: "home" }}
    >
      {has("parent") ? (
        body
      ) : (
        <LockedPanel bundle="parent" onUpgrade={() => v.go("plan")}>
          {body}
        </LockedPanel>
      )}
    </Shell>
  );
}

/** Both sections side by side on desktop, one at a time on a phone; read inside the shell, where the layout is known. */
function Fields({ levels, loading }: { levels: SkillLevel[]; loading: boolean }) {
  const wide = useWide();
  const [section, setSection] = useState<Section>("Reading and Writing");
  const field = (sec: Section) =>
    loading ? (
      <div className="mt-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton.Row key={i} />
        ))}
      </div>
    ) : (
      <SkillField levels={levels} section={sec} wide={wide} className="mt-3" />
    );
  return (
    <>
      {wide ? (
        <div className="grid grid-cols-2 items-start gap-4">
          {SECTIONS.map((sec) => (
            <Panel key={sec} as="section" className="p-4">
              <h2 className="text-section">{sec}</h2>
              {field(sec)}
            </Panel>
          ))}
        </div>
      ) : (
        <>
          <GlassSegmented
            fill
            label="Section"
            value={section}
            onChange={(val) => setSection(val as Section)}
            options={SECTIONS.map((s) => ({ value: s, label: s }))}
          />
          <Panel as="section" className="p-4">
            <h2 className="text-section">{section}</h2>
            {field(section)}
          </Panel>
        </>
      )}
    </>
  );
}
