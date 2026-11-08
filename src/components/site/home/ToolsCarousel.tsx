"use client";

// The study tools: a row of four cards on wide screens, a 2 x 2 grid below 1200 px and one column on
// phones (home.css), so nothing scrolls sideways. The arrows show only if the row ever overflows, and
// each one rests at its end of the row.
// Each card shows the tool working, drawn in code (live/screens.ts, TOOLS). Words from site-copy.ts (6).
import { useEffect, useRef, useState } from "react";
import { pairs, section } from "@/lib/marketing/site-copy";
import { TOOLS } from "../live/screens";
import { Drawn, Kinetic } from "../parts";

const UI = [TOOLS.wordline, TOOLS.flashcards, TOOLS.wordlab, TOOLS.challenge];

export default function ToolsCarousel() {
  const f = section(6);
  const track = useRef<HTMLUListElement>(null);
  const [nav, setNav] = useState({ show: false, atStart: true, atEnd: false });
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const sync = () => {
      const max = t.scrollWidth - t.clientWidth;
      setNav({ show: max > 2, atStart: t.scrollLeft <= 2, atEnd: t.scrollLeft >= max - 2 });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(t);
    t.addEventListener("scroll", sync, { passive: true });
    return () => {
      ro.disconnect();
      t.removeEventListener("scroll", sync);
    };
  }, []);
  const go = (dir: number) => {
    const t = track.current;
    const card = t?.querySelector("li");
    if (!t || !card) return;
    t.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  };
  return (
    <div className="tools-wrap">
      <div className="tools-head">
        <div>
          <h2 className="rv kin">
            <Kinetic text={f.headline} />
          </h2>
          {f.text ? <p className="lede rv">{f.text}</p> : null}
        </div>
        <div className="tools-nav" hidden={!nav.show}>
          <button
            type="button"
            aria-label="Previous tool"
            disabled={nav.atStart}
            onClick={() => go(-1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" />
            </svg>
          </button>
          <button type="button" aria-label="Next tool" disabled={nav.atEnd} onClick={() => go(1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          </button>
        </div>
      </div>
      <ul className="tools-track media rv" ref={track} aria-label={f.headline}>
        {pairs(f.tools).map(([name, line], k) => (
          <li className="tool" key={name}>
            <Drawn html={UI[k]?.() ?? ""} className="tool-art" aria-hidden />
            <b>{name}</b>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
