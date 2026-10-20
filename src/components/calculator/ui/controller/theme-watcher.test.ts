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

it("TH-15 watchTheme follows the site theme in data-theme, light and dark, is classic with no site theme, ignores the colour scheme and bumps revision on contrast and forced colours", async () => {
  const html = document.documentElement;
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s));
  expect(w.initial).toEqual({ skin: "classic", revision: 0 });
  html.dataset.theme = "ivory";
  await tick();
  expect(seen.at(-1)).toEqual({ skin: "ivory", revision: 0 });
  html.dataset.theme = "observatory";
  html.className = "dark";
  await tick();
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 0 });
  const before = seen.length;
  media.set("(prefers-color-scheme: dark)", true);
  expect(seen).toHaveLength(before);
  media.set("(prefers-contrast: more)", true);
  media.set("(forced-colors: active)", true);
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 2 });
  html.dataset.theme = "not-a-theme";
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  delete html.dataset.theme;
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  w.dispose();
  expect(media.listeners()).toBe(0);
});
