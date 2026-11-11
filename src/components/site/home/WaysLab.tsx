"use client";

// TEMPORARY, development builds only: the five layouts of the "seven ways" section the founder asked to
// see (painted.css, .how[data-ways]). 11 lanterns on the water, 15 the museum wall, 18 the stack, 19 the
// dashboard wall, 20 the filmstrip. The switch sets data-ways on the section. Two of them (18 and 20) pin
// the section and move with the scroll, so this also tells the section how far through it the reader is.
// Once he picks, this file and the layouts he passed over are deleted.
import { useEffect, useState } from "react";

const LAYOUTS = ["11", "15", "18", "19", "20"] as const;

export default function WaysLab({ names }: { names: string[] }) {
  const [at, setAt] = useState("19");
  const [card, setCard] = useState(0);

  useEffect(() => {
    const asked = new URLSearchParams(location.search).get("ways");
    const kept = sessionStorage.getItem("karman-ways");
    const first = [asked, kept].find((v) => LAYOUTS.some((k) => k === v));
    if (first) setAt(first);
  }, []);

  useEffect(() => {
    const how = document.getElementById("how");
    if (!how) return;
    how.setAttribute("data-ways", at);
    sessionStorage.setItem("karman-ways", at);
    const cards = [...how.querySelectorAll<HTMLElement>(".ways > li")];
    const onScroll = () => {
      const r = how.getBoundingClientRect();
      const run = r.height - innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
      how.style.setProperty("--wp", p.toFixed(4));
      const now = Math.min(cards.length - 1, Math.floor(p * cards.length * 0.999));
      cards.forEach((c, k) => c.classList.toggle("dealt", at === "18" && k < now));
      setCard(now);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cards.forEach((c) => c.classList.remove("dealt"));
    };
  }, [at]);

  const go = (k: number) => {
    const how = document.getElementById("how");
    if (!how) return;
    const run = how.offsetHeight - innerHeight;
    scrollTo({ top: how.offsetTop + (run * (k + 0.2)) / names.length, behavior: "smooth" });
  };

  return (
    <>
      <div className="ways-tabs" role="group" aria-label="Seven ways">
        {names.map((n, k) => (
          <button key={n} type="button" aria-pressed={k === card} onClick={() => go(k)}>
            <i>{k + 1}</i>
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="lab-pick" role="group" aria-label="Seven ways layout">
        <span>Layout</span>
        {LAYOUTS.map((k) => (
          <button key={k} type="button" aria-pressed={at === k} onClick={() => setAt(k)}>
            {k}
          </button>
        ))}
      </div>
    </>
  );
}
