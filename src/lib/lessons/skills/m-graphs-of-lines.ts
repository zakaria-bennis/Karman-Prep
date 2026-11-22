import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-graphs-of-lines",
  tests:
    "Finding a line's intercepts and slope from its equation, and moving between the forms of a line's equation.",
  spot: "The words $x$-intercept, $y$-intercept, slope, or which equation defines the line, with an equation, a graph or a point and a slope.",
  idea: [
    "A line's equation comes in three common forms. **Slope-intercept form**, $y = mx + b$, shows the slope $m$ and the $y$-intercept $(0, b)$.",
    "**Standard form**, $Ax + By = C$, makes intercepts quick. Set $y = 0$ to find the $x$-intercept, and $x = 0$ to find the $y$-intercept.",
    "**Point-slope form**, $y - y_1 = m(x - x_1)$, builds a line from one point and its slope. Solve it for $y$ to reach slope-intercept form.",
  ],
  rules: [
    "$y = mx + b$",
    "$Ax + By = C$",
    "$y - y_1 = m(x - x_1)$",
    "Intercept: set the other to 0",
  ],
  figure: {
    kind: "plane",
    x: [-4, 12],
    y: [-10, 4],
    draw: [
      { line: [0.75, -6], label: "3x - 4y = 24", tone: "blue" },
      { point: [8, 0], label: "(8, 0)", tone: "green" },
      { point: [0, -6], label: "(0, -6)", tone: "gold" },
    ],
  },
  strategy: {
    name: "Name the form first",
    steps: [
      "Name the form: $y = mx + b$, $Ax + By = C$, or a point and a slope.",
      "For an intercept, set the other letter to 0 and solve.",
      "For the slope, get $y$ alone: the number in front of $x$ is $m$.",
      "From a point and a slope, start at $y - y_1 = m(x - x_1)$, then solve for $y$.",
    ],
  },
  examples: [
    {
      title: "An intercept",
      problem: "What is the $x$-intercept of the line $5x - 2y = 20$?",
      steps: [
        {
          say: "The $x$-intercept is on the $x$-axis, where $y = 0$.",
          show: "$5x - 2(0) = 20$",
        },
        { say: "Solve for $x$.", show: "$5x = 20$, so $x = 4$" },
        {
          say: "Write it as a point. The $y$-intercept, with $x = 0$, would be $(0, -10)$.",
          show: "$(4, 0)$",
        },
      ],
      answer: "$(4, 0)$",
    },
    {
      title: "Point and slope",
      problem:
        "A line has a slope of $-2$ and passes through $(3, 1)$. Which equation defines the line?",
      choices: ["$y = -2x - 5$", "$y = -2x + 1$", "$y = -2x + 5$", "$y = -2x + 7$"],
      right: 3,
      steps: [
        {
          say: "Name the form: a point and a slope. Start from point-slope form.",
          show: "$y - 1 = -2(x - 3)$",
        },
        { say: "Distribute the $-2$.", show: "$y - 1 = -2x + 6$" },
        { say: "Add 1 to both sides.", show: "$y = -2x + 7$" },
        { say: "Check the point: $-2(3) + 7 = 1$. It works." },
      ],
      answer: "$y = -2x + 7$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Wrong intercept",
      text: "The $x$-intercept has $y = 0$. The $y$-intercept has $x = 0$. Mixing them up gives the other intercept, and it is always a choice.",
    },
    {
      name: "A is not slope",
      text: "In $Ax + By = C$, the slope is not $A$. Get $y$ alone first: $2x + 5y = 10$ becomes $y = -\\frac{2}{5}x + 2$, so the slope is $-\\frac{2}{5}$.",
    },
    {
      name: "Point sign flip",
      text: "Point-slope form subtracts the point. A line through $(-2, 4)$ gives $y - 4 = m(x + 2)$, not $m(x - 2)$.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Click the axis dots",
    steps: [
      "Type the line exactly as given. There is no need to solve for $y$.",
      "Click the line so gray dots appear.",
      "Click the dot on each axis to read the intercepts.",
    ],
    type: ["3x-4y=24"],
    note: "The dots read $(8, 0)$ and $(0, -6)$. Setting $y = 0$ by hand is often just as fast: $3x = 24$, so $x = 8$.",
  },
  check: {
    text: "What is the $y$-intercept of the line $2x + 5y = 30$?",
    choices: ["$\\left(0, -\\frac{2}{5}\\right)$", "$(0, 6)$", "$(0, 15)$", "$(0, 30)$"],
    right: 1,
    why: "Set $x = 0$: $5y = 30$, so $y = 6$ and the $y$-intercept is $(0, 6)$. $(0, 15)$ borrows 15 from the $x$-intercept, $(15, 0)$, which is the Wrong intercept. $(0, 30)$ forgets to divide by 5. $-\\frac{2}{5}$ is the slope, not an intercept.",
  },
  quiz: [
    {
      text: "A line has a slope of 3 and passes through $(-2, 4)$. Which equation defines the line?",
      choices: ["$y = 3x - 2$", "$y = 3x + 4$", "$y = 3x + 6$", "$y = 3x + 10$"],
      right: 3,
      why: "Start from point-slope form: $y - 4 = 3(x + 2)$. Distribute: $y - 4 = 3x + 6$, so $y = 3x + 10$. Check: $3(-2) + 10 = 4$. The tempting $y = 3x - 2$ is the Point sign flip: it writes $x - 2$ for a point whose $x$ is $-2$. $y = 3x + 4$ uses the point's $y$ as the intercept. $y = 3x + 6$ multiplies only the $x$ by 3, not the 2.",
      subject: "math",
    },
    {
      text: "To find the $x$-intercept of the line $6x - 5y = 30$, what should you do first?",
      choices: [
        "Read 6, the number in front of $x$, as the intercept.",
        "Set $x = 0$ and solve for $y$.",
        "Set $y = 0$ and solve for $x$.",
        "Solve for $y$ and read the slope.",
      ],
      right: 2,
      why: "The $x$-intercept sits on the $x$-axis, where $y = 0$. Then $6x = 30$, so $x = 5$, and the intercept is $(5, 0)$. Setting $x = 0$ is the Wrong intercept: it finds the $y$-intercept, $(0, -6)$. The 6 in front of $x$ is a coefficient, not an intercept. The slope, $\\frac{6}{5}$, tells how steep the line is, not where it crosses.",
      subject: "math",
    },
    {
      text: "Lia says the slope of the line $2x + 5y = 10$ is 2. What is her mistake?",
      choices: [
        "She read the number in front of $x$ before getting $y$ alone; the slope is $-\\frac{2}{5}$.",
        "She forgot the sign; the slope is $-2$.",
        "She should have divided 10 by 2; the slope is 5.",
        "She flipped the fraction; the slope is $\\frac{5}{2}$.",
      ],
      right: 0,
      why: "This is the **A is not slope** trap. Get $y$ alone: $5y = -2x + 10$, so $y = -\\frac{2}{5}x + 2$ and the slope is $-\\frac{2}{5}$. The 2 is only the $x$ coefficient in standard form. $-2$ still ignores the 5 in front of $y$. 10 divided by 2 is 5, the $x$-intercept's value, not a slope. $\\frac{5}{2}$ flips the fraction and drops the sign.",
      subject: "math",
    },
    {
      text: "Which line crosses the $x$-axis at $(6, 0)$?",
      choices: ["$y = x + 6$", "$x + 2y = 6$", "$2x + y = 6$", "$y = 6x$"],
      right: 1,
      why: "Set $y = 0$ in each. In $x + 2y = 6$, that leaves $x = 6$, so the line crosses at $(6, 0)$. In $2x + y = 6$, $2x = 6$ gives $x = 3$; its $y$-intercept is $(0, 6)$, the Wrong intercept. $y = x + 6$ crosses the $x$-axis at $(-6, 0)$ and the $y$-axis at $(0, 6)$. $y = 6x$ passes through $(0, 0)$.",
      subject: "math",
    },
    {
      text: "Line $\\ell$ in the $xy$-plane has an $x$-intercept of $(5, 0)$ and a $y$-intercept of $(0, -3)$. Which equation defines line $\\ell$?",
      choices: ["$3x + 5y = 15$", "$3x - 5y = 15$", "$5x - 3y = 15$", "$y = 5x - 3$"],
      right: 1,
      why: "Test each choice by setting one letter to 0. In $3x - 5y = 15$, $y = 0$ gives $x = 5$, and $x = 0$ gives $y = -3$. Both intercepts match. $5x - 3y = 15$ is the Wrong intercept: it swaps them, crossing at $(3, 0)$ and $(0, -5)$. $3x + 5y = 15$ has $y$-intercept $(0, 3)$, so the sign is lost. $y = 5x - 3$ has the right $y$-intercept, but its slope should be $\\frac{3}{5}$, not 5.",
      subject: "math",
    },
  ],
};

export default lesson;
