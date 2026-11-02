import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Tabs } from "@/design-system/components/Tabs";
import { Empty } from "@/design-system/components/Empty";
import { LevelMark } from "@/design-system/marks";
import { Initials } from "@/portals/tutor/shared";
import { SchoolShell } from "../shell";
import { useSchoolData } from "../data";
import { hashParam, hrefFor, setHashParam } from "../nav";
import { schoolLevelsFor, summaryBand } from "../mock-students";
import { PracticeSheet } from "../components/MoreSheets";
import { Block, Lapsed } from "./common";

/**
 * Students: everyone in the teacher's classes (or the whole school for the
 * admin), one row each with their level and this week's questions. The
 * question: who is not practising? That is the fourth filter and the finding.
 * The filter lives in the link (?tab=), so a reload or a shared link keeps
 * it; a long list shows its first 40 rows and a link for the rest.
 */
const PAGE = 40;

export default function Students() {
  const d = useSchoolData();
  const [tab, setTabState] = useState(() => hashParam("tab") ?? "all");
  const [shownCount, setShownCount] = useState(PAGE);
  const setTab = (t: string) => {
    setTabState(t);
    setShownCount(PAGE);
    setHashParam("tab", t === "all" ? null : t);
  };
  const [open, setOpen] = useState(false);
  const idle = d.students.filter((s) => s.questionsWeek === 0);
  const list = d.students
    .filter((s) =>
      tab === "all" ? true : tab === "idle" ? s.questionsWeek === 0 : s.classId === tab
    )
    .sort((a, b) => b.questionsWeek - a.questionsWeek || a.name.localeCompare(b.name));
  const className = (id: string | null) => d.classById(id)?.name ?? "No class";
  const finding = !d.students.length
    ? d.setup
      ? "No student has signed in yet. They appear here the day they use a seat key."
      : "No students yet."
    : d.ended
      ? `${d.students.length} students finished the year.`
      : `${d.students.length} students; ${idle.length} did no practice this week${
          idle.length
            ? `, ${idle
                .slice(0, 3)
                .map((s) => s.name)
                .join(", ")}${idle.length > 3 ? " and others" : ""}`
            : ""
        }.`;

  return (
    <SchoolShell
      screen="students"
      title="Students"
      finding={finding}
      primary={
        d.role === "teacher" && d.classes.length && !d.ended ? (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Assign practice
          </GlassButton>
        ) : null
      }
    >
      {!d.students.length ? (
        <Empty
          title="No students yet"
          detail="Students appear here as they sign in with a seat key. Each row shows their level and the questions they answered this week."
        />
      ) : (
        <Lapsed ended={d.ended} seats={d.seats} licence={d.licence} what="every student's practice">
          <Tabs
            label="Filter students"
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "All", count: d.students.length },
              ...d.classes.map((c) => ({
                id: c.id,
                label: c.name,
                count: d.studentsIn(c.id).length,
              })),
              { id: "idle", label: "Not practising", count: idle.length },
            ]}
          />
          <Block
            title={tab === "idle" ? "No practice this week" : "Students"}
            loading={d.loading}
            error={d.error}
            what="the students"
            padded={false}
            aside={`${list.length}`}
          >
            <div className="px-4 pb-1">
              <List
                total={
                  list.length > shownCount ? `${shownCount} of ${list.length} students` : undefined
                }
                viewAll={
                  list.length > shownCount ? (
                    <button
                      type="button"
                      onClick={() => setShownCount(list.length)}
                      className="min-h-tap font-semibold text-accent"
                    >
                      Show {list.length - shownCount} more
                    </button>
                  ) : undefined
                }
              >
                {list.slice(0, shownCount).map((s) => (
                  <Row
                    key={s.id}
                    title={s.name}
                    leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                    sub={
                      s.questionsWeek === 0 && !d.ended
                        ? {
                            kind: "state",
                            text: `No practice this week · ${className(s.classId)}`,
                            tone: "negative",
                          }
                        : undefined
                    }
                    trailing={
                      <span className="inline-flex items-center gap-3">
                        <LevelMark level={summaryBand(schoolLevelsFor(s))} size={20} />
                        <span>{s.questionsWeek} q</span>
                      </span>
                    }
                    href={hrefFor("student", { id: s.id })}
                  />
                ))}
              </List>
              {!list.length ? (
                <p className="py-3 text-dense text-muted">Everyone practised this week.</p>
              ) : null}
            </div>
          </Block>
        </Lapsed>
      )}
      <PracticeSheet
        open={open}
        onClose={() => setOpen(false)}
        classes={d.classes}
        me={d.me}
        today={d.today}
      />
    </SchoolShell>
  );
}
