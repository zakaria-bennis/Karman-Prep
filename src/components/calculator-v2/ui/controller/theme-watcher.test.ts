// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { fakeMedia } from "./__fixtures__/fake-media";
import { watchTheme, type ThemeState } from "./theme-watcher";

const DARK = "(prefers-color-scheme: dark)";
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

it("TH-15 watchTheme re-resolves on data-theme, class and colour scheme and bumps revision on contrast and forced colours", async () => {
  const html = document.documentElement;
  html.dataset.theme = "ivory";
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s));
  expect(w.initial).toEqual({ skin: "ivory", revision: 0 });
  html.dataset.theme = "observatory";
  await tick();
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 0 });
  html.className = "x";
  await tick();
  expect(seen).toHaveLength(2);
  media.set("(prefers-contrast: more)", true);
  media.set("(forced-colors: active)", true);
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 2 });
  delete html.dataset.theme;
  await tick();
  media.set(DARK, true);
  expect(seen.at(-1)!.skin).toBe("observatory");
  media.set(DARK, false);
  expect(seen.at(-1)!.skin).toBe("ivory");
  w.dispose();
  expect(media.listeners()).toBe(0);
});
