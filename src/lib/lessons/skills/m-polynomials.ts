import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-polynomials",
  tests:
    "Linking a polynomial's zeros, factors and x-intercepts, finding a remainder without long division, and matching an equation to the shape of its graph.",
  spot: "A polynomial with $x^3$ or higher, factors like $(x - 2)$, the words zero, factor, remainder or divisible, or a graph that crosses the x-axis in several places.",
  idea: [
    "Zeros, factors and x-intercepts are **one fact said three ways**. If $p(r) = 0$, then $(x - r)$ is a factor, and the graph meets the x-axis at $x = r$.",
    "The sign flips: a zero at $-2$ gives the factor $(x + 2)$.",
    "The **remainder theorem**: when $p(x)$ is divided by $x - a$, the remainder is $p(a)$. A remainder of 0 means $x - a$ is a factor.",
    "A factor that appears twice, like $(x - 2)^2$, makes the graph **touch** the x-axis and turn back. A factor that appears once makes it cross.",
  ],
  rules: [
    "$p(r) = 0$ means $(x - r)$ is a factor",
    "remainder of $p(x) \\div (x - a)$ is $p(a)$",
    "squared factor: the graph touches",
  ],
  figure: {
    kind: "plane",
    x: [-4, 4],
    y: [-6, 12],
    draw: [
      { poly: [-2, 2, 2], label: "y = (x + 2)(x - 2)^2", tone: "warm" },
      { point: [-2, 0], label: "crosses at -2", tone: "blue" },
      { point: [2, 0], label: "touches at 2", tone: "green" },
      { point: [0, 8], label: "(0, 8)", tone: "gold" },
    ],
  },
  strategy: {
    name: "Zero means factor",
    steps: [
      "Turn each zero $r$ into the factor $(x - r)$, flipping the sign.",
      "To test a factor $(x - a)$, find $p(a)$. A result of 0 means it is a factor.",
      "For the remainder after dividing by $x - a$, find $p(a)$.",
      "For the graph, match each zero to an x-intercept. A squared factor touches.",
    ],
  },
  examples: [
    {
      title: "The remainder",
      problem:
        "The polynomial $p$ is defined by $p(x) = 2x^3 - 5x^2 + x + 7$. What is the remainder when $p(x)$ is divided by $x - 2$?",
      steps: [
        {
          say: "No long division needed: the remainder is $p(a)$. The divisor is $x - 2$, so $a = 2$, not $-2$.",
        },
        { say: "Find $p(2)$.", show: "$p(2) = 2(8) - 5(4) + 2 + 7$" },
        { say: "Work it out.", show: "$16 - 20 + 2 + 7 = 5$" },
      ],
      answer: "$5$",
      checkIn: {
        text: "The polynomial $p$ is defined by $p(x) = x^3 - 2x^2 - 4x + 6$. What is the remainder when $p(x)$ is divided by $x - 3$?",
        choices: ["$-27$", "$6$", "$3$", "$0$"],
        right: 2,
        why: "The divisor is $x - 3$, so the remainder is $p(3) = 27 - 18 - 12 + 6 = 3$. $-27$ is the **Flipped zero** trap: it finds $p(-3)$ instead. 6 is $p(0)$, the **Intercept mix-up** trap.",
        twin: {
          text: "The polynomial $p$ is defined by $p(x) = 2x^3 + 3x^2 - x + 4$. What is the remainder when $p(x)$ is divided by $x + 2$?",
          choices: ["$2$", "$30$", "$4$", "$0$"],
          right: 0,
          why: "The divisor is $x + 2$, so the remainder is $p(-2) = -16 + 12 + 2 + 4 = 2$. 30 is the **Flipped zero** trap: it finds $p(2)$ instead. 4 is $p(0)$, the **Intercept mix-up** trap.",
        },
      },
    },
    {
      title: "Testing factors",
      problem:
        "The polynomial $p$ is defined by $p(x) = x^3 - 7x - 6$. Which of these is a factor of $p(x)$?",
      choices: ["$x - 2$", "$x - 1$", "$x + 1$", "$x + 3$"],
      right: 2,
      steps: [
        {
          say: "A factor $(x - a)$ means $p(a) = 0$. For each choice, plug in the number that makes it 0.",
        },
        {
          say: "$x - 2$ is 0 at 2, and $x - 1$ is 0 at 1. Neither gives 0.",
          show: "$p(2) = -12,\\ p(1) = -12$",
        },
        { say: "$x + 1$ is 0 at $-1$, so find $p(-1)$.", show: "$p(-1) = -1 + 7 - 6 = 0$" },
        {
          say: "The result is 0, so $x + 1$ is a factor. As a check, $p(-3) = -12$, so $x + 3$ is not.",
        },
      ],
      answer: "$x + 1$",
      tryFrom: 2,
      checkIn: {
        text: "The polynomial $p$ is defined by $p(x) = x^3 - 13x - 12$. Which of these is a factor of $p(x)$?",
        choices: ["$x + 4$", "$x - 1$", "$x - 3$", "$x - 4$"],
        right: 3,
        why: "A factor $x - a$ means $p(a) = 0$. For $x - 4$, $p(4) = 64 - 52 - 12 = 0$, so it is a factor. $x + 4$ is the **Flipped zero** trap: it needs $p(-4)$, which is $-24$.",
        twin: {
          text: "The polynomial $p$ is defined by $p(x) = x^3 - 19x + 30$. Which of these is a factor of $p(x)$?",
          choices: ["$x - 5$", "$x + 5$", "$x + 2$", "$x + 3$"],
          right: 1,
          why: "A factor $x + 5$ means $p(-5) = 0$. Check: $p(-5) = -125 + 95 + 30 = 0$, so it is a factor. $x - 5$ is the **Flipped zero** trap: $p(5) = 60$, not 0.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Flipped zero",
      text: "A zero at $-2$ gives the factor $(x + 2)$, and dividing by $x + 1$ means finding $p(-1)$. Flip the sign every time.",
    },
    {
      name: "Intercept mix-up",
      text: "$p(0)$ is where the graph crosses the y-axis. It is not a zero, and it is not a remainder unless you divide by $x$.",
    },
    {
      name: "Touch or cross",
      text: "A squared factor makes the graph touch the x-axis and turn back. A single factor makes it cross. Both still count as zeros.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Define p, then click",
    steps: [
      "Define the polynomial as $p(x)$ on its own line.",
      "Click the curve. Each x-axis dot at $r$ gives the factor $(x - r)$.",
      "For the remainder after dividing by $x - a$, type $p$ of that number.",
    ],
    type: ["p(x) = x^3 - 2x^2 - 5x + 6", "p(4)"],
    note: "The dots sit at $-2$, 1 and 3, so $x + 2$ is a factor, and p(4) shows 18, the remainder after dividing by $x - 4$. Testing one choice by hand is quick too; the graph shows every zero and the shape at once.",
  },
  check: {
    text: "A polynomial $p(x)$ has the factors $(x + 5)$, $(x - 2)$ and $(x - 2)$ and no others. At which point does its graph touch the x-axis without crossing it?",
    choices: ["$(-5, 0)$", "$(-2, 0)$", "$(2, 0)$", "$(5, 0)$"],
    right: 2,
    why: "The factor $(x - 2)$ appears twice, so the graph touches the x-axis at $x = 2$ and turns back. $(-5, 0)$ is a real zero, but its factor appears once, so the graph crosses there: Touch or cross. $(-2, 0)$ and $(5, 0)$ are Flipped zeros.",
  },
  quiz: [
    {
      text: "The polynomial $p$ is defined by $p(x) = x^3 + 2x^2 - 5x - 6$. Which of these is a factor of $p(x)$?",
      choices: ["$x - 3$", "$x - 1$", "$x + 2$", "$x + 3$"],
      right: 3,
      why: "Plug in the number that makes each choice 0. For $x + 3$, $p(-3) = -27 + 18 + 15 - 6 = 0$, so it is a factor. The others fail: $p(3) = 24$, $p(1) = -8$ and $p(-2) = 4$. Each wrong choice is a Flipped zero of a real factor: $p(x) = (x + 1)(x - 2)(x + 3)$, so $x - 1$, $x + 2$ and $x - 3$ have the wrong signs.",
      subject: "math",
    },
    {
      text: "What should you do first to find the remainder when $p(x) = 3x^3 - x^2 + 4$ is divided by $x + 1$?",
      choices: ["Find $p(1)$.", "Find $p(-1)$.", "Find $p(0)$.", "Set $p(x) = 0$ and solve."],
      right: 1,
      why: "The remainder after dividing by $x - a$ is $p(a)$, and $x + 1 = x - (-1)$, so find $p(-1) = -3 - 1 + 4 = 0$. The remainder is 0, so $x + 1$ is a factor. The tempting $p(1)$ is a Flipped zero. $p(0)$ is the Intercept mix-up: it gives the y-intercept. Solving $p(x) = 0$ finds zeros, not a remainder.",
      subject: "math",
    },
    {
      text: "The graph of a polynomial $p$ crosses the x-axis only at $x = -4$ and $x = 3$. Ravi says $(x + 3)$ must be a factor of $p(x)$. What is his mistake?",
      choices: [
        "The zero 3 gives the factor $(x - 3)$, and $-4$ gives $(x + 4)$.",
        "Only zeros on the left of the y-axis give factors.",
        "A zero at 3 gives the factor $3x$.",
        "A crossing gives a squared factor, $(x + 3)^2$.",
      ],
      right: 0,
      why: "Ravi made a Flipped zero mistake. A zero at $r$ gives the factor $(x - r)$, so 3 gives $(x - 3)$ and $-4$ gives $(x + 4)$. Zeros on both sides of the y-axis give factors. $3x$ is 0 at $x = 0$, not at 3. A squared factor makes the graph touch, not cross: Touch or cross.",
      subject: "math",
    },
    {
      text: "Which function's graph touches the x-axis at $x = 2$ without crossing it?",
      choices: [
        "$y = (x - 2)(x + 1)$",
        "$y = (x + 2)^2(x - 1)$",
        "$y = (x - 2)^2(x + 1)$",
        "$y = (x - 2)(x + 2)$",
      ],
      right: 2,
      why: "A zero at 2 needs the factor $(x - 2)$, and touching needs it squared, so the answer is $(x - 2)^2(x + 1)$. The tempting $(x + 2)^2(x - 1)$ has a squared factor but touches at $-2$, a Flipped zero. $(x - 2)(x + 1)$ and $(x - 2)(x + 2)$ have $(x - 2)$ only once, so they cross at 2: Touch or cross.",
      subject: "math",
    },
    {
      text: "In the polynomial $p(x) = x^3 + kx^2 + 5x - 6$, $k$ is a constant. If $x - 2$ is a factor of $p(x)$, what is the value of $k$?",
      choices: ["$-12$", "$-3$", "$3$", "$6$"],
      right: 1,
      why: "A factor $x - 2$ means $p(2) = 0$: $8 + 4k + 10 - 6 = 0$, so $4k + 12 = 0$ and $k = -3$. Check: $x^3 - 3x^2 + 5x - 6$ gives $8 - 12 + 10 - 6 = 0$ at 2. The tempting 6 is a Flipped zero: it solves $p(-2) = 4k - 24 = 0$. $-12$ forgets to divide by 4, and 3 drops the minus sign.",
      subject: "math",
    },
  ],
};

export default lesson;
