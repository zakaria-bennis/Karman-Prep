import { describe, expect, it } from "vitest";
import type { RunView } from "@/lib/assembler/run-types";
import { endFromRun } from "./end-from-run";

function run(over: Partial<RunView> = {}): RunView {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    kind: "practice-set",
    title: "Circles",
    scope: "set72:m-circles",
    grading: "instant",
    startedAt: "2026-11-22T10:00:00Z",
    completedAt: "2026-11-22T10:08:00Z",
    sections: [
      {
        key: "main",
        title: "Circles",
        subject: "math",
        seconds: null,
        total: 8,
        breakBefore: false,
        done: true,
        topics: {},
        questions: [],
      },
    ],
    current: null,
    reviews: {},
    answered: 8,
    total: 8,
    result: null,
    ...over,
  };
}

const answers = (pattern: string) =>
  [...pattern].map((c, i) => ({
    questionId: `q${i}`,
    skill: "Circles",
    ok: c === "1",
    seconds: 40,
  }));

describe("endFromRun", () => {
  it("says a skill set with its level move and coins", () => {
    const end = endFromRun(
      run({
        result: {
          right: 6,
          total: 8,
          sections: [],
          skills: [],
          tokens: 0,
          play: {
            mode: "set",
            answers: answers("11110110"),
            coins: {
              total: 84,
              lines: [{ label: "Right answers", coins: 34 }],
              multiplier: 1.4,
              walletBefore: 300,
            },
            level: { skillId: "m-circles", skill: "Circles", from: 1, to: 2 },
          },
        },
      }),
      { wallet: 0 }
    );
    expect(end.activity).toBe("set");
    expect(end.right).toBe(6);
    expect(end.total).toBe(8);
    expect(end.level).toEqual({ skill: "Circles", from: 1, to: 2 });
    expect(end.coins).toBe(84);
    expect(end.wallet).toBe(300);
    expect(end.multiplier).toBe(1.4);
  });

  it("counts a Second chance as right", () => {
    const end = endFromRun(
      run({
        result: {
          right: 7,
          total: 8,
          sections: [],
          skills: [],
          tokens: 0,
          play: {
            mode: "set",
            answers: answers("11111110").map((a, i) => (i === 7 ? { ...a, rescued: true } : a)),
            coins: { total: 10, lines: [], multiplier: 1, walletBefore: 0 },
          },
        },
      }),
      { wallet: 0 }
    );
    expect(end.right).toBe(8);
  });

  it("says an endless run and whether it beat the best", () => {
    const end = endFromRun(
      run({
        scope: "endless:skill:m-circles",
        result: {
          right: 12,
          total: 15,
          sections: [],
          skills: [],
          tokens: 0,
          play: {
            mode: "endless",
            answers: answers("111111111111000"),
            coins: { total: 60, lines: [], multiplier: 1, walletBefore: 10 },
            endless: { run: 12, best: 9, hearts: 3 },
          },
        },
      }),
      { wallet: 0 }
    );
    expect(end.activity).toBe("endless");
    expect(end.endless).toEqual({ run: 12, best: 9, newBest: true, hearts: 3 });
  });

  it("falls back to the reviews and the portal's wallet when the run says nothing more", () => {
    const end = endFromRun(
      run({
        kind: "daily-ten",
        sections: [
          {
            key: "main",
            title: "Daily 10",
            subject: "reading",
            seconds: null,
            total: 2,
            breakBefore: false,
            done: true,
            topics: { a: "Transitions", b: "Circles" },
            questions: [
              { id: "a" },
              { id: "b" },
            ] as unknown as RunView["sections"][number]["questions"],
          },
        ],
        reviews: {
          a: { questionId: "a", isCorrect: true } as unknown as RunView["reviews"][string],
          b: { questionId: "b", isCorrect: false } as unknown as RunView["reviews"][string],
        },
      }),
      { wallet: 120 }
    );
    expect(end.activity).toBe("daily");
    expect(end.right).toBe(1);
    expect(end.answers.map((a) => a.skill)).toEqual(["Transitions", "Circles"]);
    expect(end.wallet).toBe(120);
  });
});
