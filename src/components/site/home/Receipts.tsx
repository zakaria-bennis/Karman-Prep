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
    <div className="rcp rv" ref={host} data-held={held || undefined}>
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
              <div className="txt-top">
                <span className="txt-face" aria-hidden="true">
                  {now.name.replace(/[^A-Z]/g, "").slice(-1) || now.name[0]}
                </span>
                <b>{now.name}</b>
              </div>
              <div className="txt-view">
                <div className="txt-thread" key={active} ref={thread}>
                  <small>Text Message</small>
                  {now.texts.map((t, k) => (
                    <p key={k} className={t.from === "karman" ? "me" : undefined}>
                      {t.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
