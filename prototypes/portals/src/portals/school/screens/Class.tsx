import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { DataTable, type Column } from "@/design-system/components/DataTable";
import { Empty } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { LevelMark, BANDS } from "@/design-system/marks";
import { fmtDate } from "@/mock";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { hrefFor, useHashParam } from "../nav";
import { schoolLevelsFor, skillsToTeach, summaryBand } from "../mock-students";
import { RankBars } from "../components/RankBars";
import { CopyButton, Code } from "../components/KeyList";
import { PracticeSheet } from "../components/MoreSheets";
import { dueLine } from "./Practice";
import { Block, Columns, Kpis, Lapsed, Stack, pct } from "./common";

/**
 * One class. The question: what should this class work on next? The skills
 * most students are still learning lead; the roster follows with each
 * student's level and this week's questions; the class's practice and its
 * seat key sit beside, every block on the columns' one gap. The teacher's
 * one action assigns practice.
 */
type RosterRow = Record<string, unknown> & {
  id: string;
  name: string;
  band: number;
  week: number;
  daily: number;
  last: string;
};

export default function Class() {
  const d = useSchoolData();
  const toast = useToast();
  const id = useHashParam("id");
  const cls = d.classById(id) ?? d.classes[0] ?? null;
  const students = cls ? d.studentsIn(cls.id) : [];
  const week = d.weekOf(students);
  const teach = skillsToTeach(students).slice(0, 6);
  const bands = [4, 3, 2, 1, 0].map((band) => ({
    band: band as 0 | 1 | 2 | 3 | 4,
    count: students.filter((s) => summaryBand(schoolLevelsFor(s)) === band).length,
  }));
  const key = cls ? d.keys.find((k) => k.classId === cls.id && !k.revoked && k.uses > 1) : null;
  const due = cls
    ? d.practice.filter((p) => p.classId === cls.id).sort((a, b) => b.due.localeCompare(a.due))
    : [];
  const [open, setOpen] = useState(false);
  const teacherName = cls ? d.staff.find((s) => s.id === cls.teacher)?.name : "";

  const finding = !cls
    ? "No class yet."
    : !students.length
      ? `${teacherName}. No student has joined yet; they appear here as they sign in with the key${key ? ` ${key.code}` : ""}.`
      : d.ended
        ? `${teacherName}. ${students.length} students finished the year; ${students.filter((s) => s.predicted).length} have a Karman predicted score.`
        : `${teacherName}. ${week.active} of ${students.length} practised this week. ${teach[0].skill.label} is the skill most are still learning: ${teach[0].under} of ${students.length} under Proficient.`;
  const primary =
    !cls || d.ended ? null : d.role === "teacher" ? (
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        Assign practice
      </GlassButton>
    ) : key ? (
      <GlassButton
        variant="primary"
        onClick={async () => {
          try {
            await navigator.clipboard?.writeText(key.code);
          } catch {
            /* prototype */
          }
          toast.push({
            title: `${key.code} copied`,
            detail: `${cls.name}'s seat key, ${d.usedOf(key.id)} of ${key.uses} used.`,
            kind: "success",
          });
        }}
      >
        Copy the seat key
      </GlassButton>
    ) : null;

  const rows: RosterRow[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    band: summaryBand(schoolLevelsFor(s)),
    week: s.questionsWeek,
    daily: s.daily10Week,
    last: s.lastActive ?? "",
  }));
  const columns: Column<RosterRow>[] = [
    {
      key: "name",
      label: "Student",
      render: (v, r) => (
        <a
          href={hrefFor("student", { id: r.id })}
          className="flex min-h-tap w-full min-w-tap items-center text-left font-medium text-text hover:underline"
        >
          {String(v)}
        </a>
      ),
    },
    {
      key: "band",
      label: "Level",
      render: (v) => (
        <span className="inline-flex items-center gap-1.5">
          <LevelMark level={v as 0 | 1 | 2 | 3 | 4} size={20} />
          <span className="text-muted">{BANDS[v as number]}</span>
        </span>
      ),
    },
    {
      key: "week",
      label: "This week",
      numeric: true,
      render: (v) => (v === 0 ? <span className="text-muted">0</span> : String(v)),
    },
    {
      key: "daily",
      label: "Your Daily 10",
      numeric: true,
      render: (v) => (
        <>
          {String(v)} <span className="text-muted">of 5</span>
        </>
      ),
    },
    {
      key: "last",
      label: "Last active",
      render: (v) => (v ? fmtDate(String(v)) : <span className="text-muted">-</span>),
    },
  ];

  return (
    <SchoolShell
      screen="class"
      title={cls?.name ?? "Class"}
      finding={finding}
      primary={primary}
      back={{ label: "Classes", to: "classes" }}
    >
      {!cls ? (
        <Empty title="No class yet" detail="Classes appear here once the school admin adds one." />
      ) : (
        <Lapsed ended={d.ended} seats={d.seats} licence={d.licence} what="the class">
          <Stack>
            <Columns
              main={
                <>
                  <Kpis
                    loading={d.loading}
                    items={[
                      {
                        label: "Practised this week",
                        value: String(week.active),
                        unit: `of ${students.length}`,
                        lead: true,
                      },
                      {
                        label: "Questions answered",
                        value: week.questions.toLocaleString("en-US"),
                      },
                      {
                        label: "Your Daily 10 done",
                        value: pct(week.daily10Done, week.daily10Slots),
                        delta: {
                          text: `${week.daily10Done} of ${week.daily10Slots} school days`,
                          tone: "muted",
                        },
                      },
                    ]}
                  />
                  <Block
                    title="Skills to teach next"
                    loading={d.loading}
                    error={d.error}
                    what="the class's skills"
                    aside="students under Proficient"
                  >
                    {students.length ? (
                      <RankBars
                        className="pt-2"
                        labelWidth="min(14rem, 42%)"
                        max={students.length}
                        items={teach.map((t, i) => ({
                          id: t.skill.id,
                          label: t.skill.label,
                          value: t.under,
                          valueLabel: `${t.under} of ${students.length}`,
                          highlight: i === 0,
                        }))}
                      />
                    ) : (
                      <p className="py-2 text-dense text-muted">
                        Levels appear after the first Your Daily 10.
                      </p>
                    )}
                  </Block>
                </>
              }
              side={
                <>
                  <Block
                    title="Where the class stands"
                    loading={d.loading}
                    aside="students by level"
                  >
                    {students.length ? (
                      <RankBars
                        className="pt-2"
                        max={students.length}
                        items={bands.map((b) => ({
                          id: BANDS[b.band],
                          label: BANDS[b.band],
                          value: b.count,
                          valueLabel: `${b.count}`,
                          highlight: b.band >= 3,
                        }))}
                      />
                    ) : (
                      <p className="py-2 text-dense text-muted">No levels yet.</p>
                    )}
                  </Block>
                  <Block
                    title="Practice"
                    loading={d.loading}
                    padded={false}
                    aside={`${due.length}`}
                  >
                    <div className="px-4 pb-1">
                      {due.length ? (
                        <List>
                          {due.map((p) => (
                            <Row
                              key={p.id}
                              title={p.title}
                              sub={dueLine(p, students, d.today)}
                              trailing={`${p.questions} q`}
                            />
                          ))}
                        </List>
                      ) : (
                        <p className="py-3 text-dense text-muted">
                          Nothing assigned to {cls.name} yet.
                        </p>
                      )}
                    </div>
                  </Block>
                  {key && d.role === "admin" ? (
                    <Block
                      title="Seat key"
                      loading={d.loading}
                      aside={d.ended ? "Paused" : `${d.usedOf(key.id)} of ${key.uses} used`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <Code code={key.code} className="text-section" />
                        {d.ended ? null : <CopyButton value={key.code} />}
                      </div>
                      <p className="mt-1 text-dense text-muted">
                        Issued {fmtDate(key.issued)}. Students enter it on their first sign-in.
                      </p>
                    </Block>
                  ) : null}
                </>
              }
            />
            <Block title="Students" loading={d.loading} padded={false} aside={`${students.length}`}>
              <div className="px-4 pb-2">
                <DataTable
                  rows={rows}
                  columns={columns}
                  rowKey="id"
                  caption={`${cls.name} roster`}
                  defaultSort={{ key: "week", dir: "desc" }}
                  emptyMessage="No students have joined yet."
                />
              </div>
            </Block>
          </Stack>
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
