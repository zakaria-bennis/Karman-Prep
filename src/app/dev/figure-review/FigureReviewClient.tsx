"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QuizPane from "./QuizPane";
import type { Decision, QueueState, ReviewItem } from "./review-data";

const POLL_MS = 10_000;
const API = "/dev/figure-review/api";

interface Done {
  id: string;
  round: number;
  fileSha256: string;
  decision: Exclude<Decision, "undo">;
}

async function post(body: object): Promise<string | null> {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? `could not save (${res.status})`;
  } catch {
    return "could not reach the dev server";
  }
}

export default function FigureReviewClient({ initial }: { initial: QueueState }) {
  const [queue, setQueue] = useState(initial);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<Done[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as QueueState;
      setQueue(next);
      // Ids decided here stay hidden only until the server stops listing them.
      setHidden((h) => new Set([...h].filter((id) => next.items.some((i) => i.id === id))));
    } catch {
      /* the next poll tries again */
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const items = useMemo(() => queue.items.filter((i) => !hidden.has(i.id)), [queue, hidden]);
  const current: ReviewItem | undefined = items.find((i) => i.id === focusId) ?? items[0];
  const waiting = items.length;
  const pending = undoStack.filter((d) => hidden.has(d.id));
  const approved = queue.counts.approved + pending.filter((d) => d.decision === "approved").length;
  const rejected = queue.counts.rejected + pending.filter((d) => d.decision === "rejected").length;

  const record = useCallback(
    async (item: ReviewItem, decision: Done["decision"], text = "") => {
      const done: Done = { id: item.id, round: item.round, fileSha256: item.fileSha256, decision };
      setHidden((h) => new Set(h).add(item.id));
      setFocusId(null);
      setUndoStack((s) => [...s, done]);
      setMessage({
        text: `${decision === "approved" ? "Approved" : "Rejected"} ${item.id} · U to undo`,
      });
      const error = await post({ ...done, note: text });
      if (error) {
        setUndoStack((s) => s.filter((d) => d !== done));
        setHidden((h) => {
          const next = new Set(h);
          next.delete(item.id);
          return next;
        });
        setMessage({ text: `${item.id}: ${error}`, error: true });
        void refresh();
      }
    },
    [refresh]
  );

  const approve = useCallback(() => {
    if (current) void record(current, "approved");
  }, [current, record]);

  const openReject = useCallback(() => {
    if (!current) return;
    setNote("");
    setNoteOpen(true);
  }, [current]);

  const saveReject = useCallback(() => {
    if (!current || !note.trim()) return;
    setNoteOpen(false);
    void record(current, "rejected", note.trim());
  }, [current, note, record]);

  const undo = useCallback(async () => {
    const last = undoStack.at(-1);
    if (!last) return;
    setUndoStack((s) => s.slice(0, -1));
    const error = await post({ ...last, decision: "undo" });
    if (error) {
      setMessage({ text: `Undo ${last.id}: ${error}`, error: true });
      return;
    }
    setMessage({
      text: `Undid ${last.decision === "approved" ? "approval" : "rejection"} of ${last.id}`,
    });
    setFocusId(last.id);
    await refresh();
    setHidden((h) => {
      const next = new Set(h);
      next.delete(last.id);
      return next;
    });
  }, [undoStack, refresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (noteOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setNoteOpen(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          saveReject();
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "j") {
        e.preventDefault();
        approve();
      } else if (key === "f") {
        e.preventDefault();
        openReject();
      } else if (key === "u") {
        e.preventDefault();
        void undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [noteOpen, approve, openReject, saveReject, undo]);

  return (
    <main className="min-h-screen bg-night pb-28 text-ivory">
      <header className="sticky top-0 z-20 border-b border-bronze/60 bg-night/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-base font-semibold">Figure review</h1>
          <p className="text-sm tabular-nums text-taupe" data-testid="figure-review-counts">
            <span className="text-ivory">{waiting} waiting</span> · {approved} approved · {rejected}{" "}
            rejected (in rework)
          </p>
          <p className="hidden text-xs text-taupe md:block">J approve · F reject · U undo</p>
        </div>
      </header>

      {current ? (
        <section className="mx-auto max-w-[1800px] px-4 pt-5 sm:px-8" data-figure-id={current.id}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="font-mono text-xs text-taupe">{current.id}</span>
            <span className="text-taupe">Round {current.round}</span>
            <span className="text-success-bright">Key: {current.correctAnswer || "none"}</span>
            {current.submittedBy ? (
              <span className="text-taupe">from {current.submittedBy}</span>
            ) : null}
          </div>
          {current.previousNote !== null ? (
            <p className="mb-4 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
              <span className="font-semibold text-warning-bright">Your note last round: </span>
              {current.previousNote || "(no note)"}
            </p>
          ) : null}
          {current.reviewerNote ? (
            <p className="mb-4 text-sm text-taupe">Reviewer: {current.reviewerNote}</p>
          ) : null}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <figure className="overflow-auto rounded-xl border border-bronze bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/dev/figure-review/files/${current.id}/original.png`}
                alt={`Original source image for ${current.id}`}
                className="mx-auto h-auto max-w-full"
              />
            </figure>
            <QuizPane key={`${current.id}:${current.fileSha256}`} q={current.question} />
          </div>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <span className="relative flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-gold/60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
          </span>
          <p className="text-lg text-ivory">Waiting for the next figures…</p>
          <p className="text-sm text-taupe">
            New ones appear here on their own. Nothing to do for now.
          </p>
        </section>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-bronze/60 bg-night/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-2">
          {noteOpen ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveReject();
              }}
            >
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="What should the reviewer fix? Enter saves, Esc cancels"
                aria-label="Rejection note for the reviewer"
                className="min-w-0 flex-1 rounded-lg border border-bronze bg-surface px-3 py-2 text-sm text-ivory placeholder:text-taupe focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                disabled={!note.trim()}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-night disabled:opacity-40"
              >
                Save
              </button>
            </form>
          ) : null}
          <div className="flex items-center gap-2 pl-12">
            <button
              type="button"
              onClick={approve}
              disabled={!current || noteOpen}
              className="flex-1 rounded-lg bg-success px-4 py-3 text-sm font-semibold text-night disabled:opacity-40 sm:flex-none sm:px-8"
            >
              Approve <kbd className="ml-1 hidden font-mono text-xs opacity-70 sm:inline">J</kbd>
            </button>
            <button
              type="button"
              onClick={openReject}
              disabled={!current || noteOpen}
              className="flex-1 rounded-lg border border-error px-4 py-3 text-sm font-semibold text-error-bright disabled:opacity-40 sm:flex-none sm:px-8"
            >
              Reject <kbd className="ml-1 hidden font-mono text-xs opacity-70 sm:inline">F</kbd>
            </button>
            <button
              type="button"
              onClick={() => void undo()}
              disabled={!undoStack.length || noteOpen}
              className="rounded-lg border border-bronze px-4 py-3 text-sm text-taupe disabled:opacity-40"
            >
              Undo <kbd className="ml-1 hidden font-mono text-xs opacity-70 sm:inline">U</kbd>
            </button>
            <p
              role="status"
              className={`ml-2 hidden min-w-0 truncate text-xs sm:block ${message?.error ? "text-error-bright" : "text-taupe"}`}
            >
              {message?.text}
            </p>
          </div>
          {message?.error ? (
            <p className="text-xs text-error-bright sm:hidden">{message.text}</p>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
