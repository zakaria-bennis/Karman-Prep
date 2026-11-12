"use client";

// Whole days until a date (registration closing), never below zero. The server's count shows first and the
// browser corrects it. It takes the date as a prop on purpose: importing the site's facts or words here
// would ship them all to the browser.
import { useEffect, useState } from "react";

export default function DaysLeft({ until }: { until: string }) {
  const [days, setDays] = useState(() => count(until));
  useEffect(() => {
    setDays(count(until));
    const t = setInterval(() => setDays(count(until)), 60_000);
    return () => clearInterval(t);
  }, [until]);
  return (
    <b className="num" suppressHydrationWarning>
      {days}
    </b>
  );
}

const count = (until: string) =>
  Math.max(0, Math.ceil((Date.parse(`${until}T23:59:59`) - Date.now()) / 864e5));
