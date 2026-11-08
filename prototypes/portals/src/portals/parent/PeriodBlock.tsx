import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { fmtDate } from "@/mock";
import { Figures, type Figure } from "./Figures";
import type { Period } from "./mock-period";

/*
 * PeriodBlock: what the plan has bought since the last charge (or since
 * joining): the practice done in that span as figures, type not tiles, so
 * the Plan screen answers "where does my money go" with the work itself.
 * Figures are computed from the same updates the Progress screen reads.
 * Attendance is never a figure here (rule 57): a missed class is a flag on
 * the week it happened, and the guarantee block keeps its own count.
 */
export function PeriodBlock({
  period,
  loading,
  wide,
  className,
}: {
  period: Period;
  loading: boolean;
  wide: boolean;
  className?: string;
}) {
  const bar = (w: number, h: number) => <Skeleton.Block width={w} height={h} />;
  const n = (v: number) => (loading ? bar(40, 24) : v.toLocaleString("en-US"));
  const items: Figure[] = [
    { label: "Questions answered", value: loading ? bar(88, 36) : n(period.questions), lead: true },
    { label: "Days practised", value: n(period.days) },
  ];
  if (period.daily10 !== null) items.push({ label: "Your Daily 10", value: n(period.daily10) });
  items.push({ label: "Full-length tests", value: n(period.tests) });
  if (period.sessions !== null)
    items.push({ label: "Full-length review sessions", value: n(period.sessions) });
  return (
    <Panel as="section" className={className}>
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3 text-section">
        {period.from === "charge" ? "Since the last charge" : "Since joining"}
        <span className="text-dense font-normal text-muted">{fmtDate(period.since, "long")}</span>
      </h2>
      <Figures items={items} wide={wide} bare className="mt-1" />
    </Panel>
  );
}
