import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-exponents-and-radicals",
  tests:
    "Rewriting expressions with the exponent rules, and switching between roots and fractional exponents.",
  spot: "Powers, roots or fractional exponents in the question or the choices, usually with the words which expression is equivalent and a range like $x > 0$.",
  idea: [
    "An exponent counts repeated factors. To **multiply** powers of the same base, **add** the exponents. To divide, subtract them.",
    "A **power of a power** multiplies the exponents: $(x^3)^2 = x^6$. A **negative exponent** means one over: $x^{-2} = \\frac{1}{x^2}$.",
    "A **fractional exponent** is a root. The bottom of the fraction is the root and the top is the power: $x^{\\frac{3}{2}} = \\sqrt{x^3}$.",
  ],
  rules: [
    "$x^a \\cdot x^b = x^{a + b}$",
    "$\\frac{x^a}{x^b} = x^{a - b}$",
    "$(x^a)^b = x^{ab}$",
    "$x^{\\frac{m}{n}} = \\sqrt[n]{x^m}$",
  ],
  figure: {
    kind: "tape",
    bars: [
      {
        label: "x³ · x²",
        parts: [
          { n: 3, label: "x · x · x", tone: "blue" },
          { n: 2, label: "x · x", tone: "warm" },
        ],
      },
      { label: "x⁵", parts: [{ n: 5, label: "x · x · x · x · x", tone: "green" }] },
    ],
    note: "3 factors + 2 factors = 5 factors",
  },
  strategy: {
    name: "One base, then rules",
    steps: [
      "Rewrite every root as a fractional exponent, so each factor is a power of the same base.",
      "Multiply: add exponents. Divide: subtract. Power of a power: multiply.",
      "Handle the numbers in front on their own, and raise them to any outside power too.",
      "Write the result in the form the choices use.",
    ],
  },
  examples: [
    {
      title: "Roots to powers",
      problem: "For $x > 0$, which expression is equivalent to $\\sqrt{x} \\cdot \\sqrt[3]{x^2}$?",
      steps: [
        {
          say: "Rewrite each root as a fractional exponent. The root goes on the bottom.",
          show: "$\\sqrt{x} = x^{\\frac{1}{2}}$ and $\\sqrt[3]{x^2} = x^{\\frac{2}{3}}$",
        },
        {
          say: "Same base, multiplying, so add the exponents over a common bottom.",
          show: "$\\frac{1}{2} + \\frac{2}{3} = \\frac{3}{6} + \\frac{4}{6} = \\frac{7}{6}$",
        },
        { say: "Write the single power.", show: "$x^{\\frac{7}{6}}$" },
        {
          say: "If the choices use roots, turn it back.",
          show: "$x^{\\frac{7}{6}} = \\sqrt[6]{x^7}$",
        },
      ],
      answer: "$x^{\\frac{7}{6}}$",
      checkIn: {
        text: "For $x > 0$, which expression is equivalent to $\\sqrt[3]{x} \\cdot \\sqrt[4]{x^3}$?",
        choices: [
          "$x^{\\frac{1}{4}}$",
          "$x^{\\frac{5}{3}}$",
          "$x^{\\frac{13}{12}}$",
          "$x^{\\frac{4}{7}}$",
        ],
        right: 2,
        why: "As powers, the roots are $x^{\\frac{1}{3}}$ and $x^{\\frac{3}{4}}$. Multiplying adds the exponents: $\\frac{4}{12} + \\frac{9}{12} = \\frac{13}{12}$. $x^{\\frac{1}{4}}$ is the **Multiplying instead of adding** trap.",
        twin: {
          text: "For $x > 0$, which expression is equivalent to $\\sqrt{x} \\cdot \\sqrt[5]{x^2}$?",
          choices: ["$x^{\\frac{9}{10}}$", "$x^{\\frac{1}{5}}$", "$x^3$", "$x^{\\frac{3}{7}}$"],
          right: 0,
          why: "As powers, the roots are $x^{\\frac{1}{2}}$ and $x^{\\frac{2}{5}}$. Multiplying adds the exponents: $\\frac{5}{10} + \\frac{4}{10} = \\frac{9}{10}$. $x^{\\frac{1}{5}}$ is the **Multiplying instead of adding** trap.",
        },
      },
    },
    {
      title: "Power, then divide",
      problem: "For $x \\ne 0$, simplify $\\frac{(2x^3)^4}{8x^5}$.",
      steps: [
        {
          say: "Power of a power: the 4th power reaches the 2 and the $x^3$.",
          show: "$(2x^3)^4 = 2^4 x^{12} = 16x^{12}$",
        },
        { say: "Divide the numbers on their own.", show: "$\\frac{16}{8} = 2$" },
        { say: "Divide the powers of $x$: subtract the exponents.", show: "$x^{12 - 5} = x^7$" },
        { say: "Put the pieces together.", show: "$2x^7$" },
      ],
      answer: "$2x^7$",
      tryFrom: 2,
      checkIn: {
        text: "For $x \\ne 0$, simplify $\\frac{(3x^2)^3}{9x^4}$.",
        choices: ["$3x$", "$\\frac{x^2}{3}$", "$3x^{10}$", "$3x^2$"],
        right: 3,
        why: "The cube reaches both factors: $(3x^2)^3 = 27x^6$. Then $\\frac{27}{9} = 3$ and $x^{6 - 4} = x^2$, so the answer is $3x^2$. $\\frac{x^2}{3}$ is the **Power skips the number** trap: it cubes the $x^2$ but not the 3.",
        twin: {
          text: "For $x \\ne 0$, simplify $\\frac{(2x^4)^3}{4x^7}$.",
          choices: ["$\\frac{x^5}{2}$", "$2x^5$", "$2$", "$2x^{19}$"],
          right: 1,
          why: "The cube reaches both factors: $(2x^4)^3 = 8x^{12}$. Then $\\frac{8}{4} = 2$ and $x^{12 - 7} = x^5$, so the answer is $2x^5$. $\\frac{x^5}{2}$ is the **Power skips the number** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Multiplying instead of adding",
      text: "$x^2 \\cdot x^3$ is $x^5$, not $x^6$. Multiply exponents only for a power of a power, like $(x^2)^3$.",
    },
    {
      name: "Power skips the number",
      text: "An outside power reaches every factor inside. $(2x^3)^4$ is $16x^{12}$, not $2x^{12}$.",
    },
    {
      name: "Flipped fraction exponent",
      text: "In $x^{\\frac{m}{n}}$, the bottom $n$ is the root. $x^{\\frac{2}{3}}$ is $\\sqrt[3]{x^2}$, not $\\sqrt{x^3}$.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Overlap the graphs",
    steps: [
      "Type the original after $y =$, with every exponent in parentheses.",
      "Type each choice on its own line.",
      "Keep the choice that sits exactly on top of the original where $x > 0$.",
    ],
    type: ["y=sqrt(x)*cbrt(x^2)", "y=x^(7/6)"],
    note: "Once the exponent rules are known, working by hand is faster. Use the graph only as a backup check.",
  },
  check: {
    text: "For $x > 0$, which expression is equivalent to $x^{\\frac{3}{4}}$?",
    choices: ["$\\frac{3}{4}x$", "$\\sqrt[3]{x^4}$", "$\\sqrt[4]{x^3}$", "$\\frac{x^3}{4}$"],
    right: 2,
    why: "The bottom of the exponent is the root and the top is the power, so $x^{\\frac{3}{4}} = \\sqrt[4]{x^3}$. $\\sqrt[3]{x^4}$ is the flipped fraction exponent trap. $\\frac{3}{4}x$ treats the exponent as a number in front. $\\frac{x^3}{4}$ divides by 4 instead of taking the 4th root.",
  },
  quiz: [
    {
      text: "For $x \\ne 0$, which expression is equivalent to $\\frac{(3x^2)^3}{9x^4}$?",
      choices: ["$\\frac{x^2}{3}$", "$x^2$", "$3x^2$", "$3x$"],
      right: 2,
      why: "Raise every factor inside to the 3rd power: $(3x^2)^3 = 27x^6$. Divide the numbers, $\\frac{27}{9} = 3$, and subtract the exponents, $x^{6 - 4} = x^2$. The result is $3x^2$. The tempting $\\frac{x^2}{3}$ leaves the 3 uncubed, the power skips the number trap. $x^2$ multiplies 3 by 3 instead of cubing it. $3x$ adds the exponents in $(x^2)^3$ to get $x^5$.",
      subject: "math",
    },
    {
      text: "What is the best first step to simplify $\\frac{\\sqrt{x} \\cdot x^2}{x^{\\frac{1}{3}}}$ for $x > 0$?",
      choices: [
        "Multiply the exponents 2 and $\\frac{1}{3}$.",
        "Rewrite $\\sqrt{x}$ as $x^{\\frac{1}{2}}$, so every factor is a power of $x$.",
        "Square the whole expression to remove the root.",
        "Cancel the $x$ under the root with the $x$ on the bottom.",
      ],
      right: 1,
      why: "Put everything in one base first. With $\\sqrt{x} = x^{\\frac{1}{2}}$, the rules apply: $\\frac{1}{2} + 2 - \\frac{1}{3} = \\frac{13}{6}$, so the result is $x^{\\frac{13}{6}}$. Multiplying 2 by $\\frac{1}{3}$ is the multiplying instead of adding trap; the bottom power is divided, so its exponent is subtracted. Squaring changes the value. The two $x$ terms have different exponents, so they cannot simply cancel.",
      subject: "math",
    },
    {
      text: "Kai says that $x^{\\frac{2}{3}} \\cdot x^{\\frac{3}{4}} = x^{\\frac{1}{2}}$ for $x > 0$. What did he do wrong?",
      choices: [
        "He multiplied the exponents. Multiplying powers adds them, which gives $x^{\\frac{17}{12}}$.",
        "He should add the tops and the bottoms, which gives $x^{\\frac{5}{7}}$.",
        "He should subtract the exponents, which gives $x^{-\\frac{1}{12}}$.",
        "He should divide the exponents, which gives $x^{\\frac{8}{9}}$.",
      ],
      right: 0,
      why: "Same base, multiplying, so add the exponents: $\\frac{2}{3} + \\frac{3}{4} = \\frac{8}{12} + \\frac{9}{12} = \\frac{17}{12}$. Kai found $\\frac{2}{3} \\cdot \\frac{3}{4} = \\frac{1}{2}$, the multiplying instead of adding trap. Adding tops and bottoms is not how fractions add. Subtracting is the rule for dividing powers, not multiplying them. Dividing the exponents follows no rule.",
      subject: "math",
    },
    {
      text: "Which expression is equivalent to $x^6$?",
      choices: ["$x^2 \\cdot x^3$", "$(x^3)^3$", "$(x^2)^3$", "$\\frac{x^{12}}{x^2}$"],
      right: 2,
      why: "Pick the rule that fits each form. A power of a power multiplies: $(x^2)^3 = x^{2 \\cdot 3} = x^6$. The tempting $x^2 \\cdot x^3$ is a product, so its exponents add to 5, not 6: the multiplying instead of adding trap. $(x^3)^3$ is $x^9$. $\\frac{x^{12}}{x^2}$ subtracts to $x^{10}$; dividing 12 by 2 to get 6 uses the wrong rule.",
      subject: "math",
    },
    {
      text: "For $x > 0$, which expression is equivalent to $\\frac{\\sqrt[3]{x^5}}{x^{-\\frac{1}{3}}}$?",
      choices: ["$x^{-\\frac{5}{9}}$", "$x^{\\frac{14}{15}}$", "$x^{\\frac{4}{3}}$", "$x^2$"],
      right: 3,
      why: "Rewrite the root first: $\\sqrt[3]{x^5} = x^{\\frac{5}{3}}$. Dividing subtracts the exponents: $\\frac{5}{3} - (-\\frac{1}{3}) = \\frac{6}{3} = 2$, so the result is $x^2$. The tempting $x^{\\frac{4}{3}}$ subtracts $\\frac{1}{3}$ and loses the negative sign. $x^{\\frac{14}{15}}$ reads the root as $x^{\\frac{3}{5}}$, the flipped fraction exponent trap. $x^{-\\frac{5}{9}}$ multiplies the exponents.",
      subject: "math",
    },
  ],
};

export default lesson;
