"use client";

// Settings, the Account set's last two folders: Calendar sync and Help and support.
//   Calendar sync  the student's own calendar feed (src/app/dashboard/calendar-feed-actions.ts):
//                  sessions, classes and due dates, kept up to date by the calendar app itself.
//                  Apple Calendar subscribes with the webcal:// link, Google Calendar through its
//                  add-by-link page; Copy link for any other app; a new link stops the old one.
//                  The secret link is made the first time the folder opens.
//   Help           report a problem, contact support, and ask for the account to be deleted (an
//                  email to support: nothing is deleted from here, and we confirm by email).
import { useEffect, useState } from "react";
import { getCalendarFeedLinks, resetCalendarFeedLink } from "@/app/dashboard/calendar-feed-actions";
import type { CalendarFeedLinks } from "@/lib/calendar-feed/links";
import { CONTACT } from "@/lib/marketing/offer";
import { usePortalData } from "./portalData";
import { AppleCalendarLogo, GoogleCalendarLogo } from "./ScheduleLogos";
import { Chevron, Group, Row, Say } from "./settingsControls";
import styles from "./settings.module.css";

const STAND_IN: CalendarFeedLinks = {
  feedUrl: "https://karmanprep.com/api/calendar/feed/example.ics",
  webcalUrl: "webcal://karmanprep.com/api/calendar/feed/example.ics",
  googleUrl: "https://calendar.google.com/calendar/render?cid=example",
  outlookUrl: "https://outlook.live.com/calendar/0/addfromweb?url=example",
};

export function Calendars() {
  const real = usePortalData() !== null;
  const [links, setLinks] = useState<CalendarFeedLinks | null>(real ? null : STAND_IN);
  const [said, setSaid] = useState<{ tone: "done" | "problem" | "note"; text: string } | null>(
    null
  );
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!real) return;
    let live = true;
    getCalendarFeedLinks()
      .then((l) => live && setLinks(l))
      .catch(
        () =>
          live && setSaid({ tone: "problem", text: "Your calendar link didn't load. Try again." })
      );
    return () => {
      live = false;
    };
  }, [real]);

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.feedUrl);
      setSaid({ tone: "done", text: "Link copied. Paste it into your calendar app." });
    } catch {
      setSaid({ tone: "problem", text: `Copy didn't work. The link is ${links.feedUrl}` });
    }
  };
  const renew = async () => {
    setBusy(true);
    try {
      if (real) setLinks(await resetCalendarFeedLink({ confirm: true }));
      setSaid({ tone: "done", text: "New link ready. Add your calendar again with it." });
    } catch {
      setSaid({ tone: "problem", text: "The link didn't change. Try again." });
    }
    setBusy(false);
    setSure(false);
  };

  return (
    <>
      <Group title="Sessions, classes and due dates">
        <Row name="Apple Calendar">
          <span className={styles.logo}>
            <AppleCalendarLogo size={24} />
          </span>
          {links && (
            <a className={styles.soft} href={links.webcalUrl}>
              Add
            </a>
          )}
        </Row>
        <Row name="Google Calendar">
          <span className={styles.logo}>
            <GoogleCalendarLogo size={24} />
          </span>
          {links && (
            <a
              className={styles.soft}
              href={links.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Add
            </a>
          )}
        </Row>
        <Row name="Another calendar" note="Paste the link into it">
          {links && (
            <button type="button" className={styles.soft} onClick={() => void copy()}>
              Copy link
            </button>
          )}
        </Row>
        {said && <Say tone={said.tone}>{said.text}</Say>}
      </Group>
      <Group>
        {sure ? (
          <>
            <Say>The old link stops updating your calendars.</Say>
            <div className={styles.pair}>
              <button type="button" className={styles.soft} onClick={() => setSure(false)}>
                Keep this link
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={busy}
                onClick={() => void renew()}
              >
                {busy ? "Making it" : "Make a new link"}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.fold}
            disabled={!links}
            onClick={() => setSure(true)}
          >
            <b>Make a new link</b>
            <Chevron />
          </button>
        )}
      </Group>
    </>
  );
}

export function Help() {
  const real = usePortalData();
  const [sure, setSure] = useState(false);
  const email = real?.email ?? "maya.okafor@example.com";
  const ask = `mailto:${CONTACT.support}?subject=${encodeURIComponent(
    "Delete my account"
  )}&body=${encodeURIComponent(
    `Please delete my Karman account and all my work.\n\nAccount email: ${email}`
  )}`;
  return (
    <>
      <Group>
        <a className={styles.fold} href={`mailto:${CONTACT.support}?subject=A%20problem`}>
          <b>Report a problem</b>
          <Chevron />
        </a>
        <a className={styles.fold} href={`mailto:${CONTACT.support}`}>
          <b>Contact support</b>
          <Chevron />
        </a>
      </Group>
      <Group title="Your data">
        {sure ? (
          <div className={styles.sure}>
            <p>
              Opens your email app. We confirm by email before deleting your account and all your
              work. This can&rsquo;t be undone.
            </p>
            <button type="button" className={styles.soft} onClick={() => setSure(false)}>
              Keep my account
            </button>
            <a className={styles.danger} href={ask} onClick={() => setSure(false)}>
              Ask to delete
            </a>
          </div>
        ) : (
          <button type="button" className={styles.fold} onClick={() => setSure(true)}>
            <b data-danger>Delete my account</b>
            <Chevron />
          </button>
        )}
      </Group>
    </>
  );
}
