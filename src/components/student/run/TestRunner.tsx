"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { limitSeconds, type TimingAccommodation } from "@/lib/quiz/timer";
import { pointsForAnswer } from "@/lib/student/skill-points";
import { CB_MODULE, formatClock } from "@/lib/student/time-trial";
import type { DeliveredQuestion } from "@/lib/student/preview-bank";
import type { QuizDifficultyLevel } from "@/types/quiz";
import { addToHistory } from "../preview-store";
import { ModuleRun, type ModuleResult } from "./ModuleRun";
import { ResultActions, ResultsFrame } from "./Results";
import s from "../student.module.css";
import x from "./results.module.css";

export type TestModule = {
  id: string;
  title: string;
  section: "reading" | "math";
  items: DeliveredQuestion[];
};
const BREAK_SECONDS = 600;

/** Full-length practice test: four linear modules with College Board timing and a break. */
export function TestRunner({
  modules,
  accommodation,
  base,
}: {
  modules: TestModule[];
  accommodation: TimingAccommodation;
  base: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [testKey] = useState(() => `preview:test:${Date.now()}`);

  if (modules.some((m) => m.items.length === 0)) {
    return (
      <ResultsFrame>
        <p className={x.verdict}>Not enough published questions for a full test yet.</p>
        <ResultActions primary={{ href: base, label: "Back to home" }} />
      </ResultsFrame>
    );
  }

  if (onBreak) return <Break onDone={() => setOnBreak(false)} />;

  if (step >= modules.length) {
    const rows = modules.map((m, i) => ({
      m,
      right: m.items.filter((it) => results[i]?.reviews[it.question.id]?.isCorrect).length,
    }));
    const byDomain = SKILL_DOMAINS.map((d) => {
      const its = modules
        .flatMap((m, i) =>
          m.items.map((it) => ({ it, ok: !!results[i]?.reviews[it.question.id]?.isCorrect }))
        )
        .filter(({ it }) => CATALOG_SKILLS.find((c) => c.id === it.skillId)?.domainId === d.id);
      return { label: d.label, right: its.filter((v) => v.ok).length, total: its.length };
    }).filter((d) => d.total > 0);
    const right = rows.reduce((n, r) => n + r.right, 0);
    const total = rows.reduce((n, r) => n + r.m.items.length, 0);
    return (
      <ResultsFrame>
        <span className={x.eyebrow}>Full-length practice test</span>
        <p className={x.big}>
          {right} of {total}
        </p>
        <dl className={x.facts}>
          {rows.map(({ m, right: r }) => (
            <div key={m.id}>
              <dt>{m.title}</dt>
              <dd>
                {r} of {m.items.length}
              </dd>
            </div>
          ))}
        </dl>
        <div className={x.table}>
          {byDomain.map((d) => (
            <div
              key={d.label}
              className={x.tr}
              style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
            >
              <span className={s.rowLabel}>{d.label}</span>
              <span className={s.rowMeta}>
                {d.right} of {d.total}
              </span>
            </div>
          ))}
        </div>
        <ResultActions primary={{ href: base, label: "Back to home" }} />
      </ResultsFrame>
    );
  }

  const m = modules[step];
  const done = (r: ModuleResult) => {
    const at = new Date().toISOString();
    addToHistory({
      responses: m.items
        .filter((it) => r.reviews[it.question.id])
        .map((it) => ({
          questionId: it.question.id,
          skillId: it.skillId,
          correct: r.reviews[it.question.id].isCorrect,
          difficulty: it.difficulty as QuizDifficultyLevel,
          answeredAt: at,
          seconds: r.seconds[it.question.id] ?? 1,
          timed: true,
        })),
      awards: m.items.flatMap((it) => {
        const pts = pointsForAnswer(
          !!r.reviews[it.question.id]?.isCorrect,
          it.difficulty as QuizDifficultyLevel
        );
        return pts
          ? [
              {
                awardKey: `test:${testKey}:${it.question.id}`,
                skillId: it.skillId,
                points: pts,
                createdAt: at,
              },
            ]
          : [];
      }),
    });
    setResults((all) => [...all, r]);
    // The break sits between Reading and Writing and Math, as on test day.
    if (modules[step + 1] && modules[step + 1].section !== m.section) setOnBreak(true);
    setStep(step + 1);
  };
  return (
    <ModuleRun
      key={m.id}
      items={m.items}
      kind="test"
      title={m.title}
      section={m.title}
      limitSeconds={limitSeconds(CB_MODULE[m.section].seconds, accommodation)}
      hasTutor
      attemptKey={`${testKey}:${m.id}`}
      onExit={() => router.push(`${base}/tests`)}
      onDone={done}
    />
  );
}

function Break({ onDone }: { onDone(): void }) {
  const [left, setLeft] = useState(BREAK_SECONDS);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      const l = BREAK_SECONDS - Math.floor((Date.now() - started) / 1000);
      setLeft(l);
      if (l <= 0) onDone();
    }, 500);
    return () => clearInterval(t);
  }, [onDone]);
  return (
    <ResultsFrame>
      <span className={x.eyebrow}>Break</span>
      <motion.p className={x.big} aria-live="off">
        {formatClock(left)}
      </motion.p>
      <p className={x.verdict}>Math starts when the break ends.</p>
      <div className={x.actions}>
        <button type="button" className={s.primary} onClick={onDone}>
          Start Math now
        </button>
      </div>
    </ResultsFrame>
  );
}
