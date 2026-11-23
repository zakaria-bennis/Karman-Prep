import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "m-functions-and-transformations",
  tests:
    "Finding a function's value from its rule, putting one function inside another, and telling how a change to the rule moves the graph.",
  spot: "Notation like $f(3)$ or $f(g(x))$, a table of inputs and outputs, or a new function written as $f(x - 2)$ or $f(x) + 5$.",
  idea: [
    "A function is a **rule**: put in $x$, get out $f(x)$. To find $f(3)$, replace every $x$ in the rule with 3.",
    "In a **composition** like $f(g(2))$, work from the inside out. Find $g(2)$ first, then feed that answer to $f$.",
    "A **shift** moves the whole graph: $f(x) + k$ moves it up $k$, with the sign. But $f(x - h)$ moves it right $h$, because a change inside the parentheses goes opposite the sign.",
  ],
  rules: [
    "$f(g(x))$: find $g$ first",
    "$f(x) + k$: up $k$",
    "$f(x - h)$: right $h$",
    "$f(x + h)$: left $h$",
  ],
  figure: {
    kind: "machine",
    rule: "$g(x) = 2x + 1$",
    pairs: [
      ["0", "1"],
      ["1", "3"],
      ["2", "5"],
    ],
    then: {
      rule: "$f(x) = x^2 - 3$",
      pairs: [
        ["1", "-2"],
        ["3", "6"],
        ["5", "22"],
      ],
    },
  },
  strategy: {
    name: "Inside out",
    steps: [
      "Start inside the parentheses: that is the input.",
      "Replace every $x$ in the rule with that input, in parentheses, and simplify.",
      "Carry the output out to the next function.",
      "For a shift, the inside moves the graph sideways, opposite the sign. The outside moves it up or down, with the sign.",
    ],
  },
  examples: [
    {
      title: "Composition",
      problem: "Let $f(x) = x^2 - 3$ and $g(x) = 2x + 1$. What is the value of $f(g(2))$?",
      steps: [
        {
          say: "Start inside: $g(2)$ is the innermost piece, so find it first.",
          show: "$g(2) = 2(2) + 1 = 5$",
        },
        { say: "Carry the 5 out. It becomes the input for $f$.", show: "$f(g(2)) = f(5)$" },
        { say: "Replace $x$ with 5 in the rule for $f$.", show: "$f(5) = 5^2 - 3 = 22$" },
      ],
      answer: "$22$",
      checkIn: {
        text: "Let $f(x) = x^2 + 1$ and $g(x) = 3x - 2$. What is the value of $f(g(2))$?",
        choices: ["$17$", "$13$", "$20$", "$4$"],
        right: 0,
        why: "Start inside: $g(2) = 3(2) - 2 = 4$. Then carry the 4 out: $f(4) = 4^2 + 1 = 17$. 13 is the **Outside first** trap: it works out $g(f(2))$ instead.",
        twin: {
          text: "Let $f(x) = x^2 - 5$ and $g(x) = x + 4$. What is the value of $f(g(1))$?",
          choices: ["$0$", "$-20$", "$20$", "$5$"],
          right: 2,
          why: "Start inside: $g(1) = 1 + 4 = 5$. Then carry the 5 out: $f(5) = 5^2 - 5 = 20$. 0 is the **Outside first** trap: it works out $g(f(1)) = g(-4)$ instead.",
        },
      },
    },
    {
      title: "Shifting a graph",
      problem:
        "The graph of $y = f(x)$ has its vertex at $(1, 4)$. Where is the vertex of the graph of $y = f(x - 3) - 2$?",
      figure: {
        kind: "plane",
        x: [-2, 8],
        y: [-1, 10],
        draw: [
          { parabola: [1, 1, 4], label: "f(x)", tone: "blue" },
          { point: [1, 4], label: "(1, 4)", tone: "blue" },
          { parabola: [1, 4, 2], label: "f(x - 3) - 2", tone: "warm" },
          { point: [4, 2], label: "(4, 2)", tone: "warm" },
        ],
      },
      steps: [
        {
          say: "Start inside the parentheses. $x - 3$ moves the graph sideways, opposite the sign: right 3.",
          show: "$(1 + 3, 4) = (4, 4)$",
        },
        {
          say: "Now the outside. $-2$ moves the graph down 2, with the sign.",
          show: "$(4, 4 - 2) = (4, 2)$",
        },
        {
          say: "Check: at $x = 4$ the input to $f$ is $4 - 3 = 1$, the old vertex. Its height drops by 2.",
          show: "$f(4 - 3) - 2 = f(1) - 2 = 4 - 2 = 2$",
        },
      ],
      answer: "$(4, 2)$",
      tryFrom: 1,
      checkIn: {
        text: "The graph of $y = f(x)$ has its vertex at $(2, -1)$. Where is the vertex of the graph of $y = f(x + 4) + 3$?",
        choices: ["$(6, 2)$", "$(-2, 2)$", "$(-2, -4)$", "$(6, -4)$"],
        right: 1,
        why: "Inside, $x + 4$ moves the graph left 4, opposite the sign: $2 - 4 = -2$. Outside, $+3$ moves it up 3: $-1 + 3 = 2$. $(6, 2)$ is the **Backward shift** trap: it moves right instead of left.",
        twin: {
          text: "The graph of $y = f(x)$ has its vertex at $(-3, 5)$. Where is the vertex of the graph of $y = f(x - 2) - 4$?",
          choices: ["$(-5, 1)$", "$(-1, 9)$", "$(-5, 9)$", "$(-1, 1)$"],
          right: 3,
          why: "Inside, $x - 2$ moves the graph right 2, opposite the sign: $-3 + 2 = -1$. Outside, $-4$ moves it down 4: $5 - 4 = 1$. $(-5, 1)$ is the **Backward shift** trap: it moves left instead of right.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Outside first",
      text: "$f(g(2))$ means find $g(2)$ first. Working the outside function first gives $g(f(2))$, a different number that is often one of the choices.",
    },
    {
      name: "Backward shift",
      text: "$f(x - 3)$ moves the graph right 3, not left. The new graph needs an input 3 bigger to reach the same output. Outside the parentheses, the sign means what it says.",
    },
    {
      name: "Missing parentheses",
      text: "Put each input in parentheses. For $f(x) = x^2$, $f(-3) = (-3)^2 = 9$, not $-9$.",
    },
  ],
  tip: {
    kind: "calculator",
    title: "Define, then call",
    steps: [
      "Define each function on its own line, with $f(x)=$ first.",
      "Type the composition in the order it is written.",
      "For a shift, type the new rule and add sliders for $h$ and $k$. Drag them to see which way the graph moves.",
    ],
    type: ["f(x)=x^2-3", "g(x)=2x+1", "f(g(2))", "y=f(x-h)+k"],
    note: "The screen shows 22. Typed the other way, g(f(2)) shows 3. Small compositions are just as quick by hand; the sliders help most when you are unsure which way a shift goes.",
  },
  check: {
    text: "Let $f(x) = 4x - 1$ and $g(x) = x + 3$. What is the value of $g(f(2))$?",
    choices: ["$10$", "$12$", "$19$", "$35$"],
    right: 0,
    why: "Start inside: $f(2) = 4(2) - 1 = 7$. Then $g(7) = 7 + 3 = 10$. $19$ is the **Outside first** trap: it finds $f(g(2)) = f(5)$. $35$ multiplies $f(2) \\cdot g(2) = 7 \\cdot 5$, and $12$ adds them.",
  },
  quiz: [
    {
      text: "The point $(2, 5)$ is on the graph of $y = h(x)$. Which point must be on the graph of $y = h(x - 4) - 1$?",
      choices: ["$(-2, 4)$", "$(-2, 6)$", "$(2, 0)$", "$(6, 4)$"],
      right: 3,
      why: "Work inside out. Inside, $x - 4$ moves the graph right 4, so $x$ goes from 2 to 6. Outside, $-1$ moves it down 1, so $y$ goes from 5 to 4: the point is $(6, 4)$. The tempting $(-2, 4)$ is the Backward shift: it moves left. $(-2, 6)$ flips both moves. $(2, 0)$ takes both numbers off the y-value, but the inside number moves the graph sideways.",
      subject: "math",
    },
    {
      text: "Let $f(x) = 2x + 3$ and $g(x) = x^2 - 1$. What should you do first to find $g(f(1))$?",
      choices: [
        "Find $f(1)$, then use the result as the input for $g$.",
        "Find $g(1)$, then use the result as the input for $f$.",
        "Find $f(1)$ and $g(1)$, then multiply them.",
        "Find $f(1)$ and $g(1)$, then add them.",
      ],
      right: 0,
      why: "Start inside the parentheses. The inside function is $f$, so find $f(1) = 5$, then $g(5) = 25 - 1 = 24$. Finding $g(1)$ first is the **Outside first** trap: it gives $f(g(1)) = f(0) = 3$, the answer to a different question. Multiplying gives $5 \\cdot 0 = 0$ and adding gives 5. A composition feeds one output into the next function; it does not combine two outputs.",
      subject: "math",
    },
    {
      text: "Maya finds $f(-3)$ for $f(x) = x^2 + 4x$. She writes $-3^2 + 4(-3) = -9 - 12 = -21$. What is the correct value of $f(-3)$?",
      choices: ["$-21$", "$-3$", "$3$", "$21$"],
      right: 1,
      why: "Replace every $x$ with $-3$, in parentheses: $(-3)^2 + 4(-3) = 9 - 12 = -3$. Maya's $-21$ is the **Missing parentheses** trap: without them, $-3^2$ means $-(3^2) = -9$. $21$ squares correctly but turns $4(-3)$ into $+12$. $3$ makes both slips: $-9 + 12$.",
      subject: "math",
    },
    {
      text: "The graph of $y = f(x) + 5$ is the graph of $y = f(x)$ moved up 5. How is the graph of $y = f(x + 5)$ moved?",
      choices: ["Up 5", "Down 5", "Left 5", "Right 5"],
      right: 2,
      why: "The $+5$ is inside the parentheses, so it moves the graph sideways, opposite the sign: left 5. Check with a point: if $f(0) = 2$, the new graph reaches 2 when $x + 5 = 0$, at $x = -5$. Right 5 is the **Backward shift** trap. Up 5 treats the inside number like the outside one, which answers the other question. Down 5 mixes both mistakes.",
      subject: "math",
    },
    {
      text: "The function $f$ is defined by $f(x) = x^2 - 4x$. The function $g$ is defined by $g(x) = f(x - 2) + 3$. What is the value of $g(5)$?",
      choices: ["$0$", "$6$", "$8$", "$24$"],
      right: 0,
      why: "Work inside out. The input to $f$ is $5 - 2 = 3$, so $f(3) = 9 - 12 = -3$, and $g(5) = -3 + 3 = 0$. The tempting $24$ is the Backward shift: it uses $f(7) = 21$, then adds 3. $8$ skips the shift and finds $f(5) + 3$. $6$ moves the $-2$ outside: $f(5) - 2 + 3$.",
      subject: "math",
    },
  ],
};

export default lesson;
