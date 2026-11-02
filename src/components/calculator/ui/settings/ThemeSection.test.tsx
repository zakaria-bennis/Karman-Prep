// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/calculator/theme/choice";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { createEscapeStack, EscapeContext } from "../focus/escape-stack";
import { ThemeChoiceContext, ThemeSection } from "./ThemeSection";

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

const escape = createEscapeStack();

function Picker(props: { initial: ThemeChoice; onChoose(choice: ThemeChoice): void }) {
  const [choice, setChoice] = useState(props.initial);
  const choose = (next: ThemeChoice) => {
    props.onChoose(next);
    setChoice(next);
  };
  return (
    <EscapeContext.Provider value={escape}>
      <ThemeChoiceContext.Provider value={{ choice, choose }}>
        <ThemeSection />
      </ThemeChoiceContext.Provider>
    </EscapeContext.Provider>
  );
}

const button = () => screen.getByRole("combobox", { name: /^Theme/ });

it("is one combobox named by Theme and the current theme; its list holds Dark (the auto choice) and Classic, then Light and Dark groups of ten", async () => {
  render(<Picker initial="classic" onChoose={() => {}} />);
  expect(button()).toHaveAccessibleName("Theme Classic");
  expect(button()).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("listbox")).toBeNull(); // hidden while closed
  await userEvent.setup().click(button());
  expect(button()).toHaveAttribute("aria-expanded", "true");
  const list = screen.getByRole("listbox", { name: "Theme" });
  const options = within(list).getAllByRole("option");
  expect(options.map((o) => o.getAttribute("data-theme-choice"))).toEqual([...THEME_CHOICES]);
  expect(options.map((o) => o.textContent)).toEqual([
    "Dark",
    "Classic",
    "White",
    "Map",
    "Sage",
    "Dreamsicle",
    "Marigold",
    "Pastel Pink",
    "Sky",
    "Mint",
    "Lavender",
    "Sand",
    "Observatory",
    "Charcoal",
    "Forest",
    "Plum",
    "Midnight Navy",
    "Ocean",
    "Berry",
    "Slate",
    "Neon Night",
    "Ember",
  ]);
  const light = within(list).getByRole("group", { name: "Light" });
  const dark = within(list).getByRole("group", { name: "Dark" });
  expect(within(light).getAllByRole("option")).toHaveLength(10);
  expect(within(dark).getAllByRole("option")).toHaveLength(10);
  expect(within(list).getByRole("option", { name: "Classic" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(within(list).getAllByRole("option", { selected: true })).toHaveLength(1);
  // The button keeps focus and points at the active option, which starts on the current theme.
  expect(button()).toHaveAttribute(
    "aria-activedescendant",
    within(list).getByRole("option", { name: "Classic" }).id
  );
});

it("each swatch shows its skin's paper, keypad and accent; the auto choice (Dark) shows the skin the site theme gives now", async () => {
  document.documentElement.dataset.theme = "rose";
  const { container } = render(<Picker initial="auto" onChoose={() => {}} />);
  await userEvent.setup().click(button());
  const swatch = (choice: string) =>
    container.querySelector<HTMLElement>(`[data-theme-choice="${choice}"] .kc-theme-swatch`)!;
  const forest = SKIN_COLORS.forest.normal.roles;
  expect(swatch("forest").style.getPropertyValue("--kc-swatch-paper")).toBe(forest.paper);
  expect(swatch("forest").style.getPropertyValue("--kc-swatch-key")).toBe(forest.keyOperator);
  expect(swatch("forest").style.getPropertyValue("--kc-swatch-accent")).toBe(forest.accent);
  // The site's Rose shows the calculator's Pastel Pink.
  expect(swatch("auto").style.getPropertyValue("--kc-swatch-paper")).toBe(
    SKIN_COLORS.pink.normal.roles.paper
  );
});

it("a click on an option picks it and closes the list; the keyboard opens, moves, finds by letter and picks", async () => {
  const user = userEvent.setup();
  const onChoose = vi.fn();
  render(<Picker initial="auto" onChoose={onChoose} />);
  await user.click(button());
  await user.click(screen.getByRole("option", { name: "Sage" }));
  expect(onChoose).toHaveBeenLastCalledWith("sage");
  expect(button()).toHaveAttribute("aria-expanded", "false");
  expect(button()).toHaveAccessibleName("Theme Sage");
  expect(button()).toHaveFocus();
  // ArrowDown opens on the current theme; two more move to Karman; Enter picks it.
  await user.keyboard("{ArrowDown}");
  const active = () => document.getElementById(button().getAttribute("aria-activedescendant")!);
  expect(active()).toHaveTextContent("Sage");
  await user.keyboard("{ArrowDown}{ArrowDown}");
  expect(active()).toHaveTextContent("Marigold");
  await user.keyboard("{Enter}");
  expect(onChoose).toHaveBeenLastCalledWith("marigold");
  // Space opens; End goes to the last theme; typing "o" finds Observatory, then Ocean.
  await user.keyboard(" ");
  await user.keyboard("{End}");
  expect(active()).toHaveTextContent("Ember");
  await user.keyboard("o");
  expect(active()).toHaveTextContent("Observatory");
  await user.keyboard("o");
  expect(active()).toHaveTextContent("Ocean");
  await user.keyboard("{Home}");
  expect(active()).toHaveTextContent("Dark");
  await user.keyboard(" ");
  expect(onChoose).toHaveBeenLastCalledWith("auto");
});

it("Escape (its own layer) and Tab close the list without picking", async () => {
  const user = userEvent.setup();
  const onChoose = vi.fn();
  render(<Picker initial="plum" onChoose={onChoose} />);
  await user.click(button());
  await user.keyboard("{ArrowDown}");
  act(() => {
    expect(escape.handleEscape()).toBe(true);
  });
  expect(button()).toHaveAttribute("aria-expanded", "false");
  expect(button()).toHaveFocus();
  await user.keyboard("{ArrowUp}");
  expect(button()).toHaveAttribute("aria-expanded", "true");
  await user.tab();
  expect(button()).toHaveAttribute("aria-expanded", "false");
  expect(onChoose).not.toHaveBeenCalled();
});

it("renders nothing without a theme choice to show (harness pages)", () => {
  const { container } = render(<ThemeSection />);
  expect(container).toBeEmptyDOMElement();
});
