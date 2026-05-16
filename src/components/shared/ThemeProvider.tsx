"use client";

// ============================================================
// ThemeProvider — dark/light mode without next-themes.
//
// next-themes injects a <script> tag inside its provider component
// to prevent FOUC, which React 19 + Next 16 reject ("Encountered a
// script tag while rendering React component"). This replacement
// keeps the same public API (`useTheme().theme` / `setTheme()`)
// without rendering any inline script.
//
// Strategy:
//   · Default to "dark" on first render (matches site's cloud aesthetic)
//   · After mount, read localStorage "theme" key and apply
//   · Toggling writes to localStorage and updates <html> class
//
// Tradeoff: a user who has explicitly chosen "light" sees a brief
// dark flash on first paint. Acceptable — the site is dark-first.
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {} });

const STORAGE_KEY = "karman-theme";

function applyClass(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem(STORAGE_KEY)) as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
      applyClass(stored);
    } else {
      applyClass("dark");
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
    applyClass(t);
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
