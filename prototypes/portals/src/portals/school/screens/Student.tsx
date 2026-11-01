import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { LevelBar, BANDS } from "@/design-system/marks";
import { DOMAINS, byBand, fmtDate, studentById } from "@/mock";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { useHashParam } from "../nav";
import { schoolLevelsFor, type SchoolStudent } from "../mock-students";
import { PracticeSheet } from "../components/MoreSheets";
import { SchoolStudentHeader, type SchoolHeaderStudent } from "../components/StudentHeader";
import { Skeleton } from "@/design-system/components/Skeleton";
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
        <Lapsed ended={d.ended} seats={d.seats} licence={d.licence} what={`${s.name}'s practice`}>
          <Skeleton.Swap
            loading={d.loading}
            label={`Loading ${s.name}`}
            fallback={
              <div className="flex items-start gap-3">
                <Skeleton.Circle size={40} />
                <div className="grid flex-1 gap-2 pt-1">
                  <Skeleton.Text lines={1} width="48%" />
                  <Skeleton.Text lines={1} width="64%" />
                </div>
              </div>
            }
          >
            <SchoolStudentHeader s={header} />
          </Skeleton.Swap>
          <Columns
            className="mt-5"
            main={
              <Grid2>
                {DOMAINS.map((dom) => (
                  <Block
                    key={dom}
                    title={dom}
                    loading={d.loading}
                    error={d.error}
                    what={`the ${dom} levels`}
                    fallback={
                      <ul className="divide-y divide-line">
                        {levels
                          .filter((l) => l.domain === dom)
                          .map((l) => (
                            <li key={l.id} className="grid gap-1.5 py-2">
                              <div className="flex items-baseline justify-between gap-3">
                                <Skeleton.Text lines={1} size={14} width="58%" />
                                <Skeleton.Text lines={1} size={14} width={28} />
                              </div>
                              <Skeleton.Block height={6} />
                            </li>
                          ))}
                      </ul>
                    }
                  >
                    <ul className="divide-y divide-line">
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
                  </Block>
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

/**
 * The header's facts. Theo keeps his shared-cast SAT date and target; every
 * other school seat has neither (nobody set one), so both are null and the
 * header says nothing rather than guessing (copy rule 2, rule 47).
 */
function asTutorStudent(s: SchoolStudent): SchoolHeaderStudent {
  const theo = s.id === "theo" ? studentById("theo") : null;
  return {
    name: s.name,
    initials: s.initials,
    plan: "school",
    hue: s.hue,
    satDate: theo?.satDate ?? null,
    target: theo?.target ?? null,
    predicted: s.predicted,
    baseline: s.baseline,
  };
}
