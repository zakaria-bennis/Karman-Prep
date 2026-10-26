"use client";

// The study tools, as a small row of cards that slides: swipe on a phone, the two arrows on a computer.
// Each card shows the tool working, drawn in code (live/screens.ts, TOOLS). Words from site-copy.ts (6).
import { useRef } from "react";
import { pairs, section } from "@/lib/marketing/site-copy";
import { TOOLS } from "../live/screens";
import { Drawn } from "../parts";

const UI = [TOOLS.wordline, TOOLS.flashcards, TOOLS.wordlab, TOOLS.challenge];

export default function ToolsCarousel() {
  const f = section(6);
  const track = useRef<HTMLUListElement>(null);
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
          <h2 className="rv">{f.headline}</h2>
          {f.text ? <p className="lede rv">{f.text}</p> : null}
        </div>
        <div className="tools-nav">
          <button type="button" aria-label="Previous tool" onClick={() => go(-1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" />
            </svg>
          </button>
          <button type="button" aria-label="Next tool" onClick={() => go(1)}>
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
        <li className="tool chat-card">
          <b>{f["chat title"]}</b>
          <span>{f["chat text"]}</span>
        </li>
      </ul>
    </div>
  );
}
