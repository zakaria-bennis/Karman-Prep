// The student's theme choice (owner decision, 2026-10-22): "auto" follows the site or quiz theme
// in html[data-theme] (TH-5), and any skin id keeps that skin whatever the site theme is. The
// choice is remembered on the device in localStorage and applies wherever the calculator appears;
// with nothing stored, the host's default applies (Auto in the quiz, Classic on /calculator).
// Every storage access is in try/catch, so blocked or full storage keeps the choice in memory.
// A stored theme retired on 2026-10-26 (the old list was the site themes) reads as the nearest
// current one (themes.ts SITE_THEME_SKINS), so nobody loses their pick.

import { resolveSkinId } from "./roles";
import { SKIN_NAMES } from "./skin-colors.generated";
import { DARK_SKIN_IDS, LIGHT_SKIN_IDS, SKIN_IDS, type SkinId } from "./skins";
import { SITE_THEME_SKINS } from "./themes";

export type ThemeChoice = "auto" | SkinId;

/** The picker's groups: Auto and Classic first, then the ten light and the ten dark themes. */
export const THEME_GROUPS: readonly { label: string | null; choices: readonly ThemeChoice[] }[] = [
  { label: null, choices: ["auto", "classic"] },
  { label: "Light", choices: LIGHT_SKIN_IDS },
  { label: "Dark", choices: DARK_SKIN_IDS },
];

/** The picker's order: Auto, Classic, then the light and the dark themes. */
export const THEME_CHOICES: readonly ThemeChoice[] = ["auto", ...SKIN_IDS];

/** The localStorage key of the choice. */
export const THEME_STORAGE_KEY = "karman.calculator.theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

/** The picker's name for a choice. */
export function themeChoiceName(choice: ThemeChoice): string {
  return choice === "auto" ? "Auto" : SKIN_NAMES[choice];
}

/** The skin a choice shows while the site theme is `siteTheme`. */
export function skinForChoice(choice: ThemeChoice, siteTheme: string | null | undefined): SkinId {
  return choice === "auto" ? resolveSkinId(siteTheme) : choice;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked storage throws on access
  }
}

/** A stored value as a current choice: itself, a retired theme's nearest one, or null. */
export function migrateThemeChoice(value: string | null): ThemeChoice | null {
  if (isThemeChoice(value)) return value;
  if (value === null || !Object.hasOwn(SITE_THEME_SKINS, value)) return null;
  return SITE_THEME_SKINS[value];
}

/** The stored choice, or null when none is stored, storage is blocked or the value is unknown. */
export function readStoredThemeChoice(): ThemeChoice | null {
  try {
    return migrateThemeChoice(storage()?.getItem(THEME_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Remembers the choice on this device; a failed write is ignored. */
export function storeThemeChoice(choice: ThemeChoice): void {
  try {
    storage()?.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Full or blocked storage: the choice lasts for this calculator only.
  }
}
