import { useState } from "react";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Panel } from "@/design-system/glass/Panel";
import { WeekCalendar } from "@/design-system/components/Calendar";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { TODAY_INDEX } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { weekDates } from "../mock";

/**
 * Schedule: the week as a calendar (the design system's Calendar component):
 * 1:1 sessions, the cohort's classes with David named, the two Saturday
 * tests and the weekly live session. Jakob: a week view people already know;
 * This week and Next week as one segmented control.
 */
export default function Schedule() {
  const data = useTutorData();
  const toast = useToast();
  const [week, setWeek] = useState<"this" | "next">("this");
  const w = data.weeks[week];
  const count = (k: string) => w.events.filter((e) => e.kind === k).length;
  const finding = data.empty
    ? "Nothing scheduled. Sessions appear here when students book them."
    : `${week === "this" ? "This week" : "Next week"}: ${count("session")} sessions, ${count("class")} classes, ${count("test")} tests, ${count("workshop")} live session. Classes are David's; the live session is yours.`;
  return (
    <TutorShell screen="schedule" title="Schedule" finding={finding}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <GlassSegmented
          label="Week"
          options={[
            { value: "this", label: "This week" },
            { value: "next", label: "Next week" },
          ]}
          value={week}
          onChange={(v) => setWeek(v as "this" | "next")}
        />
        <button
          type="button"
          onClick={() => toast.push({ title: "Cal.com opens in a new tab in the app" })}
          className="min-h-tap text-dense font-semibold text-accent"
        >
          Open hours in Cal.com
        </button>
      </div>
      <Panel className="px-4 py-3">
        {data.loading ? (
          <div role="status" aria-busy="true" aria-label="Loading the week" className="grid gap-3">
            <Skeleton.Text lines={1} width="40%" />
            <Skeleton.Block height={320} />
          </div>
        ) : data.error ? (
          <ErrorBlock
            what="the week"
            lastGood="9:14 am"
            onRetry={() =>
              toast.push({
                title: "Still can't load the week",
                detail: "Last updated 9:14 am.",
                kind: "error",
              })
            }
          />
        ) : (
          <WeekCalendar
            events={w.events}
            dates={weekDates(w.start)}
            today={week === "this" ? TODAY_INDEX : -1}
            from={8}
            to={21}
          />
        )}
      </Panel>
    </TutorShell>
  );
}
