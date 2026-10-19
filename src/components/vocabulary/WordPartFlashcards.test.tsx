// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WordPartFlashcards from "./WordPartFlashcards";

describe("WordPartFlashcards", () => {
  it("filters groups, flips to the meaning, and resets face when moving", () => {
    render(<WordPartFlashcards />);
    expect(screen.getByText("a-")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Roots" }));
    expect(screen.getByText("acerb")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Word part acerb/ }));
    expect(screen.getByText("bitter or harsh")).toBeVisible();
    fireEvent.click(screen.getByText("Notes and sources"));
    expect(screen.getByRole("link", { name: "Source 1" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("acr")).toBeVisible();
    expect(screen.queryByText("bitter or harsh")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Suffixes" }));
    expect(screen.getByText("-able")).toBeVisible();
    expect(screen.getByText("Suffixes · 1 of 50")).toBeVisible();
  });
});
