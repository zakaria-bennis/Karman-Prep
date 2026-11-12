"use client";
// Result screens in the painting style, one per kind of run. Tokens show only here.
import Link from "next/link";
import { useState } from "react";
import { Card, Cta, Num, Ring, SectionHeader, SkillSquares, levelName } from "@/components/portal";
import type { RunView, SkillMove } from "@/lib/assembler/run-types";
import { AnswerShapes, LevelBanner, LevelChanges, type LevelChange } from "./LevelBanner";
import { DailyTenEnd } from "./DailyTenEnd";
import { FlowFrame } from "./FlowFrame";
import { TestReport } from "./TestReport";
import { TrialEnd } from "./TrialEnd";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

export function answersOf(run: RunView) {
  return run.sections.flatMap((section) =>
    section.questions.map((q) => ({ id: q.id, correct: !!run.reviews[q.id]?.isCorrect }))
  );
}

/** The skill to practise next: the lowest level touched, then the most missed. */
export function weakestSkill(skills: readonly SkillMove[]): SkillMove | null {
  return (
    [...skills].sort(
      (a, b) =>
        a.to - b.to || a.right / a.total - b.right / b.total || a.label.localeCompare(b.label)
    )[0] ?? null
  );
}

/** Top three skills with their level squares; "See all" opens the rest in place. */
export function SkillsMoved({
  skills,
  title = "Skills that moved",
}: {
  skills: SkillMove[];
  title?: string;
}) {
  const [all, setAll] = useState(false);
  if (!skills.length) return null;
  const shown = all ? skills : skills.slice(0, 3);
  return (
    <Card>
      <SectionHeader title={title} note={`${skills.length}`} />
      <ul className={s.skillList}>
        {shown.map((skill) => (
          <li key={skill.skillId}>
            <SkillSquares
              skills={[{ level: skill.to, name: skill.label }]}
              label={`${skill.label}: ${levelName(skill.to)}`}
            />
            <span className={s.skillName}>{skill.label}</span>
            <span className={s.skillLevel}>
              {skill.to > skill.from && skill.to >= 2
                ? `Up to ${levelName(skill.to)}`
                : levelName(skill.to)}
            </span>
          </li>
        ))}
      </ul>
      {skills.length > 3 && (
        <button
          type="button"
          className={`kp-link ${s.textButton}`}
          onClick={() => setAll(!all)}
          aria-expanded={all}
        >
          {all ? "Show the top three" : `See all ${skills.length}`}
        </button>
      )}
    </Card>
  );
}

export function ScoreRing({
  right,
  total,
  label,
}: {
  right: number;
  total: number;
  label: string;
}) {
  return (
    <Ring
      value={total ? right / total : 0}
      size={148}
      width={12}
      label={`${label}: ${right} of ${total}`}
    >
      <span className={s.ringText}>
        <Num big>{right}</Num>
        <span className="kp-meta">of {total}</span>
      </span>
    </Ring>
  );
}

export function RunEnd({
  user,
  run,
  exitHref,
  lessonHref,
  againHref,
  changes = [],
}: {
  user: ShellUser;
  run: RunView;
  exitHref: string;
  lessonHref?: string | null;
  againHref?: string;
  /** Level changes collected during the run (not shown mid-run outside practice sets). */
  changes?: readonly LevelChange[];
}) {
  const result = run.result;
  if (!result) return null;
  if (run.kind === "daily-ten") return <DailyTenEnd user={user} run={run} changes={changes} />;
  if (run.kind === "full-test" || run.kind === "diagnostic")
    return <TestReport user={user} run={run} exitHref={exitHref} />;
  if (run.kind === "time-trial")
    return <TrialEnd user={user} run={run} exitHref={exitHref} nextHref={againHref ?? exitHref} />;
  const next = weakestSkill(result.skills);
  const set = run.kind === "practice-set" ? result.skills[0] : null;
  const leveled = set ? set.to > set.from && set.to >= 2 : result.skills.some((k) => k.to > k.from);
  return (
    <FlowFrame user={user} title={run.kind === "practice-set" ? run.title : run.title}>
      <Card>
        <section className={s.hero} aria-labelledby="run-done">
          <h2 className="kp-title" id="run-done">
            {run.kind === "practice-set" ? "Set complete" : "Quiz complete"}
          </h2>
          <ScoreRing right={result.right} total={result.total} label="Right answers" />
          <AnswerShapes answers={answersOf(run)} />
          {result.tokens > 0 && (
            <p className={s.tokens}>
              <Num>+{result.tokens}</Num> tokens
            </p>
          )}
          {set && leveled && (
            <LevelBanner change={{ skill: set.label, from: set.from, to: set.to }} />
          )}
          {!set && <LevelChanges changes={changes} />}
          <div className={s.actions}>
            {run.kind === "practice-set" && !leveled ? (
              <>
                <Cta href={lessonHref ?? exitHref}>Read the lesson</Cta>
                <Link className="kp-link" href={againHref ?? exitHref}>
                  Try again
                </Link>
              </>
            ) : run.kind === "practice-set" ? (
              <>
                <Cta href={againHref ?? exitHref}>Practice another set</Cta>
                <Link className="kp-link" href={exitHref}>
                  Done
                </Link>
              </>
            ) : (
              <>
                {next ? (
                  <Cta href={`/learn/set/${encodeURIComponent(next.skillId)}`}>
                    Practice {next.label}
                  </Cta>
                ) : null}
                <Link className="kp-link" href={exitHref}>
                  Done
                </Link>
              </>
            )}
          </div>
        </section>
      </Card>
      <SkillsMoved
        skills={result.skills}
        title={run.kind === "practice-set" ? "Skill" : "Skills in this quiz"}
      />
    </FlowFrame>
  );
}
