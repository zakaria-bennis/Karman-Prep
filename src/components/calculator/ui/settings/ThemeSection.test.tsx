// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/calculator/theme/choice";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { ThemeChoiceContext, ThemeSection } from "./ThemeSection";

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

function Picker(props: { initial: ThemeChoice; onChoose(choice: ThemeChoice): void }) {
  const [choice, setChoice] = useState(props.initial);
  const choose = (next: ThemeChoice) => {
    props.onChoose(next);
    setChoice(next);
  };
  return (
    <ThemeChoiceContext.Provider value={{ choice, choose }}>
      <ThemeSection />
    </ThemeChoiceContext.Provider>
  );
}

it("is a radio group named Theme with Auto, Classic and the 12 site themes, the current one checked", () => {
  render(<Picker initial="classic" onChoose={() => {}} />);
  const group = screen.getByRole("radiogroup", { name: "Theme" });
  const radios = within(group).getAllByRole("radio");
  expect(radios.map((r) => r.getAttribute("value"))).toEqual([...THEME_CHOICES]);
  expect(radios.map((r) => r.closest("label")!.textContent)).toEqual([
    "Auto",
    "Classic",
    "Observatory",
    "Charcoal",
    "Forest",
    "Warm ivory",
    "Clean paper",
    "Sand",
    "Sage",
    "Lavender",
    "Peach",
    "Rose",
    "Blush",
    "Plum",
  ]);
  expect(within(group).getByRole("radio", { name: "Classic" })).toBeChecked();
  expect(within(group).getAllByRole("radio", { checked: true })).toHaveLength(1);
});

it("each swatch shows its skin's paper and accent; Auto shows the skin the site theme gives now", () => {
  document.documentElement.dataset.theme = "plum";
  const { container } = render(<Picker initial="auto" onChoose={() => {}} />);
  const swatch = (choice: string) =>
    container.querySelector<HTMLElement>(`[data-theme-choice="${choice}"] .kc-theme-swatch`)!;
  expect(swatch("forest").style.getPropertyValue("--kc-swatch-paper")).toBe(
    SKIN_COLORS.forest.normal.roles.paper
  );
  expect(swatch("forest").style.getPropertyValue("--kc-swatch-accent")).toBe(
    SKIN_COLORS.forest.normal.roles.accent
  );
  expect(swatch("auto").style.getPropertyValue("--kc-swatch-paper")).toBe(
    SKIN_COLORS.plum.normal.roles.paper
  );
});

it("a click, Space or Enter picks a theme (arrow keys: tests/calculator/theme-picker.spec.ts)", async () => {
  const user = userEvent.setup();
  const onChoose = vi.fn();
  render(<Picker initial="auto" onChoose={onChoose} />);
  await user.click(screen.getByRole("radio", { name: "Sage" }));
  expect(onChoose).toHaveBeenLastCalledWith("sage");
  expect(screen.getByRole("radio", { name: "Sage" })).toBeChecked();
  act(() => screen.getByRole("radio", { name: "Plum" }).focus());
  await user.keyboard("{Enter}");
  expect(onChoose).toHaveBeenLastCalledWith("plum");
  act(() => screen.getByRole("radio", { name: "Rose" }).focus());
  await user.keyboard(" ");
  expect(onChoose).toHaveBeenLastCalledWith("rose");
  expect(screen.getByRole("radio", { name: "Rose" })).toBeChecked();
});

it("renders nothing without a theme choice to show (harness pages)", () => {
  const { container } = render(<ThemeSection />);
  expect(container).toBeEmptyDOMElement();
});
