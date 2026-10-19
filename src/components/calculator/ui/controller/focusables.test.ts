// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { focusBoundary, tabbables } from "./focusables";

let host: HTMLDivElement;
let shadow: ShadowRoot;
let restore: () => void;

beforeEach(() => {
  restore = installDomStubs();
  host = document.body.appendChild(document.createElement("div"));
  shadow = host.attachShadow({ mode: "open" });
});
afterEach(() => {
  host.remove();
  restore();
});

it("KB-13 tabbables skip hidden, inert, aria-hidden, disabled, tabindex -1 and visibility:hidden; focusBoundary picks the ends", () => {
  shadow.innerHTML = `<button id="a"></button><div hidden><button></button></div><div inert><button></button></div><div aria-hidden="true"><button></button></div>
    <button disabled></button><span tabindex="-1"></span><div style="visibility:hidden"><button></button></div><textarea id="t"></textarea><button id="z"></button>`;
  expect(tabbables(shadow).map((e) => e.id)).toEqual(["a", "t", "z"]);
  focusBoundary(shadow, "first");
  expect(shadow.activeElement?.id).toBe("a");
  focusBoundary(shadow, "last");
  expect(shadow.activeElement?.id).toBe("z");
});
