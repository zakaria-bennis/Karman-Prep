"use client";

// The short diagnostic uses prompt labels, never question ordinals.
// Indexes remain internal so section locks and saved tools keep their identity.
import { useEffect, useRef } from "react";
import { X, Bookmark } from "lucide-react";
import { DOMAIN_SECTION, type SATDomain } from "@/types";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";

interface NavQuestion {
  id: string;
  domain: SATDomain;
  text?: string;
  passage?: string;
  correct: string;
}
interface Props {
  open: boolean;
  questions: NavQuestion[];
  currentIdx: number;
  answers: Record<string, string>;
  bookmarkedIds: Set<string>;
  hintedIds: Set<string>;
  currentSection: "math" | "rw";
  onClose: () => void;
  onJump: (idx: number) => void;
}

export function QuestionNavigator({
  open,
  questions,
  currentIdx,
  answers,
  bookmarkedIds,
  hintedIds,
  currentSection,
  onClose,
  onJump,
}: Props) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAction.current();
      }
      if (event.key !== "Tab") return;
      const controls = panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div onClick={onClose} className="absolute inset-0 bg-night/60 backdrop-blur-sm" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagnostic-navigation-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-bronze bg-surface text-ivory shadow-2xl"
      >
        <header className="border-b border-bronze px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="diagnostic-navigation-title" className="text-lg font-bold">
              Question guide
            </h2>
            <button
              ref={close}
              type="button"
              onClick={onClose}
              aria-label="Close question guide"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-info"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-sm text-taupe">
            Choose a prompt to return to it. Your answers and tools stay with each question.
          </p>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {(["rw", "math"] as const).map((section) => {
            const items = questions
              .map((q, idx) => ({ ...q, idx }))
              .filter((q) => DOMAIN_SECTION[q.domain] === section);
            if (!items.length) return null;
            const locked = section !== currentSection;
            return (
              <section key={section} aria-label={section === "rw" ? "Reading & Writing" : "Math"}>
                <h3 className="mb-3 text-sm font-bold">
                  {section === "rw" ? "Reading & Writing" : "Math"}
                  {locked && <span className="ml-2 font-normal text-taupe">Locked</span>}
                </h3>
                <div className="space-y-2">
                  {items.map((q) => {
                    const answer = answers[q.id];
                    const current = q.idx === currentIdx;
                    const bookmarked = bookmarkedIds.has(q.id);
                    const hinted = hintedIds.has(q.id);
                    const status = answer
                      ? answer === q.correct
                        ? "Correct"
                        : "Review answer"
                      : "Unanswered";
                    const label = q.text || "Saved prompt";
                    return (
                      <button
                        key={q.id}
                        type="button"
                        disabled={locked}
                        aria-current={current ? "true" : undefined}
                        aria-describedby={
                          q.passage ? `diagnostic-prompt-context-${q.idx}` : undefined
                        }
                        aria-label={`${current ? "Current prompt" : "Open prompt"}: ${label}${locked ? " — locked" : ""}`}
                        onClick={() => {
                          if (!locked) {
                            onJump(q.idx);
                            onClose();
                          }
                        }}
                        className={cn(
                          "w-full rounded-xl border border-bronze p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-info disabled:opacity-50",
                          current
                            ? "bg-surface-raised ring-2 ring-ivory"
                            : "hover:bg-surface-raised"
                        )}
                      >
                        <span className="line-clamp-2 break-words font-semibold">
                          <MathText text={label} />
                        </span>
                        {q.passage && (
                          <span
                            id={`diagnostic-prompt-context-${q.idx}`}
                            className="mt-1 line-clamp-2 text-sm font-normal text-taupe"
                          >
                            <MathText text={q.passage} />
                          </span>
                        )}
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-taupe">
                          {current && <span className="font-semibold text-ivory">Current</span>}
                          <span>{status}</span>
                          {bookmarked && (
                            <span className="inline-flex items-center gap-1">
                              <Bookmark className="h-3 w-3" aria-hidden="true" />
                              Bookmarked
                            </span>
                          )}
                          {hinted && <span>Hint used</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
