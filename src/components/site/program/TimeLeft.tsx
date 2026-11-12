"use client";

// A ticking countdown to a date (registration closing): days, hours, minutes and seconds, each in its own
// box, the seconds visibly running. The server's count shows first and the browser takes over. It takes
// the date and its words as props on purpose: importing the site's facts or words here would ship them all
// to the browser.
import { useEffect, useState } from "react";

const left = (until: string) => {
  const s = Math.max(0, Math.floor((Date.parse(`${until}T23:59:59`) - Date.now()) / 1000));
  return [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
};

export default function TimeLeft({
  until,
  label,
  units,
}: {
  until: string;
  label: string;
  units: string[];
}) {
  const [parts, set] = useState(() => left(until));
  useEffect(() => {
    set(left(until));
    const t = setInterval(() => set(left(until)), 1000);
    return () => clearInterval(t);
  }, [until]);
  return (
    <div className="pg-clock" role="timer" aria-label={label}>
      <p>{label}</p>
      <ol suppressHydrationWarning>
        {parts.map((v, i) => (
          <li key={units[i]}>
            <b className="num" key={v} suppressHydrationWarning>
              {String(v).padStart(2, "0")}
            </b>
            <span>{units[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
