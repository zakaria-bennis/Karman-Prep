// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { dailyWords } from "@/data/vocabulary/content";
import { puzzleForDay, utcDay } from "@/lib/vocabulary/daily-word";
import DailyWordLab from "./DailyWordLab";

const today = () => utcDay(new Date());
const answer = () => puzzleForDay(today()).word;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, text: async () => `${answer().toLowerCase()},other\n` }))
  );
});

describe("DailyWordLab", () => {
  it("accepts a mobile text-input guess and reveals meaning after a win", async () => {
    render(<DailyWordLab />);
    const input = await screen.findByLabelText("Your next guess");
    await waitFor(() => expect(input).toBeEnabled());
    expect(screen.queryByText(/_____/)).toBeNull();
    expect(
      screen.queryByText(dailyWords.find((item) => item.word === answer())!.meaning)
    ).toBeNull();
    fireEvent.change(input, { target: { value: answer().toLowerCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
    expect(screen.getByText("You found the word")).toBeVisible();
    expect(screen.getByText(puzzleForDay(today()).meaning)).toBeVisible();
    expect(JSON.parse(localStorage.getItem(`karman:vocabulary:daily:v1:${today()}`)!)).toEqual([
      answer(),
    ]);
  });

  it("restores guesses after reload and displays meaning after a loss", async () => {
    const wrong = "Z".repeat(answer().length);
    localStorage.setItem(`karman:vocabulary:daily:v1:${today()}`, JSON.stringify([wrong]));
    const { unmount } = render(<DailyWordLab />);
    const first = await screen.findByRole("group", { name: "Guess 1" });
    expect(within(first).getAllByLabelText(/Z, /)).toHaveLength(answer().length);
    unmount();
    localStorage.setItem(
      `karman:vocabulary:daily:v1:${today()}`,
      JSON.stringify(Array(6).fill(wrong))
    );
    render(<DailyWordLab />);
    expect(await screen.findByText("Today’s word")).toBeVisible();
    expect(screen.getByText(puzzleForDay(today()).meaning)).toBeVisible();
  });

  it("rejects a nonword and keeps all tries", async () => {
    render(<DailyWordLab />);
    const input = await screen.findByLabelText("Your next guess");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Z".repeat(answer().length) } });
    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
    expect(screen.getByText("That word is not in the word list.")).toBeVisible();
    expect(screen.getByText("6 tries left")).toBeVisible();
  });
});
