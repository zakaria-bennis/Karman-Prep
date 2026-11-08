import { useState } from "react";
import { Row, List } from "@/design-system/components/Row";
import { Tabs } from "@/design-system/components/Tabs";
import { Empty } from "@/design-system/components/Empty";
import { fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { goScreen } from "../nav";
import { NEXT_CLASS, studentsOf, tutorName, type TutorStudent, hour } from "../mock";
import { IN_PROGRESS } from "../mock-tests";
import { isSlipping, requirementsFor, slipLabel } from "../mock-work";
import { Initials } from "../components/Initials";
import { useToast } from "@/design-system/components/Toast";
import { Block, Grid2, ListHead, dayDate, score, shortDay } from "./common";

/**
 * Students: every student with the one next thing per row and its date.
 * Private rows carry the next session; cohort rows carry only a state when
 * there is one (rule 51), since the cohort's next thing is written once in
 * its heading. Hick: four filters, no sort, no search at sixteen rows.
 */
export default function Students() {
  const data = useTutorData();
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const slipping = data.students.filter((s) => isSlipping(s.id));
  const retry = () =>
    toast.push({
      title: "Still can't load students",
      detail: "Last updated 9:14 am.",
      kind: "error",
    });
  const show = (s: TutorStudent) =>
    tab === "all" ||
    (tab === "private" && !s.cohort) ||
    (tab === "cohorts" && !!s.cohort) ||
    (tab === "slipping" && slipping.includes(s));
  const privates = data.privates.filter(show);
  const noBooking = data.privates.filter((s) => !data.nextSession(s.id));
  const finding = data.empty
    ? "No students yet. They are assigned when a family enrolls or a cohort opens."
    : data.firstDay
      ? `${data.students[0].name} was assigned this morning.`
      : `${data.students.length} students: ${data.privates.length} Private, ${data.cohortStudents.length} in cohorts.${noBooking.length ? ` ${noBooking.map((s) => s.name).join(", ")} ${noBooking.length === 1 ? "has" : "have"} no session booked.` : ""}${slipping.length ? ` ${slipping.map((s) => s.name).join(" and ")} ${slipping.length === 1 ? "is" : "are"} slipping on the guarantee.` : ""}`;

  // Phone rows drop "Session" and use the short weekday so the time is never cut off (rule 55).
  const row = (s: TutorStudent, phone: boolean) => {
    const day = phone ? shortDay : dayDate;
    const b = data.nextSession(s.id);
    const slip = slipping.includes(s) ? requirementsFor(s.id).find((r) => r.slipping) : null;
    const sub = slip
      ? { kind: "state" as const, text: slipLabel(slip), tone: "negative" as const }
      : s.cohort
        ? undefined
        : b
          ? {
              kind: "date" as const,
              text: `${phone ? "" : "Session "}${day(b.date)}, ${hour(b.start)}`,
            }
          : { kind: "state" as const, text: "No session booked", tone: "negative" as const };
    return (
      <Row
        key={s.id}
        title={s.scholarship ? `${s.name}, scholarship seat` : s.name}
        sub={sub}
        leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
        trailing={score(s.predicted)}
        onPress={() => goScreen("student", { id: s.id })}
      />
    );
  };

  return (
    <TutorShell screen="students" title="Students" finding={finding}>
      {({ phone }) => {
        const day = phone ? shortDay : dayDate;
        return (
          <>
            {data.students.length > 1 ? (
              <Tabs
                label="Filter students"
                className="mb-4"
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: "all", label: "All", count: data.students.length },
                  { id: "private", label: "Private", count: data.privates.length },
                  { id: "cohorts", label: "Cohorts", count: data.cohortStudents.length },
                  { id: "slipping", label: "Slipping", count: slipping.length },
                ]}
              />
            ) : null}
            {!data.students.length ? (
              <Empty
                title="No students yet"
                detail="Students are assigned when a family enrolls or a cohort opens. Open your hours in Cal.com so they can book."
              />
            ) : (
              <Grid2>
                {privates.length ? (
                  <Block
                    title="Private"
                    loading={data.loading}
                    error={data.error}
                    what="your students"
                    onRetry={retry}
                    padded={false}
                    aside={`${privates.length}`}
                  >
                    <div className="px-4 pb-1">
                      <List>
                        <ListHead figure="Predicted" />
                        {privates.map((s) => row(s, phone))}
                      </List>
                    </div>
                  </Block>
                ) : null}
                {data.cohorts.map((c) => {
                  const list = studentsOf(c.id).filter(show);
                  if (!list.length) return null;
                  const next = NEXT_CLASS[c.id];
                  const test = IN_PROGRESS[c.id];
                  return (
                    <Block
                      key={c.id}
                      title={c.name}
                      loading={data.loading}
                      padded={false}
                      aside={
                        <button
                          type="button"
                          onClick={() => goScreen("class", { id: c.id })}
                          className="min-h-tap font-semibold text-accent"
                        >
                          Class view
                        </button>
                      }
                    >
                      <div className="px-4 pb-1">
                        <p className="tabular pb-1 text-dense text-muted">
                          {tutorName(c.tutor)}
                          {test ? ` · Test ${test.number} today, ${hour(test.start)}` : ""}
                          {next
                            ? ` · Class ${day(next)}, ${hour(19)}`
                            : ` · Starts ${fmtDate(c.start)}`}
                        </p>
                        <List>
                          <ListHead figure="Predicted" />
                          {list.map((s) => row(s, phone))}
                        </List>
                      </div>
                    </Block>
                  );
                })}
              </Grid2>
            )}
          </>
        );
      }}
    </TutorShell>
  );
}
