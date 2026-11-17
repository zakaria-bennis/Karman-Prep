"use client";

// Schedule: where a Private student, or their parent, books and moves sessions and sees the hours
// they have left (founder, 2026-11-16; the rules are in scheduleData.ts).
//   The hours   the student's own character, the number of hours left, a bead for every hour
//               (free, booked, used) and a button to add hours, paid for on the spot.
//   Next        the next session, a clock counting down to it, Join from five minutes before, and
//               Move and Cancel.
//   The pane    booking (or moving) a session, or a past session's recording and notes.
//   Sessions    what is booked, and what is behind.
// On first opening a banner offers the family's own calendar. Sessions are a stand-in held in
// memory: no real session is booked, moved or synced from here yet. Buying hours is real (Stripe;
// see SchedulePay.tsx), and the hours bought are added to the stand-in.
// To look at its states: ?pack=10 (Private 10), ?soon=3 (next session in 3 minutes), ?soon=-4
// (already begun), ?empty=1 (no hours left), ?full=1 (the tutor has nothing open).
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useClock } from "./homeworkMotion";
import lib from "./library.module.css";
import Book from "./ScheduleBook";
import { Changes, Hours, Next, Past, SyncOffer } from "./ScheduleBits";
import Pay, { warm } from "./SchedulePay";
import { arrive, flash, press } from "./scheduleMotion";
import { clock, doorOf, hours, lengthText, todOf, type Pack, type Session } from "./scheduleData";
import { schedule, split, useSchedule } from "./scheduleStore";
import { tick } from "./sound";
import styles from "./schedule.module.css";

type Pane = { kind: "book" } | { kind: "move"; id: string } | { kind: "past"; id: string };

function Row({
  session,
  open,
  fresh,
  onPress,
  children,
}: {
  session: Session;
  open: boolean;
  fresh: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (fresh) flash(el.current);
  }, [fresh]);
  const date = new Date(session.start);
  return (
    <li ref={el} className={styles.item} data-open={open || undefined}>
      <button type="button" aria-expanded={open} onClick={onPress}>
        <span className={styles.date} data-tod={todOf(session.start)}>
          <small>{date.toLocaleDateString("en-US", { weekday: "short" })}</small>
          <b>{date.getDate()}</b>
          <small>{date.toLocaleDateString("en-US", { month: "short" })}</small>
        </span>
        <span className={styles.what}>
          <b>
            {clock(session.start)}, {lengthText(session.minutes)}
          </b>
          <small>
            {session.state === "missed"
              ? "Missed"
              : session.focus.length > 0
                ? session.focus.join(", ")
                : (session.note ??
                  (session.state === "done" ? "Recording and notes" : "Open session"))}
          </small>
        </span>
        {session.weekly && <i>Weekly</i>}
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M9.500 6.500L15 12l-5.500 5.500" />
        </svg>
      </button>
      {open && children}
    </li>
  );
}

export default function Schedule({ onGo }: { onGo: (page: "homework" | "chat") => void }) {
  const q = useSearchParams();
  const pack: Pack = q.get("pack") === "10" ? "private-10" : "private-20";
  const soon = q.get("soon");
  const empty = q.get("empty") === "1";
  const full = q.get("full") === "1";
  const now = useClock();
  const first = useRef(now);
  useEffect(() => {
    schedule.start(pack, first.current, {
      soon: soon === null ? undefined : Number(soon),
      empty,
      full,
    });
  }, [pack, soon, empty, full]);

  const { account, sync, fresh } = useSchedule();
  const { upcoming, past } = split(account, now);
  const h = hours(account);
  const [pane, setPane] = useState<Pane>({ kind: "book" });
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [cheer, setCheer] = useState(0);
  const [paying, setPaying] = useState(false);
  // the payment is made ready now, so its buttons are there the moment hours are wanted
  useEffect(warm, []);

  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current) arrive(root.current);
  }, []);
  // the pane is brought into view when it changes to something asked for (on a phone it is below)
  const paneEl = useRef<HTMLElement>(null);
  const show = (next: Pane) => {
    setPane(next);
    window.requestAnimationFrame(() =>
      paneEl.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  };
  useEffect(() => {
    if (fresh.length === 0) return;
    const timer = window.setTimeout(schedule.seen, 1200);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  const next = upcoming[0];
  const moving =
    pane.kind === "move" ? (account.sessions.find((s) => s.id === pane.id) ?? null) : null;
  const viewed = pane.kind === "past" ? account.sessions.find((s) => s.id === pane.id) : undefined;
  const move = (session: Session) => show({ kind: "move", id: session.id });
  const rest = next && doorOf(next, now) !== "over" ? upcoming.slice(1) : upcoming;
  const list = tab === "upcoming" ? rest : past;

  return (
    <div className={`${lib.library} ${styles.schedule}`} ref={root}>
      <SyncOffer sync={sync} />

      <section className={`${lib.glass} ${styles.left}`} aria-label="Hours" data-arrive>
        <Hours
          left={h.left}
          booked={h.booked}
          used={h.used}
          account={account}
          cheer={cheer}
          onBuy={() => setPaying(true)}
        />
      </section>

      <section
        className={`${lib.glass} ${styles.next}`}
        aria-label="Next session"
        data-tod={next ? todOf(next.start) : undefined}
        data-arrive
      >
        {next ? (
          <Next account={account} session={next} now={now} onMove={move} />
        ) : (
          <div className={styles.when}>
            <h2>Nothing booked</h2>
          </div>
        )}
      </section>

      <section
        className={`${lib.glass} ${styles.pane}`}
        ref={paneEl}
        aria-label="Booking"
        data-arrive
      >
        {viewed ? (
          <Past
            key={viewed.id}
            session={viewed}
            now={now}
            onDone={() => setPane({ kind: "book" })}
            onHomework={() => onGo("homework")}
          />
        ) : (
          <Book
            key={moving?.id ?? "new"}
            account={account}
            now={now}
            moving={moving}
            full={full}
            onBooked={() => setCheer((n) => n + 1)}
            onMoved={() => setPane({ kind: "book" })}
            onBuy={() => setPaying(true)}
            onChat={() => onGo("chat")}
          />
        )}
      </section>

      <section className={`${lib.glass} ${styles.list}`} aria-label="Sessions" data-arrive>
        <div className={styles.tabs} role="tablist">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={(e) => {
                tick();
                press(e.currentTarget);
                setTab(t);
                setOpenRow(null);
              }}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className={styles.blank}>
            {tab === "upcoming"
              ? next
                ? "Nothing else is booked."
                : "No sessions booked yet."
              : "Sessions you have had will be listed here, with their recordings."}
          </p>
        ) : (
          <ul className={styles.items}>
            {list.map((session) => (
              <Row
                key={session.id}
                session={session}
                fresh={fresh.includes(session.id)}
                open={
                  tab === "upcoming"
                    ? openRow === session.id
                    : pane.kind === "past" && pane.id === session.id
                }
                onPress={() => {
                  tick();
                  if (tab === "past") return show({ kind: "past", id: session.id });
                  setOpenRow(openRow === session.id ? null : session.id);
                }}
              >
                {tab === "upcoming" && (
                  <Changes account={account} session={session} now={now} onMove={move} />
                )}
              </Row>
            ))}
          </ul>
        )}
      </section>

      {paying && (
        <Pay
          onPaid={(bought) => {
            schedule.buy(bought);
            setCheer((n) => n + 1);
          }}
          onClose={() => setPaying(false)}
        />
      )}
    </div>
  );
}
