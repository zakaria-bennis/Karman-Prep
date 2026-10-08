// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WordPartFlashcards from "./WordPartFlashcards";

describe("WordPartFlashcards", () => {
  it("filters groups, flips to the meaning, and resets face when moving", () => {
    render(<WordPartFlashcards />);
    expect(screen.getByText("pre-")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Roots" }));
    expect(screen.getByText("dict")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Word part dict/ }));
    expect(screen.getByText("To say or speak.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("port")).toBeVisible();
    expect(screen.queryByText("To say or speak.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Suffixes" }));
    expect(screen.getByText("-able")).toBeVisible();
    expect(screen.getByText("Suffixes · 1 of 6")).toBeVisible();
  });
});
