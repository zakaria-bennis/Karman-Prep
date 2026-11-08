import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Tabs } from "@/design-system/components/Tabs";
import { Empty } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { TutorShell } from "../shell";
import { useSelectedStudent, useTutorData } from "../data";
import { goScreen, type ScreenId } from "../nav";
import { tutorStudentById } from "../mock";
import { missesFor } from "../mock-tests";
import { useStore } from "../store";
import { TIcon } from "../icons";
import { StudentHeader } from "../components/StudentHeader";
import { Briefing, briefingItems } from "./Briefing";
import { GuaranteeTab, HomeworkTab, Levels, NotesTab } from "./StudentTabs";
import { clock, dayDate } from "./common";
import { cn } from "@/design-system/cn";

/**
 * The student view: the briefing first (everything a tutor needs before a
 * session on one screen), then levels, notes, guarantee and homework as tabs.
 * The one highlighted action is Join Zoom until every item is covered, then
 * Write the parent update. Exported through shared.ts for the school portal.
 * Only the briefing carries a count (it is the queue to work through); in the
 * locked state the guarantee tab opens first so the gate is seen unclicked.
 */
export type StudentTab = "briefing" | "levels" | "notes" | "guarantee" | "homework";

export function StudentView({
  studentId,
  tab: initial = "briefing",
  screen = "student",
}: {
  studentId?: string;
  tab?: StudentTab;
  screen?: ScreenId;
}) {
  const data = useTutorData();
  const selected = useSelectedStudent(data);
  const s = (studentId ? tutorStudentById(studentId) : null) ?? selected;
  const [tab, setTab] = useState<StudentTab>(data.locked ? "guarantee" : initial);
  const toast = useToast();
  const { covered } = useStore();
  const items = s ? briefingItems(s, missesFor(s.id)) : [];
  const complete =
    !!s && items.length > 0 && items.every((i) => (covered[s.id] ?? []).includes(i.id));
  const booking = s ? data.nextSession(s.id) : null;

  const primary = !s ? null : complete ? (
    <GlassButton variant="primary" onClick={() => goScreen("update", { id: s.id })}>
      Write the parent update
    </GlassButton>
  ) : booking ? (
    <GlassButton
      variant="primary"
      icon={<TIcon name="video" size={20} />}
      onClick={() =>
        toast.push({
          title: `The Zoom room opens at ${clock(booking.start, -5)} on ${dayDate(booking.date)}`,
          detail: "The link is also in your calendar.",
        })
      }
    >
      Join Zoom
    </GlassButton>
  ) : (
    <GlassButton
      variant="primary"
      onClick={() =>
        toast.push({
          title: `Reminder sent to ${s.name}`,
          detail: "Students book from the hours you open.",
          kind: "success",
        })
      }
    >
      Remind {s.name} to book
    </GlassButton>
  );

  return (
    <TutorShell screen={screen} title={s?.name ?? "Student"} primary={primary}>
      {({ phone }) =>
        s ? (
          <>
            <StudentHeader s={s} />
            <Tabs
              label="Student sections"
              className={cn("my-4", phone && "flex-wrap gap-x-3 gap-y-0")}
              value={tab}
              onChange={(id) => setTab(id as StudentTab)}
              tabs={[
                { id: "briefing", label: "Briefing", count: items.length || undefined },
                { id: "levels", label: "Levels" },
                { id: "notes", label: "Notes" },
                { id: "guarantee", label: "Guarantee" },
                { id: "homework", label: "Homework" },
              ]}
            />
            {tab === "briefing" ? (
              <Briefing s={s} data={data} />
            ) : tab === "levels" ? (
              <Levels s={s} />
            ) : tab === "notes" ? (
              <NotesTab s={s} />
            ) : tab === "guarantee" ? (
              <GuaranteeTab s={s} />
            ) : (
              <HomeworkTab s={s} />
            )}
          </>
        ) : (
          <Empty
            title="No students yet"
            detail="Students are assigned when a family enrolls or a cohort opens."
          />
        )
      }
    </TutorShell>
  );
}

export default function Student() {
  return <StudentView />;
}
