"use client";

// The Private tutoring page's booking demo. When it scrolls into view it books a session by itself, once:
// a day is pressed, then a time, then Confirm, and the fox celebrates. The booked screen holds for three
// seconds and then the picker comes back, ready for the visitor to try. Touching it at any point stops the
// demo. Nothing is sent anywhere. With reduced motion it does not play; it simply waits to be used.
//
// TEMPORARY (2026-11-12): three motion designs for the founder to choose from, switched by the small row
// under the card on the dev server only (private.css, "motion designs"):
//   1 Bounce  the times bounce in
//   2 Doodles pen doodles draw themselves around the card: an arrow, stars, a loop
//   3 Tickets small coloured session tickets drift behind the card; one flies in when you book
import { useEffect, useRef, useState } from "react";
import FoxCheer, { Confetti } from "./FoxCheer";
import SlotPicker, { fmtTime, longDay, openHours, useDays, type SlotWords } from "./SlotPicker";

export interface DemoWords extends SlotWords {
  confirm: string;
  booked: string;
}

const HOLD = 3000;
const TICKETS = ["Mon 4:00", "Sat 10:00", "Wed 7:00", "Thu 5:00", "Sun 2:00"];
const PICK = process.env.NODE_ENV !== "production";

export default function SessionDemo({ w, today }: { w: DemoWords; today: string }) {
  const days = useDays(today);
  const first = days.slice(1).find((d) => openHours(d, "sessions").length > 2) ?? days[1];
  const [day, setDay] = useState(first);
  const [hour, setHour] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [tap, setTap] = useState<"day" | "hour" | "go" | null>(null);
  const [fx, setFx] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const played = useRef(false);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    played.current = true;
    setTap(null);
  };

  useEffect(() => {
    const el = box.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // the demo's day: the third bookable one, and its second open time
    const able = days.slice(1).filter((d) => openHours(d, "sessions").length > 2);
    const target = able[2] ?? able[0] ?? days[0];
    const time = openHours(target, "sessions")[1];
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || played.current) return;
        played.current = true;
        at(900, () => {
          setDay(target);
          setHour(null);
          setTap("day");
        });
        at(2000, () => {
          setHour(time);
          setTap("hour");
        });
        at(3100, () => setTap("go"));
        at(3550, () => {
          setTap(null);
          setDone(true);
        });
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.current.forEach(clearTimeout);
    };
  }, [days]);

  // the booked screen holds, then the picker returns for another go
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setDone(false);
      setHour(null);
    }, HOLD);
    return () => clearTimeout(t);
  }, [done]);

  const when = hour === null ? longDay(day) : `${longDay(day)} · ${fmtTime(hour)}`;

  return (
    <div className="bkw" data-fx={fx} data-done={done || undefined}>
      <svg className="bk-doodle" viewBox="0 0 520 520" aria-hidden="true">
        <path d="M22 150c40-52 96-60 150-30" />
        <path d="M150 104l24 16-27 12" />
        <path d="M455 60l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" />
        <path d="M60 420l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" />
        <path d="M410 470c26-22 60-22 74 0s-22 40-40 22 6-44 40-40" />
      </svg>
      <div className="bk-tix" aria-hidden="true">
        {TICKETS.map((t, i) => (
          <span key={t} style={{ "--n": i } as React.CSSProperties}>
            {t}
          </span>
        ))}
      </div>
      <div className="bk" ref={box} onPointerDown={stop} onKeyDown={stop}>
        {done ? (
          <div className="bk-done" role="status">
            <FoxCheer />
            <h3>{w.booked}</h3>
            <p>{when}</p>
            <span className="bk-hold" />
          </div>
        ) : (
          <>
            <SlotPicker
              days={days}
              kind="sessions"
              day={day}
              hour={hour}
              onDay={(d) => {
                setDay(d);
                setHour(null);
              }}
              onHour={setHour}
              w={w}
              tap={tap === "go" ? null : tap}
            />
            <p className="bk-when" aria-live="polite">
              {when}
            </p>
            <button
              className="bk-go"
              type="button"
              disabled={hour === null}
              data-tap={tap === "go" || undefined}
              onClick={() => setDone(true)}
            >
              {w.confirm}
            </button>
          </>
        )}
        {done ? <Confetti /> : null}
      </div>
      {PICK ? (
        <p className="bk-pick">
          Motion
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={fx === n} onClick={() => setFx(n)}>
              {n}
            </button>
          ))}
        </p>
      ) : null}
    </div>
  );
}
