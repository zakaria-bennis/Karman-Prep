import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-mean-median-and-spread",
  tests:
    "Finding the mean and median of a data set, seeing how they change when a value is added, removed or replaced, and comparing spread.",
  spot: "The words mean, average, median, range or standard deviation, often with a value that is added, removed or changed.",
  idea: [
    "The **mean** is the sum divided by the count. The **median** is the middle value once the data are in order; with an even count, it is the mean of the two middle values.",
    "A value far from the rest, an **outlier**, pulls the mean toward it. The median barely moves.",
    "Range is the largest value minus the smallest. **Standard deviation** measures how far values typically sit from the mean: bunched data have a small one, spread-out data a large one.",
  ],
  rules: [
    "$\\text{mean} = \\frac{\\text{sum}}{\\text{count}}$",
    "$\\text{sum} = \\text{mean} \\cdot \\text{count}$",
    "Median: sort, then take the middle",
    "$\\text{range} = \\text{max} - \\text{min}$",
  ],
  figure: {
    kind: "data",
    chart: "dot",
    values: [12, 15, 15, 18, 20, 22, 45],
    showMean: true,
    showMedian: true,
  },
  strategy: {
    name: "Sort and use sums",
    steps: [
      "Put the values in order and count them.",
      "Median: find the middle value, or the mean of the two middle values.",
      "Mean: think in sums. The sum is the mean times the count.",
      "When a value changes, update the sum and the count, then divide again.",
    ],
  },
  examples: [
    {
      title: "Removing a value",
      problem:
        "A data set is 12, 15, 15, 18, 20, 22, 45. If the value 45 is removed, by how much does the mean decrease?",
      figure: { kind: "data", chart: "dot", values: [12, 15, 15, 18, 20, 22, 45], showMean: true },
      steps: [
        {
          say: "Find the sum, then the mean of all 7 values.",
          show: "$147 \\div 7 = 21$",
        },
        {
          say: "Remove 45: take it off the sum, and take 1 off the count.",
          show: "$147 - 45 = 102, \\quad 7 - 1 = 6$",
        },
        { say: "Divide again for the new mean.", show: "$102 \\div 6 = 17$" },
        {
          say: "Compare. The mean drops 4, while the median only moves from 18 to 16.5.",
          show: "$21 - 17 = 4$",
        },
      ],
      answer: "$4$",
    },
    {
      title: "A missing value",
      problem:
        "The mean of five test scores is 84. Four of the scores are 78, 85, 90 and 81. What is the fifth score?",
      steps: [
        { say: "Turn the mean into a sum: mean times count.", show: "$84 \\cdot 5 = 420$" },
        { say: "Add the four scores you know.", show: "$78 + 85 + 90 + 81 = 334$" },
        { say: "The rest of the sum is the missing score.", show: "$420 - 334 = 86$" },
      ],
      answer: "$86$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Unsorted median",
      text: "The median is the middle of the sorted list. Taking the middle of the list as it is written usually gives the wrong number.",
    },
    {
      name: "Wrong count",
      text: "When a value is added, removed or missing, the count changes. Multiply or divide by the right count, and recount before you find a new median: the middle moves.",
    },
    {
      name: "Spread is not size",
      text: "Standard deviation measures spread, not how big the values are. The set 101, 102, 103 has a much smaller standard deviation than 10, 50, 90.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Type a list",
    steps: [
      "Type the data as a list in square brackets.",
      "Type mean and median of the list.",
      "For a change, type the new list as B and compare. For spread, use stdev on both lists.",
    ],
    type: ["A=[12,15,15,18,20,22,45]", "mean(A)", "median(A)", "B=[12,15,15,18,20,22]", "mean(B)"],
    note: "The screen shows 21, 18 and then 17. The median of a short sorted list is faster by hand. For the mean of six or more numbers, the list is safer. Curly braces do not make a list.",
  },
  check: {
    text: "The data set 4, 7, 7, 9, 13 gets one more value, 16. What happens to the mean and the median?",
    choices: [
      "The mean and the median both increase.",
      "Only the mean increases; the median stays the same.",
      "Only the median increases; the mean stays the same.",
      "Neither the mean nor the median changes.",
    ],
    right: 0,
    why: "Before, the sum is 40, so the mean is 8, and the median is 7. After adding 16, the sum is 56 over 6 values, a mean of about 9.33. With 6 values, the median is the mean of 7 and 9, which is 8. Both rise. Picking only the mean is the **Wrong count** trap: the count changed, so the middle moved.",
  },
  quiz: [
    {
      text: "The mean of 6 numbers is 15. Five of the numbers are 12, 18, 9, 20 and 14. What is the sixth number?",
      choices: ["$2$", "$14.6$", "$15$", "$17$"],
      right: 3,
      why: "Turn the mean into a sum: $15 \\cdot 6 = 90$. The five known numbers add to 73, so the sixth is $90 - 73 = 17$. The tempting $2$ is the Wrong count: it multiplies by 5 instead of 6, leaving the missing number out of the count. $14.6$ is the mean of the five known numbers, and $15$ assumes the missing number equals the mean.",
      subject: "math",
    },
    {
      text: "A data set is 31, 18, 25, 40, 22, 18, 36. What should you do first to find the median?",
      choices: [
        "Take the fourth number, 40, since it is in the middle of the list.",
        "Add the numbers and divide by 7.",
        "Put the numbers in order from least to greatest.",
        "Subtract the smallest number from the largest.",
      ],
      right: 2,
      why: "Sort first. In order, the numbers are 18, 18, 22, 25, 31, 36, 40, and the fourth of the 7 is the median, 25. Taking 40 because it sits fourth in the list as written is the **Unsorted median** trap. Adding and dividing by 7 finds the mean, about 27.1. Subtracting the smallest from the largest finds the range, 22.",
      subject: "math",
    },
    {
      text: "A data set is 2, 5, 8, 10, 14, 26. Sam removes 26 and says the median is still 9, because removing the largest value never changes the median. What is the new median?",
      choices: ["$7.8$", "$8$", "$9$", "$10$"],
      right: 1,
      why: "Recount after the change. Without 26, there are 5 values: 2, 5, 8, 10, 14. The middle one, the third, is 8. Sam's $9$ is the **Wrong count** trap: with 6 values the median was the mean of 8 and 10, but removing a value moved the middle. $10$ is the fourth value, the old middle spot, and $7.8$ is the new mean.",
      subject: "math",
    },
    {
      text: "Set A is 101, 102, 103, 104, 105. Set B is 20, 40, 60, 80, 100. Which statement is true?",
      choices: [
        "Set A has the larger mean; set B has the larger standard deviation.",
        "Set A has the larger mean and the larger standard deviation.",
        "Set B has the larger mean and the larger standard deviation.",
        "Set A has the larger mean; the sets have the same standard deviation.",
      ],
      right: 0,
      why: "Mean is about size; standard deviation is about spread. Set A's mean is 103 and set B's is 60, so A's mean is larger. But A's values sit within 2 of their mean, while B's sit as far as 40 from theirs, so B is far more spread out. Giving A the larger standard deviation is the **Spread is not size** trap. Both sets are evenly spaced, but B's steps are 20 and A's are 1, so their spreads differ.",
      subject: "math",
    },
    {
      text: "A data set of 9 values has a mean of 30 and a median of 28. Its largest value, 70, is replaced with 34. Which statement about the new data set is true?",
      choices: [
        "The mean decreases by 36, and the median is unchanged.",
        "The mean and the median are both unchanged.",
        "The mean decreases by 4, and the median is unchanged.",
        "The mean decreases by 4, and the median decreases.",
      ],
      right: 2,
      why: "Use sums. The old sum is $9 \\cdot 30 = 270$. Swapping 70 for 34 lowers it by 36, to 234, so the new mean is $\\frac{234}{9} = 26$, down 4. The count stays 9, and 34 is still above the median of 28, so the middle value does not move. The tempting drop of 36 is the Wrong count: it forgets to divide by 9. A falling median assumes it follows the mean, and no change at all ignores the new sum.",
      subject: "math",
    },
  ],
};

export default lesson;
