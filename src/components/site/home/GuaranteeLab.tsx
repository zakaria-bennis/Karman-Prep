"use client";

// TEMPORARY (2026-11-10): the guarantee as the founder described it: the headline, one sentence, "Karman"
// signed the way he signs it, a +200 stamp that is stamped onto the page, and three cards that float in.
// The panel switches where the cards come from (data-gua: 1 from below, 2 from the side; 0 is today's flip
// tiles). Never shown in production. Styles are in
// styles/guarantee-lab.css. The winner replaces ScoreTiles.tsx; this file goes.
import { useEffect, useRef, useState } from "react";
import "@/app/(site)/styles/guarantee-lab.css";

interface Props {
  /** The three outcomes, as [name, line]. */
  outcomes: [string, string][];
  words: Record<"line" | "signed" | "stamp" | "stampUnit" | "stampRing", string>;
}

const LAYOUTS = [
  ["0", "Today"],
  ["1", "Cards from below"],
  ["2", "Cards from the side"],
] as const;
/** "Karman" as the founder signs it (traced by hand from the picture he sent on 2026-11-10): a tall K whose
    leg sweeps away underneath, and the rest of the word as one quick run of waves. */
function Signature({ name }: { name: string }) {
  return (
    <p className="gua-sig" role="img" aria-label={name}>
      <svg viewBox="130 0 850 380" aria-hidden="true">
        <path className="pen" d="M172 20 C 177 110, 179 200, 158 334" />
        <path
          className="pen"
          d="M333 22 C 280 102, 222 188, 163 270 C 186 234, 230 186, 268 186 C 304 187, 322 250, 360 300 C 398 345, 470 358, 585 348"
        />
        <path
          className="brush"
          d="M478 228 C 450 218, 415 240, 412 258 C 412 272, 440 268, 470 250 C 492 236, 510 224, 520 226 C 512 236, 500 250, 510 252 C 540 240, 580 214, 600 218 C 585 232, 560 252, 572 252 C 610 236, 660 208, 690 212 C 672 226, 650 244, 664 244 C 700 228, 758 206, 790 212"
        />
        <path
          className="tail"
          d="M786 212 C 806 220, 826 221, 860 216 C 900 212, 930 222, 950 230"
        />
      </svg>
    </p>
  );
}

/** A round ink stamp, a little worn, that lands on the page when the section comes into view. */
function Stamp({ words }: { words: Props["words"] }) {
  return (
    <div className="gua-stamp" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <filter id="gua-worn" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".8"
              numOctaves="2"
              seed="7"
              result="n"
            />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" result="d" />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.5"
              result="holes"
            />
            <feComposite in="d" in2="holes" operator="in" />
          </filter>
          <path id="gua-ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
        </defs>
        <g filter="url(#gua-worn)">
          <circle cx="100" cy="100" r="94" />
          <circle className="thin" cx="100" cy="100" r="60" />
          <text className="ring">
            <textPath href="#gua-ring" startOffset="0">
              {`${words.stampRing} · ${words.stampRing} · `}
            </textPath>
          </text>
          <text className="big" x="100" y="112" textAnchor="middle">
            {words.stamp}
          </text>
          <text className="unit" x="100" y="136" textAnchor="middle">
            {words.stampUnit}
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function GuaranteeLab({ outcomes, words }: Props) {
  const [layout, setLayout] = useState("0");
  const host = useRef<HTMLDivElement>(null);
  /* play the arrival again: back to the waiting state for a moment, then in */
  const replay = () => {
    const el = host.current;
    if (!el) return;
    el.classList.remove("on");
    setTimeout(() => el.classList.add("on"), 120);
  };
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const g = q.get("gua") ?? "0";
    document.documentElement.dataset.gua = g;
    setLayout(g);
  }, []);
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("gua", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.gua = v;
    setLayout(v);
    replay();
  };

  return (
    <>
      <div className="gua rv" ref={host}>
        <div className="gua-say">
          <p className="gua-line">{words.line}</p>
          <div className="gua-signed">
            <Signature name={words.signed} />
            <Stamp words={words} />
          </div>
        </div>
        <ul className="gua-cards">
          {outcomes.map(([name, line], i) => (
            <li key={name} style={{ "--k": i } as React.CSSProperties}>
              <b>{name}</b>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lab" aria-label="Options to try">
        <b>Guarantee: where the cards come from</b>
        <div>
          {LAYOUTS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={layout === v || undefined}
              onClick={() => pick(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={replay}>
          Play the stamp again
        </button>
      </aside>
    </>
  );
}
