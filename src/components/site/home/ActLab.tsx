"use client";

// TEMPORARY, development builds only: lets the founder try colours for the Start free buttons in dark mode
// (he found marigold too bright). It sets --act on the page; painted.css falls back to cream without it.
// Once he picks, the colour moves into painted.css and this file is deleted.
import { useEffect, useState } from "react";

const COLOURS = [
  ["Cream", ""],
  ["Soft gold", "#e7cf9a"],
  ["Sand", "#dcc3a1"],
  ["Sky", "#a9cdf2"],
  ["Sage", "#b3d6bd"],
  ["Blush", "#efbfae"],
] as const;

export default function ActLab() {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks) return;
    if (COLOURS[at][1]) ks.style.setProperty("--act", COLOURS[at][1]);
    else ks.style.removeProperty("--act");
  }, [at]);
  return (
    <div className="lab-pick" role="group" aria-label="Night button colour">
      <span>Night button</span>
      {COLOURS.map(([name, hex], k) => (
        <button
          key={name}
          type="button"
          aria-pressed={at === k}
          aria-label={name}
          title={name}
          onClick={() => setAt(k)}
        >
          <i style={{ background: hex || "#fffaf3" }} />
        </button>
      ))}
    </div>
  );
}
