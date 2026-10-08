// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { dailyWords } from "@/data/vocabulary/content";
import { legacyPuzzleForDay, puzzleForDay, utcDay } from "@/lib/vocabulary/daily-word";
import DailyWordLab from "./DailyWordLab";

const today = () => utcDay(new Date());
const answer = () => puzzleForDay(today()).word;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      text: async () => readFileSync(`public${url}`, "utf8"),
    }))
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
    expect(JSON.parse(localStorage.getItem(`karman:vocabulary:daily:v2:${today()}`)!)).toEqual({
      wordId: puzzleForDay(today()).id,
      guesses: [answer()],
    });
  });

  it("keeps the original answer for an already-started v1 game through reload and loss", async () => {
    const legacy = legacyPuzzleForDay(today());
    const wrong = "Z".repeat(legacy.word.length);
    localStorage.setItem(`karman:vocabulary:daily:v1:${today()}`, JSON.stringify([wrong]));
    const { unmount } = render(<DailyWordLab />);
    const first = await screen.findByRole("group", { name: "Guess 1" });
    expect(within(first).getAllByLabelText(/Z, /)).toHaveLength(legacy.word.length);
    const input = await screen.findByLabelText("Your next guess");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: legacy.word } });
    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
    expect(JSON.parse(localStorage.getItem(`karman:vocabulary:daily:v1:${today()}`)!)).toEqual([
      wrong,
      legacy.word,
    ]);
    expect(localStorage.getItem(`karman:vocabulary:daily:v2:${today()}`)).toBeNull();
    unmount();
    localStorage.setItem(
      `karman:vocabulary:daily:v1:${today()}`,
      JSON.stringify(Array(6).fill(wrong))
    );
    render(<DailyWordLab />);
    expect(await screen.findByText("Today’s word")).toBeVisible();
    expect(screen.getByText(legacy.meaning)).toBeVisible();
    expect(screen.getByText("Your earlier guesses are preserved for today's word.")).toBeVisible();
  });

  it("keeps 15-letter tiles legible in a scrollable board and reveals the selected sense", async () => {
    const longWord = dailyWords.find((entry) => entry.word === "SYNCHRONIZATION")!;
    localStorage.setItem(
      `karman:vocabulary:daily:v2:${today()}`,
      JSON.stringify({ wordId: longWord.id, guesses: [] })
    );
    render(<DailyWordLab />);
    const board = await screen.findByRole("region", { name: "Letter guesses" });
    expect(board).toHaveAttribute("tabindex", "0");
    expect(screen.getByText(/Swipe the letter board or use arrow keys/)).toBeVisible();
    fireEvent.keyDown(board, { key: "ArrowRight" });
    expect(board.scrollLeft).toBe(72);
    fireEvent.keyDown(board, { key: "Home" });
    expect(board.scrollLeft).toBe(0);
    expect(within(screen.getByRole("group", { name: "Guess 1" })).getAllByRole("img")).toHaveLength(
      15
    );
    expect(screen.queryByText(longWord.meaning)).toBeNull();
    const input = await screen.findByLabelText("Your next guess");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: longWord.word.toLowerCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
    expect(screen.getByText(longWord.meaning)).toBeVisible();
    expect(screen.getByText(longWord.caution!)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Released practice-test answer choice" })
    ).toHaveAttribute("href", longWord.satSourceUrl);
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
