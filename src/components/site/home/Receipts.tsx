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
import { schoolByLogo } from "@/lib/marketing/schools";
import SchoolLogo from "./SchoolLogo";

const HOLD_MS = 6000;

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function Receipts({
  headline,
  note,
  headingId,
  rows,
}: {
  headline: ReactNode;
  /** Shown under the heading while the rows are samples. */
  note?: string;
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
        {note ? <p className="rcp-note">{note}</p> : null}
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
                  <SchoolLogo
                    school={schoolByLogo(r.school) ?? { name: r.schoolName, logo: r.school }}
                    alt={r.schoolName}
                  />
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
                <svg viewBox="0 0 80 14">
                  <path d="M1 9.6h3v3.4H1zM5.8 7.2h3V13h-3zM10.6 4.600h3V13h-3zM15.4 1.800h3V13h-3z" />
                  <path d="M35 3.200c2.7 0 5.2 1 7.1 2.800l1.2-1.300A12 12 0 0 0 35 1.300c-3.2 0-6.1 1.3-8.3 3.400L27.9 6A10.2 10.2 0 0 1 35 3.200zm0 3.700c1.7 0 3.3.7 4.5 1.800l1.2-1.300a8.3 8.3 0 0 0-11.4 0l1.2 1.300A6.5 6.5 0 0 1 35 6.900zm0 3.700c-.8 0-1.5.300-2 .800l2 2.2 2-2.200c-.5-.5-1.2-.8-2-.8z" />
                  <rect x="51" y="1" width="25" height="12" rx="3.8" />
                  <path
                    d="M77.4 4.800v4.400c.9-.3 1.6-1.2 1.6-2.200s-.7-1.9-1.6-2.200z"
                    opacity=".45"
                  />
                </svg>
              </div>
              <div className="txt-view">
                <div className="txt-thread" key={active} ref={thread}>
                  <small>
                    <span>iMessage</span>
                    <span>
                      <svg viewBox="0 0 12 15">
                        <path d="M3.2 6V4.300a2.8 2.8 0 0 1 5.6 0V6h.400c.9 0 1.6.7 1.6 1.600v4.800c0 .9-.7 1.6-1.6 1.600H2.800c-.9 0-1.6-.7-1.6-1.600V7.600C1.2 6.7 1.9 6 2.8 6zm1.5 0h2.600V4.300a1.3 1.3 0 0 0-2.6 0z" />
                      </svg>
                      Encrypted
                    </span>
                  </small>
                  <small>
                    <span>
                      <b>Today</b> 9:41 AM
                    </span>
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
                  {now.texts.at(-1)?.from === "karman" ? (
                    <small className="txt-read">
                      <span>
                        <b>Read</b> 9:41 AM
                      </span>
                    </small>
                  ) : null}
                </div>
              </div>
              <div className="txt-top">
                <i className="txt-back" aria-hidden="true">
                  <svg viewBox="0 0 12 20">
                    <path d="M10 2 2 10l8 8" />
                  </svg>
                </i>
                <span className="txt-face" aria-hidden="true">
                  {now.name
                    .split(/\s+/)
                    .map((w) => w.replace(/[^A-Za-z]/g, "")[0] ?? "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <b>
                  <span>{now.name}</span>
                  <svg viewBox="0 0 8 14" aria-hidden="true">
                    <path d="m1.5 1.5 5 5.5-5 5.5" />
                  </svg>
                </b>
                <i className="txt-video" aria-hidden="true">
                  <svg viewBox="0 0 30 20">
                    <rect x="1.2" y="1.8" width="18.6" height="16.4" rx="4.6" />
                    <path d="m20.8 8.2 6.3-4.100c.7-.4 1.7 0 1.7.900v10c0 .900-1 1.3-1.7.900l-6.3-4.1" />
                  </svg>
                </i>
              </div>
              <div className="txt-bar" aria-hidden="true">
                <i>
                  <svg viewBox="0 0 20 20">
                    <path d="M10 3v14M3 10h14" />
                  </svg>
                </i>
                <span>
                  iMessage
                  <svg viewBox="0 0 22 16">
                    <path d="M2 6.500v3M6.5 4v8M11 1.500v13M15.5 4v8M20 6.500v3" />
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
