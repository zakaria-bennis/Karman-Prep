import { describe, expect, it } from "vitest";
import { parseSourceItalics } from "./source-italics";

describe("reviewed source italics", () => {
  it("retains exact title words and keeps adjacent punctuation outside emphasis", () => {
    expect(parseSourceItalics("Shōnagon’s <i>Pillow Book</i>, the author")).toEqual([
      { text: "Shōnagon’s ", italic: false },
      { text: "Pillow Book", italic: true },
      { text: ", the author", italic: false },
    ]);
  });
  it("supports separate source spans without italicizing intervening words", () => {
    const runs = parseSourceItalics("[[i]]Halococcus[[/i]] and <i>Bacillus</i>.");
    expect(runs.filter((run) => run.italic).map((run) => run.text)).toEqual([
      "Halococcus",
      "Bacillus",
    ]);
    expect(runs.map((run) => run.text).join("")).toBe("Halococcus and Bacillus.");
  });
  it.each([
    "<i>unclosed",
    "orphan</i>",
    "<i></i>",
    "<i>nested <i>text</i></i>",
    "<i>crossed[[/i]]",
    "[[i]]crossed</i>",
    '<i onclick="alert(1)">unsafe</i>',
    "<I>uppercase</I>",
    "&lt;i&gt;escaped&lt;/i&gt;",
  ])("keeps unsupported or malformed markup literal: %s", (text) => {
    expect(parseSourceItalics(text)).toEqual([{ text, italic: false }]);
  });
});
