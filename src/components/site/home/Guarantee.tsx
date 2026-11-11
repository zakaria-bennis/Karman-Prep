"use client";

// The guarantee, kept short (founder, 2026-11-10): one sentence, a
// +200 stamp that is brought down hard at the top right, level with the headline, and the three outcomes on cards that slide in
// from the side. Everything else about the guarantee is one link away. The arrival plays when the section
// scrolls into view (the site's "rv" then "on" classes, painted.css). When the stamp lands, the headline gives
// a short jolt.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { arman, SIG_STYLES } from "./signature";

/** How long after the stamp starts to fall it hits the page: 52% of .gua-stamp's .75s (painted.css). */
const IMPACT_MS = 390;

export interface GuaranteeWords {
  /** The one sentence. */
  line: string;
  /** What the signature says, for screen readers. */
  signed: string;
  /** The stamp: its number, the word under it, and the words round its edge. */
  stamp: string;
  stampUnit: string;
  stampRing: string;
}

/** "Karman" as the founder signs it, traced by hand from the picture he sent, then set lower and wider at
    his request so it takes little height: a K whose leg sweeps away under the whole word, and the rest as
    one quick run of waves. It is simply there, never drawn on. */
function Signature({ name }: { name: string }) {
  /* TEMPORARY: the founder is choosing between twelve versions (SigLab.tsx sends the number) */
  const [n, setN] = useState(1);
  useEffect(() => {
    const pick = (e: Event) => setN((e as CustomEvent<number>).detail);
    document.addEventListener("karman:sig", pick);
    return () => document.removeEventListener("karman:sig", pick);
  }, []);
  const style = SIG_STYLES[n] ?? SIG_STYLES[1];
  return (
    <p className="gua-sig" role="img" aria-label={name}>
      <svg viewBox="130 118 850 196" aria-hidden="true">
        <path className="pen" pathLength={1} d="M176 128 C 179 170, 178 232, 162 300" />
        <path
          className="pen"
          pathLength={1}
          d="M312 150 C 314 132, 298 126, 284 140 C 256 172, 214 222, 166 266 C 190 240, 232 212, 268 212 C 304 213, 322 250, 360 274 C 400 298, 470 306, 590 302 C 720 298, 850 290, 958 278"
        />
        <path
          className="brush"
          pathLength={1}
          style={{ strokeWidth: style.pen }}
          d={arman(style)}
        />
        <path
          className="tail"
          pathLength={1}
          d="M786 212 C 806 220, 826 221, 860 216 C 900 212, 930 222, 950 230"
        />
      </svg>
    </p>
  );
}

/** One small moving picture per outcome: the arrow in the bullseye, the coin cut in two, the whole coin coming home. */
const PICS: ReactNode[] = [
  <>
    <circle className="p-ring" cx="22" cy="26" r="17" />
    <circle className="p-ring" cx="22" cy="26" r="10" />
    <circle className="p-fill" cx="22" cy="26" r="3.6" />
    <g className="p-arrow">
      <path className="p-line" d="M22 26L42 6M36 5h7v7" />
    </g>
  </>,
  <>
    <g className="p-half-l">
      <path className="p-fill" d="M22 8a16 16 0 0 0 0 32z" />
    </g>
    <g className="p-half-r">
      <path className="p-ring" d="M26 8a16 16 0 0 1 0 32z" />
      <path className="p-line" d="M32 30l6 6M38 30v6h-6" />
    </g>
  </>,
  <>
    <g className="p-home">
      <circle className="p-fill" cx="24" cy="22" r="14" />
      <path className="p-cut" d="M24 14v16M19 18h7.500a3 3 0 0 1 0 6H20.500a3 3 0 0 0 0 6H29" />
    </g>
    <path className="p-line p-loop" pathLength={1} d="M6 30a19 19 0 0 0 36 4M42 42v-8h-8" />
  </>,
];

export default function Guarantee({
  outcomes,
  words,
}: {
  /** The three outcomes, as [name, line]. */
  outcomes: [string, string][];
  words: GuaranteeWords;
}) {
  /* the stamp's fall has begun: at the moment it lands, jolt the words */
  const landed = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "gua-stamp") return;
    const stamp = e.currentTarget;
    setTimeout(() => stamp.closest(".offer")?.classList.add("hit"), IMPACT_MS);
  };

  return (
    <div className="gua rv">
      <div className="gua-say">
        <p className="gua-line">{words.line}</p>
      </div>
      {/* the stamp sits at the top right of the section, level with its headline (painted.css) */}
      <div className="gua-stamp" aria-hidden="true" onAnimationStart={landed}>
        <svg viewBox="0 0 200 200">
          <defs>
            {/* ink that did not take everywhere: a rough edge and a few bare patches */}
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
              <textPath href="#gua-ring">{`${words.stampRing} · ${words.stampRing} · `}</textPath>
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
      <ul className="gua-cards">
        {outcomes.map(([name, line], i) => (
          <li key={name} style={{ "--k": i } as CSSProperties}>
            <svg className="gua-pic" viewBox="0 0 48 48" aria-hidden="true">
              {PICS[i % PICS.length]}
            </svg>
            <b>{name}</b>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {/* the signature closes the section, right above the link to the full guarantee */}
      <Signature name={words.signed} />
    </div>
  );
}
