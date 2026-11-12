"use client";

// A deck of portal screens that turns by itself, like the SAT Program page's parent-portal deck
// (program/PortalDeck.tsx), but for any portal: the school view on /schools and the tutor's dashboard on
// /for-tutors. The cards are drawn on the server and come in as children; this only turns them. Pointing at
// the deck holds it, and the dots pick a card. Under reduced motion, or when the landscape is held still, it
// turns only when a dot is pressed. It reuses the deck's look from program.css (.pd).
import { useEffect, useRef, useState, type ReactNode } from "react";

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

export default function TurnDeck({
  titles,
  captions,
  brand,
  who,
  initials,
  sample,
  cards,
}: {
  /** One tab name per card, shown in the portal's top bar. */
  titles: string[];
  captions: string[];
  /** The portal's own chrome: its name, and whose portal it is. */
  brand: string;
  who: string;
  initials: string;
  /** The line under the deck saying the data is made up. */
  sample: string;
  cards: ReactNode[];
}) {
  const n = cards.length;
  const [at, setAt] = useState(0);
  const held = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (!held.current && !still() && !document.hidden) setAt((i) => (i + 1) % n);
    }, 4600);
    return () => clearInterval(t);
  }, [n]);
  return (
    <div
      className="pd au-deck"
      onPointerEnter={() => (held.current = true)}
      onPointerLeave={() => (held.current = false)}
    >
      <div className="pd-stack">
        {cards.map((card, i) => {
          const place = (i - at + n) % n;
          return (
            <article key={i} data-place={place > 2 ? "back" : place} aria-hidden={place !== 0}>
              <header>
                <b>{brand}</b>
                <nav>
                  {titles.map((t, j) => (
                    <span key={t} data-on={j === i || undefined}>
                      {t}
                    </span>
                  ))}
                </nav>
                <em>
                  <i>{initials}</i>
                  {who}
                </em>
              </header>
              {card}
            </article>
          );
        })}
      </div>
      <p className="pd-cap" key={at}>
        {captions[at]}
      </p>
      <div className="au-deck-foot">
        <div className="pd-dots">
          {titles.map((t, i) => (
            <button
              key={t}
              type="button"
              aria-label={t}
              aria-pressed={i === at}
              onClick={() => setAt(i)}
            />
          ))}
        </div>
        <p className="au-sample">{sample}</p>
      </div>
    </div>
  );
}
