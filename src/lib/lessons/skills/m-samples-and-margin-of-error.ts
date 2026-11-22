import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-samples-and-margin-of-error",
  tests:
    "Deciding what a sample's result says about the whole population: the estimate, the range a margin of error gives, and which group the result applies to.",
  spot: "A survey or sample of some people or things, a percent or a mean, and the words margin of error, estimate, plausible, or population.",
  idea: [
    "A **random sample** lets you estimate the whole group it was drawn from. A sample that is not random, such as volunteers, may be biased.",
    "The **margin of error** gives a range: the estimate minus the margin, up to the estimate plus the margin. The true value is likely, not certain, to be inside.",
    "A result applies only to the **population sampled**. A survey of one town says nothing sure about another town.",
    "A **larger** random sample gives a smaller margin of error.",
  ],
  rules: [
    "Range: estimate $\\pm$ margin",
    "Count: rate $\\times$ population",
    "Larger random sample: smaller margin",
  ],
  figure: { kind: "sample", random: true, estimate: "56%", margin: "±4%", label: "400 voters" },
  strategy: {
    name: "Range and reach",
    steps: [
      "Check the sample: was it chosen at random, and from which group?",
      "Build the range: the estimate minus the margin, up to the estimate plus the margin.",
      "To estimate a count, multiply the sample's rate by the population's size.",
      "Keep the claim inside the range and inside the group sampled. Exactly, all and certainly are too strong.",
    ],
  },
  examples: [
    {
      title: "Plausible range",
      problem:
        "A random sample of 400 voters in Pine City found that 56% support a new park. The margin of error is 4 percentage points. Which conclusion is best supported?",
      choices: [
        "Exactly 56% of all Pine City voters support the park.",
        "It is plausible that between 54% and 58% of all Pine City voters support the park.",
        "It is plausible that between 52% and 60% of all Pine City voters support the park.",
        "It is plausible that between 52% and 60% of all voters in the state support the park.",
      ],
      right: 2,
      figure: {
        kind: "sample",
        random: true,
        estimate: "56%",
        margin: "±4%",
        label: "400 voters",
      },
      steps: [
        {
          say: "Check the sample. It is random and drawn from Pine City voters, so it can speak for Pine City voters, and only for them.",
        },
        {
          say: "Build the range: take the margin off the estimate, then add it on.",
          show: "$56\\% - 4\\% = 52\\%$ and $56\\% + 4\\% = 60\\%$",
        },
        {
          say: "Cross out the rest. Exactly is too sure, 54% to 58% uses only half the margin, and the state is outside the group sampled.",
        },
      ],
      answer: "Between 52% and 60% of all Pine City voters",
    },
    {
      title: "Estimate a count",
      problem:
        "A random sample of 250 of the 3,000 students at a college found that 18% walk to class. Based on the sample, about how many of the college's students walk to class?",
      steps: [
        {
          say: "Check the sample. It is random and drawn from this college, so its rate can stand for all 3,000 students.",
        },
        {
          say: "Multiply the sample's rate by the population's size, not the sample's size.",
          show: "$0.18 \\times 3000 = 540$",
        },
        {
          say: "Say it as an estimate: about 540 students, not exactly 540.",
          show: "$\\approx 540$",
        },
      ],
      answer: "$540$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Too sure",
      text: "The estimate is not exact, and the true value is only likely to be in the range. Choices with exactly, all, every or certainly claim too much.",
    },
    {
      name: "Wrong population",
      text: "A sample speaks only for the group it was drawn from. A survey of one gym's members says nothing sure about all adults. For a count, multiply by the population, not the sample.",
    },
    {
      name: "Not random",
      text: "Volunteers, or the first people you meet, are not a random sample, so their result may be biased. A bigger sample of volunteers is still biased.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Only the arithmetic",
    steps: [
      "Read the setup by hand: who was sampled, and how.",
      "Use the calculator only for the ends of the range or for a count.",
    ],
    type: ["56-4", "56+4", "0.18*3000"],
    note: "This skill is about reading the setup, so by hand is usually faster. The calculator saves a little time only on a count, such as 18% of 3,000.",
  },
  check: {
    text: "A random sample of a town's adults found that 62% recycle every week. The margin of error is 3 percentage points. Which is a plausible value for the percent of all the town's adults who recycle every week?",
    choices: ["$3\\%$", "$56\\%$", "$64\\%$", "$68\\%$"],
    right: 2,
    why: "Build the range: $62 - 3 = 59$ and $62 + 3 = 65$, so plausible values run from 59% to 65%. Only 64% is inside. 56% and 68% take the margin twice on one side. 3% is the margin itself, not a value for the town.",
  },
  quiz: [
    {
      text: "A random sample of 200 of the 4,500 trees in a forest found that 16% have a leaf disease. Based on the sample, about how many trees in the forest have the disease?",
      choices: ["$32$", "$72$", "$720$", "$3{,}780$"],
      right: 2,
      why: "Multiply the sample's rate by the population: $0.16 \\times 4500 = 720$. The tempting 32 is $0.16 \\times 200$, the Wrong population trap: it counts only the sample. 72 slips a decimal place, using 0.016. 3,780 is the number of trees without the disease.",
      subject: "math",
    },
    {
      text: "A random sample of 500 adults in a county found that 38% ride a bus each week, with a margin of error of 5 percentage points. A question asks for the largest plausible number of the county's 20,000 adults who ride a bus each week. What should you do first?",
      choices: [
        "Multiply 0.38 by 500.",
        "Multiply 0.38 by 20,000.",
        "Subtract the margin from the estimate to get 33%.",
        "Add the margin to the estimate to get 43%.",
      ],
      right: 3,
      why: "The largest plausible rate is the top of the range, $38 + 5 = 43$ percent, so build that first. Then $0.43 \\times 20000 = 8600$ adults. Multiplying 0.38 by 20,000 gives the estimate, not the largest plausible value. Subtracting gives the smallest. Multiplying by 500 is the Wrong population trap: it counts riders in the sample only.",
      subject: "math",
    },
    {
      text: "A news site asked its readers to vote online on whether the town should build a pool. Of the 2,000 readers who voted, 81% said yes. Jordan concludes that about 81% of the town's adults want the pool. What is wrong with his conclusion?",
      choices: [
        "A sample of 2,000 is too small to say anything about a town.",
        "The readers chose to vote, so the sample is not random and may be biased.",
        "He should have used 19%, the share who said no.",
        "He left out the margin of error, and adding one would make the conclusion sound.",
      ],
      right: 1,
      why: "Check the sample first: readers who chose to vote are volunteers, the Not random trap. People who care about a pool are more likely to vote, so 81% may be far from the town's view. 2,000 is not small. 19% answers a different question. A margin of error only means something for a random sample, so it cannot fix a biased one.",
      subject: "math",
    },
    {
      text: "A researcher plans to survey a city's adults about a new bus route. Which plan would most likely give the smallest margin of error?",
      choices: [
        "Survey 1,200 adults chosen at random from the city.",
        "Survey 1,200 adults who volunteer online.",
        "Survey 400 adults chosen at random from the city.",
        "Survey 400 adults chosen at random from one neighborhood.",
      ],
      right: 0,
      why: "A larger random sample gives a smaller margin of error, so 1,200 adults chosen at random wins. 1,200 volunteers is the Not random trap: size does not fix bias, and a margin of error assumes a random sample. 400 at random is a smaller sample with a bigger margin. One neighborhood is the Wrong population for a question about the whole city.",
      subject: "math",
    },
    {
      text: "A researcher chose 120 of the 900 students at Lakeside High School at random and asked how many hours they sleep on school nights. The sample mean was 7.1 hours, with a margin of error of 0.3 hours. Which conclusion is best supported?",
      choices: [
        "The mean for all students at Lakeside High is exactly 7.1 hours.",
        "The mean for all high school students in the country is plausibly between 6.8 and 7.4 hours.",
        "The mean for all students at Lakeside High is plausibly between 6.8 and 7.4 hours.",
        "Every student at Lakeside High sleeps between 6.8 and 7.4 hours.",
      ],
      right: 2,
      why: "Range and reach: $7.1 - 0.3 = 6.8$ and $7.1 + 0.3 = 7.4$, and the sample came from Lakeside High, so the range is for that school's mean. The whole country is the Wrong population. Exactly 7.1 is Too sure. Every student is also Too sure: the range is for the mean, and single students vary far more.",
      subject: "math",
    },
  ],
};

export default lesson;
