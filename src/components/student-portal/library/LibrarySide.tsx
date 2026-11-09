/*
 * The Library box's second column (founder, 2026-11-07 and 2026-11-08): the practice modes, the
 * full-length tests and the skill levels key. Server-safe; the page passes the plan's numbers, and
 * the dev preview (/dev/library-intros) passes fixtures.
 */
import { Card, Legend, MoreLink, Num, Row, SectionHeader } from "@/components/portal";
import { SKILL_LEVELS } from "@/components/portal";
import { upgradeFor } from "@/lib/student/plan-gate";
import { CHALLENGE, ENDLESS, TIME_TRIAL, fullLengthTest } from "@/lib/student/quiz-routes";
import styles from "./library.module.css";

/** Four full-length forms (the assembler's limit across forms). */
const FORMS = [1, 2, 3, 4];

export default function LibrarySide({
  challengeAnswered,
  left,
  questionLimit,
  testLimit,
}: {
  /** How many of today's two Challenge questions are answered. */
  challengeAnswered: number;
  /** Free questions left on the plan, or null when unlimited. */
  left: number | null;
  questionLimit: number | null;
  /** Full-length tests the plan allows, or null when unlimited. */
  testLimit: number | null;
}) {
  return (
    <>
      <Card label="Practice">
        <SectionHeader title="Practice" />
        <Row
          title="Challenge question"
          sub={
            challengeAnswered >= 2
              ? "Both answered today. See how everyone did"
              : "Two hard questions today, the same for everyone"
          }
          href={CHALLENGE.path}
          right={challengeAnswered >= 2 ? "Done" : challengeAnswered === 1 ? "1 of 2" : "Start"}
        />
        <Row
          title="Endless mode"
          sub="Untimed, adapts as you go, with your mistake log"
          href={ENDLESS.path}
          right="Start"
        />
        {TIME_TRIAL.ready ? (
          <Row
            title="Time trials"
            sub="Shorter than a full test, at real SAT pace"
            href={TIME_TRIAL.path}
            right="Start"
          />
        ) : (
          <Row
            title="Time trials"
            sub="Shorter than a full test, at real SAT pace"
            right={<span className={styles.soon}>Not open yet</span>}
          />
        )}
        {left !== null && (
          <p className={styles.locked}>
            <Num>{left}</Num> of <Num>{questionLimit}</Num> free questions left.{" "}
          </p>
        )}
        {left !== null && (
          <MoreLink href={upgradeFor("question:new").href}>
            Keep practicing with {upgradeFor("question:new").plan}
          </MoreLink>
        )}
      </Card>
      <Card label="Full-length tests">
        <SectionHeader
          title="Full-length tests"
          note={testLimit !== null ? `${testLimit} free` : undefined}
        />
        {FORMS.map((n) => {
          const route = fullLengthTest(n);
          const locked = testLimit !== null && n > testLimit;
          return (
            <Row
              key={n}
              title={`Full-length test ${n}`}
              sub="98 questions, 2 hr 14 min"
              href={route.ready && !locked ? route.path : undefined}
              right={
                locked ? (
                  <span className={styles.soon}>
                    {upgradeFor("full-length-test:new").plan} plan
                  </span>
                ) : route.ready ? (
                  "Start"
                ) : (
                  <span className={styles.soon}>Not open yet</span>
                )
              }
            />
          );
        })}
        {testLimit !== null && (
          <MoreLink href={upgradeFor("full-length-test:new").href}>
            Every test comes with {upgradeFor("full-length-test:new").plan}
          </MoreLink>
        )}
      </Card>
      <Card label="Skill levels">
        <SectionHeader title="Skill levels" />
        <Legend
          items={[...SKILL_LEVELS].reverse().map((l) => ({
            label: l.name,
            color: l.color ?? "color-mix(in srgb, var(--ink) 14%, transparent)",
          }))}
        />
        <p className="kp-meta">
          A run of right answers in a row moves a skill up: <Num>3</Num> to Learning, <Num>4</Num>{" "}
          to Understanding, <Num>5</Num> to Conquered. Answers with a hint don&rsquo;t count toward
          the run.
        </p>
      </Card>
    </>
  );
}
