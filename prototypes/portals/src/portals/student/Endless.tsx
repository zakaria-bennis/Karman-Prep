import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { StudentShell, withStudent } from "./Shell";
import { QuestionView } from "./QuestionView";
import { SetDone } from "./SetDone";
import { usePickerSession, DEMO_HISTORY } from "./pool";
import { Row, List } from "@/design-system/components/Row";
import { SkillRow } from "./SkillLevels";
import { useStudentView } from "./view";
import { goTo, retry } from "./nav";
import type { SetResult } from "./session";

/*
 * Endless mode: one session that keeps going. Every next question comes from
 * the picker module (picker.ts), which reads the last answer, this session,
 * the whole history and the weak skills, aims at about three right in four
 * and brings misses back on a spaced schedule. The student only ever sees one
 * question and one button (Tesler: the complexity is in the picker).
 */
function Endless() {
  const v = useStudentView();
  const picker = usePickerSession(v.levels, v.quiet);
  const [phase, setPhase] = useState<"intro" | "session" | "done">("intro");
  const [result, setResult] = useState<SetResult | null>(null);

  if (phase === "session")
    return (
      <QuestionView
        screen="endless"
        title="Endless mode"
        mode="endless"
        questions={[]}
        nextQuestion={picker.next}
        clock={{ kind: "elapsed" }}
        tutor={v.tutor}
        endable
        onExit={() => setPhase("intro")}
        onFinish={(r) => {
          setResult(r);
          setPhase("done");
        }}
        intro={() =>
          picker.picks.length ? (
            <p className="pt-2 text-dense text-muted">
              Why this one: {picker.picks[picker.picks.length - 1].reason}.
            </p>
          ) : null
        }
      />
    );
  if (phase === "done" && result) {
    const skills = new Set(result.answers.map((a) => a.skill)).size;
    return (
      <StudentShell screen="endless" title="Endless mode" back={() => setPhase("intro")}>
        <SetDone
          title="Session over"
          result={result}
          stats={[{ label: "Skills", value: String(skills) }]}
          lines={[
            result.total - result.right > 0 && v.has("daily10")
              ? "Your misses come back in Your Daily 10 after 2, 7 and 21 days."
              : "Every answer moves your skill levels.",
          ]}
          primary={{ label: "Another session", onClick: () => setPhase("session") }}
          secondary={{ label: "Home", onClick: () => goTo("home") }}
        />
      </StudentShell>
    );
  }
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
            <p className="text-dense text-muted">
              A miss comes back after 2, 7 and 21 days. Nothing repeats within a session or two
              weeks. Three right in a row steps the difficulty up; two misses step it down.
            </p>
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
              <Row
                title="Misses due back today"
                trailing={String(v.quiet ? 0 : DEMO_HISTORY.length)}
              />
            </List>
            <div>
              <GlassButton
                variant="primary"
                className="k-sheen"
                onClick={() => setPhase("session")}
              >
                Start endless mode
              </GlassButton>
            </div>
          </>
        )}
      </Panel>
    </StudentShell>
  );
}

export default withStudent(Endless);
