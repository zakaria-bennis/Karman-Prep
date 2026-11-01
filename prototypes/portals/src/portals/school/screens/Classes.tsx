import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { fmtDate } from "@/mock";
import { Initials } from "@/portals/tutor/shared";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { goScreen } from "../nav";
import { RankBars } from "../components/RankBars";
import { ClassSheet } from "../components/Sheets";
import { PracticeSheet } from "../components/MoreSheets";
import { PlaceSheet } from "../components/PlaceSheet";
import { Block, Columns, Lapsed, pct } from "./common";

/**
 * Classes. For the admin, every class with its teacher and size and the
 * students who have none; for the teacher, their own. The question: which
 * class needs attention this week? The rank bars answer it in one hue.
 */
export default function Classes() {
  const d = useSchoolData();
  const [sheet, setSheet] = useState<null | "class" | "place" | "practice">(null);
  const teacher = d.role === "teacher";
  const per = (list: typeof d.students) =>
    list.length ? Math.round(list.reduce((a, s) => a + s.questionsWeek, 0) / list.length) : 0;
  const rows = d.classes
    .map((c) => ({ c, list: d.studentsIn(c.id) }))
    .sort((a, b) => per(b.list) - per(a.list));
  const top = rows[0];
  const idle = d.students
    .filter((s) => s.questionsWeek === 0)
    .sort((a, b) => (a.lastActive ?? "").localeCompare(b.lastActive ?? ""));
  const due = d.practice
    .filter((p) => p.due >= d.today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  const finding = !d.classes.length
    ? teacher
      ? "No class is yours yet. The school admin adds classes and puts you on them."
      : "No classes yet. A class comes with its seat key; students join with it."
    : d.setup
      ? `${d.classes.length} classes, no students yet. The keys were issued ${fmtDate(d.classes[0].created)}; students join as they sign in.`
      : d.ended
        ? `${d.classes.length} classes finished the year with ${d.students.length} students.`
        : `${rows[1] && per(rows[1].list) === per(top.list) ? `${top.c.name} and ${rows[1].c.name} both practised ${per(top.list)} questions a student this week` : `${top.c.name} practised most this week: ${per(top.list)} questions a student${rows[1] ? `, against ${per(rows[1].list)} in ${rows[1].c.name}` : ""}`}.${idle.length ? ` ${idle.length} students did no practice.` : ""}${d.unassigned.length && !teacher ? ` ${d.unassigned.length} have a seat and no class.` : ""}`;
  const primary = teacher ? (
    d.classes.length ? (
      <GlassButton variant="primary" onClick={() => setSheet("practice")}>
        Assign practice
      </GlassButton>
    ) : null
  ) : d.ended ? null : (
    <GlassButton variant="primary" onClick={() => setSheet("class")}>
      Add a class
    </GlassButton>
  );

  return (
    <SchoolShell screen="classes" title="Classes" finding={finding} primary={primary}>
      {!d.classes.length ? (
        <Empty
          title="No classes yet"
          detail={
            teacher
              ? "Your classes appear here once the school admin adds you to one."
              : "Add a class to issue its seat key. Students join with the key and appear in the class as they sign in."
          }
        />
      ) : (
        <Columns
          main={
            <Lapsed ended={d.ended} seats={d.seats} licence={d.licence} what="every class">
              <Block
                title={teacher ? "Your classes" : "Every class"}
                loading={d.loading}
                error={d.error}
                what="the classes"
                padded={false}
                aside={`${d.classes.length}`}
              >
                <div className="px-4 pb-1">
                  <List>
                    {rows.map(({ c, list }) => (
                      <Row
                        key={c.id}
                        title={
                          teacher
                            ? c.name
                            : `${c.name}, ${d.staff.find((s) => s.id === c.teacher)?.name ?? "no teacher"}`
                        }
                        leading={
                          <Initials
                            initial={d.staff.find((s) => s.id === c.teacher)?.initials ?? "?"}
                            hue={d.staff.find((s) => s.id === c.teacher)?.hue ?? 0}
                            size={24}
                          />
                        }
                        trailing={`${list.length} students`}
                        onPress={() => goScreen("class", { id: c.id })}
                      />
                    ))}
                    {!teacher && d.unassigned.length ? (
                      <Row
                        title="No class yet"
                        sub={{
                          kind: "state",
                          text: `${d.unassigned.length} students with a seat and no class`,
                          tone: "negative",
                        }}
                        trailing={`${d.unassigned.length} students`}
                        onPress={() => setSheet("place")}
                      />
                    ) : null}
                  </List>
                </div>
              </Block>
            </Lapsed>
          }
          side={
            <>
              <Block title="Questions a student this week" loading={d.loading}>
                {d.setup ? (
                  <p className="py-2 text-dense text-muted">
                    Nothing yet. The first numbers appear once a student signs in with a key.
                  </p>
                ) : (
                  <>
                    <RankBars
                      className="pt-2"
                      items={rows.map(({ c, list }, i) => ({
                        id: c.id,
                        label: c.name,
                        value: per(list),
                        valueLabel: `${per(list)} q`,
                        highlight: i === 0,
                      }))}
                      onPress={(id) => goScreen("class", { id })}
                    />
                    <p className="mt-3 text-dense text-muted">
                      Your Daily 10 done {pct(d.week.daily10Done, d.week.daily10Slots)} of school
                      days across {teacher ? "your" : "all"} classes.
                    </p>
                  </>
                )}
              </Block>
              {due.length ? (
                <Block
                  title="Practice due"
                  loading={d.loading}
                  padded={false}
                  aside={`${due.length}`}
                >
                  <div className="px-4 pb-1">
                    <List>
                      {due.map((p) => (
                        <Row
                          key={p.id}
                          title={`${p.title}, ${d.classById(p.classId)?.name}`}
                          sub={{ kind: "due", text: `Due ${fmtDate(p.due)}` }}
                          trailing={`${p.questions} q`}
                          onPress={() => goScreen("class", { id: p.classId })}
                        />
                      ))}
                    </List>
                  </div>
                </Block>
              ) : null}
              {idle.length && !d.ended ? (
                <Block
                  title="No practice this week"
                  loading={d.loading}
                  padded={false}
                  aside={`${idle.length} of ${d.students.length}`}
                >
                  <div className="px-4 pb-2">
                    <List
                      total={idle.length > 4 ? `${idle.length} students` : undefined}
                      viewAll={
                        idle.length > 4 ? (
                          <button
                            type="button"
                            onClick={() => goScreen("students", { tab: "idle" })}
                            className="min-h-tap font-semibold text-accent"
                          >
                            View all
                          </button>
                        ) : undefined
                      }
                    >
                      {idle.slice(0, 4).map((s) => (
                        <Row
                          key={s.id}
                          title={s.name}
                          leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                          sub={{
                            kind: "state",
                            text: `${d.classById(s.classId)?.name ?? "No class"} · ${s.lastActive ? `last active ${fmtDate(s.lastActive)}` : "never practised"}`,
                          }}
                          onPress={() => goScreen("student", { id: s.id })}
                        />
                      ))}
                    </List>
                  </div>
                </Block>
              ) : null}
            </>
          }
        />
      )}
      <ClassSheet
        open={sheet === "class"}
        onClose={() => setSheet(null)}
        teachers={d.teachers}
        me={d.me}
        today={d.today}
      />
      <PlaceSheet
        open={sheet === "place"}
        onClose={() => setSheet(null)}
        students={d.unassigned}
        classes={d.classes}
        anchor={null}
      />
      <PracticeSheet
        open={sheet === "practice"}
        onClose={() => setSheet(null)}
        classes={d.classes}
        me={d.me}
        today={d.today}
      />
    </SchoolShell>
  );
}
