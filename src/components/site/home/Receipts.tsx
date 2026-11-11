"use client";

// The receipts: a plain list of students (where they started, where they finished, the gain, how long it
// took, where they went) beside the orange phone, which shows the text conversation behind the lit row. The
// light slides down the list one row every six seconds while the phone pans slowly down that conversation.
// Tapping a row holds it; tapping it again lets the list move on (founder, 2026-11-10). The heading and the
// rows together are exactly as tall as the phone (painted.css, .rcp). Without scripts, under reduced motion,
// or when the painting is held still, nothing moves by itself: the first row is lit, any row can be tapped,
// and the conversation scrolls by hand.
import { useEffect, useRef, useState, type ReactNode } from "react";
import PhoneFrame from "@/components/site/PhoneFrame";
import type { Receipt } from "@/lib/marketing/receipts";

const HOLD_MS = 6000;

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function Receipts({
  headline,
  headingId,
  rows,
}: {
  headline: ReactNode;
  headingId: string;
  rows: Receipt[];
}) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [seen, setSeen] = useState(false);
  /* true when the last move was a tap: the light then slides half as fast again (painted.css) */
  const [tapped, setTapped] = useState(false);
  /* counts each fresh six seconds, so a released row gets its full time again */
  const [run, setRun] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* the light moves down the rows that are showing at this width */
  useEffect(() => {
    if (held || !seen || still()) return;
    const id = setTimeout(() => {
      const items = [...(list.current?.children ?? [])] as HTMLElement[];
      let next = active;
      for (let k = 1; k <= items.length; k++) {
        const i = (active + k) % items.length;
        if (items[i].offsetParent) {
          next = i;
          break;
        }
      }
      setTapped(false);
      setActive(next);
      setRun((r) => r + 1);
    }, HOLD_MS);
    return () => clearTimeout(id);
  }, [active, held, seen, run]);

  /* the phone pans down the conversation while its row is lit */
  useEffect(() => {
    const el = thread.current;
    const screen = el?.parentElement;
    if (!el || !screen || !seen || still()) return;
    const over = el.scrollHeight - screen.clientHeight;
    if (over <= 0) return;
    const pan = el.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${-over}px)` }],
      {
        duration: HOLD_MS - 1900,
        delay: 1100,
        easing: "cubic-bezier(.45, 0, .25, 1)",
        fill: "forwards",
      }
    );
    return () => pan.cancel();
  }, [active, seen, run]);

  const tap = (i: number) => {
    setTapped(true);
    if (i === active && held) {
      setHeld(false);
      setRun((r) => r + 1);
    } else {
      setActive(i);
      setHeld(true);
    }
  };

  const now = rows[active];
  return (
    <div
      className="rcp rv"
      ref={host}
      data-held={held || undefined}
      data-tapped={tapped || undefined}
    >
      <div className="rcp-side">
        <h2 id={headingId}>{headline}</h2>
        <ol
          className="rcp-list"
          ref={list}
          style={{ "--rows": rows.length, "--at": active } as React.CSSProperties}
        >
          {rows.map((r, i) => (
            <li key={r.name} style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                className={i === active ? "on" : undefined}
                aria-pressed={i === active && held}
                onClick={() => tap(i)}
              >
                <b>{r.name}</b>
                <span className="home">{r.home}</span>
                <span className="num">
                  {r.start} <i aria-hidden="true">→</i>
                  <span className="vh"> to </span> {r.end}
                </span>
                <span className="gain num">+{r.end - r.start}</span>
                <span className="wk">
                  {r.weeks}
                  <span> weeks</span>
                </span>
                <span className="at">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logos */}
                  <img src={`/site/schools/${r.school}.svg`} alt={r.schoolName} decoding="async" />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="rcp-phone">
        <PhoneFrame>
          <div className="scr-host">
            <div className="scr txt">
              <div className="txt-status" aria-hidden="true">
                <b>9:41</b>
                <svg viewBox="0 0 68 14">
                  <path d="M1 10h2.6v3H1zM5.4 7.6H8V13H5.4zM9.8 5h2.6v8H9.8zM14.2 2.2h2.6V13h-2.6z" />
                  <path d="M30.5 3.1c2.4 0 4.6.9 6.3 2.5l1-1.1A10.5 10.5 0 0 0 30.5 1.5c-2.8 0-5.3 1.1-7.3 3l1 1.1a9 9 0 0 1 6.3-2.5zm0 3.3c1.5 0 2.9.6 4 1.6l1-1.1a7.3 7.3 0 0 0-10 0l1 1.1c1.1-1 2.5-1.6 4-1.6zm0 3.3a2.6 2.6 0 0 0-1.8.7l1.8 2 1.8-2a2.6 2.6 0 0 0-1.8-.7z" />
                  <rect
                    x="43.5"
                    y="1.5"
                    width="20"
                    height="11"
                    rx="3.2"
                    fill="none"
                    stroke="currentColor"
                    opacity=".4"
                  />
                  <rect x="45.2" y="3.2" width="16.6" height="7.6" rx="1.8" />
                  <path d="M65 5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" opacity=".45" />
                </svg>
              </div>
              <div className="txt-view">
                <div className="txt-thread" key={active} ref={thread}>
                  <small>
                    <b>iMessage</b>
                    <br />
                    Today 9:41 AM
                  </small>
                  {now.texts.map((t, k) => {
                    const mine = t.from === "karman";
                    /* the last bubble of a run carries the tail, as on a phone */
                    const tail = now.texts[k + 1]?.from !== t.from;
                    return (
                      <p
                        key={k}
                        className={
                          [mine ? "me" : "", tail ? "tail" : ""].filter(Boolean).join(" ") ||
                          undefined
                        }
                      >
                        {t.text}
                      </p>
                    );
                  })}
                </div>
              </div>
              <div className="txt-top">
                <svg className="txt-back" viewBox="0 0 12 20" aria-hidden="true">
                  <path d="M10 2 2 10l8 8" />
                </svg>
                <span className="txt-face" aria-hidden="true">
                  {now.name.replace(/[^A-Z]/g, "").slice(-1) || now.name[0]}
                </span>
                <b>
                  {now.name}
                  <svg viewBox="0 0 8 12" aria-hidden="true">
                    <path d="m2 2 4 4-4 4" />
                  </svg>
                </b>
                <svg className="txt-video" viewBox="0 0 28 18" aria-hidden="true">
                  <rect x="1" y="1.5" width="17" height="15" rx="4" />
                  <path d="m19.5 7 6-3.6v11.2l-6-3.6z" />
                </svg>
              </div>
              <div className="txt-bar" aria-hidden="true">
                <i>
                  <svg viewBox="0 0 20 20">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </i>
                <span>
                  iMessage
                  <svg viewBox="0 0 14 20">
                    <rect x="4" y="1" width="6" height="11" rx="3" />
                    <path d="M1.5 9.500a5.5 5.5 0 0 0 11 0M7 15v4" fill="none" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
