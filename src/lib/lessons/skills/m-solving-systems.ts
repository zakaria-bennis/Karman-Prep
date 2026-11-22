import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-solving-systems",
  tests:
    "Finding the one pair of values that makes two linear equations true at the same time, by substitution or elimination.",
  spot: "Two equations with $x$ and $y$, often joined by a brace, and a question about $x$, $y$, $x + y$ or the point $(x, y)$.",
  idea: [
    "A system is two equations that must both be true. Its **solution** is the pair $(x, y)$ that works in both: the point where the two lines cross.",
    "**Elimination** adds or subtracts the equations so one letter cancels. If the numbers in front of a letter do not match yet, multiply a whole equation first.",
    "**Substitution** works when one equation already says $y = $ or $x = $. Put that expression into the other equation in place of the letter.",
    "Either way, you get one equation with one letter. Solve it, plug back in for the other letter, then answer **exactly what is asked**.",
  ],
  rules: ["Opposite signs: add", "Same signs: subtract", "One letter alone: substitute"],
  figure: {
    kind: "plane",
    x: [-1, 7],
    y: [-1, 9],
    draw: [
      { line: [-1.5, 8.5], label: "3x + 2y = 17", tone: "blue" },
      { line: [1.25, 0.25], label: "5x − 4y = −1", tone: "warm" },
      { point: [3, 4], label: "(3, 4)", tone: "green" },
    ],
  },
  strategy: {
    name: "Cancel one letter",
    steps: [
      "Line the equations up: $x$ under $x$, $y$ under $y$, numbers on the right.",
      "If one equation already says $y =$ or $x =$, substitute. Otherwise pick the letter that is easiest to cancel.",
      "Multiply every term of an equation if needed, then add or subtract so that letter cancels.",
      "Solve, plug back in for the other letter, and answer what the question asks.",
    ],
  },
  examples: [
    {
      title: "Scale, then add",
      problem:
        "If $(x, y)$ is the solution to the system $3x + 2y = 17$ and $5x - 4y = -1$, what is the value of $x + y$?",
      figure: {
        kind: "plane",
        x: [-1, 7],
        y: [-1, 9],
        draw: [
          { line: [-1.5, 8.5], tone: "blue" },
          { line: [1.25, 0.25], tone: "warm" },
          { point: [3, 4], label: "(3, 4)", tone: "green" },
        ],
      },
      steps: [
        {
          say: "The $y$ terms have opposite signs, $+2y$ and $-4y$. Double the first equation so they match.",
          show: "$6x + 4y = 34$",
        },
        { say: "Add it to the second equation. The $y$ terms cancel.", show: "$11x = 33$" },
        { say: "Divide by 11.", show: "$x = 3$" },
        {
          say: "Plug $x = 3$ into the first equation to find $y$.",
          show: "$9 + 2y = 17 \\Rightarrow y = 4$",
        },
        { say: "The question asks for $x + y$, not $x$.", show: "$3 + 4 = 7$" },
      ],
      answer: "$7$",
    },
    {
      title: "Substitute",
      problem: "Solve the system $y = 2x - 1$ and $3x + 2y = 33$.",
      figure: {
        kind: "plane",
        x: [0, 10],
        y: [0, 14],
        draw: [
          { line: [2, -1], tone: "blue" },
          { line: [-1.5, 16.5], tone: "warm" },
          { point: [5, 9], label: "(5, 9)", tone: "green" },
        ],
      },
      steps: [
        {
          say: "The first equation already says $y =$. Put $2x - 1$ in place of $y$.",
          show: "$3x + 2(2x - 1) = 33$",
        },
        { say: "Distribute the 2 to both terms and combine.", show: "$7x - 2 = 33$" },
        { say: "Add 2 to both sides, then divide by 7.", show: "$7x = 35 \\Rightarrow x = 5$" },
        { say: "Plug $x = 5$ into $y = 2x - 1$.", show: "$y = 2(5) - 1 = 9$" },
      ],
      answer: "$(5, 9)$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Answering the wrong letter",
      text: "Many questions ask for $y$, $x + y$ or $x - y$. Finding $x$ is only halfway. Reread the question before you pick, because $x$ alone is always a choice.",
    },
    {
      name: "Scaling one term",
      text: "When you multiply an equation, multiply every term, including the number after the equals sign. Doubling $x + 2y = 7$ gives $2x + 4y = 14$, not $2x + 4y = 7$.",
    },
    {
      name: "Sign slip",
      text: "Subtracting an equation subtracts every term. $3y - (-y)$ is $4y$, not $2y$. If the signs feel risky, multiply by $-1$ and add instead.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Click the crossing",
    steps: [
      "Type each equation as given, one per line. There is no need to solve for $y$ first.",
      "Click the point where the two lines cross to see its coordinates.",
      "Answer what is asked: $x$, $y$, $x + y$ or something else.",
    ],
    type: ["3x+2y=17", "5x-4y=-1"],
    note: "The crossing shows $(3, 4)$, so $x + y = 7$. When adding the equations cancels a letter right away, working by hand is just as fast.",
  },
  check: {
    text: "If $x + 3y = 11$ and $x - y = 3$, what is the value of $y$?",
    choices: ["$2$", "$3$", "$4$", "$5$"],
    right: 0,
    why: "Subtract the second equation from the first. The $x$ terms cancel, $3y - (-y) = 4y$, and $11 - 3 = 8$, so $4y = 8$ and $y = 2$. 4 comes from the sign slip $3y - y = 2y$. 5 is the value of $x$, the wrong letter. 3 is just the number in the second equation.",
  },
  quiz: [
    {
      text: "If $y = 3x - 4$ and $2x + y = 26$, what is the value of $y$?",
      choices: ["$6$", "$14$", "$18$", "$30$"],
      right: 1,
      why: "Substitute: the first equation already says $y =$. Then $2x + (3x - 4) = 26$, so $5x - 4 = 26$, $5x = 30$ and $x = 6$. Plug back in: $y = 3(6) - 4 = 14$. The tempting 6 is $x$, which is answering the wrong letter. 18 drops the $-4$ when plugging back in. 30 is the value of $5x$, not of $y$.",
      subject: "math",
    },
    {
      text: "Which first step correctly cancels one letter in the system $4x + 3y = 10$ and $2x - 5y = 18$?",
      choices: [
        "Add the two equations as they are.",
        "Multiply only the $2x$ term by 2, then subtract the equations.",
        "Multiply the second equation by 2, then add the equations.",
        "Multiply the second equation by 2, then subtract it from the first.",
      ],
      right: 3,
      why: "Make the $x$ terms match, then cancel them. Doubling every term of the second equation gives $4x - 10y = 36$. The $x$ terms now have the same sign, so subtract: $13y = -26$. Multiplying only the $2x$ term is scaling one term, which changes the equation. Adding after doubling gives $8x$, which cancels nothing. Adding as they are gives $6x - 2y = 28$, still with both letters.",
      subject: "math",
    },
    {
      text: "Sam solves $x + 2y = 7$ and $3x - 4y = 1$. Step 1: he doubles the first equation to get $2x + 4y = 7$. Step 2: he adds the equations to get $5x = 8$. Step 3: he writes $x = \\frac{8}{5}$. Where is his mistake?",
      choices: [
        "Step 1: the 7 must be doubled too, to 14.",
        "Step 1: he should multiply by 4 to match the $4y$.",
        "Step 2: he should subtract the equations instead of adding.",
        "Step 3: $5x = 8$ gives $x = \\frac{5}{8}$.",
      ],
      right: 0,
      why: "Multiplying an equation means every term. Sam doubled $x$ and $2y$ but left the 7, which is scaling one term. The right line is $2x + 4y = 14$, and adding gives $5x = 15$, so $x = 3$ and $y = 2$. Multiplying by 2 is enough, since $4y$ and $-4y$ already cancel. Adding is right, because the signs are opposite. Step 3 divides correctly; $\\frac{5}{8}$ divides the wrong way.",
      subject: "math",
    },
    {
      text: "Which system is fastest to solve by adding the two equations exactly as they are?",
      choices: [
        "$2x + 5y = 1$ and $3x - 4y = 13$",
        "$3x + 2y = 8$ and $x + 2y = 4$",
        "$4x - 3y = 5$ and $2x + 3y = 13$",
        "$y = 2x + 1$ and $3x + y = 11$",
      ],
      right: 2,
      why: "Adding cancels a letter only when its terms are opposites. In $4x - 3y = 5$ and $2x + 3y = 13$, the $-3y$ and $+3y$ cancel at once: $6x = 18$, so $x = 3$. In $3x + 2y = 8$ and $x + 2y = 4$, the $2y$ terms have the same sign, so you subtract, not add. The system with $5y$ and $-4y$ needs scaling first. The one that says $y = 2x + 1$ is set up for substitution.",
      subject: "math",
    },
    {
      text: "If $(x, y)$ is the solution to the system $2x + 5y = 24$ and $3x - 2y = 17$, what is the value of $x - y$?",
      choices: ["$2$", "$5$", "$7$", "$9$"],
      right: 1,
      why: "Scale both equations so the $x$ terms match: triple the first to get $6x + 15y = 72$, and double the second to get $6x - 4y = 34$. Subtract: $19y = 38$, so $y = 2$. Then $2x + 10 = 24$ gives $x = 7$, and $x - y = 5$. The tempting 7 is $x$ alone, answering the wrong letter. 2 is $y$ alone. 9 is $x + y$, not $x - y$.",
      subject: "math",
    },
  ],
};

export default lesson;
