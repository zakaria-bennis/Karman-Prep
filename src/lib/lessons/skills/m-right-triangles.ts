import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-right-triangles",
  tests:
    "Finding a missing side of a right triangle with the Pythagorean theorem or the special right triangle patterns.",
  spot: "A right-angle square in a figure, a ladder, ramp or diagonal, or angles of 45° or 30° and 60° with one side given.",
  idea: [
    "The **hypotenuse** is the longest side of a right triangle. It sits across from the right angle. The other two sides are the legs.",
    "The **Pythagorean theorem** says leg squared plus leg squared equals hypotenuse squared. To find the hypotenuse, add the squares. To find a leg, subtract.",
    "Two **special right triangles** have fixed side patterns, given on the reference sheet. With 45-45-90 or 30-60-90 angles, one side gives you the other two with no squaring.",
  ],
  rules: [
    "$a^2 + b^2 = c^2$",
    "45-45-90: $x,\\ x,\\ x\\sqrt{2}$",
    "30-60-90: $x,\\ x\\sqrt{3},\\ 2x$",
  ],
  figure: {
    kind: "triangle",
    angles: [36.87, 53.13, 90],
    sides: ["6", "8", "10"],
    highlight: [2],
  },
  strategy: {
    name: "Find c first",
    steps: [
      "Find the right angle. The side across from it is the hypotenuse, $c$.",
      "See 45-45-90 or 30-60-90 angles? Use the side pattern.",
      "Otherwise square the sides: add for $c$, subtract for a leg.",
      "Take the square root, and match the form of the choices.",
    ],
  },
  examples: [
    {
      title: "Missing leg",
      problem:
        "A 13-foot ladder leans against a wall. Its foot is 5 feet from the wall. How high up the wall does the ladder reach?",
      figure: {
        kind: "triangle",
        angles: [22.62, 67.38, 90],
        sides: ["5", "h", "13"],
        highlight: [2],
      },
      steps: [
        {
          say: "The wall meets the ground at a right angle. The ladder is across from it, so the ladder is $c$.",
          show: "$c = 13$",
        },
        {
          say: "The height is a leg, so subtract the squares.",
          show: "$h^2 = 13^2 - 5^2 = 169 - 25 = 144$",
        },
        { say: "Take the square root.", show: "$h = 12$" },
      ],
      answer: "$12$ feet",
    },
    {
      title: "Special triangle",
      problem:
        "A right triangle has a $30^\\circ$ angle and a hypotenuse of 14. What is the length of the side across from the $60^\\circ$ angle?",
      figure: {
        kind: "triangle",
        angles: [30, 60, 90],
        sides: ["", "?", "14"],
        angleLabels: ["30°", "60°", ""],
      },
      steps: [
        {
          say: "The angles are 30, 60 and 90, so use the pattern instead of squaring.",
          show: "$x,\\ x\\sqrt{3},\\ 2x$",
        },
        { say: "The hypotenuse is $2x$.", show: "$2x = 14$, so $x = 7$" },
        {
          say: "The side across from 60° is the long leg, $x\\sqrt{3}$.",
          show: "$7\\sqrt{3}$",
        },
      ],
      answer: "$7\\sqrt{3}$",
      tryFrom: 1,
    },
  ],
  traps: [
    {
      name: "Adding for a leg",
      text: "Add the squares only to find the hypotenuse. For the ladder, $13^2 + 5^2 = 194$ gives about 13.9, which is longer than the ladder itself.",
    },
    {
      name: "Forgetting the root",
      text: "$a^2 + b^2$ gives $c^2$, not $c$. In the ladder example, 144 is $h^2$; the height is 12.",
    },
    {
      name: "Swapped special sides",
      text: "In a 30-60-90 triangle, the short leg $x$ is across from 30° and the long leg $x\\sqrt{3}$ is across from 60°. The hypotenuse, $2x$, is always the longest.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Compare the decimals",
    steps: [
      "Type sqrt( around the sum of the squares, or the difference for a leg.",
      "Type each radical choice on its own line.",
      "Pick the choice whose decimal matches in every digit, not just the first two.",
    ],
    type: ["sqrt(7^2 + 9^2)", "8sqrt(2)"],
    note: "Legs of 7 and 9 give 11.40175, but $8\\sqrt{2}$ shows 11.31371: close, and wrong. With 45-45-90 or 30-60-90 angles, the side patterns are faster by hand.",
  },
  check: {
    text: "A right triangle has legs of 9 and 12. What is the length of its hypotenuse?",
    choices: ["$3\\sqrt{7}$", "$15$", "$21$", "$225$"],
    right: 1,
    why: "Both sides given are legs, so add the squares: $81 + 144 = 225$, and $\\sqrt{225} = 15$. 225 is the **Forgetting the root** trap. 21 adds the legs without squaring. $3\\sqrt{7}$ subtracts the squares, which is only for finding a leg.",
  },
  quiz: [
    {
      text: "A right triangle has a $60^\\circ$ angle and a hypotenuse of 10. What is the length of the side across from the $60^\\circ$ angle?",
      choices: ["$5$", "$5\\sqrt{2}$", "$5\\sqrt{3}$", "$10\\sqrt{3}$"],
      right: 2,
      why: "Use the 30-60-90 pattern $x$, $x\\sqrt{3}$, $2x$. The hypotenuse is $2x = 10$, so $x = 5$, and the long leg across from 60° is $5\\sqrt{3}$. The tempting 5 is the **Swapped special sides** trap: it is the short leg, across from 30°. $5\\sqrt{2}$ uses the 45-45-90 pattern. $10\\sqrt{3}$ treats the hypotenuse as $x$.",
      subject: "math",
    },
    {
      text: "A right triangle has a hypotenuse of 17 and one leg of 8. What should you do first to find the other leg?",
      choices: [
        "Subtract the sides: $17 - 8$.",
        "Add the squares: $8^2 + 17^2$.",
        "Use the 45-45-90 pattern: $8\\sqrt{2}$.",
        "Subtract the squares: $17^2 - 8^2$.",
      ],
      right: 3,
      why: "The missing side is a leg, so subtract the squares: $289 - 64 = 225$, and the leg is 15. Adding the squares is the **Adding for a leg** trap; that only finds a hypotenuse. Subtracting the sides skips the squaring. Nothing says the angles are 45°, so the 45-45-90 pattern does not apply.",
      subject: "math",
    },
    {
      text: "A right triangle has a hypotenuse of 25 and a leg of 7. Sam writes $7^2 + 25^2 = 674$ and says the other leg is $\\sqrt{674}$. What is his mistake?",
      choices: [
        "For a leg he should subtract: $25^2 - 7^2 = 576$, so the leg is 24.",
        "He forgot the square root, so the leg is 674.",
        "He should add the sides, so the leg is 32.",
        "He should use the 45-45-90 pattern, so the leg is $7\\sqrt{2}$.",
      ],
      right: 0,
      why: "Sam fell for Adding for a leg. The hypotenuse is the longest side, so a leg is found by subtracting: $625 - 49 = 576$, and $\\sqrt{576} = 24$. His $\\sqrt{674}$, about 26, is longer than the hypotenuse, which is impossible. He did take a root, so 674 is no fix. Adding sides skips the squares, and nothing says the angles are 45°.",
      subject: "math",
    },
    {
      text: "Which question is faster to answer with a side pattern than with $a^2 + b^2 = c^2$?",
      choices: [
        "A right triangle has legs of 6 and 7. Find the hypotenuse.",
        "A right triangle has a hypotenuse of 9 and a leg of 4. Find the other leg.",
        "A right triangle has two $45^\\circ$ angles and a leg of 6. Find the hypotenuse.",
        "A triangle has sides of 6, 7 and 9. Is it a right triangle?",
      ],
      right: 2,
      why: "Two 45° angles make a 45-45-90 triangle, so the hypotenuse is $6\\sqrt{2}$ at once. Legs of 6 and 7 fit no pattern, so square them: $\\sqrt{85}$. The hypotenuse of 9 and leg of 4 also need squaring, with subtraction: $\\sqrt{65}$. The last asks whether $36 + 49 = 81$, which is false, so it is not right.",
      subject: "math",
    },
    {
      text: "A rectangle has a diagonal of 26 and a width of 10. What is the area of the rectangle?",
      choices: ["$160$", "$240$", "$260$", "$5760$"],
      right: 1,
      why: "The diagonal splits the rectangle into right triangles with the diagonal as $c$. The length is a leg: $26^2 - 10^2 = 676 - 100 = 576$, so the length is 24 and the area is $10 \\cdot 24 = 240$. 5760 is the **Forgetting the root** trap. 260 uses the diagonal as the length. 160 subtracts the sides, $26 - 10 = 16$, without squaring.",
      subject: "math",
    },
  ],
};

export default lesson;
