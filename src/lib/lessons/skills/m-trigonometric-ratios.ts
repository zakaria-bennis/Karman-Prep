import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-trigonometric-ratios",
  tests:
    "Writing sine, cosine or tangent from a right triangle's sides, using one to find a side, and knowing that sine and cosine swap between the two acute angles.",
  spot: "A right triangle with sin, cos or tan in the question, an angle with one side given, or two angles that add to 90°.",
  idea: [
    "Stand at one acute angle and name the sides. The **opposite** side is across from the angle. The **adjacent** side touches it and is not the hypotenuse.",
    "Each ratio is two of those sides: sine is opposite over hypotenuse, cosine is adjacent over hypotenuse, and tangent is opposite over adjacent. **SOH CAH TOA** keeps them straight.",
    "The two acute angles add to 90°, so they are **complementary**. The side opposite one angle is adjacent to the other, so the sine of one equals the cosine of the other.",
  ],
  rules: [
    "$\\sin = \\frac{\\text{opp}}{\\text{hyp}}$",
    "$\\cos = \\frac{\\text{adj}}{\\text{hyp}}$",
    "$\\tan = \\frac{\\text{opp}}{\\text{adj}}$",
    "$\\sin x^\\circ = \\cos(90 - x)^\\circ$",
  ],
  figure: {
    kind: "triangle",
    angles: [36.87, 53.13, 90],
    sides: ["3", "4", "5"],
    from: 0,
  },
  strategy: {
    name: "Label from the angle",
    steps: [
      "Stand at the angle the question names.",
      "Label the sides: opposite, adjacent, hypotenuse.",
      "Pick the ratio that uses the side you know and the side you want.",
      "Two angles that add to 90°? Their sine and cosine swap.",
    ],
  },
  examples: [
    {
      title: "Name the sides",
      problem:
        "In right triangle $ABC$, angle $C$ is the right angle, $AC = 12$, $BC = 5$ and $AB = 13$. What is $\\cos A$?",
      figure: {
        kind: "triangle",
        angles: [22.62, 67.38, 90],
        sides: ["5", "12", "13"],
        from: 0,
      },
      steps: [
        {
          say: "Stand at angle $A$. The hypotenuse is across from the right angle.",
          show: "$\\text{hyp} = AB = 13$",
        },
        {
          say: "The leg that touches $A$ is adjacent. The leg across from $A$ is opposite.",
          show: "$\\text{adj} = AC = 12,\\ \\text{opp} = BC = 5$",
        },
        { say: "Cosine is adjacent over hypotenuse.", show: "$\\cos A = \\frac{12}{13}$" },
      ],
      answer: "$\\frac{12}{13}$",
    },
    {
      title: "Sine to cosine",
      problem:
        "In right triangle $PQR$, angle $R$ is the right angle and $\\sin P = \\frac{8}{17}$. What is $\\cos Q$?",
      figure: {
        kind: "triangle",
        angles: [28.07, 61.93, 90],
        corners: ["P", "Q", "R"],
        sides: ["8", "15", "17"],
        from: 1,
      },
      steps: [
        {
          say: "Read the sine: the side opposite $P$ is 8 and the hypotenuse is 17.",
          show: "$QR = 8,\\ PQ = 17$",
        },
        { say: "Now stand at $Q$. Side $QR$ touches $Q$, so it is adjacent to $Q$." },
        { say: "Cosine is adjacent over hypotenuse.", show: "$\\cos Q = \\frac{8}{17}$" },
      ],
      answer: "$\\frac{8}{17}$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Wrong corner",
      text: "Opposite and adjacent change when you switch angles. Label the sides from the angle in the question, not from the one nearest the numbers.",
    },
    {
      name: "Flipped ratio",
      text: "Sine and cosine always have the hypotenuse on the bottom, so they are never more than 1. If yours is, it is upside down.",
    },
    {
      name: "Radian mode",
      text: "The calculator starts in radians. In that mode, $20\\sin(35)$ gives about $-8.56$, which cannot be a length. Switch to degrees first.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Switch to degrees first",
    steps: [
      "Click the wrench (settings) and choose Degrees.",
      "Check it: sin(30) should show 0.5.",
      "Type the side as the ratio times the side you know.",
    ],
    type: ["sin(30)", "20sin(35)"],
    note: "With angle $A$ of 35° and hypotenuse 20, the side opposite $A$ is about 11.47. Ratio questions with no angle given, like $\\sin A = \\frac{3}{5}$ so $\\cos B = \\frac{3}{5}$, are faster by hand.",
  },
  check: {
    text: "In right triangle $DEF$, angle $F$ is the right angle, $DF = 20$, $EF = 21$ and $DE = 29$. What is $\\tan D$?",
    choices: ["$\\frac{20}{29}$", "$\\frac{21}{29}$", "$\\frac{20}{21}$", "$\\frac{21}{20}$"],
    right: 3,
    why: "From $D$, the opposite side is $EF = 21$ and the adjacent side is $DF = 20$. Tangent is opposite over adjacent, so $\\tan D = \\frac{21}{20}$. $\\frac{20}{21}$ is a Flipped ratio. $\\frac{21}{29}$ is $\\sin D$ and $\\frac{20}{29}$ is $\\cos D$.",
  },
  quiz: [
    {
      text: "In right triangle $JKL$, angle $L$ is the right angle and $\\cos J = \\frac{7}{25}$. What is $\\sin K$?",
      choices: ["$\\frac{7}{25}$", "$\\frac{7}{24}$", "$\\frac{24}{25}$", "$\\frac{25}{7}$"],
      right: 0,
      why: "The side adjacent to $J$ is 7 and the hypotenuse is 25. That same side, $JL$, is across from $K$, so $\\sin K = \\frac{7}{25}$. The tempting $\\frac{24}{25}$ is Wrong corner: it is $\\sin J$. $\\frac{7}{24}$ is $\\tan K$, which puts the other leg, 24, where the hypotenuse belongs. $\\frac{25}{7}$ is a Flipped ratio.",
      subject: "math",
    },
    {
      text: "In right triangle $ABC$, angle $C$ is the right angle, angle $A$ measures $40^\\circ$, and $AC = 15$. To find $BC$, which equation should you write first?",
      choices: [
        "$\\sin 40^\\circ = \\frac{BC}{15}$",
        "$\\tan 40^\\circ = \\frac{BC}{15}$",
        "$\\cos 40^\\circ = \\frac{BC}{15}$",
        "$\\tan 40^\\circ = \\frac{15}{BC}$",
      ],
      right: 1,
      why: "From $A$, $BC$ is opposite and $AC = 15$ is adjacent. Opposite over adjacent is tangent: $\\tan 40^\\circ = \\frac{BC}{15}$. The tempting sine puts 15 on the bottom as if it were the hypotenuse, but the hypotenuse is $AB$. $\\frac{15}{BC}$ is a Flipped ratio, true for angle $B$ only, a Wrong corner mix-up. Cosine also treats 15 as the hypotenuse.",
      subject: "math",
    },
    {
      text: "In right triangle $ABC$, angle $C$ is the right angle, angle $A$ measures $35^\\circ$, and $AB = 20$. To find $BC$, Nia types 20sin(35) and gets about $-8.56$. What went wrong?",
      choices: [
        "She should use cosine, because $BC$ touches angle $A$.",
        "She should divide: $BC = \\frac{20}{\\sin 35^\\circ}$.",
        "She should type 20sin(55), because $BC$ is across from angle $B$.",
        "Her calculator is in radians; in degrees the same line gives about 11.47.",
      ],
      right: 3,
      why: "Her setup is right: $BC$ is opposite $A$ and $AB$ is the hypotenuse, so $BC = 20\\sin 35^\\circ$. A negative length is the sign of Radian mode; in degrees it is about 11.47. $BC$ does not touch $A$, so cosine is Wrong corner. Dividing gives about 34.9, longer than the hypotenuse. 20sin(55) finds $AC$, not $BC$.",
      subject: "math",
    },
    {
      text: "Which question is faster to answer by hand than with the calculator?",
      choices: [
        "In right triangle $ABC$, angle $C$ is $90^\\circ$ and $\\sin A = \\frac{3}{5}$. What is $\\cos B$?",
        "In a right triangle, an angle of $52^\\circ$ has a hypotenuse of 30. How long is the side opposite it?",
        "In a right triangle, an angle of $28^\\circ$ has an adjacent side of 12. How long is the opposite side?",
        "A right triangle has legs of 7 and 11. What is its smallest angle, to the nearest degree?",
      ],
      right: 0,
      why: "Angles $A$ and $B$ add to 90°, so $\\cos B = \\sin A = \\frac{3}{5}$ with no work at all. The other three need a calculator in degree mode: $30\\sin 52^\\circ \\approx 23.6$, $12\\tan 28^\\circ \\approx 6.4$, and the smallest angle needs the inverse tangent of $\\frac{7}{11}$, about 32°.",
      subject: "math",
    },
    {
      text: "In right triangle $RST$, the right angle is at $T$. If $\\sin R = \\frac{12}{13}$ and $RT = 10$, what is the length of $ST$?",
      choices: ["$\\frac{25}{6}$", "$\\frac{120}{13}$", "$24$", "$26$"],
      right: 2,
      why: "$\\sin R = \\frac{ST}{RS} = \\frac{12}{13}$, so the sides are $12k$, $5k$ and $13k$. $RT$ touches $R$, so it is adjacent: $5k = 10$, $k = 2$, and $ST = 12k = 24$. $\\frac{120}{13}$ treats $RT$ as the hypotenuse. $\\frac{25}{6}$ is Wrong corner: it treats $RT$ as the side opposite $R$. 26 is the hypotenuse, $RS$.",
      subject: "math",
    },
  ],
};

export default lesson;
