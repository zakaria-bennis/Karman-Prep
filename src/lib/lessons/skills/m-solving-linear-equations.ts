import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-solving-linear-equations",
  tests:
    "Solving an equation with one variable, often with fractions or parentheses, and sometimes finding the value of an expression like $x - 4$ instead of $x$.",
  spot: "One letter, an equals sign, and the words solve, what value of $x$, or what is the value of.",
  idea: [
    "An equation is a **balance**. Whatever you do to one side, do to the other, and it stays true.",
    "Make it simple before you solve. **Clear the fractions** by multiplying every term by the common denominator. Then **clear the parentheses** by distributing.",
    "Now **collect**: $x$ terms on one side, plain numbers on the other. Divide by the number in front of $x$.",
  ],
  rules: [
    "Multiply every term by the denominator",
    "$-2(x + 1) = -2x - 2$",
    "Answer what is asked",
  ],
  figure: {
    kind: "balance",
    left: "$3(x - 2) + 4$",
    right: "$x + 10$",
    steps: [
      { move: "Distribute and combine", left: "$3x - 2$", right: "$x + 10$" },
      { move: "Subtract $x$", left: "$2x - 2$", right: "$10$" },
      { move: "Add 2", left: "$2x$", right: "$12$" },
      { move: "Divide by 2", left: "$x$", right: "$6$" },
    ],
  },
  strategy: {
    name: "Clear, then collect",
    steps: [
      "Clear fractions: multiply every term on both sides by the common denominator.",
      "Clear parentheses: distribute, and carry each minus sign.",
      "Collect $x$ terms on one side and numbers on the other.",
      "Divide, then answer what the question asks.",
    ],
  },
  examples: [
    {
      title: "Parentheses",
      problem: "Solve $5(x - 3) - 2(x + 1) = 4$.",
      steps: [
        {
          say: "Distribute both. The $-2$ multiplies the $+1$ too, so it gives $-2$.",
          show: "$5x - 15 - 2x - 2 = 4$",
        },
        { say: "Combine like terms on the left.", show: "$3x - 17 = 4$" },
        { say: "Add 17 to both sides to get the $x$ term alone.", show: "$3x = 21$" },
        { say: "Divide both sides by 3.", show: "$x = 7$" },
      ],
      answer: "$x = 7$",
      checkIn: {
        text: "Solve $6(x - 1) - 2(x + 3) = 8$.",
        choices: ["$x = 5$", "$x = 2$", "$x = 3$", "$x = -1$"],
        right: 0,
        why: "Distribute both: $6x - 6 - 2x - 6 = 8$. Combine to get $4x - 12 = 8$, so $4x = 20$ and $x = 5$. $x = 2$ is the **Dropped negative** trap: $-2(x + 3)$ is $-2x - 6$, not $-2x + 6$.",
        twin: {
          text: "Solve $3(x + 4) - 5(x - 2) = 6$.",
          choices: ["$x = -2$", "$x = -8$", "$x = 8$", "$x = 14$"],
          right: 2,
          why: "Distribute both: $3x + 12 - 5x + 10 = 6$. Combine to get $-2x + 22 = 6$, so $-2x = -16$ and $x = 8$. $x = -2$ is the **Dropped negative** trap: $-5(x - 2)$ is $-5x + 10$, not $-5x - 10$.",
        },
      },
    },
    {
      title: "Fractions",
      problem: "Solve $\\frac{x}{3} + \\frac{x + 1}{2} = 8$.",
      steps: [
        {
          say: "The common denominator is 6. Multiply every term by 6, including the 8.",
          show: "$2x + 3(x + 1) = 48$",
        },
        { say: "Distribute the 3.", show: "$2x + 3x + 3 = 48$" },
        { say: "Combine and subtract 3 from both sides.", show: "$5x = 45$" },
        { say: "Divide by 5. Check: $3 + 5 = 8$.", show: "$x = 9$" },
      ],
      answer: "$x = 9$",
      tryFrom: 2,
      checkIn: {
        text: "Solve $\\frac{x}{2} + \\frac{x + 3}{4} = 6$.",
        choices: ["$x = 1$", "$x = 7$", "$x = 9$", "$x = 21$"],
        right: 1,
        why: "Multiply every term by 4, including the 6: $2x + (x + 3) = 24$. Then $3x + 3 = 24$, so $3x = 21$ and $x = 7$. Check: $3.5 + 2.5 = 6$. $x = 1$ is the **Skipped term** trap: it leaves the 6 alone.",
        twin: {
          text: "Solve $\\frac{x}{3} + \\frac{x + 3}{6} = 5$.",
          choices: ["$x = \\frac{2}{3}$", "$x = 11$", "$x = 27$", "$x = 9$"],
          right: 3,
          why: "Multiply every term by 6, including the 5: $2x + (x + 3) = 30$. Then $3x + 3 = 30$, so $3x = 27$ and $x = 9$. Check: $3 + 2 = 5$. $x = \\frac{2}{3}$ is the **Skipped term** trap: it leaves the 5 alone.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Dropped negative",
      text: "A minus sign in front of parentheses multiplies every term inside. $-2(x - 3)$ is $-2x + 6$, not $-2x - 6$.",
    },
    {
      name: "Skipped term",
      text: "When you clear fractions, multiply every term, even the whole numbers. In $\\frac{x}{3} + \\frac{x + 1}{2} = 8$, the 8 becomes 48.",
    },
    {
      name: "Stopped at x",
      text: "Some questions ask for $x - 4$ or $2x + 1$. Finding $x$ is not the end. Reread the question before you pick.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Graph both sides",
    steps: [
      "Type the left side as a $y =$ line, and wrap the whole top of each fraction in parentheses.",
      "Type the right side as a second $y =$ line. After each bottom, press the right arrow so the rest stays out of the fraction.",
      "Click the crossing. Its $x$-value solves the equation, not its $y$-value.",
      "If the answer is a long decimal, type each choice to find the match.",
    ],
    type: ["y=(2x+1)/3", "y=(x-4)/5+2", "13/7"],
    note: "The lines cross at $x \\approx 1.857$, and $\\frac{13}{7}$ shows the same decimal. For a two-step equation like $3x + 5 = 20$, working by hand is faster.",
  },
  check: {
    text: "Solve $4(x + 2) - 3 = 2x + 11$.",
    choices: ["$x = 1$", "$x = 3$", "$x = 6$", "$x = 8$"],
    right: 1,
    why: "Distribute: $4x + 8 - 3 = 2x + 11$, so $4x + 5 = 2x + 11$. Subtract $2x$ and 5: $2x = 6$, so $x = 3$. 6 comes from multiplying only the $x$ by 4. 8 adds the 5 instead of subtracting it. 1 adds $2x$ to the left instead of subtracting it.",
  },
  quiz: [
    {
      text: "Solve $\\frac{x}{2} + \\frac{x + 4}{3} = 8$.",
      choices: ["$x = 0$", "$x = 8$", "$x = 8.8$", "$x = 11.2$"],
      right: 1,
      why: "Clear the fractions: multiply every term by 6 to get $3x + 2(x + 4) = 48$. Distribute: $5x + 8 = 48$, so $5x = 40$ and $x = 8$. The tempting 0 is the **Skipped term** trap: leaving the 8 on the right as 8 instead of 48. 8.8 multiplies only the $x$ by 2, not the 4. 11.2 adds 8 to 48 instead of subtracting.",
      subject: "math",
    },
    {
      text: "Which first step clears every fraction in $\\frac{2x - 1}{5} = \\frac{x + 4}{3}$ and keeps the equation balanced?",
      choices: [
        "Multiply both sides by 5.",
        "Multiply both sides by 8.",
        "Multiply both sides by 15.",
        "Multiply the left side by 5 and the right side by 3.",
      ],
      right: 2,
      why: "The common denominator of 5 and 3 is 15, so multiplying both sides by 15 clears both fractions at once: $3(2x - 1) = 5(x + 4)$. Multiplying the left by 5 and the right by 3 breaks the balance, since the two sides get different treatment. Multiplying by 5 clears only the left fraction. 8 adds the denominators, but 8 is not a multiple of 5 or 3.",
      subject: "math",
    },
    {
      text: "Maya solved $7 - 2(x - 3) = 5$. Line 1: $7 - 2x - 6 = 5$. Line 2: $1 - 2x = 5$. Line 3: $-2x = 4$. Line 4: $x = -2$. Where is her first mistake?",
      choices: ["Line 1", "Line 2", "Line 3", "Line 4"],
      right: 0,
      why: "This is the **Dropped negative** trap. The $-2$ multiplies both terms inside, and $-2$ times $-3$ is $+6$, so Line 1 should read $7 - 2x + 6 = 5$. Then $13 - 2x = 5$, $-2x = -8$ and $x = 4$. Lines 2, 3 and 4 each follow correctly from the line before, so the error starts in Line 1.",
      subject: "math",
    },
    {
      text: "For which equation does graphing both sides on the calculator save the most time?",
      choices: [
        "$x + 9 = 14$",
        "$3x = 27$",
        "$2x - 6 = 10$",
        "$\\frac{3x - 2}{7} = \\frac{x + 5}{4} - 1$",
      ],
      right: 3,
      why: "The equation with two fractions takes several steps by hand: multiply by 28, distribute, collect. Graphing both sides and clicking the crossing gives $x = 3$ in seconds. $x + 9 = 14$ and $3x = 27$ take one step by hand, and $2x - 6 = 10$ takes two. For those, typing them in takes longer than solving them.",
      subject: "math",
    },
    {
      text: "If $\\frac{3(x - 4)}{2} = x + 1$, what is the value of $x - 4$?",
      choices: ["$2$", "$9$", "$10$", "$14$"],
      right: 2,
      why: "Multiply both sides by 2: $3(x - 4) = 2x + 2$. Distribute: $3x - 12 = 2x + 2$, so $x = 14$ and $x - 4 = 10$. The tempting 14 is the **Stopped at x** trap: it is $x$, not $x - 4$. 9 is the **Skipped term** trap: it doubles the $x$ but not the 1. 2 forgets to distribute the 3 to the 4.",
      subject: "math",
    },
  ],
};

export default lesson;
