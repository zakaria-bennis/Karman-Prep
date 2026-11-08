import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/icons";
import { PLANS } from "@/plans/plans";
import { SKILLS } from "@/mock";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { StudentShell, withStudent } from "./Shell";
import { SkillList } from "./SkillLevels";
import { useStudentView } from "./view";
import { goTo, retry, useExtra } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * Practice by skill: the 39 skills by domain with their levels, pick one, a
 * set. Endless mode and the time trials sit above as two rows. The one
 * question: which skill do I work on? The weakest skills are one filter away.
 * The set runs on the real quiz engine in the quiz modes prototype
 * (quizModes.ts), at the skill's domain.
 */
const USED = 73;

function Practice() {
  const v = useStudentView();
  const presetId = useExtra("skill");
  const open = useOpenQuizMode();
  const preset = v.levels.find((s) => s.id === presetId) ?? null;
  const plan = PLANS[v.plan];

  return (
    <StudentShell screen="practice" title="Practice">
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-5">
          <Panel className="px-4 py-2">
            <List>
              <Row
                title="Endless mode"
                leading={<Icon name="endless" size={20} />}
                onPress={() => goTo("endless")}
              />
              <Row
                title="Time trials"
                leading={<Icon name="timer" size={20} />}
                onPress={() => goTo("trials")}
              />
            </List>
          </Panel>
          {typeof plan.questions === "number" ? (
            <Panel className="p-4">
              <ProgressBar
                value={v.quiet ? 0 : Math.min(USED, plan.questions)}
                max={plan.questions}
                label={`Questions opened on ${plan.name}`}
                endLabel={`${v.quiet ? 0 : Math.min(USED, plan.questions)} of ${plan.questions.toLocaleString("en-US")}`}
              />
            </Panel>
          ) : null}
        </div>
        <Panel as="section" aria-label="Skills" className="p-4">
          <h2 className="pb-3 text-section">Pick a skill, get a set of 10</h2>
          {v.loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton.Row key={i} />
              ))}
            </div>
          ) : v.error ? (
            <ErrorBlock what="your skill levels" lastGood="9:14" onRetry={retry} />
          ) : (
            <>
              {v.quiet ? (
                <p className="pb-3 text-dense text-muted">
                  Nothing started yet. All {SKILLS.length} skills show four empty bars until the
                  first set.
                </p>
              ) : null}
              {preset ? (
                <div className="flex flex-wrap items-center gap-4 pb-4">
                  <GlassButton
                    variant="primary"
                    className="k-sheen"
                    onClick={() => open("skill", preset.domain)}
                  >
                    Practise {preset.label}
                  </GlassButton>
                </div>
              ) : null}
              <SkillList levels={v.levels} onPick={(s) => open("skill", s.domain)} />
            </>
          )}
        </Panel>
      </div>
    </StudentShell>
  );
}

export default withStudent(Practice);
