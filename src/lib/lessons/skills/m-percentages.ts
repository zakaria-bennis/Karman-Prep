import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-percentages",
  tests:
    "Finding a percent of a number, a percent change, and the result of changes made one after another, forward or backward.",
  spot: "The word percent or a % sign, often with increase, decrease, discount, tax, tip, or grows each year.",
  idea: [
    "Percent means **out of 100**, so 40% is $0.40$. To find 40% of 250, multiply: $0.40 \\cdot 250 = 100$.",
    "Turn every change into a **multiplier**. A 20% increase multiplies by $1.2$, and a 25% decrease leaves 75%, so it multiplies by $0.75$.",
    "For changes one after another, multiply the multipliers; never add the percents. To go **backward** to the original, divide by the multiplier.",
    "Percent change is the change divided by the **original**: $\\frac{\\text{new} - \\text{old}}{\\text{old}}$.",
  ],
  rules: [
    "$+20\\%$: $\\times 1.2$",
    "$-25\\%$: $\\times 0.75$",
    "$n$ years at $+4\\%$: $\\times 1.04^n$",
    "$\\text{change} = \\frac{\\text{new} - \\text{old}}{\\text{old}}$",
  ],
  figure: {
    kind: "tape",
    bars: [
      {
        label: "Before",
        parts: [
          { n: 1, label: "25%", tone: "ink" },
          { n: 1, label: "25%", tone: "ink" },
          { n: 1, label: "25%", tone: "ink" },
          { n: 1, label: "25%", tone: "ink" },
        ],
      },
      {
        label: "25% off",
        parts: [
          { n: 1, label: "25%", tone: "green" },
          { n: 1, label: "25%", tone: "green" },
          { n: 1, label: "25%", tone: "green" },
          { n: 1, label: "off", tone: "red" },
        ],
      },
    ],
    note: "25% off leaves 75%, so multiply by 0.75",
  },
  strategy: {
    name: "Use multipliers",
    steps: [
      "Turn each percent change into a multiplier: up 20% is $1.2$, down 25% is $0.75$.",
      "Chain the changes by multiplying the multipliers.",
      "Going forward, multiply the start. Going backward, divide the end.",
      "For a percent change, divide the change by the original.",
    ],
  },
  examples: [
    {
      title: "Two changes",
      problem:
        "A jacket costs 80 dollars. The price rises 20%, and then the new price falls 25%. What is the final price?",
      steps: [
        {
          say: "Turn each change into a multiplier.",
          show: "$+20\\% \\to 1.2, \\quad -25\\% \\to 0.75$",
        },
        {
          say: "The second change works on the new price, so multiply the multipliers.",
          show: "$1.2 \\cdot 0.75 = 0.9$",
        },
        { say: "Multiply the starting price.", show: "$80 \\cdot 0.9 = 72$" },
      ],
      answer: "$72$ dollars",
    },
    {
      title: "Working backward",
      problem:
        "After a 15% discount, a bike costs 340 dollars. What was the price before the discount?",
      steps: [
        { say: "Turn the discount into a multiplier: 15% off leaves 85%.", show: "$0.85$" },
        {
          say: "Write the change forward, with $p$ for the old price.",
          show: "$0.85p = 340$",
        },
        {
          say: "Go backward: divide by the multiplier.",
          show: "$p = \\frac{340}{0.85} = 400$",
        },
      ],
      answer: "$400$ dollars",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Adding the percents",
      text: "Up 20% then down 25% is not down 5%. Multiply: $1.2 \\cdot 0.75 = 0.9$, a 10% drop.",
    },
    {
      name: "Wrong whole",
      text: "A percent is always of something. Percent change divides by the original: 50 to 60 is $\\frac{10}{50} = 20\\%$, not $\\frac{10}{60}$. A discount came off the original price, so do not take 15% of the sale price.",
    },
    {
      name: "Change, not total",
      text: "25% off a 40 dollar jacket is a 10 dollar discount, but the new price is 30 dollars. Check whether the question asks for the change or the new amount.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Type the multipliers",
    steps: [
      "Type the start times each multiplier.",
      "For a change repeated many times, use a power.",
      "Going backward, divide by the multiplier.",
    ],
    type: ["80*1.2*0.75", "1500*1.04^6", "340/0.85"],
    note: "With friendly numbers, working by hand is just as fast. The calculator helps most with powers like $1.04^6$, about 1.265.",
  },
  check: {
    text: "A savings account holds 500 dollars and earns 10% each year. How many dollars are in the account after 2 years?",
    choices: ["$105$", "$550$", "$600$", "$605$"],
    right: 3,
    why: "Each year multiplies by 1.1, so two years multiply by $1.1^2 = 1.21$: $500 \\cdot 1.21 = 605$. $600$ is Adding the percents: it adds 10% of 500 twice. $550$ stops after one year, and $105$ is Change, not total: it is only the interest earned.",
  },
  quiz: [
    {
      text: "After a 20% tip is added, a dinner bill comes to 54 dollars. How many dollars was the bill before the tip?",
      choices: ["$34$", "$43.2$", "$45$", "$64.8$"],
      right: 2,
      why: "Go backward: divide by the multiplier. A 20% tip multiplies by 1.2, so $1.2b = 54$ and $b = \\frac{54}{1.2} = 45$. The tempting $43.2$ is the Wrong whole: it takes 20% off 54, but the tip was 20% of the smaller bill. $64.8$ adds the tip a second time, and $34$ treats 20% as 20 dollars.",
      subject: "math",
    },
    {
      text: "A price rises 20%, and then the new price falls 20%. What should you do first to find the final price as a percent of the original?",
      choices: [
        "Turn each change into a multiplier: $1.2$ and $0.8$.",
        "Turn each change into a multiplier: $1.2$ and $0.2$.",
        "Add 20 and subtract 20: the changes cancel.",
        "Find 20% of 20%, which is 4%.",
      ],
      right: 0,
      why: "Use multipliers. Up 20% is $1.2$ and down 20% is $0.8$, so the price ends at $1.2 \\cdot 0.8 = 0.96$, or 96% of the original. Adding and subtracting 20 is the Adding the percents trap: the drop is 20% of a bigger price, so the changes do not cancel. A multiplier of $0.2$ keeps only the part taken off, not the 80% left. 20% of 20% is not a step toward the price.",
      subject: "math",
    },
    {
      text: "A store sold 80 shirts in May and 100 shirts in June. Ana says sales rose by 20%, because $\\frac{20}{100} = 20\\%$. What is the correct percent increase?",
      choices: ["$20\\%$", "$25\\%$", "$80\\%$", "$125\\%$"],
      right: 1,
      why: "Percent change divides the change by the original. The change is $100 - 80 = 20$, and the original is May's 80: $\\frac{20}{80} = 25\\%$. Ana's $20\\%$ is the Wrong whole: she divided by June's 100. $125\\%$ is June as a percent of May, not the increase, and $80\\%$ is May as a percent of June.",
      subject: "math",
    },
    {
      text: "Which question is answered by $\\frac{60 - 48}{48}$, written as a percent?",
      choices: [
        "A price fell from 60 to 48. By what percent did it fall?",
        "What percent of 60 is 48?",
        "What is 48% of 60?",
        "A price rose from 48 to 60. By what percent did it rise?",
      ],
      right: 3,
      why: "Percent change divides by the original, the starting amount. Here 48 is on the bottom, so 48 is the start: a rise from 48 to 60, which is 25%. A fall from 60 to 48 starts at 60, so it divides by 60 and is a 20% drop; picking it is the Wrong whole trap. What percent of 60 is 48 is $\\frac{48}{60}$, and 48% of 60 is $0.48 \\cdot 60$.",
      subject: "math",
    },
    {
      text: "A store raises the price of a lamp by 25%. Later, it puts the lamp on sale for 40% off the raised price. The sale price is 45 dollars. What was the price, in dollars, before the raise?",
      choices: ["$33.75$", "$52.94$", "$60$", "$75$"],
      right: 2,
      why: "Use multipliers and work backward. Up 25% is $1.25$ and 40% off is $0.6$, so together they multiply by $1.25 \\cdot 0.6 = 0.75$. Then $p = \\frac{45}{0.75} = 60$. The tempting $52.94$ is Adding the percents: it uses $25 - 40 = -15\\%$, then $\\frac{45}{0.85}$. $75$ undoes the sale but forgets the raise, and $33.75$ multiplies by 0.75 instead of dividing.",
      subject: "math",
    },
  ],
};

export default lesson;
