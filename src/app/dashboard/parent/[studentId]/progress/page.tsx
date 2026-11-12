// ============================================================
// /dashboard/parent/[studentId]/progress — one predicted score with
// its history, and skills by level in a ring (New, Learning,
// Understanding, Conquered), with squares by Domain. No questions.
// Real SAT scores a parent types in sit beside the predicted one
// (founder, 2026-11-12).
// ============================================================

import type { Metadata } from "next";
import {
  Card,
  Cta,
  Legend,
  LevelRing,
  Num,
  Panel,
  Ring,
  SectionHeader,
  SKILL_LEVELS,
  SkillSquares,
} from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { GuaranteeCard, sessionWhen } from "@/components/parent/parts";
import { ActionMessage } from "@/components/school/SchoolShell";
import { strongCount } from "@/lib/progress-glance/levels";
import { loadOfficialScores } from "@/lib/parent/messages";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";
import { FIRST_DIGITAL_SAT } from "@/lib/parent/test-day";
import { saveOfficialScoreAction } from "../../actions";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ParentProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const { done, error } = await searchParams;
  const [week, official] = await Promise.all([loadChildWeek(child), loadOfficialScores(child.id)]);
  const today = new Date().toISOString().slice(0, 10);
  const canWrite = !ctx.isAdmin || ctx.children.some((c) => c.id === child.id);
  const { glance, score } = week;
  const started = glance.counts[1] + glance.counts[2] + glance.counts[3] + glance.counts[4];
  const total = started + glance.counts[0];
  const best = score.history.reduce((m, h) => Math.max(m, h.score), 0);

  const side = (
    <>
      {week.guarantee && <GuaranteeCard status={week.guarantee} childName={child.firstName} />}
      <Card>
        <SectionHeader title="Courses" />
        <div className="kp-ring-row">
          <Ring
            value={glance.coursePercent.math / 100}
            label={`SAT Math: ${glance.coursePercent.math}%`}
          >
            <Num>{glance.coursePercent.math}%</Num>
          </Ring>
          <span className="kp-meta">SAT Math</span>
        </div>
        <div className="kp-ring-row">
          <Ring
            value={glance.coursePercent.reading / 100}
            label={`SAT Reading and Writing: ${glance.coursePercent.reading}%`}
          >
            <Num>{glance.coursePercent.reading}%</Num>
          </Ring>
          <span className="kp-meta">SAT Reading and Writing</span>
        </div>
      </Card>
    </>
  );

  return (
    <ParentShell ctx={ctx} child={child} title="Progress">
      <Panel side={side}>
        <section aria-labelledby="score-main">
          <h2 className="kp-title" id="score-main">
            Predicted score
          </h2>
          {score.current !== null ? (
            <>
              <Num big>{score.current}</Num>
              {score.history.length > 1 && (
                <div className="kp-history" role="list" aria-label="Score history">
                  {score.history.map((h) => (
                    <span key={h.takenAt} role="listitem">
                      <Ring
                        value={h.score / 1600}
                        size={64}
                        width={5}
                        label={`${h.score} on ${sessionWhen(h.takenAt, { date: true })}`}
                      >
                        <Num>{h.score}</Num>
                      </Ring>
                      {sessionWhen(h.takenAt, { date: true })}
                    </span>
                  ))}
                </div>
              )}
              <p className="kp-meta">
                {score.history.length > 1 ? (
                  <>
                    Best so far <Num>{best}</Num>, from {score.history.length} measures.
                  </>
                ) : (
                  "One measure so far. The next full practice test adds a point here."
                )}
              </p>
            </>
          ) : (
            <p className="kp-meta">
              Shows after {child.firstName}&rsquo;s first full practice test.
            </p>
          )}
          <Cta href={`/dashboard/parent/${child.id}/messages`}>Tutor notes and messages</Cta>
        </section>
        <Card label="Real SAT scores" id="official">
          <SectionHeader
            title="Real SAT scores"
            note={official.length ? <Num>{official.length}</Num> : undefined}
          />
          <ActionMessage done={done} error={error} />
          {official.length ? (
            <ul className="kp-official" aria-label="Real SAT scores">
              {official.map((o) => (
                <li key={o.testDate}>
                  <Num big>{o.total}</Num>
                  <span>
                    <b>{sessionWhen(`${o.testDate}T12:00:00Z`, { date: true })}</b>
                    <small className="kp-meta">
                      Reading and Writing <Num>{o.readingWriting}</Num> · Math <Num>{o.math}</Num>
                      {score.current !== null && (
                        <>
                          {" "}
                          · predicted now <Num>{score.current}</Num>
                        </>
                      )}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kp-meta">
              When {child.firstName} gets a score back from the College Board, add it here. It sits
              next to the predicted score, and the test-day countdown measures from the best one.
            </p>
          )}
          {canWrite && (
            <form action={saveOfficialScoreAction} className="kp-form kp-form-row">
              <input type="hidden" name="studentId" value={child.id} />
              <label className="kp-field">
                <span>Test date</span>
                <input
                  type="date"
                  name="testDate"
                  className="kp-input"
                  min={FIRST_DIGITAL_SAT}
                  max={today}
                  required
                />
              </label>
              <label className="kp-field">
                <span>Reading and Writing</span>
                <input
                  type="number"
                  name="readingWriting"
                  className="kp-input"
                  min={200}
                  max={800}
                  step={10}
                  inputMode="numeric"
                  required
                />
              </label>
              <label className="kp-field">
                <span>Math</span>
                <input
                  type="number"
                  name="math"
                  className="kp-input"
                  min={200}
                  max={800}
                  step={10}
                  inputMode="numeric"
                  required
                />
              </label>
              <Cta type="submit">Add score</Cta>
            </form>
          )}
        </Card>
        <Card>
          <SectionHeader
            title="Skills by level"
            note={
              <>
                <Num>{started}</Num> of <Num>{total}</Num> started
              </>
            }
          />
          <div className="kp-ring-row">
            <LevelRing counts={glance.counts}>
              <Num>{started}</Num>
            </LevelRing>
            <Legend
              items={SKILL_LEVELS.filter((l) => l.level > 0).map((l) => ({
                label: l.name,
                value: <Num>{glance.counts[l.level]}</Num>,
                color: l.color ?? "transparent",
              }))}
            />
          </div>
        </Card>
        <Card>
          <SectionHeader title="By Domain" />
          <div className="kp-domains">
            {glance.domains.map((d) => (
              <span className="kp-domain" key={d.id}>
                <small>{d.label}</small>
                <SkillSquares
                  skills={d.skills.map((s) => ({ level: s.level, name: s.label }))}
                  label={`${d.label}: ${strongCount(d)} of ${d.skills.length} at Understanding or above`}
                />
              </span>
            ))}
          </div>
        </Card>
      </Panel>
    </ParentShell>
  );
}
