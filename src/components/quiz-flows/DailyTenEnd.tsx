"use client";
// The Daily 10 ending, "Box first" (approved round five, with the founder's reward layer): a new
// companion's moment when one joined, then the box (today's tokens fly to the balance, and a
// mystery box opens when the balance pays for one), then one calm column: the score, each
// section, the answers, the one next step, and the top three skills, with the student's companion
// peeking over the card. The painting's accent (no marigold), a squared box with no machine and no
// shadow. Tap or press any key to skip the box; reduced motion holds every moment still.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, Cta, Num } from "@/components/portal";
import { actionCompanionsSeen, actionRewardState } from "@/app/dashboard/student/rewards/actions";
import { CompanionMoment } from "@/components/rewards/CompanionMoment";
import { PeekStage } from "@/components/rewards/PeekStage";
import { STUDENT_ROUTES } from "@/components/student-portal/StudentPortal";
import { endingPhases, type EndingPhase, type RewardState } from "@/lib/rewards/economy";
import type { RunView } from "@/lib/assembler/run-types";
import { AnswerShapes, LevelChanges, type LevelChange } from "./LevelBanner";
import { DailyTenBox } from "./DailyTenBox";
import { FlowFrame } from "./FlowFrame";
import { ScoreRing, SkillsMoved, answersOf, weakestSkill } from "./RunEnd";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

export function DailyTenEnd({
  user,
  run,
  changes = [],
}: {
  user: ShellUser;
  run: RunView;
  changes?: readonly LevelChange[];
}) {
  const result = run.result!;
  // The student's rewards: undefined while loading, null when they could not be read.
  const [rewards, setRewards] = useState<RewardState | null | undefined>(undefined);
  const [phase, setPhase] = useState<EndingPhase | null>(null);
  const [joining, setJoining] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const fresh = useMemo(
    () => (rewards ? rewards.companions.filter((c) => !c.seen).map((c) => c.animal) : []),
    [rewards]
  );
  const phases = useMemo(
    () =>
      rewards === undefined
        ? []
        : endingPhases({ newCompanions: fresh.length, tokensToday: result.tokens }),
    [rewards, fresh, result.tokens]
  );

  useEffect(() => {
    let live = true;
    const give = window.setTimeout(
      () => live && setRewards((r) => (r === undefined ? null : r)),
      4000
    );
    actionRewardState()
      .then((r) => live && setRewards((old) => (old === undefined ? (r.ok ? r.value : null) : old)))
      .catch(() => live && setRewards((old) => (old === undefined ? null : old)));
    return () => {
      live = false;
      window.clearTimeout(give);
    };
  }, []);
  useEffect(() => {
    if (phase || !phases.length) return;
    setPhase(phases[0]);
    setBalance(rewards ? rewards.balance : null);
    // Each companion's moment plays once.
    if (fresh.length) void actionCompanionsSeen({ animals: fresh }).catch(() => undefined);
  }, [phase, phases, rewards, fresh]);
  const advance = (from: EndingPhase) => setPhase(phases[phases.indexOf(from) + 1] ?? "results");

  const next = weakestSkill(result.skills);
  const bySection = (subject: "reading" | "math") => {
    const answers = run.sections.flatMap((sec) =>
      sec.questions.filter((q) => q.subject === subject).map((q) => !!run.reviews[q.id]?.isCorrect)
    );
    return { right: answers.filter(Boolean).length, total: answers.length };
  };
  const rw = bySection("reading");
  const math = bySection("math");
  // The portal's practice streak; today counts once the Daily 10 is done.
  const streak = Math.max(user.streak, result.streak ?? 0);
  const animal = rewards?.wear.animal ?? "fox";

  if (phase === null || phase === "companion" || phase === "box")
    return (
      <FlowFrame user={{ ...user, streak }} title="Daily 10">
        <Card>
          {phase === "companion" && fresh[joining] ? (
            <CompanionMoment
              key={fresh[joining]}
              animal={fresh[joining]}
              more={joining + 1 < fresh.length}
              onDone={() =>
                joining + 1 < fresh.length ? setJoining((n) => n + 1) : advance("companion")
              }
            />
          ) : phase === "box" ? (
            <DailyTenBox
              tokens={result.tokens}
              balanceBefore={rewards ? Math.max(0, rewards.balance - result.tokens) : 0}
              balanceAfter={rewards ? rewards.balance : null}
              animal={animal}
              onDone={(b) => {
                if (b !== null) setBalance(b);
                advance("box");
              }}
            />
          ) : (
            <section className={s.message} aria-busy="true">
              <h2 className="kp-title">Your Daily 10 is done</h2>
            </section>
          )}
        </Card>
      </FlowFrame>
    );

  const hero = (
    <Card>
      <section className={s.hero} aria-labelledby="daily-done">
        <h2 className="kp-title" id="daily-done">
          Your Daily 10 is done
        </h2>
        <ScoreRing right={result.right} total={result.total} label="Daily 10" />
        <p className={s.split}>
          {rw.total > 0 && (
            <span>
              Reading and Writing{" "}
              <Num>
                {rw.right} of {rw.total}
              </Num>
            </span>
          )}
          {math.total > 0 && (
            <span>
              Math{" "}
              <Num>
                {math.right} of {math.total}
              </Num>
            </span>
          )}
        </p>
        <AnswerShapes answers={answersOf(run)} />
        <p className={s.facts}>
          {streak > 0 && (
            <span>
              <Num count>{streak}</Num> {streak === 1 ? "day" : "days"} in a row
            </span>
          )}
          {result.tokens > 0 && (
            <span>
              <Num count>+{result.tokens}</Num> tokens
            </span>
          )}
          {balance !== null && (
            <span>
              <Num count>{balance}</Num> {balance === 1 ? "token" : "tokens"} to spend
            </span>
          )}
        </p>
        <LevelChanges changes={changes} />
        <div className={s.actions}>
          {next && (
            <Cta href={`/learn/set/${encodeURIComponent(next.skillId)}`}>Practice {next.label}</Cta>
          )}
          <Link className="kp-link" href="/dashboard/student">
            Done
          </Link>
          {rewards && (
            <Link className="kp-link" href={STUDENT_ROUTES.rewards}>
              Rewards
            </Link>
          )}
        </div>
      </section>
    </Card>
  );
  return (
    <FlowFrame user={{ ...user, streak }} title="Daily 10">
      {rewards ? (
        <PeekStage animal={animal} perfect={result.total > 0 && result.right === result.total}>
          {hero}
        </PeekStage>
      ) : (
        hero
      )}
      <SkillsMoved skills={result.skills} />
    </FlowFrame>
  );
}
