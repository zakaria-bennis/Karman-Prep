"use client";

// The days and hours left until a date (registration closing), never below zero. The server's count shows
// first and the browser corrects it, then keeps it current. It takes the date and its words as props on
// purpose: importing the site's facts or words here would ship them all to the browser.
import { useEffect, useState } from "react";

const left = (until: string) => {
  const hours = Math.max(0, Math.floor((Date.parse(`${until}T23:59:59`) - Date.now()) / 36e5));
  return [Math.floor(hours / 24), hours % 24] as const;
};

export default function TimeLeft({
  until,
  words,
}: {
  until: string;
  words: [string, string, string];
}) {
  const [[d, h], set] = useState(() => left(until));
  useEffect(() => {
    set(left(until));
    const t = setInterval(() => set(left(until)), 60_000);
    return () => clearInterval(t);
  }, [until]);
  return (
    <p className="pg-timer" suppressHydrationWarning>
      <b className="num">{d}</b> {words[0]} <b className="num">{h}</b> {words[1]}
      <span>{words[2]}</span>
    </p>
  );
}
