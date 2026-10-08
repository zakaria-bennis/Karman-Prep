// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import StudyPreview from "./StudyPreview";
import { getCatalogSkills } from "@/data/curriculum/skill-catalog";

afterEach(cleanup);
it("explores the real subject catalogue and links to the selected guide", () => {
  render(<StudyPreview />);
  expect(screen.getByText(getCatalogSkills("reading")[0].label)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Math" }));
  expect(screen.getByText(getCatalogSkills("math")[0].label)).toBeTruthy();
  expect(screen.getByRole("link", { name: /Explore the skill guide/ }).getAttribute("href")).toBe(
    "/learn/math"
  );
  expect(screen.getByRole("button", { name: "Math" }).getAttribute("aria-pressed")).toBe("true");
});
