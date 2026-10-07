// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BottomToolbar } from "./BottomToolbar";
import type { QuizState } from "@/contexts/QuizContext";

it("reuses the existing Math calculator entrypoint and leaves answer state untouched", () => {
  const state = {
    targetLength: 4,
    records: [],
    currentIndex: 1,
    selectedAnswer: "B",
    isScratchpadOpen: false,
  } as unknown as QuizState;
  const before = { ...state };
  const { rerender } = render(
    <BottomToolbar subject="math" onScratchpad={vi.fn()} onFlag={vi.fn()} state={state} />
  );
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(state).toEqual(before);
  expect(screen.getByRole("button", { name: "Scratchpad" })).toBeInTheDocument();
  rerender(
    <BottomToolbar subject="reading" onScratchpad={vi.fn()} onFlag={vi.fn()} state={state} />
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
