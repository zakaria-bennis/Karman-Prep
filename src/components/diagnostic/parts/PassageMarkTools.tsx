"use client";

import { useState, type Ref } from "react";
export type PassageMarkKind = "highlight" | "underline";
const buttonClass =
  "min-h-11 rounded-lg border border-bronze px-3 py-2 text-sm font-semibold text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-info";

export function PassageMarkTools({
  passage,
  kind,
  onKind,
  onMarkSelection,
  onMarkPhrase,
  selectedToolRef,
}: {
  passage: string;
  kind: PassageMarkKind;
  onKind: (kind: PassageMarkKind) => void;
  onMarkSelection: () => void;
  onMarkPhrase: (start: number, end: number) => void;
  selectedToolRef?: Ref<HTMLButtonElement>;
}) {
  const [phrase, setPhrase] = useState("");
  const [message, setMessage] = useState("");
  function find() {
    const start = passage.indexOf(phrase);
    if (!phrase.trim() || start < 0) {
      setMessage("That exact phrase was not found in this passage.");
      return;
    }
    onMarkPhrase(start, start + phrase.length);
    setMessage(
      `${kind === "highlight" ? "Highlight" : "Underline"} added to the first matching phrase.`
    );
  }
  return (
    <div className="mb-4 font-sans text-sm">
      <p className="text-taupe">
        Choose a tool, then select passage text. Your markings and notes stay while this diagnostic
        is open.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["highlight", "underline"] as const).map((tool) => (
          <button
            key={tool}
            ref={kind === tool ? selectedToolRef : undefined}
            type="button"
            aria-pressed={kind === tool}
            onClick={() => onKind(tool)}
            className={`${buttonClass} ${kind === tool ? "bg-ivory text-night" : ""}`}
          >
            {tool === "highlight" ? "Highlight" : "Underline"}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onMarkSelection}
        >
          Mark selection
        </button>
      </div>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer py-3 text-taupe">
          Choose text with the keyboard
        </summary>
        <label className="block">
          Exact passage phrase
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                find();
              }
            }}
            className="mt-2 block min-h-11 w-full rounded-lg border border-bronze bg-surface p-3 text-ivory"
          />
        </label>
        <button type="button" className={`${buttonClass} mt-2`} onClick={find}>
          Mark phrase
        </button>
      </details>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
