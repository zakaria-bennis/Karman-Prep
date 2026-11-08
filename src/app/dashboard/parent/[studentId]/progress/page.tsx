// ============================================================
// /dashboard/parent/[studentId]/progress — one predicted score with
// its history, and skills by level in a ring (New, Learning,
// Understanding, Conquered), with squares by Domain. No questions.
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
import { strongCount } from "@/lib/progress-glance/levels";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ParentProgressPage({ params }: { params: Promise<{ studentId: string }> }) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const week = await loadChildWeek(child);
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
          <Ring value={glance.coursePercent.math / 100} label={`SAT Math: ${glance.coursePercent.math}%`}>
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
                      <Ring value={h.score / 1600} size={44} width={5} label={`${h.score} on ${sessionWhen(h.takenAt, { date: true })}`}>
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
            <p className="kp-meta">Shows after {child.firstName}&rsquo;s first full practice test.</p>
          )}
          <Cta href={`/dashboard/parent/${child.id}/recap`}>See this week&rsquo;s email</Cta>
        </section>
        <Card>
          <SectionHeader title="Skills by level" note={<><Num>{started}</Num> of <Num>{total}</Num> started</>} />
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
