import { useEffect, useRef, useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { CountUp } from "@/design-system/components/CountUp";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { useConfetti } from "@/design-system/components/Confetti";
import { QUESTIONS, fmtDate } from "@/mock";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { QuestionView } from "./QuestionView";
import { DIAGNOSTIC_DATE } from "./mock";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import type { SetResult } from "./session";

/*
 * The diagnostic entry: what it is, what it unlocks, one button. Its end is
 * the first Karman predicted score, counting up, with one line about what
 * sharpens it. The demo set is the ten Karman originals.
 */
function Reveal({ score, onDone }: { score: number; onDone(): void }) {
  const fig = useRef<HTMLParagraphElement>(null);
  const { fire } = useConfetti();
  useEffect(() => {
    const t = setTimeout(() => fig.current && fire("score", fig.current), 900);
    return () => clearTimeout(t);
  }, [fire]);
  return (
    <Panel className="mx-auto grid max-w-[560px] gap-4 p-5 text-center">
      <p className="text-dense text-muted">Karman predicted score if you tested today</p>
      <p ref={fig} className="tabular text-kpi-lg">
        <CountUp to={score} from={400} duration={1400} />
      </p>
      <p className="text-body text-muted">
        A first estimate from {QUESTIONS.length} questions. Full-length tests and timed practice
        sharpen it.
      </p>
      <div>
        <GlassButton variant="primary" onClick={onDone}>
          Go to Home
        </GlassButton>
      </div>
    </Panel>
  );
}

function Diagnostic() {
  const v = useStudentView();
  const [phase, setPhase] = useState<"intro" | "session" | "done">("intro");
  const [result, setResult] = useState<SetResult | null>(null);
  const taken = v.baseline !== null;

  if (phase === "session")
    return (
      <QuestionView
        screen="diagnostic"
        title="The diagnostic"
        mode="diagnostic"
        questions={QUESTIONS}
        clock={{ kind: "elapsed" }}
        tutor={null}
        onExit={() => setPhase("intro")}
        onFinish={(r) => {
          setResult(r);
          setPhase("done");
        }}
      />
    );
  if (phase === "done" && result) {
    const score =
      v.baseline ?? Math.round((400 + (result.right / Math.max(1, result.total)) * 1200) / 10) * 10;
    return (
      <StudentShell screen="diagnostic" title="The diagnostic" bare>
        <Reveal score={score} onDone={() => goTo("home")} />
      </StudentShell>
    );
  }
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
              Untimed. Take it in one sitting, without help, so the levels are honest.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {taken ? (
                // Taken: the Back control covers leaving; the only thing left to do here is the one retake.
                <TextLink onClick={() => setPhase("session")}>
                  Retake the diagnostic (one retake left)
                </TextLink>
              ) : (
                <GlassButton
                  variant="primary"
                  className="k-sheen"
                  onClick={() => setPhase("session")}
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
