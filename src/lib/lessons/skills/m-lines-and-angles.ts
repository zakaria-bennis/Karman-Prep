import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-lines-and-angles",
  tests:
    "Finding a missing angle where lines cross, most often where a transversal cuts two parallel lines.",
  spot: "Two lines marked parallel with a third line crossing both, angles written like $(3x + 10)^\\circ$, or the words vertical, supplementary or transversal.",
  idea: [
    "A **transversal** is a line that crosses two other lines. When those two lines are parallel, it makes eight angles but only two sizes.",
    "The small ones are **acute** (less than 90°) and the big ones are **obtuse** (more than 90°). Every acute angle in the picture is equal, and every obtuse angle is equal.",
    "An acute angle and an obtuse angle together make a straight line, so they add to **180°**. Angles across from each other where two lines cross, called vertical angles, are always equal.",
  ],
  rules: [
    "Acute and acute: equal",
    "Obtuse and obtuse: equal",
    "Acute + obtuse $= 180^\\circ$",
    "Vertical angles: equal",
  ],
  figure: {
    kind: "angles",
    tilt: 65,
    labels: { 1: "115°", 2: "65°", 5: "115°", 6: "65°" },
    highlight: [2, 6],
  },
  strategy: {
    name: "Acute or obtuse",
    steps: [
      "Call each angle in the question acute or obtuse.",
      "Two of the same kind are equal: set them equal.",
      "One of each kind adds to $180^\\circ$: set the sum to 180.",
      "Solve for $x$, then answer what the question asks for.",
    ],
  },
  examples: [
    {
      title: "Two acute angles",
      problem:
        "Two parallel lines are cut by a transversal. Angle 2 measures $(2x + 15)^\\circ$ and angle 6 measures $(3x - 10)^\\circ$. What is the measure of angle 6?",
      figure: {
        kind: "angles",
        tilt: 65,
        labels: { 2: "(2x+15)°", 6: "(3x-10)°" },
        highlight: [2, 6],
      },
      steps: [
        { say: "Both angles are the small angle at a crossing, so both are acute." },
        { say: "Two acute angles are equal, so set them equal.", show: "$2x + 15 = 3x - 10$" },
        { say: "Solve for $x$.", show: "$x = 25$" },
        {
          say: "The question asks for the angle, not $x$, so put 25 back in.",
          show: "$3(25) - 10 = 65$",
        },
      ],
      answer: "$65^\\circ$",
    },
    {
      title: "One of each",
      problem:
        "Two parallel lines are cut by a transversal. Angle 3 measures $(5x - 30)^\\circ$ and angle 6 measures $(3x + 10)^\\circ$. What is the measure of angle 3?",
      figure: {
        kind: "angles",
        tilt: 85,
        labels: { 3: "(5x-30)°", 6: "(3x+10)°" },
        highlight: [3, 6],
      },
      steps: [
        { say: "Angle 3 is obtuse and angle 6 is acute, so they are not equal." },
        {
          say: "An acute and an obtuse angle add to $180^\\circ$.",
          show: "$(5x - 30) + (3x + 10) = 180$",
        },
        { say: "Combine like terms and solve.", show: "$8x - 20 = 180$, so $x = 25$" },
        { say: "Put 25 back into angle 3.", show: "$5(25) - 30 = 95$" },
      ],
      answer: "$95^\\circ$",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Equal or supplementary",
      text: "An acute angle never equals an obtuse one. In the second example, setting $5x - 30 = 3x + 10$ gives $x = 20$ and a wrong angle of 70°. Decide acute or obtuse before you write anything.",
    },
    {
      name: "Answering with x",
      text: "Most questions ask for an angle, not $x$. After you solve, put $x$ back in. The value of $x$ is almost always one of the wrong choices.",
    },
    {
      name: "Only when parallel",
      text: "Acute-equals-acute works only when the lines are parallel. Vertical angles and angles on a straight line work for any lines.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Solve it in one line",
    steps: [
      "Decide by hand whether the angles are equal or add to 180°.",
      "Type the equation with $x$ as one line. The calculator draws a vertical line at the answer.",
      "Zoom out if no line appears, then put $x$ back in to find the angle.",
    ],
    type: ["3x + 10 + 5x - 30 = 180"],
    note: "The line lands at $x = 25$. The calculator solves whatever you type, so it cannot catch the Equal or supplementary trap. An equation like $8x - 20 = 180$ is faster by hand.",
  },
  check: {
    text: "Two parallel lines are cut by a transversal. One of the angles formed measures $48^\\circ$. What is the measure of each obtuse angle formed?",
    choices: ["$42^\\circ$", "$48^\\circ$", "$132^\\circ$", "$312^\\circ$"],
    right: 2,
    why: "A 48° angle is acute, and an acute angle plus an obtuse angle make 180°, so each obtuse angle is $180 - 48 = 132$. 48° is the acute size again. 42° subtracts from 90, which is for a right angle. 312° subtracts from 360, a full turn.",
  },
  quiz: [
    {
      text: "Two parallel lines are cut by a transversal. One acute angle measures $(2x + 6)^\\circ$ and one obtuse angle measures $(4x + 18)^\\circ$. What is the measure of the obtuse angle?",
      choices: ["$26^\\circ$", "$58^\\circ$", "$104^\\circ$", "$122^\\circ$"],
      right: 3,
      why: "One acute and one obtuse angle add to 180°: $6x + 24 = 180$, so $x = 26$. The obtuse angle is $4(26) + 18 = 122$. The tempting 26° is Answering with x. 58° is the acute angle, not the one asked for. 104° forgets to add the 18 after multiplying.",
      subject: "math",
    },
    {
      text: "Two parallel lines are cut by a transversal. Two of the obtuse angles formed measure $(7x - 4)^\\circ$ and $(5x + 30)^\\circ$. What should you do first to find $x$?",
      choices: [
        "Set the two expressions equal to each other.",
        "Add the two expressions and set the sum equal to 180.",
        "Add the two expressions and set the sum equal to 360.",
        "Set each expression equal to 90.",
      ],
      right: 0,
      why: "Both angles are obtuse, and two of the same kind are equal: $7x - 4 = 5x + 30$, so $x = 17$ and each angle is 115°. Adding to 180 is the Equal or supplementary trap: that sum is for one acute and one obtuse angle. 360 is the sum around a whole point. 90 is a right angle, and these angles are obtuse.",
      subject: "math",
    },
    {
      text: "Two parallel lines are cut by a transversal. An acute angle measures $(3x + 5)^\\circ$ and an obtuse angle measures $(5x - 1)^\\circ$. Maya writes $3x + 5 = 5x - 1$ and gets $x = 3$. What is wrong with her work?",
      choices: [
        "She should have set the sum of the angles equal to 360.",
        "She made an algebra slip; her equation gives $x = 2$.",
        "An acute and an obtuse angle add to 180; they are not equal.",
        "She should have given the angle, 14°, instead of $x$.",
      ],
      right: 2,
      why: "Maya fell for Equal or supplementary. One acute and one obtuse angle add to 180°: $8x + 4 = 180$, so $x = 22$, giving 71° and 109°. Her algebra is fine, since her equation does give $x = 3$. A sum of 360 is for a full turn. The 14° choice fixes Answering with x, but her equation was wrong to begin with.",
      subject: "math",
    },
    {
      text: "In which situation must angle $A$ and angle $B$ be equal?",
      choices: [
        "They are both acute angles where a transversal crosses two lines that are not parallel.",
        "They sit side by side and together form a straight line.",
        "Angle $A$ is acute and angle $B$ is obtuse where a transversal crosses two parallel lines.",
        "They are across from each other where two lines cross.",
      ],
      right: 3,
      why: "Angles across from each other where two lines cross are vertical angles, and vertical angles are always equal, for any lines. The tempting acute pair is the Only when parallel trap: without parallel lines, acute angles need not match. Side-by-side angles on a line add to 180°. An acute and an obtuse angle add to 180° too.",
      subject: "math",
    },
    {
      text: "Lines $\\ell$ and $m$ are parallel and are cut by a transversal. At line $\\ell$, one angle measures $(5k - 12)^\\circ$. At line $m$, an angle that is not equal to it measures $(3k + 32)^\\circ$. What is the measure of the smaller of these two angles?",
      choices: ["$20^\\circ$", "$88^\\circ$", "$92^\\circ$", "$98^\\circ$"],
      right: 1,
      why: "The angles are not equal, so one is acute and one is obtuse, and they add to 180°: $8k + 20 = 180$, so $k = 20$. The angles are $5(20) - 12 = 88$ and $3(20) + 32 = 92$, and the smaller is 88°. 20° is Answering with x. 92° is the larger angle. 98° comes from setting them equal, the Equal or supplementary trap.",
      subject: "math",
    },
  ],
};

export default lesson;
