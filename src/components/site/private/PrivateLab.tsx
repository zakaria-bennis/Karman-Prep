"use client";

// TEMPORARY (2026-11-12): the Private tutoring page as a mix-and-match board. The founder asked for five
// full versions and said he would mix sections between them, so each of the page's four sections comes in
// five designs, and a panel (development server only) picks one design per section. `?mix=1234` in the
// address sets all four at once (hero, calendar, pricing, close). A live build shows design 1 of each and
// no panel. When he has chosen, each section keeps its one design and this file and the others go.
import { useEffect, useState, type ReactNode } from "react";

export default function PrivateLab({
  sections,
}: {
  sections: { name: string; options: ReactNode[] }[];
}) {
  const dev = process.env.NODE_ENV !== "production";
  const [pick, setPick] = useState<number[]>(() => sections.map(() => 0));
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!dev) return;
    const mix = new URLSearchParams(location.search).get("mix") ?? "";
    if (!/^[1-9]+$/.test(mix)) return;
    setPick(sections.map((s, i) => Math.min(s.options.length, Number(mix[i] ?? mix[0])) - 1));
  }, [dev, sections]);
  /* a design swapped in after the page loaded has to arrive on scroll like the rest: the page's own reveal
     only watches what was there at load */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("on");
          io.unobserve(e.target);
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-lab] .rv:not(.on)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pick]);
  return (
    <>
      {sections.map((s, i) => (
        <div key={s.name} data-lab={s.name}>
          {s.options[pick[i]]}
        </div>
      ))}
      {dev ? (
        <aside className="pl-panel" data-open={open || undefined} aria-label="Design options">
          <button type="button" className="pl-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide options" : "Options"}
          </button>
          {open
            ? sections.map((s, i) => (
                <div key={s.name} role="group" aria-label={s.name}>
                  <b>{s.name}</b>
                  {s.options.map((_, k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={pick[i] === k}
                      onClick={() => setPick((p) => p.map((v, j) => (j === i ? k : v)))}
                    >
                      {k + 1}
                    </button>
                  ))}
                </div>
              ))
            : null}
        </aside>
      ) : null}
    </>
  );
}
