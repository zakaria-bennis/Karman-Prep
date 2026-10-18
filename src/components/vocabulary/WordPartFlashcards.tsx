"use client";

import { useMemo, useState } from "react";
import { wordPartCards, type WordPartGroup } from "@/data/vocabulary/content";

const groups: { id: WordPartGroup; label: string }[] = [
  { id: "prefix", label: "Prefixes" },
  { id: "suffix", label: "Suffixes" },
  { id: "root", label: "Roots" },
];

export default function WordPartFlashcards() {
  const [group, setGroup] = useState<WordPartGroup>("prefix");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = useMemo(() => wordPartCards.filter((card) => card.group === group), [group]);
  const card = cards[index];

  function chooseGroup(next: WordPartGroup) {
    setGroup(next);
    setIndex(0);
    setFlipped(false);
  }

  function move(offset: number) {
    setIndex((current) => Math.min(Math.max(current + offset, 0), cards.length - 1));
    setFlipped(false);
  }

  return (
    <section
      className="card-surface min-w-0 max-w-2xl self-start p-4 text-ivory sm:p-7"
      aria-labelledby="word-parts-heading"
    >
      <h2 id="word-parts-heading" className="type-h2">
        Word Parts
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-taupe">
        Flip a card to learn what a prefix, suffix, or root means.
      </p>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter word parts">
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => chooseGroup(item.id)}
            aria-pressed={group === item.id}
            className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-fast ${group === item.id ? "border-gold bg-gold/15 text-ivory" : "border-bronze bg-night text-taupe hover:text-ivory"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm text-taupe" aria-live="polite">
        {groups.find((item) => item.id === group)?.label} · {index + 1} of {cards.length}
      </p>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-label={
          flipped
            ? `Meaning: ${card.meaning}. Flip to see ${card.front}`
            : `Word part ${card.front}. Flip to see meaning`
        }
        className="mt-3 flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-bronze bg-night p-6 text-center transition-colors duration-fast hover:border-gold focus-visible:border-gold sm:min-h-64"
      >
        {flipped ? (
          <span className="font-atkinson text-xl leading-relaxed text-ivory sm:text-2xl">
            {card.meaning}
          </span>
        ) : (
          <span className="font-plex-serif text-4xl text-ivory sm:text-5xl">{card.front}</span>
        )}
      </button>
      <p className="mt-3 text-xs text-taupe">
        {flipped ? "Flip to see the word part" : "Flip to reveal meaning"}
      </p>
      {flipped && (
        <details className="mt-4 rounded-lg border border-bronze bg-night p-4 text-sm text-taupe">
          <summary className="cursor-pointer text-ivory">Notes and sources</summary>
          {card.variants.length > 0 && (
            <p className="mt-3">Related forms: {card.variants.join(", ")}</p>
          )}
          {card.caution && <p className="mt-3 leading-relaxed">{card.caution}</p>}
          {card.sameFrontCardIds.length > 0 && (
            <p className="mt-3">Another card covers a different meaning of this spelling.</p>
          )}
          <ul className="mt-3 flex flex-wrap gap-3">
            {card.sourceUrls.map((url, sourceIndex) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline underline-offset-2"
                >
                  Source {sourceIndex + 1}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => move(-1)}
          className="btn-secondary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={index === cards.length - 1}
          onClick={() => move(1)}
          className="btn-primary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-taupe">
        Card position stays on this screen only; no mastery score is recorded.
      </p>
    </section>
  );
}
