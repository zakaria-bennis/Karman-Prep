import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-reading-graphs",
  tests:
    "Using a bar, line or scatter graph to choose the data that completes a statement or supports a claim.",
  spot: "A graph sits beside a short text, and the question asks which choice most effectively uses data from the graph.",
  idea: [
    "Read the **claim first**. Then read the graph's title, both **axes**, the units and the **key**.",
    "Trend words are exact. **Increased** compares the start and the end. **Steadily** means every step goes the same way. **Peaked** means lower on both sides.",
    "A graph shows what happened, not why, and not what will happen next. A choice that gives a cause goes too far.",
  ],
  rules: ["Claim, then axes and key", "Compare the exact points named", "A graph never shows why"],
  figure: {
    kind: "data",
    chart: "line",
    labels: ["2016", "2018", "2020", "2022", "2024"],
    series: [
      { name: "Print", values: [60, 55, 48, 45, 42] },
      { name: "E-books", values: [10, 18, 30, 34, 40] },
    ],
    yLabel: "Loans (thousands)",
  },
  strategy: {
    name: "Claim, then axes",
    steps: [
      "Read the claim first.",
      "Read the title, both axes, the units and the key.",
      "Find the exact bars, points or lines the claim names. Compare the start and the end.",
      "Test each choice: is it true to the graph, and is it about the claim?",
    ],
  },
  examples: [
    {
      title: "A shrinking gap",
      passage:
        "A town library tracked yearly loans of print books and e-books. A librarian claims that the gap between print loans and e-book loans shrank from 2016 to 2024.",
      problem:
        "Which choice most effectively uses data from the graph to support the librarian's claim?",
      figure: {
        kind: "data",
        chart: "line",
        labels: ["2016", "2018", "2020", "2022", "2024"],
        series: [
          { name: "Print", values: [60, 55, 48, 45, 42] },
          { name: "E-books", values: [10, 18, 30, 34, 40] },
        ],
        yLabel: "Loans (thousands)",
      },
      choices: [
        "E-book loans fell from 40,000 in 2016 to 10,000 in 2024.",
        "Print loans led e-book loans by 50,000 in 2016 but by only 2,000 in 2024.",
        "Print loans rose from 10,000 in 2016 to 40,000 in 2024.",
        "E-book loans grew because more readers bought tablets.",
      ],
      right: 1,
      steps: [
        { say: "Read the claim: the **gap** between the two lines shrank from 2016 to 2024." },
        {
          say: "Read the graph: years across, loans in thousands up, one line for print and one for e-books.",
        },
        {
          say: "Compare the ends. The gap is print minus e-books.",
          show: "$60 - 10 = 50$ and $42 - 40 = 2$",
        },
        {
          say: "Only the 50,000-to-2,000 choice shows the gap at both ends. One choice runs the years backward (reversed comparison), one gives the e-book numbers to print (wrong line or bar), and one claims a cause (overreach).",
        },
      ],
      answer: "Print loans led e-book loans by 50,000 in 2016 but by only 2,000 in 2024.",
    },
    {
      title: "Taking the lead",
      passage:
        "Students counted the birds visiting two schoolyard feeders each week for a month. Feeder A held seed, and Feeder B held suet. A student claims that Feeder A started with fewer birds than Feeder B but ended with more.",
      problem:
        "Which choice most effectively uses data from the graph to support the student's claim?",
      figure: {
        kind: "data",
        chart: "bar",
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        values: [
          [12, 15, 19, 24],
          [20, 18, 16, 14],
        ],
        legend: ["Feeder A", "Feeder B"],
        yLabel: "Birds counted",
        highlight: [0, 3],
      },
      choices: [
        "Feeder A had 12 birds in week 1 and 24 in week 4, while Feeder B went from 20 to 14.",
        "Feeder B had 24 birds in week 4.",
        "Feeder A went from 24 birds in week 1 to 12 in week 4.",
        "Birds moved to Feeder A because they prefer seed to suet.",
      ],
      right: 0,
      steps: [
        {
          say: "Read the claim: Feeder A is **below** Feeder B at the start and **above** it at the end.",
        },
        {
          say: "Read the graph: weeks across, birds counted up, and the key gives one color per feeder.",
        },
        { say: "Find the bars. Week 1: A has 12, B has 20. Week 4: A has 24, B has 14." },
        {
          say: "Only the first choice shows both ends for both feeders. 24 in week 4 belongs to Feeder A (wrong line or bar), the week 1 to week 4 choice runs backward (reversed comparison), and seed versus suet is a cause (overreach).",
        },
      ],
      answer:
        "Feeder A had 12 birds in week 1 and 24 in week 4, while Feeder B went from 20 to 14.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Reversed comparison",
      text: "The choice says higher when it was lower, or runs the years backward. Check which point comes first on the axis.",
    },
    {
      name: "Wrong line or bar",
      text: "The choice mixes up the groups in the key. Match each color to its name before you read any number.",
    },
    {
      name: "Overreach",
      text: "The choice claims a cause or a future the graph cannot show. A graph shows what happened, not why.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Title, axes, key",
    steps: [
      "Read the title, then each axis and its units.",
      "Match each color or line in the key to its name.",
      "Check where the vertical axis starts. If it starts above zero, small changes look big.",
      "Then find only the points the claim names.",
    ],
  },
  check: {
    passage:
      "A line graph shows a lake's water level, in meters, at the start of each month from March to August: 4.0, 4.6, 5.1, 4.8, 4.2 and 3.7. A student claims that the lake's level peaked in May.",
    text: "Which choice most effectively uses data from the graph to support the student's claim?",
    choices: [
      "The level was 4.0 meters in March and 3.7 meters in August.",
      "The level fell from 5.1 meters in March to 4.0 meters in May.",
      "The level rose from 4.0 meters in March to 5.1 in May, then fell each month to 3.7 in August.",
      "The level peaked in May because of melting snow.",
    ],
    right: 2,
    why: "Peaked means lower on both sides. Rising from 4.0 to 5.1 by May, then falling to 3.7, shows May above every other month. March and August alone say nothing about May. Falling from 5.1 to 4.0 runs the months backward (reversed comparison). Melting snow is a cause the graph cannot show (overreach).",
  },
  quiz: [
    {
      passage:
        "A bar graph shows how many students joined two school clubs each year. Robotics: 18 in 2021, 22 in 2022, 27 in 2023. Chess: 25 in 2021, 24 in 2022, 21 in 2023. A teacher claims that the robotics club started out smaller than the chess club but ended up larger.",
      text: "Which choice most effectively uses data from the graph to support the teacher's claim?",
      choices: [
        "The chess club had 25 members in 2023.",
        "The robotics club went from 27 members in 2021 to 18 in 2023.",
        "Robotics had 18 members to chess's 25 in 2021, but 27 to chess's 21 in 2023.",
        "Robotics grew because the school bought new kits.",
      ],
      right: 2,
      why: "The claim compares both clubs at the start and the end. Robotics trailed 18 to 25 in 2021 and led 27 to 21 in 2023, which checks both. Chess had 25 in 2021, not 2023 (wrong line or bar). Going from 27 to 18 runs the years backward (reversed comparison). New kits is a cause the graph cannot show (overreach).",
      subject: "reading",
    },
    {
      passage:
        "A line graph shows monthly visitors to a state park over one year, with one line for weekdays and one for weekends. The vertical axis starts at 2,000 visitors. A writer claims that weekend visits rose faster than weekday visits.",
      text: "A student has read the claim. What should the student do before testing any choice?",
      choices: [
        "Read the key to tell which line shows weekdays and which shows weekends.",
        "Assume the line that ends highest is the weekend line.",
        "Look for a choice that explains why weekends are busier.",
        "Judge which line grew faster by how steep it looks, without reading the axis.",
      ],
      right: 0,
      why: "After the claim come the axes and the key. Reading the key first tells you which line is which, so no number gets pinned on the wrong group. Assuming the highest line is weekends invites the wrong line or bar trap. A choice about why weekends are busier is overreach. With the axis starting at 2,000, steepness alone can mislead.",
      subject: "reading",
    },
    {
      passage:
        "A scatter graph shows 20 towns. Each point gives a town's number of trees per street and its average summer temperature. Towns with more trees tend to have lower temperatures. A student wrote: “The graph proves that planting trees will cool any town.”",
      text: "What is wrong with the student's sentence?",
      choices: [
        "It reverses the pattern: towns with more trees were warmer.",
        "It reads temperature from the wrong axis.",
        "Nothing is wrong, because it matches the pattern in the graph.",
        "It claims a cause and a future result, but the graph shows only a pattern among 20 towns.",
      ],
      right: 3,
      why: "This is overreach. The graph shows that towns with more trees tend to be cooler, but it cannot show that trees cause the cooling or that planting trees will cool any town. The sentence does not reverse the pattern: more trees still goes with cooler. It does not misread an axis. It goes beyond the pattern, so something is wrong.",
      subject: "reading",
    },
    {
      passage:
        "A line graph shows a city's yearly bus riders from 2019 to 2024: 50,000 in 2019, then 30,000, 34,000, 38,000, 42,000 and 46,000 in 2024.",
      text: "Which claim does the graph support?",
      choices: [
        "Ridership increased steadily from 2019 to 2024.",
        "Ridership rose every year from 2020 to 2024 but stayed below its 2019 level.",
        "Ridership peaked in 2024.",
        "Ridership fell in 2020 because of a fare increase.",
      ],
      right: 1,
      why: "Test the trend words against the exact points. From 30,000 in 2020 to 46,000 in 2024, ridership rose every year, and 46,000 is still below 50,000. Increased steadily from 2019 fails, since 2019 to 2020 dropped and 2024 ends lower than 2019. The peak was 2019, not 2024, a reversed comparison. A fare increase is a cause the graph cannot show (overreach).",
      subject: "reading",
    },
    {
      passage:
        "A researcher graphed the share of a country's electricity that came from wind and from coal in 2010, 2015 and 2020. Wind: 5%, 12% and 24%. Coal: 45%, 36% and 25%. The researcher claims that by 2020, wind had nearly matched coal as a source of electricity.",
      text: "Which choice most effectively uses data from the graph to support the researcher's claim?",
      choices: [
        "Wind rose from 5% to 24% while coal fell from 45% to 25%, leaving them 1 point apart in 2020.",
        "Coal fell from 45% in 2010 to 36% in 2015.",
        "Wind supplied 45% of the country's electricity in 2010, and coal supplied 5%.",
        "Wind grew because new turbines became cheaper to build.",
      ],
      right: 0,
      why: "The claim is about 2020: wind nearly equal to coal. Wind at 24% and coal at 25% in 2020 are 1 point apart, which proves it. Coal from 2010 to 2015 is true but stops before 2020, so it cannot show the near match. Wind at 45% swaps the two lines (wrong line or bar). Cheaper turbines is a cause the graph cannot show (overreach).",
      subject: "reading",
    },
  ],
};

export default lesson;
