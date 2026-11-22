import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-volume-and-surface-area",
  tests:
    "Finding the volume or surface area of prisms, cylinders, cones, pyramids and spheres, or working back from a volume to a missing length.",
  spot: "A box, can, cone or ball, and the words volume, holds, capacity, or surface area. The formulas are on the reference sheet, so the work is choosing and solving.",
  idea: [
    "**Volume** is the space inside, in cubic units. For a prism or a cylinder, it is the **base area times the height**.",
    "A cone or a pyramid holds **one third** of the cylinder or prism with the same base and height.",
    "**Surface area** is the total area of every face, in square units. Picture the solid unfolded flat, then add the faces.",
    "To work backward, put the known volume into the formula and solve for the missing length.",
  ],
  rules: [
    "Prism: $V = Bh$",
    "Cylinder: $V = \\pi r^2 h$",
    "Cone: $V = \\frac{1}{3}\\pi r^2 h$",
    "Sphere: $V = \\frac{4}{3}\\pi r^3$",
  ],
  figure: { kind: "solid", shape: "cylinder", labels: { r: "3", h: "10" } },
  strategy: {
    name: "Formula, then solve",
    steps: [
      "Name the solid and write its formula.",
      "Put in the numbers you know. Halve a diameter first.",
      "Solve for what is asked, keeping $\\pi$ until the end.",
      "Check the units: cubic for volume, square for surface area.",
    ],
  },
  examples: [
    {
      title: "Cylinder volume",
      problem:
        "A can shaped like a cylinder has a radius of 3 inches and a height of 10 inches. What is its volume, in cubic inches?",
      figure: { kind: "solid", shape: "cylinder", labels: { r: "3", h: "10" } },
      steps: [
        {
          say: "It is a cylinder, so its volume is the base area times the height.",
          show: "$V = \\pi r^2 h$",
        },
        { say: "Put in the radius and the height.", show: "$V = \\pi (3)^2 (10)$" },
        { say: "Square first, then multiply.", show: "$V = 9\\pi \\cdot 10 = 90\\pi$" },
      ],
      answer: "$90\\pi$",
    },
    {
      title: "Cone, backward",
      problem:
        "A cone has a volume of $96\\pi$ cubic centimeters and a height of 8 centimeters. What is the radius of its base, in centimeters?",
      figure: { kind: "solid", shape: "cone", labels: { r: "r", h: "8" } },
      steps: [
        {
          say: "Write the cone formula with the numbers you know.",
          show: "$96\\pi = \\frac{1}{3}\\pi r^2 (8)$",
        },
        {
          say: "Divide both sides by $\\pi$, then multiply both sides by 3.",
          show: "$288 = 8r^2$",
        },
        { say: "Divide by 8, then take the square root.", show: "$r^2 = 36$, so $r = 6$" },
      ],
      answer: "$r = 6$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Missing one third",
      text: "A cone or a pyramid is one third of the matching cylinder or prism. Forgetting the $\\frac{1}{3}$ makes the answer three times too big.",
    },
    {
      name: "Diameter for radius",
      text: "A can 6 inches across has a radius of 3. Using 6 makes the volume four times too big, because the radius is squared.",
    },
    {
      name: "Inside or outside",
      text: "Volume fills the inside: how much it holds. Surface area covers the outside: paint, wrapping, a label. Read which one the question wants.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Solve with one line",
    steps: [
      "Write the formula with x for the missing length, and tidy the numbers: a cone of height 9 gives $\\frac{1}{3}\\pi x^2 (9) = 3\\pi x^2$.",
      "Type it as one equation in x, with the known volume on the right.",
      "Read the vertical line on the positive side: that x is the length.",
    ],
    type: ["3pi x^2=150"],
    note: "For a cone of volume 150 and height 9, lines appear at about $x = \\pm 3.99$, so the radius is about 4. Use x, not r, because the calculator reads r as a polar letter. With clean numbers, like $96\\pi$, by hand is faster.",
  },
  check: {
    text: "A sphere has a radius of 3. What is its volume?",
    choices: ["$12\\pi$", "$27\\pi$", "$36\\pi$", "$108\\pi$"],
    right: 2,
    why: "Use the sphere formula: $\\frac{4}{3}\\pi (3)^3 = \\frac{4}{3}\\pi \\cdot 27 = 36\\pi$. $12\\pi$ squares the radius instead of cubing it. $27\\pi$ leaves out the $\\frac{4}{3}$. $108\\pi$ multiplies by 4 but forgets to divide by 3.",
  },
  quiz: [
    {
      text: "A paper cup shaped like a cone holds $12\\pi$ cubic inches of water. The cup is 4 inches tall. What is the radius of the cup's opening, in inches?",
      choices: ["$\\sqrt{3}$", "$3$", "$6$", "$9$"],
      right: 1,
      why: "Formula, then solve: $12\\pi = \\frac{1}{3}\\pi r^2 (4)$. Divide by $\\pi$ and multiply by 3 to get $36 = 4r^2$, so $r^2 = 9$ and $r = 3$. The tempting $\\sqrt{3}$ is the **Missing one third** trap: $12 = 4r^2$. 9 stops at $r^2$. 6 is the opening's diameter, not its radius.",
      subject: "math",
    },
    {
      text: "A water tank shaped like a cylinder is 12 feet across and 5 feet tall. To find how much water it holds, what should you do first?",
      choices: [
        "Find the area of the tank's outside surface.",
        "Multiply 12 by 5, then divide by 3.",
        "Multiply $\\pi$ by $12^2$, then by 5.",
        "Find the radius: half of 12 is 6.",
      ],
      right: 3,
      why: "Across means the diameter, so halve it first: $r = 6$. Then $V = \\pi (6)^2 (5) = 180\\pi$ cubic feet. Using $12^2$ is the **Diameter for radius** trap, and it makes the answer four times too big. The outside surface is the **Inside or outside** trap. Dividing by 3 belongs to cones and pyramids, not cylinders.",
      subject: "math",
    },
    {
      text: "A pyramid has a square base 6 inches on each side and a height of 10 inches. Theo finds its volume: $6 \\times 6 \\times 10 = 360$ cubic inches. Which statement is true?",
      choices: [
        "Theo forgot the one third; the volume is 120 cubic inches.",
        "Theo should have halved the base side first; the volume is 90 cubic inches.",
        "Theo should have squared the height; the volume is 3,600 cubic inches.",
        "Theo is right; the volume is 360 cubic inches.",
      ],
      right: 0,
      why: "A pyramid holds one third of the prism with the same base and height. Theo found the prism, so this is the **Missing one third** trap: $\\frac{1}{3}(36)(10) = 120$. Halving the side treats it like a diameter, but a square has no radius. Squaring the height has no place in any volume formula here.",
      subject: "math",
    },
    {
      text: "Which question asks for a surface area rather than a volume?",
      choices: [
        "How much water fills a fish tank?",
        "How much sand fits in a cone-shaped pile?",
        "How much wrapping paper covers a gift box with no overlap?",
        "How much air is inside a beach ball?",
      ],
      right: 2,
      why: "Wrapping paper covers the outside of the box, so it is a surface area, in square units. Water in a tank, sand in a pile and air in a ball all fill the inside, so they are volumes, in cubic units. Mixing these up is the **Inside or outside** trap.",
      subject: "math",
    },
    {
      text: "A cylinder and a cone both have a radius of 4 centimeters. The cylinder is 6 centimeters tall. The cone has the same volume as the cylinder. What is the height of the cone, in centimeters?",
      choices: ["$2$", "$4.5$", "$6$", "$18$"],
      right: 3,
      why: "Formula, then solve. The cylinder holds $\\pi (4)^2 (6) = 96\\pi$. Set the cone equal: $\\frac{1}{3}\\pi (4)^2 h = 96\\pi$, so $\\frac{16}{3}h = 96$ and $h = 18$. A cone holds one third as much, so it must be 3 times as tall. 6 is the **Missing one third** trap. 2 divides by 3 instead of multiplying. 4.5 uses the diameter, 8, as the radius.",
      subject: "math",
    },
  ],
};

export default lesson;
