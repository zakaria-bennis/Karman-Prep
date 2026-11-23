import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-radical-and-rational-equations",
  tests:
    "Solving equations with a square root or with $x$ in a fraction's bottom, and throwing out answers that do not really work.",
  spot: "An equation with $x$ under a square root, or $x$ in the bottom of a fraction. Questions often ask for all solutions, or say a value is extraneous.",
  idea: [
    "To solve a **radical equation**, get the root alone on one side, then square both sides.",
    "To solve a **rational equation**, multiply every term by the common bottom. The fractions disappear.",
    "Both moves can add **false solutions**, also called extraneous solutions. They solve the new equation but fail the original one.",
    "So **check every answer** in the original. Cross out any that makes a square root equal a negative number, or makes a bottom equal 0.",
  ],
  rules: [
    "Root alone, then square",
    "Clear fractions: multiply by the bottom",
    "$\\sqrt{\\ \\ }$ is never negative",
    "A bottom is never 0",
  ],
  figure: {
    kind: "balance",
    left: "$\\sqrt{x + 7}$",
    right: "$x - 5$",
    steps: [
      { move: "Square both sides", left: "$x + 7$", right: "$x^2 - 10x + 25$" },
      { move: "Move every term to one side", left: "$0$", right: "$x^2 - 11x + 18$" },
      { move: "Factor", left: "$0$", right: "$(x - 2)(x - 9)$" },
      { move: "Check $x = 9$", left: "$\\sqrt{16} = 4$", right: "$9 - 5 = 4$" },
      { move: "Check $x = 2$", left: "$\\sqrt{9} = 3$", right: "$2 - 5 = -3$" },
    ],
  },
  strategy: {
    name: "Solve, then check",
    steps: [
      "Get the root alone, or find the common bottom.",
      "Square both sides, or multiply every term by the common bottom.",
      "Solve the equation that is left.",
      "Check every answer in the original. Cross out any that fails.",
    ],
  },
  examples: [
    {
      title: "A radical",
      problem: "What is the solution to $\\sqrt{x + 1} + 1 = x$?",
      steps: [
        { say: "Get the root alone first: subtract 1.", show: "$\\sqrt{x + 1} = x - 1$" },
        {
          say: "Square both sides. The right side is $(x - 1)(x - 1)$.",
          show: "$x + 1 = x^2 - 2x + 1$",
        },
        {
          say: "Move every term to one side and factor.",
          show: "$0 = x(x - 3)$, so $x = 0$ or $x = 3$",
        },
        {
          say: "Check both in the original. $x = 3$ works: $\\sqrt{4} + 1 = 3$. $x = 0$ fails: $\\sqrt{1} + 1 = 2$, not 0.",
        },
      ],
      answer: "$x = 3$",
      checkIn: {
        text: "What is the solution to $\\sqrt{x + 2} + 4 = x$?",
        choices: ["$x = 7$", "$x = 2$", "$x = 2$ or $x = 7$", "No solution"],
        right: 0,
        why: "Get the root alone: $\\sqrt{x + 2} = x - 4$. Squaring gives $x^2 - 9x + 14 = 0$, so $x = 2$ or $x = 7$. Only 7 checks: $\\sqrt{9} + 4 = 7$. $x = 2$ gives $\\sqrt{4} + 4 = 6$, not 2: the **Skipping the check** trap.",
        twin: {
          text: "What is the solution to $\\sqrt{x + 3} + 3 = x$?",
          choices: ["$x = 1$", "$x = 1$ or $x = 6$", "$x = 6$", "No solution"],
          right: 2,
          why: "Get the root alone: $\\sqrt{x + 3} = x - 3$. Squaring gives $x^2 - 7x + 6 = 0$, so $x = 1$ or $x = 6$. Only 6 checks: $\\sqrt{9} + 3 = 6$. $x = 1$ gives $\\sqrt{4} + 3 = 5$, not 1: the **Skipping the check** trap.",
        },
      },
    },
    {
      title: "A rational",
      problem: "What is the solution to $\\frac{x}{x - 4} = \\frac{4}{x - 4} + x$?",
      steps: [
        {
          say: "The common bottom is $x - 4$, so $x$ cannot be 4. Multiply every term by $x - 4$.",
          show: "$x = 4 + x(x - 4)$",
        },
        {
          say: "Move every term to one side and factor.",
          show: "$x^2 - 5x + 4 = (x - 1)(x - 4) = 0$",
        },
        {
          say: "$x = 4$ makes the bottom 0, so cross it out. $x = 1$ works: $-\\frac{1}{3} = -\\frac{4}{3} + 1$.",
        },
      ],
      answer: "$x = 1$",
      tryFrom: 1,
      checkIn: {
        text: "What is the solution to $\\frac{x}{x - 3} = \\frac{3}{x - 3} + x$?",
        choices: ["$x = 3$", "$x = 1$", "$x = 1$ or $x = 3$", "No solution"],
        right: 1,
        why: "Multiply every term by $x - 3$: $x = 3 + x(x - 3)$, so $x^2 - 4x + 3 = 0$ and $x = 1$ or $x = 3$. $x = 3$ makes the bottom 0, so only $x = 1$ works. Keeping 3 is the **A zero bottom** trap.",
        twin: {
          text: "What is the solution to $\\frac{2x}{x - 5} = \\frac{10}{x - 5} + x$?",
          choices: ["$x = 5$", "$x = 2$ or $x = 5$", "No solution", "$x = 2$"],
          right: 3,
          why: "Multiply every term by $x - 5$: $2x = 10 + x(x - 5)$, so $x^2 - 7x + 10 = 0$ and $x = 2$ or $x = 5$. $x = 5$ makes the bottom 0, so only $x = 2$ works. Keeping 5 is the **A zero bottom** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Skipping the check",
      text: "Squaring hides signs. In $\\sqrt{x + 7} = x - 5$, the answer 2 gives $\\sqrt{9} = -3$, which is false. It is usually one of the choices.",
    },
    {
      name: "Squaring too soon",
      text: "Get the root alone before you square. $(\\sqrt{x + 1} + 1)^2$ is not $x + 2$, and $(x - 1)^2$ is not $x^2 - 1$.",
    },
    {
      name: "A zero bottom",
      text: "An $x$ that makes any bottom 0 is never a solution, even when the algebra hands it to you.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Graph both sides",
    steps: [
      "Type the left side as one graph and the right side as another.",
      "Click each crossing. Its x-value is a solution.",
      "Only true solutions cross. A false solution never shows up.",
    ],
    type: ["y = sqrt(x + 7)", "y = x - 5"],
    note: "The graphs cross only at (9, 4), so $x = 9$, and the false answer 2 never appears. The graph does the check for you, so here the calculator is often faster than by hand.",
  },
  check: {
    text: "What is the solution to $\\sqrt{3x + 4} = x$?",
    choices: ["$-1$", "$1$", "$4$", "$-1$ and $4$"],
    right: 2,
    why: "Square both sides: $3x + 4 = x^2$, so $x^2 - 3x - 4 = (x - 4)(x + 1) = 0$. Check: $\\sqrt{16} = 4$ works, but $x = -1$ gives $\\sqrt{1} = -1$, which is false. So only 4 works. Keeping both is the **Skipping the check** trap, $-1$ alone keeps the false one, and 1 comes from factoring with the signs flipped.",
  },
  quiz: [
    {
      text: "What is the solution to $\\frac{2x}{x - 5} = \\frac{10}{x - 5} + x$?",
      choices: ["$-5$", "$-2$", "$2$", "$5$"],
      right: 2,
      why: "Multiply every term by $x - 5$: $2x = 10 + x(x - 5)$, so $x^2 - 7x + 10 = (x - 2)(x - 5) = 0$. The tempting 5 is the **A zero bottom** trap: it makes $x - 5 = 0$, so it is crossed out. $x = 2$ checks: $-\\frac{4}{3} = -\\frac{10}{3} + 2$. $-2$ and $-5$ come from flipping the signs of the factors.",
      subject: "math",
    },
    {
      text: "What should you do first to solve $\\sqrt{x - 2} + 4 = x$?",
      choices: [
        "Square both sides to get $x - 2 + 16 = x^2$.",
        "Subtract 4 from both sides to get the root alone.",
        "Subtract $x$ from both sides.",
        "Square only the root to get $x - 2 + 4 = x$.",
      ],
      right: 1,
      why: "Get the root alone first: $\\sqrt{x - 2} = x - 4$. Squaring gives $x^2 - 9x + 18 = 0$, so $x = 3$ or 6, and only 6 checks. Squaring both sides right away is the **Squaring too soon** trap: $(\\sqrt{x - 2} + 4)^2$ is not $x - 2 + 16$. Squaring only the root breaks the balance. Subtracting $x$ leaves the root stuck with other terms.",
      subject: "math",
    },
    {
      text: "Sam solved $\\sqrt{2x + 1} = x - 1$ by squaring both sides and got $x = 0$ and $x = 4$. Which statement is true?",
      choices: [
        "Both are solutions, since both solve $x^2 - 4x = 0$.",
        "Only 0 is a solution.",
        "Only 4 is a solution, because 0 gives $1 = -1$.",
        "Neither is a solution, because squaring is not allowed.",
      ],
      right: 2,
      why: "Check each in the original. $x = 4$: $\\sqrt{9} = 3$ and $4 - 1 = 3$, so it works. $x = 0$: $\\sqrt{1} = 1$ but $0 - 1 = -1$, so it fails. Keeping both is the **Skipping the check** trap: solving the squared equation is not enough. Only 0 keeps the wrong one. Squaring is allowed, as long as you check.",
      subject: "math",
    },
    {
      text: "When each equation is solved by squaring both sides, which one gives a false solution?",
      choices: [
        "$\\sqrt{x} = x - 2$",
        "$\\sqrt{x} = 3$",
        "$\\sqrt{x + 5} = 4$",
        "$\\sqrt{2x} = x$",
      ],
      right: 0,
      why: "Square and check each. $\\sqrt{x} = x - 2$ gives $x^2 - 5x + 4 = 0$, so 1 or 4; $x = 1$ gives $1 = -1$, a false solution. The tempting $\\sqrt{2x} = x$ also gives two answers, 0 and 2, but both check, so Skipping the check would not hurt there. $\\sqrt{x} = 3$ gives only 9, and $\\sqrt{x + 5} = 4$ gives only 11; both work.",
      subject: "math",
    },
    {
      text: "What is the solution to $\\frac{6}{x^2 - 9} = \\frac{1}{x - 3}$?",
      choices: ["$x = -3$", "$x = 3$", "$x = 9$", "There is no solution."],
      right: 3,
      why: "The common bottom is $x^2 - 9 = (x - 3)(x + 3)$, so $x$ cannot be 3 or $-3$. Multiply both sides by it: $6 = x + 3$, so $x = 3$. But 3 makes a bottom 0, so it is crossed out, and nothing is left. The tempting $x = 3$ is the **A zero bottom** trap. $x = -3$ is a sign slip and also makes a bottom 0. $x = 9$ comes from factoring $x^2 - 9$ as $(x - 3)^2$.",
      subject: "math",
    },
  ],
};

export default lesson;
