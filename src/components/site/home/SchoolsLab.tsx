"use client";

// TEMPORARY (2026-11-10): three other ways to show the universities, for the founder to pick from, with a
// small panel to switch between them. It is never shown in production. The choice is data-sch on <html>
// (0 is today's two drifting rows), read from the address bar; the styles are in styles/schools-lab.css.
// When he has picked, the winner replaces Logos.tsx and this file and its styles are deleted.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { School } from "@/lib/marketing/schools";
import "@/app/(site)/styles/schools-lab.css";

const OPTIONS = [
  ["0", "Today"],
  ["1", "A. Counted"],
  ["2", "B. Changing wall"],
  ["3", "C. Clouds"],
  ["4", "D. Roll call"],
  ["5", "E. Spotlight"],
  ["6", "F. Lanterns"],
] as const;
const TOP = 12;
const PLACES = 10;

function Logo({ school }: { school: School }) {
  return (
    <img
      src={`/site/schools/${school.logo}.svg`}
      alt={school.name}
      loading="lazy"
      decoding="async"
    />
  );
}

/** 1. The twelve land one at a time and are counted; the rest sit quietly underneath. */
function Counted({ schools }: { schools: School[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.classList.add("go");
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(TOP);
        let k = 0;
        timer = window.setInterval(() => {
          setN(++k);
          if (k >= TOP) clearInterval(timer);
        }, 170);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="sch sch-counted" ref={ref}>
      <div className="sch-band">
        <p className="sch-tally" aria-hidden="true">
          <b>{n}</b> for <b>{n}</b>
        </p>
        <ul className="sch-twelve">
          {schools.slice(0, TOP).map((s, i) => (
            <li key={s.name} data-in={i < n || undefined}>
              <Logo school={s} />
            </li>
          ))}
        </ul>
        <div className="sch-behind">
          <p className="sch-more-label">And right behind them</p>
          <ul className="sch-rest">
            {schools.slice(TOP).map((s) => (
              <li key={s.name}>
                <Logo school={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** 2. Ten places on one band. One place at a time, a school fades out and another comes into focus. */
function Wall({ schools }: { schools: School[] }) {
  const [shown, setShown] = useState(() => schools.slice(0, PLACES).map((_, i) => i));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = -1;
    const timer = window.setInterval(() => {
      const el = ref.current;
      if (!el || document.hidden || document.documentElement.dataset.sch !== "2") return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      setShown((now) => {
        let place = Math.floor(Math.random() * PLACES);
        if (place === last) place = (place + 1) % PLACES;
        last = place;
        const free = schools.map((_, i) => i).filter((i) => !now.includes(i));
        const next = [...now];
        next[place] = free[Math.floor(Math.random() * free.length)];
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [schools]);
  return (
    <div className="sch sch-wall" ref={ref}>
      <ul className="sch-band sch-places">
        {shown.map((i, place) => (
          <li key={place}>
            <span key={schools[i].name}>
              <Logo school={schools[i]} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 3. No band at all: every logo on its own small cloud, drifting a little in the sky. */
function Clouds({ schools }: { schools: School[] }) {
  return (
    <ul className="sch sch-clouds rv">
      {schools.map((s, i) => (
        <li key={s.name} data-big={i < TOP || undefined} style={{ "--k": i } as CSSProperties}>
          <Logo school={s} />
        </li>
      ))}
    </ul>
  );
}

/** 4. No logos: the names themselves, set large like the headline, coming into focus one after another. */
function RollCall({ schools }: { schools: School[] }) {
  return (
    <p className="sch sch-roll rv">
      {schools.map((s, i) => (
        <span key={s.name} data-big={i < TOP || undefined} style={{ "--k": i } as CSSProperties}>
          {s.name}.{" "}
        </span>
      ))}
    </p>
  );
}

/** 5. One school large and in focus, all thirty small beside it; the focus moves from one to the next. */
function Spotlight({ schools }: { schools: School[] }) {
  const [at, setAt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = ref.current;
      if (!el || document.hidden || document.documentElement.dataset.sch !== "5") return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      setAt((n) => (n + 1) % schools.length);
    }, 1900);
    return () => clearInterval(timer);
  }, [schools.length]);
  return (
    <div className="sch sch-spot sch-band" ref={ref}>
      <div className="sch-spot-big">
        <span key={at}>
          <Logo school={schools[at]} />
        </span>
      </div>
      <ul className="sch-spot-all">
        {schools.map((s, i) => (
          <li key={s.name} data-on={i === at || undefined}>
            <button type="button" onClick={() => setAt(i)} aria-label={s.name}>
              <Logo school={s} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 6. Each logo on a small lit lantern, rising slowly out of the trees and away into the sky. */
function Lanterns({ schools }: { schools: School[] }) {
  return (
    <ul className="sch sch-lanterns">
      {schools.map((s, i) => (
        <li
          key={s.name}
          data-big={i < TOP || undefined}
          style={
            {
              "--x": `${((i * 5) % 6) * 15.5 + 2 + (i % 2) * 3}%`,
              "--t": "24s",
              "--d": `${-(i * 0.8).toFixed(1)}s`,
              "--sway": `${((i * 13) % 5) * 8 - 16}px`,
            } as CSSProperties
          }
        >
          <Logo school={s} />
        </li>
      ))}
    </ul>
  );
}

export default function SchoolsLab({ schools }: { schools: School[] }) {
  const [picked, setPicked] = useState("0");
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("sch") ?? "0";
    document.documentElement.dataset.sch = v;
    setPicked(v);
  }, []);
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("sch", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.sch = v;
    setPicked(v);
  };
  return (
    <>
      <Counted key={`c${picked}`} schools={schools} />
      <Wall schools={schools} />
      <Clouds schools={schools} />
      <RollCall schools={schools} />
      <Spotlight schools={schools} />
      <Lanterns schools={schools} />
      <aside className="lab" aria-label="Options to try">
        <b>Schools section: tap an option to see it on the page</b>
        <div>
          {OPTIONS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={picked === v || undefined}
              onClick={() => pick(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
