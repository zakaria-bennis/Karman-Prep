import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-slope-and-rate-of-change",
  tests:
    "Finding the slope of a line from two points, a table or a graph, and saying what it means in a real situation.",
  spot: "Two points, a table, or a story where something changes at a constant rate, and words like slope, rate, per or each.",
  idea: [
    "**Slope** is the change in $y$ over the change in $x$: rise over run. It tells how steep a line is and which way it goes.",
    "Subtract in the **same order** on top and bottom. A line that falls from left to right has a **negative** slope.",
    "In a story, slope is a **rate**: $y$ units for each one $x$ unit. A slope of $-3$ in centimeters per hour means 3 centimeters lost each hour.",
  ],
  rules: ["$m = \\frac{y_2 - y_1}{x_2 - x_1}$", "Falling line: $m < 0$", "Units: $y$ per $x$"],
  figure: {
    kind: "plane",
    x: [-1, 6],
    y: [-1, 10],
    draw: [
      { line: [2, 0], label: "slope 2", tone: "blue" },
      { segment: [1, 2, 4, 2], label: "run 3", tone: "warm" },
      { segment: [4, 2, 4, 8], label: "rise 6", tone: "green" },
      { point: [1, 2], label: "(1, 2)", tone: "ink" },
      { point: [4, 8], label: "(4, 8)", tone: "ink" },
    ],
  },
  strategy: {
    name: "Change over change",
    steps: [
      "Pick two points, or two rows of the table.",
      "Subtract in the same order: $y_2 - y_1$ on top, $x_2 - x_1$ on the bottom.",
      "Divide, and keep the sign.",
      "Say it in context: $y$ units per one $x$ unit.",
    ],
  },
  examples: [
    {
      title: "Two points",
      problem: "A line passes through $(-2, 7)$ and $(4, -2)$. What is its slope?",
      steps: [
        { say: "Label the points.", show: "$(x_1, y_1) = (-2, 7)$, $(x_2, y_2) = (4, -2)$" },
        { say: "Find the change in $y$, second minus first.", show: "$-2 - 7 = -9$" },
        { say: "Find the change in $x$, in the same order.", show: "$4 - (-2) = 6$" },
        {
          say: "Divide, and keep the sign. The line falls, so the slope is negative.",
          show: "$\\frac{-9}{6} = -\\frac{3}{2}$",
        },
      ],
      answer: "$-\\frac{3}{2}$",
    },
    {
      title: "Melting snow",
      problem:
        "After 2 hours of sun, the snow on a roof is 34 centimeters deep. After 6 hours, it is 22 centimeters deep. The depth changes at a constant rate. Which statement best describes the slope?",
      choices: [
        "The depth drops by $\\frac{1}{3}$ centimeter each hour.",
        "The depth drops by 3 centimeters each hour.",
        "The depth rises by 3 centimeters each hour.",
        "The depth drops by 12 centimeters each hour.",
      ],
      right: 1,
      steps: [
        {
          say: "Write the two readings as points: (hours, depth).",
          show: "$(2, 34)$ and $(6, 22)$",
        },
        {
          say: "Find both changes, in the same order.",
          show: "$22 - 34 = -12$ and $6 - 2 = 4$",
        },
        { say: "Divide, and keep the sign.", show: "$\\frac{-12}{4} = -3$" },
        {
          say: "Say it in context: $-3$ centimeters per hour means the depth drops 3 centimeters each hour.",
        },
      ],
      answer: "The depth drops by 3 centimeters each hour.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Upside-down slope",
      text: "The change in $y$ goes on top. Putting the change in $x$ on top gives $\\frac{1}{3}$ where the slope is 3, and that wrong answer is usually a choice.",
    },
    {
      name: "Lost the sign",
      text: "If the amount shrinks, the slope is negative. Keep the minus sign, or say drops instead of rises.",
    },
    {
      name: "Mixed order",
      text: "If you subtract second minus first on top, do second minus first on the bottom too. Mixing the orders flips the sign.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Fit the line",
    steps: [
      "With two points, type the slope as one fraction, with parentheses on top and bottom.",
      "With a table, add a table and type the $x$-values in $x_1$ and the $y$-values in $y_1$.",
      "On a new line, type y1 ~ mx1 + b. Read $m$, the slope, and $b$, the start, under the line.",
    ],
    type: ["(22-34)/(6-2)", "y1~mx1+b"],
    note: "With two clean points, one line of arithmetic by hand is faster. The fit helps when a table has three or more rows or messy decimals.",
  },
  check: {
    text: "A line passes through $(3, 5)$ and $(7, 3)$. What is its slope?",
    choices: ["$-2$", "$-\\frac{1}{2}$", "$\\frac{1}{2}$", "$2$"],
    right: 1,
    why: "Change in $y$ over change in $x$, in the same order: $\\frac{3 - 5}{7 - 3} = \\frac{-2}{4} = -\\frac{1}{2}$. $-2$ is the Upside-down slope: change in $x$ over change in $y$. $\\frac{1}{2}$ loses the sign, but the line falls from left to right. 2 makes both mistakes at once.",
  },
  quiz: [
    {
      text: "A phone's battery is at 92% at 1 p.m. and at 64% at 5 p.m. The charge drops at a constant rate. What is the rate of change of the charge, in percent per hour?",
      choices: ["$-28$", "$-7$", "$-\\frac{1}{7}$", "$7$"],
      right: 1,
      why: "Change over change: $\\frac{64 - 92}{5 - 1} = \\frac{-28}{4} = -7$. The battery loses 7 percent each hour, so the rate is $-7$. The tempting 7 is the **Lost the sign** trap: the charge goes down. $-\\frac{1}{7}$ is the Upside-down slope, hours over percent. $-28$ is the change in charge, not yet divided by the 4 hours.",
      subject: "math",
    },
    {
      text: "A plant is 10.5 centimeters tall in week 3 and 16.5 centimeters tall in week 7. It grows at a constant rate. To find how fast it grows, what should you do first?",
      choices: [
        "Find both changes, in the same order: $16.5 - 10.5$ and $7 - 3$.",
        "Divide the last height by the last week: $\\frac{16.5}{7}$.",
        "Find both changes, then put the weeks on top: $\\frac{7 - 3}{16.5 - 10.5}$.",
        "Subtract the first week from the first height: $10.5 - 3$.",
      ],
      right: 0,
      why: "A rate compares two changes, so find the change in height and the change in weeks: 6 centimeters over 4 weeks, or 1.5 centimeters per week. Putting the weeks on top is the Upside-down slope, weeks per centimeter. Dividing 16.5 by 7 would work only if the plant were 0 centimeters in week 0. $10.5 - 3$ mixes centimeters with weeks.",
      subject: "math",
    },
    {
      text: "Sam finds the slope of the line through $(1, 6)$ and $(5, -2)$: $\\frac{-2 - 6}{1 - 5} = \\frac{-8}{-4} = 2$. What went wrong?",
      choices: [
        "Nothing went wrong; the slope is 2.",
        "He put the change in $x$ on top and the change in $y$ on the bottom.",
        "He should have added the coordinates instead of subtracting them.",
        "He subtracted the $x$-values in the opposite order from the $y$-values.",
      ],
      right: 3,
      why: "This is the **Mixed order** trap. On top he did second minus first, $-2 - 6 = -8$. On the bottom he did first minus second, $1 - 5 = -4$. In the same order, the slope is $\\frac{-8}{4} = -2$, a line that falls. His change in $y$ is on top, so it is not the Upside-down slope. Slope uses differences, never sums, and 2 is not right.",
      subject: "math",
    },
    {
      text: "A taxi ride of $m$ miles costs $C = 2.5m + 3$ dollars. What does 2.5 mean in this equation?",
      choices: [
        "The cost, in dollars, before any miles are driven",
        "The cost, in dollars, of a 1-mile ride",
        "The extra cost, in dollars, for each mile",
        "The number of miles you can ride for 1 dollar",
      ],
      right: 2,
      why: "The slope is the change in output for each one unit of input. Each extra mile adds 2.5 dollars, so 2.5 is the cost per mile. The cost before any miles is the start, 3 dollars. A 1-mile ride costs $2.5 + 3 = 5.5$ dollars, not 2.5. Miles per dollar is the Upside-down slope, $\\frac{1}{2.5} = 0.4$.",
      subject: "math",
    },
    {
      text: "An oven cools at a constant rate. At 4 minutes it is 380 degrees, at 10 minutes it is 314 degrees, and at 18 minutes it is 226 degrees. What was the oven's temperature at 0 minutes?",
      choices: ["$336$", "$380$", "$424$", "$446$"],
      right: 2,
      why: "Find the rate first: $\\frac{314 - 380}{10 - 4} = \\frac{-66}{6} = -11$ degrees per minute. Going back 4 minutes from 380 adds $4 \\cdot 11 = 44$ degrees, so the answer is 424. The tempting 336 is the **Lost the sign** trap: it subtracts 44, as if the oven were warming up. 380 is the reading at 4 minutes, not 0. 446 adds the whole 66-degree drop instead of 4 minutes of it.",
      subject: "math",
    },
  ],
};

export default lesson;
