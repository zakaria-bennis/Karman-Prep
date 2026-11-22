import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-nonlinear-systems",
  tests:
    "Finding where a line meets a parabola or a circle, and telling how many points they share.",
  spot: "Two equations, one with $x^2$ or $y^2$ in it, or a line and a curve drawn together. The question asks for a solution $(x, y)$, a sum of values, or how many solutions there are.",
  idea: [
    "A **nonlinear system** pairs a line with a curve, such as a parabola or a circle. Its solutions are the points where the two graphs **cross**.",
    "To solve one, **substitute**: put the line's expression for $y$ into the other equation. You get one equation in $x$, usually a quadratic.",
    "A line can cross a curve twice, touch it once, or miss it. The quadratic's **discriminant**, $b^2 - 4ac$, tells which.",
  ],
  rules: [
    "Substitute $y$ from the line",
    "$b^2 - 4ac > 0$: two points",
    "$b^2 - 4ac = 0$: one point",
    "$b^2 - 4ac < 0$: no points",
  ],
  figure: {
    kind: "plane",
    x: [-2, 7],
    y: [-5, 9],
    draw: [
      { parabola: [1, 2, -3], label: "y = x^2 - 4x + 1", tone: "warm" },
      { line: [2, -4], label: "y = 2x - 4", tone: "blue" },
      { point: [1, -2], label: "(1, -2)", tone: "green" },
      { point: [5, 6], label: "(5, 6)", tone: "green" },
    ],
  },
  strategy: {
    name: "Substitute and solve",
    steps: [
      "Get $y$ alone in the line's equation.",
      "Substitute it into the curve's equation.",
      "Move every term to one side and solve the quadratic.",
      "Plug each $x$ into the line to find its $y$.",
      "Asked only how many? Find $b^2 - 4ac$ of that quadratic.",
    ],
  },
  examples: [
    {
      title: "Line and parabola",
      problem:
        "The system $y = x^2 - 2x - 3$ and $y = x + 1$ has a solution $(x, y)$ with $x > 0$. What is the value of $y$?",
      steps: [
        { say: "Both equations give $y$, so set them equal.", show: "$x^2 - 2x - 3 = x + 1$" },
        { say: "Move every term to one side.", show: "$x^2 - 3x - 4 = 0$" },
        {
          say: "Factor. Keep both answers for now.",
          show: "$(x - 4)(x + 1) = 0$, so $x = 4$ or $x = -1$",
        },
        {
          say: "The question wants $x > 0$, so use 4. Plug it into the line to get $y$.",
          show: "$y = 4 + 1 = 5$",
        },
      ],
      answer: "$y = 5$",
      checkIn: {
        text: "The system $y = x^2 - 4x + 1$ and $y = x - 3$ has a solution $(x, y)$ with $x > 1$. What is the value of $y$?",
        choices: ["$4$", "$-2$", "$1$", "$5$"],
        right: 2,
        why: "Set them equal: $x^2 - 4x + 1 = x - 3$, so $x^2 - 5x + 4 = 0$ and $(x - 1)(x - 4) = 0$. Use $x = 4$, then $y = 4 - 3 = 1$. 4 is the **Wrong coordinate** trap: it is $x$, not $y$.",
        twin: {
          text: "The system $y = x^2 + 2x - 5$ and $y = 3x + 1$ has a solution $(x, y)$ with $x > 0$. What is the value of $y$?",
          choices: ["$10$", "$3$", "$-5$", "$13$"],
          right: 0,
          why: "Set them equal: $x^2 + 2x - 5 = 3x + 1$, so $x^2 - x - 6 = 0$ and $(x - 3)(x + 2) = 0$. Use $x = 3$, then $y = 3(3) + 1 = 10$. 3 is the **Wrong coordinate** trap: it is $x$, not $y$.",
        },
      },
    },
    {
      title: "Line and circle",
      problem:
        "The system $x^2 + y^2 = 25$ and $y = x + 1$ has a solution with $x > 0$. What is that solution $(x, y)$?",
      steps: [
        { say: "Put $x + 1$ in place of $y$ in the circle.", show: "$x^2 + (x + 1)^2 = 25$" },
        {
          say: "Expand: $(x + 1)^2 = x^2 + 2x + 1$. Move every term to one side and divide by 2.",
          show: "$x^2 + x - 12 = 0$",
        },
        { say: "Factor, and keep the positive one.", show: "$(x + 4)(x - 3) = 0$, so $x = 3$" },
        { say: "Plug 3 into the line to get $y$.", show: "$y = 3 + 1 = 4$" },
      ],
      answer: "$(3, 4)$",
      tryFrom: 2,
      checkIn: {
        text: "The system $x^2 + y^2 = 25$ and $y = x - 1$ has a solution with $x > 0$. What is that solution $(x, y)$?",
        choices: ["$(-3, -4)$", "$(3, 4)$", "$(4, 5)$", "$(4, 3)$"],
        right: 3,
        why: "Put $x - 1$ in for $y$: $x^2 + (x - 1)^2 = 25$. That gives $2x^2 - 2x - 24 = 0$, or $x^2 - x - 12 = 0$, so $x = 4$ or $x = -3$. With $x = 4$, $y = 4 - 1 = 3$. $(-3, -4)$ is the other crossing, but its $x$ is not positive.",
        twin: {
          text: "The system $x^2 + y^2 = 100$ and $y = x + 2$ has a solution with $x > 0$. What is that solution $(x, y)$?",
          choices: ["$(-8, -6)$", "$(6, 8)$", "$(8, 6)$", "$(6, 4)$"],
          right: 1,
          why: "Put $x + 2$ in for $y$: $x^2 + (x + 2)^2 = 100$. That gives $2x^2 + 4x - 96 = 0$, or $x^2 + 2x - 48 = 0$, so $x = 6$ or $x = -8$. With $x = 6$, $y = 6 + 2 = 8$. $(-8, -6)$ is the other crossing, but its $x$ is not positive.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Half a square",
      text: "$(x + 1)^2$ is $x^2 + 2x + 1$, not $x^2 + 1$. Write it out as $(x + 1)(x + 1)$ when you substitute into a circle.",
    },
    {
      name: "Wrong coordinate",
      text: "The quadratic gives $x$. If the question asks for $y$, a sum or a product, plug in and finish the job.",
    },
    {
      name: "Missing a solution",
      text: "A line can cross a curve twice. Keep both answers until the question picks one, and count both when it asks how many.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Click every crossing",
    steps: [
      "Type both equations as given. A circle can stay as $x^2 + y^2 = 25$.",
      "Click each crossing to read its point. Zoom out so none is off the screen.",
      "Count the crossings when the question asks how many.",
    ],
    type: ["y = x^2 - 4x + 1", "y = 2x - 4"],
    note: "Dots appear at (1, -2) and (5, 6). Setting the two equal and factoring, $x^2 - 6x + 5 = 0$, is about as fast by hand. A line that only touches a curve may get no dot, so check that case with $b^2 - 4ac$.",
  },
  check: {
    text: "The system $y = x^2 - 5$ and $y = 4x$ has two solutions. What is the sum of the x-coordinates of the solutions?",
    choices: ["$-4$", "$4$", "$5$", "$16$"],
    right: 1,
    why: "Set them equal: $x^2 - 5 = 4x$, so $x^2 - 4x - 5 = (x - 5)(x + 1) = 0$, and $x = 5$ or $x = -1$. The sum is 4. 5 is the **Missing a solution** trap, and 16 adds the y-coordinates, 20 and $-4$, which is the **Wrong coordinate** trap. $-4$ comes from factoring with the signs flipped.",
  },
  quiz: [
    {
      text: "Which point $(x, y)$ is a solution to the system $x^2 + y^2 = 10$ and $y = x - 2$?",
      choices: ["$(-3, -5)$", "$(1, -1)$", "$(1, 3)$", "$(3, 1)$"],
      right: 3,
      why: "Substitute: $x^2 + (x - 2)^2 = 10$, so $2x^2 - 4x - 6 = 0$ and $x^2 - 2x - 3 = (x - 3)(x + 1) = 0$. At $x = 3$, $y = 1$, and $(3, 1)$ fits both equations. The tempting $(1, 3)$ is on the circle but not on the line, a Wrong coordinate swap. $(-3, -5)$ and $(1, -1)$ come from factoring with the signs flipped; they are on the line but not the circle.",
      subject: "math",
    },
    {
      text: "What should you do first to solve the system $y = 2x + 3$ and $y = x^2 - 4x + 8$?",
      choices: [
        "Set $2x + 3 = x^2 - 4x + 8$.",
        "Add the two equations to cancel $y$.",
        "Set $x^2 - 4x + 8 = 0$ and solve.",
        "Set $2x + 3 = 0$ and solve.",
      ],
      right: 0,
      why: "Both equations give $y$, so substitute: $2x + 3 = x^2 - 4x + 8$, which becomes $x^2 - 6x + 5 = 0$, so $x = 1$ or $x = 5$. Adding the equations gives $2y$, so $y$ does not cancel. Setting the curve equal to 0 finds where it meets the x-axis, not where it meets the line, and setting $2x + 3 = 0$ does the same for the line.",
      subject: "math",
    },
    {
      text: "Kim solved the system $y = x + 1$ and $x^2 + y^2 = 13$. She wrote $x^2 + x^2 + 1 = 13$, so $x^2 = 6$. What is her mistake?",
      choices: [
        "She should have substituted for $x$, not for $y$.",
        "$(x + 1)^2$ is $x^2 + 2x + 1$, not $x^2 + 1$.",
        "She should have subtracted 13 before substituting.",
        "$x^2 + x^2$ is $x^4$, not $2x^2$.",
      ],
      right: 1,
      why: "Kim fell for Half a square: she dropped the middle term $2x$. Done right, $2x^2 + 2x + 1 = 13$ gives $x^2 + x - 6 = (x + 3)(x - 2) = 0$, so the solutions are $(2, 3)$ and $(-3, -2)$. Substituting for $y$ was a fine choice. Moving 13 first changes nothing. $x^2 + x^2$ really is $2x^2$.",
      subject: "math",
    },
    {
      text: "How many solutions does the system $y = x^2 - 6x + 10$ and $y = 2x - 6$ have?",
      choices: ["Zero", "Exactly one", "Exactly two", "Infinitely many"],
      right: 1,
      why: "Set them equal: $x^2 - 8x + 16 = 0$. The discriminant is $64 - 64 = 0$, so there is exactly one solution: $(x - 4)^2 = 0$ gives the point $(4, 2)$, where the line just touches the parabola. Expecting two forgets that a line can also just touch a curve. On a graph, a touch may get no dot, which makes zero look right. Infinitely many would need the same graph twice.",
      subject: "math",
    },
    {
      text: "The graphs of $y = x^2 + 2x - 3$ and $y = 4x + 5$ meet at the points $(a, b)$ and $(c, d)$. What is the value of $b + d$?",
      choices: ["$-3$", "$2$", "$18$", "$21$"],
      right: 2,
      why: "Set them equal: $x^2 - 2x - 8 = (x - 4)(x + 2) = 0$, so $x = 4$ or $x = -2$. Plug each into the line: $y = 21$ and $y = -3$, so $b + d = 18$. The tempting 2 adds the x-values, which is the **Wrong coordinate** trap. 21 and $-3$ are each only one of the y-values, which is the **Missing a solution** trap.",
      subject: "math",
    },
  ],
};

export default lesson;
