/* One line on what the student's plan includes (founder ladder, 2026-11-08). */
import { Num } from "@/components/portal";
import type { StudentPlanId } from "@/lib/student/plan-gate";

export default function PlanSummary({ planId }: { planId: StudentPlanId }) {
  switch (planId) {
    case "free":
      return (
        <>
          <Num>100</Num> questions in total and one full-length test, with written explanations.
        </>
      );
    case "practice":
    case "school":
      return <>The core question pool, with written explanations.</>;
    case "pro":
    case "tutor-affiliate":
      return <>Every question, including the hard mastery pool, with written explanations.</>;
    case "cohort":
      return <>Every question, plus your cohort&rsquo;s live sessions.</>;
    case "private-10":
      return (
        <>
          Every question, plus <Num>10</Num> hours of 1:1 tutoring.
        </>
      );
    case "private-20":
      return (
        <>
          Every question, plus <Num>20</Num> hours of 1:1 tutoring.
        </>
      );
  }
}
