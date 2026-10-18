# 14 transfer-ui, part 2 of 4: wrappers, stem mapping, answer-choice call sites and the transfer fixture (Tasks 5 to 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of 4 of package `14-transfer-ui.md`, which holds the package header (commands, type
checks, preconditions), the package-internal names, the DOM contract, the Decisions, the Notes for
the lead and the package gate; they apply to every task here. Tasks run in number order across
the four parts; each part starts where the previous one ends (part 1 ends with task 4).

---

### Task 5: Wrappers, stem mapping and the stem registry (resolves OI-16 and OI-18)

**Files:**

- Create: `src/components/calculator/transfer-call-sites.test.tsx` (task 6 appends)
- Modify: `src/components/calculator/CalculatorSourceAction.tsx` (extension edit: v2 branch and the AR-11 optional props), `src/components/learn/MathText.tsx` (extension edit: `segmentIndex` and `stem`), `src/components/calculator/TransferControl.module.css`, `docs/superpowers/specs/calculator-v2/c-transfer.md` (TR-45, TR-76, section 2)

**Interfaces:**

- Consumes: `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>`, `classifyChoice(choice: ChoiceInput, stem: StemInput | null): TransferItem | null`, `accessibleNames(items: readonly TransferItem[]): Map<string, string>`, `StemInput`, `ChoiceInput` (12, `classify.ts`); `splitMathText(text: string, serializedFunctionLines: boolean, atLineStart: boolean, atLineEnd: boolean): MathSegment[]` (12, `math-segments.ts`); `TransferControl` (task 4).
- Produces: the section 14 wrapper signatures exactly:
  - `CalculatorSourceAction(props: { latex: string; segmentIndex?: number; stem?: StemInput }): JSX.Element | null`
  - `CalculatorChoiceAction(props: { text: string; letter: string; stem?: StemInput; slot?: "cluster" }): JSX.Element | null`
  - `CalculatorTableAction(props: { rows: string[][]; headers?: string[]; layout?: "vertical" | "horizontal"; itemId?: string; slot?: "cluster" }): JSX.Element | null`

- [ ] **Step 1: Apply OI-16 and OI-18 to the spec.** In `c-transfer.md`:
  - TR-76: replace `through the single switch component in d-architecture-integration.md` with `through the AR-11 wrappers CalculatorSourceAction, CalculatorChoiceAction and CalculatorTableAction, which branch on bridge.version, plus AR-11's v2-only daily-question cluster instance`.
  - Section 2 table: replace `bridge switch component` with `bridge and the AR-11 version-switching wrappers`.
  - TR-45: replace `while hidden the button is visually clipped but stays` with `while hidden, a stem or question-table control is visually clipped and an answer-choice control is at opacity 0 in its tool cluster (AR-11); either way the button stays`.

  Run `npx prettier --write docs/superpowers/specs/calculator-v2/c-transfer.md`; `grep -c` finds each new phrase once.

- [ ] **Step 2: Write the failing tests** (`transfer-call-sites.test.tsx`; task 6 extends the import lines)

```
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TransferPayload, TransferResult, TransferTrigger } from "@/lib/calculator-transfer/payload";
import { classifyChoice, classifyStem } from "@/lib/calculator-transfer/classify";
import { splitMathText } from "@/components/learn/math-segments";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import MathText from "@/components/learn/MathText";
import QuestionTable from "@/components/learn/QuestionTable";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import DiagnosticClient from "@/components/diagnostic/DiagnosticClient";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import type { StudentQuizQuestion } from "@/types/quiz";
import { CalculatorChoiceAction, CalculatorSourceAction, CalculatorTableAction } from "./CalculatorSourceAction";
import { transferSelection } from "./transfer-selection";
const h = vi.hoisted(() => ({ stub: false, bridge: null as unknown, onSelect: vi.fn(), onCross: vi.fn(), outer: vi.fn() }));
vi.mock("./CalculatorScope", async (original) => {
  const real = await original<typeof import("./CalculatorScope")>();
  return { ...real, useCalculator: () => (h.stub ? (h.bridge as ReturnType<typeof real.useCalculator>) : real.useCalculator()) };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/free-diagnostic", useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
const v2Bridge = () => ({ version: "v2", open: false, status: "idle", failure: null, questionKey: "attempt:q1", toggle: vi.fn(), prefetch: vi.fn(),
  transfer: vi.fn(async (_payload: TransferPayload, _trigger: TransferTrigger): Promise<TransferResult> => ({ status: "added", message: "Added.", focusRowId: "1" })) });
const v1Bridge = () => ({ version: "v1", open: false, toggle: vi.fn(), paste: vi.fn() });
const stubbed = (bridge: unknown) => { h.stub = true; h.bridge = bridge; return bridge as ReturnType<typeof v2Bridge>; };
let restore = () => {};
beforeEach(() => { restore = installDomStubs(); h.stub = false; h.bridge = null; transferSelection.resetForTests(); vi.clearAllMocks(); });
afterEach(() => restore());
const noop = () => {};
const Q = { id: "q1", subject: "math", topic_cluster: "Algebra", difficulty_level: 1, answer_format: "multiple_choice", question_text: "The line is $y=2x+3$.",
  passage_intro: null, passage: null, passage_a: null, passage_b: null, reviewed_passage: null, figure_kind: null, figure_table_data: null, figure_chart_data: null, figure_geometry_data: null, image_url: null, image_alt: null,
  answer_choices: ["A", "B"].map((letter, i) => ({ id: `c-${letter}`, question_id: "q1", letter, choice_text: `$${i + 5}$`, choice_table_data: null })) } as unknown as StudentQuizQuestion;
type QuizStateOverride = NonNullable<Parameters<typeof ActiveQuizScreen>[0]["stateOverride"]>;
const STATE: QuizStateOverride = { phase: "answering", reviews: {}, records: [], targetLength: 1, currentIndex: 0, selectedAnswer: null };
const REVIEW = { correct_answer: "A", numeric_tolerance: null, explanation_text: "Because $y=2x+3$ has slope 2.", explanation_per_choice: { A: "Choice A uses $y=2x+3$.", B: "Choice B uses $y=3x$." }, desmos_strategy: "Graph $y=2x+3$." } as unknown as QuizStateOverride["reviews"][string];
const DIAGNOSTIC = [{ id: "d1", domain: "algebra", difficulty: 1, conceptId: "d1", text: "The line is $y=2x+3$.", options: ["A) $5$", "B) $6$"], correct: "A", explanation: "Because $y=2x+3$ has slope 2." }] as Parameters<typeof DiagnosticClient>[0]["questions"];
const SYSTEM = "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}";
const namesOf = () => screen.getAllByRole("button", { name: /^Transfer to Calculator: / }).map((b) => b.getAttribute("aria-label"));
const STEM_AND_CHOICES = ["Transfer to Calculator: y=2x+3", "Transfer to Calculator: choice A", "Transfer to Calculator: choice B"];
it("TR-45 one real button per item right after it or in its cluster; the math is never focusable; hidden stem controls are clipped and hidden choice controls sit at opacity 0, never leaving the tree (OI-18)", () => {
  stubbed(v2Bridge());
  const { container } = render(<><MathText calculator text={`Use $y=2x+3$, $x$ and $$${SYSTEM}$$`} />
    <div className="group relative"><button type="button">A</button><div data-calculator="v2"><button type="button" aria-label="Cross out choice A" /><CalculatorChoiceAction slot="cluster" text="$2x$" letter="A" /></div></div></>);
  const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
  expect(anchors.map((a) => a.dataset.placement)).toEqual(["inline", "block", "cluster"]);
  for (const a of anchors) {
    const buttons = a.querySelectorAll("button"); expect(buttons).toHaveLength(1); expect(buttons[0]).toHaveAttribute("type", "button");
    expect([buttons[0].getAttribute("aria-hidden"), buttons[0].hidden, buttons[0].style.display, buttons[0].style.visibility, buttons[0].tabIndex]).toEqual([null, false, "", "", 0]);
  }
  expect(anchors[0].previousElementSibling!.querySelector("annotation")!.textContent).toBe("y=2x+3");
  expect(anchors[1].previousElementSibling!.classList.contains("block")).toBe(true);
  expect(anchors[2].parentElement).toHaveAttribute("data-calculator", "v2"); expect(anchors[2].previousElementSibling).toHaveAccessibleName("Cross out choice A");
  expect(container.querySelectorAll(".katex [tabindex], [tabindex].katex")).toHaveLength(0);
  expect(anchors[0]).toHaveAttribute("data-visible", "false"); expect(namesOf()).toHaveLength(3);
  const css = readFileSync("src/components/calculator/TransferControl.module.css", "utf8");
  expect(css).toMatch(/\[data-visible="false"\][^{]*\{[^}]*clip-path:\s*inset\(50%\)/);
  expect(css).toMatch(/\[data-placement="cluster"\]\s*\{[^}]*opacity:\s*0\s*[;}]/); expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden/);
});
it("TR-45 across underline, italic and serialized-function runs each control follows the segment its item came from, and a run that shifts the math count renders no wrong control", () => {
  stubbed(v2Bridge());
  const runs = { text: "[[u]]Line $y=2x+3$[[/u]]\nf(x) = 2^x + 3\n<i>Region $y>2x+1$</i>", serializedFunctionLines: true };
  const shifted = { text: "Use $a<i>b</i>$ then $y=2x+3$ and $y=x$", serializedFunctionLines: false };
  for (const stem of [runs, shifted]) {
    const { container, unmount } = render(<MathText calculator text={stem.text} serializedFunctionLines={stem.serializedFunctionLines} />);
    const segments = splitMathText(stem.text, stem.serializedFunctionLines, true, true); const items = classifyStem(stem);
    const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
    for (const a of anchors) {
      const index = Number(a.dataset.sourceId!.slice("stem:".length)); const segment = segments[index];
      expect(items.has(index), stem.text).toBe(true); expect(segment.kind, stem.text).not.toBe("text");
      expect(a.previousElementSibling!.querySelector("annotation")!.textContent, stem.text).toBe(segment.kind === "text" ? null : segment.latex);
    }
    if (stem === runs) {
      expect(anchors.map((a) => a.dataset.sourceId)).toEqual([...items.keys()].map((k) => `stem:${k}`)); expect(anchors).toHaveLength(3);
      expect([anchors[0].closest("u"), anchors[1].previousElementSibling!.classList.contains("source-function-math") || null, anchors[2].closest("i")].map(Boolean)).toEqual([true, true, true]);
    }
    unmount();
  }
});
it("TR-50 names are Transfer to Calculator plus the table 8.1 description, unique within the question with ', occurrence n' for repeats", () => {
  stubbed(v2Bridge()); render(<MathText calculator text={`Lines $y=2x+3$ and $y=2x+3$ meet $$${SYSTEM}$$`} />);
  expect(namesOf()).toEqual(["Transfer to Calculator: y=2x+3", "Transfer to Calculator: y=2x+3, occurrence 2", "Transfer to Calculator: system of 2 inequalities"]);
});
it("TR-2 passages, hints, explanations, review panels, captions, footers, cells, prose outside delimiters and the student's own answers render no control in an active v2 quiz", () => {
  stubbed(v2Bridge());
  const submitted: QuizStateOverride = { ...STATE, phase: "submitted_wrong", selectedAnswer: "B", reviews: { q1: REVIEW } };
  const passage = { ...Q, passage_a: "Text 1 cites $y=2x+3$.", passage_b: "Text 2 cites $y=3x$." } as StudentQuizQuestion;
  const quiz = render(<ActiveQuizScreen node={{ subject: "math", topic: "Practice" } as MappedNode} q={passage} stateOverride={submitted} onClose={noop} onSelectAnswer={noop} onSubmit={noop} onFlagClick={noop} showExplanations onToggleExplanations={noop} onNext={noop} />);
  expect([screen.getByText(/has slope 2/), screen.getByText(/Text 1 cites/), screen.getByText(/Choice A uses/)]).toHaveLength(3); expect(namesOf()).toEqual(STEM_AND_CHOICES); quiz.unmount();
  const numeric = { ...Q, answer_format: "numeric_entry", answer_choices: [] } as unknown as StudentQuizQuestion;
  const typed = render(<ActiveQuizScreen node={{ subject: "math", topic: "Practice" } as MappedNode} q={numeric} stateOverride={{ ...submitted, selectedAnswer: "$y=2x+3$" }} onClose={noop} onSelectAnswer={noop} onSubmit={noop} onFlagClick={noop} showExplanations onToggleExplanations={noop} onNext={noop} />);
  expect(screen.getByText("$y=2x+3$")).toBeInTheDocument(); expect(namesOf()).toEqual([STEM_AND_CHOICES[0]]); typed.unmount();
  const diagnostic = render(<DiagnosticClient questions={DIAGNOSTIC} isSubscribed />);
  fireEvent.click(screen.getByRole("button", { name: /^Hint/ })); expect(screen.getByText(/has slope 2/)).toBeInTheDocument(); expect(namesOf()).toEqual(STEM_AND_CHOICES);
  fireEvent.click(document.querySelector<HTMLButtonElement>("[data-question-layout] .group > button")!); expect(screen.getByText(/has slope 2/)).toBeInTheDocument(); expect(namesOf()).toEqual(STEM_AND_CHOICES);
  diagnostic.unmount();
  render(<><MathText text="Passage, hint or explanation: $y=2x+3$" /><MathText calculator text="y=2x+3 without delimiters" />
    <QuestionTable calculator data={{ caption: "Values of $y=2x$", header_row: ["$x$", "$y=2x$"], rows: [["$1$", "$2x+1$"]], footer_note: "Note $y=3x$" }} /></>);
  expect(document.querySelectorAll("[data-transfer-control]")).toHaveLength(0);
});
it("TR-76, AR-11 the wrappers branch on bridge.version: v1 keeps PasteAction and cluster instances render nothing; v2 renders only Transfer controls and no table control before Phase 3", () => {
  const stem = { text: "Line $y=2x+3$", serializedFunctionLines: false };
  const tree = <><CalculatorSourceAction latex="y=2x+3" segmentIndex={1} stem={stem} /><CalculatorChoiceAction text="$2x$" letter="B" />
    <div data-testid="cluster"><CalculatorChoiceAction text="$2x$" letter="B" slot="cluster" /><CalculatorTableAction rows={[["1", "2"]]} slot="cluster" /></div>
    <CalculatorTableAction rows={[["1", "2"], ["2", "4"]]} headers={["x", "y"]} itemId="table" /></>;
  stubbed(v1Bridge()); const v1 = render(tree);
  expect(screen.getAllByRole("button", { name: /^Paste .+ into calculator|^Paste table into calculator as x₁, y₁$/ }).map((b) => b.getAttribute("aria-label")))
    .toEqual(["Paste y=2x+3 into calculator", "Paste choice B into calculator", "Paste table into calculator as x₁, y₁"]);
  expect(screen.getByTestId("cluster")).toBeEmptyDOMElement(); expect(screen.queryAllByRole("button", { name: /^Transfer to Calculator/ })).toHaveLength(0); v1.unmount();
  stubbed(v2Bridge()); render(tree);
  expect(screen.queryAllByText(/Export to Karman|Copy for Desmos/)).toHaveLength(0); expect(screen.queryByRole("button", { name: "Export options" })).toBeNull();
  expect(namesOf()).toEqual(["Transfer to Calculator: y=2x+3", "Transfer to Calculator: choice B"]);
});
it("AR-11 a choice with no stem prop classifies against the stem its question's MathText registered", async () => {
  const bridge = stubbed(v2Bridge()); const text = "The function $f$ is defined by $f(x)=x^{2}$.";
  render(<><MathText calculator text={text} /><div data-calculator="v2"><CalculatorChoiceAction slot="cluster" text="$f(x)+1$" letter="A" /></div></>);
  fireEvent.click(screen.getByRole("button", { name: "Transfer to Calculator: choice A" })); await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(bridge.transfer.mock.calls[0][0]).toEqual({ ...classifyChoice({ letter: "A", text: "$f(x)+1$" }, { text, serializedFunctionLines: false })!.payload, questionKey: "attempt:q1" });
});
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run src/components/calculator/transfer-call-sites.test.tsx`; Expected: FAIL, MathText renders no `[data-transfer-control]` (no v2 branch), so `namesOf()` throws "Unable to find an accessible element with the role "button"".
- [ ] **Step 4: Implement**
  - `MathText.tsx`:
    - `const stem = useMemo(() => ({ text, serializedFunctionLines }), [text, serializedFunctionLines]);`
    - `const mathKeys = useMemo(() => splitMathText(text, serializedFunctionLines, true, true).flatMap((s, i) => (s.kind === "text" ? [] : [i])), [text, serializedFunctionLines]);`
    - Before `return`, declare `let mathOrdinal = 0;`. Under the existing `calculator &&` guard, each inline and block branch of `renderSegments` renders `<CalculatorSourceAction latex={s.latex} segmentIndex={mathKeys[mathOrdinal++]} stem={stem} />`.
    - The k-th rendered math segment maps to the k-th non-text segment of the whole-text split, which is the key `classifyStem` uses (TR-6, 12). MathText renders run by run (underline, then italic, `MathText.tsx:198-216`), so a source marker inside a math delimiter pair can shift later ordinals; the wrapper's guard below makes such a shift render nothing.
  - `CalculatorSourceAction.tsx`:
    - Each wrapper reads `useCalculator()` and returns a v2 or a v1 sub-component, so v1 output and its hooks are unchanged (`PasteAction` already renders only for v1).
    - The v2 source branch memoises `classifyStem(stem)`, the names from `accessibleNames([...items.values()])` and `splitMathText(stem.text, stem.serializedFunctionLines, true, true)`, and registers `stem` for `bridge.questionKey`. It renders a control only when `segments[segmentIndex]` is a non-text segment whose `latex` equals the `latex` prop (the run-shift guard) and `items.get(segmentIndex)` exists: `<TransferControl item={item} accessibleName={names.get(item.sourceId)!} placement={segments[segmentIndex].kind === "block" ? "block" : "inline"} />`; otherwise `null`.
    - The v2 choice branch renders only with `slot="cluster"`: `classifyChoice({ letter, text }, stem ?? registered)` and `<TransferControl … placement="cluster" />` named `accessibleNames([item]).get(item.sourceId)!`.
    - On v1, `slot="cluster"` instances return `null`. `CalculatorTableAction` on v2 returns `null` (TR-77).
  - Stem registry (package-internal, module scope of `CalculatorSourceAction.tsx`): `const stems = new Map<string, StemInput>()` with a listener set. `useRegisterStem(questionKey, stem)` writes in a `useLayoutEffect` and on cleanup deletes the entry only while it is still its own. `useQuestionStem(questionKey)` is `useSyncExternalStore(subscribe, () => stems.get(questionKey) ?? null, () => null)`.
  - `TransferControl.module.css`: the cluster rule reads `.anchor[data-placement="cluster"] { … opacity: 0; }` exactly as the TR-45 test reads it.
- [ ] **Step 5: Run them and see them pass** — the step 3 command, then `npx vitest run src/components/learn src/components/calculator src/components/diagnostic` and `npx tsc --noEmit`; Expected: PASS (MathText's and DiagnosticClient's own tests unchanged), tsc exit 0.
- [ ] **Step 6: Commit** — `git add src/components docs/superpowers/specs && git commit -m "Render Transfer controls from the version-switching wrappers with stem mapping (OI-16, OI-18)"`

### Task 6: Answer-choice call sites and clusters

**Files:**

- Modify: `src/components/learn/quiz/ActiveQuizScreen.tsx`, `src/components/learn/catalog-practice/CatalogQuestion.tsx`, `src/components/diagnostic/parts/AnswerChoiceButton.tsx`, `src/components/learn/quiz/TableChoiceOption.tsx`, `src/components/learn/QuestionTable.tsx`, `src/components/learn/DailyChallenge.tsx` (extension edit), `src/components/calculator/transfer-call-sites.test.tsx` (append)

**Interfaces:**

- Consumes: the task 5 wrappers and stem registry; `useCalculator()` (11); `useCalculatorVersion(): CalculatorVersion` (03); `StemInput` (12, type only).
- Produces: `QuestionTable`'s optional prop `calculatorItemId?: string` (default `"table"`; package-internal, its one new caller is `CatalogQuestion`); each v2 cluster carries `data-calculator="v2"` per the DOM contract. `AnswerChoiceButton`'s props are unchanged: its v2 cluster instance passes no `stem` and uses the registered stem (decision on `AnswerChoiceButton`).

- [ ] **Step 1: Write the failing tests.** Append to `transfer-call-sites.test.tsx`, adding the imports `import type { JSX } from "react";`, `import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";`, `import { AnswerChoiceButton } from "@/components/diagnostic/parts/AnswerChoiceButton";`, `import { TableChoiceOption } from "@/components/learn/quiz/TableChoiceOption";`, `import DailyChallenge from "@/components/learn/DailyChallenge";`, `import type { DailySlot } from "@/lib/daily-challenge/server";` and `import { CalculatorVersionProvider } from "./CalculatorVersion";`, plus `vi.mock("@/app/learn/daily-challenge-actions", () => ({ actionReviewDailyAnswer: vi.fn() }));`. The tests reuse task 5's `noop`, `Q` and `STATE`:

```
const SITES: Record<string, () => JSX.Element> = {
  practice: () => <ActiveQuizScreen node={{ subject: "math", topic: "Practice" } as MappedNode} q={Q} stateOverride={STATE} onClose={noop} onSelectAnswer={h.onSelect} onSubmit={noop} onFlagClick={noop} showExplanations={false} onToggleExplanations={noop} onNext={noop} />,
  catalog: () => <CatalogQuestion question={Q} answer="" disabled={false} onAnswer={h.onSelect} />,
  diagnostic: () => <>{["A) $5$", "B) $6$"].map((option) => <AnswerChoiceButton key={option} option={option} correctLetter="A" isAnswered={false} isSelected={false} isCrossed={false} isHighlighted={false} onSelect={h.onSelect} onToggleCrossOut={h.onCross} onToggleHighlight={noop} />)}</>,
};
const TABLE = { header_row: ["x", "y"], rows: [["1", "2"], ["2", "4"]] };
it("AR-11 on v2 each answer-choice cluster gains data-calculator=v2 and one Transfer control after cross-out; on v1 the cluster is unchanged", () => {
  for (const [name, site] of Object.entries(SITES)) {
    stubbed(v1Bridge()); const v1 = render(site());
    expect(document.querySelectorAll("[data-calculator]"), name).toHaveLength(0);
    for (const cross of screen.getAllByRole("button", { name: /^Cross out choice [AB]$/ })) expect(cross.parentElement!.children, name).toHaveLength(name === "diagnostic" ? 2 : 1);
    expect(screen.getAllByRole("button", { name: /^Paste choice [AB] into calculator$/ }), name).toHaveLength(2); v1.unmount();
    stubbed(v2Bridge()); const v2 = render(site()); const clusters = [...document.querySelectorAll<HTMLElement>('[data-calculator="v2"]')];
    expect(clusters, name).toHaveLength(2);
    clusters.forEach((cluster, i) => { const last = cluster.lastElementChild!; expect(last).toHaveAttribute("data-transfer-control");
      expect(last.querySelector("button")).toHaveAccessibleName(`Transfer to Calculator: choice ${"AB"[i]}`); expect(last.previousElementSibling).toHaveAccessibleName(`Cross out choice ${"AB"[i]}`); });
    expect(screen.queryAllByRole("button", { name: /^Paste choice/ }), name).toHaveLength(0); v2.unmount();
  }
});
it("AR-11 table choices get the v2 cluster attribute with no control before Phase 3, and daily choices get a v2-only cluster as the next sibling of each label", () => {
  const table = () => <TableChoiceOption id="c-d" groupName="g" letter="D" table={TABLE} selected={false} submitted={false} correct={false} onSelect={h.onSelect} />;
  stubbed(v1Bridge()); const v1 = render(table()); expect(document.querySelector("[data-calculator]")).toBeNull();
  expect(screen.getByRole("button", { name: "Paste table into calculator as x₁, y₁" })).toBeInTheDocument(); v1.unmount();
  stubbed(v2Bridge()); const v2 = render(table()); const header = screen.getByRole("button", { name: "Cross out choice D" }).parentElement!;
  expect(header).toHaveAttribute("data-calculator", "v2"); expect(document.querySelectorAll("[data-transfer-control]")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: /^Paste table/ })).toBeNull(); v2.unmount();
  const slot = { state: "ready", value: { day: "2026-10-16", subject: "math", question: { ...Q, answer_choices: Q.answer_choices.map((c, i) => ({ ...c, choice_text: ["$y=2x-1$", "$2$"][i] })) } } } as DailySlot;
  const labels = () => [...document.querySelectorAll("label")].filter((l) => l.querySelector("input[type=radio]"));
  h.stub = false; const daily1 = render(<DailyChallenge math={slot} reading={{ state: "empty" }} />);
  expect(labels().map((l) => l.nextElementSibling?.tagName ?? null)).toEqual(["LABEL", null]); expect(document.querySelector("[data-calculator]")).toBeNull(); daily1.unmount();
  stubbed(v2Bridge()); render(<CalculatorVersionProvider version="v2"><DailyChallenge math={slot} reading={{ state: "empty" }} /></CalculatorVersionProvider>);
  for (const [i, label] of labels().entries()) { const cluster = label.nextElementSibling!; expect(cluster).toHaveAttribute("data-calculator", "v2");
    expect(cluster.querySelectorAll("[data-transfer-control]")).toHaveLength(1); expect(cluster.querySelector("button")).toHaveAccessibleName(`Transfer to Calculator: choice ${"AB"[i]}`);
    expect(label.querySelector("[data-transfer-control]")).toBeNull(); }
});
it("TR-41 activating a choice's control by mouse, touch or keyboard never selects, crosses out or reaches an answer handler", async () => {
  const bridge = stubbed(v2Bridge());
  for (const [name, site] of Object.entries(SITES)) {
    const view = render(<div onClick={h.outer} onPointerDown={h.outer} onKeyDown={h.outer}>{site()}</div>);
    for (const b of screen.getAllByRole("button", { name: /^Transfer to Calculator: choice [AB]$/ })) {
      expect(b.parentElement!.closest("button, label, [role=radio]"), name).toBeNull();
      fireEvent.pointerDown(b, { pointerType: "mouse" }); fireEvent.click(b); fireEvent.pointerDown(b, { pointerType: "touch" }); fireEvent.pointerUp(b, { pointerType: "touch" }); fireEvent.click(b);
      fireEvent.keyDown(b, { key: "Enter" }); fireEvent.keyDown(b, { key: " " });
    }
    await waitFor(() => expect(bridge.transfer, name).toHaveBeenCalledTimes(4));
    expect([h.onSelect.mock.calls.length, h.onCross.mock.calls.length, h.outer.mock.calls.length], name).toEqual([0, 0, 0]);
    expect(screen.getAllByRole("button", { name: /^Cross out choice [AB]$/ })).toHaveLength(2); view.unmount(); bridge.transfer.mockClear();
  }
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/transfer-call-sites.test.tsx -t "AR-11 on v2|AR-11 table|TR-41"`; Expected: FAIL, no `[data-calculator="v2"]` cluster and no choice Transfer controls.
- [ ] **Step 3: Implement**
  - `ActiveQuizScreen.tsx`: before the `if (!state) throw` line add `const calculatorVersion = useCalculator()?.version;` and `const stem = useMemo(() => ({ text: q.question_text, serializedFunctionLines: q.subject === "math" }), [q.question_text, q.subject]);`. The choice button's `pr-14` becomes `calculatorVersion === "v2" ? "pr-24" : "pr-14"`. The `.choiceTools` div gets `data-calculator={calculatorVersion === "v2" ? "v2" : undefined}`, and after the cross-out button `{q.subject === "math" && <CalculatorChoiceAction slot="cluster" text={choice.choice_text} letter={letter} stem={stem} />}`. The existing instance below is unchanged.
  - `CatalogQuestion.tsx`: the same for text choices (the label's `pr-14` becomes `pr-24` on v2); table choices pass `calculatorItemId={`choice:${choice.letter}`}` to `QuestionTable`.
  - `AnswerChoiceButton.tsx` (props unchanged): on v2 the hover-revealed div gets `data-calculator="v2"` and, after cross-out, `<CalculatorChoiceAction slot="cluster" text={choiceBody} letter={letter} />` with no `stem`, so the wrapper uses the stem the diagnostic question's `MathText` registered. The choice button's `pr-28` becomes `pr-40` on v2. The bottom instance is unchanged.
  - `TableChoiceOption.tsx`: the header row div gets `data-calculator` on v2; after cross-out, `{!readOnly && <CalculatorTableAction slot="cluster" rows={table.rows} headers={table.header_row ?? undefined} itemId={`choice:${letter}`} />}`. The existing instance gains `headers` and `itemId`.
  - `QuestionTable.tsx`: `<CalculatorTableAction rows={rows} headers={header_row ?? undefined} itemId={calculatorItemId} />`, with `calculatorItemId = "table"` by default.
  - `DailyChallenge.tsx`: `const v2Choices = useCalculatorVersion() === "v2" && subject === "math";`.
    - With `v2Choices` each choice renders `<div key={choice.id} className="group relative">` holding the existing label (plus `pr-14`), then `<div data-calculator="v2" className="absolute right-1 top-1 flex items-center">`.
    - That cluster holds `CalculatorTableAction slot="cluster"` (rows, headers, `itemId={`choice:${choice.letter}`}`) for a table choice, else `<CalculatorChoiceAction slot="cluster" text={choice.choice_text} letter={choice.letter} stem={{ text: q.question_text, serializedFunctionLines: true }} />`.
    - Without `v2Choices` the map returns the label exactly as today.
- [ ] **Step 4: Run them and see them pass** — the step 2 command, then `npx vitest run src/components/learn src/components/diagnostic src/components/calculator` and `npx tsc --noEmit`. The existing `ActiveQuizScreen`, `CatalogQuestion`, `TableChoiceOption` and `DailyChallenge` tests run unmodified. Expected: PASS, tsc exit 0.
- [ ] **Step 5: Commit** — `git add src/components && git commit -m "Add v2 Transfer controls to every answer-choice tool cluster"`

### Task 7: Transfer fixture and availability in the browser

**Files:**

- Create: `tests/calculator/fixture/v2/transfer-questions.ts`, `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer.spec.ts`
- Modify: `tests/calculator/fixture/main.tsx` (extension edit)

**Interfaces:**

- Consumes: `DiagnosticQuestion` (type, `useDiagnosticState.ts`); `StudentQuizQuestion` (type); 11's fixture URLs, `globalThis.__calculatorHarness` (07) and `globalThis.__calculatorWindowStore` (11).
- Produces: the fixture exports below; `?questions=transfer` swaps the diagnostic questions and the daily question; the first `transfer-helpers.ts` exports, which tasks 8 to 14 extend.

```ts
// tests/calculator/fixture/v2/transfer-questions.ts (type-only imports; nothing else)
export const BLOCK_SYSTEM = "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}";
export const TRANSFER_PASSAGE: string; // twelve original synthetic sentences (lower-case "lines" only), so phones scroll
export const TRANSFER_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[];
// t1 algebra, passage TRANSFER_PASSAGE: "Lines $y=2x+3$ and $y=2x+3$ bound the region $y>2x+1$, where $x$ is $5$ and
//   $\\angle B$ is marked. $$<BLOCK_SYSTEM>$$"; options "A) $3p+4=19$", "B) $2x$", "C) $x$", "D) $\\angle B$";
//   explanation "Synthetic transfer fixture: $y=9$."
// t2 algebra: "The function $f$ is defined by $f(x)=x^{2}-3$. Let $g(x)=f(x)+3$."; options "A) $x^{2}$",
//   "B) $x^{2}+3$", "C) $2x$", "D) $0$"
// t3 info_ideas: "In the passage, $y=2x+3$ is quoted."; options "A) $1$" … "D) $4$"
export const T1_STEM_CONTROLS: readonly string[]; // ["y=2x+3", "y=2x+3", "y>2x+1", BLOCK_SYSTEM] (latex in order)
export const T1_STEM_DENIED: readonly string[]; // ["x", "5", "\\angle B"]
export const TRANSFER_DAILY_QUESTION: StudentQuizQuestion;
// math, "Which line is parallel to $y=2x+3$?", choices A "$y=2x-1$", B "$y=-2x+3$", C "$x=2$", D "$2$" (the field
// shape of DailyChallenge.test.tsx's question)
```

- [ ] **Step 1: Write the helpers and the failing browser tests.** `tests/calculator/v2/transfer-helpers.ts` (every helper exported; tasks 8 to 14 append):

```
import type { Page } from "@playwright/test";
export const url = (flow = "diagnostic", extra = "") => `/?flow=${flow}&calc=v2&questions=transfer${extra}`;
export const xq = (s: string) => `"${s}"`;
export const anchors = (page: Page, latex: string) => page.locator(`xpath=//*[@data-transfer-control][preceding-sibling::*[1][.//annotation[normalize-space()=${xq(latex)}]]]`);
export const anchor = (page: Page, latex: string, n = 0) => anchors(page, latex).nth(n);
export const choiceControl = (page: Page, letter: string) => page.getByRole("button", { name: `Transfer to Calculator: choice ${letter}`, exact: true });
export const allControls = (page: Page) => page.getByRole("button", { name: /^Transfer to Calculator: / });
export const press = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click()); // DOM click: a window may cover it
```

`tests/calculator/v2/transfer.spec.ts`:

```
import { expect, test } from "@playwright/test";
import { T1_STEM_CONTROLS, T1_STEM_DENIED } from "../fixture/v2/transfer-questions";
import { allControls, anchor, anchors, choiceControl, press, url, xq } from "./transfer-helpers";
test("TR-4 controls render only where useCalculator() returns a v2 bridge: v2 Math questions, never Reading and Writing", async ({ page }) => {
  await page.goto(url()); await expect(page.getByText("Lines", { exact: false }).first()).toBeVisible();
  for (const latex of new Set(T1_STEM_CONTROLS)) await expect(anchors(page, latex), latex).toHaveCount(T1_STEM_CONTROLS.filter((l) => l === latex).length);
  for (const latex of T1_STEM_DENIED) { await expect(page.locator(`xpath=//annotation[normalize-space()=${xq(latex)}]`).first()).toBeAttached(); await expect(anchors(page, latex), latex).toHaveCount(0); }
  await expect(page.locator("[data-transfer-control]")).toHaveCount(T1_STEM_CONTROLS.length + 3); await expect(choiceControl(page, "D")).toHaveCount(0);
  await page.goto(url("practice", "&subject=reading")); await expect(page.getByText(/^Question 1:/).first()).toBeVisible(); await expect(allControls(page)).toHaveCount(0);
  await page.goto(url()); await press(page, "Skip this question"); await press(page, "Skip this question");
  await expect(page.getByText("is quoted", { exact: false })).toBeVisible(); await expect(allControls(page)).toHaveCount(0);
});
test("TR-76 with calculatorV2 off every call site renders Export to Karman unchanged; with it on only Transfer controls render", async ({ page }) => {
  await page.goto("/?flow=practice"); await expect(page.getByRole("button", { name: "Paste \\sin(30) into calculator", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste table into calculator as x₁, y₁", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Paste choice [ABCD] into calculator$/ })).toHaveCount(4); await expect(allControls(page)).toHaveCount(0);
  await page.goto("/?flow=practice&calc=v2"); await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(page.getByText(/Export to Karman|Copy for Desmos/)).toHaveCount(0); await expect(page.getByRole("button", { name: "Export options" })).toHaveCount(0);
  await expect(anchors(page, "\\sin(30)")).toHaveCount(1); await expect(anchors(page, "(1,2)")).toHaveCount(0); await expect(anchor(page, "\\sin(30)")).toBeAttached();
  await expect(page.getByRole("button", { name: /^Transfer to Calculator: choice [ABCD]$/ })).toHaveCount(4);
  for (const flow of ["diagnostic", "catalog", "daily"]) {
    await page.goto(`/?flow=${flow}&questions=transfer`); await expect(page.getByText("Export to Karman").first()).toBeVisible(); await expect(allControls(page)).toHaveCount(0);
    await page.goto(url(flow)); await expect(allControls(page).first()).toBeAttached(); await expect(page.getByText(/Export to Karman|Copy for Desmos/)).toHaveCount(0);
  }
});
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer.spec.ts -g "TR-4 |TR-76"`; Expected: FAIL. `questions=transfer` is ignored, so the diagnostic shows the default fixture questions and no `y>2x+1` item exists.
- [ ] **Step 3: Implement** the fixture file as declared (original synthetic text only). In `main.tsx`:
  - Add `import { TRANSFER_DAILY_QUESTION, TRANSFER_DIAGNOSTIC_QUESTIONS } from "./v2/transfer-questions";` and `const transferQuestions = params.get("questions") === "transfer";`.
  - The diagnostic flow passes `questions={transferQuestions ? TRANSFER_DIAGNOSTIC_QUESTIONS : questions}`.
  - The daily flow's `question` becomes `transferQuestions ? TRANSFER_DAILY_QUESTION : catalogQuestions[0]`.

  Nothing else changes.

- [ ] **Step 4: Run them and see them pass** — `npm run test:calculator -- tests/calculator/v2/transfer.spec.ts -g "TR-4 |TR-76"` (all five projects), then `npx tsc --noEmit`; Expected: PASS, tsc exit 0.
- [ ] **Step 5: Commit** — `git add tests/calculator && git commit -m "Add the synthetic transfer questions and check where Transfer controls render"`

### Adaptations made while executing tasks 5 to 7

- D4 (lead decision): the wrappers render `t.TransferControl` from `useTransferClassifier()`, and
  their item lookup lives in the lazy `transfer-items.ts`; no eager module imports either. The
  component tests therefore await the first control (`waitFor`, `findBy…`) or an awaited
  `loadTransferClassifier()` before their synchronous checks, and one added test,
  "AR-33 (D4) a v2 wrapper renders no control until the lazy classifier has loaded", checks the
  empty first render. The AR-33 source test covers `TransferControl`, its stylesheets and
  `transfer-items.ts`.
- Names: 12's table 8.1 descriptions are spaced plain text, so the expected names read
  `Transfer to Calculator: y = 2x + 3` (and `…, occurrence 2`), not `y=2x+3`.
- The TR-2 test moved from task 5 to task 6: its `STEM_AND_CHOICES` expectation needs the
  answer-choice clusters task 6 adds.
- jsdom gives KaTeX's MathML elements no `style`, so a role query by name over a page whose
  choice buttons hold math throws inside `getComputedStyle`. The call-site tests find buttons by
  `aria-label` or text (`buttons(…)`) instead; isolated wrapper tests keep role queries.
- No non-null assertions: the tests use optional chaining and a `must()` helper.
- `TransferControl.module.css`'s header comment no longer spells the forbidden declarations, which
  the TR-45 stylesheet check matched.
- v1 class strings stay byte-identical: the choice padding switches inside the existing template
  (`pr-14`/`pr-24`, `pr-28`/`pr-40`), and the daily label appends ` pr-14` only on v2.
- `MathText` computes `mathKeys` only when `calculator` is set.
- Browser helpers: an XPath name test never matches KaTeX's MathML `<annotation>` in an HTML
  document, so `transfer-helpers.ts` uses `*[local-name()="annotation"]` and exports
  `annotations(page, latex)` for the TR-4 test.
- Task 7's TR-76 test passed before `main.tsx` changed (it checks the wrappers from tasks 5 and 6);
  only TR-4 failed first, as expected.
