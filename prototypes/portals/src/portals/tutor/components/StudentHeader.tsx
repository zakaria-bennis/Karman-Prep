import { CountUp } from "@/design-system/components/CountUp";
import { PLANS } from "@/plans/plans";
import { daysUntil, fmtDate } from "@/mock";
import { Initials } from "./Initials";
import { cohortById, type TutorStudent } from "../mock";

/** Under a student screen's title: the plan from the config (a cohort student's own cohort), hours, the date, and the one predicted score counting up. Each fact wraps whole. */
export function StudentHeader({ s }: { s: TutorStudent }) {
  const days = daysUntil(s.satDate);
  const facts = [
    (s.cohort && cohortById(s.cohort)?.name) || PLANS[s.plan].name,
    s.hoursTotal ? `${s.hoursUsed} of ${s.hoursTotal} hours used` : null,
    `SAT ${fmtDate(s.satDate)}, in ${days} days`,
  ].filter(Boolean) as string[];
  return (
    <div className="flex items-start gap-3">
      <Initials initial={s.initials} hue={s.hue} size={40} className="mt-0.5" />
      <div className="min-w-0">
        <p className="flex flex-wrap gap-x-3 text-body text-muted">
          {facts.map((f) => (
            <span key={f} className="whitespace-nowrap">
              {f}
            </span>
          ))}
        </p>
        {s.predicted ? (
          <p className="tabular mt-1 flex flex-wrap items-baseline gap-x-3 text-dense">
            <span className="whitespace-nowrap">
              <span className="text-muted">Karman predicted score </span>
              <CountUp to={s.predicted} from={s.baseline ?? 0} className="text-kpi font-medium" />
            </span>
            <span className="whitespace-nowrap text-muted">
              target {s.target.toLocaleString("en-US")}
            </span>
            {s.baseline ? (
              <span className="whitespace-nowrap text-positive">
                +{s.predicted - s.baseline} since the baseline
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-dense text-muted">
            No score yet. The diagnostic or a full-length test gives the first Karman predicted
            score.
          </p>
        )}
      </div>
    </div>
  );
}
