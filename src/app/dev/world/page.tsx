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

function World() {
  const q = useSearchParams();
  const p = q.get("p");
  const night = q.get("night") === "1";
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", night ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [night]);
  const at = p === null ? null : Math.min(1, Math.max(0, Number(p) || 0));
  return (
    <div className="kp-shell" style={{ minHeight: at === null ? "400vh" : "100dvh" }}>
      <PortalFlight route={at === null ? undefined : [at, at]} />
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
