"use client";

// The guarantee, kept short (founder, 2026-11-10): one sentence, "Karman" signed the way he signs it, a
// +200 stamp that is brought down hard at the top right, level with the headline, and the three outcomes on cards that slide in
// from the side. Everything else about the guarantee is one link away. The arrival plays when the section
// scrolls into view (the site's "rv" then "on" classes, painted.css). When the stamp lands, the headline gives
// a short jolt and a few leaves burst from under it (lib/painting/journey.ts listens for "karman:burst").
import type { CSSProperties } from "react";
import { StampLab, Stamps } from "./Stamps";

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
  return (
    <p className="gua-sig" role="img" aria-label={name}>
      <svg viewBox="130 118 850 196" aria-hidden="true">
        <path className="pen" d="M176 128 C 179 170, 178 232, 162 300" />
        <path
          className="pen"
          d="M300 130 C 262 172, 214 222, 166 266 C 190 240, 232 212, 268 212 C 304 213, 322 250, 360 274 C 400 298, 470 306, 590 302 C 720 298, 850 290, 958 278"
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

export default function Guarantee({
  outcomes,
  words,
}: {
  /** The three outcomes, as [name, line]. */
  outcomes: [string, string][];
  words: GuaranteeWords;
}) {
  /* the stamp's fall has begun: at the moment it lands, jolt the words and ask the painting for leaves */
  const landed = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "gua-stamp") return;
    const stamp = e.currentTarget;
    setTimeout(() => {
      stamp.closest(".offer")?.classList.add("hit");
      const r = stamp.getBoundingClientRect();
      document.dispatchEvent(
        new CustomEvent("karman:burst", {
          detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        })
      );
    }, IMPACT_MS);
  };

  return (
    <div className="gua rv">
      <div className="gua-say">
        <p className="gua-line">{words.line}</p>
        <Signature name={words.signed} />
      </div>
      {/* the stamp sits at the top right of the section, level with its headline (painted.css) */}
      <div className="gua-stamp" aria-hidden="true" onAnimationStart={landed}>
        <Stamps
          words={{
            stamp: words.stamp,
            unit: words.stampUnit,
            ring: words.stampRing,
            brand: words.signed,
          }}
        />
      </div>
      {process.env.NODE_ENV !== "production" ? <StampLab /> : null}
      <ul className="gua-cards">
        {outcomes.map(([name, line], i) => (
          <li key={name} style={{ "--k": i } as CSSProperties}>
            <b>{name}</b>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
