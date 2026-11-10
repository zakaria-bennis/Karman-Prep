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
    options: [
      ["0", "Now"],
      ["1", "Rise"],
      ["3", "Mist"],
      ["4", "Wind"],
      ["2", "Flip"],
      ["5", "Horizon"],
    ],
  },
  {
    key: "btn",
    name: "Start free button",
    options: [
      ["0", "Now"],
      ["1", "Sunlit"],
      ["2", "Flood"],
      ["3", "Cream"],
    ],
  },
  {
    key: "tint",
    name: "Button colour",
    options: [
      ["0", "Ink"],
      ["1", "Plum"],
      ["2", "Pine"],
      ["3", "Ember"],
      ["4", "Sun"],
    ],
  },
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

export const LAB_BOOT = `try{var q=new URLSearchParams(location.search),d=document.documentElement;["in","btn","tint","bar","read","sky","lab","hold"].forEach(function(k){var v=q.get(k);if(v)d.dataset[k]=v});if(q.get("in"))sessionStorage.removeItem("karman:claim-seen")}catch(e){}`;

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
