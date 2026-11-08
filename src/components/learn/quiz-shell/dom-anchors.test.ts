// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { charOffsetIn, createDomLayout, hitTest } from "./dom-anchors";

function pane(html: string) {
  const el = document.createElement("div");
  el.dataset.quizPane = "question";
  el.innerHTML = html;
  document.body.append(el);
  return el;
}

describe("dom anchors", () => {
  it("counts character offsets across nested text", () => {
    const el = pane('<p data-ink-block="stem">Hello <b>big</b> world</p>');
    const block = el.querySelector("[data-ink-block]")!;
    const world = block.lastChild as Text;
    expect(charOffsetIn(block, world, 1)).toBe("Hello big".length + 1);
  });
  it("a hit inside KaTeX anchors to its block", () => {
    const el = pane(
      '<p data-ink-block="stem">x <span class="katex"><span id="m">y</span></span></p>'
    );
    const target = el.querySelector("#m")!;
    expect(hitTest(el, target, 0, 0)).toEqual({ kind: "block", blockId: "stem" });
  });
  it("a hit on a choice anchors to the choice", () => {
    const el = pane('<div data-ink-choice="C"><span id="t">text</span></div>');
    expect(hitTest(el, el.querySelector("#t")!, 0, 0)).toEqual({ kind: "choice", letter: "C" });
  });
  it("blank space anchors to the pane", () => {
    const el = pane("<div id='gap'></div>");
    expect(hitTest(el, el.querySelector("#gap")!, 0, 0)).toEqual({
      kind: "block",
      blockId: "__pane:question",
    });
  });
  it("an anchor missing from this pane resolves to null", () => {
    const el = pane("<p data-ink-block='stem'>a</p>");
    const layout = createDomLayout(el);
    expect(layout.choice("D")).toBeNull();
    expect(layout.block("passage")).toBeNull();
    expect(layout.block("__pane:question")).not.toBeNull();
    expect(layout.block("__pane:passage")).toBeNull();
  });
});
