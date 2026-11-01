import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { QUESTIONS } from "@/mock";
import { StudentShell, withStudent } from "./Shell";
import { QuestionView } from "./QuestionView";
import { SetDone } from "./SetDone";
import { usePickerSession } from "./pool";
import { PACE_SECONDS } from "./picker";
import { useStudentView } from "./view";
import { Row, List } from "@/design-system/components/Row";
import { goTo, retry } from "./nav";
import type { SetResult } from "./session";

/*
 * Time trials: the same picker with a clock at the real test's pace, about 71
 * seconds a Reading and Writing question and 95 a Math question. The clock
 * runs past zero in the negative colour instead of cutting the question off.
 */
const paceOf = (skill: string) =>
  PACE_SECONDS[QUESTIONS.find((q) => q.skill === skill)?.section ?? "Math"];

function TimeTrials() {
  const v = useStudentView();
  const picker = usePickerSession(v.levels, v.quiet);
  const [phase, setPhase] = useState<"intro" | "session" | "done">("intro");
  const [result, setResult] = useState<SetResult | null>(null);

  if (phase === "session")
    return (
      <QuestionView
        screen="trials"
        title="Time trials"
        mode="trials"
        questions={[]}
        nextQuestion={picker.next}
        clock={{ kind: "perQuestion", secondsFor: (q) => PACE_SECONDS[q.section] }}
        tutor={v.tutor}
        endable
        onExit={() => setPhase("intro")}
        onFinish={(r) => {
          setResult(r);
          setPhase("done");
        }}
      />
    );
  if (phase === "done" && result) {
    const within = result.answers.filter((a) => a.timeMs / 1000 <= paceOf(a.skill)).length;
    const avg = result.answers.length
      ? Math.round(result.answers.reduce((s, a) => s + a.timeMs, 0) / result.answers.length / 1000)
      : 0;
    return (
      <StudentShell screen="trials" title="Time trials" back={() => setPhase("intro")}>
        <SetDone
          title="Trial over"
          result={result}
          stats={[
            { label: "Within pace", value: `${within} of ${result.total}` },
            { label: "Average", value: `${avg} s` },
          ]}
          lines={[
            `The test allows ${PACE_SECONDS["Reading and Writing"]} seconds a Reading and Writing question and ${PACE_SECONDS.Math} a Math question.`,
          ]}
          primary={{ label: "Another trial", onClick: () => setPhase("session") }}
          secondary={{ label: "Home", onClick: () => goTo("home") }}
        />
      </StudentShell>
    );
  }
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
              The clock keeps counting past zero. You can hide it and still see the pace at the end.
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
              <GlassButton
                variant="primary"
                className="k-sheen"
                onClick={() => setPhase("session")}
              >
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
