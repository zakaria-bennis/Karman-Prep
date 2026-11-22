import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-equations-from-words",
  tests:
    "Writing a linear equation or expression that models a situation, then sometimes using it to find a value.",
  spot: "A short story with a fixed amount and an amount for each item or each hour, and choices that are equations.",
  idea: [
    "Most linear stories have two numbers. The **start** is the amount when nothing has happened yet. The **rate** is the change for each one: each hour, each ticket, each mile.",
    "Words like **per**, **each** and **every** mark the rate, which multiplies the variable. Words like fee, initial and already mark the start, which stands alone.",
    "Write output = start + rate times input. If the amount goes down, the rate is negative. Then test one number from the story.",
  ],
  rules: ["output = start + rate · input", "Shrinking amount: minus rate"],
  figure: {
    kind: "plane",
    x: [0, 10],
    y: [0, 120],
    xLabel: "visits",
    yLabel: "cost (dollars)",
    draw: [
      { line: [8, 25], label: "y = 25 + 8x", tone: "blue" },
      { point: [0, 25], label: "start: 25", tone: "gold" },
      { segment: [4, 57, 5, 57], label: "1 visit", tone: "warm" },
      { segment: [5, 57, 5, 65], label: "+8", tone: "green" },
    ],
  },
  strategy: {
    name: "Start plus rate",
    steps: [
      "Name the variable: what does it count?",
      "Find the start: the amount when the variable is 0.",
      "Find the rate: the change for each one, with its sign.",
      "Write output = start + rate times input, then test one number from the story.",
    ],
  },
  examples: [
    {
      title: "Fee plus hours",
      problem:
        "A plumber charges a 60 dollar visit fee plus 45 dollars for each hour of work. Which equation gives the total charge $C$, in dollars, for a job that takes $h$ hours?",
      choices: ["$C = 45 + 60h$", "$C = 60 + 45h$", "$C = 60h + 45h$", "$C = 105h$"],
      right: 1,
      steps: [
        { say: "Name the variable: $h$ counts hours of work." },
        { say: "Find the start. The 60 dollar fee is paid even for 0 hours.", show: "$60$" },
        { say: "Find the rate. Each hour adds 45 dollars.", show: "$45h$" },
        {
          say: "Write start plus rate, then test $h = 2$: 60 plus 90 is 150 dollars, which fits the story.",
          show: "$C = 60 + 45h$",
        },
      ],
      answer: "$C = 60 + 45h$",
      checkIn: {
        text: "A gym charges a 50 dollar sign-up fee plus 30 dollars for each month. Which equation gives the total cost $C$, in dollars, for $m$ months?",
        choices: ["$C = 50 + 30m$", "$C = 30 + 50m$", "$C = 80m$", "$C = 50m + 30m$"],
        right: 0,
        why: "The 50 dollar fee is paid once, so it is the start. Each month adds 30 dollars, so 30 multiplies $m$. $C = 30 + 50m$ is the **Start and rate swapped** trap: test $m = 0$ and you should get the fee, 50.",
        twin: {
          text: "A taxi charges 4 dollars to start a ride plus 2 dollars for each mile. Which equation gives the total fare $F$, in dollars, for a ride of $d$ miles?",
          choices: ["$F = 2 + 4d$", "$F = 6d$", "$F = 4 + 2d$", "$F = 4d + 2d$"],
          right: 2,
          why: "The 4 dollars is paid once, so it is the start. Each mile adds 2 dollars, so 2 multiplies $d$. $F = 2 + 4d$ is the **Start and rate swapped** trap: test $d = 0$ and you should get 4.",
        },
      },
    },
    {
      title: "Draining tank",
      problem:
        "A tank holds 600 liters of water. It drains at 15 liters per minute. After how many minutes will the tank hold 240 liters?",
      steps: [
        { say: "Find the start: the tank holds 600 liters when $t = 0$." },
        {
          say: "Find the rate. The tank drains, so the rate is negative: $-15$ liters each minute.",
          show: "$A = 600 - 15t$",
        },
        { say: "Set the amount equal to 240.", show: "$600 - 15t = 240$" },
        {
          say: "Subtract 600, then divide by $-15$. Check: $600 - 15(24) = 240$.",
          show: "$t = 24$",
        },
      ],
      answer: "$t = 24$",
      tryFrom: 2,
      checkIn: {
        text: "A pool holds 900 gallons of water. It drains at 20 gallons per minute. After how many minutes will the pool hold 300 gallons?",
        choices: ["$15$", "$30$", "$45$", "$60$"],
        right: 1,
        why: "The amount is $900 - 20t$. Set it equal to 300: $900 - 20t = 300$, so $20t = 600$ and $t = 30$. 15 divides only the 300 gallons left, not the 600 that drained out.",
        twin: {
          text: "A candle is 30 centimeters tall. It burns down 2 centimeters per hour. After how many hours will it be 12 centimeters tall?",
          choices: ["$6$", "$15$", "$21$", "$9$"],
          right: 3,
          why: "The height is $30 - 2t$. Set it equal to 12: $30 - 2t = 12$, so $2t = 18$ and $t = 9$. 6 divides only the 12 centimeters left, not the 18 that burned.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Start and rate swapped",
      text: "The number that comes once is the start. The number that comes each time multiplies the variable. In the plumber story, $C = 45 + 60h$ swaps them. Test $h = 0$: you should get the fee.",
    },
    {
      name: "Lost the minus",
      text: "If something drains, burns, melts or gets spent, the amount goes down. The rate needs a minus sign: $600 - 15t$, not $600 + 15t$.",
    },
    {
      name: "Mixed units",
      text: "Make the rate match the variable. If a car uses 1 gallon every 30 miles and $m$ counts miles, the rate is $\\frac{1}{30}$ gallon per mile, not 30.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Check, do not write",
    steps: [
      "Write the equation by hand first. The calculator cannot write it for you.",
      "Graph it with $x$ for the input and $y$ for the output, and zoom out to fit the story's numbers.",
      "Click where the line meets the $y$-axis: it should be the start. Test one more point against the story.",
      "To answer when, graph $y =$ the target and click the crossing.",
    ],
    type: ["y=600-15x", "y=240"],
    note: "The lines cross at $(24, 240)$. Writing the equation is always faster by hand. Use the graph only to check it.",
  },
  check: {
    text: "A candle is 20 centimeters tall. It burns down 1.5 centimeters each hour. Which equation gives its height $H$, in centimeters, after $t$ hours?",
    choices: ["$H = 1.5 - 20t$", "$H = 20 - 1.5t$", "$H = 20 + 1.5t$", "$H = 21.5t$"],
    right: 1,
    why: "The start is 20 centimeters, at $t = 0$. The candle burns down 1.5 each hour, so the rate is $-1.5$, and $H = 20 - 1.5t$. $1.5 - 20t$ swaps the start and the rate. $20 + 1.5t$ loses the minus, so the candle would grow. $21.5t$ adds the two numbers and gives 0 at the start.",
  },
  quiz: [
    {
      text: "A gift card starts with 80 dollars. Each coffee costs 4 dollars. After how many coffees will 32 dollars be left on the card?",
      choices: ["$8$", "$12$", "$20$", "$28$"],
      right: 1,
      why: "Start plus rate: the money left is $80 - 4n$. Set $80 - 4n = 32$, so $4n = 48$ and $n = 12$. The tempting 28 is the **Lost the minus** trap: it adds 80 and 32 to get 112, then divides by 4. 20 is how many coffees empty the card, 80 divided by 4. 8 divides the 32 that is left by 4, which does not count the coffees bought.",
      subject: "math",
    },
    {
      text: "A tutor charges a sign-up fee of 25 dollars, then 40 dollars for each session. You want an equation for the total cost $T$ after $s$ sessions. Which first step sets it up correctly?",
      choices: [
        "Find the cost when $s = 0$: the 25 dollar fee is the start.",
        "Add 25 and 40 to get 65 dollars for each session.",
        "Treat 40 as the start, since it is the larger number.",
        "Multiply 25 by 40 to get the total cost.",
      ],
      right: 0,
      why: "Start with the amount paid before any sessions: the 25 dollar fee. Then $T = 25 + 40s$. Treating 40 as the start is the **Start and rate swapped** trap: 40 is paid for each session, so it multiplies $s$. Adding to get 65 for each session charges the fee every time. Multiplying 25 by 40 gives a number with no meaning in this story.",
      subject: "math",
    },
    {
      text: "A pool holds 9,000 gallons of water and drains at 150 gallons per minute. Ana writes $G = 9{,}000 + 150m$ for the gallons left after $m$ minutes. What is wrong?",
      choices: [
        "The rate should be 9,000 and the start should be 150.",
        "Minutes and gallons cannot be in the same equation.",
        "The start should be 0, because the pool ends up empty.",
        "The water goes down, so the rate needs a minus sign: $G = 9{,}000 - 150m$.",
      ],
      right: 3,
      why: "This is the **Lost the minus** trap. The pool drains, so the amount drops by 150 gallons each minute: $G = 9{,}000 - 150m$. With a plus sign the pool would fill up. Making 9,000 the rate is the **Start and rate swapped** trap. A rate in gallons per minute is meant to link gallons and minutes. The start is the amount at $m = 0$, which is 9,000, not 0.",
      subject: "math",
    },
    {
      text: "Which situation does the equation $y = 15x + 40$ describe?",
      choices: [
        "A bike rental costs 15 dollars, plus 40 dollars for each hour.",
        "A bike rental costs 55 dollars for each hour.",
        "A bike rental costs 40 dollars, plus 15 dollars for each hour.",
        "A bike rental costs 40 dollars, minus 15 dollars for each hour.",
      ],
      right: 2,
      why: "The number that multiplies $x$ is the rate, and the number alone is the start. So the rental starts at 40 dollars and each hour adds 15. The first choice is the **Start and rate swapped** trap. 55 dollars for each hour folds the start into the rate. The minus version would be $y = 40 - 15x$, which is the **Lost the minus** trap.",
      subject: "math",
    },
    {
      text: "A car's gas tank holds 14 gallons when full. On the highway, the car uses 1 gallon of gas every 30 miles. Which equation gives the number of gallons $g$ left in the tank after the car drives $m$ miles from a full tank?",
      choices: [
        "$g = 14 - 30m$",
        "$g = 14 - \\frac{m}{30}$",
        "$g = 14 + \\frac{m}{30}$",
        "$g = 30 - \\frac{m}{14}$",
      ],
      right: 1,
      why: "The start is 14 gallons. The car uses $\\frac{1}{30}$ gallon per mile, so after $m$ miles it has used $\\frac{m}{30}$ gallons, and $g = 14 - \\frac{m}{30}$. Test 60 miles: 2 gallons used, 12 left. The tempting $14 - 30m$ is the **Mixed units** trap: it takes away 30 gallons for every mile. $14 + \\frac{m}{30}$ is the **Lost the minus** trap. $30 - \\frac{m}{14}$ is the **Start and rate swapped** trap.",
      subject: "math",
    },
  ],
};

export default lesson;
