// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelChanges } from "./LevelBanner";

const playRewardSound = vi.hoisted(() => vi.fn());
vi.mock("@/lib/quiz/reward-sound", () => ({ playRewardSound }));
vi.mock("@/components/portal", () => ({
  Fox: () => null,
  levelName: (n: number) => ["Not started", "Learning", "Practiced", "Mastered"][n] ?? "",
}));

describe("LevelChanges on an end screen", () => {
  it("lists each skill once at its final level, with one sound", () => {
    render(
      <LevelChanges
        changes={[
          { skill: "Central Ideas and Details", from: 1, to: 2 },
          { skill: "Linear equations", from: 2, to: 3 },
          { skill: "Central Ideas and Details", from: 2, to: 3 },
        ]}
      />
    );
    const items = screen.getAllByRole("status");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("Central Ideas and Details");
    expect(playRewardSound).toHaveBeenCalledTimes(1);
  });
  it("shows nothing when no level moved", () => {
    const { container } = render(<LevelChanges changes={[]} />);
    expect(container.textContent).toBe("");
  });
});
