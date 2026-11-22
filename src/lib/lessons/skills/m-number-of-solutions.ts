import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-number-of-solutions",
  tests:
    "Deciding whether a linear equation has no solution, exactly one, or infinitely many, and finding a constant that makes one of those happen.",
  spot: "The words no solution, infinitely many solutions, or how many solutions, often with a constant like $k$ or $a$.",
  idea: [
    "Simplify each side until it reads $ax + b$. Then **compare the two sides**, part by part.",
    "If the $x$ coefficients are different, there is **exactly one** solution. It can be $x = 0$, and that still counts as one.",
    "If the $x$ coefficients match, the $x$ terms cancel. Different constants leave a false line like $2 = -5$: **no solution**. The same constants leave a true line like $8 = 8$: **infinitely many**.",
  ],
  rules: [
    "Different $x$ coefficients: one",
    "Same $x$, different constants: none",
    "Same $x$, same constants: infinitely many",
  ],
  figure: {
    kind: "plane",
    x: [-5, 5],
    y: [-5, 7],
    draw: [
      { line: [2, 1], label: "y = 2x + 1", tone: "blue" },
      { line: [2, -3], label: "same slope: none", tone: "red", dashed: true },
      { line: [-1, 4], label: "new slope: one", tone: "green" },
      { point: [1, 3], label: "(1, 3)", tone: "green" },
    ],
  },
  strategy: {
    name: "Simplify, then compare",
    steps: [
      "Distribute and combine so each side reads $ax + b$.",
      "Compare the $x$ coefficients. Different means exactly one solution.",
      "If they match, compare the constants: different means none, the same means infinitely many.",
      "For a constant like $k$, set equal the parts the question needs.",
    ],
  },
  examples: [
    {
      title: "Count them",
      problem: "How many solutions does $3(2x - 4) + x = 7x - 12$ have?",
      choices: ["Zero", "Exactly one", "Exactly two", "Infinitely many"],
      right: 3,
      steps: [
        { say: "Distribute the 3 on the left.", show: "$6x - 12 + x = 7x - 12$" },
        { say: "Combine the $x$ terms.", show: "$7x - 12 = 7x - 12$" },
        { say: "Compare the $x$ coefficients: 7 and 7 match." },
        {
          say: "Compare the constants: $-12$ and $-12$ match too. Both sides are the same, so every $x$ works.",
        },
      ],
      answer: "Infinitely many",
    },
    {
      title: "Find the constant",
      problem:
        "In the equation $5(x + 2) - 3x = ax + 4$, $a$ is a constant. The equation has no solution. What is the value of $a$?",
      steps: [
        { say: "Distribute the 5.", show: "$5x + 10 - 3x = ax + 4$" },
        { say: "Combine the $x$ terms.", show: "$2x + 10 = ax + 4$" },
        { say: "No solution needs the same $x$ coefficient on both sides.", show: "$a = 2$" },
        { say: "Check that the constants differ: 10 and 4 do, so there is no solution." },
      ],
      answer: "$a = 2$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Comparing too early",
      text: "In $2(3x - 5) + 4 = 6x - 6$, the 2 and the 6 look different, but the left side is really $6x - 6$. Distribute and combine before you compare.",
    },
    {
      name: "True versus false",
      text: "When the $x$ terms cancel, look at what is left. A true line like $8 = 8$ means infinitely many. A false line like $10 = 4$ means none. Do not mix them up.",
    },
    {
      name: "Zero is a solution",
      text: "Getting $x = 0$ is not the same as no solution. $x = 0$ is one number that works, so there is exactly one solution.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Count the crossings",
    steps: [
      "Type each side as its own $y =$ line.",
      "One crossing means one solution. Lines that never meet mean none. One line hiding the other means infinitely many.",
      "For a constant like $k$, add the slider, widen its range, and drag until the lines merge or turn parallel.",
    ],
    type: ["y=4(x-3)+2x", "y=6x+k"],
    note: "Here the lines merge only at $k = -12$, outside the slider's starting range. By hand it is faster: $6x - 12 = 6x + k$, so $k = -12$. Nearly parallel lines can fool the eye, so compare slopes.",
  },
  check: {
    text: "How many solutions does $2(3x + 1) = 6x - 5$ have?",
    choices: ["Zero", "Exactly one", "Exactly two", "Infinitely many"],
    right: 0,
    why: "Distribute: $6x + 2 = 6x - 5$. The $x$ coefficients match and the constants differ. Subtracting $6x$ leaves $2 = -5$, which is false, so no $x$ works. Infinitely many would need the constants to match too. Exactly one would need different $x$ coefficients, and a linear equation never has exactly two.",
  },
  quiz: [
    {
      text: "In the equation $4(2x - 1) + 3 = kx + 9$, $k$ is a constant. The equation has no solution. What is the value of $k$?",
      choices: ["$-1$", "$2$", "$4$", "$8$"],
      right: 3,
      why: "No solution needs the same $x$ coefficient and different constants. Simplify the left: $8x - 4 + 3 = 8x - 1$. So $k = 8$, and the constants $-1$ and 9 differ. The tempting 2 is Comparing too early: it reads the 2 inside the parentheses before distributing. 4 takes the number outside the parentheses. $-1$ picks the constant, not the $x$ coefficient.",
      subject: "math",
    },
    {
      text: "To find how many solutions $2(3x - 5) + 4 = 6x - 6$ has, what should you do first?",
      choices: [
        "Compare the 2 on the left with the 6 on the right.",
        "Distribute the 2 and combine, so the left side reads $ax + b$.",
        "Plug in $x = 1$ and see if the two sides match.",
        "Count the $x$ terms: one on each side means one solution.",
      ],
      right: 1,
      why: "Simplify first. The left side becomes $6x - 10 + 4 = 6x - 6$, the same as the right, so there are infinitely many solutions. Comparing the 2 and the 6 is Comparing too early: the 2 is not the $x$ coefficient yet. Plugging in one value shows only that it works, not how many do. Counting $x$ terms says nothing about the coefficients.",
      subject: "math",
    },
    {
      text: "Jon simplifies $5x - 2(x - 4) = 3x + 8$ to $8 = 8$. He says the equation has no solution because $x$ disappeared. Why is he wrong?",
      choices: [
        "He made a sign slip; the sides really simplify to $3x + 8 = 3x - 8$.",
        "When $x$ disappears, the solution is $x = 0$.",
        "A true line like $8 = 8$ means every $x$ works, so there are infinitely many solutions.",
        "He should get $x = 8$, so there is exactly one solution.",
      ],
      right: 2,
      why: "Jon fell into True versus false. The left side is $5x - 2x + 8 = 3x + 8$, the same as the right, and $8 = 8$ is true for every $x$. So there are infinitely many solutions. His algebra has no sign slip: $-2$ times $-4$ is $+8$. A vanishing $x$ does not mean $x = 0$, and no single value like 8 is special here.",
      subject: "math",
    },
    {
      text: "Which equation has exactly one solution?",
      choices: [
        "$4(x + 1) = 4x + 4$",
        "$4(x + 1) = 4x + 1$",
        "$4(x + 1) = x + 4$",
        "$4x + 1 = 1 + 4x$",
      ],
      right: 2,
      why: "Compare $x$ coefficients after distributing. In $4(x + 1) = x + 4$, the left is $4x + 4$ and the right is $x + 4$: 4 and 1 differ, so there is exactly one solution, $x = 0$. Do not fall for Zero is a solution: $x = 0$ counts. $4(x + 1) = 4x + 4$ and $4x + 1 = 1 + 4x$ have the same sides, so infinitely many. $4(x + 1) = 4x + 1$ has matching $x$ terms and different constants, so none.",
      subject: "math",
    },
    {
      text: "In the equation $a(3x - 2) + 5x = 11x + b$, $a$ and $b$ are constants. The equation has infinitely many solutions. What is the value of $b$?",
      choices: ["$-4$", "$-2$", "$2$", "$4$"],
      right: 0,
      why: "Simplify the left: $(3a + 5)x - 2a$. Infinitely many solutions means both parts match. The $x$ parts give $3a + 5 = 11$, so $a = 2$. The constants give $b = -2a = -4$. The tempting 2 is the value of $a$, not $b$. $-2$ is Comparing too early: it reads the $-2$ inside the parentheses without multiplying by $a$. 4 drops the minus sign.",
      subject: "math",
    },
  ],
};

export default lesson;
