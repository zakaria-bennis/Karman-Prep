import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/icons";
import { PLANS } from "@/plans/plans";
import { SKILLS, type SkillLevel } from "@/mock";
import { StudentShell, withStudent } from "./Shell";
import { SkillList } from "./SkillLevels";
import { QuestionView } from "./QuestionView";
import { SetDone } from "./SetDone";
import { setFor } from "./pool";
import { useStudentView } from "./view";
import { goTo, retry, useExtra } from "./nav";
import type { SetResult } from "./session";

/*
 * Practice by skill: the 39 skills by domain with their levels, pick one, a
 * set. Endless mode and the time trials sit above as two rows. The one
 * question: which skill do I work on? The weakest skills are one filter away.
 */
const USED = 73;

function Practice() {
  const v = useStudentView();
  const preset = useExtra("skill");
  const [skill, setSkill] = useState<SkillLevel | null>(() =>
    preset ? (v.levels.find((s) => s.id === preset) ?? null) : null
  );
  const [result, setResult] = useState<SetResult | null>(null);
  const plan = PLANS[v.plan];

  if (result)
    return (
      <StudentShell screen="practice" title="Practice" back={() => setResult(null)}>
        <SetDone
          title={`${skill?.label ?? "Practice"} set finished`}
          result={result}
          lines={[
            result.total - result.right > 0 && v.has("daily10")
              ? `Your ${result.total - result.right} ${result.total - result.right === 1 ? "miss comes" : "misses come"} back in Your Daily 10 after 2, 7 and 21 days.`
              : "Every answer moves your skill levels.",
          ]}
          primary={{
            label: "Practise another skill",
            onClick: () => {
              setResult(null);
              setSkill(null);
            },
          }}
          secondary={{ label: "Home", onClick: () => goTo("home") }}
        />
      </StudentShell>
    );
  if (skill)
    return (
      <QuestionView
        screen="practice"
        title={skill.label}
        mode="practice"
        questions={setFor(skill.id)}
        clock={{ kind: "elapsed" }}
        tutor={v.tutor}
        onExit={() => setSkill(null)}
        onFinish={setResult}
      />
    );
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
              <SkillList levels={v.levels} onPick={setSkill} />
            </>
          )}
        </Panel>
      </div>
    </StudentShell>
  );
}

export default withStudent(Practice);
