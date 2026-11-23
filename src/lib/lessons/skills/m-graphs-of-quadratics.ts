import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-graphs-of-quadratics",
  tests:
    "Reading a parabola's vertex, intercepts and maximum or minimum from its equation or graph, and matching the three forms to what they show.",
  spot: "A quadratic function or its graph, and the words vertex, maximum, minimum, x-intercept, y-intercept or axis of symmetry.",
  idea: [
    "The graph of a quadratic is a parabola. It opens up when $a > 0$ and down when $a < 0$. Its turning point is the **vertex**, the lowest or highest point.",
    "Each form shows one thing at a glance. **Vertex form** shows the vertex. **Factored form** shows the x-intercepts. **Standard form** shows the y-intercept.",
    "The vertex sits halfway between the x-intercepts. From standard form, it is at $x = -\\frac{b}{2a}$.",
  ],
  rules: [
    "$y = a(x - h)^2 + k$: vertex $(h, k)$",
    "$y = a(x - p)(x - q)$: x-intercepts $p$ and $q$",
    "$y = ax^2 + bx + c$: y-intercept $c$",
    "vertex at $x = -\\frac{b}{2a}$",
  ],
  figure: {
    kind: "plane",
    x: [-2, 8],
    y: [-6, 8],
    draw: [
      { vertical: 3, label: "x = 3", tone: "ink", dashed: true },
      { parabola: [1, 3, -4], label: "y = (x - 1)(x - 5)", tone: "warm" },
      { point: [1, 0], label: "(1, 0)", tone: "blue" },
      { point: [5, 0], label: "(5, 0)", tone: "blue" },
      { point: [0, 5], label: "(0, 5)", tone: "gold" },
      { point: [3, -4], label: "vertex (3, -4)", tone: "green" },
    ],
  },
  strategy: {
    name: "Pick the right form",
    steps: [
      "Ask what the question wants: the vertex, the x-intercepts or the y-intercept.",
      "Look for the form that shows it, or find it from the form you have.",
      "Vertex from standard form: $x = -\\frac{b}{2a}$, then plug in to get $y$.",
      "Vertex from x-intercepts: halfway between them, then plug in.",
      "Answer what is asked: a maximum or minimum is the y-value.",
    ],
  },
  examples: [
    {
      title: "Maximum value",
      problem:
        "The function $f$ is defined by $f(x) = -3x^2 + 18x - 20$. What is the maximum value of $f$?",
      steps: [
        { say: "Here $a = -3$, so the parabola opens down. Its vertex is the highest point." },
        {
          say: "The form is standard, so find the vertex's x-value.",
          show: "$x = -\\frac{18}{2(-3)} = 3$",
        },
        {
          say: "Plug in 3 to get the y-value.",
          show: "$f(3) = -3(9) + 18(3) - 20 = -27 + 54 - 20 = 7$",
        },
        { say: "The maximum value is the y-value, 7. The 3 only says where it happens." },
      ],
      answer: "$7$",
      checkIn: {
        text: "The function $f$ is defined by $f(x) = -2x^2 + 12x - 5$. What is the maximum value of $f$?",
        choices: ["$13$", "$3$", "$-5$", "$6$"],
        right: 0,
        why: "The parabola opens down, so the vertex is the top. Its x-value is $-\\frac{12}{2(-2)} = 3$, and $f(3) = -18 + 36 - 5 = 13$. 3 is the **Where, not what** trap: it only says where the maximum happens.",
        twin: {
          text: "The function $f$ is defined by $f(x) = -x^2 + 10x - 9$. What is the maximum value of $f$?",
          choices: ["$5$", "$-9$", "$16$", "$10$"],
          right: 2,
          why: "The parabola opens down, so the vertex is the top. Its x-value is $-\\frac{10}{2(-1)} = 5$, and $f(5) = -25 + 50 - 9 = 16$. 5 is the **Where, not what** trap: it only says where the maximum happens.",
        },
      },
    },
    {
      title: "From intercepts",
      problem:
        "The graph of $y = 2(x + 1)(x - 7)$ is a parabola. What is the y-coordinate of its vertex?",
      steps: [
        {
          say: "Factored form shows the x-intercepts. The sign inside flips.",
          show: "$x = -1 \\text{ and } x = 7$",
        },
        { say: "The vertex is halfway between them.", show: "$x = \\frac{-1 + 7}{2} = 3$" },
        { say: "Plug in 3 to get the y-value.", show: "$y = 2(3 + 1)(3 - 7) = 2(4)(-4) = -32$" },
      ],
      answer: "$-32$",
      tryFrom: 1,
      checkIn: {
        text: "The graph of $y = 3(x + 2)(x - 4)$ is a parabola. What is the y-coordinate of its vertex?",
        choices: ["$1$", "$-27$", "$-9$", "$-15$"],
        right: 1,
        why: "The graph crosses at $x = -2$ and $x = 4$, so the vertex is halfway, at $x = 1$. Then $y = 3(1 + 2)(1 - 4) = 3(3)(-3) = -27$. 1 is only the vertex's x-value, the **Where, not what** trap.",
        twin: {
          text: "The graph of $y = 2(x + 5)(x - 1)$ is a parabola. What is the y-coordinate of its vertex?",
          choices: ["$-2$", "$-9$", "$14$", "$-18$"],
          right: 3,
          why: "The graph crosses at $x = -5$ and $x = 1$, so the vertex is halfway, at $x = -2$. Then $y = 2(-2 + 5)(-2 - 1) = 2(3)(-3) = -18$. $-2$ is only the vertex's x-value, the **Where, not what** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Where, not what",
      text: "A maximum or minimum value is the vertex's y-value. The x-value only says where it happens, and it is almost always a choice.",
    },
    {
      name: "Sign inside flips",
      text: "$y = (x + 3)^2 + 2$ has its vertex at $(-3, 2)$, and $y = (x + 1)(x - 7)$ crosses at $-1$ and 7. The sign outside the parentheses does not flip.",
    },
    {
      name: "Mixing up intercepts",
      text: "In standard form, $c$ is where the graph crosses the y-axis. It is not an x-intercept and not the vertex.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Click the vertex dot",
    steps: [
      "Type the function as given.",
      "Click the curve. Gray dots appear at the vertex and the intercepts.",
      "Click the top or bottom dot to read the vertex. Zoom out if it sits off the screen.",
    ],
    type: ["f(x) = -3x^2 + 18x - 20"],
    note: "The top dot reads (3, 7), so the maximum is 7. In vertex form you can read $(h, k)$ by hand faster than you can type.",
  },
  check: {
    text: "What are the coordinates of the vertex of the graph of $y = x^2 - 8x + 12$?",
    choices: ["$(-4, 60)$", "$(0, 12)$", "$(4, -4)$", "$(6, 0)$"],
    right: 2,
    why: "The vertex is at $x = -\\frac{-8}{2(1)} = 4$, and $y = 16 - 32 + 12 = -4$, so it is $(4, -4)$. $(-4, 60)$ drops the minus in $-\\frac{b}{2a}$. $(0, 12)$ is the y-intercept, and $(6, 0)$ is one of the x-intercepts, since $x^2 - 8x + 12 = (x - 2)(x - 6)$.",
  },
  quiz: [
    {
      text: "The graph of $y = -(x - 2)(x - 8)$ is a parabola. What is the maximum value of $y$?",
      choices: ["$-16$", "$-9$", "$5$", "$9$"],
      right: 3,
      why: "The x-intercepts are 2 and 8, so the vertex is halfway, at $x = 5$. Then $y = -(5 - 2)(5 - 8) = -(3)(-3) = 9$. The tempting 5 is the **Where, not what** trap: it is where the maximum happens. $-9$ forgets the minus sign out front. $-16$ is the y-intercept, $-(0 - 2)(0 - 8)$.",
      subject: "math",
    },
    {
      text: "The function $f$ is defined by $f(x) = 2x^2 - 12x + 11$. What should you do first to find the minimum value of $f$?",
      choices: [
        "Read the minimum from the constant term, 11.",
        "Find the vertex's x-value: $x = -\\frac{-12}{2(2)} = 3$.",
        "Find the vertex's x-value: $x = \\frac{-12}{2(2)} = -3$.",
        "Set $f(x) = 0$ and factor.",
      ],
      right: 1,
      why: "The form is standard, so start with $x = -\\frac{b}{2a} = 3$; then $f(3) = 18 - 36 + 11 = -7$ is the minimum. The constant 11 is a case of Mixing up intercepts: it is the y-intercept. Using $\\frac{b}{2a}$ without the minus lands on the wrong side, at $-3$. Setting $f(x) = 0$ finds x-intercepts, and this one does not even factor.",
      subject: "math",
    },
    {
      text: "Jon says the vertex of the graph of $y = 3(x + 5)^2 - 2$ is $(5, -2)$. What is his mistake?",
      choices: [
        "The sign inside the parentheses flips, so the vertex is $(-5, -2)$.",
        "The 3 must be added to the y-value, so the vertex is $(5, 1)$.",
        "The sign of $k$ flips too, so the vertex is $(-5, 2)$.",
        "Vertex form must be expanded first, so the vertex is $(0, 73)$.",
      ],
      right: 0,
      why: "In $a(x - h)^2 + k$, the vertex is $(h, k)$. Since $x + 5 = x - (-5)$, $h = -5$, and the vertex is $(-5, -2)$. Jon fell for Sign inside flips. Only the sign inside flips; $k = -2$ stays as it is, so $(-5, 2)$ is wrong. The 3 stretches the graph and does not move the vertex. $(0, 73)$ is the y-intercept.",
      subject: "math",
    },
    {
      text: "All four equations define the same function. Which one shows the vertex of its graph as numbers in the equation?",
      choices: [
        "$y = x^2 - 2x - 3$",
        "$y = (x - 3)(x + 1)$",
        "$y = (x - 1)^2 - 4$",
        "$y = x(x - 2) - 3$",
      ],
      right: 2,
      why: "Vertex form, $a(x - h)^2 + k$, shows the vertex: here $(1, -4)$. The tempting factored form shows the x-intercepts, 3 and $-1$, not the vertex. Standard form shows the y-intercept, $-3$, and taking it for the vertex is the **Mixing up intercepts** trap. $x(x - 2) - 3$ is none of the three forms, so it shows nothing at a glance.",
      subject: "math",
    },
    {
      text: "A parabola has x-intercepts $(-3, 0)$ and $(5, 0)$ and crosses the y-axis at $(0, -30)$. What is the y-coordinate of its vertex?",
      choices: ["$-32$", "$-30$", "$-16$", "$1$"],
      right: 0,
      why: "Write it in factored form: $y = a(x + 3)(x - 5)$. At $x = 0$, $-15a = -30$, so $a = 2$. The vertex is halfway between the intercepts, at $x = 1$, so $y = 2(4)(-4) = -32$. $-16$ forgets to find $a$. The tempting 1 is the **Where, not what** trap: it is the vertex's x-value. $-30$ is the y-intercept, which is the **Mixing up intercepts** trap.",
      subject: "math",
    },
  ],
};

export default lesson;
