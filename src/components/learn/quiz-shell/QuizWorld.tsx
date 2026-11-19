"use client";
// What is behind every quiz: the portal's own live landscape, with the question, the bars and
// the tools on frosted glass over it (founder, 2026-11-17: "keep the frosted background and drop
// the opaque colors"). It is the same endless world the portal flies, and picks up where the tab
// left off. Day or night follows `data-kp-mode` on the root, as in the portal; on a page that
// has not set it, this sets it from the device and takes it away again on leaving.
import { useEffect, useState } from "react";
import PortalFlight from "@/components/portal/PortalFlight";
import "@/components/portal/portal.css";
import styles from "./quiz-shell.module.css";

export function QuizWorld() {
  // drawn once the page is in a browser that can say whether it is day or night
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    // the landscape is the browser's own to draw: it starts once the page is there
    setReady(true);
    const root = document.documentElement;
    if (root.hasAttribute("data-kp-mode")) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    // the choice made with the site's or the portal's light and dark switch wins; with none, the
    // device's own setting decides
    const set = () => {
      let chosen: string | null = null;
      try {
        chosen = localStorage.getItem("karman-site-theme");
      } catch {
        /* no storage: the device decides */
      }
      const mode =
        chosen === "dark" || chosen === "light" ? chosen : dark.matches ? "dark" : "light";
      root.setAttribute("data-kp-mode", mode);
    };
    set();
    dark.addEventListener("change", set);
    return () => {
      dark.removeEventListener("change", set);
      root.removeAttribute("data-kp-mode");
    };
  }, []);
  return <div className={styles.world}>{ready && <PortalFlight world />}</div>;
}
