"use client";
// The Daily 10 ending, "Box first" (approved round five): the box opens and the tokens come out,
// then one calm column: the score, each section, the answers, the one next step, and the top
// three skills. Round-one sounds, the painting's accent (no marigold), a squared box with no
// machine and no shadow. Tap or press any key to skip; reduced motion skips straight to results.
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Card, Cta, Num } from "@/components/portal";
import { prefersStill } from "@/lib/painting/motion";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import type { RunView } from "@/lib/assembler/run-types";
import { AnswerShapes, LevelChanges, type LevelChange } from "./LevelBanner";
import { FlowFrame } from "./FlowFrame";
import { ScoreRing, SkillsMoved, answersOf, weakestSkill } from "./RunEnd";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

/** Where each token is thrown: how far sideways, and how high it flies before it falls. */
const TOSSES = [
  { dx: -58, dy: -74 },
  { dx: -26, dy: -96 },
  { dx: 6, dy: -104 },
  { dx: 34, dy: -90 },
  { dx: 62, dy: -70 },
];

function Box({ tokens, onDone }: { tokens: number; onDone(): void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // The device's reduced motion or the portal's own Reduce motion: straight to the results.
    if (prefersStill()) return onDone();
    // The box lands, shivers as if something is pushing from inside, then bursts open.
    const openAt = window.setTimeout(() => {
      setOpen(true);
      playRewardSound("levelUp");
    }, 1100);
    const doneAt = window.setTimeout(onDone, 3400);
    const skip = () => onDone();
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(openAt);
      window.clearTimeout(doneAt);
      window.removeEventListener("keydown", skip);
    };
  }, [onDone]);
  return (
    <button type="button" className={s.boxStage} onClick={onDone} aria-label="Skip to your results">
      <svg viewBox="0 0 160 150" className={s.box} data-open={open} aria-hidden="true">
        <g className={s.tokensOut}>
          {/* Each token is thrown out of the box on its own arc: sideways at a steady speed
              (the outer group), up and then falling back under gravity (the inner one). */}
          {TOSSES.map((t, i) => (
            <g
              key={i}
              className={s.tokenX}
              style={{ "--dx": `${t.dx}px`, animationDelay: `${i * 55}ms` } as CSSProperties}
            >
              <g
                className={s.tokenY}
                style={{ "--dy": `${t.dy}px`, animationDelay: `${i * 55}ms` } as CSSProperties}
              >
                <circle cx="80" cy="74" r="7" className={s.token} />
                <path d="M77 74h6" className={s.tokenMark} />
              </g>
            </g>
          ))}
        </g>
        <rect x="28" y="70" width="104" height="70" rx="4" className={s.boxBody} />
        <path d="M80 70v70" className={s.boxRibbon} />
        <g className={s.boxLid}>
          <rect x="22" y="56" width="116" height="18" rx="4" className={s.boxLidFill} />
          <path d="M80 56v18" className={s.boxRibbon} />
        </g>
      </svg>
      <p className={s.boxText} aria-live="polite">
        {open ? (
          <>
            You earned <Num count>{tokens}</Num> tokens
          </>
        ) : (
          "Your Daily 10 box"
        )}
      </p>
    </button>
  );
}

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
  const [stage, setStage] = useState<"box" | "results">(result.tokens > 0 ? "box" : "results");
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
  if (stage === "box")
    return (
      <FlowFrame user={{ ...user, streak }} title="Daily 10">
        <Card>
          <Box tokens={result.tokens} onDone={() => setStage("results")} />
        </Card>
      </FlowFrame>
    );
  return (
    <FlowFrame user={{ ...user, streak }} title="Daily 10">
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
          </p>
          <LevelChanges changes={changes} />
          <div className={s.actions}>
            {next && (
              <Cta href={`/learn/set/${encodeURIComponent(next.skillId)}`}>
                Practice {next.label}
              </Cta>
            )}
            <Link className="kp-link" href="/dashboard/student">
              Done
            </Link>
          </div>
        </section>
      </Card>
      <SkillsMoved skills={result.skills} />
    </FlowFrame>
  );
}
