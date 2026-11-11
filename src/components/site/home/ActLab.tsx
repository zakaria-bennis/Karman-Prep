"use client";

// TEMPORARY, development builds only: two choices the founder is making on the live page.
//   - The colour of the Start free buttons in light mode (sets --go; ink is today's).
//   - Which of twelve versions of the signature's "arman" to keep (tells Guarantee.tsx).
// Once he picks, the colour moves into painted.css, the one signature path stays, and this file goes.
import { useEffect, useState } from "react";

const DAY = [
  ["Ink (today)", ""],
  ["Midnight navy", "#1f2f52"],
  ["Cobalt", "#2449b8"],
  ["Deep teal", "#0f5d63"],
  ["Forest", "#1f4b3a"],
  ["Plum", "#4b2547"],
  ["Oxblood", "#6f2531"],
  ["Terracotta", "#a84a2a"],
  ["Burnt orange", "#b85a14"],
  ["Slate", "#3a4756"],
  ["Chocolate", "#4a3226"],
  ["Royal purple", "#4a2f8f"],
] as const;

export default function ActLab() {
  const [day, setDay] = useState(0);
  const [sig, setSig] = useState(1);
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks) return;
    if (DAY[day][1]) ks.style.setProperty("--go", DAY[day][1]);
    else ks.style.removeProperty("--go");
  }, [day]);
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("karman:sig", { detail: sig }));
  }, [sig]);
  return (
    <div className="lab-pick" role="group" aria-label="Choices to make">
      <span>Day button</span>
      {DAY.map(([name, hex], k) => (
        <button
          key={name}
          type="button"
          aria-pressed={day === k}
          aria-label={name}
          title={name}
          onClick={() => setDay(k)}
        >
          <i style={{ background: hex || "#1d1a22" }} />
        </button>
      ))}
      <hr />
      <span>Signature</span>
      {Array.from({ length: 12 }, (_, k) => (
        <button
          key={k}
          type="button"
          className="num"
          aria-pressed={sig === k}
          onClick={() => setSig(k)}
        >
          {k + 1}
        </button>
      ))}
    </div>
  );
}
