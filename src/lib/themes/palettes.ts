export type ThemeFamily = "Dark" | "Light" | "Soft color" | "Rose & plum";
export interface SiteTheme {
  id: string;
  name: string;
  family: ThemeFamily;
  dark: boolean;
  canvas: string;
  surface: string;
  raised: string;
  text: string;
  muted: string;
  border: string;
  gold: string;
  math: string;
  reading: string;
}
export const SITE_THEMES: readonly SiteTheme[] = [
  {
    id: "observatory",
    name: "Observatory",
    family: "Dark",
    dark: true,
    canvas: "#070605",
    surface: "#171611",
    raised: "#222018",
    text: "#f3ecdd",
    muted: "#b8b0a1",
    border: "#6c6351",
    gold: "#c8ab6a",
    math: "#63bfff",
    reading: "#f28eaa",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    family: "Dark",
    dark: true,
    canvas: "#101319",
    surface: "#1b2029",
    raised: "#272f3a",
    text: "#eef2fa",
    muted: "#b7c3d4",
    border: "#647489",
    gold: "#dcc089",
    math: "#79c9ff",
    reading: "#ffa0b7",
  },
  {
    id: "forest",
    name: "Forest",
    family: "Dark",
    dark: true,
    canvas: "#0c1814",
    surface: "#172820",
    raised: "#23392e",
    text: "#eef5e9",
    muted: "#b9cbbd",
    border: "#668574",
    gold: "#dfc986",
    math: "#86cfff",
    reading: "#f5a4b8",
  },
  {
    id: "ivory",
    name: "Warm ivory",
    family: "Light",
    dark: false,
    canvas: "#faf6ed",
    surface: "#fffdf8",
    raised: "#eee7da",
    text: "#29271f",
    muted: "#605a4b",
    border: "#968c79",
    gold: "#765820",
    math: "#165f96",
    reading: "#9f325b",
  },
  {
    id: "paper",
    name: "Clean paper",
    family: "Light",
    dark: false,
    canvas: "#f5f7fa",
    surface: "#ffffff",
    raised: "#e8edf4",
    text: "#18283c",
    muted: "#4b5c72",
    border: "#8495ab",
    gold: "#735925",
    math: "#145e99",
    reading: "#a13460",
  },
  {
    id: "sand",
    name: "Sand",
    family: "Light",
    dark: false,
    canvas: "#f1e8db",
    surface: "#fbf6ee",
    raised: "#e7dccb",
    text: "#32281e",
    muted: "#605141",
    border: "#99836b",
    gold: "#70521e",
    math: "#155988",
    reading: "#932e52",
  },
  {
    id: "sage",
    name: "Sage",
    family: "Soft color",
    dark: false,
    canvas: "#eaf0e8",
    surface: "#f6faf3",
    raised: "#dce8d8",
    text: "#243b2c",
    muted: "#45604c",
    border: "#7e9880",
    gold: "#705b23",
    math: "#165b86",
    reading: "#94385d",
  },
  {
    id: "lavender",
    name: "Lavender",
    family: "Soft color",
    dark: false,
    canvas: "#efebf6",
    surface: "#faf8ff",
    raised: "#e2daf0",
    text: "#342944",
    muted: "#60516f",
    border: "#9483aa",
    gold: "#775520",
    math: "#285992",
    reading: "#97355e",
  },
  {
    id: "peach",
    name: "Peach",
    family: "Soft color",
    dark: false,
    canvas: "#f7eae0",
    surface: "#fff8f2",
    raised: "#efdacd",
    text: "#432d26",
    muted: "#6b4e42",
    border: "#ab8675",
    gold: "#755019",
    math: "#155986",
    reading: "#963050",
  },
  {
    id: "rose",
    name: "Rose",
    family: "Rose & plum",
    dark: false,
    canvas: "#f6e8ed",
    surface: "#fff7fa",
    raised: "#ecd8e1",
    text: "#482a3b",
    muted: "#714e61",
    border: "#ab8399",
    gold: "#77521f",
    math: "#285c8e",
    reading: "#98305f",
  },
  {
    id: "blush",
    name: "Blush",
    family: "Rose & plum",
    dark: false,
    canvas: "#faeeed",
    surface: "#fff9f7",
    raised: "#f0ddda",
    text: "#472d33",
    muted: "#71525a",
    border: "#af8890",
    gold: "#79551e",
    math: "#265b8a",
    reading: "#a0305c",
  },
  {
    id: "plum",
    name: "Plum",
    family: "Rose & plum",
    dark: true,
    canvas: "#201321",
    surface: "#302034",
    raised: "#412c46",
    text: "#f9edf8",
    muted: "#d0b9d2",
    border: "#98769c",
    gold: "#e8c488",
    math: "#96ceff",
    reading: "#ffa1c6",
  },
];
export function findTheme(id: unknown): SiteTheme | undefined {
  return SITE_THEMES.find(
    (theme) => theme.id === (id === "dark" ? "observatory" : id === "light" ? "ivory" : id)
  );
}
export function themeTokens(theme: SiteTheme): Record<string, string> {
  return {
    night: theme.canvas,
    espresso: theme.canvas,
    charcoal: theme.surface,
    surface: theme.surface,
    "surface-raised": theme.raised,
    ivory: theme.text,
    taupe: theme.muted,
    bronze: theme.border,
    gold: theme.gold,
    "gold-bright": theme.gold,
    math: theme.math,
    "math-glow": theme.math,
    rw: theme.reading,
    "rw-glow": theme.reading,
    success: theme.dark ? "#afcf94" : "#356343",
    "success-bright": theme.dark ? "#afcf94" : "#356343",
    warning: theme.dark ? "#efbf79" : "#805019",
    "warning-bright": theme.dark ? "#efbf79" : "#805019",
    error: theme.reading,
    "error-bright": theme.reading,
    info: theme.math,
    "info-bright": theme.math,
    algebra: theme.math,
    "adv-math": theme.math,
    geometry: theme.math,
    "data-analy": theme.math,
    "read-write": theme.reading,
  };
}
export function rgbChannels(hex: string): string {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(" ");
}
export function applyTheme(theme: SiteTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme.dark);
  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.dark ? "dark" : "light";
  for (const [name, value] of Object.entries(themeTokens(theme)))
    root.style.setProperty(`--k-${name}`, rgbChannels(value));
  const tokens = themeTokens(theme);
  for (const [alias, key] of Object.entries({
    "status-success": "success",
    "status-success-bright": "success-bright",
    "status-warning": "warning",
    "status-warning-bright": "warning-bright",
    "status-error": "error",
    "status-error-bright": "error-bright",
    "status-info": "info",
    "status-info-bright": "info-bright",
    "color-algebra": "algebra",
    "color-advanced-math": "adv-math",
    "color-geometry": "geometry",
    "color-data-analysis": "data-analy",
    "color-reading-writing": "read-write",
  }))
    root.style.setProperty(`--${alias}`, tokens[key]);
  for (const [name, value] of Object.entries({
    "bg-night": theme.canvas,
    "bg-espresso": theme.canvas,
    "bg-charcoal": theme.surface,
    surface: theme.surface,
    "surface-raised": theme.raised,
    "text-primary": theme.text,
    "text-muted": theme.muted,
    border: theme.border,
    "accent-gold": theme.gold,
    "accent-gold-bright": theme.gold,
    "subject-math": theme.math,
    "subject-math-glow": theme.math,
    "subject-rw": theme.reading,
    "subject-rw-glow": theme.reading,
    background: theme.canvas,
    foreground: theme.text,
  }))
    root.style.setProperty(`--${name}`, value);
}
