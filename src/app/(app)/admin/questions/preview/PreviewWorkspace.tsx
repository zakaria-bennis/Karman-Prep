"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { List, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreviewWorkspaceNavigation {
  returnToQuestion: () => void;
}

/** Keep the real question readable before making room for review tools. */
export function PreviewWorkspace({
  navigationRef,
  questions,
  inspection,
  children,
}: {
  navigationRef?: Ref<PreviewWorkspaceNavigation>;
  questions: (returnToQuestion: () => void) => ReactNode;
  inspection: ReactNode;
  children: ReactNode;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [returnRequest, setReturnRequest] = useState(0);
  const listId = useId();
  const inspectionId = useId();
  const question = useRef<HTMLElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const hasInspection = Boolean(inspection);
  const hadInspection = useRef(false);
  function returnToQuestion() {
    setListOpen(false);
    setReturnRequest((request) => request + 1);
  }
  useImperativeHandle(navigationRef, () => ({ returnToQuestion }));
  // Focus and scroll after React closes the list and renders the selected item.
  // This also works when a jump reopens the same question or the list is closed.
  useLayoutEffect(() => {
    if (returnRequest === 0) return;
    question.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 1279px)").matches) {
      question.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [returnRequest]);
  useEffect(() => {
    if (window.matchMedia("(max-width: 1535px)").matches) {
      if (hasInspection) inspector.current?.focus();
      else if (hadInspection.current) question.current?.focus();
    }
    hadInspection.current = hasInspection;
  }, [hasInspection]);

  return (
    <div className="min-h-0 flex-1">
      <div className="flex flex-wrap gap-2 px-3 pt-3 xl:hidden">
        <button
          type="button"
          aria-expanded={listOpen}
          aria-controls={listId}
          onClick={() => setListOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-bronze px-3 text-sm font-medium"
        >
          {listOpen ? (
            <X className="h-4 w-4" aria-hidden />
          ) : (
            <List className="h-4 w-4" aria-hidden />
          )}
          {listOpen ? "Hide question list" : "Browse questions"}
        </button>
        {hasInspection && (
          <a
            href={`#${inspectionId}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-bronze px-3 text-sm"
          >
            Open inspection
          </a>
        )}
      </div>
      <div
        className={cn(
          "grid min-h-0 gap-3 px-3 py-3 xl:grid-cols-[14rem_minmax(0,1fr)]",
          hasInspection && "2xl:grid-cols-[14rem_minmax(0,1fr)_18rem]"
        )}
      >
        <div
          id={listId}
          className={cn(
            "min-h-0 min-w-0 xl:sticky xl:top-20 xl:row-span-2 xl:block",
            !listOpen && "hidden"
          )}
        >
          <div className="h-[min(36rem,70dvh)]">{questions(returnToQuestion)}</div>
        </div>
        <section
          ref={question}
          tabIndex={-1}
          aria-label="Question workspace"
          className="flex min-h-0 min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-xl border border-bronze bg-night outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {children}
        </section>
        {hasInspection && (
          <section
            ref={inspector}
            tabIndex={-1}
            id={inspectionId}
            aria-label="Question inspection"
            className="min-h-0 min-w-0 scroll-mt-20 outline-none focus-visible:ring-2 focus-visible:ring-gold xl:col-start-2 2xl:sticky 2xl:top-20 2xl:col-start-auto 2xl:max-h-[80dvh] 2xl:overflow-y-auto"
          >
            <button
              type="button"
              onClick={returnToQuestion}
              className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium 2xl:hidden"
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
              Back to question
            </button>
            {inspection}
          </section>
        )}
      </div>
    </div>
  );
}
