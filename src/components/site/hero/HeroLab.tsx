"use client";

// TEMPORARY (2026-11-13): the opening of the SAT Program page and of the Private tutoring page. The live
// landscape behind the page performs it (lib/flight: the same scene, light and detail, nothing drawn on top),
// and the headline arrives in step. Four versions for the founder to choose from; a row of buttons at the
// bottom of the hero switches between them on the dev server only. Everywhere else the first one plays.
//   1 Descent  the camera sinks out of the sky, through the cloud deck, into the valley; the headline
//              condenses out of the cloud
//   2 Sunrise  the sun climbs over the ridge and light floods the valley (at night the northern lights
//              surge); the headline is lit as the light reaches it
//   3 Flock    the valley's own birds fly out of the distance and past the reader; the headline is blown in
//   4 Mist     the valley lies under thick mist that drains away down the water; the headline surfaces
// This component names the opening it wants in data-intro on the page (SiteFlight.tsx starts it) and waits a
// moment for the landscape to say it has begun, so both move together. If the landscape cannot draw, or
// motion is reduced, the headline simply arrives.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Arrow } from "@/components/site/parts";

const PICK = process.env.NODE_ENV !== "production";
const NAMES = ["Descent", "Sunrise", "Flock", "Mist"];

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
  const [kind, setKind] = useState(1);
  /** Counts each time the opening starts; the headline is re-keyed so its entrance replays. */
  const [go, setGo] = useState(0);

  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks) return;
    ks.dataset.intro = String(kind);
    let begun = false;
    const begin = () => {
      begun = true;
      setGo((n) => n + 1);
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
  }, [kind]);

  return (
    <section
      className="pg-hero hx"
      data-hero={kind}
      data-page={page}
      data-go={go || undefined}
      id="top"
    >
      <div className="mist" aria-hidden="true" />
      <div className="pg-in" key={go}>
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
      {PICK ? (
        <p className="hx-pick">
          {NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={kind === i + 1}
              onClick={() =>
                kind === i + 1 ? document.dispatchEvent(new Event("karman:intro")) : setKind(i + 1)
              }
            >
              {i + 1} {name}
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
}
