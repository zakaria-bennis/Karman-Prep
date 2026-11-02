import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { fmtDate } from "@/mock";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { DIAGNOSTIC_DATE } from "./mock";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * The diagnostic entry: what it is, what it unlocks, one button. The 35
 * questions and the first Karman predicted score run on the real quiz engine
 * in the quiz modes prototype (quizModes.ts).
 */
function Diagnostic() {
  const v = useStudentView();
  const open = useOpenQuizMode();
  const taken = v.baseline !== null;

  return (
    <StudentShell
      screen="diagnostic"
      title="The diagnostic"
      back={() => goTo(taken ? "test" : "home")}
    >
      <Panel className="mx-auto grid max-w-[560px] gap-4 p-5">
        {v.loading ? (
          <>
            <Skeleton.Text lines={3} />
            <Skeleton.Block height={44} width={200} className="rounded-pill" />
          </>
        ) : v.error ? (
          <ErrorBlock what="the diagnostic" lastGood="9:14" onRetry={retry} />
        ) : (
          <>
            {taken ? (
              <div>
                <p className="text-dense text-muted">Taken {fmtDate(DIAGNOSTIC_DATE, "long")}</p>
                <p className="tabular text-kpi">{v.baseline?.toLocaleString("en-US")}</p>
              </div>
            ) : null}
            <p className="text-body">
              35 questions, about 50 minutes, both sections. It sets your first Karman predicted
              score and a level on every skill, so Your Daily 10 knows where to start.
            </p>
            <p className="text-dense text-muted">
              Timed like the test: 18 minutes for Reading and Writing, 32 for Math. Take it in one
              sitting, without help, so the levels are honest.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {taken ? (
                // Taken: the Back control covers leaving; the only thing left to do here is the one retake.
                <TextLink onClick={() => open("diagnostic")}>
                  Retake the diagnostic (one retake left)
                </TextLink>
              ) : (
                <GlassButton
                  variant="primary"
                  className="k-sheen"
                  onClick={() => open("diagnostic")}
                >
                  Start the diagnostic
                </GlassButton>
              )}
            </div>
          </>
        )}
      </Panel>
    </StudentShell>
  );
}

export default withStudent(Diagnostic);
