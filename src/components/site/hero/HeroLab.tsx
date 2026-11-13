"use client";

// The opening of the SAT Program page and of the Private tutoring page (founder's pick, 2026-11-13).
// The live landscape behind the page performs it (lib/flight): the sun climbs over the ridge and the mist in
// the valley drains away; at night the northern lights surge. The headline starts hidden in fog, which
// clears off it to either side in about two seconds, and each word warms as the light reaches it. The fog
// takes the colour of the hour: warm white by day, blue-grey by night.
// This component asks for the opening with data-intro on the page (SiteFlight.tsx starts it) and waits a
// moment for the landscape to say it has begun, so both move together. If the landscape cannot draw, or
// motion is reduced, the headline simply arrives.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Arrow } from "@/components/site/parts";

/** One bank of fog: soft noise, coloured by the page's mode (hero.css sets flood-color). */
function Fog({ seed }: { seed: number }) {
  const id = `hx-fog-${seed}`;
  return (
    <svg className="hx-fog" aria-hidden="true">
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.007 0.013" numOctaves="5" seed={seed} />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -0.5" result="shape" />
        <feFlood className="hx-fog-ink" />
        <feComposite in2="shape" operator="in" />
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

export default function HeroLab({
  page,
  headline,
  primary,
  secondary,
  children,
}: {
  page: "program" | "private";
  headline: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Shown under the buttons (the Program page's promise switch). */
  children?: ReactNode;
}) {
  /** Set once the opening starts; until then the words wait unseen. */
  const [go, setGo] = useState(false);

  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks) return;
    ks.dataset.intro = "1";
    let begun = false;
    const begin = () => {
      begun = true;
      setGo(true);
    };
    document.addEventListener("karman:opened", begin);
    // the landscape may be slow, missing or held still: the headline does not wait long for it
    const fallback = setTimeout(() => !begun && begin(), 1400);
    document.dispatchEvent(new Event("karman:intro"));
    return () => {
      clearTimeout(fallback);
      document.removeEventListener("karman:opened", begin);
      delete ks.dataset.intro;
    };
  }, []);

  return (
    <section className="pg-hero hx" data-page={page} data-go={go || undefined} id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in">
        <div className="hx-say">
          <h1 aria-label={headline}>
            {headline.split(" ").map((word, i) => (
              <span
                key={`${word}${i}`}
                className="hx-w"
                aria-hidden="true"
                data-num={/\d/.test(word) || undefined}
                style={{ "--i": i } as CSSProperties}
              >
                {word}{" "}
              </span>
            ))}
            <span className="hx-fogs" aria-hidden="true">
              <Fog seed={4} />
              <Fog seed={11} />
            </span>
          </h1>
          <div className="hx-go">
            <a className="btn" href={primary.href}>
              <span className="lb">{primary.label}</span>
              <span className="go">
                <Arrow />
              </span>
            </a>
            <a className="more" href={secondary.href}>
              {secondary.label}
            </a>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
