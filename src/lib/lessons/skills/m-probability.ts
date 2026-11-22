import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-probability",
  tests:
    "Finding a probability from counts, often in a two-way table, including a conditional probability where the question limits you to one row or column.",
  spot: "A table of counts with row and column totals, and the words probability, chosen at random, given that, or of those.",
  idea: [
    "A **probability** is a fraction: the outcomes you want over the total. It always runs from 0 to 1.",
    "In a two-way table, the hard part is choosing the **total**. A person chosen from everyone means the grand total.",
    "Words like given that, of those, or a student who plays a sport make it a **conditional** probability. The total shrinks to that one row or column.",
  ],
  rules: [
    "$P = \\frac{\\text{wanted}}{\\text{total}}$",
    "From everyone: the grand total",
    "Given a group: that row or column's total",
  ],
  figure: {
    kind: "data",
    chart: "table",
    head: ["", "Sport", "No sport", "Total"],
    rows: [
      ["Grade 9", "30", "50", "80"],
      ["Grade 10", "42", "78", "120"],
      ["Total", "72", "128", "200"],
    ],
    highlight: [
      [1, 1],
      [2, 1],
    ],
  },
  strategy: {
    name: "Shrink the total",
    steps: [
      "Find the group the question limits you to: given that, of those, or if.",
      "Use that group's total as the bottom. With no limit, use the grand total.",
      "Count the ones in that group that also fit what is asked, for the top.",
      "Divide, and simplify to match the choices.",
    ],
  },
  examples: [
    {
      title: "Given a sport",
      problem:
        "The table shows 200 students by grade and by whether they play a sport. One student who plays a sport is chosen at random. What is the probability that the student is in grade 10?",
      figure: {
        kind: "data",
        chart: "table",
        head: ["", "Sport", "No sport", "Total"],
        rows: [
          ["Grade 9", "30", "50", "80"],
          ["Grade 10", "42", "78", "120"],
          ["Total", "72", "128", "200"],
        ],
        highlight: [
          [1, 1],
          [2, 1],
        ],
      },
      steps: [
        {
          say: "The words who plays a sport limit you to the Sport column. Its total is the bottom.",
          show: "$\\text{total} = 72$",
        },
        { say: "Of those 72, count the grade 10 students for the top.", show: "$42$" },
        { say: "Divide and simplify.", show: "$\\frac{42}{72} = \\frac{7}{12}$" },
      ],
      answer: "$\\frac{7}{12}$",
    },
    {
      title: "Given tea",
      problem:
        "A survey asked 160 adults whether they prefer tea or coffee. Of the 70 adults under 30, 28 prefer tea. Of the 90 adults 30 or older, 54 prefer tea. One adult who prefers tea is chosen at random. What is the probability that the adult is under 30?",
      figure: {
        kind: "data",
        chart: "table",
        head: ["", "Tea", "Coffee", "Total"],
        rows: [
          ["Under 30", "28", "42", "70"],
          ["30 or older", "54", "36", "90"],
          ["Total", "82", "78", "160"],
        ],
        highlight: [
          [0, 1],
          [2, 1],
        ],
      },
      steps: [
        {
          say: "The words who prefers tea limit you to tea drinkers. Add them up for the bottom.",
          show: "$28 + 54 = 82$",
        },
        { say: "Of those 82, count the adults under 30 for the top.", show: "$28$" },
        { say: "Divide and simplify.", show: "$\\frac{28}{82} = \\frac{14}{41}$" },
      ],
      answer: "$\\frac{14}{41}$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Grand total",
      text: "When the question says given that or of those, the bottom is that group's total, not everyone. For the sport question, $\\frac{42}{200}$ is wrong.",
    },
    {
      name: "Flipped condition",
      text: "Grade 10 given a sport and a sport given grade 10 are different questions. $\\frac{42}{72}$ and $\\frac{42}{120}$ share a top but not a bottom. The group after given is the bottom.",
    },
    {
      name: "Wrong cell",
      text: "Sometimes the count you need is not in the table. If 64 of 100 are adults, then $100 - 64 = 36$ are not adults. Using the 64 answers a different question.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Divide, then convert",
    steps: [
      "Choose the total by hand: the row or column the question limits you to.",
      "Type the division.",
      "If the choices are fractions, press the fraction button on the result.",
    ],
    type: ["42/72"],
    note: "The screen shows 0.58333, and the fraction button turns it into 7/12. Choosing the total is the whole skill, and the calculator cannot do that part. Use it only for awkward divisions.",
  },
  check: {
    text: "In a class of 30 students, 12 have a pet dog. Of the dog owners, 5 also have a cat. One student is chosen at random from the whole class. What is the probability that the student has both a dog and a cat?",
    choices: ["$\\frac{1}{6}$", "$\\frac{2}{5}$", "$\\frac{5}{12}$", "$\\frac{17}{30}$"],
    right: 0,
    why: "The student comes from the whole class, so there is no limit and the bottom is 30. The top is the 5 with both pets: $\\frac{5}{30} = \\frac{1}{6}$. $\\frac{5}{12}$ shrinks the total to dog owners, but the question did not say given a dog. $\\frac{2}{5}$ is the chance of a dog, and $\\frac{17}{30}$ adds 5 and 12.",
  },
  quiz: [
    {
      text: "At a school fair, 120 people played a ring toss game. Of the 50 children who played, 20 won a prize. Of the 70 adults who played, 21 won a prize. One person who won a prize is chosen at random. What is the probability that the person is a child?",
      choices: ["$\\frac{1}{6}$", "$\\frac{41}{120}$", "$\\frac{2}{5}$", "$\\frac{20}{41}$"],
      right: 3,
      why: "Shrink the total to prize winners: $20 + 21 = 41$. Of those, 20 are children, so the answer is $\\frac{20}{41}$. The tempting $\\frac{2}{5}$ is $\\frac{20}{50}$, the **Flipped condition** trap: it is the chance a child wins. $\\frac{1}{6}$ is $\\frac{20}{120}$, the **Grand total** trap. $\\frac{41}{120}$ is the chance that anyone wins.",
      subject: "math",
    },
    {
      text: "A table shows 300 voters by age group and by whether they voted early. A question asks: if a voter under 40 is chosen at random, what is the probability the voter voted early? What should you do first?",
      choices: [
        "Find the total number of voters under 40.",
        "Find the total number of early voters.",
        "Divide the number of early voters by 300.",
        "Divide the number of early voters under 40 by 300.",
      ],
      right: 0,
      why: "The words if a voter under 40 limit you to that group, so its total is the bottom. Find it first, then divide the early voters under 40 by it. Finding all early voters is the **Flipped condition** trap: that total would answer which age an early voter is. Dividing by 300 is the **Grand total** trap, whichever top you use.",
      subject: "math",
    },
    {
      text: "Of 250 phone owners, 150 use a case. Of the 90 owners with a cracked screen, 36 use a case. Sam is asked: given that an owner uses a case, what is the probability the screen is cracked? He answers $\\frac{36}{90} = \\frac{2}{5}$. Which statement is true?",
      choices: [
        "Sam is right.",
        "Sam flipped the condition; the answer is $\\frac{36}{150} = \\frac{6}{25}$.",
        "Sam should divide by everyone; the answer is $\\frac{36}{250} = \\frac{18}{125}$.",
        "Sam should use every cracked screen; the answer is $\\frac{90}{250} = \\frac{9}{25}$.",
      ],
      right: 1,
      why: "Given that an owner uses a case, the bottom is the 150 case users. Of them, 36 have a cracked screen: $\\frac{36}{150} = \\frac{6}{25}$. Sam divided by the cracked screens, the **Flipped condition** trap; his answer is the chance a cracked phone has a case. $\\frac{18}{125}$ is the **Grand total** trap. $\\frac{9}{25}$ ignores the case completely.",
      subject: "math",
    },
    {
      text: "A club has 25 juniors and 35 seniors. Of them, 10 juniors and 21 seniors play chess. Which question has the answer $\\frac{10}{31}$?",
      choices: [
        "A member is chosen at random. What is the probability the member is a junior who plays chess?",
        "A junior is chosen at random. What is the probability the junior plays chess?",
        "A chess player is chosen at random. What is the probability the player is a junior?",
        "A member is chosen at random. What is the probability the member plays chess?",
      ],
      right: 2,
      why: "A bottom of 31 means the group is chess players: $10 + 21 = 31$. Of them, 10 are juniors, so the question is given a chess player. A junior who plays chess, from all 60 members, is $\\frac{10}{60}$, the Grand total. A junior who plays chess, given a junior, is $\\frac{10}{25}$, the Flipped condition. Plays chess, from everyone, is $\\frac{31}{60}$.",
      subject: "math",
    },
    {
      text: "A park ranger counted 240 birds: 100 sparrows and 140 finches. Of these, 64 sparrows and 80 finches were adults. If a bird that is not an adult is chosen at random, what is the probability that it is a sparrow?",
      choices: ["$\\frac{3}{20}$", "$\\frac{9}{25}$", "$\\frac{3}{8}$", "$\\frac{4}{9}$"],
      right: 2,
      why: "Shrink the total to birds that are not adults. Subtract first: $100 - 64 = 36$ young sparrows and $140 - 80 = 60$ young finches, so 96 in all. The answer is $\\frac{36}{96} = \\frac{3}{8}$. $\\frac{9}{25}$ is $\\frac{36}{100}$, the Flipped condition. $\\frac{3}{20}$ is $\\frac{36}{240}$, the Grand total. $\\frac{4}{9}$ is $\\frac{64}{144}$, the Wrong cell: it uses the adults.",
      subject: "math",
    },
  ],
};

export default lesson;
