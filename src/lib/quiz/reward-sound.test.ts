// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { quizSoundsEnabled, setQuizSounds } from "./reward-sound";

beforeEach(() => localStorage.clear());

describe("quiz reward sounds", () => {
  it("are on by default (founder, 2026-10-27)", () => {
    expect(quizSoundsEnabled()).toBe(true);
  });
  it("the switch is remembered on this device", () => {
    setQuizSounds(false);
    expect(quizSoundsEnabled()).toBe(false);
    expect(localStorage.getItem("karman-quiz-sounds")).toBe("off");
  });
});
