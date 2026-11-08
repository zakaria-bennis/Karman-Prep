/*
 * One class: its join code, the roster (a progress ring and skill squares by Domain for each
 * student), work assigned to the class, and the form to assign more. Removing a student ends
 * the Practice plan the school gave them, unless they sit in another of its classes.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Cta, Num, Panel, Ring, Row, SectionHeader, SkillSquares } from "@/components/portal";
import { CopyButton } from "@/components/portal-extras/CopyButton";
import { ActionMessage, SchoolShell } from "@/components/school/SchoolShell";
import { SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { SUB_SKILLS, subSkillTitle } from "@/lib/subskills/taxonomy";
import { strongCount } from "@/lib/progress-glance/levels";
import { classForMember, requireSchoolContext } from "@/lib/school/access";
import { loadClassRoster } from "@/lib/school/roster";
import { formatLongDate } from "@/lib/school/terms";
import {
  assignWorkAction,
  cancelAssignmentAction,
  newJoinCodeAction,
  removeStudentAction,
} from "../../actions";

export const metadata: Metadata = { title: "Class" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shortDate(iso: string): string {
  return formatLongDate(iso).replace(/, \d{4}$/, "");
}

export default async function SchoolClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireSchoolContext();
  const [{ classId }, { done, error }] = await Promise.all([params, searchParams]);
  if (!UUID.test(classId)) notFound();
  const cls = await classForMember(ctx, classId);
  if (!cls) notFound();
  const roster = await loadClassRoster(ctx.school.id, cls.id);
  const today = new Date().toISOString().slice(0, 10);
  const inWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join/class?code=${cls.joinCode}`;

  const side = (
    <>
      <Card>
        <SectionHeader title="Join code" />
        <p className="kp-code" aria-label={`Join code ${cls.joinCode.split("").join(" ")}`}>
          {cls.joinCode}
        </p>
        <p className="kp-meta">Share the link, or students type the code at /join/class.</p>
        <p className="kp-linkbox">{joinUrl}</p>
        <div className="kp-copyline">
          <CopyButton text={cls.joinCode} label="Copy code" />
          <CopyButton text={joinUrl} label="Copy link" />
        </div>
        <form action={newJoinCodeAction}>
          <input type="hidden" name="classId" value={cls.id} />
          <button type="submit" className="kp-textbtn">
            Make a new code
          </button>
        </form>
      </Card>
      <Card>
        <SectionHeader
          title="Assigned work"
          note={roster.assignments.length ? <Num>{roster.assignments.length}</Num> : undefined}
        />
        {roster.assignments.length ? (
          roster.assignments.map((a) => (
            <div key={a.id}>
              <Row
                title={a.title}
                sub={`Due ${shortDate(a.due_on)}`}
                right={
                  <>
                    <Num>
                      {a.done} of {roster.students.length}
                    </Num>{" "}
                    done
                  </>
                }
                rightTone={a.due_on < today && a.done < roster.students.length ? "late" : undefined}
              />
              <form action={cancelAssignmentAction}>
                <input type="hidden" name="classId" value={cls.id} />
                <input type="hidden" name="assignmentId" value={a.id} />
                <button type="submit" className="kp-textbtn">
                  Take off Homework
                </button>
              </form>
            </div>
          ))
        ) : (
          <p className="kp-meta">Nothing assigned yet.</p>
        )}
      </Card>
    </>
  );

  return (
    <SchoolShell ctx={ctx} title={cls.name}>
      <Panel side={side}>
        <ActionMessage done={done} error={error} />
        <Card>
          <SectionHeader title="Assign work" />
          <form action={assignWorkAction} className="kp-form">
            <input type="hidden" name="classId" value={cls.id} />
            <label className="kp-field">
              <span>Kind of work</span>
              <select className="kp-select" name="kind" defaultValue="skill_practice">
                <option value="skill_practice">Skill practice set (10 questions)</option>
                <option value="domain_quiz">Domain quiz (about 12 questions)</option>
                <option value="full_length_test">Full-length practice test</option>
              </select>
            </label>
            <label className="kp-field">
              <span>Skill, for a practice set</span>
              <select className="kp-select" name="skillId" defaultValue="">
                <option value="">Choose a skill</option>
                {SKILL_DOMAINS.map((d) => (
                  <optgroup key={d.id} label={d.label}>
                    {SUB_SKILLS.filter((k) => k.domainId === d.id).map((k) => (
                      <option key={k.id} value={k.id}>
                        {subSkillTitle(k.id) ?? k.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="kp-field">
              <span>Domain, for a Domain quiz</span>
              <select className="kp-select" name="domainId" defaultValue="">
                <option value="">Choose a Domain</option>
                {SKILL_DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="kp-field">
              <span>Due</span>
              <input
                className="kp-input"
                type="date"
                name="dueOn"
                required
                min={today}
                defaultValue={inWeek}
              />
            </label>
            <div>
              <Cta type="submit">Assign to {cls.name}</Cta>
            </div>
          </form>
        </Card>
        <Card>
          <SectionHeader title="Students" note={<Num>{roster.students.length}</Num>} />
          {roster.students.length ? (
            <ul className="kp-roster">
              {roster.students.map((s) => (
                <li key={s.seatId}>
                  <div className="kp-roster-head">
                    <Ring
                      value={s.percent / 100}
                      label={`${s.name}: ${s.percent}% of the way to Conquered`}
                    >
                      <Num>{s.percent}%</Num>
                    </Ring>
                    <span className="kp-roster-who">
                      <b>{s.name}</b>
                      <small>
                        {s.lastPracticedAt
                          ? `Practiced ${shortDate(s.lastPracticedAt)}`
                          : "Not practiced yet"}
                        {roster.assignments.length
                          ? ` · ${s.assignmentsDone} of ${roster.assignments.length} assignments done`
                          : ""}
                      </small>
                    </span>
                  </div>
                  <div className="kp-domains">
                    {s.glance.domains.map((d) => (
                      <span className="kp-domain" key={d.id}>
                        <small>{d.label}</small>
                        <SkillSquares
                          skills={d.skills.map((k) => ({ level: k.level, name: k.label }))}
                          label={`${d.label}: ${strongCount(d)} of ${d.skills.length} at Understanding or above`}
                        />
                      </span>
                    ))}
                  </div>
                  <details className="kp-details">
                    <summary>Remove from class</summary>
                    <form action={removeStudentAction} className="kp-form">
                      <input type="hidden" name="classId" value={cls.id} />
                      <input type="hidden" name="seatId" value={s.seatId} />
                      <p className="kp-meta">
                        {s.name} leaves {cls.name}. The Practice plan from {ctx.school.name} ends
                        unless they are in another of its classes. Their own practice history stays
                        theirs.
                      </p>
                      <button type="submit" className="kp-textbtn" data-tone="danger">
                        Remove {s.name.split(" ")[0]}
                      </button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kp-meta">No students yet. Share the join code to fill the class.</p>
          )}
        </Card>
      </Panel>
    </SchoolShell>
  );
}
