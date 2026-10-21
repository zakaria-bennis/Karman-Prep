"use client";

import type { QuizState } from "@/contexts/QuizContext";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import type { FigurePilotItem } from "./pilot-data";

const inspectOnly = () => undefined;

// Unanswered student state: what a student sees before choosing an answer.
const viewState: Pick<
  QuizState,
  "phase" | "reviews" | "records" | "targetLength" | "currentIndex" | "selectedAnswer"
> = {
  phase: "answering",
  reviews: {},
  records: [],
  targetLength: 1,
  currentIndex: 0,
  selectedAnswer: null,
};

export default function FigurePilotClient({ items }: { items: FigurePilotItem[] }) {
  return (
    <main className="min-h-screen bg-night px-4 py-8 text-ivory sm:px-8">
      <header className="mx-auto mb-8 max-w-[2000px]">
        <h1 className="text-xl font-semibold">Figure pilot</h1>
        <p className="mt-1 max-w-3xl text-sm text-taupe">
          Left: the original question image. Right: the same question in the student quiz screen
          (ActiveQuizScreen, dark theme, unanswered, at a 1280x800 laptop size) with the recreated
          figure. Dev only; nothing here is in the database.
        </p>
      </header>
      <div className="mx-auto max-w-[2000px] space-y-12">
        {items.map((item, index) => (
          <PilotRow key={item.occurrence_id} item={item} index={index} />
        ))}
      </div>
    </main>
  );
}

function PilotRow({ item, index }: { item: FigurePilotItem; index: number }) {
  const q = item.question;
  // ActiveQuizScreen reads only subject/topic from this display adapter.
  const node = {
    id: "figure-pilot",
    subject: q.subject,
    topic: q.topic_cluster ?? "Figure pilot",
    status: "available",
  } as unknown as MappedNode;
  return (
    <section
      data-pilot-item={item.occurrence_id}
      className="rounded-2xl border border-bronze bg-surface/40 p-4"
    >
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">
          {index + 1}. {item.figure_type}
        </span>
        <span className="font-mono text-xs text-taupe">{item.occurrence_id}</span>
        <span className="text-taupe">Format: {item.format}</span>
        <span className="text-success-bright">Key: {item.answer}</span>
      </div>
      {/* The quiz pane is a fixed 1280x800 laptop screen so figures render at real student size. */}
      <div className="grid gap-4 overflow-x-auto min-[1960px]:grid-cols-[minmax(0,1fr)_80rem]">
        <figure className="flex items-start justify-center overflow-hidden rounded-xl border border-bronze bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/dev/figure-pilot/files/${item.original}`}
            alt={`Original source image for ${item.occurrence_id}`}
            className="h-auto max-h-[50rem] w-full object-contain"
          />
        </figure>
        <div className="relative h-[50rem] w-[80rem] shrink-0 overflow-hidden rounded-xl border border-bronze bg-night text-ivory">
          <ActiveQuizScreen
            node={node}
            q={q}
            onClose={inspectOnly}
            onSelectAnswer={inspectOnly}
            onSubmit={inspectOnly}
            onFlagClick={inspectOnly}
            showExplanations={false}
            onToggleExplanations={inspectOnly}
            onNext={inspectOnly}
            readOnly
            stateOverride={viewState}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-taupe">{item.notes}</p>
    </section>
  );
}
