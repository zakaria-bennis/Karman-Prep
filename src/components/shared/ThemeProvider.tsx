"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { saveThemePreference } from "@/app/appearance/actions";
import { useUser } from "@clerk/nextjs";
import { MotionConfig } from "framer-motion";
import { applyTheme, findTheme, SITE_THEMES, type SiteTheme } from "@/lib/themes/palettes";

interface ThemeCtx {
  theme: string;
  palette: SiteTheme;
  setTheme: (id: string) => void;
  toggleMode: () => void;
  saving: boolean;
  notice: string;
}
const Ctx = createContext<ThemeCtx>({
  theme: "observatory",
  palette: SITE_THEMES[0],
  setTheme: () => {},
  toggleMode: () => {},
  saving: false,
  notice: "",
});
const storageKey = (id?: string) => `karman-theme:${id ?? "visitor"}`;
const modeKey = (dark: boolean, id?: string) =>
  `karman-theme:last-${dark ? "dark" : "light"}:${id ?? "visitor"}`;
function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Account save still works when storage is unavailable. */
  }
}

/** Only a cosmetic allowlisted ID is user-editable; never use this metadata for authorization. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [palette, setPalette] = useState(SITE_THEMES[0]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const account = useRef<string | undefined>(undefined);
  const initialized = useRef<string | null>(null);
  const pendingBeforeIdentity = useRef<SiteTheme | null>(null);
  useEffect(() => {
    const boot = findTheme(document.documentElement.dataset.theme);
    if (boot) setPalette(boot);
  }, []);
  useEffect(() => {
    account.current = user?.id;
    if (!isLoaded) return;
    const key = storageKey(user?.id);
    if (initialized.current === key) return;
    initialized.current = key;
    const pending = pendingBeforeIdentity.current;
    pendingBeforeIdentity.current = null;
    const saved =
      pending ??
      findTheme(readStorage(key)) ??
      findTheme(user?.unsafeMetadata?.karmanTheme) ??
      (!user ? findTheme(readStorage("karman-theme")) : undefined) ??
      SITE_THEMES[0];
    setPalette(saved);
    applyTheme(saved);
    if (pending) writeStorage(key, saved.id);
    writeStorage("karman-theme:active", saved.id);
    writeStorage(modeKey(saved.dark, user?.id), saved.id);
    setNotice("");
    setSaving(false);
    if (pending && user) {
      const owner = user.id;
      setSaving(true);
      setNotice("Saving…");
      void saveThemePreference(saved.id)
        .then(async () => {
          if (account.current === owner) await user.reload();
          if (account.current === owner) setNotice("Saved to your account.");
        })
        .catch(() => {
          if (account.current === owner)
            setNotice("Saved on this device. Account sync failed; choose it again to retry.");
        })
        .finally(() => {
          if (account.current === owner) setSaving(false);
        });
    }
  }, [isLoaded, user]);
  const setTheme = (id: string) => {
    const next = findTheme(id);
    if (!next || saving) return;
    if (!isLoaded) pendingBeforeIdentity.current = next;
    setPalette(next);
    applyTheme(next);
    writeStorage(storageKey(user?.id), next.id);
    writeStorage("karman-theme:active", next.id);
    writeStorage(modeKey(next.dark, user?.id), next.id);
    if (!user) {
      setNotice("Saved on this device.");
      return;
    }
    const owner = user.id;
    setSaving(true);
    setNotice("Saving…");
    // Supported Clerk merge operation preserves all unrelated profile metadata.
    void saveThemePreference(next.id)
      .then(async () => {
        if (account.current === owner) await user.reload();
        if (account.current === owner) setNotice("Saved to your account.");
      })
      .catch(() => {
        if (account.current === owner)
          setNotice("Saved on this device. Account sync failed; choose it again to retry.");
      })
      .finally(() => {
        if (account.current === owner) setSaving(false);
      });
  };
  const toggleMode = () => {
    const current = findTheme(document.documentElement.dataset.theme) ?? palette;
    const nextDark = !current.dark;
    const remembered = findTheme(readStorage(modeKey(nextDark, user?.id)));
    setTheme(remembered?.dark === nextDark ? remembered.id : nextDark ? "observatory" : "ivory");
  };
  return (
    <Ctx.Provider value={{ theme: palette.id, palette, setTheme, toggleMode, saving, notice }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Ctx.Provider>
  );
}
export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
