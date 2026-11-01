import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { LevelBar, BANDS } from "@/design-system/marks";
import { DOMAINS, SAT_MARCH, SAT_MAY, byBand, fmtDate, studentById } from "@/mock";
import { StudentHeader } from "@/portals/tutor/shared";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { useHashParam } from "../nav";
import { schoolLevelsFor, type SchoolStudent } from "../mock-students";
import { PracticeSheet } from "../components/MoreSheets";
import { Block, Columns, Grid2, Lapsed } from "./common";

/**
 * One student, the view a tutor has: the shared StudentHeader (plan from the
 * config, the SAT date, the one Karman predicted score counting up), then the
 * levels on every skill by domain, this week's work, the class's practice,
 * and whether a parent account is linked. Rule 57: mastery and questions
 * answered lead. No guarantee here: a school seat does not carry one.
 */
export default function Student() {
  const d = useSchoolData();
  const id = useHashParam("id");
  const s =
    d.students.find((x) => x.id === id) ??
    d.students.find((x) => x.id === "theo") ??
    d.students[0] ??
    null;
  const [open, setOpen] = useState(false);
  const cls = s ? d.classById(s.classId) : null;
  const levels = s ? schoolLevelsFor(s) : [];
  const counts = byBand(levels);
  const due =
    s && cls
      ? d.practice.filter((p) => p.classId === cls.id).sort((a, b) => b.due.localeCompare(a.due))
      : [];
  const header = s ? asTutorStudent(s) : null;
  const finding = !s
    ? "No students yet."
    : `${cls?.name ?? "No class yet"} · joined ${fmtDate(s.joined)} · ${counts
        .slice()
        .reverse()
        .filter((c) => c.count)
        .map((c) => `${c.count} ${BANDS[c.band]}`)
        .join(", ")}.`;

  return (
    <SchoolShell
      screen="student"
      title={s?.name ?? "Student"}
      finding={finding}
      back={{ label: cls?.name ?? "Students", to: cls ? "class" : "students" }}
      primary={
        s && cls && d.role === "teacher" && !d.ended ? (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Assign practice
          </GlassButton>
        ) : null
      }
    >
      {!s || !header ? (
        <Empty
          title="No students yet"
          detail="A student's levels and work appear here once they sign in with a seat key."
        />
      ) : (
        <Lapsed ended={d.ended} seats={d.seats} what={`${s.name}'s practice`}>
          <StudentHeader s={header} />
          <Columns
            className="mt-5"
            main={
              <Grid2>
                {DOMAINS.map((dom) => (
                  <Panel key={dom} as="section" className="px-4 py-3">
                    <h2 className="text-section">{dom}</h2>
                    <ul className="mt-1 divide-y divide-line">
                      {levels
                        .filter((l) => l.domain === dom)
                        .map((l) => (
                          <li key={l.id} className="grid gap-1 py-2">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="min-w-0 truncate text-dense" title={l.label}>
                                {l.label}
                              </span>
                              <span className="tabular shrink-0 text-dense">
                                {l.now > 0 ? l.now : <span className="text-muted">-</span>}
                                {l.now !== l.was ? (
                                  <span
                                    className={l.now > l.was ? "text-positive" : "text-negative"}
                                  >
                                    {" "}
                                    {l.now > l.was ? `+${l.now - l.was}` : `${l.now - l.was}`} today
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            <LevelBar value={l.now} was={l.was} size="sm" />
                          </li>
                        ))}
                    </ul>
                  </Panel>
                ))}
              </Grid2>
            }
            side={
              <>
                <Block
                  title="This week"
                  loading={d.loading}
                  error={d.error}
                  what="this week's work"
                >
                  <dl className="divide-y divide-line">
                    {[
                      ["Questions answered", String(s.questionsWeek)],
                      ["Your Daily 10", `${s.daily10Week} of 5 school days`],
                      ["Last active", s.lastActive ? fmtDate(s.lastActive) : "-"],
                      ["Questions all time", s.questionsTotal.toLocaleString("en-US")],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-baseline justify-between gap-3 py-2 text-dense"
                      >
                        <dt className="text-muted">{k}</dt>
                        <dd className="tabular">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Block>
                <Block
                  title="Practice"
                  loading={d.loading}
                  padded={false}
                  aside={cls ? cls.name : undefined}
                >
                  <div className="px-4 pb-1">
                    {due.length ? (
                      <List>
                        {due.map((p) => (
                          <Row
                            key={p.id}
                            title={p.title}
                            sub={{ kind: "due", text: `Due ${fmtDate(p.due)}` }}
                            trailing={`${p.questions} q`}
                          />
                        ))}
                      </List>
                    ) : (
                      <p className="py-3 text-dense text-muted">
                        {cls
                          ? `Nothing assigned to ${cls.name} yet.`
                          : "Practice is assigned by class. This student has no class yet."}
                      </p>
                    )}
                  </div>
                </Block>
                <Block title="Parent" loading={d.loading}>
                  <p className="pt-1 text-dense text-muted">
                    {s.parentLinked
                      ? `A parent account was linked ${fmtDate(s.parentLinked)}. The weekly update goes there.`
                      : "No parent account yet. The student invites a parent from their own account; the weekly update then goes there."}
                  </p>
                </Block>
              </>
            }
          />
        </Lapsed>
      )}
      <PracticeSheet
        open={open}
        onClose={() => setOpen(false)}
        classes={d.classes}
        me={d.me}
        today={d.today}
        preset={cls?.id}
      />
    </SchoolShell>
  );
}

/** The shape the tutor portal's StudentHeader reads: the plan is the school's licence, read from the config by id in mock.ts. */
function asTutorStudent(s: SchoolStudent) {
  return {
    id: s.id,
    name: s.name,
    initials: s.initials,
    plan: "school" as const,
    hue: s.hue,
    since: s.joined,
    satDate: s.id === "theo" ? studentById("theo").satDate : s.grade === 12 ? SAT_MARCH : SAT_MAY,
    target: s.predicted ? Math.ceil((s.predicted + 150) / 50) * 50 : 1250,
    predicted: s.predicted,
    baseline: s.baseline,
    grade: s.grade,
    parent: { id: "", name: "" },
  };
}
