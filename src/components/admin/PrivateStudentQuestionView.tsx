"use client";

import Link from "next/link";
import { QuizProvider } from "@/contexts/QuizContext";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import type { StudentQuizQuestion } from "@/types/quiz";

const inspectOnly = () => {};

/** Unanswered inspection uses the actual student renderer, never QuizEngine. */
export default function PrivateStudentQuestionView({
  question,
  payloadSha256,
}: {
  question: StudentQuizQuestion;
  payloadSha256: string;
}) {
  // ActiveQuizScreen reads only subject/topic from this display adapter.
  // It is not a curriculum assignment and never reaches a quiz action.
  const node: MappedNode = {
    id: "private-unanswered-view",
    subject: question.subject,
    topic: question.topic_cluster ?? "Private question review",
    tier: 1,
    concept_slug: "",
    domain: question.subject === "math" ? "algebra" : "craft_structure",
    description: "",
    difficulty: 1,
    x: 0,
    y: 0,
    prereqIds: [],
    topic_cluster: question.topic_cluster ?? "",
    status: "available",
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-night text-ivory"
      data-private-student-view="unanswered"
      data-question-id={question.id}
      data-payload-sha256={payloadSha256}
    >
      <QuizProvider>
        <fieldset disabled className="contents" aria-label="Unanswered student rendering">
          <ActiveQuizScreen
            node={node}
            q={question}
            onClose={inspectOnly}
            onSelectAnswer={inspectOnly}
            onSubmit={inspectOnly}
            onFlagClick={inspectOnly}
            showExplanations={false}
            onToggleExplanations={inspectOnly}
            onNext={inspectOnly}
          />
        </fieldset>
      </QuizProvider>
      <aside className="absolute inset-x-0 bottom-0 z-[73] flex h-20 items-center justify-between gap-3 border-t border-bronze bg-night px-3 text-xs sm:px-6">
        <p>
          Private review · unanswered student rendering · controls disabled
          <span className="block text-taupe">Question 1 of 10 is fixed preview chrome.</span>
        </p>
        <Link
          href={`/admin/questions/inspect/${question.id}`}
          prefetch={false}
          className="shrink-0 text-info-bright underline"
        >
          Exit review
        </Link>
      </aside>
    </div>
  );
}
