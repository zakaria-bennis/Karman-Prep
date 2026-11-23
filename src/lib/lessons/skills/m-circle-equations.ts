import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-circle-equations",
  tests:
    "Reading a circle's center and radius from its equation, often after completing the square, or writing the equation from them.",
  spot: "An equation with both $x^2$ and $y^2$ and the same number in front of each, and a question about the center, radius or a value like $k$.",
  idea: [
    "A circle is every point the same distance from one point. That point is the **center** $(h, k)$, and the distance is the **radius** $r$.",
    "In **standard form**, $(x - h)^2 + (y - k)^2 = r^2$, the center's signs are flipped: $(x + 3)^2$ means $h = -3$. The right side is $r^2$, so the radius is its square root.",
    "When the equation comes expanded, like $x^2 + y^2 + 6x - 4y = 12$, **complete the square** for $x$ and for $y$ to get back to standard form.",
  ],
  rules: [
    "$(x - h)^2 + (y - k)^2 = r^2$",
    "center $(h, k)$, radius $r$",
    "$x^2 + bx$: add $\\left(\\frac{b}{2}\\right)^2$ to both sides",
  ],
  figure: {
    kind: "plane",
    x: [-3, 7],
    y: [-6, 4],
    draw: [
      { circle: [2, -1, 3], tone: "warm" },
      { segment: [2, -1, 5, -1], label: "r = 3", tone: "gold" },
      { point: [2, -1], label: "(2, -1)", tone: "blue" },
    ],
  },
  strategy: {
    name: "Standard form first",
    steps: [
      "Expanded? Group the $x$ terms and the $y$ terms, and move the number right.",
      "Complete each square: add half the coefficient, squared, to both sides.",
      "Read the center with the signs flipped.",
      "Take the square root of the right side for the radius.",
    ],
  },
  examples: [
    {
      title: "Find the radius",
      problem: "A circle has the equation $x^2 + y^2 + 6x - 4y - 12 = 0$. What is its radius?",
      figure: {
        kind: "plane",
        x: [-9, 3],
        y: [-4, 8],
        draw: [
          { circle: [-3, 2, 5], tone: "warm" },
          { segment: [-3, 2, 2, 2], label: "5", tone: "gold" },
          { point: [-3, 2], label: "(-3, 2)", tone: "blue" },
        ],
      },
      steps: [
        {
          say: "Group the $x$ terms and the $y$ terms, and move the number to the right.",
          show: "$(x^2 + 6x) + (y^2 - 4y) = 12$",
        },
        {
          say: "Half of 6 is 3, and $3^2 = 9$. Half of $-4$ is $-2$, and $(-2)^2 = 4$. Add 9 and 4 to both sides.",
          show: "$(x^2 + 6x + 9) + (y^2 - 4y + 4) = 12 + 9 + 4$",
        },
        { say: "Write each group as a square.", show: "$(x + 3)^2 + (y - 2)^2 = 25$" },
        { say: "The right side is $r^2$, so take its square root.", show: "$r = \\sqrt{25} = 5$" },
      ],
      answer: "$5$",
      checkIn: {
        text: "A circle has the equation $x^2 + y^2 + 4x - 6y - 3 = 0$. What is its radius?",
        choices: ["$16$", "$\\sqrt{3}$", "$4$", "$\\sqrt{10}$"],
        right: 2,
        why: "Complete both squares: $(x + 2)^2 + (y - 3)^2 = 3 + 4 + 9 = 16$. The right side is $r^2$, so $r = \\sqrt{16} = 4$. 16 is the **Radius squared** trap.",
        twin: {
          text: "A circle has the equation $x^2 + y^2 - 2x + 8y - 19 = 0$. What is its radius?",
          choices: ["$6$", "$36$", "$\\sqrt{19}$", "$\\sqrt{35}$"],
          right: 0,
          why: "Complete both squares: $(x - 1)^2 + (y + 4)^2 = 19 + 1 + 16 = 36$. The right side is $r^2$, so $r = \\sqrt{36} = 6$. 36 is the **Radius squared** trap.",
        },
      },
    },
    {
      title: "Find the center",
      problem:
        "A circle has the equation $x^2 + y^2 - 10x + 2y + 17 = 0$. What are the coordinates of its center?",
      figure: {
        kind: "plane",
        x: [-1, 10],
        y: [-6, 4],
        draw: [
          { circle: [5, -1, 3], tone: "warm" },
          { point: [5, -1], label: "(5, -1)", tone: "blue" },
        ],
      },
      steps: [
        {
          say: "Group the terms and move the number to the right.",
          show: "$(x^2 - 10x) + (y^2 + 2y) = -17$",
        },
        {
          say: "Half of $-10$ is $-5$, squared is 25. Half of 2 is 1, squared is 1. Add both to each side.",
          show: "$(x - 5)^2 + (y + 1)^2 = 9$",
        },
        { say: "Flip the signs inside the squares to read the center.", show: "$(5, -1)$" },
      ],
      answer: "$(5, -1)$",
      tryFrom: 1,
      checkIn: {
        text: "A circle has the equation $x^2 + y^2 + 8x - 6y + 21 = 0$. What are the coordinates of its center?",
        choices: ["$(4, -3)$", "$(8, -6)$", "$(-8, 6)$", "$(-4, 3)$"],
        right: 3,
        why: "Complete both squares: $(x + 4)^2 + (y - 3)^2 = -21 + 16 + 9 = 4$. Flip the signs inside the squares to read the center, $(-4, 3)$. $(4, -3)$ is the **Unflipped signs** trap.",
        twin: {
          text: "A circle has the equation $x^2 + y^2 - 6x + 12y + 29 = 0$. What are the coordinates of its center?",
          choices: ["$(-3, 6)$", "$(3, -6)$", "$(6, -12)$", "$(-6, 12)$"],
          right: 1,
          why: "Complete both squares: $(x - 3)^2 + (y + 6)^2 = -29 + 9 + 36 = 16$. Flip the signs inside the squares to read the center, $(3, -6)$. $(-3, 6)$ is the **Unflipped signs** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Radius squared",
      text: "The right side of standard form is $r^2$. In the first example, 25 is not the radius; $\\sqrt{25} = 5$ is.",
    },
    {
      name: "Unflipped signs",
      text: "$(x + 3)^2$ means the center's $x$ is $-3$, because $x + 3 = x - (-3)$. Reading it as 3 puts the center in the wrong place.",
    },
    {
      name: "Adding to one side",
      text: "When you complete the square, add the same numbers to the right side too. Forgetting gives the wrong radius.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Read the top and bottom",
    steps: [
      "Type the equation exactly as given, even expanded.",
      "Click the circle, then its top and bottom dots.",
      "The center is halfway between them, and the radius is half the gap.",
      "Type the standard form you found and check that it lands on top.",
    ],
    type: ["x^2 + y^2 + 6x - 4y - 12 = 0", "(x+3)^2 + (y-2)^2 = 25"],
    note: "The top dot is $(-3, 7)$ and the bottom is $(-3, -3)$, so the center is $(-3, 2)$ and the radius is 5. There are no dots at the far left and right. When the radius is not a whole number, completing the square by hand is safer.",
  },
  check: {
    text: "Which equation is a circle with center $(2, -5)$ and radius 4?",
    choices: [
      "$(x - 2)^2 + (y + 5)^2 = 4$",
      "$(x - 2)^2 + (y + 5)^2 = 16$",
      "$(x + 2)^2 + (y - 5)^2 = 16$",
      "$(x + 2)^2 + (y - 5)^2 = 4$",
    ],
    right: 1,
    why: "Standard form subtracts the center: $(x - 2)^2 + (y - (-5))^2$, which is $(x - 2)^2 + (y + 5)^2$. The right side is $r^2 = 16$. A right side of 4 is the **Radius squared** trap in reverse: it would make the radius 2. The two equations with $(x + 2)$ have Unflipped signs: their center is $(-2, 5)$.",
  },
  quiz: [
    {
      text: "A circle has the equation $x^2 + y^2 + 8x - 6y + 9 = 0$. What are the coordinates of its center?",
      choices: ["$(-8, 6)$", "$(-4, 3)$", "$(4, -3)$", "$(8, -6)$"],
      right: 1,
      why: "Complete the square: $(x^2 + 8x + 16) + (y^2 - 6y + 9) = -9 + 16 + 9$, so $(x + 4)^2 + (y - 3)^2 = 16$. Flip the signs: the center is $(-4, 3)$. The tempting $(4, -3)$ has Unflipped signs. $(-8, 6)$ skips halving the coefficients. $(8, -6)$ makes both mistakes.",
      subject: "math",
    },
    {
      text: "What should you do first to find the radius of the circle $x^2 + y^2 - 12x + 20 = 0$?",
      choices: [
        "Move 20 to the right side and complete the square for the $x$ terms.",
        "Take the square root of 20.",
        "Divide every term by 12.",
        "Replace $x$ with 0 and solve for $y$.",
      ],
      right: 0,
      why: "The equation is expanded, so get to standard form first: $(x^2 - 12x + 36) + y^2 = -20 + 36$, which is $(x - 6)^2 + y^2 = 16$, so the radius is 4. The square root of 20 treats the expanded form like standard form. Dividing by 12 breaks the $x^2$ and $y^2$ terms. Replacing $x$ with 0 finds where the circle meets the $y$-axis, and this one never does.",
      subject: "math",
    },
    {
      text: "A circle has the equation $(x - 1)^2 + (y + 6)^2 = 81$. Priya says its center is $(1, -6)$ and its radius is 81. What is her mistake?",
      choices: [
        "The center should be $(-1, 6)$.",
        "The radius should be $\\frac{81}{2}$.",
        "The center should be $(-1, 6)$ and the radius should be 9.",
        "The right side is $r^2$, so the radius is 9.",
      ],
      right: 3,
      why: "Priya fell for Radius squared: 81 is $r^2$, so $r = \\sqrt{81} = 9$. Her center is right, because $(x - 1)$ gives 1 and $(y + 6)$ gives $-6$, so both choices with $(-1, 6)$ have Unflipped signs. Halving 81 confuses the radius with half of a diameter.",
      subject: "math",
    },
    {
      text: "Which equation is a circle with radius 6?",
      choices: [
        "$x^2 + y^2 = 6$",
        "$(x + 6)^2 + y^2 = 12$",
        "$x^2 + y^2 - 4x = 32$",
        "$(x - 6)^2 + (y - 6)^2 = 6$",
      ],
      right: 2,
      why: "Complete the square: $(x^2 - 4x + 4) + y^2 = 32 + 4$, so $(x - 2)^2 + y^2 = 36$ and $r = 6$. The tempting $(x - 6)^2 + (y - 6)^2 = 6$ has 6 in the center, but its radius is $\\sqrt{6}$, the **Radius squared** trap. $x^2 + y^2 = 6$ also has radius $\\sqrt{6}$, and a right side of 12 gives $\\sqrt{12}$.",
      subject: "math",
    },
    {
      text: "In the $xy$-plane, the graph of $x^2 + y^2 - 6x + 10y = k$ is a circle with radius 7. What is the value of $k$?",
      choices: ["$-27$", "$15$", "$49$", "$83$"],
      right: 1,
      why: "Complete the square: add 9 and 25 to both sides, so $(x - 3)^2 + (y + 5)^2 = k + 34$. The right side must be $r^2 = 49$, so $k = 15$. The tempting 49 is the **Adding to one side** trap: it forgets the 34 on the right. $-27$ sets $k + 34$ equal to 7, the **Radius squared** trap. 83 subtracts the 34 instead of adding it.",
      subject: "math",
    },
  ],
};

export default lesson;
