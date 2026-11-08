"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  buildStudentHome,
  type StudentHomeInput,
  type StudentResponse,
} from "@/lib/student/home-model";
import { pointsForAnswer } from "@/lib/student/skill-points";
import type { DeliveredQuestion } from "@/lib/student/preview-bank";
import type { QuizDifficultyLevel } from "@/types/quiz";
import { addToHistory, useMergedInput } from "../preview-store";
import { ModuleRun } from "./ModuleRun";
import { LevelUps, ResultActions, ResultsFrame, SkillTable, skillChanges } from "./Results";
import x from "./results.module.css";

/** Your Daily 10 and skill practice: instant grading, points as you go. */
export function PracticeRun({
  items,
  input,
  nowMs,
  base,
  kind,
  title,
  section,
}: {
  items: DeliveredQuestion[];
  input: StudentHomeInput;
  nowMs: number;
  base: string;
  kind: "daily" | "practice";
  title: string;
  section: string;
}) {
  const router = useRouter();
  const merged = useMergedInput(input);
  const before = useRef<StudentHomeInput | null>(null);
  const [done, setDone] = useState(false);
  const [graded, setGraded] = useState<{ correct: boolean; points: number; skillId: string }[]>([]);
  const [runKey] = useState(() => `preview:${kind}:${Date.now()}`);

  if (items.length === 0) {
    return (
      <ResultsFrame>
        <p className={x.verdict}>No published questions are ready for this yet.</p>
        <ResultActions primary={{ href: base, label: "Back to home" }} />
      </ResultsFrame>
    );
  }

  if (done) {
    const b = buildStudentHome(before.current ?? merged, nowMs, base);
    const a = buildStudentHome(merged, Date.now(), base);
    const changes = skillChanges(b, a, new Set(items.map((i) => i.skillId)));
    const right = graded.filter((g) => g.correct).length;
    const pts = graded.reduce((n, g) => n + g.points, 0);
    return (
      <ResultsFrame>
        <span className={x.eyebrow}>{title}</span>
        <p className={x.big}>
          {right} of {items.length}
        </p>
        <dl className={x.facts}>
          <div>
            <dt>Points</dt>
            <dd>+{pts}</dd>
          </div>
          <div>
            <dt>Answered</dt>
            <dd>{graded.length}</dd>
          </div>
        </dl>
        <LevelUps changes={changes} />
        <SkillTable changes={changes} />
        <ResultActions primary={{ href: base, label: "Back to home" }} />
      </ResultsFrame>
    );
  }

  return (
    <ModuleRun
      items={items}
      kind="instant"
      title={title}
      section={section}
      hasTutor
      attemptKey={runKey}
      onExit={() => router.push(base)}
      onDone={() => {
        if (kind === "daily") addToHistory({ dailyDoneOn: new Date().toISOString().slice(0, 10) });
        setDone(true);
      }}
      onGraded={(it, review, seconds) => {
        // Snapshot the history before this run's first answer lands, for the band changes.
        before.current ??= merged;
        const difficulty = it.difficulty as QuizDifficultyLevel;
        const answeredAt = new Date().toISOString();
        const response: StudentResponse = {
          questionId: it.question.id,
          skillId: it.skillId,
          correct: review.isCorrect,
          difficulty,
          answeredAt,
          seconds,
          timed: false,
        };
        const points = pointsForAnswer(review.isCorrect, difficulty);
        addToHistory({
          responses: [response],
          awards: points
            ? [
                {
                  awardKey: `${runKey}:${it.question.id}`,
                  skillId: it.skillId,
                  points,
                  createdAt: answeredAt,
                },
              ]
            : [],
        });
        setGraded((g) => [...g, { correct: review.isCorrect, points, skillId: it.skillId }]);
      }}
    />
  );
}
