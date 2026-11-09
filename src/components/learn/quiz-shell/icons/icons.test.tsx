// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import * as Icons from "./index";

const shellDir = path.resolve(__dirname, "..");
const names = [
  "BookmarkIcon",
  "RaiseHandIcon",
  "ReviewMarkIcon",
  "EliminatorIcon",
  "PenIcon",
  "EraserIcon",
  "UndoIcon",
  "RedoIcon",
  "ClearIcon",
  "CalculatorIcon",
  "ReferenceIcon",
  "MoreIcon",
  "ClockIcon",
  "FlameIcon",
  "TickIcon",
  "CrossIcon",
] as const;

describe("Karman quiz icons", () => {
  for (const name of names)
    it(`${name} renders a decorative svg with no fixed colours`, () => {
      const Icon = Icons[name];
      const { container } = render(<Icon state="on" />);
      const svg = container.querySelector("svg")!;
      expect(svg).toBeTruthy();
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(container.innerHTML).not.toMatch(/(fill|stroke)="#[0-9a-f]{3,6}"/i);
    });
  it("a titled icon is labelled", () => {
    const { getByTitle } = render(<Icons.BookmarkIcon title="Bookmark" />);
    expect(getByTitle("Bookmark")).toBeTruthy();
  });
  it("no quiz shell file imports lucide-react", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
      );
    for (const file of walk(shellDir))
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from ["']lucide-react["']/);
  });
});
