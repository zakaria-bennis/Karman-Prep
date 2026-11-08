import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DARK_FALLBACK, LIGHT_FALLBACK, themeById, type Theme } from "./themes";
import { installSpringVars } from "./motion";

export type Mode = "device" | "light" | "dark";
export type TypeFace = "hanken" | "plex";
export type GlassRecipe = "refract" | "frost";
export type BgVariant = "sky" | "ruled" | "contour" | "grain";
export const BG_VARIANTS: BgVariant[] = ["sky", "ruled", "contour", "grain"];

export interface ThemeSettings {
  /** A remembered account theme wins over the mode. null means "follow the mode". */
  theme: string | null;
  mode: Mode;
  type: TypeFace;
  glass: GlassRecipe;
  bg: BgVariant;
}

interface ThemeContextValue extends ThemeSettings {
  resolved: Theme;
  dark: boolean;
  /** Change settings. remember=true also writes them to localStorage (the app's toggle). */
  set(patch: Partial<ThemeSettings>, remember?: boolean): void;
  toggleMode(): void;
}

const Ctx = createContext<ThemeContextValue | null>(null);
const KEYS = { theme: "karman-theme", type: "karman-type", glass: "karman-glass", bg: "karman-bg" };

function deviceLight() {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
}

/** Stored theme wins; else device dark or no preference gives observatory, device light gives ivory. */
export function resolveTheme(theme: string | null, mode: Mode): Theme {
  const t = themeById(theme);
  if (t) return t;
  const light = mode === "light" ? true : mode === "dark" ? false : deviceLight();
  return themeById(light ? LIGHT_FALLBACK : DARK_FALLBACK)!;
}

function read<T extends string>(key: string, ok: readonly T[]): T | null {
  try {
    const v = localStorage.getItem(key);
    return v && (ok as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({
  initial,
  children,
}: {
  initial?: Partial<ThemeSettings>;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<ThemeSettings>(() => ({
    theme:
      initial?.theme ??
      (themeById(read("karman-theme", [])) ? null : (read(KEYS.theme, []) ?? null)),
    mode: initial?.mode ?? "device",
    type: initial?.type ?? read<TypeFace>(KEYS.type, ["hanken", "plex"]) ?? "hanken",
    glass: initial?.glass ?? read<GlassRecipe>(KEYS.glass, ["refract", "frost"]) ?? "refract",
    bg: initial?.bg ?? read<BgVariant>(KEYS.bg, BG_VARIANTS) ?? "contour",
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => setTick((n) => n + 1);
    mq.addEventListener("change", on);
    installSpringVars();
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved = useMemo(
    () => resolveTheme(settings.theme, settings.mode),
    [settings.theme, settings.mode, tick]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved.id;
    root.classList.toggle("dark", resolved.dark);
    root.dataset.type = settings.type;
    root.dataset.glass = settings.glass;
    root.dataset.bg = settings.bg;
  }, [resolved, settings.type, settings.glass, settings.bg]);

  const set = useCallback((patch: Partial<ThemeSettings>, remember = false) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (!remember) return;
    try {
      if ("theme" in patch) {
        if (patch.theme) localStorage.setItem(KEYS.theme, patch.theme);
        else localStorage.removeItem(KEYS.theme);
      }
      if (patch.type) localStorage.setItem(KEYS.type, patch.type);
      if (patch.glass) localStorage.setItem(KEYS.glass, patch.glass);
      if (patch.bg) localStorage.setItem(KEYS.bg, patch.bg);
    } catch {
      /* storage can be off */
    }
  }, []);

  const toggleMode = useCallback(() => {
    set({ theme: resolved.dark ? LIGHT_FALLBACK : DARK_FALLBACK }, true);
  }, [resolved.dark, set]);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...settings, resolved, dark: resolved.dark, set, toggleMode }),
    [settings, resolved, set, toggleMode]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme needs a ThemeProvider");
  return v;
}

/** The resolved theme's hex values, for canvas drawing and the glass engine. */
export function useThemeColors(): Theme {
  return useTheme().resolved;
}
