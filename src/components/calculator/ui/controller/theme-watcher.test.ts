// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { fakeMedia } from "./__fixtures__/fake-media";
import { watchTheme, type ThemeState } from "./theme-watcher";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let restore: () => void;
beforeEach(() => {
  restore = installDomStubs();
});
afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.documentElement.className = "";
  restore();
});

it("TH-15 with the auto choice watchTheme follows the site theme in data-theme, light and dark, is classic with no site theme, ignores the colour scheme and bumps revision on contrast and forced colours", async () => {
  const html = document.documentElement;
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s), "auto");
  expect(w.initial).toEqual({ choice: "auto", skin: "classic", revision: 0 });
  html.dataset.theme = "ivory";
  await tick();
  expect(seen.at(-1)).toEqual({ choice: "auto", skin: "ivory", revision: 0 });
  html.dataset.theme = "observatory";
  html.className = "dark";
  await tick();
  expect(seen.at(-1)).toEqual({ choice: "auto", skin: "observatory", revision: 0 });
  const before = seen.length;
  media.set("(prefers-color-scheme: dark)", true);
  expect(seen).toHaveLength(before);
  media.set("(prefers-contrast: more)", true);
  media.set("(forced-colors: active)", true);
  expect(seen.at(-1)).toEqual({ choice: "auto", skin: "observatory", revision: 2 });
  html.dataset.theme = "not-a-theme";
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  delete html.dataset.theme;
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  w.dispose();
  expect(media.listeners()).toBe(0);
});

it("TH-15 a chosen skin stays put through site theme changes and still bumps revision on contrast", async () => {
  const html = document.documentElement;
  html.dataset.theme = "observatory";
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s), "classic");
  expect(w.initial).toEqual({ choice: "classic", skin: "classic", revision: 0 });
  html.dataset.theme = "ivory";
  await tick();
  expect(seen).toEqual([]);
  media.set("(prefers-contrast: more)", true);
  expect(seen.at(-1)).toEqual({ choice: "classic", skin: "classic", revision: 1 });
  w.dispose();
});

it("setChoice switches the skin at once, back to the site theme with auto, and says nothing when the choice resolves to the same state", () => {
  const html = document.documentElement;
  html.dataset.theme = "sage";
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s), "classic");
  w.setChoice("plum");
  expect(seen).toEqual([{ choice: "plum", skin: "plum", revision: 0 }]);
  w.setChoice("plum");
  expect(seen).toHaveLength(1);
  w.setChoice("auto");
  expect(seen.at(-1)).toEqual({ choice: "auto", skin: "sage", revision: 0 });
  w.dispose();
});
