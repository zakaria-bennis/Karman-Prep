"use client";

// Quiet "Add to your calendar" control. The secret link is only created
// when someone opens the panel, so accounts that never use it have none.

import { useState, useTransition } from "react";
import { getCalendarFeedLinks, resetCalendarFeedLink } from "@/app/dashboard/calendar-feed-actions";
import type { CalendarFeedLinks } from "@/lib/calendar-feed/links";

export interface CalendarSubscribeProps {
  audience: "student" | "parent";
}

const buttonClass =
  "inline-flex min-h-11 items-center rounded-md border border-bronze px-3 text-xs font-semibold text-ivory hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info disabled:opacity-50";
const quietClass =
  "inline-flex min-h-11 items-center text-xs font-semibold text-taupe underline underline-offset-4 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info disabled:opacity-50";

export function CalendarSubscribe({ audience }: CalendarSubscribeProps) {
  const [links, setLinks] = useState<CalendarFeedLinks | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setStatus(null);
    if (next && !links) {
      startTransition(async () => {
        try {
          setLinks(await getCalendarFeedLinks());
          setError(null);
        } catch {
          setError("Your calendar link could not load. Please try again.");
        }
      });
    }
  };

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.feedUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy did not work. Select the link below and copy it.");
    }
  };

  const reset = () => {
    startTransition(async () => {
      try {
        setLinks(await resetCalendarFeedLink({ confirm: true }));
        setConfirmingReset(false);
        setError(null);
        setStatus("New link ready. Calendars using the old link will stop updating.");
      } catch {
        setError("The link could not be reset. Please try again.");
      }
    });
  };

  const intro =
    audience === "parent"
      ? "See your student's sessions, classes and due dates in your own calendar app. It updates on its own."
      : "See your sessions, classes and due dates in your own calendar app. It updates on its own.";

  return (
    <section aria-label="Add to your calendar" className="border-t border-bronze pt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="calendar-subscribe-panel"
        className={quietClass}
      >
        Add to your calendar
      </button>
      {open ? (
        <div id="calendar-subscribe-panel" className="mt-2 space-y-3">
          <p className="text-sm text-taupe">{intro}</p>
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
          {!links && !error ? (
            <p role="status" className="text-xs text-taupe">
              Getting your link…
            </p>
          ) : null}
          {links ? (
            <>
              <div className="flex flex-wrap gap-2">
                <a href={links.webcalUrl} className={buttonClass}>
                  Apple Calendar
                </a>
                <a
                  href={links.googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  Google Calendar
                </a>
                <a
                  href={links.outlookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  Outlook
                </a>
                <button type="button" onClick={copy} className={buttonClass}>
                  Copy link
                </button>
              </div>
              <label className="block text-xs text-taupe">
                Calendar link
                <input
                  readOnly
                  value={links.feedUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 block w-full rounded-md border border-bronze bg-surface px-2 py-2 font-mono text-xs text-ivory"
                />
              </label>
              <p className="text-xs text-taupe">
                {audience === "parent"
                  ? "Anyone with this link can see these events, so keep it private."
                  : "Anyone with this link can see your events. Share it only with a parent or guardian."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {confirmingReset ? (
                  <>
                    <span className="text-xs text-taupe">
                      Reset the link? Calendars using the current one will stop updating.
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                      disabled={pending}
                      className={buttonClass}
                    >
                      Yes, reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      disabled={pending}
                      className={quietClass}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingReset(true);
                      setStatus(null);
                    }}
                    className={quietClass}
                  >
                    Reset link
                  </button>
                )}
              </div>
            </>
          ) : null}
          <p role="status" aria-live="polite" className="text-xs text-taupe">
            {status}
          </p>
        </div>
      ) : null}
    </section>
  );
}
