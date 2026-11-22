# Graphing calculator tricks for SAT Math, skill by skill

Research note, 2026-11-22. Read-only research: no code, lesson, question or calculator file was changed.

**Who reads this.** The Lessons writers, who put one calculator tip in every Math lesson (each skill's "Trick" line in section 3 is written so it can be lifted into a lesson), and the Calculator team, which builds Karman's own graphing calculator and needs to know which features these tricks depend on.

**How this was made.** The test's built-in graphing calculator is Desmos. Nothing was fetched from Desmos's website, help pages or images. The techniques come from College Board pages, tutor sites, student forums and the Calculator team's own spec (which records test-day behavior), described in our own words. Every worked example was made up for this note, and its numbers were checked.

**Conventions.** Keystrokes are in `code`. `→` means press the right-arrow key once. "Click" also means tap. Spaces inside keystrokes are only for reading.

## Short summary

1. Five moves carry most of the value: graph both sides and click the crossing; click the gray dots (zeros, vertex, intercepts); drag a slider for an unknown constant; fit constants with `~` regression (including a list regression for "for all x" questions); and summarize lists with `mean`, `median` and `stdev`.
2. The calculator does no algebra. It graphs and computes numbers. College Board writes some questions where it does not help, and the Math section allows about 1.6 minutes per question, so typing time counts.
3. Most calculator mistakes are typing mistakes: a fraction's bottom that swallows the rest of the line, exponents without parentheses, radian mode left on, and a window too small to show the crossing.
4. Eight skills barely use the calculator: equations from words, parallel and perpendicular lines, units, probability, samples and margin of error, studies and experiments, lines and angles, and triangles. Their tips should be honest: a by-hand method, with the calculator only as a check.
5. For the Calculator team, the must-haves are graphing, clickable points of interest, sliders with editable limits, tables, `~` regression (custom forms and plain lists too), list statistics, inequality shading, function notation, the angle setting and zoom.

## 1. How the calculator helps

**What College Board says**

- A built-in Desmos calculator is available on every question of the Math section, with a graphing and a scientific version that students can switch between. Students may bring their own approved calculator instead. (Calculator policy; Assessment Framework 5.3.2)
- College Board writes Math questions knowing students may use a calculator, checks that it does not make questions trivial, and writes some questions where a calculator is not needed or does not help. (Assessment Framework 5.3.2)
- The Math section has 44 questions in 70 minutes: about 1.6 minutes per question. (Assessment Framework, timing table)
- College Board advises practicing with the calculator you will use on test day, for example in a Bluebook practice test. (Calculator policy)

**What it is good at:** turning equations into pictures and reading exact points off them, testing many numbers at once (tables and lists), fitting models to data (regression), and messy arithmetic.

**What it cannot do**

- Algebra. It cannot factor, expand, simplify or rearrange a formula ("solve for h in terms of V").
- Exact answers. It shows decimals, and point labels show about five decimal places. Fractions, roots and π have to be matched by typing the answer choices.
- See past the window. It draws only what is on screen, which starts at about −10 to 10.
- Guess intent. It graphs exactly what was typed.

**Typing basics**

| To get           | Type                            | Watch out                                                                                           |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Exponent         | `x^2`, `2^(x+1)`                | `+ - = < > *` step out of an exponent by themselves. Put longer exponents in parentheses.           |
| Fraction         | `(x+4)/3`                       | `/` makes the term before it the top. Everything typed next goes on the bottom until you press `→`. |
| Square root      | `sqrt(x+7)`                     | The root keeps what you type until `→`. `cbrt` gives a cube root.                                   |
| π                | `pi`                            |                                                                                                     |
| Subscript        | `x1` gives x₁                   | A digit typed right after a letter becomes a subscript.                                             |
| ≤ and ≥          | `<=`, `>=`                      |                                                                                                     |
| Fit (regression) | `~`                             | Shift and the backtick key.                                                                         |
| List             | `L = [3, 5, 9]`, `[1...10]`     | Square brackets only. Curly braces mean a restriction.                                              |
| Restriction      | `y = x^2 {x > 0}`               |                                                                                                     |
| Percent of       | `30%250`                        | Shows "30% of 250" = 75.                                                                            |
| Absolute value   | `abs(x-3)`                      |                                                                                                     |
| Function         | `f(x) = 3x^2 - x`, then `f(-2)` | Define it before using it. Names are one letter.                                                    |
| Point            | `(1, 4)`                        | Plots the point.                                                                                    |

## 2. The core moves

### 2.1 Graph both sides and click the crossing

- **What:** Each side of a one-variable equation becomes its own graph. The x-value where they cross solves the equation.
- **When:** Any equation in one variable: linear, quadratic, radical, absolute value, exponential, rational.
- **Type:** `y = 2(x+3) - 5`, then `y = 7 - x`. Click the crossing: (2, 5), so x = 2. Shortcut: type `2(x+3) - 5 = 7 - x` as one line, and the calculator draws a vertical line at each solution (here x = 2).
- **Mistake:** Giving the y-value (5). The shortcut draws only solutions inside the window, so zoom out if nothing appears.

### 2.2 Count crossings for "how many solutions"

- **What:** The number of crossings is the number of real solutions.
- **When:** "How many solutions", "no real solution", "exactly one solution".
- **Type:** `y = x^2 - 4x` and `y = -5`. They never cross, so there is no real solution (check: x² − 4x + 5 = 0 has discriminant −4). One curve with no x-axis dots also means no real zeros.
- **Mistake:** Counting in a window that is too small. A line that only touches a curve may get no dot, so confirm a touch with the discriminant.

### 2.3 Click points of interest: zeros, vertex, intercepts

- **What:** Click a curve (or its row) and gray dots appear at x-intercepts, the y-intercept, high and low points, and crossings with other graphs. Click a dot to see its coordinates.
- **When:** Roots, zeros, x-intercepts, vertex, maximum or minimum, y-intercept.
- **Type:** `y = (x-1)(x-5)`. Dots: zeros (1, 0) and (5, 0), vertex (3, −4), y-intercept (0, 5).
- **Mistake:** Expecting dots before the curve is selected. A label of 1.41421 means √2, so type the choices to match the decimal.

### 2.4 Systems: click the crossing point

- **What:** The solution of a system is where the graphs cross.
- **When:** Two lines, a line and a parabola, a line and a circle.
- **Type:** `2x + y = 7` and `x - y = 2`, as given (no need to solve for y). The crossing is (3, 1).
- **Mistake:** Answering x when the question asks for y, x + y or xy. A nonlinear system can have two crossings; click both.

### 2.5 Sliders for an unknown constant

- **What:** Any letter other than x or y (like k or c) gets an "add slider" button. Dragging the slider moves the graph.
- **When:** "For what value of k does the graph pass through a point, touch the x-axis, or give one solution?"
- **Type:** `y = x^2 + 6x + c`. Click "add slider" for c and drag until the two x-intercept dots merge into one: c = 9.
- **Mistake:** The slider starts at −10 to 10 and moves through decimals. Click its end numbers to widen the range and set a step of 1. Do not use r, e or θ as the letter: they already mean something.

### 2.6 Regression with `~` from a table or points

- **What:** The calculator finds the constants of a model that fits the data. `~` means "fit", not "equals".
- **When:** A table, two or more points, or a scatterplot, when the question asks for the model or its constants.
- **Type:** Add a table (+ menu, Table). Put x-values in x₁ and y-values in y₁. On a new line type `y1 ~ m x1 + b` (line), `y1 ~ a x1^2 + b x1 + c` (parabola) or `y1 ~ a b^x1` (exponential), and read the constants under the row. Example: (1, 5), (2, 8) and (4, 14) give m = 3 and b = 2. Exponential fits may show a "Log mode" box; when the points fit exactly, the answer is the same either way.
- **Mistake:** Using x instead of x₁, or = instead of `~`. Fit the form the question uses (vertex form, a·bˣ) so the constants match the choices.

### 2.7 Constants that make an equation true for every x

- **What:** "For all x" and "infinitely many solutions" both mean the two sides are the same expression. A regression over a list of x-values finds the missing constants.
- **When:** "(ax + 3)(x − b) = 2x² − 5x − 12 for all x", or "ax + 7 = 3(x + 2) + 1 has infinitely many solutions".
- **Type:** `x1 = [1, 2, 3, 4, 5]`, then `2x1^2 - 5x1 - 12 ~ (a x1 + 3)(x1 - b)`. Result: a = 2, b = 4. For the second, `3(x1+2) + 1 ~ a x1 + 7` gives a = 3.
- **Mistake:** Leaving out the list line, or using fewer list values than unknowns. For "no solution", regression does not help: the x-terms must match and the constants must differ (same slope, different intercept). Compare coefficients by hand; tutors warn that sliders mislead here.

### 2.8 Check answer choices by graphing each

- **What:** Equivalent expressions have the same graph.
- **When:** "Which expression is equivalent to ...?", with polynomials, fractions, exponents or factored forms.
- **Type:** `y = (x+2)^2 - (x-1)^2`, then `y = 6x + 3`. The second graph disappears into the first, so they are equivalent. Click the colored circle beside a row to hide or show it.
- **Mistake:** Treating one shared point as a match: the curves must overlap everywhere. If the expression has a second letter (like y), replace it with a slider letter such as a and check that the overlap holds as you drag.

### 2.9 Tables to test many inputs at once

- **What:** A table column can be computed from the first column.
- **When:** Testing four answer choices in one expression, or "which table matches this function".
- **Type:** Add a table and put the choices 2, 3, 4, 5 in x₁. Type `x1^3 - 3x1` as the second column's heading. The column shows 2, 18, 52, 110, so for x³ − 3x = 52 the answer is 4.
- **Mistake:** Typing a choice wrongly, especially negatives and fractions.

### 2.10 Function notation, composition and transformations

- **What:** Define a function once, then use it anywhere.
- **When:** f(3), f(a) = b, f(g(x)), shifts and stretches.
- **Type:** `f(x) = 3x^2 - x`, then `f(-2)` shows 14. Add `g(x) = x/2→ + 4`; `g(f(1))` shows 5. For shifts, type `y = f(x-h) + k` and add sliders for h and k.
- **Mistake:** Typing `f(2)` before f is defined: the calculator reads it as f times 2 and offers a slider.

### 2.11 Inequalities: shading and testing a point

- **What:** Inequalities graph as shaded regions. A dashed edge is not included (< or >); a solid edge is (≤ or ≥).
- **When:** "Which point is a solution", "which graph shows the solutions", systems of inequalities.
- **Type:** `y < -2x + 4`, then `(1, 1)`. The point sits in the shading, so it is a solution. For a system, the solutions are where the shadings overlap.
- **Mistake:** Trusting the eye for a point that seems to sit on an edge. Substitute it.

### 2.12 Lists and statistics

- **What:** A list in square brackets can be summarized with built-in functions.
- **When:** Mean, median, range, standard deviation, comparing two data sets, frequency tables.
- **Type:** `L = [4, 8, 8, 10, 15]`, then `mean(L)` (9), `median(L)` (8), `max(L) - min(L)` (11) and `stdev(L)` (4). For a frequency table with values v and counts c, type `D = repeat(v, c)`, then `mean(D)` and `median(D)`.
- **Mistake:** Curly braces instead of square brackets. `stdev` divides by n − 1 and `stdevp` by n. The SAT mostly asks which set is more spread out, so use the same one for both sets.

### 2.13 Percent and repeated growth

- **What:** Type percent changes as multipliers and let the calculator do powers and chains.
- **When:** Percent of, percent change, repeated growth or decay, reverse percent.
- **Type:** `30%250` shows "30% of 250" = 75. Growth: `1500*1.04^6` ≈ 1,897.98. Percent change: `(68-64)/64→ *100` = 6.25. Reverse: graph `y = 1.15x` and `y = 230` and zoom out; the crossing's x-value (200) is the original.
- **Mistake:** Typing 4 or 0.04 instead of the multiplier 1.04, or dividing by the new value in a percent change.

### 2.14 Circles: read the graph, or complete the square

- **What:** A circle equation can be typed as given, even in expanded form.
- **When:** Center, radius, a point on the circle, where a line meets a circle.
- **Type:** `x^2 + y^2 + 4x - 10y + 20 = 0`. Click the circle: dots mark its top (−2, 8), its bottom (−2, 2) and any axis crossings, but not its leftmost or rightmost points. The center is halfway between top and bottom, (−2, 5), and the radius is half the gap, 3. Confirm by typing `(x+2)^2 + (y-5)^2 = 9` on top.
- **Mistake:** Giving r² (9) as the radius. When the radius is not a whole number, complete the square by hand or type the choices to compare decimals.

### 2.15 Angle mode: degrees and radians

- **What:** sin, cos and tan read angles in the current mode. The test calculator starts in radians.
- **When:** Degrees for angles with a ° sign or like 30, 45, 60; radians for angles with π or the word radians.
- **Type:** Click the wrench (settings) and choose Degrees or Radians. Test it: `sin(30)` is 0.5 in degrees and about −0.988 in radians. Angles from ratios: `arcsin(0.5)` is 30 in degrees.
- **Mistake:** Forgetting to switch, or switching and forgetting to switch back. The mode never converts a number (to convert, multiply by π/180 or 180/π), and a typed degree sign does not work.

### 2.16 Decimals, fractions and rounding

- **What:** The calculator answers in decimals. Exact answers must be matched to the choices.
- **When:** Choices with fractions, radicals or π, and typed (student-produced) answers.
- **Type:** A result row has a fraction button: `18/48` shows 0.375, and the button turns it into 3/8. For a point label such as 1.85714, type each choice (`13/7`, `3+sqrt(5)`) and compare. For a typed answer, entering the fraction (13/7) avoids rounding questions.
- **Mistake:** Rounding in the middle of a problem, or retyping a rounded decimal (the fraction button does not work on 1.85714). Name exact values (`a = 13/7`) and round only at the end.

### 2.17 Zoom and window

- **What:** The screen shows only part of the plane, about −10 to 10 at the start.
- **When:** Word problems with big numbers, crossings that "aren't there", slopes or right angles that look wrong.
- **Type:** Zoom out with the minus button or a pinch. Or open the wrench and type x and y limits that match the question (for ticket sales, x from 0 to 150). The home button returns to the starting view.
- **Mistake:** Deciding "no solution" from the first screen. Uneven zooming also makes perpendicular lines look slanted.

### 2.18 When not to use the calculator

- College Board writes some questions where a calculator is not needed or does not help, and there are only about 1.6 minutes per question.
- Skip it for one- or two-step arithmetic and equations, "in terms of" questions (it cannot rearrange formulas), exponent rules and simple factoring, reading graphs, tables and study designs, and "what does this number mean" questions.
- Tutors' rule of thumb: if hand work takes about 15 seconds, do it by hand, and use the calculator to check if time allows.

## 3. Skill by skill

Each entry gives the best trick, one made-up SAT-style example (numbers checked), the trap, and when hand work wins. "(2.x)" points to a core move above.

### Algebra

#### m-solving-linear-equations · Solving linear equations

- **Trick (2.1):** 1) Type `y = (2x+1)/3`. 2) Type `y = (x-4)/5→ + 2`. 3) Click the crossing; its x-value is the answer.
- **Example:** Solve (2x + 1)/3 = (x − 4)/5 + 2. The crossing is at x ≈ 1.85714. Typing the choice `13/7` shows 1.857142…, so x = 13/7.
- **Trap:** `2x+1/3` puts only the 1 on top. Wrap the whole top in parentheses and press `→` after each bottom.
- **Faster by hand?** Yes for one- or two-step equations such as 3x + 5 = 20.

#### m-number-of-solutions · Number of solutions

- **Trick (2.2, 2.5):** 1) Type each side as `y = ...`. 2) One crossing means one solution, parallel lines mean none, and one line hiding the other means infinitely many. 3) For an unknown constant, add a slider and drag.
- **Example:** For what k does 4(x − 3) + 2x = 6x + k have infinitely many solutions? Type `y = 4(x-3) + 2x` and `y = 6x + k`, add the slider and widen its range: the lines merge only at k = −12, outside the default −10 to 10.
- **Trap:** Missing the answer because the slider range is too narrow, or calling nearly parallel lines parallel. Zoom out or compare slopes.
- **Faster by hand?** Usually. Simplify: 6x − 12 = 6x + k, so k = −12. Same slope and intercept means infinitely many; same slope with a different intercept means none.

#### m-equations-from-words · Equations from words

- **Trick:** The calculator cannot write the equation, but it can check one. 1) Write your equation with x and y. 2) Graph it. 3) Click a point and test it against one fact from the story.
- **Example:** A 500-liter tank drains at 12 liters per minute. When does it hold 140 liters? Type `y = 500 - 12x` and `y = 140`. Zoom out: they cross at (30, 140). After 30 minutes, 360 liters have drained and 140 remain.
- **Trap:** Swapping the starting amount and the rate (y = 12 − 500x). The y-intercept should be the starting amount.
- **Faster by hand?** Yes for writing the equation. Use the graph only to check.

#### m-slope-and-rate-of-change · Slope and rate of change

- **Trick (2.6):** 1) Add a table and enter the points in x₁ and y₁. 2) Type `y1 ~ m x1 + b`. 3) Read m (the slope) and b (the starting value).
- **Example:** A candle is 21.5 cm tall after 2 hours, 17 cm after 5 hours and 12.5 cm after 8 hours. The fit gives m = −1.5 and b = 24.5: it burns 1.5 cm per hour and started at 24.5 cm.
- **Trap:** Dividing the x-change by the y-change, or dropping the minus sign for something that shrinks.
- **Faster by hand?** With two clean points, yes: `(17-21.5)/(5-2)` gives −1.5.

#### m-graphs-of-lines · Graphs of lines

- **Trick (2.3):** 1) Type the line as given, for example `3x - 4y = 24` (no need to solve for y). 2) Click the line. 3) Click the gray dots on the axes.
- **Example:** What is the x-intercept of 3x − 4y = 24? The dots read (8, 0) and (0, −6), so the x-intercept is (8, 0).
- **Trap:** Giving the y-intercept when the x-intercept is asked. Dots appear only once the line is selected.
- **Faster by hand?** Often. Set y = 0: 3x = 24, so x = 8.

#### m-parallel-and-perpendicular-lines · Parallel and perpendicular lines

- **Trick:** 1) Work out the new slope by hand. 2) Graph the given line and your answer, using a decimal slope (2.5, not 5/2). 3) Check that yours passes through the given point and looks parallel or square to the first.
- **Example:** Line k is perpendicular to 2x + 5y = 10 and passes through (4, 1). The given slope is −2/5, so k's slope is 5/2. Type `y = 2.5(x-4) + 1`; its y-intercept dot reads (0, −9).
- **Trap:** Flipping the fraction but keeping the sign (or the reverse). Right angles only look right on a square grid, so press the home button after uneven zooming.
- **Faster by hand?** Yes. The graph is a check, not the method.

#### m-linear-functions · Linear functions

- **Trick (2.10):** 1) Type `f(x) = 1.8x + 32`. 2) For f of a number, type `f(45)`. 3) For "f(c) = 113", type `y = 113` and click where it crosses f.
- **Example:** f(x) = 1.8x + 32 turns Celsius into Fahrenheit. If f(c) = 113, what is c? Zoom out to find the crossing, (45, 113), so c = 45. In context, 1.8 is the rise in °F for each 1 °C.
- **Trap:** Typing `f(113)` (235.4) when the question gives the output, not the input.
- **Faster by hand?** Evaluating is quick by hand. The graph helps when solving backward with decimals.

#### m-solving-systems · Solving systems

- **Trick (2.4):** 1) Type both equations as given, one per line. 2) Click the crossing. 3) Answer exactly what is asked (x, y, x + y or xy).
- **Example:** 3x + 2y = 16 and 5x − 4y = 1. The crossing is (3, 3.5), so x + y = 6.5.
- **Trap:** Stopping at x = 3 when the question asks for x + y.
- **Faster by hand?** About the same when adding or subtracting the equations cancels a letter at once.

#### m-systems-in-context · Systems in context

- **Trick (2.4, 2.17):** 1) Let x and y stand for the two unknowns. 2) Type both equations. 3) Zoom out: real-world crossings are often far off the starting screen.
- **Example:** A theater sold 120 tickets for $1,190. Adult tickets cost $12 and student tickets $7. Type `x + y = 120` and `12x + 7y = 1190`, then zoom out: the crossing is (70, 50), so 70 adult tickets.
- **Trap:** Seeing nothing at first and deciding there is no solution. Also, note which letter is which group.
- **Faster by hand?** Substitution takes about as long. For "no solution" or "infinitely many" with a constant, compare slopes by hand (2.7).

#### m-linear-inequalities · Linear inequalities

- **Trick (2.11):** 1) Type each inequality as given (`<=` makes ≤). 2) Find where the shadings overlap. 3) Type each choice as a point, like `(1, 4)`, and see which lands in the overlap.
- **Example:** Which point satisfies y ≥ 2x − 3 and x + y < 6: (1, 4), (4, 3), (0, 7) or (5, 0)? Only (1, 4) sits in both shadings (4 ≥ −1, and 1 + 4 = 5 < 6).
- **Trap:** A dashed edge is not included; a solid one is. If a point seems to sit on an edge, substitute it.
- **Faster by hand?** Testing four points by substitution is often as fast. The graph wins when the choices are graphs or regions.

### Advanced Math

#### m-expanding-and-factoring · Expanding and factoring

- **Trick (2.8):** 1) Type `y =` and the given expression. 2) Type each choice as its own `y =` line. 3) Hide and show rows: the match sits exactly on top of the original.
- **Example:** Which is equivalent to (2x − 3)(x + 5) − x(x − 4)? Of x² + 3x − 15, x² + 11x − 15, 3x² + 3x − 15 and x² + 11x + 15, only `y = x^2 + 11x - 15` overlaps.
- **Trap:** Calling two curves that cross once "equal". For missing constants ("for all x"), use the list regression in 2.7.
- **Faster by hand?** Expanding two binomials is quick for confident students; the overlap check is a safe backup.

#### m-rational-expressions · Rational expressions

- **Trick (2.8):** 1) Type the original, pressing `→` after each bottom: `y = 3/(x-1)→ - 2/(x+1)`. 2) Type each choice. 3) Keep the one that overlaps.
- **Example:** For x > 1, which is equivalent to 3/(x − 1) − 2/(x + 1)? The choice `y = (x+5)/(x^2-1)` overlaps, so the answer is (x + 5)/(x² − 1).
- **Trap:** Forgetting `→`, so the rest of the line slides into the first bottom. Holes get no dot and are hard to see, so check excluded values (bottom = 0) by hand.
- **Faster by hand?** Adding two simple fractions takes about a minute by hand; the graph check about 30 seconds.

#### m-exponents-and-radicals · Exponents and radicals

- **Trick (2.8):** 1) Type exponents in parentheses: `y = x^(2/3)*x^(5/6)` (the `*` steps out of the first exponent). 2) Type each choice, such as `y = x sqrt(x)`. 3) Keep the one that overlaps where x > 0.
- **Example:** For x > 0, which is equivalent to x^(2/3) · x^(5/6)? Exponents add: 2/3 + 5/6 = 3/2, which is x√x. The graph of x√x overlaps; the trap choice x^(5/9) does not.
- **Trap:** Multiplying the exponents (x^(5/9)) instead of adding them. If the question says x > 0, compare only the right half of the screen.
- **Faster by hand?** Yes, once the exponent rules are known.

#### m-solving-quadratics · Solving quadratics

- **Trick (2.3):** 1) Move everything to one side. 2) Type `y = x^2 - 6x + 4`. 3) Click the x-axis dots. No dots means no real solutions.
- **Example:** What is the larger solution of x² − 6x + 4 = 0? The right dot reads (5.23607, 0). Typing the choice `3+sqrt(5)` also shows 5.23607, so the answer is 3 + √5.
- **Trap:** Matching a decimal by eye. Type every radical choice and compare all the digits.
- **Faster by hand?** Yes when it factors with small numbers, like x² − 5x + 6 = 0.

#### m-graphs-of-quadratics · Graphs of quadratics

- **Trick (2.3):** 1) Type the function. 2) Click the curve. 3) Click the top or bottom dot (the vertex) and the axis dots (the intercepts).
- **Example:** f(x) = −2x² + 12x − 7. What is the maximum value of f? The top dot reads (3, 11), so the maximum is 11.
- **Trap:** Answering 3 (where the maximum happens) instead of 11 (the maximum). The vertex may sit above the starting screen; zoom out.
- **Faster by hand?** In vertex form y = a(x − h)² + k, read (h, k) directly. Otherwise x = −b/(2a) is quick.

#### m-exponential-functions · Exponential functions

- **Trick (2.6):** 1) Enter the points in a table. 2) Type `y1 ~ a b^x1`. 3) Read a (the starting value) and b (the multiplier for each step).
- **Example:** A machine is worth $8,000 after 1 year and $4,096 after 4 years, losing the same percent each year. The fit gives a = 10,000 and b = 0.8: it cost $10,000 and loses 20% a year.
- **Trap:** Reading b = 0.8 as an 80% loss. It keeps 80%, so it loses 20%. Likewise, b = 1.05 is 5% growth.
- **Faster by hand?** Sometimes: 4,096/8,000 = 0.512 = 0.8³. Spotting the cube takes skill; the fit does not.

#### m-radical-and-rational-equations · Radical and rational equations

- **Trick (2.1):** 1) Type `y = sqrt(x+7)`. 2) Type `y = x - 5`. 3) Click each crossing. Only true solutions cross; false (extraneous) ones never show.
- **Example:** Solve √(x + 7) = x − 5. Squaring by hand gives x = 2 or 9, but the graphs cross only at (9, 4). So x = 9; x = 2 fails because √9 is 3, not −3.
- **Trap:** Choosing 2, which is usually offered. In rational equations, an x that makes a bottom 0 is never a solution.
- **Faster by hand?** No. The graph does the checking step for you.

#### m-nonlinear-systems · Nonlinear systems

- **Trick (2.4):** 1) Type both equations as given (a circle can stay as `x^2 + y^2 = 25`). 2) Click every crossing. 3) Count them for "how many solutions".
- **Example:** y = x² − 4x + 1 and y = 2x − 4. The crossings are (1, −2) and (5, 6), so the sum of the x-values is 6.
- **Trap:** Missing a crossing off-screen. A line that only touches a curve may get no dot; check with the vertex or the discriminant.
- **Faster by hand?** Setting the two equal and factoring (x² − 6x + 5 = 0) is about as fast.

#### m-polynomials · Polynomials

- **Trick (2.3, 2.10):** 1) Type `p(x) = x^3 - 2x^2 - 5x + 6`. 2) Click the x-axis dots: each zero r gives a factor (x − r). 3) For the remainder after dividing by (x − a), type `p(a)` with the number in place of a.
- **Example:** Which is a factor of p(x)? The zeros are −2, 1 and 3, so x + 2 is a factor. The remainder when p(x) is divided by x − 4 is `p(4)` = 18.
- **Trap:** A zero at −2 means the factor (x + 2), not (x − 2).
- **Faster by hand?** Testing one choice by substitution is quick. The graph shows every zero and the shape at once.

#### m-functions-and-transformations · Functions and transformations

- **Trick (2.10):** 1) Define `f(x) = x^2 - 3` and `g(x) = 2x + 1`. 2) Type `f(g(2))`. 3) For shifts, type `y = f(x-h) + k` and drag the sliders for h and k.
- **Example:** What is f(g(2))? The calculator shows 22, since g(2) = 5 and f(5) = 22. The reversed order, g(f(2)), gives 3, a likely wrong choice.
- **Trap:** f(x − 2) moves the graph right 2, not left. Dragging h settles it.
- **Faster by hand?** Small compositions are quick by hand. The calculator prevents slips only if typed in the right order.

### Problem-Solving and Data Analysis

#### m-ratios-and-proportions · Ratios and proportions

- **Trick:** 1) Write the proportion with x for the unknown. 2) Type it as one line: `x/7→ = 3/2`. 3) Read the vertical line.
- **Example:** A recipe uses 3 cups of flour for every 2 cups of sugar. How much flour goes with 7 cups of sugar? Zoom out a little: the line is at x = 10.5, so 10.5 cups.
- **Trap:** Setting the ratio upside down (2/3 × 7 ≈ 4.67). Keep flour on top on both sides.
- **Faster by hand?** Usually: 7 × 3 ÷ 2 is mental math.

#### m-units-and-conversions · Units and conversions

- **Trick:** The calculator has no units. 1) Write the chain on paper so the units cancel. 2) Type it on one line: `22*3600/5280`.
- **Example:** A runner moves at 22 feet per second. How many miles per hour is that? 22 × 3,600 ÷ 5,280 = 15 mph.
- **Trap:** Flipping a factor: 22 × 5,280 ÷ 3,600 ≈ 32.3 looks reasonable but is wrong. Cancel the units before typing.
- **Faster by hand?** The setup is the real work; the calculator only does the arithmetic.

#### m-percentages · Percentages

- **Trick (2.13):** 1) Turn each change into a multiplier: +20% is 1.2 and −25% is 0.75. 2) Multiply them. 3) To go backward, divide (or graph `y = 0.9x` and `y = 72`, zoom out and click the crossing).
- **Example:** A price rises 20%, then falls 25%, ending at $72. What was the original price? 1.2 × 0.75 = 0.9, and `72/0.9` = 80, so $80.
- **Trap:** Adding the percents (+20 − 25 = −5%) gives 72/0.95 ≈ $75.79, a common wrong choice.
- **Faster by hand?** For friendly numbers, yes. `25%80` also works: it shows "25% of 80" = 20.

#### m-mean-median-and-spread · Mean, median and spread

- **Trick (2.12):** 1) Type `A = [12, 15, 15, 18, 20, 22, 45]`. 2) Type `mean(A)` and `median(A)`. 3) For "if a value is removed", type the new list as `B` and compare.
- **Example:** Removing 45 changes the mean from 21 to 17 and the median from 18 to 16.5.
- **Trap:** Assuming the median stays put. The count drops from 7 to 6, so the middle moves. For spread, use the same function (`stdev` or `stdevp`) for both sets.
- **Faster by hand?** The median of a short sorted list, yes. Means of six or more numbers are safer on the calculator.

#### m-reading-data-displays · Reading data displays

- **Trick (2.12):** 1) Turn the dot plot or frequency table into two lists: values `v = [0, 1, 2, 3, 4]` and counts `c = [2, 5, 6, 4, 3]`. 2) Type `D = repeat(v, c)` to rebuild every data point. 3) Type `mean(D)` and `median(D)`.
- **Example:** A dot plot shows books read by 20 students: two read 0, five read 1, six read 2, four read 3 and three read 4. The mean is 2.05 and the median is 2.
- **Trap:** Averaging the values 0 to 4 (2) or the counts (4) instead of weighting. Without `repeat`, the mean is `total(v c)` ÷ `total(c)` = 41 ÷ 20, and the median comes from counting to the 10th and 11th values.
- **Faster by hand?** Box plots and histograms are read by eye. The calculator helps with weighted means.

#### m-scatterplots · Scatterplots

- **Trick (2.6):** 1) Enter the points in a table (read them off the graph if needed). 2) Type `y1 ~ m x1 + b`. 3) Compare m and b with the choices. To predict, type the given line as `f(x) = ...` and evaluate it.
- **Example:** Points (1, 3.1), (2, 4.9), (3, 7.2) and (4, 8.8). The fit gives m = 1.94 and b = 1.15, so the best choice is y = 1.9x + 1.2.
- **Trap:** A residual is actual minus predicted, not the reverse. Predictions far outside the data are unreliable.
- **Faster by hand?** When the line of best fit is given, one multiplication answers a prediction question.

#### m-probability · Probability

- **Trick:** Mostly arithmetic. 1) Pick the right total by hand: the row or column the question limits you to. 2) Type the division. 3) Press the fraction button if the choices are fractions.
- **Example:** 48 of 120 students play a sport, and 18 of those 48 are juniors. P(junior, given a sport player) = `18/48` = 0.375, which the fraction button shows as 3/8.
- **Trap:** Dividing by the grand total (18/120 = 0.15) when the question says "given" or "of those".
- **Faster by hand?** Yes, except for awkward divisions.

#### m-samples-and-margin-of-error · Samples and margin of error

- **Trick:** Hardly a calculator skill. Use it only for the arithmetic: estimate minus margin and estimate plus margin, or a sample percent times a population.
- **Example:** In a random sample of 400 voters, 56% support a plan, with a margin of error of 4 percentage points. Plausible values run from 52% to 60%. Of 12,500 voters, about 0.56 × 12,500 = 7,000 likely support it.
- **Trap:** Treating the interval as certain, or applying it to people outside the group that was sampled. A larger random sample gives a smaller margin.
- **Faster by hand?** Yes. Spend the time reading the setup.

#### m-studies-and-experiments · Studies and experiments

- **Trick:** No calculator use. By-hand check: random selection from a group lets results generalize to that group; random assignment to treatments supports cause and effect.
- **Example:** 200 volunteers are randomly assigned to drink green tea or water daily, and the tea group's blood pressure drops more. Tea likely caused the drop for people like these volunteers, but the result cannot be generalized to all adults, because the volunteers were not randomly selected.
- **Trap:** Picking the choice that generalizes to everyone, or that claims cause from a survey with no random assignment.
- **Faster by hand?** Always. Keep the calculator closed.

### Geometry and Trigonometry

#### m-area-and-perimeter · Area and perimeter

- **Trick:** 1) Split the shape into simple parts. 2) Type the total on one line, with 0.5 for halves: `10*6 + 0.5pi*3^2`. 3) If the choices use π, type each choice and compare decimals.
- **Example:** A 10-by-6 rectangle has a half-circle on one 6-unit side. Area = 60 + 4.5π ≈ 74.137. Perimeter = 26 + 3π ≈ 35.425, because the shared side is not on the outside.
- **Trap:** Using the diameter (6) as the radius. Typing `1/2pi` puts π on the bottom, so use 0.5.
- **Faster by hand?** Usually, since answers are often left in terms of π.

#### m-volume-and-surface-area · Volume and surface area

- **Trick (2.1):** 1) Write the volume formula with x for the unknown length. 2) Type it as one equation in x. 3) Read the positive vertical line.
- **Example:** A cone has volume 150 cm³ and height 9 cm. (1/3)πr²(9) = 3πr², so type `3pi x^2 = 150`. The lines sit at x ≈ ±3.98942, so the radius is about 4.0 cm.
- **Trap:** Using `r` for the radius: the calculator treats r as a polar letter, so use x. Also check radius versus diameter.
- **Faster by hand?** With clean numbers (V = 200π and h = 8, so r² = 25), yes.

#### m-lines-and-angles · Lines and angles

- **Trick:** Little calculator use. Decide by hand whether the angles are equal or add to 180°. Then type the equation in x as one line to solve it.
- **Example:** Parallel lines are cut by a transversal. Same-side interior angles measure (3x + 10)° and (5x − 30)°. They add to 180°, so type `3x + 10 + 5x - 30 = 180`. After zooming out, the line is at x = 25 (angles of 85° and 95°).
- **Trap:** Setting the angles equal (x = 20) when they are supplementary. The calculator solves whatever is typed.
- **Faster by hand?** Yes: 8x − 20 = 180 takes seconds.

#### m-triangles · Triangles

- **Trick:** 1) Pair the sides by letter order (ABC with DEF). 2) Type the proportion with x: `6/10→ = 9/x`. 3) Read the vertical line.
- **Example:** Triangle ABC is similar to triangle DEF, with AB = 6, BC = 9 and DE = 10. After zooming out, the line is at x = 15, so EF = 15.
- **Trap:** Pairing the wrong sides: AB goes with DE, and BC with EF. Angle sums (180 minus the other two) are mental math.
- **Faster by hand?** Usually yes.

#### m-right-triangles · Right triangles

- **Trick:** 1) Type `sqrt(7^2 + 9^2)` for a hypotenuse, or `distance((1, 2), (8, 11))` for two points. 2) Type each radical choice and compare decimals.
- **Example:** Legs of 7 and 9 give a hypotenuse of √130 ≈ 11.40175. The choice 8√2 ≈ 11.31371 looks close but is wrong.
- **Trap:** Adding the legs (16), or adding squares when a leg is missing (subtract instead).
- **Faster by hand?** For 45-45-90 and 30-60-90 triangles, use the side ratios on the reference sheet.

#### m-trigonometric-ratios · Trigonometric ratios

- **Trick (2.15):** 1) Click the wrench and choose Degrees. 2) Check that `sin(30)` shows 0.5. 3) Type the side, such as `20sin(35)`.
- **Example:** In right triangle ABC, angle C is 90°, angle A is 35° and hypotenuse AB is 20. BC, opposite A, is 20 sin 35° ≈ 11.47, so 11.5. In radian mode the same keys give −8.56, which cannot be a length.
- **Trap:** Staying in radians, the starting mode. A degree sign typed after a number converts nothing.
- **Faster by hand?** Yes for ratio questions with no angle given, such as "sin A = 3/5; what is cos B?" (also 3/5).

#### m-circles · Circles

- **Trick:** 1) The fraction of the circle is angle/360. 2) Type `2pi*9*80/360` for the arc (or `pi*9^2*80/360` for the sector). 3) For an answer "in terms of π", type it again without pi: `2*9*80/360` = 4, so 4π.
- **Example:** A circle has radius 9 and a central angle of 80°. The arc length is 4π ≈ 12.566.
- **Trap:** Typing the angle fraction first (`80/360*2pi*9`) sends everything after 360 to the bottom. Put the fraction last or press `→`. If the angle is in radians, the arc is radius × angle.
- **Faster by hand?** Often: 80/360 = 2/9, and 2/9 × 18π = 4π.

#### m-circle-equations · Circle equations

- **Trick (2.14):** 1) Type the equation exactly as given, even expanded. 2) Click the circle, then its top and bottom dots. 3) The center has the same x and the y halfway between; the radius is half the gap. 4) Confirm by typing the standard form on top.
- **Example:** x² + y² − 8x + 6y − 11 = 0. The top dot is (4, 3) and the bottom dot is (4, −9), so the center is (4, −3) and the radius is 6. `(x-4)^2 + (y+3)^2 = 36` lands on top.
- **Trap:** Giving 36 (r²) as the radius, or flipping the center's signs to (−4, 3). There are no leftmost or rightmost dots.
- **Faster by hand?** Completing the square takes about a minute; reading the graph about 30 seconds. If the radius is not whole (like √41), type the choices.

#### m-radians · Radians

- **Trick (2.15):** 1) Degrees to radians: multiply by π/180. Radians to degrees: multiply by 180/π. 2) To find "how many π", divide the degrees by 180, then press the fraction button. 3) For sin or cos of an angle with π, make sure the mode is Radians.
- **Example:** Which is equivalent to 225°? `225/180` = 1.25, which the fraction button shows as 5/4, so 5π/4 radians (≈ 3.92699).
- **Trap:** Switching to degree mode to "convert" a number; the mode only changes how sin, cos and tan read angles. A mode left on Degrees makes `sin(pi/6)` show 0.00914 instead of 0.5.
- **Faster by hand?** Yes: replace π with 180°, so 5π/6 becomes 5 × 180/6 = 150°.

## 4. Features the calculator team needs

| Feature                                                                                             | Students use it to                                           | Skills that need it                                                                                                                                      | Priority |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Graph `y =` curves, and equations typed as given (`3x - 4y = 24`, circles)                          | Graph both sides; read lines and circles without rearranging | Most Algebra and Advanced Math skills, m-circle-equations                                                                                                | Must     |
| An equation in x alone draws vertical lines at its solutions                                        | Solve in one line                                            | m-solving-linear-equations, m-ratios-and-proportions, m-triangles, m-lines-and-angles, m-volume-and-surface-area                                         | Should   |
| Clickable points of interest: zeros, y-intercept, highs and lows, crossings                         | Read roots, vertex, intercepts and system solutions          | m-graphs-of-lines, m-solving-systems, m-solving-quadratics, m-graphs-of-quadratics, m-radical-and-rational-equations, m-nonlinear-systems, m-polynomials | Must     |
| Points of interest on circles: top, bottom, axis crossings, crossings with lines                    | Read center and radius; line-and-circle systems              | m-circle-equations, m-nonlinear-systems                                                                                                                  | Should   |
| Sliders: "add slider" button, editable limits and step                                              | Unknown constants, tangency, shifts                          | m-number-of-solutions, m-graphs-of-quadratics, m-functions-and-transformations, m-expanding-and-factoring                                                | Must     |
| Tables: x₁ and y₁ columns, computed columns such as `x1^3 - 3x1`                                    | Enter data; test answer choices                              | m-slope-and-rate-of-change, m-linear-functions, m-exponential-functions, m-scatterplots                                                                  | Must     |
| `~` regression: line, parabola, exponential and any custom form, with constants shown under the row | Find model constants                                         | m-slope-and-rate-of-change, m-exponential-functions, m-scatterplots, m-graphs-of-quadratics                                                              | Must     |
| `~` regression over a plain list (`x1 = [1, 2, 3, 4, 5]`), unknowns on either side                  | Constants for "for all x" and infinitely many solutions      | m-expanding-and-factoring, m-number-of-solutions, m-rational-expressions                                                                                 | Must     |
| Lists in square brackets, `[1...10]`, list arithmetic                                               | Enter data; feed fits                                        | m-mean-median-and-spread, m-reading-data-displays, m-scatterplots                                                                                        | Must     |
| `mean`, `median`, `stdev`, `stdevp`, `min`, `max`, `total`                                          | Center and spread                                            | m-mean-median-and-spread, m-reading-data-displays                                                                                                        | Must     |
| `repeat(values, counts)`                                                                            | Rebuild data from a frequency table or dot plot              | m-reading-data-displays, m-mean-median-and-spread                                                                                                        | Should   |
| Inequality shading with dashed and solid edges and visible overlaps                                 | Systems of inequalities                                      | m-linear-inequalities                                                                                                                                    | Must     |
| Plotted points such as `(1, 4)`                                                                     | Test a point; check that a line passes through it            | m-linear-inequalities, m-parallel-and-perpendicular-lines                                                                                                | Must     |
| Functions: `f(x) = ...`, `f(3)`, `f(g(2))`, `y = f(x-h) + k`                                        | Evaluate, compose, shift                                     | m-linear-functions, m-polynomials, m-functions-and-transformations, m-scatterplots                                                                       | Must     |
| Degree and radian setting                                                                           | Trig in the right mode                                       | m-trigonometric-ratios, m-radians                                                                                                                        | Must     |
| sin, cos, tan and `arcsin`                                                                          | Sides and angles                                             | m-trigonometric-ratios, m-radians                                                                                                                        | Must     |
| `sqrt`, `cbrt`, `pi`, `abs`, fractional exponents                                                   | Radicals and exponent checks                                 | m-exponents-and-radicals, m-right-triangles, m-area-and-perimeter, m-circles                                                                             | Must     |
| Fraction button on results                                                                          | Match fraction choices                                       | m-probability, m-radians, m-solving-linear-equations                                                                                                     | Should   |
| Zoom buttons, home and window limits (Karman's Zoom to fit helps here)                              | Find far-off crossings                                       | m-systems-in-context, m-graphs-of-quadratics, m-volume-and-surface-area                                                                                  | Must     |
| `%` typed as "percent of"                                                                           | Percent questions                                            | m-percentages                                                                                                                                            | Nice     |
| `distance` and `midpoint`                                                                           | Lengths from coordinates                                     | m-right-triangles, m-circle-equations                                                                                                                    | Nice     |
| Restrictions such as `{x > 0}`                                                                      | Compare graphs only where the question allows                | m-exponents-and-radicals, m-rational-expressions                                                                                                         | Nice     |
| Residual list and plot                                                                              | Residual questions                                           | m-scatterplots                                                                                                                                           | Nice     |
| Scientific calculator mode                                                                          | Plain arithmetic, as on test day                             | m-units-and-conversions, m-percentages, m-probability                                                                                                    | Should   |
| Clear messages for x instead of x₁, = instead of `~`, and undefined functions                       | Recover from typing slips                                    | Regression and function skills                                                                                                                           | Should   |

Notes for the Calculator team:

- Lessons will teach around these test-day behaviors, so they should stay as they are: sliders start at −10 to 10 with no step; dots show only for the selected curve; holes get no dot; a touching point may get no dot; circles get top and bottom dots but no leftmost or rightmost ones; labels show about five decimals. All of these are already in the calculator spec.
- Karman's calculator carries the student's angle mode to the next question (spec NM-24), so every trig tip starts with the `sin(30)` check. A visible mode label would be a Karman addition and is the founder's call.
- Transfer to Calculator: a question's data table is the most valuable thing to transfer cleanly, because the regression and statistics tricks start from it.

## 5. Errors students make with the calculator

| Pitfall                              | What goes wrong                                                    | Fix                                                                 |
| ------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Fraction bottom keeps going          | `1/2x` gives 1/(2x); in `x/7 = 3/2`, the "= 3/2" lands under the 7 | Press `→` after every bottom. Type halves as 0.5.                   |
| Top too short                        | `x+1/2` is x + ½, not (x + 1)/2                                    | Put the whole top in parentheses: `(x+1)/2`.                        |
| Exponent too short                   | `2^x+1` is 2ˣ + 1                                                  | Put longer exponents in parentheses: `2^(x+1)`.                     |
| Negative base                        | `-3^2` is −9                                                       | Type `(-3)^2`.                                                      |
| Letters run together                 | `ab` is a times b; a word such as `cost` reads as cos t            | Use one letter per unknown and never type words.                    |
| `^` vs `*`, and digits after letters | `2*3` is 6 but `2^3` is 8; `x2` becomes x₂, not 2x                 | Put the number first (`2x`) and look at the screen before going on. |
| Wrong variable                       | An equation in t or n offers a slider instead of a graph           | Rename the variable x (and the output y).                           |
| Reserved letters                     | r and θ draw polar graphs; e is 2.718…; x and y cannot be sliders  | Use a, b, c, h, k or m for unknown constants.                       |
| Function used before it is defined   | `f(2)` reads as f times 2                                          | Define `f(x) = ...` on its own line first.                          |
| Regression typed with x or =         | No fit, or a graph instead of a fit                                | Use the table names x₁ and y₁, and `~`.                             |
| Identity fit without a list          | Constants match at one point only                                  | Add `x1 = [1, 2, 3, 4, 5]`, with more values than unknowns.         |
| Wrong angle mode                     | `sin(30)` shows −0.988                                             | Check `sin(30)`: 0.5 means degrees.                                 |
| Expecting the mode to convert        | 5π/6 still shows 2.618                                             | Multiply by 180/π (or π/180).                                       |
| Window too small                     | No crossing on screen, so "no solution" by mistake                 | Zoom out, or set the window from the question's numbers.            |
| x instead of y (or the reverse)      | Right point, wrong number                                          | Reread what is asked: x, y, x + y or the maximum value.             |
| Rounding too early                   | A retyped 1.41421 drifts from √2                                   | Keep exact values in named letters and round at the end.            |
| Close decimals                       | 8√2 (11.31) picked for √130 (11.40)                                | Type every choice and compare all the digits.                       |
| No dots on the curve                 | Points of interest stay hidden                                     | Click the curve or its row first.                                   |
| Holes and touches                    | No dot at a hole or at a tangent point                             | Check excluded values and tangency by hand.                         |
| Curly braces for a list              | `{4, 7}` is not a list                                             | Use square brackets: `[4, 7]`.                                      |
| Graphing vs scientific               | Work typed in one is missing in the other                          | Check which mode is open before typing.                             |
| `stdev` vs `stdevp`                  | Two different numbers                                              | Use the same one for both data sets.                                |

## 6. Sources

College Board:

- College Board, SAT Suite of Assessments Calculator Policy: built-in calculator, graphing and scientific toggle, own calculator allowed, practice advice. https://satsuite.collegeboard.org/sat/what-to-bring-do/calculator-policy
- College Board, Assessment Framework for the Digital SAT Suite: section 5.3.2 (calculator on all Math questions; some questions do not need it), the testing tools list, and the timing table (44 questions in 70 minutes). https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf

Karman (this repository):

- Calculator spec and appendices, which record test-day behavior the Calculator team captured: radians default, points of interest by graph kind, typing rules for `/`, `^`, subscripts and `%`, reserved letters, slider defaults, regression output, `repeat`, `stdev` vs `stdevp`. `docs/superpowers/specs/2026-10-16-calculator-design.md` and `docs/superpowers/specs/calculator/` (`a-math-semantics.md`, `b-functions-and-data.md`, `e-ux-keypad-accessibility-theme.md`).

Tutor and prep sites:

- Resolve Prep, key calculator features: graphing both sides, identity regression with a list, statistics. https://resolveprep.com/blog/key-desmos-features
- Resolve Prep, regression guide: custom forms, list size, common mistakes. https://resolveprep.com/blog/desmos-regression-sat-guide
- MASS Tutoring, calculator guide: move list, common mistakes, when not to use it. https://www.masstutoring.com/sat-guide/desmos/
- Acely, cheat sheet: `stdev` vs `stdevp`, slider limits, fraction button, percent, `cbrt`, `distance`. https://acely.com/sat-prep/desmos-cheat-sheet
- Learner Labs, 15 time-saving tips: residuals, radian default, the 15-second rule. https://learnerlabs.app/blog/how-to-use-desmos-on-the-digital-sat-and-when-it-can-save-you-time
- Pursu, 12 techniques: table back-solving, list operations, restrictions. Two of its worked slider answers are wrong, a reminder to check any blog's numbers. https://www.pursu.io/guide/sat-desmos-tricks-12-high-leverage-techniques-digital-sat
- Cheetah Prep, 15 moves: slider default range, sum of solutions, no dots meaning no real zeros. https://www.cheetahprep.com/desmos/tricks
- FL Test Prep, Bluebook calculator guide: features turned off on test day, radians default, log mode, no shared work between graphing and scientific. https://fltestprep.com/blog/desmos-sat-bluebook-calculator
- Aniko, calculator course: circle top and bottom points, identity regression, frequency-table means (read through search summaries; the pages were rate-limited). https://www.aniko.ai/free-resources/sat/courses/desmos

Student forums (r/Sat, read through search snippets):

- Student tips: a one-variable equation draws a line at the answer; circles; statistics functions. https://www.reddit.com/r/Sat/comments/1lec7ts/how_do_i_use_desmos_effectively_to_get_a_700_on/
- The test version starts in radians. https://www.reddit.com/r/Sat/comments/1agroud/sat_desmos_calculator_in_radian_mode/
- Students losing points by forgetting degree mode. https://www.reddit.com/r/Sat/comments/1d1firx/using_desmos_will_make_your_math_score_go/
- Switching the mode does not convert radians to degrees. https://www.reddit.com/r/Sat/comments/1mynfij/just_realized_i_did_a_problem_incorrectly_over_12/

Not used: the most-watched YouTube guides (LearnSATMath, James Lu SAT, Scott Robinson) came up in search, but their transcripts were rate-limited, so nothing here relies on them. Reddit thread pages could not be opened; only search snippets were used.
