"use client";

// /dev/world: the portals' endless world alone, with nothing on top (founder, 2026-11-14: build on a
// blank canvas, the background first). Switches for looking at it while it is built:
//   ?land=reef     hold one land everywhere (the names are in src/lib/flight/world.ts)
//   ?z=40          start the flight at that distance
//   ?sky=0.5       hold the sky that far through its opening twenty minutes (0 dawn or sunset, 1 day or night)
//   ?night=1       dark mode
//   ?wx=cloudy|rain|mist|snow   the weather
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";

const WEATHER: Record<string, { cloud: number; rain: number; mist: number; snow: number }> = {
  cloudy: { cloud: 0.9, rain: 0, mist: 0, snow: 0 },
  rain: { cloud: 0.95, rain: 1, mist: 0.25, snow: 0 },
  mist: { cloud: 0.4, rain: 0, mist: 1, snow: 0 },
  snow: { cloud: 0.8, rain: 0, mist: 0.2, snow: 1 },
};

function World() {
  const q = useSearchParams();
  const night = q.get("night") === "1";
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", night ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [night]);
  const wx = WEATHER[q.get("wx") ?? ""];
  const z = q.get("z");
  const sky = q.get("sky");
  const land = q.get("land");
  const world = useMemo(
    () => ({
      from: z === null ? undefined : Number(z),
      land: land ?? undefined,
      settled: sky === null ? undefined : Number(sky),
    }),
    [z, sky, land]
  );
  return (
    <div className="kp-shell" style={{ minHeight: "100dvh" }}>
      <PortalFlight sky={wx ? () => wx : undefined} world={world} />
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
