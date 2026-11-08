import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { StudentShell, withStudent } from "./Shell";
import { PlanLocked } from "./PlanSheet";
import { SetStrip } from "./SetStrip";
import { Row, List } from "@/design-system/components/Row";
import { Icon } from "@/design-system/icons";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * Your Daily 10: ten questions, one tap (Hick: nothing to choose). The
 * questions run on the real quiz engine in the quiz modes prototype
 * (quizModes.ts), whose ending links to the end screen under the daily10
 * portal. The predicted score is never shown here.
 */
function Daily10() {
  const v = useStudentView();
  const open = useOpenQuizMode();
  if (v.loading || v.error || !v.has("daily10"))
    return (
      <StudentShell screen="daily10" title="Your Daily 10" back={() => goTo("home")}>
        {v.loading ? (
          <Panel className="grid gap-4 p-4">
            <Skeleton.Block height={14} width={140} />
            <Skeleton.Text lines={4} />
            <Skeleton.Row />
            <Skeleton.Row />
            <Skeleton.Row />
            <Skeleton.Row />
          </Panel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            {v.error ? (
              <Panel className="p-4">
                <ErrorBlock what="today's questions" lastGood="9:14" onRetry={retry} />
              </Panel>
            ) : (
              <PlanLocked bundle="daily10">
                <Panel className="grid gap-3 p-4">
                  <SetStrip cells={Array(10).fill("todo")} />
                  <p className="text-body">
                    Ten questions a day, picked from your misses and your weakest skills. Every miss
                    comes back after 2, 7 and 21 days.
                  </p>
                </Panel>
              </PlanLocked>
            )}
            <Panel className="px-4 py-2">
              <h2 className="pb-1 pt-2 text-section">Open to you now</h2>
              <List>
                <Row
                  title="Practice by skill"
                  leading={<Icon name="practice" size={20} />}
                  onPress={() => goTo("practice")}
                />
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
          </div>
        )}
      </StudentShell>
    );
  return (
    <StudentShell screen="daily10" title="Your Daily 10" back={() => goTo("home")}>
      <Panel className="mx-auto grid max-w-[560px] gap-4 p-5">
        <SetStrip cells={Array(10).fill("todo")} />
        <p className="text-body">
          Ten questions a day, picked from your misses and your weakest skills. Every miss comes
          back after 2, 7 and 21 days.
        </p>
        <div>
          <GlassButton variant="primary" className="k-sheen" onClick={() => open("daily10")}>
            Start Your Daily 10
          </GlassButton>
        </div>
      </Panel>
    </StudentShell>
  );
}

export default withStudent(Daily10);
