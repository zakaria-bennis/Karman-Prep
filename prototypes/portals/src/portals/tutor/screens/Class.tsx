import { useEffect, useRef } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Panel } from "@/design-system/glass/Panel";
import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { useConfetti } from "@/design-system/components/Confetti";
import { useToast } from "@/design-system/components/Toast";
import { fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useSelectedCohort, useTutorData } from "../data";
import { goScreen } from "../nav";
import { NEXT_CLASS, cohortById, studentsOf, tutorName } from "../mock";
import { CLASS_MINUTES, IN_PROGRESS, LATEST, classFocus } from "../mock-tests";
import { isSlipping, requirementsFor, slipLabel } from "../mock-work";
import { toggleCovered, useStore } from "../store";
import { TIcon } from "../icons";
import { CheckItem, ChecklistHead } from "../components/Checklist";
import { SkillMatrix } from "../components/Matrix";
import { Initials } from "../components/Initials";
import { LevelLegend } from "./StudentTabs";
import { Block, Columns, ListHead, clock, dayDate, score } from "./common";

/**
 * The class view: the next class for a cohort. The skills most of the group
 * missed on the last full-length lead the 90-minute plan (the checklist the
 * tutor runs in class), the matrix shows each student's level on them, and
 * the students follow with their flags. Exported through shared.ts.
 */
export function ClassView({ cohortId }: { cohortId?: string }) {
  const data = useTutorData();
  const selected = useSelectedCohort(data);
  const cohort = (cohortId ? cohortById(cohortId) : null) ?? selected;
  const toast = useToast();
  const confetti = useConfetti();
  const head = useRef<HTMLDivElement>(null);
  const { covered: all } = useStore();
  const students = cohort ? studentsOf(cohort.id) : [];
  const focus = cohort ? classFocus(cohort.id) : [];
  const top = focus.slice(0, CLASS_MINUTES.skills.length);
  const testNumber = students[0] ? LATEST[students[0].id]?.number : undefined;
  const items =
    cohort && top.length
      ? [
          ...top.map((f, i) => ({
            id: f.skill.id,
            label: f.skill.label,
            detail: `${CLASS_MINUTES.skills[i]} min · ${f.missedBy.length} of ${students.length} missed it on test ${testNumber}`,
          })),
          {
            id: "practice",
            label: "Practice, each student at their own difficulty",
            detail: `${CLASS_MINUTES.practice} min`,
          },
          {
            id: "close",
            label: "Close: homework and Saturday's test",
            detail: `${CLASS_MINUTES.close} min`,
          },
        ]
      : [];
  const covered = cohort ? (all[cohort.id] ?? []) : [];
  const done = items.filter((i) => covered.includes(i.id)).length;
  const complete = items.length > 0 && done === items.length;
  const was = useRef(complete);
  useEffect(() => {
    if (complete && !was.current && head.current) confetti.fire("level", head.current);
    was.current = complete;
  }, [complete, confetti]);
  const next = cohort ? NEXT_CLASS[cohort.id] : undefined;
  const running = cohort ? IN_PROGRESS[cohort.id] : undefined;
  const start = cohort ? 19 : 0;

  const finding = cohort
    ? `${tutorName(cohort.tutor)} · ${students.length} students · class ${cohort.classesHeld + 1} of ${cohort.classesTotal}${next ? `, ${dayDate(next)}, ${cohort.classTime}` : `, starts ${fmtDate(cohort.start)}`}.${running ? ` Test ${running.number} runs at ${clock(running.start)} today; the plan refreshes when it is scored.` : ""}`
    : data.empty || data.firstDay
      ? "No cohort yet. The admin assigns a tutor when a cohort opens."
      : undefined;
  const primary =
    !cohort || !next ? null : complete ? (
      <GlassButton variant="primary" onClick={() => goScreen("update", { id: cohort.id })}>
        Write the parent update
      </GlassButton>
    ) : (
      <GlassButton
        variant="primary"
        icon={<TIcon name="video" size={20} />}
        onClick={() =>
          toast.push({
            title: `The Zoom room opens at ${clock(start, -5)} on ${dayDate(next)}`,
            detail: "The link is also in your calendar.",
          })
        }
      >
        Join Zoom
      </GlassButton>
    );

  return (
    <TutorShell screen="class" title={cohort?.name ?? "Class"} finding={finding} primary={primary}>
      {!cohort ? (
        <Empty
          title="No cohort yet"
          detail="Cohorts open on a Monday 61 days before their SAT date. The admin assigns a tutor when one is created."
        />
      ) : (
        <Columns
          main={
            <>
              <Block
                title={next ? `Plan for ${dayDate(next)}` : "Plan"}
                loading={data.loading}
                error={data.error}
                what="the class plan"
                onRetry={() =>
                  toast.push({
                    title: "Still can't load the plan",
                    detail: "Last updated 9:14 am.",
                    kind: "error",
                  })
                }
              >
                {items.length ? (
                  <div ref={head} className="grid gap-1">
                    <ChecklistHead
                      title="90 minutes, the skills most of the group missed first"
                      done={done}
                      total={items.length}
                    />
                    <div className="mt-1 divide-y divide-line">
                      {items.map((it) => (
                        <CheckItem
                          key={it.id}
                          id={it.id}
                          checked={covered.includes(it.id)}
                          onToggle={() => toggleCovered(cohort.id, it.id)}
                          label={it.label}
                          detail={it.detail}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty
                    title="No full-length test yet"
                    detail={`The plan fills in after the cohort's first full-length test, in the first week from ${fmtDate(cohort.start)}.`}
                  />
                )}
              </Block>
              {focus.length ? (
                <Block
                  title={`Who missed what on test ${testNumber}`}
                  loading={data.loading}
                  aside={<LevelLegend />}
                >
                  <SkillMatrix rows={focus.slice(0, 6)} students={students} className="mt-1" />
                </Block>
              ) : null}
            </>
          }
          side={
            <>
              <Panel className="px-4 py-3">
                <h2 className="text-section">Next class</h2>
                {next ? (
                  <p className="tabular mt-1 text-body">
                    {dayDate(next)}, {cohort.classTime}
                    <span className="text-muted"> · Zoom opens {clock(start, -5)}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-body">Starts {fmtDate(cohort.start)}.</p>
                )}
                <p className="text-dense text-muted">
                  {cohort.classesHeld} of {cohort.classesTotal} classes held · SAT{" "}
                  {fmtDate(cohort.satDate)} · {cohort.seats} seats, {cohort.scholarship} scholarship
                </p>
              </Panel>
              <Block
                title="Students"
                loading={data.loading}
                padded={false}
                aside={`${students.length}`}
              >
                <div className="px-4 pb-1">
                  <List>
                    <ListHead figure="Predicted" />
                    {students.map((s) => {
                      const slip = isSlipping(s.id)
                        ? requirementsFor(s.id).find((r) => r.slipping)
                        : null;
                      return (
                        <Row
                          key={s.id}
                          title={s.scholarship ? `${s.name}, scholarship seat` : s.name}
                          sub={
                            slip
                              ? { kind: "state", text: slipLabel(slip), tone: "negative" }
                              : undefined
                          }
                          leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                          trailing={score(s.predicted)}
                          onPress={() => goScreen("student", { id: s.id })}
                        />
                      );
                    })}
                  </List>
                </div>
              </Block>
            </>
          }
        />
      )}
    </TutorShell>
  );
}

export default function Class() {
  return <ClassView />;
}
