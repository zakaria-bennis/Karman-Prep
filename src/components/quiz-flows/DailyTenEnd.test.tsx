// @vitest-environment jsdom
// The Daily 10's "Box first" ending on real reward state, played with Reduce motion on so every
// moment stands finished: a new companion's moment, then the box with its mystery box offer, then
// the results with the balance. The companion never appears before the questions are over.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RunView } from "@/lib/assembler/run-types";
import type { RewardState } from "@/lib/rewards/economy";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "", variable: "", style: { fontFamily: "" } }),
}));
vi.mock("./FlowFrame", () => ({
  FlowFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/lib/quiz/reward-sound", () => ({
  playRewardSound: vi.fn(),
  quizSoundsEnabled: () => false,
}));
const state = vi.fn<() => Promise<{ ok: true; value: RewardState }>>();
const seen = vi.fn(async (_input: unknown) => ({ ok: true, value: null }));
vi.mock("@/app/dashboard/student/rewards/actions", () => ({
  actionRewardState: () => state(),
  actionCompanionsSeen: (input: unknown) => seen(input),
  actionOpenBox: vi.fn(),
  actionWear: vi.fn(),
}));
import { DailyTenEnd } from "./DailyTenEnd";

const run: RunView = {
  id: "r1",
  kind: "daily-ten",
  title: "Daily 10",
  scope: null,
  grading: "instant",
  startedAt: "2026-11-12T08:00:00.000Z",
  completedAt: "2026-11-12T08:12:00.000Z",
  sections: [],
  current: null,
  reviews: {},
  answered: 10,
  total: 10,
  result: { right: 8, total: 10, sections: [], skills: [], tokens: 90, streak: 7 },
} as unknown as RunView;

const user = { name: "Sam", email: null, streak: 6, nav: [], menu: [] };

const rewards = (over: Partial<RewardState> = {}): RewardState => ({
  earned: 420,
  balance: 330,
  boxesOpened: 0,
  companions: [
    { animal: "fox", seen: true },
    { animal: "bunny", seen: false },
  ],
  accessories: [],
  wear: { animal: "fox", accessory: null },
  ...over,
});

beforeEach(() => {
  localStorage.setItem("karman-motion", "still");
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  seen.mockClear();
});

describe("the Daily 10 ending", () => {
  it("plays a new companion, then the box with its offer, then the results", async () => {
    state.mockResolvedValue({ ok: true, value: rewards() });
    await act(async () => {
      render(<DailyTenEnd user={user} run={run} />);
    });
    expect(screen.getByRole("heading", { name: "The bunny joins you" })).toBeInTheDocument();
    expect(screen.getByText("For 7 Daily 10s in a row")).toBeInTheDocument();
    expect(seen).toHaveBeenCalledWith({ animals: ["bunny"] });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Continue/ })));
    expect(screen.getByText("Enough for a mystery box")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Tokens: 330" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open it/ })).toBeInTheDocument();

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Save it for later" }))
    );
    expect(screen.getByRole("heading", { name: "Your Daily 10 is done" })).toBeInTheDocument();
    expect(screen.getByText("tokens to spend", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rewards" })).toHaveAttribute(
      "href",
      "/dashboard/student/rewards"
    );
  });

  it("goes straight to the results when no box can be opened and no one joined", async () => {
    state.mockResolvedValue({
      ok: true,
      value: rewards({ balance: 120, companions: [{ animal: "fox", seen: true }] }),
    });
    await act(async () => {
      render(<DailyTenEnd user={user} run={run} />);
    });
    expect(screen.getByRole("heading", { name: "Your Daily 10 is done" })).toBeInTheDocument();
    expect(screen.queryByText("Enough for a mystery box")).not.toBeInTheDocument();
    expect(seen).not.toHaveBeenCalled();
  });
});
