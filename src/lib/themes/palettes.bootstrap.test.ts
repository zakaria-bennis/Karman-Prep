// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { themeBootstrapScript, themeStyleSheet } from "./palettes";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "dark";
  document.documentElement.dataset.theme = "observatory";
});

describe("theme before hydration", () => {
  it("selects the saved light palette before React runs", () => {
    localStorage.setItem("karman-theme:active", "paper");
    new Function(themeBootstrapScript())();
    expect(document.documentElement.dataset.theme).toBe("paper");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(themeStyleSheet()).toContain('html[data-theme="paper"]');
    expect(themeStyleSheet()).toContain("--k-night:245 247 250");
  });
  it("ignores unknown storage values", () => {
    localStorage.setItem("karman-theme:active", 'paper"];body{display:none}');
    new Function(themeBootstrapScript())();
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(document.documentElement).toHaveClass("dark");
  });
});
