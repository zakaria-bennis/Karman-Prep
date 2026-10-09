"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { restoreRange, selectionRange, type TextRange } from "./annotation-ranges";

interface Mark extends TextRange {
  id: string;
  kind: "highlight" | "underline";
  note: string;
}
type Markings = Record<string, Mark[]>;
const AnnotationContext = createContext<{
  markings: Markings;
  setMarkings: Dispatch<SetStateAction<Markings>>;
} | null>(null);

/** Deliberately local to an open practice. No changes to saved answers or source content. */
export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [markings, setMarkings] = useState<Markings>({});
  return (
    <AnnotationContext.Provider value={{ markings, setMarkings }}>
      {children}
    </AnnotationContext.Provider>
  );
}

const buttonClass =
  "min-h-11 rounded-lg border border-bronze px-3 py-2 text-sm font-semibold text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-info disabled:opacity-40";

export default function PassageAnnotations({
  questionId: questionIdentity,
  sourceKey = "",
  children,
}: {
  questionId: string;
  sourceKey?: string;
  children: ReactNode;
}) {
  const questionId = `${questionIdentity}:${sourceKey}`;
  const shared = useContext(AnnotationContext);
  const [local, setLocal] = useState<Markings>({});
  const { markings, setMarkings } = shared ?? { markings: local, setMarkings: setLocal };
  const marks = markings[questionId];
  const root = useRef<HTMLDivElement>(null);
  const id = `passage-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [selection, setSelection] = useState<(TextRange & { questionId: string }) | null>(null);
  const [phrase, setPhrase] = useState("");
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(true);
  const selected = selection?.questionId === questionId ? selection : null;

  useEffect(() => {
    setSupported(typeof Highlight !== "undefined" && !!CSS.highlights);
    setSelection(null);
    setPhrase("");
    setMessage("");
    const capture = () => {
      if (!root.current) return;
      const next = selectionRange(root.current, window.getSelection());
      if (next) setSelection({ ...next, questionId });
    };
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, [questionId]);

  useLayoutEffect(() => {
    if (!root.current || typeof Highlight === "undefined" || !CSS.highlights) return;
    const registry = CSS.highlights;
    for (const kind of ["highlight", "underline"] as const) {
      const ranges = (marks ?? [])
        .filter((mark) => mark.kind === kind)
        .map((mark) => restoreRange(root.current!, mark))
        .filter((range): range is Range => !!range);
      registry.set(`${id}-${kind}`, new Highlight(...ranges));
    }
    return () => {
      registry.delete(`${id}-highlight`);
      registry.delete(`${id}-underline`);
    };
  }, [marks, id, questionId, children]);

  function add(kind: Mark["kind"]) {
    if (!selected || !root.current || !restoreRange(root.current, selected)) return;
    const mark: Mark = { ...selected, id: crypto.randomUUID(), kind, note: "" };
    setMarkings((old) => ({ ...old, [questionId]: [...(old[questionId] ?? []), mark] }));
    setMessage(kind === "highlight" ? "Highlight added." : "Underline added.");
    window.getSelection()?.removeAllRanges();
  }

  function findPhrase() {
    const start = root.current?.textContent?.indexOf(phrase) ?? -1;
    if (!phrase.trim() || start < 0) {
      setSelection(null);
      setMessage("That exact phrase was not found in this passage.");
      return;
    }
    setSelection({ questionId, start, end: start + phrase.length, quote: phrase });
    setMessage("First matching phrase selected. Choose Highlight or Underline.");
  }

  return (
    <section aria-label="Passage tools" className="min-w-0 space-y-4">
      <style>{`::highlight(${id}-highlight) { background-color: rgb(var(--k-gold)); color: rgb(var(--k-night)); }
        ::highlight(${id}-underline) { text-decoration: underline; text-decoration-thickness: 2px; text-decoration-color: currentColor; }`}</style>
      <div className="font-sans text-sm leading-relaxed">
        <p className="text-taupe">
          Select passage text to mark it. Markings stay while this practice is open.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={!selected}
            onClick={() => add("highlight")}
          >
            Highlight
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={!selected}
            onClick={() => add("underline")}
          >
            Underline
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  findPhrase();
                }
              }}
              onChange={(event) => setPhrase(event.target.value)}
              className="mt-2 block min-h-11 w-full rounded-lg border border-bronze bg-surface p-3 text-ivory"
            />
          </label>
          <button type="button" className={`${buttonClass} mt-2`} onClick={findPhrase}>
            Find phrase
          </button>
        </details>
        {!supported && (
          <p role="status">
            This browser shows your markings in Notes and markings below the passage.
          </p>
        )}
        <p className="sr-only" role="status">
          {message}
        </p>
      </div>
      <div ref={root} data-annotation-text className="select-text">
        {children}
      </div>
      {!!marks?.length && (
        <details className="font-sans text-sm" open={supported ? undefined : true}>
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">
            Notes and markings
          </summary>
          <ul className="space-y-4">
            {marks.map((mark) => (
              <li key={mark.id} className="space-y-2 border-t border-bronze pt-3">
                <p className="break-words">
                  <strong>{mark.kind === "highlight" ? "Highlight" : "Underline"}:</strong>{" "}
                  <span
                    className={
                      mark.kind === "highlight" ? "bg-gold text-night" : "underline decoration-2"
                    }
                  >
                    {mark.quote}
                  </span>
                </p>
                <label className="block">
                  Note for this marking
                  <textarea
                    value={mark.note}
                    rows={2}
                    onChange={(event) => {
                      const note = event.target.value;
                      setMarkings((old) => ({
                        ...old,
                        [questionId]: old[questionId].map((item) =>
                          item.id === mark.id ? { ...item, note } : item
                        ),
                      }));
                    }}
                    className="mt-2 block w-full rounded-lg border border-bronze bg-surface p-3 text-ivory"
                  />
                </label>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setMarkings((old) => ({
                      ...old,
                      [questionId]: old[questionId].filter((item) => item.id !== mark.id),
                    }));
                    setMessage("Marking removed.");
                  }}
                >
                  Remove {mark.kind}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
