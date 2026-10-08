// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/daily-challenge/server", () => ({ loadDailySlot: m.load }));
vi.mock("@/components/learn/DailyChallenge", () => ({
  default: () => <div>Daily question slots</div>,
}));
vi.mock("@/components/learn/LiveLearning", () => ({
  default: () => <div>Unscheduled live learning</div>,
}));
vi.mock("@/components/vocabulary/DailyWordLab", () => ({ default: () => <div>Word puzzle</div> }));
vi.mock("@/components/vocabulary/WordPartFlashcards", () => ({
  default: () => <div>Word part cards</div>,
}));
import Page from "./page";
beforeEach(() => {
  vi.clearAllMocks();
  m.load.mockResolvedValue({ state: "empty" });
});
it("loads both daily slots using one day and mounts the committed features", async () => {
  render(await Page());
  expect(m.load).toHaveBeenCalledTimes(2);
  expect(m.load.mock.calls[0][0]).toBe("math");
  expect(m.load.mock.calls[1][0]).toBe("reading");
  expect(m.load.mock.calls[0][1]).toBe(m.load.mock.calls[1][1]);
  expect(screen.getByRole("heading", { level: 1, name: "Daily practice" })).toBeInTheDocument();
  for (const text of [
    "Daily question slots",
    "Word puzzle",
    "Word part cards",
    "Unscheduled live learning",
  ])
    expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Daily practice sections" })).toBeInTheDocument();
});
