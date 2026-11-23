import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-expanding-and-factoring",
  tests:
    "Rewriting a polynomial in an equivalent form: multiplying out a product, or factoring an expression back into a product.",
  spot: "The words which expression is equivalent to, with choices in a different form. Or an equation true for all values of $x$ with a missing constant.",
  idea: [
    "**Expanding** multiplies every term in one factor by every term in the other. An area model keeps track: each box is its row times its column.",
    "**Factoring** runs the other way. For $x^2 + bx + c$, find two numbers that **multiply to $c$ and add to $b$**.",
    "Always pull out a **common factor** first. Then watch for the special forms in the chips below.",
  ],
  rules: [
    "$(a + b)(c + d) = ac + ad + bc + bd$",
    "$a^2 - b^2 = (a - b)(a + b)$",
    "$(a + b)^2 = a^2 + 2ab + b^2$",
  ],
  figure: {
    kind: "grid",
    rows: ["$2x$", "$-3$"],
    cols: ["$x$", "$5$"],
    cells: [
      ["$2x^2$", "$10x$"],
      ["$-3x$", "$-15$"],
    ],
  },
  strategy: {
    name: "Fill the boxes",
    steps: [
      "Pull out any common factor first.",
      "Put one factor down the side and the other across the top.",
      "Fill each box with its row times its column, signs included.",
      "Combine the boxes with the same power of $x$. To factor, find the row and column that rebuild every box.",
    ],
  },
  examples: [
    {
      title: "Expand and combine",
      problem: "Which expression is equivalent to $(3x + 2)(x - 4) - 2x(x - 1)$?",
      figure: {
        kind: "grid",
        rows: ["$3x$", "$2$"],
        cols: ["$x$", "$-4$"],
        cells: [
          ["$3x^2$", "$-12x$"],
          ["$2x$", "$-8$"],
        ],
      },
      steps: [
        {
          say: "Fill the boxes for the first product, then add them.",
          show: "$3x^2 - 12x + 2x - 8 = 3x^2 - 10x - 8$",
        },
        { say: "Multiply out the second product.", show: "$2x(x - 1) = 2x^2 - 2x$" },
        {
          say: "Subtract the whole product: the minus sign reaches both terms.",
          show: "$3x^2 - 10x - 8 - 2x^2 + 2x$",
        },
        { say: "Combine like terms.", show: "$x^2 - 8x - 8$" },
      ],
      answer: "$x^2 - 8x - 8$",
      checkIn: {
        text: "Which expression is equivalent to $(2x + 3)(x - 5) - x(x - 2)$?",
        choices: ["$x^2 - 9x - 15$", "$x^2 + 2x - 15$", "$x^2 - 5x - 15$", "$3x^2 - 9x - 15$"],
        right: 2,
        why: "The first product is $2x^2 - 7x - 15$. Subtracting $x(x - 2)$ subtracts both terms, which adds $-x^2 + 2x$. That leaves $x^2 - 5x - 15$. $x^2 - 9x - 15$ is the **Dropping the minus** trap.",
        twin: {
          text: "Which expression is equivalent to $(x + 4)(3x - 1) - 2x(x + 3)$?",
          choices: ["$x^2 + 5x - 4$", "$x^2 + 17x - 4$", "$x^2 - 6x - 4$", "$5x^2 + 17x - 4$"],
          right: 0,
          why: "The first product is $3x^2 + 11x - 4$. Subtracting $2x(x + 3)$ subtracts both terms, which adds $-2x^2 - 6x$. That leaves $x^2 + 5x - 4$. $x^2 + 17x - 4$ is the **Dropping the minus** trap.",
        },
      },
    },
    {
      title: "Factor fully",
      problem: "Factor $3x^2 - 6x - 72$ completely.",
      figure: {
        kind: "grid",
        rows: ["$x$", "$4$"],
        cols: ["$x$", "$-6$"],
        cells: [
          ["$x^2$", "$-6x$"],
          ["$4x$", "$-24$"],
        ],
      },
      steps: [
        { say: "Every term is a multiple of 3. Pull it out first.", show: "$3(x^2 - 2x - 24)$" },
        {
          say: "Find two numbers that multiply to $-24$ and add to $-2$.",
          show: "$4 \\cdot (-6) = -24$ and $4 + (-6) = -2$",
        },
        { say: "Write the factors, keeping the 3 in front.", show: "$3(x + 4)(x - 6)$" },
        {
          say: "Check with the boxes: $x^2 - 6x + 4x - 24$ rebuilds the inside.",
          show: "$3(x^2 - 2x - 24) = 3x^2 - 6x - 72$",
        },
      ],
      answer: "$3(x + 4)(x - 6)$",
      tryFrom: 2,
      checkIn: {
        text: "Factor $2x^2 + 4x - 30$ completely.",
        choices: [
          "$(x + 5)(x - 3)$",
          "$2(x - 5)(x + 3)$",
          "$2(x + 5)(x + 3)$",
          "$2(x + 5)(x - 3)$",
        ],
        right: 3,
        why: "Pull out the 2 first: $2(x^2 + 2x - 15)$. Then 5 and $-3$ multiply to $-15$ and add to 2, so it is $2(x + 5)(x - 3)$. $(x + 5)(x - 3)$ is the **Skipping the common factor** trap: without the 2, it is a different expression.",
        twin: {
          text: "Factor $4x^2 - 4x - 48$ completely.",
          choices: [
            "$(x - 4)(x + 3)$",
            "$4(x - 4)(x + 3)$",
            "$4(x + 4)(x - 3)$",
            "$4(x - 4)(x - 3)$",
          ],
          right: 1,
          why: "Pull out the 4 first: $4(x^2 - x - 12)$. Then $-4$ and 3 multiply to $-12$ and add to $-1$, so it is $4(x - 4)(x + 3)$. $(x - 4)(x + 3)$ is the **Skipping the common factor** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Missing middle boxes",
      text: "$(x + 5)^2$ is not $x^2 + 25$. Squaring a sum makes four boxes, and the two middle ones add up to $10x$: $x^2 + 10x + 25$.",
    },
    {
      name: "Dropping the minus",
      text: "Subtracting a product subtracts every term. $-x(x - 4)$ is $-x^2 + 4x$, not $-x^2 - 4x$. Put the product in parentheses before you distribute.",
    },
    {
      name: "Skipping the common factor",
      text: "Pull out a common factor first, and keep it in the answer. $2x^2 + 6x - 56$ is $2(x + 7)(x - 4)$; without the 2 in front, it is a different expression.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Overlap the graphs",
    steps: [
      "Type $y =$ and the given expression.",
      "Type each choice as its own $y =$ line.",
      "Hide and show the rows: the match sits exactly on top of the original everywhere.",
    ],
    type: ["y=(3x+2)(x-4)-2x(x-1)", "y=x^2-8x-8"],
    note: "Graphs that only cross at one point are not a match. Expanding two binomials by hand is quick once the boxes are a habit, so use the overlap as a backup check.",
  },
  check: {
    text: "Which expression is equivalent to $(x - 7)^2$?",
    choices: ["$x^2 - 49$", "$x^2 - 7x + 49$", "$x^2 - 14x + 49$", "$x^2 - 14x - 49$"],
    right: 2,
    why: "Write it as $(x - 7)(x - 7)$ and fill four boxes: $x^2$, $-7x$, $-7x$ and $+49$. Together they make $x^2 - 14x + 49$. $x^2 - 49$ leaves out the middle boxes. $x^2 - 7x + 49$ counts only one of them. $x^2 - 14x - 49$ misses that $-7$ times $-7$ is positive.",
  },
  quiz: [
    {
      text: "Which expression is equivalent to $2x^2 + 6x - 56$?",
      choices: ["$2(x - 7)(x + 4)$", "$2(x + 7)(x - 4)$", "$(x + 7)(x - 4)$", "$2(x + 14)(x - 2)$"],
      right: 1,
      why: "Pull out the common factor 2: $2(x^2 + 3x - 28)$. Then find two numbers that multiply to $-28$ and add to $3$: 7 and $-4$. That gives $2(x + 7)(x - 4)$. The tempting $(x + 7)(x - 4)$ drops the 2, the skipping the common factor trap. $2(x - 7)(x + 4)$ has the signs swapped, so its middle term is $-3x$. 14 and $-2$ multiply to $-28$ but add to 12.",
      subject: "math",
    },
    {
      text: "What is the best first step to factor $5x^2 - 45$ completely?",
      choices: [
        "Find two numbers that multiply to $-45$ and add to 5.",
        "Divide every term by $x$.",
        "Pull out the common factor 5.",
        "Expand it with an area model.",
      ],
      right: 2,
      why: "Look for a common factor first. Both terms are multiples of 5, so $5x^2 - 45 = 5(x^2 - 9)$, and the difference of squares finishes it: $5(x - 3)(x + 3)$. Treating 5 as $b$ is a mix-up: there is no $x$ term at all, and the rule for $x^2 + bx + c$ needs the 5 out of the way first. $-45$ has no $x$, so you cannot divide it out. The expression is already expanded.",
      subject: "math",
    },
    {
      text: "Jordan says $(x + 6)^2 = x^2 + 36$. Which statement shows why he is wrong?",
      choices: [
        "The right answer is $x^2 + 12$, since 6 is doubled.",
        "The right answer is $x^2 - 36$, a difference of squares.",
        "The middle term is $6x$, so the answer is $x^2 + 6x + 36$.",
        "He left out the two middle boxes, so the answer is $x^2 + 12x + 36$.",
      ],
      right: 3,
      why: "Fill the boxes for $(x + 6)(x + 6)$: $x^2$, $6x$, $6x$ and $36$. Jordan kept only the corner boxes, the missing middle boxes trap; the right result is $x^2 + 12x + 36$. Test $x = 1$: $7^2 = 49$, and $1 + 12 + 36 = 49$. $x^2 + 6x + 36$ counts only one middle box. $x^2 - 36$ is $(x - 6)(x + 6)$, a different product. $x^2 + 12$ doubles 6 instead of squaring it.",
      subject: "math",
    },
    {
      text: "Which expression is a difference of two squares, so that it factors as $(a - b)(a + b)$?",
      choices: ["$4x^2 - 25$", "$9x^2 - 6x$", "$x^2 - 8x + 16$", "$x^2 + 16$"],
      right: 0,
      why: "A difference of squares is one perfect square minus another. $4x^2 = (2x)^2$ and $25 = 5^2$, so $4x^2 - 25 = (2x - 5)(2x + 5)$. The tempting $x^2 + 16$ is a sum, and a sum of squares does not factor this way. $x^2 - 8x + 16$ is a perfect square, $(x - 4)^2$. $9x^2 - 6x$ has a common factor instead: $3x(3x - 2)$.",
      subject: "math",
    },
    {
      text: "If $(ax + 3)(2x - b) = 6x^2 - 6x - 12$ for all values of $x$, where $a$ and $b$ are constants, what is the value of $a + b$?",
      choices: ["$-1$", "$7$", "$10$", "$15$"],
      right: 1,
      why: "Fill the boxes and match each one. The first box is $2ax^2 = 6x^2$, so $a = 3$. The last box is $3 \\cdot (-b) = -12$, so $b = 4$. Check the middle: $3x(-4) + 3(2x) = -12x + 6x = -6x$. So $a + b = 7$. The tempting 10 uses $a = 6$, forgetting the 2 in $2x$. 15 uses $b = 12$, forgetting the 3. $-1$ takes $b = -4$, dropping the minus in $-b$.",
      subject: "math",
    },
  ],
};

export default lesson;
