import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-triangles",
  tests:
    "Finding a missing angle from the angle sum, and a missing side of similar triangles from a scale factor.",
  spot: "Two triangles that share angles, a line drawn parallel to one side of a triangle, or the words similar or congruent.",
  idea: [
    "The three angles of any triangle add to **180°**. Know two of them and you know the third.",
    "**Similar** triangles have the same three angles, so one is a stretched copy of the other. Every side grows by the same number, the **scale factor**.",
    "Sides match when they sit across from equal angles. When a problem says triangle $ABC$ is similar to triangle $DEF$, the letter order tells you: $AB$ goes with $DE$. **Congruent** triangles are exact copies, with a scale factor of 1.",
  ],
  rules: [
    "$A + B + C = 180^\\circ$",
    "Same angles $\\Rightarrow$ similar",
    "$\\text{new side} = k \\cdot \\text{old side}$",
  ],
  figure: {
    kind: "triangle",
    angles: [50, 60, 70],
    sides: ["", "", "6"],
    angleLabels: ["50°", "60°", "70°"],
    similar: 1.5,
    highlight: [2],
  },
  strategy: {
    name: "Match, then scale",
    steps: [
      "Find any missing angle: the three add to 180°.",
      "Match the corners with equal angles. The sides across from them match.",
      "Find the scale factor from one pair of matching sides you know.",
      "Multiply the other side by that factor.",
    ],
  },
  examples: [
    {
      title: "Letter order",
      problem:
        "Triangle $ABC$ is similar to triangle $DEF$, with $A$, $B$ and $C$ matching $D$, $E$ and $F$. $AB = 8$, $BC = 12$ and $DE = 6$. What is $EF$?",
      figure: { kind: "triangle", angles: [82.82, 55.77, 41.41], sides: ["12", "", "8"] },
      steps: [
        { say: "Match by letter order: $AB$ goes with $DE$, and $BC$ goes with $EF$." },
        {
          say: "Find the scale factor from the pair where you know both sides.",
          show: "$k = \\frac{DE}{AB} = \\frac{6}{8} = 0.75$",
        },
        {
          say: "Every side shrinks by the same factor, so multiply $BC$ by it.",
          show: "$EF = 0.75 \\cdot 12 = 9$",
        },
      ],
      answer: "$9$",
    },
    {
      title: "Triangle inside",
      problem:
        "In triangle $ABC$, point $D$ is on $AB$ and point $E$ is on $AC$, with $DE$ parallel to $BC$. $AD = 4$, $DB = 8$ and $DE = 5$. What is $BC$?",
      steps: [
        {
          say: "$DE$ is parallel to $BC$, so angle $ADE$ equals angle $ABC$. Both triangles share angle $A$, so they are similar.",
        },
        {
          say: "Match the sides. The small triangle's $AD$ goes with the whole side $AB$, not with $DB$.",
          show: "$AB = 4 + 8 = 12$",
        },
        { say: "Find the scale factor, big over small.", show: "$k = \\frac{12}{4} = 3$" },
        { say: "Multiply the small triangle's side by it.", show: "$BC = 3 \\cdot 5 = 15$" },
      ],
      answer: "$15$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Mismatched sides",
      text: "Match sides by equal angles or by letter order, never by where they sit on the page. A figure may be turned or flipped.",
    },
    {
      name: "Part for whole",
      text: "With a triangle inside a triangle, the big triangle's side is the whole side. In the second example, $\\frac{8}{4}$ uses only a piece and gives 10 instead of 15.",
    },
    {
      name: "Adding, not multiplying",
      text: "Similar sides change by multiplying. In the first example, $AB$ shrinks from 8 to 6, but $BC$ does not lose 2 as well: it becomes $0.75 \\cdot 12 = 9$, not 10.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Type it without fractions",
    steps: [
      "Write the proportion by hand, matching sides by letter order.",
      "Cross-multiply it, then type it with $x$ for the missing side. The calculator draws a vertical line at the answer.",
      "Typing it with fractions is risky: after a slash, everything you type lands in the bottom until you press the right arrow.",
    ],
    type: ["8x = 6*12"],
    note: "The line lands at $x = 9$. This is usually faster by hand: $\\frac{6}{8} = 0.75$, and $0.75 \\cdot 12 = 9$. Angle sums are mental math.",
  },
  check: {
    text: "In triangle $JKL$, angle $J$ measures $38^\\circ$ and angle $K$ measures $64^\\circ$. Triangle $JKL$ is similar to triangle $MNP$, with $J$, $K$ and $L$ matching $M$, $N$ and $P$. What is the measure of angle $P$?",
    choices: ["$38^\\circ$", "$64^\\circ$", "$78^\\circ$", "$102^\\circ$"],
    right: 2,
    why: "Angle $P$ matches angle $L$, and $L = 180 - 38 - 64 = 78$. Similar triangles have equal matching angles, so $P$ is 78°. 102° adds the two known angles instead of taking them from 180. 38° and 64° are the angles that match $M$ and $N$.",
  },
  quiz: [
    {
      text: "In triangle $ABC$, point $D$ is on $AB$ and point $E$ is on $AC$, with $DE$ parallel to $BC$. $AD = 5$, $DB = 10$ and $DE = 4$. What is $BC$?",
      choices: ["$2$", "$8$", "$12$", "$14$"],
      right: 2,
      why: "The small and big triangles are similar. $AD$ matches the whole side $AB = 5 + 10 = 15$, so the scale factor is $\\frac{15}{5} = 3$, and $BC = 3 \\cdot 4 = 12$. The tempting 8 is Part for whole: it uses $\\frac{10}{5}$. 14 is Adding, not multiplying: it adds 10 to $DE$. 2 divides by the piece instead of multiplying.",
      subject: "math",
    },
    {
      text: "Triangle $RST$ is similar to triangle $UVW$, with $R$, $S$ and $T$ matching $U$, $V$ and $W$. $RS = 9$, $ST = 15$ and $UV = 6$. To find $VW$, what should you do first?",
      choices: [
        "Find the scale factor $\\frac{6}{15}$, from $UV$ and $ST$.",
        "Find the scale factor $\\frac{6}{9}$, from $UV$ and $RS$.",
        "Subtract $9 - 6 = 3$, then take 3 from $ST$.",
        "Find the third angle of triangle $RST$.",
      ],
      right: 1,
      why: "By letter order, $UV$ matches $RS$, so the scale factor is $\\frac{6}{9}$, and then $VW = \\frac{6}{9} \\cdot 15 = 10$. The factor $\\frac{6}{15}$ is Mismatched sides: $UV$ does not match $ST$. Subtracting 3 is Adding, not multiplying. The third angle is true but does not help find a side.",
      subject: "math",
    },
    {
      text: "Triangle $ABC$ is similar to triangle $DEF$, with $A$, $B$ and $C$ matching $D$, $E$ and $F$. $AB = 4$, $BC = 7$ and $DE = 10$. Leo says $EF = 13$, because $DE$ is 6 more than $AB$. What is his mistake?",
      choices: [
        "He matched $DE$ with $BC$ instead of with $AB$.",
        "He should have used $\\frac{4}{10}$ as the factor, so $EF = 2.8$.",
        "He should have subtracted, so $EF = 7 - 6 = 1$.",
        "Similar sides multiply, not add, so $EF = 2.5 \\cdot 7 = 17.5$.",
      ],
      right: 3,
      why: "Leo fell for Adding, not multiplying. The scale factor is $\\frac{10}{4} = 2.5$, so $EF = 2.5 \\cdot 7 = 17.5$. He did match $DE$ with $AB$ correctly. The factor $\\frac{4}{10}$ is upside down: $DEF$ is the bigger triangle, so its sides must be longer. Subtracting 6 repeats his mistake in the other direction.",
      subject: "math",
    },
    {
      text: "Which pair of triangles must be similar?",
      choices: [
        "Two triangles that each have a $50^\\circ$ angle and a $60^\\circ$ angle.",
        "Two triangles that each have a side of 5 and a side of 8.",
        "Two triangles that each have a $50^\\circ$ angle.",
        "Two triangles with the same perimeter.",
      ],
      right: 0,
      why: "With two angles known, the third is $180 - 50 - 60 = 70$ in both, so all three angles match and the triangles are similar. Two equal sides can still meet at any angle, so the shapes can differ. One shared angle leaves the other two free. The same perimeter says nothing about shape.",
      subject: "math",
    },
    {
      text: "Segments $AE$ and $BD$ intersect at point $C$, and segment $AB$ is parallel to segment $DE$. If $AB = 6$, $AC = 4$ and $CE = 10$, what is the length of $DE$?",
      choices: ["$2.4$", "$12$", "$15$", "$25$"],
      right: 2,
      why: "Angles $ACB$ and $ECD$ are vertical, and the parallel sides make angle $A$ equal angle $E$, so triangle $ABC$ is similar to triangle $EDC$. $AC$ matches $EC$, so $k = \\frac{10}{4} = 2.5$ and $DE = 2.5 \\cdot 6 = 15$. 12 is Adding, not multiplying. 2.4 flips the factor. 25 multiplies $CE$ instead of $AB$, a case of Mismatched sides.",
      subject: "math",
    },
  ],
};

export default lesson;
