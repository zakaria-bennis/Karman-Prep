import { Row, List } from "@/design-system/components/Row";
import { Empty } from "@/design-system/components/Empty";
import { daysUntil, fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { goScreen } from "../nav";
import { NEXT_CLASS, SPLIT_SCORE, hour, studentsOf, tutorName, type TutorCohort } from "../mock";
import { IN_PROGRESS } from "../mock-tests";
import { isSlipping } from "../mock-work";
import { Initials } from "../components/Initials";
import { useToast } from "@/design-system/components/Toast";
import { Block, Grid2, ListHead, dayDate, score } from "./common";

/**
 * Cohorts: grouped by test date, then split at a diagnostic score of 1250
 * once a date has enough students for two. Each cohort lists its students
 * with their diagnostic score (the column says so), so the split is visible
 * as numbers, not only as a rule (Tesler: the system groups, the tutor reads).
 */
export default function Cohorts() {
  const data = useTutorData();
  const toast = useToast();
  const dates = [...new Set(data.cohorts.map((c) => c.satDate))].sort();
  const running = data.cohorts.find((c) => NEXT_CLASS[c.id]);
  const splitDates = dates.filter((d) => data.cohorts.filter((c) => c.satDate === d).length > 1);
  const finding = !data.cohorts.length
    ? "No cohort yet. The admin assigns a tutor when a cohort opens."
    : `${data.cohorts.length} cohorts on ${dates.length} test dates.${running ? ` ${running.name}: class ${running.classesHeld + 1} is ${dayDate(NEXT_CLASS[running.id])}.` : ""}${splitDates.length ? ` ${fmtDate(splitDates[0], "long")} has enough students for two cohorts, split at ${SPLIT_SCORE}.` : ""} Each student's diagnostic score is at the right.`;
  const retry = () =>
    toast.push({
      title: "Still can't load the cohort",
      detail: "Last updated 9:14 am.",
      kind: "error",
    });

  const cohort = (c: TutorCohort) => {
    const students = studentsOf(c.id);
    const next = NEXT_CLASS[c.id];
    const test = IN_PROGRESS[c.id];
    const slipping = students.filter((s) => isSlipping(s.id)).length;
    return (
      <Block
        key={c.id}
        title={c.name}
        loading={data.loading}
        error={data.error}
        what="the cohort"
        onRetry={retry}
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
        <div className="px-4 pb-2">
          <p className="tabular pb-1 text-dense text-muted">
            {tutorName(c.tutor)} · {students.length} of {c.seats} seats
            {next
              ? ` · class ${c.classesHeld + 1} of ${c.classesTotal}, ${dayDate(next)}, ${hour(19)}`
              : ` · starts ${fmtDate(c.start)}`}
            {test ? ` · test ${test.number} today, ${hour(test.start)}` : ""}
            {slipping ? ` · ${slipping} slipping` : ""}
          </p>
          <List>
            <ListHead figure="Diagnostic" />
            {students.map((s) => (
              <Row
                key={s.id}
                title={s.scholarship ? `${s.name}, scholarship seat` : s.name}
                leading={<Initials initial={s.initials} hue={s.hue} size={24} />}
                trailing={score(s.baseline)}
                onPress={() => goScreen("student", { id: s.id })}
              />
            ))}
          </List>
        </div>
      </Block>
    );
  };

  return (
    <TutorShell screen="cohorts" title="Cohorts" finding={finding}>
      {!data.cohorts.length ? (
        <Empty
          title="No cohort yet"
          detail="The March cohort opens on Jan 4, 2027. The admin assigns its tutor when it is created."
        />
      ) : (
        <div className="grid gap-6">
          {dates.map((date) => {
            const list = data.cohorts.filter((c) => c.satDate === date);
            const total = list.reduce((a, c) => a + studentsOf(c.id).length, 0);
            return (
              <section key={date} className="grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h2 className="text-section">{fmtDate(date, "long")}</h2>
                  <p className="tabular text-dense text-muted">
                    in {daysUntil(date)} days ·{" "}
                    {list.length === 1
                      ? list[0].classesHeld > 0
                        ? `one cohort of ${total}, in session`
                        : `one cohort of ${total} until this date has enough students for two`
                      : `${total} students, split at a diagnostic score of ${SPLIT_SCORE}: ${list.map((c) => `${studentsOf(c.id).length} ${c.split === "under" ? "under" : "at or above"}`).join(", ")}`}
                  </p>
                </div>
                <Grid2>{list.map(cohort)}</Grid2>
              </section>
            );
          })}
        </div>
      )}
    </TutorShell>
  );
}
