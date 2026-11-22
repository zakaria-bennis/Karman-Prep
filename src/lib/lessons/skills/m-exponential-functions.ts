import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-exponential-functions",
  tests:
    "Writing and reading models that grow or shrink by the same percent each step, and saying what each number in them means.",
  spot: "A percent that repeats (each year, every hour), the words doubles, triples, half-life, growth or decay, or a function like $a(b)^t$.",
  idea: [
    "An exponential function multiplies by the **same factor** every step: $y = a \\cdot b^x$.",
    "$a$ is the **starting value**, the value when $x = 0$. $b$ is the **growth factor**, what you multiply by at each step.",
    "If $b > 1$, it grows: $b = 1.05$ means 5% growth. If $b < 1$, it shrinks: $b = 0.8$ keeps 80%, so it loses 20%.",
    "To build one, turn the percent into a factor: $1 + r$ for growth and $1 - r$ for decay.",
  ],
  rules: [
    "$y = a \\cdot b^x$",
    "$a$: the value at $x = 0$",
    "growth: $b = 1 + r$",
    "decay: $b = 1 - r$",
  ],
  figure: {
    kind: "plane",
    x: [-4, 5],
    y: [-1, 20],
    draw: [
      { exp: [4, 1.5], label: "growth, b = 1.5", tone: "green" },
      { exp: [4, 0.5], label: "decay, b = 0.5", tone: "red" },
      { point: [0, 4], label: "start, a = 4", tone: "gold" },
    ],
  },
  strategy: {
    name: "Start times factor",
    steps: [
      "Find the start, $a$: the value when time is 0.",
      "Turn the percent into a factor: $1 + r$ to grow, $1 - r$ to shrink.",
      "Raise the factor to the number of steps: $a \\cdot b^t$.",
      "Reading a model? $a$ is the start, and $b$ tells the percent kept or gained each step.",
    ],
  },
  examples: [
    {
      title: "Build the model",
      problem:
        "A herd has 600 deer. The herd grows by 5% each year. Which function gives the number of deer $t$ years from now?",
      choices: ["$600(0.05)^t$", "$600(0.95)^t$", "$600(1.05)^t$", "$600(1.5)^t$"],
      right: 2,
      steps: [
        { say: "The start is the number of deer now, at $t = 0$.", show: "$a = 600$" },
        { say: "It grows, so add the percent to 1.", show: "$b = 1 + 0.05 = 1.05$" },
        {
          say: "Each year multiplies by 1.05 again, so $t$ goes in the exponent.",
          show: "$600(1.05)^t$",
        },
      ],
      answer: "$600(1.05)^t$",
    },
    {
      title: "Read the model",
      problem:
        "The value of a car, in dollars, $t$ years after it is bought is $V(t) = 18000(0.85)^t$. By what percent does the car's value drop each year?",
      steps: [
        { say: "Match the model to $a \\cdot b^t$.", show: "$a = 18000,\\ b = 0.85$" },
        { say: "Since $b < 1$, the value shrinks. Each year it keeps 85% of the year before." },
        { say: "What it keeps and what it loses add to 100%.", show: "$1 - 0.85 = 0.15$" },
      ],
      answer: "$15\\%$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Keep, not lose",
      text: "$b = 0.85$ means the amount keeps 85% each step, so it loses 15%. Reading 0.85 as an 85% loss is the most common miss.",
    },
    {
      name: "Percent as factor",
      text: "5% growth is the factor 1.05. It is not 0.05, and it is not 1.5.",
    },
    {
      name: "Treating it as linear",
      text: "Growing 5% a year for 3 years is $1.05^3$, not 15%. Each change is taken of a new amount, so the steps go in the exponent.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Fit the points",
    steps: [
      "Add a table and enter the points: time in x1, value in y1.",
      "On a new line, type the fit. The ~ means fit, not equals.",
      "Read $a$, the start, and $b$, the factor for each step.",
    ],
    type: ["y1 ~ a b^x1"],
    note: "A machine worth 8,000 dollars after 1 year and 4,096 dollars after 4 years gives $a = 10000$ and $b = 0.8$: it cost 10,000 dollars and loses 20% a year. When the start and the percent are given in words, by hand is faster.",
  },
  check: {
    text: "A colony of 400 bacteria triples every hour. How many bacteria are in the colony after 4 hours?",
    choices: ["3,600", "25,600", "32,400", "97,200"],
    right: 2,
    why: "The start is 400 and the factor is 3, so after 4 hours there are $400 \\cdot 3^4 = 400 \\cdot 81 = 32400$. 3,600 adds the first hour's gain of 800 every hour, Treating it as linear. 25,600 swaps the base and the exponent, $400 \\cdot 4^3$. 97,200 multiplies by 3 one time too many.",
  },
  quiz: [
    {
      text: "The number of visitors to a website $w$ weeks after it opens is modeled by $N(w) = 900(1.08)^w$. By what percent does the number of visitors grow each week?",
      choices: ["$0.08\\%$", "$8\\%$", "$80\\%$", "$108\\%$"],
      right: 1,
      why: "Match the model to $a \\cdot b^w$: $b = 1.08$, and $b > 1$, so it grows by $1.08 - 1 = 0.08$, which is 8%. The tempting 108% reads the whole factor as the change, the same slip as Keep, not lose: 1.08 keeps everything and adds 8%. $0.08\\%$ forgets to turn the decimal into a percent, and 80% slides the decimal point.",
      subject: "math",
    },
    {
      text: "A lake has 750 fish, and the number of fish drops by 6% each year. What should you do first to write a model for the number of fish after $t$ years?",
      choices: [
        "Turn 6% into the factor $1 - 0.06 = 0.94$.",
        "Turn 6% into the factor $0.06$.",
        "Turn 6% into the factor $1.06$.",
        "Find 6% of 750, which is 45, and subtract $45t$.",
      ],
      right: 0,
      why: "The start is 750, and a 6% drop keeps 94%, so the factor is 0.94 and the model is $750(0.94)^t$. The factor 0.06 is Percent as factor: it would leave only 6% each year. 1.06 is growth, not a drop. Subtracting $45t$ is Treating it as linear: after the first year, 6% is taken of fewer than 750 fish.",
      subject: "math",
    },
    {
      text: "A machine's value, in dollars, $t$ years after it is bought is $V(t) = 5000(0.7)^t$. Lena says the machine loses 70% of its value each year. What is her mistake?",
      choices: [
        "0.7 means 7%, so it loses 7% each year.",
        "It loses 70% only in the first year, then less each year.",
        "0.7 is the part kept each year, so it loses 30%.",
        "5000 is the yearly loss, and 0.7 is the starting value.",
      ],
      right: 2,
      why: "Lena fell for Keep, not lose. Each year the value is multiplied by 0.7, so it keeps 70% and loses $1 - 0.7 = 0.3$, which is 30%, every year. 0.7 is 70%, not 7%. The percent lost is the same each year, even though the dollar amount shrinks. 5000 is the starting value, when $t = 0$, and 0.7 is the factor.",
      subject: "math",
    },
    {
      text: "Which situation is best modeled by an exponential function?",
      choices: [
        "A gym gains 40 new members each month.",
        "A plant grows 2 centimeters each week.",
        "A taxi charges 3 dollars plus 2 dollars per mile.",
        "A savings account earns 3% interest each year on its balance.",
      ],
      right: 3,
      why: "Exponential means the same factor every step, and 3% of a growing balance multiplies it by 1.03 each year. The tempting gym also grows each month, but by the same 40 members: adding a fixed amount is linear, and missing that is Treating it as linear. The plant adds a fixed 2 centimeters, and the taxi adds a fixed 2 dollars per mile, so both are linear too.",
      subject: "math",
    },
    {
      text: "A town had 800 people in 2020. Its population grows by 10% every 2 years. Which function gives the population $t$ years after 2020?",
      choices: ["$800(1.05)^t$", "$800(1.1)^{\\frac{t}{2}}$", "$800(1.1)^t$", "$800(1.1)^{2t}$"],
      right: 1,
      why: "The start is 800 and the factor is 1.1, but it applies once every 2 years. In $t$ years there are $\\frac{t}{2}$ steps, so the model is $800(1.1)^{\\frac{t}{2}}$. Check: at $t = 2$ it gives $800(1.1) = 880$. The tempting $800(1.05)^t$ splits 10% into 5% a year, Treating it as linear. $800(1.1)^t$ grows every year, and $800(1.1)^{2t}$ grows twice a year.",
      subject: "math",
    },
  ],
};

export default lesson;
