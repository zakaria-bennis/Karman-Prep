import { useEffect, useRef, useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Sheet } from "@/design-system/components/Sheet";
import { CountUp } from "@/design-system/components/CountUp";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { useConfetti } from "@/design-system/components/Confetti";
import { fmtDate } from "@/mock";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { QuestionBody } from "./QuestionBody";
import { MathText } from "./math";
import { Trend, TrendSwitch, useTrendOption } from "./Trend";
import { LATEST_RESULT, questionById, type Miss } from "./mock";
import { useStudentView } from "./view";
import { goTo, retry, useExtra } from "./nav";

/*
 * The results of the latest full-length test. This is where the Karman
 * predicted score appears: one number, counting up, with the gain since the
 * last test as the finding. Then every mistake, grouped by skill, each one
 * opening the question with its explanation. The screen ends on the one next
 * step (Peak-End): the review session on a private plan, Your Daily 10 on the
 * others.
 */
function TestReview() {
  const v = useStudentView();
  const [option, setOption] = useTrendOption();
  const [open, setOpen] = useState<Miss | null>(null);
  const fig = useRef<HTMLParagraphElement>(null);
  const { fire } = useConfetti();
  const just = useExtra("just") === "1";
  const latestTaken = v.taken[v.taken.length - 1];
  // Straight after a test, the fresh result; from the hub, the latest taken test with the same misses.
  const r =
    just || !latestTaken
      ? LATEST_RESULT
      : {
          ...LATEST_RESULT,
          n: latestTaken.n,
          date: latestTaken.date,
          score: latestTaken.score,
          rw: latestTaken.rw ?? 0,
          math: latestTaken.math ?? 0,
        };
  const predicted = just ? r.score : (v.predicted ?? r.score);
  const prev = v.taken.filter((t) => t.n < r.n).slice(-1)[0];
  const ready = !v.loading && !v.error && !v.quiet && v.has("fullLength");
  // The proud moment is the one straight after the test; reopened from the hub, the figure just stands.
  useEffect(() => {
    if (!ready || !just) return;
    const t = setTimeout(() => fig.current && fire("score", fig.current), 700);
    return () => clearTimeout(t);
  }, [ready, just, fire]);

  const groups = Object.values(
    r.misses.reduce<Record<string, { skill: string; misses: Miss[] }>>((acc, m) => {
      const q = questionById(m.questionId)!;
      (acc[q.skill] ??= { skill: q.skill, misses: [] }).misses.push(m);
      return acc;
    }, {})
  ).sort((a, b) => b.misses.length - a.misses.length);
  const q = open ? questionById(open.questionId) : null;
  const wrongLetter = q ? (["A", "B", "C", "D"].find((l) => l !== q.correct) ?? "A") : "A";
  const points = just
    ? [...v.points, { label: `Test ${r.n}`, date: r.date, score: r.score }]
    : v.points;
  const title = `Full-length test ${r.n}`;

  if (!ready)
    return (
      <StudentShell screen="test-review" title={title} back={() => goTo("test")}>
        {v.loading ? (
          <Panel className="grid gap-4 p-4">
            <Skeleton.Kpi label="Karman predicted score if you tested today" lead />
            <Skeleton.Block height={200} />
            <Skeleton.Row sub />
            <Skeleton.Row sub />
          </Panel>
        ) : v.error ? (
          <Panel className="p-4">
            <ErrorBlock what="the test results" lastGood="9:14" onRetry={retry} />
          </Panel>
        ) : (
          <Panel className="p-4">
            <Empty
              title="No test results yet"
              detail="The Karman predicted score appears here after a full-length test."
              action={<TextLink onClick={() => goTo("test")}>Full-length tests</TextLink>}
            />
          </Panel>
        )}
      </StudentShell>
    );

  return (
    <StudentShell screen="test-review" title={title} back={() => goTo("test")}>
      {/* Phones read score, mistakes, then the one next step (Peak-End); desktop keeps the mistakes beside both. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <Panel as="section" aria-label="Score" className="grid gap-4 p-4 sm:p-5 lg:col-start-1">
          <div>
            <p className="text-dense text-muted">Karman predicted score if you tested today</p>
            <p ref={fig} className="tabular text-kpi-lg">
              {just ? (
                <CountUp to={predicted} from={prev?.score ?? predicted - 60} duration={1200} />
              ) : (
                predicted.toLocaleString("en-US")
              )}
            </p>
            <p className="text-dense">
              <span className="text-muted">
                Test {r.n}, {fmtDate(r.date)}:{" "}
              </span>
              <span className="tabular font-semibold">{r.score.toLocaleString("en-US")}</span>
              {prev ? (
                <span className="text-positive">
                  {" "}
                  +{r.score - prev.score} since test {prev.n}
                </span>
              ) : null}
            </p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <div className="pr-4">
              <dt className="text-dense text-muted">Reading and Writing</dt>
              <dd className="tabular text-kpi">{r.rw}</dd>
            </div>
            <div className="pl-4">
              <dt className="text-dense text-muted">Math</dt>
              <dd className="tabular text-kpi">{r.math}</dd>
            </div>
          </dl>
          <Trend
            option={option}
            points={points}
            predicted={predicted}
            target={v.target}
            satDate={v.satDate}
          />
          <TrendSwitch value={option} onChange={setOption} />
        </Panel>
        <Panel
          as="section"
          aria-label="Every mistake, grouped by skill"
          className="p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <h2 className="pb-2 text-section">
            Every mistake, by skill{" "}
            <span className="tabular font-normal text-muted">{r.misses.length}</span>
          </h2>
          <div className="grid gap-3">
            {groups.map((g) => (
              <div key={g.skill}>
                <h3 className="px-1 pb-1 text-dense text-muted">
                  {g.skill} <span className="tabular">{g.misses.length}</span>
                </h3>
                <List>
                  {g.misses.map((m) => (
                    <Row
                      key={`${m.section}${m.module}${m.position}`}
                      title={`${m.section}, module ${m.module}, question ${m.position}`}
                      onPress={() => setOpen(m)}
                    />
                  ))}
                </List>
              </div>
            ))}
          </div>
        </Panel>
        <Panel as="section" aria-label="Next step" className="grid gap-3 p-4 sm:p-5 lg:col-start-1">
          {v.has("oneToOne") ? (
            <>
              <p className="text-body">
                Your Full-length review session with {v.tutor} goes through every one of these{" "}
                {r.misses.length} misses.
              </p>
              <div>
                <GlassButton variant="primary" className="k-sheen" onClick={() => goTo("classes")}>
                  Book the review session
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <p className="text-body">
                Your {r.misses.length} misses come back in Your Daily 10 after 2, 7 and 21 days.
                {v.has("liveClasses")
                  ? " David covers the ones most of the cohort missed in class."
                  : ""}
              </p>
              <div>
                {v.has("daily10") && !v.doneToday ? (
                  <GlassButton variant="primary" onClick={() => goTo("daily10")}>
                    Start Your Daily 10
                  </GlassButton>
                ) : (
                  <GlassButton variant="primary" onClick={() => goTo("home")}>
                    Back to Home
                  </GlassButton>
                )}
              </div>
            </>
          )}
        </Panel>
      </div>
      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `Module ${open.module}, question ${open.position}` : ""}
        width={560}
      >
        {q ? (
          <div className="grid gap-4">
            <p className="text-dense text-muted">
              {q.section}, {q.skill}
            </p>
            <QuestionBody
              question={q}
              chosen={wrongLetter}
              checked={{ correct: false, chosen: wrongLetter }}
              highlighting={false}
              onSelect={() => {}}
            />
            <div className="border-t border-line pt-3">
              <p className="text-dense text-muted">Explanation</p>
              <p className="text-body">
                <MathText text={q.explanation} />
              </p>
            </div>
          </div>
        ) : null}
      </Sheet>
    </StudentShell>
  );
}

export default withStudent(TestReview);
