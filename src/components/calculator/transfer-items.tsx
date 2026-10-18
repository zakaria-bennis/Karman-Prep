// Lazy (D4): loaded with the classifier and TransferControl by transfer-classifier.ts, never
// imported by eager code. Maps an AR-11 wrapper's props to the control it renders, or null, and
// holds the stem registry the choice wrappers read (decision "AnswerChoiceButton").

import { useLayoutEffect, useSyncExternalStore, type JSX } from "react";
import {
  accessibleNames,
  classifyChoice,
  classifyStem,
  type StemInput,
  type TransferItem,
} from "@/lib/calculator-transfer/classify";
import { splitMathText, type MathSegment } from "@/components/learn/math-segments";
import { TransferControl } from "./TransferControl";

export interface TransferControlView {
  item: TransferItem;
  accessibleName: string;
  placement: "inline" | "block" | "cluster";
}

const segmentCache = new WeakMap<StemInput, MathSegment[]>();
const namesCache = new WeakMap<ReadonlyMap<number, TransferItem>, Map<string, string>>();

/** The stem control for MathText's k-th rendered math, keyed by its whole-text segment index. */
export function stemControl(
  stem: StemInput,
  segmentIndex: number,
  latex: string
): TransferControlView | null {
  let segments = segmentCache.get(stem);
  if (segments === undefined) {
    segments = splitMathText(stem.text, stem.serializedFunctionLines, true, true);
    segmentCache.set(stem, segments);
  }
  // The run-shift guard: the rendered math must be the whole-text segment it maps to.
  const segment = segments[segmentIndex];
  const items = classifyStem(stem);
  const item = items.get(segmentIndex);
  if (segment === undefined || segment.kind === "text" || segment.latex !== latex || !item)
    return null;
  let names = namesCache.get(items);
  if (names === undefined) {
    names = accessibleNames([...items.values()]); // TR-50: unique within the question
    namesCache.set(items, names);
  }
  const accessibleName = names.get(item.sourceId);
  if (accessibleName === undefined) return null;
  return { item, accessibleName, placement: segment.kind === "block" ? "block" : "inline" };
}

/** The cluster control for a whole answer choice (TR-40), classified against the stem. */
export function choiceControl(
  letter: string,
  text: string,
  stem: StemInput | null
): TransferControlView | null {
  const item = classifyChoice({ letter, text }, stem);
  const accessibleName = item && accessibleNames([item]).get(item.sourceId);
  return item && accessibleName ? { item, accessibleName, placement: "cluster" } : null;
}

// Stem registry (decision "AnswerChoiceButton"): the stem a question's own MathText renders,
// by question key, for choice wrappers whose caller passes no stem.
const stems = new Map<string, StemInput>();
const stemListeners = new Set<() => void>();
const notifyStems = () => stemListeners.forEach((listener) => listener());
const subscribeStems = (listener: () => void) => {
  stemListeners.add(listener);
  return () => void stemListeners.delete(listener);
};

function useRegisterStem(questionKey: string, stem: StemInput | undefined) {
  useLayoutEffect(() => {
    if (stem === undefined) return;
    stems.set(questionKey, stem);
    notifyStems();
    return () => {
      if (stems.get(questionKey) !== stem) return;
      stems.delete(questionKey);
      notifyStems();
    };
  }, [questionKey, stem]);
}

function useQuestionStem(questionKey: string): StemInput | null {
  return useSyncExternalStore(
    subscribeStems,
    () => stems.get(questionKey) ?? null,
    () => null
  );
}

/** The v2 CalculatorSourceAction: registers its stem and renders the stem item's control. */
export function StemTransferAction(props: {
  latex: string;
  segmentIndex?: number;
  stem?: StemInput;
  questionKey: string;
}): JSX.Element | null {
  const { latex, segmentIndex, stem, questionKey } = props;
  useRegisterStem(questionKey, stem);
  const view =
    stem !== undefined && segmentIndex !== undefined
      ? stemControl(stem, segmentIndex, latex)
      : null;
  return view && <TransferControl {...view} />;
}

/** The v2 cluster CalculatorChoiceAction: the caller's stem, else the registered one. */
export function ChoiceTransferAction(props: {
  text: string;
  letter: string;
  stem?: StemInput;
  questionKey: string;
}): JSX.Element | null {
  const registered = useQuestionStem(props.questionKey);
  const view = choiceControl(props.letter, props.text, props.stem ?? registered);
  return view && <TransferControl {...view} />;
}
