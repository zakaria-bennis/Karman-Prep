import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-linear-functions",
  tests:
    "Working out $f$ of a number, finding the input that gives an output, and saying what a linear function's numbers mean in a story.",
  spot: "Function notation like $f(x) = 3x + 2$, $f(5)$ or $f(k) = 20$, often with a story and the words best interpretation.",
  idea: [
    "A function is a machine. The **input** goes inside the parentheses, and the **output** is what $f$ equals.",
    "$f(4)$ gives you an input: put 4 in for $x$. $f(x) = 4$ gives you an output: set the rule equal to 4 and solve.",
    "In $f(x) = mx + b$, $m$ is the **rate**: the change in output for each one unit of input. $b$ is the **start**: the output when the input is 0.",
  ],
  rules: ["$f(\\text{input}) = \\text{output}$", "$m$: change per one unit", "$b$: value at 0"],
  figure: {
    kind: "machine",
    rule: "$f(x) = 3x + 2$",
    pairs: [
      ["0", "2"],
      ["1", "5"],
      ["4", "14"],
    ],
  },
  strategy: {
    name: "Input or output?",
    steps: [
      "Ask what the number is: an input, inside the parentheses, or an output, what $f$ equals.",
      "Input: put it in for every $x$, in parentheses, and work it out.",
      "Output: set the rule equal to it and solve for $x$.",
      "In a story, say it in words: input, then output, with units.",
    ],
  },
  examples: [
    {
      title: "Plug it in",
      problem: "For $g(x) = -3x + 10$, what is $g(-4)$?",
      steps: [
        { say: "The $-4$ is inside the parentheses, so it is an input." },
        { say: "Replace $x$ with $(-4)$, in parentheses.", show: "$g(-4) = -3(-4) + 10$" },
        {
          say: "Multiply, then add. A negative times a negative is positive.",
          show: "$12 + 10 = 22$",
        },
      ],
      answer: "$22$",
    },
    {
      title: "Work backward",
      problem:
        "A taxi fare, in dollars, for a ride of $d$ miles is $F(d) = 2.5d + 4$. If $F(k) = 29$, what is the value of $k$?",
      steps: [
        { say: "29 is what $F$ equals, so it is an output: a fare in dollars." },
        { say: "Set the rule equal to 29.", show: "$2.5k + 4 = 29$" },
        { say: "Subtract 4 from both sides.", show: "$2.5k = 25$" },
        {
          say: "Divide by 2.5. In context, a 10-mile ride costs 29 dollars.",
          show: "$k = 10$",
        },
      ],
      answer: "$k = 10$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Input for output",
      text: "If $F(k) = 29$, then 29 is an output. Working out $F(29)$ answers a different question. Look at where the number sits: inside the parentheses, or after the equals sign.",
    },
    {
      name: "Missing parentheses",
      text: "Put a negative input in parentheses. For $g(x) = -3x + 10$, $g(-4)$ is $-3(-4) + 10 = 22$, not $-3 - 4 + 10 = 3$.",
    },
    {
      name: "Rate or start",
      text: "In $L(t) = 120 - 4t$, the 4 is the change for each minute, and 120 is the value at $t = 0$. Questions about meaning often offer both.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Define it once",
    steps: [
      "Define the function on its own line first, or the calculator reads f(6) as f times 6.",
      "For an input, type f of that number: f(6) shows 19.",
      "For an output, graph $y =$ that number and click where it crosses $f$. Zoom out if needed.",
    ],
    type: ["f(x)=2.5x+4", "f(6)", "y=29"],
    note: "The crossing is $(10, 29)$. Working out $f$ of a number is quick by hand. The graph helps most when you solve backward with decimals.",
  },
  check: {
    text: "For $h(x) = 5x + 3$, what is $h(-2)$?",
    choices: ["$-7$", "$-1$", "$6$", "$13$"],
    right: 0,
    why: "$-2$ is an input, so put it in for $x$ with parentheses: $5(-2) + 3 = -10 + 3 = -7$. $-1$ is Input for output: it solves $5x + 3 = -2$. 13 drops the negative and works out $5(2) + 3$. 6 is Missing parentheses: it writes $5 - 2 + 3$.",
  },
  quiz: [
    {
      text: "A gym charges $C(v) = 8v + 20$ dollars for $v$ visits in a month. If $C(n) = 100$, what is the value of $n$?",
      choices: ["$10$", "$12.5$", "$15$", "$820$"],
      right: 0,
      why: "100 is what $C$ equals, so it is an output. Set $8n + 20 = 100$: then $8n = 80$ and $n = 10$. The tempting 820 is Input for output: it works out $C(100)$. 15 adds the 20 instead of subtracting it, then divides 120 by 8. 12.5 divides 100 by 8 and forgets the 20 dollar start.",
      subject: "math",
    },
    {
      text: "For $f(x) = 7x - 4$, you are told that $f(a) = 31$. What should you do first to find $a$?",
      choices: [
        "Put 31 in for $x$: $7(31) - 4$.",
        "Set the rule equal to 31: $7a - 4 = 31$.",
        "Subtract 4 from 31.",
        "Divide 31 by 7.",
      ],
      right: 1,
      why: "31 is what $f$ equals, so it is an output. Set $7a - 4 = 31$; then $7a = 35$ and $a = 5$. Putting 31 in for $x$ is Input for output: it finds $f(31) = 213$. Subtracting 4 from 31 undoes the $-4$ the wrong way, since you need to add 4. Dividing 31 by 7 skips the $-4$ entirely.",
      subject: "math",
    },
    {
      text: "Rosa works out $p(-5)$ for $p(x) = -2x + 1$. She writes $-2 - 5 + 1 = -6$. What is wrong?",
      choices: [
        "Nothing is wrong; $p(-5) = -6$.",
        "She should solve $-2x + 1 = -5$, so the answer is 3.",
        "She left out the parentheses; $-2(-5) + 1 = 11$.",
        "She should subtract the 1, so the answer is $-8$.",
      ],
      right: 2,
      why: "This is Missing parentheses. The input replaces $x$, so $-2x$ becomes $-2(-5)$, which is $+10$. Then $10 + 1 = 11$. Rosa wrote $-2 - 5$, which subtracts instead of multiplying. Solving $-2x + 1 = -5$ is Input for output: $-5$ sits inside the parentheses, so it is an input. The rule adds 1, so there is no reason to subtract it.",
      subject: "math",
    },
    {
      text: "For $f(x) = 3x + 5$, which question asks you to solve an equation instead of plugging in a number?",
      choices: [
        "What is $f(4)$?",
        "What is $f(0)$?",
        "For what value of $x$ is $f(x) = 4$?",
        "What is $f(-4)$?",
      ],
      right: 2,
      why: "In $f(x) = 4$, the 4 is what $f$ equals, an output. So you set $3x + 5 = 4$ and solve: $x = -\\frac{1}{3}$. In $f(4)$, $f(0)$ and $f(-4)$, the number sits inside the parentheses, so it is an input: plug it in. Treating $f(4)$ as $3x + 5 = 4$ is the Input for output trap.",
      subject: "math",
    },
    {
      text: "The function $L(t) = 120 - 4t$ gives the water level, in centimeters, in a tank $t$ minutes after a pump starts draining it. What is the best interpretation of 4 in this context?",
      choices: [
        "The water level, in centimeters, when the pump starts",
        "The number of minutes until the tank is empty",
        "The water level, in centimeters, after 1 minute",
        "The drop in water level, in centimeters, each minute",
      ],
      right: 3,
      why: "The number that multiplies $t$ is the rate: the change in output for each one unit of input. Each minute takes 4 centimeters off the level, so 4 is the drop per minute. The tempting level at the start is Rate or start: that is 120. The tank is empty when $120 - 4t = 0$, at 30 minutes. After 1 minute the level is $L(1) = 116$.",
      subject: "math",
    },
  ],
};

export default lesson;
