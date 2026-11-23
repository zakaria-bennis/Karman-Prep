import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-rational-expressions",
  tests:
    "Simplifying, adding, subtracting, multiplying and dividing fractions that have a variable in the bottom.",
  spot: "Fractions with $x$ in the bottom, and a question asking for an equivalent expression, often for $x > 0$ or some other range.",
  idea: [
    "A rational expression is a fraction with a variable in the bottom. It follows the **same rules as number fractions**.",
    "To add or subtract, rewrite both fractions over a **common denominator**, then combine the tops. To divide, **multiply by the flip** of the second fraction.",
    "To simplify, **factor** the top and the bottom, then cancel matching factors. $\\frac{x^2 - 9}{x - 3} = x + 3$, except at $x = 3$, where the bottom would be zero.",
  ],
  rules: [
    "$\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}$",
    "$\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\cdot \\frac{d}{c}$",
    "Cancel factors, never terms",
  ],
  figure: {
    kind: "plane",
    x: [-6, 6],
    y: [-4, 10],
    draw: [
      { line: [1, 3], label: "y = (x² − 9)/(x − 3)", tone: "blue" },
      { vertical: 3, label: "x ≠ 3", tone: "red", dashed: true },
    ],
  },
  strategy: {
    name: "Factor, then combine",
    steps: [
      "Factor every top and bottom you can.",
      "Dividing? Flip the second fraction and multiply.",
      "Adding or subtracting? Multiply each top by the factor its bottom is missing, then combine the tops.",
      "Cancel matching factors, and keep in mind the values that make a bottom zero.",
    ],
  },
  examples: [
    {
      title: "Common bottom",
      problem:
        "For $x > 2$, which expression is equivalent to $\\frac{4}{x - 2} - \\frac{3}{x + 2}$?",
      steps: [
        {
          say: "The common bottom is the product of the two bottoms.",
          show: "$(x - 2)(x + 2) = x^2 - 4$",
        },
        {
          say: "Multiply each top by the factor its bottom is missing.",
          show: "$\\frac{4(x + 2) - 3(x - 2)}{x^2 - 4}$",
        },
        {
          say: "Distribute. The minus sign reaches both terms of $3(x - 2)$.",
          show: "$4x + 8 - 3x + 6 = x + 14$",
        },
        { say: "Write the single fraction.", show: "$\\frac{x + 14}{x^2 - 4}$" },
      ],
      answer: "$\\frac{x + 14}{x^2 - 4}$",
      checkIn: {
        text: "For $x > 3$, which expression is equivalent to $\\frac{5}{x - 3} - \\frac{2}{x + 3}$?",
        choices: [
          "$\\frac{3x + 9}{x^2 - 9}$",
          "$\\frac{3}{x^2 - 9}$",
          "$\\frac{3x + 21}{x^2 - 9}$",
          "$\\frac{7x + 9}{x^2 - 9}$",
        ],
        right: 2,
        why: "The common bottom is $(x - 3)(x + 3) = x^2 - 9$. The top is $5(x + 3) - 2(x - 3) = 5x + 15 - 2x + 6 = 3x + 21$. $\\frac{3x + 9}{x^2 - 9}$ is the **Minus on one term** trap: the minus must reach the $-3$ too.",
        twin: {
          text: "For $x > 1$, which expression is equivalent to $\\frac{6}{x - 1} - \\frac{4}{x + 1}$?",
          choices: [
            "$\\frac{2x + 10}{x^2 - 1}$",
            "$\\frac{2x + 2}{x^2 - 1}$",
            "$\\frac{2}{x^2 - 1}$",
            "$\\frac{10x + 2}{x^2 - 1}$",
          ],
          right: 0,
          why: "The common bottom is $(x - 1)(x + 1) = x^2 - 1$. The top is $6(x + 1) - 4(x - 1) = 6x + 6 - 4x + 4 = 2x + 10$. $\\frac{2x + 2}{x^2 - 1}$ is the **Minus on one term** trap: the minus must reach the $-1$ too.",
        },
      },
    },
    {
      title: "Flip and cancel",
      problem: "For $x > 0$, simplify $\\frac{x^2 - 9}{2x} \\div \\frac{x + 3}{4x^2}$.",
      steps: [
        {
          say: "Dividing, so flip the second fraction and multiply.",
          show: "$\\frac{x^2 - 9}{2x} \\cdot \\frac{4x^2}{x + 3}$",
        },
        {
          say: "Factor the difference of squares on top.",
          show: "$\\frac{(x - 3)(x + 3)}{2x} \\cdot \\frac{4x^2}{x + 3}$",
        },
        {
          say: "Cancel the matching factor $x + 3$, and $\\frac{4x^2}{2x} = 2x$.",
          show: "$2x(x - 3)$",
        },
      ],
      answer: "$2x(x - 3)$",
      tryFrom: 1,
      checkIn: {
        text: "For $x > 0$, simplify $\\frac{x^2 - 16}{3x} \\div \\frac{x - 4}{6x^2}$.",
        choices: ["$2x(x - 4)$", "$\\frac{x + 4}{2x}$", "$2x^2(x + 4)$", "$2x(x + 4)$"],
        right: 3,
        why: "Flip the second fraction and multiply: $\\frac{(x - 4)(x + 4)}{3x} \\cdot \\frac{6x^2}{x - 4}$. Cancel $x - 4$, and $\\frac{6x^2}{3x} = 2x$, which leaves $2x(x + 4)$. $2x(x - 4)$ cancels the wrong factor.",
        twin: {
          text: "For $x > 0$, simplify $\\frac{x^2 - 25}{4x} \\div \\frac{x + 5}{8x^2}$.",
          choices: ["$2x(x + 5)$", "$2x(x - 5)$", "$\\frac{x - 5}{2x}$", "$2x^2(x - 5)$"],
          right: 1,
          why: "Flip the second fraction and multiply: $\\frac{(x - 5)(x + 5)}{4x} \\cdot \\frac{8x^2}{x + 5}$. Cancel $x + 5$, and $\\frac{8x^2}{4x} = 2x$, which leaves $2x(x - 5)$. $2x(x + 5)$ cancels the wrong factor.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Canceling terms",
      text: "Only factors cancel. In $\\frac{x + 6}{6}$, the 6 is added, not multiplied, so it does not cancel: the answer is not $x$. Factor first, then cancel.",
    },
    {
      name: "Adding straight across",
      text: "$\\frac{1}{x} + \\frac{1}{2}$ is not $\\frac{2}{x + 2}$. Tops add only once the bottoms match.",
    },
    {
      name: "Minus on one term",
      text: "When you subtract a fraction whose top has two terms, the minus reaches both. $-(x + 1)$ is $-x - 1$. Put the top in parentheses before you distribute.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Overlap the graphs",
    steps: [
      "Type the original after $y =$. Press the right arrow after each bottom, so the rest of the line leaves the fraction.",
      "Type each answer choice the same way on its own line.",
      "Keep the choice whose graph sits exactly on top of the original.",
    ],
    type: ["y=4/(x-2)-3/(x+2)", "y=(x+14)/(x^2-4)"],
    note: "Holes get no dot and are hard to see, so check the values that make a bottom zero by hand. Adding two simple fractions takes about a minute by hand and the graph check about 30 seconds.",
  },
  check: {
    text: "Which expression is equivalent to $\\frac{x^2 + 5x}{x^2 - 25}$ for $x > 5$?",
    choices: [
      "$-\\frac{x}{5}$",
      "$\\frac{x}{x - 5}$",
      "$\\frac{x}{x + 5}$",
      "$\\frac{x + 5}{x - 5}$",
    ],
    right: 1,
    why: "Factor the top and bottom: $\\frac{x(x + 5)}{(x - 5)(x + 5)}$. Cancel the matching factor $x + 5$ to get $\\frac{x}{x - 5}$. $-\\frac{x}{5}$ comes from canceling terms: $x^2$ with $x^2$, then $\\frac{5x}{-25}$. $\\frac{x}{x + 5}$ cancels the wrong factor. $\\frac{x + 5}{x - 5}$ divides the top by $x$ but never cancels.",
  },
  quiz: [
    {
      text: "For $x > 4$, which expression is equivalent to $\\frac{x^2 - 16}{3x} \\div \\frac{x - 4}{6x^2}$?",
      choices: [
        "$\\frac{1}{2x(x + 4)}$",
        "$\\frac{(x^2 - 16)(x - 4)}{18x^3}$",
        "$2x(x + 4)$",
        "$2x(x - 4)$",
      ],
      right: 2,
      why: "Flip the second fraction and multiply, then factor: $\\frac{(x - 4)(x + 4)}{3x} \\cdot \\frac{6x^2}{x - 4}$. Cancel $x - 4$, and $\\frac{6x^2}{3x} = 2x$, which leaves $2x(x + 4)$. The tempting $2x(x - 4)$ cancels the wrong factor. $\\frac{1}{2x(x + 4)}$ flips the first fraction instead of the second. The long fraction multiplies straight across without flipping at all.",
      subject: "math",
    },
    {
      text: "What is the first step to write $\\frac{5}{x} + \\frac{2}{x + 3}$ as a single fraction?",
      choices: [
        "Rewrite both fractions over the common bottom $x(x + 3)$.",
        "Add the tops and add the bottoms to get $\\frac{7}{2x + 3}$.",
        "Cancel the $x$ in $\\frac{5}{x}$ with the $x$ in $x + 3$.",
        "Flip the second fraction and multiply.",
      ],
      right: 0,
      why: "Fractions add only over a common bottom. Using $x(x + 3)$ gives $\\frac{5(x + 3) + 2x}{x(x + 3)} = \\frac{7x + 15}{x^2 + 3x}$. The tempting $\\frac{7}{2x + 3}$ is the adding straight across trap. The $x$ in $x + 3$ is a term, not a factor, so it cannot cancel: the canceling terms trap. Flipping and multiplying is the rule for dividing, not adding.",
      subject: "math",
    },
    {
      text: "Priya simplifies $\\frac{2x + 8}{2}$ and gets $x + 8$. What went wrong?",
      choices: [
        "She should cancel the 8 with the 2 instead, to get $2x + 4$.",
        "She canceled a term, not a factor. Factoring first gives $\\frac{2(x + 4)}{2} = x + 4$.",
        "The bottom 2 cannot cancel at all, so nothing simplifies.",
        "She should multiply by the flip of 2 to get $4x + 16$.",
      ],
      right: 1,
      why: "Factor the top before canceling. $2x + 8 = 2(x + 4)$, so the 2 cancels with the whole top: $x + 4$. Priya divided only the $2x$ by 2, the canceling terms trap, and left the 8 untouched. Dividing only the 8 makes the same mistake with the other term. The 2 can cancel once it is a factor of the whole top. Multiplying by 2 doubles the expression instead of dividing it.",
      subject: "math",
    },
    {
      text: "For $x > 0$, which expression is equivalent to $\\frac{1}{x} + \\frac{1}{2x}$?",
      choices: ["$\\frac{1}{2x^2}$", "$\\frac{1}{x}$", "$\\frac{2}{3x}$", "$\\frac{3}{2x}$"],
      right: 3,
      why: "Rewrite over the common bottom $2x$: $\\frac{1}{x} = \\frac{2}{2x}$, so the sum is $\\frac{2}{2x} + \\frac{1}{2x} = \\frac{3}{2x}$. Test $x = 1$: $1 + \\frac{1}{2} = \\frac{3}{2}$. The tempting $\\frac{2}{3x}$ adds the tops and the bottoms, the adding straight across trap. $\\frac{1}{2x^2}$ multiplies the fractions instead of adding them. $\\frac{1}{x}$ uses the bottom $2x$ but forgets to turn the first top into 2: $\\frac{1 + 1}{2x}$.",
      subject: "math",
    },
    {
      text: "For $x > 3$, which expression is equivalent to $\\frac{2}{x - 3} - \\frac{x + 1}{x^2 - 9}$?",
      choices: [
        "$\\frac{1 - x}{x^2 - 9}$",
        "$\\frac{x + 5}{x^2 - 9}$",
        "$\\frac{x + 7}{x^2 - 9}$",
        "$\\frac{3x + 7}{x^2 - 9}$",
      ],
      right: 1,
      why: "Factor the second bottom: $x^2 - 9 = (x - 3)(x + 3)$. The first fraction is missing $x + 3$, so its top becomes $2(x + 3)$. Then $2x + 6 - (x + 1) = x + 5$, over $x^2 - 9$. The tempting $x + 7$ subtracts only the $x$, the minus on one term trap. $1 - x$ forgets to multiply the 2 by $x + 3$. $3x + 7$ adds the fractions instead of subtracting.",
      subject: "math",
    },
  ],
};

export default lesson;
