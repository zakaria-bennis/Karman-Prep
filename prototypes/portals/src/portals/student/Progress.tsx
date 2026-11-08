import { Panel } from "@/design-system/glass/Panel";
import { Heatmap } from "@/design-system/components/Heatmap";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Streak } from "@/design-system/marks";
import { TODAY, SKILLS, practiceDays } from "@/mock";
import { StudentShell, withStudent } from "./Shell";
import { ScoreBlock, BestsBlock } from "./HomeStats";
import { BandStrip, SkillList } from "./SkillLevels";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";

/*
 * Progress. The one question: am I getting better? The predicted score with
 * the three trend options answers it first; then every skill by level, the
 * personal bests, and the practice days.
 */
function Progress() {
  const v = useStudentView();
  const days = v.quiet ? [] : practiceDays(v.student.id);
  return (
    <StudentShell screen="progress" title="Progress">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid gap-5">
          <ScoreBlock v={v} full />
          <Panel as="section" aria-label="Skills by level" className="grid gap-4 p-4">
            <h2 className="text-section">
              Skills by level{" "}
              <span className="tabular font-normal text-muted">{SKILLS.length}</span>
            </h2>
            {v.loading ? (
              <div className="grid gap-2">
                <Skeleton.Block height={72} />
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton.Row key={i} />
                ))}
              </div>
            ) : v.error ? (
              <ErrorBlock what="your skill levels" lastGood="9:14" onRetry={retry} />
            ) : (
              <>
                <BandStrip levels={v.levels} />
                <SkillList levels={v.levels} onPick={(s) => goTo("practice", { skill: s.id })} />
              </>
            )}
          </Panel>
        </div>
        <div className="grid gap-5">
          <BestsBlock v={v} />
          <Panel as="section" aria-label="Practice days" className="grid gap-3 p-4">
            <h2 className="text-section">Practice days</h2>
            {v.loading ? (
              <Skeleton.Block height={120} />
            ) : (
              <>
                {v.rewards?.streak ? (
                  <Streak days={v.rewards.streak} />
                ) : (
                  <p className="text-dense text-muted">
                    No days in a row yet. Today can be the first.
                  </p>
                )}
                <Heatmap data={days} end={TODAY} weeks={16} />
              </>
            )}
          </Panel>
        </div>
      </div>
    </StudentShell>
  );
}

export default withStudent(Progress);
