"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dailyWords } from "@/data/vocabulary/content";
import {
  gameOutcome,
  keyboardFeedback,
  MAX_GUESSES,
  puzzleForDay,
  savedGuesses,
  scoreGuess,
  utcDay,
  type LetterResult,
} from "@/lib/vocabulary/daily-word";

type Session = { day: string; guesses: string[] };
const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const EMPTY_GUESSES: readonly string[] = [];
const resultLabel: Record<LetterResult, string> = {
  correct: "correct position",
  present: "in word, different position",
  absent: "not in word",
};
const resultSymbol: Record<LetterResult, string> = { correct: "✓", present: "↔", absent: "×" };
const resultClass: Record<LetterResult, string> = {
  correct: "border-success bg-success/20 text-ivory",
  present: "border-warning bg-warning/15 text-ivory",
  absent: "border-taupe/50 bg-charcoal text-taupe",
};

function storageKey(day: string) {
  return `karman:vocabulary:daily:v1:${day}`;
}

function readSession(day: string): Session {
  const answer = puzzleForDay(day).word;
  try {
    return { day, guesses: savedGuesses(localStorage.getItem(storageKey(day)), answer.length) };
  } catch {
    return { day, guesses: [] };
  }
}

export default function DailyWordLab() {
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState("");
  const [wordList, setWordList] = useState<Set<string> | null>(null);
  const [listError, setListError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      const nextDay = utcDay(new Date());
      setSession((current) => (current?.day === nextDay ? current : readSession(nextDay)));
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(utcDay(new Date()))) refreshFromStorage();
    };
    const refreshFromStorage = () => setSession(readSession(utcDay(new Date())));
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const word = session ? puzzleForDay(session.day) : null;
  const length = word?.word.length;
  const guesses = session?.guesses ?? EMPTY_GUESSES;
  const outcome = word ? gameOutcome(guesses, word.word) : "playing";
  const feedback = useMemo(
    () => (word ? keyboardFeedback(guesses, word.word) : new Map<string, LetterResult>()),
    [guesses, word]
  );

  useEffect(() => {
    if (!length) return;
    let cancelled = false;
    setWordList(null);
    setListError(false);
    fetch(`/vocabulary/guesses-${length}.txt`)
      .then((response) => {
        if (!response.ok) throw new Error("Word list unavailable");
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setWordList(new Set(text.trim().toUpperCase().split(",")));
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [length, listRetry]);

  useEffect(() => {
    setDraft("");
    setMessage("");
  }, [session?.day]);

  const submit = useCallback(() => {
    if (!session || !word || outcome !== "playing" || !wordList) return;
    const guess = draft.toUpperCase();
    if (guess.length !== word.word.length) {
      setMessage(`Enter ${word.word.length} letters.`);
      return;
    }
    if (!wordList.has(guess) && guess !== word.word) {
      setMessage("That word is not in the word list.");
      return;
    }
    if (guesses.includes(guess)) {
      setMessage("You already tried that word.");
      return;
    }
    const next = [...guesses, guess];
    setSession({ day: session.day, guesses: next });
    setDraft("");
    setMessage(
      guess === word.word
        ? "Word found. Its meaning is below."
        : next.length === MAX_GUESSES
          ? "Six tries used. The word and meaning are below."
          : `Guess ${next.length} submitted.`
    );
    try {
      localStorage.setItem(storageKey(session.day), JSON.stringify(next));
    } catch {
      /* Play remains available without storage. */
    }
  }, [draft, guesses, outcome, session, word, wordList]);

  const enterLetter = useCallback(
    (letter: string) => {
      if (!word || outcome !== "playing" || !wordList) return;
      if (letter === "BACKSPACE") setDraft((current) => current.slice(0, -1));
      else if (letter === "ENTER") {
        submit();
        return;
      } else if (/^[A-Z]$/.test(letter))
        setDraft((current) => (current.length < word.word.length ? current + letter : current));
      setMessage("");
    },
    [outcome, submit, word, wordList]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true'], button")) return;
      const key = event.key.toUpperCase();
      if (/^[A-Z]$/.test(key) || key === "BACKSPACE" || key === "ENTER") {
        event.preventDefault();
        enterLetter(key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterLetter]);

  if (!session || !word)
    return (
      <section className="card-surface p-6 text-taupe" aria-label="Daily Word Lab">
        Loading today&apos;s word…
      </section>
    );

  const visibleRows = Array.from({ length: MAX_GUESSES }, (_, index) => {
    const guess =
      guesses[index] ?? (index === guesses.length && outcome === "playing" ? draft : "");
    const result = guesses[index] ? scoreGuess(guesses[index], word.word) : null;
    return (
      <div
        key={index}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${word.word.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={`Guess ${index + 1}`}
      >
        {Array.from({ length: word.word.length }, (_, position) => {
          const state = result?.[position];
          const letter = guess[position] ?? "";
          return (
            <div
              key={position}
              role="img"
              aria-label={`Position ${position + 1}: ${letter || "empty"}, ${state ? resultLabel[state] : "unsubmitted"}`}
              className={`flex aspect-square min-w-0 items-center justify-center gap-0.5 rounded-md border text-base font-semibold sm:text-xl ${state ? resultClass[state] : "border-bronze bg-night text-ivory"}`}
            >
              <span>{letter}</span>
              {state && (
                <span className="text-xs" aria-hidden="true">
                  {resultSymbol[state]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  });

  return (
    <section
      className="card-surface max-w-2xl p-4 text-ivory sm:p-7"
      aria-labelledby="word-lab-heading"
    >
      <div className="border-b border-bronze pb-5">
        <h2 id="word-lab-heading" className="type-h2">
          Daily Word Lab
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-taupe">
          Read the sentence, then find the missing word in six tries.
        </p>
        <p className="mt-3 text-xs text-taupe">
          {session.day} UTC · {word.word.length} letters · New word at 00:00 UTC
        </p>
      </div>
      <p className="mt-6 max-w-prose font-atkinson text-base leading-relaxed sm:text-lg">
        {word.context}
      </p>
      <div
        className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-1.5"
        aria-label="Letter guesses"
      >
        {visibleRows}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-taupe">
        ✓ right place &nbsp; ↔ elsewhere in word &nbsp; × not in word
      </p>
      {outcome === "playing" && (
        <div className="mt-6">
          <label htmlFor="word-lab-input" className="text-sm text-taupe">
            Your next guess
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="word-lab-input"
              type="text"
              value={draft}
              maxLength={word.word.length}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={!wordList}
              onChange={(event) => {
                setDraft(
                  event.target.value
                    .replace(/[^a-z]/gi, "")
                    .slice(0, word.word.length)
                    .toUpperCase()
                );
                setMessage("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-bronze bg-night px-3 py-2 font-plex-mono text-base uppercase tracking-widest text-ivory placeholder:text-taupe focus:border-gold"
              placeholder={`${word.word.length} letters`}
              aria-describedby="word-lab-message"
            />
            <button
              type="button"
              className="btn-primary px-4 text-sm"
              onClick={submit}
              disabled={!wordList}
            >
              Guess
            </button>
          </div>
          {listError && (
            <p className="mt-2 text-sm text-warning">
              The word list could not load.{" "}
              <button
                type="button"
                onClick={() => setListRetry((count) => count + 1)}
                className="underline underline-offset-2"
              >
                Try again
              </button>
              .
            </p>
          )}
          {!wordList && !listError && <p className="mt-2 text-sm text-taupe">Loading word list…</p>}
        </div>
      )}
      <p id="word-lab-message" aria-live="polite" className="mt-3 min-h-5 text-sm text-gold-bright">
        {message}
      </p>
      {outcome === "playing" && (
        <p className="mt-1 text-xs text-taupe">{MAX_GUESSES - guesses.length} tries left</p>
      )}
      {outcome !== "playing" && (
        <div className="mt-5 border-l-4 border-gold bg-night p-5" role="status">
          <p className="text-sm font-medium text-gold-bright">
            {outcome === "won" ? "You found the word" : "Today’s word"}
          </p>
          <p className="mt-1 font-plex-serif text-2xl text-ivory">{word.word.toLowerCase()}</p>
          <p className="mt-2 font-atkinson text-base leading-relaxed text-ivory">{word.meaning}</p>
          <a
            href={word.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-gold underline underline-offset-2"
          >
            Dictionary source
          </a>
        </div>
      )}
      {outcome === "playing" && wordList && (
        <div className="mt-6 space-y-1.5" aria-label="On-screen keyboard">
          {rows.map((row) => (
            <div key={row} className="flex justify-center gap-1">
              {Array.from(row).map((letter) => {
                const state = feedback.get(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => enterLetter(letter)}
                    aria-label={`${letter}${state ? `, ${resultLabel[state]}` : ""}`}
                    className={`min-h-10 min-w-0 flex-1 rounded border text-xs font-medium sm:min-h-11 sm:text-sm ${state ? resultClass[state] : "border-bronze bg-surface-raised text-ivory"}`}
                  >
                    {letter}
                    {state && (
                      <span aria-hidden="true" className="ml-0.5 text-[10px]">
                        {resultSymbol[state]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => enterLetter("BACKSPACE")}
              className="min-h-11 rounded-lg border border-bronze bg-surface-raised px-4 text-sm text-ivory"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => enterLetter("ENTER")}
              className="min-h-11 rounded-lg border border-bronze bg-surface-raised px-4 text-sm text-ivory"
            >
              Enter
            </button>
          </div>
        </div>
      )}
      <p className="mt-6 text-xs leading-relaxed text-taupe">
        This game saves guesses on this device only. The starter words repeat after{" "}
        {dailyWords.length} days.
      </p>
    </section>
  );
}
