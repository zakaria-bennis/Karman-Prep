"use client";

// TEMPORARY, development builds only: three layouts of the home page's footer for the founder to choose
// from (styles/foot.css). The buttons set data-foot on the footer; the choice is kept for the visit. Once
// he picks, this file and the other two layouts are deleted.
import { useEffect, useState } from "react";

const LAYOUTS = [
  ["a", "A"],
  ["b", "B"],
  ["c", "C"],
] as const;

export default function FootPicker() {
  const [at, setAt] = useState("a");

  useEffect(() => {
    const asked = new URLSearchParams(location.search).get("footer");
    const kept = sessionStorage.getItem("karman-foot");
    const first = [asked, kept].find((v) => LAYOUTS.some(([k]) => k === v));
    if (first) setAt(first);
  }, []);

  useEffect(() => {
    document.querySelector(".ks .ft")?.setAttribute("data-foot", at);
    sessionStorage.setItem("karman-foot", at);
  }, [at]);

  return (
    <div className="foot-pick" role="group" aria-label="Footer layout">
      <span>Footer</span>
      {LAYOUTS.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={at === k} onClick={() => setAt(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}
