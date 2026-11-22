import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-reading-data-displays",
  tests:
    "Reading values from dot plots, frequency tables, histograms and box plots, and using them to find a mean, a median or a range, or to compare two sets.",
  spot: "A chart or table of data: dots stacked over numbers, bars over ranges of values, or a box with whiskers, with a question about the mean, median, range or how many.",
  idea: [
    "In a **dot plot** or a frequency table, each value counts as many times as it appears. The number of data points is the number of dots, not the number of different values.",
    "To find a mean, **weight** each value: multiply it by its count, add the products, and divide by the total count. For the median, count to the middle data point.",
    "A **box plot** shows five numbers: minimum, first quartile, median, third quartile and maximum. It does not show the mean.",
    "A **histogram** shows how many values fall in each bin, but not the exact values.",
  ],
  rules: [
    "Mean: multiply, add, divide by the count",
    "Median: the middle data point, by count",
    "Box plot: min, $Q_1$, median, $Q_3$, max",
  ],
  figure: {
    kind: "data",
    chart: "dot",
    values: [0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
    showMean: true,
    showMedian: true,
  },
  strategy: {
    name: "Count, then weight",
    steps: [
      "Read what each mark stands for: one data point, a count, or a bin.",
      "Add the counts to get the total number of data points.",
      "Median: count up to the middle data point, or the two middle ones.",
      "Mean: multiply each value by its count, add, and divide by the total.",
    ],
  },
  examples: [
    {
      title: "Weighted mean",
      problem:
        "The dot plot shows how many books each student in a club read last month. What is the mean number of books read?",
      figure: {
        kind: "data",
        chart: "dot",
        values: [0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
      },
      steps: [
        {
          say: "Count the dots above each value. Each dot is one student.",
          show: "$2 + 5 + 6 + 4 + 3 = 20$",
        },
        {
          say: "Weight each value by its count, then add.",
          show: "$0(2) + 1(5) + 2(6) + 3(4) + 4(3) = 41$",
        },
        { say: "Divide by the number of students.", show: "$\\frac{41}{20} = 2.05$" },
      ],
      answer: "$2.05$",
      checkIn: {
        text: "The dot plot shows how many goals each player on a team scored this season. What is the mean number of goals scored?",
        figure: {
          kind: "data",
          chart: "dot",
          values: [0, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
        },
        choices: ["$2$", "$4$", "$2.5$", "$3$"],
        right: 2,
        why: "There are $1 + 3 + 5 + 7 + 4 = 20$ players. Weight each value by its count: $0(1) + 1(3) + 2(5) + 3(7) + 4(4) = 50$, and $\\frac{50}{20} = 2.5$. 2 is the **Averaging the labels** trap: it averages 0 to 4 and ignores the counts.",
        twin: {
          text: "The dot plot shows how many times each student in a group visited the library last week. What is the mean number of visits?",
          figure: { kind: "data", chart: "dot", values: [1, 1, 2, 3, 3, 4, 4, 4, 4, 5] },
          choices: ["$3.1$", "$3$", "$2$", "$4$"],
          right: 0,
          why: "There are $2 + 1 + 2 + 4 + 1 = 10$ students. Weight each value by its count: $1(2) + 2(1) + 3(2) + 4(4) + 5(1) = 31$, and $\\frac{31}{10} = 3.1$. 3 is the **Averaging the labels** trap: it averages 1 to 5 and ignores the counts.",
        },
      },
    },
    {
      title: "Median by count",
      problem:
        "The table shows how many pets each of several families owns. What is the median number of pets?",
      figure: {
        kind: "data",
        chart: "table",
        head: ["Pets", "Families"],
        rows: [
          ["0", "4"],
          ["1", "5"],
          ["2", "3"],
          ["3", "2"],
          ["4", "1"],
        ],
        highlight: [
          [1, 0],
          [1, 1],
        ],
      },
      steps: [
        {
          say: "Add the counts to find how many families there are.",
          show: "$4 + 5 + 3 + 2 + 1 = 15$",
        },
        { say: "With 15 data points, the median is the 8th.", show: "$\\frac{15 + 1}{2} = 8$" },
        {
          say: "Count up: the 4 zeros fill spots 1 to 4, and the 5 ones fill spots 5 to 9. The 8th is a 1.",
          show: "$\\text{median} = 1$",
        },
      ],
      answer: "$1$",
      tryFrom: 1,
      checkIn: {
        text: "The table shows how many siblings each student in a class has. What is the median number of siblings?",
        figure: {
          kind: "data",
          chart: "table",
          head: ["Siblings", "Students"],
          rows: [
            ["0", "1"],
            ["1", "2"],
            ["2", "3"],
            ["3", "4"],
            ["4", "6"],
          ],
        },
        choices: ["$4$", "$2$", "$8$", "$3$"],
        right: 3,
        why: "There are $1 + 2 + 3 + 4 + 6 = 16$ students, so the median is the average of the 8th and 9th. Counting up, spots 1 to 6 hold 0, 1 or 2 siblings, and spots 7 to 10 hold 3. Both middle spots are 3. 4 is the **Tallest stack** trap: it is the mode.",
        twin: {
          text: "The table shows how many cars each of several families owns. What is the median number of cars?",
          figure: {
            kind: "data",
            chart: "table",
            head: ["Cars", "Families"],
            rows: [
              ["0", "6"],
              ["1", "3"],
              ["2", "4"],
              ["3", "5"],
              ["4", "1"],
            ],
          },
          choices: ["$0$", "$2$", "$10$", "$4$"],
          right: 1,
          why: "There are $6 + 3 + 4 + 5 + 1 = 19$ families, so the median is the 10th. The 6 zeros fill spots 1 to 6, the 3 ones fill spots 7 to 9, and the 2s start at spot 10. 0 is the **Tallest stack** trap: it is the mode.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Averaging the labels",
      text: "For the book club, averaging the values 0 to 4 gives 2, and averaging the counts gives 4. Neither is the mean, 2.05. Each value must be weighted by its count.",
    },
    {
      name: "Tallest stack",
      text: "The value with the most dots is the mode, not the median. Count to the middle data point instead.",
    },
    {
      name: "Mean in the box",
      text: "A box plot's middle line is the median. You cannot read the mean from a box plot, and a wider box means more spread, not more data.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Rebuild the data",
    steps: [
      "Type the values as one list and the counts as another.",
      "Rebuild every data point with repeat.",
      "Type mean and median of the new list.",
    ],
    type: ["v=[0,1,2,3,4]", "c=[2,5,6,4,3]", "D=repeat(v,c)", "mean(D)", "median(D)"],
    note: "The screen shows 2.05 and 2. Box plots and histograms are read by eye, so the calculator does not help there. It helps most with a weighted mean.",
  },
  check: {
    text: "A box plot of test scores shows a minimum of 52, a first quartile of 68, a median of 75, a third quartile of 84 and a maximum of 97. What is the range of the scores?",
    choices: ["$16$", "$22$", "$45$", "$75$"],
    right: 2,
    why: "The range is the maximum minus the minimum: $97 - 52 = 45$. $16$ is $84 - 68$, the width of the box, which holds the middle half of the scores. $22$ runs from the median to the maximum, and $75$ is the median itself.",
  },
  quiz: [
    {
      text: "A frequency table shows how many siblings each of 21 students has. 0 siblings: 1 student. 1 sibling: 2 students. 2 siblings: 7 students. 3 siblings: 6 students. 4 siblings: 5 students. What is the median number of siblings?",
      choices: ["$2$", "$2.57$", "$3$", "$4.2$"],
      right: 2,
      why: "Count, then find the middle. The counts add to 21, so the median is the 11th value. Counting up: 1 zero, 2 ones (to the 3rd), 7 twos (to the 10th), so the 11th value is a 3. The tempting $2$ is the Tallest stack: it has the most students, but that makes it the mode. $2.57$ is the mean, and $4.2$ averages the counts.",
      subject: "math",
    },
    {
      text: "On a quiz, 3 students scored 6, 5 students scored 8 and 2 students scored 10. What should you do first to find the mean score?",
      choices: [
        "Multiply each score by its count: $6(3)$, $8(5)$ and $10(2)$.",
        "Add $6 + 8 + 10$ and divide by 3.",
        "Add $3 + 5 + 2$ and divide by 3.",
        "Take the score that the most students got, 8.",
      ],
      right: 0,
      why: "Weight each value by its count. The products are 18, 40 and 20, which add to 78, and the 10 students give a mean of $\\frac{78}{10} = 7.8$. Adding the three scores and dividing by 3 is the **Averaging the labels** trap: it gives 8 and ignores how many students got each score. Averaging the counts gives about 3.3, which is not even a score. 8 is the most common score, not the mean.",
      subject: "math",
    },
    {
      text: "A box plot of daily high temperatures, in degrees, shows a minimum of 58, a first quartile of 64, a median of 70, a third quartile of 79 and a maximum of 91. Kai says the mean high temperature is 70. What is wrong with his claim?",
      choices: [
        "The mean is the middle of the box, 71.5.",
        "The mean is halfway between the minimum and the maximum, 74.5.",
        "The mean is the average of the five numbers, 72.4.",
        "70 is the median, and a box plot does not show the mean.",
      ],
      right: 3,
      why: "A box plot shows five summary numbers, and its middle line is the median, 70. The mean cannot be read from it, so Kai's claim is the **Mean in the box** trap. Averaging the five numbers gives 72.4, but they are summary points, not the data. Halfway between the ends, 74.5, is the middle of the range, and 71.5 is halfway between the quartiles. Neither is the mean.",
      subject: "math",
    },
    {
      text: "Two box plots show test scores. Class A: minimum 60, first quartile 70, median 78, third quartile 85, maximum 95. Class B: minimum 65, first quartile 72, median 78, third quartile 82, maximum 88. Which statement must be true?",
      choices: [
        "The classes have the same mean score.",
        "The classes have the same median score.",
        "Class B has the larger range of scores.",
        "Class A has more students than Class B.",
      ],
      right: 1,
      why: "Read each box plot's five numbers. Both middle lines sit at 78, so the medians are equal. Saying the means are equal is the **Mean in the box** trap: a box plot shows the median, not the mean. Class A's range is $95 - 60 = 35$ and Class B's is $88 - 65 = 23$, so A's range is larger. A wider box shows more spread, not more students.",
      subject: "math",
    },
    {
      text: "A histogram shows the time 30 students spent on homework one night. 0 to 20 minutes: 3 students. 20 to 40 minutes: 6 students. 40 to 60 minutes: 9 students. 60 to 80 minutes: 12 students. Which interval contains the median time?",
      choices: ["0 to 20 minutes", "20 to 40 minutes", "40 to 60 minutes", "60 to 80 minutes"],
      right: 2,
      why: "Count, then find the middle. The counts add to $3 + 6 + 9 + 12 = 30$, so the median is the mean of the 15th and 16th times. The first two bars hold 9 students, and the third reaches the 18th, so both the 15th and 16th fall from 40 to 60 minutes. The tempting 60 to 80 is the Tallest stack: it has the most students, not the middle one. 20 to 40 ends at the 9th student, and 0 to 20 at the 3rd.",
      subject: "math",
    },
  ],
};

export default lesson;
