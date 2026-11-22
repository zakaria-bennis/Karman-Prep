import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-units-and-conversions",
  tests:
    "Changing a measurement from one unit to another, including rates such as speed and density.",
  spot: "Two different units in one question, such as feet and miles, or a rate like miles per hour, grams per cubic centimeter or dollars per pound.",
  idea: [
    "A **conversion factor** is a fraction equal to 1, like $\\frac{12 \\text{ in}}{1 \\text{ ft}}$. Multiplying by it changes the units, not the amount.",
    "Write the units on every number, and set each factor so the unit you want to lose sits on the opposite side. Then it **cancels**.",
    "A **rate** has a top unit and a bottom unit, like feet per second, so convert each one in turn. Density is mass over volume, and speed is distance over time.",
  ],
  rules: [
    "1 mile = 5,280 feet",
    "1 hour = 3,600 seconds",
    "$1 \\text{ ft}^2 = 144 \\text{ in}^2$",
    "$\\text{density} = \\frac{\\text{mass}}{\\text{volume}}$",
  ],
  figure: {
    kind: "machine",
    rule: "$\\times \\frac{3600 \\text{ s}}{1 \\text{ hr}}$",
    pairs: [["22 ft/s", "79,200 ft/hr"]],
    then: {
      rule: "$\\times \\frac{1 \\text{ mi}}{5280 \\text{ ft}}$",
      pairs: [["79,200 ft/hr", "15 mi/hr"]],
    },
  },
  strategy: {
    name: "Cancel the units",
    steps: [
      "Write the starting amount with its units.",
      "Multiply by a factor that puts the unit to lose on the opposite side.",
      "Cross out matching units, top and bottom. Repeat until only the units you want are left.",
      "Multiply the tops, then divide by the bottoms.",
    ],
  },
  examples: [
    {
      title: "Speed",
      problem:
        "A runner moves at 22 feet per second. What is this speed in miles per hour? (1 mile = 5,280 feet)",
      steps: [
        { say: "Write the rate with its units.", show: "$\\frac{22 \\text{ ft}}{1 \\text{ s}}$" },
        {
          say: "Seconds are on the bottom, so use a factor with seconds on top. They cancel.",
          show: "$\\frac{22 \\text{ ft}}{1 \\text{ s}} \\cdot \\frac{3600 \\text{ s}}{1 \\text{ hr}} = \\frac{79{,}200 \\text{ ft}}{1 \\text{ hr}}$",
        },
        {
          say: "Feet are on top, so use a factor with feet on the bottom.",
          show: "$\\frac{79{,}200 \\text{ ft}}{1 \\text{ hr}} \\cdot \\frac{1 \\text{ mi}}{5280 \\text{ ft}} = 15 \\text{ mi/hr}$",
        },
      ],
      answer: "$15$ miles per hour",
      checkIn: {
        text: "A cyclist moves at 44 feet per second. What is this speed in miles per hour? (1 mile = 5,280 feet)",
        choices: ["$0.5$", "$158400$", "$\\frac{1}{120}$", "$30$"],
        right: 3,
        why: "Change seconds to hours, then feet to miles: $44 \\cdot 3600 = 158{,}400$ feet per hour, and $158{,}400 \\div 5280 = 30$. 0.5 uses 60 seconds in an hour, but an hour has 3,600. $\\frac{1}{120}$ is miles per second, the **Half a rate** trap.",
        twin: {
          text: "A car moves at 66 feet per second. What is this speed in miles per hour? (1 mile = 5,280 feet)",
          choices: ["$0.75$", "$45$", "$237600$", "$\\frac{1}{80}$"],
          right: 1,
          why: "Change seconds to hours, then feet to miles: $66 \\cdot 3600 = 237{,}600$ feet per hour, and $237{,}600 \\div 5280 = 45$. 0.75 uses 60 seconds in an hour, but an hour has 3,600. $\\frac{1}{80}$ is miles per second, the **Half a rate** trap.",
        },
      },
    },
    {
      title: "Density",
      problem:
        "A block of metal has a mass of 540 grams and a volume of 0.2 liters. What is its density in grams per cubic centimeter? (1 liter = 1,000 cubic centimeters)",
      steps: [
        {
          say: "The answer needs cubic centimeters, so change the volume first.",
          show: "$0.2 \\text{ L} \\cdot \\frac{1000 \\text{ cm}^3}{1 \\text{ L}} = 200 \\text{ cm}^3$",
        },
        {
          say: "Density is mass over volume.",
          show: "$\\frac{540 \\text{ g}}{200 \\text{ cm}^3}$",
        },
        {
          say: "Divide. The units left are grams per cubic centimeter.",
          show: "$2.7 \\text{ g/cm}^3$",
        },
      ],
      answer: "$2.7$ grams per cubic centimeter",
      tryFrom: 1,
      checkIn: {
        text: "A stone has a mass of 750 grams and a volume of 0.3 liters. What is its density in grams per cubic centimeter? (1 liter = 1,000 cubic centimeters)",
        choices: ["$2.5$", "$2500$", "$0.4$", "$225$"],
        right: 0,
        why: "Change the volume first: $0.3 \\cdot 1000 = 300$ cubic centimeters. Density is mass over volume: $\\frac{750}{300} = 2.5$. 2500 is grams per liter, the **Half a rate** trap: it never changes the liters.",
        twin: {
          text: "A block of wood has a mass of 960 grams and a volume of 0.4 liters. What is its density in grams per cubic centimeter? (1 liter = 1,000 cubic centimeters)",
          choices: ["$2400$", "$\\frac{5}{12}$", "$2.4$", "$384$"],
          right: 2,
          why: "Change the volume first: $0.4 \\cdot 1000 = 400$ cubic centimeters. Density is mass over volume: $\\frac{960}{400} = 2.4$. 2400 is grams per liter, the **Half a rate** trap: it never changes the liters.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Flipped factor",
      text: "If a unit does not cancel, the factor is upside down. For the runner, $22 \\cdot 5280 \\div 3600 \\approx 32.3$ looks reasonable but is wrong.",
    },
    {
      name: "Squared units",
      text: "Area units convert twice. A square foot is 12 inches by 12 inches, so $1 \\text{ ft}^2 = 144 \\text{ in}^2$, not 12. Cubic units convert three times.",
    },
    {
      name: "Half a rate",
      text: "A rate has two units. Convert both, and check the question's units. Changing feet to miles but leaving seconds alone gives miles per second.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Type the whole chain",
    steps: [
      "The calculator has no units. Set up the chain on paper so the units cancel.",
      "Type it on one line: the tops multiplied, then each bottom divided.",
      "Check that the size makes sense: 22 feet per second is a fast run, not a car.",
    ],
    type: ["22*3600/5280"],
    note: "The screen shows 15. The setup is the real work; the calculator only does the arithmetic, which helps with big numbers like 5,280 and 3,600.",
  },
  check: {
    text: "A rug has an area of 6 square feet. What is its area in square inches? (1 foot = 12 inches)",
    choices: ["$0.5$", "$72$", "$144$", "$864$"],
    right: 3,
    why: "Each square foot is 12 inches by 12 inches, so it holds $12 \\cdot 12 = 144$ square inches. Then $6 \\cdot 144 = 864$. $72$ is the **Squared units** trap: it multiplies by 12 only once. $144$ is just one square foot, and $0.5$ divides by 12 instead of multiplying.",
  },
  quiz: [
    {
      text: "A bottle holds 1.5 liters of oil with a mass of 1,380 grams. What is the density of the oil, in grams per cubic centimeter? (1 liter = 1,000 cubic centimeters)",
      choices: ["$0.92$", "$1.09$", "$920$", "$2{,}070$"],
      right: 0,
      why: "Change the volume first: $1.5 \\cdot 1000 = 1500$ cubic centimeters. Density is mass over volume: $\\frac{1380}{1500} = 0.92$. The tempting $920$ is the **Half a rate** trap: it divides by 1.5 liters, so it is grams per liter, not per cubic centimeter. $1.09$ flips the fraction to volume over mass, and $2{,}070$ multiplies mass by volume.",
      subject: "math",
    },
    {
      text: "A faucet drips 6 cups of water per hour. You want the rate in quarts per day (1 quart = 4 cups, 1 day = 24 hours). Which is a correct first step?",
      choices: [
        "$\\frac{6 \\text{ cups}}{1 \\text{ hr}} \\cdot \\frac{4 \\text{ cups}}{1 \\text{ qt}}$",
        "$6 \\cdot 4 = 24$ quarts",
        "$\\frac{6 \\text{ cups}}{1 \\text{ hr}} \\cdot \\frac{1 \\text{ day}}{24 \\text{ hr}}$",
        "$\\frac{6 \\text{ cups}}{1 \\text{ hr}} \\cdot \\frac{1 \\text{ qt}}{4 \\text{ cups}}$",
      ],
      right: 3,
      why: "Cancel the units. Cups are on top, so the factor needs cups on the bottom: $\\frac{1 \\text{ qt}}{4 \\text{ cups}}$. Then $\\frac{24 \\text{ hr}}{1 \\text{ day}}$ cancels hours, giving $\\frac{6}{4} \\cdot 24 = 36$ quarts per day. The tempting factor with 4 cups on top is the Flipped factor: cups would pile up instead of canceling. The factor with 24 hours on the bottom leaves hours uncanceled, and $6 \\cdot 4$ drops the units.",
      subject: "math",
    },
    {
      text: "A floor has an area of 30 square yards. Jo converts it to square feet: $30 \\cdot 3 = 90$ square feet. (1 yard = 3 feet) What is the correct area in square feet?",
      choices: ["$10$", "$90$", "$270$", "$810$"],
      right: 2,
      why: "Each square yard is 3 feet by 3 feet, so it holds 9 square feet, and $30 \\cdot 9 = 270$ square feet. Jo's $90$ is the **Squared units** trap: she multiplied by 3 only once. $10$ divides by 3 instead of multiplying, and $810$ multiplies by $3^3 = 27$, which is the factor for cubic units.",
      subject: "math",
    },
    {
      text: "Which question needs the factor $1 \\text{ ft}^2 = 144 \\text{ in}^2$?",
      choices: [
        "How many inches of trim go around a square frame that is 2 feet on each side?",
        "How many square inches of glass cover a window that is 3 feet by 2 feet?",
        "How many inches long is a board that is 6 feet long?",
        "How many inches tall is a stack of three boxes that are each 1 foot tall?",
      ],
      right: 1,
      why: "Square inches measure area, so the glass needs the squared factor: $3 \\cdot 2 = 6$ square feet, and $6 \\cdot 144 = 864$ square inches. The trim around the frame is a length, 8 feet, so it uses 12 once: 96 inches. Using 144 there is the **Squared units** trap in reverse. The board and the stack are lengths too: 72 inches and 36 inches.",
      subject: "math",
    },
    {
      text: "A pump moves water at 18 liters per minute. How many hours does it take the pump to fill a pool that holds 54 cubic meters of water? (1 cubic meter = 1,000 liters)",
      choices: ["$0.05$", "$3$", "$50$", "$3{,}000$"],
      right: 2,
      why: "Cancel the units step by step. 54 cubic meters is $54 \\cdot 1000 = 54{,}000$ liters. At 18 liters per minute that takes $\\frac{54{,}000}{18} = 3{,}000$ minutes, and $\\frac{3000}{60} = 50$ hours. The tempting $3{,}000$ is the **Half a rate** trap: it stops at minutes when the question asks for hours. $3$ divides 54 by 18 with no conversions, and $0.05$ skips the change to liters.",
      subject: "math",
    },
  ],
};

export default lesson;
