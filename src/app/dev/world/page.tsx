"use client";

// /dev/world: the portals' endless world alone, as a demo (founder, 2026-11-15: "a full demo preview").
// Nothing of the portal is on top yet. A bar at the bottom tours the lands, sets the sky and the weather.
// The same things can be set in the address, to open the page on one view:
//   ?land=reef     hold one land everywhere (the names are in src/lib/flight/world.ts)
//   ?z=40          start the flight at that distance
//   ?sky=0.5       hold the sky that far through its opening twenty minutes (0 dawn or sunset, 1 day or night)
//   ?night=1       dark mode
//   ?wx=cloudy|rain|mist|snow   the weather
//   ?speed=12      fly that many times faster
//   ?bar=0         no bar (for pictures)
//   ?look=1        one of the three looks the founder is choosing between: 0 clear, 1 warm, 2 misty
//                  (shader.ts, LOOK); it goes once he has picked
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";
import { LANDS, STRETCH, landIndex } from "@/lib/flight/world";
import styles from "./world.module.css";

const WEATHER = {
  clear: { cloud: 0, rain: 0, mist: 0, snow: 0 },
  cloudy: { cloud: 0.9, rain: 0, mist: 0, snow: 0 },
  rain: { cloud: 0.95, rain: 1, mist: 0.25, snow: 0 },
  mist: { cloud: 0.4, rain: 0, mist: 1, snow: 0 },
  snow: { cloud: 0.8, rain: 0, mist: 0.2, snow: 1 },
} as const;
type Weather = keyof typeof WEATHER;

/** The skies the bar offers: the founder's rule (each mode opens, then settles over twenty minutes), or one
 *  moment held. `dark` is the mode it needs, `settled` how far through the twenty minutes it is held. */
const SKIES = {
  live: { label: "Live", dark: null, settled: undefined },
  dawn: { label: "Dawn", dark: false, settled: 0 },
  day: { label: "Day", dark: false, settled: 1 },
  sunset: { label: "Sunset", dark: true, settled: 0 },
  night: { label: "Night", dark: true, settled: 1 },
} as const;
type Sky = keyof typeof SKIES;

const TOUR = 12;
const title = (name: string) => name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
interface View {
  land?: string;
  settled?: number;
  speed?: number;
  from?: number;
  look?: number;
}
const hooks = () => window as unknown as { __where?: () => number; __world?: (to: View) => void };

function World() {
  const q = useSearchParams();
  const wxQ = q.get("wx");
  const skyQ = q.get("sky");
  const [sky, setSky] = useState<Sky>("live");
  const [dark, setDark] = useState(q.get("night") === "1");
  const [wx, setWx] = useState<Weather>(
    wxQ !== null && wxQ in WEATHER ? (wxQ as Weather) : "clear"
  );
  const [speed, setSpeed] = useState(Number(q.get("speed")) || 1);
  const [held, setHeld] = useState<string | null>(q.get("land"));
  const [where, setWhere] = useState("");

  const isDark = SKIES[sky].dark ?? dark;
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [isDark]);

  /* the view the page opened on goes to the engine once; later changes are sent to the running engine,
     so the picture never has to start again */
  const settled = sky === "live" ? (skyQ === null ? undefined : Number(skyQ)) : SKIES[sky].settled;
  const [first] = useState<View>(() => ({
    land: held ?? undefined,
    settled,
    speed,
    from: q.get("z") === null ? undefined : Number(q.get("z")),
    look: Number(q.get("look")) || 0,
  }));
  useEffect(() => {
    hooks().__world?.({ land: held ?? undefined, settled, speed });
  }, [held, settled, speed]);

  /* which land is under the camera now; and the flight rests when nobody touches the page, so nudge it */
  useEffect(() => {
    const tick = () => {
      const d = hooks().__where?.();
      if (d !== undefined) setWhere(held ?? LANDS[landIndex(Math.floor((d + 1) / STRETCH))].name);
      window.dispatchEvent(new Event("pointermove"));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [held]);

  const next = () => {
    const d = hooks().__where?.() ?? 0;
    setHeld(null);
    hooks().__world?.({ settled, speed, from: (Math.floor(d / STRETCH) + 1) * STRETCH + 0.6 });
  };

  const weather = WEATHER[wx];
  return (
    <div className="kp-shell" style={{ minHeight: "100dvh" }}>
      <PortalFlight sky={() => weather} world={first} />
      {q.get("bar") !== "0" && (
        <div className={styles.bar} role="group" aria-label="World demo controls">
          <p className={styles.where} aria-live="polite">
            <span>Now flying over</span>
            <strong>{where ? title(where) : "…"}</strong>
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={next}>
              Next land
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={speed > 1}
              onClick={() => setSpeed(speed > 1 ? 1 : TOUR)}
            >
              Fast tour
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={held !== null}
              onClick={() => setHeld(held === null ? where || null : null)}
            >
              Stay here
            </button>
          </div>
          <div className={styles.row}>
            {(Object.keys(SKIES) as Sky[]).map((k) => (
              <button
                key={k}
                type="button"
                className={styles.btn}
                aria-pressed={sky === k}
                onClick={() => {
                  setSky(k);
                  const mode = SKIES[k].dark;
                  if (mode !== null) setDark(mode);
                }}
              >
                {SKIES[k].label}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            {(Object.keys(WEATHER) as Weather[]).map((k) => (
              <button
                key={k}
                type="button"
                className={styles.btn}
                aria-pressed={wx === k}
                onClick={() => setWx(k)}
              >
                {title(k)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorldDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <World />
    </Suspense>
  );
}
