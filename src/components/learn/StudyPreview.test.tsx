// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import StudyPreview from "./StudyPreview";
import { getCatalogSkills, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";

afterEach(cleanup);
it("opens every canonical domain and links its skills to the existing protected practice route", () => {
  render(<StudyPreview />);
  for (const subject of ["reading", "math"] as const) {
    const switcher = screen.getByRole("button", {
      name: subject === "reading" ? "Reading & Writing" : "Math",
    });
    fireEvent.click(switcher);
    expect(switcher).toHaveAttribute("aria-pressed", "true");
    const domains = SKILL_DOMAINS.filter((domain) => domain.subject === subject);
    expect(domains).toHaveLength(4);
    for (const domain of domains) {
      const button = screen.getByRole("button", { name: domain.label });
      if (button.getAttribute("aria-expanded") === "false") fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      for (const skill of getCatalogSkills(subject).filter(
        (entry) => entry.domainId === domain.id
      )) {
        expect(screen.getByRole("link", { name: skill.label })).toHaveAttribute(
          "href",
          `/learn/practice/${skill.id}`
        );
      }
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
    expect(
      screen.getByRole("link", {
        name: new RegExp(`Open ${subject === "reading" ? "Reading & Writing" : "Math"} practice`),
      })
    ).toHaveAttribute("href", `/learn/${subject}`);
  }
});
it("initially exposes the named reading skills and resets the open domain when switching subjects", () => {
  render(<StudyPreview />);
  for (const name of ["Central Ideas and Details", "Command of Evidence", "Inferences"]) {
    expect(screen.getByRole("link", { name })).toBeVisible();
  }
  fireEvent.click(screen.getByRole("button", { name: "Math" }));
  expect(screen.queryByRole("link", { name: "Inferences" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Algebra" })).toHaveAttribute("aria-expanded", "true");
});
