// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  isThemeChoice,
  migrateThemeChoice,
  readStoredThemeChoice,
  skinForChoice,
  storeThemeChoice,
  themeChoiceName,
  THEME_CHOICES,
  THEME_GROUPS,
  THEME_STORAGE_KEY,
} from "./choice";
import { DARK_SKIN_IDS, LIGHT_SKIN_IDS, SKIN_IDS } from "./skins";
import { CALCULATOR_THEMES } from "./themes";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("offers Auto, Classic and the 20 calculator themes, named as themes.ts names them", () => {
  expect(THEME_CHOICES).toEqual(["auto", ...SKIN_IDS]);
  expect(THEME_CHOICES).toHaveLength(22);
  expect(themeChoiceName("auto")).toBe("Auto");
  expect(themeChoiceName("classic")).toBe("Classic");
  for (const theme of CALCULATOR_THEMES) expect(themeChoiceName(theme.id)).toBe(theme.name);
});

it("groups the picker as Auto and Classic, then Light and Dark with ten themes each", () => {
  expect(THEME_GROUPS.map((g) => g.label)).toEqual([null, "Light", "Dark"]);
  expect(THEME_GROUPS[0].choices).toEqual(["auto", "classic"]);
  expect(THEME_GROUPS[1].choices).toEqual(LIGHT_SKIN_IDS);
  expect(THEME_GROUPS[2].choices).toEqual(DARK_SKIN_IDS);
  expect(THEME_GROUPS.flatMap((g) => g.choices)).toEqual(THEME_CHOICES);
});

it("auto follows the site theme's calculator theme (classic without one); a skin keeps itself", () => {
  expect(skinForChoice("auto", "plum")).toBe("plum");
  expect(skinForChoice("auto", "ivory")).toBe("white");
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
  localStorage.setItem(THEME_STORAGE_KEY, "solarized");
  expect(readStoredThemeChoice()).toBeNull();
  expect(isThemeChoice("auto")).toBe(true);
  expect(isThemeChoice("neon")).toBe(true);
  expect(isThemeChoice(3)).toBe(false);
});

it("a stored retired theme reads as the nearest current one", () => {
  expect(
    ["ivory", "paper", "peach", "rose", "blush", "sand", "plum"].map(migrateThemeChoice)
  ).toEqual(["white", "white", "dreamsicle", "pink", "pink", "sand", "plum"]);
  expect(migrateThemeChoice("toString")).toBeNull();
  expect(migrateThemeChoice(null)).toBeNull();
  localStorage.setItem(THEME_STORAGE_KEY, "blush");
  expect(readStoredThemeChoice()).toBe("pink");
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
