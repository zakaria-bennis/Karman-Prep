import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-reading-tables",
  tests:
    "Choosing the figures from a table that complete a statement or support a claim made in the text.",
  spot: "A table sits beside a short text, and the question asks which choice most effectively uses data from the table.",
  idea: [
    "Read the **claim first**, before the table. It tells you which rows and columns matter.",
    "Treat the claim like a **checklist**: which group, which measure, which years, compared with what.",
    "Often two or three choices are true to the table. The right one is also **about the claim** and checks every box.",
  ],
  rules: ["Claim first, then table", "True is not enough", "Check every part of the claim"],
  figure: {
    kind: "data",
    chart: "table",
    head: ["Library", "Visits in 2022", "Visits in 2024"],
    rows: [
      ["Central", "41,000", "38,000"],
      ["Eastside", "12,000", "19,000"],
      ["Riverside", "9,000", "15,000"],
    ],
    highlight: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ],
  },
  strategy: {
    name: "Claim before table",
    steps: [
      "Read the claim first: which group, which measure, compared with what.",
      "Read the table's title, labels and units.",
      "Find only the rows and columns the claim needs.",
      "Test each choice twice: is it true to the table, and does it prove the claim?",
    ],
  },
  examples: [
    {
      title: "Every box",
      passage:
        "A city counted yearly visits to its three libraries. A council member claims that from 2022 to 2024, both smaller branches became busier, even though the Central library lost visitors.",
      problem:
        "Which choice most effectively uses data from the table to support the council member's claim?",
      figure: {
        kind: "data",
        chart: "table",
        head: ["Library", "Visits in 2022", "Visits in 2024"],
        rows: [
          ["Central", "41,000", "38,000"],
          ["Eastside", "12,000", "19,000"],
          ["Riverside", "9,000", "15,000"],
        ],
      },
      choices: [
        "Central had 41,000 visits in 2022, more than Eastside and Riverside combined.",
        "Eastside rose from 12,000 to 19,000 visits and Riverside from 9,000 to 15,000, while Central fell from 41,000 to 38,000.",
        "Eastside rose from 12,000 visits in 2022 to 19,000 in 2024.",
        "Riverside had 15,000 visits in 2022 and 9,000 in 2024.",
      ],
      right: 1,
      steps: [
        {
          say: "Read the claim as a checklist: both small branches **rose**, and Central **fell**, from 2022 to 2024.",
        },
        { say: "Read the table: one row per library, one column per year, counted in visits." },
        {
          say: "Find the cells: Eastside 12,000 to 19,000, Riverside 9,000 to 15,000, Central 41,000 to 38,000.",
        },
        {
          say: "Only one choice checks all three boxes. Eastside alone is half the claim. The Central total is true but irrelevant. The Riverside choice reads the years backward (wrong row or column).",
        },
      ],
      answer:
        "Eastside rose from 12,000 to 19,000 visits and Riverside from 9,000 to 15,000, while Central fell from 41,000 to 38,000.",
    },
    {
      title: "Rise, then dip",
      passage:
        "A baking class let four batches of the same dough rise for different lengths of time before baking. One student concluded that a longer rise made taller loaves, but only up to a point.",
      problem:
        "Which choice most effectively uses data from the table to support the student's conclusion?",
      figure: {
        kind: "data",
        chart: "table",
        head: ["Batch", "Rise time (minutes)", "Loaf height (cm)"],
        rows: [
          ["A", "30", "8"],
          ["B", "60", "11"],
          ["C", "90", "13"],
          ["D", "120", "12"],
        ],
        highlight: [
          [0, 2],
          [1, 2],
          [2, 2],
          [3, 2],
        ],
      },
      choices: [
        "Batch C rose for 90 minutes and reached a height of 13 cm.",
        "Loaf height grew from 8 cm to 13 cm as rise time went from 30 to 90 minutes.",
        "Loaf height grew from 8 cm to 13 cm as rise time went from 30 to 90 minutes, then dipped to 12 cm at 120 minutes.",
        "Batch D rose the longest, for 120 minutes, and made the tallest loaf.",
      ],
      right: 2,
      steps: [
        {
          say: "Read the claim as a checklist: height **grows** with rise time, then **stops** growing.",
        },
        { say: "Read the table: rise time in minutes, height in centimeters, one row per batch." },
        { say: "Find the heights in order of time: 8, 11, 13, then 12. They climb, then dip." },
        {
          say: "Only the choice that climbs to 13 cm and dips to 12 cm checks both boxes. Stopping at 90 minutes is half the claim, Batch C alone is true but irrelevant, and Batch D was not the tallest.",
        },
      ],
      answer:
        "Loaf height grew from 8 cm to 13 cm as rise time went from 30 to 90 minutes, then dipped to 12 cm at 120 minutes.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "True but irrelevant",
      text: "The choice reads the table correctly but does not prove the claim. Ask: if this were the only fact, would the claim be shown?",
    },
    {
      name: "Wrong row or column",
      text: "The right kind of number for the wrong group or the wrong year. Put a finger on the row and the column before you trust a number.",
    },
    {
      name: "Half the claim",
      text: "The choice shows only one side of a comparison, or only the first part of a pattern. Every box on the checklist must be checked.",
    },
  ],
  tip: {
    kind: "reading",
    title: "The claim is a checklist",
    steps: [
      "Underline the group, the measure and the comparison the claim names.",
      "Look only at those rows and columns, and read the units.",
      "Keep the choice that is true to the table and checks every box.",
    ],
  },
  check: {
    passage:
      "A school counted how its students got to school in fall and in winter. Walk: 120 in fall, 90 in winter. Bus: 200 in fall, 230 in winter. Car: 80 in fall, 80 in winter. The principal claims that in winter, fewer students walked and more rode the bus.",
    text: "Which choice most effectively uses data from the table to support the principal's claim?",
    choices: [
      "Car riders stayed at 80 in both seasons.",
      "Bus riders fell from 230 in fall to 200 in winter.",
      "Walkers fell from 120 in fall to 90 in winter.",
      "Walkers fell from 120 to 90, while bus riders rose from 200 to 230.",
    ],
    right: 3,
    why: "The claim has two boxes: fewer walkers and more bus riders. Walkers falling from 120 to 90 while bus riders rose from 200 to 230 checks both. Walkers alone is half the claim. Bus riders falling reads the columns backward (wrong row or column). Car riders staying at 80 is true but irrelevant.",
  },
  quiz: [
    {
      passage:
        "A farmer tested four amounts of fertilizer on plots of corn. Fertilizer of 0 kg gave 50 bushels; 5 kg gave 70 bushels; 10 kg gave 80 bushels; 15 kg gave 75 bushels. The farmer concluded that more fertilizer raised the harvest, but only up to 10 kg.",
      text: "Which choice most effectively uses data from the table to support the farmer's conclusion?",
      choices: [
        "The harvest rose from 50 to 80 bushels as fertilizer went from 0 to 10 kg, then fell to 75 bushels at 15 kg.",
        "The harvest rose from 50 to 80 bushels as fertilizer went from 0 to 10 kg.",
        "The plot with 15 kg of fertilizer had the largest harvest.",
        "The plot with no fertilizer gave 50 bushels.",
      ],
      right: 0,
      why: "The conclusion has two boxes: the harvest rises, then stops rising after 10 kg. Rising from 50 to 80 and then falling to 75 checks both. Stopping at 10 kg is half the claim. The 15 kg plot did not have the largest harvest, 80 bushels did (wrong row or column). The 50-bushel plot is true but irrelevant.",
      subject: "reading",
    },
    {
      passage:
        "A table lists four rivers with their length in miles, their average width in feet and their yearly flow. A student must pick the choice that best supports this claim: the longest river in the table does not carry the most water.",
      text: "What should the student do first?",
      choices: [
        "Read every number in the table before reading the claim.",
        "Find the river with the greatest average width.",
        "Note what the claim compares: length and yearly flow, not width.",
        "Pick the choice with the largest number in it.",
      ],
      right: 2,
      why: "Claim before table: first note what the claim compares, here length and yearly flow, so you know which columns matter. The widest river uses the wrong row or column, since width is not in the claim. Reading every number first wastes time and invites true but irrelevant facts. The largest number may come from any column.",
      subject: "reading",
    },
    {
      passage:
        "A table shows the share of seeds that sprouted. By day 7: Type A 40%, Type B 65%, Type C 90%. By day 14: Type A 70%, Type B 75%, Type C 92%. A researcher claims Type A sprouted slowly at first but nearly caught up with Type B by day 14. A student chose: “Type C had the highest share sprouted on both days.”",
      text: "Why is the student's choice wrong?",
      choices: [
        "It misreads the table: Type C did not have the highest share.",
        "It is true to the table but says nothing about Type A catching up with Type B.",
        "It uses the day 7 column when the claim is only about day 14.",
        "It shows only the first part of the claim, not the second.",
      ],
      right: 1,
      why: "This is the true but irrelevant trap. Type C did lead on both days, but the claim is about Type A and Type B: A trailed B by 25 points on day 7 and by only 5 points on day 14. The choice does not misread the table. The claim needs both days, not only day 14. It shows neither part of the claim, not one part.",
      subject: "reading",
    },
    {
      passage:
        "A table shows sea turtle nests on two beaches. Beach 1: 30 nests in 2020, 45 in 2024. Beach 2: 50 nests in 2020, 40 in 2024. A student wrote: “Beach 2 had more nests than Beach 1 in 2020, but fewer in 2024.”",
      text: "Which claim does the student's sentence support?",
      choices: [
        "Nest counts rose at both beaches from 2020 to 2024.",
        "Beach 2's nest count fell by half from 2020 to 2024.",
        "Beach 2 had the most nests of any beach in the region.",
        "Beach 1 overtook Beach 2 in nest counts between 2020 and 2024.",
      ],
      right: 3,
      why: "The sentence compares the two beaches at both ends: Beach 2 ahead in 2020, behind in 2024. That is exactly Beach 1 overtaking Beach 2. Both beaches rising misreads Beach 2, which fell from 50 to 40 (wrong row or column). Falling from 50 to 40 is a drop of a fifth, not half. The region's other beaches are not in the table.",
      subject: "reading",
    },
    {
      passage:
        "A table shows average daily scooter rentals in four cities. Portside: 800 on weekdays, 1,400 on weekends. Hill City: 500 and 700. Lakemont: 900 and 1,100. Fairview: 300 and 650. A planner claims that, of the four cities, Portside had the largest weekend gain in daily rentals.",
      text: "Which choice most effectively uses data from the table to support the planner's claim?",
      choices: [
        "Portside averaged 800 rentals a day on weekdays and 1,400 on weekends.",
        "Fairview more than doubled, from 300 rentals a day on weekdays to 650 on weekends.",
        "Portside gained 600 rentals a day on weekends, more than Fairview's 350 and the 200 gained in both Hill City and Lakemont.",
        "Portside averaged 1,400 rentals a day on weekdays and 800 on weekends.",
      ],
      right: 2,
      why: "The claim compares Portside's gain with every other city's. Portside's 600 beats Fairview's 350 and the 200 in Hill City and Lakemont, so only that choice checks every box. Portside's numbers alone are half the claim, with no comparison. Fairview doubling is true but irrelevant: it is about growth by a multiple, not the largest gain. Swapping 1,400 and 800 is the wrong row or column.",
      subject: "reading",
    },
  ],
};

export default lesson;
