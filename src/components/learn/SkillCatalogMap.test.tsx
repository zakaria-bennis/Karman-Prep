// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import SkillCatalogMap from "./SkillCatalogMap";

afterEach(cleanup);
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("39-skill menu and preserved lesson history", () => {
  it("shows the 20 RW skills in four domains with no broad grammar placeholders", () => {
    render(<SkillCatalogMap subject="reading" history={[]} />);
    expect(screen.getByText("20 skills · 4 domains")).toBeTruthy();
    const index = screen.getByRole("complementary", { name: "Skills index" });
    expect(within(index).getAllByRole("button")).toHaveLength(20);
    expect(within(index).getAllByRole("heading")).toHaveLength(4);
    expect(screen.queryByText("Boundaries")).toBeNull();
    expect(screen.queryByText("Form, Structure, and Sense")).toBeNull();
  });

  it("displays a preserved earlier result only on its lesson, not as canonical mastery", () => {
    render(
      <SkillCatalogMap
        subject="math"
        history={[
          { node_id: "ma-00", status: "mastered", score: 95, attempts: 4, watch_percentage: 60 },
        ]}
      />
    );
    const index = screen.getByRole("complementary", { name: "Skills index" });
    expect(within(index).getAllByRole("button")).toHaveLength(19);
    fireEvent.click(
      within(index).getByRole("button", { name: "Linear equations in one variable" })
    );
    expect(screen.getByText("Earlier lesson: mastered")).toBeTruthy();
    expect(screen.getByText("Earlier lesson score: 95")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Linear equations (one variable)" }).getAttribute("href")
    ).toBe("/learn/math/ma-00");
    expect(screen.queryByText(/% mastered/)).toBeNull();
    expect(screen.getByRole("link", { name: "Earlier practice" })).toHaveAttribute(
      "href",
      "/learn/earlier/math"
    );
  });

  it("keeps ambiguous old verb-tense results out of both new selectable practice paths", () => {
    render(
      <SkillCatalogMap
        subject="reading"
        history={[
          { node_id: "rw-51", status: "mastered", score: 100, attempts: 2, watch_percentage: 100 },
        ]}
      />
    );
    const index = screen.getByRole("complementary", { name: "Skills index" });
    fireEvent.click(
      within(index).getByRole("button", { name: "Finite versus nonfinite verb forms" })
    );
    expect(screen.getByText(/Practice for this skill is being organized/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Verb tense" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "All earlier learning history" }).getAttribute("href")
    ).toBe("/learn/history");
  });
});
