import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-linear-inequalities",
  tests:
    "Solving a linear inequality, and matching inequalities to number lines, shaded graphs and points that work.",
  spot: "The signs $<$, $>$, $\\le$ or $\\ge$, a shaded region or a ray on a number line, or words like at least, at most and no more than.",
  idea: [
    "Solve an inequality like an equation, with one change: when you **multiply or divide by a negative**, flip the sign.",
    "On a number line, an **open dot** means the endpoint is not included ($<$ or $>$). A **closed dot** means it is ($\\le$ or $\\ge$).",
    "On a graph, $y > mx + b$ is the region **above** the line and $y < mx + b$ is below it. A dashed line is not included; a solid line is.",
    "To check any point, substitute it. If the statement comes out true, the point is a solution.",
  ],
  rules: [
    "Times or divided by a negative: flip",
    "$<$ or $>$: open dot, dashed line",
    "$\\le$ or $\\ge$: closed dot, solid line",
    "At least: $\\ge$. At most: $\\le$",
  ],
  figure: {
    kind: "plane",
    x: [-1, 6],
    y: [-3, 10],
    draw: [
      { shade: [1, -2], side: "above", strict: true, tone: "blue" },
      { shade: [-2, 8], side: "below", tone: "warm" },
      { point: [1, 3], label: "(1, 3)", tone: "green" },
    ],
  },
  strategy: {
    name: "Solve, flip, test",
    steps: [
      "Solve as you would an equation.",
      "Flip the sign each time you multiply or divide by a negative.",
      "Match the edge: open or dashed for $<$ and $>$, closed or solid for $\\le$ and $\\ge$.",
      "Test one point in the original inequality to confirm the direction.",
    ],
  },
  examples: [
    {
      title: "Flip the sign",
      problem: "Solve $5 - 3x \\ge 11$ and show the solutions on a number line.",
      figure: {
        kind: "numberLine",
        from: -6,
        to: 4,
        points: [{ at: -2, label: "−2", tone: "green" }],
        ray: { from: -2, dir: "left", tone: "green" },
      },
      steps: [
        { say: "Subtract 5 from both sides.", show: "$-3x \\ge 6$" },
        {
          say: "Divide by $-3$. Dividing by a negative flips the sign.",
          show: "$x \\le -2$",
        },
        {
          say: "Test a point that should work, like $x = -3$, in the original.",
          show: "$5 - 3(-3) = 14 \\ge 11$",
        },
        {
          say: "The sign is $\\le$, so the dot at $-2$ is closed and the ray points left.",
        },
      ],
      answer: "$x \\le -2$",
      checkIn: {
        text: "Solve $7 - 2x > 15$.",
        choices: ["$x < -4$", "$x > -4$", "$x < 4$", "$x < -11$"],
        right: 0,
        why: "Subtract 7 to get $-2x > 8$. Dividing by $-2$ flips the sign: $x < -4$. $x > -4$ is the **Forgetting to flip** trap: test $x = 0$ and you get $7 > 15$, which is false.",
        twin: {
          text: "Solve $4 - 5x \\le 19$.",
          choices: ["$x \\le -3$", "$x \\ge 3$", "$x \\ge -3$", "$x \\le 3$"],
          right: 2,
          why: "Subtract 4 to get $-5x \\le 15$. Dividing by $-5$ flips the sign: $x \\ge -3$. $x \\le -3$ is the **Forgetting to flip** trap: test $x = -5$ and you get $29 \\le 19$, which is false.",
        },
      },
    },
    {
      title: "Test the points",
      problem: "Which point is a solution to the system $y > x - 2$ and $2x + y \\le 8$?",
      choices: ["$(0, 9)$", "$(1, 3)$", "$(4, 2)$", "$(5, 1)$"],
      right: 1,
      figure: {
        kind: "plane",
        x: [-1, 6],
        y: [-3, 10],
        draw: [
          { shade: [1, -2], side: "above", strict: true, tone: "blue" },
          { shade: [-2, 8], side: "below", tone: "warm" },
          { point: [0, 9], tone: "red" },
          { point: [4, 2], tone: "red" },
          { point: [5, 1], tone: "red" },
          { point: [1, 3], label: "(1, 3)", tone: "green" },
        ],
      },
      steps: [
        { say: "A solution must make both inequalities true. Test each point in both." },
        {
          say: "Try $(0, 9)$. The first is true, $9 > -2$, but the second is false.",
          show: "$2(0) + 9 = 9 \\le 8$ is false",
        },
        {
          say: "Try $(4, 2)$. It sits on the dashed edge, which is not included.",
          show: "$2 > 4 - 2$ is false",
        },
        { say: "Try $(5, 1)$.", show: "$1 > 5 - 2$ is false" },
        {
          say: "Try $(1, 3)$. Both come out true.",
          show: "$3 > -1$ and $2(1) + 3 = 5 \\le 8$",
        },
      ],
      answer: "$(1, 3)$",
      tryFrom: 3,
      checkIn: {
        text: "Which point is a solution to the system $y < x + 3$ and $x + y \\ge 4$?",
        choices: ["$(1, 1)$", "$(3, 2)$", "$(1, 4)$", "$(2, 6)$"],
        right: 1,
        why: "Test each point in both. For $(3, 2)$: $2 < 6$ and $3 + 2 = 5 \\ge 4$, so both are true. $(1, 4)$ sits on the dashed edge, since $4 < 4$ is false: the **Edge included or not** trap.",
        twin: {
          text: "Which point is a solution to the system $y \\ge 2x - 1$ and $x + y < 6$?",
          choices: ["$(2, 4)$", "$(3, 1)$", "$(0, 7)$", "$(1, 3)$"],
          right: 3,
          why: "Test each point in both. For $(1, 3)$: $3 \\ge 1$ and $1 + 3 = 4 < 6$, so both are true. $(2, 4)$ sits on the dashed edge, since $6 < 6$ is false: the **Edge included or not** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Forgetting to flip",
      text: "Dividing $-3x \\ge 6$ by $-3$ gives $x \\le -2$, not $x \\ge -2$. Test a point to catch it: $x = 0$ gives $5 \\ge 11$, which is false.",
    },
    {
      name: "Edge included or not",
      text: "A point on a dashed line or at an open dot is not a solution. Strict signs, $<$ and $>$, leave the edge out. Substitute any point that seems to sit on an edge.",
    },
    {
      name: "Shading the wrong side",
      text: "Read above or below only once $y$ is alone on the left. $-y > x$ becomes $y < -x$, which is shaded below.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Shade and drop points",
    steps: [
      "Type each inequality as given. Typing <= makes $\\le$.",
      "The solutions of a system are where the shadings overlap.",
      "Type each answer choice as a point and see which one lands in the overlap.",
    ],
    type: ["y>x-2", "2x+y<=8", "(1,3)"],
    note: "If a point seems to sit right on an edge, substitute it by hand. Testing four points by hand is often just as fast; the graph wins when the choices are graphs.",
  },
  check: {
    text: "Which value of $x$ is a solution to $7 - 2x < 1$?",
    choices: ["$-4$", "$2$", "$3$", "$4$"],
    right: 3,
    why: "Subtract 7: $-2x < -6$. Divide by $-2$ and flip: $x > 3$. Only 4 is greater than 3, and $7 - 8 = -1 < 1$ checks. $-4$ and 2 fit $x < 3$, the result of forgetting to flip. 3 gives $7 - 6 = 1$, and $1 < 1$ is false: the edge is not included.",
  },
  quiz: [
    {
      text: "Which point is a solution to the system $y \\le 3x + 1$ and $y > -x + 5$?",
      choices: ["$(0, 6)$", "$(1, 4)$", "$(2, 4)$", "$(3, 1)$"],
      right: 2,
      why: "Test each point in both inequalities. For $(2, 4)$: $4 \\le 7$ is true and $4 > 3$ is true, so it works. The tempting $(1, 4)$ passes the first, $4 \\le 4$, but $4 > 4$ is false: it sits on the dashed edge, the edge included or not trap. $(0, 6)$ fails the first, since $6 \\le 1$ is false. $(3, 1)$ fails the second, since $1 > 2$ is false.",
      subject: "math",
    },
    {
      text: "Which steps solve $-4x + 9 > 21$ correctly?",
      choices: [
        "Subtract 9, then divide by $-4$ and flip the sign: $x < -3$.",
        "Subtract 9, then divide by $-4$ and keep the sign: $x > -3$.",
        "Add 9, then divide by $-4$ and flip the sign: $x < -7.5$.",
        "Subtract 9, then multiply 12 by $-4$ and flip the sign: $x < -48$.",
      ],
      right: 0,
      why: "Undo the $+9$ first, then the $-4$. Subtracting 9 gives $-4x > 12$, and dividing by $-4$ flips the sign: $x < -3$. Test $x = -4$: $16 + 9 = 25 > 21$, true. Keeping the sign is the forgetting to flip trap. Adding 9 to 21 instead of subtracting it gives $-4x > 30$. Multiplying 12 by $-4$ instead of dividing gives $-48$, which does not undo the $-4$.",
      subject: "math",
    },
    {
      text: "Ana solves $-2(x - 3) \\le 10$. Step 1: $-2x + 6 \\le 10$. Step 2: $-2x \\le 4$. Step 3: $x \\le -2$. Where is her mistake?",
      choices: [
        "Step 1: the right result is $-2x - 6 \\le 10$.",
        "Step 2: she should add 6 to both sides, not subtract it.",
        "Step 3: $4 \\div (-2)$ is 2, not $-2$.",
        "Step 3: dividing by $-2$ flips the sign, so $x \\ge -2$.",
      ],
      right: 3,
      why: "Steps 1 and 2 are right. In Step 3 she divided by $-2$ but kept $\\le$, the forgetting to flip trap. The answer is $x \\ge -2$; test $x = 0$: $-2(-3) = 6 \\le 10$, true. Step 1 is right, since $-2$ times $-3$ is $+6$. Step 2 is right: subtracting 6 undoes the $+6$. Step 3's number is right, because $4 \\div (-2) = -2$.",
      subject: "math",
    },
    {
      text: "On a graph, a solid line passes through $(0, -1)$ and $(2, 3)$, and the region above the line is shaded. Which inequality does the graph show?",
      choices: ["$y > 2x - 1$", "$y \\ge 2x - 1$", "$y \\le 2x - 1$", "$y \\ge \\frac{1}{2}x - 1$"],
      right: 1,
      why: "Find the line, then match the edge and the side. The slope is $\\frac{3 - (-1)}{2 - 0} = 2$ and the line crosses the $y$-axis at $-1$, so it is $y = 2x - 1$. A solid line means $\\ge$ or $\\le$, and above means $\\ge$. The tempting $y > 2x - 1$ would need a dashed line, the edge included or not trap. $\\le$ is shading the wrong side. A slope of $\\frac{1}{2}$ is run over rise.",
      subject: "math",
    },
    {
      text: "A delivery van can carry at most 1,500 pounds. The driver weighs 170 pounds, and each box weighs 40 pounds. What is the greatest number of boxes the van can carry with the driver on board?",
      choices: ["$33$", "$34$", "$37$", "$41$"],
      right: 0,
      why: "At most means $\\le$: $170 + 40b \\le 1500$. Subtract 170 to get $40b \\le 1330$, so $b \\le 33.25$. Boxes come whole, so the greatest is 33. Test it: $170 + 1320 = 1490 \\le 1500$. The tempting 34 rounds up, but $170 + 1360 = 1530$ is over the limit. 37 forgets the driver: $1500 \\div 40 = 37.5$. 41 adds the driver's weight instead of subtracting it.",
      subject: "math",
    },
  ],
};

export default lesson;
