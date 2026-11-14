"use client";

// ============================================================
// Page views, time on page and tracked clicks, on every page (mounted once in the root layout).
//
// Time on page counts only while the tab is visible and someone has touched the page in the
// last few minutes, in 5-second steps; it is sent as `page_time` when the page changes, the
// tab is hidden or closed, or every 10 minutes on a long stay. Consent: src/lib/analytics/client.ts.
// ============================================================

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { configureAnalytics, flush, recordingAllowed, track } from "@/lib/analytics/client";
import { surfaceOf } from "@/lib/analytics/shared";

const TICK_MS = 5_000;
const CHUNK_SECONDS = 600;

function idleLimitMs(path: string) {
  // A student may read one passage for a while; a marketing page is skimmed.
  return surfaceOf(path) === "portal" ? 10 * 60_000 : 5 * 60_000;
}

function ctaTarget(href: string): "sign_up" | "checkout" | "sign_in" | null {
  let path: string;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return null;
    path = url.pathname;
  } catch {
    return null;
  }
  if (path.startsWith("/auth/sign-up")) return "sign_up";
  if (path.startsWith("/checkout/start")) return "checkout";
  if (path.startsWith("/auth/sign-in")) return "sign_in";
  return null;
}

export default function AnalyticsTracker({ siteDefault }: { siteDefault: boolean }) {
  const pathname = usePathname() ?? "/";
  const page = useRef({ path: "", seconds: 0, viewed: false });
  const lastInput = useRef(0);

  // Settings first, before any event of this render.
  configureAnalytics({ siteDefault });

  /** Sends the time gathered on the current page so far. */
  const sendTime = useRef((leaving: boolean) => {
    const p = page.current;
    const seconds = Math.round(p.seconds);
    if (p.path && seconds >= 1) track("page_time", { seconds: Math.min(seconds, 1800) }, p.path);
    p.seconds = 0;
    flush(leaving);
  });

  /** The page view, once per page, as soon as recording is allowed (possibly after "Allow all"). */
  const viewIfAllowed = useRef(() => {
    const p = page.current;
    if (p.viewed || !p.path || !recordingAllowed(p.path)) return;
    p.viewed = true;
    track("page_view", undefined, p.path);
  });

  useEffect(() => {
    sendTime.current(false);
    page.current = { path: pathname, seconds: 0, viewed: false };
    lastInput.current = Date.now();
    viewIfAllowed.current();
  }, [pathname]);

  useEffect(() => {
    const touch = () => {
      lastInput.current = Date.now();
    };
    const tick = window.setInterval(() => {
      const p = page.current;
      if (!p.viewed || document.visibilityState !== "visible") return;
      if (Date.now() - lastInput.current > idleLimitMs(p.path)) return;
      p.seconds += TICK_MS / 1000;
      if (p.seconds >= CHUNK_SECONDS) sendTime.current(false);
    }, TICK_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendTime.current(true);
      else touch();
    };
    const onHide = () => sendTime.current(true);
    const onConsent = () => viewIfAllowed.current();
    const onClick = (ev: MouseEvent) => {
      touch();
      const el = ev.target instanceof Element ? ev.target : null;
      if (!el) return;
      const marked = el.closest<HTMLElement>("[data-track]");
      const name = marked?.dataset.track;
      if (name && /^[a-z0-9][a-z0-9_.:/-]{0,59}$/i.test(name)) {
        track("ui_click", { target: name.toLowerCase() });
      }
      const link = el.closest<HTMLAnchorElement>("a[href]");
      const to = link && surfaceOf(location.pathname) === "site" ? ctaTarget(link.href) : null;
      if (to) {
        track("cta_click", { to });
        flush(true);
      }
    };
    const events: Array<[string, EventListener]> = [
      ["keydown", touch],
      ["pointerdown", touch],
      ["scroll", touch],
      ["wheel", touch],
    ];
    for (const [name, fn] of events)
      window.addEventListener(name, fn, { passive: true, capture: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("karman:consent", onConsent);
    return () => {
      window.clearInterval(tick);
      for (const [name, fn] of events) window.removeEventListener(name, fn, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("karman:consent", onConsent);
    };
  }, []);

  return null;
}
