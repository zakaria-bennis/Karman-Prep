// @vitest-environment jsdom
//
// The Reading and Writing lesson pictures render their words: every kind, and the road with every
// turn. jsdom has no layout, so the sentence's link arc is drawn only in the test that gives the blocks
// a made-up layout.
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RoadFigure } from "@/lib/lessons/figures";
import {
  NotesFig,
  PassageFig,
  RoadFig,
  SentenceFig,
  TimelineFig,
  TwoTextsFig,
  WordsFig,
} from "./TextFigs";

/** The words a reader sees: the picture's text without its hidden layers, spaces evened. */
function shown(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("PassageFig", () => {
  it("marks each span it finds, with its note, keeps the bold, and skips a missing one", () => {
    render(
      <PassageFig
        fig={{
          kind: "passage",
          text: "Most frogs lay eggs in water. The gliding frog **lays its eggs on leaves** above a pond.",
          marks: [
            { find: "lay eggs in water", tone: "blue", note: "usual" },
            { find: "on leaves", tone: "warm", note: "different" },
            { find: "in the desert", tone: "red", note: "missing" },
          ],
        }}
      />
    );
    const fig = screen.getByRole("figure", {
      name: "A passage with 2 marked parts: usual, different",
    });
    const text = shown(fig);
    expect(text).toContain("Most frogs lay eggs in water");
    expect(text).toContain("The gliding frog lays its eggs on leaves");
    expect(text).toContain("usual");
    expect(text).toContain("different");
    expect(text).not.toContain("missing");
    const marks = [...fig.querySelectorAll("mark")];
    expect(marks.map((m) => m.textContent)).toEqual(["lay eggs in water", "on leaves"]);
    // the cut lands inside **...**, so the marked words stay bold
    expect(marks[1].querySelector("b")?.textContent).toBe("on leaves");
  });
});

describe("TwoTextsFig", () => {
  it("shows both texts, the relation and the note", () => {
    render(
      <TwoTextsFig
        fig={{
          kind: "twoTexts",
          a: { title: "Text 1", claim: "Bees find flowers by **color**." },
          b: { title: "Text 2", claim: "Bees find flowers mostly by smell." },
          relation: "disagree",
          note: "Text 2 pushes back on Text 1.",
        }}
      />
    );
    const fig = screen.getByRole("figure", {
      name: "Two texts, Text 1 and Text 2: Text 2 disagrees with Text 1",
    });
    const text = shown(fig);
    expect(text).toContain("Bees find flowers by color.");
    expect(text).toContain("Bees find flowers mostly by smell.");
    expect(text).toContain("disagrees");
    expect(text).toContain("Text 2 pushes back on Text 1.");
  });
});

describe("NotesFig", () => {
  it("shows the goal and tags only the picked notes", () => {
    render(
      <NotesFig
        fig={{
          kind: "notes",
          goal: "Explain how bees share where food is.",
          notes: [
            "Bees live in colonies.",
            "A forager dances when it returns.",
            "The dance points toward the flowers.",
            "Honey keeps for years.",
          ],
          pick: [1, 2, 9],
        }}
      />
    );
    const fig = screen.getByRole("figure", {
      name: "A writing goal and 4 notes; 2 notes serve the goal",
    });
    expect(within(fig).getByText("Goal")).toBeTruthy();
    expect(shown(fig)).toContain("Explain how bees share where food is.");
    expect(within(fig).getAllByText("use")).toHaveLength(2);
    const used = within(fig)
      .getAllByText("use")
      .map((tag) => tag.parentElement?.textContent);
    expect(used).toEqual([
      "A forager dances when it returns.use",
      "The dance points toward the flowers.use",
    ]);
  });
});

describe("RoadFig", () => {
  const turns: [RoadFigure["turn"], string, RegExp][] = [
    ["add", "Moreover,", /goes on the same way/],
    ["contrast", "However,", /turns back the other way/],
    ["cause", "As a result,", /falling domino/],
    ["sequence", "Then,", /one stair at a time/],
    ["example", "For example,", /one small example/],
  ];

  it.each(turns)("draws the %s road with its sign and the sentence after", (turn, word, say) => {
    render(
      <RoadFig
        fig={{
          kind: "road",
          turn,
          before: "Most frogs lay their eggs in water.",
          after: "the gliding frog lays its eggs on leaves.",
          word,
        }}
      />
    );
    const fig = screen.getByRole("figure", { name: say });
    expect(fig.getAttribute("aria-label")).toContain(`"${word}"`);
    const text = shown(fig);
    expect(text).toContain("Most frogs lay their eggs in water.");
    expect(text).toContain(`${word} the gliding frog lays its eggs on leaves.`);
    // the word twice: on the sign, and in bold at the start of the sentence after
    const found = within(fig).getAllByText(word);
    expect(found).toHaveLength(2);
    expect(found.some((el) => el.closest("b"))).toBe(true);
  });
});

describe("SentenceFig", () => {
  const fig = {
    kind: "sentence" as const,
    parts: [
      { text: "The list of items", role: "subject" as const },
      { text: "on the shelf", role: "extra" as const },
      { text: "are", role: "verb" as const },
      { text: "ready." },
    ],
    joints: [
      { after: 1, mark: ",", ok: false },
      { after: 7, mark: ";", ok: true },
    ],
    link: { from: 0, to: 2, ok: false, label: "list is" },
  };

  it("shows the blocks, their role tags and the joints, and no arc without a layout", () => {
    render(<SentenceFig fig={fig} />);
    const el = screen.getByRole("figure", { name: /A sentence in 4 blocks/ });
    expect(el.getAttribute("aria-label")).toContain(
      '"The list of items" linked to "are" (list is), which is wrong'
    );
    for (const words of ["The list of items", "on the shelf", "are", "ready."])
      expect(within(el).getByText(words)).toBeTruthy();
    for (const tag of ["subject", "extra info", "verb"])
      expect(within(el).getByText(tag)).toBeTruthy();
    expect(within(el).getByText(",")).toBeTruthy();
    expect(within(el).getByText("wrong here")).toBeTruthy();
    // a joint after a part that is not there is left out
    expect(within(el).queryByText(";")).toBeNull();
    expect(el.querySelector("svg")).toBeNull();
  });

  describe("with a layout", () => {
    const saved = new Map<string, PropertyDescriptor | undefined>();
    afterEach(() => {
      for (const [key, d] of saved) if (d) Object.defineProperty(HTMLElement.prototype, key, d);
      saved.clear();
    });

    /** Every block 70 wide, side by side on one row; each box is the top 30 of its block, measured from the figure. */
    function fakeLayout() {
      const at = (el: HTMLElement) => Number(el.dataset.item?.slice(1) ?? el.dataset.box ?? 0);
      const get: Record<string, (el: HTMLElement) => unknown> = {
        offsetParent: (el) => el.closest('[role="figure"]'),
        offsetLeft: (el) => at(el) * 80,
        offsetTop: () => 0,
        offsetWidth: () => 70,
        offsetHeight: (el) => (el.dataset.box ? 30 : 46),
      };
      for (const [key, fn] of Object.entries(get)) {
        saved.set(key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key));
        Object.defineProperty(HTMLElement.prototype, key, {
          configurable: true,
          get(this: HTMLElement) {
            return fn(this);
          },
        });
      }
    }

    it("draws the link as an arc above the two blocks, with its label", () => {
      fakeLayout();
      render(<SentenceFig fig={fig} />);
      const el = screen.getByRole("figure", { name: /A sentence in 4 blocks/ });
      const arc = el.querySelector("svg path");
      // from the middle of block 0 (x 35) to the middle of block 2 (x 195), just above them
      expect(arc?.getAttribute("d")).toMatch(/^M35 -3C35 -29 195 -29 195 -3$/);
      expect(within(el).getByText("list is")).toBeTruthy();
      // the row under the arc gets room above it
      expect((el.querySelector('[data-item="p0"]') as HTMLElement).style.marginTop).toBe("34px");
    });
  });
});

describe("TimelineFig", () => {
  it("puts the events in time order, with only the zones in use", () => {
    render(
      <TimelineFig
        fig={{
          kind: "timeline",
          events: [
            { label: "she visits Lyon", at: "future", verb: "will visit" },
            { label: "Maria studied French", at: "earlier past", verb: "had studied" },
            { label: "she moved to Paris", at: "past", verb: "moved" },
          ],
        }}
      />
    );
    const fig = screen.getByRole("figure", { name: /A timeline from earlier to later/ });
    const text = shown(fig);
    const order = ["earlier past", "Maria studied French", "she moved to Paris", "future"];
    const places = order.map((words) => text.indexOf(words));
    expect(places.every((p) => p >= 0)).toBe(true);
    expect([...places].sort((a, b) => a - b)).toEqual(places);
    expect(within(fig).getByText("past")).toBeTruthy();
    expect(within(fig).queryByText("now")).toBeNull();
    expect(within(fig).getByText("had studied").closest("b")).toBeTruthy();
    expect(within(fig).getByText("will visit").closest("b")).toBeTruthy();
  });
});

describe("WordsFig", () => {
  it("shows the blank, the words with their notes, and the sentence filled", () => {
    render(
      <WordsFig
        fig={{
          kind: "words",
          sentence: "The bridge proved ______, standing through a century of storms.",
          words: [
            { word: "fragile", fit: false, note: "the opposite" },
            { word: "resilient", fit: true },
            { word: "ornate", fit: false, note: "about looks" },
          ],
        }}
      />
    );
    const fig = screen.getByRole("figure", {
      name: 'A sentence with a blank and 3 words that might fill it; "resilient" fits',
    });
    expect(within(fig).getByRole("img", { name: "blank" })).toBeTruthy();
    for (const words of ["fragile", "ornate", "the opposite", "about looks"])
      expect(within(fig).getByText(words)).toBeTruthy();
    const filled = fig.querySelector("mark");
    expect(filled?.textContent).toBe("resilient");
    expect(filled?.closest("p")?.textContent).toBe(
      "The bridge proved resilient, standing through a century of storms."
    );
  });
});
