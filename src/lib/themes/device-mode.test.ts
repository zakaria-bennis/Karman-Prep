// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { themeBootstrapScript } from "./palettes";
import { deviceThemeBootstrapScript } from "./device-mode";

const original = window.matchMedia;
const device = (light: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: light && query.includes("light"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
};
const boot = () => {
  new Function(themeBootstrapScript())();
  new Function(deviceThemeBootstrapScript())();
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "dark";
  document.documentElement.dataset.theme = "observatory";
});
afterEach(() => {
  window.matchMedia = original;
});

it("gives a light device the light palette when no theme was ever saved", () => {
  device(true);
  boot();
  expect(document.documentElement.dataset.theme).toBe("ivory");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

it("keeps dark for a dark device or one with no preference", () => {
  device(false);
  boot();
  expect(document.documentElement.dataset.theme).toBe("observatory");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("never overrides a saved choice", () => {
  device(true);
  localStorage.setItem("karman-theme:active", "observatory");
  boot();
  expect(document.documentElement.dataset.theme).toBe("observatory");
});
