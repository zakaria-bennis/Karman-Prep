import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-circles",
  tests:
    "Finding an arc's length or a sector's area from its central angle, and using inscribed angles.",
  spot: "A circle with a slice or a curved edge marked, a central angle, or the words arc, sector or inscribed angle.",
  idea: [
    "An arc and a sector are both a **fraction of the whole circle**. The fraction is the central angle over 360°.",
    "An arc is part of the edge, so it is that fraction of the circumference, $2\\pi r$. A sector is part of the inside, so it is that fraction of the area, $\\pi r^2$.",
    "An **inscribed angle** has its corner on the circle. It is half the central angle that opens onto the same arc.",
  ],
  rules: [
    "$\\text{arc} = \\frac{\\theta}{360} \\cdot 2\\pi r$",
    "$\\text{sector} = \\frac{\\theta}{360} \\cdot \\pi r^2$",
    "$\\text{inscribed} = \\frac{1}{2} \\cdot \\text{central}$",
  ],
  figure: { kind: "circle", angle: 72, show: "sector", r: "10" },
  strategy: {
    name: "Fraction of the circle",
    steps: [
      "Find the fraction: the central angle over 360.",
      "Find the whole: $2\\pi r$ for an arc, $\\pi r^2$ for a sector.",
      "Multiply the fraction by the whole.",
      "Working backward? Set the part over the whole equal to the angle over 360.",
    ],
  },
  examples: [
    {
      title: "Sector area",
      problem:
        "A circle has a radius of 10. A sector of the circle has a central angle of 72°. What is the area of the sector?",
      figure: { kind: "circle", angle: 72, show: "sector", r: "10" },
      steps: [
        { say: "Find the fraction of the circle.", show: "$\\frac{72}{360} = \\frac{1}{5}$" },
        { say: "Find the whole area.", show: "$\\pi (10)^2 = 100\\pi$" },
        { say: "Take that fraction of the whole.", show: "$\\frac{1}{5} \\cdot 100\\pi = 20\\pi$" },
      ],
      answer: "$20\\pi$",
      checkIn: {
        text: "A circle has a radius of 6. A sector has a central angle of 60°. What is the area of the sector?",
        choices: ["$2\\pi$", "$36\\pi$", "$6\\pi$", "$12\\pi$"],
        right: 2,
        why: "60° is $\\frac{1}{6}$ of the circle, and the whole area is $\\pi (6)^2 = 36\\pi$, so the sector is $6\\pi$. $2\\pi$ is the arc length, not the area, and $36\\pi$ is the whole circle.",
        twin: {
          text: "A circle has a radius of 4. A sector has a central angle of 90°. What is the area of the sector?",
          choices: ["$4\\pi$", "$2\\pi$", "$16\\pi$", "$8\\pi$"],
          right: 0,
          why: "90° is $\\frac{1}{4}$ of the circle, and the whole area is $\\pi (4)^2 = 16\\pi$, so the sector is $4\\pi$. $2\\pi$ is the arc length, and $16\\pi$ is the whole circle.",
        },
      },
    },
    {
      title: "Working backward",
      problem:
        "In a circle with a radius of 9, an arc has a length of $3\\pi$. What is the arc's central angle?",
      figure: { kind: "circle", angle: 60, show: "arc", r: "9" },
      steps: [
        { say: "Find the whole circumference.", show: "$2\\pi (9) = 18\\pi$" },
        {
          say: "Find the fraction: part over whole.",
          show: "$\\frac{3\\pi}{18\\pi} = \\frac{1}{6}$",
        },
        { say: "The angle is the same fraction of 360°.", show: "$\\frac{1}{6} \\cdot 360 = 60$" },
      ],
      answer: "$60^\\circ$",
      tryFrom: 1,
      checkIn: {
        text: "In a circle with a radius of 10, an arc has a length of $5\\pi$. What is the arc's central angle?",
        choices: ["$18^\\circ$", "$90^\\circ$", "$45^\\circ$", "$36^\\circ$"],
        right: 1,
        why: "The whole circumference is $2\\pi (10) = 20\\pi$, and $\\frac{5\\pi}{20\\pi} = \\frac{1}{4}$, so the angle is $\\frac{1}{4}$ of 360°, which is 90°. 18° compares the arc with the area, $100\\pi$, instead of the circumference.",
        twin: {
          text: "In a circle with a radius of 6, an arc has a length of $2\\pi$. What is the arc's central angle?",
          choices: ["$20^\\circ$", "$120^\\circ$", "$60^\\circ$", "$30^\\circ$"],
          right: 2,
          why: "The whole circumference is $2\\pi (6) = 12\\pi$, and $\\frac{2\\pi}{12\\pi} = \\frac{1}{6}$, so the angle is $\\frac{1}{6}$ of 360°, which is 60°. 20° compares the arc with the area, $36\\pi$, instead of the circumference.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Area or length",
      text: "An arc is a length, so use $2\\pi r$. A sector is an area, so use $\\pi r^2$. Mixing them up is the most common miss, and the wrong answer is always one of the choices.",
    },
    {
      name: "Diameter for radius",
      text: "When the problem gives the diameter, halve it first. A diameter of 12 means $r = 6$.",
    },
    {
      name: "Forgetting the half",
      text: "An inscribed angle is half the central angle on the same arc, not equal to it.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Let the calculator multiply",
    steps: [
      "Type the fraction times the whole, with pi typed as the word pi.",
      "Then type each answer choice and see which one gives the same decimal.",
    ],
    type: ["(72/360)*pi*10^2", "20pi"],
    note: "Both lines show 62.83, so the choice $20\\pi$ matches. With an easy fraction like $\\frac{1}{5}$, working by hand is just as fast.",
  },
  check: {
    text: "A circle has a radius of 6. What is the length of an arc with a central angle of 120°?",
    choices: ["$4\\pi$", "$6\\pi$", "$12\\pi$", "$36\\pi$"],
    right: 0,
    why: "The fraction is $\\frac{120}{360} = \\frac{1}{3}$. The circumference is $2\\pi(6) = 12\\pi$, and a third of it is $4\\pi$. $6\\pi$ is half the circle, $12\\pi$ is the whole circumference, and $36\\pi$ is the area.",
  },
  quiz: [
    {
      text: "A circle has a radius of 4. A sector of the circle has a central angle of 90°. What is the area of the sector?",
      choices: ["$\\pi$", "$2\\pi$", "$4\\pi$", "$16\\pi$"],
      right: 2,
      why: "90° is a quarter of 360°. The whole area is $\\pi(4)^2 = 16\\pi$, and a quarter of it is $4\\pi$. $2\\pi$ is the arc's length, which is a length, not an area; $\\pi$ forgets to square the radius.",
      subject: "math",
    },
    {
      text: "A circle has a diameter of 20. What is the length of an arc with a central angle of 36°?",
      choices: ["$\\pi$", "$2\\pi$", "$4\\pi$", "$10\\pi$"],
      right: 1,
      why: "The radius is half of 20, so $r = 10$ and the circumference is $20\\pi$. The fraction is $\\frac{36}{360} = \\frac{1}{10}$, and a tenth of $20\\pi$ is $2\\pi$. $4\\pi$ comes from using 20 as the radius; $10\\pi$ is a tenth of the area.",
      subject: "math",
    },
    {
      text: "A sector of a circle with a radius of 6 has an area of $9\\pi$. What is the sector's central angle?",
      choices: ["$22.5^\\circ$", "$45^\\circ$", "$90^\\circ$", "$270^\\circ$"],
      right: 2,
      why: "The whole area is $\\pi(6)^2 = 36\\pi$. The sector is $\\frac{9\\pi}{36\\pi} = \\frac{1}{4}$ of it, and a quarter of 360° is 90°. 270° comes from dividing by the circumference, $12\\pi$, instead of the area; 22.5° comes from using 12 as the radius.",
      subject: "math",
    },
    {
      text: "Points $A$, $B$ and $C$ lie on a circle with center $O$. Central angle $AOB$ measures 100°, and $C$ is on the larger arc. What is the measure of inscribed angle $ACB$?",
      choices: ["$50^\\circ$", "$80^\\circ$", "$100^\\circ$", "$200^\\circ$"],
      right: 0,
      why: "An inscribed angle is half the central angle that opens onto the same arc: $\\frac{100}{2} = 50$. 100° forgets the half, 200° doubles instead of halving, and 80° is $180 - 100$, which has nothing to do with the arc.",
      subject: "math",
    },
    {
      text: "A circle has a circumference of $24\\pi$. What is the area of a sector with a central angle of 30°?",
      choices: ["$2\\pi$", "$12\\pi$", "$48\\pi$", "$144\\pi$"],
      right: 1,
      why: "From $2\\pi r = 24\\pi$, the radius is 12, so the whole area is $144\\pi$. The fraction is $\\frac{30}{360} = \\frac{1}{12}$, and a twelfth of $144\\pi$ is $12\\pi$. $2\\pi$ is the arc's length, and $144\\pi$ is the whole circle.",
      subject: "math",
    },
  ],
};

export default lesson;
