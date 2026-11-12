// The time trial start screen: pick a section. Each row names the round, the time on the clock
// and the pace. Server-safe (no hooks), drawn inside the quiz-flow frame.
import Link from "next/link";
import { Card, Row, SectionHeader } from "@/components/portal";
import type { TrialStatus } from "@/lib/assembler/time-trial-run";
import { TIME_TRIAL } from "@/lib/student/quiz-routes";
import {
  TRIAL_MODULE,
  formatClock,
  formatMultiplier,
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
          round you hold your accuracy, the clock gets 5% tighter, down to 0.75.
        </p>
        <div>
          {status.map(({ section, standing, open, last }) => (
            <Row
              key={section}
              title={trialSectionTitle(section)}
              sub={`Round ${standing.round}: ${formatClock(trialSeconds(section, standing.multiplier))} for ${TRIAL_MODULE[section].questions} questions, ${formatMultiplier(standing.multiplier)} the SAT time${last ? `. Last round ${last.correct} of ${last.questions}` : ""}`}
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
