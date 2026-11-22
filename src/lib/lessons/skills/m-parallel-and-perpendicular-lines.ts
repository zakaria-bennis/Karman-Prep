import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-parallel-and-perpendicular-lines",
  tests:
    "Using how the slopes of parallel and perpendicular lines relate to find a slope, an equation or an intercept.",
  spot: "The words parallel or perpendicular, a given line, and often a point the new line passes through.",
  idea: [
    "**Parallel** lines never meet, so they rise at the same rate. They have **equal slopes** and different intercepts.",
    "**Perpendicular** lines meet at a right angle. Their slopes are **negative reciprocals**: flip the fraction and change the sign. A slope of 2 pairs with $-\\frac{1}{2}$.",
    "First find the given line's slope. If it is in $Ax + By = C$ form, get $y$ alone.",
  ],
  rules: [
    "Parallel: $m_2 = m_1$",
    "Perpendicular: $m_2 = -\\frac{1}{m_1}$",
    "$m_1 \\cdot m_2 = -1$",
  ],
  figure: {
    kind: "plane",
    x: [-5, 5],
    y: [-5, 5],
    draw: [
      { line: [2, 1], label: "slope 2", tone: "blue" },
      { line: [2, -3], label: "parallel: slope 2", tone: "green", dashed: true },
      { line: [-0.5, 1], label: "perpendicular: slope -1/2", tone: "gold" },
    ],
  },
  strategy: {
    name: "Slope, then point",
    steps: [
      "Find the given line's slope. Get $y$ alone if needed.",
      "Parallel: keep the slope. Perpendicular: flip it and change its sign.",
      "Put the new slope and the point into $y - y_1 = m(x - x_1)$.",
      "Solve for $y$, or read off what the question asks.",
    ],
  },
  examples: [
    {
      title: "Perpendicular line",
      problem:
        "Line $k$ is perpendicular to the line $3x + 4y = 8$ and passes through $(6, 2)$. What is the $y$-intercept of line $k$?",
      steps: [
        {
          say: "Get $y$ alone to find the given slope.",
          show: "$4y = -3x + 8$, so $y = -\\frac{3}{4}x + 2$",
        },
        {
          say: "Perpendicular: flip the fraction and change its sign.",
          show: "$m = \\frac{4}{3}$",
        },
        {
          say: "Put the new slope and the point into point-slope form.",
          show: "$y - 2 = \\frac{4}{3}(x - 6)$",
        },
        {
          say: "Distribute and add 2. The constant is the $y$-intercept.",
          show: "$y = \\frac{4}{3}x - 6$",
        },
      ],
      answer: "$(0, -6)$",
      checkIn: {
        text: "Line $k$ is perpendicular to the line $x + 2y = 6$ and passes through $(3, 5)$. What is the $y$-intercept of line $k$?",
        choices: ["$(0, 11)$", "$(0, 8)$", "$(0, -1)$", "$(0, 3)$"],
        right: 2,
        why: "Get $y$ alone: $y = -\\frac{1}{2}x + 3$. Flip and change the sign, so the new slope is 2. Then $y - 5 = 2(x - 3)$ gives $y = 2x - 1$, and the $y$-intercept is $(0, -1)$. $(0, 11)$ is the **Half the flip** trap: it uses $-2$ and forgets to change the sign.",
        twin: {
          text: "Line $k$ is perpendicular to the line $2x + 5y = 10$ and passes through $(2, 3)$. What is the $y$-intercept of line $k$?",
          choices: ["$(0, -2)$", "$(0, 8)$", "$(0, 4)$", "$(0, 2)$"],
          right: 0,
          why: "Get $y$ alone: $y = -\\frac{2}{5}x + 2$. Flip and change the sign, so the new slope is $\\frac{5}{2}$. Then $y - 3 = \\frac{5}{2}(x - 2)$ gives $y = \\frac{5}{2}x - 2$, and the $y$-intercept is $(0, -2)$. $(0, 8)$ is the **Half the flip** trap: it uses $-\\frac{5}{2}$.",
        },
      },
    },
    {
      title: "Parallel line",
      problem: "Which line is parallel to $y = -3x + 5$ and passes through $(2, 4)$?",
      choices: [
        "$y = -3x - 2$",
        "$y = -3x + 4$",
        "$y = -3x + 10$",
        "$y = \\frac{1}{3}x + \\frac{10}{3}$",
      ],
      right: 2,
      steps: [
        { say: "Read the given slope: the number in front of $x$.", show: "$m = -3$" },
        { say: "Parallel lines keep the same slope, so the new slope is $-3$ too." },
        { say: "Use point-slope form with $(2, 4)$.", show: "$y - 4 = -3(x - 2)$" },
        { say: "Distribute and add 4. Check: $-3(2) + 10 = 4$.", show: "$y = -3x + 10$" },
      ],
      answer: "$y = -3x + 10$",
      tryFrom: 2,
      checkIn: {
        text: "Which line is parallel to $y = 2x - 3$ and passes through $(3, 1)$?",
        choices: [
          "$y = 2x - 3$",
          "$y = 2x + 1$",
          "$y = -\\frac{1}{2}x + \\frac{5}{2}$",
          "$y = 2x - 5$",
        ],
        right: 3,
        why: "Parallel lines keep the same slope, 2. Then $y - 1 = 2(x - 3)$ gives $y = 2x - 5$. Check: $2(3) - 5 = 1$. $y = 2x - 3$ is the **Same line, not parallel** trap: it is the given line itself.",
        twin: {
          text: "Which line is parallel to $y = -4x + 1$ and passes through $(1, 6)$?",
          choices: [
            "$y = -4x + 1$",
            "$y = -4x + 10$",
            "$y = -4x + 6$",
            "$y = \\frac{1}{4}x + \\frac{23}{4}$",
          ],
          right: 1,
          why: "Parallel lines keep the same slope, $-4$. Then $y - 6 = -4(x - 1)$ gives $y = -4x + 10$. Check: $-4(1) + 10 = 6$. $y = -4x + 1$ is the **Same line, not parallel** trap: it is the given line itself.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Half the flip",
      text: "A perpendicular slope needs both moves. $\\frac{2}{3}$ becomes $-\\frac{3}{2}$, not $\\frac{3}{2}$ and not $-\\frac{2}{3}$. Check that the two slopes multiply to $-1$.",
    },
    {
      name: "Slope still hidden",
      text: "In $5x - 2y = 6$, the slope is not 5. Get $y$ alone first: $y = \\frac{5}{2}x - 3$, so the slope is $\\frac{5}{2}$.",
    },
    {
      name: "Same line, not parallel",
      text: "Parallel lines have the same slope but different intercepts. A line with the same slope and the same intercept is the given line itself.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Graph to check",
    steps: [
      "Work out the new slope by hand.",
      "Graph the given line and your answer, in parentheses as shown.",
      "Check that your line passes through the point and looks parallel or square to the first. Press the home button after zooming, since uneven zoom bends right angles.",
    ],
    type: ["3x+4y=8", "y=(4/3)(x-6)+2"],
    note: "By hand is faster here. The graph is a check, not the method.",
  },
  check: {
    text: "Line $p$ is perpendicular to the line $y = \\frac{2}{3}x - 1$. What is the slope of line $p$?",
    choices: ["$-\\frac{3}{2}$", "$-\\frac{2}{3}$", "$\\frac{2}{3}$", "$\\frac{3}{2}$"],
    right: 0,
    why: "Flip $\\frac{2}{3}$ to $\\frac{3}{2}$, then change the sign: $-\\frac{3}{2}$. The two slopes multiply to $-1$. $\\frac{3}{2}$ is the **Half the flip** trap: flipped, but the sign kept. $-\\frac{2}{3}$ changes the sign without flipping. $\\frac{2}{3}$ is the same slope, which would make the lines parallel.",
  },
  quiz: [
    {
      text: "Which line is parallel to $y = 4x - 7$ and passes through $(-1, 3)$?",
      choices: ["$y = 4x - 7$", "$y = 4x - 1$", "$y = 4x + 3$", "$y = 4x + 7$"],
      right: 3,
      why: "Parallel keeps the slope, 4. Point-slope form: $y - 3 = 4(x + 1)$, so $y = 4x + 7$. Check: $4(-1) + 7 = 3$. The tempting $y = 4x - 1$ writes $x - 1$ for a point whose $x$ is $-1$. $y = 4x + 3$ uses the point's $y$ as the intercept. $y = 4x - 7$ is the given line itself, the **Same line, not parallel** trap, and it misses the point.",
      subject: "math",
    },
    {
      text: "Line $m$ is perpendicular to the line $5x - 2y = 6$. What should you do first to find the slope of line $m$?",
      choices: [
        "Take 5 as the given slope and flip it to $-\\frac{1}{5}$.",
        "Solve $5x - 2y = 6$ for $y$ to find the given slope.",
        "Set $y = 0$ to find the $x$-intercept.",
        "Use 6 as the new line's $y$-intercept.",
      ],
      right: 1,
      why: "The slope is hidden in standard form, so get $y$ alone: $y = \\frac{5}{2}x - 3$. Then flip and change the sign to get $-\\frac{2}{5}$. Taking 5 as the slope is the **Slope still hidden** trap, and it leads to $-\\frac{1}{5}$. The $x$-intercept tells where a line crosses, not how steep it is. The 6 belongs to the given line and says nothing about line $m$.",
      subject: "math",
    },
    {
      text: "Kai says a line perpendicular to $y = -\\frac{3}{5}x + 2$ has a slope of $-\\frac{5}{3}$. What is wrong?",
      choices: [
        "Nothing is wrong; flipping the fraction is all it takes.",
        "He should not have flipped; the slope is $\\frac{3}{5}$.",
        "He flipped the fraction but kept the sign; the slope is $\\frac{5}{3}$.",
        "Perpendicular lines share a slope; it is $-\\frac{3}{5}$.",
      ],
      right: 2,
      why: "This is the **Half the flip** trap. A perpendicular slope flips the fraction and changes the sign, so $-\\frac{3}{5}$ becomes $\\frac{5}{3}$. Check: $-\\frac{3}{5} \\cdot \\frac{5}{3} = -1$. Kai's slope times $-\\frac{3}{5}$ is $+1$, so his line is not perpendicular. $\\frac{3}{5}$ changes the sign without flipping. $-\\frac{3}{5}$ is the same slope, which makes a parallel line.",
      subject: "math",
    },
    {
      text: "Which pair of lines is perpendicular?",
      choices: [
        "$y = 2x + 1$ and $y = -\\frac{1}{2}x + 3$",
        "$y = 2x + 1$ and $y = 2x - 4$",
        "$y = 2x + 1$ and $y = -2x + 1$",
        "$y = 2x + 1$ and $y = \\frac{1}{2}x + 3$",
      ],
      right: 0,
      why: "Perpendicular slopes multiply to $-1$, and $2 \\cdot \\left(-\\frac{1}{2}\\right) = -1$, so the pair with $-\\frac{1}{2}$ is perpendicular. Slopes 2 and 2 make a parallel pair. Slopes 2 and $-2$ change only the sign, and slopes 2 and $\\frac{1}{2}$ only flip. Both are the **Half the flip** trap, with products $-4$ and 1.",
      subject: "math",
    },
    {
      text: "In the $xy$-plane, line $j$ passes through $(1, 5)$ and $(4, -1)$. Line $k$ is perpendicular to line $j$ and passes through $(2, 0)$. What is the $y$-coordinate of the $y$-intercept of line $k$?",
      choices: ["$-4$", "$-1$", "$1$", "$4$"],
      right: 1,
      why: "Slope of $j$: $\\frac{-1 - 5}{4 - 1} = -2$. Flip and change the sign: $k$ has slope $\\frac{1}{2}$. Then $y = \\frac{1}{2}(x - 2) = \\frac{1}{2}x - 1$, so the $y$-intercept is at $-1$. The tempting 1 is the **Half the flip** trap: slope $-\\frac{1}{2}$ gives $y = -\\frac{1}{2}x + 1$. $-4$ uses slope 2, changing only the sign. 4 keeps slope $-2$, which makes $k$ parallel to $j$.",
      subject: "math",
    },
  ],
};

export default lesson;
