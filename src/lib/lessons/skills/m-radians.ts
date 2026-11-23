import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-radians",
  tests:
    "Changing angles between degrees and radians, and using a radian angle to find an arc or a point on the unit circle.",
  spot: "An angle written with $\\pi$ and no degree sign, the word radians, or a circle with a radius of 1.",
  idea: [
    "A **radian** measures an angle by its arc. One radian opens an arc as long as the radius. A full turn is $2\\pi$ radians, so **$\\pi$ radians is 180°**.",
    "To change radians to degrees, replace $\\pi$ with 180 and simplify. To change degrees to radians, divide by 180 and attach $\\pi$.",
    "With the angle in radians, an arc's length is simply the radius times the angle. On the **unit circle**, radius 1, the point at angle $\\theta$ is $(\\cos\\theta, \\sin\\theta)$.",
  ],
  rules: [
    "$\\pi \\text{ radians} = 180^\\circ$",
    "$\\text{radians} = \\text{degrees} \\cdot \\frac{\\pi}{180}$",
    "$\\text{arc} = r\\theta$ ($\\theta$ in radians)",
  ],
  figure: { kind: "circle", angle: 120, show: "unit", radians: true },
  strategy: {
    name: "Swap pi for 180",
    steps: [
      "Radians to degrees: replace $\\pi$ with 180 and simplify.",
      "Degrees to radians: divide by 180, simplify, and attach $\\pi$.",
      "For an arc, change the angle to radians, then use $s = r\\theta$.",
    ],
  },
  examples: [
    {
      title: "To degrees",
      problem: "What is the measure of an angle of $\\frac{5\\pi}{6}$ radians, in degrees?",
      figure: { kind: "circle", angle: 150, show: "unit", radians: true },
      steps: [
        {
          say: "$\\pi$ radians is 180°, so replace $\\pi$ with 180.",
          show: "$\\frac{5 \\cdot 180}{6}$",
        },
        { say: "Simplify.", show: "$\\frac{900}{6} = 150$" },
      ],
      answer: "$150^\\circ$",
      checkIn: {
        text: "What is the measure of an angle of $\\frac{7\\pi}{4}$ radians, in degrees?",
        choices: ["$45^\\circ$", "$630^\\circ$", "$315^\\circ$", "$1.75^\\circ$"],
        right: 2,
        why: "$\\pi$ radians is 180°, so replace $\\pi$ with 180: $\\frac{7 \\cdot 180}{4} = \\frac{1260}{4} = 315$. 630° uses 360 for $\\pi$, but $\\pi$ radians is only half a turn.",
        twin: {
          text: "What is the measure of an angle of $\\frac{2\\pi}{3}$ radians, in degrees?",
          choices: ["$120^\\circ$", "$60^\\circ$", "$240^\\circ$", "$270^\\circ$"],
          right: 0,
          why: "$\\pi$ radians is 180°, so replace $\\pi$ with 180: $\\frac{2 \\cdot 180}{3} = \\frac{360}{3} = 120$. 240° uses 360 for $\\pi$, but $\\pi$ radians is only half a turn.",
        },
      },
    },
    {
      title: "Arc length",
      problem:
        "A circle has a radius of 8. What is the length of the arc cut off by a central angle of $135^\\circ$?",
      figure: { kind: "circle", angle: 135, show: "arc", r: "8" },
      steps: [
        {
          say: "$s = r\\theta$ needs radians, so change 135° first: divide by 180 and attach $\\pi$.",
          show: "$\\frac{135}{180}\\pi = \\frac{3\\pi}{4}$",
        },
        { say: "Arc length is the radius times the angle in radians.", show: "$s = r\\theta$" },
        { say: "Multiply.", show: "$8 \\cdot \\frac{3\\pi}{4} = 6\\pi$" },
      ],
      answer: "$6\\pi$",
      tryFrom: 1,
      checkIn: {
        text: "A circle has a radius of 6. What is the length of the arc cut off by a central angle of $120^\\circ$?",
        choices: ["$720$", "$12\\pi$", "$\\frac{2\\pi}{3}$", "$4\\pi$"],
        right: 3,
        why: "Change 120° to radians first: $\\frac{120}{180}\\pi = \\frac{2\\pi}{3}$. Then $s = r\\theta = 6 \\cdot \\frac{2\\pi}{3} = 4\\pi$. 720 is the **Degrees in the formula** trap: it uses 120 for $\\theta$.",
        twin: {
          text: "A circle has a radius of 10. What is the length of the arc cut off by a central angle of $54^\\circ$?",
          choices: ["$540$", "$3\\pi$", "$15\\pi$", "$\\frac{3\\pi}{10}$"],
          right: 1,
          why: "Change 54° to radians first: $\\frac{54}{180}\\pi = \\frac{3\\pi}{10}$. Then $s = r\\theta = 10 \\cdot \\frac{3\\pi}{10} = 3\\pi$. 540 is the **Degrees in the formula** trap: it uses 54 for $\\theta$.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Flipped factor",
      text: "Going to radians, multiply by $\\frac{\\pi}{180}$; the answer should have $\\pi$ on top. $135 \\cdot \\frac{180}{\\pi}$ is about 7,734, far too big for any angle.",
    },
    {
      name: "Degrees in the formula",
      text: "$s = r\\theta$ works only in radians. Typing 135 for $\\theta$ in the second example gives 1,080 instead of $6\\pi$.",
    },
    {
      name: "Mode does not convert",
      text: "The calculator's degree or radian mode only changes how sin, cos and tan read an angle. It never changes a number from one unit to the other.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Divide by 180",
    steps: [
      "To change degrees to radians, type the degrees over 180.",
      "Press the fraction button on the result, then attach $\\pi$.",
      "For sin or cos of an angle with pi, keep the mode on Radians, the starting mode.",
    ],
    type: ["225/180", "sin(pi/6)"],
    note: "225/180 shows 1.25, which the fraction button turns into 5/4, so 225° is $\\frac{5\\pi}{4}$. In radian mode, sin(pi/6) shows 0.5. By hand is often faster: $\\frac{5\\pi}{6}$ becomes $\\frac{5 \\cdot 180}{6} = 150^\\circ$.",
  },
  check: {
    text: "Which of the following is equivalent to $240^\\circ$?",
    choices: [
      "$\\frac{2\\pi}{3}$ radians",
      "$\\frac{3\\pi}{4}$ radians",
      "$\\frac{4\\pi}{3}$ radians",
      "$\\frac{3\\pi}{2}$ radians",
    ],
    right: 2,
    why: "Divide by 180 and attach $\\pi$: $\\frac{240}{180} = \\frac{4}{3}$, so 240° is $\\frac{4\\pi}{3}$ radians. $\\frac{2\\pi}{3}$ divides by 360 instead of 180. $\\frac{3\\pi}{4}$ is a Flipped factor: it uses $\\frac{180}{240}$. $\\frac{3\\pi}{2}$ is 270°.",
  },
  quiz: [
    {
      text: "A circle has a radius of 12. What is the length of the arc cut off by a central angle of $150^\\circ$?",
      choices: ["$5\\pi$", "$10\\pi$", "$60\\pi$", "$1800$"],
      right: 1,
      why: "Change to radians first: $\\frac{150}{180}\\pi = \\frac{5\\pi}{6}$. Then $s = r\\theta = 12 \\cdot \\frac{5\\pi}{6} = 10\\pi$. The tempting 1800 is the **Degrees in the formula** trap: it multiplies 12 by 150. $60\\pi$ is the sector's area, not the arc. $5\\pi$ takes $\\frac{5}{12}$ of $12\\pi$, leaving out the 2 in $2\\pi r$.",
      subject: "math",
    },
    {
      text: "What should you do first to write an angle of $\\frac{7\\pi}{4}$ radians in degrees?",
      choices: [
        "Multiply by $\\frac{\\pi}{180}$.",
        "Switch the calculator to degree mode.",
        "Replace $\\pi$ with 180.",
        "Replace $\\pi$ with 360.",
      ],
      right: 2,
      why: "$\\pi$ radians is 180°, so replace $\\pi$ with 180: $\\frac{7 \\cdot 180}{4} = 315^\\circ$. Multiplying by $\\frac{\\pi}{180}$ is a Flipped factor; it goes the other way. Switching modes is the **Mode does not convert** trap. 360 is a full turn, which is $2\\pi$, not $\\pi$.",
      subject: "math",
    },
    {
      text: "Jordan changes $72^\\circ$ to radians. He writes $72 \\cdot \\frac{180}{\\pi} = \\frac{12960}{\\pi}$. What is his mistake?",
      choices: [
        "He used the factor upside down; $72 \\cdot \\frac{\\pi}{180} = \\frac{2\\pi}{5}$.",
        "He should divide by 360, so the answer is $\\frac{\\pi}{5}$.",
        "He should switch his calculator to radian mode first.",
        "He should multiply by $2\\pi$, so the answer is $144\\pi$.",
      ],
      right: 0,
      why: "Jordan fell for the Flipped factor. Going to radians, multiply by $\\frac{\\pi}{180}$: $\\frac{72}{180} = \\frac{2}{5}$, so the angle is $\\frac{2\\pi}{5}$. His answer, about 4,125, is far too big for an angle. Dividing by 360 gives half the right answer. Changing the mode is the **Mode does not convert** trap. Multiplying by $2\\pi$ has no basis.",
      subject: "math",
    },
    {
      text: "A calculator is set to degree mode. Which line shows the value of $\\sin\\left(\\frac{\\pi}{6}\\right)$?",
      choices: ["sin(1/6)", "sin(6)", "sin(pi/6)", "sin(30)"],
      right: 3,
      why: "$\\frac{\\pi}{6}$ radians is $\\frac{180}{6} = 30^\\circ$, and in degree mode sin(30) shows 0.5, the right value. The tempting sin(pi/6) reads $\\frac{\\pi}{6}$ as about 0.52 degrees and shows 0.00914, the **Mode does not convert** trap. sin(6) and sin(1/6) drop $\\pi$ and read the wrong angles.",
      subject: "math",
    },
    {
      text: "In a circle, a central angle of $\\frac{2\\pi}{9}$ radians cuts off an arc of length $4\\pi$. What is the radius of the circle?",
      choices: ["$\\frac{\\pi}{10}$", "$\\frac{8\\pi^2}{9}$", "$18$", "$36$"],
      right: 2,
      why: "With the angle in radians, $s = r\\theta$, so $r = \\frac{s}{\\theta} = 4\\pi \\cdot \\frac{9}{2\\pi} = 18$. The tempting $\\frac{\\pi}{10}$ is the **Degrees in the formula** trap: it divides by 40, the angle in degrees. $\\frac{8\\pi^2}{9}$ multiplies the arc by the angle instead of dividing. 36 is the diameter, not the radius.",
      subject: "math",
    },
  ],
};

export default lesson;
