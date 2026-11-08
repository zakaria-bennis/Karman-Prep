import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { StudentShell, withStudent } from "./Shell";
import { useStudentView } from "./view";
import { Row, List } from "@/design-system/components/Row";
import { goTo, retry } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * Time trials: the same picker with a clock at the real test's pace, about 71
 * seconds a Reading and Writing question and 95 a Math question. The trial
 * runs on the real quiz engine in the quiz modes prototype (quizModes.ts),
 * where the student picks the subject and the length.
 */

/** Seconds per question at the real test's pace. */
const PACE_SECONDS = { "Reading and Writing": 71, Math: 95 } as const;

function TimeTrials() {
  const v = useStudentView();
  const open = useOpenQuizMode();

  return (
    <StudentShell screen="trials" title="Time trials" back={() => goTo("practice")}>
      <Panel className="mx-auto grid max-w-[560px] gap-4 p-5">
        {v.loading ? (
          <>
            <Skeleton.Text lines={3} />
            <Skeleton.Block height={44} width={160} className="rounded-pill" />
          </>
        ) : v.error ? (
          <ErrorBlock what="your question pool" lastGood="9:14" onRetry={retry} />
        ) : (
          <>
            <p className="text-body">
              The same questions as endless mode, with a clock at the real test's pace:{" "}
              {PACE_SECONDS["Reading and Writing"]} seconds a Reading and Writing question,{" "}
              {PACE_SECONDS.Math} a Math question.
            </p>
            <p className="text-dense text-muted">
              You can hide the clock and still see your pace at the end.
            </p>
            <List>
              <Row
                title="Reading and Writing"
                trailing={`${PACE_SECONDS["Reading and Writing"]} s a question`}
              />
              <Row title="Math" trailing={`${PACE_SECONDS.Math} s a question`} />
              <Row
                title="Your pace on today's set"
                trailing={v.set ? `${v.set.pace} s a question` : "No set today"}
              />
            </List>
            <div>
              <GlassButton variant="primary" className="k-sheen" onClick={() => open("trials")}>
                Start a time trial
              </GlassButton>
            </div>
          </>
        )}
      </Panel>
    </StudentShell>
  );
}

export default withStudent(TimeTrials);
