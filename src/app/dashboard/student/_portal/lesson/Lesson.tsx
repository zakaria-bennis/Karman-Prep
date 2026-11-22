"use client";

// One skill's written lesson (src/lib/lessons): what the skill tests and how to spot it, the idea with
// its picture, the strategy, worked examples shown step by step, the traps, the calculator or reading
// tip, a quick check, and at the end the strategy quiz (founder, 2026-11-20: "the strategy quiz
// actually lives at the end of the lesson"). Headings are one or two words (founder, 2026-11-16).
import Link from "next/link";
import type { SkillLessonData } from "@/lib/lessons";
import { strategyQuiz } from "@/lib/student/quiz-routes";
import { Icon, Tile } from "../practice";
import { Choices } from "./Choices";
import { Example } from "./Example";
import { Figure } from "./figures/Figure";
import { LessonText } from "./LessonText";
import styles from "./lesson.module.css";

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function Sign() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 3.5l9 15.5H3z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 16.8v.2" />
    </svg>
  );
}

export function Lesson({ lesson }: { lesson: SkillLessonData }) {
  const math = lesson.skill.section === "Math";
  const tip = lesson.tip;
  return (
    <article className={styles.lesson} aria-label={`Lesson: ${lesson.skill.name}`}>
      <section>
        <p className={styles.lede}>
          <LessonText text={lesson.tests} />
        </p>
        <p className={styles.spot}>
          <Eye />
          <span>
            <b>Spot it:</b>
            <LessonText text={lesson.spot} />
          </span>
        </p>
      </section>

      <section className={styles.idea}>
        <div className={styles.ideaText}>
          <h3>The idea</h3>
          {lesson.idea.map((p, i) => (
            <LessonText key={i} text={p} as="p" />
          ))}
          {lesson.rules && (
            <p className={styles.rules}>
              {lesson.rules.map((r, i) => (
                <span key={i}>
                  <LessonText text={r} display />
                </span>
              ))}
            </p>
          )}
        </div>
        <Figure fig={lesson.figure} className={styles.figure} />
      </section>

      <section>
        <h3>Strategy</h3>
        <p className={styles.strategyName}>{lesson.strategy.name}</p>
        <ol className={styles.strategySteps}>
          {lesson.strategy.steps.map((step, i) => (
            <li key={i}>
              <LessonText text={step} />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3>Examples</h3>
        {lesson.examples.map((ex, i) => (
          <Example key={i} ex={ex} n={i + 1} />
        ))}
      </section>

      <section>
        <h3>Traps</h3>
        <ul className={styles.traps}>
          {lesson.traps.map((t) => (
            <li key={t.name}>
              <Sign />
              <span>
                <b>{t.name}</b>
                <LessonText text={t.text} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.piece}>
        <div className={styles.pieceHead}>
          <small>{math ? "Calculator tip" : "Reading tip"}</small>
          <b>{tip.title}</b>
        </div>
        <ol className={styles.strategySteps}>
          {tip.steps.map((step, i) => (
            <li key={i}>
              <LessonText text={step} />
            </li>
          ))}
        </ol>
        {tip.type && tip.type.length > 0 && (
          <ol className={styles.keys} aria-label="What to type">
            {tip.type.map((line, i) => (
              <li key={i}>
                <code>{line}</code>
              </li>
            ))}
          </ol>
        )}
        {tip.note && (
          <p className={styles.note}>
            <LessonText text={tip.note} />
          </p>
        )}
      </section>

      <section className={styles.piece}>
        <div className={styles.pieceHead}>
          <small>Quick check</small>
        </div>
        {lesson.check.passage && (
          <div className={styles.passage}>
            <LessonText text={lesson.check.passage} />
          </div>
        )}
        <p className={styles.problem}>
          <LessonText text={lesson.check.text} />
        </p>
        <Choices
          choices={lesson.check.choices}
          right={lesson.check.right}
          why={lesson.check.why}
          label="Quick check choices"
        />
      </section>

      {lesson.quiz.length > 0 && (
        <Link className={styles.go} href={strategyQuiz(lesson.id).path}>
          <Tile name="strategy" />
          <span>
            <b>Strategy quiz</b>
            <small>
              {lesson.strategy.name} · {lesson.quiz.length} questions
            </small>
          </span>
          <Icon name="go" size={20} />
        </Link>
      )}
    </article>
  );
}
