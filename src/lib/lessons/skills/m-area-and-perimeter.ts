import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-area-and-perimeter",
  tests:
    "Finding the area or perimeter of flat shapes, including shapes built from rectangles, triangles and parts of circles, or working back to a missing side.",
  spot: "A drawn shape with side lengths, often a garden, room, window or frame, and the words area, perimeter, fencing, border or tile.",
  idea: [
    "**Area** is the space inside, in square units. **Perimeter** is the distance around the outside, in plain units.",
    "Split a **composite** shape into simple pieces: rectangles, triangles and half circles. Add their areas, or subtract a piece that is cut out.",
    "For perimeter, walk the **outside edge** only. A side where two pieces meet is inside the shape, so it does not count.",
  ],
  rules: [
    "Rectangle: $A = lw$",
    "Triangle: $A = \\frac{1}{2}bh$",
    "Circle: $A = \\pi r^2$, $C = 2\\pi r$",
    "Perimeter: outside edges only",
  ],
  figure: { kind: "shape", shape: "rect-with-semicircle", labels: ["8", "5"] },
  strategy: {
    name: "Split, then add",
    steps: [
      "Split the shape into rectangles, triangles and parts of circles.",
      "For area, find each piece's area, then add them, or subtract a hole.",
      "For perimeter, list only the outside edges, then add them.",
      "Halve any diameter before you use a circle formula.",
    ],
  },
  examples: [
    {
      title: "Window area",
      problem:
        "A window is a rectangle 8 feet wide and 5 feet tall with a half circle on top. The half circle's diameter is the rectangle's top side. What is the area of the window, in square feet?",
      figure: { kind: "shape", shape: "rect-with-semicircle", labels: ["8", "5"] },
      steps: [
        {
          say: "Split it into a rectangle and a half circle. The diameter is 8, so the radius is half of it.",
          show: "$r = \\frac{8}{2} = 4$",
        },
        { say: "Find the rectangle's area.", show: "$8 \\times 5 = 40$" },
        {
          say: "Find the half circle's area: half of $\\pi r^2$.",
          show: "$\\frac{1}{2}\\pi (4)^2 = 8\\pi$",
        },
        { say: "Add the two pieces.", show: "$40 + 8\\pi$" },
      ],
      answer: "$40 + 8\\pi$",
      checkIn: {
        text: "A window is a rectangle 12 feet wide and 7 feet tall with a half circle on top. The half circle's diameter is the rectangle's top side. What is the area of the window, in square feet?",
        choices: ["$84 + 18\\pi$", "$84 + 72\\pi$", "$84 + 36\\pi$", "$26 + 6\\pi$"],
        right: 0,
        why: "The radius is half of 12, which is 6, so the half circle is $\\frac{1}{2}\\pi (6)^2 = 18\\pi$. The rectangle is $12 \\times 7 = 84$. $84 + 72\\pi$ is the **Diameter for radius** trap: it uses 12 as the radius.",
        twin: {
          text: "A window is a rectangle 4 feet wide and 9 feet tall with a half circle on top. The half circle's diameter is the rectangle's top side. What is the area of the window, in square feet?",
          choices: ["$36 + 8\\pi$", "$36 + 4\\pi$", "$36 + 2\\pi$", "$22 + 2\\pi$"],
          right: 2,
          why: "The radius is half of 4, which is 2, so the half circle is $\\frac{1}{2}\\pi (2)^2 = 2\\pi$. The rectangle is $4 \\times 9 = 36$. $36 + 8\\pi$ uses 4 as the radius, the **Diameter for radius** trap.",
        },
      },
    },
    {
      title: "Fence around",
      problem:
        "A garden is shaped like an L. Its bottom side is 12 feet, its left side is 9 feet, its top side is 5 feet, and its short right side is 4 feet. How many feet of fencing go all the way around it?",
      figure: {
        kind: "shape",
        shape: "l-shape",
        labels: ["12", "4", "", "", "5", "9"],
        perimeter: true,
      },
      steps: [
        {
          say: "List the outside edges. There are six, and two are missing: the inner flat edge and the inner tall edge.",
        },
        {
          say: "Find each missing edge from the long side it matches.",
          show: "$12 - 5 = 7$ and $9 - 4 = 5$",
        },
        { say: "Add all six outside edges.", show: "$12 + 4 + 7 + 5 + 5 + 9 = 42$" },
      ],
      answer: "$42$",
      tryFrom: 1,
      checkIn: {
        text: "A garden is shaped like an L. Its bottom side is 10 feet, its left side is 8 feet, its top side is 4 feet, and its short right side is 3 feet. How many feet of fencing go all the way around it?",
        choices: ["$25$", "$36$", "$50$", "$31$"],
        right: 1,
        why: "The two missing edges are $10 - 4 = 6$ and $8 - 3 = 5$. All six edges add to $10 + 3 + 6 + 5 + 4 + 8 = 36$. 25 adds only the four sides that were given, and 50 is the area, not the fence.",
        twin: {
          text: "A garden is shaped like an L. Its bottom side is 14 feet, its left side is 10 feet, its top side is 6 feet, and its short right side is 5 feet. How many feet of fencing go all the way around it?",
          choices: ["$35$", "$100$", "$40$", "$48$"],
          right: 3,
          why: "The two missing edges are $14 - 6 = 8$ and $10 - 5 = 5$. All six edges add to $14 + 5 + 8 + 5 + 6 + 10 = 48$. 35 adds only the four sides that were given, and 100 is the area, not the fence.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Diameter for radius",
      text: "A half circle on an 8-foot side has a radius of 4, not 8. Using 8 gives $32\\pi$ for the half circle instead of $8\\pi$.",
    },
    {
      name: "Counting inside edges",
      text: "For perimeter, the side where two pieces meet is inside the shape. Leave it out, and count the curved edge in its place.",
    },
    {
      name: "Area or perimeter",
      text: "Area covers the inside: tile, carpet, paint, grass. Perimeter goes around: fencing, a frame, a border. Read which one the question wants.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Type it on one line",
    steps: [
      "Split the shape by hand.",
      "Type the whole total on one line, with 0.5 for a half.",
      "If the choices use pi, type each choice and compare the decimals.",
    ],
    type: ["8*5+0.5pi*4^2", "40+8pi"],
    note: "Both lines show 65.13274, so $40 + 8\\pi$ matches. Typing 1/2pi puts pi under the 2, so use 0.5. When the answer stays in terms of $\\pi$, by hand is usually faster.",
  },
  check: {
    text: "A rectangular poster is 20 inches by 14 inches. A circle with a diameter of 6 inches is cut out of it. What is the area of the poster that is left, in square inches?",
    choices: ["$280 - 36\\pi$", "$280 - 9\\pi$", "$280 - 6\\pi$", "$280 + 9\\pi$"],
    right: 1,
    why: "The rectangle is $20 \\times 14 = 280$. The circle's radius is 3, so its area is $9\\pi$, and the hole is subtracted: $280 - 9\\pi$. $280 - 36\\pi$ uses the diameter as the radius. $280 - 6\\pi$ subtracts the circle's circumference, a length. $280 + 9\\pi$ adds the hole instead of taking it away.",
  },
  quiz: [
    {
      text: "A room is shaped like an L. Its bottom wall is 15 feet, its left wall is 11 feet, its top wall is 6 feet, and its short right wall is 5 feet. A border strip runs along every wall. How many feet of border are needed?",
      choices: ["$37$", "$46$", "$52$", "$111$"],
      right: 2,
      why: "List the outside edges. The two missing walls are $15 - 6 = 9$ and $11 - 5 = 6$. Then $15 + 5 + 9 + 6 + 6 + 11 = 52$ feet. The tempting 37 adds only the four walls given and skips the missing two. 46 finds only one of them. 111 is the room's area, the **Area or perimeter** trap.",
      subject: "math",
    },
    {
      text: "A garden is a rectangle 12 meters long and 6 meters wide, with a half circle on each 6-meter end. To find the length of fencing around the garden, what should you do first?",
      choices: [
        "List the outside edges: the two 12-meter sides and the two curved ends.",
        "Find the area of the rectangle: $12 \\times 6$.",
        "Add all four sides of the rectangle.",
        "Find the circumference of a circle with a radius of 6.",
      ],
      right: 0,
      why: "Perimeter means the outside edges, so list them first: two straight 12-meter sides and two half circles of radius 3. Together the halves make one circle, so the fence is $24 + 6\\pi$ meters. The rectangle's area is the **Area or perimeter** trap. All four sides is the **Counting inside edges** trap: the 6-meter ends sit under the curves. A radius of 6 is the **Diameter for radius** trap.",
      subject: "math",
    },
    {
      text: "A rectangle 10 centimeters by 4 centimeters has a half circle attached to one 4-centimeter side, bulging outward. Lena finds the perimeter: $10 + 4 + 10 + 4 + 2\\pi = 28 + 2\\pi$. Which statement is true?",
      choices: [
        "Lena is right; the perimeter is $28 + 2\\pi$.",
        "Lena used the diameter as the radius; the perimeter is $24 + 4\\pi$.",
        "Lena counted the side the half circle covers; the perimeter is $24 + 2\\pi$.",
        "Lena left out the other half of the circle; the perimeter is $28 + 4\\pi$.",
      ],
      right: 2,
      why: "The 4-centimeter side under the half circle is inside the shape, so Lena fell into Counting inside edges. The outside is $10 + 10 + 4$ plus the curve. The radius is 2, so the curve is half of $2\\pi(2)$, which is $2\\pi$. That gives $24 + 2\\pi$. Her arc was right, so the radius and half circle were not the problem.",
      subject: "math",
    },
    {
      text: "Which question asks for an area?",
      choices: [
        "How much fencing is needed to go around a rectangular yard?",
        "How much ribbon is needed to trim the edge of a round table?",
        "How far is one lap around a circular track?",
        "How much carpet is needed to cover a rectangular floor?",
      ],
      right: 3,
      why: "Carpet covers the inside of the floor, so it is measured in square units: area. Fencing, ribbon around an edge and a lap around a track all go around the outside, so they are perimeters, or a circumference for the round ones. Mixing these up is the **Area or perimeter** trap.",
      subject: "math",
    },
    {
      text: "A rectangular patio is 18 feet by 10 feet. A square flower bed with sides of 4 feet is cut out of one corner of the patio. What is the perimeter of what is left of the patio, in feet?",
      choices: ["$48$", "$56$", "$64$", "$164$"],
      right: 1,
      why: "Walk the outside edges. The cut takes 4 feet off two sides but adds two new 4-foot edges around the bed: $14 + 10 + 18 + 6 + 4 + 4 = 56$, the same as $2(18 + 10)$. The tempting 48 takes away the 8 feet but forgets the two new edges. 64 adds the new edges without taking anything away. 164 is the area, $180 - 16$, the **Area or perimeter** trap.",
      subject: "math",
    },
  ],
};

export default lesson;
