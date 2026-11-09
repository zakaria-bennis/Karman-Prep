import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { Icon } from "@/design-system/icons";
import { TODAY, fmtDate } from "@/mock";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { PlanLocked } from "./PlanSheet";
import { ModuleSteps } from "./ModuleSteps";
import { DIAGNOSTIC_DATE } from "./mock";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * Full-length tests in Bluebook's two-module design: module 1 of each section
 * decides whether module 2 is harder or easier (the student is never told
 * which); a 10-minute break between the sections; a few unscored tryout
 * questions, announced in one plain line. The test itself runs on the real
 * quiz engine in the quiz modes prototype (quizModes.ts), adaptive or linear.
 */
export const TRYOUT_LINE =
  "A few questions in this test don't count toward your score. We don't say which.";
const MODULES = {
  rw: { section: "Reading and Writing" as const, length: 27, minutes: 32, scored: 25 },
  math: { section: "Math" as const, length: 22, minutes: 35, scored: 20 },
};
function FullLength() {
  const v = useStudentView();
  const [phase, setPhase] = useState<"hub" | "intro">("hub");
  const open = useOpenQuizMode();
  const next = v.nextTest;
  const latest = v.taken[v.taken.length - 1];

  if (phase === "intro")
    return (
      <StudentShell
        screen="test"
        title={`Full-length test ${next?.n ?? ""}`.trim()}
        back={() => setPhase("hub")}
      >
        <Panel className="mx-auto grid max-w-[560px] gap-4 p-5">
          <ModuleSteps current="rw1" />
          <p className="text-body font-semibold">{TRYOUT_LINE}</p>
          <p className="text-body">
            Reading and Writing: two modules of {MODULES.rw.length} questions, {MODULES.rw.minutes}{" "}
            minutes each. Math: two modules of {MODULES.math.length} questions,{" "}
            {MODULES.math.minutes} minutes each. A 10-minute break between the sections.
          </p>
          <p className="text-dense text-muted">
            Module 1 decides module 2. A module closes when its time ends or when you finish it, and
            there is no going back to it.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <GlassButton variant="primary" onClick={() => open("full-adaptive")}>
              Begin Reading and Writing
            </GlassButton>
            <TextLink onClick={() => open("full-linear")}>Linear version</TextLink>
            <TextLink onClick={() => setPhase("hub")}>Not now</TextLink>
          </div>
        </Panel>
      </StudentShell>
    );

  const hub = v.loading ? (
    <Panel className="grid gap-3 p-4">
      <Skeleton.Text lines={2} />
      <Skeleton.Block height={44} width={220} className="rounded-pill" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton.Row key={i} sub />
      ))}
    </Panel>
  ) : (
    // The next test and how a test runs on the left; the five tests and the diagnostic on the right, ending together.
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="grid gap-5">
        <Panel as="section" aria-label="Next test" className="grid gap-3 p-4 sm:p-5">
          {v.error ? (
            <ErrorBlock what="your next test" lastGood="9:14" onRetry={retry} />
          ) : next ? (
            <>
              <p className="text-body font-semibold">
                Full-length test {next.n} is{" "}
                {next.date === TODAY ? "due today" : `due ${fmtDate(next.date)}`}. About two and a
                half hours in one sitting.
              </p>
              <p className="text-dense text-muted">{TRYOUT_LINE}</p>
              <div>
                <GlassButton
                  variant="primary"
                  className="k-sheen"
                  onClick={() => setPhase("intro")}
                >
                  Start Full-length test {next.n}
                </GlassButton>
              </div>
            </>
          ) : v.quiet ? (
            <Empty
              title="No test scheduled yet"
              detail="Your first full-length test is set after the diagnostic."
            />
          ) : (
            <Empty
              title="Every scheduled test is taken"
              detail="The next one is set with your tutor."
            />
          )}
        </Panel>
        <Panel className="px-4 py-2">
          <List>
            <Row
              title="The diagnostic"
              sub={{
                kind: v.baseline !== null ? "date" : "state",
                text: v.baseline !== null ? `Taken ${fmtDate(DIAGNOSTIC_DATE)}` : "Not taken yet",
              }}
              trailing={v.baseline !== null ? v.baseline.toLocaleString("en-US") : undefined}
              leading={<Icon name="mark" size={20} />}
              onPress={() => goTo("diagnostic")}
            />
          </List>
        </Panel>
        <Panel className="grid gap-3 p-4">
          <h2 className="text-section">How a test runs</h2>
          <ModuleSteps current="rw1" />
          <p className="text-dense text-muted">
            Module 1 decides whether module 2 is harder or easier, as on the real test. Your Karman
            predicted score updates on the results screen.
          </p>
        </Panel>
      </div>
      <div className="grid gap-5">
        <Panel as="section" aria-label="Your tests" className="px-4 py-2">
          <h2 className="pb-1 pt-2 text-section">Your tests</h2>
          {v.tests.length ? (
            <List>
              {v.tests.map((t) => (
                <Row
                  key={t.n}
                  title={`Full-length test ${t.n}`}
                  sub={{
                    kind: t.score !== null ? "date" : "due",
                    text:
                      t.score !== null
                        ? `Taken ${fmtDate(t.date)}`
                        : t.date === TODAY
                          ? "Due today"
                          : `Due ${fmtDate(t.date)}`,
                    tone: t.score === null && t.date === TODAY ? "negative" : "muted",
                  }}
                  trailing={t.score !== null ? t.score.toLocaleString("en-US") : undefined}
                  leading={<Icon name="tests" size={20} />}
                  onPress={
                    t.score !== null && latest?.n === t.n ? () => goTo("test-review") : undefined
                  }
                />
              ))}
            </List>
          ) : (
            <Empty
              title="No tests yet"
              detail="Five full-length tests are scheduled across the program."
              className="my-2"
            />
          )}
        </Panel>
      </div>
    </div>
  );

  return (
    <StudentShell screen="test" title="Full-length tests">
      <PlanLocked bundle="fullLength">{hub}</PlanLocked>
    </StudentShell>
  );
}

export default withStudent(FullLength);
