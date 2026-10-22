// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { SITE_THEMES } from "@/lib/themes/palettes";
import {
  isThemeChoice,
  readStoredThemeChoice,
  skinForChoice,
  storeThemeChoice,
  themeChoiceName,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
} from "./choice";
import { SKIN_IDS } from "./skins";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("offers Auto, Classic and the 12 site themes, named as the site names them", () => {
  expect(THEME_CHOICES).toEqual(["auto", ...SKIN_IDS]);
  expect(THEME_CHOICES).toHaveLength(14);
  expect(themeChoiceName("auto")).toBe("Auto");
  expect(themeChoiceName("classic")).toBe("Classic");
  for (const theme of SITE_THEMES) {
    expect(themeChoiceName(theme.id as (typeof SKIN_IDS)[number])).toBe(theme.name);
  }
});

it("auto follows the site theme (classic without one); a skin keeps itself", () => {
  expect(skinForChoice("auto", "plum")).toBe("plum");
  expect(skinForChoice("auto", undefined)).toBe("classic");
  expect(skinForChoice("auto", "nope")).toBe("classic");
  expect(skinForChoice("classic", "observatory")).toBe("classic");
  expect(skinForChoice("forest", "ivory")).toBe("forest");
});

it("remembers the choice in localStorage and ignores unknown stored values", () => {
  expect(readStoredThemeChoice()).toBeNull();
  storeThemeChoice("sage");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("sage");
  expect(readStoredThemeChoice()).toBe("sage");
  localStorage.setItem(THEME_STORAGE_KEY, "neon");
  expect(readStoredThemeChoice()).toBeNull();
  expect(isThemeChoice("auto")).toBe(true);
  expect(isThemeChoice(3)).toBe(false);
});

it("blocked or full storage never throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  expect(readStoredThemeChoice()).toBeNull();
  expect(() => storeThemeChoice("plum")).not.toThrow();
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new Error("SecurityError");
  });
  expect(readStoredThemeChoice()).toBeNull();
  expect(() => storeThemeChoice("plum")).not.toThrow();
});
