"use client";
// The time trial's result: right answers, accuracy, time used, this round's pace and the next
// round's, and one main action, "Next round". The questions fold below, as on the test report.
import Link from "next/link";
import { Card, Cta, Num } from "@/components/portal";
import type { RunView } from "@/lib/assembler/run-types";
import {
  formatClock,
  formatMultiplier,
  formatPercent,
  trialSectionTitle,
  type TrialRoundResult,
} from "@/lib/student/time-trial";
import { AnswerShapes } from "./LevelBanner";
import { FlowFrame } from "./FlowFrame";
import { ScoreRing, answersOf } from "./RunEnd";
import { SectionReviews } from "./TestReport";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

const percent = formatPercent;

/** Plain sentences: the bar, where it came from, and why the next pace is what it is. */
export function trialVerdict(trial: TrialRoundResult): string {
  const bar = percent(trial.bar);
  const source =
    trial.baseline.basis === "history"
      ? `your untimed accuracy is ${percent(trial.baseline.accuracy)}`
      : "that's our starting bar until we know your untimed accuracy";
  const why = `Your bar was ${bar} (${source}).`;
  if (trial.held && trial.nextMultiplier < trial.multiplier)
    return `${why} You kept it, so the clock gets 5% tighter next round.`;
  if (trial.held) return `${why} You kept it at the fastest pace. Keep it there.`;
  return `${why} Next round stays at this pace until you get ${bar} or more right.`;
}

export function TrialEnd({
  user,
  run,
  exitHref,
  nextHref,
}: {
  user: ShellUser;
  run: RunView;
  exitHref: string;
  nextHref: string;
}) {
  const result = run.result!;
  const trial = result.trial;
  return (
    <FlowFrame user={user} title="Time trial">
      <Card>
        <section className={s.hero} aria-labelledby="trial-done">
          <h2 className="kp-title" id="trial-done">
            {trial?.timeUp ? "Time is up" : trial ? `Round ${trial.round} done` : "Time trial done"}
          </h2>
          {trial && <p className="kp-meta">{trialSectionTitle(trial.section)}</p>}
          <ScoreRing right={result.right} total={result.total} label="Right answers" />
          <AnswerShapes answers={answersOf(run)} />
          {trial && (
            <>
              <p className={s.facts}>
                <span>
                  Accuracy <Num>{percent(trial.accuracy)}</Num>
                </span>
                <span>
                  Your bar <Num>{percent(trial.bar)}</Num>
                </span>
                <span>
                  Time used <Num>{formatClock(trial.elapsedSeconds)}</Num> of{" "}
                  <Num>{formatClock(trial.limitSeconds)}</Num>
                </span>
              </p>
              <p className={s.facts}>
                <span>
                  This round <Num>{formatMultiplier(trial.multiplier)}</Num>
                </span>
                <span>
                  Next round <Num>{formatMultiplier(trial.nextMultiplier)}</Num>
                </span>
              </p>
              <p className="kp-meta">
                {trialVerdict(trial)} The pace is a multiple of the real SAT time.
              </p>
            </>
          )}
          {result.tokens > 0 && (
            <p className={s.tokens}>
              <Num>+{result.tokens}</Num> tokens
            </p>
          )}
          <div className={s.actions}>
            <Cta href={nextHref}>Next round</Cta>
            <Link className="kp-link" href={exitHref}>
              Done
            </Link>
          </div>
        </section>
      </Card>
      <SectionReviews run={run} />
    </FlowFrame>
  );
}
