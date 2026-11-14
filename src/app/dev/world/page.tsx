"use client";

// /dev/world: the live landscape alone, as the portal's background, with nothing on top (founder,
// 2026-11-14: build on a blank canvas, the background first). ?p=0.42 holds one spot on the route,
// ?night=1 shows the night, and with neither the page scrolls through the portal's stretch.
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";

const WEATHER: Record<string, { cloud: number; rain: number; mist: number; snow: number }> = {
  clear: { cloud: 0, rain: 0, mist: 0, snow: 0 },
  cloudy: { cloud: 0.9, rain: 0, mist: 0, snow: 0 },
  rain: { cloud: 0.95, rain: 1, mist: 0.25, snow: 0 },
  mist: { cloud: 0.4, rain: 0, mist: 1, snow: 0 },
  snow: { cloud: 0.8, rain: 0, mist: 0.2, snow: 1 },
};

function World() {
  const q = useSearchParams();
  const p = q.get("p");
  const night = q.get("night") === "1";
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", night ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [night]);
  const at = p === null ? null : Math.min(1, Math.max(0, Number(p) || 0));
  // ?hour=17.5 sets the clock (the visitor's own clock if left out); ?wx=cloudy|rain|mist|snow sets the weather
  const hourQ = q.get("hour");
  const wx = WEATHER[q.get("wx") ?? ""] ?? WEATHER.clear;
  const follow = hourQ !== null || q.get("wx") !== null || q.get("live") === "1";
  const sky = follow
    ? () => {
        const d = new Date();
        return { hour: hourQ !== null ? Number(hourQ) : d.getHours() + d.getMinutes() / 60, ...wx };
      }
    : undefined;
  return (
    <div className="kp-shell" style={{ minHeight: at === null ? "400vh" : "100dvh" }}>
      <PortalFlight route={at === null ? undefined : [at, at]} sky={sky} />
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
