import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-scatterplots",
  tests:
    "Using a scatterplot's line of best fit to predict a value, to find how far a point sits from the line, and to say what the slope and intercept mean.",
  spot: "Dots on a graph with a line drawn through them, or the line's equation, and a question that asks what the line predicts or what a number in it means.",
  idea: [
    "A **line of best fit** runs through the middle of the dots. It shows the trend, not every point.",
    "To **predict**, put the given x-value into the line's equation. Read the line, not the nearest dot.",
    "The **slope** is the predicted change in y for each 1 unit of x. The y-intercept is the predicted y when x is 0.",
    "A **residual** is actual minus predicted. A dot above the line has a positive residual, and a dot below it has a negative one.",
  ],
  rules: [
    "Predict: put x into the line",
    "Slope: change in y for each 1 of x",
    "$\\text{residual} = \\text{actual} - \\text{predicted}$",
  ],
  figure: {
    kind: "data",
    chart: "scatter",
    points: [
      [1, 59],
      [2, 59],
      [3, 68],
      [4, 72],
      [5, 77],
      [6, 83],
      [7, 84],
      [8, 94],
    ],
    fit: [5, 52],
    xLabel: "hours",
    yLabel: "score",
  },
  strategy: {
    name: "Plug into the line",
    steps: [
      "Find the line: its equation, or two points on it.",
      "Put the given x into the line and work out the predicted y.",
      "For a residual, subtract: actual minus predicted.",
      "For a meaning, read the slope as per 1 unit of x and the intercept as the value when x is 0.",
    ],
  },
  examples: [
    {
      title: "Predict a score",
      problem:
        "The scatterplot shows how many hours 8 students practiced and their quiz scores. The line of best fit is $y = 5x + 52$. What score does the line predict for a student who practices 6.5 hours?",
      figure: {
        kind: "data",
        chart: "scatter",
        points: [
          [1, 59],
          [2, 59],
          [3, 68],
          [4, 72],
          [5, 77],
          [6, 83],
          [7, 84],
          [8, 94],
        ],
        fit: [5, 52],
        xLabel: "hours",
        yLabel: "score",
      },
      steps: [
        { say: "The prediction comes from the line, so use its equation.", show: "$y = 5x + 52$" },
        { say: "Put in the given hours for x.", show: "$y = 5(6.5) + 52$" },
        { say: "Multiply, then add.", show: "$y = 32.5 + 52 = 84.5$" },
      ],
      answer: "$84.5$",
    },
    {
      title: "Find a residual",
      problem:
        "For 10 houses, the line of best fit is $y = 12x + 40$, where x is the floor area in hundreds of square feet and y is the price in thousands of dollars. A house with 15 hundred square feet sold for 205 thousand dollars. What is the residual for this house?",
      steps: [
        {
          say: "Find the predicted price: put 15 into the line.",
          show: "$12(15) + 40 = 220$",
        },
        { say: "Subtract: actual minus predicted.", show: "$205 - 220 = -15$" },
        {
          say: "The minus sign means the house sold for less than the line predicts, so its dot sits below the line.",
          show: "$\\text{residual} = -15$",
        },
      ],
      answer: "$-15$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Nearest dot",
      text: "A prediction comes from the line, not from the dot closest to that x. The dots scatter around the line, and the line is the model.",
    },
    {
      name: "Residual backward",
      text: "A residual is actual minus predicted. Predicted minus actual flips the sign, and the flipped answer is almost always a choice.",
    },
    {
      name: "Too far out",
      text: "A line is trusted only near the data. If practice runs from 1 to 8 hours, a prediction for 40 hours is not reliable, because the trend may not hold there.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Fit, then evaluate",
    steps: [
      "To find the line yourself, add a table and type the points into $x_1$ and $y_1$.",
      "On a new line, type the fit with ~ and read m and b under it.",
      "To predict, type the line as f(x) and then f of the given x.",
    ],
    type: ["y1~m x1+b", "f(x)=5x+52", "f(6.5)"],
    note: "For the practice data, the fit shows m = 5 and b = 52, and f(6.5) shows 84.5. When the line is already given, one multiplication by hand is just as fast.",
  },
  check: {
    text: "For a group of adults, the line of best fit for hours of sleep x and reaction time y, in milliseconds, is $y = -12x + 380$. What does the number $-12$ mean?",
    choices: [
      "A person who sleeps 0 hours has a predicted reaction time of 12 milliseconds.",
      "Each extra hour of sleep goes with a predicted reaction time 12 milliseconds longer.",
      "Each extra hour of sleep goes with a predicted reaction time 12 milliseconds shorter.",
      "Every person's reaction time drops by exactly 12 milliseconds for each extra hour of sleep.",
    ],
    right: 2,
    why: "The slope is the predicted change in y for each 1 unit of x. It is negative, so the predicted time falls by 12 milliseconds per extra hour. The time at 0 hours is the intercept, 380, not 12. Longer ignores the minus sign. Exactly, for every person, treats the trend as a rule that each dot follows.",
  },
  quiz: [
    {
      text: "The line of best fit for a café's daily sales is $y = 3x - 20$, where x is the outside temperature in degrees and y is the number of cold drinks sold. On a 30-degree day, the café sold 64 cold drinks. What is the residual for that day?",
      choices: ["$-26$", "$-6$", "$6$", "$70$"],
      right: 1,
      why: "Plug into the line, then subtract. The predicted sales are $3(30) - 20 = 70$, and the residual is $64 - 70 = -6$. The tempting 6 is the Residual backward trap: predicted minus actual. 70 is the prediction, not the residual. $-26$ forgets the $-20$ in the line and subtracts 90.",
      subject: "math",
    },
    {
      text: "For used cars of one model, the line of best fit is $y = -1.5x + 24$, where x is the car's age in years and y is its price in thousands of dollars. A 6-year-old car sold for 17 thousand dollars. To find this car's residual, what should you do first?",
      choices: [
        "Subtract 17 from 24.",
        "Put 17 in for y and solve for x.",
        "Find the dot closest to 6 years and read its price.",
        "Put 6 in for x to find the predicted price.",
      ],
      right: 3,
      why: "A residual compares the actual price with the predicted one, so first plug the age into the line: $-1.5(6) + 24 = 15$. Then $17 - 15 = 2$ thousand dollars. Reading the closest dot is the Nearest dot trap: the line makes the prediction. Subtracting 17 from 24 skips the age. Solving for x finds the age the line gives 17 for, a different question.",
      subject: "math",
    },
    {
      text: "The line of best fit $y = 2.5x + 10$ models typing speed y, in words per minute, after x minutes of practice a day. A student who practices 8 minutes a day types 34 words per minute. Maya says this student's residual is $-4$. Which statement is true?",
      choices: [
        "Maya subtracted in the wrong order; the residual is $4$.",
        "Maya forgot to add the 10; the residual is $14$.",
        "Maya should have used the dot nearest 8; the residual is $0$.",
        "Maya is right, because a dot above the line has a negative residual.",
      ],
      right: 0,
      why: "The prediction is $2.5(8) + 10 = 30$, and actual minus predicted is $34 - 30 = 4$. Maya did $30 - 34$, the Residual backward trap. The student beat the prediction, so the dot sits above the line and the residual is positive. 14 subtracts only $2.5(8) = 20$, leaving out the 10. The dot nearest 8 is the student's own dot, which says nothing about the line.",
      subject: "math",
    },
    {
      text: "A scatterplot shows the ages of 30 trees, from 5 to 40 years, and their heights in meters. The line of best fit is $y = 0.4x + 2$. Which question can the line answer best?",
      choices: [
        "How tall is a 150-year-old tree likely to be?",
        "Exactly how tall is the 20-year-old tree in the data?",
        "About how tall is a 25-year-old tree likely to be?",
        "How tall was a tree when it was planted, at age 0?",
      ],
      right: 2,
      why: "A line predicts well inside the data, and 25 years is between 5 and 40: about $0.4(25) + 2 = 12$ meters. 150 years and age 0 are both outside the data, the Too far out trap. The exact height of one tree in the data is that tree's dot, which can sit above or below the line, so the line gives only an estimate.",
      subject: "math",
    },
    {
      text: "A scatterplot shows the number of pages x in 12 books and the time y, in hours, a reader took to finish each one. The line of best fit is $y = 0.03x + 1.2$. Based on the line, how many more hours does the reader take to finish a 400-page book than a 250-page book?",
      choices: ["$4.5$", "$5.7$", "$8.7$", "$13.2$"],
      right: 0,
      why: "Use the slope: each extra page adds a predicted 0.03 hours. The books differ by $400 - 250 = 150$ pages, and $0.03(150) = 4.5$ hours. Check by plugging into the line twice: $13.2 - 8.7 = 4.5$. 13.2 and 8.7 are the two predictions, not the difference. 5.7 adds the intercept to the difference, but the intercept cancels when you subtract.",
      subject: "math",
    },
  ],
};

export default lesson;
