import Link from "next/link";
import type { ReactNode } from "react";

export default function DailyLearningHub({
  challenge,
  vocabulary,
  wordParts,
  liveLearning,
}: {
  challenge: ReactNode;
  vocabulary: ReactNode;
  wordParts: ReactNode;
  liveLearning: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-night pb-16 pt-24 text-ivory sm:pt-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="type-label text-gold">Learn and practice</p>
        <h1 className="type-display-l mt-3">Daily practice</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-taupe sm:text-base">
          Try a daily word puzzle, explore word parts, and find SAT questions and live learning.
        </p>
        <nav aria-label="Daily practice sections" className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            className="min-h-11 rounded-lg border border-bronze px-4 py-3 hover:border-gold"
            href="#daily-questions"
          >
            SAT questions
          </Link>
          <Link
            className="min-h-11 rounded-lg border border-bronze px-4 py-3 hover:border-gold"
            href="#daily-vocabulary"
          >
            Vocabulary
          </Link>
          <Link
            className="min-h-11 rounded-lg border border-bronze px-4 py-3 hover:border-gold"
            href="#daily-live"
          >
            Live learning
          </Link>
        </nav>
      </div>
      <div id="daily-questions" className="mt-10 scroll-mt-24">
        {challenge}
      </div>
      <div
        id="daily-vocabulary"
        className="mx-auto mt-10 grid max-w-6xl scroll-mt-24 gap-6 px-5 sm:px-8 lg:grid-cols-2"
      >
        {vocabulary}
        {wordParts}
      </div>
      <div id="daily-live" className="mt-10 scroll-mt-24">
        {liveLearning}
      </div>
    </div>
  );
}
