"use client";

// TEMPORARY (2026-11-10): a panel for the founder to try options for the home page's opening, live, and
// pick. It is never shown in production. Each choice is one attribute on <html> (data-in, data-btn,
// data-bar, data-read, data-sky), read from the address bar before first paint by LAB_BOOT, and styled in
// styles/painted-lab.css. When he has picked, the winners move into painted.css and this file, its styles
// and its two lines in page.tsx are deleted.
import { useEffect, useState } from "react";
import "@/app/(site)/styles/painted-lab.css";

const GROUPS = [
  {
    key: "in",
    name: "Headline entrance",
    reload: true,
    options: ["Now", "Rise", "Brush", "Mist", "Wind"],
  },
  { key: "btn", name: "Start free button", options: ["Now", "Sunlit", "Flood", "Cream"] },
  { key: "bar", name: "Top bar", options: ["Now", "One pill", "Soft veil", "Links pill"] },
  { key: "read", name: "Small text", options: ["Now", "Bolder", "Glow", "Both"] },
  { key: "sky", name: "Sky", options: ["Now", "Sunrise", "Deep sunrise"] },
] as const;

export const LAB_BOOT = `try{var q=new URLSearchParams(location.search),d=document.documentElement;["in","btn","bar","read","sky","lab","hold"].forEach(function(k){var v=q.get(k);if(v)d.dataset[k]=v});if(q.get("in"))sessionStorage.removeItem("karman:claim-seen")}catch(e){}`;

/** Option 4 arrives letter by letter, so each letter needs its own box. */
function splitLetters() {
  let c = 0;
  for (const el of document.querySelectorAll<HTMLElement>(".claim h1 .w > span")) {
    const text = el.textContent ?? "";
    el.setAttribute("aria-label", text);
    el.textContent = "";
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--c", String(c++));
      s.style.setProperty("--r", ((Math.sin(c * 12.9898) * 43758.5453) % 1).toFixed(2));
      s.textContent = ch;
      el.append(s);
    }
  }
  document.documentElement.dataset.split = "1";
}

export default function HomeLab() {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = document.documentElement.dataset;
    const now: Record<string, string> = {};
    for (const g of GROUPS) now[g.key] = d[g.key] ?? "0";
    setPicked(now);
    if (d.in === "4") splitLetters();
    /* the entrance waits for the page's own typefaces, so it is never played to an empty screen.
       ?hold=1 waits for a click instead, so a film strip can start at the first frame. */
    const go = () => (document.documentElement.dataset.go = "1");
    if (d.hold) document.addEventListener("click", go, { once: true });
    else void document.fonts.ready.then(() => setTimeout(go, 60));
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
                {g.options.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    data-on={(picked[g.key] ?? "0") === String(i) || undefined}
                    onClick={() => pick(g.key, String(i), "reload" in g)}
                  >
                    {i ? `${i}. ${label}` : label}
                  </button>
                ))}
              </div>
            </div>
          ))
        : null}
      {open ? (
        <button
          type="button"
          className="lab-replay"
          onClick={() => pick("in", picked.in ?? "0", true)}
        >
          Replay the entrance
        </button>
      ) : null}
    </aside>
  );
}
