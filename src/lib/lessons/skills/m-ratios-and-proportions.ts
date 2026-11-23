import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-ratios-and-proportions",
  tests:
    "Using a ratio or a rate to find a missing amount, and splitting a total in a given ratio.",
  spot: "Words like ratio, for every, per, at this rate, or in the same proportion, with three numbers given and a fourth to find.",
  idea: [
    "A **ratio** compares two amounts. Flour to sugar of 3 to 2 means 3 cups of flour for every 2 cups of sugar.",
    "A **proportion** says two ratios are equal. Write both fractions with the same item on top, then cross multiply.",
    "When the problem gives a total, think in **parts**: a ratio of 3 to 2 has $3 + 2 = 5$ parts. Find what one part is worth, then multiply.",
  ],
  rules: [
    "$\\frac{a}{b} = \\frac{c}{d}$ means $ad = bc$",
    "Same item on top, both sides",
    "$\\text{one part} = \\frac{\\text{total}}{\\text{number of parts}}$",
  ],
  figure: {
    kind: "tape",
    bars: [
      {
        label: "Flour",
        parts: [
          { n: 1, label: "8", tone: "warm" },
          { n: 1, label: "8", tone: "warm" },
          { n: 1, label: "8", tone: "warm" },
        ],
      },
      {
        label: "Sugar",
        parts: [
          { n: 1, label: "8", tone: "blue" },
          { n: 1, label: "8", tone: "blue" },
        ],
      },
    ],
    note: "5 parts = 40 cups, so 1 part = 8 cups",
  },
  strategy: {
    name: "Match the labels",
    steps: [
      "Write the ratio as a fraction, with words: $\\frac{\\text{flour}}{\\text{sugar}}$.",
      "Write the second fraction with the same words on top and bottom, and $x$ for the unknown.",
      "Cross multiply and solve.",
      "Given a total or a gap? Find what one part is worth, then multiply.",
    ],
  },
  examples: [
    {
      title: "Scaling a recipe",
      problem:
        "A recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of flour go with 7 cups of sugar?",
      steps: [
        {
          say: "Write the ratio with its words, flour on top.",
          show: "$\\frac{\\text{flour}}{\\text{sugar}} = \\frac{3}{2}$",
        },
        {
          say: "Write the second fraction the same way, flour on top, with $x$ for the unknown flour.",
          show: "$\\frac{3}{2} = \\frac{x}{7}$",
        },
        { say: "Cross multiply.", show: "$2x = 3 \\cdot 7 = 21$" },
        { say: "Divide by 2.", show: "$x = 10.5$" },
      ],
      answer: "$10.5$ cups",
      checkIn: {
        text: "A paint mix uses 5 cans of blue for every 2 cans of white. How many cans of blue go with 6 cans of white?",
        choices: ["$15$", "$2.4$", "$9$", "$12$"],
        right: 0,
        why: "Keep blue on top on both sides: $\\frac{5}{2} = \\frac{x}{6}$. Cross multiply: $2x = 30$, so $x = 15$. 2.4 is the **Upside-down ratio** trap. 9 adds 4 cans instead of scaling.",
        twin: {
          text: "A punch recipe uses 4 cups of juice for every 3 cups of soda. How many cups of juice go with 9 cups of soda?",
          choices: ["$6.75$", "$10$", "$12$", "$36$"],
          right: 2,
          why: "Keep juice on top on both sides: $\\frac{4}{3} = \\frac{x}{9}$. Cross multiply: $3x = 36$, so $x = 12$. 6.75 is the **Upside-down ratio** trap. 10 adds 6 cups instead of scaling.",
        },
      },
    },
    {
      title: "Splitting a total",
      problem:
        "A class of 35 students has 4 juniors for every 3 seniors. How many juniors are in the class?",
      figure: {
        kind: "tape",
        bars: [
          {
            label: "Juniors",
            parts: [
              { n: 1, label: "5", tone: "warm" },
              { n: 1, label: "5", tone: "warm" },
              { n: 1, label: "5", tone: "warm" },
              { n: 1, label: "5", tone: "warm" },
            ],
          },
          {
            label: "Seniors",
            parts: [
              { n: 1, label: "5", tone: "blue" },
              { n: 1, label: "5", tone: "blue" },
              { n: 1, label: "5", tone: "blue" },
            ],
          },
        ],
        note: "7 parts = 35 students, so 1 part = 5",
      },
      steps: [
        { say: "Add the ratio's numbers to count the parts in the class.", show: "$4 + 3 = 7$" },
        { say: "Split the total into 7 equal parts.", show: "$35 \\div 7 = 5$" },
        { say: "Juniors are 4 of those parts.", show: "$4 \\cdot 5 = 20$" },
      ],
      answer: "$20$ juniors",
      tryFrom: 1,
      checkIn: {
        text: "A club of 48 members has 5 girls for every 3 boys. How many girls are in the club?",
        choices: ["$18$", "$30$", "$80$", "$24$"],
        right: 1,
        why: "There are $5 + 3 = 8$ parts, so one part is $48 \\div 8 = 6$. Girls are 5 parts: $5 \\cdot 6 = 30$. 80 is the **Part or whole** trap: girls are $\\frac{5}{8}$ of the club, not $\\frac{5}{3}$.",
        twin: {
          text: "A bag of 56 marbles has 3 red marbles for every 4 blue marbles. How many red marbles are in the bag?",
          choices: ["$32$", "$42$", "$28$", "$24$"],
          right: 3,
          why: "There are $3 + 4 = 7$ parts, so one part is $56 \\div 7 = 8$. Red is 3 parts: $3 \\cdot 8 = 24$. 42 is the **Part or whole** trap: red is $\\frac{3}{7}$ of the bag, not $\\frac{3}{4}$.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Upside-down ratio",
      text: "Keep the same item on top on both sides. Flipping one fraction in the recipe gives $\\frac{2}{3} \\cdot 7 \\approx 4.67$ cups instead of 10.5.",
    },
    {
      name: "Part or whole",
      text: "A ratio compares part to part. Juniors are $\\frac{4}{7}$ of the class, not $\\frac{4}{3}$. Add the parts to get the whole, and check which part the question asks for.",
    },
    {
      name: "Adding, not scaling",
      text: "Ratios grow by multiplying. Going from 2 cups of sugar to 7 is not adding 5 cups of flour too: 8 to 7 is a different ratio.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Mostly mental math",
    steps: [
      "Set up the proportion on paper first. The calculator cannot do that part.",
      "After you cross multiply, type the multiplication and the division on one line.",
    ],
    type: ["7*3/2"],
    note: "The screen shows 10.5. Most ratio questions are faster by hand. If you do type one, put the division last: in 3/2*7 the 7 lands under the 2.",
  },
  check: {
    text: "A map uses 2 centimeters for every 15 kilometers. Two towns are 9 centimeters apart on the map. How many kilometers apart are the towns?",
    choices: ["$1.2$", "$22$", "$67.5$", "$135$"],
    right: 2,
    why: "Keep kilometers on top on both sides: $\\frac{15}{2} = \\frac{x}{9}$, so $2x = 135$ and $x = 67.5$. $1.2$ is the Upside-down ratio. $22$ adds 7 to 15 instead of scaling, and $135$ forgets to divide by 2.",
  },
  quiz: [
    {
      text: "A bag holds red and green marbles in a ratio of 5 to 3. There are 48 marbles in all. How many marbles are green?",
      choices: ["$16$", "$18$", "$28.8$", "$30$"],
      right: 1,
      why: "Use parts. $5 + 3 = 8$ parts make 48 marbles, so one part is $48 \\div 8 = 6$, and green is $3 \\cdot 6 = 18$. The tempting $28.8$ is the **Part or whole** trap: it takes $\\frac{3}{5}$ of 48, but green is $\\frac{3}{8}$ of the bag. $30$ is the number of red marbles. $16$ splits 48 into 3 parts instead of 8.",
      subject: "math",
    },
    {
      text: "A printer makes 120 pages in 8 minutes. At this rate, how many minutes will 210 pages take? Which equation is a correct first step?",
      choices: [
        "$\\frac{8}{120} = \\frac{210}{x}$",
        "$\\frac{120}{8} = \\frac{x}{210}$",
        "$8 + 90 = x$, since $120 + 90 = 210$",
        "$\\frac{120}{8} = \\frac{210}{x}$",
      ],
      right: 3,
      why: "Match the labels: pages over minutes on both sides, $\\frac{120}{8} = \\frac{210}{x}$. Cross multiplying gives $120x = 1680$, so $x = 14$ minutes. The two other fractions are the Upside-down ratio: each puts pages on top on one side and minutes on top on the other. Adding 90 to both numbers is the **Adding, not scaling** trap: 98 minutes would be far too long.",
      subject: "math",
    },
    {
      text: "A drink is made with 2 cups of mango juice for every 5 cups of water. Leo has 21 cups of mango juice. He writes $\\frac{2}{5} = \\frac{x}{21}$ and gets 8.4 cups of water. How many cups of water does he really need?",
      choices: ["$8.4$", "$24$", "$52.5$", "$105$"],
      right: 2,
      why: "Match the labels. The ratio has mango on top, so the second fraction needs mango on top too: $\\frac{2}{5} = \\frac{21}{x}$. Then $2x = 105$ and $x = 52.5$. Leo's $8.4$ is the Upside-down ratio: he put water over mango on one side. $24$ adds 3 to 21, which is the **Adding, not scaling** trap. $105$ forgets to divide by 2.",
      subject: "math",
    },
    {
      text: "Which question can be solved with a proportion?",
      choices: [
        "A car goes 150 miles on 5 gallons of gas. How far does it go on 8 gallons?",
        "A plant is 4 inches tall and grows 2 inches a week. How tall is it after 6 weeks?",
        "A taxi ride costs 3 dollars plus 2 dollars a mile. What does a 6-mile ride cost?",
        "Ana is 12 and her brother is 4. How old is Ana when her brother is 8?",
      ],
      right: 0,
      why: "A proportion works only when two amounts scale together from zero: twice the gas, twice the miles. The car gets 30 miles per gallon, so 8 gallons go 240 miles. The plant starts at 4 inches and the taxi starts with a 3 dollar fee, so doubling the time does not double the total. Ages go up by adding: Ana is always 8 years older, so she will be 16, not 24.",
      subject: "math",
    },
    {
      text: "A club has boys and girls in a ratio of 3 to 4. After 6 more boys join, the ratio of boys to girls is 1 to 1. How many girls are in the club?",
      choices: ["$6$", "$18$", "$24$", "$48$"],
      right: 2,
      why: "Use parts. Boys are 3 parts and girls are 4 parts. The 6 new boys make the groups equal, so they fill the 1-part gap: one part is 6. Girls are $4 \\cdot 6 = 24$. The tempting $18$ is the **Part or whole** trap: it is the number of boys before the change, not girls. $6$ stops at one part, and $48$ is the whole club after the 6 boys join.",
      subject: "math",
    },
  ],
};

export default lesson;
