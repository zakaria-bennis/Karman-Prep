// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import type { JSX } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { classifyChoice, classifyStem } from "@/lib/calculator-transfer/classify";
import { splitMathText } from "@/components/learn/math-segments";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import MathText from "@/components/learn/MathText";
import QuestionTable from "@/components/learn/QuestionTable";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import { TableChoiceOption } from "@/components/learn/quiz/TableChoiceOption";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import DailyChallenge from "@/components/learn/DailyChallenge";
import DiagnosticClient from "@/components/diagnostic/DiagnosticClient";
import { AnswerChoiceButton } from "@/components/diagnostic/parts/AnswerChoiceButton";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import type { DailySlot } from "@/lib/daily-challenge/server";
import type { StudentQuizQuestion } from "@/types/quiz";
import {
  CalculatorChoiceAction,
  CalculatorSourceAction,
  CalculatorTableAction,
} from "./CalculatorSourceAction";
import { loadTransferClassifier } from "./transfer-classifier";
import { transferSelection } from "./transfer-selection";

// D4: the classifier and TransferControl load lazily, so every test awaits the first control
// (findBy…) or the loaded chunk before it reads the rendered controls synchronously.

const h = vi.hoisted(() => ({
  stub: false,
  bridge: null as unknown,
  onSelect: vi.fn(),
  onCross: vi.fn(),
  outer: vi.fn(),
}));
// bridge-context holds useCalculator; CalculatorScope re-exports it (AR-33).
vi.mock("./bridge-context", async (original) => {
  const real = await original<typeof import("./bridge-context")>();
  return {
    ...real,
    useCalculator: () =>
      h.stub ? (h.bridge as ReturnType<typeof real.useCalculator>) : real.useCalculator(),
  };
});
vi.mock("@/app/learn/daily-challenge-actions", () => ({ actionReviewDailyAnswer: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/free-diagnostic",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
const bridgeStub = () => ({
  open: false,
  status: "idle",
  failure: null,
  questionKey: "attempt:q1",
  toggle: vi.fn(),
  prefetch: vi.fn(),
  transfer: vi.fn(
    async (_payload: TransferPayload, _trigger: TransferTrigger): Promise<TransferResult> => ({
      status: "added",
      message: "Added.",
      focusRowId: "1",
    })
  ),
});
const stubbed = (bridge: unknown) => {
  h.stub = true;
  h.bridge = bridge;
  return bridge as ReturnType<typeof bridgeStub>;
};
let restore = () => {};
beforeEach(() => {
  restore = installDomStubs();
  h.stub = false;
  h.bridge = null;
  transferSelection.resetForTests();
  vi.clearAllMocks();
});
afterEach(() => restore());
const SYSTEM = "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}";
const CONTROL = /^Transfer to Calculator: /;
// jsdom gives KaTeX's MathML elements no style, so a role query by name, which computes the name
// of every button on the page, throws over a choice button holding math. Tests outside isolated
// wrappers therefore find buttons by aria-label or text instead.
const buttons = (name: RegExp) =>
  [...document.querySelectorAll("button")].filter((b) =>
    name.test(b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "")
  );
const namesOf = () => buttons(CONTROL).map((b) => b.getAttribute("aria-label"));
const controlsReady = () => screen.findAllByRole("button", { name: CONTROL });
const annotationBefore = (anchor: Element) =>
  anchor.previousElementSibling?.querySelector("annotation")?.textContent;

it("TR-45 one real button per item right after it or in its cluster; the math is never focusable; hidden stem controls are clipped and hidden choice controls sit at opacity 0, never leaving the tree (OI-18)", async () => {
  stubbed(bridgeStub());
  const { container } = render(
    <>
      <MathText calculator text={`Use $y=2x+3$, $x$ and $$${SYSTEM}$$`} />
      <div className="group relative">
        <button type="button">A</button>
        <div data-calculator-cluster="">
          <button type="button" aria-label="Cross out choice A" />
          <CalculatorChoiceAction slot="cluster" text="$2x$" letter="A" />
        </div>
      </div>
    </>
  );
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
  expect(anchors.map((a) => a.dataset.placement)).toEqual(["inline", "block", "cluster"]);
  for (const a of anchors) {
    const buttons = a.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("type", "button");
    expect([
      buttons[0].getAttribute("aria-hidden"),
      buttons[0].hidden,
      buttons[0].style.display,
      buttons[0].style.visibility,
      buttons[0].tabIndex,
    ]).toEqual([null, false, "", "", 0]);
  }
  expect(annotationBefore(anchors[0])).toBe("y=2x+3");
  expect(anchors[1].previousElementSibling?.classList.contains("block")).toBe(true);
  expect(anchors[2].parentElement).toHaveAttribute("data-calculator-cluster");
  expect(anchors[2].previousElementSibling).toHaveAccessibleName("Cross out choice A");
  expect(container.querySelectorAll(".katex [tabindex], [tabindex].katex")).toHaveLength(0);
  expect(anchors[0]).toHaveAttribute("data-visible", "false");
  const css = readFileSync("src/components/calculator/transfer-control.css", "utf8");
  expect(css).toMatch(/\[data-visible="false"\][^{]*\{[^}]*clip-path:\s*inset\(50%\)/);
  expect(css).toMatch(/\[data-placement="cluster"\]\s*\{[^}]*opacity:\s*0\s*[;}]/);
  expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden/);
});

it("TR-45 across underline, italic and serialized-function runs each control follows the segment its item came from, and a run that shifts the math count renders no wrong control", async () => {
  stubbed(bridgeStub());
  await loadTransferClassifier(); // D4: later renders get the loaded chunk synchronously
  const runs = {
    text: "[[u]]Line $y=2x+3$[[/u]]\nf(x) = 2^x + 3\n<i>Region $y>2x+1$</i>",
    serializedFunctionLines: true,
  };
  const shifted = {
    text: "Use $a<i>b</i>$ then $y=2x+3$ and $y=x$",
    serializedFunctionLines: false,
  };
  for (const stem of [runs, shifted]) {
    const { container, unmount } = render(
      <MathText
        calculator
        text={stem.text}
        serializedFunctionLines={stem.serializedFunctionLines}
      />
    );
    const segments = splitMathText(stem.text, stem.serializedFunctionLines, true, true);
    const items = classifyStem(stem);
    const anchors = [...container.querySelectorAll<HTMLElement>("[data-transfer-control]")];
    for (const a of anchors) {
      const index = Number((a.dataset.sourceId ?? "").slice("stem:".length));
      const segment = segments[index];
      expect(items.has(index), stem.text).toBe(true);
      expect(segment.kind, stem.text).not.toBe("text");
      expect(annotationBefore(a), stem.text).toBe(segment.kind === "text" ? null : segment.latex);
    }
    if (stem === runs) {
      expect(anchors.map((a) => a.dataset.sourceId)).toEqual(
        [...items.keys()].map((k) => `stem:${k}`)
      );
      expect(anchors).toHaveLength(3);
      expect(
        [
          anchors[0].closest("u"),
          anchors[1].previousElementSibling?.classList.contains("source-function-math") || null,
          anchors[2].closest("i"),
        ].map(Boolean)
      ).toEqual([true, true, true]);
    }
    unmount();
  }
});

it("TR-50 names are Transfer to Calculator plus the table 8.1 description, unique within the question with ', occurrence n' for repeats", async () => {
  stubbed(bridgeStub());
  render(<MathText calculator text={`Lines $y=2x+3$ and $y=2x+3$ meet $$${SYSTEM}$$`} />);
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  expect(namesOf()).toEqual([
    "Transfer to Calculator: y = 2x + 3",
    "Transfer to Calculator: y = 2x + 3, occurrence 2",
    "Transfer to Calculator: system of 2 inequalities",
  ]);
});

it("AR-11, TR-22 the wrappers render only Transfer controls, question tables and table choices included; a choice outside its cluster renders nothing", async () => {
  const stem = { text: "Line $y=2x+3$", serializedFunctionLines: false };
  const tree = (
    <>
      <CalculatorSourceAction latex="y=2x+3" segmentIndex={1} stem={stem} />
      <CalculatorChoiceAction text="$2x$" letter="B" />
      <div data-testid="cluster">
        <CalculatorChoiceAction text="$2x$" letter="B" slot="cluster" />
        <CalculatorTableAction rows={[["1", "2"]]} slot="cluster" />
      </div>
      <CalculatorTableAction
        rows={[
          ["1", "2"],
          ["2", "4"],
        ]}
        headers={["x", "y"]}
        itemId="table"
      />
    </>
  );
  stubbed(bridgeStub());
  render(tree);
  await waitFor(() => expect(namesOf()).toHaveLength(4));
  expect(screen.queryAllByText(/Export to Karman|Copy for Desmos/)).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Export options" })).toBeNull();
  expect(namesOf()).toEqual([
    "Transfer to Calculator: y = 2x + 3",
    "Transfer to Calculator: choice B",
    "Transfer to Calculator: table, 1 row",
    "Transfer to Calculator: table, 2 rows",
  ]);
  expect(
    [...document.querySelectorAll("[data-transfer-control]")].map((a) =>
      a.getAttribute("data-placement")
    )
  ).toEqual(["inline", "cluster", "cluster", "block"]);
});

it("AR-11 a choice with no stem prop classifies against the stem its question's MathText registered", async () => {
  const bridge = stubbed(bridgeStub());
  const text = "The function $f$ is defined by $f(x)=x^{2}$.";
  render(
    <>
      <MathText calculator text={text} />
      <div data-calculator-cluster="">
        <CalculatorChoiceAction slot="cluster" text="$f(x)+1$" letter="A" />
      </div>
    </>
  );
  fireEvent.click(await screen.findByRole("button", { name: "Transfer to Calculator: choice A" }));
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  const expected = classifyChoice(
    { letter: "A", text: "$f(x)+1$" },
    { text, serializedFunctionLines: false }
  );
  expect(expected).not.toBeNull();
  expect(bridge.transfer.mock.calls[0][0]).toEqual({
    ...expected?.payload,
    questionKey: "attempt:q1",
  });
});

it("AR-33 (D4) a wrapper renders no control until the lazy classifier has loaded, then the control appears", async () => {
  vi.resetModules();
  stubbed(bridgeStub());
  const fresh = await import("./CalculatorSourceAction");
  const { container } = render(
    <div data-calculator-cluster="">
      <fresh.CalculatorChoiceAction slot="cluster" text="$5$" letter="A" />
    </div>
  );
  expect(container.querySelector("[data-transfer-control]")).toBeNull();
  expect(await controlsReady()).toHaveLength(1);
});

const noop = () => {};
const Q = {
  id: "q1",
  subject: "math",
  topic_cluster: "Algebra",
  difficulty_level: 1,
  answer_format: "multiple_choice",
  question_text: "The line is $y=2x+3$.",
  passage_intro: null,
  passage: null,
  passage_a: null,
  passage_b: null,
  reviewed_passage: null,
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  image_url: null,
  image_alt: null,
  answer_choices: ["A", "B"].map((letter, i) => ({
    id: `c-${letter}`,
    question_id: "q1",
    letter,
    choice_text: `$${i + 5}$`,
    choice_table_data: null,
  })),
} as unknown as StudentQuizQuestion;
type QuizStateOverride = NonNullable<Parameters<typeof ActiveQuizScreen>[0]["stateOverride"]>;
const STATE: QuizStateOverride = {
  phase: "answering",
  reviews: {},
  records: [],
  targetLength: 1,
  currentIndex: 0,
  selectedAnswer: null,
};
const REVIEW = {
  correct_answer: "A",
  numeric_tolerance: null,
  explanation_text: "Because $y=2x+3$ has slope 2.",
  explanation_per_choice: { A: "Choice A uses $y=2x+3$.", B: "Choice B uses $y=3x$." },
  desmos_strategy: "Graph $y=2x+3$.",
} as unknown as QuizStateOverride["reviews"][string];
const DIAGNOSTIC = [
  {
    id: "d1",
    domain: "algebra",
    difficulty: 1,
    conceptId: "d1",
    text: "The line is $y=2x+3$.",
    options: ["A) $5$", "B) $6$"],
    correct: "A",
    explanation: "Because $y=2x+3$ has slope 2.",
  },
] as Parameters<typeof DiagnosticClient>[0]["questions"];
const STEM_AND_CHOICES = [
  "Transfer to Calculator: y = 2x + 3",
  "Transfer to Calculator: choice A",
  "Transfer to Calculator: choice B",
];
const must = <T,>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error("missing element");
  return value;
};
const practice = (q: StudentQuizQuestion, state: QuizStateOverride, onSelect = noop) => (
  <ActiveQuizScreen
    node={{ subject: "math", topic: "Practice" } as MappedNode}
    q={q}
    stateOverride={state}
    onClose={noop}
    onSelectAnswer={onSelect}
    onSubmit={noop}
    onFlagClick={noop}
    showExplanations
    onToggleExplanations={noop}
    onNext={noop}
  />
);

// Task 5's TR-2 test, moved to task 6: its STEM_AND_CHOICES expectation needs the answer-choice
// clusters this task adds.
it("TR-2 passages, hints, explanations, review panels, captions, footers, cells, prose outside delimiters and the student's own answers render no control in an active quiz", async () => {
  stubbed(bridgeStub());
  const submitted: QuizStateOverride = {
    ...STATE,
    phase: "submitted_wrong",
    selectedAnswer: "B",
    reviews: { q1: REVIEW },
  };
  const passage = {
    ...Q,
    passage_a: "Text 1 cites $y=2x+3$.",
    passage_b: "Text 2 cites $y=3x$.",
  } as StudentQuizQuestion;
  const quiz = render(practice(passage, submitted));
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  expect([
    screen.getByText(/has slope 2/),
    screen.getByText(/Text 1 cites/),
    screen.getByText(/Choice A uses/),
  ]).toHaveLength(3);
  expect(namesOf()).toEqual(STEM_AND_CHOICES);
  quiz.unmount();
  const numeric = {
    ...Q,
    answer_format: "numeric_entry",
    answer_choices: [],
  } as unknown as StudentQuizQuestion;
  const typed = render(practice(numeric, { ...submitted, selectedAnswer: "$y=2x+3$" }));
  expect(screen.getByText("$y=2x+3$")).toBeInTheDocument();
  expect(namesOf()).toEqual([STEM_AND_CHOICES[0]]);
  typed.unmount();
  const diagnostic = render(<DiagnosticClient questions={DIAGNOSTIC} isSubscribed />);
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  fireEvent.click(must(buttons(/^Hint/)[0]));
  expect(screen.getByText(/has slope 2/)).toBeInTheDocument();
  expect(namesOf()).toEqual(STEM_AND_CHOICES);
  fireEvent.click(
    must(document.querySelector<HTMLButtonElement>("[data-question-layout] .group > button"))
  );
  expect(screen.getByText(/has slope 2/)).toBeInTheDocument();
  expect(namesOf()).toEqual(STEM_AND_CHOICES);
  diagnostic.unmount();
  render(
    <>
      <MathText text="Passage, hint or explanation: $y=2x+3$" />
      <MathText calculator text="y=2x+3 without delimiters" />
      <QuestionTable
        calculator
        data={{
          caption: "Values of $y=2x$",
          header_row: ["$x$", "$y=2x$"],
          rows: [["$1$", "$2x+1$"]],
          footer_note: "Note $y=3x$",
        }}
      />
    </>
  );
  expect(document.querySelectorAll("[data-transfer-control]")).toHaveLength(0);
});

const SITES: Record<string, () => JSX.Element> = {
  practice: () => practice(Q, STATE, h.onSelect),
  catalog: () => <CatalogQuestion question={Q} answer="" disabled={false} onAnswer={h.onSelect} />,
  diagnostic: () => (
    <>
      {["A) $5$", "B) $6$"].map((option) => (
        <AnswerChoiceButton
          key={option}
          option={option}
          correctLetter="A"
          isAnswered={false}
          isSelected={false}
          isCrossed={false}
          isHighlighted={false}
          onSelect={h.onSelect}
          onToggleCrossOut={h.onCross}
          onToggleHighlight={noop}
        />
      ))}
    </>
  ),
};
const TABLE = {
  header_row: ["x", "y"],
  rows: [
    ["1", "2"],
    ["2", "4"],
  ],
};

it("AR-11 each answer-choice cluster gains data-calculator-cluster and one Transfer control after cross-out", async () => {
  for (const [name, site] of Object.entries(SITES)) {
    stubbed(bridgeStub());
    const view = render(site());
    const clusters = [...document.querySelectorAll<HTMLElement>("[data-calculator-cluster]")];
    expect(clusters, name).toHaveLength(2);
    await waitFor(() =>
      expect(clusters[1].lastElementChild).toHaveAttribute("data-transfer-control")
    );
    clusters.forEach((cluster, i) => {
      const last = cluster.lastElementChild;
      expect(last).toHaveAttribute("data-transfer-control");
      expect(last?.querySelector("button")).toHaveAccessibleName(
        `Transfer to Calculator: choice ${"AB"[i]}`
      );
      expect(last?.previousElementSibling).toHaveAccessibleName(`Cross out choice ${"AB"[i]}`);
    });
    view.unmount();
  }
});

it("AR-11, TR-22 a table choice's control sits in its cluster, and daily math choices get a cluster as the next sibling of each label", async () => {
  const table = () => (
    <TableChoiceOption
      id="c-d"
      groupName="g"
      letter="D"
      table={TABLE}
      selected={false}
      submitted={false}
      correct={false}
      onSelect={h.onSelect}
    />
  );
  stubbed(bridgeStub());
  const view = render(table());
  const header = must(buttons(/^Cross out choice D$/)[0]).parentElement;
  expect(header).toHaveAttribute("data-calculator-cluster");
  await waitFor(() => expect(document.querySelectorAll("[data-transfer-control]")).toHaveLength(1));
  expect(header?.querySelector("[data-transfer-control] button")).toHaveAccessibleName(
    "Transfer to Calculator: choice D"
  );
  view.unmount();
  const slot = {
    state: "ready",
    value: {
      day: "2026-10-16",
      subject: "math",
      question: {
        ...Q,
        answer_choices: Q.answer_choices.map((c, i) => ({
          ...c,
          choice_text: ["$y=2x-1$", "$2$"][i],
        })),
      },
    },
  } as DailySlot;
  const labels = () =>
    [...document.querySelectorAll("label")].filter((l) => l.querySelector("input[type=radio]"));
  stubbed(bridgeStub());
  render(<DailyChallenge math={slot} reading={{ state: "empty" }} />);
  await waitFor(() => expect(namesOf()).toHaveLength(3));
  for (const [i, label] of labels().entries()) {
    const cluster = label.nextElementSibling;
    expect(cluster).toHaveAttribute("data-calculator-cluster");
    expect(cluster?.querySelectorAll("[data-transfer-control]")).toHaveLength(1);
    expect(cluster?.querySelector("button")).toHaveAccessibleName(
      `Transfer to Calculator: choice ${"AB"[i]}`
    );
    expect(label.querySelector("[data-transfer-control]")).toBeNull();
  }
});

it("TR-41 activating a choice's control by mouse, touch or keyboard never selects, crosses out or reaches an answer handler", async () => {
  const bridge = stubbed(bridgeStub());
  for (const [name, site] of Object.entries(SITES)) {
    const view = render(
      <div onClick={h.outer} onPointerDown={h.outer} onKeyDown={h.outer}>
        {site()}
      </div>
    );
    await waitFor(() => expect(buttons(/^Transfer to Calculator: choice [AB]$/)).toHaveLength(2));
    for (const b of buttons(/^Transfer to Calculator: choice [AB]$/)) {
      expect(b.parentElement?.closest("button, label, [role=radio]"), name).toBeNull();
      fireEvent.pointerDown(b, { pointerType: "mouse" });
      fireEvent.click(b);
      fireEvent.pointerDown(b, { pointerType: "touch" });
      fireEvent.pointerUp(b, { pointerType: "touch" });
      fireEvent.click(b);
      fireEvent.keyDown(b, { key: "Enter" });
      fireEvent.keyDown(b, { key: " " });
    }
    await waitFor(() => expect(bridge.transfer, name).toHaveBeenCalledTimes(4));
    expect(
      [h.onSelect.mock.calls.length, h.onCross.mock.calls.length, h.outer.mock.calls.length],
      name
    ).toEqual([0, 0, 0]);
    expect(buttons(/^Cross out choice [AB]$/)).toHaveLength(2);
    view.unmount();
    bridge.transfer.mockClear();
  }
});
