"use client";

import { useEffect, useRef, useState } from "react";
import type { QuizState } from "@/contexts/QuizContext";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import type { StudentQuizQuestion } from "@/types/quiz";

const inspectOnly = () => undefined;
const LAPTOP = { width: 1280, height: 800 };

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

/** The real student quiz screen (ActiveQuizScreen, unanswered). On a laptop or desktop it is
 *  a 1280x800 laptop screen scaled to fit the pane; on a phone it renders at phone width. */
export default function QuizPane({ q }: { q: StudentQuizQuestion }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const media = window.matchMedia("(max-width: 767px)");
    const onMedia = () => setPhone(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);
  // ActiveQuizScreen reads only subject/topic from this display adapter.
  const node = {
    id: "figure-review",
    subject: q.subject,
    topic: q.topic_cluster ?? "Figure review",
    status: "available",
  } as unknown as MappedNode;
  const screen = (
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
  );
  const scale = width ? Math.min(1, width / LAPTOP.width) : 1;
  return (
    <div ref={box} className="w-full">
      {width === null ? null : phone ? (
        <div className="relative h-[46rem] overflow-hidden rounded-xl border border-bronze bg-night text-ivory">
          {screen}
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-bronze"
          style={{ height: LAPTOP.height * scale, width: LAPTOP.width * scale }}
        >
          <div
            className="relative origin-top-left bg-night text-ivory"
            style={{ ...LAPTOP, transform: `scale(${scale})` }}
          >
            {screen}
          </div>
        </div>
      )}
    </div>
  );
}
