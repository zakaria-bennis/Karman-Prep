# How to write a Karman explanation and hint

The founder's rules (2026-11-19), binding:

- **Full teaching.** Math: what the question really asks, numbered steps each with its reason, a
  check, every wrong choice explained, a tip at the end. Reading and Writing: full teaching too.
- **Grammar questions** (Standard English Conventions) lead with the rule in one plain sentence,
  then a test usable on any sentence, then this sentence, then every wrong choice, then a tip.
- **Every wrong choice, always**, math included, even when no common slip leads there.
- **Name choices by their words, never by letter**: "the answer \(17\)", "“adapt to”". Answers are
  shuffled on screen, so a letter (A, B, C, D) would point at the wrong choice. Never write "Choice
  A", "option B", "(C)", "answer D" or "A is wrong".
- **The hint** is one short nudge toward the first move. It never gives the answer, never names
  the right choice, and never rules choices in or out.

The reader is a high school student who just answered the question, maybe wrongly. Write in plain
words and short sentences, warm and direct, in American spelling ("practice", "center", "analyze").
Say why, not just what.

## How the screen shows the text

The explanation is drawn as plain text with line breaks kept, and math typeset from LaTeX.

- Put every piece of math, every variable and every number that is part of math inside `\(` and
  `\)`: `\(3x + 5 = 20\)`, `\(x\)`, `\(\frac{3}{4}\)`. Plain counts in words ("two steps") stay
  plain. Never use `$` (write money as `\(\$25\)`), `\[ \]` or `$$`.
- Inside math, `-` is a minus sign. A negative number written outside math uses the minus sign
  `−` (U+2212), never a hyphen.
- No Markdown or HTML: no `**bold**`, no `#` headings, no backticks, no `<u>`.
- Never type two or more hyphens or underscores in a row (the screen turns them into a dash or a
  blank). No en dash (–). Prefer periods and colons to dashes.
- Sections are separated by one blank line. Section labels are short and end with a colon:
  `What it asks:`, `Rule:`, `Test:`, `This sentence:`, `Check:`, `Why the others are wrong:`,
  `Tip:`. Numbered steps start with `1. `, `2. ` on their own lines. Each wrong choice goes on its
  own line starting with `• `.
- State the answer once, by its words or value, in a sentence of its own:
  `The answer is \(12\).` or `The answer is “adapt to”.` Quote Reading and Writing choices
  exactly. For a long choice, quote its opening words exactly and add "…": `“Researchers found
that…”`.
- Length: as long as full teaching needs, usually 700 to 2,000 characters, never over 3,200.

## Math, multiple choice

```
What it asks: the value of \(x\) that makes both sides equal.

1. Subtract \(5\) from both sides: \(3x = 15\). This leaves only the \(x\) term on the left.
2. Divide both sides by \(3\): \(x = 5\). Dividing undoes the multiplication by \(3\).

Check: \(3(5) + 5 = 15 + 5 = 20\), which matches the right side.

The answer is \(5\).

Why the others are wrong:
• \(\frac{25}{3}\): this comes from adding \(5\) instead of subtracting it.
• \(15\): this is the value of \(3x\), not of \(x\). The last step was skipped.
• \(60\): this multiplies by \(3\) instead of dividing.

Tip: Undo operations in reverse order: addition and subtraction first, then multiplication and
division.
```

## Math, typed answer (no choices)

Same shape without "Why the others are wrong". Instead, name the most common slip in one line
(`A common slip: ...`). If more than one value is accepted, say so ("Either \(4\) or \(5\) is
correct."). Give the answer in a form a student can type (`\(\frac{3}{4}\)`, which can be entered
as 3/4 or .75).

## Grammar (Standard English Conventions)

```
Rule: A semicolon joins two complete sentences that are closely related.

Test: Cover the semicolon and read each side. If both sides could stand alone as a sentence, a
semicolon works. If one side cannot, it does not.

This sentence: "The bridge opened in 1937" can stand alone, and "it was the longest suspension
bridge in the world" can stand alone too. Two complete sentences need a semicolon or a period
between them, so the semicolon fits.

The answer is “1937; it”.

Why the others are wrong:
• “1937, it”: a comma alone cannot join two complete sentences. This is a comma splice.
• “1937 it”: with no punctuation the two sentences run together.
• “1937, and, it”: the comma after "and" splits the joining word from the sentence it begins.

Tip: Before choosing punctuation, find the verbs and count the complete sentences.
```

## Reading and Writing, other questions

```
What it asks: the word that best fits what the text says about the coral's response to heat.

1. Find the clue. The text says the coral "survived temperatures that killed nearby reefs."
2. Read what the blank must mean. The coral did not just live through the heat; it adjusted to
   it, so the blank needs a word meaning "change to suit new conditions."
3. Match the meaning. Only “adapt to” means changing to suit a new situation.

The answer is “adapt to”.

Why the others are wrong:
• “ignore”: the coral reacted to the heat; nothing says it was unaffected.
• “resist”: resisting means pushing back without changing, but the text describes change.
• “recall”: memory has nothing to do with the text.

Tip: Predict your own word for the blank before reading the choices, then pick the closest match.
```

Transitions: say the relationship between the two sentences first, then which transition shows
it. Notes questions: quote the goal, then show which choice meets every part of it and why each
other choice misses a part (wrong focus, missing comparison, wrong audience). Two texts: say each
author's view in one line before comparing. Data questions: name the exact numbers from the table
or graph that decide it.

## The hint

One sentence, at most about 150 characters, pointing at the first move:

- `Start by getting the \(x\) term alone on one side.`
- `Cover the semicolon and ask whether each side could stand alone as a sentence.`
- `Look for the sentence that tells you how the coral reacted to the heat.`

Never: the answer, the value, the right choice's words, which choices are wrong, or a letter.

## Before you hand it in

- Every step is true, and every number is right (Math: compute it).
- The stated answer is the key, by its words or value.
- Every wrong choice has its own line with a real reason.
- No letter names a choice anywhere.
- The hint helps start the problem and gives nothing away.
