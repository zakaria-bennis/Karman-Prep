import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { StudentShell, withStudent } from "./Shell";
import { PlanLocked } from "./PlanSheet";
import { Cohort } from "./ClassesCohort";
import { Private, Workshops } from "./ClassesPrivate";
import { GuaranteeBlock, TestsBlock } from "./ClassesParts";
import { OFFICE_HOURS } from "./mock-schedule";
import { useStudentView } from "./view";
import { retry } from "./nav";

/*
 * Classes and sessions, by plan: the cohort's schedule, homework with due
 * dates, tests, chat and guarantee status (ClassesCohort); the private
 * student's 1:1 sessions with self-booking, and Plus's workshops and office
 * hours (ClassesPrivate). On plans without any of these, one locked panel
 * shows what the next plan up adds, with one upgrade action.
 */
function Classes() {
  const v = useStudentView();
  const kind = v.has("liveClasses")
    ? "cohort"
    : v.has("oneToOne")
      ? "private"
      : v.has("workshops")
        ? "workshops"
        : "none";
  const title =
    kind === "cohort"
      ? "Classes"
      : kind === "private"
        ? "Sessions"
        : kind === "workshops"
          ? "Workshops"
          : "Classes and sessions";
  return (
    <StudentShell screen="classes" title={title}>
      {v.loading ? (
        <Panel className="grid gap-3 p-4">
          <Skeleton.Text lines={2} />
          <Skeleton.Block height={44} width={220} className="rounded-pill" />
          <Skeleton.Block height={240} />
        </Panel>
      ) : v.error ? (
        // The schedule failed; the tests and the guarantee keep their last good data.
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <Panel className="p-4">
            <ErrorBlock what="your schedule" lastGood="9:14" onRetry={retry} />
          </Panel>
          <div className="grid gap-5">
            {v.tests.length ? <TestsBlock v={v} /> : null}
            <GuaranteeBlock v={v} />
          </div>
        </div>
      ) : v.quiet && kind !== "none" ? (
        <Panel className="p-4">
          <Empty
            title="Nothing scheduled yet"
            detail={
              kind === "private"
                ? "Your tutor is assigned after the diagnostic. Then you book the first session here."
                : "Your schedule fills in once the program starts."
            }
          />
        </Panel>
      ) : kind === "cohort" ? (
        <Cohort v={v} />
      ) : kind === "private" ? (
        <Private v={v} />
      ) : kind === "workshops" ? (
        <Workshops v={v} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <PlanLocked bundle="workshops">
            <Panel className="grid gap-3 p-4">
              <p className="text-body">
                Office hours every {OFFICE_HOURS.day}, {OFFICE_HOURS.time}, and a recorded workshop
                each month.
              </p>
            </Panel>
          </PlanLocked>
          {v.has("fullLength") && v.tests.length ? <TestsBlock v={v} /> : null}
        </div>
      )}
    </StudentShell>
  );
}

export default withStudent(Classes);
