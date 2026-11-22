# The Math question generator

Made overnight on 2026-11-22 so Endless and every practice mode never run dry. Questions are made
by code, with computed answers, never by a paid AI service. They are used in practice only, never
in a full-length exam. Students never see that a question was generated; an admin can.

A question is a pure function of **(template id, seed)**. The same pair always gives the same
question, so a stored question can be rebuilt and checked at any time.

## How it fits together

- `core/rng.ts`: seeded random draws (`rng.int`, `rng.nonzero`, `rng.pick`, `rng.sample`,
  `rng.shuffle`, `rng.bool`, `rng.sign`).
- `core/frac.ts`: exact fractions (`F(3, 4)`, `.add .sub .mul .div .neg .pow .eq .cmp .isInt`,
  `.toString()` gives `"3/4"`). Never use floating point for an answer.
- `core/sym.ts`: exact numbers with square roots and pi kept symbolic (`S.root(72)` is
  `6\sqrt{2}`, `S.pi(F(9, 2))`, `.add .mul .eq .asRat .toNumber`).
- `core/tex.ts`: LaTeX for MathText: `num`, `n` (a number for prose, already wrapped in `$`),
  `m` (wrap in `$...$`), `block` (`$$...$$` on its own line), `lin` (`3x - 2y + 5`), `poly`, `pow`,
  `times` (`9(4)`, `-2(-3)`), `signed` (`+ 3`, `- 3`), `paren`, `money` (`\$12.50`), `pct`
  (`25\%`), `sym` (radicals and pi), `pair`, `int`, `dec`.
- `core/figures.ts`: figures in the figure engine's format: `frame`, `plane`, `line`, `curve`,
  `vertical`, `point`, `geometry`, `table`, `scatter`, `histogram`, `dotPlot`, `boxPlot`, `bars`.
- `core/types.ts`: `Template`, `Draft`, `Answer`, `Slip`, `Step`, `MathItem`.
- `core/build.ts`: turns a template and a seed into a finished `MathItem`, or refuses it and draws
  again (up to 40 attempts). Also `need(cond)` (draw again when false), `numAnswer(value, text)`,
  `Retry`, `sameAnswer`, `EXPR_POINTS`.
- `core/render.ts`: every text must compile in KaTeX and read cleanly.
- `registry.ts`: every template, by skill. `skills/<skill>.ts`: one file per Math skill (the 38
  `m-` ids in `src/lib/skills/ids72.ts`), each exporting `TEMPLATES`.

## Writing a template

A template draws numbers and returns a `Draft`. Build each question **backward from a chosen
answer** so the numbers come out clean, then describe the work forward.

```ts
export const twoStep: Template = {
  id: "lin-eq.two-step",           // "<short skill prefix>.<what it makes>", stable forever
  skill: "m-solving-linear-equations",
  label: "Solve ax + b = c",
  difficulty: [1, 3],              // every draft's difficulty must fall inside
  formats: ["mc", "spr"],          // spr only when the answer is a short rational
  make(rng, format) {
    const a = rng.pick([2, 3, 4, 5, -2, -3]);
    const x = rng.nonzero(-12, 15);
    const b = rng.nonzero(-20, 25);
    const c = a * x + b;
    need(c !== 0, "trivial");      // draw again when a condition fails
    ...
    return { format, stem, answer, slips, asks, steps, check, tip, hint, difficulty, isCorrect };
  },
};
```

See `skills/solving-linear-equations.ts` for five complete templates.

### The parts of a Draft

- **stem**: the question, SAT style, as MathText. Math always in `$...$`; a standalone equation or
  system can sit on its own line in `$$...$$` followed by a line break and the question. Money is
  math: `m(money(12.5))` gives `$\$12.50$`. Never a bare `$` in prose. Use `\le` and `\ge`.
- **answer**: `numAnswer(value, m(num(value)))` for a number; `{ text, expr }` for an expression
  (with `expr(vars)` computing its value); `{ text, key }` for a statement or category.
- **slips**: wrong answers from **real, named slips**, most common first, 4 to 6 of them. Compute
  each from the same draws by redoing the slip ("adds instead of subtracts", "stops at 3x = 15",
  "uses the diameter as the radius", "reports the March total, not April"). The builder drops a
  slip equal to the answer or to another slip and keeps the first three left, so give spares.
  `why` is a short clause in the second person, no period: `you multiplied by 3 instead of dividing`.
  Never "a calculation error".
- **asks**: what the question really asks, in one plain sentence ("the value of the expression
  $3x + 28$, not the value of $x$").
- **steps**: 2 to 5 steps. `label` names the goal in 2 to 6 words ("Get the $x$-term alone",
  "Find the slope"), never a bare operation ("Subtract", "Simplify"). `work` shows the move in the
  question's own numbers, and the reason where a student would ask why ("because x is multiplied
  by 9"). The last step lands on the answer.
- **check**: a check by a different route: substitute back, estimate, recount, test the other
  condition.
- **tip**: one sentence the student can use on a different question of this skill (a rule or a
  first move), never a recap of this answer.
- **hint**: one short nudge toward the first move. Never the answer, never a number that gives it
  away.
- **difficulty**: 1 to 7, set from features (negative numbers, fractions, extra steps, an unusual
  form, a trap like "asks for 2x, not x"). Match the bank's spread for the skill: each sample file
  lists `difficultyCounts`.
- **isCorrect(candidate)**: the independent check. It must not reuse the work that built the
  answer: substitute the candidate into the original equation, count solutions again, evaluate an
  expression at the `EXPR_POINTS` against the original expression, recompute an area from the
  figure's numbers by another formula. The builder requires it to accept the answer and reject
  every chosen wrong choice.

The builder writes the explanation from these parts in the founder's "full teaching" shape: what
it asks, numbered steps, a check, every wrong choice by its words (never its letter: choices are
shuffled), and a tip. Typed answers get "Watch out" lines from the first two slips instead.

### Style

- American spelling, plain words, short sentences. No "simply", "just", "obviously", "clearly",
  "easy", "of course", "note that". No openers ("Let's") and no recap.
- Numbers in prose that may be negative or fractional go through `n()`.
- Products in a substitution use `times()`: `9(4) - 13`, never `94 - 13`.
- Word problems: vary names, objects and settings (keep lists of them); no real brands; nothing
  unsafe or upsetting. Units in words ("meters", "dollars").
- Never copy a real question. Model the type (its structure, length and difficulty), not its words.

### Figures

Use `core/figures.ts`. Keep a figure small (under about 3 KB of JSON: a line is two points, a curve
about a hundred). `geometry()` takes y-down coordinates (as an image). Every figure goes through
the figure engine's parser and checks in the builder. Use a figure only where the skill needs one
(graphs, data displays, shapes).

## Checking your work

```bash
GEN_SEEDS=2000 GEN_SKILL=m-circles npx vitest run src/lib/generator/math
```

```bash
npx tsx scripts/generator/math-preview.ts --skill m-circles --show 3 --seeds 500
```

Each template must build on at least 97% of seeds, pass every check, give at least 90% distinct
questions, and be deterministic. Then read the preview output as a tutor would: is the math right,
is the wording natural, does every wrong-choice line describe a slip that really gives that number?
