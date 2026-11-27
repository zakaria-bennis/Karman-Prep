// @vitest-environment jsdom
import { describe as group, expect, it } from "vitest";
import {
  cssPath,
  describe,
  findElement,
  previewText,
  restoreText,
  snapshotChildren,
  textTarget,
} from "./dom";

function page(html: string) {
  document.body.innerHTML = html;
  return document;
}

group("page studio dom helpers", () => {
  it("builds a selector that finds the same element again", () => {
    const doc = page(
      `<main><section><p>One</p><p>Two <b>bold</b></p></section><section><p>Three</p></section></main>`
    );
    const target = doc.querySelectorAll("p")[1];
    const sel = cssPath(target);
    expect(sel).toBe("body > main > section:nth-of-type(1) > p:nth-of-type(2)");
    expect(findElement(doc, sel)).toBe(target);
  });

  it("starts from a stable id or test id, and skips React's generated ids", () => {
    const doc = page(
      `<div id="plans"><span data-testid="price">$9</span></div><div id=":r1:"><i>x</i></div>`
    );
    expect(cssPath(doc.querySelector("span")!)).toBe('[data-testid="price"]');
    expect(cssPath(doc.querySelector("i")!)).toBe("body > div:nth-of-type(2) > i");
  });

  it("names elements the way a person would", () => {
    const doc = page(
      `<button>Start set</button><img alt="Tutor photo"><h2>Your library</h2><section></section><b>$995</b><div></div>`
    );
    expect(describe(doc.querySelector("button")!)).toBe('button "Start set"');
    expect(describe(doc.querySelector("img")!)).toBe('image "Tutor photo"');
    expect(describe(doc.querySelector("h2")!)).toBe('heading "Your library"');
    expect(describe(doc.querySelector("section")!)).toBe("section");
    expect(describe(doc.querySelector("b")!)).toBe('text "$995"');
    expect(describe(doc.querySelector("div")!)).toBe("box");
  });

  it("finds the words a click means", () => {
    const doc = page(
      `<a href="#"><span class="icon"></span><span>Pricing</span></a><div><svg></svg></div>`
    );
    expect(textTarget(doc.querySelector("a")!)?.textContent).toBe("Pricing");
    expect(textTarget(doc.querySelectorAll("span")[1])?.textContent).toBe("Pricing");
    expect(textTarget(doc.querySelector("div")!)).toBeNull();
  });

  it("previews new words without adding or removing nodes, and undoes it", () => {
    const doc = page(`<p>Hello <b>world</b></p>`);
    const p = doc.querySelector("p")!;
    const b = doc.querySelector("b")!;
    expect(previewText(p, "Hi there")).toBe(true);
    expect(p.textContent).toBe("Hi there");
    expect(p.contains(b)).toBe(true);
    restoreText(p);
    expect(p.innerHTML).toBe("Hello <b>world</b>");
  });

  it("puts typed changes back node for node", () => {
    const doc = page(`<h1>Title <em>here</em></h1>`);
    const h1 = doc.querySelector("h1")!;
    const em = doc.querySelector("em")!;
    const undo = snapshotChildren(h1);
    h1.textContent = "Something else";
    undo();
    expect(h1.innerHTML).toBe("Title <em>here</em>");
    expect(h1.querySelector("em")).toBe(em);
  });
});
