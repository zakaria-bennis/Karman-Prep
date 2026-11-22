import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-solving-quadratics",
  tests:
    "Solving equations with an $x^2$ term by factoring or the quadratic formula, and telling how many real solutions one has.",
  spot: "An equation with an $x^2$ term, the words solution, root or zero, or a question that asks how many real solutions there are.",
  idea: [
    "First move every term to one side so the equation **equals zero**: $ax^2 + bx + c = 0$.",
    "If the left side **factors**, set each factor equal to 0. A product is 0 only when one of its factors is 0.",
    "If it does not factor, use the **quadratic formula**. It works on every quadratic.",
    "The **discriminant**, $b^2 - 4ac$, tells how many real solutions there are without solving. On a graph, that is how many times the curve meets the x-axis.",
  ],
  rules: [
    "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
    "$b^2 - 4ac > 0$: two solutions",
    "$b^2 - 4ac = 0$: one solution",
    "$b^2 - 4ac < 0$: no real solutions",
  ],
  figure: {
    kind: "plane",
    x: [-3, 5],
    y: [-5, 7],
    draw: [
      { parabola: [1, 1, -4], label: "two", tone: "green" },
      { parabola: [1, 1, 0], label: "one", tone: "gold" },
      { parabola: [1, 1, 3], label: "none", tone: "red" },
      { point: [-1, 0], tone: "green" },
      { point: [3, 0], tone: "green" },
      { point: [1, 0], tone: "gold" },
    ],
  },
  strategy: {
    name: "Zero, then factor",
    steps: [
      "Move every term to one side so it equals 0.",
      "Try to factor: two numbers that multiply to $c$ and add to $b$.",
      "Set each factor equal to 0 and solve.",
      "No nice factors? Use the quadratic formula.",
      "Asked only how many solutions? Find $b^2 - 4ac$ instead.",
    ],
  },
  examples: [
    {
      title: "Factoring",
      problem: "What is the positive solution of $x^2 + 3x = 28$?",
      steps: [
        { say: "Move 28 to the left so the equation equals 0.", show: "$x^2 + 3x - 28 = 0$" },
        {
          say: "Find two numbers that multiply to $-28$ and add to 3: they are 7 and $-4$.",
          show: "$(x + 7)(x - 4) = 0$",
        },
        {
          say: "A product is 0 only when a factor is 0, so set each one equal to 0.",
          show: "$x = -7 \\text{ or } x = 4$",
        },
        { say: "The question asks for the positive one." },
      ],
      answer: "$x = 4$",
      checkIn: {
        text: "What is the positive solution of $x^2 + 2x = 35$?",
        choices: ["$x = 7$", "$x = -7$", "$x = 5$", "$x = 35$"],
        right: 2,
        why: "Move 35 over: $x^2 + 2x - 35 = 0$. 7 and $-5$ multiply to $-35$ and add to 2, so $(x + 7)(x - 5) = 0$ and $x = -7$ or $x = 5$. The positive one is 5. $x = 7$ is the **Sign slips** trap: the factor $(x + 7)$ gives $-7$.",
        twin: {
          text: "What is the positive solution of $x^2 - x = 30$?",
          choices: ["$x = 6$", "$x = 5$", "$x = -5$", "$x = 30$"],
          right: 0,
          why: "Move 30 over: $x^2 - x - 30 = 0$. $-6$ and 5 multiply to $-30$ and add to $-1$, so $(x - 6)(x + 5) = 0$ and $x = 6$ or $x = -5$. The positive one is 6. $x = 5$ is the **Sign slips** trap: the factor $(x + 5)$ gives $-5$.",
        },
      },
    },
    {
      title: "How many",
      problem: "How many real solutions does $2x^2 - 3x + 5 = 0$ have?",
      choices: [
        "No real solutions",
        "Exactly one real solution",
        "Exactly two real solutions",
        "Infinitely many solutions",
      ],
      right: 0,
      steps: [
        {
          say: "The question asks only how many, so skip solving. Name $a$, $b$ and $c$.",
          show: "$a = 2,\\ b = -3,\\ c = 5$",
        },
        {
          say: "Find the discriminant. A negative $b$ squared is positive.",
          show: "$(-3)^2 - 4(2)(5) = 9 - 40 = -31$",
        },
        {
          say: "It is negative, and no real number squares to a negative. The curve never meets the x-axis.",
        },
      ],
      answer: "No real solutions",
      checkIn: {
        text: "How many real solutions does $3x^2 + 2x + 4 = 0$ have?",
        choices: [
          "No real solutions",
          "Exactly one real solution",
          "Exactly two real solutions",
          "Infinitely many solutions",
        ],
        right: 0,
        why: "Here $a = 3$, $b = 2$ and $c = 4$. The discriminant is $2^2 - 4(3)(4) = 4 - 48 = -44$. It is negative, so the curve never meets the x-axis. Exactly two comes from adding $4ac$ instead of subtracting it.",
        twin: {
          text: "How many real solutions does $9x^2 - 6x + 1 = 0$ have?",
          choices: [
            "No real solutions",
            "Exactly one real solution",
            "Exactly two real solutions",
            "Infinitely many solutions",
          ],
          right: 1,
          why: "Here $a = 9$, $b = -6$ and $c = 1$. The discriminant is $(-6)^2 - 4(9)(1) = 36 - 36 = 0$, so the curve just touches the x-axis once. No real solutions comes from treating $(-6)^2$ as $-36$.",
        },
      },
    },
    {
      title: "The formula",
      problem: "What is the larger solution of $x^2 - 4x - 1 = 0$?",
      steps: [
        {
          say: "No two whole numbers multiply to $-1$ and add to $-4$, so use the formula with $a = 1$, $b = -4$, $c = -1$.",
        },
        { say: "Find the discriminant first.", show: "$(-4)^2 - 4(1)(-1) = 16 + 4 = 20$" },
        {
          say: "Put it in the formula. The top starts with $-b$, which is 4.",
          show: "$x = \\frac{4 \\pm \\sqrt{20}}{2}$",
        },
        {
          say: "Since $\\sqrt{20} = 2\\sqrt{5}$, divide the whole top by 2. The larger one uses the plus sign.",
          show: "$x = 2 \\pm \\sqrt{5}$",
        },
      ],
      answer: "$2 + \\sqrt{5}$",
      tryFrom: 2,
      checkIn: {
        text: "What is the larger solution of $x^2 - 6x + 2 = 0$?",
        choices: ["$6 + \\sqrt{7}$", "$3 - \\sqrt{7}$", "$-3 + \\sqrt{7}$", "$3 + \\sqrt{7}$"],
        right: 3,
        why: "With $a = 1$, $b = -6$ and $c = 2$, the discriminant is $36 - 8 = 28$, and $\\sqrt{28} = 2\\sqrt{7}$. So $x = \\frac{6 \\pm 2\\sqrt{7}}{2} = 3 \\pm \\sqrt{7}$, and the larger is $3 + \\sqrt{7}$. $6 + \\sqrt{7}$ is the **Dividing only part** trap.",
        twin: {
          text: "What is the larger solution of $x^2 + 2x - 2 = 0$?",
          choices: ["$-2 + \\sqrt{3}$", "$-1 - \\sqrt{3}$", "$-1 + \\sqrt{3}$", "$1 + \\sqrt{3}$"],
          right: 2,
          why: "With $a = 1$, $b = 2$ and $c = -2$, the discriminant is $4 + 8 = 12$, and $\\sqrt{12} = 2\\sqrt{3}$. So $x = \\frac{-2 \\pm 2\\sqrt{3}}{2} = -1 \\pm \\sqrt{3}$, and the larger is $-1 + \\sqrt{3}$. $-2 + \\sqrt{3}$ is the **Dividing only part** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Not set to zero",
      text: "Factors only help when the other side is 0. From $x(x + 3) = 28$ you cannot say $x = 28$. Move the 28 over first.",
    },
    {
      name: "Sign slips",
      text: "The factor $(x + 7)$ gives $x = -7$, not 7. In the formula, the top starts with $-b$: when $b = -4$, $-b = 4$.",
    },
    {
      name: "Dividing only part",
      text: "In the formula, $2a$ divides the whole top. $\\frac{4 \\pm 2\\sqrt{5}}{2}$ is $2 \\pm \\sqrt{5}$, not $4 \\pm \\sqrt{5}$.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Click the x-axis dots",
    steps: [
      "Move every term to one side, then graph that side as $y = \\ldots$",
      "Click the curve. The gray dots on the x-axis are the solutions. No dots means no real solutions.",
      "Type each radical choice and match all the digits, not just the first two.",
    ],
    type: ["y = x^2 - 4x - 1", "2 + sqrt(5)"],
    note: "The right dot reads (4.23607, 0), and $2 + \\sqrt{5}$ also shows 4.23607. When it factors with small numbers, like $x^2 - 5x + 6 = 0$, by hand is faster.",
  },
  check: {
    text: "What is the positive solution of $2x^2 - 5x - 3 = 0$?",
    choices: ["$\\frac{1}{2}$", "$\\frac{3}{2}$", "$3$", "$6$"],
    right: 2,
    why: "It factors: $(2x + 1)(x - 3) = 0$, so $x = -\\frac{1}{2}$ or $x = 3$. The positive one is 3. $\\frac{1}{2}$ is a sign slip on the other solution, $\\frac{3}{2}$ divides the right answer by $a$, and 6 comes from factoring $x^2 - 5x - 6$ and never dividing by $a$.",
  },
  quiz: [
    {
      text: "What is the smaller solution of $x^2 + 2x - 4 = 0$?",
      choices: ["$-2 - \\sqrt{5}$", "$-1 - \\sqrt{5}$", "$1 - \\sqrt{5}$", "$-1 + \\sqrt{5}$"],
      right: 1,
      why: "It does not factor, so use the formula. The discriminant is $4 + 16 = 20$, so $x = \\frac{-2 \\pm 2\\sqrt{5}}{2} = -1 \\pm \\sqrt{5}$, and the smaller one is $-1 - \\sqrt{5}$. The tempting $-2 - \\sqrt{5}$ is the **Dividing only part** trap: the 2 must divide the $-2$ too. $1 - \\sqrt{5}$ is a Sign slip that starts the top with $b$ instead of $-b$. $-1 + \\sqrt{5}$ is the larger solution.",
      subject: "math",
    },
    {
      text: "What should you do first to solve $x(x - 5) = 14$?",
      choices: [
        "Set $x = 14$ and $x - 5 = 14$.",
        "Divide both sides by $x$.",
        "Expand and subtract 14 to get $x^2 - 5x - 14 = 0$.",
        "Take the square root of both sides.",
      ],
      right: 2,
      why: "Factors only help when the other side is 0, so expand and move 14 over: $x^2 - 5x - 14 = 0$, which factors as $(x - 7)(x + 2) = 0$, giving 7 and $-2$. Setting each factor equal to 14 is the **Not set to zero** trap: $x = 14$ gives $14 \\cdot 9 = 126$. Dividing by $x$ throws away a solution and leaves a fraction. The left side is not a perfect square, so a square root does not help.",
      subject: "math",
    },
    {
      text: "Ana solved $x^2 + 12 = 7x$. Step 1: $x^2 - 7x + 12 = 0$. Step 2: $(x - 3)(x - 4) = 0$. Step 3: $x - 3 = 0$ or $x - 4 = 0$. Step 4: $x = -3$ or $x = -4$. Where is the first mistake?",
      choices: ["Step 1", "Step 2", "Step 3", "Step 4"],
      right: 3,
      why: "Steps 1 to 3 are right: $-3$ and $-4$ multiply to 12 and add to $-7$, and each factor is set to 0. Step 4 is a Sign slip: $x - 3 = 0$ means $x = 3$, and $x - 4 = 0$ means $x = 4$. Check: $3^2 + 12 = 21 = 7(3)$. Step 1 correctly subtracts $7x$, and Step 2 is the right factoring, even though it may look as if the signs should match the answers.",
      subject: "math",
    },
    {
      text: "Which equation has exactly one real solution?",
      choices: ["$x^2 + 6x + 9 = 0$", "$x^2 + 6x - 9 = 0$", "$x^2 + 9 = 0$", "$x^2 - 9 = 0$"],
      right: 0,
      why: "Only the count is asked, so find $b^2 - 4ac$ for each and look for 0. For $x^2 + 6x + 9$: $36 - 36 = 0$, so one solution, $x = -3$. The look-alike $x^2 + 6x - 9$ gives $36 + 36 = 72$, two solutions: a negative $c$ makes $-4ac$ positive. $x^2 + 9$ gives $-36$, no real solutions. $x^2 - 9$ gives 36, two solutions, 3 and $-3$.",
      subject: "math",
    },
    {
      text: "In the equation $x^2 - kx + 16 = 0$, $k$ is a positive constant. The equation has exactly one real solution. What is the value of $k$?",
      choices: ["$4$", "$8$", "$32$", "$64$"],
      right: 1,
      why: "Exactly one solution means the discriminant is 0: $(-k)^2 - 4(1)(16) = 0$, so $k^2 = 64$ and $k = 8$. Check: $x^2 - 8x + 16 = (x - 4)^2$. The tempting 64 stops at $k^2$ and forgets the square root. 4 drops the 4 in $4ac$ and solves $k^2 = 16$. 32 doubles 16 instead of doubling its square root, 4.",
      subject: "math",
    },
  ],
};

export default lesson;
