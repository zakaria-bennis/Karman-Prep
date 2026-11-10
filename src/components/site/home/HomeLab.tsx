"use client";

// TEMPORARY (2026-11-10): a panel for the founder to try the options still open for the home page's opening (top bar, small text, sky), live, and
// pick. It is never shown in production. Each choice is one attribute on <html> (data-bar, data-read, data-sky), read from the address bar before first paint by LAB_BOOT, and styled in
// styles/painted-lab.css. When he has picked, the winners move into painted.css and this file, its styles
// and its two lines in page.tsx are deleted.
import { useEffect, useState } from "react";
import "@/app/(site)/styles/painted-lab.css";

const GROUPS = [
  {
    key: "bar",
    name: "Top bar",
    options: [
      ["0", "Now"],
      ["1", "One pill"],
      ["2", "Soft veil"],
      ["3", "Links pill"],
    ],
  },
  {
    key: "read",
    name: "Small text",
    options: [
      ["0", "Now"],
      ["1", "Bolder"],
      ["2", "Glow"],
      ["3", "Both"],
    ],
  },
  {
    key: "sky",
    name: "Sky",
    options: [
      ["0", "Now"],
      ["1", "Sunrise"],
      ["2", "Deep sunrise"],
    ],
  },
] as const;

export const LAB_BOOT = `try{var q=new URLSearchParams(location.search),d=document.documentElement;["bar","read","sky","lab"].forEach(function(k){var v=q.get(k);if(v)d.dataset[k]=v})}catch(e){}`;

export default function HomeLab() {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = document.documentElement.dataset;
    const now: Record<string, string> = {};
    for (const g of GROUPS) now[g.key] = d[g.key] ?? "0";
    setPicked(now);
  }, []);

  const pick = (key: string, value: string, reload?: boolean) => {
    const url = new URL(location.href);
    url.searchParams.set(key, value);
    if (reload) {
      scrollTo(0, 0);
      location.assign(url.toString());
      return;
    }
    history.replaceState(null, "", url);
    document.documentElement.dataset[key] = value;
    setPicked((p) => ({ ...p, [key]: value }));
  };

  return (
    <aside className="lab" data-open={open || undefined} aria-label="Options to try">
      <button type="button" className="lab-tab" onClick={() => setOpen(!open)}>
        {open ? "Hide options" : "Options"}
      </button>
      {open
        ? GROUPS.map((g) => (
            <div key={g.key} className="lab-row">
              <b>{g.name}</b>
              <div>
                {g.options.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    data-on={(picked[g.key] ?? "0") === value || undefined}
                    onClick={() => pick(g.key, value, "reload" in g)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))
        : null}
    </aside>
  );
}
