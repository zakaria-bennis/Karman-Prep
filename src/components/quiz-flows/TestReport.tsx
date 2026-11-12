"use client";
// The score report for a full-length practice test or the diagnostic: one predicted total and
// one number per section (never a range, never called official), then every question with the
// student's answer, the right answer and its written explanation.
import Link from "next/link";
import MathText from "@/components/learn/MathText";
import { Card, Cta, Num, SectionHeader } from "@/components/portal";
import type { RunView } from "@/lib/assembler/run-types";
import { AnswerShapes } from "./LevelBanner";
import { FlowFrame } from "./FlowFrame";
import { SkillsMoved, weakestSkill } from "./RunEnd";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

export function TestReport({
  user,
  run,
  exitHref,
}: {
  user: ShellUser;
  run: RunView;
  exitHref: string;
}) {
  const result = run.result!;
  const predicted = result.predicted;
  const next = weakestSkill(result.skills);
  return (
    <FlowFrame user={user} title={run.kind === "diagnostic" ? "Diagnostic" : run.title}>
      <Card>
        <section className={s.hero} aria-labelledby="report-title">
          <h2 className="kp-title" id="report-title">
            Your predicted score
          </h2>
          {predicted && (
            <>
              <p className={s.bigScore}>
                <Num big>{predicted.total}</Num>
              </p>
              <p className={s.split}>
                <span>
                  Reading and Writing <Num>{predicted.reading}</Num>
                </span>
                <span>
                  Math <Num>{predicted.math}</Num>
                </span>
              </p>
            </>
          )}
          <p className="kp-meta">
            Our estimate from this {run.kind === "diagnostic" ? "diagnostic" : "practice test"},
            built from Karman&rsquo;s question bank.
          </p>
          <div className={s.actions}>
            {next && (
              <Cta href={`/learn/set/${encodeURIComponent(next.skillId)}`}>
                Practice {next.label}
              </Cta>
            )}
            <Link className="kp-link" href={exitHref}>
              Done
            </Link>
          </div>
        </section>
      </Card>
      <Card>
        <SectionHeader title="Each section" />
        <ul className={s.sectionList}>
          {result.sections
            .filter((section) => section.total > 0)
            .map((section) => (
              <li key={section.key}>
                <span>{section.title}</span>
                <Num>
                  {section.right} of {section.total}
                </Num>
              </li>
            ))}
        </ul>
      </Card>
      <SkillsMoved skills={result.skills} title="Skills in this test" />
      <SectionReviews run={run} />
    </FlowFrame>
  );
}

/** Every question of each section, folded: the student's answer, the right one and the method. */
export function SectionReviews({ run }: { run: RunView }) {
  return (
    <>
      {run.sections
        .filter((section) => section.questions.length)
        .map((section) => (
          <Card key={section.key}>
            <details className={s.review}>
              <summary>
                <span>Review {section.title}</span>
                <AnswerShapes
                  answers={section.questions.map((q) => ({
                    id: q.id,
                    correct: !!run.reviews[q.id]?.isCorrect,
                  }))}
                />
              </summary>
              <ol className={s.reviewList}>
                {section.questions.map((q, i) => {
                  const review = run.reviews[q.id];
                  return (
                    <li key={q.id}>
                      <p className={s.reviewHead}>
                        Question <Num>{i + 1}</Num>
                        {section.topics[q.id] ? ` · ${section.topics[q.id]}` : ""} ·{" "}
                        {review?.isCorrect
                          ? "Right"
                          : review?.studentAnswer
                            ? "Missed"
                            : "Not answered"}
                      </p>
                      {q.passage && (
                        <MathText text={q.passage} className={`block ${s.reviewText}`} />
                      )}
                      <MathText text={q.question_text} className={`block ${s.reviewText}`} />
                      {review && (
                        <>
                          <p>
                            Your answer:{" "}
                            {review.studentAnswer ? (
                              <MathText text={review.studentAnswer} />
                            ) : (
                              "none"
                            )}
                          </p>
                          <p>
                            Right answer: <MathText text={review.correct_answer} />
                          </p>
                          {review.explanation_text && (
                            <MathText
                              text={review.explanation_text}
                              className={`block ${s.reviewText}`}
                            />
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </details>
          </Card>
        ))}
    </>
  );
}
