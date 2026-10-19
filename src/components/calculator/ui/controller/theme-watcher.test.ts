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
  delete document.documentElement.dataset.calculatorSkin;
  document.documentElement.className = "";
  restore();
});

it("TH-15 watchTheme defaults to classic, follows data-calculator-skin and class, ignores the colour scheme and bumps revision on contrast and forced colours", async () => {
  const html = document.documentElement;
  const media = fakeMedia();
  const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s));
  expect(w.initial).toEqual({ skin: "classic", revision: 0 });
  html.dataset.calculatorSkin = "observatory";
  await tick();
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 0 });
  html.className = "x";
  await tick();
  expect(seen).toHaveLength(2);
  media.set("(prefers-contrast: more)", true);
  media.set("(forced-colors: active)", true);
  expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 2 });
  delete html.dataset.calculatorSkin;
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  html.dataset.theme = "observatory";
  await tick();
  expect(seen.at(-1)!.skin).toBe("classic");
  delete html.dataset.theme;
  w.dispose();
  expect(media.listeners()).toBe(0);
});
