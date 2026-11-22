import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-systems-in-context",
  tests:
    "Writing a system from a word problem and solving it, and telling when a system has no solution or infinitely many.",
  spot: "Two unknown amounts and two facts, such as a total count and a total cost. Or the words no solution, infinitely many solutions, or for what value of $k$.",
  idea: [
    "Most word problems give two facts about two unknowns. Name each unknown with a letter, then write **one equation per fact**: usually a count equation and a value equation.",
    "Solve the system as usual. Then check which letter the question asks about, because each letter is a different group.",
    "Two lines can also miss each other. **Same slope, different intercept** means parallel lines that never meet, so there is **no solution**.",
    "If one equation is just a multiple of the other, both are the same line. Every point on it works, so there are **infinitely many solutions**.",
  ],
  rules: [
    "Count: $x + y = \\text{total}$",
    "Value: $ax + by = \\text{total value}$",
    "No solution: $x$ and $y$ parts match, numbers differ",
    "Infinitely many: everything matches",
  ],
  figure: {
    kind: "plane",
    x: [0, 100],
    y: [0, 100],
    xLabel: "tacos",
    yLabel: "bowls",
    draw: [
      { line: [-1, 80], label: "x + y = 80", tone: "blue" },
      { line: [-2 / 3, 190 / 3], label: "6x + 9y = 570", tone: "warm" },
      { point: [50, 30], label: "(50, 30)", tone: "green" },
    ],
  },
  strategy: {
    name: "Two facts, two equations",
    steps: [
      "Name each unknown with a letter, and write down what it stands for.",
      "Turn each fact into an equation: one for the count, one for the value.",
      "Solve by substitution or elimination, then answer for the group asked about.",
      "Asked about no solution or infinitely many? Line the equations up and compare their parts instead of solving.",
    ],
  },
  examples: [
    {
      title: "Count and value",
      problem:
        "A food truck sold 80 meals in one day. Tacos cost 6 dollars and bowls cost 9 dollars. The truck took in 570 dollars. How many tacos did it sell?",
      steps: [
        { say: "Name the unknowns.", show: "$x$ = tacos, $y$ = bowls" },
        { say: "The count fact: 80 meals in all.", show: "$x + y = 80$" },
        { say: "The value fact: 570 dollars in all.", show: "$6x + 9y = 570$" },
        {
          say: "Multiply the count equation by 6 and subtract it from the value equation. The $x$ terms cancel.",
          show: "$3y = 90 \\Rightarrow y = 30$",
        },
        { say: "The question asks for tacos, which is $x$.", show: "$x = 80 - 30 = 50$" },
      ],
      answer: "$50$ tacos",
      checkIn: {
        text: "A theater sold 120 tickets. Child tickets cost 5 dollars and adult tickets cost 8 dollars. The theater took in 840 dollars. How many child tickets did it sell?",
        choices: ["$80$", "$40$", "$105$", "$168$"],
        right: 1,
        why: "Let $x$ be child tickets and $y$ adult tickets: $x + y = 120$ and $5x + 8y = 840$. Subtract 5 times the first: $3y = 240$, so $y = 80$ and $x = 40$. 80 is the **Mixed-up letters** trap: it is the adult tickets.",
        twin: {
          text: "A store sold 50 shirts. Plain shirts cost 10 dollars and printed shirts cost 15 dollars. The store took in 620 dollars. How many plain shirts did it sell?",
          choices: ["$24$", "$62$", "$25$", "$26$"],
          right: 3,
          why: "Let $x$ be plain shirts and $y$ printed shirts: $x + y = 50$ and $10x + 15y = 620$. Subtract 10 times the first: $5y = 120$, so $y = 24$ and $x = 26$. 24 is the **Mixed-up letters** trap: it is the printed shirts.",
        },
      },
    },
    {
      title: "No solution",
      problem:
        "For what value of $k$ does the system $3x + ky = 7$ and $6x + 4y = 10$ have no solution?",
      figure: {
        kind: "plane",
        x: [-2, 4],
        y: [-3, 7],
        draw: [
          { line: [-1.5, 3.5], label: "3x + 2y = 7", tone: "blue" },
          { line: [-1.5, 2.5], label: "3x + 2y = 5", tone: "warm" },
        ],
      },
      steps: [
        {
          say: "No solution means parallel lines. The $x$ and $y$ parts must match, while the numbers on the right differ.",
        },
        { say: "Halve the second equation so its $x$ term matches $3x$.", show: "$3x + 2y = 5$" },
        { say: "Now match the $y$ terms.", show: "$k = 2$" },
        {
          say: "Check the numbers: 7 and 5 differ, so the lines never meet.",
          show: "$3x + 2y = 7$ and $3x + 2y = 5$",
        },
      ],
      answer: "$k = 2$",
      tryFrom: 2,
      checkIn: {
        text: "For what value of $k$ does the system $2x + ky = 5$ and $4x + 6y = 9$ have no solution?",
        choices: ["$6$", "$12$", "$3$", "$1.5$"],
        right: 2,
        why: "No solution means the $x$ and $y$ parts match while the right sides differ. Halve the second equation so its $x$ term is $2x$: $2x + 3y = 4.5$. So $k = 3$, and 5 and 4.5 differ. 6 skips the halving.",
        twin: {
          text: "For what value of $k$ does the system $kx + 5y = 4$ and $9x + 15y = 6$ have no solution?",
          choices: ["$3$", "$9$", "$27$", "$1$"],
          right: 0,
          why: "No solution means the $x$ and $y$ parts match while the right sides differ. Divide the second equation by 3 so its $y$ term is $5y$: $3x + 5y = 2$. So $k = 3$, and 4 and 2 differ. 9 skips the dividing.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Mixed-up letters",
      text: "Write down what each letter means before you start. Solving for $y$ and answering with $x$ gives the size of the other group, and that number is always a choice.",
    },
    {
      name: "Count and value mixed",
      text: "Prices and point values go only in the value equation. The count equation adds the items: $x + y = 80$, never $6x + 9y = 80$.",
    },
    {
      name: "Matching the numbers too",
      text: "For no solution, the $x$ and $y$ parts match but the numbers on the right must differ. If the numbers match too, it is the same line, with infinitely many solutions.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Zoom out to cross",
    steps: [
      "Type both equations as given, using $x$ and $y$ for the two groups.",
      "Zoom out: word-problem crossings are often far off the starting screen.",
      "Click the crossing and read the letter the question asks about.",
    ],
    type: ["x+y=80", "6x+9y=570"],
    note: "The crossing is $(50, 30)$, so 50 tacos. For no solution or infinitely many, comparing the equations by hand is faster and safer than the graph.",
  },
  check: {
    text: "A theater sold 200 tickets. Adult tickets cost 8 dollars and student tickets cost 5 dollars. Ticket sales totaled 1,360 dollars. How many student tickets were sold?",
    choices: ["$80$", "$100$", "$120$", "$272$"],
    right: 0,
    why: "Let $a$ be adult tickets and $s$ student tickets. Then $a + s = 200$ and $8a + 5s = 1360$. Multiply the first by 8 and subtract: $3s = 240$, so $s = 80$. 120 is the number of adult tickets, the mixed-up letters trap. 100 just splits 200 in half. 272 is $1360 \\div 5$, as if every ticket were a student ticket.",
  },
  quiz: [
    {
      text: "For what value of $k$ does the system $2x - 5y = 4$ and $kx - 15y = 9$ have no solution?",
      choices: ["$2$", "$3$", "$6$", "$12$"],
      right: 2,
      why: "No solution means the $x$ and $y$ parts match while the numbers differ. To turn $-5y$ into $-15y$, triple the first equation: $6x - 15y = 12$. So $k = 6$, and the numbers 12 and 9 differ, so the lines are parallel. 2 matches the first equation before scaling it. 3 is the scale factor, not $k$. 12 is the tripled number on the right, not the $x$ coefficient.",
      subject: "math",
    },
    {
      text: "A gym has 45 members on two plans. Basic costs 20 dollars a month and Plus costs 35 dollars a month. Together the members pay 1,200 dollars a month. If $b$ is the number of Basic members and $p$ the number of Plus members, which system models this?",
      choices: [
        "$b + p = 45$ and $35b + 20p = 1200$",
        "$b + p = 1200$ and $20b + 35p = 45$",
        "$b + p = 45$ and $55(b + p) = 1200$",
        "$b + p = 45$ and $20b + 35p = 1200$",
      ],
      right: 3,
      why: "Write one equation per fact. The count fact is $b + p = 45$. The value fact multiplies each price by its own group: $20b + 35p = 1200$. The tempting $35b + 20p$ gives each group the other plan's price, the mixed-up letters trap. Putting 1,200 in the count equation is the count and value mixed trap. $55(b + p)$ charges every member both prices.",
      subject: "math",
    },
    {
      text: "A team made 30 shots worth 70 points, some worth 2 points and some worth 3 points. Lena writes $x + y = 30$ and $2x + 3y = 70$, finds $x = 20$ and $y = 10$, and says the team made 20 three-point shots. Why is she wrong?",
      choices: [
        "Her points equation should be $3x + 2y = 70$.",
        "In her equations, $x$ counts 2-point shots, so the answer is $y = 10$.",
        "The count equation should be $2x + 3y = 30$.",
        "The system has no solution, so no count works.",
      ],
      right: 1,
      why: "Check what each letter stands for. In $2x + 3y = 70$, $x$ is multiplied by 2, so $x$ counts 2-point shots and $y$ counts 3-point shots. She solved correctly but answered with the wrong group, the mixed-up letters trap. Her points equation is fine for her letters. Putting point values in the count equation is the count and value mixed trap. The lines do cross, at $(20, 10)$.",
      subject: "math",
    },
    {
      text: "Which system has infinitely many solutions?",
      choices: [
        "$x + 2y = 6$ and $3x + 6y = 18$",
        "$x + 2y = 6$ and $3x + 6y = 12$",
        "$x + 2y = 6$ and $2x + y = 6$",
        "$x + 2y = 6$ and $x - 2y = 6$",
      ],
      right: 0,
      why: "Line the equations up and compare. Tripling $x + 2y = 6$ gives $3x + 6y = 18$, exactly the second equation, so both are the same line and every point on it works. $3x + 6y = 12$ matches the $x$ and $y$ parts but not the number, so those lines are parallel with no solution. $2x + y = 6$ and $x - 2y = 6$ each have a slope different from the first line, so each of those systems has exactly one solution.",
      subject: "math",
    },
    {
      text: "At a bake sale, muffins sold for 3 dollars each and pies for 12 dollars each. In all, 64 items were sold for 300 dollars. How many more muffins than pies were sold?",
      choices: ["$12$", "$40$", "$52$", "$64$"],
      right: 1,
      why: "Let $m$ be muffins and $p$ pies: $m + p = 64$ and $3m + 12p = 300$. Triple the count equation and subtract it: $9p = 300 - 192 = 108$, so $p = 12$ and $m = 52$. The question asks how many more muffins, so $52 - 12 = 40$. The tempting 52 is the number of muffins, not the difference. 12 is the number of pies. 64 is the total count from the problem.",
      subject: "math",
    },
  ],
};

export default lesson;
