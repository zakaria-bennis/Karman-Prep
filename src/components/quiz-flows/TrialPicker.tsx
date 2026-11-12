// The time trial start screen: pick a section. Each row names the round, the time on the clock
// and the pace. Server-safe (no hooks), drawn inside the quiz-flow frame.
import Link from "next/link";
import { Card, Row, SectionHeader } from "@/components/portal";
import type { TrialStatus } from "@/lib/assembler/time-trial-run";
import { TIME_TRIAL } from "@/lib/student/quiz-routes";
import {
  TRIAL_MODULE,
  accuracyBar,
  formatClock,
  formatMultiplier,
  formatPercent,
  trialSeconds,
  trialSectionTitle,
} from "@/lib/student/time-trial";
import s from "./flows.module.css";

export function TrialPicker({ status, exitHref }: { status: TrialStatus[]; exitHref: string }) {
  return (
    <Card>
      <section className={s.message} aria-labelledby="trial-pick">
        <SectionHeader title="Time trials" />
        <p className="kp-meta" id="trial-pick">
          One section against the clock. Round one gives you 1.25 times the real SAT time. Every
          round you keep your usual accuracy, the clock gets 5% tighter, down to 0.75. Your bar
          comes from your own untimed accuracy in that section, so going faster never costs you
          points.
        </p>
        <div>
          {status.map(({ section, start, open, last }) => (
            <Row
              key={section}
              title={trialSectionTitle(section)}
              sub={`Round ${start.round}: ${formatClock(trialSeconds(section, start.multiplier))} for ${TRIAL_MODULE[section].questions} questions, ${formatMultiplier(start.multiplier)} the SAT time. Keep at least ${formatPercent(accuracyBar(start.baseline))} right${last ? `. Last round ${last.correct} of ${last.questions}` : ""}`}
              href={`${TIME_TRIAL.path}?section=${section}`}
              right={open ? "Resume" : "Start"}
            />
          ))}
        </div>
        <div className={s.actions}>
          <Link className="kp-link" href={exitHref}>
            Back to the Library
          </Link>
        </div>
      </section>
    </Card>
  );
}
