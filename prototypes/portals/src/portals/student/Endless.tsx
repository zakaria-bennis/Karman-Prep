import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { StudentShell, withStudent } from "./Shell";
import { Row, List } from "@/design-system/components/Row";
import { SkillRow } from "./SkillLevels";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import { useOpenQuizMode } from "./quizModes";

/*
 * Endless mode: one session that keeps going, Math or Reading and Writing.
 * The session runs on the real quiz engine in the quiz modes prototype
 * (quizModes.ts), whose adaptive picker chooses every next question. The
 * student only ever sees one question and one button (Tesler: the complexity
 * is in the picker).
 */
/** Misses from 2 and 7 days ago in the demo history. */
const MISSES_DUE = 2;

function Endless() {
  const v = useStudentView();
  const open = useOpenQuizMode();

  return (
    <StudentShell screen="endless" title="Endless mode" back={() => goTo("practice")}>
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
              Keeps going until you stop. Each question is picked from your last answer, this
              session, your whole history and your weakest skills, aiming at about three right in
              four.
            </p>
            <p className="text-dense text-muted">A miss comes back after 2, 7 and 21 days.</p>
            <div>
              <h2 className="pb-1 text-dense text-muted">Weakest skills right now</h2>
              {v.quiet ? (
                <p className="py-2 text-body text-muted">Known after your first set.</p>
              ) : (
                <div className="divide-y divide-line">
                  {[...v.levels]
                    .filter((s) => s.now > 0)
                    .sort((a, b) => a.now - b.now)
                    .slice(0, 3)
                    .map((s) => (
                      <SkillRow key={s.id} skill={s} />
                    ))}
                </div>
              )}
            </div>
            <List>
              <Row title="Misses due back today" trailing={String(v.quiet ? 0 : MISSES_DUE)} />
            </List>
            <div>
              <h2 className="pb-1 text-dense text-muted">Start a session</h2>
              <List>
                <Row title="Math" onPress={() => open("endless-math")} />
                <Row title="Reading and Writing" onPress={() => open("endless-rw")} />
              </List>
            </div>
          </>
        )}
      </Panel>
    </StudentShell>
  );
}

export default withStudent(Endless);
