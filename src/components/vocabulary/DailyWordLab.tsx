"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dailyWords } from "@/data/vocabulary/content";
import {
  gameOutcome,
  keyboardFeedback,
  MAX_GUESSES,
  millisecondsUntilNextUtcDay,
  parseAcceptedGuesses,
  restoreDailySession,
  scoreGuess,
  utcDay,
  type LetterResult,
  type RestoredDailySession,
} from "@/lib/vocabulary/daily-word";

type Session = RestoredDailySession & { day: string };
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

function storageKey(day: string, version: "v1" | "v2") {
  return `karman:vocabulary:daily:${version}:${day}`;
}

function readSession(day: string): Session {
  try {
    return {
      day,
      ...restoreDailySession(
        day,
        localStorage.getItem(storageKey(day, "v1")),
        localStorage.getItem(storageKey(day, "v2"))
      ),
    };
  } catch {
    return { day, ...restoreDailySession(day, null, null) };
  }
}

export default function DailyWordLab() {
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState("");
  const [wordList, setWordList] = useState<{ length: number; words: Set<string> } | null>(null);
  const [listError, setListError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let rolloverTimer: number;
    const refresh = () => {
      const now = new Date();
      const nextDay = utcDay(now);
      setSession((current) => (current?.day === nextDay ? current : readSession(nextDay)));
      window.clearTimeout(rolloverTimer);
      rolloverTimer = window.setTimeout(refresh, millisecondsUntilNextUtcDay(now));
    };
    refresh();
    window.addEventListener("focus", refresh);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onStorage = (event: StorageEvent) => {
      const day = utcDay(new Date());
      if (event.key === storageKey(day, "v1") || event.key === storageKey(day, "v2"))
        refreshFromStorage();
    };
    const refreshFromStorage = () => setSession(readSession(utcDay(new Date())));
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(rolloverTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const word = session?.word ?? null;
  const length = word?.word.length;
  const activeWordList = wordList && wordList.length === length ? wordList.words : null;
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
        if (!cancelled) setWordList({ length, words: parseAcceptedGuesses(text, length) });
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
    if (!session || !word || outcome !== "playing" || !activeWordList) return;
    const guess = draft.toUpperCase();
    if (guess.length !== word.word.length) {
      setMessage(`Enter ${word.word.length} letters.`);
      return;
    }
    if (!activeWordList.has(guess) && guess !== word.word) {
      setMessage("That word is not in the word list.");
      return;
    }
    if (guesses.includes(guess)) {
      setMessage("You already tried that word.");
      return;
    }
    const next = [...guesses, guess];
    setSession({ ...session, guesses: next });
    setDraft("");
    setMessage(
      guess === word.word
        ? "Word found. Its meaning is below."
        : next.length === MAX_GUESSES
          ? "Six tries used. The word and meaning are below."
          : `Guess ${next.length} submitted.`
    );
    try {
      localStorage.setItem(
        storageKey(session.day, session.storageVersion),
        JSON.stringify(session.storageVersion === "v1" ? next : { wordId: word.id, guesses: next })
      );
    } catch {
      /* Play remains available without storage. */
    }
  }, [activeWordList, draft, guesses, outcome, session, word]);

  const enterLetter = useCallback(
    (letter: string) => {
      if (!word || outcome !== "playing" || !activeWordList) return;
      if (letter === "BACKSPACE") setDraft((current) => current.slice(0, -1));
      else if (letter === "ENTER") {
        submit();
        return;
      } else if (/^[A-Z]$/.test(letter))
        setDraft((current) => (current.length < word.word.length ? current + letter : current));
      setMessage("");
    },
    [activeWordList, outcome, submit, word]
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
      <section className="card-surface min-w-0 p-6 text-taupe" aria-label="Daily Word Lab">
        Loading today&apos;s word…
      </section>
    );

  const scrollBoard = word.word.length > 8;
  const visibleRows = Array.from({ length: MAX_GUESSES }, (_, index) => {
    const guess =
      guesses[index] ?? (index === guesses.length && outcome === "playing" ? draft : "");
    const result = guesses[index] ? scoreGuess(guesses[index], word.word) : null;
    return (
      <div
        key={index}
        className={`grid gap-1 ${scrollBoard ? "w-max min-w-full" : ""}`}
        style={{
          gridTemplateColumns: scrollBoard
            ? `repeat(${word.word.length}, 2rem)`
            : `repeat(${word.word.length}, minmax(0, 1fr))`,
        }}
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
              className={`relative flex aspect-square min-w-0 items-center justify-center rounded-md border font-semibold ${scrollBoard ? "text-sm" : "gap-0.5 text-base sm:text-xl"} ${state ? resultClass[state] : "border-bronze bg-night text-ivory"}`}
            >
              <span>{letter}</span>
              {state && (
                <span
                  className={
                    scrollBoard ? "absolute bottom-0 right-0.5 text-[9px] leading-none" : "text-xs"
                  }
                  aria-hidden="true"
                >
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
      className="card-surface min-w-0 max-w-2xl p-4 text-ivory sm:p-7"
      aria-labelledby="word-lab-heading"
    >
      <div className="border-b border-bronze pb-5">
        <h2 id="word-lab-heading" className="type-h2">
          Daily Word Lab
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-taupe">
          Find today&apos;s word in six tries. Each guess must be a dictionary word.
        </p>
        <p className="mt-3 text-xs text-taupe">
          {session.day} UTC · {word.word.length} letters · New word at 00:00 UTC
        </p>
      </div>
      {scrollBoard && (
        <p id="word-board-hint" className="mt-5 text-center text-xs text-taupe">
          Swipe the letter board or use arrow keys to see every position.
        </p>
      )}
      <div
        className={`mx-auto mt-6 flex w-full min-w-0 flex-col gap-1.5 overflow-x-auto pb-2 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${scrollBoard ? "max-w-full" : "max-w-sm"}`}
        role="region"
        tabIndex={scrollBoard ? 0 : undefined}
        aria-label="Letter guesses"
        aria-describedby={scrollBoard ? "word-board-hint" : undefined}
        onKeyDown={(event) => {
          if (!scrollBoard) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            event.currentTarget.scrollLeft += event.key === "ArrowRight" ? 72 : -72;
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            event.currentTarget.scrollLeft =
              event.key === "Home" ? 0 : event.currentTarget.scrollWidth;
          }
        }}
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
              disabled={!activeWordList}
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
              disabled={!activeWordList}
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
          {!activeWordList && !listError && (
            <p className="mt-2 text-sm text-taupe">Loading word list…</p>
          )}
        </div>
      )}
      <p id="word-lab-message" aria-live="polite" className="mt-3 min-h-5 text-sm text-gold-bright">
        {message}
      </p>
      {outcome === "playing" && (
        <p className="mt-1 text-xs text-taupe">{MAX_GUESSES - guesses.length} tries left</p>
      )}
      {session.storageVersion === "v1" && (
        <p className="mt-3 text-xs leading-relaxed text-taupe">
          Your earlier guesses are preserved for today&apos;s word.
        </p>
      )}
      {outcome !== "playing" && (
        <div className="mt-5 border-l-4 border-gold bg-night p-5" role="status">
          <p className="text-sm font-medium text-gold-bright">
            {outcome === "won" ? "You found the word" : "Today’s word"}
          </p>
          <p className="mt-1 break-words font-plex-serif text-2xl text-ivory">
            {word.word.toLowerCase()}
          </p>
          {word.partOfSpeech && <p className="mt-1 text-sm text-taupe">{word.partOfSpeech}</p>}
          <p className="mt-2 font-atkinson text-base leading-relaxed text-ivory">{word.meaning}</p>
          {word.caution && (
            <p className="mt-3 text-sm leading-relaxed text-taupe">{word.caution}</p>
          )}
          <a
            href={word.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-gold underline underline-offset-2"
          >
            Dictionary source
          </a>
          {word.satSourceUrl && (
            <a
              href={word.satSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm text-gold underline underline-offset-2"
            >
              Released practice-test answer choice
            </a>
          )}
        </div>
      )}
      {outcome === "playing" && activeWordList && (
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
        This game saves guesses on this device only. The {dailyWords.length}-word pool repeats after{" "}
        {dailyWords.length} UTC days. Practice-test sources show answer-choice appearances, not
        administered-test frequency or College Board endorsement.
      </p>
      <p className="mt-2 text-xs text-taupe">
        Accepted spellings: SCOWLv2.{" "}
        <a href="/vocabulary/NOTICE.txt" className="underline underline-offset-2">
          Word-list source and license
        </a>
        .
      </p>
    </section>
  );
}
